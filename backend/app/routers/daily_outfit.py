"""Daily outfit (Style of the Day) endpoints."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_admin_user, get_current_user
from app.core.database import get_db
from app.models.db_models import User
from app.models.schemas import DailyOutfitResponse
from app.services.daily_outfit_service import DailyOutfitService

router = APIRouter(prefix="/daily-outfit", tags=["Daily Outfit"])


@router.get(
    "",
    response_model=DailyOutfitResponse,
    summary="Получить «образ дня»",
    description=(
        "Возвращает сегодняшний персональный образ пользователя. Если он ещё не сгенерирован "
        "(первый запрос за день) — генерирует на лету с учётом погоды и предпочтений.\n\n"
        "Подбор учитывает: `preferred_styles`, `preferred_gender`, `city` (для погоды через OpenWeather)."
    ),
    responses={
        200: {"description": "Образ дня получен"},
        401: {"description": "Требуется авторизация"},
        404: {"description": "Не удалось сгенерировать образ дня"},
    },
)
async def get_daily_outfit(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = DailyOutfitService(db)
    result = await svc.get_today(user.id)
    if result:
        return result

    result = await svc.generate_for_user(user)
    if not result:
        raise HTTPException(404, "Не удалось сгенерировать образ дня. Попробуйте позже.")
    return result


@router.post(
    "/regenerate",
    response_model=DailyOutfitResponse,
    summary="Перегенерировать образ дня",
    description="Принудительно пересоздаёт сегодняшний образ дня (например, по кнопке «Не нравится — другой»).",
    responses={
        200: {"description": "Образ перегенерирован"},
        401: {"description": "Требуется авторизация"},
        500: {"description": "Не удалось сгенерировать образ"},
    },
)
async def regenerate_daily_outfit(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = DailyOutfitService(db)
    result = await svc.generate_for_user(user)
    if not result:
        raise HTTPException(500, "Не удалось сгенерировать образ дня.")
    return result


@router.post(
    "/generate-all",
    summary="[Admin] Сгенерировать образ дня для всех пользователей",
    description=(
        "Запускает массовую генерацию «образа дня» для всех пользователей с заполненными предпочтениями. "
        "Используется по cron-расписанию (например, утром в 6:00 локального времени). "
        "Требует роль `admin`."
    ),
    responses={
        200: {"description": "Сгенерировано N образов"},
        401: {"description": "Требуется авторизация"},
        403: {"description": "Требуется роль admin"},
    },
)
async def generate_all(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    svc = DailyOutfitService(db)
    count = await svc.generate_for_all()
    return {"generated": count}
