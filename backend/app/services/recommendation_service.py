"""Recommendation service -- builds outfits from catalog using category composition and color theory."""

from __future__ import annotations

import random
import uuid
from typing import Dict, List, Optional

from app.models.schemas import (
    CategoryType,
    GenderType,
    Outfit,
    OutfitByProductRequest,
    OutfitGenerateRequest,
    OutfitItem,
    Product,
    ProductBrief,
)
from app.services.business_rules import (
    apply_business_rules,
    filter_by_budget,
    outfit_color_score,
    style_coherence_score,
    validate_outfit_composition,
)
from app.services.catalog_service import CatalogService

COMPLEMENTARY_MAP: Dict[str, List[str]] = {
    "tops": ["bottoms", "shoes", "accessories", "outerwear"],
    "bottoms": ["tops", "shoes", "accessories", "outerwear"],
    "dresses": ["shoes", "accessories", "outerwear"],
    "outerwear": ["tops", "bottoms", "shoes", "accessories"],
    "shoes": ["tops", "bottoms", "accessories"],
    "accessories": ["tops", "bottoms", "shoes"],
}

ROLE_MAP: Dict[str, str] = {
    "tops": "top",
    "bottoms": "bottom",
    "dresses": "dress",
    "outerwear": "outerwear",
    "shoes": "shoes",
    "accessories": "accessory",
}

EXPLANATION_TEMPLATES = [
    "Этот комплект подобран с учётом цветовой совместимости и стиля.",
    "Образ сочетает вещи, которые дополняют друг друга по стилю и цвету.",
    "Мы подобрали комплект, исходя из текущих трендов и вашего запроса.",
    "Классическое сочетание, подходящее для выбранного сценария.",
    "Образ составлен из вещей, которые часто покупают вместе.",
]


class RecommendationService:
    def __init__(self, catalog: CatalogService) -> None:
        self.catalog = catalog

    def _to_brief(self, p: Product) -> ProductBrief:
        return self.catalog.get_brief(p)

    def _pick_best(
        self,
        products: List[Product],
        anchor: Optional[Product] = None,
        count: int = 1,
    ) -> List[Product]:
        if not products:
            return []
        if anchor:
            scored = []
            for p in products:
                from app.services.business_rules import color_compatibility_score
                c_score = color_compatibility_score(
                    anchor.color_hex, anchor.color_name,
                    p.color_hex, p.color_name,
                )
                scored.append((c_score, p))
            scored.sort(key=lambda x: x[0], reverse=True)
            return [s[1] for s in scored[:count]]
        shuffled = products[:]
        random.shuffle(shuffled)
        return shuffled[:count]

    def _build_outfit(
        self,
        items: List[Product],
        style: str,
        occasion: str,
    ) -> Outfit:
        total = sum(p.promo_price or p.price for p in items)
        color_sc = outfit_color_score(items)
        style_sc = style_coherence_score(items, style)
        compat = round((color_sc * 0.6 + style_sc * 0.4), 1)

        badges: List[str] = []
        if compat >= 80:
            badges.append("Отличное сочетание")
        if all(p.in_stock for p in items):
            badges.append("Всё в наличии")
        if total < 150:
            badges.append("Бюджетный вариант")
        elif total > 400:
            badges.append("Премиум подборка")

        outfit_items = [
            OutfitItem(
                product=self._to_brief(p),
                role=ROLE_MAP.get(p.category.value, p.category.value),
                replaceable=True,
            )
            for p in items
        ]

        return Outfit(
            id=f"outfit-{uuid.uuid4().hex[:8]}",
            items=outfit_items,
            style=style,
            occasion=occasion,
            total_price=round(total, 2),
            compatibility_score=compat,
            explanation=random.choice(EXPLANATION_TEMPLATES),
            badges=badges,
        )

    def _assemble_outfit(
        self,
        gender: GenderType,
        style: str,
        occasion: str,
        budget_max: Optional[float] = None,
        anchor: Optional[Product] = None,
        excluded_brands: Optional[List[str]] = None,
        colors: Optional[List[str]] = None,
    ) -> Optional[Outfit]:
        all_products = self.catalog.products[:]
        all_products = [p for p in all_products if p.gender == gender or p.gender == GenderType.UNISEX]
        all_products = apply_business_rules(all_products, occasion)

        if excluded_brands:
            excl_lower = {b.lower() for b in excluded_brands}
            all_products = [p for p in all_products if p.brand.lower() not in excl_lower]

        if colors:
            color_lower = {c.lower() for c in colors}
            all_products = [p for p in all_products if p.color_name.lower() in color_lower or p.color_name.lower() in {"black", "white", "grey"}]

        if style:
            style_filtered = [p for p in all_products if style in p.style_tags]
            if len(style_filtered) >= 3:
                all_products = style_filtered

        if occasion:
            occ_filtered = [p for p in all_products if occasion in p.occasion_tags]
            if len(occ_filtered) >= 3:
                all_products = occ_filtered

        if budget_max:
            all_products = filter_by_budget(all_products, budget_max)

        by_cat: Dict[str, List[Product]] = {}
        for p in all_products:
            by_cat.setdefault(p.category.value, []).append(p)

        items: List[Product] = []

        if anchor:
            items.append(anchor)
            needed_cats = COMPLEMENTARY_MAP.get(anchor.category.value, [])
        else:
            has_dress = "dresses" in by_cat and by_cat["dresses"]
            use_dress = has_dress and random.random() < 0.3

            if use_dress:
                dress = self._pick_best(by_cat["dresses"], count=1)
                if dress:
                    items.append(dress[0])
                    needed_cats = ["shoes", "accessories"]
                else:
                    needed_cats = ["tops", "bottoms", "shoes"]
            else:
                needed_cats = ["tops", "bottoms", "shoes"]

        for cat in needed_cats:
            candidates = by_cat.get(cat, [])
            candidates = [c for c in candidates if c.id not in {it.id for it in items}]
            if candidates:
                ref = items[0] if items else None
                picked = self._pick_best(candidates, anchor=ref, count=1)
                if picked:
                    items.append(picked[0])

        if len(items) < 2:
            return None

        if budget_max:
            total = sum(p.promo_price or p.price for p in items)
            if total > budget_max * 1.05:
                return None

        return self._build_outfit(items, style, occasion)

    def generate_outfits(self, req: OutfitGenerateRequest) -> List[Outfit]:
        anchor = None
        if req.anchor_product_id:
            anchor = self.catalog.get_product(req.anchor_product_id)

        outfits: List[Outfit] = []
        attempts = 0
        max_attempts = req.count * 5

        while len(outfits) < req.count and attempts < max_attempts:
            attempts += 1
            outfit = self._assemble_outfit(
                gender=req.gender,
                style=req.style.value,
                occasion=req.occasion.value,
                budget_max=req.budget_max,
                anchor=anchor,
                excluded_brands=req.excluded_brands,
                colors=req.colors,
            )
            if outfit:
                existing_ids = {
                    frozenset(it.product.id for it in o.items)
                    for o in outfits
                }
                new_ids = frozenset(it.product.id for it in outfit.items)
                if new_ids not in existing_ids:
                    outfits.append(outfit)

        outfits.sort(key=lambda o: o.compatibility_score, reverse=True)
        return outfits

    def get_outfits_by_product(self, req: OutfitByProductRequest) -> List[Outfit]:
        anchor = self.catalog.get_product(req.product_id)
        if not anchor:
            return []

        style = req.style or (anchor.style_tags[0] if anchor.style_tags else "casual")
        occasion = req.occasion or (anchor.occasion_tags[0] if anchor.occasion_tags else "daily")

        outfits: List[Outfit] = []
        attempts = 0
        while len(outfits) < 3 and attempts < 15:
            attempts += 1
            outfit = self._assemble_outfit(
                gender=anchor.gender,
                style=style,
                occasion=occasion,
                budget_max=req.budget_max,
                anchor=anchor,
            )
            if outfit:
                existing_ids = {
                    frozenset(it.product.id for it in o.items)
                    for o in outfits
                }
                new_ids = frozenset(it.product.id for it in outfit.items)
                if new_ids not in existing_ids:
                    outfits.append(outfit)

        return outfits

    def get_recommendations(self, product_id: str) -> List[ProductBrief]:
        product = self.catalog.get_product(product_id)
        if not product:
            return []

        comp_cats = COMPLEMENTARY_MAP.get(product.category.value, [])
        candidates: List[Product] = []
        for cat in comp_cats:
            candidates.extend(self.catalog.get_by_category(cat))

        candidates = [
            c for c in candidates
            if c.in_stock and (c.gender == product.gender or c.gender == GenderType.UNISEX)
        ]

        picked = self._pick_best(candidates, anchor=product, count=8)
        return [self._to_brief(p) for p in picked]
