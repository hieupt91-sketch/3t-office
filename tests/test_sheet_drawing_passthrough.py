"""Test sheet drawing passthrough (S16): preserve original drawing when images untouched."""

from __future__ import annotations

import io
import re
import unittest
import zipfile
from xml.dom import minidom

from adapters.libreoffice.common.ooxml_zip_patch import (
    _parse_xlsx_drawing_images,
    _overlay_sheet_drawing_image_ids,
    _restore_untouched_drawings_step,
    postprocess_sheet_xlsx,
    read_zip_entry,
)

patcher = __import__("adapters.libreoffice.common.ooxml_zip_patch", fromlist=[""])


def _make_xlsx_with_drawing() -> bytes:
    """Create a minimal XLSX with one sheet and one drawing containing 2 images + 1 shape."""
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as z:
        # [Content_Types].xml
        z.writestr(
            "[Content_Types].xml",
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            '<Default Extension="xml" ContentType="application/xml"/>'
            '<Default Extension="png" ContentType="image/png"/>'
            '<Default Extension="jpeg" ContentType="image/jpeg"/>'
            '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
            '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
            '<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>'
            '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
            "</Types>",
        )

        # _rels/.rels
        z.writestr(
            "_rels/.rels",
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
            '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>'
            "</Relationships>",
        )

        # xl/workbook.xml
        z.writestr(
            "xl/workbook.xml",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            "<sheets>"
            '<sheet name="Sheet1" sheetId="1" r:id="rId1"/>'
            "</sheets>"
            "</workbook>",
        )

        # xl/_rels/workbook.xml.rels
        z.writestr(
            "xl/_rels/workbook.xml.rels",
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
            '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
            '<Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/theme" Target="theme/theme1.xml"/>'
            "</Relationships>",
        )

        # xl/worksheets/sheet1.xml
        z.writestr(
            "xl/worksheets/sheet1.xml",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            '<dimension ref="A1:B2"/>'
            '<sheetViews><sheetView workbookViewId="0"/></sheetViews>'
            "<sheetData/>"
            '<drawing r:id="rId1"/>'
            "</worksheet>",
        )

        # xl/worksheets/_rels/sheet1.xml.rels
        z.writestr(
            "xl/worksheets/_rels/sheet1.xml.rels",
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>'
            "</Relationships>",
        )

        # xl/drawings/drawing1.xml - 2 xdr:pic (images) + 1 xdr:sp (shape)
        z.writestr(
            "xl/drawings/drawing1.xml",
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main">'
            '<xdr:twoCellAnchor editAs="oneCell">'
            '<xdr:from><xdr:col>0</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>0</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>'
            '<xdr:to><xdr:col>1</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>1</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>'
            '<xdr:pic>'
            '<xdr:nvPicPr>'
            '<xdr:cNvPr id="1" name="Picture 1"/>'
            '<xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr>'
            '</xdr:nvPicPr>'
            '<xdr:blipFill>'
            '<a:blip r:embed="rId1" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>'
            '<a:stretch><a:fillRect/></a:stretch>'
            '</xdr:blipFill>'
            '<xdr:spPr><a:xfrm><a:off x="0" y="0"/><a:ext cx="1000000" cy="1000000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr>'
            '</xdr:pic>'
            '<xdr:clientData/>'
            '</xdr:twoCellAnchor>'
            '<xdr:twoCellAnchor editAs="oneCell">'
            '<xdr:from><xdr:col>2</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>2</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>'
            '<xdr:to><xdr:col>3</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>3</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>'
            '<xdr:pic>'
            '<xdr:nvPicPr>'
            '<xdr:cNvPr id="2" name="Picture 2"/>'
            '<xdr:cNvPicPr><a:picLocks noChangeAspect="1"/></xdr:cNvPicPr>'
            '</xdr:nvPicPr>'
            '<xdr:blipFill>'
            '<a:blip r:embed="rId2" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"/>'
            '<a:stretch><a:fillRect/></a:stretch>'
            '</xdr:blipFill>'
            '<xdr:spPr><a:xfrm><a:off x="2000000" y="2000000"/><a:ext cx="1000000" cy="1000000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr>'
            '</xdr:pic>'
            '<xdr:clientData/>'
            '</xdr:twoCellAnchor>'
            '<xdr:twoCellAnchor editAs="oneCell">'
            '<xdr:from><xdr:col>4</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>4</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>'
            '<xdr:to><xdr:col>5</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>5</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>'
            '<xdr:sp>'
            '<xdr:nvSpPr>'
            '<xdr:cNvPr id="3" name="TextBox 1"/>'
            '<xdr:cNvSpPr/>'
            '</xdr:nvSpPr>'
            '<xdr:spPr><a:xfrm><a:off x="4000000" y="4000000"/><a:ext cx="1000000" cy="1000000"/></a:xfrm><a:prstGeom prst="rect"><a:avLst/></a:prstGeom></xdr:spPr>'
            '<xdr:txBody><a:bodyPr/><a:lstStyle/><a:p><a:endParaRPr sz="1200"/></a:p></xdr:txBody>'
            '<xdr:clientData/>'
            '</xdr:sp>'
            '</xdr:twoCellAnchor>'
            "</xdr:wsDr>",
        )

        # xl/drawings/_rels/drawing1.xml.rels
        z.writestr(
            "xl/drawings/_rels/drawing1.xml.rels",
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image1.png"/>'
            '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="../media/image2.png"/>'
            "</Relationships>",
        )

        # xl/media/image1.png (dummy)
        z.writestr("xl/media/image1.png", b"PNG1")
        # xl/media/image2.png (dummy)
        z.writestr("xl/media/image2.png", b"PNG2")

        # xl/styles.xml (minimal)
        z.writestr(
            "xl/styles.xml",
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
            "<fonts count=\"1\"><font><sz val=\"11\"/><name val=\"Calibri\"/></font></fonts>"
            "<fills count=\"1\"><fill><patternFill patternType=\"none\"/></fill></fills>"
            "<borders count=\"1\"><border><left/><right/><top/><bottom/><diagonal/></border></borders>"
            "<cellStyleXfs count=\"1\"><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\"/></cellStyleXfs>"
            "<cellXfs count=\"1\"><xf numFmtId=\"0\" fontId=\"0\" fillId=\"0\" borderId=\"0\" xfId=\"0\"/></cellXfs>"
            "<cellStyles count=\"1\"><cellStyle name=\"Normal\" xfId=\"0\" builtinId=\"0\"/></cellStyles>"
            "</styleSheet>",
        )

        # xl/theme/theme1.xml (minimal)
        z.writestr(
            "xl/theme/theme1.xml",
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<a:theme xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" name="Office Theme">'
            '<a:themeElements>'
            '<a:clrScheme name="Office"><a:dk1><a:sysClr val="windowText" lastClr="000000"/></a:dk1><a:lt1><a:sysClr val="window" lastClr="FFFFFF"/></a:lt1><a:dk2><a:sysClr val="windowText" lastClr="000000"/></a:dk2><a:lt2><a:sysClr val="window" lastClr="FFFFFF"/></a:lt2><a:accent1><a:sysClr val="windowText" lastClr="000000"/></a:accent1><a:accent2><a:sysClr val="windowText" lastClr="000000"/></a:accent2><a:accent3><a:sysClr val="windowText" lastClr="000000"/></a:accent3><a:accent4><a:sysClr val="windowText" lastClr="000000"/></a:accent4><a:accent5><a:sysClr val="windowText" lastClr="000000"/></a:accent5><a:accent6><a:sysClr val="windowText" lastClr="000000"/></a:accent6><a:hlink><a:sysClr val="windowText" lastClr="000000"/></a:hlink><a:folHlink><a:sysClr val="windowText" lastClr="000000"/></a:folHlink></a:clrScheme>'
            '<a:fontScheme name="Office"><a:majorFont><a:latin typeface="Calibri"/></a:majorFont><a:minorFont><a:latin typeface="Calibri"/></a:minorFont></a:fontScheme>'
            '<a:fmtScheme name="Office"/></a:themeElements>'
            "</a:theme>",
        )

        # docProps/core.xml
        z.writestr(
            "docProps/core.xml",
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:dcmitype="http://purl.org/dc/dcmitype/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"/>',
        )

    return buf.getvalue()


def _make_fods_with_images(has_all_images: bool = True) -> str:
    """Create a minimal FODS with draw:frame elements for images.

    If has_all_images=False, omit one image to simulate deletion.
    """
    frames = []
    if has_all_images:
        frames.append(
            '<draw:frame draw:name="Picture 1" svg:width="3.528cm" svg:height="3.528cm" svg:x="0cm" svg:y="0cm">'
            '<draw:image draw:mime-type="image/png"><office:binary-data>iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==</office:binary-data></draw:image>'
            "</draw:frame>"
        )
        frames.append(
            '<draw:frame draw:name="Picture 2" svg:width="3.528cm" svg:height="3.528cm" svg:x="7.056cm" svg:y="7.056cm">'
            '<draw:image draw:mime-type="image/png"><office:binary-data>iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==</office:binary-data></draw:image>'
            "</draw:frame>"
        )
    else:
        frames.append(
            '<draw:frame draw:name="Picture 1" svg:width="3.528cm" svg:height="3.528cm" svg:x="0cm" svg:y="0cm">'
            '<draw:image draw:mime-type="image/png"><office:binary-data>iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==</office:binary-data></draw:image>'
            "</draw:frame>"
        )

    return (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<office:document xmlns:office="urn:oasis:names:tc:opendocument:xmlns:office:1.0" '
        'xmlns:table="urn:oasis:names:tc:opendocument:xmlns:table:1.0" '
        'xmlns:draw="urn:oasis:names:tc:opendocument:xmlns:drawing:1.0" '
        'xmlns:xlink="http://www.w3.org/1999/xlink" '
        'xmlns:vno="https://vnoffice.vn/ns/spreadsheet/1.0" '
        'office:version="1.2" office:mimetype="application/vnd.oasis.opendocument.spreadsheet">'
        "<office:body><office:spreadsheet>"
        '<table:table table:name="Sheet1">'
        '<table:table-column/>'
        '<table:table-row>'
        f'<table:table-cell>{frames[0]}</table:table-cell>'
        '</table:table-row>'
        '<table:table-row>'
        f'<table:table-cell>{frames[1] if len(frames) > 1 else ""}</table:table-cell>'
        "</table:table-row>"
        "</table:table>"
        "</office:spreadsheet></office:body>"
        "</office:document>"
    )


class SheetDrawingPassthroughTests(unittest.TestCase):
    def test_parse_xlsx_drawing_images(self):
        xlsx = _make_xlsx_with_drawing()
        images = _parse_xlsx_drawing_images(xlsx)
        self.assertIn("Sheet1", images)
        anchors = images["Sheet1"]
        self.assertEqual(len(anchors), 2)  # 2 images (xdr:pic), 1 shape (xdr:sp) ignored
        self.assertEqual(anchors[0]["index"], 0)
        self.assertEqual(anchors[0]["cnvpr_id"], "1")
        self.assertEqual(anchors[0]["name"], "Picture 1")
        self.assertEqual(anchors[0]["rel_id"], "rId1")
        self.assertEqual(anchors[1]["index"], 1)
        self.assertEqual(anchors[1]["cnvpr_id"], "2")
        self.assertEqual(anchors[1]["name"], "Picture 2")
        self.assertEqual(anchors[1]["rel_id"], "rId2")

    def test_overlay_sheet_drawing_image_ids(self):
        xlsx = _make_xlsx_with_drawing()
        fods = _make_fods_with_images(has_all_images=True)
        overlaid = _overlay_sheet_drawing_image_ids(xlsx, fods)

        # id = <sheet>:<i>/<N>, N = so khung anh Calc nhap duoc luc mo (Calc bo anh nhom/anh cao 0/anh lien ket:
        # lan12 9 anchor goc -> 6 khung) -> "chua sua" khong phu thuoc Calc bo gi
        self.assertIn('vno:image-id="Sheet1:0/2"', overlaid)
        self.assertIn('vno:image-id="Sheet1:1/2"', overlaid)
        # Ensure vno namespace is declared
        self.assertIn('xmlns:vno="https://vnoffice.vn/ns/spreadsheet/1.0"', overlaid)

    def test_restore_untouched_drawings_exact_match(self):
        """FODS has all original image IDs -> drawing should be restored."""
        source_xlsx = _make_xlsx_with_drawing()
        # Create output XLSX (simulating LibreOffice output with its own drawing)
        out_xlsx = source_xlsx  # For simplicity, use same bytes; in real case LibreOffice would modify
        fods = _make_fods_with_images(has_all_images=True)

        # Add vno:image-id to FODS
        fods_with_ids = _overlay_sheet_drawing_image_ids(source_xlsx, fods)

        replacements: dict[str, str] = {}
        _restore_untouched_drawings_step(out_xlsx, fods_with_ids, source_xlsx, replacements)

        # Drawing should be restored (check that drawing XML and rels are in replacements)
        self.assertIn("xl/drawings/drawing1.xml", replacements)
        self.assertIn("xl/drawings/_rels/drawing1.xml.rels", replacements)
        # Media files should be copied with vnosrc_ prefix
        self.assertIn("xl/media/vnosrc_image1.png", replacements)
        self.assertIn("xl/media/vnosrc_image2.png", replacements)
        # Content_Types should have drawing override and image defaults
        ct = replacements.get("[Content_Types].xml", "")
        self.assertIn('Override PartName="/xl/drawings/drawing1.xml"', ct)
        self.assertIn('Default Extension="png"', ct)

    def test_restore_untouched_drawings_missing_image_no_restore(self):
        """FODS missing one image -> drawing should NOT be restored."""
        source_xlsx = _make_xlsx_with_drawing()
        out_xlsx = source_xlsx
        # Nguoi dung XOA mot anh trong app SAU khi mo (overlay da gan 0/2, 1/2) -> thieu id 1/2 -> khong phuc hoi
        fods_with_ids = _overlay_sheet_drawing_image_ids(source_xlsx, _make_fods_with_images(has_all_images=True))
        fods_with_ids = re.sub(r'<draw:frame\b[^>]*vno:image-id="Sheet1:1/2"[^>]*>[\s\S]*?</draw:frame>', "", fods_with_ids)
        self.assertNotIn('Sheet1:1/2', fods_with_ids)

        replacements: dict[str, str] = {}
        _restore_untouched_drawings_step(out_xlsx, fods_with_ids, source_xlsx, replacements)

        # Drawing should NOT be restored
        self.assertNotIn("xl/drawings/drawing1.xml", replacements)

        # Calc bo anh luc NHAP (FODS chi co 1 khung truoc overlay) thi van la "chua sua" -> phuc hoi drawing goc
        fods_calc_dropped = _overlay_sheet_drawing_image_ids(source_xlsx, _make_fods_with_images(has_all_images=False))
        self.assertIn('vno:image-id="Sheet1:0/1"', fods_calc_dropped)
        replacements = {}
        _restore_untouched_drawings_step(out_xlsx, fods_calc_dropped, source_xlsx, replacements)
        self.assertIn("xl/drawings/drawing1.xml", replacements)

    def test_restore_source_drawing_when_calc_imported_no_images(self):
        """An image absent from the imported model cannot have been deleted in the app."""
        source_xlsx = _make_xlsx_with_drawing()
        fods_without_images = _make_fods_with_images(has_all_images=False)
        fods_without_images = re.sub(r'<draw:frame\b[^>]*>[\s\S]*?</draw:frame>', "", fods_without_images)
        fods_without_images = fods_without_images.replace(
            '<table:table table:name="Sheet1">',
            '<table:table table:name="Sheet1" vno:images-at-open="0">',
        )
        replacements: dict[str, str] = {}
        _restore_untouched_drawings_step(source_xlsx, fods_without_images, source_xlsx, replacements)
        self.assertIn("xl/drawings/drawing1.xml", replacements)

    def test_does_not_restore_when_user_deleted_all_imported_images(self):
        source_xlsx = _make_xlsx_with_drawing()
        fods_without_images = _make_fods_with_images(has_all_images=False)
        fods_without_images = re.sub(r'<draw:frame\b[^>]*>[\s\S]*?</draw:frame>', "", fods_without_images)
        fods_without_images = fods_without_images.replace(
            '<table:table table:name="Sheet1">',
            '<table:table table:name="Sheet1" vno:images-at-open="1">',
        )
        replacements: dict[str, str] = {}
        _restore_untouched_drawings_step(source_xlsx, fods_without_images, source_xlsx, replacements)
        self.assertNotIn("xl/drawings/drawing1.xml", replacements)

    def test_restore_untouched_drawings_extra_image_no_restore(self):
        """FODS has extra image -> drawing should NOT be restored."""
        source_xlsx = _make_xlsx_with_drawing()
        out_xlsx = source_xlsx

        # Overlay tren FODS Calc nhap (2 anh) roi nguoi dung THEM anh thu 3 trong app (khong co vno:image-id)
        fods_with_ids = _overlay_sheet_drawing_image_ids(source_xlsx, _make_fods_with_images(has_all_images=True))
        fods_with_ids = fods_with_ids.replace(
            "</table:table>",
            '<table:table-row><table:table-cell>'
            '<draw:frame draw:name="Extra" svg:width="3.528cm" svg:height="3.528cm">'
            '<draw:image draw:mime-type="image/png"><office:binary-data>iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==</office:binary-data></draw:image>'
            "</draw:frame>"
            "</table:table-cell></table:table-row></table:table>",
        )

        replacements: dict[str, str] = {}
        _restore_untouched_drawings_step(out_xlsx, fods_with_ids, source_xlsx, replacements)

        # Drawing should NOT be restored due to count mismatch
        self.assertNotIn("xl/drawings/drawing1.xml", replacements)

    def test_postprocess_sheet_xlsx_integration_untouched(self):
        """Integration test: full postprocess_sheet_xlsx with untouched drawings."""
        source_xlsx = _make_xlsx_with_drawing()
        # Simulate LibreOffice output (in real case this would be different)
        out_xlsx = source_xlsx
        fods = _make_fods_with_images(has_all_images=True)
        # Apply overlay to add vno:image-id (simulates File → Mở phase)
        fods = _overlay_sheet_drawing_image_ids(source_xlsx, fods)

        patched = postprocess_sheet_xlsx(
            out_xlsx,
            source_fods=fods,
            source_xlsx_bytes=source_xlsx,
        )

        # Should have modified the XLSX (restored drawing)
        self.assertIsNot(patched, out_xlsx)

        # Verify the patched XLSX is valid XML
        with zipfile.ZipFile(io.BytesIO(patched), "r") as z:
            drawing_xml = z.read("xl/drawings/drawing1.xml")
            # Should parse without error
            minidom.parseString(drawing_xml)

            # Check media files exist with vnosrc_ prefix
            names = z.namelist()
            self.assertIn("xl/media/vnosrc_image1.png", names)
            self.assertIn("xl/media/vnosrc_image2.png", names)

    def test_postprocess_sheet_xlsx_integration_modified(self):
        """Integration test: full postprocess_sheet_xlsx with modified drawings (no restore)."""
        source_xlsx = _make_xlsx_with_drawing()
        out_xlsx = source_xlsx
        fods = _make_fods_with_images(has_all_images=False)  # Missing one image
        # Apply overlay to add vno:image-id
        fods = _overlay_sheet_drawing_image_ids(source_xlsx, fods)

        patched = postprocess_sheet_xlsx(
            out_xlsx,
            source_fods=fods,
            source_xlsx_bytes=source_xlsx,
        )

        # Should still return valid XLSX (may be same as input if no other changes)
        with zipfile.ZipFile(io.BytesIO(patched), "r") as z:
            # Should be valid
            z.read("xl/workbook.xml")


if __name__ == "__main__":
    unittest.main()
