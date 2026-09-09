"""
Product catalog and history routes
View scanned products and their compliance trends
"""
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.database import get_db
from app.models import Product, Scan, ProductScan
from app.schemas import ProductOut

router = APIRouter()


@router.get("/products", response_model=List[ProductOut])
async def list_products(
    search: Optional[str] = Query(None, description="Search by product name or brand"),
    min_score: Optional[float] = Query(None, ge=0, le=100, description="Minimum avg compliance score"),
    limit: int = Query(50, ge=1, le=100, description="Maximum results to return"),
    offset: int = Query(0, ge=0, description="Number of results to skip"),
    db: Session = Depends(get_db)
):
    """
    List all scanned products with filtering and pagination

    **Query Parameters:**
    - **search**: Filter by product name or brand (case-insensitive)
    - **min_score**: Show only products with avg score >= this value
    - **limit**: Max results per page (default 50, max 100)
    - **offset**: Skip first N results for pagination

    **Returns:**
    - List of products sorted by last scanned date (newest first)
    - Each product includes: name, brand, category, avg_score, total_scans, last_scanned_at
    """
    query = db.query(Product)

    # Apply search filter
    if search:
        search_pattern = f"%{search}%"
        query = query.filter(
            (Product.name.ilike(search_pattern)) |
            (Product.brand.ilike(search_pattern))
        )

    # Apply score filter
    if min_score is not None:
        query = query.filter(Product.avg_score >= min_score)

    # Order by most recently scanned
    query = query.order_by(Product.last_scanned_at.desc())

    # Apply pagination
    products = query.offset(offset).limit(limit).all()

    return [ProductOut.model_validate(p) for p in products]


@router.get("/products/{product_id}", response_model=ProductOut)
async def get_product(product_id: int, db: Session = Depends(get_db)):
    """
    Get detailed information about a specific product

    Returns product metadata including compliance history
    """
    product = db.query(Product).filter(Product.id == product_id).first()

    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product #{product_id} not found"
        )

    return ProductOut.model_validate(product)


@router.get("/products/{product_id}/scans")
async def get_product_scans(
    product_id: int,
    limit: int = Query(10, ge=1, le=50),
    db: Session = Depends(get_db)
):
    """
    Get scan history for a specific product

    Returns recent scans (with scores and timestamps) for compliance trend analysis
    """
    product = db.query(Product).filter(Product.id == product_id).first()
    if not product:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Product #{product_id} not found"
        )

    # Get scans linked to this product via ProductScan association
    scans = (
        db.query(Scan)
        .join(ProductScan)
        .filter(ProductScan.product_id == product_id)
        .order_by(Scan.created_at.desc())
        .limit(limit)
        .all()
    )

    results = []
    for scan in scans:
        if scan.score >= 80:
            status_label = "Compliant"
        elif scan.score >= 50:
            status_label = "Partial Compliance"
        else:
            status_label = "Non-Compliant"

        results.append({
            "scan_id": scan.id,
            "score": scan.score,
            "status": status_label,
            "violation_count": len(scan.violations),
            "created_at": scan.created_at
        })

    return {
        "product_id": product_id,
        "product_name": product.name,
        "total_scans": product.total_scans,
        "avg_score": product.avg_score,
        "recent_scans": results
    }
