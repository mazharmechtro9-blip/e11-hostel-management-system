# Deployment and recovery

## Browser-only hosted preview

The root README Deploy button uses `render.yaml` and `infrastructure/Dockerfile.hosted` to run Next.js and FastAPI under one public origin with managed PostgreSQL. See `ONLINE_PREVIEW.md` for the account steps, chosen demo password, free-plan limitations and the distinction between a preview and production. Provider account sign-in is required; a deployment configuration is not itself a live website.

## Development containers

From the repository root:

```bash
python3 scripts/configure-dev.py
docker compose up --build -d
docker compose exec backend alembic upgrade head
docker compose exec backend python -m app.scripts.seed_demo
```

The generated `.env` is private and ignored by Git. The development seed must never run against production. Database credentials are generated locally; the example account password is deliberately a development-only demo credential.

For a cloud host whose HTTPS egress proxy uses an additional certificate authority, use the optional build-time trust overlay. It mounts the host's existing public CA bundle only during dependency installation; certificate verification remains enabled:

```bash
BUILDX_CONFIG="$PWD/runtime/cache/buildx" docker compose -f docker-compose.yml -f infrastructure/compose.cloud-build.yml build
docker compose up -d
```

Set `E11_BUILD_CA_FILE` to the supported CA bundle location if the host uses another path. Regular local Docker builds use the standard Dockerfiles without this overlay. Do not disable TLS verification or use package-manager trusted-host bypasses to address proxy trust failures.

The Compose host ports bind to the loopback interface. Configure an HTTPS reverse proxy for a real deployment, explicitly set the trusted hostname/origin configuration, and run production with `APP_ENV=production`. Use a separate least-privilege runtime database account and privileged migration account. Configure secure storage, backup access, monitoring, and secret management before handling real resident or financial data.

## Backups

```bash
bash scripts/backup.sh
```

This creates a private custom-format database dump in the ignored `runtime/backups` directory. Move encrypted backups to restricted off-host storage and apply a documented retention policy. Back up private receipt storage as well; a database dump does not contain uploaded documents. Keep the MFA encryption key in a separately controlled recovery vault.

Verify a backup by restoring into a **new disposable database**, never by overwriting the live database:

```bash
docker compose exec -T db sh -c 'createdb -U "$POSTGRES_USER" e11_restore_check'
docker compose exec -T db sh -c 'pg_restore -U "$POSTGRES_USER" -d e11_restore_check --no-owner --no-acl' < runtime/backups/REPLACE_WITH_BACKUP.dump
docker compose exec -T db sh -c 'psql -U "$POSTGRES_USER" -d e11_restore_check -c "SELECT count(*) FROM users;"'
```

Check expected record counts, financial totals, constraints, and document access in an isolated application instance before accepting a restore. Delete the disposable database only after confirming no process uses it. Recovery should restore the matching application version, migration revision, database dump, document archive, and encryption key together.

## Production release gate

Use the implementation status document to distinguish working features from unfinished scope. The first implementation is a development release. Do not enable real payment providers, rely on external notification delivery, or claim full production readiness before provider sandbox tests, role review, independent security review, backup restore verification, and production deployment validation.
