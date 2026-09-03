# Agent Handoff — VN Sheet Multi-Sheet Data Isolation & Tab Switching

**NHIỆM VỤ:** Sửa triệt để lỗi dùng chung `cellsData` Map giữa các tab trong VN Sheet, thiết lập mô hình dữ liệu riêng cho từng sheet và chuyển đổi UI/FormulaEngine thật.  
**AGENT/ROLE:** Antigravity (Pair Programming / Lead Agent)  
**BRANCH:** `fix/multi-sheet-data-isolation`  
**WORKTREE:** `E:\VNOffice-fix-multisheet`  
**DATE:** 2026-09-04  

---

## 1. Nguyên nhân lỗi gốc (Root Cause)

Trước khi sửa:
- `apps/sheet/sheet-grid.js` chỉ khởi tạo duy nhất một `this.cellsData = new Map()`.
- Danh sách 3 sheet (`this.sheets = ["Dự toán chi phí", "Kế hoạch Q3", "Nhân sự"]`) chỉ là mảng tên hiển thị visual.
- Sự kiện click tab chỉ đổi class CSS `.is-active`, hoàn toàn không có logic hoán đổi dữ liệu ô. Kết quả là gõ dữ liệu ở tab này sẽ hiển thị y hệt ở tab kia.
- `FormulaEngine` giữ tham chiếu tĩnh tới `this.cellsData` ban đầu, không thay đổi theo tab.

---

## 2. Giải pháp kỹ thuật đã triển khai

### A. Data Model riêng biệt (`sheetsData`) và Reference Getter (`cellsData`)
1. **`this.sheetsData`**:
   - Đối tượng lưu trữ từ điển các Map: `{ [sheetName]: Map<string, CellData> }`.
   - Mỗi sheet được khởi tạo một `Map` riêng biệt ngay từ constructor hoặc khi thêm mới qua `addSheet(name)`.
2. **`this.cellsData` (Getter & Setter)**:
   - Trở thành accessor trỏ động tới `this.sheetsData[this.activeSheet]`.
   - Mọi phương thức hiện có (`setCellValue`, `setStyle`, `sort`, `filter`, `_renderVirtualRows`) truy cập `this.cellsData` đều tự động thao tác trên đúng sheet đang kích hoạt mà không làm gãy API cũ.
3. **`this.sheetStates`**:
   - Lưu trữ riêng biệt trạng thái hiển thị cho từng sheet: `hiddenRows`, `activeFilters`, `isFilterActive`, `selectedCoord`. Khi chuyển đổi sheet, trạng thái bộ lọc và con trỏ được sao lưu và khôi phục độc lập.

### B. Chuyển đổi Sheet và Đồng bộ Grid (`switchSheet`, `addSheet`)
1. **`switchSheet(sheetName)`**:
   - Lưu trạng thái UI/Filter của sheet cũ vào `this.sheetStates[this.activeSheet]`.
   - Đổi `this.activeSheet = sheetName` và khôi phục trạng thái UI/Filter của sheet mới.
   - Cập nhật nguồn dữ liệu cho `FormulaEngine` thông qua `setCellsData`.
   - Cập nhật class CSS `.is-active` trên các tab item của DOM `this.tabBar`.
   - Gọi `this._renderVirtualRows(startRow, endRow)` để xóa sạch hàng cũ và render lại toàn bộ ô với dữ liệu thật của sheet mới.
   - Gọi `this.selectCell(...)` để cập nhật name box, thanh công thức và ô được chọn.
2. **`addSheet(name)`**:
   - Khởi tạo sheet mới với tên tùy chọn (hoặc `Trang tính N`), tạo Map riêng trong `sheetsData`, thêm thẻ DOM vào thanh tab và chuyển sang sheet mới.
   - Gắn listener click cho nút `+` (`.vno-sheet-add-btn`) trên thanh tab bar.

### C. Đảm bảo FormulaEngine, Undo/Redo và Sort/Filter
1. **`FormulaEngine` (`apps/sheet/formula-engine.js`)**:
   - Hỗ trợ `cellsData` vừa là `Map` vừa là hàm accessor `() => this.cellsData`.
   - Bổ sung `setCellsData(cellsData)` và getter `cellsMap` giải quyết nguồn dữ liệu linh hoạt, tra cứu công thức chuẩn xác theo sheet đang active.
2. **Undo/Redo**:
   - Lưu `sheet: this.activeSheet` trong từng hành động undo/redo (`cell`, `style`, `sort`).
   - Khi hoàn tác, nếu hành động thuộc sheet khác, tự động chuyển về sheet đó trước khi phục hồi dữ liệu.
3. **Sort/Filter/Freeze Panes**:
   - Sort hoạt động trên Map của active sheet.
   - Filter cô lập giữa các sheet (sheet 1 lọc dữ liệu không ẩn hàng của sheet 2).
   - Freeze panes giữ nguyên hiệu ứng CSS sticky mượt mà.

---

## 3. Giới hạn đã biết (Known Limitation)

- **Xuất/Lưu tệp XLSX/ODS**: Hiện tại `SheetAdapter` xuất dữ liệu bảng tính thông qua định dạng trung gian CSV gửi tới LibreOffice Headless engine. Do CSV chỉ đại diện cho một bảng dữ liệu đơn lẻ (single sheet), tệp XLSX xuất ra sẽ chỉ chứa dữ liệu của **sheet đang active**.
- Việc mở rộng I/O đa sheet đầy đủ sang ODS/XLSX native XML thuộc phạm vi nâng cấp tiếp theo của tầng LibreOffice bridge.

---

## 4. Kiểm thử và Xác nhận chất lượng

- **Quy tắc fail-first**: Bộ kiểm thử `tests/unit/sheet-multi-sheet.test.js` được chạy trước trên code cũ và đã **FAIL 4/4 bài kiểm tra** (do thiếu `switchSheet`, `sheetsData` và rò rỉ dữ liệu giữa các sheet).
- **Kết quả sau khi sửa**: Toàn bộ **164/164 test PASS 100%**:
  - `node tests/run-tests.js`: 164/164 test PASS (Command Bus, Adapters, Formula Engine, Autocomplete, i18n, Smoke, Syntax, AI, Sheet I/O, Slides I/O, Multi-Sheet Data Isolation).
  - `python tests/test_real_engine_io.py`: PASS 100% kiểm thử chuyển đổi thật LibreOffice cho Sheet và Slides.
