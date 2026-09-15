import sys
import time
from fastapi.testclient import TestClient
from app.main import app
from app.database import init_db

init_db()

with TestClient(app) as client:
    print("Testing /health...")
    health_res = client.get("/health")
    print("Health:", health_res.json())

    print("\nStarting scan test with maggi_pack.png...")
    t0 = time.time()
    with open(r"C:\Users\negis\Desktop\SIH2026-v2-BarcodeCV\maggi_pack.png", "rb") as f:
        response = client.post("/api/v1/scan", files={"image": ("maggi_pack.png", f, "image/png")})

    t1 = time.time()
    print(f"\nScan Status Code: {response.status_code} in {t1 - t0:.2f}s")
    if response.status_code == 200:
        data = response.json()
        print("Scan ID:", data.get("scan_id"))
        print("Product Name:", data.get("entities", {}).get("product_name"))
        print("Brand:", data.get("entities", {}).get("brand"))
        print("Barcode:", data.get("barcode"))
        print("Barcode Detected:", data.get("barcode_detected"))
        print("Score:", data.get("score"))
        print("Status:", data.get("status"))
        print("Checks:", len(data.get("checks", [])))
        print("Violations:", len(data.get("violations", [])))
        for v in data.get("violations", []):
            print(f"  - [{v.get('severity')}] {v.get('rule_name')}: {v.get('explanation')}")
        print("Report URL:", data.get("report_url"))

        # Test download report
        if data.get("report_url"):
            report_res = client.get(data.get("report_url"))
            print(f"PDF Report Download Status: {report_res.status_code} ({len(report_res.content)} bytes)")
    else:
        print("Error:", response.text)
