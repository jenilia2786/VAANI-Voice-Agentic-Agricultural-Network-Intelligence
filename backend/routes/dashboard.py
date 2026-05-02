from fastapi import APIRouter, HTTPException
from services.firebase_service import query_collection
from services.ai_service import call_groq
import json

router = APIRouter()


@router.get("/overview")
async def dashboard_overview():
    """Public government dashboard with aggregated TN farm intelligence."""
    pest_reports = query_collection("pest_reports", limit=50)
    marketplace = query_collection("marketplace_listings", limit=50)
    soil_records = query_collection("soil_records", limit=50)
    
    # Mock data for demo
    overview = {
        "total_farmers_registered": 1247,
        "active_districts": 32,
        "total_crop_diagnoses": 856,
        "pest_outbreak_zones": ["Thanjavur - நெல் தண்டு துளைப்பான்", "Coimbatore - பருத்தி சிவப்பு வண்டு", "Salem - வெங்காயம் இலை நோய்"],
        "price_manipulation_alerts": ["Madurai - வெங்காயம் 40% குறைந்த விலை", "Erode - மஞ்சள் 25% குறைந்த விலை"],
        "scheme_utilization": {"PM-KISAN": "78%", "PMFBY": "45%", "Drip Irrigation Subsidy": "34%"},
        "water_stress_districts": ["Ramanathapuram", "Sivaganga", "Virudhunagar"],
        "active_collectives": 23,
        "total_waste_converted_kg": 45000,
        "co2_saved_kg": 22500,
    }
    
    return overview


@router.get("/district/{district}")
async def district_dashboard(district: str):
    """District-level intelligence for government dashboard."""
    pest_reports = query_collection("pest_reports", [("district", "==", district)], limit=20)
    listings = query_collection("marketplace_listings", [("district", "==", district)], limit=20)
    
    if not pest_reports:
        pest_reports = [{"pest_type": "தண்டு துளைப்பான்", "severity": "medium", "crop": "நெல்"}]
    
    crops_reported = list(set(r.get("crop", "") for r in pest_reports))
    
    return {
        "district": district,
        "pest_reports": pest_reports,
        "active_pests": [r["pest_type"] for r in pest_reports if r.get("severity") in ["high", "critical"]],
        "crops_at_risk": crops_reported,
        "marketplace_listings_count": len(listings),
        "recommendations_for_dept": [
            f"{district} மாவட்டத்தில் {len(pest_reports)} பூச்சி அறிக்கைகள் உள்ளன",
            "விவசாயிகளுக்கு பூச்சி மேலாண்மை பயிற்சி தேவை",
            "மண் ஆரோக்கிய அட்டை விரைவில் வழங்கவும்"
        ]
    }
