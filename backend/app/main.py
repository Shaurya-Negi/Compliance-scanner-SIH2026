"""
SIH26034 AI Packaged Commodity Compliance Scanner
FastAPI application entry point with all routers integrated
"""
import os
import hashlib

# Compatibility fix for Python 3.8 on Windows with ReportLab / hashlib openssl_md5
_orig_md5 = hashlib.md5
def _safe_md5(*args, **kwargs):
    kwargs.pop('usedforsecurity', None)
    return _orig_md5(*args, **kwargs)
hashlib.md5 = _safe_md5

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from pathlib import Path
from app.config import settings
from app.database import init_db
from app.routers import scan, products, analytics, auth

# Create FastAPI app
app = FastAPI(
    title="SIH26034 Compliance Scanner API",
    description="AI-powered packaged commodity compliance validation against Legal Metrology Rules, 2011",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS middleware - allow frontend to access API
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_origin_regex=r"https://.*\.vercel\.app",  # Permits all Vercel production & preview deployments
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["Content-Disposition"]
)

# Create upload and report directories on startup
@app.on_event("startup")
async def startup_event():
    """Initialize database and create required directories"""
    # Initialize database tables
    init_db()

    # Create directories for file storage
    Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
    Path(settings.REPORT_DIR).mkdir(parents=True, exist_ok=True)
    samples_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "samples")
    Path(samples_dir).mkdir(parents=True, exist_ok=True)

    print(f"✅ Database initialized")
    print(f"✅ Upload directory: {settings.UPLOAD_DIR}")
    print(f"✅ Report directory: {settings.REPORT_DIR}")
    print(f"✅ Samples directory: {samples_dir}")
    print(f"🚀 API running on {settings.HOST}:{settings.PORT}")


# Create upload and report directories before mounting static files
Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
Path(settings.REPORT_DIR).mkdir(parents=True, exist_ok=True)
samples_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "samples")
Path(samples_dir).mkdir(parents=True, exist_ok=True)

# Mount static file directories for uploads, generated reports, and sample packaging packs
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")
app.mount("/reports", StaticFiles(directory=settings.REPORT_DIR), name="reports")
app.mount("/samples", StaticFiles(directory=samples_dir), name="samples")


# Root health check endpoint
@app.get("/")
async def root():
    """API health check and information"""
    return {
        "name": "SIH26034 Compliance Scanner API",
        "version": "1.0.0",
        "status": "operational",
        "environment": settings.APP_ENV,
        "docs": "/docs",
        "health": "/health"
    }


@app.get("/health")
async def health_check():
    """Health check endpoint for deployment monitoring"""
    return {
        "status": "healthy",
        "database": "connected",
        "ai_model": settings.GROQ_MODEL
    }


# Direct Browser Barcode Lookup Shortcut Route
@app.get("/barcode/{barcode}")
async def direct_browser_barcode_lookup(barcode: str):
    """
    Direct Browser URL Barcode Intelligence Endpoint.
    Visit http://localhost:8000/barcode/{barcode_number} in any browser to get
    instant product details (Name, Quantity, MRP, Manufacturer, Customer Care, Expiry, etc.).
    """
    from app.fmcg_database import lookup_barcode, enrich_product_metadata
    from fastapi import HTTPException, status

    clean_code = barcode.strip().replace("-", "").replace(" ", "")
    product_data = lookup_barcode(clean_code)

    if not product_data or "Generic" in product_data.get("product_name", ""):
        from app.barcode_scanner import barcode_engine
        online_data = barcode_engine.query_online_openfoodfacts(clean_code)
        if online_data:
            product_data = enrich_product_metadata(online_data, clean_code)

    if not product_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={
                "error": "Barcode Not Found",
                "barcode": clean_code,
                "message": f"Barcode '{clean_code}' is not registered in the GS1 India FMCG catalog or OpenFoodFacts."
            }
        )

    return {
        "success": True,
        "barcode": clean_code,
        "product": product_data
    }


# Include routers with versioned API prefix
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(scan.router, prefix="/api/v1", tags=["Scanning"])
app.include_router(products.router, prefix="/api/v1", tags=["Products"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Analytics"])
