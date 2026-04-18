"""Application configuration using pydantic-settings."""

import json
import logging
import os
import tempfile
from pathlib import Path
from typing import Any, List, Optional, Union

from dotenv import load_dotenv
from pydantic import field_validator
from pydantic_settings import BaseSettings

# Expose all .env keys to os.environ (Google client libs read GOOGLE_* vars directly).
_env_path = Path(__file__).resolve().parents[2] / ".env"
load_dotenv(_env_path)


class Settings(BaseSettings):
    """Central configuration loaded from environment variables / .env file."""

    APP_NAME: str = "AI Stylist API"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # Public URL of this API (no trailing slash). Used for absolute /storage/... links returned to clients.
    # On Render: https://your-service.onrender.com
    PUBLIC_BASE_URL: str = "http://localhost:8000"

    # Database (async SQLAlchemy needs postgresql+asyncpg://; Render's UI gives postgresql:// — we normalize)
    DATABASE_URL: str = "postgresql+asyncpg://nuridinnurman@localhost:5432/krg_stylist"

    @field_validator("DATABASE_URL", mode="before")
    @classmethod
    def normalize_database_url_for_asyncpg(cls, v: Any) -> Any:
        if not isinstance(v, str):
            return v
        if v.startswith("postgresql+asyncpg://"):
            return v
        if v.startswith("postgresql://"):
            return "postgresql+asyncpg://" + v[len("postgresql://") :]
        if v.startswith("postgres://"):
            return "postgresql+asyncpg://" + v[len("postgres://") :]
        return v

    # JWT Auth
    SECRET_KEY: str = "change-me-in-production-use-openssl-rand-hex-32"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60
    ALGORITHM: str = "HS256"

    # External API keys (loaded from env)
    OPENAI_API_KEY: str = ""
    # Empty = try-on / Veo use mock paths (no GCP). Set project + credentials for real Vertex VTO.
    VERTEX_AI_PROJECT: str = ""
    VERTEX_AI_LOCATION: str = "us-central1"
    # Path to service account JSON (optional). Copied into os.environ so google.auth sees it when set only in .env.
    GOOGLE_APPLICATION_CREDENTIALS: str = ""
    # Full JSON of GCP service account key (Render: add as Secret). See _materialize_gcp_sa_json below.
    GCP_SERVICE_ACCOUNT_JSON: str = ""
    MAPP_FASHION_API_KEY: str = ""
    MAPP_FASHION_BASE_URL: str = ""
    FASHN_API_KEY: str = ""
    FASHN_BASE_URL: str = "https://api.fashn.ai/v1"

    # Redis (optional for caching)
    REDIS_URL: str = ""

    # Image storage
    IMAGE_STORAGE_PATH: str = "./storage/images"
    IMAGE_RETENTION_HOURS: int = 24

    # Rate limits
    TRYON_RATE_LIMIT_PER_USER: int = 20
    TRYON_RATE_LIMIT_WINDOW_MINUTES: int = 60

    # Business rules
    BUDGET_TOLERANCE_PERCENT: float = 5.0
    MAX_OUTFITS_PER_REQUEST: int = 10
    DEFAULT_OUTFITS_COUNT: int = 3

    # Weather API (Feature 3: style of the day)
    OPENWEATHER_API_KEY: str = ""

    # Include 127.0.0.1 and localhost — browsers treat them as different origins for CORS.
    CORS_ORIGINS: List[str] = [
        "http://localhost:5173",
        "http://localhost:5174",
        "http://localhost:3000",
        "http://127.0.0.1:5173",
        "http://127.0.0.1:5174",
        "http://127.0.0.1:3000",
    ]

    # Extra allowed Origin header (browser). Matches any *.vercel.app HTTPS URL so preview deploys work.
    # Set to empty string in env to disable. Custom domains must still be listed in CORS_ORIGINS.
    CORS_ORIGIN_REGEX: Optional[str] = r"https://.*\.vercel\.app"

    @field_validator("CORS_ORIGIN_REGEX", mode="before")
    @classmethod
    def empty_cors_regex_to_none(cls, v: Any) -> Any:
        if v == "":
            return None
        return v

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: Any) -> Union[List[str], Any]:
        if v is None or isinstance(v, list):
            return v
        if isinstance(v, str):
            s = v.strip()
            if s.startswith("["):
                return json.loads(s)
            return [x.strip() for x in s.split(",") if x.strip()]
        return v

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()

# Pydantic loads .env into Settings fields only; google.auth reads os.environ — bridge path from .env.
_gac_setting = (settings.GOOGLE_APPLICATION_CREDENTIALS or "").strip()
if _gac_setting and not os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
    os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = _gac_setting

# Temp file path if we created it from GCP_SERVICE_ACCOUNT_JSON (removed on app shutdown).
_gcp_sa_tempfile: Optional[str] = None


def _materialize_gcp_sa_json() -> None:
    """So google.auth.default() and google-genai work before any router import uses them."""
    global _gcp_sa_tempfile
    log = logging.getLogger(__name__)
    raw = (settings.GCP_SERVICE_ACCOUNT_JSON or "").strip()
    if not raw or os.environ.get("GOOGLE_APPLICATION_CREDENTIALS"):
        return
    try:
        info = json.loads(raw)
        if not isinstance(info, dict) or info.get("type") != "service_account":
            log.warning("GCP_SERVICE_ACCOUNT_JSON must be a service_account key JSON")
            return
        fd, path = tempfile.mkstemp(suffix=".json", text=True)
        with os.fdopen(fd, "w", encoding="utf-8") as fh:
            json.dump(info, fh)
        os.environ["GOOGLE_APPLICATION_CREDENTIALS"] = path
        _gcp_sa_tempfile = path
        log.info("GOOGLE_APPLICATION_CREDENTIALS set from GCP_SERVICE_ACCOUNT_JSON")
    except json.JSONDecodeError as e:
        log.warning("GCP_SERVICE_ACCOUNT_JSON is not valid JSON: %s", e)
    except OSError as e:
        log.warning("Could not write GCP service account temp file: %s", e)


def cleanup_gcp_sa_tempfile() -> None:
    global _gcp_sa_tempfile
    p = _gcp_sa_tempfile
    _gcp_sa_tempfile = None
    if p:
        try:
            os.unlink(p)
        except OSError:
            pass


_materialize_gcp_sa_json()


def log_gcp_application_credentials_status() -> None:
    """One-line diagnostics for Vertex/ADC (no secret values logged)."""
    log = logging.getLogger(__name__)
    gac = (os.environ.get("GOOGLE_APPLICATION_CREDENTIALS") or "").strip()
    json_configured = bool((settings.GCP_SERVICE_ACCOUNT_JSON or "").strip())

    if not gac:
        if json_configured:
            log.warning(
                "GOOGLE_APPLICATION_CREDENTIALS is unset but GCP_SERVICE_ACCOUNT_JSON is set — "
                "JSON was not applied (invalid JSON, wrong type, or error writing temp file). "
                "Vertex will rely on other ADC sources if any."
            )
        else:
            log.info(
                "GOOGLE_APPLICATION_CREDENTIALS not set — using Application Default Credentials only "
                "(e.g. `gcloud auth application-default login`, or attach a service account on GCE/Cloud Run)."
            )
        return

    exists = os.path.isfile(gac)
    base = os.path.basename(gac)
    if _gcp_sa_tempfile and os.path.abspath(gac) == os.path.abspath(_gcp_sa_tempfile):
        source = "from GCP_SERVICE_ACCOUNT_JSON (temp file)"
    else:
        source = "from environment GOOGLE_APPLICATION_CREDENTIALS"

    if exists:
        log.info("GCP credentials file OK (%s): %s", source, base)
    else:
        log.warning(
            "GOOGLE_APPLICATION_CREDENTIALS is set but file is missing or not a file (%s): %s",
            source,
            base,
        )


log_gcp_application_credentials_status()
