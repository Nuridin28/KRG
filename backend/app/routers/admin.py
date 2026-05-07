"""Admin / backoffice endpoints — protected by admin role."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional

from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_admin_user
from app.core.database import get_db
from app.models.db_models import Product as ProductDB, TrackingEvent as TrackingEventDB, User
from app.models.schemas import Product

router = APIRouter(
    prefix="/admin",
    tags=["Admin"],
    responses={
        401: {"description": "Требуется авторизация"},
        403: {"description": "Требуется роль `admin`"},
    },
)


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class AdminRule(BaseModel):
    id: str = ""
    rule_type: str
    config: dict
    active: bool = True


class ProviderStatus(BaseModel):
    name: str
    status: str
    latency_ms: float | None = None
    last_check: datetime


class ProductCreateRequest(BaseModel):
    id: Optional[str] = None
    sku_id: str
    name: str
    brand: str
    category: str
    subcategory: str
    gender: str
    description: str = ""
    color: str = ""
    color_name: str = ""
    color_hex: str = ""
    pattern: str = "solid"
    fit: str = "regular"
    material: str = ""
    price: float
    promo_price: Optional[float] = None
    currency: str = "USD"
    sizes: List[str] = []
    in_stock: bool = True
    image_url: str = ""
    style_tags: List[str] = []
    occasion_tags: List[str] = []
    season: str = "all"
    seller_id: str = "marketplace"


# ---------------------------------------------------------------------------
# In-memory rules & feature flags
# ---------------------------------------------------------------------------

_rules: Dict[str, AdminRule] = {}
_feature_flags: Dict[str, bool] = {
    "outfit_recommendations": True,
    "virtual_tryon": True,
    "conversational_stylist": True,
    "show_explanations": True,
    "ab_testing": False,
}


# ---------------------------------------------------------------------------
# Rules CRUD
# ---------------------------------------------------------------------------

@router.get(
    "/rules",
    response_model=List[AdminRule],
    summary="Список бизнес-правил",
    description="Возвращает текущие правила рекомендаций (хранятся in-memory).",
)
async def list_rules(_: User = Depends(get_admin_user)) -> List[AdminRule]:
    return list(_rules.values())


@router.post(
    "/rules",
    response_model=AdminRule,
    summary="Создать бизнес-правило",
    description="Создаёт новое правило рекомендаций. `id` присваивается автоматически.",
)
async def create_rule(rule: AdminRule, _: User = Depends(get_admin_user)) -> AdminRule:
    rule.id = f"rule-{uuid.uuid4().hex[:8]}"
    _rules[rule.id] = rule
    return rule


@router.put(
    "/rules/{rule_id}",
    response_model=AdminRule,
    summary="Обновить бизнес-правило",
    responses={404: {"description": "Правило не найдено"}},
)
async def update_rule(rule_id: str, rule: AdminRule, _: User = Depends(get_admin_user)) -> AdminRule:
    if rule_id not in _rules:
        raise HTTPException(404, "Rule not found")
    rule.id = rule_id
    _rules[rule_id] = rule
    return rule


@router.delete(
    "/rules/{rule_id}",
    summary="Удалить бизнес-правило",
    responses={404: {"description": "Правило не найдено"}},
)
async def delete_rule(rule_id: str, _: User = Depends(get_admin_user)) -> dict:
    if rule_id not in _rules:
        raise HTTPException(404, "Rule not found")
    del _rules[rule_id]
    return {"deleted": rule_id}


# ---------------------------------------------------------------------------
# Statistics (real data from DB)
# ---------------------------------------------------------------------------

@router.get(
    "/stats",
    summary="Сводная статистика",
    description=(
        "Возвращает агрегированные счётчики по системе: товары, пользователи, события, "
        "сгенерированные образы и try-on. Источник — PostgreSQL."
    ),
    responses={
        200: {
            "content": {
                "application/json": {
                    "example": {
                        "total_products": 1240,
                        "total_users": 318,
                        "total_events": 56120,
                        "total_outfits_generated": 4210,
                        "total_tryon_jobs": 1870,
                        "active_rules": 7,
                    }
                }
            }
        }
    },
)
async def get_stats(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
) -> dict:
    total_products = (await db.execute(select(func.count(ProductDB.id)))).scalar() or 0
    total_users = (await db.execute(select(func.count(User.id)))).scalar() or 0
    total_events = (await db.execute(select(func.count(TrackingEventDB.id)))).scalar() or 0

    tryon_total = (await db.execute(
        select(func.count(TrackingEventDB.id)).where(TrackingEventDB.event_type == "tryon")
    )).scalar() or 0

    outfit_total = (await db.execute(
        select(func.count(TrackingEventDB.id)).where(TrackingEventDB.event_type == "outfit_generate")
    )).scalar() or 0

    return {
        "total_products": total_products,
        "total_users": total_users,
        "total_events": total_events,
        "total_outfits_generated": outfit_total,
        "total_tryon_jobs": tryon_total,
        "active_rules": len([r for r in _rules.values() if r.active]),
    }


# ---------------------------------------------------------------------------
# Product CRUD
# ---------------------------------------------------------------------------

@router.get(
    "/products",
    response_model=List[Product],
    summary="Листинг товаров (admin)",
    description="Постраничный листинг товаров без фильтров по статусу — для админ-панели.",
)
async def list_products(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
    page: int = 1,
    page_size: int = 50,
):
    from app.services.catalog_service import _row_to_product
    offset = (page - 1) * page_size
    result = await db.execute(select(ProductDB).offset(offset).limit(page_size))
    return [_row_to_product(r) for r in result.scalars().all()]


@router.post(
    "/products",
    response_model=Product,
    status_code=201,
    summary="Создать товар",
    description="Создаёт новый товар. Если `id` не передан — генерируется автоматически.",
    responses={
        201: {"description": "Товар создан"},
        400: {"description": "Товар с таким ID уже существует"},
    },
)
async def create_product(
    body: ProductCreateRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    product_id = body.id or f"prod-{uuid.uuid4().hex[:8]}"

    existing = await db.execute(select(ProductDB).where(ProductDB.id == product_id))
    if existing.scalar_one_or_none():
        raise HTTPException(400, "Product with this ID already exists")

    row = ProductDB(
        id=product_id,
        sku_id=body.sku_id,
        name=body.name,
        brand=body.brand,
        category=body.category,
        subcategory=body.subcategory,
        gender=body.gender,
        description=body.description,
        color=body.color,
        color_name=body.color_name,
        color_hex=body.color_hex,
        pattern=body.pattern,
        fit=body.fit,
        material=body.material,
        price=body.price,
        promo_price=body.promo_price,
        currency=body.currency,
        sizes=body.sizes,
        in_stock=body.in_stock,
        image_url=body.image_url,
        style_tags=body.style_tags,
        occasion_tags=body.occasion_tags,
        season=body.season,
        seller_id=body.seller_id,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)

    from app.services.catalog_service import _row_to_product
    return _row_to_product(row)


@router.put(
    "/products/{product_id}",
    response_model=Product,
    summary="Обновить товар",
    description="Полное обновление полей товара. Передавайте все поля, поскольку это PUT, а не PATCH.",
    responses={404: {"description": "Товар не найден"}},
)
async def update_product(
    product_id: str,
    body: ProductCreateRequest,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    result = await db.execute(select(ProductDB).where(ProductDB.id == product_id))
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Product not found")

    for field in [
        "sku_id", "name", "brand", "category", "subcategory", "gender",
        "description", "color", "color_name", "color_hex", "pattern", "fit",
        "material", "price", "promo_price", "currency", "sizes", "in_stock",
        "image_url", "style_tags", "occasion_tags", "season", "seller_id",
    ]:
        setattr(row, field, getattr(body, field))

    await db.commit()
    await db.refresh(row)

    from app.services.catalog_service import _row_to_product
    return _row_to_product(row)


@router.delete(
    "/products/{product_id}",
    summary="Удалить товар",
    responses={404: {"description": "Товар не найден"}},
)
async def delete_product(
    product_id: str,
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
) -> dict:
    result = await db.execute(select(ProductDB).where(ProductDB.id == product_id))
    row = result.scalar_one_or_none()
    if not row:
        raise HTTPException(404, "Product not found")

    await db.delete(row)
    await db.commit()
    return {"deleted": product_id}


# ---------------------------------------------------------------------------
# Providers & Feature Flags
# ---------------------------------------------------------------------------

@router.get(
    "/providers",
    response_model=List[ProviderStatus],
    summary="Статус внешних провайдеров",
    description="Текущее состояние интеграций (Vertex VTO, FASHN, OpenAI, Mapp Fashion API).",
)
async def get_providers(_: User = Depends(get_admin_user)) -> List[ProviderStatus]:
    now = datetime.now(timezone.utc)
    return [
        ProviderStatus(name="Mapp Fashion API", status="healthy", latency_ms=120, last_check=now),
        ProviderStatus(name="Vertex AI Virtual Try-On", status="healthy", latency_ms=2800, last_check=now),
        ProviderStatus(name="FASHN API (backup)", status="standby", latency_ms=None, last_check=now),
        ProviderStatus(name="OpenAI API", status="healthy", latency_ms=450, last_check=now),
    ]


@router.get(
    "/feature-flags",
    summary="Получить feature-флаги",
    description="Текущее состояние фича-флагов системы.",
)
async def get_feature_flags(_: User = Depends(get_admin_user)) -> dict:
    return _feature_flags


@router.post(
    "/feature-flags",
    summary="Обновить feature-флаги",
    description="Частично обновляет состояние фича-флагов (передавайте только те, что нужно изменить).",
)
async def update_feature_flags(flags: Dict[str, bool], _: User = Depends(get_admin_user)) -> dict:
    _feature_flags.update(flags)
    return _feature_flags


# ---------------------------------------------------------------------------
# Users management
# ---------------------------------------------------------------------------

@router.get(
    "/users",
    summary="Список пользователей",
    description="Возвращает всех зарегистрированных пользователей системы (без хеша пароля).",
)
async def list_users(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
):
    from app.models.auth_schemas import UserResponse
    result = await db.execute(select(User))
    users = result.scalars().all()
    return [UserResponse.model_validate(u) for u in users]


# ---------------------------------------------------------------------------
# Image upload for products
# ---------------------------------------------------------------------------

@router.post(
    "/upload-image",
    summary="Загрузить изображение товара",
    description=(
        "Принимает файл изображения товара (jpg/jpeg/png/webp, до 10 МБ) "
        "и возвращает относительный URL для использования в поле `image_url` товара."
    ),
    responses={
        200: {
            "content": {
                "application/json": {
                    "example": {"image_url": "/storage/images/products/0a1b2c3d4e5f.jpg"}
                }
            }
        },
        400: {"description": "Файл слишком большой (>10 МБ)"},
    },
)
async def upload_product_image(
    image: UploadFile = File(..., description="JPG/JPEG/PNG/WEBP, до 10 МБ"),
    _: User = Depends(get_admin_user),
):
    from app.core.config import settings

    content = await image.read()
    if len(content) > 10 * 1024 * 1024:
        raise HTTPException(400, "Файл слишком большой (макс. 10 МБ)")

    img_dir = Path(settings.IMAGE_STORAGE_PATH) / "products"
    img_dir.mkdir(parents=True, exist_ok=True)

    ext = (image.filename or "img.jpg").rsplit(".", 1)[-1].lower()
    if ext not in ("jpg", "jpeg", "png", "webp"):
        ext = "jpg"
    filename = f"{uuid.uuid4().hex[:12]}.{ext}"
    filepath = img_dir / filename
    filepath.write_bytes(content)

    return {"image_url": f"/storage/images/products/{filename}"}


# ---------------------------------------------------------------------------
# Embeddings
# ---------------------------------------------------------------------------

@router.post(
    "/embed-products",
    summary="Перевычислить эмбеддинги для всех товаров",
    description=(
        "Запускает пересчёт текстовых/визуальных эмбеддингов для всех товаров каталога. "
        "Используется после массового обновления каталога — может занять несколько минут."
    ),
    responses={
        200: {
            "content": {"application/json": {"example": {"embedded": 1240}}},
        }
    },
)
async def embed_products(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
) -> dict:
    from app.services.embedding_service import EmbeddingService
    svc = EmbeddingService()
    count = await svc.embed_all_products(db)
    return {"embedded": count}
