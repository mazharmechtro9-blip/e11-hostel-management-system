#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export PIP_CACHE_DIR="$PWD/runtime/cache/pip"
if ! command -v uv >/dev/null 2>&1; then
  python3 -m venv runtime/codespaces-tooling
  runtime/codespaces-tooling/bin/python -m pip install --disable-pip-version-check 'uv>=0.8,<1'
  export PATH="$PWD/runtime/codespaces-tooling/bin:$PATH"
fi
ready=false
for attempt in {1..40}; do
  if docker info >/dev/null 2>&1; then ready=true; break; fi
  sleep 1
done
if [ "$ready" != true ]; then
  echo 'The development Docker service is not ready. Rebuild the Codespace container.' >&2
  exit 1
fi
bash scripts/install.sh
