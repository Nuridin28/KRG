"""Outfit generation and recommendation endpoints."""

from __future__ import annotations

from typing import List

from fastapi import APIRouter, HTTPException

from app.models.schemas import (
    Outfit,
    OutfitByProductRequest,
    OutfitGenerateRequest,
    ProductBrief,
)
from app.services.catalog_service import CatalogService
from app.services.recommendation_service import RecommendationService

router = APIRouter(prefix="/outfits", tags=["Outfits"])

catalog_service = CatalogService()
recommendation_service = RecommendationService(catalog_service)


@router.post("/generate", response_model=List[Outfit])
async def generate_outfits(req: OutfitGenerateRequest) -> List[Outfit]:
    outfits = recommendation_service.generate_outfits(req)
    if not outfits:
        raise HTTPException(404, "Could not assemble outfit with given parameters")
    return outfits


@router.post("/by-product", response_model=List[Outfit])
async def get_outfits_by_product(req: OutfitByProductRequest) -> List[Outfit]:
    outfits = recommendation_service.get_outfits_by_product(req)
    if not outfits:
        raise HTTPException(404, "Could not assemble outfit for this product")
    return outfits


@router.post("/recommend/{product_id}", response_model=List[ProductBrief])
async def get_recommendations(product_id: str) -> List[ProductBrief]:
    recs = recommendation_service.get_recommendations(product_id)
    if not recs:
        raise HTTPException(404, "Recommendations not found")
    return recs
