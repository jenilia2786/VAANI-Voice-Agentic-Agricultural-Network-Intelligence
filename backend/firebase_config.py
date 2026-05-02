import os
import firebase_admin
from firebase_admin import credentials, firestore
from dotenv import load_dotenv

load_dotenv()

_db = None

def get_db():
    global _db
    if _db is None:
        cred_path = os.getenv("FIREBASE_CREDENTIALS_PATH", "./firebase_key.json")
        if not firebase_admin._apps:
            if os.path.exists(cred_path):
                cred = credentials.Certificate(cred_path)
                firebase_admin.initialize_app(cred)
            else:
                # Demo mode: no real Firebase — return mock
                return None
        _db = firestore.client()
    return _db
