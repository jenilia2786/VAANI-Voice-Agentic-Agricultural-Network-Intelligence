from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from models.schemas import PestReportRequest
from services.ai_service import call_groq
from services.firebase_service import save_document, query_collection
from services.weather_service import get_weather_forecast
import json, re
from typing import Optional
from datetime import datetime, timedelta

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


@router.post("/report")
async def report_pest(req: PestReportRequest):
    """Report a pest sighting."""
    record = {
        "farmer_id": req.farmer_id,
        "pest_type": req.pest_type,
        "crop": req.crop,
        "severity": req.severity,
        "district": req.district,
        "latitude": req.latitude,
        "longitude": req.longitude,
        "description": req.description,
        "timestamp": datetime.utcnow().isoformat(),
    }
    doc_id = save_document("pest_reports", record)
    return {"success": True, "report_id": doc_id, "message": "உங்கள் பூச்சி தகவல் பதிவாகியுள்ளது. நன்றி!"}


@router.get("/risk/{district}/{crop}")
async def pest_risk(district: str, crop: str):
    """Get pest outbreak risk for a district and crop."""
    reports = query_collection("pest_reports", [
        ("district", "==", district),
        ("crop", "==", crop)
    ], limit=20)
    
    # Demo data
    if not reports:
        reports = [
            {"pest_type": "தண்டு துளைப்பான்", "severity": "medium", "district": district, "crop": crop},
            {"pest_type": "வெட்டுக்கிளி", "severity": "low", "district": district, "crop": crop},
        ]
    
    weather = await get_weather_forecast(district)
    forecast_str = json.dumps(weather.get("forecast", [])[:3], ensure_ascii=False)
    
    severe = [r for r in reports if r.get("severity") in ["high", "critical"]]
    risk_level = "CRITICAL" if len(severe) > 3 else "HIGH" if len(severe) > 1 else "MEDIUM" if len(reports) > 3 else "LOW"
    
    prompt = (
        f"Pest reports in {district} for {crop}: {json.dumps(reports[:5], ensure_ascii=False)}. "
        f"Current weather: {forecast_str}. "
        "Predict: 1) Risk to nearby farms in next 7 days 2) Outbreak spread direction "
        "3) Top 3 prevention steps. Respond in Tamil as JSON: "
        '{"risk_prediction": "", "spread_direction": "", "prevention_steps": [], "spray_timing": ""}'
    )
    
    response = await call_groq(prompt)
    prediction = _extract_json(response)
    
    return {
        "district": district,
        "crop": crop,
        "risk_level": risk_level,
        "num_reports": len(reports),
        "recent_reports": reports[:5],
        "ai_prediction": prediction,
    }


@router.get("/community/{district}")
async def community_reports(district: str):
    """Get recent pest reports for community feed."""
    reports = query_collection("pest_reports", [("district", "==", district)], limit=10)
    if not reports:
        reports = [
            {"pest_type": "தண்டு துளைப்பான்", "severity": "medium", "crop": "நெல்", "district": district, "timestamp": datetime.utcnow().isoformat()},
            {"pest_type": "பழம் ஈ", "severity": "low", "crop": "தக்காளி", "district": district, "timestamp": (datetime.utcnow()-timedelta(hours=3)).isoformat()},
        ]
    return {"district": district, "reports": reports}
