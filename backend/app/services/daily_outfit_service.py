"""Daily outfit service — generates personalized outfit of the day."""

from __future__ import annotations

import logging
from datetime import date

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.db_models import DailyOutfit, User
from app.models.schemas import (
    DailyOutfitResponse,
    GenderType,
    OccasionType,
    Outfit,
    OutfitGenerateRequest,
    StyleType,
)
from app.services.catalog_service import CatalogService
from app.services.recommendation_service import RecommendationService
from app.services.weather_service import WeatherService

logger = logging.getLogger(__name__)


class DailyOutfitService:
    def __init__(self, db: AsyncSession) -> None:
        self.db = db
        self.weather = WeatherService()

    async def get_today(self, user_id: int) -> DailyOutfitResponse | None:
        today = date.today().isoformat()
        result = await self.db.execute(
            select(DailyOutfit).where(
                DailyOutfit.user_id == user_id, DailyOutfit.date == today
            )
        )
        row = result.scalar_one_or_none()
        if not row:
            return None

        return DailyOutfitResponse(
            outfit=Outfit(**row.outfit_json),
            weather_summary=row.weather_summary,
            temperature_c=row.temperature_c,
            date=row.date,
        )

    async def generate_for_user(self, user: User) -> DailyOutfitResponse | None:
        today = date.today().isoformat()

        # Check if already generated today
        existing = await self.db.execute(
            select(DailyOutfit).where(
                DailyOutfit.user_id == user.id, DailyOutfit.date == today
            )
        )
        if existing.scalar_one_or_none():
            # Delete and regenerate
            await self.db.execute(
                DailyOutfit.__table__.delete().where(
                    DailyOutfit.user_id == user.id, DailyOutfit.date == today
                )
            )

        # Get weather
        weather = None
        weather_summary = ""
        temperature_c = None
        if user.city:
            weather = await self.weather.get_weather(user.city)
            if weather:
                weather_summary = f"{weather.description}, {weather.temperature_c}°C"
                temperature_c = weather.temperature_c

        # Build generation request from user preferences + weather
        style = StyleType.CASUAL
        if user.preferred_styles:
            for s in user.preferred_styles:
                try:
                    style = StyleType(s)
                    break
                except ValueError:
                    continue

        gender = GenderType.FEMALE
        if user.preferred_gender:
            try:
                gender = GenderType(user.preferred_gender)
            except ValueError:
                pass

        occasion = OccasionType.DAILY
        req = OutfitGenerateRequest(
            style=style,
            occasion=occasion,
            gender=gender,
            count=1,
        )

        # Apply weather hints
        if weather:
            hints = self.weather.weather_to_style_hints(weather)
            if hints.get("must_include_categories"):
                req.must_include_categories = hints["must_include_categories"]
            if hints.get("must_exclude_categories"):
                req.must_exclude_categories = hints["must_exclude_categories"]

        # Generate outfit
        catalog = CatalogService(self.db)
        rec_service = RecommendationService(catalog)
        outfits = await rec_service.generate_outfits(req)

        if not outfits:
            logger.warning(f"Could not generate daily outfit for user {user.id}")
            return None

        outfit = outfits[0]

        # Save to DB
        row = DailyOutfit(
            user_id=user.id,
            date=today,
            outfit_json=outfit.model_dump(),
            weather_summary=weather_summary,
            temperature_c=temperature_c,
        )
        self.db.add(row)
        await self.db.commit()

        return DailyOutfitResponse(
            outfit=outfit,
            weather_summary=weather_summary,
            temperature_c=temperature_c,
            date=today,
        )

    async def generate_for_all(self) -> int:
        """Generate daily outfits for all users with preferences set."""
        result = await self.db.execute(
            select(User).where(
                User.is_active == True,
                (User.city.isnot(None)) | (User.preferred_styles.isnot(None)),
            )
        )
        users = result.scalars().all()
        count = 0
        for user in users:
            try:
                outfit = await self.generate_for_user(user)
                if outfit:
                    count += 1
            except Exception as e:
                logger.error(f"Failed to generate daily outfit for user {user.id}: {e}")
        return count
