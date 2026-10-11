import tempfile
import sys
import unittest
import importlib
import importlib.util
from pathlib import Path
from types import SimpleNamespace

_ROOT = Path(__file__).resolve().parents[2]
_OS_SERVICES_DIR = _ROOT / "platform" / "os_services"
_SPEC = importlib.util.spec_from_file_location(
    "_mac_printer_os_services", _OS_SERVICES_DIR / "__init__.py",
    submodule_search_locations=[str(_OS_SERVICES_DIR)],
)
_OS_SERVICES = importlib.util.module_from_spec(_SPEC)
sys.modules[_SPEC.name] = _OS_SERVICES
_SPEC.loader.exec_module(_OS_SERVICES)
MacPrinterService = importlib.import_module("_mac_printer_os_services.macos").MacPrinterService
build_services = importlib.import_module("_mac_printer_os_services.macos").build_services
PrinterInfo = _OS_SERVICES.PrinterInfo


class FakeRunner:
    def __init__(self, responses=None):
        self.responses = list(responses or [])
        self.calls = []

    def __call__(self, args, **kwargs):
        self.calls.append((args, kwargs))
        return self.responses.pop(0) if self.responses else SimpleNamespace(returncode=0, stdout="", stderr="")


def result(code=0, stdout="", stderr=""):
    return SimpleNamespace(returncode=code, stdout=stdout, stderr=stderr)


class MacPrinterServiceTests(unittest.TestCase):
    def test_lists_cups_queues_and_default(self):
        runner = FakeRunner([
            result(stdout="printer Office_Queue is idle. enabled since today\nprinter PDF_Queue is stopped.\n"),
            result(stdout="system default destination: Office_Queue\n"),
        ])
        service = MacPrinterService(runner=runner, which=lambda name: "/usr/bin/" + name)

        listed = service.list_installed()

        self.assertTrue(listed.is_ok)
        self.assertEqual(listed.value, (
            # CUPS queue names are intentionally preserved exactly as returned.
            PrinterInfo("Office_Queue", True, "is idle. enabled since today"),
            PrinterInfo("PDF_Queue", False, "is stopped."),
            PrinterInfo("Save as PDF", False, "Lưu tệp PDF trên máy Mac"),
        ))
        self.assertEqual([call[0][1:] for call in runner.calls], [["-p"], ["-d"]])

    def test_prints_pdf_with_safe_cups_arguments(self):
        with tempfile.TemporaryDirectory() as folder:
            source = Path(folder) / "input.pdf"
            source.write_bytes(b"%PDF-1.7\nbody")
            runner = FakeRunner([result()])
            service = MacPrinterService(runner=runner, which=lambda _: "/usr/bin/lp")

            printed = service.print_pdf(source, "Office Queue", 2, "1-3,5")

        self.assertTrue(printed.is_ok)
        self.assertEqual(runner.calls[0][0], ["/usr/bin/lp", "-d", "Office Queue", "-n", "2", "-P", "1-3,5", str(source)])
        self.assertTrue(runner.calls[0][1]["capture_output"])
        self.assertTrue(runner.calls[0][1]["text"])

    def test_save_as_pdf_copies_atomically_without_invoking_lp(self):
        with tempfile.TemporaryDirectory() as folder:
            source = Path(folder) / "input.pdf"
            target = Path(folder) / "saved.pdf"
            source.write_bytes(b"%PDF-1.7\nlocal-only bytes")
            runner = FakeRunner()
            service = MacPrinterService(runner=runner, which=lambda _: "/usr/bin/lp")

            saved = service.print_pdf(source, "Save as PDF", 1, destination_path=target)

            self.assertTrue(saved.is_ok)
            self.assertEqual(target.read_bytes(), source.read_bytes())
            self.assertEqual(runner.calls, [])

    def test_save_as_pdf_is_available_without_cups_queues_and_default_when_none(self):
        runner = FakeRunner([result(stdout=""), result(stdout="no system default destination")])
        service = MacPrinterService(runner=runner, which=lambda _: "/usr/bin/lpstat")

        listed = service.list_installed()

        self.assertTrue(listed.is_ok)
        self.assertEqual(listed.value, (PrinterInfo("Save as PDF", True, "Lưu tệp PDF trên máy Mac"),))

    def test_save_as_pdf_remains_available_when_lpstat_is_missing(self):
        runner = FakeRunner()
        service = MacPrinterService(runner=runner, which=lambda _: None)

        listed = service.list_installed()

        self.assertTrue(listed.is_ok)
        self.assertEqual(listed.value, (PrinterInfo("Save as PDF", True, "Lưu tệp PDF trên máy Mac"),))
        self.assertEqual(runner.calls, [])

    def test_save_as_pdf_rejects_missing_destination_or_modifiers(self):
        with tempfile.TemporaryDirectory() as folder:
            source = Path(folder) / "input.pdf"
            target = Path(folder) / "output.pdf"
            source.write_bytes(b"%PDF-1.7\n")
            runner = FakeRunner()
            service = MacPrinterService(runner=runner, which=lambda _: "/usr/bin/lp")

            missing_destination = service.print_pdf(source, "Save as PDF", 1)
            multiple_copies = service.print_pdf(source, "Save as PDF", 2, destination_path=target)
            page_range = service.print_pdf(source, "Save as PDF", 1, "1-2", destination_path=target)

        self.assertEqual([missing_destination.error.code, multiple_copies.error.code, page_range.error.code],
                         ["invalid_input", "invalid_input", "invalid_input"])
        self.assertEqual(runner.calls, [])

    def test_rejects_invalid_input_without_running_cups(self):
        with tempfile.TemporaryDirectory() as folder:
            source = Path(folder) / "input.pdf"
            source.write_bytes(b"not a pdf")
            runner = FakeRunner()
            service = MacPrinterService(runner=runner, which=lambda _: "/usr/bin/lp")

            invalid_pdf = service.print_pdf(source, "Office", 1)
            source.write_bytes(b"%PDF-1.7\n")
            invalid_copies = service.print_pdf(source, "Office", 0)
            invalid_pages = service.print_pdf(source, "Office", 1, "1-3; rm -rf /")
            page_zero = service.print_pdf(source, "Office", 1, "0")
            reversed_pages = service.print_pdf(source, "Office", 1, "3-1")
            physical_destination = service.print_pdf(source, "Office", 1, destination_path=Path(folder) / "out.pdf")

        self.assertEqual([invalid_pdf.error.code, invalid_copies.error.code, invalid_pages.error.code,
                          page_zero.error.code, reversed_pages.error.code, physical_destination.error.code],
                         ["invalid_input"] * 6)
        self.assertEqual(runner.calls, [])

    def test_factory_exposes_printer_service(self):
        self.assertIsInstance(build_services().printer_services, MacPrinterService)


if __name__ == "__main__":
    unittest.main()
