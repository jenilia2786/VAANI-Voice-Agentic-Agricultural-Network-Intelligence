import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    # App Info
    APP_NAME = "VAANI — வாணி"
    VERSION = "1.1.0"
    DEBUG = os.getenv("DEBUG", "True").lower() == "true"
    
    # API Keys
    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
    
    # Firebase
    FIREBASE_CREDENTIALS_PATH = os.getenv("FIREBASE_CREDENTIALS_PATH", "./firebase_key.json")
    
    # External APIs
    OPEN_METEO_BASE_URL = os.getenv("OPEN_METEO_BASE_URL", "https://api.open-meteo.com/v1/forecast")
    AGMARKNET_BASE_URL = os.getenv("AGMARKNET_BASE_URL", "https://agmarknet.gov.in")
    
    # Service Flags
    USE_LOCAL_DB_ALWAYS = os.getenv("USE_LOCAL_DB_ALWAYS", "False").lower() == "true"

settings = Config()
