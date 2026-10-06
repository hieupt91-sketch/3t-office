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
