from sqlalchemy import delete

from app.database.models import Setting


def test_owner_can_configure_new_hostel_and_public_data_has_one_source(backend_api):
    backend_api.db.execute(delete(Setting).where(Setting.key.in_(["hostel", "public_content"])))
    backend_api.db.commit()
    owner = backend_api.login("owner")
    changes = {
        "hostel_name": "New Hostel",
        "tagline": "A new beginning",
        "phone": "+92 300 1234567",
        "facilities": ["WiFi", "Cleaning"],
        "booking_policy": "Reviewed by management",
    }
    response = owner.put("/api/v1/settings", json=changes)
    assert response.status_code == 200, response.text
    public = backend_api.client.get("/api/v1/public/settings").json()
    assert all(public[key] == value for key, value in changes.items())
    assert "demo_seed_v1" not in public and "ai_knowledge" not in public
    assert owner.put("/api/v1/settings", json={"database_password": "bad"}).status_code == 422
    student = backend_api.login("student")
    assert student.put("/api/v1/settings", json=changes).status_code == 403


def test_photo_settings_are_owner_only_public_and_https_validated(backend_api):
    owner = backend_api.login("owner")
    photos = {
        "hero_image_url": "https://example.com/hostel.jpg",
        "room_image_urls": "https://example.com/twin.jpg\nhttps://example.com/triple.jpg",
    }
    assert owner.put("/api/v1/settings", json=photos).status_code == 200
    public = backend_api.client.get("/api/v1/public/settings").json()
    assert all(public[key] == value for key, value in photos.items())
    for invalid in [
        "javascript:alert(1)",
        "http://example.com/room.jpg",
        "https://user:pass@example.com/photo.jpg",
    ]:
        assert owner.put("/api/v1/settings", json={"hero_image_url": invalid}).status_code == 422
    assert (
        owner.put(
            "/api/v1/settings",
            json={"room_image_urls": "\n".join(["https://example.com/a.jpg"] * 6)},
        ).status_code
        == 422
    )
    assert (
        owner.put(
            "/api/v1/settings", json={"hero_image_url": "", "room_image_urls": ""}
        ).status_code
        == 200
    )
    student = backend_api.login("student")
    assert student.put("/api/v1/settings", json=photos).status_code == 403
