"""Financial invariants and private file boundary regression tests."""

import asyncio
import io
from datetime import date

import pytest
from fastapi import HTTPException, UploadFile
from PIL import Image
from pydantic import ValidationError
from reportlab.pdfgen.canvas import Canvas
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session
from starlette.datastructures import Headers

from app.database.base import Base
from app.database.models import AuditEvent, Invoice, Payment, PaymentVerification, Student, User
from app.modules import finance


@pytest.fixture
def finance_db(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'financial.db'}")
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        owner = User(
            id="owner",
            email="owner@example.test",
            password_hash="irrelevant",
            full_name="Owner",
            role="owner",
        )
        user = User(
            id="resident",
            email="resident@example.test",
            password_hash="irrelevant",
            full_name="Resident One",
            role="student",
        )
        other = User(
            id="other",
            email="other@example.test",
            password_hash="irrelevant",
            full_name="Resident Two",
            role="student",
        )
        student = Student(id="student", user_id=user.id, full_name=user.full_name, email=user.email)
        second = Student(
            id="second", user_id=other.id, full_name=other.full_name, email=other.email
        )
        db.add_all([owner, user, other, student, second])
        db.commit()
        yield db, owner, user, other, student, second
    engine.dispose()


def issue(db, owner, student, *, amount=10_000, month="2026-10"):
    return finance.InvoiceService.create(
        db,
        owner,
        finance.InvoiceCreate(
            student_id=student.id,
            month=month,
            subtotal=amount,
            late_fee=0,
            due_date=date(2026, 10, 5),
        ),
    )


def submit(db, user, invoice, amount=4_000, **kwargs):
    return finance.PaymentService.create(
        db, user, finance.PaymentCreate(invoice_id=invoice.id, amount=amount, **kwargs)
    )


def reconcile(db, owner, payment, suffix="A"):
    return finance.PaymentVerificationService.verify(
        db,
        owner,
        payment.id,
        finance.PaymentVerify(
            evidence_type="bank_statement",
            evidence_reference=f"BANK-STATEMENT-LINE-{suffix}",
            confirmation="VERIFY PAYMENT",
            bank_reference=f"BANK-TXN-{suffix}",
            notes="Reconciled against the trusted bank statement.",
        ),
    )


def assert_http(status, operation):
    with pytest.raises(HTTPException) as caught:
        operation()
    assert caught.value.status_code == status


def test_invoice_totals_billing_period_uniqueness_and_exact_rupees(finance_db):
    db, owner, user, other, student, second = finance_db
    invoice = issue(db, owner, student)
    assert invoice.total == 10_000
    assert invoice.paid_amount == 0
    assert_http(409, lambda: issue(db, owner, student))
    assert_http(403, lambda: issue(db, user, second, month="2026-11"))
    with pytest.raises(ValidationError):
        finance.PaymentCreate(invoice_id=invoice.id, amount=12.5)
    with pytest.raises(ValidationError):
        finance.PaymentCreate(invoice_id=invoice.id, amount=-10)


def test_pending_payment_does_not_settle_invoice_and_reconciliation_is_append_only(finance_db):
    db, owner, user, other, student, second = finance_db
    invoice = issue(db, owner, student)
    payment = submit(db, user, invoice, idempotency_key="same-payment-request")
    assert payment.status == "pending"
    assert db.get(Invoice, invoice.id).paid_amount == 0
    duplicate = submit(db, user, invoice, idempotency_key="same-payment-request")
    assert duplicate.id == payment.id
    assert_http(
        409, lambda: submit(db, user, invoice, amount=5000, idempotency_key="same-payment-request")
    )
    assert_http(403, lambda: reconcile(db, user, payment))
    reconcile(db, owner, payment)
    assert db.get(Invoice, invoice.id).paid_amount == 4_000
    assert db.get(Invoice, invoice.id).status == "partially_paid"
    assert submit(db, user, invoice, idempotency_key="same-payment-request").id == payment.id
    assert_http(409, lambda: reconcile(db, owner, payment, "B"))
    assert db.scalar(select(func.count(PaymentVerification.id))) == 1
    assert (
        db.scalar(select(func.count(AuditEvent.id)).where(AuditEvent.action == "payment.verified"))
        == 1
    )
    remainder = submit(db, user, invoice, amount=6_000)
    reconcile(db, owner, remainder, "B")
    assert db.get(Invoice, invoice.id).paid_amount == 10_000
    assert db.get(Invoice, invoice.id).status == "paid"


def test_outstanding_balance_is_checked_again_at_verification(finance_db):
    db, owner, user, other, student, second = finance_db
    invoice = issue(db, owner, student)
    first = submit(db, user, invoice, amount=7_000)
    second_payment = submit(db, user, invoice, amount=7_000)
    reconcile(db, owner, first, "A")
    assert_http(409, lambda: reconcile(db, owner, second_payment, "B"))
    assert db.get(Invoice, invoice.id).paid_amount == 7_000
    assert db.get(Payment, second_payment.id).status == "pending"
    assert db.scalar(select(func.count(PaymentVerification.id))) == 1


def test_reused_evidence_reference_rolls_back_the_entire_transaction(finance_db):
    db, owner, user, other, student, second = finance_db
    invoice = issue(db, owner, student)
    first = submit(db, user, invoice)
    second_payment = submit(db, user, invoice)
    reconcile(db, owner, first, "A")
    data = finance.PaymentVerify(
        evidence_type="bank_statement",
        evidence_reference="BANK-STATEMENT-LINE-A",
        confirmation="VERIFY PAYMENT",
        bank_reference="DIFFERENT-BANK-REFERENCE",
    )
    assert_http(
        409, lambda: finance.PaymentVerificationService.verify(db, owner, second_payment.id, data)
    )
    assert db.get(Invoice, invoice.id).paid_amount == 4_000
    assert db.get(Payment, second_payment.id).status == "pending"
    assert db.get(Payment, second_payment.id).bank_reference is None


def test_cross_resident_financial_identifiers_are_not_accessible(finance_db):
    db, owner, user, other, student, second = finance_db
    invoice = issue(db, owner, student)
    payment = submit(db, user, invoice)
    assert_http(404, lambda: finance._invoice(db, invoice.id, other))
    assert_http(404, lambda: finance._payment(db, payment.id, other))
    assert_http(404, lambda: submit(db, other, invoice))
    warden = User(
        id="warden",
        role="warden",
        email="warden@example.test",
        full_name="Warden",
        password_hash="irrelevant",
    )
    assert_http(403, lambda: finance._invoice(db, invoice.id, warden))


def png_receipt():
    output = io.BytesIO()
    Image.new("RGB", (20, 20), color="green").save(output, format="PNG")
    return output.getvalue()


def test_receipt_content_validation_and_private_authorized_download(
    finance_db, tmp_path, monkeypatch
):
    db, owner, user, other, student, second = finance_db
    monkeypatch.setattr(finance.settings, "private_storage_path", tmp_path / "private")
    invoice = issue(db, owner, student)
    payment = submit(db, user, invoice)
    upload = UploadFile(
        io.BytesIO(png_receipt()),
        filename="../../receipt.exe",
        headers=Headers({"content-type": "image/png"}),
    )
    receipt = asyncio.run(finance.upload_receipt(payment.id, upload, db, user))
    assert receipt["original_name"] == "receipt.png"
    assert db.get(Invoice, invoice.id).paid_amount == 0
    assert db.get(Payment, payment.id).status == "pending"
    private_files = list((tmp_path / "private" / "receipts").iterdir())
    assert len(private_files) == 1
    assert private_files[0].stat().st_mode & 0o777 == 0o600
    assert_http(404, lambda: finance.download_receipt(payment.id, receipt["id"], db, other))
    response = finance.download_receipt(payment.id, receipt["id"], db, user)
    assert response.media_type == "image/png"
    assert response.headers["cache-control"] == "no-store"
    assert_http(415, lambda: finance._validated_receipt(png_receipt(), "application/pdf"))
    assert_http(415, lambda: finance._validated_receipt(b"<script>alert(1)</script>", "image/png"))


def test_pdf_challan_and_active_pdf_receipt_rejection(finance_db):
    db, owner, user, other, student, second = finance_db
    invoice = issue(db, owner, student)
    response = finance.download_challan(invoice.id, db, user)
    assert response.media_type == "application/pdf"
    assert response.body.startswith(b"%PDF-")
    assert finance._validated_receipt(response.body, "application/pdf") == (
        "application/pdf",
        ".pdf",
    )
    output = io.BytesIO()
    pdf = Canvas(output)
    pdf.drawString(100, 100, "An uploaded screenshot is not verification evidence.")
    pdf.save()
    assert_http(
        422,
        lambda: finance._validated_receipt(output.getvalue() + b"/JavaScript", "application/pdf"),
    )
    with pytest.raises(ValidationError):
        finance.PaymentVerify(
            evidence_type="bank_statement",
            evidence_reference="screenshot",
            confirmation="VERIFY PAYMENT",
            bank_reference="REF-123",
        )
