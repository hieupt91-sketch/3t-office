# HANDOFF: Mặc định trang trắng thật (Default Blank Document)

## Phạm vi thay đổi

VN Office Writer, Sheet, Slides phải khởi động với tài liệu/bảng tính/trang chiếu **trắng thật sự** khi người dùng mở app bình thường (không chọn template), giống Word/Excel/PowerPoint thật. Nội dung mẫu demo vẫn giữ lại như lựa chọn template trong Template Gallery.

## Files đã sửa

### 1. `index.html` (entrypoint)
- Luôn truyền `templateId: "blank"` và `openInitialFile: launchContext.openInitialFile` xuống `switchApp()`.
- **Trước**: `switchApp(initialApp, { singleApp: launchContext.singleAppMode })` — không truyền templateId → Writer/Slides load demo content.
- **Sau**: `switchApp(initialApp, { singleApp: launchContext.singleAppMode, templateId: "blank", openInitialFile: launchContext.openInitialFile })`.

### 2. `apps/sheet/sheet-app.js`
- Truyền `isBlank: options.templateId === "blank"` cho `SheetGridController` constructor.
- Xóa bỏ hack `cellsData.clear()` + DOM textContent clear (dọn rác style/format không sạch).
- Chỉ cập nhật `documentName` + tab label khi blank.

### 3. `apps/sheet/sheet-grid.js`
- Thêm thuộc tính `this.isBlank = options.isBlank === true` trong constructor.
- `_populateInitialData()` chỉ được gọi khi `!this.isBlank` (bỏ gọi vô điều kiện).

### 4. `tests/unit/desktop-launch-context.test.js`
- Cập nhật test kiểm tra `index.html` để khớp nội dung mới (templateId + openInitialFile).

## Files mới

### `tests/unit/blank-default.test.js`
- 14 unit tests xác nhận:
  - index.html truyền `templateId: "blank"` cho cả 3 app.
  - Writer/Slides có logic `isBlank` kiểm tra `templateId === "blank"`.
  - Sheet có `isBlank` option truyền xuống grid, skip `_populateInitialData()`.
  - Sheet không còn hack `cellsData.clear()` + DOM text clear.
  - Nội dung demo vẫn tồn tại trong codebase (dùng khi user chọn template).
  - `openInitialFile` info được truyền xuống switchApp.
  - `resetDocumentChrome` được gọi sau Mở tệp thật cho cả 3 adapter.

### `tests/run-tests.js`
- Đăng ký test suite mới (suite #140).

## Kết quả kiểm thử

| Kiểm thử | Kết quả |
|---|---|
| `node tests/run-tests.js` | **1567/1567 PASS** (tăng từ 1553, không hồi quy) |
| `node scripts/check-syntax.js` | **91/91 files hợp lệ** |

## Xác nhận resetDocumentChrome

Đã xác nhận qua đọc code — cả 3 adapter đều gọi `resetDocumentChrome()` sau khi mở file thật:
- `writer-adapter.js:7277` — `this.shell?.resetDocumentChrome?.(result.fileName || "Tài liệu 1.docx")`
- `sheet-adapter.js:2955` — `this.shell?.resetDocumentChrome?.(result.fileName || "Bảng tính 1.xlsx")`
- `slides-adapter.js:2773` — `this.shell?.resetDocumentChrome?.(result.fileName || "Bản trình chiếu 1.pptx")`

## Cách hoạt động mới

### Kịch bản 1: Mở app bình thường (không có file)
1. `index.html` gọi `switchApp(initialApp, { templateId: "blank" })`.
2. Writer: `isBlank = true` → body = `<p><br></p>`, documentName = "Tài liệu 1.docx".
3. Sheet: `isBlank = true` → grid skip `_populateInitialData()`, documentName = "Bảng tính 1.xlsx".
4. Slides: `isBlank = true` → slides = [{ title: "Tiêu đề trang chiếu", body: "• Nhập nội dung chính tại đây" }], documentName = "Bản trình chiếu 1.pptx".

### Kịch bản 2: Mở file thật qua initial_file
1. `index.html` gọi `switchApp()` với `templateId: "blank"` + `openInitialFile: true`.
2. App khởi tạo ở trạng thái trắng (không seed demo).
3. Sau đó `common.file.open` chạy → adapter đọc file thật, thay thế nội dung.
4. `resetDocumentChrome()` cập nhật tên tab.

### Kịch bản 3: Người dùng chọn template từ Template Gallery
1. Template Gallery vẫn hoạt động bình thường.
2. Khi chọn template, `applyTemplate(templateId)` được gọi với ID cụ thể (vd: `admin_doc`, `budget_estimate`, `presentation_outline`).
3. Nội dung demo được load theo template đã chọn.

## Bằng chứng cần bổ sung (manual verification)

Cần chạy `python main.py` thật và chụp màn hình cho 2 kịch bản:
1. **Mở app không file**: Xác nhận trang/sheet/slide trắng thật.
2. **Mở file thật qua `python main.py <file.xlsx>`**: Xác nhận nội dung file thật hiển thị đúng, không còn dấu vết demo.

Lưu ý: Bằng chứng ảnh chụp cần được bổ sung bởi người chạy test thủ công trên máy có LibreOffice thật.

---

## Bổ sung: Fix `parseFods` Used-Range (Tránh phình to bộ nhớ & treo app với file FODS lớn)

### 1. Hiện tượng & Nguyên nhân
- Khi mở file XLSX thực tế lớn (như bảng báo giá đại lý nhiều sheet, hàng nghìn dòng có định dạng ô trống kéo dài đến tận giới hạn sheet), LibreOffice xuất FODS nén phần đuôi trống-có-định-dạng thành:
  - `<table:table-row table:number-rows-repeated="1048570">`
  - `table:number-columns-repeated="16380"`
- Các ô này vẫn mang thuộc tính `office:value-type` (vd: `string` hoặc `float`) dù không có giá trị thật.
- Code cũ coi bất kỳ ô nào có `office:value-type` là "có dữ liệu" và mở rộng vật chất hóa toàn bộ (unroll repeated rows/cols) → sinh ra hàng triệu `Map.set()` vào bộ nhớ → gây treo ứng dụng khi mở hoặc gây lỗi `RangeError: Invalid string length` khi gọi serialize/lưu.

### 2. Giải pháp đã thực hiện (`adapters/libreoffice/sheet/sheet-adapter.js`)
Áp dụng đồng bộ cho **CẢ HAI** nhánh parser (nhánh DOM `parseFods` và nhánh Regex/Streaming `parseFodsRegex`):
1. **Định nghĩa tiêu chí nội dung thật**:
   - Thêm `_fodsCellHasRealContent(cell)` (nhánh DOM) và `_fodsCellMarkupHasRealContent(attrs, markup)` (nhánh regex).
   - Chỉ tính là nội dung thật khi có ít nhất một trong các yếu tố:
     - Giá trị thật: `office:value`, `office:string-value`, `office:date-value`, `office:time-value`, `office:boolean-value`.
     - Công thức tính toán (`table:formula`).
     - Text content thật (`text:p`, text node không rỗng).
     - Chú thích (`office:annotation`).
     - Ràng buộc dữ liệu (`table:content-validation-name`).
     - Ảnh hoặc hình vẽ nhúng (`draw:frame`).
     - Ô gộp (`table:number-columns-spanned` > 1 hoặc `table:number-rows-spanned` > 1).
   - **Tuyệt đối không tính riêng thuộc tính `office:value-type`** là ô có dữ liệu nếu ô không có bất kỳ nội dung thực tế nào ở trên.
2. **Pre-scan xác định Used-Range (`lastDataRow`, `lastDataCol`)**:
   - Duyệt trước bảng tính để tìm dòng cuối và cột cuối thực sự chứa dữ liệu.
   - Các khối hàng lặp nằm hoàn toàn sau `lastDataRow` được bỏ qua hoàn toàn.
   - Các ô có kiểu/định dạng nhưng không có nội dung thật chỉ được vật chất hóa trong phạm vi `lastDataCol` (giữ nguyên viền/màu của ô trống nằm TRONG bảng dữ liệu, loại bỏ toàn bộ phần đuôi mở rộng ra vô cực).
3. **Vật chất hóa cột (`<table:table-column>`) trong phạm vi used-range**:
   - FODS thật nén phần đuôi cột trống thành `table:number-columns-repeated="16376"` (tổng 16384 cột).
   - Code cũ `for (index < repeat)` đẩy `colWidths.set()`, `hiddenCols.add()`, `columnStyles.push()` cho TỪNG cột → 16384 entry/sheet → `serializeToFods()` ghi 16384 `<table:table-column>` → `RangeError: Invalid string length`.
   - **Sửa**: Pre-scan hàng để tính `lastDataCol` TRƯỚC khi duyệt `<table:table-column>`. Giới hạn vật chất hóa `colWidths` / `hiddenCols` / `columnStyles` tới `max(lastDataCol, 26)` (26 = độ rộng lưới mặc định A-Z). Phần đuôi lặp ngoài used-range không tạo entry từng cột.
   - Tương tự, hàng: `rowHeights.set()` chỉ gọi khi `rowNumber <= lastDataRow`, tránh entry ở row 1048576 từ block `number-rows-repeated` khổng lồ.
   - `serializeToFods()`:afety cap `maxCol ≤ 4096`, `maxRow ≤ 1048576`防止 serialize blowup từ dữ liệu upstream bị nhiễm.

### 3. Tests đã bổ sung & cập nhật
- `tests/unit/sheet-fods-repeat-expand.test.js` (6/6 PASS, trước fix là 4/6):
  - Kiểm tra hiệu năng mở rộng hàng lặp lớn hoàn tất nhanh mà không treo (< 5s).
  - Xác nhận không tạo ra quá 10.000 Map entries cho vùng trống có định dạng.
  - Bảo toàn dữ liệu thật ở các dòng đầu tiên.
  - Bảo toàn dữ liệu thật nằm sâu bên trong khối lặp.
  - `serializeToFods` trên sheet lớn không văng `RangeError: Invalid string length`.
  - Ô lặp không mang `office:value-type` luôn xử lý nhẹ nhàng.
- `tests/unit/sheet-load-fods-blank.test.js`:
  - Kiểm tra tích hợp tầng dữ liệu khi nạp FODS vào instance SheetGridController đã mount ở chế độ `isBlank`.
  - Xác nhận nạp đúng toàn bộ cellsData thật, chuyển sheet đúng và không còn tàn dư dữ liệu mặc định.
- Đăng ký trong `tests/run-tests.js` (suite #141 và #142) → Tổng bộ test đạt **1581/1581 PASS**.

### 4. Xác minh trên ứng dụng thực tế
- Claude đã xác minh với file thật: `file test/DSS_Báo giá Dahua HN-T11.2023.xlsx` (khi chuyển đổi sang FODS dung lượng 38MB, gồm 15 sheet):
  - Ứng dụng mở mượt mà, không còn hiện tượng treo/lag hay cạn kiệt bộ nhớ.
  - Hiển thị đầy đủ và chính xác 15 tab sheet.
  - Sheet "Camera IP" hiển thị đúng banner hình ảnh và tiêu đề "BẢNG BÁO GIÁ ĐẠI LÝ DAHUA CHÍNH HÃNG".

---

## PHẦN B: Khắc phục lệch Fidelity mở mặc định sai Sheet so với Excel (`activeTab` → `ActiveTable`)

### 1. Hiện tượng & Nguyên nhân
- **Bằng chứng file thực tế**: Trong file `DSS_Báo giá Dahua HN-T11.2023.xlsx`:
  - `xl/workbook.xml` gốc khai báo: `<bookViews><workbookView activeTab="1"/></bookViews>`
  - Danh sách sheet: sheet 0 là `"foxz"` (trống, mang thuộc tính `state="veryHidden"`), sheet 1 là `"Thông báo Sản phẩm mới"`.
  - Microsoft Excel khi mở file sẽ kích hoạt trực tiếp sheet thứ 2 ("Thông báo Sản phẩm mới").
- **Vấn đề của LibreOffice**:
  - Khi chạy headless `soffice --convert-to fods`, LibreOffice làm rơi toàn bộ thiết lập `config:name="ActiveTable"` trong `office:settings`.
  - Hệ quả trong VN Office Sheet: `parseFods()` trong `SheetAdapter` đọc `ActiveTable` trả về rỗng, dẫn đến việc ứng dụng tự rơi về sheet đầu tiên (`workbook.sheets[0] = "foxz"`). Người dùng mở file thấy một trang tính trắng trơn dù file đầy dữ liệu, khác biệt hoàn toàn với Excel.

### 2. Giải pháp thực hiện theo pattern Native Overlay
Bổ sung cơ chế bù đắp thuộc tính thiếu hụt từ file XLSX gốc vào FODS trước khi `SheetAdapter.parseFods()` đọc:
- **Cập nhật đồng bộ cả hai module twin**:
  - Python: `adapters/libreoffice/common/ooxml_zip_patch.py` (sử dụng trong `main.py` khi mở file desktop và CLI `--overlay-fods`).
  - Node.js: `adapters/libreoffice/sheet/xlsx-native-postprocess.js` (sử dụng trong bộ test và runtime JS).
- **Các bước thực hiện**:
  1. Đọc `activeTab` từ `<bookViews><workbookView activeTab="N"/>` trong `xl/workbook.xml` gốc (mặc định là `0` nếu thẻ `workbookView` có tồn tại nhưng thiếu thuộc tính `activeTab`). Nếu `workbookView` hoàn toàn không có trong file, trả về `None` để không can thiệp không cần thiết.
  2. Ánh xạ chỉ số N sang tên sheet tương ứng theo thứ tự khai báo `<sheets><sheet name="..."/>` (chỉ số N tính theo toàn bộ các sheet, bao gồm cả sheet ẩn và veryHidden theo đúng đặc tả OOXML). Giải mã các thực thể XML (unescape) trong tên sheet.
  3. Nếu FODS chưa có `ActiveTable`:
     - Escape XML tên sheet và tạo thẻ: `<config:config-item config:name="ActiveTable" config:type="string">TÊN_SHEET</config:config-item>`.
     - Đảm bảo namespace `xmlns:config="urn:oasis:names:tc:opendocument:xmlns:config:1.0"` được khai báo trên thẻ gốc `<office:document>`.
     - Nếu FODS đã có `<config:config-item-set config:name="ooo:view-settings">`, chèn thẻ `ActiveTable` vào `config:config-item-map-entry` hoặc bọc trong `config:config-item-map-indexed config:name="Views"`.
     - Nếu FODS thiếu cấu trúc view settings, tự động tạo khối `<office:settings>` hoàn chỉnh trước `<office:body>` theo đúng định dạng `serializeToFods()`.
     - Nếu FODS **ĐÃ CÓ** `ActiveTable` từ trước: giữ nguyên tuyệt đối, không ghi đè.
  4. Phía JavaScript: `SheetAdapter.loadFromFods(fodsText, ooxmlWorkbookXml)` trong `sheet-adapter.js` gọi `overlayActiveSheetToFods(xml, ooxmlWorkbookXml)` ngay sau `overlayFodsStructureProtection` (browser-safe qua `xlsx-active-sheet.js`, re-export qua `xlsx-native-postprocess.js`) làm belt-and-suspenders cho đường test stub và payload mở file, no-op khi thiếu `ooxmlWorkbookXml` hoặc khi FODS đã có `ActiveTable`.

### 3. Kiểm thử & Xác minh độ chính xác
- **Unit tests Python mới**: `tests/test_sheet_active_tab_overlay.py` (18/18 tests PASS):
  - Kiểm tra đọc đúng `activeTab="1"`, fallback về `0` khi thiếu, xử lý `None` và chuỗi rỗng an toàn.
  - Ánh xạ chính xác chỉ số `1` sang sheet thứ hai ("Thông báo Sản phẩm mới").
  - Xử lý sheet name chứa tiếng Việt và ký tự đặc biệt XML (`&`, `<`, `>`, `"`).
  - Kiểm tra `apply_active_sheet_to_fods` trên FODS không có settings, FODS có sẵn LibreOffice view settings, và FODS đã có sẵn ActiveTable (idempotency).
  - Tích hợp `overlay_sheet_xlsx_fods`: đảm bảo trả về đúng sheet tương ứng sau overlay.
  - **Xác minh không mock trên file thật**: Chuyển đổi thật `file test/DSS_Báo giá Dahua HN-T11.2023.xlsx` qua LibreOffice headless + chạy `_apply_native_import_overlay()` → trích xuất chính xác `ActiveTable` = `"Thông báo Sản phẩm mới"`.
- **Đảm bảo không hồi quy**:
  - `python -m unittest discover -s tests -p "test_*.py"`: **175/175 PASS** (tăng từ 157).
  - `node scripts/check-syntax.js`: **92/92 files hợp lệ** (bổ sung `xlsx-active-sheet.js`).
  - `node tests/run-tests.js`: **1586/1586 PASS** (suite 109 kiểm thử đầy đủ loadFromFods activeTab, fallback, idempotent và Python-twin parity).
  - Bộ test đối chiếu song song Python twin vs JS (`tests/unit/sheet-xlsx-native-open-overlay.test.js`) đạt chuẩn tuyệt đối (`jsFods === pyFods`).


