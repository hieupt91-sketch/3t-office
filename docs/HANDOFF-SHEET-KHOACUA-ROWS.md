# Agent Handoff: VN Sheet — Hiển thị KHÓA CỬA Parity với Excel (Format Số, Vị trí Ảnh, Độ rộng Cột)

**Task**: Sửa hiển thị file `KHOACUA.xlsx` (sheet "KHÓA THÔNG MINH") đảm bảo parity với Excel 2016:
1. Lỗi 1: Định dạng số numFmt 164 `_-* #,##0\ _₫_-` không in thừa ký hiệu "₫" (F7/G7/H7/I7 và hàng 8).
2. Lỗi 2: Vị trí ảnh sản phẩm (cột B hàng 7, 8) không đè lên hàng tiêu đề xanh (hàng 6), khớp Excel (±2px).
3. Lỗi 3: Độ rộng cột tính theo max-digit-width của font mặc định (Arial 11 = 8px thay vì mặc định 7px).

**Branch**: `fix/sheet-display-khoacua-rows`  
**Worktree**: `E:\VNOffice-agy-sheet-rows`  
**Base commit**: `35a154f`

---

## 1. Nguyên nhân gốc rễ (Root Cause Analysis)

### Lỗi 1: Số hiện thêm "₫" (F7 "₫ 8,890,000" thay vì "8,890,000")
- **Nguyên nhân**:
  - Trong `xl/styles.xml`, numFmt 164 có định dạng: `_-* #,##0\ _₫_-;\-* #,##0\ _₫_-;_-* "-"??\ _₫_-;_-@`.
  - Trong cú pháp Excel number format:
    - `_x`: chừa một khoảng trống có độ rộng bằng ký tự `x` (character padding/spacing token), **không** in ký tự `x`. Vì vậy `_₫` chỉ là chừa khoảng trống bằng ký tự đồng tiền để căn lề thẳng hàng với các dòng có tiền tệ thật.
    - `* ` (dấu hoa thị + khoảng trắng): lặp khoảng trắng để căn lề.
    - `\x`: in ký tự `x` thoát (escaped literal).
    - Section 3 `_-* "-"??\ _₫_-`: định dạng cho giá trị 0 thành `"-"`.
  - Hàm `numberFormatFromExcelCode(code)` trong `adapters/libreoffice/sheet/sheet-adapter.js` dùng biểu thức chính quy `source.match(/[$€£¥₫]/)` trực tiếp trên toàn chuỗi mà chưa loại trừ `_x` tokens. Do đó, `_₫` bị nhận nhầm thành đơn vị tiền tệ (`currency: "₫"`), dẫn đến renderer tự động chèn "₫ " vào trước số nguyên.
  - Tương tự, numFmt 165 `_(#,##0_)` dùng `_(` và `_)` để chừa khoảng trống căn lề số âm đóng ngoặc đơn.
  - Ngoài ra trong `apps/sheet/number-formatter.js`, `formatNumber(0, ...)` chưa xử lý section 3 `"-"` (zeroFormat), và `formatCustom` chưa làm sạch các token Excel `_x`, `*x`, `\x`.

### Lỗi 2: Ảnh sản phẩm đè lên hàng tiêu đề hàng 6 (Ảnh B7 tràn lên header)
- **Nguyên nhân**:
  - `renderImages()` trong `apps/sheet/sheet-grid.js` tính tọa độ `top` của ảnh dựa trên tổng lũy kế chiều cao các hàng `24 + this._rowTop(image.anchor.r)`.
  - Giá trị `_rowTop(r)` được tính từ metadata mảng `rowHeights` của FODS/XLSX. Tuy nhiên trong DOM HTML table thực tế, hàng 2 (chứa văn bản giới thiệu dài có nhiều ngắt dòng `\n`) và hàng 5 tự động co giãn theo nội dung text (`tr[data-row="2"]` cao ~109px thay vì 91px, `tr[data-row="5"]` cao ~43px thay vì 38px, tổng lệch +23px).
  - Kết quả: `tr[data-row="7"]` trong DOM thực tế nằm ở `offsetTop = 294.5px`, trong khi prefix-sum lý thuyết trả về `271.7px`. Ảnh được đặt ở `top = 271.7px`, khiến phần đỉnh ảnh bị đẩy lên trên `22.8px`, đè trực tiếp lên chữ "Hình ảnh" của hàng header 6.
  - Khi cuộn hoặc render lại virtual rows, tọa độ ảnh không được đồng bộ lại với vị trí DOM thực tế của dòng.

### Lỗi 3: Độ rộng cột hẹp hơn Excel ~10% (B: Excel 255px vs App 232px)
- **Nguyên nhân**:
  - File `KHOACUA.xlsx` có font mặc định là `Arial` 11pt (khai báo font đầu tiên trong `xl/styles.xml`).
  - Thuật toán tính độ rộng cột của Excel dựa trên công thức OpenXML: `width_px = Truncate((width_chars * max_digit_width + 5) / max_digit_width * 256) / 256 * max_digit_width`.
  - Max digit width của Calibri 11pt là 7px, trong khi của Arial 11pt là 8px, Times New Roman 12pt là 8px.
  - Trước đây `_overlay_sheet_layout_from_xlsx()` trong `adapters/libreoffice/common/ooxml_zip_patch.py` cố định digit-width = 7px cho mọi file, dẫn đến cột 30 ký tự của file dùng Arial bị hẹp đi (30 * 7 = 210px thay vì 30 * 8 = 240px).

---

## 2. Giải pháp và Thay đổi đã thực hiện

### 1. `adapters/libreoffice/sheet/sheet-adapter.js`
- Cải tiến `numberFormatFromExcelCode(code)`:
  - Tách các section (`pos;neg;zero;text`).
  - Nhận diện section 3 hiển thị `"-"` cho số 0 (ví dụ `"-"??` -> `zeroFormat: "-"`).
  - Làm sạch các token `_x` (spacing/padding token), `*x`, `\x`, và các thẻ thuộc tính `[Color]`, `[>=100]` trước khi kiểm tra ký hiệu tiền tệ trần.
  - Chỉ nhận diện `currency` nếu ký hiệu tiền tệ xuất hiện dạng literal thực sự ngoài `_x`.
  - Xử lý numFmt 165 `_(#,##0_)` thành định dạng số chuẩn có phân tách hàng nghìn, không thêm ký hiệu tiền tệ.

### 2. `apps/sheet/number-formatter.js`
- Hỗ trợ `zeroFormat === "-"` hoặc `zeroAsDash: true`: khi giá trị bằng 0 sẽ trả về `"-"`.
- Trong `formatCustom(value, formatStr)`:
  - Phân tích và lựa chọn section tương ứng với dấu của giá trị (`> 0`, `< 0`, `= 0`).
  - Loại bỏ các padding token `_x` và fill token `*x`.
  - Chuyển `\x` thành `x`.
  - Loại bỏ token đệm `?`.

### 3. `apps/sheet/sheet-grid.js`
- Trong `renderImages()`:
  - Kiểm tra xem dòng target `tr[data-row="<anchor.r>"]` có đang hiện diện trong DOM `this.tbody` hay không.
  - Nếu có, sử dụng trực tiếp `targetTr.offsetTop` làm mốc tính `top` thay vì chỉ dựa vào `this._rowTop(image.anchor.r)` lý thuyết:
    ```javascript
    const targetTr = this.tbody ? this.tbody.querySelector('tr[data-row="' + image.anchor.r + '"]') : null;
    let topAcc = (targetTr && typeof targetTr.offsetTop === 'number')
      ? targetTr.offsetTop
      : (24 + this._rowTop(image.anchor.r));
    ```
  - Bổ sung phương thức `_updateImagePositions()` trong `SheetGridController` để cập nhật lại tọa độ top/left của toàn bộ overlay images mỗi khi virtual rows render hoặc kích thước hàng DOM thay đổi.
  - Gọi `this._updateImagePositions()` ở cuối `_renderVirtualRows()`.

### 4. `adapters/libreoffice/common/ooxml_zip_patch.py`
- Bổ sung hàm `_extract_default_font_digit_width(xlsx_bytes)`:
  - Đọc `xl/styles.xml` để lấy font mặc định (font đầu tiên trong `<fonts>`).
  - Xác định `max_digit_width` theo bảng tra cứu chuẩn:
    - Arial (>= 11pt): 8px
    - Calibri (>= 11pt): 7px
    - Times New Roman (>= 11pt): 8px
    - Segoe UI (>= 11pt): 8px
    - Tahoma (>= 11pt): 8px
    - Mặc định: 7px.
  - Áp dụng `digit_width` tương ứng khi tính toán overlay độ rộng cột từ OpenXML sang px/cm trong FODS.

---

## 3. Kết quả Kiểm tra và Xác minh

### 1. Visual Verification (Chụp màn hình đối chiếu)
- Lệnh:
  ```bash
  python _capture_vnsheet2.py "E:\VNOffice-agy-sheet-rows" "E:\VNOffice-agy-sheet-rows\file test\KHOACUA.xlsx" "KHÓA THÔNG MINH" 5 _app_A5_after.png
  ```
- **Kết quả hình ảnh `_app_A5_after.png` so với `_excel_A5.png`**:
  - Hàng tiêu đề 6 (nền xanh): hoàn toàn sạch sẽ, chữ "Hình ảnh" rõ ràng, không còn bị ảnh khóa đè lên.
  - Ảnh khóa B7: bắt đầu chính xác tại mép trên của hàng 7 (`diff = +1.17px`), nằm gọn gàng bên trong ô B7.
  - Các ô giá F7, G7, H7, I7: hiển thị đúng `8,890,000`, `6,223,000`, `5,778,500`, `5,334,000` (căn phải, không có ký hiệu "₫").
  - Hàng 8: hiển thị đúng `8,090,000`, `5,663,000`, `5,258,500`, `4,854,000` (căn phải, không có ký hiệu "₫").

### 2. Unit Tests
- `node tests/run-tests.js`:
  - **1730/1730 PASS | 0 FAIL** (Toàn bộ test suite hoàn thành không lỗi).
  - Test cụ thể đã bổ sung/chạy:
    - `tests/unit/sheet-import-audit.test.js`: test formatCode `_-* #,##0\ _₫_-` và `_(#,##0_)` với giá trị `8890000` -> `"8,890,000"`, `0` -> `"-"`.
    - `tests/unit/sheet-images.test.js`: test anchor row 7 căn chỉnh chính xác theo `offsetTop` của dòng DOM.

---

## 4. Tệp thay đổi (Tracked Files)

| Đường dẫn tệp | Mô tả thay đổi |
|---|---|
| `adapters/libreoffice/sheet/sheet-adapter.js` | Sửa `numberFormatFromExcelCode` loại bỏ `_x`, `*x`, `\x`, nhận diện `zeroFormat: "-"` |
| `apps/sheet/number-formatter.js` | Hỗ trợ zeroFormat dash, xử lý token Excel trong `formatCustom` |
| `apps/sheet/sheet-grid.js` | Dùng `targetTr.offsetTop` cho vị trí top của ảnh, thêm `_updateImagePositions` |
| `adapters/libreoffice/common/ooxml_zip_patch.py` | Bổ sung `_extract_default_font_digit_width` tính col width theo font |
| `tests/unit/sheet-import-audit.test.js` | Unit test cho formatCode numFmt 164 & 165 |
| `tests/unit/sheet-images.test.js` | Unit test cho image anchor DOM offsetTop alignment |
| `docs/HANDOFF-SHEET-KHOACUA-ROWS.md` | Tài liệu handoff chi tiết |
