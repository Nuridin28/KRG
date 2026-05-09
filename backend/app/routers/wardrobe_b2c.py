"""Lightweight wardrobe + outfits endpoints for the B2C try-on app."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.db_models import SavedOutfit, User, WardrobeItem
from app.models.schemas import TryOnJobResponse
from app.routers.tryon import DAILY_QUOTA, tryon_service

router = APIRouter(prefix="/b2c/wardrobe", tags=["B2C Wardrobe"])

ALLOWED_CATEGORIES = {"tops", "bottoms", "dresses", "outerwear", "shoes", "accessories"}


class SaveItemBody(BaseModel):
    image_url: str = Field(min_length=1)
    name: str = ""
    category: str = "tops"


class WardrobeItemOut(BaseModel):
    id: int
    image_url: str
    name: str
    category: str
    created_at: str


class CreateOutfitBody(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    item_ids: List[int] = Field(min_length=1)


class OutfitItemOut(BaseModel):
    id: int
    image_url: str
    name: str
    category: str


class OutfitOut(BaseModel):
    id: str
    name: str
    items: List[OutfitItemOut]
    created_at: str


def _normalize_category(c: str) -> str:
    c = (c or "").lower().strip()
    return c if c in ALLOWED_CATEGORIES else "tops"


@router.post("/items", response_model=WardrobeItemOut, summary="Сохранить вещь в гардероб")
async def save_item(
    body: SaveItemBody,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> WardrobeItemOut:
    item = WardrobeItem(
        user_id=user.id,
        category=_normalize_category(body.category),
        name=body.name.strip(),
        image_url=body.image_url.strip(),
        style_tags=[],
    )
    db.add(item)
    await db.commit()
    await db.refresh(item)
    return WardrobeItemOut(
        id=item.id,
        image_url=item.image_url,
        name=item.name,
        category=item.category,
        created_at=item.created_at.isoformat(),
    )


@router.get("/items", response_model=List[WardrobeItemOut], summary="Гардероб пользователя")
async def list_items(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[WardrobeItemOut]:
    res = await db.execute(
        select(WardrobeItem)
        .where(WardrobeItem.user_id == user.id)
        .order_by(WardrobeItem.created_at.desc())
    )
    return [
        WardrobeItemOut(
            id=it.id,
            image_url=it.image_url,
            name=it.name,
            category=it.category,
            created_at=it.created_at.isoformat(),
        )
        for it in res.scalars().all()
    ]


@router.delete("/items/{item_id}", summary="Удалить вещь")
async def delete_item(
    item_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(WardrobeItem).where(
            WardrobeItem.id == item_id, WardrobeItem.user_id == user.id
        )
    )
    item = res.scalar_one_or_none()
    if not item:
        raise HTTPException(404, "Item not found")
    await db.delete(item)
    await db.commit()
    return {"deleted": item_id}


@router.post("/outfits", response_model=OutfitOut, summary="Создать образ из выбранных вещей")
async def create_outfit(
    body: CreateOutfitBody,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> OutfitOut:
    res = await db.execute(
        select(WardrobeItem).where(
            WardrobeItem.user_id == user.id,
            WardrobeItem.id.in_(body.item_ids),
        )
    )
    items = res.scalars().all()
    if not items:
        raise HTTPException(400, "No matching wardrobe items")

    items_payload = [
        {
            "id": it.id,
            "image_url": it.image_url,
            "name": it.name,
            "category": it.category,
        }
        for it in items
    ]

    outfit = SavedOutfit(
        id=f"b2c-out-{uuid.uuid4().hex[:12]}",
        user_id=user.id,
        items_json=items_payload,
        explanation=body.name.strip(),
    )
    db.add(outfit)
    await db.commit()
    await db.refresh(outfit)

    return OutfitOut(
        id=outfit.id,
        name=outfit.explanation,
        items=[OutfitItemOut(**i) for i in items_payload],
        created_at=outfit.created_at.isoformat(),
    )


@router.get("/outfits", response_model=List[OutfitOut], summary="Сохранённые образы")
async def list_outfits(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> List[OutfitOut]:
    res = await db.execute(
        select(SavedOutfit)
        .where(SavedOutfit.user_id == user.id)
        .order_by(SavedOutfit.created_at.desc())
    )
    out: List[OutfitOut] = []
    for o in res.scalars().all():
        items_raw = o.items_json or []
        items = [
            OutfitItemOut(
                id=int(i.get("id", 0)),
                image_url=str(i.get("image_url", "")),
                name=str(i.get("name", "")),
                category=str(i.get("category", "tops")),
            )
            for i in items_raw
            if isinstance(i, dict)
        ]
        out.append(
            OutfitOut(
                id=o.id,
                name=o.explanation or "",
                items=items,
                created_at=o.created_at.isoformat(),
            )
        )
    return out


@router.post(
    "/outfits/{outfit_id}/tryon",
    response_model=TryOnJobResponse,
    summary="Примерить сохранённый образ",
    description=(
        "Берёт все вещи из образа и запускает мульти-VTO. Учитывается дневной "
        "лимит зарегистрированного пользователя."
    ),
)
async def tryon_outfit(
    outfit_id: str,
    person_image: UploadFile = File(..., description="Фото пользователя"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
) -> TryOnJobResponse:
    today = datetime.now(timezone.utc).date().isoformat()
    if user.tryon_count_date != today:
        user.tryon_count_today = 0
        user.tryon_count_date = today
    if user.tryon_count_today >= DAILY_QUOTA:
        raise HTTPException(
            429,
            f"Дневной лимит исчерпан ({DAILY_QUOTA}/день). Возвращайтесь завтра.",
        )

    res = await db.execute(
        select(SavedOutfit).where(
            SavedOutfit.id == outfit_id, SavedOutfit.user_id == user.id
        )
    )
    outfit = res.scalar_one_or_none()
    if not outfit:
        raise HTTPException(404, "Outfit not found")

    items_raw = outfit.items_json or []
    product_items: List[dict] = []
    for it in items_raw:
        if not isinstance(it, dict):
            continue
        image_url = str(it.get("image_url") or "").strip()
        if not image_url:
            continue
        product_items.append({
            "product_id": f"wardrobe-{it.get('id')}",
            "product_name": str(it.get("name") or ""),
            "product_image_url": image_url,
            "category": str(it.get("category") or "tops"),
            "subcategory": "",
            "fit": "regular",
            "description": "",
            "style_tags": [],
        })

    if not product_items:
        raise HTTPException(400, "Outfit has no items with images")

    person_bytes = await person_image.read()
    if not person_bytes:
        raise HTTPException(400, "Empty person image")

    user.tryon_count_today += 1
    await db.commit()

    return await tryon_service.create_outfit_job(
        person_image_bytes=person_bytes,
        product_items=product_items,
    )


@router.delete("/outfits/{outfit_id}", summary="Удалить образ")
async def delete_outfit(
    outfit_id: str,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    res = await db.execute(
        select(SavedOutfit).where(
            SavedOutfit.id == outfit_id, SavedOutfit.user_id == user.id
        )
    )
    outfit = res.scalar_one_or_none()
    if not outfit:
        raise HTTPException(404, "Outfit not found")
    await db.delete(outfit)
    await db.commit()
    return {"deleted": outfit_id}
