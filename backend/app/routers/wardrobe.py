"""Wardrobe & capsule analysis endpoints."""

from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.database import get_db
from app.models.db_models import User
from app.models.schemas import CapsuleAnalysisResponse, WardrobeItemCreate, WardrobeItemResponse
from app.services.capsule_service import CapsuleService

router = APIRouter(prefix="/wardrobe", tags=["Wardrobe"])


@router.get(
    "/items",
    response_model=List[WardrobeItemResponse],
    summary="Список вещей в гардеробе",
    description="Возвращает все вещи капсульного гардероба текущего пользователя.",
    responses={401: {"description": "Требуется авторизация"}},
)
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


@router.post(
    "/upload",
    response_model=WardrobeItemResponse,
    summary="Добавить вещь по фото (GPT Vision)",
    description=(
        "Принимает фото одежды и автоматически распознаёт её через GPT Vision: "
        "категория, цвет, стиль. Распознанная вещь добавляется в гардероб.\n\n"
        "**Ограничения:** размер файла 1 КБ – 10 МБ."
    ),
    responses={
        200: {"description": "Вещь добавлена"},
        400: {"description": "Файл слишком маленький / слишком большой"},
        401: {"description": "Требуется авторизация"},
    },
)
async def upload_clothing_photo(
    photo: UploadFile = File(..., description="JPEG/PNG фото одежды"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    content = await photo.read()
    if len(content) < 1000:
        raise HTTPException(400, "Файл слишком маленький")
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(400, "Файл слишком большой (макс. 10 МБ)")

    svc = CapsuleService(db)
    item = await svc.add_item_from_photo(user.id, content, photo.filename or "photo.jpg")

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


@router.post(
    "/items",
    response_model=WardrobeItemResponse,
    summary="Добавить вещь вручную",
    description=(
        "Добавляет вещь в гардероб по структурированным данным (можно указать `product_id` "
        "из каталога — тогда метаданные подтянутся автоматически)."
    ),
    responses={401: {"description": "Требуется авторизация"}},
)
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


@router.delete(
    "/items/{item_id}",
    summary="Удалить вещь из гардероба",
    description="Удаляет указанную вещь из капсулы пользователя.",
    responses={
        200: {"description": "Вещь удалена"},
        401: {"description": "Требуется авторизация"},
        404: {"description": "Вещь не найдена"},
    },
)
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


@router.post(
    "/analyze",
    response_model=CapsuleAnalysisResponse,
    summary="Анализ капсульного гардероба",
    description=(
        "Анализирует имеющуюся капсулу: сколько образов можно собрать, какие категории не хватает, "
        "что докупить для расширения возможностей. Использует пол из предпочтений пользователя "
        "(`preferred_gender`, по умолчанию `female`)."
    ),
    responses={401: {"description": "Требуется авторизация"}},
)
async def analyze_capsule(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    svc = CapsuleService(db)
    gender = user.preferred_gender or "female"
    return await svc.analyze(user.id, gender)
