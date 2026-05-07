"""Catalog service -- loads products from PostgreSQL."""

from __future__ import annotations

from typing import Dict, List, Optional

from sqlalchemy import select, func, or_
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.db_models import Product as ProductDB
from app.models.schemas import (
    CatalogFilters,
    CatalogResponse,
    CategoryType,
    GenderType,
    Product,
    ProductBrief,
)


def _row_to_product(row: ProductDB) -> Product:
    return Product(
        id=row.id,
        sku_id=row.sku_id,
        name=row.name,
        brand=row.brand,
        category=CategoryType(row.category),
        subcategory=row.subcategory,
        gender=GenderType(row.gender),
        description=row.description,
        color=row.color,
        color_name=row.color_name,
        color_hex=row.color_hex,
        pattern=row.pattern,
        fit=row.fit,
        material=row.material,
        price=row.price,
        promo_price=row.promo_price,
        currency=row.currency,
        sizes=row.sizes or [],
        in_stock=row.in_stock,
        image_url=row.image_url,
        style_tags=row.style_tags or [],
        occasion_tags=row.occasion_tags or [],
        season=row.season,
        seller_id=row.seller_id,
    )


def _row_to_brief(row: ProductDB) -> ProductBrief:
    return ProductBrief(
        id=row.id,
        name=row.name,
        brand=row.brand,
        category=CategoryType(row.category),
        color_hex=row.color_hex,
        color_name=row.color_name,
        price=row.price,
        promo_price=row.promo_price,
        currency=row.currency,
        image_url=row.image_url,
        in_stock=row.in_stock,
    )


class CatalogService:
    """Product catalog backed by PostgreSQL."""

    def __init__(self, db: AsyncSession) -> None:
        self.db = db

    async def get_product(self, product_id: str) -> Optional[Product]:
        result = await self.db.execute(
            select(ProductDB).where(ProductDB.id == product_id)
        )
        row = result.scalar_one_or_none()
        return _row_to_product(row) if row else None

    async def get_product_db(self, product_id: str) -> Optional[ProductDB]:
        result = await self.db.execute(
            select(ProductDB).where(ProductDB.id == product_id)
        )
        return result.scalar_one_or_none()

    async def get_products(self, filters: CatalogFilters) -> CatalogResponse:
        query = select(ProductDB)

        if filters.category:
            query = query.where(ProductDB.category == filters.category.value)
        if filters.gender:
            query = query.where(
                or_(
                    ProductDB.gender == filters.gender.value,
                    ProductDB.gender == GenderType.UNISEX.value,
                )
            )
        if filters.brand:
            query = query.where(func.lower(ProductDB.brand) == filters.brand.lower())
        if filters.color:
            query = query.where(func.lower(ProductDB.color_name) == filters.color.lower())
        if filters.price_min is not None:
            query = query.where(ProductDB.price >= filters.price_min)
        if filters.price_max is not None:
            query = query.where(ProductDB.price <= filters.price_max)
        if filters.in_stock_only:
            query = query.where(ProductDB.in_stock == True)
        if filters.search:
            q = f"%{filters.search.lower()}%"
            query = query.where(
                or_(
                    func.lower(ProductDB.name).like(q),
                    func.lower(ProductDB.description).like(q),
                    func.lower(ProductDB.brand).like(q),
                )
            )

        # Count total
        count_query = select(func.count()).select_from(query.subquery())
        total_result = await self.db.execute(count_query)
        total = total_result.scalar() or 0

        total_pages = max(1, (total + filters.page_size - 1) // filters.page_size)

        # Paginate (newest first)
        offset = (filters.page - 1) * filters.page_size
        query = query.order_by(ProductDB.created_at.desc()).offset(offset).limit(filters.page_size)

        result = await self.db.execute(query)
        rows = result.scalars().all()

        # Filter style/occasion in Python (JSON columns)
        items = [_row_to_product(r) for r in rows]
        if filters.style:
            items = [p for p in items if filters.style in p.style_tags]
        if filters.occasion:
            items = [p for p in items if filters.occasion in p.occasion_tags]

        return CatalogResponse(
            items=items,
            total=total,
            page=filters.page,
            page_size=filters.page_size,
            total_pages=total_pages,
        )

    async def get_all_products(self) -> List[Product]:
        result = await self.db.execute(select(ProductDB).where(ProductDB.in_stock == True))
        return [_row_to_product(r) for r in result.scalars().all()]

    async def get_by_category(self, category: str) -> List[Product]:
        result = await self.db.execute(
            select(ProductDB).where(ProductDB.category == category)
        )
        return [_row_to_product(r) for r in result.scalars().all()]

    async def get_brands(self) -> List[str]:
        result = await self.db.execute(
            select(ProductDB.brand).distinct().order_by(ProductDB.brand)
        )
        return [r[0] for r in result.all()]

    async def get_colors(self) -> List[str]:
        result = await self.db.execute(
            select(ProductDB.color_name).distinct().order_by(ProductDB.color_name)
        )
        return [r[0] for r in result.all()]

    def get_brief(self, product: Product) -> ProductBrief:
        return ProductBrief(
            id=product.id,
            name=product.name,
            brand=product.brand,
            category=product.category,
            color_hex=product.color_hex,
            color_name=product.color_name,
            price=product.price,
            promo_price=product.promo_price,
            currency=product.currency,
            image_url=product.image_url,
            in_stock=product.in_stock,
        )

    async def count_products(self) -> int:
        result = await self.db.execute(select(func.count(ProductDB.id)))
        return result.scalar() or 0
