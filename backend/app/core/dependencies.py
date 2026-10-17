from datetime import datetime, timezone
from typing import Annotated

from fastapi import Depends, HTTPException, Request
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.core.security import token_hash
from app.database.models import User, UserSession
from app.database.session import SessionLocal


def get_db():
    with SessionLocal() as db:
        try:
            yield db
        except Exception:
            db.rollback()
            raise


def current_user(request: Request, db: Session = Depends(get_db)) -> User:
    raw = request.cookies.get("e11_session")
    session = (
        db.scalar(select(UserSession).where(UserSession.token_hash == token_hash(raw)))
        if raw
        else None
    )
    now = datetime.now(timezone.utc).replace(tzinfo=None)
    if session is None or session.expires_at.replace(tzinfo=None) <= now:
        raise HTTPException(401, "Please sign in to continue")
    user = db.get(User, session.user_id)
    if user is None or not user.is_active:
        raise HTTPException(401, "Account is unavailable")
    request.state.session = session
    from app.core.config import settings

    mfa_exempt = request.url.path in {
        "/api/v1/auth/me",
        "/api/v1/auth/logout",
        "/api/v1/auth/mfa/setup",
        "/api/v1/auth/mfa/verify",
    }
    if not mfa_exempt and (
        user.mfa_enabled or (settings.production and user.role in {"owner", "warden"})
    ):
        if not session.mfa_verified:
            raise HTTPException(403, "Verify MFA before accessing this resource")
    return user


def require_roles(*roles: str):
    def authorized(request: Request, user: User = Depends(current_user)) -> User:
        if user.role not in roles:
            raise HTTPException(403, "You do not have permission for this operation")
        from app.core.config import settings

        session = request.state.session
        if user.mfa_enabled or (settings.production and user.role in {"owner", "warden"}):
            if not session.mfa_verified:
                raise HTTPException(403, "Verify MFA before accessing this resource")
            if user.role == "owner" and request.method in {"POST", "PUT", "PATCH", "DELETE"}:
                age = datetime.now(timezone.utc).replace(
                    tzinfo=None
                ) - session.mfa_verified_at.replace(tzinfo=None)
                if age.total_seconds() > 900:
                    raise HTTPException(403, "Re-verify MFA for this sensitive operation")
        return user

    return authorized


DB = Annotated[Session, Depends(get_db)]
Identity = Annotated[User, Depends(current_user)]
