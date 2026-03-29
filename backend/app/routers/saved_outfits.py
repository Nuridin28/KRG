"""Saved outfits -- share by link and outfit history."""

from __future__ import annotations

import uuid
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.db_models import SavedOutfit, User

router = APIRouter(prefix="/outfits", tags=["Saved Outfits"])


class OutfitItemPayload(BaseModel):
    product_id: str
    name: str
    brand: str
    category: str
    color_hex: str = ""
    color_name: str = ""
    price: float
    promo_price: float | None = None
    currency: str = "USD"
    image_url: str = ""
    role: str = ""


class SaveOutfitRequest(BaseModel):
    items: List[OutfitItemPayload]
    style: str = ""
    occasion: str = ""
    total_price: float = 0
    compatibility_score: float = 0
    explanation: str = ""
    badges: List[str] = []


class SavedOutfitResponse(BaseModel):
    id: str
    user_id: int | None
    items: list
    style: str
    occasion: str
    total_price: float
    compatibility_score: float
    explanation: str
    badges: list
    created_at: str

    class Config:
        from_attributes = True


@router.post("/save", response_model=SavedOutfitResponse, status_code=201)
async def save_outfit(
    body: SaveOutfitRequest,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    outfit_id = f"outfit-{uuid.uuid4().hex[:12]}"
    row = SavedOutfit(
        id=outfit_id,
        user_id=user.id,
        items_json=[item.model_dump() for item in body.items],
        style=body.style,
        occasion=body.occasion,
        total_price=body.total_price,
        compatibility_score=body.compatibility_score,
        explanation=body.explanation,
        badges=body.badges,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return _to_response(row)


@router.get("/history", response_model=List[SavedOutfitResponse])
async def get_outfit_history(
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
    limit: int = Query(20, ge=1, le=100),
):
    result = await db.execute(
        select(SavedOutfit)
        .where(SavedOutfit.user_id == user.id)
        .order_by(SavedOutfit.created_at.desc())
        .limit(limit)
    )
    return [_to_response(r) for r in result.scalars().all()]


@router.delete("/history/{outfit_id}")
async def delete_saved_outfit(
    outfit_id: str,
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(SavedOutfit).where(SavedOutfit.id == outfit_id, SavedOutfit.user_id == user.id)
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Outfit not found")
    await db.delete(row)
    await db.commit()
    return {"deleted": outfit_id}


# Public endpoint — share by link (no auth required)
@router.get("/shared/{outfit_id}", response_model=SavedOutfitResponse)
async def get_shared_outfit(
    outfit_id: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(select(SavedOutfit).where(SavedOutfit.id == outfit_id))
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Outfit not found")
    return _to_response(row)


def _to_response(row: SavedOutfit) -> SavedOutfitResponse:
    return SavedOutfitResponse(
        id=row.id,
        user_id=row.user_id,
        items=row.items_json,
        style=row.style,
        occasion=row.occasion,
        total_price=row.total_price,
        compatibility_score=row.compatibility_score,
        explanation=row.explanation,
        badges=row.badges,
        created_at=row.created_at.isoformat() if row.created_at else "",
    )
