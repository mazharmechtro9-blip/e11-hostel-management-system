"""Run the two application processes behind one hosted HTTPS origin.

Hosting owns TLS and the public port. FastAPI binds only to loopback inside
the container; the production Next.js server proxies its API requests.
"""

import base64
import hashlib
import os
from pathlib import Path
import signal
import subprocess
import sys
import time

ROOT = Path(__file__).resolve().parent


def main() -> int:
    environment = os.environ.copy()
    public_url = environment.get("RENDER_EXTERNAL_URL") or environment.get(
        "FRONTEND_URL"
    )
    if not public_url:
        raise SystemExit(
            "Set the public FRONTEND_URL or the hosting-provided RENDER_EXTERNAL_URL"
        )
    environment["FRONTEND_URL"] = public_url.rstrip("/")
    database = environment.get("DATABASE_URL", "")
    for prefix in ("postgres://", "postgresql://"):
        if database.startswith(prefix):
            database = "postgresql+psycopg://" + database[len(prefix) :]
            break
    environment["DATABASE_URL"] = database
    if not environment.get("ENCRYPTION_KEY"):
        secret = environment.get("MFA_ENCRYPTION_SECRET", "")
        if len(secret) < 32:
            raise SystemExit(
                "Configure a generated MFA_ENCRYPTION_SECRET of at least 32 characters"
            )
        environment["ENCRYPTION_KEY"] = base64.urlsafe_b64encode(
            hashlib.sha256(secret.encode()).digest()
        ).decode()
    environment["BACKEND_URL"] = "http://127.0.0.1:8000"
    environment["HOSTNAME"] = "0.0.0.0"
    environment["PORT"] = environment.get("PORT", "10000")
    subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=ROOT / "backend",
        env=environment,
        check=True,
    )
    if environment.get("DEMO_SEED", "false").lower() == "true":
        if environment.get("APP_ENV") != "development":
            raise SystemExit("DEMO_SEED is permitted only in development")
        if len(environment.get("DEMO_PASSWORD", "")) < 12:
            raise SystemExit(
                "Choose a DEMO_PASSWORD containing at least 12 characters in deployment settings"
            )
        subprocess.run(
            [sys.executable, "-m", "app.scripts.seed_demo"],
            cwd=ROOT / "backend",
            env=environment,
            check=True,
        )
    children: list[subprocess.Popen] = []
    stopping = False

    def stop(_signum=None, _frame=None):
        nonlocal stopping
        stopping = True
        for child in children:
            if child.poll() is None:
                child.terminate()

    signal.signal(signal.SIGTERM, stop)
    signal.signal(signal.SIGINT, stop)
    try:
        children.append(
            subprocess.Popen(
                [
                    sys.executable,
                    "-m",
                    "uvicorn",
                    "app.main:app",
                    "--host",
                    "127.0.0.1",
                    "--port",
                    "8000",
                ],
                cwd=ROOT / "backend",
                env=environment,
            )
        )
        children.append(
            subprocess.Popen(
                ["node", "server.js"], cwd=ROOT / "frontend", env=environment
            )
        )
        while not stopping:
            for child in children:
                if child.poll() is not None:
                    return child.returncode or 1
            time.sleep(0.3)
        return 0
    finally:
        stop()
        for child in children:
            try:
                child.wait(timeout=8)
            except subprocess.TimeoutExpired:
                child.kill()
                child.wait()


if __name__ == "__main__":
    raise SystemExit(main())
