"""Async SQLAlchemy engine and session factory."""

import os

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.core.config import settings


def _normalize_database_url(url: str) -> str:
    """Render/Heroku-style URLs use postgresql://; SQLAlchemy async needs postgresql+asyncpg://."""
    if url.startswith("postgresql+asyncpg://"):
        return url
    if url.startswith("postgresql://"):
        return "postgresql+asyncpg://" + url[len("postgresql://") :]
    if url.startswith("postgres://"):
        return "postgresql+asyncpg://" + url[len("postgres://") :]
    return url


def _database_url() -> str:
    return _normalize_database_url(settings.DATABASE_URL)


def _asyncpg_connect_args() -> dict:
    """Cloud Postgres (e.g. Render) requires TLS; asyncpg needs explicit ssl=True."""
    url = _database_url()
    if os.environ.get("DATABASE_SSL", "").lower() in ("0", "false", "no"):
        return {}
    if os.environ.get("DATABASE_SSL", "").lower() in ("1", "true", "require"):
        return {"ssl": True}
    if "sslmode=require" in url or "ssl=true" in url.lower():
        return {"ssl": True}
    # Render-managed Postgres requires SSL; do not infer SSL for other hosts (e.g. Docker hostname `db`).
    if os.environ.get("RENDER"):
        return {"ssl": True}
    return {}


engine = create_async_engine(
    _database_url(),
    echo=settings.DEBUG,
    connect_args=_asyncpg_connect_args(),
)
async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with async_session() as session:
        yield session
