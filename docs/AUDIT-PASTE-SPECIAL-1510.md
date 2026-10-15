# Báo cáo đối chiếu Dán đặc biệt (Paste Special) VN Sheet vs Excel 2016 COM Oracle

- **Thời gian thực hiện**: 15/10/2026
- **Môi trường đối chiếu**: Excel 2016 Desktop thật (qua giao tiếp COM automation PowerShell `scripts/audit-0610/structural_oracle.ps1`) và VN Sheet headless (`scripts/audit-0610/structural_oracle.mjs`).
- **Tập kịch bản kiểm thử**: `tests/functions/structural-cases-4.json` (24 kịch bản, 100/100 ô đối chiếu).
- **Kết quả tổng thể**: **24/24 kịch bản PASS (100% khớp tuyệt đối giữa VN Sheet và Excel 2016)**.

---

## 1. Tóm tắt kết quả kiểm tra

| Bộ kịch bản | Số kịch bản | Số ô đối chiếu | Khớp (PASS) | Lệch (FAIL) | Tỷ lệ PASS |
| :--- | :---: | :---: | :---: | :---: | :---: |
| `structural-cases-4.json` (Dán đặc biệt) | 24 | 100 | 100 | 0 | **100%** |
| `structural-cases-1.json` (Hàng/Cột, Cắt dán) | 26 | 148 | 148 | 0 | **100%** |
| `structural-cases-2.json` (Điền tự động, Sắp xếp) | 12 | 54 | 54 | 0 | **100%** |
| `structural-cases-3.json` (Bộ lọc & SUBTOTAL) | 3 | 31 | 31 | 0 | **100%** |

---

## 2. Bảng đối chiếu chi tiết 24 kịch bản Dán đặc biệt

| STT | Kịch bản | Thao tác / Chế độ | Hành vi Excel 2016 | VN Sheet trước đối chiếu | VN Sheet sau căn chỉnh | Kết quả |
| :---: | :--- | :--- | :--- | :--- | :--- | :---: |
| 1 | Dán giá trị công thức: mất công thức giữ số | `mode: "values"`, từ A3 (`=A1+A2`) đến B3 | B3 nhận giá trị số 30, xóa bỏ công thức `=A1+A2`. | Chưa trích xuất triệt để giá trị đã tính từ model, có thể sinh chuỗi công thức hoặc rỗng. | B3 = 30 dạng số thuần túy, `cell.f` bị xóa sạch hoàn toàn giống Excel. | **PASS** |
| 2 | Dán giá trị vùng công thức nhiều ô | `mode: "values"`, từ B1:B2 (`=A1*10`, `=A2*10`) đến D1 | D1=20, D2=40 dạng số tĩnh, không mang theo công thức. | Xử lý mảng ô dán giá trị chưa đồng bộ cho vùng nhiều hàng. | D1=20, D2=40 là số tĩnh, không còn công thức. | **PASS** |
| 3 | Dán công thức không kéo định dạng | `mode: "formulas"`, từ B1 (đậm, nền vàng) sang D1 (nền xanh lá) | D1 nhận công thức dịch tương đối `=C1*2`, giữ nguyên nền xanh lá (#00FF00), không bị đổi thành vàng và không bị in đậm. | Ghi đè toàn bộ `cell.style` của ô nguồn sang ô đích, làm mất màu nền xanh và bị biến thành vàng/đậm. | Chỉ sao chép công thức và dịch tham chiếu, giữ nguyên 100% style của ô đích. | **PASS** |
| 4 | Dán định dạng giữ nguyên nội dung đích | `mode: "formats"`, từ A1 (đậm, đỏ, 0.00%) sang B1 (`=5*5`) | B1 giữ nguyên công thức `=5*5` (giá trị 25), chỉ nhận style: in đậm, màu đỏ (#FF0000), định dạng `0.00%`. | Ghi đè hoặc làm rỗng nội dung dữ liệu của ô đích trong một số nhánh logic. | B1 giữ nguyên công thức `=5*5`, style cập nhật đầy đủ (đậm, đỏ, format 0.00%). | **PASS** |
| 5 | Dán chuyển vị một hàng thành một cột | `mode: "transpose"`, từ A1:C1 (1x3) sang E1 | E1=1, E2=2, E3=3 (chuyển vị thành 3x1). | Lỗi tính tọa độ đích khi lặp hàng/cột, ghi đè ngang thay vì dọc. | Chuyển vị chính xác kích thước 1x3 thành 3x1. | **PASS** |
| 6 | Dán chuyển vị một cột thành một hàng | `mode: "transpose"`, từ A1:A3 (3x1) sang C1 | C1=10, D1=20, E1=30 (chuyển vị thành 1x3). | Chiều ngang/dọc bị đảo không đúng khi dán mảng 1 cột. | Chuyển vị chính xác kích thước 3x1 thành 1x3. | **PASS** |
| 7 | Dán chuyển vị công thức tham chiếu tương đối | `mode: "transpose"`, từ A1:B2 sang D1 | D1=10, D2=20, E1=`=D1*2`, E2=`=D2*2`. Vector delta tương đối xoay từ `(dCol, dRow)` thành `(dRow, dCol)`. | Dùng hàm `shiftFormulaRefs` thông thường (chỉ tịnh tiến tịnh tiến x, y), dẫn đến công thức bị trỏ sai ô tham chiếu. | Triển khai hàm `transposeFormulaRefs()` xoay chuẩn ma trận offset tham chiếu: E1=`=D1*2`, E2=`=D2*2`. | **PASS** |
| 8 | Dán chuyển vị vùng SUM | `mode: "transpose"`, từ A1:A4 (A4=`=SUM(A1:A3)`) sang C1 | C1=1, D1=2, E1=3, F1=`=SUM(C1:E1)`. Vùng tính tổng dọc A1:A3 tự xoay thành ngang C1:E1. | Dịch chuyển kiểu tịnh tiến làm dải SUM vẫn giữ hướng dọc: `=SUM(C1:C3)`. | `transposeFormulaRefs()` nhận diện dải ô A1:A3 và hoán vị thành dải C1:E1. | **PASS** |
| 9 | Dán với phép cộng lên ô số | `operation: "add"`, từ A1 (5) sang B1 (10) | B1 = 15 (10 + 5). | Không hỗ trợ `operation`, ghi đè giá trị nguồn 5 lên 10. | Tính toán trực tiếp số học: B1 = 15. | **PASS** |
| 10 | Dán với phép trừ lên ô số | `operation: "subtract"`, từ A1 (4) sang B1 (20) | B1 = 16 (20 - 4). | Không hỗ trợ `operation`, ghi đè 4 lên 20. | Tính toán trực tiếp số học: B1 = 16. | **PASS** |
| 11 | Dán với phép nhân lên ô số | `operation: "multiply"`, từ A1 (3) sang B1 (7) | B1 = 21 (7 * 3). | Không hỗ trợ `operation`, ghi đè 3 lên 7. | Tính toán trực tiếp số học: B1 = 21. | **PASS** |
| 12 | Dán với phép chia lên ô số | `operation: "divide"`, từ A1 (4) sang B1 (20) | B1 = 5 (20 / 4). | Không hỗ trợ `operation`, ghi đè 4 lên 20. | Tính toán trực tiếp số học: B1 = 5. | **PASS** |
| 13 | Dán với phép cộng lên ô công thức | `operation: "add"`, từ A1 (5) sang B1 (`=2*4`) | B1 = `=(2*4)+5`. Giữ công thức đích và bọc phép cộng với giá trị nguồn. | Ghi đè số 5 lên ô công thức làm mất biểu thức `=2*4`. | Bọc biểu thức an toàn: `=(2*4)+5`. | **PASS** |
| 14 | Dán công thức với phép nhân lên ô công thức | `operation: "multiply"`, từ A1 (`=2+3`) sang B1 (`=10+2`) | B1 = `=(10+2)*(2+3)`. | Ghi đè công thức nguồn lên đích, làm mất công thức gốc của B1. | Bọc biểu thức hai vế: `=(10+2)*(2+3)`. | **PASS** |
| 15 | Bỏ qua ô trống khi dán (Skip Blanks) | `skipBlanks: true`, từ A1:A2 (A1=100, A2 rỗng) sang B1:B2 (B1=1, B2=2) | B1=100, B2 giữ nguyên giá trị 2 (không bị ô trống A2 xóa). | Ô trống trong clipboard ghi đè làm trắng ô B2. | Ô rỗng được bỏ qua, giữ nguyên dữ liệu đích B2 = 2. | **PASS** |
| 16 | Không bỏ qua ô trống thì ghi đè | `skipBlanks: false`, từ A1:A2 sang B1:B2 | B1=100, B2 bị xóa trắng (rỗng). | Không có cờ kiểm soát rõ ràng. | Ô rỗng từ nguồn ghi đè làm rỗng ô B2 đúng như Excel. | **PASS** |
| 17 | Dán vào vùng có công thức tham chiếu tương đối và tuyệt đối | `mode: "formulas"`, từ B1 (`=$A$1*2`), C1 (`=A1+5`) sang B3:C3 | B3=`=$A$1*2`, C3=`=A3+5`. Tham chiếu tuyệt đối `$A$1` cố định, tham chiếu tương đối `A1` tịnh tiến thành `A3`. | Một số trường hợp tham chiếu hỗn hợp ($A1 hoặc A$1) bị mất dấu `$`. | Giữ nguyên tuyệt đối `$A$1` và tịnh tiến chính xác tương đối `A1` -> `A3`. | **PASS** |
| 18 | Dán khối nhiều hàng cột giữ nguyên cấu trúc | `mode: "source"`, khối 3x3 A1:C3 dán sang E1 | Toàn bộ ma trận số liệu và công thức tổng hàng (`=E1+F1`, `=E2+F2`, `=E3+F3`) được bảo toàn. | Dán cơ bản nhưng con trỏ selection hoặc định dạng viền bị rớt. | Sao chép toàn vẹn ma trận dữ liệu và công thức. | **PASS** |
| 19 | Dán số đã định dạng phần trăm (%) | `mode: "source"`, từ A1 (`0.15`, format `0.00%`) sang B1 | B1 nhận giá trị `0.15` và định dạng `0.00%`. | NumberFormat bị mất nếu style không được clone sâu. | B1 nhận đúng giá trị `0.15` và định dạng `0.00%`. | **PASS** |
| 20 | Dán số đã định dạng tiền tệ ($) | `mode: "source"`, từ A1 (`50000`, format `$#,##0`) sang B1 | B1 nhận giá trị `50000` và định dạng `$#,##0`. | Định dạng tiền tệ không được chuyển giao qua clipboard model. | B1 giữ đúng định dạng tiền tệ `$#,##0`. | **PASS** |
| 21 | Dán số đã định dạng ngày tháng (dd/mm/yyyy) | `mode: "source"`, từ A1 (`45000`, format `dd/mm/yyyy`) sang B1 | B1 nhận số seri `45000` và định dạng `dd/mm/yyyy`. | Định dạng ngày tháng bị rớt, hiển thị số thô. | B1 giữ nguyên số seri và định dạng ngày tháng `dd/mm/yyyy`. | **PASS** |
| 22 | Dán chuỗi tiếng Việt dài qua ô khác | `mode: "values"`, từ A1 (chuỗi dài UTF-8) sang B1 | B1 nhận đầy đủ chuỗi ký tự UTF-8 không lỗi font hay cắt bớt. | Có nguy cơ bị lỗi bảng mã khi qua clipboard trung gian. | Nhận nguyên vẹn chuỗi tiếng Việt dài. | **PASS** |
| 23 | Dán đè vùng nguồn chồng nhau (overlapping ranges) | `mode: "source"`, từ A1:B2 dán sang B1 (chồng cột B) | Dán dữ liệu an toàn dựa trên snapshot lúc copy, không bị lỗi đè ô đang đọc. | Đọc và ghi đồng thời trực tiếp từ grid làm dữ liệu ô sau bị nhiễm giá trị mới của ô trước. | Snapshot `clipboardModel` độc lập hoàn toàn, dữ liệu sao chép chính xác tuyệt đối. | **PASS** |
| 24 | Dán tất cả trừ đường viền (All Except Borders) | `mode: "allExceptBorders"`, từ A1 (42) sang B1 (99) | B1 nhận giá trị 42, style chung nhưng giữ nguyên cấu trúc viền hiện tại. | Thiếu chế độ `allExceptBorders`, hoặc đè luôn viền. | Giữ nguyên viền ô đích, áp dụng toàn bộ giá trị và định dạng khác. | **PASS** |

---

## 3. Các cải tiến và sửa đổi kỹ thuật

### 3.1. Thuật toán xoay tham chiếu công thức khi Transpose (`transposeFormulaRefs`)
Trong `apps/sheet/formula-ref-shift.js`:
- Khi chuyển vị dán đặc biệt, khoảng cách offset hàng và cột bị hoán vị:
  $$\Delta \text{col}' = \Delta \text{row}$$
  $$\Delta \text{row}' = \Delta \text{col}$$
- Đối với tham chiếu hỗn hợp (mixed reference) như `$A1` hoặc `A$1`, vị trí dấu `$` tuyệt đối cũng được hoán vị tương ứng để bảo toàn chiều cố định trên không gian đã xoay.
- Đối với tham chiếu ngoài biên bảng tính (`col < 1` hoặc `row < 1`), trả về lỗi `#REF!` chuẩn như Excel.

### 3.2. Xử lý phép tính kết hợp (`operation`: Add, Subtract, Multiply, Divide)
Trong `applyPasteSpecial()` tại `apps/sheet/sheet-grid.js`:
- Nếu cả ô đích và ô nguồn đều là giá trị số thuần túy (không chứa công thức), VN Sheet thực hiện phép toán số học trực tiếp ($+$, $-$, $\times$, $\div$) và ghi kết quả số vào ô đích.
- Nếu một trong hai ô (hoặc cả hai) là công thức, VN Sheet tự động xây dựng biểu thức bọc an toàn có đóng mở ngoặc đơn:
  - Phép cộng: `=(biểu_thức_đích)+(biểu_thức_nguồn)`
  - Phép trừ: `=(biểu_thức_đích)-(biểu_thức_nguồn)`
  - Phép nhân: `=(biểu_thức_đích)*(biểu_thức_nguồn)`
  - Phép chia: `=(biểu_thức_đích)/(biểu_thức_nguồn)`
- Nếu dán chế độ `values` kèm phép toán lên ô công thức, giá trị số của nguồn được đưa vào biểu thức dạng hằng số: `=(biểu_thức_đích)+giá_trị_nguồn`.

### 3.3. Tùy chọn Bỏ qua ô trống (`skipBlanks`)
- Khi `options.skipBlanks = true`, nếu ô nguồn là rỗng (`value === ""`, `null`, hoặc `undefined` và không có công thức), thao tác dán sẽ bỏ qua ô đó, giữ nguyên giá trị, công thức và style của ô đích.

### 3.4. Tùy chọn Dán tất cả trừ đường viền (`allExceptBorders`)
- Khi `mode = "allExceptBorders"`, VN Sheet sao chép toàn bộ giá trị, công thức, định dạng số, phông chữ, màu sắc nhưng giữ nguyên thuộc tính đường viền `border` hiện tại của ô đích.

### 3.5. Trợ giúp tiếng Việt trong ứng dụng
Trong `platform/help/entries-sheet.js`, cập nhật mục `sheet.edit.pasteSpecialHelp`:
- Hướng dẫn đường dẫn truy cập rõ ràng: **Trang đầu > Bảng nhớ tạm > Dán > Dán đặc biệt** (hoặc tổ hợp phím `Ctrl+Alt+V`).
- Giải thích chi tiết tất cả các chế độ dán (Tất cả, Giá trị, Công thức, Định dạng, Tất cả trừ đường viền, Chuyển vị).
- Hướng dẫn các phép tính số học kết hợp (Không, Cộng, Trừ, Nhân, Chia).
- Hướng dẫn tùy chọn Bỏ qua ô trống (Skip blanks).
- Đảm bảo 100% tiếng Việt chuẩn, không chứa tên thương mại cấm.

---

## 4. Kiểm chứng hồi quy (Regression Verification)

1. **Suite kiểm thử cấu trúc Oracle**:
   - `node scripts/audit-0610/structural_oracle.mjs tests/functions/structural-cases-4.json`: 24/24 PASS (100/100 ô).
   - `node scripts/audit-0610/structural_oracle.mjs tests/functions/structural-cases-1.json`: 26/26 PASS (148/148 ô).
   - `node scripts/audit-0610/structural_oracle.mjs tests/functions/structural-cases-2.json`: 12/12 PASS (54/54 ô).
   - `node scripts/audit-0610/structural_oracle.mjs tests/functions/structural-cases-3.json`: 3/3 PASS (31/31 ô).
2. **Suite kiểm thử đơn vị toàn bộ monorepo**:
   - `npm test`: **3376/3376 PASS (0 FAIL, 100%)**.
3. **Kiểm tra công thức LAN thực tế**:
   - `lan01.xlsx`: 865/865 ô khớp (**100.00%**).
   - `lan04.xlsx`: 49/49 ô khớp (**100.00%**).
   - `lan28.xlsx`: 271/275 ô khớp (**98.55%** ≥ ngưỡng 98.18%).
