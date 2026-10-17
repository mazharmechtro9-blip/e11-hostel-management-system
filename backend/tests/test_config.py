from cryptography.fernet import Fernet
from pydantic import ValidationError
import pytest

from app.core.config import Settings


def test_production_requires_postgres_https_and_encrypted_mfa_key():
    values = {
        "app_env": "production",
        "database_url": "postgresql+psycopg://hostel@db/e11",
        "frontend_url": "https://hostel.example",
        "encryption_key": Fernet.generate_key().decode(),
    }
    assert Settings(_env_file=None, **values).production
    for override in (
        {"database_url": "sqlite:///unsafe.db"},
        {"encryption_key": ""},
        {"encryption_key": "invalid"},
        {"frontend_url": "http://hostel.example"},
    ):
        with pytest.raises(ValidationError):
            Settings(_env_file=None, **(values | override))


def test_development_origin_aliases_never_extend_production_origins():
    assert set(Settings(_env_file=None, frontend_url="http://localhost:3000").allowed_origins) == {
        "http://localhost:3000",
        "http://127.0.0.1:3000",
    }
    production = Settings(
        _env_file=None,
        app_env="production",
        database_url="postgresql://db/e11",
        frontend_url="https://hostel.example",
        encryption_key=Fernet.generate_key().decode(),
    )
    assert production.allowed_origins == ["https://hostel.example"]
