# Architecture

The initial product is a modular monolith. The browser uses a Next.js App Router application. Its API proxy forwards `/api/v1/*` to FastAPI using `BACKEND_URL`, including cookies, CSRF headers, and private downloads. Business records live in PostgreSQL; public availability and the floor map read the same allocation records.

The backend uses Pydantic request validation, SQLAlchemy domain models, explicit service operations, and Alembic schema migrations. Session tokens are opaque random values whose hashes are stored in the database. Authorization runs in FastAPI and checks both role and record ownership. Browser navigation is not an authorization boundary.

Money is represented as integer whole Pakistani rupees. This initial implementation does not accept fractional rupees. Invoices and verified payments are separate records; pending receipt submissions are excluded from collections. The database constrains active bed and resident allocations to be unique. Approval of a booking does not itself allocate a bed.

Private uploaded receipts are stored outside the frontend and served through authenticated APIs. The development Compose volume retains them between container restarts. Production should replace local private storage with an encrypted object-storage adapter and a malware-scanning/quarantine pipeline.

The public assistant uses approved public information only. A deterministic FAQ response must be labeled as such. External AI, embeddings, bank settlement, messaging, and OCR must not be described as connected until their adapters have been configured and tested.

## Runtime boundaries

* Frontend: Node.js / Next.js, port 3000.
* API: Python 3.12+ / FastAPI, port 8000.
* Database: PostgreSQL 17, port 5432, durable volume.
* Redis: version 7, port 6379, available for future shared rate limits and jobs. Provisioning Redis does not by itself establish that application features use it.

Live processes do not survive a cloud filesystem snapshot. Follow saved startup instructions to restart services in a new task. Each task is already isolated; use its existing checkout without creating Git worktrees.
