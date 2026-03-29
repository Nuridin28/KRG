"""Weather service — OpenWeatherMap with wttr.in fallback."""

from __future__ import annotations

import logging
import time
from typing import Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

OPENWEATHER_URL = "https://api.openweathermap.org/data/2.5/weather"
WTTR_URL = "https://wttr.in"


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
        # Check cache
        cached = _cache.get(city.lower())
        if cached and time.time() - cached[1] < CACHE_TTL:
            return cached[0]

        # Try OpenWeatherMap first (if key is set)
        if self._api_key:
            result = await self._fetch_openweather(city)
            if result:
                return result

        # Fallback: wttr.in (free, no API key)
        result = await self._fetch_wttr(city)
        if result:
            return result

        return self._neutral_weather()

    async def _fetch_openweather(self, city: str) -> Optional[WeatherData]:
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(OPENWEATHER_URL, params={
                    "q": city,
                    "appid": self._api_key,
                    "units": "metric",
                    "lang": "ru",
                })
                if resp.status_code != 200:
                    logger.warning(f"OpenWeatherMap error for {city}: {resp.status_code}")
                    return None

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
            logger.error(f"OpenWeatherMap failed for {city}: {e}")
            return None

    async def _fetch_wttr(self, city: str) -> Optional[WeatherData]:
        """Free weather via wttr.in — no API key needed."""
        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                resp = await client.get(
                    f"{WTTR_URL}/{city}",
                    params={"format": "j1"},
                    headers={"Accept": "application/json"},
                )
                if resp.status_code != 200:
                    logger.warning(f"wttr.in error for {city}: {resp.status_code}")
                    return None

                data = resp.json()
                current = data.get("current_condition", [{}])[0]

                temp = float(current.get("temp_C", 20))
                # Russian description if available, else English
                desc_ru = current.get("lang_ru", [{}])
                if desc_ru and isinstance(desc_ru, list) and desc_ru[0].get("value"):
                    desc = desc_ru[0]["value"]
                else:
                    desc = current.get("weatherDesc", [{}])[0].get("value", "")

                weather_code = int(current.get("weatherCode", 0))
                is_rainy = weather_code in (176, 200, 263, 266, 293, 296, 299, 302, 305, 308, 311, 314, 317, 350, 353, 356, 359, 362, 365, 386, 389, 392, 395)

                weather = WeatherData(
                    temperature_c=round(temp, 1),
                    description=desc.lower(),
                    is_rainy=is_rainy,
                    is_cold=temp < 10,
                    is_hot=temp > 28,
                )
                _cache[city.lower()] = (weather, time.time())
                return weather
        except Exception as e:
            logger.error(f"wttr.in failed for {city}: {e}")
            return None

    def _neutral_weather(self) -> WeatherData:
        return WeatherData(
            temperature_c=20.0,
            description="нет данных о погоде",
            is_rainy=False,
            is_cold=False,
            is_hot=False,
        )

    def weather_to_style_hints(self, weather: WeatherData) -> dict:
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
