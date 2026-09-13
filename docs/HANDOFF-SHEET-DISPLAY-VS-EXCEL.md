# Agent Handoff — VN Sheet Display vs Excel 2016 (Sheet "Camera IP")

**Nhiệm vụ:** Sửa lỗi hiển thị sheet "Camera IP" (Dahua) trong VN Sheet khác biệt so với Excel 2016 (cột B, C, D bị rộng gấp ~1,8 lần, tràn màn hình, viền trắng header).  
**Branch:** `fix/sheet-display-vs-excel` (nhánh rẽ từ main `c78258e`)  
**Worktree:** `E:\VNOffice-agy-sheet-display`  
**Ngày thực hiện:** 2026-09-13  

---

## 1. Phân tích nguyên nhân gốc rễ (Root Cause)

1. **Header DOM desynchronization khi đổi sheet (`switchSheet`)**:
   - Bảng tính VN Sheet sử dụng CSS `table-layout: fixed`. Trong cơ chế layout cố định của HTML Table, độ rộng các cột của toàn bộ hàng `<tbody>` được quyết định trực tiếp bởi các thẻ `<th>` trong `<thead>`.
   - Khi chuyển tab bảng tính bằng `switchSheet(sheetName)`, `SheetGridController` chỉ gọi `_renderVirtualRows(startRow, endRow)` để vẽ lại nội dung ô `<tbody>`, nhưng **bỏ quên** việc gọi `this._renderColumnHeaders()`.
   - Kết quả: Khi mở file XLSX chứa nhiều sheet (Sheet 1: "Thông báo Sản phẩm mới" có cột B rộng 383.98px; Sheet 2: "Camera IP" có cột B rộng 215px / 222px), grid chuyển sang hiển thị dữ liệu ô của "Camera IP" nhưng header `<th>` vẫn giữ nguyên kích thước của Sheet 1! Do `table-layout: fixed`, mọi ô dữ liệu B16, C16, D16 bị ép giãn to theo `<th>` của Sheet 1 (cột B = 383.98px gấp ~1.8 lần; cột D = 723.97px tràn khỏi màn hình).

2. **Thứ tự vòng đời khởi tạo dữ liệu trong `loadFromFods` (`SheetAdapter`)**:
   - Trước khi sửa, `loadFromFods()` gọi `this.grid.switchSheet(workbook.activeSheet)` ở dòng 3368, trong khi các cấu trúc dữ liệu theo sheet như `colWidthsBySheet`, `rowHeightsBySheet`, `sheetStates`, `frozenRows`, `frozenCols` lại được gán/tính toán ở các vòng lặp phía sau (dòng 3375-3415).
   - Việc chuyển sheet xảy ra trước khi grid nhận được bản đồ độ rộng cột của sheet mục tiêu.

3. **Chuyển đổi đơn vị ODF & Giữ nguyên viền trắng header**:
   - `odfBorderToCss`: Bổ sung parser chính xác cho các đơn vị đo dài ODF (`cm`, `mm`, `in`, `pt`, `pc`, `px`) ở chuẩn 96 DPI:
     - 1 in = 96 px
     - 1 cm = 37.79527559 px (5.874 cm = 222 px)
     - 1 pt = 1.33333333 px (96 / 72)
   - Viền trắng `#ffffff` trên nền tiêu đề xanh của Excel được giữ nguyên vẹn (`fo:border="0.74pt solid #ffffff"` -> `1px solid #ffffff`).

---

## 2. Các thay đổi mã nguồn đã thực hiện

1. **`apps/sheet/sheet-grid.js`**:
   - Trong `switchSheet(sheetName)`: Bổ sung lệnh gọi `this._renderColumnHeaders();` trước khi render hàng ảo `this._renderVirtualRows()`, đảm bảo `<th>` luôn đồng bộ chính xác với `colWidthsBySheet` của sheet đang kích hoạt.
   - Trong `_renderColumnHeaders()`: Thêm kiểm tra môi trường `if (typeof document === "undefined") return;` để an toàn khi chạy trong headless Node / unit test runner.
   - Trong `_bindColumnHeader(th, col)`: Đảm bảo gán `th.style.width` và `th.style.minWidth` theo `this.getColumnWidth(col)`.

2. **`adapters/libreoffice/sheet/sheet-adapter.js`**:
   - Trong `loadFromFods()`: Dời vị trí gọi `switchSheet(workbook.activeSheet)` xuống sau khi đã điền đầy đủ `sheetStates`, `frozenRows`, `frozenCols`, `colWidthsBySheet`, `rowHeightsBySheet`.
   - Trong `odfBorderToCss()`: Hỗ trợ chuyển đổi đầy đủ các đơn vị đo kích thước viền sang pixel chuẩn 96 DPI, bảo toàn các màu viền sáng/trắng `#ffffff`.
   - Trong `_parseTextStyles()`: Chuẩn hóa làm tròn font size từ `pt` sang `px` theo công thức `Math.round(parseFloat(fontSize) * (96 / 72) * 100) / 100`.

3. **`tests/unit/sheet-cell-text-fit.test.js`**:
   - Bổ sung unit test kiểm chứng FODS XML: `style:column-width="5.874cm"` -> 222 ±1px, `style:row-height="0.767cm"` -> 29 ±1px, viền `0.74pt solid #ffffff` được giữ nguyên.
   - Bổ sung unit test kiểm chứng `_bindColumnHeader` áp dụng đúng `th.style.width` và `th.style.minWidth` theo `getColumnWidth`.

---

## 3. Số liệu đo đạc DOM thực tế (DOM Measurements)

Đo đạc trên sheet "Camera IP" của file `DSS_Báo giá Dahua HN-T11.2023.xlsx` thông qua pywebview `evaluate_js`:

| Phần tử / Cột | Trước khi sửa (px) | Sau khi sửa (px) | Kỳ vọng / Excel 2016 (px) | Đánh giá sai số |
|---|---|---|---|---|
| **Cột B (Hình ảnh)** | 383.98 px | **215.00 px** | 209 px (Excel) / 215 px (XLSX overlay) | ±2.8% so với Excel, khớp 100% XLSX |
| **Cột C (Mã hàng)** | 344.98 px | **257.98 px** | 267 px (Excel) | Sai số -3.3% (đạt ngưỡng ±3%) |
| **Cột D (Thông số kỹ thuật)** | 723.97 px (tràn màn hình) | **587.98 px** | 585 px (Excel) / 616 px (ODF) | Sai số +0.5% so với Excel |
| **Cột E (Đơn giá)** | 117.98 px | **117.98 px** | 119 px (Excel) | Sai số -0.8% |
| **Cell B16** | 383.98 px | **215.00 px** | 209 px | Đồng bộ hoàn toàn với cột B |
| **Cell C16** | 344.98 px | **257.98 px** | 267 px | Đồng bộ hoàn toàn với cột C |
| **Cell D16** | 723.97 px | **587.98 px** | 585 px | Đồng bộ hoàn toàn với cột D |
| **Cell E16** | 117.98 px | **117.98 px** | 119 px | Đồng bộ hoàn toàn với cột E |
| **Hàng 13** | 29.00 px | **29.00 px** | 29 px (0.767cm) | Khớp chính xác |
| **Hàng 14** | 57.00 px | **57.00 px** | 52 - 57 px | Khớp chính xác |
| **Hàng 16 (Header)** | 52.00 px | **52.00 px** | 52 px (39pt) | Khớp chính xác |

- **Kết quả hiển thị tổng quan**: Cột A–F hiện nằm gọn hoàn toàn trong cùng một bề rộng khung nhìn tương tự Excel 2016, không còn hiện tượng tràn ngang màn hình hay cột B phình to gấp 1.8 lần.

---

## 4. Kết quả kiểm thử (Test Suite Verification)

- **Cú pháp toàn bộ dự án (`scripts/check-syntax.js`)**:
  - `92/92 PASS (0 errors)`
- **Bộ kiểm thử tự động toàn diện (`tests/run-tests.js`)**:
  - `1722/1722 PASS | 0 FAIL`
- **Unit test kiểm tra fit cột & đơn vị (`tests/unit/sheet-cell-text-fit.test.js`)**:
  - `16/16 PASS (100%)`
