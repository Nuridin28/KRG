"""Application configuration using pydantic-settings."""

import json
from typing import Any, List, Union

from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Central configuration loaded from environment variables / .env file."""

    APP_NAME: str = "AI Stylist API"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

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
    VERTEX_AI_PROJECT: str = "krghack"
    VERTEX_AI_LOCATION: str = "us-central1"
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

    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:5174", "http://localhost:3000"]

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
