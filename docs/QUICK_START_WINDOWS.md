# Windows par application dekhna

## Pehle screenshots

Delivered preview images show the actual public website, owner dashboard, and floor map using demonstration data. Screenshots are pictures; the following steps run the interactive application on your own computer.

## Docker Desktop ke saath

1. Install and start Docker Desktop. Use its Linux containers / WSL 2 backend.
2. Extract the source ZIP, then open the extracted project folder in PowerShell (Windows Terminal).
3. Run these commands in order. Python is executed inside Docker, so a separate local Python or Node installation is not needed:

```powershell
docker run --rm -v "${PWD}:/project" -w /project python:3.12-slim python scripts/configure-dev.py
docker compose up --build -d
docker compose exec backend alembic upgrade head
docker compose exec backend python -m app.scripts.seed_demo
```

The first build downloads dependencies and may take several minutes. Keep Docker Desktop running.

4. Enter `http://localhost:3000` in your browser for the public website, or `http://localhost:3000/login` to sign in.
5. For the owner demonstration, use `owner@e11.demo` and password `E11Demo!2026`. Other demo accounts are listed in README.md.

These are development-only demonstration accounts. Do not use them for real residents or financial operations.

## Agar page na khule

Run `docker compose ps` to see service status. For errors, use `docker compose logs --tail 80 backend frontend`. Do not share the contents of `.env` or any secret values.

To stop the application, run `docker compose down`. Keep the database volumes; do not add `--volumes` unless you intend to erase the development database.

The cloud onboarding screen does not itself display an interactive browser preview. Publishing saves the cloud environment; it does not publicly deploy the website. A hosted public deployment is a separate step.
