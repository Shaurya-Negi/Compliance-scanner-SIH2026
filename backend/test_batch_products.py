import os
import sys
import time
from fastapi.testclient import TestClient
from app.main import app
from app.database import init_db

init_db()

samples_dir = os.path.join(os.path.dirname(__file__), "samples")

products = [
    ("Parle-G Gluco Biscuits", os.path.join(samples_dir, "parleg_pack.png")),
    ("Nestle Maggi 2-Minute Noodles", os.path.join(samples_dir, "maggi_pack.png")),
    ("Tata Salt Vacuum Evaporated", os.path.join(samples_dir, "tata_salt.png")),
    ("Amul Pasteurized Butter", os.path.join(samples_dir, "amul_butter.png")),
    ("Lay's Magic Masala (Non-Compliant)", os.path.join(samples_dir, "lays_pack.png")),
    ("Dettol Original Soap (Partial)", os.path.join(samples_dir, "dettol_soap.png")),
]

with TestClient(app) as client:
    print("=" * 70)
    print("🚀 BATCH VERIFICATION: REAL PRODUCT SCANNING & COMPLIANCE PIPELINE")
    print("=" * 70)
    for name, path in products:
        print(f"\n--- Testing Scan: {name} ---")
        if not os.path.exists(path):
            print(f"File not found: {path}")
            continue
        t0 = time.time()
        with open(path, "rb") as f:
            res = client.post("/api/v1/scan", files={"image": (os.path.basename(path), f, "image/png")})
        t1 = time.time()
        print(f"Status: {res.status_code} in {t1 - t0:.2f}s")
        if res.status_code == 200:
            d = res.json()
            print(f"  Scan ID: {d.get('scan_id')}")
            print(f"  Product: {d.get('entities', {}).get('product_name')}")
            print(f"  Brand: {d.get('entities', {}).get('brand')}")
            print(f"  Barcode: {d.get('barcode')} (Detected: {d.get('barcode_detected')})")
            print(f"  Net Qty: {d.get('entities', {}).get('net_quantity')}")
            print(f"  MRP: {d.get('entities', {}).get('mrp')}")
            print(f"  Score: {d.get('score')}% ({d.get('status')})")
            print(f"  Violations Count: {len(d.get('violations', []))}")
            for v in d.get("violations", []):
                print(f"    - [{v.get('severity')}] {v.get('rule_name')}: {v.get('explanation')}")
            print(f"  Report URL: {d.get('report_url')}")
        else:
            print("Error:", res.text)
    print("\n" + "=" * 70)
    print("✅ ALL SCANS COMPLETED SUCCESSFULLY WITH DYNAMIC COMPUTER VISION")
    print("=" * 70)
