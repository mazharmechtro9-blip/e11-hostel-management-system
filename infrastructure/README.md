# Infrastructure

The development stack is declared in the repository-root `docker-compose.yml`. Frontend and backend images use the Dockerfiles in their application directories. PostgreSQL, Redis, and private documents use separate named volumes; host ports bind to loopback.

For a real deployment, terminate HTTPS at a managed ingress, keep database and Redis access private, use separate migration/runtime database roles, and provide restricted durable object storage and off-host encrypted backups. See `docs/DEPLOYMENT.md` and `docs/SECURITY.md`.
