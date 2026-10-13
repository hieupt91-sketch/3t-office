# Agent Handoff

TASK: M6 — Python update applier macOS 0.9.11
AGENT/ROLE: Codex / macOS updater
BRANCH: codex/macos-updater-0911
WORKTREE: /Users/hieupc/.codex/worktrees/macos-updater-0911/3t-office
OBJECTIVE: Áp dụng code update ngoài `.app` đã ký bằng Python thuần theo chuỗi staging → verify hash → atomic promote/current → health check → rollback.
FINDINGS: Nhánh gốc `platform/macos@5def067` có updater chung xác minh chữ ký, duyệt mọi nguồn và chọn bản mới nhất, nhưng helper apply hiện tại là PowerShell/Windows. Nhánh chưa có `platform/os_services/macos.py`; vì vậy helper riêng macOS được đặt trong `ports/macos/` đúng spec, không làm xáo trộn updater chung.
IMPLEMENTATION SUMMARY: Thêm helper/CLI Python thuần tạo `app-<version>.staging` từ version hiện tại, áp replacement/removal đã validate, xác minh SHA-256 và size toàn manifest, promote bằng `os.replace`, đổi symlink `current` nguyên tử, chạy health marker bằng argv list, và rollback `current` cùng rollback report nếu apply/health lỗi. Helper từ chối path traversal, symlink trong tree/blob/staging, target đã tồn tại, health marker ngoài updates, và không cho task điều khiển đường dẫn log. Không sửa `updater.py`, `apply-helper.ps1`, `ooxml_zip_patch.py`, `.app`, hay semantics file format.
FILES CHANGED: ports/macos/__init__.py; ports/macos/apply_helper.py; tests/macos/test_update_applier.py; docs/macos/M6-UPDATE-APPLIER-PLAN-0.9.11.md; docs/macos/HANDOFF-M6-UPDATE-APPLIER-0.9.11.md.
COMMANDS RUN: `python3 -m py_compile ports/macos/apply_helper.py tests/macos/test_update_applier.py`; `python3 -m unittest tests.macos.test_update_applier -v`; `python3 -m unittest tests.macos.test_update_applier tests.test_updater tests.test_updater_api -v`; `git diff --check`.
BUILD RESULT: NOT RUN — không thay build system hay artifact đóng gói.
TEST RESULTS: PASS — focused macOS applier 10/10, gồm success, bad hash, traversal, symlink, rollback false/exception, existing target, subprocess health marker thật, marker ngoài updates, Unicode NFD/khoảng trắng. PASS — py_compile và diff check. Regression updater/API: 37 PASS, 3 SKIP Windows-only, 1 BLOCKED do môi trường thiếu module `webview` khi test import `main.py`; lỗi là `ModuleNotFoundError: No module named 'webview'`, không nằm trên đường code mới.
KNOWN FAILURES: Không có failure trong focused suite. Full suite NOT RUN theo phân công để integrator chạy. Native packaged-app test NOT RUN vì helper chưa được nối vào macOS `UpdateApplier`/launcher ở nhánh gốc này.
RISKS: `os.replace` bảo đảm nguyên tử khi app root nằm trên cùng filesystem, là layout bắt buộc của spec. Helper giả định task/manifest đã được updater chung xác minh chữ ký; nó vẫn tự kiểm path, blob và toàn tree trước promote. Phiên bản đích có sẵn bị từ chối thay vì tự xóa để tránh mất dữ liệu.
DEPENDENCIES/BLOCKERS: Bước tích hợp tiếp theo cần macOS OS-service/task builder gọi `python -m ports.macos.apply_helper --task ...` sau khi updater chung stage xong, và shell khởi động code từ `current`. Không blocker cho review helper độc lập.
CORE PATCH ID (if any): None.
NEXT ACTION: Integrator review commit, nối helper qua backend macOS ở task riêng, chạy full Python suite trong môi trường có `pywebview`, rồi test update thật trên app bundle 0.9.10 → 0.9.11 và kịch bản health timeout rollback.
