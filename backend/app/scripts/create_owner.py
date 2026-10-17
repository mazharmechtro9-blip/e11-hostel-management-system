"""Bootstrap one real owner through a trusted terminal, never application startup.

Usage: python -m app.scripts.create_owner --email owner@example.org --name 'Hostel Owner'
The password is read privately from the terminal and never accepted in a URL or
command-line argument. Existing owners/accounts are never overwritten.
"""

import argparse
from getpass import getpass

from pydantic import BaseModel, EmailStr, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.database.models import AuditEvent, User
from app.database.session import SessionLocal


class OwnerInput(BaseModel):
    email: EmailStr
    full_name: str = Field(min_length=2, max_length=120)
    password: str = Field(min_length=14, max_length=128)


def create_owner(db: Session, payload: OwnerInput) -> User:
    if db.scalar(select(User.id).where(User.role == "owner")):
        raise ValueError("An owner already exists. Use the authorized account-management workflow.")
    if db.scalar(select(User.id).where(User.email == payload.email.lower())):
        raise ValueError("This email already belongs to an account; no record was changed.")
    owner = User(
        email=payload.email.lower(),
        full_name=payload.full_name,
        role="owner",
        password_hash=hash_password(payload.password),
    )
    db.add(owner)
    db.flush()
    db.add(
        AuditEvent(
            actor_id=owner.id,
            action="owner.bootstrapped",
            entity="user",
            entity_id=owner.id,
            details={"source": "trusted_terminal", "role": "owner"},
        )
    )
    db.commit()
    return owner


def main():
    parser = argparse.ArgumentParser(description="Bootstrap the first non-demo owner")
    parser.add_argument("--email", required=True)
    parser.add_argument("--name", required=True)
    args = parser.parse_args()
    password = getpass("New owner password (at least 14 characters): ")
    if password != getpass("Confirm password: "):
        raise SystemExit("Passwords do not match; no changes made.")
    payload = OwnerInput(email=args.email, full_name=args.name, password=password)
    try:
        with SessionLocal() as db:
            create_owner(db, payload)
    except (ValueError, IntegrityError):
        raise SystemExit(
            "Owner bootstrap refused: an owner or this email already exists."
        ) from None
    print("Owner created. Enroll and verify MFA at first production sign-in.")


if __name__ == "__main__":
    main()
