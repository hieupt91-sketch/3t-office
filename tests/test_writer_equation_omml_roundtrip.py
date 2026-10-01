"""Generated-file regressions for 3T Doc equation import and DOCX export."""

from __future__ import annotations

import html
import json
import re
import shutil
import subprocess
import tempfile
import unittest
import zipfile
from pathlib import Path
import xml.etree.ElementTree as ET

import main


WORD_NS = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
MATH_NS = "http://schemas.openxmlformats.org/officeDocument/2006/math"
NS = {"w": WORD_NS, "m": MATH_NS}


FRACTION = (
    "<m:oMath><m:f><m:fPr/><m:num><m:r><m:t>a</m:t></m:r></m:num>"
    "<m:den><m:r><m:t>b</m:t></m:r></m:den></m:f></m:oMath>"
)
SQUARE_ROOT = (
    "<m:oMathPara><m:oMath><m:rad><m:radPr><m:degHide m:val=\"1\"/></m:radPr>"
    "<m:deg/><m:e><m:r><m:t>x</m:t></m:r></m:e></m:rad></m:oMath></m:oMathPara>"
)


def make_docx(path: Path, paragraph_xml: str) -> None:
    document = (
        '<w:document xmlns:w="' + WORD_NS + '" xmlns:m="' + MATH_NS + '">'
        "<w:body><w:p>" + paragraph_xml + "</w:p><w:sectPr/></w:body></w:document>"
    )
    entries = {
        "[Content_Types].xml": (
            '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
            '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
            '<Default Extension="xml" ContentType="application/xml"/>'
            '<Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>'
            "</Types>"
        ),
        "_rels/.rels": (
            '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
            '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>'
            "</Relationships>"
        ),
        "word/document.xml": document,
    }
    with zipfile.ZipFile(path, "w", zipfile.ZIP_DEFLATED) as package:
        for name, content in entries.items():
            package.writestr(name, content)


def paragraph_with_two_equations() -> str:
    return (
        "<w:r><w:t>Before text</w:t></w:r>"
        + FRACTION
        + "<w:r><w:t xml:space=\"preserve\"> middle text </w:t></w:r>"
        + SQUARE_ROOT
        + "<w:r><w:t xml:space=\"preserve\"> after text</w:t></w:r>"
    )


def to_export_markers(open_html: str) -> str:
    equation_re = re.compile(
        r'<span\b(?=[^>]*\bclass=["\'][^"\']*\bvno-equation\b[^"\']*["\'])'
        r'([^>]*)>[\s\S]*?</span\s*>',
        re.IGNORECASE,
    )
    attr_re = re.compile(r"\b([a-z][\w:-]*)\s*=\s*([\"'])(.*?)\2", re.IGNORECASE | re.DOTALL)
    count = 0

    def replace(match: re.Match[str]) -> str:
        nonlocal count
        attrs = {name.lower(): html.unescape(value) for name, _quote, value in attr_re.findall(match.group(1))}
        if attrs.get("data-vno-equation") != "true":
            return match.group(0)
        count += 1
        equation_id = attrs["data-vno-equation-id"]
        safe_id = re.sub(r"[^A-Za-z0-9]", "", equation_id).upper()
        token = "VNOEQ" + safe_id + "MARKER"
        original = attrs.get("data-vno-equation-original-omml", "")
        mathml = attrs.get("data-vno-equation-mathml", "")
        block = ' data-vno-equation-display="block"' if attrs.get("data-vno-equation-display") == "block" else ""
        return (
            '<span class="vno-equation-export" style="font-family: Cambria Math;"'
            ' data-vno-equation-export="true" data-vno-equation-id="' + html.escape(equation_id, quote=True) + '"'
            ' data-vno-equation-original-omml="' + html.escape(original, quote=True) + '"'
            ' data-vno-equation-mathml="' + html.escape(mathml, quote=True) + '"' + block + ">"
            + token + "</span>"
        )

    result = equation_re.sub(replace, open_html)
    if count == 0:
        raise AssertionError("The app's opened HTML did not contain imported equation spans")
    return result


def open_and_save_through_app(source: Path, temp_dir: Path) -> tuple[dict, Path]:
    opened = main.VnOfficeApi(app_kind="writer", initial_file=str(source))._open_document_dialog_impl("writer")
    if opened.get("status") != "ok":
        raise AssertionError("3T Doc open pipeline failed: " + str(opened))
    source_html = to_export_markers(opened.get("content") or "")
    interchange = main._write_save_source(source_html, "writer", str(temp_dir), "docx")
    saved = Path(main._convert_save_source_to_native(
        interchange, "writer", "docx", source_document_path=str(source)
    ))
    return opened, saved


def insert_equation_in_new_3t_doc() -> str:
    node = shutil.which("node.exe") or shutil.which("node")
    if not node:
        raise AssertionError("Node.js is required to exercise 3T Doc's insertEquation path")
    script = r'''import { WriterAdapter } from "./adapters/libreoffice/writer/writer-adapter.js";
const body = { innerHTML: "<p></p>", innerText: "", style: {}, dataset: {}, focus() {}, contains() { return true; }, querySelector() { return null; }, querySelectorAll() { return []; } };
const page = { style: {}, dataset: {}, querySelector(selector) { return selector === ".vno-writer-body" ? body : null; }, querySelectorAll(selector) { return selector === ".vno-writer-body" ? [body] : []; } };
const adapter = new WriterAdapter(page);
await adapter.insertEquation({ linear: "x^2" });
process.stdout.write(JSON.stringify(body.innerHTML));'''
    result = subprocess.run(
        [node, "--input-type=module", "-e", script],
        capture_output=True, text=True, timeout=30, check=False,
        cwd=Path(__file__).resolve().parents[1],
    )
    if result.returncode != 0:
        raise AssertionError("3T Doc equation insertion failed: " + (result.stderr or result.stdout)[-1500:])
    return json.loads(result.stdout)


class WriterEquationMathMlTests(unittest.TestCase):
    def test_mathml_structures_map_to_editable_omml(self):
        patcher = main._ooxml_zip_patch()
        cases = [
            ("fraction", '<mfrac><mi>a</mi><mi>b</mi></mfrac>', "<m:f>"),
            ("superscript", "<msup><mi>x</mi><mn>2</mn></msup>", "<m:sSup>"),
            ("subscript", "<msub><mi>x</mi><mn>1</mn></msub>", "<m:sSub>"),
            ("square root", "<msqrt><mi>x</mi></msqrt>", "<m:rad>"),
            ("nth root", "<mroot><mi>x</mi><mn>3</mn></mroot>", "<m:rad>"),
            ("integral", '<munder><mo largeop="true">∫</mo><mi>0</mi></munder>', "<m:nary>"),
            ("sum", '<munderover><mo largeop="true">∑</mo><mi>i</mi><mi>n</mi></munderover>', "<m:nary>"),
            ("product", '<munderover><mo largeop="true">∏</mo><mi>i</mi><mi>n</mi></munderover>', "<m:nary>"),
            ("brackets", '<mfenced open="(" close=")"><mi>x</mi></mfenced>', "<m:d>"),
            ("2x2 matrix", '<mfenced open="[" close="]"><mtable><mtr><mtd><mn>1</mn></mtd><mtd><mn>2</mn></mtd></mtr><mtr><mtd><mn>3</mn></mtd><mtd><mn>4</mn></mtd></mtr></mtable></mfenced>', "<m:m>"),
            ("3x3 matrix", '<mfenced open="[" close="]"><mtable><mtr><mtd><mn>1</mn></mtd><mtd><mn>2</mn></mtd><mtd><mn>3</mn></mtd></mtr><mtr><mtd><mn>4</mn></mtd><mtd><mn>5</mn></mtd><mtd><mn>6</mn></mtd></mtr><mtr><mtd><mn>7</mn></mtd><mtd><mn>8</mn></mtd><mtd><mn>9</mn></mtd></mtr></mtable></mfenced>', "<m:m>"),
            ("Greek and common symbols", "<mrow><mi>α</mi><mo>≤</mo><mo>∞</mo></mrow>", "<m:r>"),
        ]
        for label, body, expected in cases:
            with self.subTest(structure=label):
                mathml = '<math xmlns="http://www.w3.org/1998/Math/MathML">' + body + "</math>"
                omml = patcher._writer_mathml_to_omml(mathml)
                self.assertIn(expected, omml)
                self.assertIsNotNone(ET.fromstring('<root xmlns:m="' + MATH_NS + '">' + omml + "</root>"))


class WriterEquationDocxRoundTripTests(unittest.TestCase):
    def test_open_save_keeps_fraction_and_square_root_in_their_original_paragraph(self):
        with tempfile.TemporaryDirectory(prefix="vno_writer_equations_") as directory:
            temp_dir = Path(directory)
            source = temp_dir / "source.docx"
            make_docx(source, paragraph_with_two_equations())
            opened, saved = open_and_save_through_app(source, temp_dir)

            self.assertEqual(opened.get("content", "").count('class="vno-equation"'), 2)
            self.assertIn("Before text", opened["content"])
            self.assertIn("middle text", opened["content"])
            self.assertIn("after text", opened["content"])

            with zipfile.ZipFile(source) as source_zip, zipfile.ZipFile(saved) as saved_zip:
                source_xml = source_zip.read("word/document.xml").decode("utf-8")
                saved_xml = saved_zip.read("word/document.xml").decode("utf-8")
            root = ET.fromstring(saved_xml)
            paragraphs = root.findall(".//w:body/w:p", NS)
            self.assertEqual(len(paragraphs), 1, "both equations and all surrounding text must stay in the source paragraph")
            paragraph_match = re.search(r"<w:p\b[^>]*>[\s\S]*?</w:p\s*>", saved_xml, re.IGNORECASE)
            self.assertIsNotNone(paragraph_match, "saved DOCX must contain the paragraph XML")
            paragraph = paragraph_match.group(0)
            ordered_parts = [
                paragraph.find("Before text"),
                paragraph.find("<m:f>"),
                paragraph.find("middle text"),
                paragraph.find("<m:rad>"),
                paragraph.find("after text"),
            ]
            self.assertTrue(all(position >= 0 for position in ordered_parts), "surrounding text and OMML must all remain in the paragraph")
            self.assertEqual(ordered_parts, sorted(ordered_parts), "OMML must remain between the same surrounding text runs")
            self.assertEqual(len(root.findall(".//m:f", NS)), 1)
            self.assertEqual(len(root.findall(".//m:rad", NS)), 1)
            self.assertIn(FRACTION, saved_xml, "untouched fraction OMML should be restored unchanged")
            self.assertIn(SQUARE_ROOT, saved_xml, "untouched display-root OMML should be restored unchanged")
            self.assertIn("Before text", source_xml)

    def test_new_document_saves_one_word_editable_equation(self):
        with tempfile.TemporaryDirectory(prefix="vno_new_writer_equation_") as directory:
            temp_dir = Path(directory)
            target = temp_dir / "new-equation.docx"
            inserted_html = insert_equation_in_new_3t_doc()
            self.assertIn('class="vno-equation"', inserted_html)
            source_html = to_export_markers(inserted_html)
            interchange = main._write_save_source(source_html, "writer", str(temp_dir), "docx")
            saved = Path(main._convert_save_source_to_native(interchange, "writer", "docx"))
            shutil.copyfile(saved, target)
            with zipfile.ZipFile(target) as package:
                document_xml = package.read("word/document.xml").decode("utf-8")
            self.assertEqual(document_xml.count("<m:oMath>"), 1)

            powershell = shutil.which("powershell.exe") or shutil.which("powershell")
            if not powershell:
                self.skipTest("BLOCKED: PowerShell is unavailable for the requested Microsoft Word COM check")
            script = temp_dir / "word_omath_count.ps1"
            script.write_text(
                "param([string]$DocumentPath)\n"
                "$word = $null; $doc = $null\n"
                "try {\n"
                "  $word = New-Object -ComObject Word.Application\n"
                "  $word.Visible = $false; $word.DisplayAlerts = 0\n"
                "  for ($attempt = 0; $attempt -lt 20 -and $null -eq $doc; $attempt++) {\n"
                "    try { $doc = $word.Documents.Open($DocumentPath, $false, $true) }\n"
                "    catch { if ($_.Exception.HResult -eq -2147418111) { Start-Sleep -Milliseconds 300 } else { throw } }\n"
                "  }\n"
                "  if ($null -eq $doc) { throw 'Word did not accept the open request after RPC_E_CALL_REJECTED retries.' }\n"
                "  for ($attempt = 0; $attempt -lt 20; $attempt++) {\n"
                "    try { $count = $doc.OMaths.Count; break }\n"
                "    catch { if ($_.Exception.HResult -eq -2147418111) { Start-Sleep -Milliseconds 300 } else { throw } }\n"
                "  }\n"
                "  Write-Output ('OMathCount=' + $count)\n"
                "  if ($count -ne 1) { exit 2 }\n"
                "} finally { if ($null -ne $doc) { $doc.Close(0) }; if ($null -ne $word) { $word.Quit() } }\n",
                encoding="utf-8",
            )
            try:
                result = subprocess.run(
                    [powershell, "-NoProfile", "-NonInteractive", "-ExecutionPolicy", "Bypass", "-File", str(script), str(target)],
                    capture_output=True, text=True, timeout=90, check=False,
                )
            except (OSError, subprocess.TimeoutExpired) as error:
                self.skipTest("BLOCKED: Microsoft Word COM could not be contacted: " + str(error))
            output = (result.stdout or "") + "\n" + (result.stderr or "")
            if result.returncode != 0 and re.search(r"80040154|class not registered|cannot create activex|word.application.*not", output, re.IGNORECASE):
                self.skipTest("BLOCKED: Microsoft Word COM is unavailable: " + output.strip()[-500:])
            self.assertEqual(result.returncode, 0, "Word COM open/count failed: " + output[-1500:])
            self.assertRegex(output, r"OMathCount=1\b")


if __name__ == "__main__":
    unittest.main()
