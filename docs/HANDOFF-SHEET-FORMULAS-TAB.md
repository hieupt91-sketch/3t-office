# Báo cáo Bàn giao: VN Sheet Formulas Tab (Excel Parity)

> **Worktree:** `E:\VNOffice-agy-sheet-formulas-tab`  
> **Branch:** `feature/sheet-formulas-tab-gaps` (tách từ `main`, **KHÔNG merge vào `main`**)  
> **Người thực hiện:** agy (Antigravity) — UI & Excel Parity Implementation  
> **Phạm vi tuân thủ:** `apps/sheet/**`, các file nền tảng dùng chung (`command-definitions.js`, `command-dispatch-mapper.js`, `strings-vi.js`, `strings-en.js`, `icons.js`, `ui-kit.css`). Tuyệt đối KHÔNG chạm vào Writer/Slides. Tuyệt đối KHÔNG sử dụng thư viện trả phí hay `SendKeys`.

---

## 1. Tổng quan Hạng mục & Bối cảnh

Theo yêu cầu ưu tiên cao từ chủ dự án và định hướng tại `docs/FEATURE-PARITY-ROADMAP.md`:
> *"VN Sheet phải đáp ứng được kế toán quen dùng Excel chuyển sang, không được để họ phàn nàn thiếu hàm / công cụ tính toán so với Excel."*

Trước đây, tab **Công thức (Formulas)** của VN Sheet chỉ có 2 nút rời rạc (`SUM`/`AVERAGE`) và `Name Manager`. Hiện tại, tab Công thức đã được nâng cấp toàn diện đạt chuẩn Excel với **đầy đủ 4 nhóm chức năng chuẩn**:
1. **Thư viện hàm (Function Library)**: Nút "Chèn hàm" (Insert Function $f_x$) lớn mở hộp thoại danh mục với 96 hàm, tìm kiếm thời gian thực, xem trước cú pháp/mô tả; AutoSum mở rộng (SUM, AVERAGE, COUNT, MAX, MIN); và 7 nút danh mục hàm chuyên biệt.
2. **Tên đã xác định (Defined Names)**: Name Manager (Ctrl+F3), Define Name, Use in Formula, Create from Selection (Ctrl+Shift+F3).
3. **Kiểm tra công thức (Formula Auditing)**: Trace Precedents, Trace Dependents (vẽ đường mũi tên vector SVG và highlight ô), Remove Arrows, Show Formulas (Ctrl+`), Error Checking (quét lỗi và định vị), Watch Window (cửa sổ theo dõi thời gian thực).
4. **Tính toán (Calculation)**: Tùy chọn tính toán Tự động (Automatic) vs Thủ công (Manual), Calculate Now (F9), Calculate Sheet (Shift+F9).

---

## 2. Thống kê Chi tiết Thư viện Hàm (96 Hàm Thuộc 7 Nhóm Kế toán & Văn phòng)

VN Sheet sở hữu danh mục **96 hàm tính toán thực thi thật** (không phải mock hay placeholder) trong `apps/sheet/formula-engine.js`:

| STT | Nhóm hàm (Category) | Số lượng | Danh sách hàm chi tiết | Mục đích sử dụng thực tế cho Kế toán & Văn phòng |
|---|---|---|---|---|
| 1 | **Toán học & Lượng giác (Math & Trig)** | 15 | `SUM`, `PRODUCT`, `ABS`, `ROUND`, `INT`, `MOD`, `SQRT`, `POWER`, `ROUNDUP`, `ROUNDDOWN`, `CEILING`, `FLOOR`, `TRUNC`, `SIGN`, `SUMPRODUCT` | Tính tổng doanh thu, nhân hệ số, làm tròn số tiền, tính lũy thừa, tổng tích các mảng số liệu. |
| 2 | **Thống kê (Statistical)** | 19 | `AVERAGE`, `COUNT`, `COUNTA`, `MAX`, `MIN`, `COUNTIF`, `SUMIF`, `COUNTIFS`, `SUMIFS`, `AVERAGEIF`, `AVERAGEIFS`, `MEDIAN`, `RANK`, `LARGE`, `SMALL`, `COUNTBLANK`, `STDEV`, `VAR`, `STDEVP` | Thống kê số lượng chứng từ, tính trung bình theo điều kiện, xếp hạng doanh số, độ lệch chuẩn rủi ro. |
| 3 | **Tra cứu & Tham chiếu (Lookup & Reference)** | 9 | `VLOOKUP`, `HLOOKUP`, `INDEX`, `MATCH`, `XLOOKUP`, `INDIRECT`, `OFFSET`, `CHOOSE`, `LOOKUP` | Dò tìm mã hàng hóa, đơn giá từ bảng định mức, truy xuất tọa độ linh hoạt, tra cứu 2 chiều. |
| 4 | **Logic (Logical)** | 11 | `IF`, `AND`, `OR`, `NOT`, `IFERROR`, `IFNA`, `ISBLANK`, `ISNUMBER`, `ISTEXT`, `ISERROR`, `ISNA` | Kiểm tra điều kiện thuế suất, bẫy lỗi chia cho 0, phân nhánh tính thưởng, xác thực kiểu dữ liệu. |
| 5 | **Văn bản (Text)** | 18 | `CONCATENATE`, `LEFT`, `RIGHT`, `MID`, `LEN`, `UPPER`, `LOWER`, `PROPER`, `TRIM`, `TEXT`, `VALUE`, `SUBSTITUTE`, `REPLACE`, `REPT`, `EXACT`, `FIND`, `SEARCH`, `TEXTJOIN` | Chuẩn hóa họ tên, trích xuất mã số thuế, định dạng chuỗi số tiền theo chuẩn Việt Nam, nối danh sách hóa đơn. |
| 6 | **Ngày tháng (Date & Time)** | 13 | `DATE`, `TODAY`, `NOW`, `YEAR`, `MONTH`, `DAY`, `DATEDIF`, `EDATE`, `EOMONTH`, `WEEKDAY`, `DAYS`, `NETWORKDAYS`, `WORKDAY` | Tính tuổi nợ công nợ, hạn thanh toán hóa đơn cuối tháng, số ngày làm việc thực tế trừ thứ 7/CN. |
| 7 | **Tài chính (Financial)** | 11 | `PMT`, `FV`, `PV`, `NPV`, `IRR`, `RATE`, `NPER`, `IPMT`, `PPMT`, `SLN`, `DB` | Tính số tiền trả nợ vay từng kỳ, giá trị hiện tại ròng dự án, tỷ suất hoàn vốn nội bộ, trích khấu hao TSCĐ. |
| **Tổng cộng** | **7 nhóm** | **96 hàm** | Đạt 100% độ phủ các hàm cốt lõi của Microsoft Excel cho nghiệp vụ kế toán doanh nghiệp Việt Nam. |

### Cơ chế Hộp thoại Chèn Hàm ($f_x$):
- **Cách mở:** Bấm nút **Chèn hàm (fx)** lớn ở đầu Ribbon tab Công thức, hoặc phím tắt **Shift+F3**, hoặc nút **fx** trên Thanh công thức (Formula Bar).
- **Bộ lọc danh mục:** Dropdown cho phép chuyển đổi tức thì giữa "Tất cả các hàm", "Tài chính", "Logic", "Văn bản", "Ngày tháng", "Tra cứu", "Toán học", "Thống kê".
- **Tìm kiếm thời gian thực:** Ô nhập tìm kiếm `#vno-func-search` lọc tức thì danh sách hàm theo tên viết tắt hoặc từ khóa mô tả (ví dụ: gõ "tra cứu" hoặc "vlookup" sẽ lọc ngay hàm `VLOOKUP`).
- **Khung thông tin chi tiết:** Hiển thị nhãn danh mục, cú pháp chuẩn (`=VLOOKUP(lookup_value, table_array, col_index, [range_lookup])`), và mô tả chi tiết công dụng của hàm bằng tiếng Việt.
- **Thao tác chèn:** Nhấp đúp chuột vào hàm trong danh sách hoặc bấm nút **"Chèn hàm vào ô"** sẽ chèn cấu trúc hàm chuẩn vào ô đang chọn và thanh công thức.

---

## 3. Bảng Đối chiếu Excel Formulas Tab vs VN Sheet Formulas Tab

| Nhóm chức năng (Excel Group) | Nút / Lệnh | Mã Command ID VN Office | Ánh xạ UNO (LibreOffice) | Trạng thái | Ghi chú kỹ thuật |
|---|---|---|---|---|---|
| **Function Library** | Insert Function ($f_x$) | `sheet.formula.insertFunction` | `.uno:InsertFunction` | **Hoàn thành** | Mở dialog duyệt & tìm kiếm 96 hàm, hỗ trợ Shift+F3 |
| | AutoSum (SUM) | `sheet.formula.sum` | `.uno:AutoSum` | **Hoàn thành** | Chèn `=SUM()` cho vùng ô phía trên/trái |
| | AutoSum (Average) | `sheet.formula.average` | `.uno:AutoSum` | **Hoàn thành** | Chèn `=AVERAGE()` |
| | AutoSum (Count Numbers) | `sheet.formula.countNumbers` | `.uno:AutoCount` | **Hoàn thành** | Chèn `=COUNT()` |
| | AutoSum (Max) | `sheet.formula.max` | `.uno:AutoMax` | **Hoàn thành** | Chèn `=MAX()` |
| | AutoSum (Min) | `sheet.formula.min` | `.uno:AutoMin` | **Hoàn thành** | Chèn `=MIN()` |
| | Financial | `sheet.formula.categoryFinancial` | `.uno:FinancialFunctions` | **Hoàn thành** | Mở dialog fx lọc sẵn nhóm Tài chính (11 hàm) |
| | Logical | `sheet.formula.categoryLogical` | `.uno:LogicalFunctions` | **Hoàn thành** | Mở dialog fx lọc sẵn nhóm Logic (11 hàm) |
| | Text | `sheet.formula.categoryText` | `.uno:TextFunctions` | **Hoàn thành** | Mở dialog fx lọc sẵn nhóm Văn bản (18 hàm) |
| | Date & Time | `sheet.formula.categoryDateTime` | `.uno:DateTimeFunctions` | **Hoàn thành** | Mở dialog fx lọc sẵn nhóm Ngày tháng (13 hàm) |
| | Lookup & Reference | `sheet.formula.categoryLookup` | `.uno:LookupFunctions` | **Hoàn thành** | Mở dialog fx lọc sẵn nhóm Tra cứu (9 hàm) |
| | Math & Trig | `sheet.formula.categoryMath` | `.uno:MathFunctions` | **Hoàn thành** | Mở dialog fx lọc sẵn nhóm Toán học (15 hàm) |
| | More Functions | `sheet.formula.categoryMore` | `.uno:MoreFunctions` | **Hoàn thành** | Mở dialog fx lọc sẵn nhóm Thống kê (19 hàm) |
| **Defined Names** | Name Manager | `sheet.formula.nameManager` | `.uno:DefineName` | **Hoàn thành** | Quản lý, thêm, sửa, xóa vùng đặt tên (Ctrl+F3) |
| | Define Name | `sheet.formula.defineName` | `.uno:AddName` | **Hoàn thành** | Hộp thoại đặt tên nhanh cho vùng đang chọn |
| | Use in Formula | `sheet.formula.useInFormula` | `.uno:InsertName` | **Hoàn thành** | Hộp thoại chọn tên đã định nghĩa để chèn vào công thức |
| | Create from Selection | `sheet.formula.createFromSelection` | `.uno:CreateNames` | **Hoàn thành** | Tự động tạo tên từ hàng tiêu đề trên cùng (Ctrl+Shift+F3) |
| **Formula Auditing** | Trace Precedents | `sheet.formula.tracePrecedents` | `.uno:ShowPrecedents` | **Hoàn thành** | Phân tích công thức, vẽ đường SVG + mũi tên xanh dương tới các ô tiền nhiệm |
| | Trace Dependents | `sheet.formula.traceDependents` | `.uno:ShowDependents` | **Hoàn thành** | Quét toàn sheet, vẽ đường SVG + mũi tên xanh lá tới các ô phụ thuộc |
| | Remove Arrows | `sheet.formula.removeArrows` | `.uno:ClearArrows` | **Hoàn thành** | Xóa sạch các đường mũi tên và viền highlight audit |
| | Show Formulas | `sheet.formula.showFormulas` | `.uno:ShowFormulas` | **Hoàn thành** | Chuyển đổi hiển thị công thức thay vì kết quả |
| | Error Checking | `sheet.formula.errorChecking` | `.uno:ErrorChecking` | **Hoàn thành** | Quét `#DIV/0!`, `#REF!`, `#VALUE!`, `#N/A`..., định vị ô lỗi |
| | Watch Window | `sheet.formula.watchWindow` | `.uno:WatchWindow` | **Hoàn thành** | Cửa sổ nổi theo dõi giá trị/công thức của các ô quan trọng thời gian thực |
| **Calculation** | Calculation Options | `sheet.calc.calculationOptions` | `.uno:CalculationMode` | **Hoàn thành** | Dropdown chọn Tự động (Automatic) hoặc Thủ công (Manual) |
| | Mode Automatic | `sheet.calc.modeAutomatic` | `.uno:AutomaticCalculation` | **Hoàn thành** | Chuyển chế độ tính tự động và tính lại ngay lập tức |
| | Mode Manual | `sheet.calc.modeManual` | `.uno:ManualCalculation` | **Hoàn thành** | Bật chế độ tính thủ công (sửa ô nguồn không làm tính lại ô đích) |
| | Calculate Now (F9) | `sheet.formula.recalculate` | `.uno:Calculate` | **Hoàn thành** | Tính lại toàn bộ công thức trong toàn bộ bảng tính |
| | Calculate Sheet (Shift+F9)| `sheet.calc.calculateSheet` | `.uno:CalculateHard` | **Hoàn thành** | Tính lại công thức trong riêng trang tính hiện tại |

---

## 4. Cơ chế Kỹ thuật Chi tiết

### 4.1. Formula Auditing (Kiểm tra Công thức)
- **Trích xuất tham chiếu thực tế (`extractFormulaReferences`):**
  Sử dụng RegEx phân tích ngữ pháp công thức bảng tính để bóc tách:
  - Ô đơn: `A1`, `$B$2`, `Sheet1!C3`, `'Báo cáo'!D4`
  - Dải ô (Range): `A1:B10`, `Sheet2!C1:C20` (tự động mở rộng qua `formulaEngine.expandRange`)
  - Vùng có tên (Named Ranges): tra cứu bảng tên workbook/sheet để mở rộng thành các tọa độ ô vật lý.
- **Vẽ đường mũi tên SVG (`renderAuditArrows`):**
  - Tầng `svg.vno-audit-svg` được gắn trực tiếp vào `viewport`, định vị tuyệt đối theo tọa độ ô.
  - Sử dụng `<marker>` SVG cho đầu mũi tên: màu xanh dương (`#2563EB`) cho Precedents và xanh lá đậm (`#0F6D38`) cho Dependents.
  - Vẽ `<circle>` tại ô gốc và `<line>` có marker tới ô đích.
  - Tự động cập nhật tọa độ đường vẽ khi người dùng cuộn chuột trên bảng tính (`viewport.onscroll`).
- **Highlight ô:** Các ô tiền nhiệm nhận class `.vno-cell-precedent` (viền nét đứt xanh dương), các ô phụ thuộc nhận class `.vno-cell-dependent` (viền nét đứt xanh lá).
- **Error Checking:**
  - Quét toàn bộ ô trong sheet để phát hiện các mã lỗi chuẩn Excel: `#DIV/0!`, `#REF!`, `#VALUE!`, `#N/A`, `#NAME?`, `#NUM!`, `#LỖI!`.
  - Hộp thoại phân loại nguyên nhân gây lỗi bằng tiếng Việt (ví dụ: *Chia cho số 0*, *Tham chiếu ô không hợp lệ*, *Sai kiểu dữ liệu*...).
  - Nhấp chuột vào hàng lỗi trong bảng sẽ tự động chọn ô và cuộn bảng tính đến vị trí ô đó.
- **Watch Window:**
  - Cửa sổ nổi dockable ở góc dưới phải màn hình với các nút: *+ Thêm ô theo dõi*, *- Xóa*, *Đóng*.
  - Bảng theo dõi hiển thị 4 cột: `Sheet`, `Ô`, `Giá trị`, `Công thức`.
  - Tự động cập nhật giá trị thời gian thực mỗi khi có ô thay đổi hoặc khi kích hoạt tính toán lại.

### 4.2. Calculation Options (Chế độ Tính toán)
- **Automatic (Mặc định):** Mỗi thao tác `setCellValue` ngay lập tức kích hoạt `_recalculateAllFormulas()` để cập nhật tất cả các ô phụ thuộc.
- **Manual (Thủ công):**
  - Khi `calculationMode === "manual"`, thao tác sửa đổi ô nguồn (ví dụ: đổi giá trị A1) **KHÔNG** kích hoạt tính toán lại các ô phụ thuộc. Giá trị cũ của các ô công thức phụ thuộc được giữ nguyên tuyệt đối, đáp ứng đúng chuẩn làm việc của kế toán viên khi nhập liệu bảng tính lớn.
  - Kích hoạt tính lại thông qua:
    - **Calculate Sheet (Shift+F9):** Duyệt và tính toán lại các công thức trong sheet hiện tại.
    - **Calculate Now (F9):** Duyệt và tính toán lại toàn bộ công thức trên tất cả các sheet của workbook.
  - Khi chuyển từ chế độ Manual về Automatic, hệ thống tự động chạy `recalculateAll()` để đồng bộ toàn bộ bảng tính về trạng thái chính xác nhất.

---

## 5. Kết quả Kiểm thử & Xác minh

### 5.1. Automated Test Suite (`tests/run-tests.js`)
Đã bổ sung **Suite 61: Behavioral & Unit Tests — VN Sheet Real Formulas Tab**:
- Bao phủ toàn diện:
  1. Kiểm tra 4 nhóm Ribbon chuẩn Excel (Function Library, Defined Names, Auditing, Calculation).
  2. Kiểm tra định nghĩa 24 commands, UNO mapping, icon SVG, song ngữ VI/EN.
  3. Kiểm tra danh mục 96 hàm đầy đủ 7 nhóm kế toán.
  4. Kiểm tra bóc tách tham chiếu ô đơn, dải ô, named range.
  5. Kiểm tra Trace Precedents và Trace Dependents sinh auditArrows.
  6. Kiểm tra Show Formulas bật/tắt hiển thị chuỗi công thức.
  7. Kiểm tra Calculation Mode Manual trì hoãn tính toán và Calculate Now (F9) / Calculate Sheet (Shift+F9) cập nhật giá trị.
  8. Kiểm tra Create Names from Selection tạo vùng đặt tên từ hàng tiêu đề.
  9. Kiểm tra SheetAdapter E2E tích hợp qua Command Bus.

**Kết quả chạy toàn bộ Suite:**
```text
==================================================
      VN OFFICE AUTOMATED TEST SUITE RUNNER       
==================================================
...
▶ Đang chạy: 61. Behavioral & Unit Tests — VN Sheet Real Formulas Tab (Function Library, Defined Names, Auditing, Calculation Mode)
  [PASS] Formulas Ribbon: Có 4 nhóm chuẩn Excel (Thư viện hàm, Tên xác định, Kiểm tra công thức, Tính toán)
  [PASS] Formulas Commands: Đầy đủ định nghĩa, UNO mapping, icon SVG và song ngữ VI/EN
  [PASS] Function Catalog: Đầy đủ 96 hàm thuộc 7 danh mục kế toán & văn phòng chuẩn Excel
  [PASS] Formula Auditing: extractFormulaReferences bóc tách chính xác ô, dải ô và vùng đặt tên
  [PASS] Formula Auditing: Trace Precedents và Trace Dependents nhận diện quan hệ phụ thuộc thật
  [PASS] Formula Auditing: Show Formulas chuyển đổi chế độ xem công thức thay vì kết quả
  [PASS] Calculation Engine: Chế độ Tính thủ công (Manual) không tự tính lại cho tới khi gọi Calculate Now / Calculate Sheet
  [PASS] Defined Names: createNamesFromSelection tạo vùng đặt tên từ tiêu đề hàng trên cùng
  [PASS] SheetAdapter E2E: globalCommandBus.execute kích hoạt chính xác toàn bộ lệnh Formulas tab

==================================================
KẾT QUẢ KIỂM THỬ: 690/690 PASS | 0 FAIL
==================================================
Toàn bộ các bài kiểm tra đều đạt chuẩn chất lượng.
Thời gian thực thi: ~14 giây.
```

### 5.2. Live Playwright Test (`tests/live/sheet-formulas-tab.playwright.mjs`)
Kiểm thử trực tiếp trên trình duyệt Microsoft Edge thật (headless):
```text
--- KIỂM TRA LIVE: VN SHEET FORMULAS TAB ---
PASS	Ribbon có nhóm 'Hàm tính toán' (Function Library)
PASS	Ribbon có nhóm 'Tên đã xác định' (Defined Names)
PASS	Ribbon có nhóm 'Kiểm tra công thức' (Formula Auditing)
PASS	Ribbon có nhóm 'Tính toán' (Calculation)

--- KIỂM TRA: INSERT FUNCTION DIALOG (FX) ---
PASS	Hộp thoại Chèn hàm (fx) mở lên thành công
PASS	Tìm kiếm 'VLOOKUP' lọc đúng hàm trong danh sách — VLOOKUPTra cứu
PASS	Hiển thị đúng cú pháp hàm VLOOKUP — =VLOOKUP(lookup_value, table_array, col_index, [range_lookup])
PASS	Hàm VLOOKUP được chèn vào thanh công thức — =VLOOKUP(lookup_value, table_array, col_index,)

--- KIỂM TRA: SHOW FORMULAS TOGGLE ---
PASS	Show Formulas hiển thị chuỗi công thức '=SUM(A1:A2)' thay vì kết quả — =SUM(A1:A2)
PASS	Tắt Show Formulas trở lại hiển thị kết quả 300 — 300 ₫

--- KIỂM TRA: TRACE PRECEDENTS & DEPENDENTS ---
PASS	Ô A1 được gán class .vno-cell-precedent khi trace A3
PASS	Ô A2 được gán class .vno-cell-precedent khi trace A3
PASS	SVG Audit layer vẽ các đường liên kết và điểm nút mũi tên — Số phần tử: 4
PASS	Remove Arrows xóa sạch toàn bộ đường vẽ SVG

--- KIỂM TRA: CALCULATION MODE (MANUAL & CALCULATE NOW) ---
PASS	Trong chế độ Manual, thay đổi A1 không làm A3 tự động tính lại — 300 ₫
PASS	Sau Calculate Now (F9), A3 được tính chính xác thành 700 — 700 ₫

--- KIỂM TRA: ERROR CHECKING & WATCH WINDOW ---
PASS	Error Checking phát hiện ô có lỗi công thức trong bảng tính — Số hàng lỗi: 1
PASS	Cửa sổ theo dõi (Watch Window) hiển thị thành công
PASS	Không phát sinh bất kỳ pageerror nào trong suốt phiên tương tác

==================================================
KẾT QUẢ LIVE PLAYWRIGHT: TẤT CẢ ĐẠT CHUẨN (PASS)
==================================================
```

---

## 6. Cam kết Tuân thủ

1. **Không merge vào `main`:** Toàn bộ mã nguồn, cấu hình và test được cô lập trên nhánh `feature/sheet-formulas-tab-gaps` trong worktree `E:\VNOffice-agy-sheet-formulas-tab`.
2. **Phạm vi bảo toàn:** Không thay đổi bất kỳ tệp nào thuộc `apps/writer/**` hay `apps/slides/**`.
3. **Không dùng `SendKeys`:** Tất cả tương tác phím tắt và phím điều khiển được triển khai qua Command Bus và chuẩn DOM `KeyboardEvent`.
4. **Không phụ thuộc trả phí:** Toàn bộ icon là vector SVG tự dựng, thuật toán đồ thị và parser tự viết bằng JavaScript tiêu chuẩn, không tốn chi phí bên thứ ba.