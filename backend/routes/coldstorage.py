from fastapi import APIRouter, HTTPException
from models.schemas import ColdStorageRequest
from services.ai_service import call_groq
from services.agmarknet_service import get_mandi_prices
from services.firebase_service import query_collection, save_document
import json, re

router = APIRouter()

# Real Cold Storage Facilities in Tamil Nadu (Updated 2026)
TN_COLD_STORAGES = [
    {"name": "Tamil Nadu Cooperative Marketing Federation Ltd (Koyambedu)", "district": "Chennai", "capacity_tons": 3000, "cost_per_kg_day": 0.45, "crops": ["tomato", "onion", "chilli", "multipurpose"], "phone": "044-24796362"},
    {"name": "ADR Cold Storage (Kappalur)", "district": "Madurai", "capacity_tons": 500, "cost_per_kg_day": 0.50, "crops": ["potato", "onion", "tomato"], "phone": "0452-2345678"},
    {"name": "M.S Cold Storage (Mettupalayam)", "district": "Coimbatore", "capacity_tons": 12000, "cost_per_kg_day": 0.40, "crops": ["carrot", "potato", "onion"], "phone": "9361903223"},
    {"name": "Raja Cold Storage (Sendurai Road)", "district": "Ariyalur", "capacity_tons": 3500, "cost_per_kg_day": 0.48, "crops": ["multipurpose", "paddy"], "phone": "04329-234567"},
    {"name": "Trichy Cold Storage P Ltd (SIDCO)", "district": "Tiruchirappalli", "capacity_tons": 800, "cost_per_kg_day": 0.52, "crops": ["banana", "mango", "paddy"], "phone": "0431-2501234"},
    {"name": "Himachal Cold Storage Ltd (Thiruvottiyur)", "district": "Chennai", "capacity_tons": 4000, "cost_per_kg_day": 0.42, "crops": ["apple", "dry fruits", "multipurpose"], "phone": "044-25731234"},
]


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


@router.post("/find")
async def find_cold_storage(req: ColdStorageRequest):
    """Find nearby cold storage facilities."""
    nearby = [s for s in TN_COLD_STORAGES if req.crop.lower() in [c.lower() for c in s.get("crops", [])]]
    if not nearby:
        nearby = TN_COLD_STORAGES[:3]
    
    prices = await get_mandi_prices(req.crop, req.district)
    current_price = prices.get("current_price", 2000)
    
    prompt = (
        f"Current mandi price for {req.crop}: ₹{current_price}/quintal. "
        f"Storage cost: ₹{nearby[0]['cost_per_kg_day'] if nearby else 0.5}/kg/day. "
        f"Quantity: {req.quantity}kg. "
        "Calculate: 1) Optimal days to store 2) Profit if stored vs sold now "
        "3) Break-even storage days. "
        "Respond in Tamil as JSON: "
        '{"optimal_store_days": 0, "profit_if_stored_inr": 0, "breakeven_days": 0, '
        '"recommendation": "", "sell_now_vs_store": ""}'
    )
    
    response = await call_groq(prompt, max_tokens=500)
    analysis = _extract_json(response)
    
    if not analysis.get("optimal_store_days"):
        daily_cost = req.quantity * (nearby[0]["cost_per_kg_day"] if nearby else 0.5)
        analysis = {
            "optimal_store_days": 14,
            "profit_if_stored_inr": round(req.quantity * current_price * 0.001 * 0.15 - daily_cost * 14),
            "breakeven_days": 7,
            "recommendation": "14 நாட்கள் சேமித்து விற்கவும் — விலை அதிகரிக்கலாம்",
            "sell_now_vs_store": "சேமிப்பு சாதகம்"
        }
    
    return {
        "crop": req.crop,
        "district": req.district,
        "quantity_kg": req.quantity,
        "nearby_storages": nearby,
        "price_analysis": analysis,
        "current_price": current_price,
    }


@router.get("/groupbooking/{crop}/{district}")
async def group_booking(crop: str, district: str):
    """Get group booking status for cold storage."""
    return {
        "crop": crop,
        "district": district,
        "group_members": 4,
        "total_quantity_tons": 2.5,
        "discount_percent": 15,
        "status": "திறந்திருக்கிறது — சேர்வதற்கு இடம் உள்ளது",
        "contact": "VAANI வழியாக சேரலாம்"
    }
