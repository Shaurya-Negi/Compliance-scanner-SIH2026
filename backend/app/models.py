"""
SQLAlchemy ORM models for SIH26034 compliance scanner
5 core tables: users, scans, violations, products, reports
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Text, JSON, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from app.database import Base


class UserRole(str, enum.Enum):
    """User roles for RBAC"""
    CONSUMER = "consumer"
    INSPECTOR = "inspector"
    ADMIN = "admin"


class ViolationSeverity(str, enum.Enum):
    """Severity levels for Legal Metrology violations"""
    CRITICAL = "critical"   # Missing mandatory field, dangerous (expiry)
    HIGH = "high"           # Font size, missing MRP/taxes
    MEDIUM = "medium"       # Format error, incomplete address
    LOW = "low"             # Minor advisory


class User(Base):
    """Users table for authentication and scan attribution"""
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    role = Column(String(50), default=UserRole.CONSUMER.value, nullable=False)
    name = Column(String(255), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    scans = relationship("Scan", back_populates="user")


class Scan(Base):
    """Every scan attempt with raw and processed data"""
    __tablename__ = "scans"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Nullable for anonymous scans
    image_url = Column(String(500), nullable=False)
    raw_ocr_text = Column(Text, nullable=True)
    entities_json = Column(JSON, nullable=True)  # Parsed 9 declarations
    score = Column(Float, nullable=False, default=0.0)
    label_area_cm2 = Column(Float, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, index=True)

    # Relationships
    user = relationship("User", back_populates="scans")
    violations = relationship("Violation", back_populates="scan", cascade="all, delete-orphan")
    report = relationship("Report", back_populates="scan", uselist=False, cascade="all, delete-orphan")
    product = relationship("Product", back_populates="scans", secondary="product_scans")


class Violation(Base):
    """Individual rule violations per scan (1:many from scans)"""
    __tablename__ = "violations"

    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(Integer, ForeignKey("scans.id", ondelete="CASCADE"), nullable=False, index=True)
    rule_code = Column(String(50), nullable=False)  # e.g., "RULE_2_NET_QUANTITY"
    rule_name = Column(String(255), nullable=False)
    severity = Column(String(20), default=ViolationSeverity.HIGH.value, nullable=False)
    expected = Column(String(500), nullable=True)
    actual = Column(String(500), nullable=True)
    explanation = Column(Text, nullable=False)
    clause_reference = Column(String(100), nullable=True)  # e.g., "Rule 6(1)(b) & Second Schedule"
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    scan = relationship("Scan", back_populates="violations")


class Product(Base):
    """Product repository — deduped by brand + name"""
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False, index=True)
    brand = Column(String(255), nullable=True, index=True)
    category = Column(String(100), nullable=True)
    manufacturer = Column(String(255), nullable=True)
    avg_score = Column(Float, default=0.0)
    total_scans = Column(Integer, default=1)
    last_scanned_at = Column(DateTime, default=datetime.utcnow)
    created_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    scans = relationship("Scan", back_populates="product", secondary="product_scans")


class ProductScan(Base):
    """Association table between products and scans"""
    __tablename__ = "product_scans"

    product_id = Column(Integer, ForeignKey("products.id"), primary_key=True)
    scan_id = Column(Integer, ForeignKey("scans.id"), primary_key=True)


class Report(Base):
    """Cached PDF audit reports"""
    __tablename__ = "reports"

    id = Column(Integer, primary_key=True, index=True)
    scan_id = Column(Integer, ForeignKey("scans.id", ondelete="CASCADE"), unique=True, nullable=False)
    pdf_path = Column(String(500), nullable=False)
    file_size_bytes = Column(Integer, nullable=True)
    generated_at = Column(DateTime, default=datetime.utcnow)

    # Relationships
    scan = relationship("Scan", back_populates="report")
