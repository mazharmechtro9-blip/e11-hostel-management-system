"""API integration fixtures backed by migrated, isolated real databases.

PostgreSQL tests create a random schema in the configured database. Neither
application tables nor their data are cleared. SQLite uses a temporary file so
threaded requests use distinct connections against the same database.
"""

from collections.abc import Iterator
from dataclasses import dataclass, field
from pathlib import Path
import os
from uuid import uuid4

from alembic import command
from alembic.config import Config
from cryptography.fernet import Fernet
from fastapi.testclient import TestClient
import pytest
from sqlalchemy import Engine, create_engine, event, text
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session, sessionmaker

from app import main as app_main
from app.core import dependencies
from app.core.config import settings
from app.scripts.seed_demo import seed_demo

BACKEND = Path(__file__).resolve().parents[1]


def migrate(engine: Engine, target: str = "head", *, downgrade: bool = False) -> None:
    config = Config(str(BACKEND / "alembic.ini"))
    config.set_main_option("script_location", str(BACKEND / "alembic"))
    with engine.begin() as connection:
        config.attributes["connection"] = connection
        if downgrade:
            command.downgrade(config, target)
        else:
            command.upgrade(config, target)


@pytest.fixture
def isolated_engine(tmp_path: Path) -> Iterator[Engine]:
    database_url = os.environ.get("TEST_DATABASE_URL") or settings.database_url
    postgres = make_url(database_url).get_backend_name() == "postgresql"
    if postgres:
        # Only generated ASCII identifiers are interpolated into DDL, and all
        # destructive cleanup is confined to the exact schema created here.
        schema = f"e11_test_{uuid4().hex}"
        admin = create_engine(database_url, pool_pre_ping=True)
        with admin.begin() as connection:
            connection.execute(text(f'CREATE SCHEMA "{schema}"'))
        engine = create_engine(
            database_url,
            pool_pre_ping=True,
            connect_args={"options": f"-csearch_path={schema}"},
        )
    else:
        engine = create_engine(
            f"sqlite:///{tmp_path / 'integration.db'}",
            connect_args={"check_same_thread": False, "timeout": 30},
        )

        @event.listens_for(engine, "connect")
        def sqlite_constraints(connection, _):
            connection.execute("PRAGMA foreign_keys=ON")
            connection.execute("PRAGMA busy_timeout=30000")

    try:
        yield engine
    finally:
        engine.dispose()
        if postgres:
            with admin.begin() as connection:
                connection.execute(text(f'DROP SCHEMA "{schema}" CASCADE'))
            admin.dispose()


@dataclass
class BackendAPI:
    engine: Engine
    db: Session
    session_factory: sessionmaker
    client: TestClient
    clients: list[TestClient] = field(default_factory=list)

    def new_client(self) -> TestClient:
        client = TestClient(app_main.app, base_url="http://testserver")
        self.clients.append(client)
        return client

    @staticmethod
    def csrf(client: TestClient) -> dict[str, str]:
        return {"X-CSRF-Token": client.cookies.get("e11_csrf", "")}

    def login(self, role: str = "owner") -> TestClient:
        client = self.new_client()
        email = role if "@" in role else f"{role}@e11.demo"
        result = client.post(
            "/api/v1/auth/login", json={"email": email, "password": settings.demo_password}
        )
        assert result.status_code == 200, result.text
        client.headers.update(self.csrf(client))
        return client


@pytest.fixture
def backend_api(isolated_engine: Engine, tmp_path: Path, monkeypatch) -> Iterator[BackendAPI]:
    monkeypatch.setattr(settings, "app_env", "development")
    monkeypatch.setattr(settings, "encryption_key", Fernet.generate_key().decode())
    monkeypatch.setattr(settings, "private_storage_path", tmp_path / "private-storage")
    migrate(isolated_engine)
    factory = sessionmaker(bind=isolated_engine, autoflush=False, expire_on_commit=False)
    monkeypatch.setattr(app_main, "SessionLocal", factory)
    monkeypatch.setattr(dependencies, "SessionLocal", factory)
    app_main._attempts.clear()
    with factory() as db:
        seed_demo(db)
        anonymous = TestClient(app_main.app, base_url="http://testserver")
        api = BackendAPI(isolated_engine, db, factory, anonymous, [anonymous])
        try:
            yield api
        finally:
            for client in api.clients:
                client.close()
            db.rollback()
            app_main._attempts.clear()
