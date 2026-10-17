"""Session, MFA, request-boundary, and credential-disclosure regressions."""

from datetime import datetime, timedelta, timezone

import pyotp
from sqlalchemy import select

from app.core.config import settings
from app.core.security import token_hash
from app.database.models import User, UserSession


def enroll(client):
    response = client.post("/api/v1/auth/mfa/setup")
    assert response.status_code == 200, response.text
    assert "secret" not in response.json()
    otp = pyotp.parse_uri(response.json()["provisioning_uri"])
    verified = client.post("/api/v1/auth/mfa/verify", json={"code": otp.now()})
    assert verified.status_code == 200, verified.text
    return otp


def current_session(api, client, db):
    digest = token_hash(client.cookies.get("e11_session"))
    return db.scalar(select(UserSession).where(UserSession.token_hash == digest))


def test_production_owner_requires_mfa_and_reverification_on_fresh_login(backend_api, monkeypatch):
    owner = backend_api.login("owner")
    assert owner.get("/api/v1/invoices").status_code == 200
    # Existing development sign-in keeps cookies usable while the production
    # role policy is exercised. Fresh production logins use HTTPS below.
    monkeypatch.setattr(settings, "app_env", "production")
    denied = owner.get("/api/v1/invoices")
    assert denied.status_code == 403
    assert "MFA" in denied.json()["detail"]
    otp = enroll(owner)
    assert owner.get("/api/v1/invoices").status_code == 200
    with backend_api.session_factory() as db:
        account = db.scalar(select(User).where(User.email == "owner@e11.demo"))
        assert account.mfa_enabled is True
        assert account.mfa_secret_encrypted
        assert otp.secret not in account.mfa_secret_encrypted
    fresh = backend_api.new_client()
    fresh.base_url = "https://testserver"
    response = fresh.post(
        "/api/v1/auth/login",
        json={
            "email": "owner@e11.demo",
            "password": settings.demo_password,
        },
    )
    assert response.status_code == 200
    assert response.json()["mfa_required"] is True
    assert any("Secure" in value for value in response.headers.get_list("set-cookie"))
    fresh.headers["X-CSRF-Token"] = fresh.cookies.get("e11_csrf")
    assert fresh.get("/api/v1/invoices").status_code == 403
    assert fresh.post("/api/v1/auth/mfa/verify", json={"code": otp.now()}).status_code == 200
    assert fresh.get("/api/v1/invoices").status_code == 200


def test_invalid_authenticator_code_does_not_enable_mfa(backend_api):
    owner = backend_api.login("owner")
    response = owner.post("/api/v1/auth/mfa/setup")
    assert response.status_code == 200
    otp = pyotp.parse_uri(response.json()["provisioning_uri"])
    now = datetime.now(timezone.utc)
    possible = {otp.at(now + timedelta(seconds=shift)) for shift in (-30, 0, 30)}
    bad = next(f"{value:06d}" for value in range(100) if f"{value:06d}" not in possible)
    rejected = owner.post("/api/v1/auth/mfa/verify", json={"code": bad})
    assert rejected.status_code == 400
    with backend_api.session_factory() as db:
        user = db.scalar(select(User).where(User.email == "owner@e11.demo"))
        assert user.mfa_enabled is False
        assert current_session(backend_api, owner, db).mfa_verified is False


def test_sensitive_owner_write_requires_recent_mfa(backend_api):
    owner = backend_api.login("owner")
    enroll(owner)
    with backend_api.session_factory() as db:
        session = current_session(backend_api, owner, db)
        session.mfa_verified_at = datetime.now(timezone.utc) - timedelta(minutes=16)
        db.commit()
    assert owner.get("/api/v1/invoices").status_code == 200
    response = owner.post(
        "/api/v1/payments/nonexistent/verification",
        json={
            "evidence_type": "bank_statement",
            "evidence_reference": "TEST-STATEMENT-LINE-1",
            "confirmation": "VERIFY PAYMENT",
            "bank_reference": "TEST-TRANSACTION-1",
        },
    )
    assert response.status_code == 403
    assert "MFA" in response.json()["detail"]


def test_expired_session_is_rejected_server_side(backend_api):
    owner = backend_api.login("owner")
    assert owner.get("/api/v1/auth/me").status_code == 200
    with backend_api.session_factory() as db:
        session = current_session(backend_api, owner, db)
        session.expires_at = datetime.now(timezone.utc) - timedelta(seconds=1)
        db.commit()
    assert owner.get("/api/v1/auth/me").status_code == 401
    assert owner.get("/api/v1/invoices").status_code == 401


def test_password_change_revokes_other_sessions(backend_api):
    owner = backend_api.login("owner")
    other_session = backend_api.login("owner")
    assert other_session.get("/api/v1/auth/me").status_code == 200
    changed = owner.post(
        "/api/v1/auth/password",
        json={
            "current_password": settings.demo_password,
            "new_password": "AnUpdatedPassword!2030",
        },
    )
    assert changed.status_code == 200
    assert owner.get("/api/v1/auth/me").status_code == 200
    assert other_session.get("/api/v1/auth/me").status_code == 401
    assert (
        backend_api.client.post(
            "/api/v1/auth/login",
            json={
                "email": "owner@e11.demo",
                "password": settings.demo_password,
            },
        ).status_code
        == 401
    )


def test_identity_response_and_session_cookie_exclude_sensitive_auth_material(backend_api):
    client = backend_api.new_client()
    response = client.post(
        "/api/v1/auth/login",
        json={
            "email": "owner@e11.demo",
            "password": settings.demo_password,
        },
    )
    assert response.status_code == 200
    cookies = response.headers.get_list("set-cookie")
    session_cookie = next(value for value in cookies if value.startswith("e11_session="))
    csrf_cookie = next(value for value in cookies if value.startswith("e11_csrf="))
    assert "HttpOnly" in session_cookie
    assert "SameSite=lax" in session_cookie
    assert "Path=/" in session_cookie
    assert "HttpOnly" not in csrf_cookie
    identity = client.get("/api/v1/auth/me")
    assert identity.status_code == 200
    data = identity.json()
    assert set(data["user"]) == {"id", "email", "full_name", "role", "mfa_enabled"}
    for forbidden in ("password_hash", "mfa_secret", "token_hash", "encryption_key"):
        assert forbidden not in identity.text
        assert forbidden not in response.text


def test_write_request_rejects_untrusted_origin_even_with_valid_csrf(backend_api):
    owner = backend_api.login("owner")
    response = owner.post("/api/v1/auth/logout", headers={"Origin": "https://untrusted.example"})
    assert response.status_code == 403
    assert "origin" in response.json()["detail"].lower()
    assert owner.get("/api/v1/auth/me").status_code == 200


def test_oversized_upload_is_rejected_before_multipart_parsing(backend_api):
    student = backend_api.login("student")
    response = student.post(
        "/api/v1/payments/nonexistent/receipts",
        content=b"small",
        headers={
            "Content-Length": str(6 * 1024 * 1024 + 1),
            "Content-Type": "multipart/form-data; boundary=e11-test",
        },
    )
    assert response.status_code == 413
    assert "large" in response.json()["detail"].lower()


def test_chunked_upload_cannot_bypass_request_size_limit(backend_api):
    student = backend_api.login("student")
    chunk = b"x" * (1024 * 1024)
    response = student.post(
        "/api/v1/payments/nonexistent/receipts",
        content=(chunk for _ in range(7)),
        headers={"Content-Type": "multipart/form-data; boundary=e11-test"},
    )
    assert "content-length" not in response.request.headers
    assert response.request.headers["transfer-encoding"] == "chunked"
    assert response.status_code == 413


def test_login_does_not_accept_an_untrusted_origin(backend_api):
    response = backend_api.client.post(
        "/api/v1/auth/login",
        json={"email": "owner@e11.demo", "password": settings.demo_password},
        headers={"Origin": "https://untrusted.example"},
    )
    assert response.status_code == 403
    assert "origin" in response.json()["detail"].lower()
    assert "e11_session" not in backend_api.client.cookies
