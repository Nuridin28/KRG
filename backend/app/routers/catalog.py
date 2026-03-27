"""Catalog endpoints -- browse, search, and filter products."""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, HTTPException, Query

from app.models.schemas import (
    CatalogFilters,
    CatalogResponse,
    CategoryType,
    GenderType,
    Product,
)
from app.services.catalog_service import CatalogService

router = APIRouter(prefix="/catalog", tags=["Catalog"])
catalog_service = CatalogService()


@router.get("", response_model=CatalogResponse)
async def get_catalog(
    category: Optional[CategoryType] = None,
    gender: Optional[GenderType] = None,
    style: Optional[str] = None,
    occasion: Optional[str] = None,
    brand: Optional[str] = None,
    color: Optional[str] = None,
    price_min: Optional[float] = None,
    price_max: Optional[float] = None,
    in_stock_only: bool = True,
    search: Optional[str] = None,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
) -> CatalogResponse:
    filters = CatalogFilters(
        category=category,
        gender=gender,
        style=style,
        occasion=occasion,
        brand=brand,
        color=color,
        price_min=price_min,
        price_max=price_max,
        in_stock_only=in_stock_only,
        search=search,
        page=page,
        page_size=page_size,
    )
    return catalog_service.get_products(filters)


@router.get("/brands", response_model=List[str])
async def get_brands() -> List[str]:
    return catalog_service.get_brands()


@router.get("/colors", response_model=List[str])
async def get_colors() -> List[str]:
    return catalog_service.get_colors()


@router.get("/styles")
async def get_styles() -> dict:
    return {
        "styles": [
            "casual",
            "office",
            "sport",
            "evening",
            "street",
            "smart_casual",
            "date",
            "travel",
        ]
    }


@router.get("/occasions")
async def get_occasions() -> dict:
    return {
        "occasions": [
            "daily",
            "work",
            "date",
            "party",
            "workout",
            "travel",
            "event",
        ]
    }


@router.get("/{product_id}", response_model=Product)
async def get_product(product_id: str) -> Product:
    product = catalog_service.get_product(product_id)
    if not product:
        raise HTTPException(404, "Product not found")
    return product
