# VN Sheet — Keyboard Entry Audit & Hardening Report

Báo cáo rà soát toàn diện tương tác bàn phím thực tế (mouse click + physical keyboard keystrokes) trên VN Sheet theo tiêu chuẩn mô phỏng thao tác làm việc của kế toán. Kiểm thử bằng Playwright trên trình duyệt Chromium/Edge thật qua `http://127.0.0.1:8769` (Python HTTP server), không gọi hàm nội bộ để giả lập.

Ngày thực hiện: 2026-09-04  
Branch: `fix/sheet-keyboard-entry-audit`  
Worktree: `E:\VNOffice-agy-sheet-keyboard-audit`

---

## 1. Bảng tổng hợp kết quả Audit (9/9 luồng thao tác)

| STT | Luồng thao tác | Loại lỗi phát hiện | Đã sửa | Cách xác minh |
|---|---|---|---|---|
| **1** | **Nhập liệu cơ bản**<br>(Click ô trống, gõ trực tiếp số/chữ/công thức, Enter, điều hướng mũi tên) | **Kẹt focus & Nổi bọt kép**: Sau khi gõ vào `formulaInput` và bấm Enter, sự kiện Enter nổi bọt (bubble) lên `this.container` khiến ô bị nhảy đúp 2 hàng; đồng thời nếu formulaInput chưa nhả focus thì các phím mũi tên bị kẹt không điều hướng được lưới. | 1. Bổ sung `e.stopPropagation()` và `e.preventDefault()` trong `formulaInput.onKeydown` cho Enter.<br>2. Chuyển focus bàn phím thật về `this.container.focus({ preventScroll: true })` nhất quán trong `selectCell()` mà không bị chặn bởi điều kiện kiểm tra `activeElement`. | **Playwright**: Click ô trống J20, gõ `123` + Enter, bấm ArrowDown di chuyển đúng xuống J22 (không nhảy cóc hay kẹt); gõ tiếp `=10+20` + Enter -> hiển thị đúng kết quả `30 ₫`. |
| **2** | **Sửa nội dung ô đã có dữ liệu**<br>(Gõ đè thay thế toàn bộ vs bấm F2 rồi gõ thêm vào cuối) | **F2 xóa sạch nội dung cũ**: `focusFormulaInput()` gọi `.select()` bôi đen toàn bộ chuỗi ký tự, và lệnh dispatch `sheet.cell.edit` gọi hàm này. Khi người dùng bấm F2 rồi gõ tiếp, ký tự mới xóa mất nội dung cũ (thay thế thay vì nối đuôi). | 1. Tách và điều hướng F2 (`_bindGridKeyboardNavigation`) và lệnh `sheet.cell.edit` (`handleDispatch` trong `sheet-adapter.js`) sang `this._focusFormulaInputAtEnd()`.<br>2. Đặt con trỏ ở cuối nội dung hiện có (`setSelectionRange(end, end)`), không bôi đen chọn hết.<br>3. Lưu `_cellValueBeforeEdit` để hỗ trợ hủy bỏ (Esc). | **Playwright**: Click J20 (đang có "999"), bấm F2 rồi gõ "abc" + Enter -> ô thành "999abc" (nối đuôi đúng chuẩn Excel, không xóa "999"). So sánh với gõ đè trực tiếp: click J20, gõ "999" không bấm F2 -> thay thế sạch giá trị trước đó. |
| **3** | **Điều hướng Tab qua nhiều ô trong hàng**<br>(Mô phỏng kế toán điền 1 hàng: STT, tên khoản mục, số lượng, đơn giá...) | **Tab mất focus ra ngoài lưới**: `formulaInput` hoàn toàn thiếu handler cho phím `Tab`. Khi đang nhập dữ liệu trong ô và bấm Tab, trình duyệt kích hoạt di chuyển focus mặc định sang các nút trên giao diện, các ký tự gõ tiếp theo bị dồn vào ô cũ hoặc mất vào hư không. | 1. Thêm xử lý `Tab` (tiến cột kế tiếp) và `Shift+Tab` (lùi cột trước) trong `formulaInput.addEventListener("keydown")`.<br>2. Đóng autocomplete, gọi `selectCell(nextCol, r)` và trả focus về `this.container`.<br>3. Bổ sung `e.stopPropagation()` để không nổi bọt sang container. | **Playwright**: Click J25, gõ "1" -> Tab -> "Khoản mục A" -> Tab -> "5" -> Tab -> "10000" -> Enter. Xác nhận lần lượt J25="1", K25="Khoản mục A", L25="5", M25="10000", không thiếu/lẫn ký tự nào. |
| **4** | **Enter liên tục xuống nhiều hàng**<br>(Kế toán điền 1 cột dữ liệu dọc) | **Nhảy đúp hàng**: Khi nhấn Enter liên tục để điền dọc một cột, sự kiện Enter vừa được `formulaInput` xử lý vừa nổi bọt lên container khiến con trỏ nhảy 2 hàng mỗi nhịp; đồng thời thiếu hỗ trợ Shift+Enter để lùi hàng. | 1. Hỗ trợ đối xứng `Enter` (xuống hàng) và `Shift+Enter` (lên hàng) trên cả `container` và `formulaInput`.<br>2. Ngắt nổi bọt bằng `e.stopPropagation()`. | **Playwright**: Click N20, gõ "Dong1" -> Enter -> "Dong2" -> Enter -> "Dong3" -> Enter. Xác nhận N20="Dong1", N21="Dong2", N22="Dong3". |
| **5** | **Copy/Paste bằng Ctrl+C/Ctrl+V thật**<br>(Sao chép giữa các ô bằng phím tắt bàn phím) | **Thiếu handler binding & Thất bại khi chặn Clipboard API**: `SheetAdapter.attach()` chưa bind các lệnh `common.edit.copy`/`cut`/`paste` vào Command Bus; nếu môi trường headless hoặc bảo mật chặn `navigator.clipboard.readText()` thì việc dán hoàn toàn thất bại. | 1. Đăng ký trực tiếp `common.edit.copy`, `common.edit.cut`, `common.edit.paste` trong `SheetAdapter.attach()`.<br>2. Bổ sung bộ nhớ đệm nội bộ `this._clipboardText` trong `_copySelectedCell` và `_pasteIntoSelectedCell` làm cơ chế fallback đáng tin cậy khi trình duyệt từ chối quyền Clipboard.<br>3. Thêm phím tắt Ctrl+C, Ctrl+V, Ctrl+X trực tiếp trong `_bindGridKeyboardNavigation`. | **Playwright**: Chọn N20 ("Dong1"), bấm Ctrl+C thật, chuyển sang N25, bấm Ctrl+V thật -> N25 nhận đúng giá trị "Dong1". |
| **6** | **Delete / Backspace trên ô/vùng đã chọn**<br>(Xóa giá trị không vào edit mode, giữ định dạng) | **Xóa vùng chọn chỉ xóa 1 ô**: Khi chọn một vùng nhiều ô (`selectionRange`) và nhấn Delete/Backspace, mã nguồn cũ chỉ xóa duy nhất ô active `selectedCoord`, bỏ sót toàn bộ các ô còn lại trong vùng chọn. | 1. Cập nhật handler Delete/Backspace trong `_bindGridKeyboardNavigation`: nếu đang chọn vùng nhiều ô, duyệt qua toàn bộ tọa độ trong vùng bằng `this.formulaEngine.expandRange()` và xóa sạch giá trị từng ô.<br>2. Giữ nguyên toàn bộ cấu trúc `item.style` (không xóa nhầm định dạng in đậm, màu sắc, font). | **Playwright**: Chọn N25, nhấn Delete -> giá trị rỗng.<br>**Unit test Suite 43**: Chọn vùng A10:B10 có style in đậm, nhấn Delete -> cả hai ô rỗng, style `fontWeight: bold` được bảo toàn nguyên vẹn. |
| **7** | **Undo / Redo (Ctrl+Z / Ctrl+Y) bằng phím tắt**<br>(Ngay sau khi gõ dữ liệu bằng bàn phím thật) | **Ký tự đầu tiên không gộp lịch sử**: Nhánh gõ trực tiếp ký tự đầu tiên khi chọn ô gọi `setCellValue` mà không truyền `{ coalesce: true }`, có thể tách thao tác nhập thành nhiều bước undo rời rạc. | 1. Thêm `{ coalesce: true }` khi gõ trực tiếp ký tự đầu tiên (`length === 1`) và phím `=`.<br>2. Đảm bảo stack undo ghi nhận toàn vẹn giá trị ban đầu và giá trị sau khi sửa. | **Playwright**: Click P20, gõ "GiaTriBanDau" + Enter -> bấm Ctrl+Z thật -> P20 trở về rỗng; bấm Ctrl+Y thật -> P20 phục hồi đúng "GiaTriBanDau". |
| **8** | **Nhập công thức hàm tài chính mới**<br>(PMT, FV, PV, RATE, SLN, DB...) | **Lỗi `#VALUE!` khi đối số chứa phép tính**: Hàm `_resolveSingleValue()` trong `formula-engine.js` chỉ ép kiểu số nguyên thủy hoặc tham chiếu ô; khi người dùng gõ công thức chuẩn Excel có phép tính số học bên trong đối số (vd: `=PMT(0.08/12, 12*5, 100000000)` hoặc `=SLN(..., 10/2)`), `Number("0.08/12")` trả về `NaN`, dẫn đến toàn bộ hàm tài chính trả về `#VALUE!`. | 1. Nâng cấp `_resolveSingleValue()` trong `formula-engine.js`: nếu đối số chứa toán tử số học (`+`, `-`, `*`, `/`, `^`, `()`), tự động tính toán giá trị số thực bằng `this._evaluateArithmetic(token, { raw: true })`.<br>2. Hỗ trợ hàm lồng nhau trong đối số qua `this.evaluate("=" + token)`. | **Playwright**: Gõ `=PMT(0.08/12,60,100000000)` vào Q25 -> trả về `-2.027.639 ₫`; gõ `=SLN(100000000,10000000,5)` vào Q26 -> trả về `18.000.000 ₫`. |
| **9** | **Chọn vùng nhiều ô, gõ giá trị + Enter**<br>(Shift+click chọn vùng, nhập dữ liệu) | **Mất ô neo (anchor) khi Shift+click**: Khi Shift+click mở rộng vùng chọn, `selectCell()` ghi đè `selectedCoord` thành ô được click cuối cùng thay vì giữ nguyên ô neo ban đầu; dẫn tới việc gõ dữ liệu bị điền sai vị trí ô active. | 1. Sửa `selectCell()`: khi `extendRange === true`, chỉ cập nhật `selectionRange.end`, giữ nguyên `selectedCoord = selectionRange.start` (ô neo active chuẩn Excel).<br>2. Đảm bảo thao tác gõ giá trị chỉ áp dụng vào ô active, tuyệt đối không ghi đè các ô khác trong vùng chọn. | **Playwright**: Click R20, Shift+click R22 (chọn vùng R20:R22), gõ "OnlyR20" + Enter -> chỉ duy nhất R20 nhận giá trị "OnlyR20", các ô R21 và R22 vẫn giữ nguyên trạng thái rỗng ban đầu. |

---

## 2. Các tệp đã chỉnh sửa

1. `apps/sheet/sheet-grid.js`:
   - Sửa `formulaInput` keydown: thêm `e.stopPropagation()`, xử lý Enter / Shift+Enter, Tab / Shift+Tab, Escape khôi phục giá trị cũ.
   - Sửa `selectCell()`: bảo toàn ô neo `selectedCoord` khi mở rộng vùng (`extendRange`), luôn trả focus bàn phím thật về container.
   - Sửa `_bindGridKeyboardNavigation`: xử lý Delete/Backspace cho toàn bộ vùng chọn, thêm Ctrl+C/V/X, chuyển F2 sang `_focusFormulaInputAtEnd()`, chuyển dblclick sang `_focusFormulaInputAtEnd()`.
2. `apps/sheet/formula-engine.js`:
   - Nâng cấp `_resolveSingleValue()`: tự động đánh giá biểu thức số học (ví dụ `0.08/12`, `12*5`) và hàm lồng nhau trong đối số hàm.
   - Bổ sung tùy chọn `{ raw: true }` cho `_evaluateArithmetic()` để giữ độ chính xác số thực dấu phẩy động cho các thuật toán tài chính (PMT, FV, PV, RATE).
3. `adapters/libreoffice/sheet/sheet-adapter.js`:
   - Gắn trực tiếp `common.edit.copy`, `common.edit.cut`, `common.edit.paste` trong `attach()`.
   - Bổ sung cơ chế fallback bộ nhớ đệm `this._clipboardText` khi Clipboard API bị chặn.
   - Sửa lệnh `sheet.cell.edit` (`handleDispatch`) dùng `_focusFormulaInputAtEnd()` thay vì `focusFormulaInput()`.
4. `tests/unit/sheet-keyboard-audit.test.js` & `tests/run-tests.js`:
   - Thêm Test Suite 43 (5 bài kiểm tra chuyên biệt cho bàn phím, vùng chọn, fallback clipboard và tính toán đối số số học).
5. `tests/live/sheet-keyboard-audit.playwright.mjs`:
   - Kịch bản kiểm thử Playwright trực tiếp 9/9 bước qua click chuột và gõ phím thật.

---

## 3. Kết quả kiểm thử tự động

- **Unit & Behavioral Tests**: `node tests/run-tests.js`
  - **484/484 bài kiểm tra PASS (100%)**
  - Thời gian thực thi: **~15 giây** (đạt tiêu chuẩn bắt buộc < 60 giây).
- **Live Playwright Audit**: `node tests/live/sheet-keyboard-audit.playwright.mjs`
  - **9/9 bước PASS (100%)**
  - Đầy đủ click chuột thật, keydown/type/press thật, kiểm chứng DOM và runtime map.
