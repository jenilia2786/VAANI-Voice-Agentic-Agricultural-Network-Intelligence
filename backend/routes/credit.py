from fastapi import APIRouter, HTTPException
from services.ai_service import call_groq
from services.firebase_service import get_document, save_document, query_collection
import json, re, random
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


@router.get("/score/{farmer_id}")
async def get_credit_score(farmer_id: str):
    """Calculate farm credit score for a farmer."""
    farmer = get_document("farmers", farmer_id)
    crops = query_collection("crops", [("farmer_id", "==", farmer_id)])
    transactions = query_collection("transactions", [("farmer_id", "==", farmer_id)])
    collectives = query_collection("collectives", [("farmer_id", "==", farmer_id)])
    
    # Build history summary
    history = {
        "farmer_id": farmer_id,
        "num_crop_records": len(crops),
        "num_transactions": len(transactions),
        "collective_participation": len(collectives),
        "registered": farmer is not None,
    }
    
    prompt = (
        "Calculate a farm credit score 0-850 for this Tamil Nadu woman farmer. "
        f"History: {json.dumps(history)}. "
        "Score breakdown: yield consistency (0-200), scheme compliance (0-150), "
        "transaction history (0-200), collective participation (0-150), "
        "repayment history (0-150). "
        "Also suggest 3 improvement tips and eligible loan amount. "
        "Respond ONLY in Tamil as valid JSON: "
        '{"score": 0, "grade": "", "breakdown": {"yield": 0, "scheme": 0, "transactions": 0, "collective": 0, "repayment": 0}, '
        '"improvement_tips": [], "eligible_loan_amount": 0, "recommended_banks": []}'
    )
    
    response = await call_groq(prompt, max_tokens=800)
    score_data = _extract_json(response)
    
    if not score_data.get("score"):
        base = 450 + len(crops) * 20 + len(transactions) * 30 + len(collectives) * 25
        score = min(850, base + random.randint(0, 50))
        score_data = {
            "score": score,
            "grade": "A" if score > 700 else "B" if score > 550 else "C" if score > 400 else "D",
            "breakdown": {
                "yield": min(200, len(crops) * 40),
                "scheme": 80,
                "transactions": min(200, len(transactions) * 50),
                "collective": min(150, len(collectives) * 75),
                "repayment": 100
            },
            "improvement_tips": [
                "கூட்டு விற்பனையில் அதிக முறை பங்கேற்கவும்",
                "அரசு திட்டங்களில் சரியான நேரத்தில் விண்ணப்பிக்கவும்",
                "அனைத்து பரிவர்த்தனைகளையும் VAANI வழியாக பதிவு செய்யவும்"
            ],
            "eligible_loan_amount": score * 200,
            "recommended_banks": ["இந்திய வங்கி", "நபார்ட் (NABARD)", "SHG கடன் திட்டம்"]
        }
    
    save_document("farmers", {"farmer_id": farmer_id, "credit_score": score_data["score"]}, farmer_id)
    return score_data
