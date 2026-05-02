from fastapi import APIRouter, HTTPException
from models.schemas import FarmerProfile
from services.firebase_service import save_document, get_document, query_collection
from services.ai_service import call_groq
import uuid, json, re

router = APIRouter()


@router.post("/register")
async def register_farmer(profile: FarmerProfile):
    """Register a new farmer or update existing."""
    farmer_id = profile.farmer_id or str(uuid.uuid4())
    record = profile.dict()
    record["farmer_id"] = farmer_id
    save_document("farmers", record, farmer_id)
    return {"success": True, "farmer_id": farmer_id, "message": "நன்றி! உங்கள் விவரங்கள் பதிவாகியுள்ளன."}

@router.get("/login")
async def login_farmer(phone: str):
    """Try to find an existing farmer by phone number."""
    filters = [("phone", "==", phone)]
    results = query_collection("farmers", filters)
    if results:
        return results[0]
    raise HTTPException(status_code=404, detail="விவசாயி விவரங்கள் கிடைக்கவில்லை")


@router.get("/{farmer_id}")
async def get_farmer(farmer_id: str):
    """Get farmer profile."""
    farmer = get_document("farmers", farmer_id)
    if not farmer:
        return {"farmer_id": farmer_id, "name": "விவசாயி", "district": "Chennai", "crops": []}
    return farmer


@router.get("/{farmer_id}/dashboard-summary")
async def farmer_dashboard_summary(farmer_id: str):
    """Get highly personalized dashboard summary with real-time weather and AI greeting."""
    from services.weather_service import get_weather_forecast
    
    farmer = get_document("farmers", farmer_id)
    district = farmer.get("district", "Madurai") if farmer else "Madurai"
    name = farmer.get("name", "விவசாயி") if farmer else "விவசாயி"
    crops = farmer.get("crops", ["Paddy"]) if farmer else ["Paddy"]
    gender = farmer.get("gender", "female") if farmer else "female"
    
    # 1. Fetch real weather
    weather_data = await get_weather_forecast(district)
    today = weather_data.get("forecast", [{}])[0]
    
    # 2. Get companion greeting from AI
    weather_desc = today.get("description", "Sunny")
    
    persona = "sisterly companion (அக்கா/தங்கை) for a woman" if gender == "female" else "knowledgeable agricultural companion (சகோதரி/தோழி) for a man"
    honorifics = "அம்மா/அக்கா (amma/akka)" if gender == "female" else "அப்பா/அண்ணா/தம்பி (appa/anna/thambi)"

    prompt = (
        f"You are VAANI, a caring AI female companion ({persona}) for {name}, a farmer in {district} who grows {', '.join(crops)}. "
        f"Today's weather: {weather_desc}, {today.get('max_temp')}°C. "
        f"Address the user appropriately as {honorifics}. "
        "Give a warm, supportive 1-sentence morning greeting in Tamil. "
        "Then list 3 short personalized alerts (Tamil) for the farm based on the weather and crops. "
        "Respond ONLY in JSON: {\"greeting\": \"\", \"alerts\": []}"
    )
    
    try:
        ai_resp_text = await call_groq(prompt, max_tokens=400)
        match = re.search(r'\{.*\}', ai_resp_text, re.DOTALL)
        ai_data = json.loads(match.group()) if match else {}
    except:
        ai_data = {}

    greeting = ai_data.get("greeting", f"வணக்கம் {name}! உங்கள் நாள் இனிமையாக அமையட்டும்.")
    alerts = ai_data.get("alerts", [
        f"இன்று {district} வானிலை: {weather_desc}",
        f"{crops[0]} பயிருக்கு ஏற்ற காலமிது",
        "வேளாண் வானொலியை கேட்டு மகிழுங்கள்"
    ])
    
    return {
        "farmer_id": farmer_id,
        "name": name,
        "district": district,
        "crops": crops,
        "quick_alerts": alerts,
        "todays_tip": greeting,
        "weather": {
            "temp": today.get("max_temp"),
            "condition": weather_desc,
            "rain": today.get("rainfall_mm")
        }
    }
