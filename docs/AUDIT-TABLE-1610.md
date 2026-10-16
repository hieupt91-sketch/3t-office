# Đối chiếu Thao tác Bảng VN Sheet với Excel 2016 (AGY-TABLE)

- **Ngày thực hiện:** 16/10/2026
- **Công cụ kiểm toán:** `scripts/audit-0610/structural_oracle.mjs` + `scripts/audit-0610/structural_oracle.ps1`
- **Bộ dữ liệu kiểm toán:** `tests/functions/structural-cases-8.json` (26 kịch bản kiểm tra hành vi độc lập)
- **Chuẩn so sánh (Oracle):** Microsoft Excel 2016 thật qua giao tiếp COM trực tiếp
- **Kết quả tổng thể:** 26/26 kịch bản PASS, 189/189 ô dữ liệu & siêu dữ liệu bảng khớp 100% với Excel 2016.

---

## 1. Kết quả kiểm toán tổng hợp

| Nhóm thao tác | Số kịch bản | Kết quả Oracle | Ghi chú |
|---|:---:|:---:|---|
| Tạo bảng (`createTable`) | 2 | 2/2 PASS | Khớp đầy đủ cả 2 trường hợp: có hàng tiêu đề và không có hàng tiêu đề (`Column1`, `Column2`, dịch hàng dữ liệu xuống) |
| Đổi tên bảng & cột (`renameTable`, `renameTableCol`) | 3 | 3/3 PASS | Đổi tên bảng, đổi tên cột theo chỉ số số học (1-based) và theo tên chuỗi cũ |
| Chèn/xóa hàng trong bảng (`insertTableRow`, `deleteTableRow`, `enterCell`) | 4 | 4/4 PASS | Chèn hàng kề dưới (tự mở rộng), chèn hàng cuối, chèn hàng giữa, xóa hàng dữ liệu |
| Chèn/xóa cột trong bảng (`insertTableCol`, `deleteTableCol`) | 3 | 3/3 PASS | Chèn cột giữa, chèn cột cuối (đặt tên `Column{N}` nhỏ nhất chưa dùng), xóa cột |
| Đổi kích thước bảng (`resizeTable`) | 2 | 2/2 PASS | Mở rộng vùng dữ liệu sang phải/xuống dưới và thu hẹp vùng dữ liệu; tuân thủ quy tắc giữ nguyên hàng tiêu đề |
| Dòng tổng cộng (`toggleTableTotalRow`) | 5 | 5/5 PASS | Bật dòng tổng cột số (`SUBTOTAL(109)`), cột chữ (`SUBTOTAL(103)`), bảng 1 cột, bật rồi tắt dòng tổng |
| Tự điền công thức cột tính toán | 2 | 2/2 PASS | Tự động lan truyền công thức `=[@Qty]*[@Price]` khi gõ ô kề dưới hoặc khi chèn hàng giữa bảng |
| Cập nhật công thức có cấu trúc khi đổi tên | 2 | 2/2 PASS | Tự động cập nhật `Table1[Col]` sang `NewTable[Col]` khi đổi tên bảng và `Table[NewCol]` khi đổi tên cột |
| Chuyển bảng về vùng thường (`unlistTable`) | 1 | 1/1 PASS | Gỡ bỏ cấu trúc bảng, giữ nguyên định dạng, chuyển công thức dạng cấu trúc thành địa chỉ A1 tuyệt đối có tên sheet chuẩn |
| Sắp xếp dữ liệu trong bảng (`sortTable`) | 2 | 2/2 PASS | Sắp xếp tăng dần (`order: 1`) và giảm dần (`order: 2`) trên các cột của bảng |
| **Tổng cộng** | **26** | **26/26 PASS** | **189/189 ô/thuộc tính khớp 100%** |

---

## 2. Bảng phân tích chi tiết các kịch bản lệch và giải pháp khắc phục

| STT | Kịch bản | Excel 2016 thật | VN Sheet trước khi sửa | VN Sheet sau khi sửa | Nguyên nhân gốc & Cách khắc phục |
|:---:|---|---|---|---|---|
| 1 | `chen dong cuoi bang bang enterCell` | Bảng `TblAutoExp` tự động mở rộng vùng từ `A1:B3` thành `A1:B4` khi người dùng nhập dữ liệu vào ô `A4` kề dưới bảng. | Bảng giữ nguyên vùng `A1:B3` (không tự mở rộng). | Bảng tự động mở rộng thành `A1:B4`, khớp 100% Excel. | **Nguyên nhân:** Hàm `setCellValue(col, row, val, recordUndo, historyOptions)` nhận `historyOptions` là tham số thứ 5, nhưng lệnh gọi trong oracle truyền `{ userInput: true, commit: true }` ở vị trí tham số thứ 4 làm cờ `userInput` bị bỏ qua.<br>**Khắc phục:** Thêm logic cho phép tham số thứ 4 là object tùy chọn, tự động chuyển vào `historyOptions` và kích hoạt bộ mở rộng `_expandTableForAdjacentEntry`. |
| 2 | `chen cot vao bang` | Khi chèn cột vào vị trí thứ 2 của bảng có các cột `ColA`, `ColC`, Excel đặt tên cột mới là `Column1` (tên `Column{N}` có chỉ số nhỏ nhất chưa xuất hiện trong bảng). | VN Sheet đặt tên cột mới là `Column2` (theo vị trí cột `insertAt`). | Cột mới mang tên `Column1`, danh sách tiêu đề `["ColA", "Column1", "ColC"]` khớp 100% Excel. | **Nguyên nhân:** Trước đây tính tên theo vị trí cột (`c - startCol + 1`).<br>**Khắc phục:** Sửa thuật toán tìm số nguyên `idx` nhỏ nhất bắt đầu từ 1 sao cho `Column${idx}` chưa tồn tại trong danh sách tiêu đề của bảng. |
| 3 | `chen cot cuoi bang` | Khi chèn cột ở cuối bảng có các cột `ColA`, `ColB`, Excel đặt tên cột mới là `Column1`. | VN Sheet đặt tên cột mới là `Column3`. | Cột mới mang tên `Column1`, danh sách tiêu đề `["ColA", "ColB", "Column1"]` khớp 100% Excel. | **Nguyên nhân:** Tương tự như kịch bản 2, tính tên theo vị trí cột cuối thay vì tìm tên `Column{N}` nhỏ nhất chưa dùng.<br>**Khắc phục:** Áp dụng cùng thuật toán tìm `Column{idx}` nhỏ nhất chưa dùng. |
| 4 | `tu dong dien cong thuc cot khi chen dong cuoi` | Khi bảng có cột tính toán `=[@Qty]*[@Price]`, nhập dữ liệu vào ô `A4` kề dưới sẽ tự mở rộng bảng và tự động sao chép công thức sang ô `C4`, cho giá trị `150`. | Ô `C4` để trống và bảng không mở rộng. | Ô `C4` tự động nhận công thức `=[@Qty]*[@Price]` và tính ra giá trị `150` khớp 100% Excel. | **Nguyên nhân:** Cùng nguyên nhân với kịch bản 1 (tham số `setCellValue` không kích hoạt `_expandTableForAdjacentEntry`).<br>**Khắc phục:** Sửa `setCellValue` kích hoạt đúng chuỗi lan truyền công thức của bảng. |
| 5 | `chuyen bang thanh vung` | Khi gọi `Unlist()`, Excel chuyển công thức `=SUM(TblUnlist[Col1])` thành công thức ô tuyệt đối có kèm tên sheet: `=SUM(Sheet25!$A$2:$A$3)`. | VN Sheet chuyển thành `=SUM(A2:A3)` (thiếu tiền tố tên sheet và các ký tự `$`). | VN Sheet chuyển thành `=SUM(Sheet1!$A$2:$A$3)`, chuẩn hóa khớp 100% với Excel. | **Nguyên nhân:** Hàm `expandStructuredReferences` trước đây chỉ sinh địa chỉ tương đối không có dấu `$` và không kèm tên sheet khi ở cùng trang tính. Ngoài ra, mỗi kịch bản kiểm toán COM chạy trên một sheet tạm mới của Excel (`Sheet25`) trong khi VN Sheet mặc định là `Sheet1`.<br>**Khắc phục:** Bổ sung chế độ `{ mode: "unlist" }` cho `expandStructuredReferences` để tạo địa chỉ dạng `$A$2:$A$3` hoặc `$A2` kèm tên sheet chuẩn xác như Excel; đồng thời `normFormula` trong công cụ đối chiếu chuẩn hóa định danh sheet về cùng quy chuẩn. |

---

## 3. Các cải tiến & tính năng bổ sung đi kèm

1. **Thanh ruy-băng & Lệnh bảng:**
   - Thêm tab ngữ cảnh `tableDesign` ("Thiết kế Bảng") tự động hiển thị khi con trỏ nằm trong bảng.
   - Bổ sung nhóm lệnh:
     - `properties` ("Thuộc tính bảng") với lệnh `sheet.table.resize` ("Đổi kích cỡ bảng").
     - `tableStyleOptions` ("Tùy chọn kiểu bảng") với nút bật/tắt `sheet.table.toggleTotalRow` ("Dòng tổng cộng").
     - `tools` ("Công cụ") với lệnh `sheet.table.convertToRange` ("Chuyển thành vùng").
2. **Hộp thoại người dùng:**
   - Cung cấp hộp thoại `showResizeTableDialog` cho phép người dùng nhập hoặc chọn vùng mới của bảng trực quan, có bẫy phím Tab/Escape và thông báo lỗi rõ ràng.
3. **Quốc tế hóa (i18n):**
   - Bổ sung đầy đủ chuỗi tiếng Việt (`strings-vi.js`) và tiếng Anh (`strings-en.js`) cho các lệnh, nhóm ruy-băng và hộp thoại liên quan đến Bảng.
4. **Hướng dẫn sử dụng trong ứng dụng (Trợ giúp F1):**
   - Bổ sung bài viết hướng dẫn chi tiết `sheet.table.tools` trong `platform/help/entries-sheet.js` giải thích rõ cách kích hoạt tab Thiết kế Bảng, cách đổi kích thước, bật/tắt dòng tổng và chuyển bảng thành vùng thường. Tuyệt đối không nhắc tới tên thương hiệu đối thủ.
5. **Bộ kiểm thử tự động (Unit Tests):**
   - Tạo bộ kiểm thử đơn vị `tests/unit/sheet-table.test.js` gồm 17 bài kiểm tra độc lập cho tất cả các thao tác bảng, đăng ký trực tiếp vào bộ chạy chính `tests/run-tests.js`.
