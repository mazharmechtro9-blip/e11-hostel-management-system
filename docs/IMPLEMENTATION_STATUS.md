# Implementation status and next phase

This is a working **development release**, not completion of every acceptance criterion in the master specification. The initial repository contained only a README. The implementation now has actual application code, database migrations, persisted workflows, authenticated role portals, and automated tests. No student attendance module, table, endpoint, navigation item, or individual meal tracking was introduced.

## Implemented

- Responsive public home, rooms/pricing, gallery, facilities, about, FAQ, contact, booking, and policy pages. Navy/blue styling follows the supplied design reference. Building/room illustrations are explicitly conceptual; no image is represented as an actual property photograph.
- Distinct owner, warden, assistant warden, and student dashboards with working navigation and backend-enforced role restrictions. Search, status filters, pagination of displayed records, forms, accessible native dialogs, loading/error/empty states, notifications, and responsive navigation.
- PostgreSQL models and three Alembic revisions. Floors, room categories and pricing, rooms, beds, residents, users, sessions, allocations, bookings, invoices, payments, private receipts, verification evidence, complaints, menus, aggregate portion counts, transport routes, notifications, settings, audit events, approved knowledge and import previews persist in the database.
- Idempotent, explicitly invoked development seed: five floors, five rooms per floor, capacities two through six, 100 beds, synthetic residents, allocations, billing history and operational examples. Seed refuses production use. Tests and interactive journeys add separate demo records; rerunning the seed preserves existing changes.
- Public booking submission/reference, approval/rejection, pending resident creation, separately authorized allocation, and allocation release. PostgreSQL locking and unique active-allocation indexes prevent two successful assignments to one bed or two concurrent active primary assignments for one student.
- Resident creation/editing and explicit account activation. Initial real owner bootstrap through a trusted terminal; no production demo account creation.
- Exact whole-PKR invoices, duplicate monthly invoice prevention, partial payments, PDF challans with reference QR codes, pending payment submission, private validated PDF/PNG/JPEG upload, duplicate receipt detection, owner reconciliation against an explicit bank/provider evidence reference, and audit events. A receipt never settles an invoice by itself.
- Complaint creation, restricted staff updates, assigned-assistant scope, response/status visibility and workflow notifications.
- Weekly menu editing and aggregate kitchen portion counts; editable transport routes/schedules and vehicle/driver fields. These are basic operational records, not live GPS or a complete fleet-management subsystem.
- Owner configuration for public contact/policy information and pricing; staff account creation with fixed roles; in-app operational announcements; audit review; account password changes and session revocation.
- Owner-reviewed student CSV import: schema/duplicate checks, preview, row errors, expiring single-use confirmation and all-or-nothing import. Resident CSV export protects against spreadsheet formula interpretation.
- Owner-managed approved text knowledge, parsing/chunking, local development embeddings, scored retrieval/source attribution, public FAQ fallback and owner-only typed read-only summaries. Public retrieval never queries resident financial records.
- Argon2id passwords; opaque hashed server sessions; HttpOnly cookies; session-bound CSRF checks; origin validation; TOTP MFA with encrypted secrets; privileged production MFA and recent verification checks; bounded upload bodies and content validation; security headers, request identifiers and structured logs.
- Next.js production build, non-root application Dockerfiles, Compose PostgreSQL/Redis, native development helpers, backup helper and CI configuration.

## Demonstration-only or requiring external integration

- The assistant is a deterministic FAQ/retrieval implementation with local hashing embeddings. It is labeled accordingly. It is not connected to an external LLM, semantic embedding service or pgvector index.
- Payment method names identify submitted evidence only. No bank, Easypaisa, JazzCash, merchant gateway, signed webhook or automatic settlement service is connected.
- No OCR, email, SMS, WhatsApp or external notification provider is connected. Environment placeholders do not constitute working integrations.
- Property photographs, actual address/contact policies, driver details, university schedules, refund rules and bank instructions must be supplied and approved by the hostel operator. Concept illustrations and synthetic records must be replaced before real use.

## Remaining implementation work

1. **Financial lifecycle:** contract-based recurring invoice generation, configured due/grace/late-fee calculations, itemized charges/discounts, scheduled billing/reminders, refunds, reversals and an append-only adjustment ledger. Current invoices are explicitly entered by the owner; late-fee amounts are entered, not calculated by a rules engine.
2. **Provider architecture:** authorized merchant adapters, authenticated/idempotent/replay-protected webhooks, settlement reconciliation, sandbox provider, OCR assistance and verified provider integration tests. Receipt evidence references are recorded by an authorized human; the application does not independently authenticate a bank statement.
3. **Identity and recovery:** email verification, password-reset delivery, MFA recovery/backup codes, enrollment recovery, account lockout policies and comprehensive privileged account administration. Do not deploy the demo as an identity provider without these controls and an independent review.
4. **Authorization/configuration:** owner-configurable granular grants/scopes, richer staff lifecycle and role management. Role/permission tables currently seed a foundation; server policies are fixed in code. Warden financial access is denied by default and cannot yet be granted through configuration.
5. **Accommodation lifecycle:** transactional transfer flow, explicit booking expiry/cancellation UI, checkout/archive business rules, reconciliation discrepancy records, configurable bed/floor deactivation and complete property content/photo management. Current allocation/release and room status controls cover the initial operational path.
6. **Operational detail:** complaint attachments, comments/event timeline, resolution confirmation/reopening depth, dedicated maintenance records, prepared/served/waste portion accounting, cost/inventory models, normalized drivers/vehicles, route assignments and student-specific transport authorization. The student transport view currently displays shared published routes, not an assigned-route record.
7. **Reports:** complete date/floor/category filters, billing-period collection semantics, server-wide paginated search and sorting for every UI list, Excel/PDF report exports, expanded complaint/mess/transport analytics. Several views currently fetch up to 100 records and paginate that fetched set; this must be extended before large datasets.
8. **Knowledge:** PDF/office-document ingestion and sanitization, semantic provider adapters, vector indexing, multilingual quality evaluations and grounded generation with a configured LLM. Development retrieval currently scans a bounded index and is unsuitable for a large corpus.
9. **Production infrastructure:** shared Redis/ingress rate limits, queues/outbox/retry workers, encrypted object-storage adapter, malware scanning/quarantine, document retention, centralized tamper-resistant audit storage, least-privilege database users, secrets/key rotation, monitoring and production HTTPS deployment validation. Redis is provisioned but is not yet an application cache/queue dependency.
10. **UX and quality depth:** richer public CMS, authentic 360-degree tour media, full dark mode, configurable accessibility preferences, comprehensive WCAG audit, component-level tests, load tests, security penetration tests and verified CI execution on GitHub. Local checks do not establish that a hosted CI run or production deployment succeeded.

## Validation evidence

Actual command outcomes and counts are recorded in `docs/TESTING.md`. The final task report distinguishes passed checks, remaining scope and external dependencies. Docker and cloud configuration outcomes must be claimed separately from native application tests; saving a configuration draft does not publish it.

## Suggested next implementation slice

Complete contract-based monthly billing and the immutable financial correction/refund lifecycle before adding live providers. Add calculation and replay/concurrency tests, connect the corresponding owner screens, then implement transport assignments and operational history. Configure external integrations only after official provider contracts, credentials and sandbox acceptance tests are available.
