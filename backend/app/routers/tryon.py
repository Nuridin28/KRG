"""Virtual try-on endpoints."""

from __future__ import annotations

import uuid
from pathlib import Path

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.core.database import get_db
from app.models.schemas import TryOnJobResponse
from app.services.catalog_service import CatalogService
from app.services.tryon_service import TryOnService

router = APIRouter(prefix="/tryon", tags=["Virtual Try-On"])

tryon_service = TryOnService()

_ANON_DIR = Path(settings.IMAGE_STORAGE_PATH) / "anonymous"
_ANON_DIR.mkdir(parents=True, exist_ok=True)


@router.post(
    "/jobs",
    response_model=TryOnJobResponse,
    summary="Создать задачу примерки одного товара",
    description=(
        "Создаёт асинхронную задачу виртуальной примерки одного товара на фотографии пользователя.\n\n"
        "**Тело запроса:** `multipart/form-data`\n"
        "- `person_image` — JPEG/PNG фото пользователя в полный рост\n"
        "- `product_id` — id товара из каталога\n\n"
        "Ответ содержит `job_id` и текущий `status`. Опросите статус через "
        "`GET /tryon/jobs/{job_id}` до тех пор, пока он не станет `succeeded` или `failed`.\n\n"
        "Под капотом: Vertex Virtual Try-On (основной провайдер) или FASHN (fallback)."
    ),
    response_description="Описание созданной задачи try-on",
    responses={
        200: {"description": "Задача создана"},
        400: {"description": "Пустой файл изображения"},
        404: {"description": "Товар не найден"},
        429: {"description": "Превышен лимит примерок (`TRYON_RATE_LIMIT_PER_USER`)"},
    },
)
async def create_tryon_job(
    person_image: UploadFile = File(..., description="Фото пользователя (JPEG/PNG)"),
    product_id: str = Form(..., description="ID товара из каталога"),
    db: AsyncSession = Depends(get_db),
) -> TryOnJobResponse:
    catalog = CatalogService(db)
    product = await catalog.get_product(product_id)
    if not product:
        raise HTTPException(404, "Product not found")

    person_bytes = await person_image.read()
    if not person_bytes:
        raise HTTPException(400, "Empty image file")

    job = await tryon_service.create_job(
        person_image_bytes=person_bytes,
        product_id=product_id,
        product_image_url=product.image_url,
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


@router.post(
    "/anonymous",
    response_model=TryOnJobResponse,
    summary="Анонимная примерка (B2C, без сохранения в БД)",
    description=(
        "Принимает два изображения: фото пользователя и изображение одежды. "
        "Не требует авторизации, не использует каталог, не сохраняет в БД. "
        "Файл одежды временно сохраняется на диск, чтобы провайдер VTO мог его скачать."
    ),
    responses={
        200: {"description": "Задача создана"},
        400: {"description": "Пустой файл изображения"},
    },
)
async def create_anonymous_tryon(
    person_image: UploadFile = File(..., description="Фото человека (JPEG/PNG)"),
    garment_image: UploadFile = File(..., description="Фото одежды (JPEG/PNG)"),
) -> TryOnJobResponse:
    person_bytes = await person_image.read()
    garment_bytes = await garment_image.read()
    if not person_bytes or not garment_bytes:
        raise HTTPException(400, "Both images are required")

    garment_id = uuid.uuid4().hex[:12]
    suffix = ".png"
    if garment_image.content_type:
        if "jpeg" in garment_image.content_type or "jpg" in garment_image.content_type:
            suffix = ".jpg"
        elif "webp" in garment_image.content_type:
            suffix = ".webp"
    garment_path = _ANON_DIR / f"{garment_id}{suffix}"
    garment_path.write_bytes(garment_bytes)

    base = settings.PUBLIC_BASE_URL.rstrip("/")
    garment_url = f"{base}/storage/images/anonymous/{garment_path.name}"

    job = await tryon_service.create_job(
        person_image_bytes=person_bytes,
        product_id=f"anon-{garment_id}",
        product_image_url=garment_url,
        user_id="anonymous-b2c",
    )
    return job


@router.post(
    "/outfit-jobs",
    response_model=TryOnJobResponse,
    summary="Создать задачу примерки комплекта (outfit)",
    description=(
        "Создаёт задачу примерки нескольких товаров одновременно (готовый образ).\n\n"
        "**Тело запроса:** `multipart/form-data`\n"
        "- `person_image` — JPEG/PNG фото пользователя\n"
        "- `product_ids` — список id товаров через запятую (например, `prod-1,prod-2,prod-3`)\n\n"
        "Опрос статуса — через `GET /tryon/jobs/{job_id}`."
    ),
    response_description="Описание созданной задачи примерки комплекта",
    responses={
        200: {"description": "Задача создана"},
        400: {"description": "Не передан список товаров или пустой файл"},
        404: {"description": "Ни один из переданных товаров не найден"},
    },
)
async def create_outfit_tryon_job(
    person_image: UploadFile = File(..., description="Фото пользователя (JPEG/PNG)"),
    product_ids: str = Form(..., description="ID товаров через запятую: `prod-a,prod-b,...`"),
    db: AsyncSession = Depends(get_db),
) -> TryOnJobResponse:
    ids = [pid.strip() for pid in product_ids.split(",") if pid.strip()]
    if not ids:
        raise HTTPException(400, "No product IDs provided")

    catalog = CatalogService(db)
    product_items: list[dict] = []
    for pid in ids:
        product = await catalog.get_product(pid)
        if product:
            product_items.append({
                "product_id": product.id,
                "product_name": product.name,
                "product_image_url": product.image_url,
                "category": product.category.value if hasattr(product.category, "value") else product.category,
                "subcategory": product.subcategory,
                "fit": product.fit,
                "description": product.description,
                "style_tags": product.style_tags,
            })

    if not product_items:
        raise HTTPException(404, "None of the provided product IDs were found")

    person_bytes = await person_image.read()
    if not person_bytes:
        raise HTTPException(400, "Empty image file")

    job = await tryon_service.create_outfit_job(
        person_image_bytes=person_bytes,
        product_items=product_items,
    )
    return job


@router.get(
    "/jobs/{job_id}",
    response_model=TryOnJobResponse,
    summary="Статус задачи примерки",
    description=(
        "Возвращает текущее состояние задачи try-on. "
        "Возможные значения `status`: `pending`, `processing`, `succeeded`, `failed`. "
        "При `succeeded` поле `result_image_url` содержит URL итогового изображения."
    ),
    response_description="Текущее состояние задачи",
    responses={
        200: {"description": "Состояние получено"},
        404: {"description": "Задача не найдена / истекла"},
    },
)
async def get_tryon_job(job_id: str) -> TryOnJobResponse:
    job = await tryon_service.get_job(job_id)
    if not job:
        raise HTTPException(404, "Job not found")
    return job
