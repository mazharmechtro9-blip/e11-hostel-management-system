"""Idempotent, development-only demonstration dataset.

Run migrations first, then ``python -m app.scripts.seed_demo``. The seed uses
fixed UUIDs and dates and refuses to modify an existing non-demo database.
No demo users or passwords are enabled by application startup in production.
"""

from datetime import date, datetime, timedelta, timezone
from uuid import NAMESPACE_URL, uuid5

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import hash_password
from app.database.models import (
    Allocation,
    AuditEvent,
    Bed,
    Booking,
    Complaint,
    Floor,
    Invoice,
    MessCount,
    MessMenu,
    Notification,
    Payment,
    PaymentVerification,
    Permission,
    Role,
    RolePermission,
    Room,
    RoomType,
    Setting,
    Student,
    TransportRoute,
    User,
)
from app.database.session import SessionLocal

SEED_KEY = "demo_seed_v1"
ANCHOR = datetime(2026, 10, 1, 8, 0, tzinfo=timezone.utc)


def demo_id(name: str) -> str:
    return str(uuid5(NAMESPACE_URL, f"https://demo.e11.hostel/{name}"))


def seed_demo(db: Session) -> dict[str, int | str]:
    """Create an internally consistent dataset in one transaction.

    Re-running a completed seed is a no-op. Production and pre-existing data
    are protected even if this function is called directly rather than via CLI.
    """
    if settings.app_env != "development":
        raise RuntimeError("Demo seeding is permitted only with APP_ENV=development.")
    if db.get(Setting, SEED_KEY):
        return {"status": "already_seeded", "students": 32, "beds": 100}
    if db.scalar(select(func.count()).select_from(User)) or db.scalar(
        select(func.count()).select_from(Floor)
    ):
        raise RuntimeError("Refusing to seed a non-empty database. Existing data is preserved.")

    password_hash = hash_password(settings.demo_password)
    staff: dict[str, User] = {}
    for role, full_name in (
        ("owner", "Mazhar Khan · Demo Owner"),
        ("warden", "Hassan Raza · Demo Warden"),
        ("assistant", "Bilal Ahmed · Demo Assistant"),
    ):
        user = User(
            id=demo_id(f"user/{role}"),
            email=f"{role}@e11.demo",
            password_hash=password_hash,
            full_name=full_name,
            role=role,
            is_active=True,
            created_at=ANCHOR,
        )
        db.add(user)
        staff[role] = user

    permission_codes = {
        "students.read": "Read resident information within assigned scope",
        "students.write": "Manage resident profiles",
        "rooms.read": "View rooms and beds",
        "rooms.write": "Manage rooms and bed allocations",
        "bookings.write": "Review booking requests",
        "complaints.read": "Read authorized complaints",
        "complaints.write": "Manage authorized complaints",
        "mess.write": "Update menu and aggregate meal counts",
        "transport.write": "Manage transport routes",
        "finance.read": "Read invoices, payments and financial reports",
        "finance.verify": "Verify payments against independent settlement evidence",
        "settings.write": "Manage owner-controlled configuration",
        "audit.read": "Read immutable audit events",
        "roles.write": "Manage staff permissions",
    }
    for code, description in permission_codes.items():
        db.add(Permission(id=demo_id(f"permission/{code}"), code=code, description=description))
    grants = {
        "owner": set(permission_codes),
        "warden": {
            "students.read",
            "students.write",
            "rooms.read",
            "rooms.write",
            "bookings.write",
            "complaints.read",
            "complaints.write",
            "mess.write",
            "transport.write",
        },
        "assistant": {"rooms.read", "complaints.read", "complaints.write", "mess.write"},
        "student": set(),
    }
    for role in ("owner", "warden", "assistant", "student"):
        db.add(Role(id=demo_id(f"role/{role}"), name=role, label=role.replace("_", " ").title()))
    db.flush()
    for role, codes in grants.items():
        for code in sorted(codes):
            db.add(
                RolePermission(
                    role_id=demo_id(f"role/{role}"), permission_id=demo_id(f"permission/{code}")
                )
            )

    room_types: list[RoomType] = []
    for capacity, price in ((2, 22000), (3, 20000), (4, 19000), (5, 18000), (6, 16000)):
        room_type = RoomType(
            id=demo_id(f"room-type/{capacity}"),
            name=f"{capacity} Seater",
            capacity=capacity,
            monthly_price=price,
        )
        db.add(room_type)
        room_types.append(room_type)
    floors = []
    for floor_number in range(5):
        floor = Floor(
            id=demo_id(f"floor/{floor_number}"),
            number=floor_number,
            name="Ground Floor" if floor_number == 0 else f"Floor {floor_number}",
        )
        floors.append(floor)
        db.add(floor)
    db.flush()

    beds: list[tuple[Bed, RoomType]] = []
    for floor in floors:
        for room_index, room_type in enumerate(room_types, start=1):
            number = f"{floor.number + 1}{room_index:02d}"
            room = Room(
                id=demo_id(f"room/{number}"),
                floor_id=floor.id,
                room_type_id=room_type.id,
                number=number,
                status="available",
            )
            db.add(room)
            db.flush()
            for bed_index in range(room_type.capacity):
                bed = Bed(
                    id=demo_id(f"bed/{number}/{bed_index}"),
                    room_id=room.id,
                    label=chr(65 + bed_index),
                    status="available",
                )
                db.add(bed)
                beds.append((bed, room_type))
    db.flush()

    names = [
        "Ahmed Raza",
        "Ali Hassan",
        "Muhammad Usman",
        "Hamza Khan",
        "Abdullah Shah",
        "Omar Farooq",
        "Saad Ahmed",
        "Zain Ali",
        "Haris Mahmood",
        "Bilal Akram",
        "Ibrahim Khalid",
        "Talha Javed",
        "Fahad Malik",
        "Daniyal Iqbal",
        "Huzaifa Tariq",
        "Ahsan Butt",
        "Sufyan Khan",
        "Hasnain Raza",
        "Waleed Aslam",
        "Salman Yousaf",
        "Shahzaib Mir",
        "Rehan Siddiqui",
        "Muneeb Ashraf",
        "Ammar Saleem",
        "Faisal Qureshi",
        "Umair Shafiq",
        "Adeel Hussain",
        "Shayan Abbas",
        "Moiz Nadeem",
        "Rizwan Haider",
        "Imran Nasir",
        "Asad Mehmood",
    ]
    universities = ["NUST", "FAST Islamabad", "Air University", "Bahria University", "IIUI"]
    students: list[Student] = []
    student_prices: list[int] = []
    for index, name in enumerate(names):
        email = "student@e11.demo" if index == 0 else f"student{index + 1:02d}@e11.demo"
        user = User(
            id=demo_id(f"user/student/{index}"),
            email=email,
            password_hash=password_hash,
            full_name=name,
            role="student",
            is_active=True,
            created_at=ANCHOR - timedelta(days=60),
        )
        db.add(user)
        db.flush()
        student = Student(
            id=demo_id(f"student/{index}"),
            user_id=user.id,
            full_name=name,
            email=email,
            phone=f"0300000{index + 1000:04d}",
            guardian_phone=f"0310000{index + 1000:04d}",
            university=universities[index % len(universities)],
            status="active",
            created_at=ANCHOR - timedelta(days=60),
        )
        db.add(student)
        db.flush()
        bed, room_type = beds[(index * 3) % len(beds)]
        db.add(
            Allocation(
                id=demo_id(f"allocation/{index}"),
                student_id=student.id,
                bed_id=bed.id,
                starts_on=date(2026, 8, 1),
                active=True,
                created_at=ANCHOR - timedelta(days=60),
            )
        )
        students.append(student)
        student_prices.append(room_type.monthly_price)

    # Settlement records are the only source of seeded paid balances. Pending
    # payments intentionally do not contribute to invoice.paid_amount.
    for month in (8, 9, 10):
        for index, student in enumerate(students):
            price = student_prices[index]
            paid = price if (month < 10 or index < 20) else (price // 2 if index < 25 else 0)
            invoice = Invoice(
                id=demo_id(f"invoice/{month}/{index}"),
                number=f"E11-2026{month:02d}-{index + 1:04d}",
                student_id=student.id,
                month=f"2026-{month:02d}",
                subtotal=price,
                late_fee=0,
                total=price,
                paid_amount=paid,
                status="paid" if paid == price else ("partial" if paid else "overdue"),
                due_date=date(2026, month, 10),
                created_at=datetime(2026, month, 1, 8, tzinfo=timezone.utc),
            )
            db.add(invoice)
            db.flush()
            if paid:
                timestamp = datetime(2026, month, 5, 10, tzinfo=timezone.utc)
                payment = Payment(
                    id=demo_id(f"payment/{month}/{index}"),
                    reference=f"PAY-2026{month:02d}-{index + 1:04d}",
                    invoice_id=invoice.id,
                    student_id=student.id,
                    amount=paid,
                    method="bank_transfer",
                    status="verified",
                    bank_reference=f"DEMO-BANK-{month:02d}-{index + 1:04d}",
                    idempotency_key=f"demo-settlement-{month}-{index}",
                    submitted_by=student.user_id,
                    created_at=timestamp,
                    verified_at=timestamp + timedelta(hours=2),
                )
                db.add(payment)
                db.flush()
                db.add(
                    PaymentVerification(
                        id=demo_id(f"verification/{month}/{index}"),
                        payment_id=payment.id,
                        verified_by=staff["owner"].id,
                        evidence_type="bank_statement",
                        evidence_reference=f"DEMO-STATEMENT-{month:02d}-{index + 1:04d}",
                        notes="Demonstration settlement evidence; no real transfer occurred.",
                        created_at=timestamp + timedelta(hours=2),
                    )
                )
            if month == 10 and index in (20, 21, 25, 26):
                db.add(
                    Payment(
                        id=demo_id(f"pending-payment/{index}"),
                        reference=f"PAY-REVIEW-{index + 1:04d}",
                        invoice_id=invoice.id,
                        student_id=student.id,
                        amount=price - paid,
                        method="bank_transfer",
                        status="pending",
                        bank_reference=f"DEMO-PENDING-{index + 1:04d}",
                        idempotency_key=f"demo-pending-{index}",
                        submitted_by=student.user_id,
                        created_at=ANCHOR + timedelta(days=12, hours=index % 5),
                    )
                )

    for index, (name, status) in enumerate(
        (
            ("Ayan Ahmed", "submitted"),
            ("Rayyan Ali", "under_review"),
            ("Mustafa Khan", "submitted"),
            ("Umar Siddiq", "approved"),
            ("Taha Iqbal", "rejected"),
            ("Hammad Rauf", "submitted"),
        )
    ):
        db.add(
            Booking(
                id=demo_id(f"booking/{index}"),
                reference=f"E11-BK-{1001 + index}",
                full_name=name,
                email=f"applicant{index + 1}@e11.demo",
                phone=f"0320000{index + 2000:04d}",
                university=universities[index % len(universities)],
                room_type_id=room_types[index % len(room_types)].id,
                status=status,
                notes="Demonstration booking. Approval does not allocate a bed.",
                created_at=ANCHOR + timedelta(days=10 + index),
            )
        )

    complaint_data = [
        ("Wi-Fi connection is intermittent", "internet", "high", "open"),
        ("Bathroom tap needs repair", "maintenance", "normal", "in_progress"),
        ("Please add a vegetarian dinner option", "mess", "normal", "open"),
        ("Study room light replacement", "maintenance", "low", "resolved"),
        ("Transport pickup schedule question", "transport", "normal", "closed"),
        ("Room cleaning request", "cleaning", "normal", "in_progress"),
        ("Water dispenser maintenance", "maintenance", "high", "open"),
        ("Laundry service timing", "other", "low", "resolved"),
    ]
    for index, (title, category, priority, status) in enumerate(complaint_data):
        db.add(
            Complaint(
                id=demo_id(f"complaint/{index}"),
                reference=f"CMP-{1001 + index}",
                student_id=students[index].id,
                title=title,
                category=category,
                description=f"{title}. This is an example request in the development dataset.",
                priority=priority,
                status=status,
                assigned_to=staff["assistant" if index % 2 else "warden"].id,
                response="The operations team has addressed this request."
                if status in ("resolved", "closed")
                else "",
                created_at=ANCHOR + timedelta(days=8 + index),
                updated_at=ANCHOR + timedelta(days=9 + index),
            )
        )

    weekly_menu = [
        ("Monday", "Paratha, omelette & tea", "Chicken pulao & raita", "Daal mash, roti & salad"),
        ("Tuesday", "Bread, boiled eggs & tea", "Aloo qeema & roti", "Chicken karahi & naan"),
        ("Wednesday", "Chana, paratha & tea", "Vegetable rice & yoghurt", "Beef kofta & roti"),
        ("Thursday", "Omelette, toast & tea", "Daal chawal & salad", "Chicken curry & roti"),
        ("Friday", "Halwa puri & tea", "Chicken biryani & raita", "Mixed vegetables & roti"),
        ("Saturday", "Paratha, fried egg & tea", "Chana pulao & salad", "Chicken handi & naan"),
        (
            "Sunday",
            "Aloo paratha & yoghurt",
            "Seasonal vegetables & roti",
            "Special pulao & dessert",
        ),
    ]
    for day, breakfast, lunch, dinner in weekly_menu:
        db.add(
            MessMenu(
                id=demo_id(f"menu/{day}"), day=day, breakfast=breakfast, lunch=lunch, dinner=dinner
            )
        )
    for day_index in range(7):
        for meal_index, meal in enumerate(("breakfast", "lunch", "dinner")):
            day_date = date(2026, 10, 12) + timedelta(days=day_index)
            db.add(
                MessCount(
                    id=demo_id(f"mess-count/{day_date}/{meal}"),
                    date=day_date,
                    meal=meal,
                    count=24 + ((day_index + meal_index) % 8),
                )
            )

    for index, (name, destination, vehicle) in enumerate(
        (
            ("NUST Morning Route", "NUST H-12 Campus", "Demo Hiace · DEMO-101"),
            ("FAST & IIUI Route", "FAST H-11 / IIUI H-10", "Demo Coaster · DEMO-102"),
            ("Air & Bahria Route", "E-9 / E-8 Islamabad", "Demo Hiace · DEMO-103"),
        )
    ):
        db.add(
            TransportRoute(
                id=demo_id(f"transport/{index}"),
                name=name,
                destination=destination,
                departure_time="07:30" if index != 1 else "07:15",
                return_time="16:30",
                vehicle=vehicle,
                driver_name=f"Demo Driver {index + 1}",
                driver_phone="03000000000",
                capacity=14 if index != 1 else 22,
                fee=4500,
                status="active",
            )
        )

    settings_data = {
        SEED_KEY: {"version": 1, "seeded_at": ANCHOR.isoformat(), "is_demo": True},
        "hostel": {
            "name": "E-11 Hostel",
            "tagline": "Safe Stay. Better Tomorrow.",
            "address": "E-11, Islamabad, Pakistan",
            "phone": "+92 300 0000000",
            "email": "hello@e11.demo",
            "is_demo": True,
        },
        "payment_instructions": {
            "bank_name": "Configure your authorized bank",
            "account_title": "Demo information — replace before accepting payments",
            "account_number": "Not configured",
            "currency": "PKR",
            "notice": "Upload receipts for review. Only independent settlement evidence confirms payment.",
        },
        "rent_rules": {
            "due_day": 10,
            "late_fee": 0,
            "currency": "PKR",
            "price_basis": "per_student_month",
        },
        "public_content": {
            "about": "A secure and comfortable student living experience in Islamabad.",
            "facilities": [
                "Furnished rooms",
                "Wi-Fi",
                "Mess",
                "Laundry",
                "Pick & drop",
                "Security",
            ],
            "booking_policy": "Submit a booking request. Staff review and allocation are separate steps.",
            "refund_policy": "Refund terms must be confirmed with hostel management before booking.",
        },
        "ai_knowledge": [
            {
                "title": "Booking procedure",
                "content": "Choose a room type and submit a booking request. Staff review requests before approving. A bed is assigned separately.",
            },
            {
                "title": "Facilities",
                "content": "The demo hostel offers furnished rooms, Wi-Fi, mess, laundry, cleaning, security and optional university transport.",
            },
            {
                "title": "Location",
                "content": "E-11 Hostel is in E-11, Islamabad, Pakistan. Exact address and contact details are demonstration data pending owner configuration.",
            },
        ],
    }
    for key, value in settings_data.items():
        db.add(Setting(key=key, value=value))

    for student in students:
        db.add(
            Notification(
                id=demo_id(f"welcome/{student.id}"),
                user_id=student.user_id,
                title="Welcome to E-11 Hostel",
                message="Your demonstration portal is ready. View your room, invoices and hostel services.",
                kind="info",
                is_read=False,
                created_at=ANCHOR,
            )
        )
    for role, user in staff.items():
        db.add(
            Notification(
                id=demo_id(f"staff-notice/{role}"),
                user_id=user.id,
                title="Demonstration workspace",
                message="All residents, financial entries and operational records in this workspace are demonstration data.",
                kind="info",
                is_read=False,
                created_at=ANCHOR,
            )
        )
    db.add(
        AuditEvent(
            id=demo_id("audit/seed"),
            actor_id=staff["owner"].id,
            action="demo.seed",
            entity="environment",
            entity_id="development",
            details={"is_demo": True, "floors": 5, "rooms": 25, "beds": 100, "students": 32},
            created_at=ANCHOR,
        )
    )
    db.commit()
    return {"status": "seeded", "students": 32, "beds": 100}


def main() -> None:
    with SessionLocal() as db:
        try:
            result = seed_demo(db)
        except Exception:
            db.rollback()
            raise
    print(
        f"Development demo {result['status']}: {result['students']} residents, {result['beds']} beds."
    )


if __name__ == "__main__":
    main()
