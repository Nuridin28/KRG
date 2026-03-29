"""Conversational AI stylist endpoints."""

from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.schemas import ChatRequest, ChatResponse
from app.services.catalog_service import CatalogService
from app.services.recommendation_service import RecommendationService
from app.services.stylist_service import StylistService

router = APIRouter(prefix="/stylist", tags=["AI Stylist Chat"])


@router.post("/chat", response_model=ChatResponse)
async def chat(
    request: ChatRequest,
    db: AsyncSession = Depends(get_db),
) -> ChatResponse:
    catalog = CatalogService(db)
    recommender = RecommendationService(catalog)
    stylist = StylistService(catalog, recommender)
    return await stylist.chat(request)


@router.get("/suggestions", response_model=List[str])
async def get_suggestions() -> List[str]:
    return StylistService.get_suggestions()
