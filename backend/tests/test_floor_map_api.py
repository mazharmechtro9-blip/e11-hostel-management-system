from sqlalchemy import select
from app.database.models import Allocation, Invoice


def test_owner_floor_map_uses_actual_invoice_balances_and_allocation_states(backend_api):
    owner = backend_api.login()
    allocation = backend_api.db.scalar(select(Allocation).where(Allocation.active.is_(True)))
    invoices = backend_api.db.scalars(
        select(Invoice).where(Invoice.student_id == allocation.student_id)
    ).all()
    assert invoices

    def bed():
        response = owner.get("/api/v1/floor-map")
        assert response.status_code == 200
        assert response.json()["financial_status_visible"] is True
        return next(
            b for r in response.json()["items"] for b in r["beds"] if b["id"] == allocation.bed_id
        )

    for invoice in invoices:
        invoice.paid_amount = invoice.total
        invoice.status = "paid"
    backend_api.db.commit()
    assert bed()["map_status"] == "paid"
    assert bed()["outstanding"] == 0
    invoices[0].paid_amount = 0
    invoices[0].status = "issued"
    backend_api.db.commit()
    assert bed()["map_status"] == "pending"
    assert bed()["outstanding"] == invoices[0].total
    allocation.student.status = "pending"
    backend_api.db.commit()
    assert bed()["map_status"] == "unverified"
    allocation.student.status = "active"
    for invoice in invoices:
        invoice.status = "voided"
    backend_api.db.commit()
    assert bed()["map_status"] == "unverified"
    assert bed()["outstanding"] is None


def test_operational_floor_map_does_not_disclose_financial_classifications(backend_api):
    for role in ["warden", "assistant"]:
        staff = backend_api.login(role)
        response = staff.get("/api/v1/floor-map")
        assert response.status_code == 200
        payload = response.json()
        assert payload["financial_status_visible"] is False
        for room in payload["items"]:
            for bed in room["beds"]:
                assert "outstanding" not in bed and "billing_status" not in bed
                assert bed["map_status"] in {"available", "occupied", "unavailable"}
    assert backend_api.login("student").get("/api/v1/floor-map").status_code == 403
    assert backend_api.client.get("/api/v1/floor-map").status_code == 401
    public = backend_api.client.get("/api/v1/public/rooms").json()
    assert "outstanding" not in str(public) and "billing_status" not in str(public)


def test_student_overview_excludes_draft_and_voided_invoice_balances(backend_api):
    student = backend_api.login("student")
    profile = student.get("/api/v1/profile").json()
    invoices = backend_api.db.scalars(
        select(Invoice).where(Invoice.student_id == profile["id"])
    ).all()
    assert len(invoices) >= 2
    invoices[0].status = "draft"
    invoices[1].status = "voided"
    backend_api.db.commit()
    issued = [i for i in invoices if i.status not in {"draft", "voided"}]
    data = student.get("/api/v1/dashboard").json()
    assert data["metrics"]["outstanding"] == sum(i.total - i.paid_amount for i in issued)
    assert data["metrics"]["collected"] == sum(i.paid_amount for i in issued)
    assert data["student"]["current_invoice"]["id"] in {i.id for i in issued}
