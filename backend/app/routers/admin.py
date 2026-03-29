"""Admin / backoffice endpoints -- protected by admin role."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Dict, List, Optional

from pathlib import Path

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy import delete, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_admin_user
from app.core.database import get_db
from app.models.db_models import Product as ProductDB, TrackingEvent as TrackingEventDB, User
from app.models.schemas import Product

router = APIRouter(prefix="/admin", tags=["Admin"])


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
# In-memory rules & feature flags (unchanged)
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

@router.get("/rules", response_model=List[AdminRule])
async def list_rules(_: User = Depends(get_admin_user)) -> List[AdminRule]:
    return list(_rules.values())


@router.post("/rules", response_model=AdminRule)
async def create_rule(rule: AdminRule, _: User = Depends(get_admin_user)) -> AdminRule:
    rule.id = f"rule-{uuid.uuid4().hex[:8]}"
    _rules[rule.id] = rule
    return rule


@router.put("/rules/{rule_id}", response_model=AdminRule)
async def update_rule(rule_id: str, rule: AdminRule, _: User = Depends(get_admin_user)) -> AdminRule:
    if rule_id not in _rules:
        raise HTTPException(404, "Rule not found")
    rule.id = rule_id
    _rules[rule_id] = rule
    return rule


@router.delete("/rules/{rule_id}")
async def delete_rule(rule_id: str, _: User = Depends(get_admin_user)) -> dict:
    if rule_id not in _rules:
        raise HTTPException(404, "Rule not found")
    del _rules[rule_id]
    return {"deleted": rule_id}


# ---------------------------------------------------------------------------
# Statistics (real data from DB)
# ---------------------------------------------------------------------------

@router.get("/stats")
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

@router.get("/products", response_model=List[Product])
async def list_products(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
    page: int = 1,
    page_size: int = 50,
):
    from app.services.catalog_service import CatalogService, _row_to_product
    offset = (page - 1) * page_size
    result = await db.execute(select(ProductDB).offset(offset).limit(page_size))
    return [_row_to_product(r) for r in result.scalars().all()]


@router.post("/products", response_model=Product, status_code=201)
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


@router.put("/products/{product_id}", response_model=Product)
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


@router.delete("/products/{product_id}")
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

@router.get("/providers", response_model=List[ProviderStatus])
async def get_providers(_: User = Depends(get_admin_user)) -> List[ProviderStatus]:
    now = datetime.now(timezone.utc)
    return [
        ProviderStatus(name="Mapp Fashion API", status="healthy", latency_ms=120, last_check=now),
        ProviderStatus(name="Vertex AI Virtual Try-On", status="healthy", latency_ms=2800, last_check=now),
        ProviderStatus(name="FASHN API (backup)", status="standby", latency_ms=None, last_check=now),
        ProviderStatus(name="OpenAI API", status="healthy", latency_ms=450, last_check=now),
    ]


@router.get("/feature-flags")
async def get_feature_flags(_: User = Depends(get_admin_user)) -> dict:
    return _feature_flags


@router.post("/feature-flags")
async def update_feature_flags(flags: Dict[str, bool], _: User = Depends(get_admin_user)) -> dict:
    _feature_flags.update(flags)
    return _feature_flags


# ---------------------------------------------------------------------------
# Users management
# ---------------------------------------------------------------------------

@router.get("/users")
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

@router.post("/upload-image")
async def upload_product_image(
    image: UploadFile = File(...),
    _: User = Depends(get_admin_user),
):
    """Upload a product image and return its URL."""
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

@router.post("/embed-products")
async def embed_products(
    db: AsyncSession = Depends(get_db),
    _: User = Depends(get_admin_user),
) -> dict:
    from app.services.embedding_service import EmbeddingService
    svc = EmbeddingService()
    count = await svc.embed_all_products(db)
    return {"embedded": count}
