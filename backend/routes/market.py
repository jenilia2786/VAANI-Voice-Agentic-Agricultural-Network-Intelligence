from fastapi import APIRouter, Query, HTTPException
from services.agmarknet_service import get_mandi_prices, MOCK_PRICES, TN_DISTRICTS
from services.firebase_service import save_document, query_collection
from services.activity_service import log_activity
from typing import Optional
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


@router.get("/prices")
async def get_prices(
    crop: str = Query(..., description="Crop name"),
    district: str = Query(..., description="TN District"),
    reported_price: Optional[float] = Query(None, description="Price user was offered"),
):
    """Get mandi prices for a crop in a district."""
    try:
        data = await get_mandi_prices(crop, district)
        
        # Fraud detection
        if reported_price and data["current_price"]:
            diff_pct = ((data["current_price"] - reported_price) / data["current_price"]) * 100
            if diff_pct >= 30:
                data["fraud_alert"] = {
                    "detected": True,
                    "message": f"⚠️ எச்சரிக்கை! உங்களுக்கு வழங்கப்பட்ட விலை (₹{reported_price}) மண்டி விலையை விட {diff_pct:.0f}% குறைவாக உள்ளது. விலை மோசடி சந்தேகம்!",
                    "mandi_price": data["current_price"],
                    "reported_price": reported_price,
                    "difference_percent": round(diff_pct, 1)
                }
        
        return data
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/crops-list")
async def list_crops():
    """Return list of all supported crops."""
    return {"crops": list(MOCK_PRICES.keys()), "districts": TN_DISTRICTS}
