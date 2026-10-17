from datetime import datetime, timedelta, timezone

import pyotp
from cryptography.fernet import Fernet, InvalidToken
from fastapi import APIRouter, Depends, HTTPException, Request, Response
from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.dependencies import current_user, get_db
from app.core.security import hash_password, new_token, token_hash, verify_password
from app.database.models import AuditEvent, User, UserSession

router = APIRouter(prefix="/auth", tags=["Authentication"])


class LoginInput(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class MFAInput(BaseModel):
    code: str = Field(pattern=r"^\d{6}$")


class PasswordInput(BaseModel):
    current_password: str = Field(min_length=1, max_length=128)
    new_password: str = Field(min_length=12, max_length=128)


def identity(user: User) -> dict:
    return {
        "id": user.id,
        "email": user.email,
        "full_name": user.full_name,
        "role": user.role,
        "mfa_enabled": user.mfa_enabled,
    }


@router.post("/login")
def login(payload: LoginInput, response: Response, db: Session = Depends(get_db)):
    user = db.scalar(select(User).where(User.email == payload.email.lower().strip()))
    valid = verify_password(payload.password, user.password_hash if user else None)
    if not valid or not user or not user.is_active:
        raise HTTPException(401, "Email or password is incorrect")
    token, csrf = new_token(), new_token()
    now = datetime.now(timezone.utc)
    db.execute(
        delete(UserSession).where(UserSession.user_id == user.id, UserSession.expires_at < now)
    )
    session = UserSession(
        token_hash=token_hash(token),
        csrf_token=csrf,
        user_id=user.id,
        expires_at=now + timedelta(hours=settings.session_hours),
    )
    db.add(session)
    db.add(
        AuditEvent(
            actor_id=user.id,
            action="auth.login",
            entity="user",
            entity_id=user.id,
            details={"mfa_required": user.mfa_enabled},
        )
    )
    db.commit()
    response.set_cookie(
        "e11_session",
        token,
        httponly=True,
        secure=settings.production or settings.session_cookie_secure,
        samesite="lax",
        max_age=settings.session_hours * 3600,
        path="/",
    )
    response.set_cookie(
        "e11_csrf",
        csrf,
        httponly=False,
        secure=settings.production or settings.session_cookie_secure,
        samesite="lax",
        max_age=settings.session_hours * 3600,
        path="/",
    )
    response.headers["Cache-Control"] = "no-store"
    return {
        "user": identity(user),
        "csrf_token": csrf,
        "mfa_required": user.mfa_enabled
        or (settings.production and user.role in {"owner", "warden"}),
    }


@router.get("/me")
def me(request: Request, user: User = Depends(current_user)):
    return {
        "user": identity(user),
        "csrf_token": request.state.session.csrf_token,
        "mfa_verified": request.state.session.mfa_verified,
    }


@router.post("/logout")
def logout(
    request: Request,
    response: Response,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    db.delete(request.state.session)
    db.commit()
    response.delete_cookie("e11_session", path="/")
    response.delete_cookie("e11_csrf", path="/")
    return {"message": "Signed out"}


def cipher() -> Fernet:
    if not settings.encryption_key:
        raise HTTPException(503, "MFA encryption must be configured by the administrator")
    try:
        return Fernet(settings.encryption_key.encode())
    except ValueError as exc:
        raise HTTPException(503, "MFA encryption configuration is invalid") from exc


@router.post("/mfa/setup")
def mfa_setup(user: User = Depends(current_user), db: Session = Depends(get_db)):
    if user.mfa_enabled:
        raise HTTPException(409, "MFA is already enabled; contact the owner for recovery")
    secret = pyotp.random_base32()
    user.mfa_secret_encrypted = cipher().encrypt(secret.encode()).decode()
    db.commit()
    return {
        "provisioning_uri": pyotp.TOTP(secret).provisioning_uri(
            user.email, issuer_name="E-11 Hostel"
        ),
        "message": "Add the account to an authenticator and verify a code to enable MFA",
    }


@router.post("/mfa/verify")
def mfa_verify(
    payload: MFAInput,
    request: Request,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    if not user.mfa_secret_encrypted:
        raise HTTPException(400, "Set up MFA first")
    try:
        secret = cipher().decrypt(user.mfa_secret_encrypted.encode()).decode()
    except InvalidToken as exc:
        raise HTTPException(503, "MFA key is unavailable; contact the administrator") from exc
    if not pyotp.TOTP(secret).verify(payload.code, valid_window=1):
        raise HTTPException(400, "Authenticator code is invalid")
    user.mfa_enabled = True
    request.state.session.mfa_verified = True
    request.state.session.mfa_verified_at = datetime.now(timezone.utc)
    db.add(
        AuditEvent(
            actor_id=user.id,
            action="auth.mfa_verified",
            entity="user",
            entity_id=user.id,
            details={},
        )
    )
    db.commit()
    return {"message": "MFA verified", "mfa_verified": True}


@router.post("/password")
def password_update(
    payload: PasswordInput,
    request: Request,
    user: User = Depends(current_user),
    db: Session = Depends(get_db),
):
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(400, "Current password is incorrect")
    user.password_hash = hash_password(payload.new_password)
    db.execute(
        delete(UserSession).where(
            UserSession.user_id == user.id, UserSession.id != request.state.session.id
        )
    )
    db.add(
        AuditEvent(
            actor_id=user.id,
            action="auth.password_changed",
            entity="user",
            entity_id=user.id,
            details={},
        )
    )
    db.commit()
    return {"message": "Password updated; other sessions have been revoked"}
