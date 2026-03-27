"""Catalog service -- loads products from JSON and provides filtering/lookup."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List, Optional

from app.models.schemas import (
    CatalogFilters,
    CatalogResponse,
    GenderType,
    Product,
    ProductBrief,
)


class CatalogService:
    """In-memory product catalog backed by a JSON file."""

    def __init__(self) -> None:
        catalog_path = Path(__file__).parent.parent.parent / "data" / "catalog.json"
        with open(catalog_path, encoding="utf-8") as fh:
            raw = json.load(fh)
        self.products: List[Product] = [Product(**p) for p in raw]
        self._by_id: Dict[str, Product] = {p.id: p for p in self.products}
        self._by_category: Dict[str, List[Product]] = {}
        for p in self.products:
            self._by_category.setdefault(p.category.value, []).append(p)

    def get_product(self, product_id: str) -> Optional[Product]:
        return self._by_id.get(product_id)

    def get_products(self, filters: CatalogFilters) -> CatalogResponse:
        filtered = self.products[:]

        if filters.category:
            filtered = [p for p in filtered if p.category == filters.category]
        if filters.gender:
            filtered = [
                p
                for p in filtered
                if p.gender == filters.gender or p.gender == GenderType.UNISEX
            ]
        if filters.style:
            filtered = [p for p in filtered if filters.style in p.style_tags]
        if filters.occasion:
            filtered = [p for p in filtered if filters.occasion in p.occasion_tags]
        if filters.brand:
            filtered = [
                p for p in filtered if p.brand.lower() == filters.brand.lower()
            ]
        if filters.color:
            filtered = [
                p for p in filtered if p.color_name.lower() == filters.color.lower()
            ]
        if filters.price_min is not None:
            filtered = [p for p in filtered if p.price >= filters.price_min]
        if filters.price_max is not None:
            filtered = [p for p in filtered if p.price <= filters.price_max]
        if filters.in_stock_only:
            filtered = [p for p in filtered if p.in_stock]
        if filters.search:
            q = filters.search.lower()
            filtered = [
                p
                for p in filtered
                if q in p.name.lower()
                or q in p.description.lower()
                or q in p.brand.lower()
            ]

        total = len(filtered)
        total_pages = max(1, (total + filters.page_size - 1) // filters.page_size)
        start = (filters.page - 1) * filters.page_size
        end = start + filters.page_size

        return CatalogResponse(
            items=filtered[start:end],
            total=total,
            page=filters.page,
            page_size=filters.page_size,
            total_pages=total_pages,
        )

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
            image_url=product.image_url,
            in_stock=product.in_stock,
        )

    def get_by_category(self, category: str) -> List[Product]:
        return self._by_category.get(category, [])

    def get_brands(self) -> List[str]:
        return sorted({p.brand for p in self.products})

    def get_colors(self) -> List[str]:
        return sorted({p.color_name for p in self.products})
