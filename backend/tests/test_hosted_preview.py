from app.core.config import settings


def test_custom_preview_password_is_not_exposed_in_public_configuration(backend_api, monkeypatch):
    monkeypatch.setattr(settings, "demo_password", "Preview-private-password-123")
    response = backend_api.client.get("/api/v1/public/settings")
    assert response.status_code == 200
    assert response.json()["demo_mode"] is True
    assert response.json()["demo_login_enabled"] is False
    assert "Preview-private-password-123" not in response.text


def test_local_default_demo_login_remains_explicit(backend_api):
    response = backend_api.client.get("/api/v1/public/settings")
    assert response.status_code == 200
    assert response.json()["demo_login_enabled"] is True


def test_https_preview_cookies_are_secure_without_enabling_production_seed(
    backend_api, monkeypatch
):
    monkeypatch.setattr(settings, "session_cookie_secure", True)
    client = backend_api.new_client()
    client.base_url = "https://testserver"
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "owner@e11.demo",
            "password": settings.demo_password,
        },
    )
    assert response.status_code == 200
    cookies = response.headers.get_list("set-cookie")
    assert all("Secure" in value for value in cookies)
    assert client.get("/api/v1/auth/me").status_code == 200
