#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
if [ -n "${CODESPACE_NAME:-}" ]; then
  export FRONTEND_URL="https://${CODESPACE_NAME}-3000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"
  export SESSION_COOKIE_SECURE=true
fi
docker compose up -d --wait db redis
(
  cd backend
  .venv/bin/alembic upgrade head
  .venv/bin/python -m app.scripts.seed_demo
)
# A previous lifecycle invocation can leave a healthy server with the old
# origin configuration. Restart only services recorded by our own helper.
backend/.venv/bin/python scripts/dev.py stop
backend/.venv/bin/python scripts/dev.py start
echo 'E-11 Hostel is running. Use Open in Browser for the E-11 HOSTEL port (3000).'
