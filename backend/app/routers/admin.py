"""Admin / backoffice endpoints."""

from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Dict, List

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/admin", tags=["Admin"])


class AdminRule(BaseModel):
    id: str = ""
    rule_type: str
    config: dict
    active: bool = True


class ProviderStatus(BaseModel):
    name: str
    status: str
    latency_ms: float | None = None
    last_check: datetime


_rules: Dict[str, AdminRule] = {}
_feature_flags: Dict[str, bool] = {
    "outfit_recommendations": True,
    "virtual_tryon": True,
    "conversational_stylist": True,
    "show_explanations": True,
    "ab_testing": False,
}


@router.get("/rules", response_model=List[AdminRule])
async def list_rules() -> List[AdminRule]:
    return list(_rules.values())


@router.post("/rules", response_model=AdminRule)
async def create_rule(rule: AdminRule) -> AdminRule:
    rule.id = f"rule-{uuid.uuid4().hex[:8]}"
    _rules[rule.id] = rule
    return rule


@router.put("/rules/{rule_id}", response_model=AdminRule)
async def update_rule(rule_id: str, rule: AdminRule) -> AdminRule:
    if rule_id not in _rules:
        raise HTTPException(404, "Rule not found")
    rule.id = rule_id
    _rules[rule_id] = rule
    return rule


@router.delete("/rules/{rule_id}")
async def delete_rule(rule_id: str) -> dict:
    if rule_id not in _rules:
        raise HTTPException(404, "Rule not found")
    del _rules[rule_id]
    return {"deleted": rule_id}


@router.get("/stats")
async def get_stats() -> dict:
    return {
        "total_products": 37,
        "total_outfits_generated": 156,
        "total_tryon_jobs": 42,
        "tryon_success_rate": 0.92,
        "avg_outfit_ctr": 0.18,
        "avg_tryon_latency_ms": 3200,
        "active_rules": len([r for r in _rules.values() if r.active]),
        "daily_active_users": 1240,
        "revenue_uplift_percent": 12.5,
    }


@router.get("/providers", response_model=List[ProviderStatus])
async def get_providers() -> List[ProviderStatus]:
    now = datetime.now(timezone.utc)
    return [
        ProviderStatus(name="Mapp Fashion API", status="healthy", latency_ms=120, last_check=now),
        ProviderStatus(name="Vertex AI Virtual Try-On", status="healthy", latency_ms=2800, last_check=now),
        ProviderStatus(name="FASHN API (backup)", status="standby", latency_ms=None, last_check=now),
        ProviderStatus(name="OpenAI API", status="healthy", latency_ms=450, last_check=now),
    ]


@router.get("/feature-flags")
async def get_feature_flags() -> dict:
    return _feature_flags


@router.post("/feature-flags")
async def update_feature_flags(flags: Dict[str, bool]) -> dict:
    _feature_flags.update(flags)
    return _feature_flags
