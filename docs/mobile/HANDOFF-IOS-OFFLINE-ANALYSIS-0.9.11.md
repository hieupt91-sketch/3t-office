# Agent Handoff

TASK: Phân tích iOS/iPadOS offline song song với hoàn thiện macOS.

AGENT/ROLE: Codex / Mobile Architecture

BRANCH: `mobile/ios-offline-analysis`

WORKTREE: `/Users/hieupc/.codex/worktrees/ios-offline-analysis/3t-office`

OBJECTIVE: Xác định kiến trúc và dựng I1 shell offline universal cho iPhone/iPad,
không đưa engine desktop hoặc nội dung tài liệu lên cloud.

FINDINGS: UI/logic JS tái dùng được trong WKWebView nếu phục vụ ES modules qua
custom scheme nội bộ. `loadFileURL` chỉ dựng root rồi trắng; `vno://` đã sửa lỗi.
UI desktop phải có lớp responsive riêng: iPhone dùng toolbar biểu tượng một hàng,
trang vừa chiều rộng; iPad dùng ribbon cảm ứng rút gọn. Chưa xác nhận thiết bị thật/signing.

IMPLEMENTATION SUMMARY: Thêm Swift UIKit/WKWebView shell, Xcode project universal,
custom offline asset scheme, asset staging không chứa Python/EXE/DLL, navigation
allowlist và capability guard. Thêm UI riêng cho safe area, đích chạm 44 pt,
iPhone compact toolbar/trang co giãn và iPad touch ribbon. Không thêm dependency.

FILES CHANGED: tài liệu mobile; `ports/ios/**`; `tests/test_ios_offline_shell.py`;
`09-templates/AGENT-HANDOFF.md`.

COMMANDS RUN: Xcode simulator build; cài/chạy/chụp ảnh app thật trên iPhone 17 Pro
và iPad Air 11-inch Simulator; focused unittest; npm test; Python unittest discover.

BUILD RESULT: PASS — Xcode Debug iphonesimulator tạo `3T Office.app` universal.

TEST RESULTS: PASS — 6/6 focused iOS tests; native render trên iPhone và iPad.
FAIL — npm 3151/3167 do 16 probe/baseline phụ thuộc Python/LibreOffice của checkout.
BLOCKED — full Python trên system Python thiếu `webview`; không quy lỗi này là PASS.

KNOWN FAILURES: Lần paint đầu trên Simulator mới có thể trắng khoảng 20–25 giây;
document picker, OOXML round-trip, license bridge và thiết bị thật chưa triển khai.

RISKS: WebKit editing khác Chromium; OOXML phức tạp có nguy cơ mất dữ liệu; cần
read-only/Save a Copy khi compatibility report không bảo đảm.

DEPENDENCIES/BLOCKERS: Audit/chọn ZIP/XML dependency; iPhone/iPad thật;
Apple signing/TestFlight ở giai đoạn sau.

CORE PATCH ID: None.

NEXT ACTION: I2 native document picker + security-scoped URLs; sau đó xây adapter
định dạng có compatibility report trước khi cho phép ghi đè Office file.
