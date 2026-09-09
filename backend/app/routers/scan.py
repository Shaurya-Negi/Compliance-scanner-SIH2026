"""
Product scanning and compliance check routes
Core endpoint: POST /api/v1/scan - 3-second AI compliance pipeline
"""
import os
import logging
from datetime import datetime
from typing import Optional, List
from pathlib import Path

from fastapi import APIRouter, Depends, File, UploadFile, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Scan, Violation, Product, ProductScan, Report
from app.schemas import ScanResponse, ExtractedEntities, RuleCheckResult, ScanSummary
from app.dependencies import get_optional_user
from app.ocr_engine import ocr_engine
from app.llm_extractor import llm_extractor
from app.rule_engine import compliance_engine
from app.pdf_generator import pdf_generator
from app.config import settings

logger = logging.getLogger(__name__)
router = APIRouter()


@router.post("/scan", response_model=ScanResponse)
async def scan_product(
    image: UploadFile = File(..., description="Product label image (JPG, PNG, max 10MB)"),
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    🚀 **3-Second AI Compliance Pipeline**

    Upload a packaged commodity label image and get instant compliance analysis:

    **Pipeline Steps:**
    1. Image preprocessing (CLAHE contrast enhancement)
    2. OCR text extraction (PaddleOCR)
    3. Entity extraction via LLM (Groq LLaMA 3.1 70B)
    4. Legal Metrology rule validation (9 mandatory declarations)
    5. PDF audit report generation (ReportLab)
    6. Database persistence

    **Returns:**
    - Compliance score (0-100%)
    - Status: Compliant (≥80), Partial (50-79), Non-compliant (<50)
    - Extracted entities (product name, MRP, dates, address, etc.)
    - Rule-by-rule check results
    - Violations list with severity
    - PDF report download link

    **Authentication:**
    - Optional - anonymous scans allowed
    - Authenticated users get scan history
    """
    # Validate file type
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid file type. Only image files (JPG, PNG) are accepted."
        )

    # Validate file size
    max_size_bytes = settings.MAX_UPLOAD_SIZE_MB * 1024 * 1024
    contents = await image.read()
    if len(contents) > max_size_bytes:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"File too large. Maximum size is {settings.MAX_UPLOAD_SIZE_MB}MB."
        )

    # Save uploaded file
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    filename = f"scan_{timestamp}_{image.filename}"
    upload_path = os.path.join(settings.UPLOAD_DIR, filename)

    try:
        with open(upload_path, "wb") as f:
            f.write(contents)
        logger.info(f"Saved upload to: {upload_path}")
    except Exception as e:
        logger.error(f"Failed to save upload: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to save uploaded file"
        )

    # STEP 1: OCR Extraction
    try:
        logger.info("STEP 1: Running OCR extraction...")
        ocr_result = ocr_engine.extract_text(upload_path)
        raw_ocr_text = ocr_result["raw_text"]
        font_heights = ocr_result["font_heights"]
        label_area_cm2 = ocr_result["label_area_cm2"]
        logger.info(f"OCR extracted {len(raw_ocr_text)} characters")
    except Exception as e:
        logger.error(f"OCR extraction failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"OCR extraction failed: {str(e)}"
        )

    # STEP 2: LLM Entity Extraction
    try:
        logger.info("STEP 2: Running LLM entity extraction...")
        entities = llm_extractor.extract_entities(raw_ocr_text)
        logger.info(f"Extracted entities: {sum(1 for v in entities.values() if v)} fields populated")
    except Exception as e:
        logger.error(f"LLM extraction failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Entity extraction failed: {str(e)}"
        )

    # STEP 3: Compliance Validation
    try:
        logger.info("STEP 3: Running compliance validation...")
        validation_result = compliance_engine.validate(entities, font_heights, label_area_cm2)
        score = validation_result["score"]
        status_label = validation_result["status"]
        checks = validation_result["checks"]
        logger.info(f"Compliance score: {score}% ({status_label})")
    except Exception as e:
        logger.error(f"Validation failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Compliance validation failed: {str(e)}"
        )

    # STEP 4: Database Persistence
    try:
        logger.info("STEP 4: Persisting scan to database...")

        # Create scan record
        new_scan = Scan(
            user_id=current_user.id if current_user else None,
            image_url=f"/uploads/{filename}",
            raw_ocr_text=raw_ocr_text,
            entities_json=entities,
            score=score,
            label_area_cm2=label_area_cm2
        )
        db.add(new_scan)
        db.flush()  # Get scan ID before adding violations

        # Add violations for failed checks
        violations_list = []
        for check in checks:
            if not check["passed"]:
                violation = Violation(
                    scan_id=new_scan.id,
                    rule_code=check["rule_code"],
                    rule_name=check["rule_name"],
                    severity=check["severity"],
                    expected=check.get("expected"),
                    actual=check.get("actual"),
                    explanation=check["explanation"],
                    clause_reference=check.get("clause_reference")
                )
                db.add(violation)
                violations_list.append(violation)

        db.flush()  # Ensure violations have IDs

        # Link to product (or create new product)
        product_name = entities.get("product_name")
        if product_name:
            # Find or create product
            product = db.query(Product).filter(Product.name == product_name).first()
            if not product:
                product = Product(
                    name=product_name,
                    brand=None,  # Could extract from OCR if needed
                    avg_score=score,
                    total_scans=1
                )
                db.add(product)
                db.flush()
            else:
                # Update product statistics
                product.total_scans += 1
                product.avg_score = ((product.avg_score * (product.total_scans - 1)) + score) / product.total_scans
                product.last_scanned_at = datetime.utcnow()

            # Link scan to product
            product_scan = ProductScan(product_id=product.id, scan_id=new_scan.id)
            db.add(product_scan)

        db.commit()
        db.refresh(new_scan)

        logger.info(f"Scan #{new_scan.id} persisted successfully")

    except Exception as e:
        db.rollback()
        logger.error(f"Database persistence failed: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to save scan results: {str(e)}"
        )

    # STEP 5: Generate PDF Report
    try:
        logger.info("STEP 5: Generating PDF audit report...")
        pdf_path = pdf_generator.generate_report(
            scan_id=new_scan.id,
            image_path=upload_path,
            entities=entities,
            checks=checks,
            score=score,
            status=status_label
        )

        # Save report record
        pdf_filename = os.path.basename(pdf_path)
        report = Report(
            scan_id=new_scan.id,
            pdf_path=f"/reports/{pdf_filename}",
            file_size_bytes=os.path.getsize(pdf_path)
        )
        db.add(report)
        db.commit()

        report_url = f"/api/v1/scan/{new_scan.id}/report"
        logger.info(f"PDF report generated: {report_url}")

    except Exception as e:
        logger.error(f"PDF generation failed: {e}")
        # Non-critical - return scan results even if PDF fails
        report_url = None

    # Build response
    return ScanResponse(
        scan_id=new_scan.id,
        image_url=new_scan.image_url,
        score=score,
        status=status_label,
        entities=ExtractedEntities(**entities),
        checks=[RuleCheckResult(**check) for check in checks],
        violations=[violation for violation in violations_list],
        report_url=report_url,
        created_at=new_scan.created_at
    )


@router.get("/scan/{scan_id}", response_model=ScanResponse)
async def get_scan_result(scan_id: int, db: Session = Depends(get_db)):
    """
    Retrieve a previously completed scan by ID
    Returns the full compliance analysis with violations
    """
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scan #{scan_id} not found"
        )

    # Reconstruct checks from violations
    checks = []
    all_rules = [
        "RULE_1_PRODUCT_NAME", "RULE_2_NET_QUANTITY", "RULE_3_MRP",
        "RULE_4_MFG_DATE", "RULE_5_ADDRESS", "RULE_6_CUSTOMER_CARE",
        "RULE_7_COUNTRY_ORIGIN", "RULE_8_UNIT_PRICE", "RULE_9_EXPIRY_DATE"
    ]

    violation_map = {v.rule_code: v for v in scan.violations}

    for rule_code in all_rules:
        if rule_code in violation_map:
            v = violation_map[rule_code]
            checks.append(RuleCheckResult(
                rule_code=v.rule_code,
                rule_name=v.rule_name,
                clause_reference=v.clause_reference,
                passed=False,
                severity=v.severity,
                expected=v.expected,
                actual=v.actual,
                explanation=v.explanation
            ))

    # Determine status from score
    if scan.score >= 80:
        status_label = "Compliant"
    elif scan.score >= 50:
        status_label = "Partial Compliance"
    else:
        status_label = "Non-Compliant"

    report_url = f"/api/v1/scan/{scan.id}/report" if scan.report else None

    return ScanResponse(
        scan_id=scan.id,
        image_url=scan.image_url,
        score=scan.score,
        status=status_label,
        entities=ExtractedEntities(**(scan.entities_json or {})),
        checks=checks,
        violations=scan.violations,
        report_url=report_url,
        created_at=scan.created_at
    )


@router.get("/scan/{scan_id}/report")
async def download_report(scan_id: int, db: Session = Depends(get_db)):
    """
    Download the PDF audit report for a scan
    Returns a PDF file as an attachment
    """
    scan = db.query(Scan).filter(Scan.id == scan_id).first()
    if not scan:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Scan #{scan_id} not found"
        )

    if not scan.report:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Report not found for scan #{scan_id}"
        )

    # Construct absolute path
    pdf_filename = os.path.basename(scan.report.pdf_path)
    pdf_path = os.path.join(settings.REPORT_DIR, pdf_filename)

    if not os.path.exists(pdf_path):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Report file not found on server"
        )

    return FileResponse(
        path=pdf_path,
        media_type="application/pdf",
        filename=f"compliance_report_{scan_id}.pdf"
    )


@router.get("/scans/recent", response_model=List[ScanSummary])
async def get_recent_scans(
    limit: int = 10,
    db: Session = Depends(get_db),
    current_user: Optional[User] = Depends(get_optional_user)
):
    """
    Get recent scans (last 10 by default)
    If authenticated, returns user's own scans
    """
    query = db.query(Scan)

    if current_user:
        query = query.filter(Scan.user_id == current_user.id)

    scans = query.order_by(Scan.created_at.desc()).limit(limit).all()

    results = []
    for scan in scans:
        # Determine status from score
        if scan.score >= 80:
            status_label = "Compliant"
        elif scan.score >= 50:
            status_label = "Partial Compliance"
        else:
            status_label = "Non-Compliant"

        product_name = None
        if scan.entities_json:
            product_name = scan.entities_json.get("product_name")

        results.append(ScanSummary(
            id=scan.id,
            image_url=scan.image_url,
            score=scan.score,
            status=status_label,
            product_name=product_name,
            violation_count=len(scan.violations),
            created_at=scan.created_at
        ))

    return results
