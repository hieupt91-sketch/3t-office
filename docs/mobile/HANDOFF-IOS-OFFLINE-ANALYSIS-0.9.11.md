# Agent Handoff

TASK: Phân tích iOS/iPadOS offline song song với hoàn thiện macOS.

AGENT/ROLE: Codex / Mobile Architecture

BRANCH: `mobile/ios-offline-analysis`

WORKTREE: `/Users/hieupc/.codex/worktrees/ios-offline-analysis/3t-office`

OBJECTIVE: Xác định phạm vi offline khả thi cho một app universal iPhone/iPad mà
không đưa engine desktop hoặc nội dung tài liệu lên cloud.

FINDINGS: UI/logic JS và các model FODT/FODS/FODP tái dùng được đáng kể; đường
mở/lưu Office hiện phụ thuộc pywebview + Python + LibreOffice nên phải thay bằng
mobile bridge và OOXML adapter. Xcode 26.3 cùng iOS 26.3 Simulator đã sẵn sàng;
chưa xác nhận thiết bị thật/signing.

IMPLEMENTATION SUMMARY: Thêm plan gate, ma trận tái sử dụng, kiến trúc offline,
chiến lược patch/bảo toàn OOXML và các mốc I0–I5. Chưa thêm framework/dependency
hoặc sửa source production.

FILES CHANGED: `docs/mobile/PLAN-IOS-OFFLINE-ANALYSIS.md`,
`docs/mobile/IOS-OFFLINE-FEASIBILITY-0.9.11.md`, file handoff này.

COMMANDS RUN: Đọc đầy đủ platform/mobile specs; inventory bridge/capability;
kiểm Xcode, Simulator runtime và device types.

BUILD RESULT: NOT RUN — chưa có iOS target; tạo target là bước sau framework gate.

TEST RESULTS: NOT RUN — thay đổi chỉ là tài liệu phân tích.

KNOWN FAILURES: None. iOS production shell, OOXML round-trip và thiết bị thật đều
chưa được triển khai.

RISKS: WebKit editing khác Chromium; OOXML phức tạp có nguy cơ mất dữ liệu; cần
read-only/Save a Copy khi compatibility report không bảo đảm.

DEPENDENCIES/BLOCKERS: Người phụ trách duyệt Swift + WKWebView; audit/chọn ZIP/XML
dependency; iPhone/iPad thật; signing/TestFlight ở giai đoạn sau.

CORE PATCH ID: None.

NEXT ACTION: Sau khi duyệt framework, tạo I1 shell cô lập trong `ports/ios`, boot
asset offline trên iPhone/iPad Simulator và đo IME/rotation/background.
