"""Weather service — OpenWeatherMap integration for style-of-the-day."""

from __future__ import annotations

import logging
from typing import Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

OPENWEATHER_URL = "https://api.openweathermap.org/data/2.5/weather"


class WeatherData:
    def __init__(
        self,
        temperature_c: float,
        description: str,
        is_rainy: bool = False,
        is_cold: bool = False,
        is_hot: bool = False,
    ):
        self.temperature_c = temperature_c
        self.description = description
        self.is_rainy = is_rainy
        self.is_cold = is_cold
        self.is_hot = is_hot


# In-memory cache: city -> (data, timestamp)
_cache: dict[str, tuple[WeatherData, float]] = {}
CACHE_TTL = 3600  # 1 hour


class WeatherService:
    def __init__(self) -> None:
        self._api_key = settings.OPENWEATHER_API_KEY

    async def get_weather(self, city: str) -> Optional[WeatherData]:
        if not self._api_key:
            return self._fallback_weather(city)

        # Check cache
        import time
        cached = _cache.get(city.lower())
        if cached and time.time() - cached[1] < CACHE_TTL:
            return cached[0]

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(OPENWEATHER_URL, params={
                    "q": city,
                    "appid": self._api_key,
                    "units": "metric",
                    "lang": "ru",
                })
                if resp.status_code != 200:
                    logger.warning(f"Weather API error for {city}: {resp.status_code}")
                    return self._fallback_weather(city)

                data = resp.json()
                temp = data["main"]["temp"]
                desc = data["weather"][0]["description"] if data.get("weather") else ""
                main_weather = data["weather"][0]["main"].lower() if data.get("weather") else ""

                weather = WeatherData(
                    temperature_c=round(temp, 1),
                    description=desc,
                    is_rainy=main_weather in ("rain", "drizzle", "thunderstorm"),
                    is_cold=temp < 10,
                    is_hot=temp > 28,
                )

                _cache[city.lower()] = (weather, time.time())
                return weather

        except Exception as e:
            logger.error(f"Weather API failed for {city}: {e}")
            return self._fallback_weather(city)

    def _fallback_weather(self, city: str) -> WeatherData:
        """Return neutral weather when API is unavailable."""
        return WeatherData(
            temperature_c=20.0,
            description="нет данных о погоде",
            is_rainy=False,
            is_cold=False,
            is_hot=False,
        )

    def weather_to_style_hints(self, weather: WeatherData) -> dict:
        """Map weather conditions to outfit generation hints."""
        hints: dict = {}

        if weather.is_cold:
            hints["must_include_categories"] = ["outerwear"]
            hints["preferred_season"] = "winter"
            hints["occasion"] = "daily"
        elif weather.is_hot:
            hints["preferred_season"] = "summer"
            hints["must_exclude_categories"] = ["outerwear"]
        else:
            hints["preferred_season"] = "all"

        if weather.is_rainy:
            hints["must_include_categories"] = hints.get("must_include_categories", []) + ["outerwear"]

        return hints
