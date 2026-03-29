"""Capsule wardrobe service — GPT Vision photo analysis + smart recommendations."""

from __future__ import annotations

import base64
import json
import logging
import uuid
from pathlib import Path
from typing import Dict, List, Optional

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.db_models import WardrobeItem as WardrobeItemDB
from app.models.schemas import (
    CapsuleAnalysisResponse,
    CategoryType,
    GenderType,
    Outfit,
    OutfitItem,
    Product,
    ProductBrief,
    RecommendationInsight,
)
from app.services.business_rules import color_compatibility_score, outfit_color_score, style_coherence_score
from app.services.catalog_service import CatalogService

logger = logging.getLogger(__name__)

IMAGE_DIR = Path(settings.IMAGE_STORAGE_PATH)

ROLE_MAP = {
    "tops": "top", "bottoms": "bottom", "dresses": "dress",
    "outerwear": "outerwear", "shoes": "shoes", "accessories": "accessory",
}

VISION_PROMPT = """Analyze this clothing item photo. Return JSON only, no markdown:
{
  "category": "tops|bottoms|dresses|outerwear|shoes|accessories",
  "name": "short descriptive name in Russian, e.g. Белая хлопковая рубашка",
  "color_name": "main color name in Russian",
  "color_hex": "#hex color code",
  "style_tags": ["casual", "office", "sport", "evening", "street"],
  "material_guess": "cotton/polyester/leather/etc"
}
Be specific about the item. Return ONLY valid JSON."""

ANALYSIS_PROMPT = """You are a professional fashion stylist. Analyze this wardrobe and provide recommendations.

WARDROBE ITEMS:
{wardrobe_json}

AVAILABLE PRODUCTS IN OUR CATALOG:
{catalog_json}

TASK: Analyze the wardrobe and recommend 3-5 specific products from the catalog that would:
1. Create the MOST new outfit combinations with existing items
2. Fill style gaps (missing categories, colors, styles)
3. Be most versatile (work with multiple existing items)

For each recommendation, calculate exactly how many NEW outfits it would enable.

Return JSON only, no markdown:
{{
  "summary": "2-3 sentence analysis of the wardrobe in Russian — strengths, gaps, style profile",
  "current_outfits_count": <number of possible outfits from current wardrobe>,
  "recommendations": [
    {{
      "product_id": "id from catalog",
      "reason": "short compelling reason in Russian why this item is needed",
      "new_outfits_count": <how many NEW outfits this single purchase enables>,
      "pairs_with": ["names of existing wardrobe items it pairs with"],
      "marketing_hook": "catchy one-liner in Russian, e.g. '+4 новых образа за одну покупку!'"
    }}
  ],
  "style_tips": ["2-3 short style tips in Russian based on their wardrobe"]
}}
Return ONLY valid JSON."""


class CapsuleService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.catalog = CatalogService(db)
        self._openai = None
        if settings.OPENAI_API_KEY:
            import openai
            self._openai = openai.OpenAI(api_key=settings.OPENAI_API_KEY)

    async def get_wardrobe(self, user_id: int) -> list[WardrobeItemDB]:
        result = await self.db.execute(
            select(WardrobeItemDB)
            .where(WardrobeItemDB.user_id == user_id)
            .order_by(WardrobeItemDB.created_at.desc())
        )
        return list(result.scalars().all())

    # ------------------------------------------------------------------
    # Photo analysis via GPT Vision
    # ------------------------------------------------------------------

    async def add_item_from_photo(
        self, user_id: int, image_bytes: bytes, filename: str
    ) -> WardrobeItemDB:
        """Analyze clothing photo with GPT Vision and save to wardrobe."""
        # Save image to disk
        user_dir = IMAGE_DIR / "wardrobe" / str(user_id)
        user_dir.mkdir(parents=True, exist_ok=True)
        safe_name = f"{uuid.uuid4().hex[:10]}.jpg"
        filepath = user_dir / safe_name
        filepath.write_bytes(image_bytes)
        image_url = f"/storage/images/wardrobe/{user_id}/{safe_name}"

        # Analyze with GPT Vision
        analysis = await self._analyze_photo(image_bytes)

        item = WardrobeItemDB(
            user_id=user_id,
            product_id=None,
            category=analysis.get("category", "tops"),
            name=analysis.get("name", "Вещь из гардероба"),
            color_name=analysis.get("color_name", ""),
            color_hex=analysis.get("color_hex", "#888888"),
            image_url=image_url,
            style_tags=analysis.get("style_tags", []),
        )
        self.db.add(item)
        await self.db.commit()
        await self.db.refresh(item)
        return item

    async def _analyze_photo(self, image_bytes: bytes) -> dict:
        """Use GPT-4 Vision to identify clothing from photo."""
        if not self._openai:
            return {"category": "tops", "name": "Вещь", "color_name": "Неизвестный", "color_hex": "#888888", "style_tags": ["casual"]}

        import asyncio
        b64 = base64.b64encode(image_bytes).decode("utf-8")

        def _call():
            resp = self._openai.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{
                    "role": "user",
                    "content": [
                        {"type": "text", "text": VISION_PROMPT},
                        {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{b64}", "detail": "low"}},
                    ],
                }],
                max_tokens=300,
                temperature=0.1,
            )
            return resp.choices[0].message.content

        try:
            raw = await asyncio.to_thread(_call)
            # Clean markdown fences if present
            raw = raw.strip()
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
                if raw.endswith("```"):
                    raw = raw[:-3]
                raw = raw.strip()
            return json.loads(raw)
        except Exception as e:
            logger.error(f"GPT Vision analysis failed: {e}")
            return {"category": "tops", "name": "Вещь", "color_name": "Неизвестный", "color_hex": "#888888", "style_tags": ["casual"]}

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
    # GPT-powered capsule analysis
    # ------------------------------------------------------------------

    async def analyze(self, user_id: int, gender: str = "female") -> CapsuleAnalysisResponse:
        wardrobe = await self.get_wardrobe(user_id)
        if not wardrobe:
            return CapsuleAnalysisResponse(
                total_items=0,
                analysis_text="Ваш гардероб пуст. Загрузите фото своих вещей, чтобы получить персональный анализ.",
            )

        by_cat: Dict[str, list[WardrobeItemDB]] = {}
        for item in wardrobe:
            by_cat.setdefault(item.category, []).append(item)

        # Enumerate current outfits
        outfits = self._enumerate_outfits(by_cat)
        missing = self._find_missing_categories(by_cat)

        # Get catalog products for recommendations
        all_products = await self.catalog.get_all_products()
        all_products = [
            p for p in all_products
            if p.in_stock and (p.gender.value == gender or p.gender == GenderType.UNISEX)
        ]

        # GPT analysis with marketing insights
        gpt_analysis = await self._gpt_analyze(wardrobe, all_products, outfits)

        # Build recommendation insights
        insights: list[RecommendationInsight] = []
        gap_recs: list[ProductBrief] = []

        if gpt_analysis and gpt_analysis.get("recommendations"):
            for rec in gpt_analysis["recommendations"]:
                pid = rec.get("product_id", "")
                product = next((p for p in all_products if p.id == pid), None)
                if product:
                    gap_recs.append(self.catalog.get_brief(product))
                    insights.append(RecommendationInsight(
                        product_id=pid,
                        reason=rec.get("reason", ""),
                        new_outfits_count=rec.get("new_outfits_count", 0),
                        pairs_with=rec.get("pairs_with", []),
                        marketing_hook=rec.get("marketing_hook", ""),
                    ))

        # Fallback if GPT didn't work
        if not gap_recs:
            gap_recs = await self._recommend_gap_fillers(wardrobe, missing, gender)

        analysis_text = ""
        style_tips: list[str] = []
        if gpt_analysis:
            analysis_text = gpt_analysis.get("summary", "")
            style_tips = gpt_analysis.get("style_tips", [])

        if not analysis_text:
            analysis_text = self._build_fallback_text(wardrobe, by_cat, outfits, missing)

        return CapsuleAnalysisResponse(
            total_items=len(wardrobe),
            current_outfits_count=len(outfits),
            possible_outfits=outfits[:6],
            missing_categories=missing,
            gap_recommendations=gap_recs,
            recommendation_insights=insights,
            analysis_text=analysis_text,
            style_tips=style_tips,
        )

    async def _gpt_analyze(
        self,
        wardrobe: list[WardrobeItemDB],
        catalog_products: list[Product],
        current_outfits: list[Outfit],
    ) -> dict | None:
        if not self._openai:
            return None

        import asyncio

        wardrobe_json = json.dumps([
            {"name": w.name, "category": w.category, "color": w.color_name, "style_tags": w.style_tags or []}
            for w in wardrobe
        ], ensure_ascii=False)

        # Send top 30 catalog products as options
        catalog_json = json.dumps([
            {"id": p.id, "name": p.name, "brand": p.brand, "category": p.category.value,
             "color": p.color_name, "price": p.price, "currency": p.currency,
             "style_tags": p.style_tags}
            for p in catalog_products[:30]
        ], ensure_ascii=False)

        prompt = ANALYSIS_PROMPT.format(
            wardrobe_json=wardrobe_json,
            catalog_json=catalog_json,
        )

        def _call():
            resp = self._openai.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=1000,
                temperature=0.3,
            )
            return resp.choices[0].message.content

        try:
            raw = await asyncio.to_thread(_call)
            raw = raw.strip()
            if raw.startswith("```"):
                raw = raw.split("\n", 1)[1] if "\n" in raw else raw[3:]
                if raw.endswith("```"):
                    raw = raw[:-3]
                raw = raw.strip()
            return json.loads(raw)
        except Exception as e:
            logger.error(f"GPT capsule analysis failed: {e}")
            return None

    # ------------------------------------------------------------------
    # Outfit enumeration (unchanged logic)
    # ------------------------------------------------------------------

    def _enumerate_outfits(self, by_cat: Dict[str, list[WardrobeItemDB]]) -> list[Outfit]:
        outfits: list[Outfit] = []
        tops = by_cat.get("tops", [])
        bottoms = by_cat.get("bottoms", [])
        shoes = by_cat.get("shoes", [])

        for t in tops:
            for b in bottoms:
                for s in shoes[:3]:
                    outfit = self._build_outfit_from_wardrobe([t, b, s])
                    if outfit:
                        outfits.append(outfit)
                    if len(outfits) >= 12:
                        break
                if len(outfits) >= 12:
                    break
            if len(outfits) >= 12:
                break

        dresses = by_cat.get("dresses", [])
        for d in dresses:
            for s in shoes[:3]:
                outfit = self._build_outfit_from_wardrobe([d, s])
                if outfit:
                    outfits.append(outfit)
                if len(outfits) >= 15:
                    break
            if len(outfits) >= 15:
                break

        outfits.sort(key=lambda o: o.compatibility_score, reverse=True)
        return outfits

    def _build_outfit_from_wardrobe(self, items: list[WardrobeItemDB]) -> Outfit | None:
        if len(items) < 2:
            return None

        products: list[Product] = []
        for it in items:
            cat = it.category
            if cat not in [e.value for e in CategoryType]:
                cat = "tops"
            p = Product(
                id=it.product_id or f"wardrobe-{it.id}",
                sku_id="", name=it.name, brand="",
                category=CategoryType(cat), subcategory="",
                gender=GenderType.UNISEX, description="",
                color=it.color_name, color_name=it.color_name, color_hex=it.color_hex,
                price=0, image_url=it.image_url,
                style_tags=it.style_tags or [], occasion_tags=[],
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
            items=outfit_items, style="capsule", occasion="daily",
            total_price=0, compatibility_score=compat,
            explanation="Комбинация из вашего гардероба",
            badges=["Из вашего гардероба"] + (["Отличное сочетание"] if compat >= 80 else []),
        )

    def _find_missing_categories(self, by_cat: Dict[str, list]) -> list[str]:
        missing = []
        has = set(by_cat.keys())
        can_make_outfit = any(all(c in has for c in combo) for combo in [["tops", "bottoms", "shoes"], ["dresses", "shoes"]])

        if not can_make_outfit:
            for combo in [["tops", "bottoms", "shoes"], ["dresses", "shoes"]]:
                needed = [c for c in combo if c not in has]
                if len(needed) < len(missing) or not missing:
                    missing = needed

        for cat in ["accessories", "outerwear"]:
            if cat not in has and cat not in missing:
                missing.append(cat)

        return missing

    async def _recommend_gap_fillers(self, wardrobe, missing_cats, gender) -> list[ProductBrief]:
        if not missing_cats:
            return []
        recs = []
        wardrobe_colors = [(it.color_hex, it.color_name) for it in wardrobe if it.color_hex]
        for cat in missing_cats[:3]:
            products = await self.catalog.get_by_category(cat)
            products = [p for p in products if p.in_stock and (p.gender.value == gender or p.gender == GenderType.UNISEX)]
            if not products:
                continue
            if wardrobe_colors:
                scored = [(sum(color_compatibility_score(wc[0], wc[1], p.color_hex, p.color_name) for wc in wardrobe_colors) / len(wardrobe_colors), p) for p in products]
                scored.sort(key=lambda x: x[0], reverse=True)
                products = [s[1] for s in scored]
            for p in products[:3]:
                recs.append(self.catalog.get_brief(p))
        return recs[:9]

    def _build_fallback_text(self, wardrobe, by_cat, outfits, missing) -> str:
        lines = [f"В вашем гардеробе {len(wardrobe)} вещей."]
        cats_summary = ", ".join(f"{cat}: {len(items)}" for cat, items in by_cat.items())
        lines.append(f"Категории: {cats_summary}.")
        if outfits:
            lines.append(f"Из них можно собрать {len(outfits)} образов.")
        else:
            lines.append("Пока не хватает вещей для полноценного образа.")
        if missing:
            cat_names = {"tops": "верх", "bottoms": "низ", "shoes": "обувь", "dresses": "платья", "outerwear": "верхняя одежда", "accessories": "аксессуары"}
            lines.append(f"Рекомендуем добавить: {', '.join(cat_names.get(c, c) for c in missing)}.")
        return " ".join(lines)
