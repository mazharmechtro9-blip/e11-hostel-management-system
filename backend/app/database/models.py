"""Persistent domain models shared by PostgreSQL and SQLite test databases.

All monetary amounts are exact whole PKR rupees. Financial rows are retained,
and constraints enforce the invariants that must also hold under concurrent API
requests. The ledger never infers settlement from an uploaded document.
"""

from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Any
from uuid import uuid4

from sqlalchemy import (
    JSON,
    Boolean,
    CheckConstraint,
    Date,
    DateTime,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database.base import Base


def new_id() -> str:
    return str(uuid4())


def utc_now() -> datetime:
    return datetime.now(timezone.utc)


class User(Base):
    __tablename__ = "users"
    __table_args__ = (
        CheckConstraint("role IN ('owner','warden','assistant','student')", name="ck_user_role"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    password_hash: Mapped[str] = mapped_column(String(255))
    full_name: Mapped[str] = mapped_column(String(120))
    role: Mapped[str] = mapped_column(String(24), index=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    mfa_secret_encrypted: Mapped[str | None] = mapped_column(Text)
    mfa_enabled: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    student: Mapped[Student | None] = relationship(back_populates="user", uselist=False)
    sessions: Mapped[list[UserSession]] = relationship(back_populates="user")


class UserSession(Base):
    __tablename__ = "user_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    csrf_token: Mapped[str] = mapped_column(String(128))
    user_id: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    mfa_verified: Mapped[bool] = mapped_column(Boolean, default=False)
    mfa_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    user: Mapped[User] = relationship(back_populates="sessions")


class Role(Base):
    __tablename__ = "roles"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(24), unique=True)
    label: Mapped[str] = mapped_column(String(80))


class Permission(Base):
    __tablename__ = "permissions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    code: Mapped[str] = mapped_column(String(80), unique=True)
    description: Mapped[str] = mapped_column(String(255), default="")


class RolePermission(Base):
    __tablename__ = "role_permissions"

    role_id: Mapped[str] = mapped_column(
        ForeignKey("roles.id", ondelete="CASCADE"), primary_key=True
    )
    permission_id: Mapped[str] = mapped_column(
        ForeignKey("permissions.id", ondelete="CASCADE"), primary_key=True
    )


class Student(Base):
    __tablename__ = "students"
    __table_args__ = (
        CheckConstraint("status IN ('active','inactive','pending')", name="ck_student_status"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), unique=True
    )
    full_name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(254), unique=True, index=True)
    phone: Mapped[str] = mapped_column(String(30), default="")
    guardian_phone: Mapped[str] = mapped_column(String(30), default="")
    university: Mapped[str] = mapped_column(String(160), default="")
    status: Mapped[str] = mapped_column(String(20), default="active", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    user: Mapped[User | None] = relationship(back_populates="student")
    allocations: Mapped[list[Allocation]] = relationship(back_populates="student")
    invoices: Mapped[list[Invoice]] = relationship(back_populates="student")


class Floor(Base):
    __tablename__ = "floors"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(80))
    number: Mapped[int] = mapped_column(Integer, unique=True)
    rooms: Mapped[list[Room]] = relationship(back_populates="floor", order_by="Room.number")


class RoomType(Base):
    __tablename__ = "room_types"
    __table_args__ = (
        CheckConstraint("capacity > 0 AND capacity <= 12", name="ck_room_type_capacity"),
        CheckConstraint("monthly_price >= 0", name="ck_room_type_price"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(80), unique=True)
    capacity: Mapped[int] = mapped_column(Integer)
    monthly_price: Mapped[int] = mapped_column(Integer)
    rooms: Mapped[list[Room]] = relationship(back_populates="room_type")


class Room(Base):
    __tablename__ = "rooms"
    __table_args__ = (
        CheckConstraint("status IN ('available','maintenance','inactive')", name="ck_room_status"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    floor_id: Mapped[str] = mapped_column(ForeignKey("floors.id", ondelete="RESTRICT"), index=True)
    room_type_id: Mapped[str] = mapped_column(
        ForeignKey("room_types.id", ondelete="RESTRICT"), index=True
    )
    number: Mapped[str] = mapped_column(String(20), unique=True)
    status: Mapped[str] = mapped_column(String(20), default="available")

    floor: Mapped[Floor] = relationship(back_populates="rooms")
    room_type: Mapped[RoomType] = relationship(back_populates="rooms")
    beds: Mapped[list[Bed]] = relationship(back_populates="room", order_by="Bed.label")


class Bed(Base):
    __tablename__ = "beds"
    __table_args__ = (
        UniqueConstraint("room_id", "label", name="uq_bed_room_label"),
        CheckConstraint("status IN ('available','maintenance','inactive')", name="ck_bed_status"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    room_id: Mapped[str] = mapped_column(ForeignKey("rooms.id", ondelete="RESTRICT"), index=True)
    label: Mapped[str] = mapped_column(String(16))
    status: Mapped[str] = mapped_column(String(20), default="available")

    room: Mapped[Room] = relationship(back_populates="beds")
    allocations: Mapped[list[Allocation]] = relationship(back_populates="bed")


class Allocation(Base):
    __tablename__ = "allocations"
    __table_args__ = (
        Index(
            "uq_active_allocation_bed",
            "bed_id",
            unique=True,
            postgresql_where=text("active = true"),
            sqlite_where=text("active = 1"),
        ),
        Index(
            "uq_active_allocation_student",
            "student_id",
            unique=True,
            postgresql_where=text("active = true"),
            sqlite_where=text("active = 1"),
        ),
        CheckConstraint("ends_on IS NULL OR ends_on >= starts_on", name="ck_allocation_dates"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    student_id: Mapped[str] = mapped_column(
        ForeignKey("students.id", ondelete="RESTRICT"), index=True
    )
    bed_id: Mapped[str] = mapped_column(ForeignKey("beds.id", ondelete="RESTRICT"), index=True)
    starts_on: Mapped[date] = mapped_column(Date)
    ends_on: Mapped[date | None] = mapped_column(Date)
    active: Mapped[bool] = mapped_column(Boolean, default=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    student: Mapped[Student] = relationship(back_populates="allocations")
    bed: Mapped[Bed] = relationship(back_populates="allocations")


class Booking(Base):
    __tablename__ = "bookings"
    __table_args__ = (
        CheckConstraint(
            "status IN ('draft','submitted','under_review','approved','rejected','cancelled','expired')",
            name="ck_booking_status",
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    reference: Mapped[str] = mapped_column(String(40), unique=True)
    full_name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(254), index=True)
    phone: Mapped[str] = mapped_column(String(30))
    university: Mapped[str] = mapped_column(String(160), default="")
    room_type_id: Mapped[str] = mapped_column(
        ForeignKey("room_types.id", ondelete="RESTRICT"), index=True
    )
    status: Mapped[str] = mapped_column(String(20), default="submitted", index=True)
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    room_type: Mapped[RoomType] = relationship()


class Invoice(Base):
    __tablename__ = "invoices"
    __table_args__ = (
        UniqueConstraint("student_id", "month", name="uq_invoice_student_month"),
        CheckConstraint("subtotal >= 0 AND late_fee >= 0", name="ck_invoice_nonnegative"),
        CheckConstraint("total = subtotal + late_fee", name="ck_invoice_total"),
        CheckConstraint("paid_amount >= 0 AND paid_amount <= total", name="ck_invoice_paid"),
        CheckConstraint(
            "status IN ('unpaid','partial','draft','issued','partially_paid','paid','overdue','voided')",
            name="ck_invoice_status",
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    number: Mapped[str] = mapped_column(String(40), unique=True)
    student_id: Mapped[str] = mapped_column(
        ForeignKey("students.id", ondelete="RESTRICT"), index=True
    )
    month: Mapped[str] = mapped_column(String(7), index=True)
    subtotal: Mapped[int] = mapped_column(Integer)
    late_fee: Mapped[int] = mapped_column(Integer, default=0)
    total: Mapped[int] = mapped_column(Integer)
    paid_amount: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="unpaid", index=True)
    due_date: Mapped[date] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)

    student: Mapped[Student] = relationship(back_populates="invoices")
    payments: Mapped[list[Payment]] = relationship(back_populates="invoice")


class Payment(Base):
    __tablename__ = "payments"
    __table_args__ = (
        CheckConstraint("amount > 0", name="ck_payment_positive"),
        CheckConstraint("status IN ('pending','verified','rejected')", name="ck_payment_status"),
        CheckConstraint(
            "method IN ('bank_transfer','cash','easypaisa','jazzcash','gateway','sandbox')",
            name="ck_payment_method",
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    reference: Mapped[str] = mapped_column(String(40), unique=True)
    invoice_id: Mapped[str] = mapped_column(
        ForeignKey("invoices.id", ondelete="RESTRICT"), index=True
    )
    student_id: Mapped[str] = mapped_column(
        ForeignKey("students.id", ondelete="RESTRICT"), index=True
    )
    amount: Mapped[int] = mapped_column(Integer)
    method: Mapped[str] = mapped_column(String(24))
    status: Mapped[str] = mapped_column(String(20), default="pending", index=True)
    bank_reference: Mapped[str | None] = mapped_column(String(120), unique=True)
    idempotency_key: Mapped[str] = mapped_column(String(120), unique=True)
    submitted_by: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    invoice: Mapped[Invoice] = relationship(back_populates="payments")
    student: Mapped[Student] = relationship()
    receipts: Mapped[list[Receipt]] = relationship(back_populates="payment")
    verification: Mapped[PaymentVerification | None] = relationship(uselist=False)


class Receipt(Base):
    __tablename__ = "receipts"
    __table_args__ = (CheckConstraint("size > 0 AND size <= 5242880", name="ck_receipt_size"),)

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    payment_id: Mapped[str] = mapped_column(
        ForeignKey("payments.id", ondelete="RESTRICT"), index=True
    )
    storage_key: Mapped[str] = mapped_column(String(255), unique=True)
    original_name: Mapped[str] = mapped_column(String(255))
    content_type: Mapped[str] = mapped_column(String(80))
    size: Mapped[int] = mapped_column(Integer)
    sha256: Mapped[str] = mapped_column(String(64), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    payment: Mapped[Payment] = relationship(back_populates="receipts")


class PaymentVerification(Base):
    __tablename__ = "payment_verifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    payment_id: Mapped[str] = mapped_column(
        ForeignKey("payments.id", ondelete="RESTRICT"), unique=True
    )
    verified_by: Mapped[str] = mapped_column(ForeignKey("users.id", ondelete="RESTRICT"))
    evidence_type: Mapped[str] = mapped_column(String(40))
    evidence_reference: Mapped[str] = mapped_column(String(160), unique=True)
    notes: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class Complaint(Base):
    __tablename__ = "complaints"
    __table_args__ = (
        CheckConstraint(
            "status IN ('open','in_progress','resolved','closed')", name="ck_complaint_status"
        ),
        CheckConstraint(
            "priority IN ('low','normal','high','urgent')", name="ck_complaint_priority"
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    reference: Mapped[str] = mapped_column(String(40), unique=True)
    student_id: Mapped[str] = mapped_column(
        ForeignKey("students.id", ondelete="RESTRICT"), index=True
    )
    title: Mapped[str] = mapped_column(String(160))
    category: Mapped[str] = mapped_column(String(40))
    description: Mapped[str] = mapped_column(Text)
    status: Mapped[str] = mapped_column(String(20), default="open", index=True)
    priority: Mapped[str] = mapped_column(String(20), default="normal")
    assigned_to: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    response: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, onupdate=utc_now
    )
    student: Mapped[Student] = relationship()


class MessMenu(Base):
    __tablename__ = "mess_menus"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    day: Mapped[str] = mapped_column(String(12), unique=True)
    breakfast: Mapped[str] = mapped_column(String(255))
    lunch: Mapped[str] = mapped_column(String(255))
    dinner: Mapped[str] = mapped_column(String(255))


class MessCount(Base):
    __tablename__ = "mess_counts"
    __table_args__ = (
        UniqueConstraint("date", "meal", name="uq_mess_count_date_meal"),
        CheckConstraint("count >= 0", name="ck_mess_count_nonnegative"),
        CheckConstraint("meal IN ('breakfast','lunch','dinner')", name="ck_mess_count_meal"),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    date: Mapped[date] = mapped_column(Date)
    meal: Mapped[str] = mapped_column(String(16))
    count: Mapped[int] = mapped_column(Integer)


class TransportRoute(Base):
    __tablename__ = "transport_routes"
    __table_args__ = (
        CheckConstraint("capacity > 0", name="ck_transport_capacity"),
        CheckConstraint("fee >= 0", name="ck_transport_fee"),
        CheckConstraint(
            "status IN ('active','inactive','maintenance')", name="ck_transport_status"
        ),
    )

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    name: Mapped[str] = mapped_column(String(100), unique=True)
    destination: Mapped[str] = mapped_column(String(180))
    departure_time: Mapped[str] = mapped_column(String(5))
    return_time: Mapped[str] = mapped_column(String(5))
    vehicle: Mapped[str] = mapped_column(String(100))
    driver_name: Mapped[str] = mapped_column(String(120))
    driver_phone: Mapped[str] = mapped_column(String(30))
    capacity: Mapped[int] = mapped_column(Integer)
    fee: Mapped[int] = mapped_column(Integer, default=0)
    status: Mapped[str] = mapped_column(String(20), default="active")


class Notification(Base):
    __tablename__ = "notifications"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    user_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )
    title: Mapped[str] = mapped_column(String(160))
    message: Mapped[str] = mapped_column(Text)
    kind: Mapped[str] = mapped_column(String(30), default="info")
    is_read: Mapped[bool] = mapped_column(Boolean, default=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utc_now)


class Setting(Base):
    __tablename__ = "settings"

    key: Mapped[str] = mapped_column(String(120), primary_key=True)
    value: Mapped[dict[str, Any] | list[Any] | str | int | bool | None] = mapped_column(JSON)


class AuditEvent(Base):
    __tablename__ = "audit_events"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=new_id)
    actor_id: Mapped[str | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), index=True
    )
    action: Mapped[str] = mapped_column(String(100), index=True)
    entity: Mapped[str] = mapped_column(String(80))
    entity_id: Mapped[str | None] = mapped_column(String(80))
    details: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utc_now, index=True
    )
