"""Conversational styling assistant -- OpenAI-powered with keyword fallback."""

from __future__ import annotations

import json
import logging
import re
from typing import Any, Dict, List, Optional

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
from app.services.catalog_service import CatalogService
from app.services.recommendation_service import RecommendationService

logger = logging.getLogger(__name__)

OCCASION_KEYWORDS = {
    "офис": ("office", "work"),
    "office": ("office", "work"),
    "работа": ("office", "work"),
    "work": ("office", "work"),
    "свидание": ("date", "date"),
    "date": ("date", "date"),
    "вечер": ("evening", "party"),
    "evening": ("evening", "party"),
    "party": ("evening", "party"),
    "вечеринка": ("evening", "party"),
    "спорт": ("sport", "workout"),
    "sport": ("sport", "workout"),
    "тренировка": ("sport", "workout"),
    "casual": ("casual", "casual"),
    "кэжуал": ("casual", "casual"),
    "повседнев": ("casual", "daily"),
    "street": ("street", "casual"),
    "стрит": ("street", "casual"),
    "путешестви": ("travel", "travel"),
    "travel": ("travel", "travel"),
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
    "Office casual до $200",
    "Уличный стиль в чёрном цвете",
    "Что надеть на вечеринку?",
    "Повседневный образ для мужчины",
    "Спортивный лук до $100",
    "Элегантный образ на мероприятие",
    "Подбери лук для путешествия",
]

SYSTEM_PROMPT = """Ты — AI-стилист в fashion-маркетплейсе. Ты помогаешь пользователям подобрать образы и одежду.

Правила:
- Отвечай по-русски, кратко и дружелюбно.
- Никогда не комментируй тело или внешность пользователя.
- Не обещай точность виртуальной посадки одежды.
- Если пользователь спрашивает не про моду/одежду, вежливо верни его к теме.
- Извлекай из сообщения: стиль, повод, пол, бюджет, предпочтительные цвета.
- Если информации недостаточно, задай уточняющий вопрос.
- Давай конкретные советы по стилю с объяснениями.

Доступные стили: casual, office, sport, evening, street, smart_casual, date, travel
Доступные поводы: daily, work, date, party, workout, travel, event, casual
Пол: male, female, unisex"""

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
            "budget_max": {"type": "number"},
            "budget_min": {"type": "number"},
            "colors": {"type": "array", "items": {"type": "string"}},
            "needs_outfits": {"type": "boolean"},
        },
        "required": ["needs_outfits"],
    },
}


class StylistService:
    def __init__(self, catalog: CatalogService, recommender: RecommendationService) -> None:
        self.catalog = catalog
        self.recommender = recommender
        self._openai_client = None

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

        budget_match = re.search(r"(?:до|under|max|<)\s*\$?\s*(\d+)", text_lower)
        if budget_match:
            constraints["budget_max"] = float(budget_match.group(1))

        budget_min_match = re.search(r"(?:от|from|min|>)\s*\$?\s*(\d+)", text_lower)
        if budget_min_match:
            constraints["budget_min"] = float(budget_min_match.group(1))

        return constraints

    def _build_response_text(self, constraints: Dict[str, Any], outfits: List[Outfit]) -> str:
        if not outfits:
            return "К сожалению, не удалось подобрать образ с заданными параметрами. Попробуйте изменить фильтры."

        parts = ["Вот что я подобрал для вас!\n"]
        if constraints.get("occasion"):
            occ_names = {
                "work": "для работы/офиса",
                "date": "для свидания",
                "party": "для вечеринки",
                "casual": "на каждый день",
                "daily": "на каждый день",
                "workout": "для спорта",
                "travel": "для путешествия",
                "event": "для мероприятия",
            }
            occ_text = occ_names.get(constraints["occasion"], constraints["occasion"])
            parts.append(f"Образы подобраны {occ_text}.")
        if constraints.get("budget_max"):
            parts.append(f"Бюджет: до ${int(constraints['budget_max'])}.")
        parts.append(f"\nНашлось {len(outfits)} комплект(ов). Вы можете заменить любую вещь или добавить весь образ в корзину.")
        return " ".join(parts)

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

        constraints = self._extract_constraints_keyword(request.message)
        outfits, all_products = await self._generate_outfits_from_constraints(constraints)
        answer = self._build_response_text(constraints, outfits)

        explanations = []
        if constraints.get("occasion"):
            explanations.append(f"Образ подобран для случая: {constraints['occasion']}")
        if constraints.get("colors"):
            explanations.append(f"Учтены цвета: {', '.join(constraints['colors'])}")
        if constraints.get("budget_max"):
            explanations.append(f"Бюджет ограничен: до ${int(constraints['budget_max'])}")

        cta_actions = [
            {"type": "add_all_to_cart", "label": "Купить весь образ"},
            {"type": "save_outfit", "label": "Сохранить образ"},
            {"type": "try_on", "label": "Примерить"},
        ]

        return ChatResponse(
            answer=answer,
            extracted_filters=constraints,
            recommended_products=all_products,
            recommended_outfits=outfits,
            explanations=explanations,
            cta_actions=cta_actions,
        )

    async def _chat_openai(self, request: ChatRequest) -> ChatResponse:
        messages = [{"role": "system", "content": SYSTEM_PROMPT}]
        for msg in request.conversation_history[-10:]:
            messages.append({"role": msg.role, "content": msg.content})
        messages.append({"role": "user", "content": request.message})

        response = self._openai_client.chat.completions.create(
            model="gpt-4o-mini",
            messages=messages,
            tools=[{"type": "function", "function": EXTRACT_FUNCTION}],
            tool_choice="auto",
            temperature=0.7,
            max_tokens=800,
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
        all_products: List[ProductBrief] = []

        if needs_outfits and (constraints.get("style") or constraints.get("occasion")):
            outfits, all_products = await self._generate_outfits_from_constraints(constraints)
            if not answer and outfits:
                answer = self._build_response_text(constraints, outfits)

        if not answer:
            answer = "Подскажите, какой образ вы ищете? Я могу помочь подобрать одежду для любого повода."

        explanations = []
        if constraints.get("occasion"):
            explanations.append(f"Образ подобран для случая: {constraints['occasion']}")
        if constraints.get("colors"):
            colors = constraints["colors"]
            if isinstance(colors, list):
                explanations.append(f"Учтены цвета: {', '.join(colors)}")
        if constraints.get("budget_max"):
            explanations.append(f"Бюджет ограничен: до ${int(constraints['budget_max'])}")

        cta_actions = []
        if outfits:
            cta_actions = [
                {"type": "add_all_to_cart", "label": "Купить весь образ"},
                {"type": "save_outfit", "label": "Сохранить образ"},
                {"type": "try_on", "label": "Примерить"},
            ]

        return ChatResponse(
            answer=answer,
            extracted_filters=constraints if constraints else None,
            recommended_products=all_products,
            recommended_outfits=outfits,
            explanations=explanations,
            cta_actions=cta_actions,
        )

    @staticmethod
    def get_suggestions() -> List[str]:
        return SUGGESTIONS_RU
