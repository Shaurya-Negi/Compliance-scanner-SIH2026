"""
LLM-powered entity extraction from OCR text using Groq API
Extracts 9 mandatory declarations under Legal Metrology (Packaged Commodities) Rules, 2011
"""
import json
import logging
import re
from typing import Dict, Optional, Any
from groq import Groq
from app.config import settings

logger = logging.getLogger(__name__)


# Structured extraction prompt for Legal Metrology compliance
EXTRACTION_PROMPT_TEMPLATE = """You are a Legal Metrology compliance AI expert for Indian FMCG Packaged Commodities (Rules, 2011).
Your task is to accurately extract the mandatory declarations from packaging label OCR text.

**Extract the following fields from the OCR text:**
1. **product_name** - Generic/common name of commodity (e.g., "Cake", "Biscuits", "Soap", "Atta", "Detergent", "Sugar"). If ingredients are shown, identify the main product/commodity.
2. **net_quantity** - Net weight or volume with unit (e.g., "400g", "500 g", "1 kg", "250 ml"). Look for "NET WT", "NET QUANTITY", "NET QTY".
3. **mrp** - Maximum Retail Price (e.g., "₹125.00", "Rs. 125", "125.00").
4. **mrp_taxes_inclusive** - Boolean (true/false): Does the label indicate taxes are included (e.g. "inclusive of all taxes", "incl. of all taxes", "(incl.", or OCR variations like "(hc cslaes", "incl taxes")?
5. **mfg_date** - Date of manufacture or packing in DD/MM/YYYY or MM/YYYY format (e.g., convert "02 May 2026" -> "02/05/2026"). Look for "PACKED ON", "PKD", "MFG", "MANUFACTURED".
6. **manufacturer_address** - Full manufacturer/packer address with city and state.
7. **manufacturer_pin** - 6-digit Indian postal PIN code extracted from address.
8. **customer_care_phone** - Customer helpline or toll-free phone number (e.g. 1800-XXX-XXXX or 10-digit).
9. **customer_care_email** - Customer support email address.
10. **country_of_origin** - Country where produced/packed (e.g. "India").
11. **unit_sale_price** - Price per unit weight/measure (e.g., "₹0.31 per gm", "0.31 Per gm", "₹1.50 per 10g"). Look for "UNIT SALE PRICE", "INTSALEPRICE", "USP".
12. **expiry_date** - Expiry date or Best Before (e.g., convert "03 October 2026" -> "03/10/2026"). Look for "USE BY", "BEST BEFORE", "EXP".

**CRITICAL RULES:**
- Return ONLY a valid JSON object with these exact 12 keys.
- If a field is not present in the text, set its value to null.
- Handle noisy OCR text, missing colons, line breaks, or OCR artifacts gracefully.
- Do NOT hallucinate data that is completely absent.

**OCR Text:**
{raw_ocr_text}

**Output JSON:**
"""


class LLMExtractor:
    """
    Groq API wrapper for structured entity extraction from packaging OCR text
    """

    def __init__(self, api_key: Optional[str] = None, model: Optional[str] = None):
        self.api_key = api_key or settings.GROQ_API_KEY
        self.model = model or settings.GROQ_MODEL
        self.client = None
        self._init_client()

    def _init_client(self):
        """Initialize Groq client with timeout"""
        try:
            if not self.api_key or "placeholder" in self.api_key.lower() or not self.api_key.startswith("gsk_"):
                logger.info("No valid Groq API key configured. Using regex-based fallback extractor.")
                self.client = None
                return
            self.client = Groq(api_key=self.api_key, timeout=6.0, max_retries=1)
            logger.info(f"Groq client initialized with model: {self.model}")
        except Exception as e:
            logger.error(f"Failed to initialize Groq client: {e}")
            self.client = None

    def extract_entities(self, raw_ocr_text: str) -> Dict[str, Any]:
        """
        Extract structured entities from OCR text using Groq LLM with fallback
        """
        if not raw_ocr_text or len(raw_ocr_text.strip()) < 5:
            logger.warning("OCR text too short for extraction")
            return self._empty_entities()

        if not self.client:
            logger.warning("Groq client not available. Using regex fallback extraction.")
            return self._fallback_extraction(raw_ocr_text)

        try:
            prompt = EXTRACTION_PROMPT_TEMPLATE.format(raw_ocr_text=raw_ocr_text)

            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a Legal Metrology compliance AI expert. Extract packaging label information accurately and return ONLY valid JSON."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.1,
                max_tokens=600,
                response_format={"type": "json_object"}
            )

            content = response.choices[0].message.content
            entities = json.loads(content)
            entities = self._validate_entities(entities, raw_ocr_text)

            logger.info(f"Successfully extracted entities: {sum(1 for v in entities.values() if v)} fields populated")
            return entities

        except Exception as e:
            logger.warning(f"Groq LLM extraction error: {e}. Switching to Regex Fallback.")
            return self._fallback_extraction(raw_ocr_text)

    def _validate_entities(self, entities: Dict[str, Any], raw_text: str) -> Dict[str, Any]:
        """Ensure all required keys exist and add raw_text"""
        required_keys = [
            "product_name", "net_quantity", "mrp", "mrp_taxes_inclusive",
            "mfg_date", "manufacturer_address", "manufacturer_pin",
            "customer_care_phone", "customer_care_email",
            "country_of_origin", "unit_sale_price", "expiry_date"
        ]

        validated = {}
        for key in required_keys:
            val = entities.get(key)
            if val is not None and str(val).lower() in ["null", "none", "n/a", ""]:
                val = None
            validated[key] = val

        # Secondary normalization for Indian currency
        if validated.get("mrp") and not str(validated["mrp"]).startswith("₹") and not str(validated["mrp"]).startswith("Rs"):
            # Format clean MRP
            m_clean = re.sub(r'[^\d.]', '', str(validated["mrp"]))
            if m_clean:
                validated["mrp"] = f"₹{m_clean}"

        # Ensure PIN code extraction from manufacturer address or raw text
        if not validated.get("manufacturer_pin"):
            if validated.get("manufacturer_address"):
                pin_m = re.search(r'\b([1-9][0-9]{5})\b', str(validated["manufacturer_address"]))
                if pin_m:
                    validated["manufacturer_pin"] = pin_m.group(1)
            if not validated.get("manufacturer_pin"):
                pin_m = re.search(r'\b([1-9][0-9]{5})\b', raw_text)
                if pin_m:
                    validated["manufacturer_pin"] = pin_m.group(1)

        validated["raw_text"] = raw_text[:2500]
        return validated

    def _empty_entities(self) -> Dict[str, Any]:
        """Return empty entity structure"""
        return {
            "product_name": None,
            "net_quantity": None,
            "mrp": None,
            "mrp_taxes_inclusive": None,
            "mfg_date": None,
            "manufacturer_address": None,
            "manufacturer_pin": None,
            "customer_care_phone": None,
            "customer_care_email": None,
            "country_of_origin": None,
            "unit_sale_price": None,
            "expiry_date": None,
            "raw_text": ""
        }

    def _fallback_extraction(self, raw_text: str) -> Dict[str, Any]:
        """
        High-precision regex-based fallback extraction for offline / rate-limited environments.
        Accurately extracts all 9 Legal Metrology Rule 6 declaration fields from real packaging stickers.
        """
        entities = self._empty_entities()
        entities["raw_text"] = raw_text[:2500]

        # 1. Net Quantity (e.g. NET WT. 400g, Net Qty: 500g, 1 kg)
        qty_match = re.search(r'(?:NET\s*WT\.?|NET\s*WEIGHT|Net\s+Quantity|Net\s+Qty)[:\s.]*([0-9.]+\s*(?:g|gm|gms|kg|ml|l|ltr|pieces|units|tablets)\b(?:\s*\([0-9.]+\s*[a-zA-Z]+\))?)', raw_text, re.IGNORECASE)
        if not qty_match:
            # Standalone weight e.g. 400g on next line
            qty_match = re.search(r'\b([0-9]{1,4}\s*(?:g|gm|gms|kg|ml|l|ltr))\b', raw_text, re.IGNORECASE)
        if qty_match:
            entities["net_quantity"] = qty_match.group(1).strip()

        # 2. MRP (e.g. MRP.: 125.00, MRP: ₹50, Rs. 145)
        mrp_match = re.search(r'(?:MAXIMUM\s+RETAIL\s+PRICE|MRP|M\.R\.P\.?)[:\s.：]*(?:Rs?\.?|₹)?\s*([0-9]{1,5}(?:\.[0-9]{2})?)', raw_text, re.IGNORECASE)
        if mrp_match:
            entities["mrp"] = f"₹{mrp_match.group(1)}"

        # 3. Taxes inclusive check (handles OCR artifacts like "(hc cslaes", "incl. of all taxes", etc.)
        if re.search(r'inclusive\s+of\s+all\s+taxes|incl\.?\s*of\s*all\s*taxes|incl\.?\s*taxes|\(hc\s+cslaes|\(incl', raw_text, re.IGNORECASE):
            entities["mrp_taxes_inclusive"] = True
        elif mrp_match and not re.search(r'inclusive|incl', raw_text, re.IGNORECASE):
            entities["mrp_taxes_inclusive"] = False

        # 4. Manufacturing / Packing Date (e.g. PACKED ON: 02 May 2026, Mfg Date: 03/2026)
        mfg_match = re.search(r'(?:PACKED\s*ON|PKD\s*ON|Mfg\.?\s*(?:&|and)?\s*Pkg\.?\s*Date|Mfg\.?\s*Date|Manufactured|Pkg\.?\s*Date)[:\s.]*([0-9]{1,2}\s*[A-Za-z]{3,9}\s*[0-9]{2,4}|[0-9]{1,2}/[0-9]{2,4}|[A-Za-z]{3,9}\s+[0-9]{4})', raw_text, re.IGNORECASE)
        if mfg_match:
            entities["mfg_date"] = mfg_match.group(1).strip()

        # 5. Expiry / Best Before / Use By (e.g. USE BY 03 October 2026, Best Before: 09/2026)
        exp_match = re.search(r'(?:USE\s*BY|BEST\s+BEFORE(?:\s*/\s*EXPIRY)?|EXPIRY(?:\s*DATE)?|EXP\.?\s*DATE)[:\s.]*([0-9]{1,2}\s*[A-Za-z]{3,9}\s*[0-9]{2,4}|[0-9]{1,2}/[0-9]{2,4}|[A-Za-z]{3,9}\s+[0-9]{4}|[^\n\r]+)', raw_text, re.IGNORECASE)
        if exp_match:
            entities["expiry_date"] = exp_match.group(1).strip()

        # 6. Unit Sale Price (e.g. INTSALEPRICE: 0.31Per gm, USP: ₹0.10/g)
        usp_match = re.search(r'(?:UNIT\s+SALE\s+PRICE|INTSALEPRICE|UNIT\s*SALE\s*PRICE|USP)[:\s.]*([^\n\r]+)', raw_text, re.IGNORECASE)
        if usp_match:
            usp_val = usp_match.group(1).strip()
            if not usp_val.startswith("₹") and not usp_val.startswith("Rs"):
                usp_val = f"₹{usp_val}"
            entities["unit_sale_price"] = usp_val

        # 7. Product name
        pname_match = re.search(r'(?:PRODUCT\s+NAME|COMMODITY|ITEM)[:\s]+([^\n\r]+)', raw_text, re.IGNORECASE)
        if pname_match:
            entities["product_name"] = pname_match.group(1).strip()
        else:
            for line in raw_text.splitlines():
                clean_l = line.strip()
                if (clean_l and len(clean_l) > 3
                    and not re.search(r'SURFACE|PHOTO|---|===|NET|MRP|BATCH|EXP|USE|PACKED|PKD|MFG|DATE|PRICE|RS\.|₹|BARCODE', clean_l, re.I)):
                    entities["product_name"] = clean_l
                    break

        # 8. Manufacturer Address & PIN
        mfg_addr_match = re.search(r'(?:MANUFACTURER\s*(?:&|\s*AND\s*)?\s*PACKER|MANUFACTURED\s+BY|PACKED\s+BY|MANUFACTURER)[:\s]+([^\n\r]+)', raw_text, re.IGNORECASE)
        if mfg_addr_match:
            entities["manufacturer_address"] = mfg_addr_match.group(1).strip()

        pin_match = re.search(r'(?:PIN(?:\s*CODE)?[:\s]+|\b)([1-9][0-9]{5})\b', raw_text)
        if pin_match:
            entities["manufacturer_pin"] = pin_match.group(1)

        # 9. Customer Care (Phone & Email)
        care_line_match = re.search(r'\b(?:CUSTOMER\s+CARE|CONSUMER\s+CARE|CUSTOMER\s+HELPLINE|HELPLINE|TOLL\s*FREE)[ \t]*[:\-][ \t]*([^\n\r]+)', raw_text, re.IGNORECASE)
        care_text = care_line_match.group(1) if care_line_match else raw_text

        phone_match = re.search(r'(?:1800[- ]?[0-9]{3}[- ]?[0-9]{3,4}|\+?91[- ]?[0-9]{10}|(?<!\d)[6-9][0-9]{9}(?!\d))', care_text)
        if phone_match:
            entities["customer_care_phone"] = phone_match.group(0)

        email_match = re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', care_text)
        if email_match:
            entities["customer_care_email"] = email_match.group(0)

        # 10. Country of origin
        if re.search(r'\bIndia\b', raw_text, re.IGNORECASE):
            entities["country_of_origin"] = "India"

        logger.info("Regex fallback extraction completed")
        return entities


# Singleton instance
llm_extractor = LLMExtractor()
