"""End-to-end API checks for operations, resource scopes and data invariants."""

from concurrent.futures import ThreadPoolExecutor
from datetime import date
from threading import Barrier

import pytest
from sqlalchemy import func, inspect, select
from sqlalchemy.exc import IntegrityError

from app.core.security import token_hash
from app.database.models import (
    Allocation,
    AuditEvent,
    Bed,
    Complaint,
    Floor,
    Invoice,
    MessCount,
    Payment,
    Room,
    RoomType,
    Student,
    User,
    UserSession,
)
from app.scripts.seed_demo import seed_demo
from tests.conftest import migrate


def free_bed(db):
    return db.scalar(
        select(Bed).where(~Bed.id.in_(select(Allocation.bed_id).where(Allocation.active.is_(True))))
    )


def test_migrations_upgrade_downgrade_upgrade(isolated_engine):
    migrate(isolated_engine)
    assert {"users", "invoices", "allocations", "ai_knowledge_documents"} <= set(
        inspect(isolated_engine).get_table_names()
    )
    migrate(isolated_engine, "base", downgrade=True)
    assert "users" not in inspect(isolated_engine).get_table_names()
    migrate(isolated_engine)
    assert "payment_verifications" in inspect(isolated_engine).get_table_names()


def test_authentication_session_is_opaque_and_logout_revokes_it(backend_api):
    client = backend_api.client
    assert client.get("/api/v1/auth/me").status_code == 401
    bad = client.post(
        "/api/v1/auth/login", json={"email": "owner@e11.demo", "password": "wrong-password"}
    )
    assert bad.status_code == 401
    assert "e11_session" not in client.cookies
    owner = backend_api.login()
    assert owner.get("/api/v1/auth/me").json()["user"]["role"] == "owner"
    raw = owner.cookies["e11_session"]
    row = backend_api.db.scalar(
        select(UserSession).where(UserSession.token_hash == token_hash(raw))
    )
    assert row is not None and row.token_hash != raw
    session_id = row.id
    assert owner.post("/api/v1/auth/logout").status_code == 200
    assert owner.get("/api/v1/auth/me").status_code == 401
    backend_api.db.expire_all()
    assert backend_api.db.get(UserSession, session_id) is None


def test_authenticated_writes_require_session_bound_csrf(backend_api):
    owner = backend_api.login()
    del owner.headers["X-CSRF-Token"]
    missing = owner.post("/api/v1/auth/logout")
    assert missing.status_code == 403
    assert missing.json()["detail"] == "CSRF validation failed"
    wrong = owner.post("/api/v1/auth/logout", headers={"X-CSRF-Token": "incorrect"})
    assert wrong.status_code == 403
    assert owner.get("/api/v1/auth/me").status_code == 200
    rejected_origin = owner.post(
        "/api/v1/auth/logout",
        headers={**backend_api.csrf(owner), "Origin": "https://untrusted.example"},
    )
    assert rejected_origin.status_code == 403
    assert owner.post("/api/v1/auth/logout", headers=backend_api.csrf(owner)).status_code == 200


def test_student_cannot_discover_other_resident_finances_or_room_names(backend_api):
    client = backend_api.login("student")
    student = backend_api.db.scalar(select(Student).where(Student.email == "student@e11.demo"))
    other_invoice = backend_api.db.scalar(select(Invoice).where(Invoice.student_id != student.id))
    other_payment = backend_api.db.scalar(select(Payment).where(Payment.student_id != student.id))
    assert client.get(f"/api/v1/invoices/{other_invoice.id}").status_code == 404
    assert client.get(f"/api/v1/invoices/{other_invoice.id}/challan").status_code == 404
    assert client.get(f"/api/v1/payments/{other_payment.id}").status_code == 404
    assert client.get(f"/api/v1/payments/{other_payment.id}/receipts").status_code == 404
    own = client.get("/api/v1/invoices").json()
    assert own["total"] == 3
    assert {invoice["student_id"] for invoice in own["items"]} == {student.id}
    rooms = client.get("/api/v1/rooms").json()["items"]
    assert len(rooms) == 1
    assert all(
        bed["student_name"] is None and bed["student_id"] is None for bed in rooms[0]["beds"]
    )
    assert client.get("/api/v1/students").status_code == 403
    assert client.get("/api/v1/settings").status_code == 403


def test_assistant_direct_financial_and_owner_endpoints_are_denied(backend_api):
    assistant = backend_api.login("assistant")
    for path in ("invoices", "payments", "reports/financial", "settings", "staff", "audit-events"):
        response = assistant.get(f"/api/v1/{path}")
        assert response.status_code == 403, (path, response.text)
    students = assistant.get("/api/v1/students").json()["items"]
    assert students
    assert all("guardian_phone" not in row and "email" not in row for row in students)
    dashboard = assistant.get("/api/v1/dashboard").json()
    assert "collected" not in dashboard["metrics"]
    assert "outstanding" not in dashboard["metrics"]
    assert dashboard["recent_payments"] == []


def test_booking_review_allocation_and_explicit_account_activation(backend_api):
    db = backend_api.db
    room_type = db.scalar(select(RoomType).where(RoomType.capacity == 2))
    payload = {
        "full_name": "New Booking Resident",
        "email": "new.resident@example.com",
        "phone": "03001234567",
        "university": "NUST",
        "room_type_id": room_type.id,
    }
    created = backend_api.client.post("/api/v1/bookings", json=payload)
    assert created.status_code == 201, created.text
    booking = created.json()
    assert booking["status"] == "submitted" and booking["reference"].startswith("E11-BK-")
    assert backend_api.client.post("/api/v1/bookings", json=payload).status_code == 409
    owner = backend_api.login()
    approved = owner.post(f"/api/v1/bookings/{booking['id']}/approve", json={"notes": "Reviewed"})
    assert approved.status_code == 200 and approved.json()["status"] == "approved"
    resident = db.scalar(select(Student).where(Student.email == payload["email"]))
    assert resident and resident.status == "pending" and resident.user_id is None
    assert (
        db.scalar(select(func.count(Allocation.id)).where(Allocation.student_id == resident.id))
        == 0
    )
    assert owner.post(f"/api/v1/bookings/{booking['id']}/approve", json={}).status_code == 409
    bed = db.scalar(
        select(Bed)
        .join(Room)
        .where(
            Room.room_type_id == room_type.id,
            ~Bed.id.in_(select(Allocation.bed_id).where(Allocation.active.is_(True))),
        )
    )
    allocated = owner.post(
        "/api/v1/allocations", json={"student_id": resident.id, "bed_id": bed.id}
    )
    assert allocated.status_code == 201, allocated.text
    assert allocated.json()["bed_id"] == bed.id
    assert (
        owner.post(
            "/api/v1/allocations", json={"student_id": resident.id, "bed_id": bed.id}
        ).status_code
        == 409
    )
    db.expire_all()
    assert db.get(Student, resident.id).status == "active"
    assert (
        db.scalar(select(func.count(AuditEvent.id)).where(AuditEvent.entity_id == booking["id"]))
        == 2
    )
    password = "ActivatedDemo!2026"
    assistant = backend_api.login("assistant")
    assert (
        assistant.post(
            f"/api/v1/students/{resident.id}/activate", json={"password": password}
        ).status_code
        == 403
    )
    assert (
        owner.post(
            f"/api/v1/students/{resident.id}/activate", json={"password": "too-short"}
        ).status_code
        == 422
    )
    activated = owner.post(f"/api/v1/students/{resident.id}/activate", json={"password": password})
    assert activated.status_code == 200 and activated.json()["user_id"]
    assert (
        owner.post(
            f"/api/v1/students/{resident.id}/activate", json={"password": password}
        ).status_code
        == 409
    )
    resident_client = backend_api.new_client()
    signed_in = resident_client.post(
        "/api/v1/auth/login", json={"email": payload["email"], "password": password}
    )
    assert signed_in.status_code == 200 and signed_in.json()["user"]["role"] == "student"
    assert resident_client.get("/api/v1/profile").json()["id"] == resident.id
    room = resident_client.get("/api/v1/rooms").json()["items"][0]
    assert any(item["id"] == bed.id for item in room["beds"])


def test_room_creation_generates_matching_beds_and_enforces_owner_role(backend_api):
    db = backend_api.db
    room_type = db.scalar(select(RoomType).where(RoomType.capacity == 4))
    floor = db.scalar(select(Floor).where(Floor.number == 0))
    payload = {"number": "NEW-101", "floor_id": floor.id, "room_type_id": room_type.id}
    assistant = backend_api.login("assistant")
    assert assistant.post("/api/v1/rooms", json=payload).status_code == 403
    owner = backend_api.login()
    created = owner.post("/api/v1/rooms", json=payload)
    assert created.status_code == 201, created.text
    assert created.json()["capacity"] == 4
    assert len(created.json()["beds"]) == 4
    assert owner.post("/api/v1/rooms", json=payload).status_code == 409
    rooms = owner.get("/api/v1/rooms").json()["items"]
    assert sum(row["number"] == "NEW-101" for row in rooms) == 1


def test_complaint_resolution_and_student_reopening_preserve_scope(backend_api):
    student = backend_api.login("student")
    payload = {
        "title": "Desk lamp needs replacement",
        "category": "maintenance",
        "description": "The desk lamp has stopped working and needs a replacement.",
        "priority": "normal",
    }
    created = student.post("/api/v1/complaints", json=payload)
    assert created.status_code == 201, created.text
    ticket = created.json()
    assert ticket["status"] == "open"
    assert (
        student.patch(f"/api/v1/complaints/{ticket['id']}", json={"status": "resolved"}).status_code
        == 403
    )
    other = backend_api.login("student02@e11.demo")
    assert (
        other.patch(f"/api/v1/complaints/{ticket['id']}", json={"status": "open"}).status_code
        == 404
    )
    owner = backend_api.login()
    resolved = owner.patch(
        f"/api/v1/complaints/{ticket['id']}",
        json={"status": "resolved", "response": "Lamp replaced."},
    )
    assert resolved.status_code == 200 and resolved.json()["status"] == "resolved"
    reopened = student.patch(f"/api/v1/complaints/{ticket['id']}", json={"status": "open"})
    assert reopened.status_code == 200 and reopened.json()["status"] == "open"
    notices = student.get("/api/v1/notifications").json()["items"]
    assert any(ticket["reference"] in item["message"] for item in notices)


def test_assistant_can_record_aggregate_meals_but_cannot_change_menu(backend_api):
    assistant = backend_api.login("assistant")
    result = assistant.put(
        "/api/v1/mess", json={"counts": [{"date": "2026-11-01", "meal": "dinner", "count": 29}]}
    )
    assert result.status_code == 200
    updated = assistant.put(
        "/api/v1/mess", json={"counts": [{"date": "2026-11-01", "meal": "dinner", "count": 30}]}
    )
    assert updated.status_code == 200
    db = backend_api.db
    assert (
        db.scalar(select(func.count(MessCount.id)).where(MessCount.date == date(2026, 11, 1))) == 1
    )
    assert db.scalar(select(MessCount.count).where(MessCount.date == date(2026, 11, 1))) == 30
    forbidden = assistant.put(
        "/api/v1/mess",
        json={
            "menus": [
                {
                    "day": "Monday",
                    "breakfast": "Toast",
                    "lunch": "Rice",
                    "dinner": "Daal",
                }
            ]
        },
    )
    assert forbidden.status_code == 403
    invalid = assistant.put(
        "/api/v1/mess", json={"counts": [{"date": "2026-11-02", "meal": "dinner", "count": -1}]}
    )
    assert invalid.status_code == 422
    student = backend_api.login("student")
    assert student.get("/api/v1/mess").json()["counts"] == []
    assert student.put("/api/v1/mess", json={"counts": []}).status_code == 403


def test_seed_public_availability_dashboard_and_ledger_agree(backend_api):
    db = backend_api.db
    assert seed_demo(db)["status"] == "already_seeded"
    public = backend_api.client.get("/api/v1/public/rooms").json()["items"]
    owner = backend_api.login()
    dashboard = owner.get("/api/v1/dashboard").json()["metrics"]
    assert dashboard["total_beds"] == 100
    assert dashboard["occupied_beds"] == 32
    assert dashboard["available_beds"] == 68
    assert sum(room["available_beds"] for room in public) == dashboard["available_beds"]
    assert sum(room["total_beds"] for room in public) == dashboard["total_beds"]
    paid = db.scalar(select(func.sum(Invoice.paid_amount)))
    settled = db.scalar(select(func.sum(Payment.amount)).where(Payment.status == "verified"))
    assert paid == settled == dashboard["collected"]
    report = owner.get("/api/v1/reports/financial").json()
    assert report["total_collected"] == settled
    assert report["total_billed"] == report["total_collected"] + report["outstanding"]
    assert report["pending_reviews"] == 4
    allocation = db.scalar(select(Allocation))
    with pytest.raises(IntegrityError):
        with db.begin_nested():
            db.add(
                Allocation(
                    student_id=allocation.student_id,
                    bed_id=allocation.bed_id,
                    starts_on=date.today(),
                    active=True,
                )
            )
            db.flush()


def test_simultaneous_bed_requests_create_only_one_active_allocation(backend_api):
    owner = backend_api.login()
    db = backend_api.db
    students = []
    for index in range(2):
        created = owner.post(
            "/api/v1/students",
            json={
                "full_name": f"Concurrent Resident {index}",
                "email": f"race{index}@example.com",
                "phone": "03001234567",
            },
        )
        assert created.status_code == 201, created.text
        students.append(created.json()["id"])
    bed = free_bed(db)
    bed_id = bed.id
    cookies = dict(owner.cookies)
    csrf = backend_api.csrf(owner)
    barrier = Barrier(2)

    def allocate(student_id):
        client = backend_api.new_client()
        client.cookies.update(cookies)
        client.headers.update(csrf)
        barrier.wait(timeout=10)
        result = client.post(
            "/api/v1/allocations", json={"student_id": student_id, "bed_id": bed_id}
        )
        return result.status_code, result.text

    with ThreadPoolExecutor(max_workers=2) as executor:
        results = list(executor.map(allocate, students))
    assert sorted(status for status, _ in results) == [201, 409], results
    assert (
        db.scalar(
            select(func.count(Allocation.id)).where(
                Allocation.bed_id == bed_id, Allocation.active.is_(True)
            )
        )
        == 1
    )


def test_assistant_can_update_only_assigned_complaints(backend_api):
    assistant = backend_api.login("assistant")
    actor = backend_api.db.scalar(select(User).where(User.role == "assistant"))
    assigned = backend_api.db.scalar(
        select(Complaint).where(
            Complaint.assigned_to == actor.id, Complaint.status == "in_progress"
        )
    )
    other = backend_api.db.scalar(select(Complaint).where(Complaint.assigned_to != actor.id))
    assert (
        assistant.patch(f"/api/v1/complaints/{other.id}", json={"status": "resolved"}).status_code
        == 403
    )
    response = assistant.patch(
        f"/api/v1/complaints/{assigned.id}",
        json={"status": "resolved", "response": "Task completed."},
    )
    assert response.status_code == 200
    listed = assistant.get("/api/v1/complaints").json()["items"]
    assert all(row["assigned_to"] == actor.id for row in listed)


def test_profile_updates_are_scoped_and_cannot_change_identity_or_role(backend_api):
    student = backend_api.login("student")
    db = backend_api.db
    other = db.scalar(select(Student).where(Student.email == "student02@e11.demo"))
    original_other_name = other.full_name
    original_profile = student.get("/api/v1/profile").json()
    payload = {
        "full_name": "Ahmed Updated",
        "phone": "03001231234",
        "guardian_phone": "03101231234",
        "university": "Updated University",
    }
    assert student.put("/api/v1/profile", json={**payload, "id": other.id}).status_code == 422
    assert student.put("/api/v1/profile", json={**payload, "role": "owner"}).status_code == 422
    assert student.put(f"/api/v1/students/{other.id}", json=payload).status_code == 403
    updated = student.put("/api/v1/profile", json=payload)
    assert updated.status_code == 200
    assert updated.json()["id"] == original_profile["id"]
    assert updated.json()["email"] == original_profile["email"]
    for key, value in payload.items():
        assert updated.json()[key] == value
    identity = student.get("/api/v1/auth/me").json()["user"]
    assert identity["full_name"] == payload["full_name"] and identity["role"] == "student"
    db.expire_all()
    assert db.get(Student, other.id).full_name == original_other_name


def test_price_changes_update_public_rooms_and_preserve_existing_invoices(backend_api):
    db = backend_api.db
    category = db.scalar(select(RoomType).where(RoomType.capacity == 2))
    category_id = category.id
    previous_invoices = list(db.execute(select(Invoice.id, Invoice.subtotal, Invoice.total)))
    endpoint = f"/api/v1/room-types/{category_id}/price"
    warden = backend_api.login("warden")
    assert warden.put(endpoint, json={"monthly_price": 23000}).status_code == 403
    owner = backend_api.login()
    assert owner.put(endpoint, json={"monthly_price": -1}).status_code == 422
    assert owner.put(endpoint, json={"monthly_price": 23000.5}).status_code == 422
    updated = owner.put(endpoint, json={"monthly_price": 23000})
    assert updated.status_code == 200 and updated.json()["monthly_price"] == 23000
    public = backend_api.client.get("/api/v1/public/rooms").json()["items"]
    assert next(item for item in public if item["id"] == category_id)["monthly_price"] == 23000
    assert (
        list(db.execute(select(Invoice.id, Invoice.subtotal, Invoice.total))) == previous_invoices
    )
    audit = db.scalar(select(AuditEvent).where(AuditEvent.action == "room_type.price_updated"))
    assert audit.details == {"previous": 22000, "monthly_price": 23000}


def test_maintenance_rejects_occupied_rooms_and_updates_usable_availability(backend_api):
    db = backend_api.db
    owner = backend_api.login()
    occupied_room_ids = select(Bed.room_id).join(Allocation).where(Allocation.active.is_(True))
    occupied = db.scalar(select(Room).where(Room.id.in_(occupied_room_ids)))
    empty = db.scalar(select(Room).where(~Room.id.in_(occupied_room_ids)))
    empty_id, capacity = empty.id, empty.room_type.capacity
    before = owner.get("/api/v1/dashboard").json()["metrics"]
    assert (
        owner.patch(f"/api/v1/rooms/{occupied.id}", json={"status": "maintenance"}).status_code
        == 409
    )
    changed = owner.patch(f"/api/v1/rooms/{empty_id}", json={"status": "maintenance"})
    assert changed.status_code == 200 and changed.json()["available_beds"] == 0
    after = owner.get("/api/v1/dashboard").json()["metrics"]
    assert after["usable_beds"] == before["usable_beds"] - capacity
    assert after["available_beds"] == before["available_beds"] - capacity
    assert after["occupied_beds"] == before["occupied_beds"]
    public = backend_api.client.get("/api/v1/public/rooms").json()["items"]
    assert sum(category["available_beds"] for category in public) == after["available_beds"]
    returned = owner.patch(f"/api/v1/rooms/{empty_id}", json={"status": "available"})
    assert returned.status_code == 200 and returned.json()["available_beds"] == capacity
    assert (
        owner.get("/api/v1/dashboard").json()["metrics"]["available_beds"]
        == before["available_beds"]
    )


def test_floor_creation_requires_owner_and_duplicate_numbers_return_conflict(backend_api):
    payload = {"name": "New Floor", "number": 7}
    assistant = backend_api.login("assistant")
    assert assistant.post("/api/v1/floors", json=payload).status_code == 403
    owner = backend_api.login()
    created = owner.post("/api/v1/floors", json=payload)
    assert created.status_code == 201
    assert owner.post("/api/v1/floors", json=payload).status_code == 409
    assert owner.post("/api/v1/floors", json={"name": "Invalid", "number": -1}).status_code == 422
    floors = owner.get("/api/v1/floors").json()["items"]
    assert sum(floor["number"] == 7 for floor in floors) == 1
