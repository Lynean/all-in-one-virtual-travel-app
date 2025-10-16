from langchain.tools import BaseTool
from typing import Optional, Type
from pydantic import BaseModel, Field
import httpx
import logging
from config import settings

logger = logging.getLogger(__name__)


class WeatherInput(BaseModel):
    """Input schema for weather tool"""
    latitude: float = Field(..., description="Latitude coordinate")
    longitude: float = Field(..., description="Longitude coordinate")
    forecast_days: Optional[int] = Field(
        default=1,
        description="Number of days for forecast (1-5)"
    )


class WeatherTool(BaseTool):
    """Tool for fetching weather data from OpenWeatherMap API"""
    
    name: str = "get_weather"
    description: str = """
    Fetch current weather and forecast for a location.
    Use this when user asks about weather conditions, temperature, or needs weather-based recommendations.
    Input should be latitude and longitude coordinates.
    Returns current conditions and forecast.
    """
    args_schema: Type[BaseModel] = WeatherInput
    
    def _run(self, latitude: float, longitude: float, forecast_days: int = 1) -> str:
        """Synchronous version (not used in async context)"""
        raise NotImplementedError("Use async version")
    
    async def _arun(self, latitude: float, longitude: float, forecast_days: int = 1) -> str:
        """
        Fetch weather data asynchronously
        
        Args:
            latitude: Location latitude
            longitude: Location longitude
            forecast_days: Number of forecast days (1-5)
        
        Returns:
            Formatted weather information
        """
        try:
            async with httpx.AsyncClient() as client:
                # Current weather
                current_url = f"https://api.openweathermap.org/data/2.5/weather"
                current_params = {
                    "lat": latitude,
                    "lon": longitude,
                    "appid": settings.openweather_api_key,
                    "units": "metric"
                }
                
                current_response = await client.get(current_url, params=current_params)
                current_response.raise_for_status()
                current_data = current_response.json()
                
                # Forecast
                forecast_url = f"https://api.openweathermap.org/data/2.5/forecast"
                forecast_params = {
                    "lat": latitude,
                    "lon": longitude,
                    "appid": settings.openweather_api_key,
                    "units": "metric",
                    "cnt": forecast_days * 8  # 8 forecasts per day (3-hour intervals)
                }
                
                forecast_response = await client.get(forecast_url, params=forecast_params)
                forecast_response.raise_for_status()
                forecast_data = forecast_response.json()
                
                # Format response
                result = self._format_weather_data(current_data, forecast_data, forecast_days)
                
                logger.info(f"Weather fetched for ({latitude}, {longitude})")
                return result
                
        except httpx.HTTPStatusError as e:
            logger.error(f"Weather API error: {e.response.status_code}")
            return f"⚠️ Weather service unavailable (HTTP {e.response.status_code})"
        except Exception as e:
            logger.error(f"Weather fetch error: {str(e)}")
            return f"⚠️ Unable to fetch weather data: {str(e)}"
    
    def _format_weather_data(self, current: dict, forecast: dict, days: int) -> str:
        """Format weather data into readable text"""
        
        # Current weather
        temp = current["main"]["temp"]
        feels_like = current["main"]["feels_like"]
        description = current["weather"][0]["description"].capitalize()
        humidity = current["main"]["humidity"]
        wind_speed = current["wind"]["speed"]
        
        result = f"""🌤️ **Current Weather**
Temperature: {temp}°C (feels like {feels_like}°C)
Conditions: {description}
Humidity: {humidity}%
Wind: {wind_speed} m/s

"""
        
        # Forecast summary
        if forecast and "list" in forecast:
            result += f"📅 **{days}-Day Forecast**\n"
            
            # Group by day
            daily_forecasts = {}
            for item in forecast["list"]:
                date = item["dt_txt"].split()[0]
                if date not in daily_forecasts:
                    daily_forecasts[date] = []
                daily_forecasts[date].append(item)
            
            for date, items in list(daily_forecasts.items())[:days]:
                temps = [item["main"]["temp"] for item in items]
                conditions = [item["weather"][0]["description"] for item in items]
                
                avg_temp = sum(temps) / len(temps)
                max_temp = max(temps)
                min_temp = min(temps)
                most_common_condition = max(set(conditions), key=conditions.count)
                
                result += f"\n{date}: {most_common_condition.capitalize()}"
                result += f"\n  High: {max_temp:.1f}°C | Low: {min_temp:.1f}°C | Avg: {avg_temp:.1f}°C\n"
        
        return result
