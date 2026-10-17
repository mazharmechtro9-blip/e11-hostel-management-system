#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export UV_CACHE_DIR="${UV_CACHE_DIR:-$PWD/runtime/cache/uv}"
export npm_config_cache="${npm_config_cache:-$PWD/runtime/cache/npm}"
export BUILDX_CONFIG="${BUILDX_CONFIG:-$PWD/runtime/cache/buildx}"
export XDG_CACHE_HOME="${XDG_CACHE_HOME:-$PWD/runtime/cache}"
python3 scripts/configure-dev.py
uv venv --allow-existing backend/.venv
uv pip sync --python backend/.venv/bin/python backend/requirements.lock
npm --prefix frontend ci --no-audit --no-fund
npm ci --no-audit --no-fund
docker compose up -d --wait db redis
(
  cd backend
  .venv/bin/alembic upgrade head
  .venv/bin/python -m app.scripts.seed_demo
)
echo 'Dependencies installed and development database prepared.'
