"""Profile endpoints: saved photos, preferences, quick try-on."""

from __future__ import annotations

import uuid
from pathlib import Path
from typing import List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.models.db_models import User, UserPhoto
from app.models.schemas import (
    QuickTryOnRequest,
    TryOnJobResponse,
    UserPhotoResponse,
    UserPreferencesResponse,
    UserPreferencesUpdate,
)
from app.services.catalog_service import CatalogService
from app.services.tryon_service import TryOnService

router = APIRouter(prefix="/profile", tags=["Profile"])

IMAGE_DIR = Path(settings.IMAGE_STORAGE_PATH)
MAX_PHOTOS = 3

tryon_service = TryOnService()


# ---------------------------------------------------------------------------
# Photo management
# ---------------------------------------------------------------------------

@router.post(
    "/photos",
    response_model=UserPhotoResponse,
    summary="Загрузить фото пользователя",
    description=(
        "Сохраняет фото пользователя для последующих quick try-on.\n\n"
        f"**Ограничения:** макс. {MAX_PHOTOS} фото на пользователя, размер 1 КБ – 10 МБ. "
        "Первое загруженное фото автоматически становится `default`."
    ),
    responses={
        200: {"description": "Фото загружено"},
        400: {"description": "Превышен лимит, файл слишком маленький или слишком большой"},
        401: {"description": "Требуется авторизация"},
    },
)
async def upload_photo(
    photo: UploadFile = File(..., description="JPEG/PNG фото пользователя"),
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserPhoto).where(UserPhoto.user_id == user.id)
    )
    existing = result.scalars().all()
    if len(existing) >= MAX_PHOTOS:
        raise HTTPException(400, f"Максимум {MAX_PHOTOS} фото. Удалите старое перед загрузкой.")

    content = await photo.read()
    if len(content) < 1000:
        raise HTTPException(400, "Файл слишком маленький")
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(400, "Файл слишком большой (макс. 10 МБ)")

    user_dir = IMAGE_DIR / "users" / str(user.id)
    user_dir.mkdir(parents=True, exist_ok=True)
    filename = f"{uuid.uuid4().hex[:12]}.jpg"
    filepath = user_dir / filename
    filepath.write_bytes(content)

    is_default = len(existing) == 0

    row = UserPhoto(
        user_id=user.id,
        image_path=f"users/{user.id}/{filename}",
        is_default=is_default,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)

    return UserPhotoResponse(
        id=row.id,
        image_url=f"/storage/images/{row.image_path}",
        is_default=row.is_default,
        created_at=row.created_at,
    )


@router.get(
    "/photos",
    response_model=List[UserPhotoResponse],
    summary="Список фото пользователя",
    description="Возвращает все сохранённые фото текущего пользователя.",
    responses={401: {"description": "Требуется авторизация"}},
)
async def list_photos(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserPhoto)
        .where(UserPhoto.user_id == user.id)
        .order_by(UserPhoto.created_at)
    )
    rows = result.scalars().all()
    return [
        UserPhotoResponse(
            id=r.id,
            image_url=f"/storage/images/{r.image_path}",
            is_default=r.is_default,
            created_at=r.created_at,
        )
        for r in rows
    ]


@router.delete(
    "/photos/{photo_id}",
    summary="Удалить фото",
    description=(
        "Удаляет фото пользователя (и файл с диска). "
        "Если удалённое фото было `default`, любое из оставшихся автоматически становится дефолтным."
    ),
    responses={
        200: {"description": "Фото удалено"},
        401: {"description": "Требуется авторизация"},
        404: {"description": "Фото не найдено"},
    },
)
async def delete_photo(
    photo_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(UserPhoto).where(UserPhoto.id == photo_id, UserPhoto.user_id == user.id)
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Фото не найдено")

    filepath = IMAGE_DIR / row.image_path
    if filepath.exists():
        filepath.unlink()

    was_default = row.is_default
    await db.delete(row)
    await db.commit()

    if was_default:
        result = await db.execute(
            select(UserPhoto).where(UserPhoto.user_id == user.id).limit(1)
        )
        next_photo = result.scalar_one_or_none()
        if next_photo:
            next_photo.is_default = True
            await db.commit()

    return {"deleted": photo_id}


@router.put(
    "/photos/{photo_id}/default",
    response_model=UserPhotoResponse,
    summary="Сделать фото дефолтным",
    description="Помечает указанное фото как `default` (используется в quick try-on без явного `photo_id`).",
    responses={
        200: {"description": "Фото помечено как default"},
        401: {"description": "Требуется авторизация"},
        404: {"description": "Фото не найдено"},
    },
)
async def set_default_photo(
    photo_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    await db.execute(
        update(UserPhoto)
        .where(UserPhoto.user_id == user.id)
        .values(is_default=False)
    )
    result = await db.execute(
        select(UserPhoto).where(UserPhoto.id == photo_id, UserPhoto.user_id == user.id)
    )
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Фото не найдено")

    row.is_default = True
    await db.commit()
    await db.refresh(row)

    return UserPhotoResponse(
        id=row.id,
        image_url=f"/storage/images/{row.image_path}",
        is_default=row.is_default,
        created_at=row.created_at,
    )


# ---------------------------------------------------------------------------
# Quick try-on (uses saved photo)
# ---------------------------------------------------------------------------

@router.post(
    "/quick-tryon",
    response_model=TryOnJobResponse,
    summary="Быстрая примерка по сохранённому фото",
    description=(
        "Создаёт try-on задачу по сохранённому фото пользователя — без повторной загрузки изображения.\n\n"
        "Если в теле запроса передан `photo_id` — используется именно это фото, "
        "иначе берётся фото с флагом `is_default=true`."
    ),
    responses={
        200: {"description": "Задача создана"},
        400: {"description": "Нет сохранённых фото у пользователя"},
        401: {"description": "Требуется авторизация"},
        404: {"description": "Товар не найден"},
        500: {"description": "Файл фото отсутствует на диске (рассинхронизация)"},
    },
)
async def quick_tryon(
    req: QuickTryOnRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if req.photo_id:
        result = await db.execute(
            select(UserPhoto).where(UserPhoto.id == req.photo_id, UserPhoto.user_id == user.id)
        )
    else:
        result = await db.execute(
            select(UserPhoto).where(UserPhoto.user_id == user.id, UserPhoto.is_default == True)
        )
    photo = result.scalar_one_or_none()
    if not photo:
        raise HTTPException(400, "Нет сохранённых фото. Загрузите фото в профиле.")

    catalog = CatalogService(db)
    product = await catalog.get_product(req.product_id)
    if not product:
        raise HTTPException(404, "Товар не найден")

    filepath = IMAGE_DIR / photo.image_path
    if not filepath.exists():
        raise HTTPException(500, "Файл фото не найден на сервере")
    person_bytes = filepath.read_bytes()

    job = await tryon_service.create_job(
        person_image_bytes=person_bytes,
        product_id=req.product_id,
        product_image_url=product.image_url,
        user_id=str(user.id),
        product_meta={
            "category": product.category.value if hasattr(product.category, "value") else product.category,
            "subcategory": product.subcategory,
            "fit": product.fit,
            "name": product.name,
            "description": product.description,
            "style_tags": product.style_tags,
        },
    )
    return job


# ---------------------------------------------------------------------------
# Preferences
# ---------------------------------------------------------------------------

@router.get(
    "/preferences",
    response_model=UserPreferencesResponse,
    summary="Получить предпочтения пользователя",
    description="Возвращает сохранённые предпочтения (любимые стили, пол для подбора, город для погоды).",
    responses={401: {"description": "Требуется авторизация"}},
)
async def get_preferences(user: User = Depends(get_current_user)):
    return UserPreferencesResponse(
        preferred_styles=user.preferred_styles or [],
        preferred_gender=user.preferred_gender,
        city=user.city,
    )


@router.put(
    "/preferences",
    response_model=UserPreferencesResponse,
    summary="Обновить предпочтения пользователя",
    description=(
        "Частичное обновление предпочтений (только переданные поля). "
        "Используется на онбординге и в настройках профиля."
    ),
    responses={401: {"description": "Требуется авторизация"}},
)
async def update_preferences(
    data: UserPreferencesUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if data.preferred_styles is not None:
        user.preferred_styles = data.preferred_styles
    if data.preferred_gender is not None:
        user.preferred_gender = data.preferred_gender
    if data.city is not None:
        user.city = data.city
    await db.commit()
    await db.refresh(user)

    return UserPreferencesResponse(
        preferred_styles=user.preferred_styles or [],
        preferred_gender=user.preferred_gender,
        city=user.city,
    )
