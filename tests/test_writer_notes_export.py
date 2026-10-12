"""Chú thích cuối trang/cuối tài liệu của Doc ghi vào DOCX thật: mã tạm [[VNOFN:id]] -> w:footnoteReference."""

import io
import json
import re
import unittest
import zipfile

from adapters.libreoffice.common import ooxml_zip_patch as patcher

W = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"


def _hex_meta(notes):
    payload = json.dumps({"version": 1, "notes": notes}).encode("utf-8").hex()
    return f"<!--vno-notes-meta-hex:{payload}-->"


def _docx(document_body):
    buffer = io.BytesIO()
    with zipfile.ZipFile(buffer, "w") as archive:
        archive.writestr("[Content_Types].xml", '<?xml version="1.0"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="xml" ContentType="application/xml"/></Types>')
        archive.writestr("word/document.xml", f'<?xml version="1.0"?><w:document xmlns:w="{W}"><w:body>{document_body}</w:body></w:document>')
        archive.writestr("word/_rels/document.xml.rels", '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="x" Target="styles.xml"/></Relationships>')
        archive.writestr("word/settings.xml", f'<?xml version="1.0"?><w:settings xmlns:w="{W}"><w:zoom w:percent="100"/><w:compat/></w:settings>')
    return buffer.getvalue()


def _read(docx_bytes, name):
    with zipfile.ZipFile(io.BytesIO(docx_bytes)) as archive:
        return archive.read(name).decode("utf-8") if name in archive.namelist() else None


def _read_bytes(docx_bytes, name):
    with zipfile.ZipFile(io.BytesIO(docx_bytes)) as archive:
        return archive.read(name) if name in archive.namelist() else None


class WriterNotesExportTests(unittest.TestCase):
    def test_footnote_token_becomes_reference_and_part_is_created(self):
        body = '<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Truoc [[VNOFN:fn-1]] sau</w:t></w:r></w:p>'
        out = patcher.postprocess_writer_notes(
            _docx(body), source_html=_hex_meta([{"kind": "footnote", "id": "fn-1", "text": "Noi dung chu thich"}]),
        )
        document = _read(out, "word/document.xml")
        self.assertIn('<w:footnoteReference w:id="1"/>', document)
        self.assertNotIn("VNOFN", document)
        self.assertEqual(len(re.findall(r"<w:r>", document)), 3, "chữ trước, tham chiếu, chữ sau")
        self.assertIn("<w:b/>", document, "định dạng của run gốc được giữ cho chữ trước/sau")
        footnotes = _read(out, "word/footnotes.xml")
        self.assertIn('w:id="-1"', footnotes)
        self.assertIn('w:id="0"', footnotes)
        self.assertIn("Noi dung chu thich", footnotes)
        self.assertIn("<w:footnoteRef/>", footnotes)
        self.assertIn("footnotes.xml", _read(out, "word/_rels/document.xml.rels"))
        self.assertIn("/word/footnotes.xml", _read(out, "[Content_Types].xml"))
        settings = _read(out, "word/settings.xml")
        self.assertIn("<w:footnotePr>", settings)
        self.assertLess(settings.index("<w:footnotePr>"), settings.index("<w:compat"))

    def test_footnotes_and_endnotes_are_numbered_independently(self):
        body = '<w:p><w:r><w:t>A[[VNOFN:a]]B[[VNOEN:b]]C[[VNOFN:c]]</w:t></w:r></w:p>'
        out = patcher.postprocess_writer_notes(_docx(body), source_html=_hex_meta([
            {"kind": "footnote", "id": "a", "text": "F1"},
            {"kind": "endnote", "id": "b", "text": "E1"},
            {"kind": "footnote", "id": "c", "text": "F2"},
        ]))
        document = _read(out, "word/document.xml")
        self.assertEqual(re.findall(r'<w:footnoteReference w:id="(\d+)"/>', document), ["1", "2"])
        self.assertEqual(re.findall(r'<w:endnoteReference w:id="(\d+)"/>', document), ["1"])
        self.assertIn("F2", _read(out, "word/footnotes.xml"))
        self.assertIn("E1", _read(out, "word/endnotes.xml"))
        self.assertIn("<w:endnotePr>", _read(out, "word/settings.xml"))

    def test_without_metadata_nothing_changes(self):
        docx = _docx("<w:p><w:r><w:t>A</w:t></w:r></w:p>")
        self.assertEqual(patcher.postprocess_writer_notes(docx, source_html="<p>A</p>"), docx)

    def test_text_is_xml_escaped(self):
        body = "<w:p><w:r><w:t>X[[VNOFN:z]]</w:t></w:r></w:p>"
        out = patcher.postprocess_writer_notes(_docx(body), source_html=_hex_meta([{"kind": "footnote", "id": "z", "text": "a < b & c"}]))
        self.assertIn("a &lt; b &amp; c", _read(out, "word/footnotes.xml"))


class WriterPageDecorExportTests(unittest.TestCase):
    SECT = '<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="850" w:bottom="1134" w:left="1701"/><w:cols w:space="720"/></w:sectPr>'

    def test_page_border_is_added_to_every_section_in_schema_order(self):
        docx = _docx(f"<w:p><w:r><w:t>A</w:t></w:r></w:p>{self.SECT}")
        html = "<style>@page { size: 210mm 297mm; margin: 20mm; border: 1.5pt dashed #ff0000; }</style><p>A</p>"
        out = patcher.postprocess_writer_page_decor(docx, source_html=html)
        document = _read(out, "word/document.xml")
        self.assertIn('<w:pgBorders w:offsetFrom="page">', document)
        self.assertIn('w:val="dashed"', document)
        self.assertIn('w:sz="12"', document)
        self.assertIn('w:color="FF0000"', document)
        self.assertEqual(document.count("<w:top "), 1)
        self.assertLess(document.index("<w:pgMar"), document.index("<w:pgBorders"))
        self.assertLess(document.index("<w:pgBorders"), document.index("<w:cols"))

    def test_page_background_color_adds_background_and_display_flag(self):
        docx = _docx(f"<w:p><w:r><w:t>A</w:t></w:r></w:p>{self.SECT}")
        out = patcher.postprocess_writer_page_decor(docx, source_html="<style>@page { margin: 20mm; background-color: #FFF8E1; }</style>")
        document = _read(out, "word/document.xml")
        self.assertIn('<w:background w:color="FFF8E1"/>', document)
        self.assertIn("<w:displayBackgroundShape/>", _read(out, "word/settings.xml"))
        self.assertNotIn("<w:pgBorders", document)

    def test_line_numbers_added_before_cols_after_borders(self):
        docx = _docx(f"<w:p><w:r><w:t>A</w:t></w:r></w:p>{self.SECT}")
        html = "<style>@page { margin: 20mm; border: 1pt solid #000000; }</style><p>A</p><!--vno-line-numbers:5:page-->"
        out = patcher.postprocess_writer_page_decor(docx, source_html=html)
        document = _read(out, "word/document.xml")
        self.assertIn('<w:lnNumType w:countBy="5" w:restart="newPage"/>', document)
        self.assertLess(document.index("<w:pgBorders"), document.index("<w:lnNumType"))
        self.assertLess(document.index("<w:lnNumType"), document.index("<w:cols"))

    def test_without_border_or_background_nothing_changes(self):
        docx = _docx(f"<w:p><w:r><w:t>A</w:t></w:r></w:p>{self.SECT}")
        self.assertEqual(patcher.postprocess_writer_page_decor(docx, source_html="<style>@page { margin: 20mm; }</style>"), docx)

    def test_white_background_is_ignored(self):
        docx = _docx(f"<w:p><w:r><w:t>A</w:t></w:r></w:p>{self.SECT}")
        out = patcher.postprocess_writer_page_decor(docx, source_html="<style>@page { background-color: #ffffff; }</style>")
        self.assertNotIn("<w:background", _read(out, "word/document.xml"))


class WriterNativeChartExportTests(unittest.TestCase):
    def test_new_chart_region_becomes_native_chart_with_embedded_workbook(self):
        target_body = (
            '<w:p><w:r><w:t>before</w:t></w:r></w:p>'
            '<w:p><w:bookmarkStart w:id="8" w:name="VNO_NATIVE_CHART_1_START"/>'
            '<w:bookmarkEnd w:id="8"/></w:p>'
            '<w:p><w:r><w:t>static chart placeholder</w:t></w:r></w:p>'
            '<w:p><w:bookmarkStart w:id="9" w:name="VNO_NATIVE_CHART_1_END"/><w:bookmarkEnd w:id="9"/></w:p>'
            '<w:p><w:r><w:t>after</w:t></w:r></w:p>'
        )
        target = _docx(target_body)
        drawing = (
            '<w:drawing xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" '
            'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
            'xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
            '<wp:inline><wp:extent cx="1000" cy="1000"/><wp:docPr id="1" name="Chart1"/>'
            '<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart">'
            '<c:chart r:id="rId2"/></a:graphicData></a:graphic></wp:inline></w:drawing>'
        )
        aux_chart = _docx(f'<w:p><w:r>{drawing}</w:r></w:p>')
        aux_chart = patcher.patch_ooxml_zip(aux_chart, {
            "word/_rels/document.xml.rels": (
                '<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
                '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="charts/chart1.xml"/></Relationships>'
            ),
            "word/charts/chart1.xml": (
                '<?xml version="1.0"?><c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" '
                'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
                'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
                '<c:chart><c:plotArea><c:barChart><c:ser><c:tx><c:strRef><c:f>label 0</c:f></c:strRef></c:tx>'
                '<c:cat><c:strRef><c:strCache><c:ptCount val="2"/><c:pt idx="0"><c:v>Q1</c:v></c:pt>'
                '<c:pt idx="1"><c:v>Q2</c:v></c:pt></c:strCache></c:strRef></c:cat>'
                '<c:val><c:numRef><c:f>0</c:f><c:numCache><c:ptCount val="2"/><c:pt idx="0"><c:v>3</c:v></c:pt>'
                '<c:pt idx="1"><c:v>4</c:v></c:pt></c:numCache></c:numRef></c:val></c:ser></c:barChart></c:plotArea></c:chart></c:chartSpace>'
            ),
        })
        html = '<!--vno-native-charts-fodt:Zm9kdA==--><a name="VNO_NATIVE_CHART_1_START"></a><div></div><a name="VNO_NATIVE_CHART_1_END"></a>'
        out = patcher.postprocess_writer_native_charts(target, aux_chart, source_html=html)
        document = _read(out, "word/document.xml")
        self.assertIn("<c:chart", document)
        self.assertNotIn("static chart placeholder", document)
        self.assertIn("before", document)
        self.assertIn("after", document)
        self.assertIn("/word/charts/vnoChart1.xml", _read(out, "[Content_Types].xml"))
        self.assertIn('Target="charts/vnoChart1.xml"', _read(out, "word/_rels/document.xml.rels"))
        self.assertIsNotNone(_read_bytes(out, "word/embeddings/vnoChart1.xlsx"))
        chart_rels = _read(out, "word/charts/_rels/vnoChart1.xml.rels")
        self.assertIn("/package", chart_rels)
        with zipfile.ZipFile(io.BytesIO(_read_bytes(out, "word/embeddings/vnoChart1.xlsx"))) as workbook:
            sheet = workbook.read("xl/worksheets/sheet1.xml").decode("utf-8")
        self.assertIn("Q1", sheet)
        self.assertIn(">3</v>", sheet)


class WriterNativeDiagramExportTests(unittest.TestCase):
    def test_new_diagram_region_becomes_one_editable_drawingml_group(self):
        target_body = (
            '<w:p><w:r><w:t>before</w:t></w:r></w:p>'
            '<w:p><w:bookmarkStart w:id="8" w:name="VNO_NATIVE_DIAGRAM_1_START"/><w:bookmarkEnd w:id="8"/></w:p>'
            '<w:p><w:r><w:t>static diagram placeholder</w:t></w:r></w:p>'
            '<w:p><w:bookmarkStart w:id="9" w:name="VNO_NATIVE_DIAGRAM_1_END"/><w:bookmarkEnd w:id="9"/></w:p>'
            '<w:p><w:r><w:t>after</w:t></w:r></w:p>'
        )
        target = _docx(target_body)
        drawing = (
            '<w:drawing xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" '
            'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
            'xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup">'
            '<wp:anchor><wp:docPr id="1" name="VNODiagram1"/><a:graphic>'
            '<a:graphicData uri="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup">'
            '<wpg:wgp><wpg:cNvGrpSpPr/><wpg:grpSpPr/></wpg:wgp>'
            '</a:graphicData></a:graphic></wp:anchor></w:drawing>'
        )
        aux_diagram = _docx(f'<w:p><w:r>{drawing}</w:r></w:p>')
        html = '<!--vno-native-diagrams-fodt:Zm9kdA==--><a name="VNO_NATIVE_DIAGRAM_1_START"></a><div></div><a name="VNO_NATIVE_DIAGRAM_1_END"></a>'
        out = patcher.postprocess_writer_native_diagrams(target, aux_diagram, source_html=html)
        document = _read(out, "word/document.xml")
        self.assertIn("<wpg:wgp>", document)
        self.assertNotIn("static diagram placeholder", document)
        self.assertNotIn("VNO_NATIVE_DIAGRAM", document)
        self.assertIn("before", document)
        self.assertIn("after", document)


class WriterNativeWatermarkExportTests(unittest.TestCase):
    def test_watermark_is_attached_as_native_word_header_shape(self):
        target = _docx('<w:p><w:r><w:t>body</w:t></w:r></w:p><w:sectPr/>')
        aux = _docx('<w:p/>')
        aux = patcher.patch_ooxml_zip(aux, {
            "word/header1.xml": (
                '<?xml version="1.0"?><w:hdr xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" '
                'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" '
                'xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" '
                'xmlns:v="urn:schemas-microsoft-com:vml"><w:p><w:r><w:drawing><wp:anchor>'
                '<wp:docPr id="1" name="Watermark"/><a:graphic/></wp:anchor></w:drawing></w:r></w:p></w:hdr>'
            ),
        })
        out = patcher.postprocess_writer_native_watermark(
            target, aux, source_html="<!--vno-native-watermark-fodt:Zm9kdA==-->",
        )
        document = _read(out, "word/document.xml")
        header = _read(out, "word/header1.xml")
        self.assertIn('w:type="default"', document)
        self.assertIn("PowerPlusWaterMarkObject1", header)
        self.assertIn("<wp:anchor>", header)
        self.assertIn('Target="header1.xml"', _read(out, "word/_rels/document.xml.rels"))
        self.assertIn("/word/header1.xml", _read(out, "[Content_Types].xml"))


class WriterSchemaFixTests(unittest.TestCase):
    ANCHOR = '<w:p><w:r><w:drawing><wp:anchor xmlns:wp="x" behindDoc="0">{wrap}<wp:docPr id="1" name="a"/></wp:anchor></w:drawing></w:r></w:p>'

    def test_bare_wrap_square_gets_required_wrap_text(self):
        out = patcher.postprocess_writer_schema_fixes(_docx(self.ANCHOR.format(wrap="<wp:wrapSquare/>")))
        self.assertIn('<wp:wrapSquare wrapText="bothSides"/>', _read(out, "word/document.xml"))

    def test_valid_document_is_unchanged(self):
        docx = _docx(self.ANCHOR.format(wrap='<wp:wrapSquare wrapText="left"/>'))
        self.assertEqual(patcher.postprocess_writer_schema_fixes(docx), docx)

    def test_anchor_restore_keeps_original_wrap_element_with_attributes(self):
        original = '<wp:anchor behindDoc="0"><wp:wrapSquare wrapText="largest"/></wp:anchor>'
        converted = '<wp:anchor behindDoc="1"><wp:wrapNone/></wp:anchor>'
        out = patcher._restore_writer_anchor_properties(converted, original)
        self.assertIn('<wp:wrapSquare wrapText="largest"/>', out)
        self.assertNotIn("<wp:wrapSquare/>", out)

    def test_anchor_restore_without_original_element_emits_valid_fallback(self):
        self.assertEqual(patcher._writer_valid_wrap_element("wrapSquare"), '<wp:wrapSquare wrapText="bothSides"/>')
        self.assertEqual(patcher._writer_valid_wrap_element("wrapNone"), "<wp:wrapNone/>")


class WriterStripMarkersTests(unittest.TestCase):
    def test_edit_markers_removed_with_their_ends_but_user_bookmarks_kept(self):
        body = ('<w:p><w:bookmarkStart w:id="3" w:name="vno-edited-1"/><w:bookmarkEnd w:id="3"/><w:r><w:t>A</w:t></w:r></w:p>'
                '<w:p><w:bookmarkStart w:id="4" w:name="dautrang1"/><w:bookmarkEnd w:id="4"/><w:bookmarkStart w:id="5" w:name="vno-untouched-2"/><w:r><w:t>B</w:t></w:r><w:bookmarkEnd w:id="5"/></w:p>')
        out = patcher.postprocess_writer_strip_markers(_docx(body))
        document = _read(out, "word/document.xml")
        self.assertNotIn("vno-edited-", document)
        self.assertNotIn("vno-untouched-", document)
        self.assertIn('w:name="dautrang1"', document)
        self.assertIn('<w:bookmarkEnd w:id="4"/>', document)
        self.assertNotIn('<w:bookmarkEnd w:id="3"/>', document)
        self.assertNotIn('<w:bookmarkEnd w:id="5"/>', document)

    def test_without_markers_nothing_changes(self):
        docx = _docx('<w:p><w:r><w:t>A</w:t></w:r></w:p>')
        self.assertEqual(patcher.postprocess_writer_strip_markers(docx), docx)


class WriterDropCapExportTests(unittest.TestCase):
    def test_drop_cap_letter_becomes_frame_paragraph(self):
        body = '<w:p><w:pPr><w:jc w:val="both"/></w:pPr><w:r><w:rPr><w:sz w:val="28"/></w:rPr><w:t>Dau doan van ban</w:t></w:r></w:p>'
        html = '<p><span class="vno-drop-cap" data-drop-lines="3">D</span>au doan van ban</p>'
        out = patcher.postprocess_writer_drop_caps(_docx(body), source_html=html)
        document = _read(out, "word/document.xml")
        self.assertIn('<w:framePr w:dropCap="drop" w:lines="3"', document)
        self.assertEqual(document.count("<w:p>") + document.count("<w:p "), 2)
        self.assertIn("<w:t>D</w:t>", document)
        self.assertIn("au doan van ban", document)
        self.assertNotIn(">Dau doan", document)
        self.assertIn('<w:sz w:val="105"/>', document, "cỡ chữ cái = cỡ thân x số dòng x 1,25")
        self.assertIn('<w:jc w:val="both"/>', document, "đoạn còn lại giữ định dạng")

    def test_without_drop_cap_nothing_changes(self):
        docx = _docx("<w:p><w:r><w:t>Dau</w:t></w:r></w:p>")
        self.assertEqual(patcher.postprocess_writer_drop_caps(docx, source_html="<p>Dau</p>"), docx)


class WriterMergeFieldExportTests(unittest.TestCase):
    def test_merge_field_text_becomes_mergefield(self):
        body = '<w:p><w:r><w:rPr><w:b/></w:rPr><w:t>Kính gửi: «HoTen» - «ChucVu»</w:t></w:r></w:p>'
        html = '<p>Kính gửi: <span class="vno-merge-field" data-field="HoTen">«HoTen»</span> <span class="vno-merge-field" data-field="ChucVu">«ChucVu»</span></p>'
        out = patcher.postprocess_writer_merge_fields(_docx(body), source_html=html)
        document = _read(out, "word/document.xml")
        self.assertIn('w:instr=" MERGEFIELD HoTen \\* MERGEFORMAT "', document)
        self.assertIn('w:instr=" MERGEFIELD ChucVu \\* MERGEFORMAT "', document)
        self.assertIn("Kính gửi: ", document)
        self.assertIn("<w:b/>", document)

    def test_unknown_guillemets_are_left_alone(self):
        body = "<w:p><w:r><w:t>«Khac» van ban</w:t></w:r></w:p>"
        html = '<span class="vno-merge-field" data-field="HoTen">«HoTen»</span>'
        out = patcher.postprocess_writer_merge_fields(_docx(body), source_html=html)
        self.assertNotIn("MERGEFIELD", _read(out, "word/document.xml"))

    def test_if_rules_export_word_operators_quotes_and_empty_values(self):
        html = ('<span data-merge-if="HoTen" data-op="equals" data-value="A &amp; &quot;B&quot;" data-then="Có &quot;""""" data-else="Không">fallback</span>'
                '<span data-merge-if="Ma" data-op="notEquals" data-value="x" data-then="Y" data-else="N">alt</span>'
                '<span data-merge-if="So" data-op="greaterThan" data-value="2" data-then="Y" data-else="N">gt</span>'
                '<span data-merge-if="So" data-op="lessThan" data-value="9" data-then="Y" data-else="N">lt</span>'
                '<span data-merge-if="DiaChi" data-op="empty" data-value="ignored" data-then="trống" data-else="có">empty</span>'
                '<span data-merge-if="DiaChi" data-op="notEmpty" data-value="ignored" data-then="có" data-else="trống">nonempty</span>')
        body = ''.join(f'<w:p><w:r><w:t>{word}</w:t></w:r></w:p>' for word in ('fallback','alt','gt','lt','empty','nonempty'))
        doc = _read(patcher.postprocess_writer_if_ref_fields(_docx(body), source_html=html), 'word/document.xml')
        self.assertEqual(doc.count('<w:instrText xml:space="preserve"> IF </w:instrText>'), 6)
        self.assertEqual(doc.count('> MERGEFIELD '), 6)
        self.assertNotIn('{ MERGEFIELD', doc)
        for part in (' = ', ' &lt;&gt; ', ' &gt; ', ' &lt; ', '&quot;&quot;'):
            self.assertIn(part, doc)
        self.assertIn('A &amp; \\&quot;B\\&quot;', doc)
        self.assertNotIn('<w:r><w:fldSimple', doc)

    def test_rule_fallback_can_be_embedded_in_run_text(self):
        body = '<w:p><w:r><w:rPr><w:i/></w:rPr><w:t>Before fallback after</w:t></w:r></w:p>'
        html = '<span data-merge-if="Flag" data-op="equals" data-value="Y" data-then="Yes" data-else="No">fallback</span>'
        doc = _read(patcher.postprocess_writer_if_ref_fields(_docx(body), source_html=html), 'word/document.xml')
        self.assertIn('Before', doc)
        self.assertIn('after', doc)
        self.assertIn('<w:i/>', doc)
        self.assertIn('<w:instrText xml:space="preserve"> MERGEFIELD Flag </w:instrText>', doc)

    def test_contains_rule_is_not_exported_because_word_wildcards_cannot_express_it(self):
        # Word that: IF "xxabcxx" = "*abc*" cho ket qua sai -> khong duoc xuat thanh truong IF gia.
        html = '<span data-merge-if="NoiDung" data-op="contains" data-value="abc" data-then="chua" data-else="khong chua">contains-result</span>'
        body = '<w:p><w:r><w:t>contains-result</w:t></w:r></w:p>'
        doc = _read(patcher.postprocess_writer_if_ref_fields(_docx(body), source_html=html), 'word/document.xml')
        self.assertIn('<w:t>contains-result</w:t>', doc)
        self.assertNotIn('MERGEFIELD', doc)
        self.assertNotIn('fldChar', doc)

    def test_if_field_nests_mergefield_as_complex_field_not_literal_braces(self):
        # Word that: dau ngoac { } viet trong instr la chu thuong -> ket qua hien "MERGEFIELD"; phai la truong phuc long nhau.
        html = '<span data-merge-if="City" data-op="equals" data-value="Hanoi" data-then="A" data-else="B">kq</span>'
        body = '<w:p><w:r><w:t>kq</w:t></w:r></w:p>'
        doc = _read(patcher.postprocess_writer_if_ref_fields(_docx(body), source_html=html), 'word/document.xml')
        self.assertNotIn('{', doc)
        self.assertEqual(doc.count('w:fldCharType="begin"'), 2)
        self.assertEqual(doc.count('w:fldCharType="end"'), 2)
        self.assertEqual(doc.count('w:fldCharType="separate"'), 2)
        self.assertLess(doc.index(' IF </w:instrText>'), doc.index(' MERGEFIELD City </w:instrText>'))
    def test_cross_reference_anchor_becomes_ref_hyperlink_field(self):
        body = '<w:p><w:bookmarkStart w:id="4" w:name="Heading_1"/><w:hyperlink w:anchor="Heading_1"><w:r><w:t>Mục 1</w:t></w:r></w:hyperlink></w:p>'
        html = '<a class="vno-cross-ref" data-xref-type="heading" href="#Heading_1">Mục 1</a>'
        doc = _read(patcher.postprocess_writer_if_ref_fields(_docx(body), source_html=html), 'word/document.xml')
        self.assertIn('w:instr=" REF Heading_1 \\h "', doc)
        self.assertNotIn('<w:hyperlink', doc)
        self.assertIn('w:name="Heading_1"', doc)


class WriterCaptionSeqTests(unittest.TestCase):
    def test_caption_number_becomes_seq_field(self):
        body = '<w:p><w:r><w:rPr><w:i/></w:rPr><w:t>Hình 1: Sơ đồ</w:t></w:r></w:p><w:p><w:r><w:t>Bảng 1: Số liệu</w:t></w:r></w:p>'
        html = ('<p><span class="vno-caption-label">Hình</span> <span class="vno-caption-number">1</span><span>: </span></p>'
                '<p><span class="vno-caption-label">Bảng</span> <span class="vno-caption-number">1</span></p>')
        out = patcher.postprocess_writer_captions(_docx(body), source_html=html)
        document = _read(out, "word/document.xml")
        self.assertIn('w:instr=" SEQ Hình \\* ARABIC "', document)
        self.assertIn('w:instr=" SEQ Bảng \\* ARABIC "', document)
        self.assertIn("Sơ đồ", document)
        self.assertIn("<w:i/>", document, "định dạng run gốc được giữ")

    def test_without_caption_markup_nothing_changes(self):
        docx = _docx("<w:p><w:r><w:t>Hình 1: x</w:t></w:r></w:p>")
        self.assertEqual(patcher.postprocess_writer_captions(docx, source_html="<p>Hình 1: x</p>"), docx)


if __name__ == "__main__":
    unittest.main()
