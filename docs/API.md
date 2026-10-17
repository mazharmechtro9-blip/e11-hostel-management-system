# API reference

The versioned REST API is served under `/api/v1`. Interactive request/response schemas are available at `/docs` on the API service. `openapi.json` beside this document is generated from the implemented FastAPI application.

Sign in using `POST /api/v1/auth/login`; the browser receives an HttpOnly `e11_session` cookie and a readable `e11_csrf` cookie. Send the CSRF value in `X-CSRF-Token` for authenticated mutations. Privileged production requests also require a verified MFA session. Do not send role claims as an authorization mechanism.

List endpoints generally return `{items, total}`. Monetary amounts are exact whole PKR rupees. The API uses 401 for missing/expired identity, 403 for denied permissions or request-boundary checks, 404 for unavailable or foreign-owned records, 409 for business/uniqueness conflicts, 413 for body limits and 422 for validation failures. Error responses include a safe detail and request identifier.

| Method | Endpoint | Operation |
| --- | --- | --- |
| POST | `/api/v1/ai/admin-chat` | Admin Chat |
| GET | `/api/v1/ai/knowledge` | Documents |
| POST | `/api/v1/ai/knowledge` | Ingest Document |
| PATCH | `/api/v1/ai/knowledge/{document_id}` | Approve Document |
| POST | `/api/v1/ai/public-chat` | Public Chat |
| POST | `/api/v1/allocations` | Create Allocation |
| POST | `/api/v1/allocations/{allocation_id}/release` | Release Allocation |
| GET | `/api/v1/audit-events` | Audit Events |
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/logout` | Logout |
| GET | `/api/v1/auth/me` | Me |
| POST | `/api/v1/auth/mfa/setup` | Mfa Setup |
| POST | `/api/v1/auth/mfa/verify` | Mfa Verify |
| POST | `/api/v1/auth/password` | Password Update |
| POST | `/api/v1/bookings` | Create Booking |
| GET | `/api/v1/bookings` | Bookings |
| POST | `/api/v1/bookings/{booking_id}/approve` | Approve Booking |
| POST | `/api/v1/bookings/{booking_id}/reject` | Reject Booking |
| GET | `/api/v1/complaints` | Complaints |
| POST | `/api/v1/complaints` | Create Complaint |
| PATCH | `/api/v1/complaints/{complaint_id}` | Update Complaint |
| GET | `/api/v1/dashboard` | Dashboard |
| GET | `/api/v1/floors` | Floors |
| POST | `/api/v1/floors` | Create Floor |
| POST | `/api/v1/imports/students/confirm` | Confirm Import |
| POST | `/api/v1/imports/students/preview` | Preview Import |
| GET | `/api/v1/invoices` | List Invoices |
| POST | `/api/v1/invoices` | Create Invoice |
| GET | `/api/v1/invoices/{invoice_id}` | Get Invoice |
| GET | `/api/v1/invoices/{invoice_id}/challan` | Download Challan |
| GET | `/api/v1/mess` | Mess |
| PUT | `/api/v1/mess` | Update Mess |
| GET | `/api/v1/mess/menus` | Mess |
| GET | `/api/v1/notifications` | Notifications |
| POST | `/api/v1/notifications` | Publish Notification |
| PATCH | `/api/v1/notifications/{notification_id}/read` | Read Notification |
| GET | `/api/v1/payments` | List Payments |
| POST | `/api/v1/payments` | Create Payment |
| GET | `/api/v1/payments/{payment_id}` | Get Payment |
| GET | `/api/v1/payments/{payment_id}/receipt` | Download Receipt |
| POST | `/api/v1/payments/{payment_id}/receipts` | Upload Receipt |
| GET | `/api/v1/payments/{payment_id}/receipts` | List Receipts |
| POST | `/api/v1/payments/{payment_id}/verification` | Verify Payment |
| GET | `/api/v1/profile` | Profile |
| PUT | `/api/v1/profile` | Update Profile |
| GET | `/api/v1/public/rooms` | Public Rooms |
| GET | `/api/v1/public/settings` | Public Settings |
| GET | `/api/v1/reports/complaints` | Complaint Report |
| GET | `/api/v1/reports/financial` | Financial Report |
| GET | `/api/v1/reports/occupancy` | Occupancy Report |
| PUT | `/api/v1/room-types/{room_type_id}/price` | Update Price |
| GET | `/api/v1/rooms` | Rooms |
| POST | `/api/v1/rooms` | Create Room |
| PATCH | `/api/v1/rooms/{room_id}` | Update Room |
| GET | `/api/v1/settings` | Get Settings |
| PUT | `/api/v1/settings` | Update Settings |
| GET | `/api/v1/staff` | Staff Members |
| POST | `/api/v1/staff` | Create Staff |
| GET | `/api/v1/students` | Students |
| POST | `/api/v1/students` | Create Student |
| PUT | `/api/v1/students/{student_id}` | Update Student |
| POST | `/api/v1/students/{student_id}/activate` | Activate Student |
| GET | `/api/v1/transport` | Transport |
| POST | `/api/v1/transport` | Create Route |
| GET | `/api/v1/transport/routes` | Transport |
| PUT | `/api/v1/transport/{route_id}` | Update Route |
| GET | `/health` | Health |

The fixed role policy and ownership boundaries are described in `PERMISSIONS.md`. Publishing an endpoint does not grant public access; authorization runs in the backend dependencies/services. No real merchant webhook or live payment-provider endpoint is implemented.
