from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import FileResponse
from services.activity_service import generate_credit_proof_document, log_activity
from services.firebase_service import get_document
import os

router = APIRouter()

@router.get("/download-proof")
async def download_credit_proof(
    farmer_id: str
):
    """Generate and download the single lifetime Credit Score Evidence PDF."""
    try:
        filepath = generate_credit_proof_document(farmer_id)
        
        if not filepath or not os.path.exists(filepath):
            raise HTTPException(status_code=404, detail="Farmer profile or activity history not found")
            
        return FileResponse(
            filepath, 
            media_type="application/pdf", 
            filename=f"VAANI_Credit_Proof_{farmer_id}.pdf"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/log")
async def manual_log(log: dict):
    """Manually log an action (used by frontend for UI clicks)."""
    log_activity(
        log.get("farmer_id"),
        log.get("feature", "UI"),
        log.get("action", "click"),
        log.get("details", "")
    )
    return {"success": True}
