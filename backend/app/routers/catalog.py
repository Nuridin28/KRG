"""Catalog endpoints — browse, search, and filter products."""

from __future__ import annotations

from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.schemas import (
    CatalogFilters,
    CatalogResponse,
    CategoryType,
    GenderType,
    Product,
)
from app.services.catalog_service import CatalogService

router = APIRouter(prefix="/catalog", tags=["Catalog"])


@router.get(
    "",
    response_model=CatalogResponse,
    summary="Листинг товаров с фильтрами",
    description=(
        "Возвращает страницу товаров каталога с поддержкой фильтрации по категории, "
        "полу, стилю, поводу, бренду, цвету и ценовому диапазону. "
        "Также поддерживает полнотекстовый поиск (`search`).\n\n"
        "Сортировка по умолчанию — по дате добавления (новые первыми)."
    ),
    response_description="Страница товаров + метаданные пагинации",
)
async def get_catalog(
    category: Optional[CategoryType] = Query(None, description="Категория: tops, bottoms, dresses, ..."),
    gender: Optional[GenderType] = Query(None, description="Пол: male / female / unisex"),
    style: Optional[str] = Query(None, description="Стиль: casual, office, sport, ..."),
    occasion: Optional[str] = Query(None, description="Повод: daily, work, date, party, ..."),
    brand: Optional[str] = Query(None, description="Бренд (точное совпадение)"),
    color: Optional[str] = Query(None, description="Цвет (точное совпадение по `color`)"),
    price_min: Optional[float] = Query(None, ge=0, description="Минимальная цена"),
    price_max: Optional[float] = Query(None, ge=0, description="Максимальная цена"),
    in_stock_only: bool = Query(True, description="Показывать только товары в наличии"),
    search: Optional[str] = Query(None, description="Подстрока для полнотекстового поиска (имя/описание)"),
    page: int = Query(1, ge=1, description="Номер страницы (от 1)"),
    page_size: int = Query(20, ge=1, le=100, description="Размер страницы (1..100)"),
    db: AsyncSession = Depends(get_db),
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
    catalog = CatalogService(db)
    return await catalog.get_products(filters)


@router.get(
    "/brands",
    response_model=List[str],
    summary="Список брендов",
    description="Все уникальные бренды, представленные в каталоге.",
)
async def get_brands(db: AsyncSession = Depends(get_db)) -> List[str]:
    return await CatalogService(db).get_brands()


@router.get(
    "/colors",
    response_model=List[str],
    summary="Список цветов",
    description="Все уникальные цвета, представленные в каталоге.",
)
async def get_colors(db: AsyncSession = Depends(get_db)) -> List[str]:
    return await CatalogService(db).get_colors()


@router.get(
    "/styles",
    summary="Справочник стилей",
    description="Поддерживаемые значения для фильтра `style`.",
    responses={
        200: {
            "content": {
                "application/json": {
                    "example": {
                        "styles": [
                            "casual", "office", "sport", "evening",
                            "street", "smart_casual", "date", "travel",
                        ]
                    }
                }
            }
        }
    },
)
async def get_styles() -> dict:
    return {
        "styles": [
            "casual", "office", "sport", "evening",
            "street", "smart_casual", "date", "travel",
        ]
    }


@router.get(
    "/occasions",
    summary="Справочник поводов",
    description="Поддерживаемые значения для фильтра `occasion`.",
    responses={
        200: {
            "content": {
                "application/json": {
                    "example": {
                        "occasions": [
                            "daily", "work", "date", "party",
                            "workout", "travel", "event",
                        ]
                    }
                }
            }
        }
    },
)
async def get_occasions() -> dict:
    return {
        "occasions": [
            "daily", "work", "date", "party",
            "workout", "travel", "event",
        ]
    }


@router.get(
    "/{product_id}",
    response_model=Product,
    summary="Карточка товара",
    description="Возвращает полную карточку товара по его `id`.",
    responses={
        200: {"description": "Товар найден"},
        404: {"description": "Товар не найден"},
    },
)
async def get_product(product_id: str, db: AsyncSession = Depends(get_db)) -> Product:
    catalog = CatalogService(db)
    product = await catalog.get_product(product_id)
    if not product:
        raise HTTPException(404, "Product not found")
    return product
