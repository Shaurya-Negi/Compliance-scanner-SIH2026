"""
SIH2026 Advanced Barcode Detection & Product Grabbing Engine
Integrates high-performance zxing-cpp + pyzbar + OpenCV CV + GS1/OpenFoodFacts Database Lookup.
Extracts exact product identity, brand, net quantity, and manufacturer from packaging.
"""
import os
import re
import cv2
import numpy as np
import requests
import logging
from typing import Optional, Dict, Any, List, Tuple
from app.fmcg_database import lookup_barcode, normalize_ean13

logger = logging.getLogger(__name__)

# Try importing zxing-cpp (fastest, most accurate C++ engine)
try:
    import zxingcpp
    HAS_ZXING = True
except ImportError:
    HAS_ZXING = False
    logger.warning("zxing-cpp not installed. Falling back to pyzbar / OpenCV.")

# Try importing pyzbar
try:
    from pyzbar import pyzbar
    HAS_PYZBAR = True
except ImportError:
    HAS_PYZBAR = False

class BarcodeScannerEngine:
    """
    Multi-Engine Computer Vision Barcode & QR Code Detection and Resolution Engine.
    Combines C++ ZXing, PyZbar, OpenCV, and GS1 India database.
    """

    def __init__(self):
        self.barcode_detector = None
        try:
            if hasattr(cv2, 'barcode') and hasattr(cv2.barcode, 'BarcodeDetector'):
                self.barcode_detector = cv2.barcode.BarcodeDetector()
        except Exception as e:
            logger.debug(f"cv2.barcode.BarcodeDetector init exception: {e}")

        self.qr_detector = cv2.QRCodeDetector()
        self.http_session = requests.Session()
        self.http_session.headers.update({
            'User-Agent': 'SIH2026-ComplianceScanner/2.0 (Legal Metrology AI gov.in; dev@sih2026)'
        })

    def preprocess_image_variants(self, img: np.ndarray) -> List[np.ndarray]:
        """
        Generate enhanced image variants (Original, Grayscale, CLAHE, Sharpen, Rotations)
        to maximize barcode detection under glare, blur, or angles.
        """
        variants = [img]

        # 1. Grayscale
        if len(img.shape) == 3:
            gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        else:
            gray = img.copy()
        variants.append(gray)

        # 2. Contrast Limited Adaptive Histogram Equalization (CLAHE)
        try:
            clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8, 8))
            clahe_img = clahe.apply(gray)
            variants.append(clahe_img)
        except Exception:
            pass

        # 3. Sharpened Image
        kernel = np.array([[0, -1, 0], [-1, 5, -1], [0, -1, 0]])
        sharpened = cv2.filter2D(gray, -1, kernel)
        variants.append(sharpened)

        # 4. Otsu Thresholding
        _, otsu = cv2.threshold(gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
        variants.append(otsu)

        # 5. Rotations (90, 180, 270 degrees) for pyzbar / OpenCV
        variants.append(cv2.rotate(img, cv2.ROTATE_90_CLOCKWISE))
        variants.append(cv2.rotate(img, cv2.ROTATE_180))
        variants.append(cv2.rotate(img, cv2.ROTATE_90_COUNTERCLOCKWISE))

        return variants

    def detect_and_decode(self, image_input: Any, ocr_text: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Detect all barcodes/QR codes from an image path or numpy array.
        Returns list of decoded barcodes with bounding info and type.
        """
        if isinstance(image_input, str):
            if not os.path.exists(image_input):
                logger.error(f"Image path not found: {image_input}")
                return []
            img = cv2.imread(image_input)
            if img is None:
                return []
        elif isinstance(image_input, np.ndarray):
            img = image_input
        elif isinstance(image_input, (bytes, bytearray)):
            nparr = np.frombuffer(image_input, np.uint8)
            img = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
            if img is None:
                return []
        else:
            return []

        results = []
        seen_codes = set()

        # Engine 1: zxing-cpp (Omnidirectional, multi-scale C++ scanner)
        if HAS_ZXING:
            try:
                # zxingcpp reads directly from numpy arrays or PIL images
                zxing_results = zxingcpp.read_barcodes(
                    img,
                    try_rotate=True,
                    try_downscale=True,
                    try_invert=True
                )
                for item in zxing_results:
                    code_str = str(item.text).strip()
                    if code_str and code_str not in seen_codes:
                        seen_codes.add(code_str)
                        results.append({
                            "barcode": code_str,
                            "type": str(item.format).replace("BarcodeFormat.", ""),
                            "source": "zxing-cpp"
                        })
            except Exception as e:
                logger.debug(f"zxingcpp detection error: {e}")

        # Engine 2: pyzbar (ZBar barcode reader with multi-variant fallback)
        if HAS_PYZBAR and not results:
            try:
                pyzbar_results = pyzbar.decode(img)
                for item in pyzbar_results:
                    code_str = item.data.decode('utf-8', errors='ignore').strip()
                    if code_str and code_str not in seen_codes:
                        seen_codes.add(code_str)
                        results.append({
                            "barcode": code_str,
                            "type": str(item.type),
                            "source": "pyzbar"
                        })
            except Exception as e:
                logger.debug(f"pyzbar detection error: {e}")

            # If not detected on raw image, test against preprocessed variants & rotations
            if not results:
                variants = self.preprocess_image_variants(img)
                for var in variants:
                    try:
                        pyzbar_results = pyzbar.decode(var)
                        for item in pyzbar_results:
                            code_str = item.data.decode('utf-8', errors='ignore').strip()
                            if code_str and code_str not in seen_codes:
                                seen_codes.add(code_str)
                                results.append({
                                    "barcode": code_str,
                                    "type": str(item.type),
                                    "source": "pyzbar_enhanced"
                                })
                        if results:
                            break
                    except Exception as e:
                        logger.debug(f"pyzbar variant detection error: {e}")

        # Engine 3: OpenCV BarcodeDetector & QRCodeDetector across image variants
        if not results:
            variants = self.preprocess_image_variants(img)
            for var in variants:
                if self.barcode_detector is not None:
                    try:
                        retval, decoded_info, decoded_type, points = self.barcode_detector.detectAndDecodeMulti(var)
                        if retval and decoded_info:
                            for idx, code in enumerate(decoded_info):
                                code_str = str(code).strip()
                                if code_str and code_str not in seen_codes:
                                    seen_codes.add(code_str)
                                    btype = decoded_type[idx] if decoded_type is not None and idx < len(decoded_type) else "EAN_13"
                                    results.append({
                                        "barcode": code_str,
                                        "type": str(btype),
                                        "source": "OpenCV_BarcodeDetector"
                                    })
                    except Exception as e:
                        logger.debug(f"OpenCV BarcodeDetector error: {e}")

                try:
                    retval, decoded_info, points, _ = self.qr_detector.detectAndDecodeMulti(var)
                    if retval and decoded_info:
                        for code in decoded_info:
                            code_str = str(code).strip()
                            if code_str and code_str not in seen_codes:
                                seen_codes.add(code_str)
                                results.append({
                                    "barcode": code_str,
                                    "type": "QR_CODE",
                                    "source": "OpenCV_QRCodeDetector"
                                })
                except Exception as e:
                    logger.debug(f"OpenCV QRCodeDetector error: {e}")

                if results:
                    break

        # Engine 4: OCR Fallback for 13-digit Indian EAN Barcode printed digits (890XXXXXXXXXX)
        if not results:
            text_to_search = ocr_text
            if not text_to_search and img is not None:
                try:
                    from app.ocr_engine import ocr_engine
                    extracted = ocr_engine.extract_text(img)
                    if extracted and extracted.get("text"):
                        text_to_search = extracted["text"]
                except Exception as e:
                    logger.debug(f"OCR engine digit extraction error: {e}")

            if text_to_search:
                ean_matches = re.findall(r'\b(890\d{9,10})\b', text_to_search)
                if not ean_matches:
                    ean_matches = re.findall(r'\b(\d{13})\b', text_to_search)
                for match in ean_matches:
                    clean_match = match.strip()
                    if clean_match not in seen_codes:
                        seen_codes.add(clean_match)
                        results.append({
                            "barcode": clean_match,
                            "type": "EAN_13",
                            "source": "OCR_Text_Digit_Extractor"
                        })

        return results

    def query_online_openfoodfacts(self, barcode: str) -> Optional[Dict[str, Any]]:
        """
        Query Open Food Facts Global & Indian Database for authentic product packaging details.
        Targets API v3 with User-Agent and fallback to v0.
        """
        clean_code = str(barcode).strip().replace("-", "").replace(" ", "")
        if not clean_code.isdigit():
            return None

        # Try Open Food Facts API v3
        try:
            url = f"https://world.openfoodfacts.org/api/v3/product/{clean_code}"
            headers = {
                "User-Agent": "SIH2026-ComplianceScanner/2.0 (Legal Metrology AI gov.in; dev@sih2026)"
            }
            response = self.http_session.get(url, headers=headers, timeout=4)
            if response.status_code == 200:
                data = response.json()
                product = data.get("product", {})
                if product:
                    p_name = (
                        product.get("product_name") or
                        product.get("product_name_en") or
                        product.get("generic_name") or
                        product.get("brands") or
                        "Unknown Product"
                    )
                    brand = product.get("brands") or product.get("brand_owner") or "Unknown"
                    net_qty = product.get("quantity") or product.get("net_weight_unit") or ""
                    categories = product.get("categories") or "Packaged Commodity"
                    countries = product.get("countries") or product.get("country_of_origin") or "India"
                    manufacturer = (
                        product.get("manufacturing_places") or
                        product.get("brand_owner") or
                        product.get("creator") or
                        ""
                    )

                    return {
                        "barcode": clean_code,
                        "product_name": p_name.strip(),
                        "brand": brand.strip(),
                        "net_quantity": net_qty.strip(),
                        "quantity": net_qty.strip(),
                        "category": categories.split(",")[0].strip() if categories else "Packaged Commodity",
                        "categories": categories.strip(),
                        "countries": countries.strip(),
                        "manufacturer": manufacturer.strip(),
                        "source": "Open Food Facts API v3",
                        "is_indian_gs1": clean_code.startswith("890")
                    }
        except Exception as e:
            logger.debug(f"OpenFoodFacts API v3 query failed for {clean_code}: {e}")

        # Fallback to Open Food Facts API v0
        try:
            url = f"https://world.openfoodfacts.org/api/v0/product/{clean_code}.json"
            response = self.http_session.get(url, timeout=3)
            if response.status_code == 200:
                data = response.json()
                if data.get("status") == 1:
                    product = data.get("product", {})
                    p_name = (
                        product.get("product_name") or
                        product.get("product_name_en") or
                        product.get("generic_name") or
                        product.get("brands") or
                        "Unknown Product"
                    )
                    brand = product.get("brands") or product.get("brand_owner") or "Unknown"
                    net_qty = product.get("quantity") or product.get("net_weight_unit") or ""
                    categories = product.get("categories") or "Packaged Commodity"
                    countries = product.get("countries") or "India"
                    manufacturer = (
                        product.get("manufacturing_places") or
                        product.get("brand_owner") or
                        product.get("creator") or
                        ""
                    )

                    return {
                        "barcode": clean_code,
                        "product_name": p_name.strip(),
                        "brand": brand.strip(),
                        "net_quantity": net_qty.strip(),
                        "quantity": net_qty.strip(),
                        "category": categories.split(",")[0].strip() if categories else "Packaged Commodity",
                        "categories": categories.strip(),
                        "countries": countries.strip(),
                        "manufacturer": manufacturer.strip(),
                        "source": "Open Food Facts API",
                        "is_indian_gs1": clean_code.startswith("890")
                    }
        except Exception as e:
            logger.debug(f"OpenFoodFacts v0 API query failed for {clean_code}: {e}")

        return None

    def scan_and_resolve_product(self, image_input: Any, ocr_text: Optional[str] = None) -> Dict[str, Any]:
        """
        Master Pipeline:
        1. Extract barcodes from the image using zxing-cpp + pyzbar + OpenCV + OCR digits.
        2. Resolve barcode metadata against local FMCG GS1 database.
        3. If not in local DB, query online OpenFoodFacts API.
        4. Return unified verified product identity.
        """
        detected_barcodes = self.detect_and_decode(image_input, ocr_text=ocr_text)

        if not detected_barcodes:
            return {
                "success": False,
                "message": "No barcode detected in packaging image",
                "product_info": None
            }

        resolved_products = []

        for item in detected_barcodes:
            code = item["barcode"]

            # Step A: Local GS1 India Database Lookup
            product_data = lookup_barcode(code)

            # Step B: Online Open Food Facts DB Lookup
            if not product_data or "Generic" in product_data.get("product_name", ""):
                online_data = self.query_online_openfoodfacts(code)
                if online_data:
                    product_data = online_data

            if product_data:
                product_data["detected_type"] = item.get("type", "EAN_13")
                product_data["decoder_engine"] = item.get("source", "CV_Engine")
                resolved_products.append(product_data)
            else:
                resolved_products.append({
                    "barcode": code,
                    "product_name": f"Packaged Commodity (Barcode: {code})",
                    "brand": "Verified GS1 Item" if code.startswith("890") else "Packaged Item",
                    "detected_type": item.get("type", "UNKNOWN"),
                    "decoder_engine": item.get("source", "CV_Engine"),
                    "source": "Raw_Barcode_Decoded",
                    "is_indian_gs1": code.startswith("890")
                })

        # Return primary product
        primary = resolved_products[0]
        return {
            "success": True,
            "primary_product": primary,
            "all_detected": resolved_products,
            "barcode_count": len(resolved_products)
        }


# Global singleton instance
barcode_scanner = BarcodeScannerEngine()
barcode_engine = barcode_scanner

