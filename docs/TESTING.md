# Testing the portal

The acceptance suite uses a real Chromium browser, the Next.js application, and the FastAPI service connected to the development database. It does not replace API responses or authentication with browser mocks.

## Before running

Install backend/frontend dependencies, migrate the development database, explicitly install the demo seed, and start both applications using the root README instructions. Use a disposable development database: browser journeys create booking requests, allocations, complaints, and financial review records that remain available for manual inspection. Demo accounts are not intended for production.

```bash
npm ci
npx playwright install --with-deps chromium
npm run typecheck:e2e
npm run test:e2e
```

The default addresses are `http://127.0.0.1:3000` for the frontend and `http://127.0.0.1:8000/api/v1` for the API. Override them with `E11_BASE_URL` and `E11_API_BASE_URL`. If the host already supplies Chromium, set `CHROMIUM_PATH=/usr/bin/chromium` instead of downloading a browser. `E11_DEMO_PASSWORD` overrides the documented development password when the seed uses a different value.

Do not use these tests against a live resident or financial database. Successful acceptance tests intentionally change data. Run the demo seed against a fresh disposable database to restore a known baseline; the idempotent seed does not erase completed workflows.

## Coverage

- Public homepage and booking form at desktop, tablet, and phone widths; required-field validation; login error and authentication redirect.
- All four role dashboards, responsive navigation drawers, and every link in each role's portal navigation.
- Visitor booking submission and owner approval with a separate bed allocation.
- Student challan download, payment submission, private receipt upload, and authorized reconciliation.
- Student complaint creation, staff processing, and the student-visible result.
- Assistant financial access denial and missing-CSRF rejection through direct API calls.
- Concurrent requests for one available bed; exactly one allocation may succeed.

Tests use unique applicant names, emails, and transaction references to avoid collisions. Backend tests exercise calculations, object ownership, receipt validation, transition rules, and database constraints in more detail. An accepted receipt upload does not constitute trusted payment evidence.

## Failure evidence

Playwright saves screenshots and traces for failing tests under ignored `test-results/`. Public responsive screenshots are also saved there. Set `E11_E2E_VIDEO=1` to record failure videos when Playwright's FFmpeg binary is installed. Open the HTML report with `npm run test:e2e:report`; open a trace with `npx playwright show-trace path/to/trace.zip`.

The suite deliberately runs with one worker and no automatic test retries so that a broken workflow remains visible. Authentication helpers honor an explicit HTTP 429 `Retry-After` once, record a test annotation, and keep the application's login throttling enabled. Concurrent allocation requests are issued together within the dedicated race test.

## Latest execution

The current implementation was validated with these completed checks:

| Check | Result |
| --- | --- |
| Backend pytest | **53 passed**, using migrated isolated PostgreSQL schemas for HTTP integration and temporary SQLite service fixtures |
| Backend static analysis | Ruff check, Ruff formatting and mypy passed (21 application source files) |
| Database | Alembic upgrade/downgrade/upgrade regression passed; `alembic check` reports no schema drift |
| Full browser suite on built containers | **19 passed**, Chromium, real FastAPI/PostgreSQL, no API mocks |
| Native browser suite before final hardening | 18 passed; 12 public/security cases passed again after nonce/body-limit hardening |
| Frontend | Strict TypeScript, ESLint, formatting and Next.js production compilation passed |
| Dependencies | `npm audit` including development dependencies: 0 findings; `pip-audit` against the locked backend dependencies: 0 findings at scan time |
| Containers | Both images built, both applications ran as non-root, public data and authenticated browser workflows passed through the production frontend bundle |
| Repeatability | `scripts/install.sh` completed again without resetting data; recorded services stopped/restarted and database, public rooms, cookie login and current six-month reporting checks passed |
| Backup | Custom-format dump restored into a new disposable database; user/room/bed/invoice counts and verified-payment totals matched, then the disposable database was removed |

The full container browser run covered every role's navigation, desktop/mobile layouts, public booking, separate approval/allocation, challan downloads, private receipt upload, authorized reconciliation, complaint resolution, ownership/role denials, concurrent allocation protection, script nonces and oversized frontend request rejection. The suite intentionally honors authentication rate limits.

One upstream Starlette/httpx TestClient deprecation warning remains; it does not represent a skipped or failed test. CI workflows are configured, but no hosted GitHub Actions run or production deployment is claimed. The secret-scan job is configured for CI; a local full-history secret scan was not performed.

Docker builds in the cloud proxy environment initially required the optional CA-bundle build overlay described in `DEPLOYMENT.md`. Builds succeeded with normal TLS verification enabled. The overlay is unnecessary on hosts whose standard image trust store already trusts their network path.
