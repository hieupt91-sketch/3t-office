# Agent Handoff

TASK: M6 — Python update applier macOS 0.9.11 + production wiring
AGENT/ROLE: Codex / macOS updater
BRANCH: codex/macos-updater-wiring-0911
WORKTREE: /Users/hieupc/.codex/worktrees/macos-updater-wiring-0911/3t-office
OBJECTIVE: Áp dụng code update ngoài `.app` đã ký bằng Python thuần theo chuỗi staging → verify hash → atomic promote/current → health check → rollback, và nối helper vào backend desktop macOS thật.
FINDINGS: Nhánh gốc `platform/macos@5def067` có updater chung xác minh chữ ký, duyệt mọi nguồn và chọn bản mới nhất, nhưng helper apply hiện tại là PowerShell/Windows. Nhánh chưa có `platform/os_services/macos.py`; vì vậy helper riêng macOS được đặt trong `ports/macos/` đúng spec, không làm xáo trộn updater chung.
IMPLEMENTATION SUMMARY: Giữ helper/CLI an toàn hiện có; thêm `MacOSUpdateApplier` tạo task theo layout `~/Library/Application Support/VNOffice/app-<version>`, ghi task nguyên tử, và launch `python -m ports.macos.apply_helper --task ...` bằng argv/no shell. `build_services()` expose capability; `UpdaterManager` chỉ delegate create/launch khi capability được inject, còn Windows giữ nguyên PowerShell. `main.py` nhận diện version tree qua OS service và inject applier. Không sửa thuật toán đọc mọi nguồn/chọn newest, `apply-helper.ps1`, `ooxml_zip_patch.py`, `.app`, hay semantics file format.
FILES CHANGED (wiring follow-up): platform/os_services/base.py; platform/os_services/macos.py; adapters/updater/updater.py; main.py; tests/macos/test_update_service.py; tests/test_os_services_contract.py; docs/macos/M6-UPDATE-APPLIER-PLAN-0.9.11.md; docs/macos/HANDOFF-M6-UPDATE-APPLIER-0.9.11.md.
COMMANDS RUN: `python3 -m py_compile ports/macos/apply_helper.py tests/macos/test_update_applier.py`; `python3 -m unittest tests.macos.test_update_applier -v`; `python3 -m unittest tests.macos.test_update_applier tests.test_updater tests.test_updater_api -v`; `git diff --check`.
BUILD RESULT: NOT RUN — không thay build system hay artifact đóng gói.
TEST RESULTS: PASS — 33/33 focused OS-service + macOS applier (task production, argv/no-shell, backend selector, manager delegation, success và rollback). PASS — 3/3 invariant updater newest/multi-source/signed delta. PASS — py_compile, module CLI probe và diff check. Regression updater/API: 27 PASS, 3 SKIP Windows-only, 1 BLOCKED do môi trường thiếu module `webview` khi test import `main.py`; lỗi là `ModuleNotFoundError: No module named 'webview'`, không nằm trên đường code mới.
KNOWN FAILURES: Không có failure trong focused suite. Full suite NOT RUN theo phân công để integrator chạy. Native packaged-app test NOT RUN vì helper chưa được nối vào macOS `UpdateApplier`/launcher ở nhánh gốc này.
RISKS: `os.replace` bảo đảm nguyên tử khi app root nằm trên cùng filesystem, là layout bắt buộc của spec. Helper giả định task/manifest đã được updater chung xác minh chữ ký; nó vẫn tự kiểm path, blob và toàn tree trước promote. Phiên bản đích có sẵn bị từ chối thay vì tự xóa để tránh mất dữ liệu.
DEPENDENCIES/BLOCKERS: Production wiring Python đã hoàn tất trong source. Packaged-app 0.9.10 → 0.9.11 end-to-end NOT RUN; cần artifact `.app` có runtime và version tree thật. Môi trường test hiện tại thiếu `webview` nên một regression import `main.py` BLOCKED.
CORE PATCH ID (if any): None.
NEXT ACTION: Integrator review commit, chạy full Python suite trong môi trường có `pywebview`, rồi test update thật trên app bundle 0.9.10 → 0.9.11 và kịch bản health timeout rollback.
