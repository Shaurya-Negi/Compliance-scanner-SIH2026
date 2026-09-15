"""
Legal Metrology (Packaged Commodities) Rules, 2011 compliance validation engine
Validates all 9 mandatory declarations from Rule 6
"""
import re
from typing import Dict, List, Any, Optional
from app.schemas import RuleCheckResult, ViolationSeverityEnum, ComplianceScore


class ComplianceEngine:
    """
    Rule-based validation engine for Legal Metrology compliance
    Checks each of the 9 mandatory declarations per Rule 6(1)
    """

    def __init__(self):
        # Second Schedule font size requirements (label area vs minimum height)
        self.font_size_requirements = [
            {"max_area_cm2": 25, "min_height_mm": 1.0},
            {"max_area_cm2": 100, "min_height_mm": 2.0},
            {"max_area_cm2": 500, "min_height_mm": 4.0},
            {"max_area_cm2": float('inf'), "min_height_mm": 6.0}
        ]

    def validate(self, entities: Dict[str, Any], font_heights_px: List[float], label_area_cm2: float) -> Dict[str, Any]:
        """
        Run all 9 compliance checks and calculate overall score

        Args:
            entities: Extracted entity dict from LLM
            font_heights_px: List of detected font heights in pixels
            label_area_cm2: Estimated label surface area

        Returns:
            Dict with score, status, and list of check results
        """
        checks = []

        # Rule 1: Common/Generic Name
        checks.append(self.check_product_name(entities))

        # Rule 2: Net Quantity with Font Size
        checks.append(self.check_net_quantity(entities, font_heights_px, label_area_cm2))

        # Rule 3: MRP with "inclusive of all taxes"
        checks.append(self.check_mrp(entities))

        # Rule 4: Manufacturing/Packing Date
        checks.append(self.check_mfg_date(entities))

        # Rule 5: Manufacturer Address with PIN
        checks.append(self.check_manufacturer_address(entities))

        # Rule 6: Customer Care Details
        checks.append(self.check_customer_care(entities))

        # Rule 7: Country of Origin
        checks.append(self.check_country_of_origin(entities))

        # Rule 8: Unit Sale Price
        checks.append(self.check_unit_sale_price(entities))

        # Rule 9: Best Before / Expiry Date
        checks.append(self.check_expiry_date(entities))

        # Calculate compliance score
        passed_count = sum(1 for c in checks if c["passed"])
        failed_count = len(checks) - passed_count
        score = round((passed_count / len(checks)) * 100, 2)

        # Status classification
        if score >= 80:
            status = "Compliant"
        elif score >= 50:
            status = "Partial Compliance"
        else:
            status = "Non-Compliant"

        return {
            "score": score,
            "status": status,
            "total_rules_checked": len(checks),
            "passed_count": passed_count,
            "failed_count": failed_count,
            "checks": checks
        }

    def check_product_name(self, entities: Dict[str, Any]) -> Dict[str, Any]:
        """Rule 6(1)(a): Common or generic name of commodity"""
        product_name = entities.get("product_name")

        if not product_name or len(product_name.strip()) < 3:
            return {
                "rule_code": "RULE_1_PRODUCT_NAME",
                "rule_name": "Common Name of Commodity",
                "clause_reference": "Rule 6(1)(a)",
                "passed": False,
                "severity": ViolationSeverityEnum.CRITICAL,
                "expected": "Clear common or generic name (e.g., 'Refined Sunflower Oil', 'Wheat Flour')",
                "actual": product_name or "Not found",
                "explanation": "Product name is missing or unclear. Rule 6(1)(a) requires the common or generic name of the commodity to be prominently displayed."
            }

        return {
            "rule_code": "RULE_1_PRODUCT_NAME",
            "rule_name": "Common Name of Commodity",
            "clause_reference": "Rule 6(1)(a)",
            "passed": True,
            "severity": ViolationSeverityEnum.LOW,
            "expected": "Common name declared",
            "actual": product_name[:50],
            "explanation": "Product name is properly declared."
        }

    def check_net_quantity(self, entities: Dict[str, Any], font_heights_px: List[float], label_area_cm2: float) -> Dict[str, Any]:
        """Rule 6(1)(b) + Second Schedule: Net quantity with proper font size"""
        net_quantity = entities.get("net_quantity")

        if not net_quantity:
            return {
                "rule_code": "RULE_2_NET_QUANTITY",
                "rule_name": "Net Quantity Declaration",
                "clause_reference": "Rule 6(1)(b) & Second Schedule",
                "passed": False,
                "severity": ViolationSeverityEnum.CRITICAL,
                "expected": "Net quantity with unit (e.g., '500 g', '1 L')",
                "actual": "Not found",
                "explanation": "Net quantity is missing. Rule 6(1)(b) mandates declaration of net quantity in standard units."
            }

        # Determine required minimum font height based on label area
        required_mm = 1.0
        for req in self.font_size_requirements:
            if label_area_cm2 <= req["max_area_cm2"]:
                required_mm = req["min_height_mm"]
                break

        # Font size validation (approximate: assume 96 DPI, 1mm ≈ 3.78 px)
        required_px = required_mm * 3.78
        avg_font_px = sum(font_heights_px) / len(font_heights_px) if font_heights_px else 12.0

        if avg_font_px < required_px * 0.8:  # 20% tolerance
            return {
                "rule_code": "RULE_2_NET_QUANTITY",
                "rule_name": "Net Quantity Declaration",
                "clause_reference": "Rule 6(1)(b) & Second Schedule",
                "passed": False,
                "severity": ViolationSeverityEnum.HIGH,
                "expected": f"Font height ≥ {required_mm} mm (label area {label_area_cm2} cm²)",
                "actual": f"Approx. {round(avg_font_px / 3.78, 1)} mm",
                "explanation": f"Net quantity font size appears smaller than required. Second Schedule mandates {required_mm}mm minimum height for labels up to {label_area_cm2} cm²."
            }

        return {
            "rule_code": "RULE_2_NET_QUANTITY",
            "rule_name": "Net Quantity Declaration",
            "clause_reference": "Rule 6(1)(b) & Second Schedule",
            "passed": True,
            "severity": ViolationSeverityEnum.LOW,
            "expected": "Net quantity with proper font size",
            "actual": net_quantity[:50],
            "explanation": "Net quantity is properly declared with compliant font size."
        }

    def check_mrp(self, entities: Dict[str, Any]) -> Dict[str, Any]:
        """Rule 6(1)(c): MRP with 'inclusive of all taxes'"""
        mrp = entities.get("mrp")
        taxes_inclusive = entities.get("mrp_taxes_inclusive")

        if not mrp:
            return {
                "rule_code": "RULE_3_MRP",
                "rule_name": "Maximum Retail Price (MRP)",
                "clause_reference": "Rule 6(1)(c)",
                "passed": False,
                "severity": ViolationSeverityEnum.CRITICAL,
                "expected": "MRP with 'inclusive of all taxes' declaration",
                "actual": "Not found",
                "explanation": "MRP is missing. Rule 6(1)(c) requires MRP declaration with 'inclusive of all taxes' or equivalent phrase."
            }

        if not taxes_inclusive:
            return {
                "rule_code": "RULE_3_MRP",
                "rule_name": "Maximum Retail Price (MRP)",
                "clause_reference": "Rule 6(1)(c)",
                "passed": False,
                "severity": ViolationSeverityEnum.HIGH,
                "expected": "MRP followed by 'inclusive of all taxes'",
                "actual": f"{mrp}, but missing tax clause",
                "explanation": "MRP is declared but missing mandatory 'inclusive of all taxes' phrase as per Rule 6(1)(c)."
            }

        return {
            "rule_code": "RULE_3_MRP",
            "rule_name": "Maximum Retail Price (MRP)",
            "clause_reference": "Rule 6(1)(c)",
            "passed": True,
            "severity": ViolationSeverityEnum.LOW,
            "expected": "MRP with tax inclusion declaration",
            "actual": mrp[:50],
            "explanation": "MRP is properly declared with tax inclusion phrase."
        }

    def check_mfg_date(self, entities: Dict[str, Any]) -> Dict[str, Any]:
        """Rule 6(1)(d): Month and year of manufacture/packing"""
        mfg_date = entities.get("mfg_date")

        if not mfg_date:
            return {
                "rule_code": "RULE_4_MFG_DATE",
                "rule_name": "Manufacturing/Packing Date",
                "clause_reference": "Rule 6(1)(d)",
                "passed": False,
                "severity": ViolationSeverityEnum.CRITICAL,
                "expected": "Month and year of manufacture (e.g., '03/2026', 'Mar 2026')",
                "actual": "Not found",
                "explanation": "Manufacturing or packing date is missing. Rule 6(1)(d) mandates declaration of month and year."
            }

        # Validate date format (should contain month and year)
        if not re.search(r'\d{1,2}[/-]\d{4}|\d{4}', mfg_date):
            return {
                "rule_code": "RULE_4_MFG_DATE",
                "rule_name": "Manufacturing/Packing Date",
                "clause_reference": "Rule 6(1)(d)",
                "passed": False,
                "severity": ViolationSeverityEnum.MEDIUM,
                "expected": "Valid month/year format",
                "actual": mfg_date[:50],
                "explanation": "Manufacturing date format appears unclear or incomplete."
            }

        return {
            "rule_code": "RULE_4_MFG_DATE",
            "rule_name": "Manufacturing/Packing Date",
            "clause_reference": "Rule 6(1)(d)",
            "passed": True,
            "severity": ViolationSeverityEnum.LOW,
            "expected": "Month and year declared",
            "actual": mfg_date[:50],
            "explanation": "Manufacturing/packing date is properly declared."
        }

    def check_manufacturer_address(self, entities: Dict[str, Any]) -> Dict[str, Any]:
        """Rule 6(1)(e): Complete manufacturer address with PIN code"""
        address = entities.get("manufacturer_address")
        pin = entities.get("manufacturer_pin")

        # Auto-extract PIN if present in address or raw text but unassigned
        if not pin:
            if address:
                pin_m = re.search(r'\b([1-9][0-9]{5})\b', str(address))
                if pin_m:
                    pin = pin_m.group(1)
            if not pin and entities.get("raw_text"):
                pin_m = re.search(r'\b([1-9][0-9]{5})\b', str(entities["raw_text"]))
                if pin_m:
                    pin = pin_m.group(1)

        if not address or len(address.strip()) < 15:
            return {
                "rule_code": "RULE_5_ADDRESS",
                "rule_name": "Manufacturer/Packer Address",
                "clause_reference": "Rule 6(1)(e)",
                "passed": False,
                "severity": ViolationSeverityEnum.CRITICAL,
                "expected": "Complete address with locality, state, and 6-digit PIN code",
                "actual": address[:100] if address else "Not found",
                "explanation": "Manufacturer address is missing or incomplete. Rule 6(1)(e) requires full address with PIN code."
            }

        if not pin or not re.match(r'^\d{6}$', pin):
            return {
                "rule_code": "RULE_5_ADDRESS",
                "rule_name": "Manufacturer/Packer Address",
                "clause_reference": "Rule 6(1)(e)",
                "passed": False,
                "severity": ViolationSeverityEnum.HIGH,
                "expected": "6-digit PIN code in address",
                "actual": f"Address present but PIN not found or invalid: {pin}",
                "explanation": "Address is declared but missing valid 6-digit PIN code as required by Rule 6(1)(e)."
            }

        return {
            "rule_code": "RULE_5_ADDRESS",
            "rule_name": "Manufacturer/Packer Address",
            "clause_reference": "Rule 6(1)(e)",
            "passed": True,
            "severity": ViolationSeverityEnum.LOW,
            "expected": "Complete address with PIN",
            "actual": f"{address[:80]}... (PIN: {pin})",
            "explanation": "Manufacturer address is properly declared with valid PIN code."
        }

    def check_customer_care(self, entities: Dict[str, Any]) -> Dict[str, Any]:
        """Rule 6(1)(f): Customer care phone AND email"""
        phone = entities.get("customer_care_phone")
        email = entities.get("customer_care_email")

        if not phone and not email:
            return {
                "rule_code": "RULE_6_CUSTOMER_CARE",
                "rule_name": "Customer Care Contact",
                "clause_reference": "Rule 6(1)(f)",
                "passed": False,
                "severity": ViolationSeverityEnum.HIGH,
                "expected": "Customer care phone number and/or email address",
                "actual": "Not found",
                "explanation": "Customer care contact details are missing. Rule 6(1)(f) requires phone or email for consumer grievances."
            }

        if not phone or not email:
            return {
                "rule_code": "RULE_6_CUSTOMER_CARE",
                "rule_name": "Customer Care Contact",
                "clause_reference": "Rule 6(1)(f)",
                "passed": False,
                "severity": ViolationSeverityEnum.MEDIUM,
                "expected": "Both phone AND email",
                "actual": f"Phone: {phone or 'Missing'}, Email: {email or 'Missing'}",
                "explanation": "Only partial customer care details provided. Best practice is to include both phone and email."
            }

        return {
            "rule_code": "RULE_6_CUSTOMER_CARE",
            "rule_name": "Customer Care Contact",
            "clause_reference": "Rule 6(1)(f)",
            "passed": True,
            "severity": ViolationSeverityEnum.LOW,
            "expected": "Phone and email declared",
            "actual": f"Phone: {phone}, Email: {email}",
            "explanation": "Customer care contact details are properly declared."
        }

    def check_country_of_origin(self, entities: Dict[str, Any]) -> Dict[str, Any]:
        """Rule 6(1)(g): Country of origin/manufacture"""
        country = entities.get("country_of_origin")

        if not country or len(country.strip()) < 2:
            return {
                "rule_code": "RULE_7_COUNTRY_ORIGIN",
                "rule_name": "Country of Origin",
                "clause_reference": "Rule 6(1)(g)",
                "passed": False,
                "severity": ViolationSeverityEnum.HIGH,
                "expected": "Country of origin (e.g., 'India', 'China', 'USA')",
                "actual": "Not found",
                "explanation": "Country of origin is missing. Rule 6(1)(g) mandates declaration of manufacturing country."
            }

        return {
            "rule_code": "RULE_7_COUNTRY_ORIGIN",
            "rule_name": "Country of Origin",
            "clause_reference": "Rule 6(1)(g)",
            "passed": True,
            "severity": ViolationSeverityEnum.LOW,
            "expected": "Country declared",
            "actual": country[:50],
            "explanation": "Country of origin is properly declared."
        }

    def check_unit_sale_price(self, entities: Dict[str, Any]) -> Dict[str, Any]:
        """Rule 6(1)(h): Unit sale price (for multi-unit packages)"""
        unit_price = entities.get("unit_sale_price")

        # Unit sale price is mandatory for multi-piece packages
        # For demo purposes, we'll mark it as LOW severity if missing
        if not unit_price:
            return {
                "rule_code": "RULE_8_UNIT_PRICE",
                "rule_name": "Unit Sale Price",
                "clause_reference": "Rule 6(1)(h)",
                "passed": False,
                "severity": ViolationSeverityEnum.MEDIUM,
                "expected": "Price per unit (e.g., '₹10 per 100g', '₹0.50 per piece')",
                "actual": "Not found",
                "explanation": "Unit sale price is missing. Required for multi-piece packages per Rule 6(1)(h)."
            }

        return {
            "rule_code": "RULE_8_UNIT_PRICE",
            "rule_name": "Unit Sale Price",
            "clause_reference": "Rule 6(1)(h)",
            "passed": True,
            "severity": ViolationSeverityEnum.LOW,
            "expected": "Unit price declared",
            "actual": unit_price[:50],
            "explanation": "Unit sale price is properly declared."
        }

    def check_expiry_date(self, entities: Dict[str, Any]) -> Dict[str, Any]:
        """Rule 6(1)(i): Best before / Use by / Expiry date"""
        expiry = entities.get("expiry_date")

        if not expiry:
            return {
                "rule_code": "RULE_9_EXPIRY_DATE",
                "rule_name": "Best Before/Expiry Date",
                "clause_reference": "Rule 6(1)(i)",
                "passed": False,
                "severity": ViolationSeverityEnum.CRITICAL,
                "expected": "Best before / Use by / Expiry date (month and year)",
                "actual": "Not found",
                "explanation": "Expiry or 'Best Before' date is missing. Rule 6(1)(i) mandates this for perishable goods."
            }

        return {
            "rule_code": "RULE_9_EXPIRY_DATE",
            "rule_name": "Best Before/Expiry Date",
            "clause_reference": "Rule 6(1)(i)",
            "passed": True,
            "severity": ViolationSeverityEnum.LOW,
            "expected": "Expiry date declared",
            "actual": expiry[:50],
            "explanation": "Expiry/Best Before date is properly declared."
        }


# Singleton instance
compliance_engine = ComplianceEngine()
