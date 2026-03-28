"""Event tracking endpoints."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import List, Optional

from fastapi import APIRouter, Query
from pydantic import BaseModel

router = APIRouter(prefix="/tracking", tags=["Tracking"])


class TrackingEvent(BaseModel):
    event_type: str
    user_id: str = "anonymous"
    product_id: Optional[str] = None
    outfit_id: Optional[str] = None
    metadata: dict = {}
    timestamp: datetime = datetime.now(timezone.utc)


_events: List[TrackingEvent] = []


@router.post("/events")
async def track_events(events: List[TrackingEvent]) -> dict:
    _events.extend(events)
    return {"tracked": len(events)}


@router.get("/events", response_model=List[TrackingEvent])
async def get_events(
    event_type: Optional[str] = None,
    user_id: Optional[str] = None,
    limit: int = Query(50, ge=1, le=500),
) -> List[TrackingEvent]:
    filtered = _events[:]
    if event_type:
        filtered = [e for e in filtered if e.event_type == event_type]
    if user_id:
        filtered = [e for e in filtered if e.user_id == user_id]
    return filtered[-limit:]
