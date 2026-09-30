from __future__ import annotations

import importlib.util
import subprocess
import tempfile
import unittest
from pathlib import Path
from types import SimpleNamespace
from unittest.mock import patch


ROOT = Path(__file__).resolve().parents[1]
MODULE_PATH = ROOT / "platform" / "print" / "office_com.py"
SPEC = importlib.util.spec_from_file_location("vno_office_com_test", MODULE_PATH)
OFFICE = importlib.util.module_from_spec(SPEC)
SPEC.loader.exec_module(OFFICE)


class OfficePdfTests(unittest.TestCase):
    def tearDown(self):
        OFFICE._cached_office_engines.cache_clear()

    def test_registration_scan_is_cached_and_does_not_activate_office(self):
        checks = []

        def registered(prog_id):
            checks.append(prog_id)
            return prog_id == "Word.Application"

        OFFICE._cached_office_engines.cache_clear()
        with patch.object(OFFICE, "os", SimpleNamespace(name="nt")), \
                patch.object(OFFICE, "_registry_has_com_class", side_effect=registered):
            first = OFFICE.get_office_engine_info("writer")
            second = OFFICE.get_office_engine_info("writer")

        self.assertEqual(first, second)
        self.assertEqual(first["engine"], "Microsoft Office")
        self.assertEqual(first["progId"], "Word.Application")
        self.assertEqual(checks, [
            "Word.Application", "Excel.Application", "Ket.Application",
            "PowerPoint.Application", "Kwpp.Application",
        ])

    def test_app_to_office_wps_progids_are_correct(self):
        self.assertEqual(OFFICE._OFFICE_BY_APP["writer"], (
            ("Word.Application", "Microsoft Office"), ("Kwps.Application", "WPS"),
        ))
        self.assertEqual(OFFICE._OFFICE_BY_APP["sheet"], (
            ("Excel.Application", "Microsoft Office"), ("Ket.Application", "WPS"),
        ))
        self.assertEqual(OFFICE._OFFICE_BY_APP["slides"], (
            ("PowerPoint.Application", "Microsoft Office"), ("Kwpp.Application", "WPS"),
        ))

    def test_missing_office_registration_uses_libreoffice(self):
        calls = []

        def libreoffice(source, app_kind, output_dir):
            calls.append("LibreOffice")
            path = Path(output_dir) / "draft.pdf"
            path.write_bytes(b"lo-pdf")
            return str(path)

        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "draft.docx"
            source.write_bytes(b"docx")
            pdf, engine = OFFICE.convert_pdf_with_office_fallback(
                str(source), "writer", directory, libreoffice,
                office_info={"available": False, "engine": "LibreOffice"},
                office_exporter=lambda *args, **kwargs: calls.append("Office"),
            )
            self.assertEqual(Path(pdf).read_bytes(), b"lo-pdf")

        self.assertEqual(engine, "LibreOffice")
        self.assertEqual(calls, ["LibreOffice"])

    def test_com_failure_silently_uses_libreoffice(self):
        calls = []

        def libreoffice(source, app_kind, output_dir):
            calls.append("LibreOffice")
            path = Path(output_dir) / "draft.pdf"
            path.write_bytes(b"lo-pdf")
            return str(path)

        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "draft.docx"
            source.write_bytes(b"docx")
            pdf, engine = OFFICE.convert_pdf_with_office_fallback(
                str(source), "writer", directory, libreoffice,
                office_info={"available": True, "engine": "Microsoft Office", "progId": "Word.Application"},
                office_exporter=lambda *args, **kwargs: (_ for _ in ()).throw(RuntimeError("COM failed")),
            )
            self.assertEqual(Path(pdf).read_bytes(), b"lo-pdf")

        self.assertEqual(engine, "LibreOffice")
        self.assertEqual(calls, ["LibreOffice"])

    def test_worker_source_is_ascii_and_uses_sta_read_only_and_finally_cleanup(self):
        source = OFFICE._POWERSHELL_WORKER
        source.encode("ascii")
        for required in (
            "New-Object -ComObject $ProgId",
            "$application.Visible = $false",
            "$application.DisplayAlerts = 0",
            "$application.Documents.Open($InputPath, $false, $true, $false)",
            "$application.Workbooks.Open($InputPath, 0, $true)",
            "$application.Presentations.Open($InputPath, -1, 0, 0)",
            "ExportAsFixedFormat($OutputPath, 17)",
            "ExportAsFixedFormat(0, $OutputPath)",
            "SaveAs($OutputPath, 32)",
            "-2147418111",
            "finally {",
            "$document.Close($false)",
            "$workbook.Close($false)",
            "$application.Quit()",
            "Invoke-ComWithRetry([string]$Operation, [scriptblock]$Action)",
            "$delays = @(500, 1000, 2000, 4000)",
            "Word.Documents.Open",
            "Excel.Workbooks.Open",
            "PowerPoint.Presentations.Open",
            "$script:CurrentOperation, [string]$_.Exception.Message",
            "$ownsOfficeProcess -and $quitFailed -and $processId -gt 0",
            "Stop-Process -Id $processId -Force",
        ):
            with self.subTest(required=required):
                self.assertIn(required, source)

    def test_export_starts_an_sta_helper_and_writes_a_pdf(self):
        calls = []

        class FakeProcess:
            returncode = 0

            def __init__(self, command):
                self.command = command

            def communicate(self, timeout):
                calls.append(("communicate", timeout))
                output = Path(self.command[self.command.index("-OutputPath") + 1])
                output.write_bytes(b"office-pdf")
                script = Path(self.command[self.command.index("-File") + 1])
                calls.append(("script_ascii", script.read_bytes().decode("ascii")))
                return "OK\n", ""

            def kill(self):
                calls.append(("kill",))

        def runner(command, **kwargs):
            calls.append((command, kwargs))
            return FakeProcess(command)

        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "draft.docx"
            source.write_bytes(b"docx")
            with patch.object(OFFICE, "os", SimpleNamespace(name="nt")):
                output = OFFICE.export_pdf_with_office(
                    str(source), "writer", directory,
                    engine_info={"available": True, "engine": "Microsoft Office", "progId": "Word.Application"},
                    powershell_path="powershell.exe", runner=runner, timeout_seconds=4,
                )
            self.assertEqual(Path(output).read_bytes(), b"office-pdf")

        command = calls[0][0]
        self.assertIn("-STA", command)
        self.assertIn("-InputPath", command)
        self.assertTrue(any(item[0] == "communicate" and item[1] == 4 for item in calls if isinstance(item, tuple)))
        self.assertTrue(any(item[0] == "script_ascii" for item in calls if isinstance(item, tuple)))

    def test_timeout_terminates_the_helper_process(self):
        class FakeProcess:
            returncode = -1

            def __init__(self):
                self.killed = False
                self.calls = 0

            def communicate(self, timeout=None):
                self.calls += 1
                if self.calls == 1:
                    raise subprocess.TimeoutExpired("powershell.exe", timeout)
                return "", ""

            def kill(self):
                self.killed = True

        process = FakeProcess()
        with tempfile.TemporaryDirectory() as directory:
            source = Path(directory) / "draft.docx"
            source.write_bytes(b"docx")
            with patch.object(OFFICE, "os", SimpleNamespace(name="nt")):
                with self.assertRaisesRegex(TimeoutError, "2-second"):
                    OFFICE.export_pdf_with_office(
                        str(source), "writer", directory,
                        engine_info={"available": True, "engine": "Microsoft Office", "progId": "Word.Application"},
                        powershell_path="powershell.exe", runner=lambda *args, **kwargs: process,
                        timeout_seconds=2,
                    )
        self.assertTrue(process.killed)
        self.assertEqual(process.calls, 2)

    def test_timeout_cleanup_only_targets_a_new_office_process_owned_by_the_job(self):
        with tempfile.TemporaryDirectory() as directory:
            info = Path(directory) / "office-process.json"
            info.write_text('{"pid":1234,"owned":false}', encoding="ascii")
            with patch.object(OFFICE.os, "kill") as kill:
                OFFICE._terminate_owned_process(info)
            kill.assert_not_called()

            info.write_text('{"pid":5678,"owned":true}', encoding="ascii")
            with patch.object(OFFICE.os, "kill") as kill:
                OFFICE._terminate_owned_process(info)
            kill.assert_called_once_with(5678, OFFICE.signal.SIGTERM)

    def test_com_retry_budget_has_five_attempts_and_bounded_increasing_backoff(self):
        source = OFFICE._POWERSHELL_WORKER
        self.assertIn("$attempt -lt 5", source)
        self.assertIn("$delays = @(500, 1000, 2000, 4000)", source)


if __name__ == "__main__":
    unittest.main()
