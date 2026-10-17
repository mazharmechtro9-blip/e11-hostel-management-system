# Approved-design continuation: student, finance and operations

Phase A was approved in the conversation. This continuation updates the same
application and preserves its session authentication, CSRF protection, database
schemas, private receipt storage and bank-evidence payment verification.

## Implemented UI

- Student dashboard: room and bed, monthly rent, last verified payment, outstanding
  dues, earliest unpaid issued invoice, authenticated challan download, receipt
  workflow shortcut, recent payments/tickets, today's published menu and notices.
  Mobile navigation provides Home, Room, Payments, Tickets and Profile.
- Finance: consistent summary cards, searchable payment/invoice tables, compact
  invoice cards, challan downloads, pending-payment submission, receipt selection
  and drag/drop, and existing evidence-based owner verification. Summary totals
  use the dashboard aggregate rather than summing a single page of records.
- Floor map: actual configured floors, corridor/entry/exit schematic, colour-coded
  rooms and beds, room details and allocation controls. Only owners see financial
  classifications. Purple explicitly means a pending profile or missing issued
  invoice, because there is no independent allocation-verification flag in the
  existing schema. No schema or security-policy changes were needed.
- Shared premium shell and module surfaces cover warden and assistant dashboards,
  residents, bookings, complaints, mess, transport, reports, staff permissions,
  audit logs, settings and administrative chat. Existing module actions remain
  connected to their APIs. Login and remaining public imagery use labelled photo
  placeholders instead of the old building/bed illustrations.
- Draft and voided invoices are excluded from student overview balances.

## Verification and practical limits

Actual desktop (1440 × 900) and mobile (390 × 844) screenshots were captured and
visually reviewed. Fresh migrated/seeded disposable PostgreSQL databases were used
for clean screenshots; an issued next-month student invoice was created through
the API to demonstrate upcoming dues. Only those disposable databases were
removed, and the original development database/services were restored.

Visual review corrected invoice badge sizing, contrast, and receipt navigation for
an account with no unpaid invoices. Automated axe WCAG 2 A/AA checks returned zero
violations on the sampled homepage, owner dashboard, owner payments, owner floor
map and student dashboard after fixes. This is a sampled automated check, not an
accessibility certification or a manual screen-reader audit.

The complete backend suite passed 57 tests, including actual-balance map colours,
financial-data isolation, student denial of the staff floor-map API and exclusion
of draft/void invoice balances. Existing and new Playwright journeys cover all role
navigation, mobile layouts, allocation, challan download, receipt upload, payment
verification and complaints. Build/static-check results are recorded in the task.

Live AI-provider integration, bank/provider automation, OCR and other deferred
enterprise capabilities remain as documented in IMPLEMENTATION_STATUS.md. This UI
redesign does not represent those deferred integrations as completed features.
