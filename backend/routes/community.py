from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from firebase_config import get_db

router = APIRouter()

class CommunityPostRequest(BaseModel):
    farmer_id: str
    name: str
    district: str
    crop: str
    message: str

class CommunityFetchRequest(BaseModel):
    district: str
    crop: str

# In-memory storage for demo since Firebase setup might be complex
# In real life, store in Firestore.
COMMUNITY_POSTS = []

@router.post("/post")
async def create_post(req: CommunityPostRequest):
    post = {
        "id": f"post_{len(COMMUNITY_POSTS)+1}",
        "farmer_id": req.farmer_id,
        "name": req.name,
        "district": req.district,
        "crop": req.crop,
        "message": req.message,
        "timestamp": datetime.now().isoformat()
    }
    
    # Try saving to firebase if configured, else keep in memory
    try:
        db = get_db()
        if db:
            db.collection("community_posts").add(post)
    except:
        pass
        
    COMMUNITY_POSTS.append(post)
    return {"message": "Post added successfully", "post": post}

@router.get("/posts")
async def get_posts(district: str, crop: str):
    # Filter by district and crop
    try:
        db = get_db()
        if db:
            docs = db.collection("community_posts").where("district", "==", district).where("crop", "==", crop).order_by("timestamp", direction="DESCENDING").limit(50).stream()
            posts = [doc.to_dict() for doc in docs]
            if posts:
                return {"posts": posts}
    except:
        pass
        
    # Fallback to in-memory
    filtered = [p for p in COMMUNITY_POSTS if p["district"] == district and p["crop"] == crop]
    # Add some dummy posts if empty
    if not filtered:
        filtered = [
            {
                "id": "demo_1",
                "farmer_id": "demo",
                "name": "தமிழ் காசி",
                "district": district,
                "crop": crop,
                "message": f"இந்த பகுதியில் {crop} சாகுபடி எப்படி இருக்கிறது? மழை நன்றாக உள்ளதா?",
                "timestamp": datetime.now().isoformat()
            },
            {
                "id": "demo_2",
                "farmer_id": "demo",
                "name": "முத்துலட்சுமி",
                "district": district,
                "crop": crop,
                "message": f"எனது {crop} செடிகளில் இலை சுருட்டு நோய் தென்படுகிறது. என்ன உரம் போடுவது?",
                "timestamp": datetime.now().isoformat()
            }
        ]
    
    # Sort by timestamp decending
    filtered.sort(key=lambda x: x["timestamp"], reverse=True)
    return {"posts": filtered}
