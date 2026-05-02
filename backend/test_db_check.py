import os
import sys

# Add backend to path
sys.path.append(os.getcwd())

from firebase_config import get_db

def test_db():
    db = get_db()
    if db:
        print("DB_STATUS: CONNECTED")
        try:
            farmers_ref = db.collection('farmers')
            docs = list(farmers_ref.limit(1).stream())
            if docs:
                print(f"DB_DATA: FOUND ({len(docs)} sample found)")
            else:
                print("DB_DATA: EMPTY_COLLECTION")
        except Exception as e:
            print(f"DB_ERROR: {str(e)}")
    else:
        print("DB_STATUS: DISCONNECTED")

if __name__ == "__main__":
    test_db()
