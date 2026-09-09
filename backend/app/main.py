"""
SIH26034 AI Packaged Commodity Compliance Scanner
FastAPI application entry point with all routers integrated
"""
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

    print(f"✅ Database initialized")
    print(f"✅ Upload directory: {settings.UPLOAD_DIR}")
    print(f"✅ Report directory: {settings.REPORT_DIR}")
    print(f"🚀 API running on {settings.HOST}:{settings.PORT}")


# Create upload and report directories before mounting static files
Path(settings.UPLOAD_DIR).mkdir(parents=True, exist_ok=True)
Path(settings.REPORT_DIR).mkdir(parents=True, exist_ok=True)

# Mount static file directories for uploads and generated reports
app.mount("/uploads", StaticFiles(directory=settings.UPLOAD_DIR), name="uploads")
app.mount("/reports", StaticFiles(directory=settings.REPORT_DIR), name="reports")


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


# Include routers with versioned API prefix
app.include_router(auth.router, prefix="/api/v1/auth", tags=["Authentication"])
app.include_router(scan.router, prefix="/api/v1", tags=["Scanning"])
app.include_router(products.router, prefix="/api/v1", tags=["Products"])
app.include_router(analytics.router, prefix="/api/v1/analytics", tags=["Analytics"])
