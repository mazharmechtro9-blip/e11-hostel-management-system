#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."
export PIP_CACHE_DIR="$PWD/runtime/cache/pip"
if ! command -v uv >/dev/null 2>&1; then
  # Recovery containers can leave an incompatible Python venv in the shared
  # workspace. Never reuse its interpreter or pip when rebuilding on Debian.
  mkdir -p runtime
  tooling_dir="$(mktemp -d "$PWD/runtime/codespaces-tooling.XXXXXX")"
  trap 'rm -rf -- "$tooling_dir"' EXIT
  python3 -m venv "$tooling_dir"
  "$tooling_dir/bin/python" -m pip install --disable-pip-version-check 'uv>=0.8,<1'
  export PATH="$tooling_dir/bin:$PATH"
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
