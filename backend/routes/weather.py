from fastapi import APIRouter, HTTPException
from services.weather_service import get_weather_forecast
from services.ai_service import call_groq
import json, re
from typing import Optional

router = APIRouter()


def _extract_json(text: str) -> dict:
    try:
        return json.loads(text)
    except:
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except:
                pass
    return {}


@router.get("/forecast")
async def weather_forecast(
    district: str = "Chennai",
    crop: Optional[str] = None,
    growth_stage: Optional[str] = "vegetative",
):
    """Get 14-day weather forecast with personalized crop calendar."""
    weather_data = await get_weather_forecast(district)
    
    farm_advice = []
    if crop:
        forecast_summary = json.dumps(weather_data.get("forecast", [])[:7], ensure_ascii=False)
        prompt = (
            f"Weather forecast for {district}, Tamil Nadu (next 7 days): {forecast_summary}. "
            f"Farmer grows: {crop} at {growth_stage} stage. "
            "Generate daily farm advice for each of these 7 days and a crop calendar. "
            "Respond in Tamil as JSON: "
            '{"daily_advice": [{"date": "", "advice": "", "do": "", "avoid": ""}], '
            '"irrigation_schedule": "", "harvest_estimate": "", "disaster_warnings": ""}'
        )
        advice_text = await call_groq(prompt)
        advice_data = _extract_json(advice_text)
        weather_data["crop_calendar"] = advice_data
    
    return weather_data
