"""Event tracking endpoints — backed by PostgreSQL."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.models.db_models import TrackingEvent as TrackingEventDB

router = APIRouter(prefix="/tracking", tags=["Tracking"])


class TrackingEvent(BaseModel):
    event_type: str = Field(..., description="Тип события: `view`, `click`, `tryon`, `outfit_generate`, ...")
    user_id: str = Field("anonymous", description="ID пользователя или `anonymous` для гостей")
    product_id: Optional[str] = Field(None, description="ID товара, к которому относится событие")
    outfit_id: Optional[str] = Field(None, description="ID образа, к которому относится событие")
    metadata: dict = Field(default_factory=dict, description="Произвольные доп. поля события")
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class TrackingEventResponse(BaseModel):
    id: int
    event_type: str
    user_id: str
    product_id: Optional[str]
    outfit_id: Optional[str]
    metadata_json: dict
    timestamp: datetime

    class Config:
        from_attributes = True


@router.post(
    "/events",
    summary="Отправить пакет событий",
    description=(
        "Принимает массив аналитических событий и сохраняет их одной транзакцией. "
        "Эндпоинт публичный — пишите события и из браузера (фронт), и из бекенд-сервисов."
    ),
    responses={
        200: {
            "description": "События приняты",
            "content": {"application/json": {"example": {"tracked": 3}}},
        }
    },
)
async def track_events(
    events: List[TrackingEvent],
    db: AsyncSession = Depends(get_db),
) -> dict:
    for e in events:
        row = TrackingEventDB(
            event_type=e.event_type,
            user_id=e.user_id,
            product_id=e.product_id,
            outfit_id=e.outfit_id,
            metadata_json=e.metadata,
            timestamp=e.timestamp,
        )
        db.add(row)
    await db.commit()
    return {"tracked": len(events)}


@router.get(
    "/events",
    response_model=List[TrackingEventResponse],
    summary="Выборка событий",
    description=(
        "Возвращает последние события с возможностью фильтрации по `event_type` и/или `user_id`. "
        "Используется в админ-панели и BI-выгрузках."
    ),
)
async def get_events(
    event_type: Optional[str] = Query(None, description="Фильтр по типу события"),
    user_id: Optional[str] = Query(None, description="Фильтр по пользователю"),
    limit: int = Query(50, ge=1, le=500, description="Максимальное число событий в выборке"),
    db: AsyncSession = Depends(get_db),
) -> List[TrackingEventResponse]:
    query = select(TrackingEventDB)
    if event_type:
        query = query.where(TrackingEventDB.event_type == event_type)
    if user_id:
        query = query.where(TrackingEventDB.user_id == user_id)
    query = query.order_by(TrackingEventDB.timestamp.desc()).limit(limit)

    result = await db.execute(query)
    return result.scalars().all()
