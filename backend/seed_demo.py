from services.firebase_service import update_document, get_document
from services.activity_service import log_activity
from datetime import datetime, timedelta

def seed_demo_data(farmer_id: str):
    """Seed a demo account with realistic data and history for the hackathon."""
    if not farmer_id:
        print("No farmer_id provided.")
        return

    # 1. Update Profile Details
    demo_profile = {
        "name": "ஜெனி (Test User)",
        "district": "Coimbatore",
        "crops": ["Paddy", "Turmeric", "Banana"],
        "land_size": 2.5,
        "village": "Thondamuthur",
        "shg_member": True,
        "activity_history": [] # Clear old history for fresh demo
    }
    update_document("farmers", farmer_id, demo_profile)
    
    # 2. Add realistic History entries
    # We use log_activity so it saves to both the global log and the farmer document
    
    activities = [
        ("Market Check", "Checked Mandi prices for Turmeric", "Price: ₹8,400/quintal"),
        ("Crop Disease", "Analyzed Paddy leaf image", "Detected: Brown Spot (Low severity)"),
        ("Govt Schemes", "Matched with PM-KISAN scheme", "Status: Eligible"),
        ("Collective Sale", "Joined Coimbatore Turmeric Collective", "Quantity: 500kg"),
        ("Soil Health", "Analyzed Soil Test Report", "Recommendation: Add Organic Manure"),
        ("Weather", "Checked 7-day forecast", "Alert: Moderate rain expected on Saturday")
    ]
    
    # Log them with slightly different dates for realism
    for i, (feature, action, details) in enumerate(activities):
        # Fake a date slightly in the past
        # Note: log_activity currently uses datetime.now(), but for demo we'll just log them sequentially
        log_activity(farmer_id, feature, action, details)

    print(f"Successfully seeded demo data for {farmer_id}")

if __name__ == "__main__":
    import sys
    # Example usage: python seed_demo.py <farmer_id>
    if len(sys.argv) > 1:
        seed_demo_data(sys.argv[1])
    else:
        # Try to find a recent farmer ID if none provided? 
        # For now just print instructions.
        print("Please provide a farmer_id: python seed_demo.py YOUR_ID")
