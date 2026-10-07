# KẾ HOẠCH TRIỂN KHAI: COLOR SCALES, DATA BARS, ICON SETS CHO VN SHEET
## Plan Gate (AGENTS.md mục 6) — Ticket SB8

---

## 1. Mục tiêu (Objective)

Trang bị năng lực trực quan hóa dữ liệu theo điều kiện (Conditional Formatting Visuals) cho VN Sheet, mang lại trải nghiệm tương đương Microsoft Excel và LibreOffice Calc cho người dùng văn phòng Việt Nam:
1. **Color Scales (Thang màu)**:
   - Thang 2 màu (2-Color Scale): Chuyển tiếp màu nền mượt mà từ giá trị Min đến Max (ví dụ: Trắng → Xanh lam, Vàng → Đỏ).
   - Thang 3 màu (3-Color Scale): Phân bổ 3 cực màu Min → Midpoint (50th Percentile) → Max (ví dụ: Xanh lá → Vàng → Đỏ; Đỏ → Vàng → Xanh lá).
2. **Data Bars (Thanh dữ liệu)**:
   - Vẽ thanh tiến trình ngang bên trong ô phản ánh độ lớn tương đối của giá trị số so với dải giá trị trong vùng chọn.
   - Hỗ trợ màu đơn sắc (Solid) hoặc chuyển sắc (Gradient); tùy chọn hiển thị kèm số hoặc chỉ hiện thanh (`showValue`); hỗ trợ hiển thị giá trị âm với trục đối xứng.
3. **Icon Sets (Bộ biểu tượng)**:
   - Hiển thị biểu tượng trực quan trước giá trị ô dựa theo phân vị hoặc ngưỡng giá trị.
   - Hỗ trợ các bộ biểu tượng văn phòng quen thuộc: 3 Mũi tên (3Arrows: xanh hướng lên, vàng sang phải, đỏ hướng xuống), 3 Đèn giao thông (3TrafficLights1), 3 Cờ (3Flags), 4 Mũi tên (4Arrows), 5 Xếp hạng (5Stars/5Rating).
4. **Bảo toàn trung thực dữ liệu (Round-trip Fidelity)**:
   - Đọc và ghi chuẩn xác qua LibreOffice FODS (`calcext:color-scale`, `calcext:data-bar`, `calcext:icon-set`) và OOXML (`<colorScale>`, `<dataBar>`, `<iconSet>`).
   - Tuyệt đối không làm hỏng cấu trúc 28 tệp XLSX kiểm chuẩn hiện có, bảo đảm `28/28 saved=yes diffs=0`.
5. **Hiệu năng và trải nghiệm người dùng**:
   - Render mượt trên hạ tầng virtual scrolling của VN Sheet, không gây giật lag khi cuộn trang tính lớn.
   - Hỗ trợ đầy đủ Deep Undo/Redo, tách biệt theo từng Sheet, giao diện trực quan và tài liệu Trợ giúp tiếng Việt trong ứng dụng.

---

## 2. Hiện trạng (Current Capability / Status)

### 2.1. Đọc và áp dụng Conditional Formatting hiện có trong `apps/sheet`
- **Lưu trữ dữ liệu (`apps/sheet/sheet-grid.js`)**:
  - Dữ liệu quy tắc lưu theo từng trang tính: `this.conditionalFormattingBySheet = { [sheetName]: [] }`.
  - Cấu trúc đối tượng quy tắc hiện tại: `{ id, range, type, value, color }`.
  - Các loại quy tắc hiện được hỗ trợ chỉ có 4 loại so sánh cơ bản: `"greaterThan"`, `"lessThan"`, `"blank"`, và một phần xét trùng `"duplicate"`.
- **Render hiển thị (`_applyRuleVisuals` và `_matchingConditionalRule`)**:
  - Hàm `_matchingConditionalRule(col, row)` duyệt qua mảng quy tắc để kiểm tra ô có nằm trong `rule.range` và thỏa mãn điều kiện không.
  - Khi khớp, chỉ gán màu nền tĩnh: `dom.style.backgroundColor = conditionalRule?.color || item?.style?.backgroundColor || ""`.
  - **Khoảng trống**:
    + Hoàn toàn chưa có cơ chế tính toán giá trị cực trị (Min, Max, Percentile) trên toàn dải `rule.range`.
    + Chưa có hàm nội suy màu sắc RGB cho Thang màu (Color Scale).
    + Chưa có layer thanh ngang cho Data Bar trong ô.
    + Chưa có rendering biểu tượng SVG cho Icon Set.
- **Giao diện người dùng (`showConditionalFormattingDialog`)**:
  - Hộp thoại hiện tại rất sơ khai: chỉ có 1 thẻ chọn 3 quy tắc (Lớn hơn, Nhỏ hơn, Ô trống), 1 ô nhập giá trị số và 1 ô chọn màu nền đơn sắc. Chưa có menu hay presets trực quan cho Color Scales, Data Bars, Icon Sets.

### 2.2. Import / Export XLSX qua LibreOffice FODS / OOXML
- **Khi lưu FODS (`adapters/libreoffice/sheet/sheet-adapter.js:serializeToFods`)**:
  - Bộ tuần tự hóa hiện tại đang lọc cứng: `["greaterThan", "lessThan", "blank", "duplicate"].includes(rule.type)`.
  - Chỉ ghi các thẻ `<calcext:conditional-format>` chứa `<calcext:condition calcext:apply-style-name="..." calcext:value="...">`.
  - Chưa hỗ trợ sinh các thẻ mở rộng: `<calcext:color-scale>`, `<calcext:data-bar>`, `<calcext:icon-set>`.
- **Khi đọc FODS (`adapters/libreoffice/sheet/sheet-adapter.js:_attachImportedRules`)**:
  - Bộ phân tích chỉ dùng biểu thức chính quy quét bên trong thẻ `calcext:conditional-format` để tìm `<calcext:condition\b...>`:
    `body.replace(/<calcext:condition\b([^>]*)\/?\s*>/gi, ...)`
  - Khi LibreOffice chuyển đổi từ XLSX chứa `<colorScale>`, `<dataBar>`, hoặc `<iconSet>` sang FODS, các thẻ tương ứng là `<calcext:color-scale>`, `<calcext:data-bar>`, `<calcext:icon-set>` bị hàm này bỏ qua hoàn toàn, dẫn đến việc mất các quy tắc trực quan này khi mở tệp.
- **Khả năng chuyển đổi tự nhiên của LibreOffice Core (Thực nghiệm độc lập qua CLI)**:
  - Đã thực hiện kiểm chứng thực tế bằng lệnh `soffice --headless --convert-to fods` và `--convert-to xlsx`:
    * LibreOffice Calc hỗ trợ **hai chiều 100% nguyên vẹn** giữa OOXML và FODS:
      1. `<colorScale>` ↔ `<calcext:color-scale>` (chứa các `<calcext:color-scale-entry calcext:type="..." calcext:value="..." calcext:color="..."/>`).
      2. `<dataBar>` ↔ `<calcext:data-bar>` (chứa các thuộc tính min-length, max-length, negative-color, positive-color và `<calcext:formatting-entry>`).
      3. `<iconSet>` ↔ `<calcext:icon-set>` (chứa `calcext:icon-set-type` và các `<calcext:formatting-entry>`).
    * Khi xuất ngược từ FODS sang XLSX bằng soffice, các thẻ OOXML `<conditionalFormatting>` được tái tạo đầy đủ, đúng tiêu chuẩn ECMA-376 / OpenXML.
  - **Kết luận kiến trúc**: Không cần vá mã nguồn LibreOffice Core hay viết bộ nén ZIP riêng cho CF; chỉ cần mở rộng bộ đọc (`_attachImportedRules`) và bộ ghi (`serializeToFods`) trong `sheet-adapter.js` để hiểu các thẻ `calcext` chuẩn của LibreOffice.

### 2.3. Khảo sát tệp XLSX thật trong corpus (`file test/lan`)
Đã thực hiện chạy script tự động quét cấu trúc XML của toàn bộ 28 tệp kiểm chuẩn (`lan01.xlsx` – `lan28.xlsx`) và mở rộng tới toàn bộ 57 tệp XLSX trong kho thử nghiệm:

#### Bảng thống kê Conditional Formatting trên 28 tệp kiểm chuẩn:

| Tệp | Khối `<conditionalFormatting>` | Tổng quy tắc `<cfRule>` | `colorScale` | `dataBar` | `iconSet` | Các quy tắc hiện có |
| :--- | :---: | :---: | :---: | :---: | :---: | :--- |
| `lan01.xlsx` | 0 | 0 | 0 | 0 | 0 | Không có CF |
| `lan02.xlsx` | 0 | 0 | 0 | 0 | 0 | Không có CF |
| `lan03.xlsx` | 194 | 232 | 0 | 0 | 0 | `duplicateValues` (232) |
| `lan04.xlsx` | 0 | 0 | 0 | 0 | 0 | Không có CF |
| `lan05.xlsx` | 0 | 0 | 0 | 0 | 0 | Không có CF |
| `lan06.xlsx` | 0 | 0 | 0 | 0 | 0 | Không có CF |
| `lan07.xlsx` | 0 | 0 | 0 | 0 | 0 | Không có CF |
| `lan08.xlsx` | 2 | 2 | 0 | 0 | 0 | `duplicateValues` (2) |
| `lan09.xlsx` | 0 | 0 | 0 | 0 | 0 | Không có CF |
| `lan10.xlsx` | 0 | 0 | 0 | 0 | 0 | Không có CF |
| `lan11.xlsx` | 22 | 22 | 0 | 0 | 0 | `cellIs` (22) |
| `lan12.xlsx` | 0 | 0 | 0 | 0 | 0 | Không có CF |
| `lan13.xlsx` | 0 | 0 | 0 | 0 | 0 | Không có CF |
| `lan14.xlsx` | 509 | 514 | 0 | 0 | 0 | `cellIs` (1), `duplicateValues` (513) |
| `lan15.xlsx` | 0 | 0 | 0 | 0 | 0 | Không có CF |
| `lan16.xlsx` | 240 | 665 | 0 | 0 | 0 | `duplicateValues` (665) |
| `lan17.xlsx` – `lan28.xlsx` (12 tệp) | 0 | 0 | 0 | 0 | 0 | Không có CF |
| **TỔNG CỘNG (28 tệp)** | **967** | **1435** | **0** | **0** | **0** | `duplicateValues` (1412), `cellIs` (23) |

#### Kết quả khảo sát mở rộng:
- Toàn bộ 57 tệp XLSX trong `file test/lan/` và 9 tệp trong `tests/fixtures/`: **100% không chứa** thẻ `<colorScale>`, `<dataBar>`, hoặc `<iconSet>`.
- **Nhận định quan trọng**:
  1. Corpus tệp thực tế hiện tại tập trung chủ yếu vào phát hiện trùng lặp (`duplicateValues`) và điều kiện ngưỡng số đơn giản (`cellIs`).
  2. Vì không có tệp nào trong 28 tệp kiểm chuẩn sử dụng 3 thẻ này, việc mở rộng khả năng xử lý `colorScale`, `dataBar`, `iconSet` hoàn toàn **không có nguy cơ gây hồi quy** (regression) cho bài kiểm tra 28 tệp hiện tại.
  3. Để kiểm thử tính năng này, cần tạo bộ dữ liệu mẫu chuẩn (fixture) chuyên biệt `tests/fixtures/sheet-cf-visuals.xlsx` bao phủ đầy đủ các trường hợp trực quan.

---

## 3. Các tệp và mô-đun sẽ sửa (Files / Modules to modify)

| Tệp / Mô-đun | Trách nhiệm chính khi triển khai |
| :--- | :--- |
| `apps/sheet/sheet-grid.js` | 1. Mở rộng data model của `conditionalFormattingBySheet`: cấu trúc rule hỗ trợ `type: "colorScale" \| "dataBar" \| "iconSet"`.<br>2. Thêm module tính toán dải giá trị có bộ nhớ đệm `_getRangeStatsCache(range)`: tính min, max, percentile cho dải ô.<br>3. Mở rộng hàm vẽ ô `_applyRuleVisuals(dom, col, row)`: tô nền chuyển tiếp (Color Scale), chèn thanh Data Bar và chèn biểu tượng SVG Icon Set.<br>4. Nâng cấp hộp thoại `showConditionalFormattingDialog()` hỗ trợ chọn Thang màu, Thanh dữ liệu, Bộ biểu tượng.<br>5. Đăng ký Deep Undo/Redo cho các thao tác thêm/sửa/xóa quy tắc mới. |
| `apps/sheet/sheet.css` | Định nghĩa CSS cho các thành phần trực quan trong ô:<br>- `.vno-cf-databar`: thanh tiến trình mini tuyệt đối (absolute), màu sắc linh hoạt, hỗ trợ đảo hướng cho số âm.<br>- `.vno-cf-icon`: kích thước cố định (14x14px), căn chỉnh thẳng hàng với văn bản ô.<br>- Giao diện danh sách chọn preset và bảng cấu hình trong hộp thoại. |
| `adapters/libreoffice/sheet/sheet-adapter.js` | 1. Mở rộng `_attachImportedRules`: đọc các thẻ ODF mở rộng `<calcext:color-scale>`, `<calcext:data-bar>`, `<calcext:icon-set>` và các phần tử con thành object rule.<br>2. Mở rộng `serializeToFods`: xuất các rule này thành XML chuẩn ODF/calcext tương thích với LibreOffice. |
| `platform/ui-kit/icons.js` | Bổ sung tập icon SVG chất lượng cao cho Icon Sets: 3 Mũi tên (lên xanh, ngang vàng, xuống đỏ), 3 Đèn tín hiệu, 3 Cờ, 4 Mũi tên, 5 Ngôi sao xếp hạng. |
| `platform/i18n/strings-vi.js`<br>`platform/i18n/strings-en.js` | Bổ sung toàn bộ từ khóa và nhãn giao diện song ngữ cho Thang màu, Thanh dữ liệu, Bộ biểu tượng và các tùy chọn cấu hình liên quan. |
| `platform/help/entries-sheet.js` | Cập nhật mục Hướng dẫn sử dụng tiếng Việt chi tiết cho tính năng Định dạng có điều kiện (tuân thủ mục 10 AGENTS.md). |
| `tests/unit/sheet-cf-visuals.test.js` *(Tạo mới)* | Bộ unit test kiểm tra toàn diện: cấu trúc rule, thuật toán nội suy màu sắc, tính toán tỷ lệ độ dài thanh, phân ngưỡng biểu tượng, Deep Undo/Redo, và ODF FODS roundtrip. |
| `tests/fixtures/sheet-cf-visuals.xlsx` *(Tạo mới)* | Tệp fixture kiểm chuẩn chứa 2-color scale, 3-color scale, data bars (dương & âm), và icon sets để phục vụ tự động hóa kiểm thử. |

---

## 4. Phụ thuộc (Dependencies)

- **Nguyên tắc Re-use**:
  - Không thêm bất kỳ thư viện npm bên ngoài hay module Python nào.
  - Tái sử dụng `SheetGridController`, virtual row rendering, và `_recordHistory`.
  - Tái sử dụng hạ tầng chuyển đổi LibreOffice headless (`soffice`) có sẵn trong repo (`tools/libreoffice`).
- **Tuân thủ ranh giới kiến trúc (AGENTS.md mục 4 & 5)**:
  - Giao diện VN Sheet chỉ tương tác qua `SheetAdapter`, không gọi trực tiếp UNO/LibreOffice implementation.
  - Không chỉnh sửa LibreOffice Core C++. Toàn bộ tính năng được giải quyết ở tầng App Sheet + Adapter FODS.

---

## 5. Rủi ro và Biện pháp giảm thiểu (Risks & Mitigations)

### 5.1. Rủi ro bảo toàn nguyên vẹn khi lưu XLSX (Roundtrip Fidelity)
- **Rủi ro**: Việc lưu tệp XLSX có thể làm rớt các thuộc tính chi tiết của quy tắc hoặc làm thay đổi cấu trúc XML của tệp gốc.
- **Biện pháp giảm thiểu**:
  - Đối với các tệp mở ra nhưng **không chỉnh sửa** Conditional Formatting, VN Office duy trì cơ chế `<!-- vno-pristine-xlsx-source -->` giúp khôi phục nguyên trạng tệp OOXML ban đầu, đảm bảo tuyệt đối không phát sinh sai khác (`0 diff`).
  - Đối với các tệp có chỉnh sửa hoặc tạo mới, LibreOffice Calc đã được kiểm chứng hỗ trợ chuyển đổi 2 chiều chính xác giữa `<calcext:color-scale>`, `<calcext:data-bar>`, `<calcext:icon-set>` và `<conditionalFormatting>` của OOXML.
  - Viết bài kiểm tra roundtrip tự động `FODS → XLSX → FODS` bằng soffice để bảo đảm các thuộc tính được giữ nguyên vẹn qua các chu kỳ mở và lưu.

### 5.2. Rủi ro hiệu năng trên các bảng tính lớn (Đặc biệt là `lan14.xlsx`)
- **Rủi ro**:
  - `lan14.xlsx` có tới 509 khối CF và 514 quy tắc.
  - Nếu mỗi lần render một ô trong viewport (hàng trăm ô) mà phải duyệt qua hàng trăm quy tắc, đồng thời mỗi quy tắc Color Scale / Data Bar lại duyệt hàng nghìn ô để tìm Min, Max, Midpoint thì tốc độ vẽ sẽ giảm sút nghiêm trọng, gây đứng hình (freeze) khi cuộn chuột.
- **Biện pháp giảm thiểu**:
  1. **Bounding Box Spatial Indexing**: Mỗi quy tắc CF lưu giới hạn hình chữ nhật `(minR, maxR, minC, maxC)`. Khi vẽ ô `(c, r)`, kiểm tra nhanh điều kiện biên trước khi xét quy tắc.
  2. **Range Summary Cache (Bộ đệm giá trị cực trị theo dải)**:
     - Giá trị Min, Max, 50th-Percentile của một dải ô chỉ được tính toán **một lần duy nhất** và lưu vào cache map `this._cfRangeStatsCache`.
     - Bộ đệm này chỉ bị vô hiệu hóa (invalidation) khi có hành động chỉnh sửa ô (`setCellValue`, chèn/xóa hàng cột) trong dải ô đó, tuyệt đối không tính toán lại trong vòng lặp vẽ ô (`_applyRuleVisuals`).
  3. **Tối ưu DOM Rendering**:
     - Data Bar được vẽ bằng CSS `linear-gradient` hoặc một element pseudo/mỏng nhẹ nằm dưới text cell, tránh tạo cây DOM sâu.
     - Icon Set dùng các biểu tượng SVG nội tuyến với kích thước chuẩn, tái sử dụng thẻ `<svg>` được cache sẵn.
  4. **Kỷ luật kiểm thử**: Tuân thủ hướng dẫn bộ nhớ: không chạy `lan14.xlsx` trong vòng lặp test thường xuyên; chỉ kiểm thử các kịch bản virtual scrolling trên tệp fixture chuẩn.

### 5.3. Xung đột kiểu dáng và thứ tự ưu tiên hiển thị (Cascading Order)
- **Rủi ro**: Một ô có thể đồng thời có màu nền người dùng chọn thủ công, màu của kiểu bảng (Format as Table), quy tắc CF đơn sắc cũ, và quy tắc Thang màu mới.
- **Biện pháp giảm thiểu**:
  - Áp dụng thứ tự ưu tiên chặt chẽ:
    1. *Ưu tiên 1 (Cao nhất)*: Quy tắc CF so sánh đơn sắc (`greaterThan`, `lessThan`, `blank`, `duplicate`).
    2. *Ưu tiên 2*: Quy tắc CF trực quan (`colorScale`, `dataBar`, `iconSet`).
    3. *Ưu tiên 3*: Kiểu ô thủ công (`cell.style.backgroundColor`).
    4. *Ưu tiên 4 (Thấp nhất)*: Định dạng bảng xen kẽ (Table style).
  - Data Bar và Icon Set được thiết kế hiển thị đồng thời cùng với màu nền mà không triệt tiêu giá trị văn bản của ô.

---

## 6. Kế hoạch kiểm thử (Test Plan)

### 6.1. Kiểm thử đơn vị (Unit Tests — `node tests/run-tests.js`)
Tạo mới file `tests/unit/sheet-cf-visuals.test.js` kiểm tra các nội dung:
1. **Model & CRUD**:
   - Thêm quy tắc `colorScale` (2 màu và 3 màu) vào `conditionalFormattingBySheet`.
   - Thêm quy tắc `dataBar` (màu dương, màu âm, minLength/maxLength).
   - Thêm quy tắc `iconSet` (3Arrows, 3TrafficLights1, 3Flags, 4Arrows, 5Rating).
   - Xóa quy tắc và kiểm tra tính cô lập giữa các Sheet khác nhau.
2. **Deep Undo / Redo**:
   - Thực hiện Thêm quy tắc → Undo (quy tắc biến mất, visual hoàn nguyên) → Redo (quy tắc phục hồi).
   - Xóa quy tắc → Undo → Redo.
3. **Thuật toán trực quan**:
   - Kiểm tra hàm nội suy màu sắc RGB cho thang 2 màu và 3 màu theo tỷ lệ phần trăm (0%, 50%, 100%).
   - Kiểm tra hàm tính độ rộng thanh Data Bar với dải số dương và dải số có chứa giá trị âm.
   - Kiểm tra gán đúng icon theo phân vị (ví dụ 3Arrows: <33% mũi tên xuống, 33-67% mũi tên ngang, >67% mũi tên lên).
4. **FODS Serialization & Parsing**:
   - `serializeToFods()` sinh đúng cấu trúc `<calcext:color-scale>`, `<calcext:data-bar>`, `<calcext:icon-set>`.
   - `parseFods()` đọc đúng các thẻ FODS thành các object rule hoàn chỉnh.
   - Kiểm thử roundtrip nội bộ: Model → `serializeToFods` → `parseFods` → Model không suy hao thuộc tính.

### 6.2. Kiểm thử thực tế trên Desktop (CDP Live Test)
- Sử dụng công cụ kiểm thử qua WebView2 CDP:
  1. Khởi động ứng dụng VN Sheet trên Desktop độc lập (`main.py`).
  2. Mở tệp fixture mẫu `tests/fixtures/sheet-cf-visuals.xlsx`.
  3. Kiểm tra DOM thực tế trong WebView2:
     - Các ô trong dải Color Scale nhận đúng `backgroundColor` biến thiên theo gradient.
     - Các ô Data Bar có chứa element `.vno-cf-databar` với độ rộng tỷ lệ chuẩn xác.
     - Các ô Icon Set có chứa thẻ SVG `.vno-cf-icon`.
  4. Mở hộp thoại Conditional Formatting bằng phím tắt/click, áp dụng quy tắc mới và xác thực phản hồi giao diện.

### 6.3. Kiểm thử hồi quy toàn diện 28 tệp XLSX thật
- Chạy công cụ kiểm định hồi quy hàng loạt:
  `python scripts/layout-audit/batch_document_audit.py xlsx <worktree>`
- **Tiêu chuẩn nghiệm thu bắt buộc**:
  * Tất cả 28 tệp kiểm chuẩn (`lan01` – `lan28`) đạt: **28/28 saved=yes diffs=0**.
  * Cả hai bộ kiểm tra tĩnh `_xlsx_lint.py` và `_xlsx_parts_lint.py` đều đạt kết quả `clean`.
  * Không phát sinh bất kỳ lỗi console hay treo tiến trình.

---

## 7. Phương án hoàn nguyên (Rollback)

- Toàn bộ công việc thực hiện trên nhánh độc lập `plan/sheet-cf-visuals-agy` (hoặc nhánh feature tương ứng khi code).
- Nếu phát sinh lỗi hoặc không vượt qua gate duyệt:
  - Hoàn nguyên nhánh bằng lệnh `git revert` hoặc xóa nhánh làm việc cục bộ.
  - Do tính năng hoàn toàn tách biệt ở tầng UI và cấu trúc FODS mở rộng, việc hoàn nguyên không để lại bất kỳ ảnh hưởng nào đến các chức năng tính toán, công thức hay hiển thị hiện có của VN Sheet.

---

## 8. Nội dung Hướng dẫn sử dụng tiếng Việt (Tuân thủ AGENTS.md mục 10)

Bổ sung mục hướng dẫn hoàn chỉnh vào tệp `platform/help/entries-sheet.js` cho chức năng Định dạng có điều kiện:

```javascript
{
  id: "sheet.format.conditional",
  app: "sheet",
  commandIds: ["sheet.format.conditional"],
  title: "Định dạng có điều kiện (Thang màu, Thanh dữ liệu, Bộ biểu tượng)",
  summary: "Tô màu nổi bật các ô tự động theo giá trị, hiển thị thang màu chuyển tiếp, thanh tiến trình mini hoặc bộ biểu tượng trực quan ngay trong ô tính.",
  ribbon: { tab: "Trang đầu", tabId: "home", group: "Kiểu ô" },
  keywords: [
    "định dạng có điều kiện", "conditional formatting", "thang màu", "color scale",
    "thanh dữ liệu", "data bar", "bộ biểu tượng", "icon set", "tô màu ô"
  ],
  steps: [
    "Bước 1: Quét chọn vùng dữ liệu số cần làm nổi bật (ví dụ cột Doanh thu hoặc Điểm số).",
    "Bước 2: Trên tab Trang đầu, tại nhóm Kiểu ô, nhấn nút Định dạng có điều kiện.",
    "Bước 3: Chọn kiểu trực quan hóa phù hợp trong hộp thoại:",
    "  • Quy tắc so sánh: Nhập giá trị để tô màu các ô Lớn hơn, Nhỏ hơn hoặc Ô trống.",
    "  • Thang màu (Color Scales): Chọn thang 2 màu (ví dụ Trắng → Xanh) hoặc 3 màu (Xanh lá → Vàng → Đỏ). Màu nền của ô sẽ tự động đổi sắc độ đậm nhạt theo độ lớn của số.",
    "  • Thanh dữ liệu (Data Bars): Chọn màu thanh (Xanh dương, Xanh lá, Đỏ...). Một thanh ngang mini sẽ xuất hiện bên trong ô tương ứng với giá trị số, giúp so sánh nhanh như một biểu đồ mini.",
    "  • Bộ biểu tượng (Icon Sets): Chọn mẫu biểu tượng (3 Mũi tên xu hướng, 3 Đèn giao thông, 3 Cờ báo hiệu, hoặc 5 Ngôi sao). Biểu tượng sẽ hiển thị trước số liệu theo mức độ cao, trung bình, hoặc thấp.",
    "Bước 4: Nhấn Áp dụng. Bảng tính sẽ hiển thị ngay lập tức các hiệu ứng trực quan.",
    "Mẹo: Để xóa quy tắc, mở lại hộp thoại Định dạng có điều kiện và chọn Xóa quy tắc cho vùng đã chọn."
  ]
}
```

---

## 9. Danh mục Quốc tế hóa (i18n VI / EN)

Bổ sung các khóa song ngữ vào `platform/i18n/strings-vi.js` và `platform/i18n/strings-en.js` trong nhóm `sheetDialogs`:

| Mã khóa (Key) | Tiếng Việt (`strings-vi.js`) | Tiếng Anh (`strings-en.js`) |
| :--- | :--- | :--- |
| `cfColorScale` | "Thang màu" | "Color Scales" |
| `cfColorScale2` | "Thang 2 màu" | "2-Color Scale" |
| `cfColorScale3` | "Thang 3 màu" | "3-Color Scale" |
| `cfMinColor` | "Màu giá trị nhỏ nhất" | "Minimum Color" |
| `cfMidColor` | "Màu trung vị (50%)" | "Midpoint Color (50%)" |
| `cfMaxColor` | "Màu giá trị lớn nhất" | "Maximum Color" |
| `cfDataBar` | "Thanh dữ liệu" | "Data Bars" |
| `cfBarColor` | "Màu thanh" | "Bar Color" |
| `cfBarGradient` | "Tô chuyển sắc (Gradient)" | "Gradient Fill" |
| `cfBarSolid` | "Tô màu đặc (Solid)" | "Solid Fill" |
| `cfNegativeBarColor` | "Màu giá trị âm" | "Negative Bar Color" |
| `cfShowValueOnly` | "Ẩn số, chỉ hiện thanh" | "Show Bar Only" |
| `cfIconSet` | "Bộ biểu tượng" | "Icon Sets" |
| `cf3Arrows` | "3 Mũi tên (Lên - Ngang - Xuống)" | "3 Arrows (Up - Flat - Down)" |
| `cf3TrafficLights` | "3 Đèn giao thông (Đỏ - Vàng - Xanh)" | "3 Traffic Lights (Red - Yellow - Green)" |
| `cf3Flags` | "3 Cờ hiệu" | "3 Flags" |
| `cf4Arrows` | "4 Mũi tên" | "4 Arrows" |
| `cf5Rating` | "5 Mức đánh giá (Sao)" | "5 Rating (Stars)" |
| `cfReverseIcons` | "Đảo ngược thứ tự biểu tượng" | "Reverse Icon Order" |
| `cfShowIconOnly` | "Ẩn số, chỉ hiện biểu tượng" | "Show Icon Only" |
| `cfClearRules` | "Xóa quy tắc định dạng" | "Clear Conditional Rules" |
