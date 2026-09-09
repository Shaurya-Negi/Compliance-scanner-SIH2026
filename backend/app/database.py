"""
Database configuration and session management
Supports both SQLite (local dev) and PostgreSQL (production)
"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from app.config import settings

# Normalize database URL for SQLAlchemy 2.0 compatibility
db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql://", 1)

# Create database engine
engine = create_engine(
    db_url,
    connect_args={"check_same_thread": False} if db_url.startswith("sqlite") else {},
    pool_pre_ping=True,
    echo=settings.APP_ENV == "development"
)

# Session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for ORM models
Base = declarative_base()


def get_db():
    """
    Dependency to get database session
    Yields a session and closes it after use
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """
    Initialize database - create all tables and seed default demo accounts
    Called on startup
    """
    import app.models as models
    from app.auth import hash_password

    Base.metadata.create_all(bind=engine)

    # Seed demo accounts if not present
    db = SessionLocal()
    try:
        demo_inspector = db.query(models.User).filter(models.User.email == "inspector@sih.gov.in").first()
        if not demo_inspector:
            demo_inspector = models.User(
                email="inspector@sih.gov.in",
                password_hash=hash_password("demo2026"),
                name="Legal Metrology Inspector",
                role="inspector"
            )
            db.add(demo_inspector)

        demo_admin = db.query(models.User).filter(models.User.email == "admin@sih.gov.in").first()
        if not demo_admin:
            demo_admin = models.User(
                email="admin@sih.gov.in",
                password_hash=hash_password("admin2026"),
                name="System Administrator",
                role="admin"
            )
            db.add(demo_admin)

        db.commit()
    except Exception as e:
        db.rollback()
        print(f"Warning: Could not seed demo users: {e}")
    finally:
        db.close()
