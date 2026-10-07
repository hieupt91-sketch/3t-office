# Báo Cáo Chẩn Đoán Chi Tiết Lệch Công Thức (Ticket SB7)

- **Ngày thực hiện**: 07/10/2026
- **Phạm vi kiểm tra**: 4 tệp XLSX trọng điểm theo Ticket SB7 (`lan06.xlsx`, `lan04.xlsx`, `lan26.xlsx`, `lan02.xlsx`).
- **Nguồn dữ liệu**: Đối chiếu trực tiếp giữa công thức `<f>` và cache Excel `<v>` qua `scripts/audit-0610/sheet_formulas_vs_cache.mjs`.
- **Mục đích**: Chẩn đoán nguyên nhân gốc rễ trong `apps/sheet/formula-engine.js` trước khi thực hiện chỉnh sửa theo từng nhóm.

---

## 1. Bảng Tổng Hợp Chẩn Đoán Theo Tệp

| STT | Tệp XLSX | Tổng ô kiểm tra | Số ô khớp | Số ô lệch | Tỷ lệ khớp hiện tại | Phân loại các nhóm lỗi chính |
|:---:|:---|---:|---:|---:|---:|:---|
| 1 | `lan06.xlsx` | 1,023 | 466 | 557 | **45.55%** | VLOOKUP ô rỗng khớp nhầm (378 ô), SUMIF chứa hàm lồng VLOOKUP (176 ô), VLOOKUP tham chiếu tuyệt đối `$` (2 ô), Tham chiếu Text Cell dạng Object (1 ô) |
| 2 | `lan04.xlsx` | 49 | 32 | 17 | **65.31%** | Dây chuyền lan truyền lỗi `#REF!` bị LibreOffice gán `#NAME?` (17 ô) |
| 3 | `lan26.xlsx` | 24 | 12 | 12 | **50.00%** | Toán tử phần trăm `%` trong biểu thức nhân số học (12 ô) |
| 4 | `lan02.xlsx` | 4 | 2 | 2 | **50.00%** | Hàm tiện ích ngoài `_xll.VND` (2 ô — thuộc diện loại trừ) |
| **Tổng** | **4 tệp** | **1,100** | **512** | **588** | **46.55%** | **5 nhóm lỗi cần sửa + 1 nhóm loại trừ** |

---

## 2. Bảng Phân Nhóm Lỗi Chi Tiết

| Mã nhóm | Tên nhóm / Hàm | Lý do phân loại | Số ô | Tệp ảnh hưởng | 3 Ví dụ tiêu biểu (Ô — Công thức — Cache Excel — App) | Nguyên nhân gốc rễ trong `formula-engine.js` |
|:---:|:---|:---|---:|:---|:---|:---|
| **N1** | **VLOOKUP** | Lỗi không lan truyền (khớp nhầm ô rỗng) | 378 | `lan06.xlsx` | 1. `VAT Xuất!C79`: `VLOOKUP(B79,'Kho VAT'!A:D,2,FALSE)`<br>Cache: `#N/A` \| App: `""`<br>2. `VAT Xuất!D79`: `VLOOKUP(B79,'Kho VAT'!$A:$G,5,FALSE)`<br>Cache: `#N/A` \| App: `0`<br>3. `VAT Xuất!C80`: `VLOOKUP(B80,'Kho VAT'!A:D,2,FALSE)`<br>Cache: `#N/A` \| App: `""` | Trong `_equals(left, right)`, ép kiểu `Number(left) === Number(right)` khi một bên là `number`. Khi `lookup = 0` (do ô B79 rỗng) và `cand.key = ""` (ô trống trong bảng), JS ép `Number("") === 0`, dẫn đến `_equals("", 0)` trả về `true`. VLOOKUP khớp nhầm vào dòng trống cuối bảng thay vì trả về `#N/A`. |
| **N2** | **SUMIF** | Sai giá trị (hàm lồng nhau trong điều kiện) | 176 | `lan06.xlsx` | 1. `Kho VAT!E4`: `SUMIF('VAT Nhập'!$B:$B,VLOOKUP('Kho VAT'!A4,'VAT Nhập'!$B:$D,1,FALSE),'VAT Nhập'!$D:$D)`<br>Cache: `1` \| App: `0`<br>2. `Kho VAT!E5`: `SUMIF('VAT Nhập'!$B:$B,VLOOKUP('Kho VAT'!A5,'VAT Nhập'!$B:$D,1,FALSE),'VAT Nhập'!$D:$D)`<br>Cache: `9` \| App: `0`<br>3. `Kho VAT!F5`: `SUMIF('VAT Xuất'!$B:$B,VLOOKUP('Kho VAT'!A5,'VAT Xuất'!B:E,1,FALSE),'VAT Xuất'!E:E)`<br>Cache: `2` \| App: `0` | Trong `SUMIF`, đối số thứ 2 được giải quyết qua `_resolveSingleValue(args[1])`. Hàm này chưa hỗ trợ đánh giá hàm lồng nhau dạng `FUNCNAME(...)`. Token `VLOOKUP(...)` bị trả về nguyên chuỗi literal. Khi so khớp với cột điều kiện, chuỗi literal không khớp ô nào nên trả về tổng = 0. |
| **N3** | **Toán tử (+, -, \*, /)** | Sai kiểu / lỗi không đáng có (toán tử `%`) | 12 | `lan26.xlsx` | 1. `KHÓA BIỆT THỰ!G7`: `F7*E7*70%`<br>Cache: `27083000` \| App: `#VALUE!`<br>2. `KHÓA BIỆT THỰ!H7`: `F7*E7*65%`<br>Cache: `25148500` \| App: `#VALUE!`<br>3. `KHÓA THÔNG MINH!G7`: `F7*E7*70%`<br>Cache: `6223000` \| App: `#VALUE!` | Trong `_evaluateArithmetic(expr)`, biểu thức được chuyển sang JS `Function(...)`. Ký tự `%` trong JS là toán tử chia lấy dư (modulo). Biểu thức kết thúc bằng số kèm `%` (như `70%`) bị lỗi cú pháp `SyntaxError`, bắt trong khối catch và trả về `#VALUE!` thay vì chia 100 (`* 0.01`). |
| **N4** | **VLOOKUP** | Sai kiểu / lỗi không đáng có (dấu `$` tuyệt đối) | 2 | `lan06.xlsx` | 1. `Kiểm Tra VAT!B7`: `VLOOKUP($B$3,'Kho VAT'!$A:$G,5,FALSE)`<br>Cache: `0` \| App: `#N/A`<br>2. `Kiểm Tra VAT!B8`: `VLOOKUP($B$3,'Kho VAT'!$A:$G,6,FALSE)`<br>Cache: `0` \| App: `#N/A` | Trong `_resolveSingleValue(token)`, regex nhận diện ô là `/^(?:(?:'[^']+'|[^!]+)!)?[A-Z]+\d+$/i` không có `\$?`. Chuỗi `$B$3` không khớp regex tọa độ nên bị giữ nguyên thành chuỗi `"$B$3"`. VLOOKUP tra cứu chuỗi `"$B$3"` trong bảng và trả về `#N/A`. |
| **N5** | **Tham chiếu ô** | Sai kiểu (đối tượng String của Text Cell) | 1 | `lan06.xlsx` | 1. `Kiểm Tra VAT!B5`: `B3`<br>Cache: `00990011` \| App: `{"0":"0",...,isTextCell:true}` | Trong `getCellValue`, ô định dạng Text được bọc trong `new String(raw)` có gán `textVal.isTextCell = true`. Khi công thức trả về trực tiếp đối tượng này, serialization CDP chuyển thành JSON Object thay vì chuỗi nguyên thủy `"00990011"`. |
| **N6** | **Toán tử (+, -, \*, /)** | Hàm thiếu / lỗi không lan truyền (dây chuyền ô lỗi) | 17 | `lan04.xlsx` | 1. `Phụ kiện!A13`: `A12+1`<br>Cache: `#REF!` \| App: `#NAME?`<br>2. `Phụ kiện!A23`: `A22+1`<br>Cache: `#REF!` \| App: `#NAME?`<br>3. `Phụ kiện!A24`: `A23+1`<br>Cache: `#REF!` \| App: `#NAME?` | Ô nguồn `A12` có công thức `=#ref!+1`. LibreOffice Calc không nhận `#ref!` nên ghi cache `val: "#NAME?"`. Trong `getCellValue("A12")`, engine chỉ đọc thuộc tính `val` mà không tính lại công thức khi `val` là `#NAME?`. Dẫn đến `A13 = A12+1` nhận `#NAME?` thay vì `#REF!`. |
| **LT** | **_XLL.VND** | Ngoại lệ Add-in ngoài (Loại trừ theo SB7) | 2 | `lan02.xlsx` | 1. `UNC!G7`: `_xll.VND(G5)`<br>Cache: `#NAME?` \| App: `"Hai mươi chín triệu..."`<br>2. `DANH SÁCH CHI LƯƠNG!C15`: `_xll.VND(E14)`<br>Cache: `#NAME?` \| App: `"Hai mươi chín triệu..."` | Excel gốc không cài add-in đọc số tiền VNĐ nên lưu cache lỗi `#NAME?`. VN Sheet tích hợp sẵn hàm đọc số tiền VNĐ thành chữ tiếng Việt nên hiển thị đúng văn bản. Đây là tính năng dự kiến, thuộc diện loại trừ. |

---

## 3. Kế Hoạch Sửa Từng Nhóm (Thứ Tự Ưu Tiên Theo Số Lượng Ô)

1. **Nhóm 1 (378 ô)**: Sửa `_equals` và `_findExactInLookupIndex` trong `apps/sheet/formula-engine.js` để chuỗi rỗng `""` không bằng số `0`, ngăn VLOOKUP khớp nhầm dòng rỗng.
2. **Nhóm 2 (176 ô)**: Bổ sung hỗ trợ hàm lồng nhau trong `_resolveSingleValue(token)` để tính toán các biểu thức hàm dạng `VLOOKUP(...)`, `INDEX(...)`, v.v. khi làm tham số cho `SUMIF`.
3. **Nhóm 3 (12 ô)**: Xử lý toán tử hậu tố phần trăm `%` trong `_evaluateArithmetic` (chuyển đổi `number%` thành `(number * 0.01)`).
4. **Nhóm 4 (2 ô)**: Sửa regex trong `_resolveSingleValue` hỗ trợ ký tự `$` (`\$?[A-Z]+\$?\d+`).
5. **Nhóm 5 (1 ô)**: Chuẩn hóa kết quả cuối cùng của `evaluate()` để ép kiểu `String` object về chuỗi nguyên thủy `string`.
6. **Nhóm 6 (17 ô)**: Trong `getCellValue`, nếu ô có công thức và `val === "#NAME?"` mà công thức hợp lệ, tự động tính lại công thức của ô để lan truyền mã lỗi chuẩn `#REF!`.
