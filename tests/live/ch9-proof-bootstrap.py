"""Test-only CDP bootstrap; production services and document APIs stay intact."""
import json
from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))
import main

if sys.argv[1] == "inspect":
    records = json.loads(sys.argv[2])
    print(json.dumps([r for r in records if main._PROCESS_TRACKER_MODULE.process_identity(int(r["pid"])) == str(r["created_at"])]))
elif sys.argv[1] == "fixture":
    from openpyxl import Workbook
    book = Workbook()
    book.active.append(["CH9 desktop proof", 42])
    book.save(sys.argv[2])
elif sys.argv[1] == "desktop":
    import webview

    webview.settings["REMOTE_DEBUGGING_PORT"] = int(sys.argv[2])
    main.APP_DATA_DIR_NAME = sys.argv[3]
    fixture = sys.argv[4]
    original_api = main.VnOfficeApi
    original_trace = main._startup_trace

    def proof_trace(stage, **fields):
        if stage == "orphan_processes_swept":
            print(json.dumps({"stage": stage, **fields}), flush=True)
        original_trace(stage, **fields)

    main._startup_trace = proof_trace

    class ProofApi(original_api):
        def proof_select_fixture(self):
            # Supplies a file choice without OS input or a native dialog.
            self._initial_file = fixture
            return True

        def proof_records(self):
            return main._PROCESS_TRACKER._read_records()

        def proof_log_path(self):
            return str(self._performance_log.log_path)

        def proof_hold_com_worker(self):
            # Fault injection only: pause a real job after Office is hidden and
            # its creation identity is fsynced, so main-only kill leaves an orphan.
            module = main._get_office_com_module()
            original = module._POWERSHELL_WORKER
            marker = "  switch ($AppKind) {"
            if marker not in original:
                raise RuntimeError("Office worker hold marker changed")
            module._POWERSHELL_WORKER = original.replace(
                marker, "  Start-Sleep -Seconds 120\n" + marker, 1
            )
            return True

    main.VnOfficeApi = ProofApi
    main.main(["--app=sheet"])
