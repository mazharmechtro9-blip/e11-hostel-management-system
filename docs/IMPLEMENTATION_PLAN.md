# Implementation plan

Build a modular monolith with a Next.js frontend, FastAPI service, PostgreSQL, and migration-managed schemas. Keep business decisions in backend services; use the same database for public availability and staff operations.

1. Foundation: repository structure, application configuration, database migrations, authenticated sessions, server-side role and ownership checks.
2. Interface: premium navy/blue responsive public website and separate portals for owner, warden, assistant warden, and student. Follow the supplied visual reference: dark navigation, compact white cards, electric-blue accents, architectural floor maps, and responsive mobile layouts. Property illustrations are explicitly labeled until real photographs are supplied.
3. Operations: database-backed residents, floors, rooms, beds, booking approval, allocations, complaints, menus, portion counts, and routes.
4. Finance and security: exact monetary values, invoices, challans, private receipt handling, explicit authorized reconciliation, audit records, negative authorization tests.
5. Assistance: public knowledge fallback and authenticated read-only operational assistant. Clearly distinguish deterministic responses from an external LLM.
6. Validation: migrate a real PostgreSQL database, run repeatable development seeds, backend tests, frontend strict checks/build, and browser journeys. Record actual outcomes and incomplete acceptance criteria.
7. Delivery: reproducible setup/start commands, containers, CI, architecture/security documentation, and a precise implementation status.

Student attendance is excluded from the product, schemas, APIs, navigation, and metrics. Meal counts are aggregate kitchen portion records only.

External provider integrations must remain disabled or explicitly development-only until credentials, official integration contracts, and provider validation are available. Never treat a receipt image as settled funds.
