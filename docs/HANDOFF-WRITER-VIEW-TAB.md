# Agent Handoff

TASK: Thêm tab Chế độ xem thật cho VN Writer  
AGENT/ROLE: Codex / Writer owner  
BRANCH: feature/writer-view-tab  
WORKTREE: E:\VNOffice-codex-writer-view-tab  
OBJECTIVE: Bổ sung tab View đúng vị trí và thứ tự nhóm Word, với Views, Show, Zoom và Window hoạt động qua command bus.

FINDINGS:

- Writer trước thay đổi chưa có tab View; ruler A4 tĩnh luôn hiển thị.
- Sheet giữ zoom như UI state và áp dụng CSS scale. Writer tái sử dụng pattern này trong controller riêng.
- Các view command là UI-local nhưng vẫn có mapping UNO đầy đủ để bảo toàn contract khi chạy qua bridge/desktop.

IMPLEMENTATION SUMMARY:

- Tab view nằm sau review, trước ai; nhóm đúng thứ tự Views → Show → Zoom → Window.
- Print Layout khôi phục trang giấy, header/footer và ngắt trang hiển thị.
- Web Layout ẩn ranh giới/ngắt trang/header/footer, cho nội dung chảy liên tục 100% chiều rộng.
- Read Mode rút gọn: ẩn topbar/ribbon/statusbar, mở rộng vùng đọc, có toolbar thoát tối giản và Esc trở về Print Layout.
- Ruler là bản rút gọn tĩnh: hiển thị theo đúng chiều rộng trang và lề hiện tại từ Page Setup; chưa hỗ trợ kéo chỉnh lề/thụt dòng.
- Gridlines là lưới 5 mm mờ chỉ bằng CSS hiển thị, không đi vào document/export/print.
- Zoom In/Out/Reset/100% dùng CSS scale trên .vno-writer-page, giới hạn 50–200%; Page Width tự tính từ viewport và cập nhật lại khi resize.
- New Window mở URL tài liệu hiện tại bằng API window.open thật. Nếu pop-up bị chặn, command trả false và status bar giải thích rõ.
- Thêm icon SVG vector riêng cho Print Layout, Web Layout, Read Mode, Ruler, Page Width và New Window; dùng icon SVG chung sẵn có cho Zoom/Gridlines.
- Mọi command mới có definition, i18n VI/EN và mapping trong command-dispatch-mapper.js.

FILES CHANGED:

- apps/writer/writer-view-controller.js
- apps/writer/writer-app.js
- apps/writer/writer-ribbon.js
- apps/writer/writer.css
- adapters/libreoffice/writer/writer-adapter.js
- adapters/libreoffice/common/command-dispatch-mapper.js (ngoại lệ bắt buộc theo yêu cầu task)
- platform/commands/command-definitions.js
- platform/i18n/strings-vi.js
- platform/i18n/strings-en.js
- platform/ui-kit/icons.js (icon SVG dùng chung, ngoại lệ tối thiểu để không dùng placeholder)
- tests/live/writer-view-tab.playwright.mjs
- docs/HANDOFF-WRITER-VIEW-TAB.md

COMMANDS RUN:

- node --check cho toàn bộ JS thay đổi
- node tests/run-tests.js
- node tests/live/writer-view-tab.playwright.mjs
- git diff --check

BUILD RESULT: PASS — dự án không có bước bundle riêng; syntax/import/browser smoke nằm trong full test suite.  
TEST RESULTS:

- PASS — node tests/run-tests.js: 635/635, 0 fail, 11.99 giây.
- PASS — Playwright thật qua Edge tại C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe: 10/10 assertions, không pageerror.
- PASS — Playwright gọi 11 thao tác View bằng globalCommandBus.execute() và xác nhận history thực.

KNOWN FAILURES: Không có.

RISKS:

- Trình duyệt có thể chặn New Window theo chính sách pop-up; UI báo rõ thay vì giả thành công.
- CSS transform không đổi intrinsic layout box; controller bù chiều cao scroll và giới hạn zoom 200%.

DEPENDENCIES/BLOCKERS: Không có dependency mới, không có thư viện trả phí.  
CORE PATCH ID (if any): Không có; không sửa LibreOffice Core.

DEFERRED / OMITTED:

- Outline, Draft, Focus, Learning Tools, Navigation Pane, Macros: ngoài phạm vi đã duyệt.
- Arrange All, Split, View Side by Side, Switch Windows: bỏ qua vì VN Office hiện là single-window app.
- Ruler drag-to-adjust: rút gọn theo nhiệm vụ; ruler hiện đúng khổ/lề thật nhưng chưa kéo được.

NEXT ACTION: Người phụ trách review branch; không merge tự động vào main.
