# Database design

PostgreSQL 17 is the development integration database. Apply all Alembic migrations before starting business operations. Never replace migrations with `create_all()` in application startup; metadata creation is used only by isolated service tests.

| Domain | Main records | Key integrity controls |
| --- | --- | --- |
| Identity | users, user_sessions, roles, permissions, role_permissions | unique email/session digest; constrained role; session expiry and revocation |
| Accommodation | floors, room_types, rooms, beds, allocations | unique room/floor/bed labels; foreign keys; partial unique active bed and active student indexes; valid allocation dates |
| Admissions | bookings, students | booking reference and resident email uniqueness; separately reviewed approval/allocation |
| Billing | invoices, payments, payment_verifications, receipts | one invoice per resident/month; exact totals/nonnegative balances; unique bank references/idempotency keys/evidence; positive amounts; restricted foreign-key deletion |
| Operations | complaints, mess_menus, mess_counts, transport_routes, notifications | constrained statuses/priorities; unique day/meal portion record; positive transport capacity |
| Administration | settings, audit_events | constrained public settings writes; application-level append-only audit operations |
| Knowledge | ai_knowledge_documents, ai_knowledge_chunks | explicit approval; owner-only ingestion; document/chunk foreign keys |
| Imports | import_batches | owner-bound expiring confirmation; transactional import; single-use flag |

IDs use UUID strings. Financial values use integers in **whole Pakistani rupees**, not floating point or paise; fractional-rupee values are rejected. Timestamped business records use UTC timezone-aware database timestamps. The reporting month window is calculated for Asia/Karachi.

The allocation service locks a bed row before testing availability, and database indexes independently prevent conflicting active allocations. Verified payment updates use conditional SQL and a transaction to prevent duplicate settlement and overpayment. A pending payment is excluded from verified collections.

The baseline development seed contains five room categories, five floors, 25 rooms and 100 beds. Seed data is deterministic and explicitly invoked only in development. Public availability, the floor map and staff reports share these same records; they do not have separate hardcoded capacity figures.

Migrations currently cover `0001` (domain foundation), `0002` (approved knowledge), and `0003` (reviewed imports). Tests migrate up, down and up in a disposable schema. Backups must include PostgreSQL data, private receipt storage and the separately controlled MFA encryption key.

This is the initial normalized core, with some simplified operational records. Dedicated contract/line-item/refund/adjustment ledgers, document-retention records, vehicle/driver/transport-assignment entities, richer complaint history and a transactional delivery outbox remain in the implementation backlog. Do not infer that every entity named in the master specification has been built.
