import types
import threading
import unittest
from unittest.mock import patch

import main


class FakeWorker:
    def __init__(self, app_kind, *, error=None, result=None):
        self.app_kind = app_kind
        self.error = error
        self.result = result or {"ok": True}
        self.stopped = False
        self.convert_count = 0
        self.start_background = None
        self.convert_backgrounds = []
        self.process = types.SimpleNamespace(poll=lambda: 1 if self.stopped else None, stdin=object())

    def start(self, *, background=False, foreground_requested=None):
        self.start_background = background
        return None

    def operation(self, operation, payload, timeout=180):
        if self.error:
            raise self.error
        return {**self.result, "operation": operation, "payload": payload, "timeout": timeout}

    def convert(self, source_path, output_path, filter_name, input_filter, input_filter_options, *, background=False):
        self.convert_count += 1
        self.convert_backgrounds.append(background)
        if self.error:
            raise self.error
        return output_path

    def stop(self, grace_seconds=2):
        self.stopped = True


class PersistentSofficeOperationTests(unittest.TestCase):
    def test_background_conversion_yields_to_a_user_open_in_progress(self):
        foreground_requested = threading.Event()
        worker = main._SofficeUnoWorker("writer")
        worker._foreground_requested = foreground_requested.is_set

        self.assertTrue(worker._should_run_background(True))
        foreground_requested.set()
        self.assertFalse(worker._should_run_background(True))
        self.assertFalse(worker._should_run_background(False))

    def test_open_during_background_prepare_reuses_the_warming_worker(self):
        worker = FakeWorker("writer")
        start_entered = threading.Event()
        allow_start_to_finish = threading.Event()

        def slow_start(*, background=False, foreground_requested=None):
            worker.start_background = background
            start_entered.set()
            allow_start_to_finish.wait(timeout=2)

        worker.start = slow_start
        manager = main._PersistentSofficeManager()
        result = []
        with (
            patch.object(main, "_PERSISTENT_SOFFICE_ENABLED", True),
            patch.object(main, "_SofficeUnoWorker", return_value=worker) as worker_factory,
            patch.object(main, "_warmup_persistent_filter"),
        ):
            self.assertTrue(manager.start_background_prepare("writer"))
            self.assertTrue(start_entered.wait(timeout=1))
            manager.notify_user_open_started("writer")
            opener = threading.Thread(
                target=lambda: result.append(manager.convert("writer", "in.docx", "out.html", None, None, None))
            )
            opener.start()
            allow_start_to_finish.set()
            opener.join(timeout=2)

        self.assertFalse(opener.is_alive())
        self.assertEqual(result, ["out.html"])
        self.assertEqual(worker_factory.call_count, 1)
        self.assertTrue(worker.start_background)
        self.assertEqual(worker.convert_count, 1)
        self.assertEqual(worker.convert_backgrounds, [False])
        manager.shutdown()

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
