# E-11 Hostel · Smart Management Portal

**Safe Stay. Better Tomorrow.** A database-backed hostel operations platform with a responsive Next.js website and role-specific portals, a FastAPI service, and PostgreSQL persistence.

## Browser mein dekhein — GitHub Codespaces

[![Open E-11 in GitHub Codespaces](https://github.com/codespaces/badge.svg)](https://codespaces.new/mazharmechtro9-blip/e11-hostel-management-system?quickstart=1)

Button kholein aur **Create codespace** par click karein. Setup khud chalega. Tayyar hone par **Open in Browser** dabayein; terminal commands ya local installation ki zaroorat nahi. Demo login: `owner@e11.demo`, password `E11Demo!2026`.

GitHub personal accounts include a monthly Codespaces allowance without payment details, subject to account eligibility and remaining quota. This opens a temporary development preview tied to your GitHub session, not permanent public hosting. See [Codespaces preview](docs/CODESPACES_PREVIEW.md).

## Optional Render hosting (may require card verification)

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/mazharmechtro9-blip/e11-hostel-management-system)

Local installation ki zaroorat nahi: button kholein, GitHub se Render mein sign in karein, `DEMO_PASSWORD` mein apna naya password (kam az kam 12 characters) dein, aur deployment shuru karein. Service **Live** ho jaye to uska `.onrender.com` link kholein. Owner login email `owner@e11.demo` hai; password wohi hoga jo aapne deployment ke waqt chuna.

The blueprint requests free preview resources. Review Render's current availability/limits before confirming; no paid plan is selected by this repository. This deploys a demonstration environment, not a finished production financial service. See [online preview instructions](docs/ONLINE_PREVIEW.md).

This repository contains the initial application implementation. See [implementation status](docs/IMPLEMENTATION_STATUS.md) for verified capabilities and the remaining master-specification scope. The development release uses clearly labeled synthetic residents, property concept illustrations, and a deterministic knowledge assistant. It does not connect to a real bank or external language model.

## Run with Docker

Prerequisites: Docker Engine with Compose, and Python 3.12+ for the local configuration helper.

```bash
python3 scripts/configure-dev.py
docker compose up --build -d
docker compose exec backend alembic upgrade head
docker compose exec backend python -m app.scripts.seed_demo
```

Configuration generation preserves an existing `.env`. The seed is explicit, idempotent, and development-only. Application startup never creates demo accounts. PostgreSQL, Redis, and private documents use persistent Docker volumes.

Development addresses (enter these in your own browser):

| Interface | Address |
| --- | --- |
| Public website | `http://127.0.0.1:3000` |
| Sign in | `http://127.0.0.1:3000/login` |
| Owner | `http://127.0.0.1:3000/owner` |
| Warden | `http://127.0.0.1:3000/warden` |
| Assistant warden | `http://127.0.0.1:3000/assistant` |
| Student | `http://127.0.0.1:3000/student` |
| OpenAPI documentation | `http://127.0.0.1:8000/docs` |
| API health | `http://127.0.0.1:8000/health` |

## Native development

Prerequisites: Python 3.12+, `uv`, Node.js 22+, npm, and Docker Compose for PostgreSQL/Redis.

```bash
bash scripts/install.sh
backend/.venv/bin/python scripts/dev.py start
backend/.venv/bin/python scripts/dev.py status
```

Logs and recorded process IDs are stored in ignored `runtime/`. To stop services started by the helper:

```bash
backend/.venv/bin/python scripts/dev.py stop
```

Alternatively run the API and frontend in two terminals:

```bash
cd backend
.venv/bin/uvicorn app.main:app --host 0.0.0.0 --port 8000
```

```bash
cd frontend
npm run dev
```

The API reads `.env` in the backend directory and then the root configuration as documented in its settings class. The frontend forwards API requests to `BACKEND_URL` at request time; the native default is port 8000. The browser uses same-origin API requests and HttpOnly session cookies.

## Development accounts

After explicitly running the development seed, use one of these accounts. The initial demo password is `E11Demo!2026`; set `DEMO_PASSWORD` before the first seed to choose another value.

| Role | Email |
| --- | --- |
| Owner | `owner@e11.demo` |
| Warden | `warden@e11.demo` |
| Assistant warden | `assistant@e11.demo` |
| Student | `student@e11.demo` |

Do not enable these accounts on a production database. For a fresh real database, run migrations and bootstrap the first owner from a trusted terminal:

```bash
cd backend
.venv/bin/python -m app.scripts.create_owner --email owner@example.org --name 'Hostel Owner'
```

The command prompts privately for a password and refuses to overwrite an existing owner. Production privileged accounts must enroll and verify MFA. Configure HTTPS, PostgreSQL, and a valid `ENCRYPTION_KEY` before enabling production mode.

## Quality checks

```bash
cd backend
.venv/bin/ruff check app tests
.venv/bin/ruff format --check app tests
.venv/bin/mypy app --ignore-missing-imports --follow-imports=silent
.venv/bin/pytest -q
```

```bash
cd frontend
npm run lint
npm run typecheck
npm run format:check
npm run build
```

For full-stack browser journeys, start both applications and run from the root:

```bash
npm ci
npm run typecheck:e2e
CHROMIUM_PATH=/usr/bin/chromium npm run test:e2e
```

If system Chromium is unavailable, install Playwright's browser with `npx playwright install --with-deps chromium` and omit `CHROMIUM_PATH`. Browser journeys create demonstration business records; use a disposable development database. API integration tests use temporary isolated schemas and migrations, leaving application tables intact. See [testing](docs/TESTING.md).

## Repository map

* `frontend/`: App Router application, responsive public pages, role-aware navigation, feature views, shared UI primitives, and API proxy.
* `backend/app/`: security configuration, SQLAlchemy models, authenticated APIs, business services, development seeds, and owner bootstrap.
* `backend/alembic/`: versioned database migrations.
* `tests/e2e/`: Playwright browser and authorization journeys.
* `infrastructure/`: infrastructure notes; application Dockerfiles live beside each application.
* `scripts/`: reproducible development installation, startup, and backup helpers.
* `docs/`: master requirements, architecture, testing, security, deployment, and implementation status.

Read [architecture](docs/ARCHITECTURE.md), [security](docs/SECURITY.md), and [deployment/recovery](docs/DEPLOYMENT.md) before adapting this development release for real residents or financial operations.

The [API reference](docs/API.md), [database design](docs/DATABASE.md), and [permission matrix](docs/PERMISSIONS.md) describe the implemented contracts. Validation currently includes **53 backend tests and 19 full-stack browser tests passing**. Remaining work is explicit in the implementation status; this is not yet a production financial release.
