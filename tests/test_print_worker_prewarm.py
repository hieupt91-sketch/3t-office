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


if __name__ == "__main__":
    unittest.main()
