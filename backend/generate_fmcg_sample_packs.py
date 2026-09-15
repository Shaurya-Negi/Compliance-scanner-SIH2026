"""
SIH2026 High-Fidelity FMCG Packaging Sample Generator
Generates realistic packaging labels with authentic, scannable EAN-13 barcodes using python-barcode.
Saves to backend/samples/ and frontend/public/samples/
"""
import os
import io
import barcode
from barcode.writer import ImageWriter
from PIL import Image, ImageDraw, ImageFont

BACKEND_SAMPLES = os.path.abspath(os.path.join(os.path.dirname(__file__), "samples"))
FRONTEND_SAMPLES = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend", "public", "samples"))

os.makedirs(BACKEND_SAMPLES, exist_ok=True)
os.makedirs(FRONTEND_SAMPLES, exist_ok=True)

SAMPLE_PRODUCTS = [
    {
        "filename": "parleg_pack.png",
        "ean_12": "890171910101", # Parle-G EAN-13 (8901719101014)
        "title": "PARLE-G GLUCO BISCUITS",
        "brand": "PARLE PRODUCTS",
        "category": "Biscuits & Bakery",
        "bg_color": (250, 240, 200),
        "primary_color": (180, 80, 10),
        "accent_color": (220, 120, 20),
        "declarations": [
            ("COMMODITY", "Biscuits (Gluco Biscuits)"),
            ("NET QUANTITY", "800 g"),
            ("MRP (Incl. of all taxes)", "Rs. 80.00 (Rs. 0.10 / g)"),
            ("MFG & PKG DATE", "08/2026"),
            ("BEST BEFORE", "9 Months from packaging"),
            ("MANUFACTURER & PACKER", "Parle Products Pvt Ltd, V.S. Khandekar Marg, Vile Parle (E), Mumbai, Maharashtra"),
            ("PIN CODE", "400057"),
            ("CUSTOMER CARE", "1800-222-777 / care@parle.biz"),
            ("COUNTRY OF ORIGIN", "India")
        ]
    },
    {
        "filename": "maggi_pack.png",
        "ean_12": "890105885246", # Maggi EAN-13 (8901058852462)
        "title": "MAGGI 2-MINUTE NOODLES (MASALA)",
        "brand": "NESTLE INDIA",
        "category": "Instant Foods",
        "bg_color": (255, 245, 180),
        "primary_color": (200, 20, 20),
        "accent_color": (230, 180, 0),
        "declarations": [
            ("COMMODITY", "Instant Noodles with Tastemaker"),
            ("NET QUANTITY", "70 g"),
            ("MRP (Incl. of all taxes)", "Rs. 14.00 (Rs. 0.20 / g)"),
            ("MFG & PKG DATE", "07/2026"),
            ("BEST BEFORE", "9 Months from packaging"),
            ("MANUFACTURER & PACKER", "Nestle India Limited, 100/101 World Trade Centre, Barakhamba Lane, New Delhi"),
            ("PIN CODE", "110001"),
            ("CUSTOMER CARE", "1800-103-1947 / wecare@in.nestle.com"),
            ("COUNTRY OF ORIGIN", "India")
        ]
    },
    {
        "filename": "lays_pack.png",
        "ean_12": "890149110183", # Lay's EAN-13 (8901491101837)
        "title": "LAY'S MAGIC MASALA POTATO CHIPS",
        "brand": "PEPSICO INDIA",
        "category": "Snacks & Chips",
        "bg_color": (20, 40, 90),
        "primary_color": (240, 190, 20),
        "accent_color": (220, 40, 40),
        "text_light": True,
        "declarations": [
            ("COMMODITY", "Potato Chips (Magic Masala)"),
            ("NET QUANTITY", "50 g"),
            ("MRP", "Rs. 20.00"), # Deliberate violation: missing 'inclusive of all taxes' & missing USP
            ("MFG DATE", "06/2026"),
            ("EXPIRY DATE", "12/2026"),
            ("MANUFACTURER", "PepsiCo India Holdings Pvt Ltd, DLF Qutab Enclave, Gurugram, Haryana"), # Missing PIN
            ("CUSTOMER HELPLINE", "1800-224-020"),
            ("COUNTRY OF ORIGIN", "India")
        ]
    },
    {
        "filename": "tata_salt.png",
        "ean_12": "890103038314", # Tata Salt EAN-13 (8901030383149)
        "title": "TATA SALT VACUUM EVAPORATED",
        "brand": "TATA CONSUMER PRODUCTS",
        "category": "Packaged Commodities",
        "bg_color": (230, 245, 255),
        "primary_color": (0, 70, 150),
        "accent_color": (200, 30, 30),
        "declarations": [
            ("COMMODITY", "Edible Common Salt (Iodised)"),
            ("NET QUANTITY", "1 kg (1000 g)"),
            ("MRP (Incl. of all taxes)", "Rs. 28.00 (Rs. 0.028 / g)"),
            ("MFG & PKG DATE", "08/2026"),
            ("BEST BEFORE", "24 Months from packaging"),
            ("MANUFACTURER & PACKER", "Tata Consumer Products Ltd, 1 Bishop Lefroy Road, Kolkata, West Bengal"),
            ("PIN CODE", "700020"),
            ("CUSTOMER CARE", "1800-345-1720 / customercare@tataconsumer.com"),
            ("COUNTRY OF ORIGIN", "India")
        ]
    },
    {
        "filename": "amul_butter.png",
        "ean_12": "890126201005", # Amul Butter EAN-13 (8901262010054)
        "title": "AMUL PASTEURIZED BUTTER",
        "brand": "GUJARAT CO-OP MILK MARKETING FEDERATION",
        "category": "Dairy Products",
        "bg_color": (255, 250, 220),
        "primary_color": (210, 30, 40),
        "accent_color": (0, 100, 180),
        "declarations": [
            ("COMMODITY", "Pasteurized Table Butter"),
            ("NET QUANTITY", "500 g"),
            ("MRP (Incl. of all taxes)", "Rs. 275.00 (Rs. 0.55 / g)"),
            ("MFG & PKG DATE", "08/2026"),
            ("BEST BEFORE", "12 Months from packaging (Keep Refrigerated)"),
            ("MANUFACTURER & PACKER", "GCMMF Ltd, Amul Dairy Road, Anand, Gujarat"),
            ("PIN CODE", "388001"),
            ("CUSTOMER CARE", "1800-258-3333 / customercare@amul.coop"),
            ("COUNTRY OF ORIGIN", "India")
        ]
    },
    {
        "filename": "dettol_soap.png",
        "ean_12": "890139601001", # Dettol Soap EAN-13 (8901396010013)
        "title": "DETTOL ORIGINAL PROTECTION SOAP",
        "brand": "RECKITT BENCKISER",
        "category": "Personal Care",
        "bg_color": (235, 255, 240),
        "primary_color": (0, 130, 60),
        "accent_color": (0, 90, 40),
        "declarations": [
            ("COMMODITY", "Toilet Soap (Grade 1, TFM 76%)"),
            ("NET QUANTITY", "125 g"),
            ("MRP (Incl. of all taxes)", "Rs. 58.00 (Rs. 0.46 / g)"),
            ("MFG & PKG DATE", "05/2026"),
            ("EXPIRY DATE", "04/2028"),
            ("MANUFACTURER & PACKER", "Reckitt Benckiser (India) Pvt Ltd, DLF Cyber City, Gurugram, Haryana"),
            ("PIN CODE", "122002"),
            ("CUSTOMER CARE", "1800-102-7245"), # Deliberate partial: email omitted
            ("COUNTRY OF ORIGIN", "India")
        ]
    }
]

def generate_pack_image(item):
    W, H = 800, 600
    img = Image.new("RGB", (W, H), item["bg_color"])
    draw = ImageDraw.Draw(img)
    text_is_light = item.get("text_light", False)
    text_color = (245, 245, 245) if text_is_light else (30, 30, 30)
    subtext_color = (200, 200, 200) if text_is_light else (70, 70, 70)

    # 1. Top Brand Banner
    draw.rectangle([(0, 0), (W, 90)], fill=item["primary_color"])
    draw.rectangle([(0, 90), (W, 95)], fill=item["accent_color"])

    try:
        font_title = ImageFont.truetype("arial.ttf", 26)
        font_brand = ImageFont.truetype("arial.ttf", 16)
        font_bold = ImageFont.truetype("arialbd.ttf", 15)
        font_normal = ImageFont.truetype("arial.ttf", 14)
        font_legal = ImageFont.truetype("arialbd.ttf", 13)
    except Exception:
        font_title = font_brand = font_bold = font_normal = font_legal = ImageFont.load_default()

    draw.text((30, 18), item["title"], fill=(255, 255, 255), font=font_title)
    draw.text((32, 58), f"BRAND: {item['brand']} | CATEGORY: {item['category']}", fill=(255, 240, 200), font=font_brand)

    # 2. Left Panel: Mandatory Legal Metrology Rule 6 Declarations
    draw.rectangle([(25, 115), (480, 570)], fill=(255, 255, 255) if not text_is_light else (30, 45, 75), outline=item["primary_color"], width=2)
    draw.rectangle([(25, 115), (480, 150)], fill=item["primary_color"])
    draw.text((40, 123), "LEGAL METROLOGY (PACKAGED COMMODITIES) DECLARATIONS", fill=(255, 255, 255), font=font_legal)

    y_offset = 165
    for label, val in item["declarations"]:
        draw.text((40, y_offset), f"{label}:", fill=item["primary_color"] if not text_is_light else (255, 215, 0), font=font_bold)
        # Wrap long text
        if len(val) > 42:
            lines = [val[:40], val[40:]]
            draw.text((40, y_offset + 18), lines[0], fill=text_color, font=font_normal)
            draw.text((40, y_offset + 36), lines[1], fill=text_color, font=font_normal)
            y_offset += 54
        else:
            draw.text((40, y_offset + 18), val, fill=text_color, font=font_normal)
            y_offset += 40

    # 3. Right Panel: High-Resolution Scannable Barcode & QR Box
    draw.rectangle([(505, 115), (775, 570)], fill=(255, 255, 255), outline=(180, 180, 180), width=2)
    draw.rectangle([(505, 115), (775, 150)], fill=(40, 50, 70))
    draw.text((525, 123), "GS1 INDIA GTIN-13 BARCODE", fill=(255, 255, 255), font=font_legal)

    # Generate Barcode using python-barcode ImageWriter
    ean_class = barcode.get_barcode_class('ean13')
    ean = ean_class(item["ean_12"], writer=ImageWriter())

    barcode_opts = {
        'module_width': 0.35,
        'module_height': 15.0,
        'font_size': 11,
        'text_distance': 4.0,
        'quiet_zone': 4.0,
        'write_text': True
    }

    fp = io.BytesIO()
    ean.write(fp, options=barcode_opts)
    fp.seek(0)
    bc_img = Image.open(fp)

    # Resize barcode nicely to fit container (e.g. 240w x 140h)
    bc_resized = bc_img.resize((245, 150), Image.Resampling.LANCZOS)
    img.paste(bc_resized, (518, 175))

    # Barcode Info Box
    full_ean13 = ean.get_fullcode()
    draw.rectangle([(520, 340), (760, 420)], fill=(245, 247, 250), outline=(210, 215, 220))
    draw.text((530, 348), "GTIN-13 / EAN:", fill=(100, 110, 120), font=font_normal)
    draw.text((530, 368), full_ean13, fill=(10, 80, 160), font=font_bold)
    draw.text((530, 392), "Country: India (GS1 Prefix 890)", fill=(40, 140, 80), font=font_normal)

    # Compliance Shield Emblem Box
    draw.rectangle([(520, 435), (760, 550)], fill=(240, 253, 250), outline=(45, 212, 191))
    draw.text((535, 448), "OFFICIAL PACKAGING AUDIT", fill=(13, 148, 136), font=font_bold)
    draw.text((535, 474), "Verified against:", fill=(70, 80, 90), font=font_normal)
    draw.text((535, 494), "• Rule 6 Mandatory Inscriptions", fill=(70, 80, 90), font=font_normal)
    draw.text((535, 514), "• Second Schedule Font Height", fill=(70, 80, 90), font=font_normal)

    # Save to backend/samples and frontend/public/samples
    backend_path = os.path.join(BACKEND_SAMPLES, item["filename"])
    frontend_path = os.path.join(FRONTEND_SAMPLES, item["filename"])

    img.save(backend_path, quality=95)
    img.save(frontend_path, quality=95)
    print(f"Generated: {item['filename']} -> Full EAN-13: {full_ean13}")
    return backend_path, full_ean13

if __name__ == "__main__":
    print("Generating 6 FMCG Packaging Samples with authentic scannable EAN-13 barcodes...")
    for item in SAMPLE_PRODUCTS:
        b_path, full_code = generate_pack_image(item)
    print("All sample packaging files generated successfully!")
