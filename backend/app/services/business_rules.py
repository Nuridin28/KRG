"""Business rules and color theory utilities for outfit validation."""

from __future__ import annotations

import colorsys
from typing import List, Optional, Set

from app.models.schemas import CategoryType, Product

NEUTRAL_COLORS: Set[str] = {
    "black", "white", "grey", "gray", "beige", "charcoal",
    "silver", "cream", "ivory", "navy",
}


def hex_to_hsl(hex_color: str) -> tuple:
    hex_color = hex_color.lstrip("#")
    r, g, b = (int(hex_color[i : i + 2], 16) / 255.0 for i in (0, 2, 4))
    h, l_val, s = colorsys.rgb_to_hls(r, g, b)
    return h * 360, s, l_val


def is_neutral(color_name: str) -> bool:
    return color_name.lower() in NEUTRAL_COLORS


def hue_distance(h1: float, h2: float) -> float:
    diff = abs(h1 - h2) % 360
    return min(diff, 360 - diff)


def color_compatibility_score(hex1: str, name1: str, hex2: str, name2: str) -> float:
    if is_neutral(name1) or is_neutral(name2):
        return 90.0
    h1, s1, l1 = hex_to_hsl(hex1)
    h2, s2, l2 = hex_to_hsl(hex2)
    hd = hue_distance(h1, h2)
    score = 0.0
    if hd < 15:
        ld = abs(l1 - l2)
        score = max(score, 85.0 + ld * 10 if ld > 0.15 else 60.0)
    if hd < 30:
        score = max(score, 80.0 - hd * 0.5)
    comp_close = abs(hd - 180)
    if comp_close < 20:
        score = max(score, 88.0 - comp_close * 0.5)
    tri_close = abs(hd - 120)
    if tri_close < 15:
        score = max(score, 75.0 - tri_close * 0.5)
    if score == 0:
        bad_dist = abs(hd - 70)
        score = max(30.0, min(65.0, 30.0 + bad_dist * 0.7))
    return round(min(100.0, score), 1)


def outfit_color_score(products: List[Product]) -> float:
    if len(products) < 2:
        return 85.0
    scores: List[float] = []
    for i in range(len(products)):
        for j in range(i + 1, len(products)):
            scores.append(color_compatibility_score(
                products[i].color_hex, products[i].color_name,
                products[j].color_hex, products[j].color_name,
            ))
    return round(sum(scores) / len(scores), 1)


STYLE_SUBCATEGORIES = {
    "casual": {"t-shirt", "shirt", "hoodie", "sweatshirt", "jeans", "chinos",
               "shorts", "sneakers", "loafers", "watch", "sunglasses", "bag", "cap"},
    "office": {"shirt", "blazer", "blouse", "trousers", "pencil_skirt", "chinos",
               "oxfords", "loafers", "heels", "watch", "belt", "bag"},
    "sport": {"t-shirt", "tank_top", "hoodie", "shorts", "joggers", "trainers",
              "cap", "sports_bag"},
    "evening": {"blazer", "blouse", "dress_shirt", "trousers", "midi_skirt",
                "cocktail_dress", "heels", "oxfords", "clutch", "jewelry", "scarf"},
    "street": {"hoodie", "sweatshirt", "jacket", "cargo_pants", "jeans", "sneakers",
               "boots", "cap", "sunglasses", "crossbody_bag"},
    "smart_casual": {"shirt", "polo", "blazer", "chinos", "trousers", "loafers",
                     "sneakers", "watch", "belt"},
    "date": {"blouse", "dress_shirt", "blazer", "trousers", "midi_skirt", "heels",
             "loafers", "jewelry", "clutch", "scarf"},
    "travel": {"t-shirt", "hoodie", "jacket", "jeans", "shorts", "sneakers",
               "backpack", "sunglasses", "cap"},
}

REQUIRED_CATEGORIES = {
    "full_outfit": [CategoryType.TOPS, CategoryType.BOTTOMS, CategoryType.SHOES],
    "with_dress": [CategoryType.DRESSES, CategoryType.SHOES],
}

OCCASION_CATEGORY_EXCLUSIONS = {
    "work": {"shorts", "tank_top", "flip_flops", "cap"},
    "party": set(),
    "workout": set(),
}


def style_coherence_score(products: List[Product], style: str) -> float:
    preferred = STYLE_SUBCATEGORIES.get(style, set())
    if not preferred:
        return 50.0
    matches = sum(1 for p in products if p.subcategory in preferred)
    return round((matches / len(products)) * 100, 1) if products else 0


def validate_outfit_composition(products: List[Product], placement: str = "full_outfit") -> bool:
    cats = {p.category for p in products}
    required = REQUIRED_CATEGORIES.get(placement, REQUIRED_CATEGORIES["full_outfit"])
    has_full = all(c in cats for c in required)
    has_dress = CategoryType.DRESSES in cats and CategoryType.SHOES in cats
    return has_full or has_dress


def filter_by_availability(products: List[Product]) -> List[Product]:
    return [p for p in products if p.in_stock]


def filter_by_budget(products: List[Product], budget_max: Optional[float], tolerance_pct: float = 5.0) -> List[Product]:
    if budget_max is None:
        return products
    limit = budget_max * (1 + tolerance_pct / 100)
    return [p for p in products if p.price <= limit]


def apply_business_rules(products: List[Product], occasion: Optional[str] = None) -> List[Product]:
    result = filter_by_availability(products)
    if occasion and occasion in OCCASION_CATEGORY_EXCLUSIONS:
        excluded = OCCASION_CATEGORY_EXCLUSIONS[occasion]
        result = [p for p in result if p.subcategory not in excluded]
    result = [p for p in result if p.image_url]
    return result
