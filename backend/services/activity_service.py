from services.firebase_service import save_document, query_collection, get_document, update_document
from datetime import datetime
from fpdf import FPDF
import os

def log_activity(farmer_id: str, feature: str, action: str, details: str = ""):
    """Log activity to Firestore and append to farmer's lifetime history."""
    if not farmer_id or farmer_id == "null":
        return
        
    log_data = {
        "farmer_id": farmer_id,
        "feature": feature,
        "action": action,
        "details": details,
        "date": datetime.now().strftime("%Y-%m-%d"),
        "timestamp": datetime.now().isoformat()
    }
    
    # 1. Save to global logs collection (for auditing)
    save_document("activity_logs", log_data)
    
    # 2. Append to farmer's profile document (for credit scoring proof)
    farmer = get_document("farmers", farmer_id)
    if farmer:
        history = farmer.get("activity_history", [])
        history.append({
            "action": action,
            "feature": feature,
            "details": details,
            "date": log_data["date"]
        })
        # Keep history manageable if it gets huge, but for now we keep all for proof
        update_document("farmers", farmer_id, {"activity_history": history})

def generate_credit_proof_document(farmer_id: str):
    """Generate a single permanent 'Credit Score Evidence' document for the farmer."""
    farmer = get_document("farmers", farmer_id)
    if not farmer:
        return None
        
    farmer_name = farmer.get("name", "விவசாயி")
    history = farmer.get("activity_history", [])
    history.sort(key=lambda x: x.get("date", ""), reverse=True)
    
    pdf = FPDF()
    pdf.add_page()
    
    # Header
    pdf.set_font("Arial", 'B', 18)
    pdf.set_text_color(27, 94, 32)
    pdf.cell(0, 15, "VAANI — Official Credit Score Evidence", ln=True, align='C')
    pdf.set_font("Arial", 'B', 10)
    pdf.set_text_color(100, 100, 100)
    pdf.cell(0, 5, "FARMER PROACTIVITY & ENGAGEMENT LOG", ln=True, align='C')
    pdf.ln(10)
    
    # Farmer Profile Summary
    pdf.set_fill_color(241, 248, 233)
    pdf.set_font("Arial", 'B', 12)
    pdf.set_text_color(27, 94, 32)
    pdf.cell(0, 10, "  Farmer Profile Summary", ln=True, fill=True)
    pdf.set_font("Arial", '', 10)
    pdf.set_text_color(0, 0, 0)
    pdf.cell(50, 8, "  Full Name:", 0)
    pdf.cell(0, 8, farmer_name, 1)
    pdf.ln(8)
    pdf.cell(50, 8, "  Farmer ID:", 0)
    pdf.cell(0, 8, farmer_id, 1)
    pdf.ln(8)
    pdf.cell(50, 8, "  District:", 0)
    pdf.cell(0, 8, farmer.get("district", "N/A"), 1)
    pdf.ln(15)
    
    # Credit Scoring Evidence Table
    pdf.set_font("Arial", 'B', 12)
    pdf.set_text_color(27, 94, 32)
    pdf.cell(0, 10, "  Verified Activity History", ln=True)
    
    pdf.set_fill_color(27, 94, 32)
    pdf.set_font("Arial", 'B', 10)
    pdf.set_text_color(255, 255, 255)
    pdf.cell(35, 10, "Date", 1, 0, 'C', True)
    pdf.cell(50, 10, "Engagement Point", 1, 0, 'C', True)
    pdf.cell(105, 10, "Description of Action", 1, 1, 'C', True)
    
    pdf.set_font("Arial", '', 9)
    pdf.set_text_color(0, 0, 0)
    
    if not history:
        pdf.cell(0, 10, "No activity records found for this profile.", 1, 1, 'C')
    else:
        for idx, item in enumerate(history):
            # Alternate row colors
            fill = idx % 2 == 0
            pdf.set_fill_color(248, 249, 250)
            
            pdf.cell(35, 8, item.get("date", ""), 1, 0, 'L', fill)
            pdf.cell(50, 8, item.get("feature", ""), 1, 0, 'L', fill)
            
            desc = f"{item.get('action', '')}: {item.get('details', '')}"
            if len(desc) > 60: desc = desc[:57] + "..."
            pdf.cell(105, 8, desc, 1, 1, 'L', fill)
            
    pdf.ln(20)
    
    # Official Footer
    pdf.set_font("Arial", 'B', 11)
    pdf.set_text_color(27, 94, 32)
    pdf.cell(0, 10, "CALCULATION METADATA", ln=True)
    pdf.set_font("Arial", '', 9)
    pdf.set_text_color(50, 50, 50)
    pdf.multi_cell(0, 5, "This document aggregates all platform interactions into a single immutable log. Each entry contributes to the VAANI Credit Trust Score. These actions demonstrate scientific farming adoption, market awareness, and financial proactivity.")
    
    pdf.ln(5)
    pdf.cell(0, 10, f"Document generated on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}", ln=True, align='R')
    
    output_dir = "reports"
    if not os.path.exists(output_dir): os.makedirs(output_dir)
    filename = f"credit_proof_{farmer_id}.pdf"
    filepath = os.path.join(output_dir, filename)
    pdf.output(filepath)
    return filepath
