import importlib.util
import io
import re
import tempfile
import unittest
import zipfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
PATCHER_PATH = ROOT / "adapters" / "libreoffice" / "common" / "ooxml_zip_patch.py"
SPEC = importlib.util.spec_from_file_location("vno_ooxml_zip_patch", PATCHER_PATH)
PATCHER = importlib.util.module_from_spec(SPEC)
assert SPEC and SPEC.loader
SPEC.loader.exec_module(PATCHER)

W_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"


def _paragraph(text: str, num_id: int) -> str:
    return (
        f'<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/><w:numId w:val="{num_id}"/>'
        f'</w:numPr></w:pPr><w:r><w:t>{text}</w:t></w:r></w:p>'
    )


def _numbering(definitions: list[tuple[int, str, str]]) -> str:
    abstracts = "".join(
        f'<w:abstractNum w:abstractNumId="{num_id}"><w:lvl w:ilvl="0"><w:start w:val="1"/>'
        f'<w:numFmt w:val="{num_fmt}"/><w:lvlText w:val="{lvl_text}"/></w:lvl></w:abstractNum>'
        for num_id, num_fmt, lvl_text in definitions
    )
    nums = "".join(
        f'<w:num w:numId="{num_id}"><w:abstractNumId w:val="{num_id}"/></w:num>'
        for num_id, _num_fmt, _lvl_text in definitions
    )
    return f'<?xml version="1.0" encoding="UTF-8"?><w:numbering xmlns:w="{W_NS}">{abstracts}{nums}</w:numbering>'


def _docx(paragraphs: list[tuple[str, int]], numbering_xml: str) -> bytes:
    document_xml = (
        f'<?xml version="1.0" encoding="UTF-8"?><w:document xmlns:w="{W_NS}"><w:body>'
        + "".join(_paragraph(text, num_id) for text, num_id in paragraphs)
        + "</w:body></w:document>"
    )
    content_types = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
        '<Default Extension="xml" ContentType="application/xml"/>'
        '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
        '<Override PartName="/word/numbering.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.numbering+xml"/>'
        '</Types>'
    )
    root_rels = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
        '</Relationships>'
    )
    document_rels = (
        '<?xml version="1.0" encoding="UTF-8"?>'
        '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
        '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/numbering" Target="numbering.xml"/>'
        '</Relationships>'
    )
    output = io.BytesIO()
    with zipfile.ZipFile(output, "w", zipfile.ZIP_DEFLATED) as package:
        package.writestr("[Content_Types].xml", content_types)
        package.writestr("_rels/.rels", root_rels)
        package.writestr("word/document.xml", document_xml)
        package.writestr("word/numbering.xml", numbering_xml)
        package.writestr("word/_rels/document.xml.rels", document_rels)
    return output.getvalue()


def _resolved_markers(docx_bytes: bytes) -> dict[str, tuple[str, str]]:
    document_xml = PATCHER.read_zip_entry(docx_bytes, "word/document.xml").decode("utf-8")
    numbering_xml = PATCHER.read_zip_entry(docx_bytes, "word/numbering.xml").decode("utf-8")
    abstracts = {}
    for match in re.finditer(r'<w:abstractNum\b[^>]*w:abstractNumId="(\d+)"[^>]*>([\s\S]*?)</w:abstractNum>', numbering_xml):
        num_fmt = re.search(r'<w:numFmt\b[^>]*w:val="([^"]+)"', match.group(2))
        lvl_text = re.search(r'<w:lvlText\b[^>]*w:val="([^"]*)"', match.group(2))
        abstracts[match.group(1)] = (num_fmt.group(1), lvl_text.group(1))
    nums = {
        match.group(1): match.group(2)
        for match in re.finditer(
            r'<w:num\b[^>]*w:numId="(\d+)"[^>]*>[\s\S]*?<w:abstractNumId\b[^>]*w:val="(\d+)"[\s\S]*?</w:num>',
            numbering_xml,
        )
    }
    result = {}
    for paragraph in re.findall(r'<w:p\b[^>]*>[\s\S]*?</w:p>', document_xml):
        text = "".join(re.findall(r'<w:t\b[^>]*>([^<]*)</w:t>', paragraph))
        num_id = re.search(r'<w:numId\b[^>]*w:val="(\d+)"', paragraph)
        if text and num_id:
            result[text] = abstracts[nums[num_id.group(1)]]
    return result


class WriterListNumberingRoundTripTests(unittest.TestCase):
    def test_self_created_docx_keeps_letter_roman_decimal_and_bullet(self):
        letter = [(f"Chu cai {value}", 1) for value in ("a", "b", "c")]
        roman = [(f"La Ma {value}", 2) for value in ("i", "ii", "iii")]
        decimal = [(f"So {value}", 3) for value in ("1", "2", "3")]
        bullet = [("Gach dau dong", 4)]
        source_numbering = _numbering([
            (1, "lowerLetter", "%1)"),
            (2, "lowerRoman", "%1."),
            (3, "decimal", "%1."),
            (4, "bullet", "•"),
        ])
        source_docx = _docx(letter + roman + decimal + bullet, source_numbering)

        # Mô phỏng đầu ra HTML->DOCX của LibreOffice: cả ba danh sách số bị dồn về decimal.
        converted_numbering = _numbering([(10, "decimal", "%1."), (11, "bullet", "•")])
        converted_docx = _docx(
            [(text, 10) for text, _num_id in letter + roman + decimal]
            + [(text, 11) for text, _num_id in bullet],
            converted_numbering,
        )

        def html_list(items, num_fmt, lvl_text):
            lis = "".join(
                f'<li style="list-style-type: decimal;" data-vno-list-num-fmt="{num_fmt}" '
                f'data-vno-list-lvl-text="{lvl_text}">{text}</li>'
                for text, _num_id in items
            )
            return f"<ol>{lis}</ol>"

        source_html = (
            html_list(letter, "lowerLetter", "%1)")
            + html_list(roman, "lowerRoman", "%1.")
            + html_list(decimal, "decimal", "%1.")
            + "<ul><li>Gach dau dong</li></ul>"
        )

        with tempfile.TemporaryDirectory(prefix="vno-numbering-") as temp_dir:
            input_path = Path(temp_dir) / "tu-tao-numbering.docx"
            input_path.write_bytes(source_docx)
            self.assertEqual(_resolved_markers(input_path.read_bytes())["Chu cai a"], ("lowerLetter", "%1)"))

        created = PATCHER.postprocess_created_writer_docx(converted_docx, source_html=source_html)
        saved = PATCHER.postprocess_writer_docx(
            created,
            source_docx=source_docx,
            source_html=source_html,
            preserve_pristine_source=False,
        )
        markers = _resolved_markers(saved)
        for text, _num_id in letter:
            self.assertEqual(markers[text], ("lowerLetter", "%1)"))
        for text, _num_id in roman:
            self.assertEqual(markers[text], ("lowerRoman", "%1."))
        for text, _num_id in decimal:
            self.assertEqual(markers[text], ("decimal", "%1."))
        self.assertEqual(markers["Gach dau dong"], ("bullet", "•"))


if __name__ == "__main__":
    unittest.main()
