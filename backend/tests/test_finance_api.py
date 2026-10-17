"""Real PostgreSQL races across independent authenticated HTTP requests."""

from concurrent.futures import ThreadPoolExecutor
from contextlib import contextmanager
from threading import Barrier, Lock, get_ident

import pytest
from sqlalchemy import event, func, select

from app.database.models import AuditEvent, Invoice, Payment, PaymentVerification, Student


@contextmanager
def simultaneous_financial_reads(engine):
    """Ensure both transactions read pending state before either can mutate it.

    SQLAlchemy's event hook only coordinates test requests; all statements,
    transactions, row locks, and HTTP authentication run against PostgreSQL.
    """
    barriers = {table: Barrier(2, timeout=10) for table in ("payments", "invoices")}
    seen = set()
    lock = Lock()

    def after_read(connection, cursor, statement, parameters, context, executemany):
        normalized = " ".join(statement.lower().split())
        if not normalized.startswith("select "):
            return
        for table, barrier in barriers.items():
            if f"from {table} " not in normalized or f"where {table}.id =" not in normalized:
                continue
            key = (get_ident(), table)
            with lock:
                if key in seen:
                    return
                seen.add(key)
            barrier.wait()
            return

    event.listen(engine, "after_cursor_execute", after_read)
    try:
        yield
    finally:
        event.remove(engine, "after_cursor_execute", after_read)


def invoice_and_payments(api, owner, amounts):
    if api.engine.dialect.name != "postgresql":
        pytest.skip("Financial row-lock races require PostgreSQL.")
    student = api.db.scalar(select(Student).where(Student.email == "student@e11.demo"))
    response = owner.post(
        "/api/v1/invoices",
        json={
            "student_id": student.id,
            "month": "2027-01",
            "subtotal": 10_000,
            "late_fee": 0,
            "due_date": "2027-01-05",
        },
    )
    assert response.status_code == 201, response.text
    invoice_id = response.json()["id"]
    payments = []
    for amount in amounts:
        response = owner.post(
            "/api/v1/payments",
            json={
                "invoice_id": invoice_id,
                "amount": amount,
                "method": "bank_transfer",
            },
        )
        assert response.status_code == 201, response.text
        payments.append(response.json()["id"])
    return invoice_id, payments


def verify(client, payment_id, suffix):
    return client.post(
        f"/api/v1/payments/{payment_id}/verification",
        json={
            "evidence_type": "bank_statement",
            "evidence_reference": f"BANK-STATEMENT-LINE-{suffix}",
            "confirmation": "VERIFY PAYMENT",
            "bank_reference": f"BANK-TRANSACTION-{suffix}",
            "notes": "Authorized reconciliation against a trusted bank statement line.",
        },
    )


def test_same_payment_concurrently_reconciled_exactly_once(backend_api):
    first_owner = backend_api.login("owner")
    second_owner = backend_api.login("owner")
    invoice_id, payments = invoice_and_payments(backend_api, first_owner, [4_000])
    payment_id = payments[0]
    with (
        simultaneous_financial_reads(backend_api.engine),
        ThreadPoolExecutor(max_workers=2) as pool,
    ):
        first = pool.submit(verify, first_owner, payment_id, "IDENTICAL")
        second = pool.submit(verify, second_owner, payment_id, "IDENTICAL")
        responses = [first.result(timeout=20), second.result(timeout=20)]
    assert sorted(response.status_code for response in responses) == [200, 409]
    with backend_api.session_factory() as db:
        assert db.get(Invoice, invoice_id).paid_amount == 4_000
        assert db.get(Payment, payment_id).status == "verified"
        assert (
            db.scalar(
                select(func.count(PaymentVerification.id)).where(
                    PaymentVerification.payment_id == payment_id
                )
            )
            == 1
        )
        assert (
            db.scalar(
                select(func.count(AuditEvent.id)).where(
                    AuditEvent.action == "payment.verified", AuditEvent.entity_id == payment_id
                )
            )
            == 1
        )


def test_simultaneous_distinct_payments_cannot_overpay_invoice(backend_api):
    first_owner = backend_api.login("owner")
    second_owner = backend_api.login("owner")
    invoice_id, payments = invoice_and_payments(backend_api, first_owner, [7_000, 7_000])
    with (
        simultaneous_financial_reads(backend_api.engine),
        ThreadPoolExecutor(max_workers=2) as pool,
    ):
        first = pool.submit(verify, first_owner, payments[0], "FIRST")
        second = pool.submit(verify, second_owner, payments[1], "SECOND")
        responses = [first.result(timeout=20), second.result(timeout=20)]
    assert sorted(response.status_code for response in responses) == [200, 409]
    with backend_api.session_factory() as db:
        invoice = db.get(Invoice, invoice_id)
        assert invoice.paid_amount == 7_000
        assert invoice.total == 10_000
        assert sorted(db.get(Payment, payment_id).status for payment_id in payments) == [
            "pending",
            "verified",
        ]
        assert (
            db.scalar(
                select(func.count(PaymentVerification.id)).where(
                    PaymentVerification.payment_id.in_(payments)
                )
            )
            == 1
        )
        assert (
            db.scalar(
                select(func.count(AuditEvent.id)).where(
                    AuditEvent.action == "payment.verified", AuditEvent.entity_id.in_(payments)
                )
            )
            == 1
        )
