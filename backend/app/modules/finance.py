"""Invoices, private receipt handling, and auditable payment reconciliation.

Amounts are whole Pakistani rupees throughout this initial implementation. An
uploaded document is evidence for review only and never settles an invoice.
"""

from __future__ import annotations

import hashlib
import io
import json
import re
import warnings
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Literal
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, Query, UploadFile
from fastapi.responses import FileResponse, Response
from PIL import Image
from pydantic import BaseModel, ConfigDict, Field, field_validator
from pypdf import PdfReader
from pypdf.generic import ArrayObject, DictionaryObject, IndirectObject
from sqlalchemy import func, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.dependencies import current_user, get_db, require_roles
from app.database.models import (
    Allocation,
    AuditEvent,
    Bed,
    Invoice,
    Payment,
    PaymentVerification,
    Receipt,
    Room,
    Student,
    User,
)

router = APIRouter(tags=["Finance"], dependencies=[Depends(require_roles("owner", "student"))])
MAX_RECEIPT_BYTES = 5 * 1024 * 1024
MAX_RECEIPT_PIXELS = 20_000_000
ALLOWED_PAYMENT_METHODS = Literal["bank_transfer", "cash", "easypaisa", "jazzcash", "sandbox"]


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class StrictInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class InvoiceCreate(StrictInput):
    student_id: str = Field(min_length=1, max_length=64)
    month: str = Field(pattern=r"^20\d{2}-(0[1-9]|1[0-2])$")
    subtotal: int = Field(gt=0, le=100_000_000, strict=True)
    late_fee: int = Field(default=0, ge=0, le=1_000_000, strict=True)
    due_date: date


class PaymentCreate(StrictInput):
    invoice_id: str = Field(min_length=1, max_length=64)
    amount: int = Field(gt=0, le=100_000_000, strict=True)
    method: ALLOWED_PAYMENT_METHODS = "bank_transfer"
    bank_reference: str | None = Field(default=None, min_length=3, max_length=120)
    idempotency_key: str | None = Field(default=None, min_length=8, max_length=128)


class PaymentVerify(StrictInput):
    evidence_type: Literal["bank_statement", "provider_settlement"]
    evidence_reference: str = Field(min_length=8, max_length=160)
    confirmation: Literal["VERIFY PAYMENT"]
    bank_reference: str = Field(min_length=3, max_length=120)
    notes: str = Field(default="", max_length=2000)

    @field_validator("evidence_reference")
    @classmethod
    def substantive_evidence(cls, value: str) -> str:
        if value.lower() in {"screenshot", "receipt", "uploaded receipt", "payment screenshot"}:
            raise ValueError(
                "Use a trusted bank statement or provider settlement reference, not a receipt."
            )
        return value


def _owner(user: User) -> None:
    if user.role != "owner":
        raise HTTPException(403, "Owner permission is required for financial administration.")


def _finance_user(user: User) -> None:
    if user.role not in {"owner", "student"}:
        raise HTTPException(403, "Financial access has not been granted to this role.")


def _student_for_user(db: Session, user: User) -> Student:
    student = db.scalar(select(Student).where(Student.user_id == user.id))
    if not student:
        raise HTTPException(404, "Student profile not found.")
    return student


def _authorize_student(db: Session, user: User, student_id: str) -> None:
    _finance_user(user)
    if user.role == "student" and _student_for_user(db, user).id != student_id:
        # A resource belonging to another student is deliberately undiscoverable.
        raise HTTPException(404, "Financial record not found.")


def _invoice(db: Session, invoice_id: str, user: User) -> Invoice:
    _finance_user(user)
    invoice = db.get(Invoice, invoice_id)
    if invoice is None:
        raise HTTPException(404, "Invoice not found.")
    _authorize_student(db, user, invoice.student_id)
    return invoice


def _payment(db: Session, payment_id: str, user: User) -> Payment:
    _finance_user(user)
    payment = db.get(Payment, payment_id)
    if payment is None:
        raise HTTPException(404, "Payment not found.")
    _authorize_student(db, user, payment.student_id)
    return payment


def _audit(
    db: Session, user: User, action: str, entity: str, entity_id: str, details: dict
) -> None:
    db.add(
        AuditEvent(
            id=str(uuid4()),
            actor_id=user.id,
            action=action,
            entity=entity,
            entity_id=entity_id,
            details={"role": user.role, **details},
            created_at=utcnow(),
        )
    )


def _invoice_status(invoice: Invoice) -> str:
    if invoice.status in {"draft", "voided"}:
        return invoice.status
    if invoice.paid_amount >= invoice.total:
        return "paid"
    if invoice.paid_amount > 0:
        return "partially_paid"
    return "overdue" if invoice.due_date < date.today() else "issued"


def invoice_dict(db: Session, invoice: Invoice) -> dict:
    student = db.get(Student, invoice.student_id)
    return {
        "id": invoice.id,
        "number": invoice.number,
        "student_id": invoice.student_id,
        "student_name": student.full_name if student else "Unknown resident",
        "month": invoice.month,
        "subtotal": invoice.subtotal,
        "late_fee": invoice.late_fee,
        "total": invoice.total,
        "paid_amount": invoice.paid_amount,
        "balance": max(0, invoice.total - invoice.paid_amount),
        "status": _invoice_status(invoice),
        "due_date": invoice.due_date,
        "created_at": invoice.created_at,
    }


def payment_dict(db: Session, payment: Payment) -> dict:
    student = db.get(Student, payment.student_id)
    invoice = db.get(Invoice, payment.invoice_id)
    count = db.scalar(select(func.count(Receipt.id)).where(Receipt.payment_id == payment.id)) or 0
    return {
        "id": payment.id,
        "reference": payment.reference,
        "invoice_id": payment.invoice_id,
        "invoice_number": invoice.number if invoice else "",
        "student_id": payment.student_id,
        "student_name": student.full_name if student else "",
        "amount": payment.amount,
        "currency": "PKR",
        "method": payment.method,
        "status": payment.status,
        "bank_reference": payment.bank_reference,
        "created_at": payment.created_at,
        "verified_at": payment.verified_at,
        "receipt_count": count,
    }


class InvoiceService:
    @staticmethod
    def create(db: Session, user: User, data: InvoiceCreate) -> Invoice:
        _owner(user)
        if db.get(Student, data.student_id) is None:
            raise HTTPException(404, "Student not found.")
        if db.scalar(
            select(Invoice.id).where(
                Invoice.student_id == data.student_id, Invoice.month == data.month
            )
        ):
            raise HTTPException(
                409, "An invoice already exists for this student and billing month."
            )
        invoice = Invoice(
            id=str(uuid4()),
            number=f"E11-{data.month.replace('-', '')}-{uuid4().hex[:8].upper()}",
            student_id=data.student_id,
            month=data.month,
            subtotal=data.subtotal,
            late_fee=data.late_fee,
            total=data.subtotal + data.late_fee,
            paid_amount=0,
            status="issued",
            due_date=data.due_date,
            created_at=utcnow(),
        )
        db.add(invoice)
        _audit(
            db,
            user,
            "invoice.issued",
            "invoice",
            invoice.id,
            {"total": invoice.total, "month": invoice.month},
        )
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise HTTPException(409, "Invoice number or billing period already exists.") from None
        db.refresh(invoice)
        return invoice


class PaymentService:
    @staticmethod
    def create(db: Session, user: User, data: PaymentCreate) -> Payment:
        invoice = _invoice(db, data.invoice_id, user)
        request_fingerprint = hashlib.sha256(
            json.dumps(data.model_dump(), sort_keys=True, separators=(",", ":")).encode()
        ).hexdigest()
        if data.idempotency_key:
            existing = db.scalar(
                select(Payment).where(Payment.idempotency_key == data.idempotency_key)
            )
            if existing:
                _authorize_student(db, user, existing.student_id)
                submission = db.scalar(
                    select(AuditEvent).where(
                        AuditEvent.entity_id == existing.id,
                        AuditEvent.action == "payment.submitted",
                    )
                )
                saved_fingerprint = (
                    submission.details.get("request_fingerprint") if submission else None
                )
                matches = (
                    (saved_fingerprint == request_fingerprint)
                    if saved_fingerprint
                    else (
                        (
                            existing.invoice_id,
                            existing.amount,
                            existing.method,
                            existing.bank_reference,
                        )
                        == (data.invoice_id, data.amount, data.method, data.bank_reference)
                    )
                )
                if not matches:
                    raise HTTPException(409, "Idempotency key was used for a different payment.")
                return existing
        if invoice.status in {"voided", "draft"}:
            raise HTTPException(409, "This invoice does not accept payments.")
        if data.amount > invoice.total - invoice.paid_amount:
            raise HTTPException(409, "Payment exceeds the outstanding invoice balance.")
        if data.bank_reference and db.scalar(
            select(Payment.id).where(Payment.bank_reference == data.bank_reference)
        ):
            raise HTTPException(409, "Transaction reference has already been submitted.")
        payment = Payment(
            id=str(uuid4()),
            reference=f"PAY-{uuid4().hex[:12].upper()}",
            invoice_id=invoice.id,
            student_id=invoice.student_id,
            amount=data.amount,
            method=data.method,
            status="pending",
            bank_reference=data.bank_reference,
            idempotency_key=data.idempotency_key or str(uuid4()),
            submitted_by=user.id,
            created_at=utcnow(),
        )
        db.add(payment)
        _audit(
            db,
            user,
            "payment.submitted",
            "payment",
            payment.id,
            {
                "amount": payment.amount,
                "invoice_id": invoice.id,
                "method": payment.method,
                "request_fingerprint": request_fingerprint,
            },
        )
        try:
            db.commit()
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                409, "Transaction reference or idempotency key already exists."
            ) from None
        db.refresh(payment)
        return payment


class PaymentVerificationService:
    @staticmethod
    def verify(db: Session, user: User, payment_id: str, data: PaymentVerify) -> Payment:
        _owner(user)
        payment = _payment(db, payment_id, user)
        if payment.status == "verified":
            raise HTTPException(
                409, "Payment is already verified. Financial history cannot be overwritten."
            )
        if payment.status != "pending":
            raise HTTPException(409, "Only a pending payment can be reconciled.")
        if db.scalar(
            select(Payment.id).where(
                Payment.bank_reference == data.bank_reference, Payment.id != payment.id
            )
        ):
            raise HTTPException(
                409, "Transaction reference is already allocated to another payment."
            )
        invoice = db.get(Invoice, payment.invoice_id)
        if invoice is None or invoice.status in {"voided", "draft"}:
            raise HTTPException(409, "Invoice is not eligible for payment allocation.")
        now = utcnow()
        try:
            # Compare-and-set guards duplicate verification even when two requests
            # read pending simultaneously. The invoice update separately guards
            # concurrent partial payments from overpaying the invoice.
            changed = db.execute(
                update(Payment)
                .where(Payment.id == payment.id, Payment.status == "pending")
                .values(status="verified", verified_at=now, bank_reference=data.bank_reference)
                .returning(Payment.id)
                .execution_options(synchronize_session=False)
            ).scalar_one_or_none()
            if changed is None:
                db.rollback()
                raise HTTPException(409, "Payment has already been processed.")
            allocated = db.execute(
                update(Invoice)
                .where(
                    Invoice.id == payment.invoice_id,
                    Invoice.status.notin_(["draft", "voided"]),
                    Invoice.paid_amount + payment.amount <= Invoice.total,
                )
                .values(paid_amount=Invoice.paid_amount + payment.amount)
                .returning(Invoice.id)
                .execution_options(synchronize_session=False)
            ).scalar_one_or_none()
            if allocated is None:
                db.rollback()
                raise HTTPException(409, "Payment exceeds the remaining invoice balance.")
            db.refresh(invoice)
            paid_before = invoice.paid_amount - payment.amount
            invoice.status = "paid" if invoice.paid_amount == invoice.total else "partially_paid"
            db.add(
                PaymentVerification(
                    id=str(uuid4()),
                    payment_id=payment.id,
                    verified_by=user.id,
                    evidence_type=data.evidence_type,
                    evidence_reference=data.evidence_reference,
                    notes=data.notes,
                    created_at=now,
                )
            )
            _audit(
                db,
                user,
                "payment.verified",
                "payment",
                payment.id,
                {
                    "amount": payment.amount,
                    "invoice_id": invoice.id,
                    "evidence_type": data.evidence_type,
                    "evidence_reference": data.evidence_reference,
                    "bank_reference": data.bank_reference,
                    "paid_before": paid_before,
                    "paid_after": invoice.paid_amount,
                },
            )
            db.commit()
        except IntegrityError:
            db.rollback()
            raise HTTPException(
                409, "This transaction reference or payment has already been reconciled."
            ) from None
        db.refresh(payment)
        return payment


@router.get("/invoices")
def list_invoices(
    status: str | None = None,
    search: str | None = Query(None, max_length=100),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    _finance_user(user)
    query = select(Invoice)
    if user.role == "student":
        query = query.where(Invoice.student_id == _student_for_user(db, user).id)
    if search:
        query = query.join(Student, Student.id == Invoice.student_id).where(
            (Invoice.number.ilike(f"%{search}%")) | (Student.full_name.ilike(f"%{search}%"))
        )
    if status:
        if status == "overdue":
            query = query.where(
                Invoice.due_date < date.today(),
                Invoice.paid_amount == 0,
                Invoice.status.notin_(["draft", "voided"]),
            )
        elif status == "issued":
            query = query.where(
                Invoice.due_date >= date.today(),
                Invoice.paid_amount == 0,
                Invoice.status.in_(["issued", "unpaid"]),
            )
        elif status == "partially_paid":
            query = query.where(Invoice.status.in_(["partially_paid", "partial"]))
        else:
            query = query.where(Invoice.status == status)
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    invoices = db.scalars(
        query.order_by(Invoice.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    ).all()
    return {"items": [invoice_dict(db, row) for row in invoices], "total": total}


@router.post("/invoices", status_code=201)
def create_invoice(
    data: InvoiceCreate, db: Session = Depends(get_db), user: User = Depends(current_user)
):
    return invoice_dict(db, InvoiceService.create(db, user, data))


@router.get("/invoices/{invoice_id}")
def get_invoice(invoice_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    return invoice_dict(db, _invoice(db, invoice_id, user))


@router.get("/invoices/{invoice_id}/challan")
def download_challan(
    invoice_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)
):
    from reportlab.graphics import renderPDF
    from reportlab.graphics.barcode.qr import QrCodeWidget
    from reportlab.graphics.shapes import Drawing
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas

    invoice = _invoice(db, invoice_id, user)
    student = db.get(Student, invoice.student_id)
    output = io.BytesIO()
    pdf = canvas.Canvas(output, pagesize=A4)
    pdf.setTitle(f"E-11 Hostel challan {invoice.number}")
    pdf.setFillColor(colors.HexColor("#145843"))
    pdf.roundRect(42, 713, 511, 85, 12, fill=1, stroke=0)
    pdf.setFillColor(colors.white)
    pdf.setFont("Helvetica-Bold", 26)
    pdf.drawString(62, 760, "E-11 HOSTEL")
    pdf.setFont("Helvetica", 11)
    pdf.drawString(62, 737, "Monthly rent challan  |  Islamabad")
    pdf.setFillColor(colors.HexColor("#173d32"))
    pdf.setFont("Helvetica-Bold", 15)
    pdf.drawString(44, 675, invoice.number)
    pdf.setFont("Helvetica", 11)
    allocation = db.scalar(
        select(Allocation).where(
            Allocation.student_id == invoice.student_id, Allocation.active.is_(True)
        )
    )
    bed = db.get(Bed, allocation.bed_id) if allocation else None
    room = db.get(Room, bed.room_id) if bed else None
    room_label = (
        f"Room {room.number} / Bed {bed.label}" if room and bed else "Not currently allocated"
    )
    rows = [
        ("Resident", student.full_name if student else "Resident"),
        ("Resident ID", invoice.student_id),
        ("Billing month", invoice.month),
        ("Room / bed", room_label),
        ("Due date", invoice.due_date.isoformat()),
        ("Currency", "PKR"),
    ]
    for index, (label, value) in enumerate(rows):
        y = 642 - index * 26
        pdf.setFillColor(colors.HexColor("#66736d"))
        pdf.drawString(44, y, label)
        pdf.setFillColor(colors.HexColor("#173d32"))
        pdf.drawString(175, y, str(value)[:62])
    y = 470
    for label, amount in [
        ("Monthly rent", invoice.subtotal),
        ("Late fee", invoice.late_fee),
        ("Invoice total", invoice.total),
        ("Verified payments", invoice.paid_amount),
        ("Balance payable", invoice.total - invoice.paid_amount),
    ]:
        pdf.setFont("Helvetica-Bold" if label == "Balance payable" else "Helvetica", 12)
        pdf.drawString(44, y, label)
        pdf.drawRightString(550, y, f"PKR {amount:,}")
        pdf.setStrokeColor(colors.HexColor("#dfe6e1"))
        pdf.line(44, y - 12, 550, y - 12)
        y -= 43
    pdf.setFont("Helvetica", 10)
    instructions = [
        "Confirm current account details with the hostel office before transferring funds.",
        "Include the challan number in your transfer reference, then upload your receipt.",
        "Your invoice updates only after authorized bank or provider reconciliation.",
        "This QR code contains an invoice reference; it is not a payment gateway.",
    ]
    for index, line in enumerate(instructions):
        pdf.drawString(44, 221 - index * 18, line)
    qr = QrCodeWidget(f"E11-INVOICE:{invoice.number}")
    bounds = qr.getBounds()
    qr_size = 78
    drawing = Drawing(
        qr_size,
        qr_size,
        transform=[
            qr_size / (bounds[2] - bounds[0]),
            0,
            0,
            qr_size / (bounds[3] - bounds[1]),
            0,
            0,
        ],
    )
    drawing.add(qr)
    renderPDF.draw(drawing, pdf, 44, 53)
    pdf.setFont("Helvetica", 9)
    pdf.drawString(
        139,
        86,
        f"Generated {date.today().isoformat()} | Payment confirmation requires reconciliation.",
    )
    pdf.save()
    return Response(
        output.getvalue(),
        media_type="application/pdf",
        headers={
            "Content-Disposition": f'attachment; filename="{invoice.number}.pdf"',
            "Cache-Control": "no-store",
        },
    )


@router.get("/payments")
def list_payments(
    status: str | None = None,
    search: str | None = Query(None, max_length=100),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    _finance_user(user)
    query = select(Payment)
    if user.role == "student":
        query = query.where(Payment.student_id == _student_for_user(db, user).id)
    if status:
        query = query.where(Payment.status == status)
    if search:
        query = query.join(Student, Student.id == Payment.student_id).where(
            (Payment.reference.ilike(f"%{search}%")) | (Student.full_name.ilike(f"%{search}%"))
        )
    total = db.scalar(select(func.count()).select_from(query.subquery())) or 0
    payments = db.scalars(
        query.order_by(Payment.created_at.desc()).offset((page - 1) * page_size).limit(page_size)
    ).all()
    return {"items": [payment_dict(db, row) for row in payments], "total": total}


@router.post("/payments", status_code=201)
def create_payment(
    data: PaymentCreate, db: Session = Depends(get_db), user: User = Depends(current_user)
):
    return payment_dict(db, PaymentService.create(db, user, data))


@router.get("/payments/{payment_id}")
def get_payment(payment_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)):
    return payment_dict(db, _payment(db, payment_id, user))


@router.post("/payments/{payment_id}/verification")
def verify_payment(
    payment_id: str,
    data: PaymentVerify,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    return payment_dict(db, PaymentVerificationService.verify(db, user, payment_id, data))


def _validated_receipt(content: bytes, content_type: str | None) -> tuple[str, str]:
    if not content:
        raise HTTPException(422, "Receipt file is empty.")
    if content.startswith(b"%PDF-"):
        mime, extension = "application/pdf", ".pdf"
        if content_type != mime:
            raise HTTPException(415, "File content does not match its declared type.")
        try:
            reader = PdfReader(io.BytesIO(content), strict=True)
            if reader.is_encrypted or not 0 < len(reader.pages) <= 30:
                raise ValueError("Encrypted or excessive-page PDF")
            # Reject active documents even though downloads use attachment.
            unsafe = (
                b"/JavaScript",
                b"/JS",
                b"/OpenAction",
                b"/AA",
                b"/EmbeddedFiles",
                b"/Launch",
                b"/RichMedia",
            )
            if any(token in content for token in unsafe):
                raise ValueError("Active PDF content")
            # Parsed names also catch escaped PDF names and compressed object
            # streams, which a byte signature scan alone cannot identify.
            forbidden_keys = {
                "/JS",
                "/JavaScript",
                "/OpenAction",
                "/AA",
                "/EmbeddedFiles",
                "/Launch",
                "/RichMedia",
                "/AcroForm",
                "/AF",
            }
            forbidden_actions = {
                "/JavaScript",
                "/Launch",
                "/SubmitForm",
                "/ImportData",
                "/Rendition",
            }
            pending = [(reader.trailer, 0)]
            visited: set[int] = set()
            examined = 0
            while pending:
                obj, depth = pending.pop()
                examined += 1
                if examined > 20_000 or depth > 80:
                    raise ValueError("PDF object graph exceeds safe receipt limits")
                if isinstance(obj, IndirectObject):
                    object_key = (obj.idnum, obj.generation)
                    if object_key in visited:
                        continue
                    visited.add(object_key)
                    obj = obj.get_object()
                if isinstance(obj, DictionaryObject):
                    if forbidden_keys.intersection(str(key) for key in obj):
                        raise ValueError("Active PDF dictionary")
                    if str(obj.get("/S", "")) in forbidden_actions:
                        raise ValueError("Active PDF action")
                    pending.extend((value, depth + 1) for value in obj.values())
                elif isinstance(obj, ArrayObject):
                    pending.extend((value, depth + 1) for value in obj)
        except Exception as exc:
            raise HTTPException(
                422,
                "Use a valid, unencrypted PDF without scripts or attachments (maximum 30 pages).",
            ) from exc
        return mime, extension
    if content.startswith(b"\x89PNG\r\n\x1a\n"):
        mime, extension, expected_format = "image/png", ".png", "PNG"
    elif content.startswith(b"\xff\xd8\xff"):
        mime, extension, expected_format = "image/jpeg", ".jpg", "JPEG"
    else:
        raise HTTPException(415, "Only genuine PDF, JPEG, or PNG receipt files are accepted.")
    if content_type != mime:
        raise HTTPException(415, "File content does not match its declared type.")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter("error", Image.DecompressionBombWarning)
            with Image.open(io.BytesIO(content)) as image:
                if (
                    image.format != expected_format
                    or image.width * image.height > MAX_RECEIPT_PIXELS
                ):
                    raise ValueError("Invalid or oversized image")
                image.verify()
    except Exception as exc:
        raise HTTPException(
            422, "Receipt image is damaged or exceeds the image resolution limit."
        ) from exc
    return mime, extension


def _receipt_dict(receipt: Receipt) -> dict:
    return {
        "id": receipt.id,
        "payment_id": receipt.payment_id,
        "original_name": receipt.original_name,
        "content_type": receipt.content_type,
        "size": receipt.size,
        "download_url": f"/api/v1/payments/{receipt.payment_id}/receipt?receipt_id={receipt.id}",
        "review_notice": "Uploaded receipts are not payment confirmation.",
    }


@router.post("/payments/{payment_id}/receipts", status_code=201)
async def upload_receipt(
    payment_id: str,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    payment = _payment(db, payment_id, user)
    if payment.status != "pending":
        raise HTTPException(409, "Receipts can only be added to a pending payment.")
    content = await file.read(MAX_RECEIPT_BYTES + 1)
    await file.close()
    if len(content) > MAX_RECEIPT_BYTES:
        raise HTTPException(413, "Receipt must be 5 MB or smaller.")
    mime, extension = _validated_receipt(content, file.content_type)
    digest = hashlib.sha256(content).hexdigest()
    if db.scalar(select(Receipt.id).where(Receipt.sha256 == digest)):
        raise HTTPException(409, "This receipt has already been submitted for review.")
    receipt_id = str(uuid4())
    storage_key = f"{uuid4().hex}{extension}"
    folder = Path(settings.private_storage_path) / "receipts"
    folder.mkdir(mode=0o700, parents=True, exist_ok=True)
    destination = folder / storage_key
    original_name = Path((file.filename or f"receipt{extension}").replace("\\", "/")).name
    original_name = re.sub(r"[\x00-\x1f\x7f]", "", original_name)[:180] or f"receipt{extension}"
    original_name = f"{Path(original_name).stem[:160]}{extension}"
    try:
        with destination.open("xb") as output:
            output.write(content)
        destination.chmod(0o600)
        receipt = Receipt(
            id=receipt_id,
            payment_id=payment.id,
            storage_key=storage_key,
            original_name=original_name,
            content_type=mime,
            size=len(content),
            sha256=digest,
        )
        db.add(receipt)
        _audit(
            db,
            user,
            "payment.receipt_uploaded",
            "payment",
            payment.id,
            {"receipt_id": receipt_id, "size": len(content), "content_type": mime},
        )
        db.commit()
    except Exception:
        db.rollback()
        destination.unlink(missing_ok=True)
        raise
    return _receipt_dict(receipt)


@router.get("/payments/{payment_id}/receipts")
def list_receipts(
    payment_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)
):
    _payment(db, payment_id, user)
    receipts = db.scalars(select(Receipt).where(Receipt.payment_id == payment_id)).all()
    return {"items": [_receipt_dict(row) for row in receipts], "total": len(receipts)}


@router.get("/payments/{payment_id}/receipt")
def download_receipt(
    payment_id: str,
    receipt_id: str | None = None,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    _payment(db, payment_id, user)
    query = select(Receipt).where(Receipt.payment_id == payment_id)
    if receipt_id:
        query = query.where(Receipt.id == receipt_id)
    receipt = db.scalar(query)
    if receipt is None:
        raise HTTPException(404, "Receipt not found.")
    folder = (Path(settings.private_storage_path) / "receipts").resolve()
    path = (folder / receipt.storage_key).resolve()
    if path.parent != folder or not path.is_file():
        raise HTTPException(404, "Receipt file not found.")
    return FileResponse(
        path,
        media_type=receipt.content_type,
        filename=receipt.original_name,
        headers={"Cache-Control": "no-store", "X-Content-Type-Options": "nosniff"},
    )


@router.get("/reports/financial")
def financial_report(db: Session = Depends(get_db), user: User = Depends(current_user)):
    _owner(user)
    valid_invoices = select(Invoice).where(Invoice.status.notin_(["voided", "draft"]))
    invoices = db.scalars(valid_invoices).all()
    total_billed = sum(row.total for row in invoices)
    # Revenue derives from verified financial records, never from uploaded receipts.
    verified = db.scalars(select(Payment).where(Payment.status == "verified")).all()
    collected = sum(row.amount for row in verified)
    overdue = [
        row for row in invoices if row.due_date < date.today() and row.paid_amount < row.total
    ]
    return {
        "currency": "PKR",
        "total_billed": total_billed,
        "total_collected": collected,
        "outstanding": sum(row.total - row.paid_amount for row in invoices),
        "overdue_amount": sum(row.total - row.paid_amount for row in overdue),
        "overdue_invoices": len(overdue),
        "pending_reviews": db.scalar(
            select(func.count(Payment.id)).where(Payment.status == "pending")
        )
        or 0,
        "payment_methods": [
            {
                "method": method,
                "amount": sum(row.amount for row in verified if row.method == method),
            }
            for method in sorted({row.method for row in verified})
        ],
        "defaulters": [invoice_dict(db, row) for row in overdue],
    }
