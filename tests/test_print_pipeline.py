import importlib.util
import json
import subprocess
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory


ROOT = Path(__file__).resolve().parents[1]
PIPELINE_PATH = ROOT / "platform" / "print" / "print_pipeline.py"
SPEC = importlib.util.spec_from_file_location("vno_print_pipeline_test", PIPELINE_PATH)
PIPELINE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(PIPELINE)


class PrintPipelineTests(unittest.TestCase):
    def make_pipeline(self, fake_printer_command, *, office_candidates=None, convert_office_pdf=None):
        self.written_source_paths = []

        def write_source(content, app_kind, temp_dir, source_path=None):
            self.written_source_paths.append(source_path)
            path = Path(temp_dir) / f"draft.{app_kind}"
            path.write_text(content, encoding="utf-8")
            return str(path)

        def convert_pdf(source_path, app_kind, output_dir):
            output = Path(output_dir) / "draft.pdf"
            output.write_bytes(b"fake pdf document")
            return str(output)

        def inspect_pdf(app_kind, pdf_path):
            self.assertTrue(Path(pdf_path).is_file())
            return 6

        def render_page(app_kind, pdf_path, page_index, output_path):
            Path(output_path).write_bytes(f"png-page-{page_index + 1}".encode("ascii"))

        return PIPELINE.PrintPipeline(
            write_source=write_source,
            convert_pdf=convert_pdf,
            office_candidates=office_candidates,
            convert_office_pdf=convert_office_pdf,
            inspect_pdf=inspect_pdf,
            render_page=render_page,
            print_pdf=fake_printer_command,
        )

    def test_pipeline_prepares_pdf_preview_and_sends_requested_range_to_fake_printer(self):
        commands = []

        def fake_printer_command(app_kind, pdf_path, printer, copies, pages, output_path):
            commands.append((app_kind, pdf_path, printer, copies, pages, output_path))
            return {"ok": True}

        pipeline = self.make_pipeline(fake_printer_command)
        prepared = pipeline.prepare("writer", "<p>Xin chào</p>", "CongVan.docx", "C:/Docs/goc.docx")
        self.assertEqual(prepared["status"], "ok")
        self.assertEqual(prepared["pageCount"], 6)
        self.assertEqual(self.written_source_paths, ["C:/Docs/goc.docx"])

        page = pipeline.preview_page(prepared["sessionId"], 2)
        self.assertEqual(page["status"], "ok")
        self.assertTrue(page["dataUrl"].startswith("data:image/png;base64,"))

        printed = pipeline.print_document(
            prepared["sessionId"], "Máy in LAN", 2, "5,1-3", "C:/Temp/ket-qua.pdf"
        )
        self.assertEqual(printed["status"], "ok")
        self.assertEqual(printed["path"], "C:/Temp/ket-qua.pdf")
        self.assertEqual(commands[0][0], "writer")
        self.assertEqual(commands[0][2:], ("Máy in LAN", 2, "1-3,5", "C:/Temp/ket-qua.pdf"))
        temp_dir = Path(commands[0][1]).parent
        self.assertTrue(temp_dir.is_dir())
        self.assertTrue(pipeline.cancel(prepared["sessionId"]))
        self.assertFalse(temp_dir.exists())

    def test_pipeline_reports_libreoffice_when_office_is_not_installed(self):
        office_calls = []
        pipeline = self.make_pipeline(
            lambda *args: {"ok": True},
            office_candidates=lambda _kind: (),
            convert_office_pdf=lambda *args: office_calls.append(args),
        )
        prepared = pipeline.prepare("writer", "<p>Offline fallback</p>", "Draft.docx")
        self.assertEqual(prepared["status"], "ok")
        self.assertEqual(prepared["engine"], "LibreOffice")
        self.assertEqual(pipeline.engine_status("writer")["officeAvailable"], False)
        self.assertEqual(office_calls, [])
        pipeline.cancel(prepared["sessionId"])

    def test_pipeline_uses_office_pdf_and_respects_unchecked_fallback_option(self):
        office_calls = []

        def office_pdf(source, app_kind, output_dir, provider):
            office_calls.append((source, app_kind, provider["engine"]))
            path = Path(output_dir) / "draft.pdf"
            path.write_bytes(b"office-pdf")
            return str(path)

        providers = ({"engine": "Microsoft Office", "progid": "Word.Application"},)
        pipeline = self.make_pipeline(
            lambda *args: {"ok": True},
            office_candidates=lambda _kind: providers,
            convert_office_pdf=office_pdf,
        )
        prepared = pipeline.prepare("writer", "<p>Office render</p>", "Draft.docx")
        self.assertEqual(prepared["engine"], "Microsoft Office")
        self.assertEqual(pipeline.engine_status("writer")["preferredEngine"], "Microsoft Office")
        self.assertEqual(len(office_calls), 1)
        pipeline.cancel(prepared["sessionId"])

        prepared = pipeline.prepare("writer", "<p>Force LibreOffice</p>", "Draft.docx", use_office=False)
        self.assertEqual(prepared["engine"], "LibreOffice")
        self.assertEqual(len(office_calls), 1)
        pipeline.cancel(prepared["sessionId"])

    def test_pipeline_returns_clear_fake_printer_failure(self):
        pipeline = self.make_pipeline(lambda *args: {"ok": False, "error": "Máy in đang ngoại tuyến"})
        prepared = pipeline.prepare("sheet", "<fods/>", "BaoCao.xlsx")
        result = pipeline.print_document(prepared["sessionId"], "Máy in LAN", 1, "all")
        self.assertEqual(result["status"], "error")
        self.assertIn("Máy in 'Máy in LAN' không in được", result["message"])
        self.assertIn("ngoại tuyến", result["message"])
        pipeline.cancel(prepared["sessionId"])

    def test_pipeline_rejects_bad_range_before_calling_printer(self):
        calls = []
        pipeline = self.make_pipeline(lambda *args: calls.append(args) or {"ok": True})
        prepared = pipeline.prepare("slides", "<presentation/>", "BaiGiang.pptx")
        result = pipeline.print_document(prepared["sessionId"], "Microsoft Print to PDF", 1, "6-2")
        self.assertEqual(result["status"], "error")
        self.assertIn("Phạm vi trang không hợp lệ", result["message"])
        self.assertEqual(calls, [])
        pipeline.cancel(prepared["sessionId"])

    def test_page_range_validation_and_default_printer(self):
        self.assertEqual(PIPELINE.parse_page_range("4, 1-2,3,6", 6), "1-4,6")
        self.assertEqual(PIPELINE.parse_page_range("Tất cả", 6), "")
        self.assertEqual(
            PIPELINE.select_default_printer([
                {"name": "Máy in A", "isDefault": False},
                {"name": "Microsoft Print to PDF", "isDefault": True},
            ]),
            "Microsoft Print to PDF",
        )
        with self.assertRaisesRegex(ValueError, "Phạm vi trang không hợp lệ"):
            PIPELINE.parse_page_range("7", 6)

    def test_windows_printer_query_uses_fake_powershell_command(self):
        calls = []

        def fake_command(command, **kwargs):
            calls.append((command, kwargs))
            output = json.dumps([
                {"name": "Office printer", "isDefault": True, "status": "Normal"},
                {"name": "Microsoft Print to PDF", "isDefault": False, "status": "Normal"},
            ])
            return subprocess.CompletedProcess(command, 0, stdout=output, stderr="")

        result = PIPELINE.list_installed_printers(
            runner=fake_command, is_windows=True, powershell_path="powershell.exe"
        )
        self.assertEqual(result["status"], "ok")
        self.assertEqual(result["defaultPrinter"], "Office printer")
        self.assertIn("Get-Printer", calls[0][0][-1])


if __name__ == "__main__":
    unittest.main()
