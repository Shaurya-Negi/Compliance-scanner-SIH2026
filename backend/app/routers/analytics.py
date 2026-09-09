"""
Analytics and dashboard routes for inspectors
Aggregates scan statistics, top violations, and compliance trends
"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func, desc

from app.database import get_db
from app.models import Scan, Violation, Product, User
from app.schemas import DashboardData, ViolationStat, ScanSummary
from app.dependencies import require_role, get_optional_user

router = APIRouter()


@router.get("/dashboard", response_model=DashboardData)
async def get_dashboard_data(
    db: Session = Depends(get_db),
    # Optional role check - can be public for demo or restricted to inspectors
    # current_user: User = Depends(require_role("inspector"))
):
    """
    Inspector Analytics Dashboard Data

    **Aggregates:**
    - Total scans completed
    - Average compliance score across all scans
    - Count of compliant (score ≥80) vs non-compliant scans
    - Top 5 most frequent violations with percentages
    - Recent scans list (last 5)

    **Audience:** Legal Metrology Officers, Regulators, Hackathon Judges
    """
    # 1. Total Scans
    total_scans = db.query(func.count(Scan.id)).scalar() or 0

    # 2. Average Compliance Score
    avg_score = db.query(func.avg(Scan.score)).scalar() or 0.0
    avg_score = round(float(avg_score), 2)

    # 3. Compliant vs Non-Compliant Counts
    compliant_count = db.query(func.count(Scan.id)).filter(Scan.score >= 80.0).scalar() or 0
    non_compliant_count = total_scans - compliant_count

    # 4. Top Violations Breakdown
    # Group by rule_code and count occurrences
    top_violation_records = (
        db.query(
            Violation.rule_code,
            Violation.rule_name,
            func.count(Violation.id).label("violation_count")
        )
        .group_by(Violation.rule_code, Violation.rule_name)
        .order_by(desc("violation_count"))
        .limit(5)
        .all()
    )

    top_violations = []
    total_violations_count = db.query(func.count(Violation.id)).scalar() or 1  # Avoid div by 0

    for record in top_violation_records:
        percentage = round((record.violation_count / total_violations_count) * 100, 1)
        top_violations.append(ViolationStat(
            rule_code=record.rule_code,
            rule_name=record.rule_name,
            count=record.violation_count,
            percentage=percentage
        ))

    # 5. Recent Scans (last 5)
    recent_scan_records = (
        db.query(Scan)
        .order_by(Scan.created_at.desc())
        .limit(5)
        .all()
    )

    recent_scans = []
    for scan in recent_scan_records:
        if scan.score >= 80:
            status_label = "Compliant"
        elif scan.score >= 50:
            status_label = "Partial Compliance"
        else:
            status_label = "Non-Compliant"

        product_name = None
        if scan.entities_json:
            product_name = scan.entities_json.get("product_name")

        recent_scans.append(ScanSummary(
            id=scan.id,
            image_url=scan.image_url,
            score=scan.score,
            status=status_label,
            product_name=product_name,
            violation_count=len(scan.violations),
            created_at=scan.created_at
        ))

    return DashboardData(
        total_scans=total_scans,
        avg_compliance_score=avg_score,
        compliant_scans_count=compliant_count,
        non_compliant_scans_count=non_compliant_count,
        top_violations=top_violations,
        recent_scans=recent_scans
    )
