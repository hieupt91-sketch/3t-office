# Handoff: S9 — Khôi phục dải cột ẩn (hiddenColumn) và dòng ẩn ngoài vùng dữ liệu khi lưu XLSX

## 1. Thông tin chung
- **TASK**: S9 — Khôi phục dải cột ẩn (`<col min="..." max="..." hidden="1"/>`) và dòng ẩn (`<row r="..." hidden="1"/>`) ngoài vùng dữ liệu khi lưu XLSX
- **AGENT/ROLE**: Antigravity Lead Agent / Orchestrator
- **BRANCH**: `fix/sheet-hidden-cols-and-rows`
- **WORKTREE**: `E:\VN OFice`
- **OBJECTIVE**: Bảo toàn các dải cột ẩn kéo dài tới XFD (cột 16384) và các dòng trống bị ẩn ở cuối sheet khi lưu XLSX, khắc phục triệt để lớp lỗi `hiddenColumn` lớn nhất của VN Sheet.

---

## 2. Phát hiện & Phân tích nguyên nhân (Root Cause)
1. Trong file Excel thực tế (`01. UNC VÀ DANH SÁCH TRẢ LƯƠNG 3T.xlsx` - `lan02.xlsx`), Sheet 2 (`DANH SÁCH CHI LƯƠNG`) có khai báo:
   ```xml
   <col min="9" max="16384" width="9.1796875" style="5" hidden="1"/>
   ```
   Người dùng chủ động ẩn toàn bộ từ cột I đến XFD để giao diện bảng tính chỉ hiển thị các cột dữ liệu A–H.
2. LibreOffice khi xuất FODS chỉ quét và ghi nhận đến cột Z (cột 26) vì từ cột 27 trở đi không có ô dữ liệu nào.
3. Khi VN Office lưu lại thành XLSX, LibreOffice chỉ ghi nhận dải cột ẩn đến cột 26 (`<col min="9" max="26" hidden="true"/>`). Toàn bộ 16.358 cột từ 27 (AA) đến 16384 (XFD) bị bỏ quên hoàn toàn, khiến Excel khi mở file sẽ hiển thị lại toàn bộ các cột trống này.
4. Tương tự, các dòng 35–38 là các dòng trống được ẩn ở đuôi sheet gốc, nhưng bị LibreOffice cắt bỏ khi xuất FODS và không được ghi lại vào `<sheetData>`.

---

## 3. Giải pháp triển khai
1. **`adapters/libreoffice/common/ooxml_zip_patch.py`**:
   - Thêm hàm `_restore_hidden_columns_and_rows_step(xlsx_bytes, source_xlsx_bytes, replacements)`: Được gọi tự động trong `postprocess_sheet_xlsx()` khi có `source_xlsx_bytes`.
   - Thêm hàm `_restore_hidden_columns_and_rows_from_source(sheet_xml, source_sheet_xml)`:
     + Trích xuất tất cả `<col>` có `hidden="1"` hoặc `hidden="true"` từ `source_sheet_xml`.
     + Nếu dải cột ẩn kéo dài vượt quá cột tối đa hiện có trong `<cols>` mới (ví dụ vượt quá cột 26), bổ sung thẻ `<col min="..." max="..." hidden="true" customWidth="1" width="..." .../>` vào `<cols>`. Nếu sheet mới chưa có thẻ `<cols>`, tự động tạo `<cols>` chèn ngay trước `<sheetData>` theo đúng schema OOXML.
     + Trích xuất các `<row>` có `hidden="1"` từ `source_sheet_xml`. Nếu một dòng ẩn bị thiếu trong sheet mới, tạo thẻ `<row r="N" hidden="true" .../>` và chèn vào `<sheetData>` theo đúng thứ tự số dòng tăng dần (`r` strictly ascending), tuyệt đối không chèn lộn xộn tránh làm hỏng cấu trúc tệp khi Excel mở.
2. **Unit test**:
   - Thêm `tests/test_sheet_hidden_cols_rows.py` kiểm tra việc khôi phục dải cột ẩn đến cột 16384 và các dòng ẩn trống theo đúng thứ tự.

---

## 4. Kết quả đo lường thực tế

### File `lan02.xlsx` (`01. UNC VÀ DANH SÁCH TRẢ LƯƠNG 3T.xlsx`)

| Chỉ số đo | Trước S9 (Baseline sau S8) | Sau S9 (Bản fix hiện tại) | Mức độ cải thiện |
|---|---:|---:|---|
| **hiddenColumn** | **16.358** | **0** | **-100%** (triệt tiêu hoàn toàn) |
| **hiddenRow** | **4** | **0** | **-100%** (triệt tiêu hoàn toàn) |
| **DANH SÁCH CHI LƯƠNG** | 16.363 lệch | **1 lệch** (chỉ còn `merge: A4:F4`) | **-99.99%** |
| **UNC** | 7 lệch | **7 lệch** (4 fill indexed, 1 value G4, 1 align G4, 1 merge G4:I4) | Giữ nguyên độ ổn định |
| **TỔNG LỆCH** | **16.370** | **8** | **-99.95%** |
| **Excel 2016 COM** | OK | **OK (sheets=2)** | Mở hoàn hảo, không lỗi XML |

---

## 5. Kết quả kiểm thử
- `node scripts/check-syntax.js`: **92/92 PASS** (0 lỗi cú pháp).
- `python -m unittest tests/test_sheet_hidden_cols_rows.py`: **PASS**.
- `python -m unittest discover -s tests -p "test_sheet*.py"`: **129/129 PASS** (106.3s).

---

## 6. Khóa quy ước S9 vào hệ thống
- Cập nhật quy ước vào `docs/QUY-UOC-DOI-CHIEU.md`:
  - **S9**: Khôi phục dải cột ẩn kéo dài ngoài vùng dữ liệu (đến 16384/XFD) và dòng ẩn trống từ source XLSX qua `_restore_hidden_columns_and_rows_step`.
