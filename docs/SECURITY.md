# Security implementation and deployment boundaries

This is a working development foundation with automated security regression tests. It has not undergone an independent penetration test or production security review.

## Identity and authorization

- Passwords use Argon2id with per-password salts. Failed sign-ins use the same generic error and a dummy password hash for unknown accounts.
- Sign-in issues an opaque random session token in an HttpOnly, SameSite=Lax cookie. Only its SHA-256 digest is stored in the database. Sessions expire after 12 hours by default; logout revokes the server-side session. Password changes revoke other sessions.
- Production cookies require HTTPS. Production configuration refuses SQLite, an absent or invalid MFA encryption key, and an HTTP frontend URL.
- The database supplies the authenticated role. API clients cannot assign a role through login or a student form. Roles are `owner`, `warden`, `assistant`, and `student`.
- Students can read and change their own authorized resources. Private financial resources use object ownership checks and return an unavailable-resource response for another student's records.
- Financial administration, settings, staff creation, audit events, knowledge management and CSV imports require the owner role. Warden and assistant accounts have no financial access by default. Assistants may change aggregate meal counts and only complaints assigned to them.
- TOTP MFA enrollment stores an encrypted secret using the externally configured Fernet key. Production owner and warden access requires MFA verification. Once MFA is enabled, other roles also require it. Owner mutations using privileged role dependencies require verification within the preceding 15 minutes.
- Enrollment, MFA verification, identity inspection and logout remain accessible to a signed-in account that has not completed MFA, so first-time enrollment is possible.

## Browser and request protection

Authenticated writes require a CSRF header matching both the readable CSRF cookie and the server-side session. Explicit foreign origins are rejected for authenticated writes and login. Development permits the localhost and 127.0.0.1 aliases of the configured frontend; production permits the exact configured frontend origin.

The API returns correlation identifiers, generic unexpected-error responses, no-store headers for private resources, MIME-sniffing protection, frame denial, a referrer policy and restricted browser permissions. HSTS is emitted in production. Request logs contain method, path, status and timing, without request bodies, passwords, cookies, MFA secrets or configuration values.

Next.js renders a fresh script nonce for every document through its request proxy and Content Security Policy. Production scripts require the nonce and omit `unsafe-eval`; inline styles remain allowed for React/chart rendering. The frontend API proxy independently enforces a streaming 6 MiB body cap before buffering, forwards only selected headers and applies a 30-second upstream timeout. Browser tests verify fresh nonces, framework script nonce attributes and frontend size rejection.

An ASGI body limit rejects requests over 6 MiB before JSON or multipart parsing, including bodies sent without Content-Length. Receipt files have a separate 5 MiB limit. A single-process rate limiter limits authentication and mutation attempts. A shared ingress limiter and connection/read timeouts are still required before running multiple production workers.

## Financial integrity

Amounts are exact integer PKR rupees; the API rejects fractional payment amounts. Invoice totals and nonnegative balances are checked by the database. Billing periods, payment idempotency keys, bank references and verification evidence references have uniqueness constraints.

Payments begin pending. Uploading a receipt does not change an invoice balance. Owner verification requires explicit confirmation and a bank-statement or provider-settlement evidence reference. The owner must independently obtain and reconcile that evidence; this version does not contact a bank or settlement provider to validate it automatically. Screenshots are not a supported settlement evidence type.

Verification uses conditional database updates and a transaction to prevent duplicate processing and overpayment, including competing partial payments. Payment verification and audit events commit with the balance update. The API offers no delete or historical-payment-edit endpoint. This is an application control; database administrators are not restricted by an append-only database trigger in this version.

## Allocation and operational integrity

Active bed and student allocations have partial unique indexes. Allocation checks, row locking on PostgreSQL and database constraints ensure that two competing requests cannot both occupy the same bed. Booking approval creates a pending resident profile and remains separate from allocation and account activation.

Availability, public prices, room maps, occupancy and reports read the same database models. Unavailable beds and rooms are excluded from usable occupancy. Complaint transitions, assistant assignments, meal counts, settings updates and room prices are validated and audited.

## Private documents and AI

Receipts are stored outside the public web tree under randomized names and downloaded through authenticated ownership checks. Validation checks file signatures, parses PDFs, rejects encrypted or active-content PDFs, verifies image content and limits sizes and page counts. Filename extensions and caller-supplied MIME types are not trusted. These checks do not replace malware scanning or a sandboxed document-processing service.

The public assistant reads approved public knowledge and public hostel configuration. The administrative assistant uses explicit owner-only, read-only analytical code. Neither assistant executes generated SQL or actions from user or retrieved text. The default assistant and hashing embedding provider are clearly labeled deterministic development fallbacks; no external model is represented as connected.

## Tests completed

The suite covers server-side session expiry and revocation, CSRF and foreign origins, production MFA enrollment and freshness, role and student ownership denial, duplicate and competing bed allocation, invoice totals, idempotent and partial payments, duplicate reconciliation, private receipt access, malformed files, oversized declared and chunked bodies, approved knowledge isolation, and single-use CSV import previews. PostgreSQL integration tests use random isolated schemas and do not clear the application's data. Migration upgrade/downgrade/upgrade is tested.

Run the current checks with:

```bash
cd backend
.venv/bin/ruff check app tests
.venv/bin/ruff format --check app tests
.venv/bin/mypy app --ignore-missing-imports --follow-imports=silent
.venv/bin/pytest -q
```

Set `TEST_DATABASE_URL` to a PostgreSQL database where the test account may create and drop its own temporary schemas. Tests otherwise use the configured database for isolated PostgreSQL schemas or a temporary SQLite file. Production migrations use Alembic, not application startup table creation.

## Work required before production financial use

1. Independently review authentication, authorization, payment reconciliation, uploads and infrastructure. Complete a threat model and penetration test for the actual deployment.
2. Implement MFA recovery, enrollment recovery verification and emergency access procedures. Verify key backup and rotation. There is currently no self-service MFA recovery or password-reset email flow.
3. Configure TLS, exact host/origin settings, a shared rate limiter, request timeouts, network restrictions, monitoring and centralized security logs. Provision database credentials with appropriate least privilege.
4. Use protected, encrypted storage and backups. Configure malware scanning, retention and deletion rules for private documents. Exercise database and document restore procedures and record their results.
5. Integrate an authorized payment provider before enabling real gateway payments. Signed webhooks, webhook replay handling, OCR, automatic bank reconciliation, refunds, adjustment ledgers and scheduled billing are not implemented yet.
6. Configure transactional email/SMS delivery and background jobs. In-app notifications currently work; an SMTP or SMS provider is not connected.
7. Review retention, consent and hostel policies using real operational information. Demo contact details, bank instructions and documents must be replaced. The deterministic development seed refuses to run outside development.
8. Extend owner-controlled granular permission grants and scope administration where needed. The initial application enforces fixed role policies; the role/permission tables are a foundation for more configurable policies.

The Docker composition and development accounts are intended for local development. Publishing the repository or starting the development stack does not constitute approval for real financial operations.
