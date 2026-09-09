"""
LLM-powered entity extraction from OCR text using Groq API (LLaMA 3.1 70B)
Extracts 9 mandatory declarations under Legal Metrology (Packaged Commodities) Rules, 2011
"""
import json
import logging
from typing import Dict, Optional, Any
from groq import Groq
from app.config import settings

logger = logging.getLogger(__name__)


# Structured extraction prompt for Legal Metrology compliance
EXTRACTION_PROMPT_TEMPLATE = """You are a Legal Metrology compliance AI assistant. Your task is to extract the 9 MANDATORY declarations from packaged commodity labels as per Legal Metrology (Packaged Commodities) Rules, 2011, Rule 6.

**Extract the following fields from the OCR text below:**

1. **product_name** - Common or generic name of the commodity (NOT brand name)
2. **net_quantity** - Net quantity with unit (e.g., "500 g", "1 L", "250 ml")
3. **mrp** - Maximum Retail Price in rupees (e.g., "₹50.00", "Rs. 145")
4. **mrp_taxes_inclusive** - Boolean: Does the label explicitly say "inclusive of all taxes" or similar phrase near MRP?
5. **mfg_date** - Manufacturing or packing date (format: MM/YYYY or DD/MM/YYYY)
6. **manufacturer_address** - Complete address of manufacturer/packer with locality and state
7. **manufacturer_pin** - 6-digit PIN code extracted from the address
8. **customer_care_phone** - Customer care phone number (10-digit or toll-free)
9. **customer_care_email** - Customer care email address
10. **country_of_origin** - Country where the product was manufactured (e.g., "India", "China", "USA")
11. **unit_sale_price** - Price per unit (e.g., "₹0.10 per gram", "₹1.45 per 10ml")
12. **expiry_date** - Best before / use by / expiry date (format: MM/YYYY or DD/MM/YYYY)

**IMPORTANT RULES:**
- Return ONLY valid JSON with these exact keys
- Use `null` for any field not found in the text
- For boolean `mrp_taxes_inclusive`, return `true` only if the phrase "inclusive of all taxes" or equivalent is present
- Extract dates in the format found (preserve MM/YYYY or DD/MM/YYYY)
- Extract complete address including PIN code
- Do NOT infer or fabricate information not present in the text
- If multiple values exist for a field, extract the most prominent one

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
            self.client = Groq(api_key=self.api_key, timeout=5.0, max_retries=0)
            logger.info(f"Groq client initialized with model: {self.model}")
        except Exception as e:
            logger.error(f"Failed to initialize Groq client: {e}")
            self.client = None

    def extract_entities(self, raw_ocr_text: str) -> Dict[str, Any]:
        """
        Extract structured entities from OCR text using Groq LLM

        Args:
            raw_ocr_text: Raw text extracted from packaging label via OCR

        Returns:
            Dict with 12 extracted fields (9 mandatory + 3 derived)

        Raises:
            Exception: If API call fails or response is invalid
        """
        if not self.client:
            logger.warning("Groq client not available. Using fallback extraction.")
            return self._fallback_extraction(raw_ocr_text)

        if not raw_ocr_text or len(raw_ocr_text.strip()) < 10:
            logger.warning("OCR text too short for extraction")
            return self._empty_entities()

        try:
            # Build prompt
            prompt = EXTRACTION_PROMPT_TEMPLATE.format(raw_ocr_text=raw_ocr_text)

            # Call Groq API with JSON mode
            response = self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {
                        "role": "system",
                        "content": "You are a Legal Metrology compliance expert. Extract packaging label information accurately and return ONLY valid JSON."
                    },
                    {
                        "role": "user",
                        "content": prompt
                    }
                ],
                temperature=0.1,  # Low temperature for factual extraction
                max_tokens=1024,
                response_format={"type": "json_object"}
            )

            # Parse response
            content = response.choices[0].message.content
            entities = json.loads(content)

            # Validate and fill missing keys
            entities = self._validate_entities(entities, raw_ocr_text)

            logger.info(f"Successfully extracted {sum(1 for v in entities.values() if v)} entities")
            return entities

        except json.JSONDecodeError as e:
            logger.error(f"Invalid JSON from LLM: {e}")
            return self._fallback_extraction(raw_ocr_text)
        except Exception as e:
            logger.error(f"LLM extraction failed: {e}")
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
            validated[key] = entities.get(key)

        # Add raw text for reference
        validated["raw_text"] = raw_text[:2000]  # First 2000 chars

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
        Simple regex-based fallback extraction for demo/testing
        Used when Groq API is unavailable
        """
        import re

        entities = self._empty_entities()
        entities["raw_text"] = raw_text[:2000]

        # Simple pattern matching (not comprehensive)
        # Product name - typically first all-caps line
        product_match = re.search(r'^([A-Z\s]{10,})', raw_text, re.MULTILINE)
        if product_match:
            entities["product_name"] = product_match.group(1).strip()

        # Net quantity
        qty_match = re.search(r'Net\s+Quantity[:\s]+([0-9.]+\s*[a-zA-Z]+)', raw_text, re.IGNORECASE)
        if qty_match:
            entities["net_quantity"] = qty_match.group(1).strip()

        # MRP
        mrp_match = re.search(r'MRP[:\s]+Rs?\.?\s*([0-9.,]+)', raw_text, re.IGNORECASE)
        if mrp_match:
            entities["mrp"] = f"₹{mrp_match.group(1)}"

        # Taxes inclusive check
        if re.search(r'inclusive\s+of\s+all\s+taxes', raw_text, re.IGNORECASE):
            entities["mrp_taxes_inclusive"] = True

        # Manufacturing date
        mfg_match = re.search(r'Mfg\.?\s*Date[:\s]+([0-9]{2}/[0-9]{4})', raw_text, re.IGNORECASE)
        if mfg_match:
            entities["mfg_date"] = mfg_match.group(1)

        # PIN code (6 digits)
        pin_match = re.search(r'\b([0-9]{6})\b', raw_text)
        if pin_match:
            entities["manufacturer_pin"] = pin_match.group(1)

        # Phone (10 digits or 1800)
        phone_match = re.search(r'1800[- ]?[0-9]{3}[- ]?[0-9]{4}', raw_text)
        if phone_match:
            entities["customer_care_phone"] = phone_match.group(0)

        # Email
        email_match = re.search(r'[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}', raw_text)
        if email_match:
            entities["customer_care_email"] = email_match.group(0)

        # Country
        if re.search(r'\bIndia\b', raw_text, re.IGNORECASE):
            entities["country_of_origin"] = "India"

        logger.info("Used fallback regex-based extraction")
        return entities


# Singleton instance
llm_extractor = LLMExtractor()
