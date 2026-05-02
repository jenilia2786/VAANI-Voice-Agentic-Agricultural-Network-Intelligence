from fastapi import APIRouter, HTTPException
from models.schemas import MarketplaceListRequest
from services.ai_service import call_groq
from services.firebase_service import save_document, query_collection
import qrcode, io, base64, json, re
from typing import Optional

router = APIRouter()


def _extract_json(text: str) -> dict:
    try:
        return json.loads(text)
    except:
        match = re.search(r'\{.*\}', text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group())
            except:
                pass
    return {}


def _generate_qr(data: str) -> str:
    """Generate QR code as base64 PNG."""
    try:
        qr = qrcode.QRCode(version=1, box_size=5, border=2)
        qr.add_data(data)
        qr.make(fit=True)
        img = qr.make_image(fill_color="black", back_color="white")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        return base64.b64encode(buf.getvalue()).decode("utf-8")
    except Exception as e:
        print(f"QR error: {e}")
        return ""


@router.post("/list")
async def list_produce(req: MarketplaceListRequest):
    """List farmer's produce on D2C marketplace."""
    prompt = (
        f"Write a compelling Tamil product description for {req.crop} "
        f"(quantity: {req.quantity}kg, price: ₹{req.price}/kg, "
        f"{'organic' if req.is_organic else 'conventional'}, "
        f"harvest date: {req.harvest_date}). "
        "Keep it under 50 words, highlight freshness and quality. Respond only in Tamil."
    )
    description = await call_groq(prompt, max_tokens=200)
    
    listing_data = {
        "farmer_id": req.farmer_id,
        "name": req.name,
        "crop": req.crop,
        "quantity": req.quantity,
        "reserved_quantity": 0,
        "sold_quantity": 0,
        "price": req.price,
        "harvest_date": req.harvest_date,
        "is_organic": req.is_organic,
        "description": description,
        "district": req.district,
        "shg_id": req.shg_id,
        "status": "active"
    }
    
    doc_id = save_document("marketplace_listings", listing_data)
    
    # Generate QR for farm traceability
    qr_data = f"VAANI-FARM|ID:{doc_id}|FARMER:{req.farmer_id}|CROP:{req.crop}|HARVEST:{req.harvest_date}|ORGANIC:{req.is_organic}"
    qr_code_b64 = _generate_qr(qr_data)
    
    return {
        "success": True,
        "listing_id": doc_id,
        "description_tamil": description,
        "qr_code_base64": qr_code_b64,
        "vaani_verified": True,
        "message": "உங்கள் விளைபொருள் VAANI சந்தையில் வெற்றிகரமாக பதிவாகியுள்ளது!"
    }


from models.schemas import MarketplaceReserveRequest, MarketplaceSaleRequest
from services.firebase_service import get_document

@router.post("/reserve")
async def reserve_item(req: MarketplaceReserveRequest):
    """Move quantity from available to reserved."""
    listing = get_document("marketplace_listings", req.listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    available = listing["quantity"] - listing.get("reserved_quantity", 0) - listing.get("sold_quantity", 0)
    if req.quantity > available:
        raise HTTPException(status_code=400, detail="Not enough stock available")
    
    listing["reserved_quantity"] = listing.get("reserved_quantity", 0) + req.quantity
    save_document("marketplace_listings", listing, req.listing_id)
    
    return {"success": True, "message": f"{req.quantity}kg ஒதுக்கப்பட்டுள்ளது (Reserved)"}


@router.post("/finalize-sale")
async def finalize_sale(req: MarketplaceSaleRequest):
    """Mark produce as sold. Direct or from reservation."""
    listing = get_document("marketplace_listings", req.listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    if req.is_direct:
        # Check if enough total available (total - reserved - sold)
        available = listing["quantity"] - listing.get("reserved_quantity", 0) - listing.get("sold_quantity", 0)
        if req.quantity > available:
            raise HTTPException(status_code=400, detail="Not enough available for direct sale")
    else:
        # Check if enough in reservation
        if req.quantity > listing.get("reserved_quantity", 0):
            raise HTTPException(status_code=400, detail="Not enough in reservation")
        # Subtract from reservation
        listing["reserved_quantity"] -= req.quantity
    
    listing["sold_quantity"] = listing.get("sold_quantity", 0) + req.quantity
    save_document("marketplace_listings", listing, req.listing_id)
    
    return {"success": True, "message": f"{req.quantity}kg விற்பனை செய்யப்பட்டது (Sold)"}


@router.post("/cancel-reservation")
async def cancel_reservation(listing_id: str, quantity: float):
    """Release reserved quantity back to available."""
    listing = get_document("marketplace_listings", listing_id)
    if not listing:
        raise HTTPException(status_code=404, detail="Listing not found")
    
    if quantity > listing.get("reserved_quantity", 0):
        quantity = listing.get("reserved_quantity", 0)
        
    listing["reserved_quantity"] -= quantity
    save_document("marketplace_listings", listing, listing_id)
    return {"success": True, "message": "ஒதுக்கீடு ரத்து செய்யப்பட்டது (Reservation cancelled)"}


@router.get("/browse")
async def browse_listings(
    crop: Optional[str] = None,
    district: Optional[str] = None,
    shg_id: Optional[str] = None,
    farmer_id: Optional[str] = None,
):
    """Browse marketplace listings."""
    filters = []
    if crop:
        filters.append(("crop", "==", crop))
    if district:
        filters.append(("district", "==", district))
    if shg_id:
        filters.append(("shg_id", "==", shg_id))
    if farmer_id:
        filters.append(("farmer_id", "==", farmer_id))
    
    listings = query_collection("marketplace_listings", filters or None, limit=50)
    
    if not listings:
        # Demo data
        listings = [
            {"id": "demo1", "farmer_id": "demo1", "name": "கமலா", "crop": "தக்காளி", "quantity": 100, "reserved_quantity": 20, "sold_quantity": 30, "price": 35, "district": "Coimbatore", "status": "active"},
            {"id": "demo2", "farmer_id": "demo2", "name": "சரஸ்வதி", "crop": "வெண்டைக்காய்", "quantity": 50, "reserved_quantity": 0, "sold_quantity": 10, "price": 40, "district": "Salem", "status": "active"},
        ]
    
    # Calculate available for customer view
    for item in listings:
        item["available_for_buyer"] = item["quantity"] - item.get("reserved_quantity", 0) - item.get("sold_quantity", 0)
    
    return {"listings": listings, "total": len(listings)}
