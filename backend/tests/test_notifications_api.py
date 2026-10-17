from sqlalchemy import select

from app.database.models import AuditEvent, User


def test_announcements_are_real_scoped_and_staff_authorized(backend_api):
    owner = backend_api.login("owner")
    student = backend_api.login("student")
    assistant = backend_api.login("assistant")
    recipient = backend_api.db.scalar(select(User).where(User.email == "student@e11.demo"))
    assert recipient is not None
    private = owner.post(
        "/api/v1/notifications",
        json={
            "title": "Private welcome",
            "message": "A message for this student only.",
            "user_id": recipient.id,
        },
    )
    assert private.status_code == 201, private.text
    notice_id = private.json()["id"]
    assert notice_id in {n["id"] for n in student.get("/api/v1/notifications").json()["items"]}
    assert notice_id not in {
        n["id"] for n in assistant.get("/api/v1/notifications").json()["items"]
    }
    warden = backend_api.login("warden")
    shared = warden.post(
        "/api/v1/notifications",
        json={"title": "Kitchen update", "message": "Dinner is served at 8 pm.", "kind": "info"},
    )
    assert shared.status_code == 201
    assert shared.json()["id"] in {
        n["id"] for n in student.get("/api/v1/notifications").json()["items"]
    }
    assert (
        assistant.post(
            "/api/v1/notifications",
            json={"title": "Hidden change", "message": "Cannot publish this."},
        ).status_code
        == 403
    )
    assert (
        student.post(
            "/api/v1/notifications",
            json={"title": "Student notice", "message": "Cannot publish this."},
        ).status_code
        == 403
    )
    assert (
        owner.post(
            "/api/v1/notifications",
            json={
                "title": "Invalid target",
                "message": "No matching account.",
                "user_id": "missing",
            },
        ).status_code
        == 404
    )
    assert (
        backend_api.db.scalar(
            select(AuditEvent.id).where(
                AuditEvent.entity_id == notice_id, AuditEvent.action == "notification.published"
            )
        )
        is not None
    )
