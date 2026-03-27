"""Application configuration using pydantic-settings."""

from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Central configuration loaded from environment variables / .env file."""

    APP_NAME: str = "AI Stylist API"
    DEBUG: bool = True
    API_V1_PREFIX: str = "/api/v1"

    # External API keys (loaded from env)
    OPENAI_API_KEY: str = ""
    VERTEX_AI_PROJECT: str = ""
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

    CORS_ORIGINS: List[str] = ["http://localhost:5173", "http://localhost:3000"]

    class Config:
        env_file = ".env"
        extra = "ignore"


settings = Settings()
