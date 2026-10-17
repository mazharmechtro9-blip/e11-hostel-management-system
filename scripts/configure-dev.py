"""Create a private development environment once; preserve existing user configuration."""
from pathlib import Path
import base64
import os
import secrets

root = Path(__file__).resolve().parent.parent
target = root / ".env"
if target.exists():
    print("Existing .env preserved.")
else:
    password = secrets.token_urlsafe(32)
    content = (root / ".env.example").read_text()
    content = content.replace("POSTGRES_PASSWORD=\n", f"POSTGRES_PASSWORD={password}\n")
    content = content.replace("DATABASE_URL=\n", f"DATABASE_URL=postgresql+psycopg://e11:{password}@127.0.0.1:5432/e11\n")
    content = content.replace("SESSION_SECRET=\n", f"SESSION_SECRET={secrets.token_urlsafe(48)}\n")
    content = content.replace("ENCRYPTION_KEY=\n", f"ENCRYPTION_KEY={base64.urlsafe_b64encode(secrets.token_bytes(32)).decode()}\n")
    descriptor = os.open(target, os.O_CREAT | os.O_EXCL | os.O_WRONLY, 0o600)
    with os.fdopen(descriptor, "w") as handle:
        handle.write(content)
    print("Created private development .env with generated secrets.")
