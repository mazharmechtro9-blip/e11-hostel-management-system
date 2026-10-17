#!/usr/bin/env bash
# Produce a custom-format PostgreSQL backup without exposing connection secrets.
set -euo pipefail
cd "$(dirname "$0")/.."
umask 077
backup_dir="${1:-runtime/backups}"
mkdir -p "$backup_dir"
backup_file="$backup_dir/e11-$(date -u +%Y%m%dT%H%M%SZ).dump"
docker compose exec -T db sh -c 'pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" --format=custom --no-owner --no-acl' > "$backup_file"
test -s "$backup_file"
echo "Backup saved: $backup_file"
