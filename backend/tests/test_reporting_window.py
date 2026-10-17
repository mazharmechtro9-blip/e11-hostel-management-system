from datetime import datetime
from zoneinfo import ZoneInfo


def test_revenue_chart_has_six_current_months_and_excludes_future_billing(backend_api):
    owner = backend_api.login("owner")
    student = owner.get("/api/v1/students").json()["items"][0]
    response = owner.post(
        "/api/v1/invoices",
        json={
            "student_id": student["id"],
            "month": "2098-01",
            "subtotal": 98765,
            "late_fee": 0,
            "due_date": "2098-01-05",
        },
    )
    assert response.status_code == 201, response.text
    overview = owner.get("/api/v1/dashboard")
    assert overview.status_code == 200
    revenue = overview.json()["revenue"]
    assert len(revenue) == 6
    assert revenue[-1]["month"] == datetime.now(ZoneInfo("Asia/Karachi")).strftime("%Y-%m")
    assert "2098-01" not in {item["month"] for item in revenue}
