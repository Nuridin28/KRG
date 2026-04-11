"""Async SQLAlchemy engine and session factory."""

import os
import ssl

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


def _asyncpg_ssl_arg():
    """asyncpg + TLS: ssl=True verifies certs; Render PG often fails verify (self-signed chain).

    Set DATABASE_SSL_VERIFY=1 for strict verification (default CA bundle).
    """
    if os.environ.get("DATABASE_SSL_VERIFY", "").lower() in ("1", "true", "yes"):
        return True
    ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
    ctx.minimum_version = ssl.TLSVersion.TLSv1_2
    ctx.check_hostname = False
    ctx.verify_mode = ssl.CERT_NONE
    return ctx


def _asyncpg_connect_args() -> dict:
    """Cloud Postgres (e.g. Render) requires TLS."""
    url = _database_url()
    if os.environ.get("DATABASE_SSL", "").lower() in ("0", "false", "no"):
        return {}
    if os.environ.get("DATABASE_SSL", "").lower() in ("1", "true", "require"):
        return {"ssl": _asyncpg_ssl_arg()}
    if "sslmode=require" in url or "ssl=true" in url.lower():
        return {"ssl": _asyncpg_ssl_arg()}
    # Render-managed Postgres requires SSL; do not infer SSL for other hosts (e.g. Docker hostname `db`).
    if os.environ.get("RENDER"):
        return {"ssl": _asyncpg_ssl_arg()}
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
