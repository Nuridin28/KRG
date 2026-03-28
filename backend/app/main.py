"""FastAPI application entry point."""

from __future__ import annotations

from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import settings
from app.routers import admin, catalog, outfits, stylist_chat, tracking, tryon

app = FastAPI(
    title=settings.APP_NAME,
    description="AI Stylist & Virtual Try-On -- Fashion Marketplace API",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Serve generated try-on images
storage_path = Path(settings.IMAGE_STORAGE_PATH)
storage_path.mkdir(parents=True, exist_ok=True)
app.mount("/storage", StaticFiles(directory=str(storage_path.parent)), name="storage")

app.include_router(catalog.router, prefix=settings.API_V1_PREFIX)
app.include_router(outfits.router, prefix=settings.API_V1_PREFIX)
app.include_router(tryon.router, prefix=settings.API_V1_PREFIX)
app.include_router(stylist_chat.router, prefix=settings.API_V1_PREFIX)
app.include_router(admin.router, prefix=settings.API_V1_PREFIX)
app.include_router(tracking.router, prefix=settings.API_V1_PREFIX)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok", "service": settings.APP_NAME}
