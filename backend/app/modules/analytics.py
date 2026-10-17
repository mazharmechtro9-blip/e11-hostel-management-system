from datetime import datetime
from zoneinfo import ZoneInfo

from fastapi import APIRouter, Depends
from sqlalchemy import func, or_, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.dependencies import get_db, require_roles
from app.database.models import (
    Allocation,
    Bed,
    Booking,
    Complaint,
    Invoice,
    Notification,
    Payment,
    Room,
    RoomType,
    Student,
    User,
)
from app.modules.operations import (
    configured_settings,
    listing,
    room_data,
    serialized,
    student_data,
    student_for,
)

router = APIRouter(tags=["Public information & analytics"])


@router.get("/public/settings")
def public_settings(db: Session = Depends(get_db)):
    from app.modules.operations import PUBLIC_SETTING_KEYS

    stored = configured_settings(db)
    result = {key: value for key, value in stored.items() if key in PUBLIC_SETTING_KEYS}
    result["demo_mode"] = settings.app_env == "development"
    result["demo_login_enabled"] = (
        settings.app_env == "development" and settings.demo_password == "E11Demo!2026"
    )
    return result


@router.get("/public/rooms")
def public_rooms(db: Session = Depends(get_db)):
    items = []
    for category in db.scalars(select(RoomType).order_by(RoomType.capacity)).all():
        rooms = db.scalars(select(Room).where(Room.room_type_id == category.id)).all()
        summaries = [room_data(room, db, include_names=False) for room in rooms]
        items.append(
            {
                "id": category.id,
                "name": category.name,
                "capacity": category.capacity,
                "monthly_price": category.monthly_price,
                "available_beds": sum(room["available_beds"] for room in summaries),
                "total_beds": sum(room["capacity"] for room in summaries),
                "amenities": [
                    "Furnished room",
                    "High-speed WiFi",
                    "Daily cleaning",
                    "24/7 security",
                ],
                "description": f"Comfortable {category.capacity}-seater shared accommodation. Price per student per month.",
                "image_label": "Illustrative room image; actual property photography coming soon",
            }
        )
    return listing(items)


class AnalyticsService:
    def __init__(self, db: Session):
        self.db = db

    def overview(self, user: User) -> dict:
        if user.role == "student":
            return self.student_overview(user)

        def count(model):
            return self.db.scalar(select(func.count()).select_from(model)) or 0

        total_beds = count(Bed)
        occupied = (
            self.db.scalar(select(func.count(Allocation.id)).where(Allocation.active.is_(True)))
            or 0
        )
        usable = (
            self.db.scalar(
                select(func.count(Bed.id))
                .join(Room)
                .where(Bed.status == "available", Room.status == "available")
            )
            or 0
        )
        occupied_usable = (
            self.db.scalar(
                select(func.count(Allocation.id))
                .join(Bed)
                .join(Room)
                .where(
                    Allocation.active.is_(True),
                    Bed.status == "available",
                    Room.status == "available",
                )
            )
            or 0
        )
        available = usable - occupied_usable
        open_complaints_query = select(func.count(Complaint.id)).where(
            Complaint.status.in_(["open", "in_progress"])
        )
        if user.role == "assistant":
            open_complaints_query = open_complaints_query.where(Complaint.assigned_to == user.id)
        metrics = {
            "students": count(Student),
            "active_students": self.db.scalar(
                select(func.count(Student.id)).where(Student.status == "active")
            )
            or 0,
            "rooms": count(Room),
            "total_beds": total_beds,
            "usable_beds": usable,
            "occupied_beds": occupied,
            "occupied_usable_beds": occupied_usable,
            "available_beds": available,
            "occupancy_rate": round(occupied_usable / usable * 100, 1) if usable else 0,
            "open_complaints": self.db.scalar(open_complaints_query) or 0,
        }
        complaint_query = select(Complaint).order_by(Complaint.created_at.desc()).limit(5)
        if user.role == "assistant":
            complaint_query = complaint_query.where(Complaint.assigned_to == user.id)
        result = {
            "metrics": metrics,
            "revenue": [],
            "recent_payments": [],
            "occupancy": [
                {"name": "Occupied", "value": occupied_usable},
                {"name": "Available", "value": available},
                {"name": "Unavailable", "value": total_beds - usable},
            ],
            "complaints": [
                {**serialized(row), "student_name": row.student.full_name}
                for row in self.db.scalars(complaint_query).all()
            ],
            "notices": self.notices(user),
            "demo_mode": settings.app_env == "development",
        }
        if user.role in {"owner", "warden"}:
            metrics["bookings"] = (
                self.db.scalar(
                    select(func.count(Booking.id)).where(
                        Booking.status.in_(["submitted", "under_review"])
                    )
                )
                or 0
            )
        if user.role == "owner":
            metrics["collected"] = self.db.scalar(
                select(func.coalesce(func.sum(Payment.amount), 0)).where(
                    Payment.status == "verified"
                )
            )
            metrics["outstanding"] = self.db.scalar(
                select(func.coalesce(func.sum(Invoice.total - Invoice.paid_amount), 0)).where(
                    ~Invoice.status.in_(["draft", "voided"])
                )
            )
            metrics["pending_payments"] = self.db.scalar(
                select(func.count(Payment.id)).where(Payment.status == "pending")
            )
            result["revenue"] = self.revenue()
            rows = self.db.scalars(
                select(Payment).order_by(Payment.created_at.desc()).limit(5)
            ).all()
            result["recent_payments"] = [
                {
                    **serialized(row),
                    "student_name": row.student.full_name,
                    "invoice_number": row.invoice.number,
                }
                for row in rows
            ]
        return result

    def notices(self, user: User):
        rows = self.db.scalars(
            select(Notification)
            .where(or_(Notification.user_id == user.id, Notification.user_id.is_(None)))
            .order_by(Notification.created_at.desc())
            .limit(5)
        ).all()
        return [serialized(row) for row in rows]

    def revenue(self):
        today = datetime.now(ZoneInfo("Asia/Karachi")).date()
        current = today.year * 12 + today.month - 1
        months = {}
        for index in range(current - 5, current + 1):
            year, month = divmod(index, 12)
            months[f"{year:04d}-{month + 1:02d}"] = {"revenue": 0, "expected": 0}
        for invoice in self.db.scalars(
            select(Invoice).where(
                ~Invoice.status.in_(["draft", "voided"]), Invoice.month.in_(months)
            )
        ).all():
            months[invoice.month]["revenue"] += invoice.paid_amount
            months[invoice.month]["expected"] += invoice.total
        return [{"month": month, **values} for month, values in sorted(months.items())]

    def student_overview(self, user: User):
        student = student_for(self.db, user)
        allocation = self.db.scalar(
            select(Allocation).where(
                Allocation.student_id == student.id, Allocation.active.is_(True)
            )
        )
        invoices = self.db.scalars(
            select(Invoice).where(Invoice.student_id == student.id).order_by(Invoice.month.desc())
        ).all()
        payments = self.db.scalars(
            select(Payment)
            .where(Payment.student_id == student.id)
            .order_by(Payment.created_at.desc())
            .limit(5)
        ).all()
        complaints = self.db.scalars(
            select(Complaint)
            .where(Complaint.student_id == student.id)
            .order_by(Complaint.created_at.desc())
        ).all()
        profile = student_data(student, self.db)
        return {
            "student": {
                **profile,
                "room": room_data(allocation.bed.room, self.db, False) if allocation else None,
                "current_invoice": serialized(invoices[0]) if invoices else None,
                "bed_label": allocation.bed.label if allocation else None,
            },
            "metrics": {
                "monthly_rent": profile["monthly_rent"],
                "outstanding": sum(i.total - i.paid_amount for i in invoices),
                "collected": sum(i.paid_amount for i in invoices),
                "open_complaints": sum(c.status in {"open", "in_progress"} for c in complaints),
            },
            "revenue": [],
            "occupancy": [],
            "recent_payments": [serialized(p) for p in payments],
            "complaints": [serialized(c) for c in complaints[:5]],
            "notices": self.notices(user),
            "demo_mode": settings.app_env == "development",
        }


@router.get("/dashboard")
def dashboard(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles("owner", "warden", "assistant", "student")),
):
    return AnalyticsService(db).overview(user)


@router.get("/reports/occupancy")
def occupancy_report(
    db: Session = Depends(get_db), user: User = Depends(require_roles("owner", "warden"))
):
    return {
        "items": [
            room_data(row, db) for row in db.scalars(select(Room).order_by(Room.number)).all()
        ],
        "metrics": AnalyticsService(db).overview(user)["metrics"],
    }


@router.get("/reports/complaints")
def complaint_report(
    db: Session = Depends(get_db), user: User = Depends(require_roles("owner", "warden"))
):
    rows = db.execute(
        select(Complaint.category, func.count(Complaint.id)).group_by(Complaint.category)
    ).all()
    return listing([{"category": category, "count": count} for category, count in rows])
