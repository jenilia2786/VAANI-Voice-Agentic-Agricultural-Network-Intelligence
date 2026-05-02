from fastapi import APIRouter, HTTPException
from models.schemas import InputVerifyRequest
from services.ai_service import call_groq
from services.firebase_service import save_document, query_collection
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


KNOWN_FAKE_PRODUCTS = [
    "Super Grow Plus", "Magic Fertilizer", "Wonder Pesticide",
]


@router.post("/verify")
async def verify_input(req: InputVerifyRequest):
    """Verify agricultural input authenticity."""
    is_suspicious = req.product_name in KNOWN_FAKE_PRODUCTS
    
    prompt = (
        f"Is '{req.product_name}' (Batch: {req.batch_number or 'unknown'}, "
        f"Manufacturer: {req.manufacturer or 'unknown'}) a legitimate, "
        "registered agricultural input in India? "
        "What is the official MRP? Is the manufacturer licensed by CIB&RC? "
        "Respond ONLY in Tamil as JSON: "
        '{"is_authentic": true, "mrp_per_unit": 0, "manufacturer_licensed": true, '
        '"legitimate_alternatives": [], "verification_note": "", "cibrc_registered": true}'
    )
    
    response = await call_groq(prompt, max_tokens=500)
    result = _extract_json(response)
    
    if not result.get("verification_note"):
        result = {
            "is_authentic": not is_suspicious,
            "mrp_per_unit": req.reported_price or 0,
            "manufacturer_licensed": not is_suspicious,
            "legitimate_alternatives": ["உரம் நிலையம் அங்கீகரித்த பொருட்கள்", "IFFCO / KRIBHCO தயாரிப்புகள்"],
            "verification_note": "நேரடியாக மாவட்ட வேளாண்மை அலுவலரிடம் சரிபார்க்கவும்.",
            "cibrc_registered": not is_suspicious
        }
    
    price_ok = True
    price_diff = None
    if req.reported_price and result.get("mrp_per_unit") and result["mrp_per_unit"] > 0:
        if req.reported_price > result["mrp_per_unit"] * 1.1:
            price_ok = False
            price_diff = req.reported_price - result["mrp_per_unit"]
            result["overpriced"] = True
            result["overcharge_amount"] = round(price_diff, 2)
    
    if is_suspicious or not result.get("is_authentic"):
        save_document("fake_reports", {
            "product_name": req.product_name,
            "batch_number": req.batch_number,
            "manufacturer": req.manufacturer,
            "reported_price": req.reported_price,
            "district": req.district,
            "farmer_id": req.farmer_id,
        })
    
    # Community reports (mock)
    result["community_reports"] = [
        {"district": "Coimbatore", "product": "Fake XYZ Pesticide", "reports": 12, "status": "⚠️ блокировано"},
        {"district": "Salem", "product": "Super Grow Plus", "reports": 8, "status": "⚠️ போலி"},
    ]
    
    return result


@router.get("/blacklist/{district}")
async def blacklist(district: str):
    """Get top fake dealer reports in a district."""
    reports = query_collection("fake_reports", [("district", "==", district)], limit=10)
    if not reports:
        reports = [
            {"product_name": "Super Grow Plus", "district": district, "reports_count": 5},
        ]
    return {"district": district, "blacklisted_products": reports}
