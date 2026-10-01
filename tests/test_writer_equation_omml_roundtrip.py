"""
VN Writer — Python test for Equation OMML round-trip
Builds a small DOCX with OMML fraction and square root, opens it through the app pipeline,
saves it, and checks the saved document.xml still contains m:f and m:rad.
"""
import os
import sys
import tempfile
import zipfile
from xml.etree import ElementTree as ET

# Add project root to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import main


def create_test_docx_with_equations(docx_path):
    """Create a minimal DOCX with OMML equations (fraction and square root)."""
    w_ns = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
    m_ns = "http://schemas.openxmlformats.org/officeDocument/2006/math"
    ET.register_namespace("w", w_ns)
    ET.register_namespace("m", m_ns)

    document = ET.Element(f"{{{w_ns}}}document")
    body = ET.SubElement(document, f"{{{w_ns}}}body")

    # Paragraph 1: Fraction 1/2
    p1 = ET.SubElement(body, f"{{{w_ns}}}p")
    r1 = ET.SubElement(p1, f"{{{w_ns}}}r")
    omath1 = ET.SubElement(r1, f"{{{m_ns}}}oMath")
    f = ET.SubElement(omath1, f"{{{m_ns}}}f")
    num = ET.SubElement(f, f"{{{m_ns}}}num")
    r_num = ET.SubElement(num, f"{{{m_ns}}}r")
    t_num = ET.SubElement(r_num, f"{{{m_ns}}}t")
    t_num.text = "1"
    den = ET.SubElement(f, f"{{{m_ns}}}den")
    r_den = ET.SubElement(den, f"{{{m_ns}}}r")
    t_den = ET.SubElement(r_den, f"{{{m_ns}}}t")
    t_den.text = "2"

    # Paragraph 2: Square root of x
    p2 = ET.SubElement(body, f"{{{w_ns}}}p")
    r2 = ET.SubElement(p2, f"{{{w_ns}}}r")
    omath2 = ET.SubElement(r2, f"{{{m_ns}}}oMath")
    rad = ET.SubElement(omath2, f"{{{m_ns}}}rad")
    rad_e = ET.SubElement(rad, f"{{{m_ns}}}e")
    r_rad = ET.SubElement(rad_e, f"{{{m_ns}}}r")
    t_rad = ET.SubElement(r_rad, f"{{{m_ns}}}t")
    t_rad.text = "x"

    document_xml = ET.tostring(document, encoding="utf-8", xml_declaration=True)

    with zipfile.ZipFile(docx_path, "w", zipfile.ZIP_DEFLATED) as z:
        content_types = '''<?xml version="1.0" encoding="UTF-8"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
</Types>'''
        z.writestr("[Content_Types].xml", content_types)

        rels = '''<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
</Relationships>'''
        z.writestr("_rels/.rels", rels)

        doc_rels = '''<?xml version="1.0" encoding="UTF-8"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
</Relationships>'''
        z.writestr("word/_rels/document.xml.rels", doc_rels)

        z.writestr("word/document.xml", document_xml.decode("utf-8"))

        styles = f'''<?xml version="1.0" encoding="UTF-8"?>
<w:styles xmlns:w="{w_ns}">
  <w:docDefaults>
    <w:rPrDefault>
      <w:rPr/>
    </w:rPrDefault>
  </w:docDefaults>
  <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
    <w:name w:val="Normal"/>
    <w:qFormat/>
  </w:style>
</w:styles>'''
        z.writestr("word/styles.xml", styles)


def test_equation_omml_roundtrip():
    """Test that OMML equations survive save/load round-trip via main.py pipeline."""
    with tempfile.TemporaryDirectory() as tmpdir:
        input_docx = os.path.join(tmpdir, "test_equations.docx")
        output_docx = os.path.join(tmpdir, "output_equations.docx")

        create_test_docx_with_equations(input_docx)

        # Verify input has m:f and m:rad
        with zipfile.ZipFile(input_docx, "r") as z:
            doc_xml = z.read("word/document.xml").decode("utf-8")
            assert "m:f" in doc_xml or "{http://schemas.openxmlformats.org/officeDocument/2006/math}f" in doc_xml, "Input missing m:f"
            assert "m:rad" in doc_xml or "{http://schemas.openxmlformats.org/officeDocument/2006/math}rad" in doc_xml, "Input missing m:rad"
            print("✓ Input DOCX contains m:f and m:rad")

        # Use main.py VnOfficeApi to open and save
        api = main.VnOfficeApi()

        # Mock the file dialog for save
        original_create_file_dialog = None
        try:
            import webview
            # webview.create_file_dialog is a function, not an attribute
            # We'll patch it differently
            original_create_file_dialog = webview.create_file_dialog
            def mock_save_dialog(*args, **kwargs):
                return output_docx
            webview.create_file_dialog = mock_save_dialog
        except (ImportError, AttributeError):
            pass

        try:
            # Open the document
            result = api._save_document_in_place_impl(
                content="",  # Not used for in-place save with source_path
                app_kind="writer",
                target_path=output_docx,
                source_path=input_docx
            )
            print(f"Save result: {result}")

            if result.get("status") != "ok":
                print(f"Save failed: {result}")
                return False

            # Verify output has m:f and m:rad
            with zipfile.ZipFile(output_docx, "r") as z:
                out_xml = z.read("word/document.xml").decode("utf-8")
                has_f = "m:f" in out_xml or "{http://schemas.openxmlformats.org/officeDocument/2006/math}f" in out_xml
                has_rad = "m:rad" in out_xml or "{http://schemas.openxmlformats.org/officeDocument/2006/math}rad" in out_xml
                
                print(f"Output has m:f: {has_f}")
                print(f"Output has m:rad: {has_rad}")
                
                if has_f and has_rad:
                    print("✓ OMML round-trip test PASSED")
                    return True
                else:
                    print("✗ OMML round-trip test FAILED")
                    print(f"Output XML sample: {out_xml[:2000]}")
                    return False
        finally:
            if original_create_file_dialog:
                try:
                    import webview
                    webview.create_file_dialog = original_create_file_dialog
                except (ImportError, AttributeError):
                    pass

        return False


if __name__ == "__main__":
    success = test_equation_omml_roundtrip()
    sys.exit(0 if success else 1)