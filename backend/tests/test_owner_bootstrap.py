import pytest
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session

from app.core.security import verify_password
from app.database.base import Base
from app.database.models import AuditEvent, User
from app.scripts.create_owner import OwnerInput, create_owner


def test_owner_bootstrap_hashes_password_and_refuses_overwrite(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'bootstrap.db'}")
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        payload = OwnerInput(
            email="real-owner@example.com",
            full_name="Hostel Owner",
            password="Unique-test-password!2026",
        )
        owner = create_owner(db, payload)
        assert owner.role == "owner"
        assert owner.password_hash.startswith("$argon2id$")
        assert verify_password(payload.password, owner.password_hash)
        assert db.scalar(select(func.count(AuditEvent.id))) == 1
        with pytest.raises(ValueError):
            create_owner(db, payload)
        assert db.scalar(select(func.count(User.id))) == 1
    engine.dispose()
