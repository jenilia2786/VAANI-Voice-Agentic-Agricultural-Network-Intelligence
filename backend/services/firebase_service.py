from firebase_config import get_db
from datetime import datetime
import uuid, json, os
from typing import Optional, Any
import traceback
from config import settings

LOCAL_DB_FILE = "local_db.json"

def _load_local_db():
    if not os.path.exists(LOCAL_DB_FILE):
        return {}
    try:
        with open(LOCAL_DB_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    except:
        return {}

def _save_local_db(db_data):
    try:
        with open(LOCAL_DB_FILE, "w", encoding="utf-8") as f:
            json.dump(db_data, f, indent=4)
    except Exception as e:
        print(f"Error saving local DB: {e}")

def _ts():
    return datetime.utcnow().isoformat()

def save_document(collection: str, data: dict, doc_id: Optional[str] = None) -> str:
    """Save a document to Firestore with Local Fallback."""
    if not doc_id:
        doc_id = str(uuid.uuid4())
    
    data["id"] = doc_id
    if "created_at" not in data:
        data["created_at"] = _ts()
    
    # Always save locally first for guaranteed demo success
    local_db = _load_local_db()
    if collection not in local_db: local_db[collection] = {}
    local_db[collection][doc_id] = data
    _save_local_db(local_db)
    
    # Try Cloud if not in "Always Local" mode
    if not settings.USE_LOCAL_DB_ALWAYS:
        db = get_db()
        if db:
            try:
                db.collection(collection).document(doc_id).set(data)
            except Exception as e:
                # Catch "Service Disabled" or other Permission issues
                print(f"⚠️ Cloud Save Failed (Collection: {collection}, ID: {doc_id}): {e}")
                
    return doc_id

def get_document(collection: str, doc_id: str) -> Optional[dict]:
    """Get a document from Firestore or Local Fallback."""
    # 1. Try Cloud
    if not settings.USE_LOCAL_DB_ALWAYS:
        db = get_db()
        if db:
            try:
                doc = db.collection(collection).document(doc_id).get()
                if doc.exists: return doc.to_dict()
            except Exception as e:
                print(f"⚠️ Cloud Get Failed: {e}")
            
    # 2. Try Local Fallback
    local_db = _load_local_db()
    return local_db.get(collection, {}).get(doc_id)

def query_collection(collection: str, filters: list = None, limit: int = 50) -> list:
    """Query a collection with Local Fallback."""
    if not settings.USE_LOCAL_DB_ALWAYS:
        db = get_db()
        if db:
            try:
                ref = db.collection(collection)
                if filters:
                    for field, op, value in filters:
                        ref = ref.where(field, op, value)
                docs = ref.limit(limit).stream()
                return [doc.to_dict() for doc in docs]
            except Exception as e:
                print(f"⚠️ Cloud Query Failed: {e}")
            
    # Local fallback query (simple filter)
    local_db = _load_local_db()
    items = list(local_db.get(collection, {}).values())
    if filters:
        for field, op, value in filters:
            if op == "==":
                items = [i for i in items if i.get(field) == value]
            elif op == "in":
                items = [i for i in items if i.get(field) in value]
    return items[:limit]

def update_document(collection: str, doc_id: str, data: dict):
    """Update a document with Local Fallback."""
    data["updated_at"] = _ts()
    
    # 1. Update Local
    local_db = _load_local_db()
    if collection in local_db and doc_id in local_db[collection]:
        local_db[collection][doc_id].update(data)
        _save_local_db(local_db)
    else:
        # If it doesn't exist locally, create it (best effort)
        if collection not in local_db: local_db[collection] = {}
        local_db[collection][doc_id] = data
        _save_local_db(local_db)
    
    # 2. Try Cloud
    if not settings.USE_LOCAL_DB_ALWAYS:
        db = get_db()
        if db:
            try:
                db.collection(collection).document(doc_id).update(data)
            except Exception as e:
                print(f"⚠️ Cloud Update Failed: {e}")

