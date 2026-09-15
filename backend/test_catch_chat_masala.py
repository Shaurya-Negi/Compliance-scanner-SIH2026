import sys
import os
import json

sys.path.insert(0, r"C:\Users\negis\Desktop\SIH2026-Code-v2\backend")

from app.ocr_engine import ocr_engine
from app.llm_extractor import llm_extractor
from app.rule_engine import compliance_engine
from app.cross_verifier import multi_factor_verifier

images = [
    r"C:\Users\negis\Downloads\WhatsApp Image 2026-09-13 at 8.27.02 PM.jpeg",
    r"C:\Users\negis\Downloads\WhatsApp Image 2026-09-13 at 8.27.03 PM.jpeg",
    r"C:\Users\negis\Downloads\WhatsApp Image 2026-09-13 at 8.27.04 PM.jpeg",
    r"C:\Users\negis\Downloads\WhatsApp Image 2026-09-13 at 8.30.03 PM.jpeg",
]

all_lines = []
all_fonts = []
for idx, img in enumerate(images):
    res = ocr_engine.extract_text(img)
    all_lines.append(f"--- SURFACE {idx+1} ---")
    all_lines.extend(res.get("lines", []))
    all_fonts.extend(res.get("font_heights", []))

raw_text = "\n".join(all_lines)
print("=== RAW OCR EXTRACTED TEXT ===")
print(raw_text)

entities = llm_extractor.extract_entities(raw_text)
print("\n=== EXTRACTED ENTITIES ===")
print(json.dumps(entities, indent=2))

val = compliance_engine.validate(entities, all_fonts, 150.0)
print("\n=== COMPLIANCE EVALUATION ===")
print(f"Score: {val['score']}% ({val['status']})")
for c in val["checks"]:
    status_str = "PASS" if c.get("passed") else "FAIL"
    print(f" - [{status_str}] {c.get('rule_name')} ({c.get('clause_reference')}): {c.get('notes', c.get('details', ''))}")

from app.fmcg_database import lookup_barcode

ref_data = lookup_barcode("8901192205100")
verif = multi_factor_verifier.verify(
    barcode="8901192205100",
    reference_data=ref_data,
    ocr_entities=entities,
    raw_ocr_text=raw_text,
    rule_checks=val["checks"],
    surfaces_count=len(images)
)
print("\n=== MULTI-FACTOR VERIFICATION ===")
print(f"Status: {verif.status} ({verif.status_label})")
print(f"Summary: {verif.summary}")
print("Reasons:", json.dumps(verif.reasons, indent=2))
print("Officer Guidance:", verif.officer_guidance)
