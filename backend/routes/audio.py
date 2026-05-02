from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
import io, json
from services.ai_service import call_groq

router = APIRouter()

class TTSRequest(BaseModel):
    text: str

@router.post("/daily-news-script")
async def daily_news_script(req: TTSRequest):
    """Generates a personalized daily news script for the farmer."""
    try:
        context = json.loads(req.text)
        farmer_name = context.get("name", "விவசாயி")
        district = context.get("district", "தமிழ்நாடு")
        crops = context.get("crops", ["பயிர்கள்"])
        gender = context.get("gender", "female")
        
        honorific = "அக்கா/அம்மா (Akka/Amma)" if gender == "female" else "அண்ணா/அப்பா (Anna/Appa)"
        
        prompt = (
            f"You are the voice of VAANI Radio, a digital sisterly companion. Write a warm, professional, and helpful 30-second daily briefing for {farmer_name} in {district}. "
            f"User Gender: {gender}. Address as {honorific}. "
            f"He/She grows {', '.join(crops)}. "
            "Include: 1) A quick weather alert for the district. 2) A positive market trend for one of the crops. "
            "3) A warm personal encouragement (Tamil) for the day. "
            "Keep it in natural spoken Tamil (rural-friendly). Don't use bullet points. Respond ONLY with the speech text."
        )
        script = await call_groq(prompt, max_tokens=1024)
        return {"script": script.strip()}
    except Exception as e:
        print(f"News Script Error: {e}")
        return {"script": f"வணக்கம் {farmer_name}. இன்றைய வேளாண் செய்திகளை அறிய VAANI செயலியை தொடர்ந்து பாருங்கள்."}

@router.post("/tts")
async def text_to_speech(req: TTSRequest):
    try:
        from gtts import gTTS
        tts = gTTS(text=req.text, lang='ta', slow=False)
        audio_stream = io.BytesIO()
        tts.write_to_fp(audio_stream)
        audio_stream.seek(0)
        return StreamingResponse(audio_stream, media_type="audio/mpeg")
    except Exception as e:
        print(f"TTS Error: {e}")
        return {"error": str(e)}

@router.post("/simplify")
async def simplify_text(req: TTSRequest):
    """Takes raw UI text and rewrites it as friendly, spoken rural Tamil."""
    # We don't have gender here easily unless we pass it from frontend. 
    # Let's assume the frontend will append gender to text or we'll just use general friendly language.
    prompt = (
        f"Rewrite this screen content into a highly conversational, empathetic, and extremely simple Tamil spoken response for a farmer. "
        f"Address the user warmly like a digital sister (VAANI). Use respectful rural Tamil. "
        f"Do not just read the text literally (like 'Button 1, Input Field'). Instead, summarize what the information means to the user, in a comforting voice. "
        f"Keep the response direct, natural, and supportive. DO NOT return English. Only return the final Tamil speech text.\n\n"
        f"Content to explain: {req.text}"
    )
    try:
        spoken_tamil = await call_groq(prompt, max_tokens=1024)
        return {"spoken_text": spoken_tamil.strip()}
    except Exception as e:
        print(f"Simplify Error: {e}")
        return {"error": str(e), "spoken_text": "மன்னிக்கவும், தகவலை படிப்பதில் சிறு பிழை."}
