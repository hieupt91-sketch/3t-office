# Báo cáo đối chiếu: Đổi nguồn dữ liệu, Nhóm (ngày/số) và Trường tính toán PivotTable VN Sheet khớp Excel 2016 (AGY-PIVOT)

**Ngày thực hiện:** 16/10/2026  
**Thực hiện bởi:** agy  
**Worktree:** `E:\VNOffice-agy-pivot` (nhánh `feat/sheet-pivot-agy`)  
**Công cụ đối chiếu:** `scripts/audit-0610/structural_oracle.mjs` + `structural_oracle.ps1` (Microsoft Excel 2016 COM thật).

---

## 1. Tổng quan công việc

Đã triển khai đầy đủ 3 tính năng cốt lõi của PivotTable cho VN Sheet theo đúng phiếu việc `AGY-PIVOT.md`, đảm bảo khớp chuẩn hành vi Microsoft Excel 2016:

1. **Đổi nguồn dữ liệu (Change Data Source)**:
   - Cung cấp hộp thoại tương tác `sheet.data.pivotChangeDataSource` cho phép người dùng nhập hoặc chọn dải ô nguồn mới (hỗ trợ cả dải ô có tên sheet như `Sheet1!A1:D20` hoặc tên bảng).
   - Tự động dựng lại bảng PivotTable theo nguồn mới.
   - **Xử lý thêm/bớt cột chuẩn Excel 2016**: Khi vùng nguồn mới bị xóa hoặc mất cột, PivotTable tự động loại bỏ các trường bị mất khỏi các vùng Hàng (Rows), Cột (Columns), Giá trị (Values) và Nhóm (Grouping), ngăn ngừa lỗi sập bảng hoặc tham chiếu hỏng. Các cột mới xuất hiện trong danh sách trường để người dùng kéo thả.
   - Hỗ trợ hoàn tác (Undo) và làm lại (Redo) đưa PivotTable quay lại chính xác nguồn và bố cục trước đó.

2. **Nhóm và Bỏ nhóm (Grouping & Ungrouping)**:
   - **Nhóm số (Number Grouping)**:
     - Hỗ trợ tham số Bắt đầu (`start`), Kết thúc (`end`), Bước nhảy (`by`).
     - Sinh nhãn nhóm khớp chính xác chuẩn Excel 2016:
       - Giá trị nhỏ hơn `start`: `<{start}` (ví dụ: `<10`).
       - Các khoảng ở giữa: `{from}-{to}` (ví dụ: `10-19`, `20-29`, khoảng cuối cùng `30-40` bao gồm cả `end`).
       - Giá trị lớn hơn `end`: `>{end}` (ví dụ: `>40`).
     - Tự động sắp xếp các nhóm số theo thứ tự số học tăng dần chuẩn xác.
   - **Nhóm ngày (Date Grouping)**:
     - Hỗ trợ các cấp thời gian: Ngày (Days), Tháng (Months: `Jan`, `Feb`, `Mar`...), Quý (Quarters: `Qtr1`, `Qtr2`, `Qtr3`, `Qtr4`), Năm (Years: `2023`, `2024`...) và kết hợp đa cấp (ví dụ Năm + Quý, Năm + Tháng).
     - Hỗ trợ dữ liệu ngày ở dạng chuỗi ISO (`2023-01-15`), số serial Excel (`44941`), hoặc đối tượng `Date`.
     - Tự động sắp xếp theo thứ tự niên đại chuẩn (Tháng 1 đến 12, Quý 1 đến 4).
   - **Bỏ nhóm (Ungroup)**:
     - Lệnh `sheet.data.pivotUngroup` rã nhóm của trường được chọn (hoặc tất cả các trường), khôi phục lại các giá trị gốc ban đầu.

3. **Trường tính toán (Calculated Fields)**:
   - Hộp thoại Thêm / Sửa / Xóa trường tính toán `sheet.data.pivotCalculatedField`.
   - Cho phép nhập công thức toán học sử dụng tên trường, ví dụ `=Amount*0.1` hoặc `='Đơn giá'*'Số lượng'`.
   - **Excel Parity**: Tính toán công thức trên **tổng (`SUM`) của các trường thành phần trong ô tổng hợp** (`SUM(UnitPrice) * SUM(Qty)`), không tích lũy từ từng dòng con.
   - Hỗ trợ biểu thức số học an toàn (+, -, *, /, số mũ, dấu ngoặc).

4. **Bảo toàn lưu/mở ODF & tương thích XLSX**:
   - Lưu trữ `grouping` và `calculatedFields` vào thuộc tính mở rộng ODF `vno:grouping` và `vno:calculated-fields` trong thẻ `<table:data-pilot-table>`.
   - Khi mở lại tệp FODS, `_attachImportedPivots` nạp lại nguyên vẹn cấu hình nhóm và trường tính toán.
   - Chỉ bổ sung metadata khi có thao tác thật, không làm biến đổi hash baseline của các tệp FODS mẫu không có pivot mở rộng.

5. **Trợ giúp & Quốc tế hóa (Help & i18n)**:
   - Viết 3 bài Trợ giúp tiếng Việt chi tiết với các bước thao tác cụ thể (không dùng placeholder):
     - `sheet.data.pivotChangeDataSourceHelp` (Đổi nguồn dữ liệu)
     - `sheet.data.pivotGroupHelp` (Nhóm trường số hoặc ngày)
     - `sheet.data.pivotCalculatedFieldHelp` (Trường tính toán)
   - Tăng số lượng lệnh Help Sheet từ 192 lên 196 (đạt 100% covered, 0 dead button).
   - Đầy đủ nhãn, gợi ý song ngữ VI/EN trong `strings-vi.js` và `strings-en.js`, tuyệt đối không chứa tên thương mại cấm.

---

## 2. Bảng so sánh 3 cột (Excel 2016 COM | VN Sheet trước | VN Sheet sau)

| Tính năng | Microsoft Excel 2016 (COM thật) | VN Sheet trước | VN Sheet sau |
|---|---|---|---|
| **Đổi nguồn dữ liệu** | Hộp thoại chọn dải ô mới; tự động loại bỏ các trường không còn trong nguồn mới khỏi Rows/Columns/Values | Chưa có lệnh đổi nguồn; phải xóa bảng tạo lại từ đầu | Hộp thoại chọn dải ô mới; tự động lọc bỏ trường mất; cập nhật lại dữ liệu; có Undo/Redo |
| **Nhóm số (Number Grouping)** | Nhập Bắt đầu, Kết thúc, Bước; sinh nhãn `<10`, `10-19`, `20-29`, `30-40`, `>40` | Chưa hỗ trợ nhóm; chỉ hiển thị từng số rời rạc | Hỗ trợ Bắt đầu, Kết thúc, Bước; sinh nhãn `<start`, `a-b`, `>end` khớp 100% Excel |
| **Nhóm ngày (Date Grouping)** | Nhóm theo Tháng (`Jan`..`Dec`), Quý (`Qtr1`..`Qtr4`), Năm (`2023`..) hoặc kết hợp | Chưa hỗ trợ nhóm ngày; chỉ hiển thị ngày thô | Nhóm theo Tháng, Quý, Năm, kết hợp đa cấp; sắp xếp đúng thứ tự niên đại |
| **Bỏ nhóm (Ungroup)** | Lệnh Ungroup rã nhóm, khôi phục giá trị gốc | Chưa có lệnh Ungroup | Lệnh Ungroup khôi phục nguyên trạng giá trị gốc và cập nhật lại bảng |
| **Trường tính toán (Calculated Field)** | Công thức `=Amount*0.1`; tính toán trên `SUM` của các trường thành phần | Chưa có trường tính toán; chỉ có các hàm tổng hợp cơ bản (SUM, COUNT, AVERAGE, MIN, MAX) | Hộp thoại thêm/sửa/xóa trường tính toán; công thức tên trường; đánh giá chuẩn `SUM` |
| **Lưu/mở bảo toàn** | Lưu trong `pivotCacheDefinition` / `pivotTableDefinition` | Chỉ lưu rows/columns/values cơ bản trong DataPilot | Bảo toàn cả `grouping` và `calculatedFields` qua `vno:grouping` và `vno:calculated-fields` |
| **Thanh công cụ Ribbon** | Nhóm PivotTable có Đổi nguồn, Nhóm, Bỏ nhóm, Trường tính toán | Nhóm PivotTable chỉ có Tạo bảng và Làm mới | Đầy đủ 6 nút: Tạo bảng, Làm mới, Đổi nguồn, Nhóm, Bỏ nhóm, Trường tính toán |

---

## 3. Kết quả đối chiếu kịch bản `structural-cases-15.json` (Excel 2016 COM thật)

Chạy đối chiếu tự động bằng công cụ `node scripts/audit-0610/structural_oracle.mjs tests/functions/structural-cases-15.json`:

```
PASS | pivot change data source
PASS | pivot number grouping
PASS | pivot ungroup
PASS | pivot calculated field
SUMMARY 88/88 o khop Excel 2016; 4/4 kich ban
```

### Chi tiết từng kịch bản:

1. **`pivot change data source`**:
   - Dữ liệu ban đầu: `A1:B4` (Fruit: 100, Vegetable: 200, Fruit: 150).
   - PivotTable ban đầu: Fruit = 250, Vegetable = 200, Grand Total = 450.
   - Thêm ô `A5:B5` (Dairy: 50) và đổi nguồn sang `A1:B5`.
   - Kết quả Excel COM & VN Sheet:
     - `E1`: "Row Labels", `F1`: "Sum of Amount"
     - `E2`: "Fruit", `F2`: 250
     - `E3`: "Vegetable", `F3`: 200
     - `E4`: "Dairy", `F4`: 50
     - `E5`: "Grand Total", `F5`: 500
   - **Kết quả:** Khớp 100%.

2. **`pivot number grouping`**:
   - Dữ liệu: `A1:B6` (Age: 5, 15, 25, 35, 45; Score: 10, 20, 30, 40, 50).
   - Nhóm Age từ 10 đến 40, bước 10 (`start=10, end=40, by=10`).
   - Kết quả Excel COM & VN Sheet:
     - `E1`: "Row Labels", `F1`: "Sum of Score"
     - `E2`: "<10", `F2`: 10
     - `E3`: "10-19", `F3`: 20
     - `E4`: "20-29", `F4`: 30
     - `E5`: "30-40", `F5`: 40
     - `E6`: ">40", `F6`: 50
     - `E7`: "Grand Total", `F7`: 150
   - **Kết quả:** Khớp 100%.

3. **`pivot ungroup`**:
   - Bỏ nhóm trường Age sau khi đã nhóm.
   - Kết quả Excel COM & VN Sheet: Khôi phục lại 5 dòng gốc (5, 15, 25, 35, 45) với tổng điểm 150.
   - **Kết quả:** Khớp 100%.

4. **`pivot calculated field`**:
   - Dữ liệu: `A1:B4` (Category, Amount; Fruit: 100, Vegetable: 200, Fruit: 300).
   - Thêm trường tính toán: `Tax = "=Amount*0.1"`.
   - Kết quả Excel COM & VN Sheet:
     - `E1`: "Row Labels", `F1`: "Sum of Tax"
     - `E2`: "Fruit", `F2`: 40 (tổng Amount = 400 * 0.1 = 40)
     - `E3`: "Vegetable", `F3`: 20 (tổng Amount = 200 * 0.1 = 20)
     - `E4`: "Grand Total", `F4`: 60 (tổng Amount = 600 * 0.1 = 60)
   - **Kết quả:** Khớp 100%.

---

## 4. Những phần không so được trực tiếp trong sổ tạm (Limitations & Assumptions)

1. **Giao diện hộp thoại modal HTML**:
   - Các hộp thoại Đổi nguồn (`showChangePivotDataSourceDialog`), Nhóm (`showPivotGroupDialog`), Trường tính toán (`showPivotCalculatedFieldDialog`) là các phần tử giao diện DOM của ứng dụng VN Sheet. Excel COM không xuất giao diện để so sánh trực tiếp.
   - Các hộp thoại này được kiểm thử toàn diện thông qua unit test trong `tests/unit/sheet-pivot-table.test.js` (kiểm tra đầy đủ các nút bấm, sự kiện nhập liệu, kiểm tra dữ liệu đầu vào và thông báo lỗi).

2. **Quy tắc định dạng ngày tháng theo Locale**:
   - Excel 2016 COM tự động áp dụng locale Windows khi hiển thị ngày. Trong VN Sheet, engine hỗ trợ cả chuẩn chuỗi ISO `YYYY-MM-DD`, số serial Excel và tên tháng tiếng Anh (`Jan`, `Feb`...) để đảm bảo tính đồng nhất trên mọi môi trường và nền tảng.

3. **Cơ chế tính toán của Trường tính toán đối với phép nhân/chia**:
   - Theo chuẩn Excel 2016, Calculated Field luôn áp dụng công thức trên tổng `SUM` của trường (`SUM(A) * SUM(B)`), chứ không tính trên từng dòng dữ liệu (`SUM(A * B)`). Đã ghi chú rõ ràng trong bài Hướng dẫn sử dụng để người dùng nắm vững.

---

## 5. Tổng kết nghiệm thu toàn bộ

| Hạng mục kiểm thử | Mục tiêu | Kết quả thực tế | Trạng thái |
|---|---|---|---|
| **Toàn bộ Test Suite (`npm test`)** | $\ge 3518$ tests PASS, 0 FAIL | **3523/3523 PASS, 0 FAIL** (100%) | ✅ PASS |
| **Kịch bản PivotTable mới (`structural-cases-15.json`)** | Khớp Excel 2016 COM | **4/4 kịch bản PASS (88/88 ô khớp tuyệt đối)** | ✅ PASS |
| **Kiểm tra hồi quy cấu trúc (`structural-cases-1..8.json`)** | 100% PASS | **100% PASS** (118 kịch bản, 680+ ô khớp) | ✅ PASS |
| **Kiểm toán công thức (`lan04.xlsx`)** | $100.00\%$ | **100.00%** (49/49 công thức khớp cache) | ✅ PASS |
| **Kiểm toán công thức (`lan28.xlsx`)** | $\ge 98.18\%$ | **98.55%** (271/275 công thức khớp cache) | ✅ PASS |
| **Độ phủ Trợ giúp (Help Coverage)** | 100% lệnh có Help tiếng Việt | **196/196 lệnh Sheet (100% covered)** | ✅ PASS |
| **Tuân thủ quy tắc không thương hiệu cấm** | 0 vi phạm ("Word", "Excel", "PowerPoint") | **0 vi phạm** trong Help, i18n, Dialog | ✅ PASS |
