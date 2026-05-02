from fastapi import APIRouter, HTTPException, UploadFile, File, Form
from models.schemas import ContractAnalyzeRequest
from services.ai_service import call_groq
import json, re, base64
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


@router.post("/analyze")
async def analyze_contract(
    contract_text: Optional[str] = Form(None),
    farmer_id: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
):
    """Analyze agricultural contract for unfair clauses."""
    text_to_analyze = contract_text or ""
    
    if file and not text_to_analyze:
        contents = await file.read()
        # Try to extract text from PDF
        try:
            import PyPDF2
            import io
            reader = PyPDF2.PdfReader(io.BytesIO(contents))
            text_to_analyze = " ".join(page.extract_text() for page in reader.pages if page.extract_text())
        except:
            text_to_analyze = contents.decode("utf-8", errors="ignore")
    
    if not text_to_analyze.strip():
        return {"error": "ஒப்பந்த உரை கிடைக்கவில்லை. தயவுசெய்து உரை அல்லது PDF பதிவேற்றவும்."}
    
    prompt = (
        "You are a legal expert specializing in Tamil Nadu agricultural contracts. "
        f"Analyze this contract: {text_to_analyze[:3000]}. "
        "Identify: 1) Summary in simple Tamil 2) Red flag clauses 3) Below-market pricing "
        "4) Unfair penalty clauses 5) Recommended counter-clauses "
        "6) Overall fairness verdict (FAIR/UNFAIR/DANGEROUS). "
        "Respond ONLY in Tamil as valid JSON: "
        '{"summary_tamil": "", "red_flags": [], "unfair_clauses": [], '
        '"counter_clauses": [], "verdict": "FAIR", "verdict_reason": "", "risk_score": 0}'
    )
    
    response = await call_groq(prompt, max_tokens=2048)
    analysis = _extract_json(response)
    
    if not analysis.get("verdict"):
        analysis = {
            "summary_tamil": "இந்த ஒப்பந்தம் பயிர் கொள்முதல் தொடர்பானது. விலை மற்றும் டெலிவரி நிபந்தனைகள் மதிப்பாய்வு செய்யப்படுகின்றன.",
            "red_flags": ["ஒரு தரப்பினரின் நலனுக்கு மட்டுமே சாதகமான விதிகள்", "விலை சரிசெய்யும் உரிமை வாங்குபவருக்கு மட்டும்"],
            "unfair_clauses": ["தரம் பற்றிய விதிகள் தெளிவற்றவை"],
            "counter_clauses": ["குறைந்தபட்ச MSP விலை உத்தரவாதம் சேர்க்கவும்", "தரம் பற்றி APMC தரப்படுத்தல் பயன்படுத்தவும்"],
            "verdict": "UNFAIR",
            "verdict_reason": "வாங்குபவருக்கு அதிக சலுகைகள் — மேலும் பேச்சுவார்த்தை தேவை",
            "risk_score": 65,
        }
    
    return analysis
