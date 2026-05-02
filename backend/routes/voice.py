from fastapi import APIRouter, HTTPException
from models.schemas import VoiceRouteRequest
from services.ai_service import call_groq
import json, re, asyncio

router = APIRouter()

FEATURES = [
    {"id": "crop_disease", "name_tamil": "பயிர் நோய்", "keywords": ["நோய்", "disease", "இலை", "புள்ளி", "மஞ்சள்", "கருகல்"]},
    {"id": "market_prices", "name_tamil": "சந்தை விலை", "keywords": ["விலை", "price", "மண்டி", "market", "சந்தை", "கிலோ"]},
    {"id": "govt_schemes", "name_tamil": "அரசு திட்டம்", "keywords": ["திட்டம்", "scheme", "மானியம்", "அரசு", "உதவி", "பணம்"]},
    {"id": "collective_sale", "name_tamil": "கூட்டு விற்பனை", "keywords": ["கூட்டு", "collective", "விற்பனை", "சேர்", "குழு"]},
    {"id": "credit_score", "name_tamil": "கடன் மதிப்பெண்", "keywords": ["கடன்", "loan", "credit", "வங்கி", "score"]},
    {"id": "fake_input", "name_tamil": "போலி உரம்", "keywords": ["போலி", "fake", "உரம்", "மருந்து", "நகல்"]},
    {"id": "contract", "name_tamil": "ஒப்பந்தம்", "keywords": ["ஒப்பந்தம்", "contract", "சட்டம்", "கையொப்பம்"]},
    {"id": "crop_planning", "name_tamil": "பயிர் திட்டம்", "keywords": ["என்ன பயிர்", "திட்டம்", "சாகுபடி", "விதைக்க", "மாற்றுப்பயிர்"]},
    {"id": "pest_outbreak", "name_tamil": "பூச்சி வெடிப்பு", "keywords": ["பூச்சி", "pest", "வண்டு", "படிவு", "வெடிப்பு"]},
    {"id": "waste", "name_tamil": "கழிவு", "keywords": ["கழிவு", "waste", "வைக்கோல்", "தண்டு"]},
    {"id": "soil_health", "name_tamil": "மண் ஆரோக்கியம்", "keywords": ["மண்", "soil", "NPK", "சோதனை", "ஆய்வு"]},
    {"id": "weather", "name_tamil": "வானிலை", "keywords": ["மழை", "weather", "வானிலை", "காற்று", "புயல்", "வெப்பம்"]},
    {"id": "legal", "name_tamil": "சட்ட உதவி", "keywords": ["சட்டம்", "legal", "உரிமை", "நிலம்", "தகராறு", "புகார்", "இறந்து", "வழக்கு", "போலீஸ்"]},
    {"id": "marketplace", "name_tamil": "நேரடி சந்தை", "keywords": ["விற்க", "வாங்க", "marketplace", "D2C", "நேரடி"]},
    {"id": "wellness", "name_tamil": "மன நலம்", "keywords": ["மன நலம்", "wellness", "சோர்வு", "கஷ்டம்", "பயம்", "மனம்"]},
    {"id": "radio", "name_tamil": "வேளாண் வானொலி", "keywords": ["வானொலி", "radio", "செய்தி", "கேள்", "பாட்டு"]},
    {"id": "chat", "name_tamil": "பொது உரையாடல்", "keywords": ["வணக்கம்", "நன்றி", "தேங்க்ஸ்", "எப்படி", "யார்", "hello", "hi"]},
]

def _keyword_route(text: str) -> dict:
    text_lower = text.lower()
    best = None
    best_score = 0
    for feature in FEATURES:
        score = sum(1 for kw in feature["keywords"] if kw in text_lower)
        if score > best_score:
            best_score = score
            best = feature
    fid = best["id"] if best else "chat"
    
    # Smarter fallback extraction for common crops/districts
    extracted = {"crop": "", "district": "", "quantity": "", "problem": text}
    
    # Look for crop in text
    crop_map = {"தக்காளி": "tomato", "tomato": "tomato", "வெங்காயம்": "onion", "onion": "onion", "நெல்": "paddy", "paddy": "paddy"}
    for k, v in crop_map.items():
        if k in text_lower:
            extracted["crop"] = v
            break
            
    # Look for district in text
    dist_map = {"கரூர்": "Karur", "karur": "Karur", "மதுரை": "Madurai", "madurai": "Madurai", "சென்னை": "Chennai", "chennai": "Chennai"}
    for k, v in dist_map.items():
        if k in text_lower:
            extracted["district"] = v
            break

    is_inc = False
    sum_ta = "வணக்கம்மா, நான் வாணி." if fid == "chat" else "சரிம்மா, நான் என்னன்னு பார்க்கிறேன்."
    if fid == "market_prices" and not extracted["crop"]:
        is_inc = True
        sum_ta = "சரிம்மா, ஆனா என்ன பயிர் விலை வேணும்னு சொன்னா தான் என்னால பார்க்க முடியும்."
    
    return {"feature_id": fid, "confidence": 0.5, "is_incomplete": is_inc, "extracted_params": extracted, "summary_tamil": sum_ta}

@router.post("/route")
async def route_voice(req: VoiceRouteRequest):
    legal_keywords = {"சட்டம்","legal","உரிமை","நிலம்","தகராறு","புகார்","இறந்து","வழக்கு","கோர்ட்","போலீஸ்"}
    text_lower = req.text.lower()
    
    # Get farmer context
    from services.firebase_service import get_document
    from services.weather_service import get_weather_forecast
    
    farmer_ctx = ""
    district = "Madurai"
    farmer_name = "விவசாயி"
    gender = "female"
    
    if req.farmer_id:
        f_profile = get_document("farmers", req.farmer_id)
        if f_profile:
            district = f_profile.get("district", "Madurai")
            farmer_name = f_profile.get("name", "விவசாயி")
            gender = f_profile.get("gender", "female")
            farmer_ctx = f"{farmer_name} (Gender: {gender}) from {district} district, grows {', '.join(f_profile.get('crops', []))}."
    
    # Get live weather context for proactive advice - with strict timeout to prevent hangs
    try:
        weather_data = await asyncio.wait_for(get_weather_forecast(district), timeout=3.0)
        today_weather = weather_data.get("forecast", [{}])[0]
        weather_ctx = f"Weather in {district}: {today_weather.get('description', 'Sunny')}, {today_weather.get('max_temp')}°C."
    except:
        weather_ctx = "Weather data unavailable."
    
    # Removed hardcoded hijacks to let Groq handle intent intelligently
    
    features_list = ", ".join([f"{f['id']} ({f['name_tamil']})" for f in FEATURES])
    current_time = "2026-03-11"
    
    # Provide hints for English names to ensure mapping works
    crop_hints = "paddy, tomato, onion, rice, cotton, turmeric, chilli, banana, coconut, etc."
    district_hints = "Karur, Madurai, Coimbatore, Chennai, Salem, Erode, Trichy, etc."
    
    prompt = (
        f"User said: '{req.text}'. You are VAANI, a digital sister and agricultural companion for Tamil Nadu farmers. "
        f"Context: Farmer is {farmer_ctx or 'Unknown'}. Today's Weather: {weather_ctx}. Date: {current_time}. "
        f"User Gender: {gender}. "
        "Your Goals: "
        f"1. Be a real companion. ALWAYS answer the user's specific question DIRECTLY in the 'summary_tamil' field using Rural Tamil. "
        f"2. Personality: Sisterly (அக்கா/தோழி), supportive, expert. "
        f"3. PERSONALIZATION: If gender is 'female', address as 'Amma/Akka' (அம்மா/அக்கா). If 'male', address as 'Appa/Anna/Thambi' (அப்பா/அண்ணா/தம்பி). Use the farmer's name {farmer_name} if known. "
        "4. Map the user's query to the MOST RELEVANT feature_id from the list if it matches a specific tool. "
        "5. If information is missing (e.g. crop name), tell the user EXACTLY what to fill in the form that will open. For example: 'சரிப்பா, தக்காளி விலையை பார்க்கிறேன், ஆனா எந்த மாவட்டம்னு சொல்லல. கீழ இருக்குற பெட்டியில மாவட்டத்தை மட்டும் தேர்ந்தெடுங்க.' "
        "6. If the user asks a general question (e.g., 'What are the laws for women farmers?'), PROVIDE A DETAILED ANSWER in 'summary_tamil' and ALSO return the relevant feature_id (e.g., 'legal') so the user can see more tools. "
        f"Available Features: {features_list}. "
        "5. **CRITICAL**: Extract 'crop' and 'district' in ENGLISH. Translate Tamil names (e.g., 'தக்காளி' -> 'tomato'). "
        "Rules: "
        "- Format as valid JSON only."
        '{"feature_id": "", "confidence": 0.9, "is_incomplete": false, "extracted_params": {"crop": "", "district": "", "quantity": "", "problem": ""}, "summary_tamil": "உங்கள் நேரடி பதில் இங்கே..."}'
    )
    
    try:
        response = await call_groq(prompt, max_tokens=1000)
        match = re.search(r'\{.*\}', response, re.DOTALL)
        if match:
            result = json.loads(match.group())
        else:
            print("No JSON found in Groq response, falling back to keywords")
            result = _keyword_route(req.text)
    except Exception as e:
        print(f"Voice route error: {e}")
        result = _keyword_route(req.text)
        
    p = result.get("extracted_params", {})
    for k in ["crop", "district", "quantity", "problem"]:
        if k not in p: p[k] = ""
    if not p.get("problem"): p["problem"] = req.text
    result["extracted_params"] = p
    result["is_incomplete"] = result.get("is_incomplete", False)
    result["original_text"] = req.text
    return result


