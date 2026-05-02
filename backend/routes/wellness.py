from fastapi import APIRouter, HTTPException
from models.schemas import WellnessCheckinRequest
from services.ai_service import call_groq
from services.firebase_service import save_document
from datetime import datetime
import json, re

router = APIRouter()

DISTRESS_HELPLINES = [
    {"name": "SNEHI Helpline", "number": "044-24640050", "hours": "24/7"},
    {"name": "iCall", "number": "9152987821", "hours": "Mon-Sat 8am-10pm"},
    {"name": "Vandrevala Foundation", "number": "1860-2662-345", "hours": "24/7"},
    {"name": "Tamil Nadu Women Helpline", "number": "181", "hours": "24/7"},
]

BREATHING_EXERCISE = (
    "4-7-8 மூச்சுப் பயிற்சி: 4 விநாடி உள்ளே இழுங்கள், 7 விநாடி பிடிக்கவும், "
    "8 விநாடி வெளியே விடுங்கள். 3 முறை செய்யுங்கள். இது மனதை அமைதிப்படுத்தும்."
)


def _detect_distress(mood_score: int, message: str) -> bool:
    distress_words = ["பயம்", "துக்கம்", "அழுகிறேன்", "சோர்வு", "மரணம்", "இறக்க", "வாழ வேண்டாம்", "கஷ்டம்"]
    return mood_score <= 2 or any(w in (message or "") for w in distress_words)


@router.post("/checkin")
async def wellness_checkin(req: WellnessCheckinRequest):
    """Daily mental wellness check-in with compassionate AI response."""
    is_distressed = _detect_distress(req.mood_score, req.message or "")
    
    mood_context = {1: "மிகவும் மோசமாக", 2: "கஷ்டமாக", 3: "சாதாரணமாக", 4: "நன்றாக", 5: "மிகவும் மகிழ்ச்சியாக"}
    
    system_prompt = (
        "You are a compassionate Tamil-speaking counsellor named VAANI. "
        "This is a Tamil Nadu woman farmer. Respond with warmth, understanding, and practical support. "
        "Never be clinical. If you detect serious distress or suicidal ideation, gently provide helpline numbers. "
        "Keep response under 100 words in Tamil. Use simple, village-friendly Tamil language."
    )
    
    prompt = (
        f"ஒரு விவசாயி மனநிலை மதிப்பு {req.mood_score}/5 ({mood_context.get(req.mood_score, '')}) என்று சொல்கிறாள். "
        f"அவள் சொல்வது: '{req.message or 'எதுவும் சொல்லவில்லை'}'. "
        "அவளுக்கு ஆறுதலான, அன்பான பதில் சொல்லுங்கள். "
        "{'If distressed: gently suggest helpline' if is_distressed else 'Encourage and uplift her.'}"
    )
    
    response_text = await call_groq(prompt, system=system_prompt, max_tokens=300)
    
    # Save anonymous log (no content stored)
    log_record = {
        "farmer_id": req.farmer_id,
        "mood_score": req.mood_score,
        "distress_flag": is_distressed,
        "timestamp": datetime.utcnow().isoformat(),
    }
    save_document("wellness_logs", log_record)
    
    result = {
        "response": response_text,
        "mood_score": req.mood_score,
        "distress_detected": is_distressed,
        "breathing_exercise": BREATHING_EXERCISE if req.mood_score <= 3 else None,
    }
    
    if is_distressed:
        result["helplines"] = DISTRESS_HELPLINES
        result["urgent_message"] = "நீங்கள் தனியாக இல்லீர்கள். உதவி கேளுங்கள் — அது தைரியத்தின் அடையாளம்."
    
    return result
