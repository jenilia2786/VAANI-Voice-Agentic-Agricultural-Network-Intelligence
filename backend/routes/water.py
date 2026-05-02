from fastapi import APIRouter, HTTPException
from models.schemas import WaterCalcRequest
from services.ai_service import call_groq
from services.weather_service import get_weather_forecast
import json, re

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


# Base crop water needs (mm/day at vegetative stage)
CROP_WATER_NEEDS = {
    "paddy": 8, "rice": 8, "sugarcane": 5, "cotton": 4, "groundnut": 4,
    "wheat": 3, "maize": 5, "tomato": 4, "onion": 3, "chilli": 3,
    "banana": 6, "coconut": 3, "default": 4
}

IRRIGATION_EFFICIENCY = {
    "drip": 0.95, "sprinkler": 0.80, "furrow": 0.60, "flood": 0.50, "rain-fed": 0.70
}


@router.post("/calculate")
async def calculate_water(req: WaterCalcRequest):
    """Calculate water requirements and irrigation advice."""
    weather = await get_weather_forecast(req.district)
    today_weather = weather.get("forecast", [{}])[0]
    
    rainfall_today = today_weather.get("rainfall_mm", 0)
    
    base_need_mm = CROP_WATER_NEEDS.get(req.crop.lower(), CROP_WATER_NEEDS["default"])
    efficiency = IRRIGATION_EFFICIENCY.get(req.irrigation_method.lower(), 0.65)
    acres_to_ha = req.acres * 0.4047
    water_needed_liters = max(0, (base_need_mm - rainfall_today) * acres_to_ha * 1000 / efficiency)
    should_irrigate = water_needed_liters > 500
    
    prompt = (
        f"Calculate water requirement for {req.crop} on {req.acres} acres "
        f"with {req.soil_type} soil in {req.district} Tamil Nadu. "
        f"Current method: {req.irrigation_method}. Growth stage: {req.growth_stage}. "
        f"Today's rainfall: {rainfall_today}mm. "
        "Provide: 1) Exact water needed in litres 2) Should irrigate today (yes/no + why) "
        "3) How much she's over-irrigating (estimate) 4) Money wasted on electricity/diesel "
        "5) Monthly savings if she switches to drip irrigation. "
        "Respond ONLY in Tamil as valid JSON: "
        '{"water_needed_liters": 0, "should_irrigate": true, "reason": "", "calculation_explanation": "", '
        '"waste_estimate_liters": 0, "electricity_wasted_inr": 0, '
        '"drip_savings_monthly_inr": 0, "drip_roi_months": 0, "tips": ""}'
        "The 'calculation_explanation' should explain in Tamil the scientific reason behind the liters needed (e.g., relationship between Growth Stage and soil evaporation)."
    )
    
    response = await call_groq(prompt, max_tokens=800)
    ai_result = _extract_json(response)
    
    if not ai_result.get("water_needed_liters"):
        waste = water_needed_liters * (1 - efficiency) if not should_irrigate else 0
        ai_result = {
            "water_needed_liters": round(water_needed_liters),
            "should_irrigate": should_irrigate,
            "reason": f"இன்று {rainfall_today}mm மழை பெய்தது. " + ("பாசனம் தேவை." if should_irrigate else "பாசனம் தேவையில்லை."),
            "waste_estimate_liters": round(waste),
            "electricity_wasted_inr": round(waste * 0.001 * 8),  # ~8 INR/kWh estimate
            "drip_savings_monthly_inr": round(water_needed_liters * 0.35 * 0.001 * 8 * 30),
            "drip_roi_months": 18,
            "tips": "சொட்டு நீர்பாசனம் பயன்படுத்தினால் 40% தண்ணீரும் 30% மின்சாரமும் மிச்சப்படும்."
        }
    
    return {
        **ai_result,
        "district": req.district,
        "crop": req.crop,
        "acres": req.acres,
        "current_method": req.irrigation_method,
        "rainfall_today_mm": rainfall_today,
    }
