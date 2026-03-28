"""Conversational AI stylist endpoints."""

from __future__ import annotations

from typing import List

from fastapi import APIRouter

from app.models.schemas import ChatRequest, ChatResponse
from app.services.catalog_service import CatalogService
from app.services.recommendation_service import RecommendationService
from app.services.stylist_service import StylistService

router = APIRouter(prefix="/stylist", tags=["AI Stylist Chat"])

catalog_service = CatalogService()
recommendation_service = RecommendationService(catalog_service)
stylist_service = StylistService(catalog_service, recommendation_service)


@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest) -> ChatResponse:
    return stylist_service.chat(request)


@router.get("/suggestions", response_model=List[str])
async def get_suggestions() -> List[str]:
    return stylist_service.get_suggestions()
