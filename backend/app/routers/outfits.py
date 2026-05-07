"""Outfit generation and recommendation endpoints."""

from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.schemas import (
    Outfit,
    OutfitByProductRequest,
    OutfitGenerateRequest,
    ProductBrief,
)
from app.services.catalog_service import CatalogService
from app.services.recommendation_service import RecommendationService

router = APIRouter(prefix="/outfits", tags=["Outfits"])


def _get_services(db: AsyncSession):
    catalog = CatalogService(db)
    return catalog, RecommendationService(catalog)


@router.post(
    "/generate",
    response_model=List[Outfit],
    summary="Сгенерировать образы по параметрам",
    description=(
        "Возвращает несколько готовых образов (`Outfit`) по заданным параметрам — "
        "стилю, поводу, полу, цветовой палитре, бюджету и т.д. "
        "Каждый образ — согласованный набор товаров из каталога с оценкой совместимости и пояснением.\n\n"
        "Количество возвращаемых образов ограничено `MAX_OUTFITS_PER_REQUEST` (по умолчанию 10)."
    ),
    response_description="Список образов",
    responses={
        200: {"description": "Образы сгенерированы"},
        404: {"description": "Не удалось собрать образ под заданные параметры"},
    },
)
async def generate_outfits(
    req: OutfitGenerateRequest,
    db: AsyncSession = Depends(get_db),
) -> List[Outfit]:
    _, recommender = _get_services(db)
    outfits = await recommender.generate_outfits(req)
    if not outfits:
        raise HTTPException(404, "Could not assemble outfit with given parameters")
    return outfits


@router.post(
    "/by-product",
    response_model=List[Outfit],
    summary="Достроить образ вокруг товара",
    description=(
        "Принимает `product_id` ключевого товара и возвращает образы, в которых он используется. "
        "Полезно для страницы товара — кнопка «Собрать образ»."
    ),
    response_description="Список образов с указанным товаром",
    responses={
        200: {"description": "Образы сгенерированы"},
        404: {"description": "Не удалось собрать образ для этого товара"},
    },
)
async def get_outfits_by_product(
    req: OutfitByProductRequest,
    db: AsyncSession = Depends(get_db),
) -> List[Outfit]:
    _, recommender = _get_services(db)
    outfits = await recommender.get_outfits_by_product(req)
    if not outfits:
        raise HTTPException(404, "Could not assemble outfit for this product")
    return outfits


@router.post(
    "/recommend/{product_id}",
    response_model=List[ProductBrief],
    summary="Похожие / комплементарные товары",
    description=(
        "Возвращает товары, похожие или дополняющие указанный (по эмбеддингам и метаданным). "
        "Используется в блоке «С этим товаром также покупают» / «Может подойти»."
    ),
    response_description="Список похожих/дополняющих товаров",
    responses={
        200: {"description": "Рекомендации найдены"},
        404: {"description": "Рекомендации не найдены"},
    },
)
async def get_recommendations(
    product_id: str,
    db: AsyncSession = Depends(get_db),
) -> List[ProductBrief]:
    _, recommender = _get_services(db)
    recs = await recommender.get_recommendations(product_id)
    if not recs:
        raise HTTPException(404, "Recommendations not found")
    return recs
