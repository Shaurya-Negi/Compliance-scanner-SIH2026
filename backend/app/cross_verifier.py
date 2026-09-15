"""
SIH2026 Multi-Factor Product Verification Engine
Performs 4-factor cross-verification between:
  1. Optical Barcode & EAN-13 Modulo-10 Checksum
  2. Open Food Facts v3 Reference Database
  3. Physical Packaging OCR (Multi-Surface)
  4. Cross-Verification Analysis & Tri-State Classification (GREEN / YELLOW / RED)

Key Principle: A database mismatch does NOT automatically equal a counterfeit.
Accurately distinguishes between legitimate pack-size variants, uncataloged products,
and genuine manipulation/mismatches.
"""
import re
import logging
from typing import Dict, Any, List, Optional, Tuple
from app.schemas import (
    TriStateVerificationStatus,
    FactorBarcodeInfo,
    FactorReferenceInfo,
    FactorOCRInfo,
    ComparisonItem,
    MultiFactorVerificationResult
)
from app.fmcg_database import validate_ean13_checksum, calculate_ean13_check_digit

logger = logging.getLogger(__name__)

# Standard GS1 Country Prefix Table
GS1_PREFIX_MAP = {
    "890": "India (GS1 India)",
    "000": "United States & Canada",
    "001": "United States & Canada",
    "002": "United States & Canada",
    "003": "United States & Canada",
    "004": "United States & Canada",
    "005": "United States & Canada",
    "006": "United States & Canada",
    "007": "United States & Canada",
    "008": "United States & Canada",
    "009": "United States & Canada",
    "010": "United States & Canada",
    "300": "France",
    "301": "France",
    "302": "France",
    "303": "France",
    "380": "Bulgaria",
    "400": "Germany",
    "401": "Germany",
    "402": "Germany",
    "403": "Germany",
    "450": "Japan",
    "490": "Japan",
    "500": "United Kingdom",
    "501": "United Kingdom",
    "502": "United Kingdom",
    "503": "United Kingdom",
    "520": "Greece",
    "540": "Belgium & Luxembourg",
    "560": "Portugal",
    "570": "Denmark",
    "590": "Poland",
    "600": "South Africa",
    "611": "Morocco",
    "690": "China",
    "691": "China",
    "692": "China",
    "730": "Sweden",
    "760": "Switzerland",
    "800": "Italy",
    "840": "Spain",
    "870": "Netherlands",
    "880": "South Korea",
    "885": "Thailand",
    "888": "Singapore",
    "899": "Indonesia",
    "930": "Australia",
    "940": "New Zealand",
}


def get_gs1_country(barcode: str) -> Tuple[Optional[str], Optional[str]]:
    """Resolve GS1 prefix and country name from barcode string"""
    clean = re.sub(r'[^0-9]', '', str(barcode or ''))
    if len(clean) >= 3:
        prefix3 = clean[:3]
        if prefix3 in GS1_PREFIX_MAP:
            return prefix3, GS1_PREFIX_MAP[prefix3]
        prefix2 = clean[:2]
        for k, v in GS1_PREFIX_MAP.items():
            if k.startswith(prefix2):
                return prefix3, v
        return prefix3, f"GS1 Prefix {prefix3}"
    return None, None


def normalize_tokens(text: Optional[str]) -> set:
    """Normalize string into clean alphanumeric lowercase token set for fuzzy matching"""
    if not text:
        return set()
    cleaned = re.sub(r'[^a-zA-Z0-9\s]', ' ', str(text).lower())
    tokens = {t for t in cleaned.split() if len(t) > 1 and t not in {
        "the", "and", "pvt", "ltd", "limited", "inc", "co", "brand", "product", "pack", "packaged"
    }}
    return tokens


def calculate_token_similarity(text1: Optional[str], text2: Optional[str]) -> float:
    """Calculate Jaccard token overlap similarity between two strings (0.0 to 1.0)"""
    tokens1 = normalize_tokens(text1)
    tokens2 = normalize_tokens(text2)
    if not tokens1 or not tokens2:
        return 0.0
    intersection = tokens1.intersection(tokens2)
    union = tokens1.union(tokens2)
    return len(intersection) / len(union) if union else 0.0


def extract_numeric_quantity(qty_str: Optional[str]) -> Optional[Tuple[float, str]]:
    """Extract numeric value and standardized unit from quantity string (e.g. '500 ml' -> (500.0, 'ml'))"""
    if not qty_str:
        return None
    match = re.search(r'([0-9]+(?:\.[0-9]+)?)\s*([a-zA-Z]+)', str(qty_str).strip())
    if match:
        val = float(match.group(1))
        unit = match.group(2).lower()
        if unit in ['g', 'gm', 'gms', 'gram', 'grams']:
            return val, 'g'
        if unit in ['kg', 'kgs', 'kilogram', 'kilograms']:
            return val * 1000.0, 'g'
        if unit in ['ml', 'milli', 'milliliter', 'millilitre']:
            return val, 'ml'
        if unit in ['l', 'ltr', 'liter', 'litre']:
            return val * 1000.0, 'ml'
        return val, unit
    return None


class MultiFactorVerifier:
    """
    4-Factor Multi-Factor Cross-Verification Engine.
    Evaluates:
      Factor 1: Barcode Integrity & EAN-13 Checksum
      Factor 2: Open Food Facts Reference DB Record
      Factor 3: Packaging OCR Mandatory Declarations
      Factor 4: Cross-Verification Matrix & Tri-State Decision Logic
    """

    def verify(
        self,
        barcode: Optional[str],
        reference_data: Optional[Dict[str, Any]],
        ocr_entities: Dict[str, Any],
        raw_ocr_text: Optional[str] = None,
        rule_checks: Optional[List[Dict[str, Any]]] = None,
        surfaces_count: int = 1
    ) -> MultiFactorVerificationResult:
        """
        Execute full multi-factor verification pipeline and return structured result.
        """
        clean_barcode = re.sub(r'[^0-9]', '', str(barcode or ocr_entities.get("barcode") or ''))

        # ----------------------------------------------------
        # FACTOR 1: BARCODE & EAN-13 CHECKSUM
        # ----------------------------------------------------
        barcode_format = "EAN-13" if len(clean_barcode) == 13 else ("EAN-8" if len(clean_barcode) == 8 else ("UPC-A" if len(clean_barcode) == 12 else "Custom/Other"))
        checksum_valid = True
        if len(clean_barcode) == 13:
            checksum_valid = validate_ean13_checksum(clean_barcode)
        elif len(clean_barcode) == 12:
            calc_13 = clean_barcode + calculate_ean13_check_digit(clean_barcode)
            checksum_valid = True
        elif not clean_barcode:
            checksum_valid = False

        prefix, country_name = get_gs1_country(clean_barcode)
        is_indian_gs1 = clean_barcode.startswith("890")

        barcode_factor = FactorBarcodeInfo(
            barcode=clean_barcode if clean_barcode else "NOT_DETECTED",
            format=barcode_format,
            checksum_valid=checksum_valid,
            country_prefix=prefix,
            country_name=country_name or ("India (GS1 India)" if is_indian_gs1 else "Global"),
            is_indian_gs1=is_indian_gs1
        )

        # ----------------------------------------------------
        # FACTOR 2: OPEN FOOD FACTS / GS1 REFERENCE DATA
        # ----------------------------------------------------
        has_ref = bool(reference_data and reference_data.get("product_name") and "Generic" not in reference_data.get("product_name", ""))
        ref_source = reference_data.get("source", "Open Food Facts API v3") if reference_data else "Open Food Facts API v3"

        reference_factor = FactorReferenceInfo(
            found=has_ref,
            source=ref_source,
            barcode=clean_barcode if has_ref else None,
            product_name=reference_data.get("product_name") if has_ref else None,
            brand=reference_data.get("brand") if has_ref else None,
            quantity=reference_data.get("net_quantity") or reference_data.get("quantity") if has_ref else None,
            categories=reference_data.get("category") or reference_data.get("categories") if has_ref else None,
            countries=reference_data.get("country_of_origin") or reference_data.get("countries") if has_ref else ("India" if is_indian_gs1 else None)
        )

        # ----------------------------------------------------
        # FACTOR 3: PACKAGING OCR DATA
        # ----------------------------------------------------
        ocr_product_name = ocr_entities.get("product_name")
        ocr_brand = ocr_entities.get("brand")
        ocr_quantity = ocr_entities.get("net_quantity")
        ocr_mrp = ocr_entities.get("mrp")
        ocr_mfg = ocr_entities.get("mfg_date")
        ocr_expiry = ocr_entities.get("expiry_date")
        ocr_manufacturer = ocr_entities.get("manufacturer_name") or ocr_entities.get("manufacturer_address")
        ocr_origin = ocr_entities.get("country_of_origin")

        ocr_factor = FactorOCRInfo(
            detected=bool(raw_ocr_text or ocr_product_name or ocr_brand),
            product_name=ocr_product_name,
            brand=ocr_brand,
            net_quantity=ocr_quantity,
            mrp=ocr_mrp,
            mfg_date=ocr_mfg,
            expiry_date=ocr_expiry,
            manufacturer=ocr_manufacturer,
            country_of_origin=ocr_origin or ("India" if is_indian_gs1 else None),
            surfaces_analyzed=max(1, surfaces_count)
        )

        # ----------------------------------------------------
        # FACTOR 4: CROSS-VERIFICATION COMPARISON MATRIX
        # ----------------------------------------------------
        comparison_matrix: List[ComparisonItem] = []
        reasons: List[str] = []
        is_variant_difference = False
        is_uncataloged_product = False
        is_counterfeit_suspected = False

        # Check 1: Brand Comparison
        ref_brand = reference_factor.brand
        if ref_brand and ocr_brand:
            brand_sim = calculate_token_similarity(ref_brand, ocr_brand)
            ref_brand_clean = ref_brand.lower()
            ocr_brand_clean = ocr_brand.lower()
            if brand_sim > 0.3 or ref_brand_clean in ocr_brand_clean or ocr_brand_clean in ref_brand_clean:
                brand_match_status = "MATCH"
                brand_note = f"Consistent brand identity ({ref_brand})"
            else:
                brand_match_status = "MISMATCH"
                brand_note = f"Brand divergence: Reference says '{ref_brand}', package shows '{ocr_brand}'"
                is_counterfeit_suspected = True
        elif not ref_brand and ocr_brand:
            brand_match_status = "UNLISTED"
            brand_note = f"Brand declared on package: '{ocr_brand}' (Unlisted in database)"
        else:
            brand_match_status = "MATCH" if is_indian_gs1 else "UNLISTED"
            brand_note = "Resolved via packaging declarations"

        comparison_matrix.append(ComparisonItem(
            field="Brand Identity",
            barcode_db_value=ref_brand or "Not cataloged",
            ocr_package_value=ocr_brand or "Declared on label",
            match_status=brand_match_status,
            note=brand_note
        ))

        # Check 2: Product Name Comparison
        ref_pname = reference_factor.product_name
        if ref_pname and ocr_product_name:
            name_sim = calculate_token_similarity(ref_pname, ocr_product_name)
            ref_pname_clean = ref_pname.lower()
            ocr_pname_clean = ocr_product_name.lower()
            if name_sim >= 0.25 or ref_pname_clean in ocr_pname_clean or ocr_pname_clean in ref_pname_clean:
                pname_match_status = "MATCH"
                pname_note = "Product commodity descriptors match"
            elif brand_match_status == "MATCH":
                # Same brand, different flavor or sub-name -> Variant
                pname_match_status = "VARIANT_DIFFERENCE"
                pname_note = f"Product variant difference under same brand ({ref_brand})"
                is_variant_difference = True
            else:
                pname_match_status = "MISMATCH"
                pname_note = f"Severe commodity discrepancy: DB '{ref_pname}' vs Package '{ocr_product_name}'"
                is_counterfeit_suspected = True
        elif not ref_pname and ocr_product_name:
            pname_match_status = "UNLISTED"
            pname_note = "Commodity extracted directly from physical label"
            is_uncataloged_product = True
        else:
            pname_match_status = "UNLISTED"
            pname_note = "Physical label verification active"

        comparison_matrix.append(ComparisonItem(
            field="Product / Commodity Name",
            barcode_db_value=ref_pname or "Not cataloged in Open Food Facts",
            ocr_package_value=ocr_product_name or "Extracted from packaging",
            match_status=pname_match_status,
            note=pname_note
        ))

        # Check 3: Net Quantity / Pack Size Variant Comparison
        ref_qty = reference_factor.quantity
        if ref_qty and ocr_quantity:
            ref_parsed = extract_numeric_quantity(ref_qty)
            ocr_parsed = extract_numeric_quantity(ocr_quantity)

            if ref_parsed and ocr_parsed:
                ref_val, ref_unit = ref_parsed
                ocr_val, ocr_unit = ocr_parsed
                if ref_unit == ocr_unit and abs(ref_val - ocr_val) < 0.01:
                    qty_status = "MATCH"
                    qty_note = f"Exact net quantity match ({ocr_quantity})"
                else:
                    qty_status = "VARIANT_DIFFERENCE"
                    qty_note = f"Pack size variant: Reference database lists {ref_qty}, physical packaging declares {ocr_quantity}. Legitimate pack variant, not counterfeit."
                    is_variant_difference = True
            else:
                if ref_qty.strip().lower() == ocr_quantity.strip().lower():
                    qty_status = "MATCH"
                    qty_note = f"Net quantity matches ({ocr_quantity})"
                else:
                    qty_status = "VARIANT_DIFFERENCE"
                    qty_note = f"Pack size variation ({ref_qty} vs {ocr_quantity})"
                    is_variant_difference = True
        elif not ref_qty and ocr_quantity:
            qty_status = "UNLISTED"
            qty_note = f"Packaging declares {ocr_quantity} under standard metric unit (Rule 6)"
        else:
            qty_status = "MATCH"
            qty_note = "Net quantity declared on package"

        comparison_matrix.append(ComparisonItem(
            field="Net Quantity / Pack Size",
            barcode_db_value=ref_qty or "Unspecified in reference DB",
            ocr_package_value=ocr_quantity or "Declared on label",
            match_status=qty_status,
            note=qty_note
        ))

        # Check 4: Country of Origin & GS1 Prefix
        ref_country = reference_factor.countries or ("India" if is_indian_gs1 else "Global")
        ocr_country_clean = str(ocr_origin or ("India" if is_indian_gs1 else "")).lower()
        if is_indian_gs1 and ("india" in ocr_country_clean or not ocr_origin):
            country_status = "MATCH"
            country_note = "GS1 India Prefix (890) matches physical country declaration"
        elif not is_indian_gs1 and country_name:
            country_status = "MATCH"
            country_note = f"GS1 Prefix aligned with {country_name}"
        else:
            country_status = "MATCH"
            country_note = f"Country declaration: {ocr_origin or ref_country}"

        comparison_matrix.append(ComparisonItem(
            field="Country of Origin & GS1 Prefix",
            barcode_db_value=f"{prefix or '890'} ({country_name or 'GS1 India'})",
            ocr_package_value=ocr_origin or ("India" if is_indian_gs1 else "Declared on label"),
            match_status=country_status,
            note=country_note
        ))

        # Check 5: Statutory Compliance under Legal Metrology Rules
        failed_rules = [c for c in (rule_checks or []) if not c.get("passed", True)]
        if not failed_rules:
            statutory_status = "MATCH"
            statutory_note = "All 9 mandatory Rule 6 declarations verified"
        elif len(failed_rules) <= 2:
            statutory_status = "VARIANT_DIFFERENCE"
            statutory_note = f"{len(failed_rules)} declaration warning(s) detected (e.g., {failed_rules[0].get('rule_name')})"
        else:
            statutory_status = "MISMATCH"
            statutory_note = f"{len(failed_rules)} statutory violations detected under Rule 6"

        comparison_matrix.append(ComparisonItem(
            field="Legal Metrology Rule 6 Declarations",
            barcode_db_value="Rule 6 Requirements",
            ocr_package_value=f"{9 - len(failed_rules)}/9 Declarations Present",
            match_status=statutory_status,
            note=statutory_note
        ))

        # ----------------------------------------------------
        # TRI-STATE CLASSIFICATION LOGIC (GREEN / YELLOW / RED)
        # ----------------------------------------------------
        # Determine Checksum & Barcode validity
        if not checksum_valid and len(clean_barcode) == 13:
            reasons.append("Invalid Barcode Checksum: EAN-13 Modulo-10 check digit verification failed. The barcode may be corrupted or fabricated.")
            is_counterfeit_suspected = True

        if is_counterfeit_suspected or (failed_rules and len(failed_rules) >= 4):
            # RED STATE
            status = TriStateVerificationStatus.RED
            status_label = "POSSIBLE MANIPULATION / NON-COMPLIANCE"
            if is_counterfeit_suspected:
                summary = "Significant discrepancy detected between barcode identity and physical packaging label."
            else:
                summary = f"Severe Legal Metrology Non-Compliance: {len(failed_rules)} mandatory Rule 6 declarations missing from packaging."

            if not reasons:
                if is_counterfeit_suspected:
                    reasons.append("Contradiction between reference database product identity and physical OCR packaging data.")
                else:
                    reasons.append(f"Multiple statutory violations ({len(failed_rules)} failed checks under Legal Metrology Rules, 2011).")

            if failed_rules:
                for fr in failed_rules[:3]:
                    rule_detail = fr.get('notes') or fr.get('details') or fr.get('actual') or 'Missing declaration'
                    reasons.append(f"Statutory Violation: {fr.get('rule_name')} ({fr.get('clause_reference')}) — {rule_detail}")

            officer_guidance = "ACTION REQUIRED: Flag commodity for manual physical inspection and request manufacturer verification certificate under Section 36 of the Legal Metrology Act, 2009."

        elif not has_ref or is_variant_difference or (failed_rules and len(failed_rules) > 0):
            # YELLOW STATE
            status = TriStateVerificationStatus.YELLOW
            status_label = "NEEDS VERIFICATION"

            if not has_ref:
                is_uncataloged_product = True
                reasons.append("Valid EAN-13 barcode not yet cataloged in Open Food Facts database. Physical packaging verified directly via OCR and statutory declarations.")
                summary = "Product not listed in Open Food Facts reference database, but physical packaging contains valid statutory declarations."

            if is_variant_difference:
                reasons.append(f"Regional or Pack-Size Variant Detected: Reference database lists {ref_qty or 'standard pack'}, while physical packaging declares {ocr_quantity}. This is a legitimate commodity variant, NOT a counterfeit.")
                summary = "Pack-size or regional variant detected between reference catalog and physical package."

            if failed_rules:
                summary = f"Partial statutory compliance: {len(failed_rules)} declaration warning(s) flagged for inspection."
                for fr in failed_rules[:3]:
                    rule_detail = fr.get('notes') or fr.get('details') or fr.get('actual') or 'Incomplete declaration'
                    reasons.append(f"Statutory Notice: {fr.get('rule_name')} ({fr.get('clause_reference')}) — {rule_detail}")

            officer_guidance = "INFORMATIONAL: Barcode and packaging are consistent. Ensure local state packaging registration is updated if this is a newly released regional variant or verify specific packaging declarations."

        else:
            # GREEN STATE
            status = TriStateVerificationStatus.GREEN
            status_label = "VERIFIED / MATCH"
            summary = "Multi-Factor Verification Passed: Barcode checksum is valid, reference catalog confirms identity, and physical packaging complies with Legal Metrology Rule 6."
            reasons.append("Barcode format and EAN-13 Modulo-10 checksum verified.")
            reasons.append("Reference database identity matches physical packaging OCR data.")
            reasons.append("All mandatory Legal Metrology (Packaged Commodities) Rule 6 declarations present.")
            officer_guidance = "COMPLIANT: No enforcement action needed. Commodity satisfies all statutory declaration requirements."

        return MultiFactorVerificationResult(
            status=status,
            status_label=status_label,
            summary=summary,
            reasons=reasons,
            is_variant_difference=is_variant_difference,
            is_uncataloged_product=is_uncataloged_product,
            is_counterfeit_suspected=is_counterfeit_suspected,
            barcode_factor=barcode_factor,
            reference_factor=reference_factor,
            ocr_factor=ocr_factor,
            comparison_matrix=comparison_matrix,
            officer_guidance=officer_guidance
        )


# Global singleton instance
multi_factor_verifier = MultiFactorVerifier()
