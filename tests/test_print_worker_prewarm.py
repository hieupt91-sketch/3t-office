import os
import unittest
from unittest import mock

import main


class PrintWorkerPrewarmTests(unittest.TestCase):
    def make_api(self):
        api = object.__new__(main.VnOfficeApi)
        api._app_kind = "writer"
        api._startup_launch_args = []
        return api

    def test_writer_deferred_startup_prewarms_worker_by_default(self):
        api = self.make_api()
        with mock.patch.dict(os.environ, {}, clear=False):
            os.environ.pop("VNO_PRINT_PREWARM_WORKER", None)
            with mock.patch.object(main, "_start_deferred_startup") as deferred:
                with mock.patch.object(api, "_start_document_engine") as start_worker:
                    result = api.start_deferred_startup()

        self.assertEqual(result, {"started": True})
        deferred.assert_called_once_with(api, "writer", [])
        start_worker.assert_called_once_with()

    def test_flag_zero_keeps_previous_lazy_worker_startup(self):
        api = self.make_api()
        with mock.patch.dict(os.environ, {"VNO_PRINT_PREWARM_WORKER": "0"}):
            with mock.patch.object(main, "_start_deferred_startup"):
                with mock.patch.object(api, "_start_document_engine") as start_worker:
                    api.start_deferred_startup()

        start_worker.assert_not_called()

    def test_writer_skips_worker_prewarm_for_initial_docx_that_requires_cli(self):
        api = self.make_api()
        api._initial_file = r"C:\documents\textbox.docx"
        with mock.patch.dict(os.environ, {}, clear=False):
            os.environ.pop("VNO_PRINT_PREWARM_WORKER", None)
            os.environ.pop("VNO_WRITER_SKIP_UNSAFE_PREWARM", None)
            with mock.patch.object(main, "_persistent_writer_html_safe", return_value=False):
                with mock.patch.object(main, "_start_deferred_startup"):
                    with mock.patch.object(api, "_start_document_engine") as start_worker:
                        api.start_deferred_startup()

        start_worker.assert_not_called()

    def test_flag_zero_restores_worker_prewarm_for_cli_fallback_docx(self):
        api = self.make_api()
        api._initial_file = r"C:\documents\textbox.docx"
        with mock.patch.dict(os.environ, {
            "VNO_WRITER_SKIP_UNSAFE_PREWARM": "0",
            "VNO_PRINT_PREWARM_WORKER": "1",
        }):
            with mock.patch.object(main, "_persistent_writer_html_safe", return_value=False):
                with mock.patch.object(main, "_start_deferred_startup"):
                    with mock.patch.object(api, "_start_document_engine") as start_worker:
                        api.start_deferred_startup()

        start_worker.assert_called_once_with()

    def test_open_request_skips_worker_start_for_cli_fallback_docx(self):
        api = self.make_api()
        with mock.patch.object(main, "_persistent_writer_html_safe", return_value=False):
            with mock.patch.object(api, "_invoke_reported_api", return_value={"status": "ok"}):
                with mock.patch.object(api, "_start_document_engine") as start_worker:
                    api.open_document_dialog("writer", r"C:\documents\textbox.docx")

        start_worker.assert_not_called()

    def test_slides_open_request_skips_unused_worker_start_for_pptx_import(self):
        api = object.__new__(main.VnOfficeApi)
        api._app_kind = "slides"
        api._initial_file = None
        with mock.patch.object(api, "_invoke_reported_api", return_value={"status": "ok"}):
            with mock.patch.object(api, "_start_document_engine") as start_worker:
                api.open_document_dialog("slides", r"C:\documents\sample.pptx")

        start_worker.assert_not_called()


if __name__ == "__main__":
    unittest.main()
