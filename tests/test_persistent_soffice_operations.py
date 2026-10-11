import types
import unittest
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch

import main


class FakeWorker:
    def __init__(self, app_kind, *, error=None, result=None):
        self.app_kind = app_kind
        self.error = error
        self.result = result or {"ok": True}
        self.stopped = False
        self.process = types.SimpleNamespace(poll=lambda: 1 if self.stopped else None, stdin=object())

    def start(self):
        return None

    def operation(self, operation, payload, timeout=180):
        if self.error:
            raise self.error
        return {**self.result, "operation": operation, "payload": payload, "timeout": timeout}

    def stop(self, grace_seconds=2):
        self.stopped = True


class PersistentSofficeOperationTests(unittest.TestCase):
    def test_read_only_operation_restarts_once_after_disposed_bridge(self):
        first = FakeWorker("writer", error=main._PersistentSofficeConversionError("Binary URP bridge disposed during call"))
        second = FakeWorker("writer", result={"page_count": 3})
        manager = main._PersistentSofficeManager()
        with patch.object(main, "_SofficeUnoWorker", side_effect=[first, second]):
            result = manager.operation("writer", "inspect_pdf", pdf_path="preview.pdf")
        self.assertEqual(result["page_count"], 3)
        self.assertTrue(first.stopped)
        self.assertIs(manager._worker, second)

    def test_print_job_is_never_retried_after_transport_failure(self):
        first = FakeWorker("writer", error=main._PersistentSofficeTransportError("bridge closed"))
        second = FakeWorker("writer", result={"ok": True})
        manager = main._PersistentSofficeManager()
        with patch.object(main, "_SofficeUnoWorker", side_effect=[first, second]) as worker_factory:
            with self.assertRaisesRegex(main._PersistentSofficeTransportError, "bridge closed"):
                manager.operation("writer", "print_pdf", pdf_path="preview.pdf")
        self.assertEqual(worker_factory.call_count, 1)
        self.assertTrue(first.stopped)
        self.assertIsNone(manager._worker)

    def test_sheet_and_slides_warm_pairs_are_print_context_only(self):
        pairs = (
            ("sheet", "xlsx", ".fods"),
            ("sheet", "pdf", ".xlsx"),
            ("slides", "pptx", ".fodp"),
            ("slides", "pdf", ".pptx"),
        )
        previous = getattr(main._PRINT_CONTEXT, "active", False)
        try:
            main._PRINT_CONTEXT.active = False
            for pair in pairs:
                with self.subTest(pair=pair, context="save/export"):
                    self.assertFalse(main._is_print_persistent_pair(*pair))
            main._PRINT_CONTEXT.active = True
            for pair in pairs:
                with self.subTest(pair=pair, context="print"):
                    self.assertTrue(main._is_print_persistent_pair(*pair))
            with patch.dict("os.environ", {"VNO_PRINT_LEGACY": "1"}):
                for pair in pairs:
                    with self.subTest(pair=pair, context="legacy"):
                        self.assertFalse(main._is_print_persistent_pair(*pair))
        finally:
            main._PRINT_CONTEXT.active = previous

    def test_print_pdf_conversion_sets_and_restores_print_context(self):
        seen = []
        with TemporaryDirectory() as temp_dir:
            source = Path(temp_dir) / "book.xlsx"
            source.write_bytes(b"xlsx")

            def fake_convert(src_path, target_ext, out_dir, app_kind=None):
                seen.append((getattr(main._PRINT_CONTEXT, "active", False), target_ext, app_kind))
                output = Path(out_dir) / "book.pdf"
                output.write_bytes(b"%PDF")
                return str(output)

            main._PRINT_CONTEXT.active = False
            with patch.object(main, "_run_soffice_convert", side_effect=fake_convert):
                main._convert_print_source_to_pdf(str(source), "sheet", temp_dir)

        self.assertEqual(seen, [(True, "pdf", "sheet")])
        self.assertFalse(main._PRINT_CONTEXT.active)


if __name__ == "__main__":
    unittest.main()
