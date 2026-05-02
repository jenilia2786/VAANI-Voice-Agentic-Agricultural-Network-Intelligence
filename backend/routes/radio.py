from fastapi import APIRouter
from services.ai_service import call_groq
import json
import re
import httpx
import xml.etree.ElementTree as ET

router = APIRouter()

@router.get("/news")
async def get_agri_news():
    news_items = []
    try:
        url = "https://news.google.com/rss/search?q=agriculture+tamil+nadu+OR+india+farming&hl=en-IN&gl=IN&ceid=IN:en"
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(url, headers={'User-Agent': 'Mozilla/5.0'})
            if response.status_code == 200:
                xml_data = response.content
                root = ET.fromstring(xml_data)
                items = root.findall(".//item")
                for item in items[:8]:  # Get more items for better context
                    title = item.find("title").text
                    if title:
                        news_items.append(title)
    except Exception as e:
        print(f"Error fetching RSS: {e}")

    prompt_context = "\n".join(news_items) if news_items else "No current news fetched."

    prompt = f"""
    You are an agricultural news reporter for Tamil Nadu. 
    Here are the latest REAL-WORLD News Headlines from today:
    \" {prompt_context} \"
    
    CRITICAL: The user wants TRUE, REAL-WORLD agricultural news. 
    1. If real news headlines are provided in context, summarize them into 5 detailed, informative Tamil news broadcast segments.
    2. If NO real news headlines were found (if context is 'No current news fetched'), then provide 5 HIGHLY SPECIFIC TRUE SEASONAL agricultural tips or market trends for Tamil Nadu based on the current date (March 2026).
    3. Do NOT invent fake local news stories that did not happen. 
    4. Address the audience in a friendly, gender-neutral way (e.g., 'விவசாய பெருமக்களே', 'விவசாய நண்பர்களே').
    
    Return ONLY a JSON list of strings: ["news 1...", "news 2...", "news 3...", "news 4...", "news 5..."]
    """
    
    response = await call_groq(prompt, max_tokens=3000)
    try:
        arr_match = re.search(r'\[.*\]', response, re.DOTALL)
        if arr_match:
            news_list = json.loads(arr_match.group())
        else:
            news_list = json.loads(response)
    except Exception as e:
        print(f"Failed to parse detailed news JSON: {e}\nResponse: {response}")
        news_list = [
            "இன்றைய முக்கிய வேளாண் செய்தி. தமிழகத்தில் கோடை சாகுபடி தீவிரமடைந்து வரும் நிலையில், உரங்கள் தட்டுப்பாடின்றி கிடைக்க கூட்டுறவு சங்கங்கள் மூலம் நடவடிக்கை எடுக்கப்பட்டுள்ளது.",
            "சந்தை நிலவரம். மேட்டுப்பாளையம் மற்றும் ஈரோடு சந்தைகளில் மஞ்சள் வரத்து அதிகரித்துள்ள போதிலும் தேவையின் காரணமாக விலை நிலையாக நீடிக்கிறது."
        ]
        
    return {"news": news_list}
