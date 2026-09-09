"""
Pydantic request and response schemas for SIH26034 API
"""
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime
from enum import Enum


# ---------------- Enums ----------------

class UserRoleEnum(str, Enum):
    CONSUMER = "consumer"
    INSPECTOR = "inspector"
    ADMIN = "admin"


class ViolationSeverityEnum(str, Enum):
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


# ---------------- Auth Schemas ----------------

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=6)
    name: Optional[str] = None
    role: UserRoleEnum = UserRoleEnum.CONSUMER


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserOut(BaseModel):
    id: int
    email: str
    name: Optional[str] = None
    role: str
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserOut


# ---------------- Entity Schemas (9 Declarations) ----------------

class ExtractedEntities(BaseModel):
    """The 9 mandatory declarations under Legal Metrology Rules, 2011"""
    product_name: Optional[str] = Field(None, description="Common or generic name of commodity")
    net_quantity: Optional[str] = Field(None, description="Net quantity with unit (e.g., 500g, 1L)")
    mrp: Optional[str] = Field(None, description="Maximum Retail Price (e.g., ₹50.00)")
    mrp_taxes_inclusive: Optional[bool] = Field(None, description="Whether 'inclusive of all taxes' is declared")
    mfg_date: Optional[str] = Field(None, description="Month and year of manufacture/packing (e.g., 03/2026)")
    manufacturer_address: Optional[str] = Field(None, description="Complete address with PIN code")
    manufacturer_pin: Optional[str] = Field(None, description="6-digit PIN code extracted from address")
    customer_care_phone: Optional[str] = Field(None, description="Customer care phone number")
    customer_care_email: Optional[str] = Field(None, description="Customer care email address")
    country_of_origin: Optional[str] = Field(None, description="Country of origin / manufacture")
    unit_sale_price: Optional[str] = Field(None, description="Price per unit (e.g., ₹0.10 per gram)")
    expiry_date: Optional[str] = Field(None, description="Best before / expiry date (e.g., 09/2026)")
    raw_text: Optional[str] = Field(None, description="Complete raw OCR text")


# ---------------- Validation / Rule Check Schemas ----------------

class RuleCheckResult(BaseModel):
    rule_code: str
    rule_name: str
    clause_reference: str
    passed: bool
    severity: ViolationSeverityEnum
    expected: Optional[str] = None
    actual: Optional[str] = None
    explanation: str


class ComplianceScore(BaseModel):
    score: float = Field(..., ge=0.0, le=100.0, description="Compliance score (0-100)")
    status: str = Field(..., description="Compliant (>=80), Partial (50-79), Non-compliant (<50)")
    total_rules_checked: int = 9
    passed_count: int
    failed_count: int


# ---------------- Scan Response Schemas ----------------

class ViolationOut(BaseModel):
    id: int
    rule_code: str
    rule_name: str
    severity: str
    expected: Optional[str] = None
    actual: Optional[str] = None
    explanation: str
    clause_reference: Optional[str] = None

    class Config:
        from_attributes = True


class ScanResponse(BaseModel):
    scan_id: int
    image_url: str
    score: float
    status: str
    entities: ExtractedEntities
    checks: List[RuleCheckResult]
    violations: List[ViolationOut]
    report_url: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True


class ScanSummary(BaseModel):
    id: int
    image_url: str
    score: float
    status: str
    product_name: Optional[str] = None
    violation_count: int
    created_at: datetime

    class Config:
        from_attributes = True


# ---------------- Product Schemas ----------------

class ProductOut(BaseModel):
    id: int
    name: str
    brand: Optional[str] = None
    category: Optional[str] = None
    avg_score: float
    total_scans: int
    last_scanned_at: datetime

    class Config:
        from_attributes = True


# ---------------- Analytics / Dashboard Schemas ----------------

class ViolationStat(BaseModel):
    rule_code: str
    rule_name: str
    count: int
    percentage: float


class DashboardData(BaseModel):
    total_scans: int
    avg_compliance_score: float
    compliant_scans_count: int
    non_compliant_scans_count: int
    top_violations: List[ViolationStat]
    recent_scans: List[ScanSummary]
