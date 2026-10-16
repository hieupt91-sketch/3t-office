# BÁO CÁO ĐỐI CHIẾU VÀ TRIỂN KHAI TÙY CHỌN TÍNH TOÁN VN SHEET (AGY-CALC)
**Ngày thực hiện:** 16/10/2026  
**Nhánh:** `feat/sheet-calc-agy` | **Worktree:** `E:\VNOffice-agy-calc`  
**Đối tượng đối chiếu:** Microsoft Excel 2016 thật qua COM automation (`structural_oracle.ps1` & `.mjs`)

---

## 1. Mục tiêu và Phạm vi
Triển khai bộ 5 tính năng tùy chọn công thức và tính toán cho VN Sheet khớp chuẩn Excel 2016:
1. **Tính lặp (Iterative calculation):** `Application.Iteration`, `MaxIterations` (mặc định 100, biên 1–32767), `MaxChange` (mặc định 0,001). Tự động phát hiện tham chiếu vòng lặp; khi tắt tính lặp, gán giá trị 0 và ghi nhận ô vòng lặp đầu tiên (`$A$1`); khi bật tính lặp, lặp tính cho đến khi độ lệch tối đa <= `maxChange` hoặc đạt `maxIterations`. Lưu và nạp chuẩn qua `calcPr` (`iterate="1"`, `iterateCount`, `iterateDelta`).
2. **Độ chính xác như hiển thị (Precision as displayed):** `ActiveWorkbook.PrecisionAsDisplayed`. Khi người dùng chủ động bật, giá trị số thực tế lưu trong ô và kết quả công thức được làm tròn vĩnh viễn theo số chữ số thập phân của định dạng hiển thị. Cảnh báo hộp thoại xác nhận trước khi bật. Tuyệt đối giữ nguyên độ chính xác đầy đủ khi không bật (mặc định tắt, lưu `fullPrecision="0"` khi bật).
3. **Hệ ngày 1904 (1904 Date System):** `ActiveWorkbook.Date1904`. Dịch chuyển mốc số sê-ri ngày 1462 ngày (mốc 01/01/1904 thay vì 30/12/1899). Lưu `date1904="1"` trong `workbookPr`; nạp và hiển thị đúng ngày cho tệp 1904.
4. **Kiểu tham chiếu R1C1 (R1C1 Reference Style):** `Application.ReferenceStyle`. Chuyển đổi hiển thị công thức và tiêu đề cột sang dạng số (1, 2, 3...) khi bật; Name Box hiển thị tọa độ R1C1 (ví dụ `R2C2`); chấp nhận nhập công thức dạng R1C1 và tự động chuyển đổi sang A1 nội bộ.
5. **Tùy chọn tính toán:** Tự động (`auto`), Tự động ngoại trừ bảng dữ liệu (`autoNoTable`), Thủ công (`manual`) kèm tùy chọn Tính toán lại trước khi lưu (`calcOnSave="0"`/`"1"`), phím tắt F9 (Tính lại toàn bộ) và Shift+F9 (Tính trang tính hiện tại).

---

## 2. Bảng Đối Chiếu Excel 2016 | VN Sheet Trước | VN Sheet Sau

| Hạng mục / Tính năng | Hành vi Excel 2016 thật | VN Sheet trước | VN Sheet sau |
|---|---|---|---|
| **Tham chiếu vòng khi tắt tính lặp** | Cảnh báo circular ref; trả về `0`; thanh trạng thái báo tọa độ ô vòng lặp (vd: `$A$1`) | Báo `#REF!` hoặc lặp vô tận / treo | Trả về `0`; ghi nhận `circularReference = "$A$1"`; hiển thị cảnh báo vòng lặp chuẩn |
| **Công thức lặp hội tụ (`=0.5*A1+1`)** | Bắt đầu từ 0, dừng tại vòng lặp thứ 11 khi delta = 0,0009765625 <= 0,001; kết quả `1.9990234375` | Không hỗ trợ | Dừng đúng điều kiện `maxDelta <= maxChange`; kết quả `1.9990234375` (khớp tuyệt đối) |
| **Số lần lặp tối đa (`=A1+1`, max=50)** | Lặp đúng 50 lần; kết quả `50` | Không hỗ trợ | Lặp đúng 50 lần; kết quả `50` (khớp tuyệt đối) |
| **Làm tròn theo hiển thị (Precision as displayed)** | Làm tròn vĩnh viễn giá trị thực tế theo số chữ số thập phân hiển thị (vd `1.2345` định dạng `0.00` thành `1.23`; `1.23 + 1.23 = 2.46`) | Giữ nguyên 1.2345; tổng ra 2.47 | Làm tròn số thực tế khi bật; tổng ra `2.46`; giữ nguyên đầy đủ khi tắt |
| **Hệ thống ngày 1904 (Date1904)** | Serial 40000 hệ 1900 là `2009-07-06`; hệ 1904 là `2013-07-07` (+1462 ngày) | Chỉ hỗ trợ hệ 1900 | Hỗ trợ 2 hệ thống ngày 1900 và 1904; định dạng và phân tích chuỗi ngày lệch đúng 1462 ngày |
| **Kiểu tham chiếu R1C1** | Tiêu đề cột `1, 2, 3...`; thanh công thức hiện `=R[-1]C`; Name Box hiện `R1C1`; nhập R1C1 nhận diện được | Chỉ hỗ trợ tiêu đề `A, B, C...` và cú pháp A1 | Tiêu đề cột số; thanh công thức R1C1; Name Box R1C1; nhập R1C1 tự chuyển sang A1 nội bộ |
| **Chế độ tính Tự động trừ bảng dữ liệu** | Khi sửa ô thường, bỏ qua làm mới công thức `TABLE()` / bảng dữ liệu 1D, 2D | Không có tùy chọn `autoNoTable` | Hỗ trợ `autoNoTable`, cờ `calcMode="autoNoTable"`, bỏ qua làm mới bảng dữ liệu khi sửa ô thường |
| **Chế độ tính Thủ công + F9** | Sửa dữ liệu không tính lại công thức cho đến khi bấm F9 hoặc lưu (nếu bật Tính lại trước khi lưu) | Luôn tính lại tự động khi sửa ô | Không tính lại công thức khi sửa ô; chỉ tính lại khi bấm F9, Shift+F9 hoặc lưu tệp |
| **Lưu trữ OOXML (`xl/workbook.xml`)** | `calcPr` (`calcMode`, `iterate`, `iterateCount`, `iterateDelta`, `fullPrecision`, `calcOnSave`), `workbookPr` (`date1904`) | Chỉ lưu một phần `calcMode` | Lưu và khôi phục toàn bộ thuộc tính `calcPr` và `workbookPr` 2 chiều (FODS ↔ XLSX) |

---

## 3. Kiến Trúc và Các Thành Phần Đã Triển Khai

### 3.1. Bộ chuyển đổi R1C1 (`apps/sheet/r1c1-converter.js`)
- `a1ToR1C1(formula, baseCoord)`: Chuyển đổi công thức A1 sang R1C1 tương đối hoặc tuyệt đối. Bảo toàn chuỗi ký tự (`"..."`), hỗ trợ tham chiếu trang tính khác (`Sheet2!R1C1`).
- `r1c1ToA1(formula, baseCoord)`: Chuyển đổi công thức R1C1 sang A1. Phát hiện vượt biên bảng tính và trả về `#REF!`.
- `isR1C1Formula(text)`: Kiểm tra nhận diện cú pháp R1C1.
- `formatAddressAsR1C1(address)`: Định dạng địa chỉ ô đơn (`B2` → `R2C2`), vùng ô (`A1:C10` → `R1C1:R10C3`), toàn hàng (`1:5` → `R1:R5`), toàn cột (`A:B` → `C1:C2`).
- `parseR1C1Address(r1c1Address)`: Phân tích địa chỉ R1C1 thành đối tượng `{ c, r }` hoặc vùng `{ start, end }`.

### 3.2. Động cơ định dạng và tính toán (`apps/sheet/excel-format-code.js`, `number-formatter.js`, `formula-engine.js`)
- `serialToParts(serial, date1904)`: Thêm tham số `date1904`. Khi bật, cộng 1462 ngày vào số sê-ri trước khi chuyển đổi ngày tháng.
- `formatByCode(value, code, options)`: Truyền `options.date1904` vào bộ xử lý ngày giờ.
- `NumberFormatter.getFormatDecimals(formatConfig)`: Trích xuất số chữ số thập phân từ cấu hình hoặc mã định dạng (`0.00` → 2, `#,##0.000` → 3, số nguyên → 0).
- `NumberFormatter.roundToFormatPrecision(val, formatConfig)`: Làm tròn số học theo số chữ số thập phân tương ứng.
- `FormulaEngine`: Tích hợp các thuộc tính `iteration`, `maxIterations`, `maxChange`, `precisionAsDisplayed`, `date1904`, `referenceStyle`. Các hàm `DATE`, `TEXT`, `_parseDate`, `_dateToSerial` hỗ trợ mốc 01/01/1904 khi `date1904` bật.

### 3.3. Bộ điều khiển lưới (`apps/sheet/sheet-grid.js`)
- Quản lý trạng thái: `calculationMode`, `calculateBeforeSave`, `iteration`, `maxIterations`, `maxChange`, `precisionAsDisplayed`, `date1904`, `referenceStyle`, `circularReference`.
- Các phương thức công khai: `setCalculationMode(mode)`, `setIterativeCalculation(enabled, maxIter, maxChange)`, `setPrecisionAsDisplayed(enabled)`, `setDate1904(enabled)`, `setReferenceStyle(style)`, `toggleR1C1()`, `showCalculationOptionsDialog()`, `recalculateAll()`, `calculateSheet()`.
- Thuật toán phát hiện tham chiếu vòng: `_detectCircularFormulas(graph)` phân tích chu trình trên đồ thị phụ thuộc công thức.
- Vòng lặp tính toán lặp: Lặp giải các ô thuộc chu trình lên tới `maxIterations` hoặc dừng sớm khi `maxDelta <= maxChange`. Khởi tạo xuất phát điểm từ 0 cho các công thức vòng mới.
- Thanh công thức và Name Box: Chuyển đổi hiển thị linh hoạt giữa A1 và R1C1 theo `referenceStyle`.

### 3.4. Giao diện người dùng (`apps/sheet/calc-options-dialog.js`, `sheet-ribbon.js`)
- Nhóm thanh ruy-băng **Công thức > Tính toán**:
  - Menu Tùy chọn tính toán với 3 chế độ: Tự động, Tự động ngoại trừ bảng dữ liệu, Thủ công.
  - Nút Tính lại sổ làm việc (F9) và Tính lại trang tính (Shift+F9).
  - Nút mở hộp thoại góc dưới bên phải nhóm Tính toán (`launcherCommandId: "sheet.calc.optionsDialog"`).
- Hộp thoại **Tùy chọn công thức và tính toán**:
  - Nhóm 1: Chế độ tính toán (Tự động, Tự động ngoại trừ bảng dữ liệu, Thủ công, ô chọn Tính toán lại trước khi lưu).
  - Nhóm 2: Tính toán lặp (Bật/tắt, Số lần lặp tối đa [1–32767], Độ lệch tối đa [> 0]).
  - Nhóm 3: Kiểu tham chiếu R1C1.
  - Nhóm 4: Tùy chọn sổ làm việc (Độ chính xác như hiển thị kèm cảnh báo xác nhận, Hệ thống ngày 1904).

### 3.5. Bộ chuyển đổi và Khả năng tương thích tệp (`sheet-adapter.js`, `ooxml_zip_patch.py`, `xlsx-native-postprocess.js`)
- FODS: Lưu và đọc 8 thuộc tính trên `<office:spreadsheet>`:
  - `vno:calculation-mode="auto|manual|autoNoTable"`
  - `vno:calculate-on-save="0|1"`
  - `vno:iteration="1|0"`
  - `vno:max-iterations="100"`
  - `vno:max-change="0.001"`
  - `vno:precision-as-displayed="1|0"`
  - `vno:date1904="1|0"`
  - `vno:reference-style="A1|R1C1"`
- OOXML XLSX:
  - `<calcPr calcMode="..." calcOnSave="0" iterate="1" iterateCount="..." iterateDelta="..." fullPrecision="0"/>`
  - `<workbookPr date1904="1"/>`
  - Đồng bộ hai chiều hoàn chỉnh trong cả môi trường Python (`ooxml_zip_patch.py`) và Node.js (`xlsx-native-postprocess.js`).

---

## 4. Hướng Dẫn Sử Dụng và Bản Địa Hóa

- **Trợ giúp tiếng Việt trong ứng dụng:** Bài viết chi tiết tại `platform/help/entries-sheet.js` (ID: `sheet.calc.optionsHelp`, gán lệnh `sheet.calc.optionsDialog`), hướng dẫn từng bước cụ thể bằng tiếng Việt, hướng dẫn phím tắt F9 / Shift+F9.
- **Tuân thủ quy định nhãn hiệu:** Tuyệt đối không chứa bất kỳ tên thương mại độc quyền bị cấm nào (Word, Excel, PowerPoint) trong toàn bộ chuỗi i18n, nhãn lệnh, tooltip và nội dung trợ giúp.
- **Phủ sóng Trợ giúp:** Bộ kiểm tra `tests/unit/help-coverage.test.js` đạt 12/12 PASS (100% lệnh ruy-băng có handler đều được phủ bài Help).

---

## 5. Kết Quả Kiểm Thử và Nghiệm Thu

### 5.1. Đối chiếu Oracle với Excel 2016 thật (`scripts/audit-0610/structural_oracle.mjs`)
- Kịch bản mới `tests/functions/structural-cases-9.json`: **8/8 kịch bản PASS (16/16 ô khớp tuyệt đối)**:
  1. `iteration bat voi cong thuc hoi tu`: PASS
  2. `iteration bat voi maxIterations`: PASS
  3. `vong lap khong bat iteration tra ve 0`: PASS
  4. `precision as displayed lam tron theo dinh dang`: PASS
  5. `precision as displayed tat khong lam tron`: PASS
  6. `nhap cong thuc r1c1 va tinh dung`: PASS
  7. `tinh toan thu cong khong tu dong tinh lai`: PASS
  8. `tinh toan thu cong voi calculateNow tinh lai`: PASS
- Kiểm tra hồi quy các kịch bản cũ (`structural-cases-1` đến `structural-cases-8`): **100% PASS**.

### 5.2. Đo kiểm công thức trên tệp thực tế (`sheet_formulas_vs_cache.mjs`)
- `lan04.xlsx`: Đã tính 49 ô | Khớp: 49 | Lệch: 0 (**100.00%**)
- `lan28.xlsx`: Đã tính 275 ô | Khớp: 271 | Lệch: 4 (**98.55%** >= 98,18%)

### 5.3. Bộ kiểm thử đơn vị (`npm test`)
- Đăng ký bộ kiểm thử mới: `tests/unit/sheet-calc-options.test.js` (13/13 PASS).
- Toàn bộ các suite trong test runner đạt chuẩn chất lượng.
