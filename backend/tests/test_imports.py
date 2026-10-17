from datetime import datetime, timedelta, timezone

from fastapi import HTTPException
import pytest
from sqlalchemy import create_engine, func, select
from sqlalchemy.orm import Session

from app.database.base import Base
from app.database.models import Student, User
from app.modules.imports import ImportBatch, StudentImportService


@pytest.fixture
def import_db(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'imports.db'}")
    Base.metadata.create_all(engine)
    with Session(engine) as db:
        owner = User(
            id="import-owner",
            email="owner@example.com",
            full_name="Import Owner",
            role="owner",
            password_hash="not-a-login-fixture",
        )
        db.add(owner)
        db.commit()
        yield db, owner
    engine.dispose()


def test_preview_creates_no_students_confirm_is_single_use(import_db):
    db, owner = import_db
    service = StudentImportService(db)
    result = service.preview(
        "full_name,email,phone,university\nTest Person,test@example.com,03001234567,Air University",
        owner,
    )
    assert result["preview_id"]
    assert db.scalar(select(func.count(Student.id))) == 0
    confirmed = service.confirm(result["preview_id"], owner)
    assert confirmed["imported"] == 1
    assert db.scalar(select(Student)).user_id is None
    with pytest.raises(HTTPException) as caught:
        service.confirm(result["preview_id"], owner)
    assert caught.value.status_code == 409


def test_duplicate_and_invalid_rows_block_confirmation(import_db):
    db, owner = import_db
    result = StudentImportService(db).preview(
        "full_name,email,phone\nFirst Person,one@example.com,03001234567\nSecond Person,one@example.com,03001234568\nInvalid Person,not-email,03001234569",
        owner,
    )
    assert result["preview_id"] is None
    assert len(result["errors"]) == 2
    assert db.scalar(select(func.count(Student.id))) == 0


def test_expired_and_changed_data_never_partially_import(import_db):
    db, owner = import_db
    service = StudentImportService(db)
    result = service.preview(
        "full_name,email,phone\nFirst Person,one@example.com,03001234567\nSecond Person,two@example.com,03001234568",
        owner,
    )
    db.add(Student(full_name="Added in another session", email="two@example.com"))
    db.commit()
    with pytest.raises(HTTPException):
        service.confirm(result["preview_id"], owner)
    assert db.scalar(select(func.count(Student.id))) == 1
    assert not db.scalar(select(Student).where(Student.email == "one@example.com"))
    batch = db.get(ImportBatch, result["preview_id"])
    batch.expires_at = datetime.now(timezone.utc) - timedelta(minutes=1)
    db.commit()
    with pytest.raises(HTTPException) as caught:
        service.confirm(batch.id, owner)
    assert caught.value.status_code == 409
