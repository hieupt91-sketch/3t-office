# Agent Handoff — Commercial Fidelity & Platform Standardization

TASK: Nâng cấp tính trung thực, chuẩn hóa trải nghiệm Microsoft Office-like, loại bỏ hoàn toàn dữ liệu/hành vi giả và củng cố toàn bộ tầng Platform/App/Tests cho VN Office.
AGENT/ROLE: Antigravity (Lead Architecture & UI/UX Agent)
BRANCH: feature/platform-commercial-fidelity
WORKTREE: E:\VN OFice
OBJECTIVE: 
1. Loại bỏ toàn bộ hành vi giả trong 4 thẻ mẫu Backstage và dữ liệu giả (recent files hardcode, tổng tiền sheet hardcode).
2. Gom việc khởi tạo Command Bus và UNO Bridge vào bootstrap chung duy nhất trong Platform.
3. Thay thế hoàn toàn alert() và prompt() của trình duyệt bằng Enterprise Dialog Framework trong UI Kit.
4. Triển khai Undo / Redo cho Sheet và Slides đồng bộ với Writer.
5. Viết lại bài kiểm tra Adapter Mapping sang kiểm thử hành vi thực thi (dispatch) thật trên DOM và Document Model.
6. Xây dựng nền tảng đa ngôn ngữ (i18n) thuần Việt chuẩn hóa và kết nối xử lý AI Sidebar cục bộ bảo mật.

FINDINGS:
1. Trước khi sửa, 4 thẻ Mẫu trong Backstage Menu đều gọi chung một lệnh `common.file.new`, không phân biệt ứng dụng hay nội dung mẫu.
2. Danh sách "Tài liệu mở gần đây" trong Backstage hardcode 2 tệp với timestamp cố định, và thanh trạng thái VN Sheet hardcode "TỔNG CỘNG: 120.000.000 ₫" thay vì tính toán từ các ô thực tế.
3. Cả 3 ứng dụng (Writer, Sheet, Slides) đều lặp lại việc gọi `registerAllStandardCommands` và `globalUnoBridge.init()` mỗi khi chuyển app.
4. Writer, Sheet, Slides còn sử dụng `prompt()` và `alert()` nguyên thủy của trình duyệt trong một số thao tác (chèn link, tìm/thay thế, bộ lọc, biểu đồ).
5. Sheet và Slides chưa có cơ chế undo/redo, thiếu đồng bộ với phím tắt Ctrl+Z / Ctrl+Y chuẩn Microsoft Office.
6. Bài test `tests/unit/adapter-mapping.test.js` cũ chỉ so khớp tĩnh chuỗi UNO URL mà không kiểm thử hành vi dispatch và thay đổi trạng thái tài liệu thực tế.

IMPLEMENTATION SUMMARY:
1. **Gom Bootstrap tập trung (`platform/bootstrap.js`)**:
   - Tạo module `bootstrapPlatform()` khởi tạo Command Bus và UNO Bridge duy nhất 1 lần cho toàn suite.
   - Cập nhật `WriterApp`, `SheetApp`, `SlidesApp` và `index.html` gọi `bootstrapPlatform()`, tránh re-register lệnh khi chuyển qua lại giữa các ứng dụng.
2. **Loại bỏ dữ liệu giả & Chuẩn hóa Thẻ Mẫu Backstage (`platform/templates/`, `platform/recent/`, `platform/shell/`)**:
   - Tạo `platform/templates/template-registry.js` định nghĩa các mẫu tài liệu thật với badge và ứng dụng đích cụ thể (Tài liệu trống, Văn bản hành chính NĐ 30/2020/NĐ-CP, Dự toán kinh phí VNĐ, Đề cương thuyết trình 16:9).
   - Khi chọn mẫu: tự động chuyển app và nạp đúng mẫu thật tương ứng, chấm dứt hành vi gọi chung `common.file.new`.
   - Tạo `platform/recent/recent-manager.js` lưu trữ và truy xuất lịch sử tài liệu thực tế qua `localStorage`.
   - Bổ sung component `createEmptyState` chuẩn UI Kit Rules (`03-ui-ux/UI-KIT-RULES.md`). Khi chưa có tài liệu gần đây, hiển thị trạng thái rỗng đồ họa đẹp mắt và nút tạo tài liệu mới thay cho 2 dòng dữ liệu giả.
   - Xóa bỏ dòng tổng tiền hardcode trong `sheet-app.js`. Sử dụng `this.grid.updateStatus()` tính toán tổng tiền, số lượng ô và giá trị trung bình từ dữ liệu ô thực tế với định dạng tiền tệ vi-VN (₫).
3. **Enterprise Dialog Framework (`platform/ui-kit/dialogs.js`, `platform/dialogs/index.js`)**:
   - Cung cấp các hàm hộp thoại chuyên nghiệp: `showAlertDialog`, `showConfirmDialog`, `showPromptDialog`, `showFindReplaceDialog`.
   - Thay thế toàn bộ `prompt()` và `alert()` trong `writer-adapter.js`, `sheet-adapter.js`, `slides-adapter.js`, và `sheet-grid.js`.
   - Tích hợp kiểm tra môi trường không có DOM (headless/Node.js) để chạy kiểm thử an toàn không gây lỗi.
4. **Undo / Redo cho Sheet & Slides**:
   - Bổ sung `undoStack` và `redoStack` vào `SheetGridController` (hoàn tác sửa ô và style).
   - Bổ sung `undoStack` và `redoStack` vào `SlidesCanvasController` (hoàn tác thêm/xóa/nhân đôi slide).
   - Thêm handler `common.edit.undo` và `common.edit.redo` cho `SheetAdapter` và `SlidesAdapter`, đạt chuẩn parity với phím tắt Ctrl+Z / Ctrl+Y Microsoft Office.
5. **Kiểm thử Hành vi Dispatch Thật (`tests/unit/adapter-mapping.test.js`)**:
   - Viết lại toàn bộ bộ test: kiểm tra hợp đồng 2 chiều (Command Bus <-> UNO URL), kiểm thử dispatch thật trên SheetAdapter (đậm, autosum, ngày, định dạng tiền tệ, undo/redo), SlidesAdapter (thêm slide, nhân đôi, xóa, undo/redo, chèn text), WriterAdapter (chèn bảng HTML, ngắt trang, lưu sạch dirty flag), và UnoBridge E2E Dispatch.
6. **Scaffold Nền tảng i18n (`platform/i18n/`) & Tương tác AI Sidebar Cục bộ**:
   - Tạo từ điển chuẩn `strings.vi.json`, module `strings-vi.js` và hàm `t(key, params)` trong `i18n.js`.
   - Áp dụng `t(key)` chuẩn hóa cho toàn bộ tiêu đề, nút bấm và trạng thái rỗng trong Backstage menu.
   - Bổ sung bộ kiểm thử `tests/unit/i18n.test.js` xác minh tra cứu chuỗi và cơ chế fallback an toàn.
   - Tạo `platform/ai/ai-service.js` và gắn sự kiện click gửi / Enter trên AI Sidebar, hỗ trợ tóm tắt văn bản hiện thời, trau chuốt câu từ hành chính, kiểm tra ngữ pháp và gợi ý áp dụng vào văn bản mà không ghi đè tự động (tuân thủ `07-security-ai/AI-ARCHITECTURE.md`).

FILES CHANGED:
- `platform/bootstrap.js` (Created)
- `platform/templates/template-registry.js` (Created)
- `platform/recent/recent-manager.js` (Created)
- `platform/ui-kit/dialogs.js` (Created)
- `platform/dialogs/index.js` (Created)
- `platform/ai/ai-service.js` (Created)
- `platform/i18n/strings.vi.json` (Created)
- `platform/i18n/strings-vi.js` (Created)
- `platform/i18n/i18n.js` (Created)
- `platform/ui-kit/components.js` (Modified)
- `platform/shell/app-shell.js` (Modified)
- `apps/writer/writer-app.js` (Modified)
- `apps/sheet/sheet-app.js` (Modified)
- `apps/sheet/sheet-grid.js` (Modified)
- `apps/slides/slides-app.js` (Modified)
- `apps/slides/slides-canvas.js` (Modified)
- `adapters/libreoffice/sheet/sheet-adapter.js` (Modified)
- `adapters/libreoffice/slides/slides-adapter.js` (Modified)
- `adapters/libreoffice/writer/writer-adapter.js` (Modified)
- `index.html` (Modified)
- `tests/unit/adapter-mapping.test.js` (Rewritten)
- `tests/unit/i18n.test.js` (Created)
- `tests/run-tests.js` (Modified)
- `docs/HANDOFF-COMMERCIAL-FIDELITY.md` (Created)

COMMANDS RUN:
- `git checkout -b feature/platform-commercial-fidelity`
- `node tests/run-tests.js`
- `git diff`
- `git status`
- `git commit`

BUILD RESULT: PASS (Tất cả modules platform, app, adapters đều hoạt động ổn định và nhất quán)
TEST RESULTS: 42/42 PASS | 0 FAIL | 0 NOT RUN | 0 BLOCKED
- Suite 1 (Command Bus): 4/4 PASS
- Suite 2 (Adapter Mapping & Real Dispatch): 23/23 PASS
- Suite 3 (Excel Formula Engine): 8/8 PASS
- Suite 4 (Vietnamese i18n Localization Layer): 4/4 PASS
- Suite 5 (Suite Smoke & Vietnamese Unicode): 3/3 PASS

KNOWN FAILURES: None
RISKS: None (Các thay đổi tuân thủ nghiêm ngặt ranh giới monorepo; không xâm phạm mã nguồn của Claude, core-master hay uno-bridge.js).
DEPENDENCIES/BLOCKERS: None.
CORE PATCH ID (if any): None.
NEXT ACTION: Tiếp tục mở rộng các chuỗi giao diện Ribbon sang sử dụng `t(key)` từ `platform/i18n/`, và kết hợp với Claude khi hoàn thiện kết nối Native UNO Subprocess.
