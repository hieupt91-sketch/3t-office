import io
import json
import re
import urllib.parse
import zipfile

from adapters.libreoffice.common import ooxml_zip_patch as patcher


def _docx(document_xml: str, numbering_xml: str) -> bytes:
    out = io.BytesIO()
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as package:
        package.writestr("word/document.xml", document_xml)
        package.writestr("word/numbering.xml", numbering_xml)
    return out.getvalue()


class TestWriterMultilevelDefinition:
    def test_custom_list_writes_nine_levels_and_paragraph_level_ids(self):
        levels = []
        for index in range(9):
            levels.append({
                "format": "lowerLetter" if index == 2 else "decimal",
                "prefix": "Điều " if index == 0 else "",
                "suffix": ")" if index == 2 else ".",
                "start": index + 1,
                "numberCm": 0.63 * index,
                "textCm": 0.63 * (index + 1),
                "suffixType": "space" if index == 2 else "tab",
                "includeParents": index == 1,
            })
        encoded = urllib.parse.quote(json.dumps(levels, ensure_ascii=False, separators=(",", ":")))
        source_html = (
            f'<ol class="vno-ml-custom" data-vno-multilevel-config="{encoded}"><li>Điều một'
            "<ol><li>Khoản một<ol><li>Điểm a</li></ol></li></ol></li></ol>"
        )
        document = (
            '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>'
            '<w:p><w:r><w:t>Điều một</w:t></w:r></w:p>'
            '<w:p><w:r><w:t>Khoản một</w:t></w:r></w:p>'
            '<w:p><w:r><w:t>Điểm a</w:t></w:r></w:p>'
            "</w:body></w:document>"
        )
        numbering = (
            '<w:numbering xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
            '<w:abstractNum w:abstractNumId="0"><w:multiLevelType w:val="multilevel"/></w:abstractNum>'
            '<w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>'
        )
        result = patcher.postprocess_writer_run_effects(_docx(document, numbering), source_html=source_html)
        result_document = patcher.read_zip_entry(result, "word/document.xml").decode("utf-8")
        result_numbering = patcher.read_zip_entry(result, "word/numbering.xml").decode("utf-8")
        assert '<w:multiLevelType w:val="multilevel"/>' in result_numbering
        assert result_numbering.count("<w:lvl ") == 9
        assert '<w:lvlText w:val="Điều %1."/>' in result_numbering
        assert '<w:lvlText w:val="%1.%2."/>' in result_numbering
        assert '<w:numFmt w:val="lowerLetter"/>' in result_numbering
        assert '<w:suff w:val="space"/>' in result_numbering
        assert not re.search(r"%\d+<w:num", result_numbering), "generated w:num elements must stay inside w:numbering without counter-token leakage"
        assert '<w:ilvl w:val="2"/><w:numId w:val="2"/>' in result_document

    def test_custom_list_without_matching_paragraph_is_unchanged(self):
        levels = [{"format": "decimal"}] * 9
        encoded = urllib.parse.quote(json.dumps(levels))
        source_html = f'<ol data-vno-multilevel-config="{encoded}"><li>Không khớp</li></ol>'
        document = '<w:document><w:body><w:p><w:r><w:t>Khác</w:t></w:r></w:p></w:body></w:document>'
        numbering = '<w:numbering><w:num w:numId="1"><w:abstractNumId w:val="0"/></w:num></w:numbering>'
        original = _docx(document, numbering)
        assert patcher.postprocess_writer_run_effects(original, source_html=source_html) == original

