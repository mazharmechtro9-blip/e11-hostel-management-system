"""Owner-reviewed student CSV imports with single-use, expiring previews."""

from __future__ import annotations

import csv
from datetime import datetime, timedelta, timezone
import io
from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, ConfigDict, Field, ValidationError
from sqlalchemy import Boolean, DateTime, ForeignKey, JSON, String, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Mapped, Session, mapped_column

from app.core.dependencies import get_db, require_roles
from app.database.base import Base
from app.database.models import AuditEvent, Student, User
from app.modules.operations import StudentInput, StudentService


class ImportBatch(Base):
    __tablename__ = "import_batches"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=lambda: str(uuid4()))
    owner_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"))
    rows: Mapped[list[dict]] = mapped_column(JSON)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    confirmed: Mapped[bool] = mapped_column(Boolean, default=False)


class PreviewInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    csv_text: str = Field(min_length=1, max_length=250000)


class ConfirmInput(BaseModel):
    model_config = ConfigDict(extra="forbid")
    preview_id: str = Field(min_length=1, max_length=36)
    confirmation: str = Field(pattern=r"^IMPORT STUDENTS$")


class StudentImportService:
    allowed_fields = {"full_name", "email", "phone", "university", "guardian_phone"}

    def __init__(self, db: Session):
        self.db = db

    def preview(self, csv_text: str, actor: User) -> dict:
        parser = csv.DictReader(io.StringIO(csv_text.lstrip("\ufeff")), strict=True)
        errors: list[dict] = []
        rows: list[dict] = []
        if not parser.fieldnames or not {"full_name", "email", "phone"}.issubset(parser.fieldnames):
            raise HTTPException(422, "CSV headers must include full_name, email and phone")
        if set(parser.fieldnames) - self.allowed_fields or len(parser.fieldnames) != len(
            set(parser.fieldnames)
        ):
            raise HTTPException(422, "CSV contains unsupported or duplicate headers")
        emails: set[str] = set()
        try:
            for line, row in enumerate(parser, 2):
                if line > 201:
                    raise HTTPException(422, "Import at most 200 students per batch")
                if None in row or any(value is None for value in row.values()):
                    errors.append({"row": line, "message": "Column count does not match headers"})
                    continue
                try:
                    candidate = StudentInput(**{key: value.strip() for key, value in row.items()})
                except ValidationError as exc:
                    message = "; ".join(f"{item['loc'][0]}: {item['msg']}" for item in exc.errors())
                    errors.append({"row": line, "message": message})
                    continue
                email = candidate.email.lower()
                if (
                    email in emails
                    or self.db.scalar(select(Student.id).where(Student.email == email))
                    or self.db.scalar(select(User.id).where(User.email == email))
                ):
                    errors.append(
                        {"row": line, "message": "Duplicate email in CSV or existing accounts"}
                    )
                emails.add(email)
                rows.append(candidate.model_dump(exclude={"password"}))
        except csv.Error as exc:
            raise HTTPException(422, "Malformed CSV; check quoting and column structure") from exc
        if not rows and not errors:
            raise HTTPException(422, "CSV must contain at least one data row")
        result = {
            "preview_id": None,
            "rows": rows,
            "total": len(rows),
            "errors": errors,
            "expires_at": None,
        }
        if errors:
            return result
        expires = datetime.now(timezone.utc) + timedelta(minutes=10)
        batch = ImportBatch(owner_id=actor.id, rows=rows, expires_at=expires)
        self.db.add(batch)
        self.db.flush()
        self.db.add(
            AuditEvent(
                actor_id=actor.id,
                action="students.import_previewed",
                entity="import_batch",
                entity_id=batch.id,
                details={"rows": len(rows), "role": actor.role},
            )
        )
        self.db.commit()
        return {**result, "preview_id": batch.id, "expires_at": expires}

    def confirm(self, preview_id: str, actor: User) -> dict:
        batch = self.db.scalar(
            select(ImportBatch).where(ImportBatch.id == preview_id).with_for_update()
        )
        if not batch or batch.owner_id != actor.id:
            raise HTTPException(404, "Import preview not found")
        now = datetime.now(timezone.utc).replace(tzinfo=None)
        if batch.confirmed or batch.expires_at.replace(tzinfo=None) <= now:
            raise HTTPException(
                409, "Import preview has expired or was already confirmed; preview the CSV again"
            )
        try:
            for row in batch.rows:
                StudentService(self.db).create(StudentInput(**row), actor)
            count = len(batch.rows)
            batch.confirmed = True
            batch.rows = []  # Retain the audit reference, not a duplicate copy of personal data.
            self.db.add(
                AuditEvent(
                    actor_id=actor.id,
                    action="students.import_confirmed",
                    entity="import_batch",
                    entity_id=batch.id,
                    details={"imported": count, "role": actor.role},
                )
            )
            self.db.commit()
        except (HTTPException, IntegrityError) as exc:
            self.db.rollback()
            raise HTTPException(
                409,
                "Import conflicts with current records; nothing was imported. Preview the CSV again.",
            ) from exc
        return {
            "imported": count,
            "message": "Students imported transactionally as pending profiles; no passwords or beds were assigned.",
        }


router = APIRouter(tags=["Reviewed imports"])
owner = require_roles("owner")


@router.post("/imports/students/preview")
def preview_import(
    payload: PreviewInput, db: Session = Depends(get_db), user: User = Depends(owner)
):
    return StudentImportService(db).preview(payload.csv_text, user)


@router.post("/imports/students/confirm")
def confirm_import(
    payload: ConfirmInput, db: Session = Depends(get_db), user: User = Depends(owner)
):
    return StudentImportService(db).confirm(payload.preview_id, user)
