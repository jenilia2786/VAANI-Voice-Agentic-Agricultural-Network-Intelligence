from fastapi import APIRouter, HTTPException
from models.schemas import SchemeMatchRequest
from services.ai_service import call_groq
from services.firebase_service import save_document
import json, re

router = APIRouter()


def _extract_json(text: str):
    try:
        # Try to find JSON array first
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


@router.post("/match")
async def match_schemes(req: SchemeMatchRequest):
    """Match government schemes for a farmer profile."""
    profile_text = (
        f"Farmer in {req.district} district, Tamil Nadu. "
        f"Land: {req.land_size} acres. Crop: {req.crop_type}. "
        f"Annual income: ₹{req.annual_income}. Category: {req.caste_category}. "
        f"SHG member: {'Yes' if req.shg_member else 'No'}. "
        f"Bank account: {'Yes' if req.bank_account else 'No'}. "
        f"Irrigation: {req.irrigation_type}."
    )
    
    prompt = (
        "You are a Tamil Nadu government scheme expert. "
        f"Based on this farmer profile: {profile_text}, "
        "list every Central and Tamil Nadu state agricultural scheme she qualifies for in 2024-25. "
        "Include: PM-KISAN, PMFBY, Pradhan Mantri Krishi Sinchayee Yojana, "
        "Tamil Nadu CM Uzhavar Scheme, free solar pump scheme, free drip irrigation, "
        "SHG loan schemes, women farmer special schemes, NREGA, Fasal Bima Yojana. "
        "For each scheme return Tamil JSON in array format: "
        '[{"scheme_name_tamil": "", "scheme_name_english": "", "benefit_amount": "", '
        '"documents_needed": [], "application_process": "", "deadline": "", '
        '"apply_url": "", "eligible": true, "eligibility_reason": ""}]'
        "The 'eligibility_reason' should explain in Tamil exactly WHY this farmer qualifies based on their profile (e.g., land size, crops, SHG status). "
        "Return ONLY the JSON array."
    )
    
    response = await call_groq(prompt)
    schemes = _extract_json(response)
    
    if not isinstance(schemes, list) or len(schemes) == 0:
        # Real-world fallback for Tamil Nadu
        schemes = [
            {
                "scheme_name_tamil": "பிரதம மந்திரி கிசான் (PM-KISAN)",
                "scheme_name_english": "PM-KISAN",
                "benefit_amount": "₹6,000 per year",
                "documents_needed": ["Aadhaar", "Bank Account", "Land Record (Chitta)"],
                "application_process": "Register via PM-Kisan portal or Block Agriculture Office.",
                "deadline": "Year-round",
                "apply_url": "https://pmkisan.gov.in",
                "eligible": True
            },
            {
                "scheme_name_tamil": "தமிழ்நாடு முதலமைச்சரின் உழவர் பாதுகாப்புத் திட்டம்",
                "scheme_name_english": "CM Uzhavar Padukappu Thittam",
                "benefit_amount": "Insurance, Education & Marriage assistance",
                "documents_needed": ["Smart Card", "Farmer ID Card", "Aadhaar"],
                "application_process": "Apply at e-Seva centers or VAO office.",
                "deadline": "Continuous",
                "apply_url": "https://www.tn.gov.in/scheme/data_view/6805",
                "eligible": True
            },
            {
                "scheme_name_tamil": "இலவச விவசாய மின்சாரம் (Real-time)",
                "scheme_name_english": "Free Agriculture Electricity",
                "benefit_amount": "100% subsidy on farm power",
                "documents_needed": ["TANGEDCO Application", "Village Admin Certificate"],
                "application_process": "Apply via TANGEDCO website (Kalaignarin Kanavu Illam integration).",
                "deadline": "Rolling waitlist",
                "apply_url": "https://www.tangedco.gov.in",
                "eligible": True
            }
        ]
    
    if req.farmer_id:
        save_document("welfare_claims", {"farmer_id": req.farmer_id, "schemes": schemes, "profile": profile_text})
    
    return {"schemes": schemes, "total": len(schemes), "profile": profile_text}
