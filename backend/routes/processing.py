from fastapi import APIRouter, HTTPException
from models.schemas import ProcessingRequest
from services.ai_service import call_groq
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


@router.post("/options")
async def processing_options(req: ProcessingRequest):
    """Get value addition and micro-processing options for a crop."""
    prompt = (
        f"For {req.crop} grown in Tamil Nadu ({req.district or 'general'}), "
        "show: 1) Top 3 value-addition products with price difference vs. raw "
        "2) Basic processing steps 3) Equipment needed with cost "
        "4) FSSAI registration requirements 5) Best e-commerce platforms to sell on "
        "6) Estimated monthly income at small scale. "
        "Respond ONLY in Tamil as valid JSON: "
        '{"value_additions": [{"product": "", "raw_price_per_kg": 0, "processed_price_per_kg": 0, '
        '"value_increase_percent": 0, "processing_steps": [], "equipment": "", "equipment_cost_inr": 0}], '
        '"fssai_requirements": "", "ecommerce_platforms": [], "monthly_income_estimate": ""}'
    )
    
    response = await call_groq(prompt, max_tokens=1500)
    options = _extract_json(response)
    
    if not options.get("value_additions"):
        options = {
            "value_additions": [
                {"product": f"{req.crop} தூள்", "raw_price_per_kg": 30, "processed_price_per_kg": 120, "value_increase_percent": 300, "processing_steps": ["கழுவுதல்", "உலர்த்துதல்", "அரைத்தல்", "பேக்கிங்"], "equipment": "கிரைண்டர், ஆவி இயந்திரம்", "equipment_cost_inr": 15000},
                {"product": f"{req.crop} ஊறுகாய்", "raw_price_per_kg": 30, "processed_price_per_kg": 200, "value_increase_percent": 567, "processing_steps": ["நறுக்குதல்", "உப்பு போடுதல்", "பாட்டில் நிரப்புதல்"], "equipment": "கட்டிங் இயந்திரம், பாட்டில்கள்", "equipment_cost_inr": 8000},
                {"product": f"{req.crop} வேர்க்கடலை மிட்டாய்", "raw_price_per_kg": 30, "processed_price_per_kg": 250, "value_increase_percent": 733, "processing_steps": ["வறுத்தல்", "சர்க்கரை கலைத்தல்", "வடிவமைத்தல்", "பேக்கிங்"], "equipment": "வாணலி, மரக்கட்டை தட்டு", "equipment_cost_inr": 5000},
            ],
            "fssai_requirements": "FSSAI அடிப்படை பதிவு: ₹100/ஆண்டு. ஆன்லைனில் foscos.fssai.gov.in இல் விண்ணப்பிக்கவும்.",
            "ecommerce_platforms": ["Amazon Fresh", "BigBasket", "Meesho", "WhatsApp Business", "JioMart"],
            "monthly_income_estimate": "சிறிய அளவில் மாதம் ₹8,000 - ₹25,000 சம்பாதிக்கலாம்"
        }
    
    return options
