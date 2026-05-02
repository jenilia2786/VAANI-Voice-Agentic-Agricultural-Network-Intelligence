from fastapi import APIRouter, HTTPException
from models.schemas import DisasterDocRequest, DisasterClaimRequest
from services.ai_service import call_groq
from services.firebase_service import save_document, query_collection
from datetime import datetime
import json, re
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


@router.post("/document")
async def document_farm(req: DisasterDocRequest):
    """Document farm pre-disaster for insurance claims."""
    record = {
        "farmer_id": req.farmer_id,
        "disaster_type": req.disaster_type,
        "description": req.description,
        "latitude": req.latitude,
        "longitude": req.longitude,
        "timestamp": datetime.utcnow().isoformat(),
        "status": "documented"
    }
    doc_id = save_document("disaster_claims", record)
    return {
        "success": True,
        "doc_id": doc_id,
        "timestamp": record["timestamp"],
        "message": "உங்கள் பண்ணை விவரங்கள் பூட்டப்பட்ட நேர முத்திரையுடன் பதிவாகியுள்ளது. பேரிடர் நேரத்தில் இந்த ஆவணம் உங்கள் காப்பீட்டு கோரிக்கையில் பயன்படும்."
    }


@router.post("/claim")
async def file_claim(req: DisasterClaimRequest):
    """File a disaster compensation claim."""
    prior_docs = query_collection("disaster_claims", [
        ("farmer_id", "==", req.farmer_id)
    ])
    
    prompt = (
        "Generate a complete disaster compensation claim for Tamil Nadu government. "
        f"Disaster type: {req.disaster_type}. Date: {req.date}. "
        f"Crop affected: {req.crop_type}. Area: {req.area_affected} acres. "
        f"Prior documentation: {len(prior_docs)} records on file. "
        "Generate filled claim in Tamil with: farmer details section, crop loss details, "
        "compensation amount estimate, supporting documents checklist. "
        "Respond in Tamil as JSON: "
        '{"claim_number": "", "disaster_type": "", "crop_loss_description": "", '
        '"compensation_estimate_inr": 0, "documents_checklist": [], "submission_steps": [], "claim_text": ""}'
    )
    
    response = await call_groq(prompt)
    claim = _extract_json(response)
    
    if not claim.get("claim_number"):
        import uuid
        claim = {
            "claim_number": f"TN-DISR-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:6].upper()}",
            "disaster_type": req.disaster_type,
            "crop_loss_description": f"{req.area_affected} ஏக்கர் {req.crop_type} பயிர் பாதிக்கப்பட்டுள்ளது",
            "compensation_estimate_inr": round(req.area_affected * 15000),
            "documents_checklist": ["ஆதார் அட்டை நகல்", "பட்டா ஆவணம்", "காவல் நிலைய புகார்", "புகைப்படங்கள்", "வேளாண்மை அலுவலர் சான்று"],
            "submission_steps": ["1. மாவட்ட ஆட்சியர் அலுவலகம் சென்று ஆவணங்கள் சமர்ப்பிக்கவும்", "2. தனியார் பாதிப்பு ஆய்வு கோரவும்", "3. ஆன்லைனில் tnagrisnet.tn.gov.in இல் பதிவு செய்யவும்"],
            "claim_text": f"கிளைம் எண்: TN-DISR-{datetime.now().strftime('%Y%m%d')} — {req.disaster_type} காரணமாக {req.area_affected} ஏக்கர் பயிர் இழப்பு."
        }
    
    save_document("disaster_claims", {"farmer_id": req.farmer_id, "claim": claim, "status": "filed"})
    return claim
