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


@router.get("", response_model=DailyOutfitResponse)
async def get_daily_outfit(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Get today's outfit. Generates on-the-fly if not yet created."""
    svc = DailyOutfitService(db)
    result = await svc.get_today(user.id)
    if result:
        return result

    # Lazy generation
    result = await svc.generate_for_user(user)
    if not result:
        raise HTTPException(404, "Не удалось сгенерировать образ дня. Попробуйте позже.")
    return result


@router.post("/regenerate", response_model=DailyOutfitResponse)
async def regenerate_daily_outfit(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """Force regenerate today's outfit."""
    svc = DailyOutfitService(db)
    result = await svc.generate_for_user(user)
    if not result:
        raise HTTPException(500, "Не удалось сгенерировать образ дня.")
    return result


@router.post("/generate-all")
async def generate_all(
    admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db),
):
    """Admin: generate daily outfits for all users with preferences."""
    svc = DailyOutfitService(db)
    count = await svc.generate_for_all()
    return {"generated": count}
