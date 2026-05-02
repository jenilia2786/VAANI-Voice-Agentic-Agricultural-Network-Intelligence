from fastapi import APIRouter, HTTPException
from models.schemas import LegalAdviceRequest
from services.ai_service import call_groq
import json, re

router = APIRouter()

HELPLINES = [
    {"name": "Tamil Nadu Women Helpline", "number": "181", "language": "Tamil/English"},
    {"name": "National Legal Services Authority", "number": "15100", "language": "All languages"},
    {"name": "Tamil Nadu State Legal Services Authority", "number": "044-28410333", "language": "Tamil"},
    {"name": "Child Helpline", "number": "1098", "language": "Tamil"},
    {"name": "Police", "number": "100", "language": "Tamil"},
    {"name": "Domestic Violence Helpline (iCall)", "number": "9152987821", "language": "Tamil/Hindi/English"},
]


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


@router.post("/advice")
async def legal_advice(req: LegalAdviceRequest):
    """Get legal guidance for a farmer's problem."""
    prompt = (
        "You are a Tamil Nadu legal aid expert specializing in rural women's rights. "
        f"Issue type: {req.issue_type or 'general'}. District: {req.district or 'Tamil Nadu'}. "
        f"A woman farmer describes this problem: {req.problem}. "
        "Provide: 1) Her exact legal rights under Indian law in simple Tamil "
        "2) Step-by-step action plan (numbered) "
        "3) A brief legal notice template in Tamil she can use "
        "4) Time limits she must act within. "
        "5) IMPORTANT: A 'spoken_response' where you comfort her and explain the solution in extremely simple, conversational, and empathetic Tamil that a rural village woman would easily understand without legal jargon. "
        "Respond ONLY in Tamil as valid JSON: "
        '{"rights_explained": "", "action_plan": [], "legal_notice_template": "", '
        '"time_limits": "", "important_note": "", "spoken_response": ""}'
    )
    
    response = await call_groq(prompt, max_tokens=2048)
    advice = _extract_json(response)
    
    if not advice.get("rights_explained"):
        advice = {
            "rights_explained": "இந்திய அரசியலமைப்பு சட்டம் பிரிவு 14 மற்றும் 15 கீழ் நீங்கள் சம உரிமை கோர தகுதியடைகிறீர்கள். POCSO சட்டம், IPC பிரிவு 498A மற்றும் கார்மிக் சட்டங்கள் உங்களை பாதுகாக்கின்றன.",
            "action_plan": [
                "1. அருகில் உள்ள காவல் நிலையத்தில் புகார் பதிவு செய்யுங்கள்",
                "2. மாவட்ட சட்ட சேவை ஆணையத்தை தொடர்பு கொள்ளுங்கள்",
                "3. ஆவணங்களை சேகரியுங்கள்",
                "4. வழக்கறிஞரின் ஆலோசனை பெறுங்கள்"
            ],
            "legal_notice_template": "அன்புள்ள அம்மா/ஐயா, இந்த அறிவிப்பின் மூலம் நான் [உங்கள் பெயர்] அறியப்படுகிறேன்...",
            "time_limits": "பொதுவாக 3 ஆண்டுகளுக்குள் சட்ட நடவடிக்கை எடுக்க வேண்டும்",
            "important_note": "உங்கள் உரிமைகளை நீங்கள் பெற தகுதி உள்ளவள். தைரியமாக இருங்கள்.",
            "spoken_response": "அம்மா பயப்பட வேண்டாம், உங்களுக்கு சட்டம் முழு ஆதரவா இருக்கு. முதல்ல போய் போலீஸ்ல ஒரு கம்ப்ளைன்ட் கொடுங்க, அப்புறம் இலவச சட்ட உதவி மையத்த பாருங்க. அவங்க உங்களுக்கு உதவி செய்வாங்க."
        }
    
    return {
        "advice": advice,
        "helplines": HELPLINES,
        "issue_type": req.issue_type,
    }
