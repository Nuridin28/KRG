"""FastAPI application entry point."""

from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.core.database import Base, engine
from app.routers import (
    admin, auth, catalog, daily_outfit, outfits, profile,
    saved_outfits, stylist_chat, tracking, tryon, video, wardrobe,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Create tables on startup
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        # Add new columns to existing tables (safe: IF NOT EXISTS)
        for col, coltype in [
            ("preferred_styles", "JSONB"),
            ("preferred_gender", "VARCHAR(20)"),
            ("city", "VARCHAR(100)"),
        ]:
            await conn.execute(
                __import__("sqlalchemy").text(
                    f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {col} {coltype}"
                )
            )
    yield
    await engine.dispose()


app = FastAPI(
    title=settings.APP_NAME,
    description="AI Stylist & Virtual Try-On -- Fashion Marketplace API",
    version="2.0.0",
    lifespan=lifespan,
)

_cors: dict = {
    "allow_origins": settings.CORS_ORIGINS,
    "allow_credentials": True,
    "allow_methods": ["*"],
    "allow_headers": ["*"],
}
if settings.CORS_ORIGIN_REGEX:
    _cors["allow_origin_regex"] = settings.CORS_ORIGIN_REGEX
app.add_middleware(CORSMiddleware, **_cors)

# Serve generated try-on images
storage_path = Path(settings.IMAGE_STORAGE_PATH)
storage_path.mkdir(parents=True, exist_ok=True)
app.mount("/storage", StaticFiles(directory=str(storage_path.parent)), name="storage")

# Public routes
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(catalog.router, prefix=settings.API_V1_PREFIX)
app.include_router(outfits.router, prefix=settings.API_V1_PREFIX)
app.include_router(tryon.router, prefix=settings.API_V1_PREFIX)
app.include_router(stylist_chat.router, prefix=settings.API_V1_PREFIX)
app.include_router(tracking.router, prefix=settings.API_V1_PREFIX)
app.include_router(saved_outfits.router, prefix=settings.API_V1_PREFIX)
app.include_router(profile.router, prefix=settings.API_V1_PREFIX)
app.include_router(wardrobe.router, prefix=settings.API_V1_PREFIX)
app.include_router(daily_outfit.router, prefix=settings.API_V1_PREFIX)
app.include_router(video.router, prefix=settings.API_V1_PREFIX)

# Admin routes (protected by admin role dependency inside the router)
app.include_router(admin.router, prefix=settings.API_V1_PREFIX)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": settings.APP_NAME}
