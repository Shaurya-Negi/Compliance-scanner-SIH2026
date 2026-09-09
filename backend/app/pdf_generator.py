"""
PDF audit report generation using ReportLab
Generates 3-page compliance reports with product image, violations, and legal references
"""
import os
import hashlib
from datetime import datetime
from typing import Dict, List, Any, Optional
from pathlib import Path
import logging

# Compatibility fix for Python 3.8 on Windows with ReportLab openssl_md5
_orig_md5 = hashlib.md5
def _safe_md5(*args, **kwargs):
    kwargs.pop('usedforsecurity', None)
    return _orig_md5(*args, **kwargs)
hashlib.md5 = _safe_md5

from reportlab.lib.pagesizes import A4
from reportlab.lib.units import inch, mm
from reportlab.lib import colors
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
from reportlab.pdfgen import canvas

from app.config import settings

logger = logging.getLogger(__name__)


class PDFGenerator:
    """
    Legal Metrology compliance audit report generator
    """

    def __init__(self, output_dir: Optional[str] = None):
        self.output_dir = output_dir or settings.REPORT_DIR
        Path(self.output_dir).mkdir(parents=True, exist_ok=True)
        self.styles = getSampleStyleSheet()
        self._setup_custom_styles()

    def _setup_custom_styles(self):
        """Define custom paragraph styles for the report"""
        # Title style
        self.styles.add(ParagraphStyle(
            name='ReportTitle',
            parent=self.styles['Heading1'],
            fontSize=18,
            textColor=colors.HexColor('#1a365d'),
            spaceAfter=6,
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))

        # Section heading
        self.styles.add(ParagraphStyle(
            name='SectionHeading',
            parent=self.styles['Heading2'],
            fontSize=14,
            textColor=colors.HexColor('#2d3748'),
            spaceAfter=12,
            spaceBefore=12,
            fontName='Helvetica-Bold'
        ))

        # Score style
        self.styles.add(ParagraphStyle(
            name='ScoreText',
            parent=self.styles['Normal'],
            fontSize=24,
            textColor=colors.HexColor('#2c5282'),
            alignment=TA_CENTER,
            fontName='Helvetica-Bold'
        ))

    def generate_report(
        self,
        scan_id: int,
        image_path: str,
        entities: Dict[str, Any],
        checks: List[Dict[str, Any]],
        score: float,
        status: str
    ) -> str:
        """
        Generate a complete compliance audit PDF report

        Args:
            scan_id: Scan ID from database
            image_path: Path to the scanned product image
            entities: Extracted entity dictionary
            checks: List of rule check results
            score: Overall compliance score (0-100)
            status: Compliance status string

        Returns:
            str: Absolute path to the generated PDF file
        """
        # Generate filename
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        filename = f"compliance_report_{scan_id}_{timestamp}.pdf"
        output_path = os.path.join(self.output_dir, filename)

        # Create PDF document
        doc = SimpleDocTemplate(
            output_path,
            pagesize=A4,
            rightMargin=20*mm,
            leftMargin=20*mm,
            topMargin=15*mm,
            bottomMargin=15*mm,
            title=f"Legal Metrology Compliance Report - Scan #{scan_id}"
        )

        # Build content
        story = []

        # Page 1: Header + Product Summary + Score
        story.extend(self._build_page1(scan_id, image_path, entities, score, status))
        story.append(PageBreak())

        # Page 2: Detailed violations breakdown
        story.extend(self._build_page2(checks))
        story.append(PageBreak())

        # Page 3: Legal references and footer
        story.extend(self._build_page3())

        # Build PDF
        doc.build(story, onFirstPage=self._header_footer, onLaterPages=self._header_footer)

        logger.info(f"Generated compliance report: {output_path}")
        return output_path

    def _build_page1(self, scan_id: int, image_path: str, entities: Dict[str, Any], score: float, status: str) -> List:
        """Build Page 1: Title, product image, score badge, declarations table"""
        elements = []

        # Title
        title = Paragraph("LEGAL METROLOGY COMPLIANCE REPORT", self.styles['ReportTitle'])
        elements.append(title)
        elements.append(Spacer(1, 8*mm))

        # Scan metadata
        scan_info = f"<b>Scan ID:</b> #{scan_id} &nbsp;&nbsp;&nbsp; <b>Date:</b> {datetime.now().strftime('%d %B %Y, %H:%M')}"
        elements.append(Paragraph(scan_info, self.styles['Normal']))
        elements.append(Spacer(1, 8*mm))

        # Product image thumbnail (if exists)
        if os.path.exists(image_path):
            try:
                img = Image(image_path, width=80*mm, height=60*mm, kind='proportional')
                elements.append(img)
                elements.append(Spacer(1, 6*mm))
            except Exception as e:
                logger.warning(f"Could not embed image in PDF: {e}")

        # Compliance score badge
        score_color = self._get_score_color(score)
        score_para = Paragraph(f"{score:.1f}%", self.styles['ScoreText'])
        status_para = Paragraph(f"<b>{status}</b>", self.styles['Normal'])

        score_table = Table(
            [[score_para], [status_para]],
            colWidths=[60*mm],
            rowHeights=[15*mm, 8*mm]
        )
        score_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (0, 0), score_color),
            ('BACKGROUND', (0, 1), (0, 1), colors.HexColor('#f7fafc')),
            ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
            ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
            ('BOX', (0, 0), (-1, -1), 1, colors.grey),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.lightgrey),
        ]))
        elements.append(score_table)
        elements.append(Spacer(1, 10*mm))

        # Extracted declarations table
        elements.append(Paragraph("Extracted Declarations", self.styles['SectionHeading']))
        decl_data = [
            ["Declaration", "Value"],
            ["Product Name", self._truncate(entities.get("product_name") or "Not found", 50)],
            ["Net Quantity", entities.get("net_quantity") or "Not found"],
            ["MRP", entities.get("mrp") or "Not found"],
            ["Mfg Date", entities.get("mfg_date") or "Not found"],
            ["Expiry Date", entities.get("expiry_date") or "Not found"],
            ["Manufacturer PIN", entities.get("manufacturer_pin") or "Not found"],
            ["Country of Origin", entities.get("country_of_origin") or "Not found"],
        ]

        decl_table = Table(decl_data, colWidths=[60*mm, 100*mm])
        decl_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2d3748')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 11),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('BACKGROUND', (0, 1), (-1, -1), colors.beige),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('FONTSIZE', (0, 1), (-1, -1), 9),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f7fafc')]),
        ]))
        elements.append(decl_table)

        return elements

    def _build_page2(self, checks: List[Dict[str, Any]]) -> List:
        """Build Page 2: Rule-by-rule violations breakdown"""
        elements = []

        elements.append(Paragraph("Compliance Check Results", self.styles['SectionHeading']))
        elements.append(Spacer(1, 5*mm))

        # Summary counts
        passed_count = sum(1 for c in checks if c["passed"])
        failed_count = len(checks) - passed_count

        summary_text = f"<b>Total Rules Checked:</b> {len(checks)} &nbsp;&nbsp; " \
                      f"<b>Passed:</b> {passed_count} &nbsp;&nbsp; " \
                      f"<b>Failed:</b> {failed_count}"
        elements.append(Paragraph(summary_text, self.styles['Normal']))
        elements.append(Spacer(1, 6*mm))

        # Detailed violations table
        violations_data = [["Rule", "Status", "Severity", "Finding"]]

        for check in checks:
            status_icon = "✓" if check["passed"] else "✗"
            status_color = colors.green if check["passed"] else colors.red

            rule_name = self._truncate(check["rule_name"], 30)
            severity = check["severity"].upper()
            explanation = self._truncate(check["explanation"], 60)

            violations_data.append([
                rule_name,
                status_icon,
                severity,
                explanation
            ])

        violations_table = Table(violations_data, colWidths=[50*mm, 12*mm, 25*mm, 73*mm])
        violations_table.setStyle(TableStyle([
            ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor('#2d3748')),
            ('TEXTCOLOR', (0, 0), (-1, 0), colors.whitesmoke),
            ('ALIGN', (0, 0), (-1, -1), 'LEFT'),
            ('FONTNAME', (0, 0), (-1, 0), 'Helvetica-Bold'),
            ('FONTSIZE', (0, 0), (-1, 0), 10),
            ('BOTTOMPADDING', (0, 0), (-1, 0), 8),
            ('GRID', (0, 0), (-1, -1), 0.5, colors.grey),
            ('FONTSIZE', (0, 1), (-1, -1), 8),
            ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, colors.HexColor('#f7fafc')]),
            ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ]))

        # Color-code severity
        for i, check in enumerate(checks, start=1):
            if not check["passed"]:
                severity_color = self._get_severity_color(check["severity"])
                violations_table.setStyle(TableStyle([
                    ('BACKGROUND', (2, i), (2, i), severity_color),
                ]))

        elements.append(violations_table)

        return elements

    def _build_page3(self) -> List:
        """Build Page 3: Legal references and disclaimer"""
        elements = []

        elements.append(Paragraph("Legal References", self.styles['SectionHeading']))
        elements.append(Spacer(1, 4*mm))

        legal_text = """
        <b>Legal Metrology (Packaged Commodities) Rules, 2011</b><br/>
        <br/>
        <b>Rule 6: Mandatory Declarations</b><br/>
        Every package shall bear the following declarations:<br/>
        <br/>
        (a) Name and address of the manufacturer or packer<br/>
        (b) Common or generic name of the commodity<br/>
        (c) Net quantity in terms of standard unit of weight or measure<br/>
        (d) Month and year of manufacture/packing<br/>
        (e) Maximum Retail Price (MRP) with "inclusive of all taxes"<br/>
        (f) Customer care details (phone and/or email)<br/>
        (g) Country of origin<br/>
        (h) Unit sale price (for multi-unit packages)<br/>
        (i) Best before or use by date (for commodities requiring shelf life declaration)<br/>
        <br/>
        <b>Second Schedule: Font Size Requirements</b><br/>
        Minimum height of numerals and capital letters indicating net quantity:<br/>
        • Label area ≤ 25 cm²: 1.0 mm<br/>
        • Label area 25-100 cm²: 2.0 mm<br/>
        • Label area 100-500 cm²: 4.0 mm<br/>
        • Label area > 500 cm²: 6.0 mm<br/>
        <br/>
        """
        elements.append(Paragraph(legal_text, self.styles['Normal']))
        elements.append(Spacer(1, 10*mm))

        # Disclaimer
        elements.append(Paragraph("Disclaimer", self.styles['SectionHeading']))
        disclaimer = """
        This automated compliance report is generated using AI-powered OCR and entity extraction technology.
        While every effort is made to ensure accuracy, this report should be used as an indicative assessment only.
        Final compliance verification should be conducted by qualified Legal Metrology officers.
        This report does not constitute legal advice or an official certification.
        <br/><br/>
        <b>Generated by:</b> SIH26034 AI Compliance Scanner<br/>
        <b>Team:</b> 404 The Optimists | Smart India Hackathon 2026
        """
        elements.append(Paragraph(disclaimer, self.styles['Normal']))

        return elements

    def _header_footer(self, canvas_obj, doc):
        """Add header and footer to each page"""
        canvas_obj.saveState()

        # Footer
        footer_text = f"Generated on {datetime.now().strftime('%d %B %Y, %H:%M')} | SIH26034 Compliance Scanner"
        canvas_obj.setFont('Helvetica', 8)
        canvas_obj.setFillColor(colors.grey)
        canvas_obj.drawCentredString(A4[0] / 2, 15*mm, footer_text)

        # Page number
        page_num = canvas_obj.getPageNumber()
        canvas_obj.drawRightString(A4[0] - 20*mm, 15*mm, f"Page {page_num}")

        canvas_obj.restoreState()

    def _get_score_color(self, score: float) -> colors.Color:
        """Return color based on compliance score"""
        if score >= 80:
            return colors.HexColor('#48bb78')  # Green
        elif score >= 50:
            return colors.HexColor('#ecc94b')  # Yellow
        else:
            return colors.HexColor('#f56565')  # Red

    def _get_severity_color(self, severity: str) -> colors.Color:
        """Return color based on violation severity"""
        severity_map = {
            "critical": colors.HexColor('#fc8181'),
            "high": colors.HexColor('#f6ad55'),
            "medium": colors.HexColor('#f6e05e'),
            "low": colors.HexColor('#c6f6d5')
        }
        return severity_map.get(severity.lower(), colors.lightgrey)

    def _truncate(self, text: Optional[str], max_len: int) -> str:
        """Truncate text to max length"""
        if not text:
            return ""
        return text if len(text) <= max_len else text[:max_len-3] + "..."


# Singleton instance
pdf_generator = PDFGenerator()
