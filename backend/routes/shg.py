from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
import os
import uuid

router = APIRouter()

from models.schemas import SHGJoinRequest, SHGHandleRequest
from services.firebase_service import save_document, query_collection, get_document

SHG_MESSAGES = []

class SHGGroup(BaseModel):
    id: str
    name: str # e.g. "Aruna SHG", "Malar SHG"
    leader_id: str
    village: str
    description: Optional[str] = "Socio-economic development group for women"
    members_count: int = 1

@router.post("/create")
async def create_group(name: str, leader_id: str, village: str):
    group_data = {
        "name": name,
        "leader_id": leader_id,
        "village": village,
        "members_count": 1,
        "members": [leader_id],
        "created_at": datetime.now().isoformat()
    }
    doc_id = save_document("shg_groups", group_data)
    return {"success": True, "group_id": doc_id}

@router.get("/groups")
async def get_groups(village: Optional[str] = None):
    filters = []
    if village:
        filters.append(("village", "==", village))
    
    groups = query_collection("shg_groups", filters or None)
    if not groups:
        groups = [
            {"id": "shg_1", "name": "மல்லிகை மகளிர் குழு", "leader_id": "leader1", "village": "Madurai", "members_count": 12},
            {"id": "shg_2", "name": "அருணா மகளிர் சுயவுதவி குழு", "leader_id": "leader2", "village": "Madurai", "members_count": 8},
        ]
    return {"groups": groups}

@router.post("/request-join")
async def request_join(req: SHGJoinRequest):
    request_data = {
        "farmer_id": req.farmer_id,
        "farmer_name": req.farmer_name,
        "shg_id": req.shg_id,
        "status": "pending",
        "timestamp": datetime.now().isoformat()
    }
    doc_id = save_document("shg_join_requests", request_data)
    return {"success": True, "request_id": doc_id, "message": "உங்கள் விண்ணப்பம் தலைவருக்கு அனுப்பப்பட்டது!"}

@router.get("/pending-requests")
async def get_pending_requests(shg_id: str):
    filters = [("shg_id", "==", shg_id), ("status", "==", "pending")]
    requests = query_collection("shg_join_requests", filters)
    return {"requests": requests or []}

@router.post("/handle-request")
async def handle_request(req: SHGHandleRequest):
    request = get_document("shg_join_requests", req.request_id)
    if not request:
        raise HTTPException(status_code=404, detail="Request not found")
    
    request["status"] = req.action
    save_document("shg_join_requests", request, req.request_id)
    
    if req.action == "approve":
        # Add to group
        group = get_document("shg_groups", req.shg_id)
        if group:
            if "members" not in group: group["members"] = []
            if request["farmer_id"] not in group["members"]:
                group["members"].append(request["farmer_id"])
                group["members_count"] = len(group["members"])
                save_document("shg_groups", group, req.shg_id)
                
                # Update farmer profile
                farmer = get_document("farmers", request["farmer_id"])
                if farmer:
                    farmer["shg_member"] = True
                    farmer["shg_id"] = req.shg_id
                    save_document("farmers", farmer, request["farmer_id"])

    return {"success": True, "message": f"விண்ணப்பம் {req.action} செய்யப்பட்டது"}

@router.get("/messages")
async def get_messages(group_id: str):
    # In a real app, query by group_id
    messages = [m for m in SHG_MESSAGES if m["group_id"] == group_id]
    if not messages:
        messages = [{
            "id": "msg1", "group_id": group_id, "farmer_name": "அட்மின்",
            "text_content": "இந்த குழுவிற்கு வருக! இங்கு நீங்கள் உங்கள் வங்கி சேமிப்பு பற்றி விவாதிக்கலாம்.",
            "timestamp": datetime.now()
        }]
    return {"messages": messages}

@router.post("/post")
async def post_message(
    group_id: str = Form(...),
    farmer_id: str = Form(...),
    farmer_name: str = Form(...),
    text_content: Optional[str] = Form(None),
    voice_file: Optional[UploadFile] = File(None)
):
    msg_id = str(uuid.uuid4())
    voice_url = None
    if voice_file:
        upload_dir = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "uploads")
        os.makedirs(upload_dir, exist_ok=True)
        file_path = os.path.join(upload_dir, f"{msg_id}.wav")
        with open(file_path, "wb") as f:
            f.write(await voice_file.read())
        voice_url = f"static/uploads/{msg_id}.wav"

    message = {
        "id": msg_id, "group_id": group_id, "farmer_id": farmer_id,
        "farmer_name": farmer_name, "text_content": text_content,
        "voice_url": voice_url, "timestamp": datetime.now()
    }
    SHG_MESSAGES.append(message)
    return {"status": "success", "message": message}
