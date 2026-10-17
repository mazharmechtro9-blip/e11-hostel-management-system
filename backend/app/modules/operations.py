"""Operational application services and authenticated resource APIs.

Mutations commit the domain change, its notification, and its audit record in a
single transaction. Allocation invariants are also protected by database indexes.
"""

from datetime import date
from typing import Any, Literal
from uuid import uuid4
from urllib.parse import urlsplit

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, ConfigDict, EmailStr, Field
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.core.dependencies import current_user, get_db, require_roles
from app.core.security import hash_password
from app.database.models import (
    Allocation,
    AuditEvent,
    Bed,
    Booking,
    Complaint,
    Floor,
    MessCount,
    MessMenu,
    Notification,
    Room,
    RoomType,
    Setting,
    Student,
    TransportRoute,
    User,
)

router = APIRouter(tags=["Operations"])
staff = require_roles("owner", "warden")
operations = require_roles("owner", "warden", "assistant")
owner = require_roles("owner")


def record(
    db: Session,
    actor: User | None,
    action: str,
    entity: str,
    entity_id: str,
    details: dict | None = None,
):
    db.add(
        AuditEvent(
            actor_id=actor.id if actor else None,
            action=action,
            entity=entity,
            entity_id=entity_id,
            details=details or {},
        )
    )


def notify(db: Session, title: str, message: str, user_id: str | None = None, kind="info"):
    db.add(Notification(user_id=user_id, title=title, message=message, kind=kind))


def student_for(db: Session, user: User) -> Student:
    student = db.scalar(select(Student).where(Student.user_id == user.id))
    if not student:
        raise HTTPException(404, "Student profile is not available")
    return student


def serialized(row, exclude: set[str] | None = None) -> dict:
    return {
        c.name: getattr(row, c.name)
        for c in row.__table__.columns
        if c.name not in (exclude or set())
    }


def listing(items: list, total: int | None = None) -> dict:
    return {"items": items, "total": total if total is not None else len(items)}


def commit(db: Session, conflict="This record conflicts with existing information"):
    try:
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, conflict) from exc


class StrictInput(BaseModel):
    model_config = ConfigDict(extra="forbid", str_strip_whitespace=True)


class BookingInput(StrictInput):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str = Field(min_length=7, max_length=30)
    university: str = Field(default="", max_length=160)
    room_type_id: str
    notes: str = Field(default="", max_length=2000)


class BookingDecision(StrictInput):
    notes: str = Field(default="", max_length=2000)


class StudentInput(StrictInput):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    phone: str = Field(min_length=7, max_length=30)
    guardian_phone: str = Field(default="", max_length=30)
    university: str = Field(default="", max_length=160)
    password: str | None = Field(default=None, min_length=12, max_length=128)


class StudentUpdate(StrictInput):
    full_name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=7, max_length=30)
    guardian_phone: str = Field(default="", max_length=30)
    university: str = Field(default="", max_length=160)


class AccountActivation(StrictInput):
    password: str = Field(min_length=12, max_length=128)


class FloorInput(StrictInput):
    name: str = Field(min_length=2, max_length=80)
    number: int = Field(ge=0, le=100)


class PriceUpdate(StrictInput):
    monthly_price: int = Field(strict=True, ge=0, le=1000000)


class RoomUpdate(StrictInput):
    status: Literal["available", "maintenance", "inactive"]


class RoomInput(StrictInput):
    number: str = Field(min_length=1, max_length=20)
    floor_id: str
    room_type_id: str
    status: Literal["available", "maintenance", "inactive"] = "available"


class AllocationInput(StrictInput):
    student_id: str
    bed_id: str
    starts_on: date = Field(default_factory=date.today)


class ComplaintInput(StrictInput):
    title: str = Field(min_length=4, max_length=160)
    category: Literal["maintenance", "cleaning", "internet", "mess", "transport", "other"]
    description: str = Field(min_length=10, max_length=5000)
    priority: Literal["low", "normal", "high", "urgent"] = "normal"


class ComplaintUpdate(StrictInput):
    status: Literal["open", "in_progress", "resolved", "closed"] | None = None
    response: str | None = Field(default=None, max_length=5000)
    assigned_to: str | None = None


class MenuInput(StrictInput):
    day: Literal["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
    breakfast: str = Field(min_length=2, max_length=255)
    lunch: str = Field(min_length=2, max_length=255)
    dinner: str = Field(min_length=2, max_length=255)


class MealCountInput(StrictInput):
    date: date
    meal: Literal["breakfast", "lunch", "dinner"]
    count: int = Field(ge=0, le=10000)


class MessUpdate(StrictInput):
    menus: list[MenuInput] = Field(default_factory=list, max_length=7)
    counts: list[MealCountInput] = Field(default_factory=list, max_length=30)


class RouteInput(StrictInput):
    name: str = Field(min_length=2, max_length=100)
    destination: str = Field(min_length=2, max_length=180)
    departure_time: str = Field(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    return_time: str = Field(pattern=r"^([01]\d|2[0-3]):[0-5]\d$")
    vehicle: str = Field(min_length=2, max_length=100)
    driver_name: str = Field(min_length=2, max_length=120)
    driver_phone: str = Field(min_length=7, max_length=30)
    capacity: int = Field(ge=1, le=100)
    fee: int = Field(ge=0, le=100000)
    status: Literal["active", "inactive", "maintenance"] = "active"


class NotificationInput(StrictInput):
    title: str = Field(min_length=3, max_length=160)
    message: str = Field(min_length=5, max_length=2000)
    kind: Literal["info", "warning", "success", "maintenance", "notice"] = "info"
    user_id: str | None = None


class StudentService:
    def __init__(self, db: Session):
        self.db = db

    def create(self, payload: StudentInput, actor: User) -> Student:
        email = payload.email.lower()
        if self.db.scalar(select(Student).where(Student.email == email)):
            raise HTTPException(409, "A student already uses this email")
        user = self.db.scalar(select(User).where(User.email == email))
        if user:
            raise HTTPException(409, "An account already uses this email")
        if payload.password:
            user = User(
                email=email,
                full_name=payload.full_name,
                role="student",
                password_hash=hash_password(payload.password),
            )
            self.db.add(user)
            self.db.flush()
        student = Student(
            full_name=payload.full_name,
            email=email,
            phone=payload.phone,
            guardian_phone=payload.guardian_phone,
            university=payload.university,
            user_id=user.id if user else None,
            status="active" if user else "pending",
        )
        self.db.add(student)
        self.db.flush()
        record(self.db, actor, "student.created", "student", student.id)
        return student


class BedAllocationService:
    def __init__(self, db: Session):
        self.db = db

    def allocate(self, payload: AllocationInput, actor: User) -> Allocation:
        student = self.db.get(Student, payload.student_id)
        bed = self.db.scalar(select(Bed).where(Bed.id == payload.bed_id).with_for_update())
        if not student or not bed:
            raise HTTPException(404, "Student or bed was not found")
        if (
            student.status == "inactive"
            or bed.status != "available"
            or bed.room.status != "available"
        ):
            raise HTTPException(409, "This student or bed is unavailable for allocation")
        conflict = self.db.scalar(
            select(Allocation).where(
                Allocation.active.is_(True),
                or_(Allocation.student_id == student.id, Allocation.bed_id == bed.id),
            )
        )
        if conflict:
            raise HTTPException(409, "Student or bed already has an active allocation")
        allocation = Allocation(student_id=student.id, bed_id=bed.id, starts_on=payload.starts_on)
        self.db.add(allocation)
        self.db.flush()
        student.status = "active"
        record(
            self.db,
            actor,
            "allocation.created",
            "allocation",
            allocation.id,
            {"student_id": student.id, "bed_id": bed.id},
        )
        if student.user_id:
            notify(
                self.db,
                "Your room is ready",
                f"You have been assigned room {bed.room.number}, bed {bed.label}.",
                student.user_id,
            )
        return allocation


class BookingService:
    def __init__(self, db: Session):
        self.db = db

    def submit(self, payload: BookingInput) -> Booking:
        room_type = self.db.get(RoomType, payload.room_type_id)
        if not room_type:
            raise HTTPException(404, "Room category was not found")
        duplicate = self.db.scalar(
            select(Booking).where(
                Booking.email == payload.email.lower(),
                Booking.status.in_(["submitted", "under_review", "approved"]),
            )
        )
        if duplicate:
            raise HTTPException(409, "An active booking already exists for this email")
        free = self.db.scalar(
            select(func.count(Bed.id))
            .join(Room)
            .where(
                Room.room_type_id == room_type.id,
                Room.status == "available",
                Bed.status == "available",
                ~Bed.id.in_(select(Allocation.bed_id).where(Allocation.active.is_(True))),
            )
        )
        if not free:
            raise HTTPException(409, "This category is currently full; choose another room type")
        booking = Booking(
            **payload.model_dump(exclude={"email"}),
            email=payload.email.lower(),
            reference=f"E11-BK-{uuid4().hex[:8].upper()}",
            status="submitted",
        )
        self.db.add(booking)
        self.db.flush()
        record(self.db, None, "booking.submitted", "booking", booking.id)
        for staff_user in self.db.scalars(
            select(User).where(User.role.in_(["owner", "warden"]), User.is_active.is_(True))
        ).all():
            notify(
                self.db,
                "New booking request",
                f"Booking {booking.reference} is ready for review.",
                staff_user.id,
            )
        return booking

    def decide(self, booking_id: str, approved: bool, notes: str, actor: User) -> Booking:
        booking = self.db.scalar(select(Booking).where(Booking.id == booking_id).with_for_update())
        if not booking:
            raise HTTPException(404, "Booking was not found")
        if booking.status not in {"submitted", "under_review"}:
            raise HTTPException(409, "Only pending bookings can be reviewed")
        booking.status = "approved" if approved else "rejected"
        if notes:
            booking.notes = notes
        if approved and not self.db.scalar(select(Student).where(Student.email == booking.email)):
            self.db.add(
                Student(
                    full_name=booking.full_name,
                    email=booking.email,
                    phone=booking.phone,
                    university=booking.university,
                    status="pending",
                )
            )
        record(self.db, actor, f"booking.{booking.status}", "booking", booking.id)
        return booking


class RoomService:
    def __init__(self, db: Session):
        self.db = db

    def create(self, payload: RoomInput, actor: User) -> Room:
        category = self.db.get(RoomType, payload.room_type_id)
        if not self.db.get(Floor, payload.floor_id) or not category:
            raise HTTPException(404, "Floor or room category was not found")
        room = Room(**payload.model_dump())
        self.db.add(room)
        self.db.flush()
        for index in range(category.capacity):
            self.db.add(Bed(room_id=room.id, label=chr(65 + index)))
        record(self.db, actor, "room.created", "room", room.id)
        return room


class ComplaintService:
    transitions = {
        "open": {"in_progress", "resolved"},
        "in_progress": {"resolved", "open"},
        "resolved": {"open", "closed"},
        "closed": {"open"},
    }

    def __init__(self, db: Session):
        self.db = db

    def update(self, complaint: Complaint, payload: ComplaintUpdate, actor: User):
        if actor.role == "student":
            if complaint.student_id != student_for(self.db, actor).id:
                raise HTTPException(404, "Complaint was not found")
            if payload.status not in {"open", "closed"} or payload.response or payload.assigned_to:
                raise HTTPException(
                    403, "Students may confirm resolution or reopen their own ticket"
                )
            if complaint.status not in {"resolved", "closed"}:
                raise HTTPException(409, "This ticket is still being processed")
        elif actor.role == "assistant" and complaint.assigned_to != actor.id:
            raise HTTPException(403, "Only assigned complaints can be updated")
        if payload.status and payload.status != complaint.status:
            if payload.status not in self.transitions[complaint.status]:
                raise HTTPException(409, "This complaint status transition is not allowed")
            complaint.status = payload.status
        if payload.assigned_to:
            if actor.role not in {"owner", "warden"}:
                raise HTTPException(403, "Only managers may assign complaints")
            assignee = self.db.get(User, payload.assigned_to)
            if not assignee or assignee.role not in {"owner", "warden", "assistant"}:
                raise HTTPException(400, "Select a valid staff member")
            complaint.assigned_to = payload.assigned_to
        if payload.response is not None:
            complaint.response = payload.response
        record(
            self.db,
            actor,
            "complaint.updated",
            "complaint",
            complaint.id,
            {"status": complaint.status},
        )
        if complaint.student.user_id:
            notify(
                self.db,
                f"Ticket {complaint.reference} updated",
                f"Your ticket is {complaint.status.replace('_', ' ')}.",
                complaint.student.user_id,
            )


def room_data(room: Room, db: Session, include_names=True) -> dict:
    beds = []
    for bed in room.beds:
        allocation = db.scalar(
            select(Allocation).where(Allocation.bed_id == bed.id, Allocation.active.is_(True))
        )
        beds.append(
            {
                "id": bed.id,
                "label": bed.label,
                "status": "occupied" if allocation else bed.status,
                "student_id": allocation.student_id if allocation and include_names else None,
                "student_name": allocation.student.full_name
                if allocation and include_names
                else None,
            }
        )
    occupied = sum(b["status"] == "occupied" for b in beds)
    return {
        "id": room.id,
        "number": room.number,
        "status": room.status,
        "floor_id": room.floor_id,
        "floor_name": room.floor.name,
        "floor_number": room.floor.number,
        "room_type_id": room.room_type_id,
        "room_type": room.room_type.name,
        "capacity": room.room_type.capacity,
        "monthly_price": room.room_type.monthly_price,
        "occupied_beds": occupied,
        "available_beds": sum(b["status"] == "available" for b in beds)
        if room.status == "available"
        else 0,
        "beds": beds,
    }


def student_data(student: Student, db: Session) -> dict:
    allocation = db.scalar(
        select(Allocation).where(Allocation.student_id == student.id, Allocation.active.is_(True))
    )
    room = allocation.bed.room if allocation else None
    return {
        **serialized(student),
        "room_number": room.number if room else None,
        "bed_label": allocation.bed.label if allocation else None,
        "floor_name": room.floor.name if room else None,
        "monthly_rent": room.room_type.monthly_price if room else 0,
    }


@router.post("/bookings", status_code=201)
def create_booking(payload: BookingInput, db: Session = Depends(get_db)):
    booking = BookingService(db).submit(payload)
    commit(db)
    return serialized(booking)


@router.get("/bookings")
def bookings(
    db: Session = Depends(get_db),
    user: User = Depends(staff),
    status: str | None = None,
    offset: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    query = select(Booking).order_by(Booking.created_at.desc())
    if status:
        query = query.where(Booking.status == status)
    rows = db.scalars(query).all()
    return listing(
        [{**serialized(b), "room_type": b.room_type.name} for b in rows[offset : offset + limit]],
        len(rows),
    )


@router.post("/bookings/{booking_id}/approve")
def approve_booking(
    booking_id: str,
    payload: BookingDecision,
    db: Session = Depends(get_db),
    user: User = Depends(staff),
):
    booking = BookingService(db).decide(booking_id, True, payload.notes, user)
    commit(db)
    return serialized(booking)


@router.post("/bookings/{booking_id}/reject")
def reject_booking(
    booking_id: str,
    payload: BookingDecision,
    db: Session = Depends(get_db),
    user: User = Depends(staff),
):
    booking = BookingService(db).decide(booking_id, False, payload.notes, user)
    commit(db)
    return serialized(booking)


@router.get("/students")
def students(
    db: Session = Depends(get_db),
    user: User = Depends(operations),
    search: str = "",
    offset: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    query = select(Student).order_by(Student.full_name)
    if search:
        query = query.where(
            or_(Student.full_name.ilike(f"%{search}%"), Student.email.ilike(f"%{search}%"))
        )
    rows = db.scalars(query).all()
    data = [student_data(row, db) for row in rows[offset : offset + limit]]
    if user.role == "assistant":
        for row in data:
            row.pop("guardian_phone", None)
            row.pop("email", None)
    return listing(data, len(rows))


@router.post("/students", status_code=201)
def create_student(
    payload: StudentInput, db: Session = Depends(get_db), user: User = Depends(staff)
):
    student = StudentService(db).create(payload, user)
    commit(db)
    return student_data(student, db)


@router.get("/profile")
def profile(db: Session = Depends(get_db), user: User = Depends(current_user)):
    if user.role == "student":
        return student_data(student_for(db, user), db)
    return {"id": user.id, "full_name": user.full_name, "email": user.email, "role": user.role}


@router.put("/profile")
def update_profile(
    payload: StudentUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("student")),
):
    student = student_for(db, user)
    for key, value in payload.model_dump().items():
        setattr(student, key, value)
    user.full_name = student.full_name
    record(db, user, "profile.updated", "student", student.id)
    commit(db)
    return student_data(student, db)


@router.put("/students/{student_id}")
def update_student(
    student_id: str,
    payload: StudentUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(staff),
):
    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(404, "Student was not found")
    for key, value in payload.model_dump().items():
        setattr(student, key, value)
    if student.user is not None:
        student.user.full_name = student.full_name
    record(db, user, "student.updated", "student", student.id)
    commit(db)
    return student_data(student, db)


@router.post("/students/{student_id}/activate")
def activate_student(
    student_id: str,
    payload: AccountActivation,
    db: Session = Depends(get_db),
    user: User = Depends(staff),
):
    student = db.get(Student, student_id)
    if not student:
        raise HTTPException(404, "Student was not found")
    if student.user_id or db.scalar(select(User).where(User.email == student.email)):
        raise HTTPException(409, "An account already exists for this student")
    student_user = User(
        full_name=student.full_name,
        email=student.email,
        password_hash=hash_password(payload.password),
        role="student",
    )
    db.add(student_user)
    db.flush()
    student.user_id = student_user.id
    student.status = "active"
    notify(
        db,
        "Welcome to E-11 Hostel",
        "Your account is active. Review your profile and room allocation.",
        student_user.id,
    )
    record(db, user, "student.account_activated", "student", student.id)
    commit(db)
    return student_data(student, db)


@router.get("/rooms")
def rooms(db: Session = Depends(get_db), user: User = Depends(current_user)):
    rows = db.scalars(select(Room).order_by(Room.number)).all()
    if user.role == "student":
        student = student_for(db, user)
        allocation = db.scalar(
            select(Allocation).where(
                Allocation.student_id == student.id, Allocation.active.is_(True)
            )
        )
        rows = [allocation.bed.room] if allocation else []
    return listing([room_data(row, db, include_names=user.role != "student") for row in rows])


@router.post("/rooms", status_code=201)
def create_room(payload: RoomInput, db: Session = Depends(get_db), user: User = Depends(owner)):
    room = RoomService(db).create(payload, user)
    commit(db)
    return room_data(room, db)


@router.patch("/rooms/{room_id}")
def update_room(
    room_id: str, payload: RoomUpdate, db: Session = Depends(get_db), user: User = Depends(owner)
):
    room = db.get(Room, room_id)
    if not room:
        raise HTTPException(404, "Room was not found")
    if payload.status != "available" and db.scalar(
        select(Allocation.id)
        .join(Bed)
        .where(Bed.room_id == room.id, Allocation.active.is_(True))
        .limit(1)
    ):
        raise HTTPException(409, "Release active allocations before taking a room out of service")
    room.status = payload.status
    record(db, user, "room.status_updated", "room", room.id, {"status": room.status})
    commit(db)
    return room_data(room, db)


@router.put("/room-types/{room_type_id}/price")
def update_price(
    room_type_id: str,
    payload: PriceUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(owner),
):
    category = db.get(RoomType, room_type_id)
    if not category:
        raise HTTPException(404, "Room category was not found")
    previous = category.monthly_price
    category.monthly_price = payload.monthly_price
    record(
        db,
        user,
        "room_type.price_updated",
        "room_type",
        category.id,
        {"previous": previous, "monthly_price": category.monthly_price},
    )
    commit(db)
    return serialized(category)


@router.get("/floors")
def floors(db: Session = Depends(get_db), user: User = Depends(operations)):
    rows = db.scalars(select(Floor).order_by(Floor.number)).all()
    data = []
    for floor in rows:
        rooms = [room_data(room, db) for room in floor.rooms]
        data.append(
            {
                "id": floor.id,
                "name": floor.name,
                "number": floor.number,
                "rooms": len(rooms),
                "total_beds": sum(r["capacity"] for r in rooms),
                "occupied_beds": sum(r["occupied_beds"] for r in rooms),
            }
        )
    return listing(data)


@router.post("/floors", status_code=201)
def create_floor(payload: FloorInput, db: Session = Depends(get_db), user: User = Depends(owner)):
    floor = Floor(**payload.model_dump())
    db.add(floor)
    db.flush()
    record(db, user, "floor.created", "floor", floor.id)
    commit(db)
    return serialized(floor)


@router.post("/allocations", status_code=201)
def create_allocation(
    payload: AllocationInput, db: Session = Depends(get_db), user: User = Depends(staff)
):
    try:
        allocation = BedAllocationService(db).allocate(payload, user)
        commit(db, "Student or bed already has an active allocation")
    except IntegrityError as exc:
        db.rollback()
        raise HTTPException(409, "Student or bed already has an active allocation") from exc
    return serialized(allocation)


@router.post("/allocations/{allocation_id}/release")
def release_allocation(
    allocation_id: str, db: Session = Depends(get_db), user: User = Depends(staff)
):
    allocation = db.get(Allocation, allocation_id)
    if not allocation:
        raise HTTPException(404, "Allocation was not found")
    if not allocation.active:
        raise HTTPException(409, "Allocation is already released")
    allocation.active = False
    allocation.ends_on = date.today()
    record(db, user, "allocation.released", "allocation", allocation.id)
    commit(db)
    return serialized(allocation)


@router.get("/complaints")
def complaints(
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
    status: str | None = None,
    offset: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    query = select(Complaint).order_by(Complaint.created_at.desc())
    if user.role == "student":
        query = query.where(Complaint.student_id == student_for(db, user).id)
    if user.role == "assistant":
        query = query.where(Complaint.assigned_to == user.id)
    if status:
        query = query.where(Complaint.status == status)
    rows = db.scalars(query).all()
    return listing(
        [
            {**serialized(c), "student_name": c.student.full_name}
            for c in rows[offset : offset + limit]
        ],
        len(rows),
    )


@router.post("/complaints", status_code=201)
def create_complaint(
    payload: ComplaintInput,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("student")),
):
    complaint = Complaint(
        **payload.model_dump(),
        student_id=student_for(db, user).id,
        reference=f"E11-TK-{uuid4().hex[:8].upper()}",
    )
    db.add(complaint)
    db.flush()
    record(db, user, "complaint.created", "complaint", complaint.id)
    notify(db, "Support request received", f"Ticket {complaint.reference} is now open.", user.id)
    commit(db)
    return serialized(complaint)


@router.patch("/complaints/{complaint_id}")
def update_complaint(
    complaint_id: str,
    payload: ComplaintUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(current_user),
):
    complaint = db.get(Complaint, complaint_id)
    if not complaint:
        raise HTTPException(404, "Complaint was not found")
    ComplaintService(db).update(complaint, payload, user)
    commit(db)
    return serialized(complaint)


@router.get("/mess")
@router.get("/mess/menus")
def mess(db: Session = Depends(get_db), user: User = Depends(current_user)):
    days = {
        day: index
        for index, day in enumerate(
            ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]
        )
    }
    rows = sorted(db.scalars(select(MessMenu)).all(), key=lambda m: days.get(m.day, 7))
    result = listing([serialized(row) for row in rows])
    result["counts"] = (
        [
            serialized(row)
            for row in db.scalars(select(MessCount).order_by(MessCount.date.desc())).all()
        ]
        if user.role != "student"
        else []
    )
    return result


@router.put("/mess")
def update_mess(
    payload: MessUpdate, db: Session = Depends(get_db), user: User = Depends(operations)
):
    if user.role == "assistant" and payload.menus:
        raise HTTPException(403, "Assistant wardens may update meal counts only")
    for item in payload.menus:
        menu = db.scalar(select(MessMenu).where(MessMenu.day == item.day))
        if menu:
            for key, value in item.model_dump().items():
                setattr(menu, key, value)
        else:
            db.add(MessMenu(**item.model_dump()))
    for meal_count in payload.counts:
        count = db.scalar(
            select(MessCount).where(
                MessCount.date == meal_count.date, MessCount.meal == meal_count.meal
            )
        )
        if count:
            count.count = meal_count.count
        else:
            db.add(MessCount(**meal_count.model_dump()))
    record(
        db,
        user,
        "mess.updated",
        "mess",
        "weekly-menu",
        {"menus": len(payload.menus), "counts": len(payload.counts)},
    )
    commit(db)
    return mess(db, user)


@router.get("/transport")
@router.get("/transport/routes")
def transport(db: Session = Depends(get_db), user: User = Depends(current_user)):
    return listing(
        [
            serialized(row)
            for row in db.scalars(select(TransportRoute).order_by(TransportRoute.name)).all()
        ]
    )


@router.post("/transport", status_code=201)
def create_route(payload: RouteInput, db: Session = Depends(get_db), user: User = Depends(staff)):
    route = TransportRoute(**payload.model_dump())
    db.add(route)
    db.flush()
    record(db, user, "transport.created", "transport_route", route.id)
    commit(db)
    return serialized(route)


@router.put("/transport/{route_id}")
def update_route(
    route_id: str, payload: RouteInput, db: Session = Depends(get_db), user: User = Depends(staff)
):
    route = db.get(TransportRoute, route_id)
    if not route:
        raise HTTPException(404, "Transport route was not found")
    for key, value in payload.model_dump().items():
        setattr(route, key, value)
    record(db, user, "transport.updated", "transport_route", route.id)
    commit(db)
    return serialized(route)


@router.get("/notifications")
def notifications(db: Session = Depends(get_db), user: User = Depends(current_user)):
    rows = db.scalars(
        select(Notification)
        .where(or_(Notification.user_id == user.id, Notification.user_id.is_(None)))
        .order_by(Notification.created_at.desc())
        .limit(100)
    ).all()
    return listing([serialized(row) for row in rows])


@router.post("/notifications", status_code=201)
def publish_notification(
    payload: NotificationInput, db: Session = Depends(get_db), user: User = Depends(staff)
):
    if payload.user_id:
        recipient = db.get(User, payload.user_id)
        if recipient is None or not recipient.is_active:
            raise HTTPException(404, "Notification recipient was not found")
    notification = Notification(**payload.model_dump())
    db.add(notification)
    db.flush()
    record(
        db,
        user,
        "notification.published",
        "notification",
        notification.id,
        {"user_id": payload.user_id, "kind": payload.kind},
    )
    commit(db)
    return serialized(notification)


@router.patch("/notifications/{notification_id}/read")
def read_notification(
    notification_id: str, db: Session = Depends(get_db), user: User = Depends(current_user)
):
    row = db.get(Notification, notification_id)
    if not row or row.user_id != user.id:
        raise HTTPException(404, "Personal notification was not found")
    row.is_read = True
    commit(db)
    return serialized(row)


@router.get("/staff")
def staff_members(db: Session = Depends(get_db), user: User = Depends(owner)):
    rows = db.scalars(select(User).where(User.role != "student").order_by(User.full_name)).all()
    return listing([serialized(row, {"password_hash", "mfa_secret_encrypted"}) for row in rows])


class StaffInput(StrictInput):
    full_name: str = Field(min_length=2, max_length=120)
    email: EmailStr
    password: str = Field(min_length=12, max_length=128)
    role: Literal["warden", "assistant"]


@router.post("/staff", status_code=201)
def create_staff(payload: StaffInput, db: Session = Depends(get_db), user: User = Depends(owner)):
    staff_user = User(
        email=payload.email.lower(),
        full_name=payload.full_name,
        role=payload.role,
        password_hash=hash_password(payload.password),
    )
    db.add(staff_user)
    db.flush()
    record(db, user, "staff.created", "user", staff_user.id, {"role": staff_user.role})
    commit(db)
    return serialized(staff_user, {"password_hash", "mfa_secret_encrypted"})


@router.get("/audit-events")
def audit_events(
    db: Session = Depends(get_db),
    user: User = Depends(owner),
    offset: int = Query(0, ge=0),
    limit: int = Query(100, ge=1, le=500),
):
    total = db.scalar(select(func.count(AuditEvent.id)))
    rows = db.scalars(
        select(AuditEvent).order_by(AuditEvent.created_at.desc()).offset(offset).limit(limit)
    ).all()
    items = []
    for row in rows:
        actor = db.get(User, row.actor_id) if row.actor_id else None
        items.append(
            {**serialized(row), "actor_name": actor.full_name if actor else "Public visitor"}
        )
    return listing(items, total)


PUBLIC_SETTING_KEYS = {
    "hostel_name",
    "tagline",
    "email",
    "phone",
    "address",
    "facilities",
    "booking_policy",
    "refund_policy",
    "payment_instructions",
    "about",
    "faq",
    "gallery",
    "hero_image_url",
    "room_image_urls",
    "house_rules",
}


def configured_settings(db: Session) -> dict:
    stored = {row.key: row.value for row in db.scalars(select(Setting)).all()}
    hostel_value = stored.get("hostel")
    public_value = stored.get("public_content")
    hostel = hostel_value if isinstance(hostel_value, dict) else {}
    public = public_value if isinstance(public_value, dict) else {}
    return {
        **stored,
        **public,
        "hostel_name": hostel.get("name", "E-11 Hostel"),
        **{key: hostel.get(key, "") for key in ("tagline", "email", "phone", "address")},
    }


@router.get("/settings")
def get_settings(db: Session = Depends(get_db), user: User = Depends(owner)):
    return configured_settings(db)


@router.put("/settings")
def update_settings(payload: dict, db: Session = Depends(get_db), user: User = Depends(owner)):
    if not payload or set(payload) - PUBLIC_SETTING_KEYS:
        raise HTTPException(422, "Only documented public hostel settings may be updated")
    for image_key in ("hero_image_url", "room_image_urls"):
        if image_key not in payload:
            continue
        image_value = payload[image_key]
        if not isinstance(image_value, str):
            raise HTTPException(422, "Image URLs must be text")
        urls = image_value.splitlines() if image_key == "room_image_urls" else [image_value]
        if len(urls) > 5:
            raise HTTPException(422, "Provide at most five room image URLs")
        for url in urls:
            if url.strip():
                try:
                    parsed = urlsplit(url.strip())
                except ValueError as exc:
                    raise HTTPException(422, "Invalid photo URL") from exc
                if (
                    parsed.scheme != "https"
                    or not parsed.hostname
                    or parsed.username
                    or parsed.password
                ):
                    raise HTTPException(422, "Photo URLs must use HTTPS without credentials")
    hostel_fields = {"hostel_name", "tagline", "email", "phone", "address"}
    public_fields = PUBLIC_SETTING_KEYS - hostel_fields - {"payment_instructions"}
    updates: dict[str, Any] = {}
    for key, value in payload.items():
        if len(str(value)) > 15000:
            raise HTTPException(422, "Setting is too large")
        storage_key = (
            "hostel" if key in hostel_fields else "public_content" if key in public_fields else key
        )
        row = db.get(Setting, storage_key)
        if storage_key in {"hostel", "public_content"}:
            current = updates.get(storage_key)
            if current is None:
                current = dict(row.value) if row and isinstance(row.value, dict) else {}
            current["name" if key == "hostel_name" else key] = value
            value = current
        updates[storage_key] = value
    for storage_key, value in updates.items():
        row = db.get(Setting, storage_key)
        if row:
            row.value = value
        else:
            db.add(Setting(key=storage_key, value=value))
    record(db, user, "settings.updated", "settings", "public", {"keys": sorted(payload)})
    commit(db)
    return get_settings(db, user)
