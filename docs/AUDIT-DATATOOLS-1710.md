# Đối chiếu Công cụ Dữ liệu và Chỉnh sửa VN Sheet với Excel 2016 (AGY-DATATOOLS)

- **Ngày thực hiện:** 17/10/2026
- **Công cụ kiểm toán:** `scripts/audit-0610/structural_oracle.mjs` + `scripts/audit-0610/structural_oracle.ps1`
- **Bộ dữ liệu kiểm toán:** `tests/functions/structural-cases-17.json` (60 kịch bản kiểm tra hành vi độc lập)
- **Chuẩn so sánh (Oracle):** Microsoft Excel 2016 thật qua giao tiếp COM trực tiếp (`tests/functions/golden-structural-17.json`)
- **Kết quả tổng thể:** 60/60 kịch bản PASS, 435/435 ô dữ liệu & thuộc tính khớp 100% với Excel 2016.

---

## 1. Kết quả kiểm toán tổng hợp theo từng mục

| STT | Nhóm tính năng | Số kịch bản | Kết quả Oracle | Trạng thái | Ghi chú kỹ thuật |
|:---:|---|:---:|:---:|:---:|---|
| 1 | Xóa trùng lặp (`removeDuplicates`) | 6 | 6/6 PASS | Khớp 100% | Đơn cột, đa cột, có/không hàng tiêu đề, không phân biệt hoa thường, ô trống |
| 2 | Tách văn bản thành cột (`textToColumns`) | 6 | 6/6 PASS | Khớp 100% | Phân cách phẩy, tab, khoảng trắng, ngoặc kép, bỏ qua cột, độ rộng cố định |
| 3 | Tổng phụ (`subtotal`, `removeSubtotal`) | 6 | 6/6 PASS | Khớp 100% | SUM/COUNT/AVERAGE/MAX/MIN, Grand Total dừng ở lastDetailRow, gỡ bỏ sạch |
| 4 | Hợp nhất dữ liệu (`consolidate`) | 6 | 6/6 PASS | Khớp 100% | SUM/AVERAGE/MAX/MIN/COUNT theo vị trí và theo nhãn hàng đầu/cột trái |
| 5 | Goal Seek & Bảng dữ liệu (`goalSeek`, `calculateDataTable`) | 6 | 6/6 PASS | Khớp 100% | Goal Seek hội tụ sai số <= 1e-3, Bảng dữ liệu 1 biến (hàng/cột) và 2 biến |
| 6 | Trình quản lý kịch bản (`scenarioManager`) | 6 | 6/6 PASS | Khớp 100% | Thêm kịch bản, hiển thị kịch bản theo tên/id, cập nhật changingCells |
| 7 | Xóa (`clearAll`, `clearContents`, `clearFormats`) | 6 | 6/6 PASS | Khớp 100% | Xóa tất cả, nội dung, định dạng trên ô đơn, dải ô, ô trộn, công thức phụ thuộc |
| 8 | Trộn ô / Tách ô (`mergeCells`, `unmergeCells`) | 6 | 6/6 PASS | Khớp 100% | Merge & Center, Merge Across, UnMerge; giữ dữ liệu góc trên-trái, lan ô lân cận |
| 9 | Điền Flash Fill (`flashFill`) | 6 | 6/6 PASS | Khớp 100% | Tách họ-tên, ghép chuỗi, trích xuất mã số/chữ cái, chuẩn hóa định dạng |
| 10 | Nhóm / Bỏ nhóm / Dàn bài (`groupSelection`, `showOutlineLevels`) | 6 | 6/6 PASS | Khớp 100% | Gom nhóm hàng/cột, bỏ nhóm, ẩn/hiện chi tiết theo cấp 1-2 |
| **Tổng** | **10 nhóm tính năng** | **60** | **60/60 PASS** | **Khớp 100%** | **435/435 ô và thuộc tính khớp hoàn toàn** |

---

## 2. Bảng phân tích chi tiết các điểm lệch được chẩn đoán và khắc phục

| STT | Kịch bản / Mục | Excel 2016 thật | VN Sheet trước khi sửa | VN Sheet sau khi sửa | Nguyên nhân gốc & Cách khắc phục |
|:---:|---|---|---|---|---|
| 1 | Bảng dữ liệu 1 biến theo hàng (`data_table_1var_row`) | Công thức mẫu đặt tại ô `A6` (hàng 1, cột 0 của bảng `A5:D6`), giá trị thay thế tại `B5:D5`, kết quả tính toán điền vào `B6:D6`. | Chỉ chấp nhận công thức đặt tại góc trên cùng bên trái `grid[0][0]` (`A5`), làm bảng 1 biến dạng hàng trả về rỗng. | Chấp nhận công thức tại `grid[1][0]` cho bảng 1 biến dạng hàng, khớp 100% Excel. | **Nguyên nhân:** Layout bảng dữ liệu 1 biến theo hàng trong Excel yêu cầu công thức ở hàng 2 cột 1 (`grid[1][0]`).<br>**Khắc phục:** Bổ sung kiểm tra vị trí công thức tại `grid[1][0]` khi xác định cấu trúc bảng dữ liệu 1 biến. |
| 2 | Bảng dữ liệu 1 biến theo cột (`data_table_1var_col`) | Công thức mẫu đặt tại ô `B5` (hàng 0, cột 1 của bảng `A5:B8`), giá trị thay thế tại `A6:A8`, kết quả tính toán điền vào `B6:B8`. | Chỉ kiểm tra `grid[0][0]`, không nhận diện được công thức tại `B5`. | Nhận diện đúng công thức tại `grid[0][1]`, điền chính xác kết quả vào `B6:B8`. | **Nguyên nhân:** Layout bảng 1 biến dạng cột đặt công thức tại hàng đầu cột 2 (`grid[0][1]`).<br>**Khắc phục:** Mở rộng hàm `calculateDataTable` để quét tìm công thức ở cả `grid[0][0]`, `grid[0][1]` và `grid[1][0]`. |
| 3 | Tổng phụ Grand Total (`subtotal_sum_sales`) | Công thức Grand Total sinh ra dạng `=SUBTOTAL(9, B2:B9)` với `B9` là dòng chi tiết cuối cùng trước khi chèn dòng tổng phụ của nhóm cuối. | Sinh ra `=SUBTOTAL(9, B2:B10)` tính luôn cả dòng tổng phụ vừa chèn của nhóm cuối, gây sai lệch tham chiếu dải ô. | Sinh ra dải ô kết thúc chính xác tại `lastDetailRow` (`B2:B9`), khớp 100% với Excel. | **Nguyên nhân:** Khi chèn dòng tổng phụ cho nhóm cuối, biến theo dõi dòng cuối bị cộng thêm 1 dòng tổng phụ mới chèn.<br>**Khắc phục:** Ghi nhận `lastDetailRow` trước khi chèn các dòng subtotal để làm cận trên cho dải ô Grand Total. |
| 4 | Nhãn Grand Total và Xóa tổng phụ | Excel dùng các nhãn theo hàm: `Grand Total`, `Grand Count`, `Grand Average`, `Grand Max`, `Grand Min`. | Chỉ gán cố định nhãn `Grand Total`, và `removeSubtotal` chỉ tìm xóa nhãn có chữ `Total`. | Hỗ trợ đầy đủ 5 nhãn Grand và xóa sạch toàn bộ các dòng tổng phụ tương ứng khi gọi `removeSubtotal`. | **Nguyên nhân:** Thiếu ánh xạ tên hàm sang nhãn Grand tương ứng.<br>**Khắc phục:** Bổ sung `grandLabelMap` và regex nhận diện toàn bộ các hậu tố `Total|Count|Average|Max|Min`. |
| 5 | Tách văn bản thành cột (`text_to_columns_comma`) | Tách chuỗi số có số 0 ở đầu hoặc chuỗi mã giữ nguyên kiểu văn bản nếu người dùng chỉ định hoặc không bắt buộc ép số. | Tự động chuyển đổi `part` sang kiểu số (`Number(part)`), làm chuỗi `"0123"` bị mất số 0 thành số `123`. | Giữ nguyên chuỗi gốc `part`, chuyển đổi an toàn khi cần thiết. | **Nguyên nhân:** Ép kiểu tự động quá sớm làm mất thuộc tính chuỗi.<br>**Khắc phục:** Lưu giá trị dạng chuỗi nguyên bản khi tách cột. |
| 6 | Xóa trùng lặp phân biệt chữ hoa/thường (`remove_duplicates_case_insensitive`) | Excel coi `"Apple"` và `"apple"` là trùng lặp khi thực hiện `RemoveDuplicates`. | VN Sheet so sánh bằng `===` nên giữ lại cả hai mục chữ hoa và chữ thường. | Sử dụng chuẩn hóa `String(v).toLowerCase()` để so sánh trùng lặp, khớp 100% hành vi Excel. | **Nguyên nhân:** Chưa áp dụng quy tắc so sánh không phân biệt hoa thường của Excel.<br>**Khắc phục:** Chuẩn hóa chuỗi trước khi so sánh khóa trùng lặp. |
| 7 | Trình quản lý kịch bản áp dụng theo tên (`scenario_apply_by_name`) | Người dùng có thể chọn kịch bản theo `name` để hiển thị các giá trị thay thế. | Chỉ tìm kịch bản theo trường `id`. | Hỗ trợ tìm kiếm cả theo `id` lẫn `name`. | **Nguyên nhân:** Giao diện và API truyền tên kịch bản nhưng logic chỉ khớp `id`.<br>**Khắc phục:** Cập nhật `applyScenario` tìm theo cả hai trường. |

---

## 3. Xác minh bộ kiểm thử và cổng an toàn

1. **Kiểm thử hành vi cấu trúc (Structural Oracle):**
   - `node scripts/audit-0610/structural_oracle.mjs tests/functions/structural-cases-17.json tests/functions/golden-structural-17.json`: **60/60 PASS (100%)**, 435/435 ô khớp hoàn toàn.
   - Các bộ kiểm thử cấu trúc nền tảng trước đó (`structural-cases-1..8`): **133/133 PASS (100%)**, 816/816 ô khớp hoàn toàn.

2. **Kiểm thử bộ nhớ đệm công thức (Formula Cache Oracle):**
   - `node scripts/audit-0610/sheet_formulas_vs_cache.mjs --force --file lan04.xlsx`: **49/49 ô khớp (100.00%)**.
   - `node scripts/audit-0610/sheet_formulas_vs_cache.mjs --force --file lan28.xlsx`: **271/275 ô khớp (98.55%)** (vượt ngưỡng yêu cầu >= 98.18%).

3. **Toàn bộ bộ kiểm thử đơn vị tự động (Unit Tests):**
   - `npm test`: **3569/3569 bài kiểm tra PASS, 0 bài FAIL (100%)**.
   - `tests/unit/sheet-data-tools.test.js`: **21/21 bài kiểm tra PASS**.
