"""Wardrobe & capsule analysis endpoints."""

from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.db_models import User
from app.models.schemas import CapsuleAnalysisResponse, WardrobeItemCreate, WardrobeItemResponse
from app.services.capsule_service import CapsuleService

router = APIRouter(prefix="/wardrobe", tags=["Wardrobe"])


@router.get("/items", response_model=List[WardrobeItemResponse])
async def list_wardrobe(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = CapsuleService(db)
    items = await svc.get_wardrobe(user.id)
    return [
        WardrobeItemResponse(
            id=it.id,
            product_id=it.product_id,
            category=it.category,
            name=it.name,
            color_name=it.color_name,
            color_hex=it.color_hex,
            image_url=it.image_url,
            style_tags=it.style_tags or [],
            created_at=it.created_at,
        )
        for it in items
    ]


@router.post("/items", response_model=WardrobeItemResponse)
async def add_wardrobe_item(
    data: WardrobeItemCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = CapsuleService(db)
    item = await svc.add_item(
        user_id=user.id,
        product_id=data.product_id,
        category=data.category or "tops",
        name=data.name or "",
        color_name=data.color_name or "",
        color_hex=data.color_hex or "",
        style_tags=data.style_tags,
    )
    return WardrobeItemResponse(
        id=item.id,
        product_id=item.product_id,
        category=item.category,
        name=item.name,
        color_name=item.color_name,
        color_hex=item.color_hex,
        image_url=item.image_url,
        style_tags=item.style_tags or [],
        created_at=item.created_at,
    )


@router.delete("/items/{item_id}")
async def remove_wardrobe_item(
    item_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = CapsuleService(db)
    ok = await svc.remove_item(user.id, item_id)
    if not ok:
        raise HTTPException(404, "Вещь не найдена в гардеробе")
    return {"deleted": item_id}


@router.post("/analyze", response_model=CapsuleAnalysisResponse)
async def analyze_capsule(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = CapsuleService(db)
    gender = user.preferred_gender or "female"
    return await svc.analyze(user.id, gender)
