# Agent Handoff — Formula Autocomplete & IntelliSense for VN Sheet

TASK: Thêm gợi ý hàm (Formula Autocomplete / IntelliSense) cho VN Sheet theo trải nghiệm Microsoft Excel.
AGENT/ROLE: Antigravity (Lead Architecture & UI/UX Agent)
BRANCH: feature/sheet-formula-autocomplete
WORKTREE: E:\VN OFice
OBJECTIVE:
1. Khi người dùng gõ `=` vào một ô rồi tiếp tục gõ chữ (ví dụ `=SU`), hiển thị popup danh sách gợi ý các hàm khớp tiền tố (SUM, AVERAGE...), sắp xếp theo độ liên quan từ `FUNCTION_CATALOG`.
2. Điều hướng gợi ý bằng phím mũi tên lên/xuống, chọn bằng Tab/Enter, đóng bằng Esc chuẩn Excel.
3. Khi đã chọn/gõ xong tên hàm và mở ngoặc `(`, hiển thị tooltip cú pháp tham số ngay dưới ô (ví dụ `SUM(number1, [number2], ...)`), làm đậm tham số hiện tại dựa trên vị trí dấu phẩy.
4. Tái sử dụng component trong `platform/ui-kit/` (`createAutocompletePopup`, `createSyntaxTooltip`), đồng bộ Design System CSS tokens.
5. Bảo toàn 100% hành vi nhập liệu của formula bar và cell navigation trong `sheet-grid.js`.
6. Viết bộ kiểm thử unit tests có ý nghĩa và chạy pass toàn bộ test suite.

FINDINGS:
1. `apps/sheet/formula-engine.js` đã có sẵn danh mục 26 hàm chuẩn (`FUNCTION_CATALOG`) nhưng trước đây chỉ được tra cứu tĩnh thông qua hộp thoại fx.
2. Cần một parser phân tích ngữ cảnh công thức thời gian thực (`parseFormulaContext`) để phát hiện con trỏ đang ở vị trí gõ tiền tố hàm hay đang ở vị trí nhập tham số bên trong cặp ngoặc đơn `(...)`, đồng thời xử lý chính xác dấu phẩy trong chuỗi nháy kép `""` và các hàm lồng nhau.
3. Lưới ô bảng tính nằm trong container có `overflow: auto` nên popup và tooltip cần sử dụng `position: fixed` và tính toán vị trí theo `targetCell.getBoundingClientRect()` để không bị che khuất và luôn hiển thị ngay dưới ô đang nhập.

IMPLEMENTATION SUMMARY:
1. **Formula Engine Extensions (`apps/sheet/formula-engine.js`)**:
   - Bổ sung `getFunctionSuggestions(query, catalog)`: Lọc tiền tố không phân biệt chữ hoa/thường, xếp hạng ưu tiên exact match (score 1000) và tiền tố (score 500 - len diff), trả về mảng rỗng nếu không khớp.
   - Bổ sung `parseFormulaContext(formulaStr, cursorPos, catalog)`: Quét cú pháp chuỗi công thức, theo dõi ngăn xếp ngoặc đơn, bỏ qua dấu phẩy trong nháy kép, phát hiện chính xác mode `autocomplete` (kèm vị trí tiền tố) hoặc mode `syntax_tooltip` (kèm vị trí tham số `activeParamIndex`).
   - Bổ sung `formatSyntaxHtml(syntax, activeParamIndex)`: Định dạng cú pháp thành HTML với `<strong class="vno-syntax-param-active">` bao quanh tham số đang nhập, hỗ trợ cả tham số mở rộng `...` (variadic).
   - Bổ sung `findEnclosingFunction(formulaStr, cursorPos, catalog)`: Truy vết hàm bao quanh cho các biểu thức lồng nhau.
2. **Platform UI Kit Components (`platform/ui-kit/components.js`, `platform/ui-kit/ui-kit.css`)**:
   - `createAutocompletePopup({ onSelect })`: Tạo component popup gợi ý nổi, hiển thị huy hiệu `fx`, tên hàm, danh mục, hỗ trợ chuột và bàn phím, tự động cuộn `scrollIntoView`, an toàn trong môi trường test không có DOM.
   - `createSyntaxTooltip()`: Tạo tooltip nổi hiển thị cú pháp và mô tả hàm ngay dưới ô.
   - Thêm bộ CSS chuyên dụng trong `ui-kit.css` tuân thủ design tokens (`--vno-sheet-primary`, `--vno-sheet-light`, `--vno-shadow-md`...).
3. **Formula Autocomplete Controller & Sheet Integration (`apps/sheet/formula-autocomplete.js`, `apps/sheet/sheet-grid.js`)**:
   - Xây dựng lớp `FormulaAutocompleteController` quản lý vòng đời popup, tooltip, bắt sự kiện gõ phím và tính toán tọa độ neo vào ô lưới đang chọn (`getTargetCellElement`).
   - Tích hợp phím Tab và Enter để tự động chèn tên hàm kèm dấu mở ngoặc `(`, cập nhật giá trị ô và chuyển ngay sang hiển thị tooltip tham số.
   - Hỗ trợ phím Esc để đóng popup/tooltip nhanh chóng.
   - Bổ sung phím tắt `=` trực tiếp từ ô lưới để vào chế độ nhập công thức mượt mà như Excel.
   - Tự động đóng popup/tooltip khi chọn ô khác hoặc nhấp chuột bên ngoài.
4. **Unit Tests & Test Runner (`tests/unit/formula-autocomplete.test.js`, `tests/run-tests.js`)**:
   - Viết 14 bài kiểm tra unit tests toàn diện: kiểm tra lọc "AV" -> AVERAGE, hàm lạ trả về rỗng, hoa/thường, lọc "CO", ưu tiên exact match ("IF", "MIN"), nhận diện context đơn và lồng nhau, nhận diện mở ngoặc/dấu phẩy/đóng ngoặc, bỏ qua phẩy trong nháy kép, định dạng HTML tham số và variadic.
   - Cập nhật runner `tests/run-tests.js` nâng tổng số test lên 56/56 PASS.

FILES CHANGED:
- `apps/sheet/formula-engine.js` (Modified: Thêm helper functions gợi ý hàm, phân tích ngữ cảnh, định dạng cú pháp)
- `apps/sheet/formula-autocomplete.js` (Created: Controller điều phối gợi ý hàm và tooltip tham số)
- `apps/sheet/sheet-grid.js` (Modified: Tích hợp controller vào formula bar, điều hướng ô lưới và phím tắt)
- `platform/ui-kit/components.js` (Modified: Thêm createAutocompletePopup và createSyntaxTooltip)
- `platform/ui-kit/ui-kit.css` (Modified: Thêm style cho popup gợi ý và tooltip cú pháp)
- `tests/unit/formula-autocomplete.test.js` (Created: Bộ 14 bài unit tests cho gợi ý hàm và IntelliSense)
- `tests/run-tests.js` (Modified: Đăng ký suite kiểm thử mới vào runner)
- `docs/HANDOFF-FORMULA-AUTOCOMPLETE.md` (Created)

COMMANDS RUN:
- `git checkout feature/sheet-formula-autocomplete`
- `node tests/run-tests.js`
- `git status`
- `git diff`

BUILD RESULT: PASS (Tất cả modules hoạt động trơn tru, tương thích ngược 100%)
TEST RESULTS: 56/56 PASS | 0 FAIL | 0 NOT RUN | 0 BLOCKED
- Suite 1 (Command Bus): 4/4 PASS
- Suite 2 (LibreOffice Adapter Mapping): 23/23 PASS
- Suite 3 (Excel Spreadsheet Formula Engine): 8/8 PASS
- Suite 4 (Formula Autocomplete & Parameter IntelliSense): 14/14 PASS
- Suite 5 (Vietnamese i18n Localization Layer): 4/4 PASS
- Suite 6 (Suite Smoke & Vietnamese Unicode): 3/3 PASS

KNOWN FAILURES: None.
RISKS: None (Chỉ chỉnh sửa trong scope Sheet, UI Kit và Tests; không đụng chạm Core, UNO bridge hay file I/O).
DEPENDENCIES/BLOCKERS: None.
CORE PATCH ID (if any): None.
NEXT ACTION: Sẵn sàng cho việc review và tích hợp vào các workflow tiếp theo.
