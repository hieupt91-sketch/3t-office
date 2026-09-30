import types
import unittest
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


if __name__ == "__main__":
    unittest.main()