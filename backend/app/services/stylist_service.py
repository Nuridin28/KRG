"""Conversational styling assistant -- OpenAI-powered with semantic product search."""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Dict, List, Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.models.schemas import (
    ChatRequest,
    ChatResponse,
    GenderType,
    Outfit,
    OutfitGenerateRequest,
    OccasionType,
    ProductBrief,
    StyleType,
)
from app.services.catalog_service import CatalogService, _row_to_brief
from app.services.embedding_service import EmbeddingService
from app.services.recommendation_service import RecommendationService

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Keyword fallback dictionaries
# ---------------------------------------------------------------------------

OCCASION_KEYWORDS = {
    "офис": ("office", "work"), "office": ("office", "work"),
    "работа": ("office", "work"), "work": ("office", "work"),
    "свидание": ("date", "date"), "date": ("date", "date"),
    "вечер": ("evening", "party"), "evening": ("evening", "party"),
    "party": ("evening", "party"), "вечеринка": ("evening", "party"),
    "спорт": ("sport", "workout"), "sport": ("sport", "workout"),
    "тренировка": ("sport", "workout"),
    "casual": ("casual", "casual"), "кэжуал": ("casual", "casual"),
    "повседнев": ("casual", "daily"),
    "street": ("street", "casual"), "стрит": ("street", "casual"),
    "путешестви": ("travel", "travel"), "travel": ("travel", "travel"),
    "отпуск": ("travel", "travel"),
    "собеседован": ("office", "work"),
    "smart casual": ("smart_casual", "casual"),
}

COLOR_KEYWORDS = {
    "чёрн": "Black", "черн": "Black", "black": "Black",
    "бел": "White", "white": "White",
    "красн": "Red", "red": "Red",
    "син": "Blue", "blue": "Blue", "голуб": "Light Blue",
    "зелён": "Green", "зелен": "Green", "green": "Green",
    "серый": "Grey", "серая": "Grey", "grey": "Grey", "gray": "Grey",
    "розов": "Pink", "pink": "Pink",
    "бежев": "Beige", "beige": "Beige",
    "коричнев": "Brown", "brown": "Brown",
    "navy": "Navy",
}

GENDER_KEYWORDS = {
    "мужск": GenderType.MALE, "мужчин": GenderType.MALE, "male": GenderType.MALE, "men": GenderType.MALE,
    "женск": GenderType.FEMALE, "женщин": GenderType.FEMALE, "female": GenderType.FEMALE, "women": GenderType.FEMALE,
}

SUGGESTIONS_RU = [
    "Собери образ на свидание",
    "Office casual до 100 000 ₸",
    "Уличный стиль в чёрном цвете",
    "Что надеть на вечеринку?",
    "Повседневный образ для мужчины",
    "Спортивный лук до 50 000 ₸",
    "Элегантный образ на мероприятие",
    "Подбери лук для путешествия",
]

# ---------------------------------------------------------------------------
# System prompt
# ---------------------------------------------------------------------------

SYSTEM_PROMPT = """Ты — профессиональный AI-стилист в казахстанском fashion-маркетплейсе. Твоя задача — помогать людям выглядеть стильно и уверенно.

## Твоя экспертиза:
- Теория цвета: аналоговые, комплементарные, триадные сочетания
- Типы фигур и подходящие силуэты
- Актуальные тренды 2024-2025
- Капсульный гардероб и базовые вещи
- Дресс-коды: casual, smart casual, business casual, cocktail, black tie
- Сезонные особенности и layering

## Правила общения:
- Отвечай на русском языке, дружелюбно и с энтузиазмом
- Будь конкретным: вместо «что-нибудь яркое» говори «терракотовый свитер» или «юбка цвета морской волны»
- Объясняй ПОЧЕМУ это сочетание работает (цветовая гармония, пропорции, текстуры)
- Предлагай 2-3 альтернативы разной ценовой категории когда возможно
- Никогда не комментируй тело, вес или физические особенности пользователя
- Не обещай точность виртуальной примерки
- Если вопрос не про моду — вежливо верни к теме стиля

## Контекст товаров:
Тебе будут предоставлены товары из нашего каталога, наиболее релевантные запросу пользователя. Рекомендуй именно эти товары, называй их по имени и бренду. Если товаров нет — дай общие стилистические советы.

## Извлечение параметров:
Из каждого сообщения извлекай: стиль, повод, пол, бюджет, цвета. Если чего-то не хватает — спроси.

Доступные стили: casual, office, sport, evening, street, smart_casual, date, travel
Доступные поводы: daily, work, date, party, workout, travel, event, casual
Пол: male, female, unisex
Валюта: тенге (₸)"""

EXTRACT_FUNCTION = {
    "name": "extract_outfit_params",
    "description": "Извлечь параметры для подбора образа из запроса пользователя",
    "parameters": {
        "type": "object",
        "properties": {
            "style": {
                "type": "string",
                "enum": ["casual", "office", "sport", "evening", "street", "smart_casual", "date", "travel"],
            },
            "occasion": {
                "type": "string",
                "enum": ["daily", "work", "date", "party", "workout", "travel", "event", "casual"],
            },
            "gender": {"type": "string", "enum": ["male", "female", "unisex"]},
            "budget_max": {"type": "number", "description": "Максимальный бюджет в тенге"},
            "budget_min": {"type": "number", "description": "Минимальный бюджет в тенге"},
            "colors": {"type": "array", "items": {"type": "string"}},
            "needs_outfits": {"type": "boolean", "description": "Нужно ли генерировать образы"},
        },
        "required": ["needs_outfits"],
    },
}


class StylistService:
    def __init__(self, catalog: CatalogService, recommender: RecommendationService) -> None:
        self.catalog = catalog
        self.recommender = recommender
        self._openai_client = None
        self._embedding_service = EmbeddingService()

        if settings.OPENAI_API_KEY:
            try:
                import openai
                self._openai_client = openai.OpenAI(api_key=settings.OPENAI_API_KEY)
                logger.info("OpenAI stylist initialized successfully")
            except Exception as e:
                logger.warning(f"Failed to initialize OpenAI: {e}. Using keyword fallback.")

    def _extract_constraints_keyword(self, text: str) -> Dict[str, Any]:
        text_lower = text.lower()
        constraints: Dict[str, Any] = {}

        for kw, (style, occasion) in OCCASION_KEYWORDS.items():
            if kw in text_lower:
                constraints["style"] = style
                constraints["occasion"] = occasion
                break

        for kw, color in COLOR_KEYWORDS.items():
            if kw in text_lower:
                constraints.setdefault("colors", []).append(color)

        for kw, gender in GENDER_KEYWORDS.items():
            if kw in text_lower:
                constraints["gender"] = gender
                break

        budget_match = re.search(r"(?:до|under|max|<)\s*\$?\s*(\d[\d\s]*)", text_lower)
        if budget_match:
            constraints["budget_max"] = float(budget_match.group(1).replace(" ", ""))

        return constraints

    def _build_response_text(self, constraints: Dict[str, Any], outfits: List[Outfit]) -> str:
        if not outfits:
            return "К сожалению, не удалось подобрать образ с заданными параметрами. Попробуйте изменить фильтры."

        parts = ["Вот что я подобрал для вас!\n"]
        if constraints.get("occasion"):
            occ_names = {
                "work": "для работы/офиса", "date": "для свидания",
                "party": "для вечеринки", "casual": "на каждый день",
                "daily": "на каждый день", "workout": "для спорта",
                "travel": "для путешествия", "event": "для мероприятия",
            }
            occ_text = occ_names.get(constraints["occasion"], constraints["occasion"])
            parts.append(f"Образы подобраны {occ_text}.")
        if constraints.get("budget_max"):
            parts.append(f"Бюджет: до {int(constraints['budget_max']):,} ₸.".replace(",", " "))
        parts.append(f"\nНашлось {len(outfits)} комплект(ов). Вы можете заменить любую вещь или добавить весь образ в корзину.")
        return " ".join(parts)

    async def _search_relevant_products(self, query: str, gender: Optional[str] = None) -> List[ProductBrief]:
        """Search for products semantically relevant to the user query."""
        db: AsyncSession = self.catalog.db
        results = await self._embedding_service.search_products(
            db, query, top_k=12, gender=gender,
        )
        return [_row_to_brief(row) for row, score in results if score > 0.2]

    def _format_products_for_prompt(self, products: List[ProductBrief]) -> str:
        if not products:
            return "В каталоге нет подходящих товаров по этому запросу."

        lines = ["Вот товары из нашего каталога, релевантные запросу:"]
        for i, p in enumerate(products[:10], 1):
            price_str = f"{int(p.price):,}".replace(",", " ")
            currency = p.currency if p.currency != "USD" else "USD"
            lines.append(
                f"{i}. {p.name} ({p.brand}) — {price_str} {currency}"
                f" | Цвет: {p.color_name or 'н/д'} | Категория: {p.category}"
            )
        return "\n".join(lines)

    async def _generate_outfits_from_constraints(self, constraints: Dict[str, Any]) -> tuple[List[Outfit], List[ProductBrief]]:
        style = constraints.get("style", "casual")
        occasion = constraints.get("occasion", "daily")
        gender = constraints.get("gender", GenderType.FEMALE)

        try:
            style_enum = StyleType(style)
        except ValueError:
            style_enum = StyleType.CASUAL
        try:
            occasion_enum = OccasionType(occasion)
        except ValueError:
            occasion_enum = OccasionType.CASUAL

        gen_req = OutfitGenerateRequest(
            style=style_enum,
            occasion=occasion_enum,
            gender=gender if isinstance(gender, GenderType) else GenderType.FEMALE,
            budget_max=constraints.get("budget_max"),
            budget_min=constraints.get("budget_min"),
            colors=constraints.get("colors"),
            count=3,
        )

        outfits = await self.recommender.generate_outfits(gen_req)

        all_products: List[ProductBrief] = []
        for outfit in outfits:
            for item in outfit.items:
                if item.product.id not in {p.id for p in all_products}:
                    all_products.append(item.product)

        return outfits, all_products

    async def chat(self, request: ChatRequest) -> ChatResponse:
        if self._openai_client:
            try:
                return await self._chat_openai(request)
            except Exception as e:
                logger.warning(f"OpenAI call failed, falling back to keyword: {e}")

        # Keyword fallback
        constraints = self._extract_constraints_keyword(request.message)
        outfits, all_products = await self._generate_outfits_from_constraints(constraints)
        answer = self._build_response_text(constraints, outfits)

        return ChatResponse(
            answer=answer,
            extracted_filters=constraints,
            recommended_products=all_products,
            recommended_outfits=outfits,
            explanations=[],
            cta_actions=[
                {"type": "add_all_to_cart", "label": "Купить весь образ"},
                {"type": "try_on", "label": "Примерить"},
            ] if outfits else [],
        )

    async def _chat_openai(self, request: ChatRequest) -> ChatResponse:
        # 1. Search relevant products by user message
        relevant_products = await self._search_relevant_products(request.message)
        product_context = self._format_products_for_prompt(relevant_products)

        # 2. Build messages with product context
        messages = [
            {"role": "system", "content": SYSTEM_PROMPT},
            {"role": "system", "content": product_context},
        ]
        for msg in request.conversation_history[-10:]:
            messages.append({"role": msg.role, "content": msg.content})
        messages.append({"role": "user", "content": request.message})

        # 3. Call OpenAI
        response = self._openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            tools=[{"type": "function", "function": EXTRACT_FUNCTION}],
            tool_choice="auto",
            temperature=0.7,
            max_tokens=1000,
        )

        choice = response.choices[0]
        answer = choice.message.content or ""
        constraints: Dict[str, Any] = {}
        needs_outfits = False

        if choice.message.tool_calls:
            for tool_call in choice.message.tool_calls:
                if tool_call.function.name == "extract_outfit_params":
                    try:
                        params = json.loads(tool_call.function.arguments)
                        if params.get("style"):
                            constraints["style"] = params["style"]
                        if params.get("occasion"):
                            constraints["occasion"] = params["occasion"]
                        if params.get("gender"):
                            constraints["gender"] = GenderType(params["gender"])
                        if params.get("budget_max"):
                            constraints["budget_max"] = params["budget_max"]
                        if params.get("budget_min"):
                            constraints["budget_min"] = params["budget_min"]
                        if params.get("colors"):
                            constraints["colors"] = params["colors"]
                        needs_outfits = params.get("needs_outfits", False)
                    except (json.JSONDecodeError, ValueError) as e:
                        logger.warning(f"Failed to parse function call: {e}")

        outfits: List[Outfit] = []
        all_products: List[ProductBrief] = relevant_products[:]

        if needs_outfits and (constraints.get("style") or constraints.get("occasion")):
            outfits, outfit_products = await self._generate_outfits_from_constraints(constraints)
            # Merge outfit products with relevant products
            existing_ids = {p.id for p in all_products}
            for p in outfit_products:
                if p.id not in existing_ids:
                    all_products.append(p)

            if not answer and outfits:
                answer = self._build_response_text(constraints, outfits)

        if not answer:
            answer = "Подскажите, какой образ вы ищете? Я могу помочь подобрать одежду для любого повода — от повседневного стиля до вечернего выхода."

        explanations = []
        if constraints.get("occasion"):
            explanations.append(f"Образ подобран для случая: {constraints['occasion']}")
        if constraints.get("colors"):
            colors = constraints["colors"]
            if isinstance(colors, list):
                explanations.append(f"Учтены цвета: {', '.join(colors)}")
        if constraints.get("budget_max"):
            explanations.append(f"Бюджет: до {int(constraints['budget_max']):,} ₸".replace(",", " "))

        cta_actions = []
        if outfits:
            cta_actions = [
                {"type": "add_all_to_cart", "label": "Купить весь образ"},
                {"type": "try_on", "label": "Примерить"},
            ]

        return ChatResponse(
            answer=answer,
            extracted_filters=constraints if constraints else None,
            recommended_products=all_products[:12],
            recommended_outfits=outfits,
            explanations=explanations,
            cta_actions=cta_actions,
        )

    @staticmethod
    def get_suggestions() -> List[str]:
        return SUGGESTIONS_RU
