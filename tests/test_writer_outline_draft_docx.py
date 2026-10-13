"""WORD-W2 Unit tests for Outline view, Draft view, and Collapsible Headings DOCX patching."""

from __future__ import annotations

import io
import json
import os
import re
import shutil
import subprocess
import tempfile
import unittest
import zipfile
from pathlib import Path

from adapters.libreoffice.common.ooxml_zip_patch import (
    _writer_restore_created_paragraph_css,
    _writer_apply_view_mode_to_settings,
    postprocess_created_writer_docx,
    postprocess_writer_docx,
)


class WriterOutlineDraftDocxTests(unittest.TestCase):
    def test_paragraph_css_restores_outline_and_collapsed(self):
        doc_xml = (
            '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
            '<w:body>'
            '<w:p><w:pPr><w:jc w:val="left"/></w:pPr><w:r><w:t>Tiêu đề 1</w:t></w:r></w:p>'
            '<w:p><w:r><w:t>Nội dung thân</w:t></w:r></w:p>'
            '</w:body></w:document>'
        )
        source_html = '<h1 data-vno-collapsed="true">Tiêu đề 1</h1><p>Nội dung thân</p>'

        patched = _writer_restore_created_paragraph_css(doc_xml, source_html)
        self.assertIn('<w:outlineLvl w:val="0"/>', patched)
        self.assertIn('<w15:collapsed/>', patched)
        self.assertIn('xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml"', patched)

    def test_apply_view_mode_to_settings(self):
        settings_xml = (
            '<?xml version="1.0" encoding="UTF-8"?>'
            '<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
            '<w:zoom w:percent="100"/>'
            '</w:settings>'
        )
        html_outline = '<!--vno-view-mode:outline--><p>test</p>'
        settings_outline = _writer_apply_view_mode_to_settings(settings_xml, html_outline)
        self.assertIn('<w:view w:val="outline"/>', settings_outline)

        html_draft = '<!--vno-view-mode:draft--><p>test</p>'
        settings_draft = _writer_apply_view_mode_to_settings(settings_xml, html_draft)
        self.assertIn('<w:view w:val="normal"/>', settings_draft)

        html_print = '<!--vno-view-mode:printLayout--><p>test</p>'
        settings_print = _writer_apply_view_mode_to_settings(settings_xml, html_print)
        self.assertIn('<w:view w:val="print"/>', settings_print)

    def test_postprocess_created_docx_with_view_mode(self):
        buf = io.BytesIO()
        with zipfile.ZipFile(buf, "w") as z:
            z.writestr(
                "word/document.xml",
                '<w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
                '<w:body><w:p><w:r><w:t>Tiêu đề A</w:t></w:r></w:p></w:body></w:document>',
            )
            z.writestr(
                "word/settings.xml",
                '<w:settings xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">'
                '<w:zoom w:percent="100"/></w:settings>',
            )
        docx_bytes = buf.getvalue()
        source_html = '<!--vno-view-mode:outline--><h2 data-vno-collapsed="true">Tiêu đề A</h2>'

        patched_docx = postprocess_created_writer_docx(docx_bytes, source_html=source_html)
        with zipfile.ZipFile(io.BytesIO(patched_docx)) as z:
            doc_xml = z.read("word/document.xml").decode("utf-8")
            settings_xml = z.read("word/settings.xml").decode("utf-8")

        self.assertIn('<w:outlineLvl w:val="1"/>', doc_xml)
        self.assertIn('<w15:collapsed/>', doc_xml)
        self.assertIn('<w:view w:val="outline"/>', settings_xml)

    def test_word_com_outline_level_and_content_preservation(self):
        powershell = shutil.which("powershell.exe") or shutil.which("powershell")
        if not powershell:
            self.skipTest("BLOCKED: PowerShell is unavailable for Word COM check")

        import main
        api = main.VnOfficeApi()
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            doc_path = temp_path / "collapsed_test.docx"
            html = (
                '<h1 data-vno-collapsed="true">Chương 1: Mở đầu</h1>'
                '<p>Nội dung chi tiết chương 1 được thu gọn.</p>'
                '<h2>Mục 1.1: Khảo sát thực tế</h2>'
                '<p>Nội dung chi tiết mục khảo sát.</p>'
                '<h1>Chương 2: Kết luận</h1>'
                '<p>Nội dung kết luận tài liệu.</p>'
            )
            save_res = api.save_document_in_place(html, "writer", str(doc_path), None)
            self.assertEqual(save_res.get("status"), "ok")
            self.assertTrue(doc_path.exists())

            ps_script = temp_path / "verify_com.ps1"
            script_content = (
                "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8\n"
                "$ErrorActionPreference = 'Stop'\n"
                "$existing = @(Get-CimInstance Win32_Process -Filter \"Name='WINWORD.EXE'\" | ForEach-Object { [int]$_.ProcessId })\n"
                "$word = New-Object -ComObject Word.Application\n"
                "$word.Visible = $false; $word.DisplayAlerts = 0\n"
                "$wordPid = (Get-CimInstance Win32_Process -Filter \"Name='WINWORD.EXE'\" | Where-Object { $existing -notcontains $_.ProcessId } | Select-Object -First 1).ProcessId\n"
                "try {\n"
                "    $doc = $word.Documents.Open($args[0], $false, $true)\n"
                "    $paras = @()\n"
                "    for ($i = 1; $i -le $doc.Paragraphs.Count; $i++) {\n"
                "        $p = $doc.Paragraphs.Item($i)\n"
                "        $paras += [ordered]@{\n"
                "            outlineLevel = [int]$p.OutlineLevel\n"
                "            text = ($p.Range.Text -replace '[\\r\\a]', '').Trim()\n"
                "        }\n"
                "    }\n"
                "    $xml = $doc.WordOpenXML\n"
                "    $doc.Close(0)\n"
                "    [ordered]@{\n"
                "        paras = $paras\n"
                "        hasCollapsed = ($xml -match '<w15:collapsed')\n"
                "    } | ConvertTo-Json -Depth 5\n"
                "} finally {\n"
                "    if ($word) { $word.Quit(); [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($word) }\n"
                "    if ($wordPid) { Stop-Process -Id $wordPid -Force -ErrorAction SilentlyContinue }\n"
                "}\n"
            )
            ps_script.write_text(script_content, encoding="utf-8-sig")

            try:
                proc = subprocess.run(
                    [powershell, "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(ps_script), str(doc_path)],
                    capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=60, check=False
                )
            except (OSError, subprocess.TimeoutExpired) as exc:
                self.skipTest(f"BLOCKED: Word COM execution error: {exc}")

            if proc.returncode != 0:
                if re.search(r"80040154|class not registered|word.application.*not", proc.stderr, re.IGNORECASE):
                    self.skipTest("BLOCKED: Word.Application COM is not registered")
                self.fail(f"PowerShell Word COM failed (code {proc.returncode}): {proc.stderr}")

            result = json.loads(proc.stdout.strip())
            paras = result["paras"]
            self.assertEqual(len(paras), 6)
            self.assertEqual(paras[0]["outlineLevel"], 1)  # H1
            self.assertEqual(paras[0]["text"], "Chương 1: Mở đầu")
            self.assertEqual(paras[1]["outlineLevel"], 10)  # Body
            self.assertIn("Nội dung chi tiết chương 1", paras[1]["text"])
            self.assertEqual(paras[2]["outlineLevel"], 2)  # H2
            self.assertEqual(paras[2]["text"], "Mục 1.1: Khảo sát thực tế")
            self.assertEqual(paras[3]["outlineLevel"], 10)  # Body
            self.assertIn("Nội dung chi tiết mục khảo sát", paras[3]["text"])
            self.assertEqual(paras[4]["outlineLevel"], 1)  # H1
            self.assertEqual(paras[4]["text"], "Chương 2: Kết luận")
            self.assertEqual(paras[5]["outlineLevel"], 10)  # Body
            self.assertIn("Nội dung kết luận tài liệu", paras[5]["text"])
            self.assertTrue(result["hasCollapsed"])

    def test_word_com_view_type_in_wordopenxml(self):
        powershell = shutil.which("powershell.exe") or shutil.which("powershell")
        if not powershell:
            self.skipTest("BLOCKED: PowerShell is unavailable for Word COM check")

        import main
        api = main.VnOfficeApi()
        with tempfile.TemporaryDirectory() as temp_dir:
            temp_path = Path(temp_dir)
            outline_path = temp_path / "outline_view.docx"
            draft_path = temp_path / "draft_view.docx"

            api.save_document_in_place('<!--vno-view-mode:outline--><h1>Tiêu đề Dàn bài</h1><p>Đoạn 1</p>', 'writer', str(outline_path), None)
            api.save_document_in_place('<!--vno-view-mode:draft--><h1>Tiêu đề Bản nháp</h1><p>Đoạn 1</p>', 'writer', str(draft_path), None)

            ps_script = temp_path / "verify_views.ps1"
            script_content = (
                "[Console]::OutputEncoding = [System.Text.Encoding]::UTF8\n"
                "$ErrorActionPreference = 'Stop'\n"
                "$existing = @(Get-CimInstance Win32_Process -Filter \"Name='WINWORD.EXE'\" | ForEach-Object { [int]$_.ProcessId })\n"
                "$word = New-Object -ComObject Word.Application\n"
                "$word.Visible = $false; $word.DisplayAlerts = 0\n"
                "$wordPid = (Get-CimInstance Win32_Process -Filter \"Name='WINWORD.EXE'\" | Where-Object { $existing -notcontains $_.ProcessId } | Select-Object -First 1).ProcessId\n"
                "try {\n"
                "    $docOutline = $word.Documents.Open($args[0], $false, $true)\n"
                "    $xmlOutline = $docOutline.WordOpenXML\n"
                "    $docOutline.Close(0)\n"
                "    $docDraft = $word.Documents.Open($args[1], $false, $true)\n"
                "    $xmlDraft = $docDraft.WordOpenXML\n"
                "    $docDraft.Close(0)\n"
                "    [ordered]@{\n"
                "        outlineHasViewOutline = ($xmlOutline -match '<w:view\\s+w:val=\"outline\"')\n"
                "        draftHasViewNormal = ($xmlDraft -match '<w:view\\s+w:val=\"normal\"')\n"
                "    } | ConvertTo-Json\n"
                "} finally {\n"
                "    if ($word) { $word.Quit(); [void][System.Runtime.InteropServices.Marshal]::FinalReleaseComObject($word) }\n"
                "    if ($wordPid) { Stop-Process -Id $wordPid -Force -ErrorAction SilentlyContinue }\n"
                "}\n"
            )
            ps_script.write_text(script_content, encoding="utf-8-sig")

            try:
                proc = subprocess.run(
                    [powershell, "-NoProfile", "-ExecutionPolicy", "Bypass", "-File", str(ps_script), str(outline_path), str(draft_path)],
                    capture_output=True, text=True, encoding="utf-8", errors="replace", timeout=60, check=False
                )
            except (OSError, subprocess.TimeoutExpired) as exc:
                self.skipTest(f"BLOCKED: Word COM execution error: {exc}")

            if proc.returncode != 0:
                if re.search(r"80040154|class not registered|word.application.*not", proc.stderr, re.IGNORECASE):
                    self.skipTest("BLOCKED: Word.Application COM is not registered")
                self.fail(f"PowerShell Word COM failed: {proc.stderr}")

            result = json.loads(proc.stdout.strip())
            self.assertTrue(result["outlineHasViewOutline"])
            self.assertTrue(result["draftHasViewNormal"])


if __name__ == "__main__":
    unittest.main()
