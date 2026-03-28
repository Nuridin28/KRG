"""Pydantic models / schemas for the AI Stylist & Virtual Try-On platform."""

from __future__ import annotations

import enum
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class StyleType(str, enum.Enum):
    CASUAL = "casual"
    OFFICE = "office"
    SPORT = "sport"
    EVENING = "evening"
    STREET = "street"
    SMART_CASUAL = "smart_casual"
    DATE = "date"
    TRAVEL = "travel"


class OccasionType(str, enum.Enum):
    DAILY = "daily"
    WORK = "work"
    DATE = "date"
    PARTY = "party"
    WORKOUT = "workout"
    TRAVEL = "travel"
    EVENT = "event"
    CASUAL = "casual"


class GenderType(str, enum.Enum):
    MALE = "male"
    FEMALE = "female"
    UNISEX = "unisex"


class CategoryType(str, enum.Enum):
    TOPS = "tops"
    BOTTOMS = "bottoms"
    OUTERWEAR = "outerwear"
    DRESSES = "dresses"
    SHOES = "shoes"
    ACCESSORIES = "accessories"


class TryOnJobStatus(str, enum.Enum):
    QUEUED = "queued"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"


class Product(BaseModel):
    id: str
    sku_id: str
    name: str
    brand: str
    category: CategoryType
    subcategory: str
    gender: GenderType
    description: str
    color: str
    color_name: str
    color_hex: str
    pattern: str = "solid"
    fit: str = "regular"
    material: str = ""
    price: float
    promo_price: Optional[float] = None
    currency: str = "USD"
    sizes: List[str] = []
    in_stock: bool = True
    image_url: str
    style_tags: List[str] = []
    occasion_tags: List[str] = []
    season: str = "all"
    seller_id: str = "marketplace"


class ProductBrief(BaseModel):
    id: str
    name: str
    brand: str
    category: CategoryType
    color_hex: str
    color_name: str
    price: float
    promo_price: Optional[float] = None
    image_url: str
    in_stock: bool = True


class OutfitItem(BaseModel):
    product: ProductBrief
    role: str
    replaceable: bool = True


class Outfit(BaseModel):
    id: str
    items: List[OutfitItem]
    style: str
    occasion: str
    total_price: float
    compatibility_score: float = Field(ge=0, le=100)
    explanation: str = ""
    badges: List[str] = []


class OutfitByProductRequest(BaseModel):
    product_id: str
    user_id: Optional[str] = None
    locale: str = "ru"
    style: Optional[str] = None
    occasion: Optional[str] = None
    budget_max: Optional[float] = None
    size_profile: Optional[Dict[str, str]] = None


class OutfitGenerateRequest(BaseModel):
    style: StyleType
    occasion: OccasionType
    gender: GenderType
    budget_min: Optional[float] = None
    budget_max: Optional[float] = None
    colors: Optional[List[str]] = None
    excluded_brands: Optional[List[str]] = None
    must_include_categories: Optional[List[str]] = None
    must_exclude_categories: Optional[List[str]] = None
    anchor_product_id: Optional[str] = None
    user_id: Optional[str] = None
    count: int = Field(default=3, ge=1, le=10)


class TryOnCreateRequest(BaseModel):
    product_id: str
    variant_id: Optional[str] = None
    user_id: Optional[str] = None


class TryOnJobResponse(BaseModel):
    job_id: str
    status: TryOnJobStatus
    progress: int = 0
    output_image_url: Optional[str] = None
    failure_reason: Optional[str] = None
    provider_used: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None
    current_step: Optional[str] = None  # e.g. "Примеряем: Рубашка Oxford (2/3)"
    total_items: int = 1
    completed_items: int = 0


class ChatMessage(BaseModel):
    role: str
    content: str
    image_url: Optional[str] = None


class ChatRequest(BaseModel):
    message: str
    image_url: Optional[str] = None
    locale: str = "ru"
    user_id: Optional[str] = None
    conversation_history: List[ChatMessage] = []


class ChatResponse(BaseModel):
    answer: str
    extracted_filters: Optional[Dict[str, Any]] = None
    recommended_products: List[ProductBrief] = []
    recommended_outfits: List[Outfit] = []
    explanations: List[str] = []
    cta_actions: List[Dict[str, Any]] = []


class CatalogFilters(BaseModel):
    category: Optional[CategoryType] = None
    gender: Optional[GenderType] = None
    style: Optional[str] = None
    occasion: Optional[str] = None
    brand: Optional[str] = None
    color: Optional[str] = None
    price_min: Optional[float] = None
    price_max: Optional[float] = None
    in_stock_only: bool = True
    search: Optional[str] = None
    page: int = 1
    page_size: int = 20


class CatalogResponse(BaseModel):
    items: List[Product]
    total: int
    page: int
    page_size: int
    total_pages: int
