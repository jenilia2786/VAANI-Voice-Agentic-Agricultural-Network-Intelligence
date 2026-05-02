import httpx
from typing import Optional

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

# Approximate coordinates for TN districts
DISTRICT_COORDS = {
    "Chennai": (13.0827, 80.2707),
    "Coimbatore": (11.0168, 76.9558),
    "Madurai": (9.9252, 78.1198),
    "Thanjavur": (10.7870, 79.1378),
    "Salem": (11.6643, 78.1460),
    "Tirunelveli": (8.7139, 77.7567),
    "Erode": (11.3410, 77.7172),
    "Tiruchirappalli": (10.7905, 78.7047),
    "Vellore": (12.9165, 79.1325),
    "Namakkal": (11.2192, 78.1673),
    "Dharmapuri": (12.1211, 78.1582),
    "Krishnagiri": (12.5186, 78.2137),
    "Cuddalore": (11.7480, 79.7714),
    "Villupuram": (11.9389, 79.4925),
    "Nagapattinam": (10.7672, 79.8449),
    "Tiruvarur": (10.7720, 79.6368),
    "Mayiladuthurai": (11.1017, 79.6543),
    "Ariyalur": (11.1365, 79.0774),
    "Perambalur": (11.2298, 78.8806),
    "Karur": (10.9601, 78.0766),
    "Dindigul": (10.3624, 77.9695),
    "Theni": (10.0104, 77.4776),
    "Virudhunagar": (9.5851, 77.9629),
    "Ramanathapuram": (9.3639, 78.8395),
    "Sivaganga": (9.8477, 78.4857),
    "Pudukottai": (10.3797, 78.8201),
    "Thoothukudi": (8.7642, 78.1348),
    "Kanyakumari": (8.0883, 77.5385),
    "Nilgiris": (11.4916, 76.7337),
    "Tiruppur": (11.1085, 77.3411),
    "Tiruvannamalai": (12.2253, 79.0745),
    "Ranipet": (12.9242, 79.3328),
    "Tirupathur": (12.4962, 78.5607),
    "Chengalpattu": (12.6921, 79.9762),
    "Kancheepuram": (12.8342, 79.7036),
    "Tiruvallur": (13.1434, 79.9078),
    "Kallakurichi": (11.7379, 78.9597),
    "Tenkasi": (8.9595, 77.3152),
}

DEFAULT_COORDS = (11.1271, 78.6569)  # TN center


async def get_weather_forecast(district: str) -> dict:
    """Fetch 14-day weather from Open-Meteo (free, no API key needed)."""
    lat, lon = DISTRICT_COORDS.get(district, DEFAULT_COORDS)
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.get(
                OPEN_METEO_URL,
                params={
                    "latitude": lat,
                    "longitude": lon,
                    "daily": "temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,weathercode",
                    "hourly": "relativehumidity_2m",
                    "timezone": "Asia/Kolkata",
                    "forecast_days": 14
                }
            )
            if response.status_code == 200:
                data = response.json()
                return _parse_forecast(data, district)
    except Exception as e:
        print(f"Weather API error: {e}")
    
    return _mock_weather(district)


def _parse_forecast(data: dict, district: str) -> dict:
    daily = data.get("daily", {})
    days = daily.get("time", [])
    max_temps = daily.get("temperature_2m_max", [])
    min_temps = daily.get("temperature_2m_min", [])
    rainfall = daily.get("precipitation_sum", [])
    windspeed = daily.get("windspeed_10m_max", [])
    codes = daily.get("weathercode", [])
    
    WMO_CODES = {
        0: "☀️ தெளிவான வானம்", 1: "🌤 பெரும்பாலும் தெளிவான வானம்",
        2: "⛅ ஓரளவு மேகமூட்டம்", 3: "☁️ மேகமூட்டமான வானம்",
        45: "🌫 மூட்டம்", 51: "🌦 லேசான தூறல்",
        61: "🌧 லேசான மழை", 63: "🌧 மிதமான மழை",
        65: "⛈ கனமழை", 80: "🌦 மழை சாத்தியம்",
        95: "⛈ இடியுடன் மழை", 99: "⛈ கடுமையான புயல்",
    }
    
    forecast_days = []
    for i in range(min(14, len(days))):
        code = codes[i] if i < len(codes) else 0
        desc = WMO_CODES.get(code // 10 * 10, WMO_CODES.get(code, "🌤 வானிலை"))
        forecast_days.append({
            "date": days[i] if i < len(days) else "",
            "max_temp": max_temps[i] if i < len(max_temps) else 32,
            "min_temp": min_temps[i] if i < len(min_temps) else 24,
            "rainfall_mm": rainfall[i] if i < len(rainfall) else 0,
            "windspeed": windspeed[i] if i < len(windspeed) else 10,
            "description": desc,
            "weather_code": code,
        })
    
    has_heavy_rain = any(d["rainfall_mm"] > 50 for d in forecast_days[:3])
    has_storm = any(d.get("weather_code", 0) >= 95 for d in forecast_days[:3])
    
    return {
        "district": district,
        "forecast": forecast_days,
        "disaster_alert": has_storm or has_heavy_rain,
        "alert_message": "⚠️ அடுத்த 3 நாட்களில் கனமழை / புயல் எச்சரிக்கை!" if (has_storm or has_heavy_rain) else None,
        "data_source": "Open-Meteo"
    }


def _mock_weather(district: str) -> dict:
    """Return mock weather data."""
    from datetime import date, timedelta
    import random
    
    today = date.today()
    forecast_days = []
    for i in range(14):
        d = today + timedelta(days=i)
        rain = random.choice([0, 0, 0, 5, 10, 25])
        forecast_days.append({
            "date": d.isoformat(),
            "max_temp": 30 + random.randint(-3, 5),
            "min_temp": 22 + random.randint(-2, 3),
            "rainfall_mm": rain,
            "windspeed": random.randint(5, 20),
            "description": "🌧 லேசான மழை" if rain > 0 else "☀️ தெளிவான வானம்",
            "weather_code": 61 if rain > 0 else 0,
        })
    
    return {
        "district": district,
        "forecast": forecast_days,
        "disaster_alert": False,
        "alert_message": None,
        "data_source": "VAANI மதிப்பீட்டு தரவு (demo)"
    }
