from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import RedirectResponse, FileResponse
import os
import logging
from config import settings

# Setup Logging
logging.basicConfig(level=logging.INFO if not settings.DEBUG else logging.DEBUG)
logger = logging.getLogger("VAANI")

# Import all route modules
try:
    from routes import (
        crop, market, schemes, collective, weather,
        soil, pest, waste, legal, contract, disaster,
        marketplace, processing, wellness, water, dashboard,
        credit, voice, farmer, pest_input, coldstorage, community, radio, audio, shg,
        activity
    )
except ImportError as e:
    logger.error(f"Failed to import routes: {e}")
    raise

app = FastAPI(
    title=settings.APP_NAME,
    description="AI-powered agricultural assistant for Tamil Nadu women farmers",
    version=settings.VERSION,
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS — allow all origins for hackathon demo
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount all routes
app.include_router(crop.router, prefix="/api/crop", tags=["Crop Disease"])
app.include_router(market.router, prefix="/api/market", tags=["Market Prices"])
app.include_router(schemes.router, prefix="/api/schemes", tags=["Govt Schemes"])
app.include_router(collective.router, prefix="/api/collective", tags=["Collective Sale"])
app.include_router(weather.router, prefix="/api/weather", tags=["Weather"])
app.include_router(soil.router, prefix="/api/soil", tags=["Soil Health"])
app.include_router(pest.router, prefix="/api/pest", tags=["Pest Outbreak"])
app.include_router(waste.router, prefix="/api/waste", tags=["Waste to Wealth"])
app.include_router(legal.router, prefix="/api/legal", tags=["Legal Shield"])
app.include_router(contract.router, prefix="/api/contract", tags=["Contract Reader"])
app.include_router(disaster.router, prefix="/api/disaster", tags=["Disaster Response"])
app.include_router(marketplace.router, prefix="/api/marketplace", tags=["D2C Marketplace"])
app.include_router(processing.router, prefix="/api/processing", tags=["Micro Processing"])
app.include_router(wellness.router, prefix="/api/wellness", tags=["Mental Wellness"])
app.include_router(water.router, prefix="/api/water", tags=["Water Intelligence"])
app.include_router(dashboard.router, prefix="/api/dashboard", tags=["Govt Dashboard"])
app.include_router(credit.router, prefix="/api/credit", tags=["Farm Credit"])
app.include_router(voice.router, prefix="/api/voice", tags=["Voice Router"])
app.include_router(farmer.router, prefix="/api/farmer", tags=["Farmer Profile"])
app.include_router(pest_input.router, prefix="/api/inputs", tags=["Input Verification"])
app.include_router(coldstorage.router, prefix="/api/coldstorage", tags=["Cold Storage"])
app.include_router(community.router, prefix="/api/community", tags=["Community Support"])
app.include_router(radio.router, prefix="/api/radio", tags=["Agri Radio"])
app.include_router(audio.router, prefix="/api/audio", tags=["Audio Generation"])
app.include_router(shg.router, prefix="/api/shg", tags=["SHG Community"])
app.include_router(activity.router, prefix="/api/activity", tags=["Activity Tracking"])

@app.get("/")
async def root():
    # Serve frontend if it exists, otherwise return API info
    frontend_index = os.path.join(os.path.dirname(__file__), "..", "frontend", "index.html")
    if os.path.exists(frontend_index):
        return FileResponse(frontend_index)
    return {
        "app": settings.APP_NAME,
        "tagline": "Tamil Nadu Women Farmers AI Assistant",
        "version": settings.VERSION,
        "status": "running",
        "docs": "/docs",
        "features": 25
    }


@app.get("/dashboard")
async def dashboard_page():
    frontend_dashboard = os.path.join(os.path.dirname(__file__), "..", "frontend", "dashboard.html")
    if os.path.exists(frontend_dashboard):
        return FileResponse(frontend_dashboard)
    return {"error": "dashboard not found"}

@app.get("/health")
async def health():
    return {"status": "healthy", "message": "வாணி செயல்படுகிறது!", "db": "local" if settings.USE_LOCAL_DB_ALWAYS else "cloud"}


# Mount static frontend files — must be AFTER all API routes
frontend_dir = os.path.join(os.path.dirname(__file__), "..", "frontend")
if os.path.exists(frontend_dir):
    app.mount("/static", StaticFiles(directory=frontend_dir, html=True), name="static")


if __name__ == "__main__":
    import uvicorn
    logger.info(f"Starting {settings.APP_NAME} v{settings.VERSION}...")
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)

