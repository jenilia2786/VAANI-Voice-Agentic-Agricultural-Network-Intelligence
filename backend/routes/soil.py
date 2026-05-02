from fastapi import APIRouter, HTTPException
from models.schemas import SoilAnalyzeRequest
from services.ai_service import call_groq
from services.firebase_service import save_document
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


@router.post("/analyze")
async def analyze_soil(req: SoilAnalyzeRequest):
    """Analyze soil health and give fertilizer recommendations."""
    soil_data = f"Nitrogen: {req.nitrogen}, Phosphorus: {req.phosphorus}, Potassium: {req.potassium}, pH: {req.ph}, Organic Matter: {req.organic_matter}%"
    
    prompt = (
        f"Analyze soil test results for a Tamil Nadu farm growing {req.crop} in {req.district}. "
        f"Soil data: {soil_data}. "
        "Provide: 1) Soil health score 0-100 2) Key deficiencies 3) Exact fertilizer recommendation in kg per acre "
        "4) Organic amendments 5) What NOT to apply 6) Expected yield improvement. "
        "Respond ONLY in Tamil as valid JSON: "
        '{"health_score": 0, "grade": "", "deficiencies": [], "fertilizer_recommendation": "", '
        '"organic_amendments": "", "avoid": "", "yield_improvement": "", "tips": ""}'
    )
    
    response = await call_groq(prompt)
    analysis = _extract_json(response)
    
    if not analysis.get("health_score"):
        n = req.nitrogen or 0
        p = req.phosphorus or 0
        k = req.potassium or 0
        ph = req.ph or 7.0
        score = min(100, int((n/280 + p/24 + k/280) / 3 * 60 + (1 - abs(ph - 6.5) / 7) * 40))
        analysis = {
            "health_score": score,
            "grade": "நல்ல" if score > 70 else "சராசரி" if score > 40 else "மோசமான",
            "deficiencies": ["நைட்ரஜன் குறைபாடு"] if (req.nitrogen or 0) < 100 else [],
            "fertilizer_recommendation": f"{req.crop} பயிருக்கு 120:60:40 NPK கிலோ/ஏக்கர்",
            "organic_amendments": "வேர்க்கடலை தவிடு, வேப்பம் தவிடு 200கிலோ/ஏக்கர்",
            "avoid": "அதிகப்படியான யூரியா உரம் இடாமல் தவிர்க்கவும்",
            "yield_improvement": "பரிந்துரைகளை பின்பற்றினால் 20-30% விளைச்சல் அதிகரிக்கும்",
            "tips": "மண் பரிசோதனையை 6 மாதங்களுக்கு ஒருமுறை செய்யுங்கள்"
        }
    
    record = {"farmer_id": req.farmer_id, "crop": req.crop, "district": req.district, "analysis": analysis}
    save_document("soil_records", record)
    
    return analysis


@router.get("/labs")
async def nearby_labs(district: str = "Chennai"):
    """Return nearby soil testing labs."""
    labs = [
        {"name": f"District Soil Labs - {district}", "address": f"District Agriculture Office, {district}", "phone": "1800-425-1551", "cost": "Free (Govt)"},
        {"name": "TNAU Soil Testing Center", "address": "Tamil Nadu Agricultural University, Coimbatore", "phone": "0422-6611411", "cost": "₹50-200 / Sample"},
        {"name": "Mobile Soil Testing Van", "address": f"Rotational in {district} blocks", "phone": "1800-180-1551", "cost": "Free (Govt)"},
        {"name": "Kisan Suvidha Center", "address": f"Taluk HQ, {district}", "phone": "9444001234", "cost": "₹100"},
    ]
    return {"district": district, "labs": labs}
