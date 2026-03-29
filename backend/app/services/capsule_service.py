"""Capsule wardrobe service — analyzes user's wardrobe, finds gaps, recommends products."""

from __future__ import annotations

import random
import uuid
from typing import Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.db_models import WardrobeItem as WardrobeItemDB
from app.models.schemas import (
    CapsuleAnalysisResponse,
    CategoryType,
    GenderType,
    Outfit,
    OutfitItem,
    Product,
    ProductBrief,
)
from app.services.business_rules import color_compatibility_score, outfit_color_score, style_coherence_score
from app.services.catalog_service import CatalogService

# Minimum categories needed for a "complete" capsule
FULL_OUTFIT_COMBOS = [
    ["tops", "bottoms", "shoes"],
    ["dresses", "shoes"],
]

ROLE_MAP = {
    "tops": "top", "bottoms": "bottom", "dresses": "dress",
    "outerwear": "outerwear", "shoes": "shoes", "accessories": "accessory",
}


class CapsuleService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.catalog = CatalogService(db)

    async def get_wardrobe(self, user_id: int) -> list[WardrobeItemDB]:
        result = await self.db.execute(
            select(WardrobeItemDB)
            .where(WardrobeItemDB.user_id == user_id)
            .order_by(WardrobeItemDB.created_at.desc())
        )
        return list(result.scalars().all())

    async def add_item(self, user_id: int, product_id: str | None = None, **kwargs) -> WardrobeItemDB:
        if product_id:
            product = await self.catalog.get_product(product_id)
            if product:
                item = WardrobeItemDB(
                    user_id=user_id,
                    product_id=product.id,
                    category=product.category.value,
                    name=product.name,
                    color_name=product.color_name,
                    color_hex=product.color_hex,
                    image_url=product.image_url,
                    style_tags=product.style_tags,
                )
                self.db.add(item)
                await self.db.commit()
                await self.db.refresh(item)
                return item

        item = WardrobeItemDB(
            user_id=user_id,
            product_id=product_id,
            category=kwargs.get("category", "tops"),
            name=kwargs.get("name", ""),
            color_name=kwargs.get("color_name", ""),
            color_hex=kwargs.get("color_hex", ""),
            image_url=kwargs.get("image_url", ""),
            style_tags=kwargs.get("style_tags", []),
        )
        self.db.add(item)
        await self.db.commit()
        await self.db.refresh(item)
        return item

    async def remove_item(self, user_id: int, item_id: int) -> bool:
        result = await self.db.execute(
            select(WardrobeItemDB).where(
                WardrobeItemDB.id == item_id, WardrobeItemDB.user_id == user_id
            )
        )
        item = result.scalar_one_or_none()
        if not item:
            return False
        await self.db.delete(item)
        await self.db.commit()
        return True

    # ------------------------------------------------------------------
    # Capsule analysis
    # ------------------------------------------------------------------

    async def analyze(self, user_id: int, gender: str = "female") -> CapsuleAnalysisResponse:
        wardrobe = await self.get_wardrobe(user_id)
        if not wardrobe:
            return CapsuleAnalysisResponse(
                total_items=0,
                analysis_text="Ваш гардероб пуст. Добавьте вещи из каталога, чтобы получить анализ.",
            )

        by_cat: Dict[str, list[WardrobeItemDB]] = {}
        for item in wardrobe:
            by_cat.setdefault(item.category, []).append(item)

        # Find possible outfits
        outfits = self._enumerate_outfits(by_cat)

        # Find missing categories
        missing = self._find_missing_categories(by_cat)

        # Recommend products to fill gaps
        recs = await self._recommend_gap_fillers(wardrobe, missing, gender)

        # Build analysis text
        text = self._build_analysis_text(wardrobe, by_cat, outfits, missing)

        return CapsuleAnalysisResponse(
            total_items=len(wardrobe),
            possible_outfits=outfits,
            missing_categories=missing,
            gap_recommendations=recs,
            analysis_text=text,
        )

    def _enumerate_outfits(self, by_cat: Dict[str, list[WardrobeItemDB]]) -> list[Outfit]:
        outfits: list[Outfit] = []

        # Try tops+bottoms+shoes combos
        tops = by_cat.get("tops", [])
        bottoms = by_cat.get("bottoms", [])
        shoes = by_cat.get("shoes", [])

        for t in tops:
            for b in bottoms:
                for s in shoes[:2]:
                    outfit = self._build_outfit_from_wardrobe([t, b, s])
                    if outfit:
                        outfits.append(outfit)
                    if len(outfits) >= 6:
                        break
                if len(outfits) >= 6:
                    break
            if len(outfits) >= 6:
                break

        # Try dress+shoes combos
        dresses = by_cat.get("dresses", [])
        for d in dresses:
            for s in shoes[:2]:
                outfit = self._build_outfit_from_wardrobe([d, s])
                if outfit:
                    outfits.append(outfit)
                if len(outfits) >= 9:
                    break
            if len(outfits) >= 9:
                break

        outfits.sort(key=lambda o: o.compatibility_score, reverse=True)
        return outfits[:6]

    def _build_outfit_from_wardrobe(self, items: list[WardrobeItemDB]) -> Outfit | None:
        if len(items) < 2:
            return None

        # Build pseudo-Product objects for scoring
        products: list[Product] = []
        for it in items:
            p = Product(
                id=it.product_id or f"wardrobe-{it.id}",
                sku_id="",
                name=it.name,
                brand="",
                category=CategoryType(it.category) if it.category in [e.value for e in CategoryType] else CategoryType.TOPS,
                subcategory="",
                gender=GenderType.UNISEX,
                description="",
                color=it.color_name,
                color_name=it.color_name,
                color_hex=it.color_hex,
                price=0,
                image_url=it.image_url,
                style_tags=it.style_tags or [],
                occasion_tags=[],
            )
            products.append(p)

        color_sc = outfit_color_score(products)
        style_sc = style_coherence_score(products, "casual")
        compat = round(color_sc * 0.6 + style_sc * 0.4, 1)

        outfit_items = [
            OutfitItem(
                product=ProductBrief(
                    id=p.id, name=p.name, brand=p.brand, category=p.category,
                    color_hex=p.color_hex, color_name=p.color_name,
                    price=p.price, image_url=p.image_url, in_stock=True,
                ),
                role=ROLE_MAP.get(p.category.value, p.category.value),
                replaceable=False,
            )
            for p in products
        ]

        return Outfit(
            id=f"capsule-{uuid.uuid4().hex[:8]}",
            items=outfit_items,
            style="capsule",
            occasion="daily",
            total_price=0,
            compatibility_score=compat,
            explanation="Комбинация из вашего гардероба",
            badges=["Из вашего гардероба"] + (["Отличное сочетание"] if compat >= 80 else []),
        )

    def _find_missing_categories(self, by_cat: Dict[str, list]) -> list[str]:
        missing = []
        has = set(by_cat.keys())

        # Check if any full outfit combo is possible
        can_make_outfit = False
        for combo in FULL_OUTFIT_COMBOS:
            if all(c in has for c in combo):
                can_make_outfit = True
                break

        if not can_make_outfit:
            # Find the cheapest category set to complete an outfit
            for combo in FULL_OUTFIT_COMBOS:
                needed = [c for c in combo if c not in has]
                if len(needed) < len(missing) or not missing:
                    missing = needed

        # Also suggest accessories/outerwear if completely absent
        for cat in ["accessories", "outerwear"]:
            if cat not in has and cat not in missing:
                missing.append(cat)

        return missing

    async def _recommend_gap_fillers(
        self,
        wardrobe: list[WardrobeItemDB],
        missing_cats: list[str],
        gender: str,
    ) -> list[ProductBrief]:
        if not missing_cats:
            return []

        recs: list[ProductBrief] = []
        wardrobe_colors = [(it.color_hex, it.color_name) for it in wardrobe if it.color_hex]

        for cat in missing_cats[:3]:
            products = await self.catalog.get_by_category(cat)
            products = [
                p for p in products
                if p.in_stock and (p.gender.value == gender or p.gender == GenderType.UNISEX)
            ]

            if not products:
                continue

            # Score by color compatibility with existing wardrobe
            if wardrobe_colors:
                scored = []
                for p in products:
                    avg_compat = sum(
                        color_compatibility_score(wc[0], wc[1], p.color_hex, p.color_name)
                        for wc in wardrobe_colors
                    ) / len(wardrobe_colors)
                    scored.append((avg_compat, p))
                scored.sort(key=lambda x: x[0], reverse=True)
                products = [s[1] for s in scored]

            for p in products[:3]:
                recs.append(self.catalog.get_brief(p))

        return recs[:9]

    def _build_analysis_text(
        self,
        wardrobe: list,
        by_cat: dict,
        outfits: list,
        missing: list,
    ) -> str:
        lines = [f"В вашем гардеробе {len(wardrobe)} вещей."]

        cats_summary = ", ".join(f"{cat}: {len(items)}" for cat, items in by_cat.items())
        lines.append(f"Категории: {cats_summary}.")

        if outfits:
            lines.append(f"Из них можно собрать {len(outfits)} образов.")
        else:
            lines.append("Пока не хватает вещей для полноценного образа.")

        if missing:
            cat_names = {
                "tops": "верх", "bottoms": "низ", "shoes": "обувь",
                "dresses": "платья", "outerwear": "верхняя одежда", "accessories": "аксессуары",
            }
            missing_names = [cat_names.get(c, c) for c in missing]
            lines.append(f"Рекомендуем добавить: {', '.join(missing_names)}.")
            if outfits:
                extra = len(missing) * 2
                lines.append(f"Это даст ещё ~{extra}+ новых комбинаций.")

        return " ".join(lines)
