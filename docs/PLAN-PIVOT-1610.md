# Kế hoạch kỹ thuật: Đổi nguồn, Nhóm (ngày/số) và Trường tính toán cho PivotTable VN Sheet (AGY-PIVOT)

**Mã phiếu**: AGY-PIVOT  
**Nhánh Git**: `feat/sheet-pivot-agy`  
**Mục tiêu**: Hoàn thiện 3 tính năng PivotTable trong VN Sheet khớp với chuẩn hành vi Excel 2016: Đổi nguồn dữ liệu (Change Data Source), Nhóm (ngày/số/bỏ nhóm), Trường tính toán (Calculated Fields), đồng thời đảm bảo lưu/mở lại khớp và Help/i18n đầy đủ.

---

## 1. Mục tiêu và Phạm vi (Objective & Scope)

### 1.1 Tính năng cần bổ sung
1. **Đổi nguồn dữ liệu (Change Data Source)**:
   - Hộp thoại cho phép nhập/chọn vùng dữ liệu nguồn mới (`A1:D20`) hoặc tên bảng.
   - Khi nguồn thay đổi: PivotTable cập nhật lại các bản ghi, tính toán lại kết quả.
   - Nếu vùng mới thêm hoặc bớt cột: các trường bị mất cột sẽ tự động bị loại bỏ khỏi các vùng Rows / Columns / Values (giống hệt Excel 2016). Các trường mới xuất hiện trong danh sách trường.
   - Đồng bộ `sourceSheet`, `sourceRange`, `resultRange`, và cập nhật các biểu đồ PivotChart liên quan.

2. **Nhóm (Grouping)**:
   - **Nhóm số (Number Grouping)**: Bắt đầu (`start`), Kết thúc (`end`), Bước nhảy (`by`).
     - Sinh nhãn nhóm khớp chuẩn Excel 2016:
       - Giá trị nhỏ hơn `start`: `<{start}` (ví dụ `<10`).
       - Các khoảng: `{from}-{to}` (ví dụ `10-19`, `20-29`, khoảng cuối cùng `30-40` bao gồm cả `end`).
       - Giá trị lớn hơn `end`: `>{end}` (ví dụ `>40`).
   - **Nhóm ngày (Date Grouping)**:
     - Hỗ trợ các cấp: Ngày (Days), Tháng (Months: `Jan`, `Feb`...), Quý (Quarters: `Qtr1`, `Qtr2`, `Qtr3`, `Qtr4`), Năm (Years: `2023`, `2024`...) và kết hợp đa cấp (ví dụ Năm + Quý, Năm + Tháng).
   - **Bỏ nhóm (Ungroup)**:
     - Khôi phục lại các giá trị gốc của trường và hoàn tác phân cấp nhóm.

3. **Trường tính toán (Calculated Fields)**:
   - Hộp thoại Thêm / Sửa / Xóa trường tính toán (`sheet.data.pivotCalculatedField`).
   - Công thức tham chiếu tên trường: ví dụ `=Doanh_thu * 0.1` hoặc `='Đơn giá' * 'Số lượng'`.
   - Cơ chế tính toán khớp Excel 2016: PivotTable tính toán biểu thức trên **tổng (SUM) của các trường thành phần trong ô tổng hợp**, chứ không tính từng dòng rồi mới cộng lại (`SUM(UnitPrice) * SUM(Qty)`).
   - Lưu trữ và mở lại giữ nguyên danh sách và công thức trường tính toán.

4. **Lưu/mở và tương thích tệp XLSX**:
   - Khi lưu sang FODS/XLSX: cấu hình `sourceRange`, `grouping`, `calculatedFields` được lưu trữ để khi mở lại hoặc xuất XLSX, dữ liệu và cấu trúc Pivot được bảo toàn.
   - Vẫn giữ nguyên các nút thao tác trên Ribbon theo quy tắc UI của bộ ứng dụng.

5. **Trợ giúp & Quốc tế hóa (Help & i18n)**:
   - Bài hướng dẫn sử dụng tiếng Việt trong ứng dụng (`platform/help/entries-sheet.js`), không dùng các nhãn thương hiệu cấm.
   - Đầy đủ chuỗi song ngữ VI (`strings-vi.js`) và EN (`strings-en.js`).
   - Kịch bản kiểm thử đối chiếu Excel 2016 thật: `tests/functions/structural-cases-15.json` và bổ sung các toán tử `op` cần thiết trong `scripts/audit-0610/structural_oracle.mjs` và `.ps1`.

---

## 2. Năng lực hiện hữu (Current Capability)
- Hiện VN Sheet có `PivotTableEngine` cơ bản tại `apps/sheet/pivot-table.js`:
  - `readSource`: đọc dữ liệu nguồn từ `sourceRange` trên sheet nguồn.
  - `aggregate`: tổng hợp theo Rows, Columns, Values (SUM, COUNT, AVERAGE, MIN, MAX).
  - `createPivotTable` / `refreshPivotTable` trên `SheetGridController` (`apps/sheet/sheet-grid.js`).
  - Serializer FODS tại `adapters/libreoffice/sheet/sheet-adapter.js` xuất `<table:data-pilot-tables>`.
- **Điểm còn thiếu**:
  - Chưa có lệnh và hộp thoại Đổi nguồn dữ liệu (`changePivotDataSource`).
  - Chưa có tính năng nhóm số, nhóm ngày, bỏ nhóm trên PivotField.
  - Chưa có tính năng định nghĩa trường tính toán (Calculated Fields) và tính toán theo công thức tổng hợp của Excel.
  - Ribbon thiếu các nút hành động phân tích Pivot trong nhóm PivotTable.

---

## 3. Tệp và Mô-đun ảnh hưởng (Files & Modules)
1. `apps/sheet/pivot-table.js`:
   - Mở rộng `PivotTableEngine` hỗ trợ `grouping` (số, ngày, bỏ nhóm).
   - Hỗ trợ `calculatedFields`: phân tích công thức, thay thế tên trường bằng giá trị tổng hợp `SUM`, tính toán biểu thức.
   - Hàm `changeSource(config, newRange, newHeaders)` để lọc lại rows/columns/values.
2. `apps/sheet/sheet-grid.js`:
   - Thêm phương thức `changePivotDataSource(sheetName, newRange, newSourceSheet)`.
   - Thêm phương thức `groupPivotField(sheetName, fieldName, groupConfig)`.
   - Thêm phương thức `ungroupPivotField(sheetName, fieldName)`.
   - Thêm phương thức `addPivotCalculatedField(sheetName, name, formula)`.
   - Thêm phương thức `deletePivotCalculatedField(sheetName, name)`.
   - Thêm các hộp thoại UI tương tác: `showChangePivotDataSourceDialog()`, `showPivotGroupDialog()`, `showPivotCalculatedFieldDialog()`.
3. `platform/commands/command-definitions.js`:
   - Đăng ký các lệnh:
     - `sheet.data.pivotChangeDataSource`
     - `sheet.data.pivotGroup`
     - `sheet.data.pivotUngroup`
     - `sheet.data.pivotCalculatedField`
4. `apps/sheet/sheet-ribbon.js`:
   - Bổ sung các nút lệnh vào nhóm `pivotTable` trên tab Dữ liệu (Data) hoặc tab ngữ cảnh Pivot.
5. `adapters/libreoffice/sheet/sheet-adapter.js`:
   - Bổ sung `bindHandler` cho các lệnh mới.
   - Bảo toàn metadata nhóm và trường tính toán khi serialize và import DataPilot.
6. `platform/i18n/strings-vi.js` & `strings-en.js`:
   - Khai báo nhãn, tooltip, thông báo hộp thoại bằng tiếng Việt và tiếng Anh.
7. `platform/help/entries-sheet.js`:
   - Viết bài hướng dẫn sử dụng tiếng Việt chi tiết cho 3 tính năng mới.
8. `tests/functions/structural-cases-15.json`:
   - Bộ kịch bản đo kiểm đối chiếu Excel COM.
9. `scripts/audit-0610/structural_oracle.mjs` & `.ps1`:
   - Thêm hỗ trợ các ops: `pivotChangeSource`, `pivotGroup`, `pivotUngroup`, `pivotAddCalculatedField`.
10. `tests/unit/help-coverage.test.js`:
    - Cập nhật số đếm lệnh sau khi đăng ký thêm các lệnh mới.
11. `tests/unit/sheet-pivot-table.test.js`:
    - Thêm unit test toàn diện cho các tính năng mới.
12. `docs/AUDIT-PIVOT-1610.md`:
    - Báo cáo kiểm toán và đối chiếu chi tiết.

---

## 4. Phụ thuộc & Rủi ro (Dependencies & Risk)
- **Phụ thuộc**:
  - Không thêm thư viện ngoài (zero external dependency).
  - Tái sử dụng engine toán học hiện có cho việc đánh giá biểu thức công thức trường tính toán (`FormulaEngine` hoặc bộ đánh giá biểu thức an toàn).
- **Rủi ro**:
  - Đụng chạm lưu FODS/XLSX: Cần đảm bảo các tệp kiểm tra hồi quy chuẩn LAN batch không bị lệch (diffs = 0).
  - Tên nhãn nhóm: Phải khớp chính xác định dạng nhãn của Excel 2016 (`<10`, `10-19`, `30-40`, `>40`, `Jan`, `Qtr1`...).

---

## 5. Kế hoạch Kiểm thử (Test Plan)
1. **Kiểm thử đo đạc Excel COM trước**: Đã thực hiện qua các probe script, xác nhận chính xác nhãn nhóm và quy tắc tính của Calculated Field.
2. **Unit tests**:
   - Test thay đổi nguồn dữ liệu: cập nhật số liệu, tự động loại bỏ cột bị xóa.
   - Test nhóm số: các biên `<`, các khoảng `a-b`, biên `>`.
   - Test nhóm ngày: Tháng, Quý, Năm, đa cấp.
   - Test bỏ nhóm: khôi phục nguyên trạng.
   - Test trường tính toán: thêm, sửa, xóa, đánh giá đúng theo công thức tổng.
   - Test hoàn tác / làm lại (Undo / Redo) cho từng thao tác.
   - Test số đếm trợ giúp và tính toàn vẹn i18n không vi phạm thương hiệu cấm.
3. **Bộ test hồi quy**:
   - `npm test` đạt 100% (>= 3518 tests).
   - Chạy `structural_oracle` với `structural-cases-15.json` so sánh khớp với Excel 2016 thật.
   - Chạy kiểm tra các tệp mẫu LAN nếu có sửa đổi phần lưu trữ.

---

## 6. Kế hoạch Hoàn tác (Rollback Plan)
- Mọi thay đổi được thực hiện trên nhánh `feat/sheet-pivot-agy`.
- Có thể dùng `git checkout` hoặc `git revert` nếu phát sinh hồi quy ngoài mong đợi.
