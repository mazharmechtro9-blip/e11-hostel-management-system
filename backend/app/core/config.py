from pathlib import Path
from functools import lru_cache
from urllib.parse import urlsplit, urlunsplit
from typing import Literal

from cryptography.fernet import Fernet
from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=("../.env", ".env"), extra="ignore")

    app_env: Literal["development", "test", "production"] = "development"
    database_url: str = "sqlite:///./e11-development.db"
    frontend_url: str = "http://localhost:3000"
    private_storage_path: Path = Path("./private-storage")
    session_hours: int = 12
    session_cookie_secure: bool = False
    demo_password: str = "E11Demo!2026"
    encryption_key: str = ""
    allowed_hosts: str = "localhost,127.0.0.1,testserver,backend"

    @model_validator(mode="after")
    def validate_production_configuration(self):
        if self.production:
            if not self.database_url.startswith("postgresql"):
                raise ValueError("Production requires PostgreSQL")
            if not self.encryption_key:
                raise ValueError("Production requires ENCRYPTION_KEY for MFA encryption")
            try:
                Fernet(self.encryption_key.encode())
            except (ValueError, TypeError) as exc:
                raise ValueError("ENCRYPTION_KEY must be a valid Fernet key") from exc
            if urlsplit(self.frontend_url).scheme != "https":
                raise ValueError("Production FRONTEND_URL must use HTTPS")
        return self

    @property
    def production(self) -> bool:
        return self.app_env == "production"

    @property
    def allowed_origins(self) -> list[str]:
        origins = {self.frontend_url.rstrip("/")}
        parsed = urlsplit(self.frontend_url)
        if not self.production and parsed.hostname in {"localhost", "127.0.0.1"}:
            for hostname in ("localhost", "127.0.0.1"):
                netloc = hostname + (f":{parsed.port}" if parsed.port else "")
                origins.add(urlunsplit((parsed.scheme, netloc, "", "", "")))
        return sorted(origins)


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
