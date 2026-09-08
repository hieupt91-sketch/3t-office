# Kế hoạch Thực hiện: Kiểm tra thật Khả năng Điều hướng Bàn phím (Accessibility)

## 1. Mục tiêu (Objective)
Đảm bảo toàn bộ bộ ứng dụng VN Office (VN Writer, VN Sheet, VN Slides) có thể sử dụng trơn tru, chuẩn xác **hoàn toàn bằng bàn phím** (Tab, Shift+Tab, Enter, Space, Arrow keys, Esc) mà không cần dùng chuột:
1. **Thứ tự Tab trên Ribbon**: di chuyển theo thứ tự DOM hợp lý, không có điểm đen bị bỏ qua, toàn bộ controls có viền `:focus-visible` rõ ràng.
2. **Chuyển tab Ribbon bằng phím**: kết nối nút «Tệp» (File) vào vòng lặp điều hướng phím mũi tên (ArrowLeft / ArrowRight / Home / End) cùng các tab chức năng.
3. **Dialog bẫy focus (focus trap)**: nâng cấp hàm `trapFocus` trong `format-cells-dialog.js`, `cell-styles.js`, và `sheet-grid.js` để lọc phần tử hiển thị thật (`offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0`), ngăn ngừa tuyệt đối tình trạng focus thoát ra ngoài nền khi ở tab cuối hoặc đóng dialog bằng Esc.
4. **Vùng soạn thảo chính**: xác nhận phím gõ & Ctrl+B/I/U trong Writer; phím mũi tên/Tab/Enter và Ctrl+1 trong Sheet kèm khôi phục focus về ô sau khi đóng dialog; chọn hình khối bằng Tab/mũi tên trong Slides.
5. **Menu Backstage (Tệp)**: mở bằng phím (`Alt+F` hoặc Tab+Enter vào nút «Tệp»), điều hướng sidebar bằng phím mũi tên (ArrowUp / ArrowDown), phím Esc đóng và khôi phục focus về trigger element.

## 2. Hiện trạng & Lỗi phát hiện (Current State & Findings)
1. **Format Cells Dialog**: `trapFocus` trong `apps/sheet/format-cells-dialog.js` dùng `element.querySelectorAll(...)` mà không lọc các phần tử nằm trong tab ẩn (`display: none`). Khi đang ở tab Number, các controls trong tab Alignment vẫn nằm trong mảng focusables khiến nút cuối cùng (OK/Cancel) không khớp `last`, dẫn đến khi bấm Tab tại nút cuối, focus bị thoát ra ngoài nền phía sau.
2. **Sheet Cell Styles & Sheet Grid Dialogs**: `apps/sheet/cell-styles.js` và `apps/sheet/sheet-grid.js` dòng 70 cũng chứa phiên bản `trapFocus` cũ chưa lọc phần tử hiển thị.
3. **Ribbon File Button Navigation**: Nút «Tệp» (`.vno-ribbon-tab-file`) chưa có bộ lắng nghe phím mũi tên; khi bấm ArrowRight tại nút Tệp không chuyển sang tab Trang đầu, và khi bấm ArrowLeft tại tab Trang đầu không quay về nút Tệp.
4. **Menu Backstage (Tệp)**: Thiếu xử lý phím mũi tên lên/xuống (ArrowUp / ArrowDown) giữa các mục sidebar (`vno-backstage-sidebar button`), và chưa có phím tắt trực tiếp `Alt+F` chuẩn Office để mở nhanh Backstage.

## 3. Các tệp chỉnh sửa (Files to Modify)
- `platform/commands/command-definitions.js`: Thêm định nghĩa lệnh `common.file.backstage` với phím tắt `Alt+F`.
- `platform/shell/app-shell.js`: Gắn handler cho `common.file.backstage` mở Backstage; bổ sung xử lý phím mũi tên ArrowUp / ArrowDown giữa các nút sidebar Backstage.
- `platform/ribbon/ribbon-host.js`: Bổ sung phím mũi tên ArrowRight / ArrowLeft trên nút «Tệp» và kết nối vòng lặp chuyển tab với tab chức năng đầu tiên/cuối cùng.
- `apps/sheet/format-cells-dialog.js`: Nâng cấp hàm `trapFocus` lọc phần tử hiển thị chuẩn WAI-ARIA.
- `apps/sheet/cell-styles.js`: Nâng cấp hàm `trapFocus`.
- `apps/sheet/sheet-grid.js`: Nâng cấp hàm `trapFocus` ở dòng 70.

## 4. Kiểm thử (Test Plan)
1. `node scripts/check-syntax.js`: 89/89 PASS.
2. `node tests/run-tests.js`: 1511/1511 PASS.
3. `node tests/live/ribbon-audit-1280.playwright.mjs`: 100% PASS.
4. Viết `tests/live/accessibility-keyboard-navigation.playwright.mjs`: kiểm thử tự động toàn diện 5 nhóm yêu cầu chỉ bằng `page.keyboard` thật.
5. Viết tài liệu `docs/HANDOFF-ACCESSIBILITY-KEYBOARD-NAV.md`.

## 5. Rủi ro & Giảm thiểu (Risks & Mitigations)
- Không đụng chạm `aria-label` hay `role` theo đúng ranh giới an toàn của TASK-BRIEF.
- Không sửa `main.py`.
- Mọi hàm sửa đổi đều giữ nguyên tham số và tương thích 100% với các test hiện hữu.
