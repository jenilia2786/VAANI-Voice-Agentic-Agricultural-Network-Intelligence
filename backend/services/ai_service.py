import os
import groq
import asyncio
import json
from dotenv import load_dotenv

load_dotenv()

_client = None

def get_client():
    global _client
    if _client is None:
        api_key = os.getenv("GROQ_API_KEY", "")
        if api_key and api_key != "your_groq_api_key_here":
            _client = groq.Groq(api_key=api_key)
    return _client


async def call_groq(prompt: str, system: str = "", max_tokens: int = 2048) -> str:
    """Call Groq API and return text response. Falls back to mock on missing key."""
    client = get_client()
    if client is None:
        return _mock_response(prompt)
    try:
        messages = []
        if system:
            messages.append({"role": "system", "content": system})
        else:
            messages.append({"role": "system", "content": "You are VAANI, an AI assistant for Tamil Nadu women farmers. You respond in Tamil unless instructed otherwise."})
        
        messages.append({"role": "user", "content": prompt})

        chat_completion = await asyncio.to_thread(
            client.chat.completions.create,
            messages=messages,
            model="llama-3.1-8b-instant",
            max_tokens=max_tokens,
            temperature=0.3
        )
        return chat_completion.choices[0].message.content
    except Exception as e:
        print(f"Groq API error: {e}")
        return _mock_response(prompt)


async def call_groq_vision(prompt: str, image_base64: str, media_type: str = "image/jpeg") -> str:
    """Call Groq Vision with image input."""
    client = get_client()
    if client is None:
        return '{"disease_name": "இலை கருகல் நோய்", "severity": "medium", "organic_remedy": "வேப்பெண்ணெய் 5மிலி/லிட்டர் நீர் கலந்து தெளிக்கவும்", "chemical_remedy": "மேன்கோசெப் 2கிராம்/லிட்டர் நீர்", "cost_estimate": "500-800 ரூபாய்/ஏக்கர்", "prevention_tips": "நேர்மையான பாசனம் மற்றும் நல்ல காற்றோட்டம் பராமரிக்கவும்"}'
    try:
        image_url = f"data:{media_type};base64,{image_base64}"
        
        chat_completion = await asyncio.to_thread(
            client.chat.completions.create,
            model="llama-3.2-11b-vision-preview",
            messages=[
                {
                    "role": "user",
                    "content": [
                        {"type": "text", "text": prompt},
                        {
                            "type": "image_url",
                            "image_url": {
                                "url": image_url,
                            },
                        },
                    ],
                }
            ],
            max_tokens=2048,
        )
        return chat_completion.choices[0].message.content
    except Exception as e:
        print(f"Groq Vision error: {e}")
        return '{"disease_name": "இலை கருகல் நோய்", "severity": "medium", "organic_remedy": "வேப்பெண்ணெய் 5மிலி/லிட்டர் நீர் கலந்து தெளிக்கவும்", "chemical_remedy": "மேன்கோசெப் 2கிராம்/லிட்டர் நீர்", "cost_estimate": "500-800 ரூபாய்/ஏக்கர்", "prevention_tips": "நேர்மையான பாசனம் மற்றும் நல்ல காற்றோட்டம் பராமரிக்கவும்"}'


def _mock_response(prompt: str) -> str:
    """Return mock Tamil response that matches the expected routing schema."""
    return json.dumps({
        "feature_id": "chat",
        "confidence": 0.9,
        "is_incomplete": False,
        "extracted_params": {"crop": "", "district": "", "quantity": "", "problem": prompt},
        "summary_tamil": "வணக்கம்மா, நான் வாணி. உங்க கேள்விக்கு பதில் சொல்ல இப்போதைக்கு என்னால முடியல, ஆனா நீங்க வேற ஏதாவது உதவி வேணும்னா கேளுங்க."
    })
