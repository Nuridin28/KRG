"""FastAPI application entry point.

Сервис KRG AI Stylist — REST API для AI-стилиста, виртуальной примерки одежды
(Vertex VTO / FASHN), генерации видео-роликов (Google Veo), управления каталогом,
капсульного гардероба и подбора «образа дня».

Документация:
- Swagger UI:  /docs
- ReDoc:      /redoc
- OpenAPI:    /openapi.json
"""

from __future__ import annotations

from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles

from app.core.config import cleanup_gcp_sa_tempfile, settings
from app.core.database import Base, engine
from app.routers import (
    admin, auth, auth_b2c, catalog, daily_outfit, outfits, profile,
    saved_outfits, stylist_chat, tracking, tryon, video, wardrobe, wardrobe_b2c,
)


@asynccontextmanager
async def lifespan(app: FastAPI):
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        for col, coltype in [
            ("preferred_styles", "JSONB"),
            ("preferred_gender", "VARCHAR(20)"),
            ("city", "VARCHAR(100)"),
            ("tryon_count_today", "INTEGER DEFAULT 0"),
            ("tryon_count_date", "VARCHAR(10) DEFAULT ''"),
        ]:
            await conn.execute(
                __import__("sqlalchemy").text(
                    f"ALTER TABLE users ADD COLUMN IF NOT EXISTS {col} {coltype}"
                )
            )
    yield
    await engine.dispose()
    cleanup_gcp_sa_tempfile()


tags_metadata = [
    {
        "name": "Auth",
        "description": (
            "Регистрация, вход и получение текущего пользователя. "
            "Возвращает JWT-токен (Bearer), который нужно передавать в заголовке "
            "`Authorization: Bearer <token>` для всех защищённых эндпоинтов."
        ),
    },
    {
        "name": "Catalog",
        "description": (
            "Каталог товаров: листинг с фильтрами и пагинацией, получение карточки товара, "
            "справочники брендов / цветов / стилей / поводов."
        ),
    },
    {
        "name": "Outfits",
        "description": (
            "Генерация образов: из произвольных параметров, на базе одного товара "
            "(«достроить лук»), а также рекомендации похожих товаров."
        ),
    },
    {
        "name": "Saved Outfits",
        "description": "Сохранение и история образов пользователя; публичная ссылка для шаринга.",
    },
    {
        "name": "Virtual Try-On",
        "description": (
            "Виртуальная примерка одежды на пользователе. Поддерживает примерку отдельного товара "
            "и комплекта (outfit). Job-модель: создаёте задачу → опрашиваете её статус."
        ),
    },
    {
        "name": "Video Generation",
        "description": "Генерация motion-видео из изображения try-on (Google Veo).",
    },
    {
        "name": "AI Stylist Chat",
        "description": "Диалоговый AI-стилист (LLM) с подсказками-стартерами.",
    },
    {
        "name": "Profile",
        "description": (
            "Профиль пользователя: сохранённые фото для quick-tryon (до 3 шт.), "
            "предпочтения по стилю / полу / городу, быстрая примерка по сохранённому фото."
        ),
    },
    {
        "name": "Wardrobe",
        "description": (
            "Капсульный гардероб: добавление вещей вручную или из фото (GPT Vision), "
            "анализ капсулы, рекомендации по дополнению."
        ),
    },
    {
        "name": "Daily Outfit",
        "description": "«Образ дня» — лук, подобранный под погоду / предпочтения; ленивая генерация при первом запросе.",
    },
    {
        "name": "Tracking",
        "description": "Аналитические события (просмотры, клики, try-on) — пакетная отправка и выборка.",
    },
    {
        "name": "Admin",
        "description": (
            "Бэкофис. Все эндпоинты требуют роль `admin` "
            "(`Authorization: Bearer <admin token>`). Управление товарами, правилами рекомендаций, "
            "feature-флагами, пользователями, статистикой и эмбеддингами."
        ),
    },
    {
        "name": "Health",
        "description": "Liveness probe для оркестратора / балансировщика.",
    },
]


app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "## KRG — AI Stylist & Virtual Try-On API\n\n"
        "Backend для маркетплейса с AI-стилистом и виртуальной примеркой одежды.\n\n"
        "**Основные возможности**\n"
        "- 🛍️ Каталог товаров с фильтрами, пагинацией и эмбеддингами\n"
        "- 🤖 AI-стилист в чате (LLM) и генерация образов\n"
        "- 👗 Виртуальная примерка (Vertex Virtual Try-On / FASHN fallback)\n"
        "- 🎬 Генерация motion-видео из try-on (Google Veo)\n"
        "- 👤 Профиль, сохранённые фото и quick try-on\n"
        "- 🧥 Капсульный гардероб (анализ + рекомендации)\n"
        "- 🌤️ «Образ дня» с учётом погоды\n"
        "- 📊 Трекинг событий и админ-панель\n\n"
        "**Авторизация.** Большинство эндпоинтов требуют JWT — получите его через "
        "`POST /api/v1/auth/login` и передавайте в `Authorization: Bearer <token>`.\n\n"
        "**Базовый префикс API:** `/api/v1`"
    ),
    version="2.0.0",
    lifespan=lifespan,
    openapi_tags=tags_metadata,
    contact={
        "name": "KRG Engineering",
        "email": "support@krg.local",
    },
    license_info={
        "name": "Proprietary",
    },
    swagger_ui_parameters={
        "persistAuthorization": True,
        "displayRequestDuration": True,
        "filter": True,
        "tryItOutEnabled": True,
    },
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

storage_path = Path(settings.IMAGE_STORAGE_PATH)
storage_path.mkdir(parents=True, exist_ok=True)
app.mount("/storage", StaticFiles(directory=str(storage_path.parent)), name="storage")

# Public routes
app.include_router(auth.router, prefix=settings.API_V1_PREFIX)
app.include_router(auth_b2c.router, prefix=settings.API_V1_PREFIX)
app.include_router(wardrobe_b2c.router, prefix=settings.API_V1_PREFIX)
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


@app.get(
    "/health",
    tags=["Health"],
    summary="Health-check",
    description="Liveness-probe. Возвращает `200 OK`, если приложение запущено и принимает запросы.",
    response_description="Статус сервиса",
    responses={
        200: {
            "description": "Сервис работает",
            "content": {
                "application/json": {
                    "example": {"status": "ok", "service": "AI Stylist API"}
                }
            },
        }
    },
)
async def health() -> dict:
    return {"status": "ok", "service": settings.APP_NAME}
