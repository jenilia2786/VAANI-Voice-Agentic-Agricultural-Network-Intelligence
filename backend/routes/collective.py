from fastapi import APIRouter, HTTPException
from models.schemas import CollectiveJoinRequest
from services.ai_service import call_groq
from services.firebase_service import save_document, query_collection
import json, re, uuid

router = APIRouter()

THRESHOLD_KG = 500


@router.post("/join")
async def join_collective(req: CollectiveJoinRequest):
    """Join a collective sale group."""
    farmer_entry = {
        "farmer_id": req.farmer_id,
        "name": req.name,
        "crop": req.crop,
        "quantity": req.quantity,
        "preferred_date": req.preferred_date,
        "district": req.district,
        "village": req.village,
    }
    
    doc_id = save_document("collectives", farmer_entry)
    
    # Aggregate existing collective for this crop+district (mock)
    all_farmers = query_collection("collectives", [
        ("crop", "==", req.crop),
        ("district", "==", req.district)
    ])
    
    if not all_farmers:
        all_farmers = [farmer_entry]
    
    total_qty = sum(f.get("quantity", 0) for f in all_farmers)
    n_farmers = len(all_farmers)
    buyer_matched = total_qty >= THRESHOLD_KG
    
    negotiation_script = ""
    if buyer_matched:
        prompt = (
            f"You have {total_qty}kg of {req.crop} from {n_farmers} women farmers in {req.district}. "
            "Generate a buyer negotiation script in Tamil that establishes a minimum fair price "
            "based on current mandi rates. Keep it short and confident."
        )
        negotiation_script = await call_groq(prompt)
    
    return {
        "success": True,
        "entry_id": doc_id,
        "collective_status": {
            "crop": req.crop,
            "district": req.district,
            "total_quantity_kg": total_qty,
            "num_farmers": n_farmers,
            "buyer_matched": buyer_matched,
            "threshold_kg": THRESHOLD_KG,
            "status": "கொள்முதலாளர் பொருத்தப்பட்டார்!" if buyer_matched else f"இன்னும் {THRESHOLD_KG - total_qty:.0f}கிலோ தேவை",
            "negotiation_script": negotiation_script,
        }
    }


@router.get("/status/{crop}/{district}")
async def collective_status(crop: str, district: str):
    """Get collective sale status for a crop in a district."""
    all_farmers = query_collection("collectives", [
        ("crop", "==", crop),
        ("district", "==", district)
    ])
    
    # Add mock data for demo
    if not all_farmers:
        all_farmers = [
            {"name": "முத்துலட்சுமி", "quantity": 200, "village": "கீழவெண்மணி"},
            {"name": "சாந்தி", "quantity": 150, "village": "நாகப்பட்டினம்"},
        ]
    
    total_qty = sum(f.get("quantity", 0) for f in all_farmers)
    
    return {
        "crop": crop,
        "district": district,
        "farmers": all_farmers,
        "total_quantity_kg": total_qty,
        "num_farmers": len(all_farmers),
        "buyer_matched": total_qty >= THRESHOLD_KG,
        "threshold_kg": THRESHOLD_KG,
    }
