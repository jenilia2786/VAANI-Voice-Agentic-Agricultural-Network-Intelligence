from fastapi import APIRouter, HTTPException
from models.schemas import WasteRequest
from services.ai_service import call_groq
from services.firebase_service import query_collection
import json, re

router = APIRouter()


def _extract_json(text: str):
    try:
        arr_match = re.search(r'\[.*\]', text, re.DOTALL)
        if arr_match:
            return json.loads(arr_match.group())
    except:
        pass
    try:
        return json.loads(text)
    except:
        pass
    return []


# Carbon credit: ~0.5 kg CO2 per kg biomass not burned
CO2_FACTOR = 0.5
CO2_CREDIT_PRICE_INR = 1.5  # per kg CO2


@router.post("/options")
async def waste_options(req: WasteRequest):
    """Get monetization options for farm waste."""
    prompt = (
        f"A Tamil Nadu woman farmer has {req.quantity}kg of {req.waste_type} "
        f"in {req.district or 'Tamil Nadu'}. "
        "List the top 3 ways to monetize this agricultural waste: "
        "consider biogas, compost, mushroom substrate, paper mills, packaging, carbon credits, fuel briquettes. "
        "For each option include: option name, buyer type, price per kg, total income for this quantity, "
        "how to connect with buyers in Tamil Nadu, transport info. "
        "Respond ONLY in Tamil as JSON array: "
        '[{"option_name": "", "buyer_type": "", "price_per_kg": 0, '
        '"total_income": 0, "buyer_contact": "", "transport_tips": "", "co2_saved_kg": 0}]'
    )
    
    response = await call_groq(prompt, max_tokens=1024)
    options = _extract_json(response)
    
    if not isinstance(options, list) or not options:
        options = [
            {
                "option_name": "உயிர் எரிவாயு உற்பத்தி",
                "buyer_type": "உயிர் எரிவாயு நிறுவனங்கள்",
                "price_per_kg": 2.5,
                "total_income": round(req.quantity * 2.5),
                "buyer_contact": "TNEB மற்றும் TANGEDCO - 044-28520131",
                "transport_tips": "200கிலோவுக்கு மேல் இருந்தால் நிறுவனமே எடுத்துச் செல்லும்",
                "co2_saved_kg": round(req.quantity * CO2_FACTOR),
            },
            {
                "option_name": "மக்கு உரம் தயாரிப்பு",
                "buyer_type": "கரிம விவசாய கடைகள்",
                "price_per_kg": 4.0,
                "total_income": round(req.quantity * 4.0),
                "buyer_contact": "உங்கள் மாவட்ட வேளாண்மை அலுவலகம்",
                "transport_tips": "நீங்களே விற்பனை செய்யலாம் அல்லது கடைக்கு வழங்கலாம்",
                "co2_saved_kg": round(req.quantity * CO2_FACTOR * 0.8),
            },
            {
                "option_name": "காளான் வளர்ப்பு அடி மட்டம்",
                "buyer_type": "காளான் விவசாயிகள்",
                "price_per_kg": 6.0,
                "total_income": round(req.quantity * 6.0),
                "buyer_contact": "TNAU காளான் மைய ஆய்வகம் - 0422-6611411",
                "transport_tips": "சுத்தமாக பேக் செய்து சுய வாகனத்தில் அனுப்பவும்",
                "co2_saved_kg": round(req.quantity * CO2_FACTOR),
            }
        ]
    
    co2_saved = req.quantity * CO2_FACTOR
    carbon_value = round(co2_saved * CO2_CREDIT_PRICE_INR)
    
    return {
        "waste_type": req.waste_type,
        "quantity_kg": req.quantity,
        "options": options,
        "carbon_tracker": {
            "co2_saved_kg": round(co2_saved),
            "carbon_credit_value_inr": carbon_value,
            "message": f"இந்த கழிவை எரிக்காமல் பயன்படுத்துவதன் மூலம் {co2_saved:.0f}கிலோ CO₂ காக்கப்படுகிறது — சுமார் ₹{carbon_value} மதிப்புள்ளது!"
        }
    }
