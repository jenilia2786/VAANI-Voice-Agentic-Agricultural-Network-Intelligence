from pydantic import BaseModel
from typing import Optional, List, Any, Dict
from datetime import datetime


class FarmerProfile(BaseModel):
    name: str
    phone: str
    district: str
    village: Optional[str] = ""
    crops: List[str] = []
    land_size: Optional[float] = 1.0
    irrigation_type: Optional[str] = "rain-fed"
    shg_member: Optional[bool] = False
    shg_id: Optional[str] = None
    is_shg_leader: Optional[bool] = False
    bank_account: Optional[bool] = True
    caste_category: Optional[str] = "general"
    annual_income: Optional[float] = 50000.0
    gender: Optional[str] = "female"  # female/male
    farmer_id: Optional[str] = None
    activity_history: List[dict] = []


class CropDiagnoseRequest(BaseModel):
    farmer_id: Optional[str] = None
    crop_type: Optional[str] = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class MarketPriceRequest(BaseModel):
    crop: str
    district: str
    reported_price: Optional[float] = None


class SchemeMatchRequest(BaseModel):
    farmer_id: Optional[str] = None
    land_size: float = 1.0
    crop_type: str = "paddy"
    annual_income: float = 50000.0
    caste_category: str = "general"
    shg_member: bool = False
    bank_account: bool = True
    irrigation_type: str = "rain-fed"
    district: str = "Chennai"


class CollectiveJoinRequest(BaseModel):
    farmer_id: str
    name: str
    crop: str
    quantity: float
    preferred_date: Optional[str] = ""
    district: str
    village: Optional[str] = ""


class PestReportRequest(BaseModel):
    farmer_id: Optional[str] = None
    pest_type: str
    crop: str
    severity: str  # low/medium/high/critical
    district: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    description: Optional[str] = ""


class SoilAnalyzeRequest(BaseModel):
    farmer_id: Optional[str] = None
    crop: str
    nitrogen: Optional[float] = None
    phosphorus: Optional[float] = None
    potassium: Optional[float] = None
    ph: Optional[float] = None
    organic_matter: Optional[float] = None
    district: Optional[str] = ""


class WaterCalcRequest(BaseModel):
    farmer_id: Optional[str] = None
    crop: str
    acres: float
    soil_type: str
    irrigation_method: str
    district: str
    growth_stage: Optional[str] = "vegetative"


class WasteRequest(BaseModel):
    farmer_id: Optional[str] = None
    waste_type: str
    quantity: float
    district: Optional[str] = ""


class ContractAnalyzeRequest(BaseModel):
    contract_text: str
    farmer_id: Optional[str] = None


class LegalAdviceRequest(BaseModel):
    problem: str
    issue_type: Optional[str] = ""
    farmer_id: Optional[str] = None
    district: Optional[str] = ""


class WellnessCheckinRequest(BaseModel):
    farmer_id: Optional[str] = None
    mood_score: int  # 1–5
    message: Optional[str] = ""


class DisasterDocRequest(BaseModel):
    farmer_id: str
    disaster_type: str
    description: Optional[str] = ""
    latitude: Optional[float] = None
    longitude: Optional[float] = None


class DisasterClaimRequest(BaseModel):
    farmer_id: str
    disaster_type: str
    date: str
    crop_type: str
    area_affected: float


class MarketplaceListRequest(BaseModel):
    farmer_id: str
    name: str
    crop: str
    quantity: float # Total available
    reserved_quantity: Optional[float] = 0
    sold_quantity: Optional[float] = 0
    price: float
    harvest_date: str
    is_organic: bool = False
    description: Optional[str] = ""
    district: Optional[str] = ""
    shg_id: Optional[str] = None # If listed by/for an SHG


class MarketplaceReserveRequest(BaseModel):
    listing_id: str
    buyer_id: str
    quantity: float


class MarketplaceSaleRequest(BaseModel):
    listing_id: str
    quantity: float
    is_direct: bool = True # If True, subtract from total, if False subtract from reserved


class SHGJoinRequest(BaseModel):
    farmer_id: str
    farmer_name: str
    shg_id: str


class SHGHandleRequest(BaseModel):
    request_id: str
    shg_id: str
    action: str # approve/reject


class ProcessingRequest(BaseModel):
    crop: str
    district: Optional[str] = ""
    farmer_id: Optional[str] = None


class ColdStorageRequest(BaseModel):
    crop: str
    quantity: float
    harvest_date: str
    district: str
    farmer_id: Optional[str] = None


class CropPlanRequest(BaseModel):
    district: str
    season: str  # kharif/rabi/zaid
    land_size: float
    soil_type: Optional[str] = "red loam"
    irrigation_type: Optional[str] = "rain-fed"
    farmer_id: Optional[str] = None


class VoiceRouteRequest(BaseModel):
    text: str
    farmer_id: Optional[str] = None


class InputVerifyRequest(BaseModel):
    product_name: str
    batch_number: Optional[str] = ""
    manufacturer: Optional[str] = ""
    reported_price: Optional[float] = None
    district: Optional[str] = ""
    farmer_id: Optional[str] = None


class ActivityLog(BaseModel):
    farmer_id: str
    action: str
    feature: str
    details: Optional[str] = ""
    timestamp: Optional[str] = None
