# HANDOFF S28: SỬA 5 LỚP RENDER VN SHEET (VÒNG 12)

## 1. Mục tiêu & Bối cảnh

Handoff giải quyết triệt để 5 lớp lỗi hiển thị (render defects) trên VN Sheet được phát hiện trong đợt kiểm tra trực quan Vòng 11 theo yêu cầu tại `docs/TASK-BRIEF-SHEET-RENDER-S28.md` và `docs/HANDOFF-VISUAL-INSPECTION-R11.md`:
- **S28a (L5)**: Màu nền do định dạng có điều kiện (Conditional Formatting) và Theme color (`lan02` s2 A10:B13; `lan03` s1 row 1).
- **S28b (L2)**: Header sheet khác chèn vào hàng 1–3 khi chuyển sheet (`lan12` s1 nhận header s2; `lan16` s4 nhận header s2).
- **S28c (L3)**: Chữ cột A bị cắt dù ô kề B trống (`lan02` s1 A4/A7/A19: ô chứa richText không tràn).
- **S28d (L10)**: Ảnh tràn cột đè chữ (`lan10` s2 A10:A30).
- **S28e (L11)**: Khuyết banner sheet phụ có freeze panes (`lan16` s2 Picture 2).

**Môi trường & Không gian làm việc**:
- Worktree: `E:\VNOffice-agy-sheet-s28` (branch `fix/sheet-render-s28`, tách từ `main`).
- Profile chạy: `$env:LOCALAPPDATA = "E:\VNOffice-profiles\agy"`.
- Trọng tài màu & vị trí: Excel 2016 COM (`DisplayFormat.Interior.Color`, `DisplayFormat.Font.Color`, `FormatConditions.Count`, `Shapes(i).Left/Top/Width/Height`).

---

## 2. Chi tiết 5 lớp lỗi, số đo thực nghiệm và giải pháp kiến trúc

### 2.1. S28b (L2): Header sheet khác chèn vào hàng 1–3 khi chuyển sheet
- **Hiện tượng**: Khi mở workbook có sheet chứa hàng cố định (freeze panes) như `lan12.xlsx` (sheet 2 có 3 hàng cố định) hoặc `lan16.xlsx` (sheet 2 có 4 hàng cố định), sau đó chuyển sang sheet khác (ví dụ sheet 1 hoặc sheet 4 không có freeze panes), header của sheet 2 vẫn hiển thị lơ lửng ở hàng 1–3, đè lên nội dung thật của sheet hiện tại.
- **Số đo & Nguyên nhân gốc**:
  - Khám nghiệm DOM trong `apps/sheet/sheet-grid.js`: các hàng cố định (`.vno-frozen-row`) được render và chèn vào `this.tbody` **trước** `this.topSpacer`.
  - Trong hàm `_renderVirtualRows()`, logic dọn dẹp hàng cũ trước đây chỉ quét giữa `this.topSpacer` và `this.bottomSpacer` (`while (this.topSpacer.nextSibling && this.topSpacer.nextSibling !== this.bottomSpacer)`).
  - Vì vậy, các node `.vno-frozen-row` của sheet cũ nằm trước `this.topSpacer` không bao giờ bị xóa khi chuyển sheet (`switchSheet`), dẫn đến việc header của sheet trước tích lũy vĩnh viễn ở đầu các sheet sau.
- **Sửa đúng tầng kiến trúc**:
  - Trong `apps/sheet/sheet-grid.js` (`_renderVirtualRows`): bổ sung vòng lặp xóa sạch mọi sibling đứng trước `this.topSpacer`:
    ```javascript
    while (this.topSpacer.previousSibling) {
      this.tbody.removeChild(this.topSpacer.previousSibling);
    }
    ```
- **Commit**: `eb80c4f` (`fix(sheet): S28b don dep hang co dinh cu truoc topSpacer tranh trung lap header`).
- **Khóa bởi test**: `tests/unit/sheet-freeze-panes-real.test.js` (kiểm tra chuyển đổi qua lại giữa sheet có freeze rows và sheet không có freeze rows, đảm bảo không còn node `.vno-frozen-row` cũ tồn đọng).

---

### 2.2. S28c (L3): Chữ cột A bị cắt sang ô trống do ô chứa richText
- **Hiện tượng**: Trên `lan02.xlsx` sheet 1, các ô A4 (`Đơn vị/Người chuyển (Applicant):`), A7, A19 có văn bản dài hơn bề rộng cột A, trong khi ô kề bên B4/B7/B19 hoàn toàn trống, nhưng chữ vẫn bị cắt cụt ở biên cột A thay vì tràn chữ sang cột B như Excel.
- **Số đo & Nguyên nhân gốc**:
  - Quy ước S25c trước đây đã hỗ trợ tràn chữ sang ô trống trong `_renderCellVisual` ở cuối hàm.
  - Tuy nhiên, trong nhánh xử lý ô có định dạng richText (nhiều run font khác nhau), hàm kết thúc bằng một lệnh `return;` sớm ngay sau khi append các `span`.
  - Do `return;` sớm, các ô có richText hoàn toàn bị bỏ qua hai bước quan trọng: (1) `_applyRowColSizeToCell` và (2) khối đánh giá tràn chữ (`can-overflow` / `td.style.overflow = "visible"`).
- **Sửa đúng tầng kiến trúc**:
  - Trong `apps/sheet/sheet-grid.js` (`_renderCellVisual`): loại bỏ lệnh `return;` sớm trong nhánh richText, cho phép tiếp tục luồng xuống `_applyRowColSizeToCell` và khối kiểm tra tràn chữ.
  - Bổ sung nhận diện `cell.richText` khi kiểm tra ô có dữ liệu chặn tràn.
- **Commit**: `88db1ac` (`fix(sheet): S28c ho tro tran chu sang o trong cho o co richText`).
- **Khóa bởi test**: `tests/unit/sheet-cell-text-fit.test.js` (kiểm tra ô richText nhận class `can-overflow` và `overflow: visible` khi ô bên phải trống, và bị chặn tràn khi ô bên phải có dữ liệu).

---

### 2.3. S28d (L10): Ảnh tràn cột đè chữ do Header hàng co rút
- **Hiện tượng**: Trên `lan10.xlsx` sheet 2, ảnh neo tại ô A10 (`xdr:from` col 0 row 9) bị tràn sang phải đè lên chữ cột B (A10:A30).
- **Số đo & Nguyên nhân gốc**:
  - Trọng tài Excel COM: `Shapes(1).Left = 0.75 pt` (~1 px từ biên trái vùng dữ liệu), nằm gọn trong cột A (chiều rộng cột A = 125 px).
  - Khám nghiệm DOM VN Sheet: Table có CSS `table-layout: fixed`. Ô `.vno-grid-corner-header` và `.vno-row-header` chỉ được đặt `width: 44px;` nhưng thiếu ràng buộc `min-width` / `max-width`. Khi viewport rộng và bảng có nhiều cột, trình duyệt ép co cột header hàng xuống chỉ còn `15.6px`.
  - Trong khi đó, hàm `renderImages()` của `sheet-grid.js` tính toán vị trí với giả định cứng `leftAcc = 44px`.
  - Khoảng chênh lệch 44px - 15.6px = 28.4px đẩy toàn bộ các ảnh neo tại cột A dịch sang phải ~28px, gây tràn sang cột B và đè lên chữ.
- **Sửa đúng tầng kiến trúc**:
  - Trong `apps/sheet/sheet.css`: khóa cứng kích thước cột header hàng:
    ```css
    .vno-grid-corner-header,
    .vno-row-header {
      min-width: 44px;
      max-width: 44px;
      box-sizing: border-box;
    }
    ```
  - Trong `apps/sheet/sheet-grid.js`: cập nhật `renderImages` và `_updateImagePositions` neo trực tiếp vào tọa độ thực tế của cell DOM: `targetTd.offsetLeft`, loại bỏ sự phụ thuộc vào offset tĩnh 44px.
- **Commit**: `00f39f1` (`fix(sheet): S28d khoa chieu rong row header 44px va can chinh toa do anh neo cot`).
- **Khóa bởi test**: `tests/unit/sheet-images.test.js` (kiểm tra căn chỉnh ảnh theo `offsetLeft` của cell DOM và giữ vững kích thước row header 44px).

---

### 2.4. S28e (L11): Khuyết banner sheet phụ khi có freeze panes
- **Hiện tượng**: Trên `lan16.xlsx`, sheet 2 ("Các mã sản phẩm dừng phân phối") có banner đồ họa Picture 2 nhưng không hiển thị trên VN Sheet (trong khi sheet 1 và sheet 3 hiển thị bình thường).
- **Số đo & Nguyên nhân gốc**:
  - Khám nghiệm FODS & OOXML: Sheet 2 có ảnh Picture 2 neo tại A1 (`c: 'A', r: 1`), kích thước lớn 29.421cm x 5.609cm (~1112px x 212px). Sheet 2 có cấu hình cố định hàng `frozenRows = 4`.
  - Trong `apps/sheet/sheet-grid.js`: Hàm `_updateImagePositions()` truy cập trực tiếp thuộc tính `image.anchor.r`. Khi đối tượng ảnh được parse từ FODS không có cấu trúc `.anchor` dạng `{ c, r }` mà chỉ có địa chỉ chuỗi hoặc cấu trúc phẳng, việc đọc trực tiếp `image.anchor.r` gây lỗi undefined hoặc bỏ qua định vị ảnh.
  - Đồng thời, trước khi sửa S28b, các thẻ hàng cố định cũ tồn đọng đè lên vùng header che khuất banner.
- **Sửa đúng tầng kiến trúc**:
  - Trong `_updateImagePositions()`, sử dụng helper `this._resolveImageAnchor(image)` thống nhất với `renderImages()`.
  - Đảm bảo ảnh nằm trong vùng hàng cố định nhận `z-index: 10`, định vị tuyệt đối theo ô neo chính xác và không bị che khuất.
- **Commit**: `e669fed` (`fix(sheet): S28e dam bao banner sheet phu hien thi day du theo anchor`).
- **Khóa bởi test**: `tests/unit/sheet-images.test.js` (kiểm tra banner sheet 2 lan16 neo A1 với `frozenRows = 4`, width ~1112px, height ~212px, z-index 10).

---

### 2.5. S28a (L5): Màu nền định dạng có điều kiện và Theme Palette
- **Hiện tượng**:
  - Nghi vấn từ Vòng 11: `lan02` s2 A10:B13 bị mất màu vàng; `lan03` s1 row 1 header xanh `#2563eb` có đúng chuẩn Excel không?
- **Số đo thực nghiệm bằng Trọng tài Excel COM (`scripts/layout-audit/_excel_cell_probe.ps1`)**:
  - Mở rộng script `_excel_cell_probe.ps1` để đo đồng thời:
    - `Interior.Color`: Màu nền tĩnh của ô.
    - `DisplayFormat.Interior.Color`: Màu nền hiển thị sau khi áp dụng định dạng có điều kiện (Excel 2010+).
    - `DisplayFormat.Font.Color`: Màu chữ hiển thị sau khi áp dụng định dạng có điều kiện.
    - `FormatConditions.Count`: Số lượng quy tắc định dạng có điều kiện tại ô.
  - Kết quả đo trên `lan02.xlsx` Sheet 2:
    - `A10:B13`: `font = #000000`, `dfFont = #000000`, `fill = #FFFFFF`, `dfFill = #FFFFFF`, `fcCount = 0`.
    - **Kết luận thực chứng**: Trên Excel 2016, các ô `A10:B13` của Sheet 2 hoàn toàn **không có màu nền vàng** (`dfFill = #FFFFFF`, `fcCount = 0`). Màu vàng `#FFFF00` (`dfFill = #FFFF00`, `fcCount = 0`) thực tế nằm ở các cột ẩn từ H đến T của hàng 10–13. Vì vậy kết luận của opencode ở S25 rằng "nguồn không có màu vàng ở A10:B13" là chuẩn xác về mặt hiển thị.
  - Kết quả đo trên `lan03.xlsx` Sheet 1:
    - `A1:F1` (ô gộp tiêu đề): `fill = #538DD5`, `dfFill = #538DD5`, `font = #FFFFFF`, `dfFont = #FFFFFF`, `fcCount = 0`.
    - LibreOffice Calc khi xuất sang FODS chuyển đổi theme color `theme="3" tint="0.399975"` thành `fo:background-color="#558ed5"` và `fo:color="#ffffff"`. VN Sheet hiển thị `#558ed5`, lệch RGB <= 2 so với `#538DD5` của Excel (đạt chuẩn hiển thị).
- **Phát hiện sâu & Cải tiến Conditional Formatting trong FODS**:
  - Kiểm tra FODS của `lan03`: Calc xuất ra 145 khối `<calcext:conditional-format>` với thuộc tính `calcext:target-range-address` chứa danh sách vùng cách nhau bởi khoảng trắng (ví dụ `'Sheet'.C3:'Sheet'.C3 'Sheet'.D4:'Sheet'.D10`) và quy tắc trùng lặp `calcext:value="duplicate"`.
  - Trong `adapters/libreoffice/sheet/sheet-adapter.js`, hàm `_parseOdfTargetRanges()` trước đây split thẳng theo dấu hai chấm `:`, khiến các vùng phân tách bởi khoảng trắng bị vỡ chuỗi và bỏ rơi toàn bộ danh sách quy tắc.
  - Đồng thời `sheet-adapter.js` chưa parse quy tắc `duplicate`, và tên style màu trong FODS có dạng `ConditionalStyle_5f_N` (Calc escape dấu gạch dưới) không khớp với `ConditionalStyle_N`.
  - **Khắc phục hiện tượng phình to chuỗi khi lưu**: Đối với các quy tắc CF toàn cột (ví dụ `C16:C1048576`), việc sinh ô rỗng trong `sheetConditionalCells` và `rows` từng gây phát sinh hơn 1 triệu thẻ `<table:table-row>` (~206MB/sheet, gây lỗi `RangeError: Invalid string length` trên `lan16`). Sửa: giới hạn `maxCfRow = Math.min(range.end.r, 10000)` và chỉ gán `conditionalBase` cho các ô nằm trong phạm vi dòng thực tế của sheet (`rowNumber <= maxRow`), đảm bảo toàn vẹn quy tắc `<calcext:conditional-formats>` mà không làm bung kích thước tệp.
- **Sửa đúng tầng kiến trúc**:
  - Thêm `_splitOdfAddressList` và hoàn thiện `_parseOdfTargetRanges` để tách chính xác danh sách vùng cách nhau bằng khoảng trắng.
  - Bổ sung parse quy tắc `calcext:value="duplicate"` trong `_parseConditionalCondition` và hỗ trợ serialize ngược lại FODS.
  - Chuẩn hóa tên style màu trong `_parseCellStyleColors` (xử lý `_5f_` thành `_`).
  - Trong `SheetGridController`: bổ sung đánh giá quy tắc `duplicate` trong `_matchingConditionalRule(col, row)` để highlight các giá trị trùng lặp trong vùng chỉ định.
  - Tối ưu hóa serialization CF trong `sheet-adapter.js` để tránh lãng phí bộ nhớ và bùng nổ thẻ bảng.
- **Commits**: `7ba8f6f` và `6c96228`.
- **Khóa bởi test**: `tests/unit/sheet-cf-validation-fods-roundtrip.test.js` (kiểm tra phân tách target-range-address có khoảng trắng, nhận diện style conditional format, parse và serialize rule duplicate, highlight cell duplicate, và kiểm soát kích thước XML serialized).

---

## 3. Tổng hợp Kết quả Kiểm tra Chất lượng (Quality Gates)

| Gate | Lệnh thực thi | Kết quả | Chi tiết |
|---|---|---|---|
| **Syntax Check** | `node scripts/check-syntax.js` | **PASS** | 92/92 files sạch cú pháp |
| **JS Unit Tests** | `node tests/run-tests.js` | **PASS** | 1814/1814 bài kiểm tra đạt (0 fail, 154 suites) |
| **Python Sheet Tests** | `python -m unittest discover -s tests -p "test_sheet*.py"` | **PASS** | 167/167 bài kiểm tra đạt (0 fail, 117.5s) |
| **Batch Audit** | `python scripts/layout-audit/_batch_audit.py . lan02.xlsx lan03.xlsx lan10.xlsx lan12.xlsx lan16.xlsx lan28.xlsx` | **PASS** | 0 diffs trên toàn bộ 6 file LAN kiểm thử, Excel mở sạch |

### Bảng Kết quả Batch Audit Thực tế (`_batch_audit_report.md`):

| file | original name | saved | total diffs | Excel opens | lint | diffs by kind |
|---|---|---|---:|---|---|---|
| lan02.xlsx | 01. UNC VÀ DANH SÁCH TRẢ LƯƠNG 3T.xlsx | yes | 0 | _rt_lan02.xlsx OK sheets=2 | clean | |
| lan03.xlsx | 3T_Báo giá DAHUA-T01.2022.xlsx | yes | 0 | _rt_lan03.xlsx OK sheets=12 | clean | |
| lan10.xlsx | BG khoa dien tu ZIVIO T11-19 (1).xlsx | yes | 0 | _rt_lan10.xlsx OK sheets=9 | clean | |
| lan12.xlsx | BGBL NON-CCTV Nhà An Toàn T8.xlsx | yes | 0 | _rt_lan12.xlsx OK sheets=11 | clean | |
| lan16.xlsx | DSS_Báo giá Dahua HN-T12.2023.xlsx | yes | 0 | _rt_lan16.xlsx OK sheets=14 | clean | |
| lan28.xlsx | xét lương công ty.xlsx | yes | 0 | _rt_lan28.xlsx OK sheets=12 | clean | |

---

## 4. Danh sách Commit theo thứ tự triển khai

1. `eb80c4f`: `fix(sheet): S28b don dep hang co dinh cu truoc topSpacer tranh trung lap header`
2. `88db1ac`: `fix(sheet): S28c ho tro tran chu sang o trong cho o co richText`
3. `00f39f1`: `fix(sheet): S28d khoa chieu rong row header 44px va can chinh toa do anh neo cot`
4. `e669fed`: `fix(sheet): S28e dam bao banner sheet phu hien thi day du theo anchor`
5. `7ba8f6f`: `fix(sheet): S28a ho tro mau nen dinh dang co dieu kien va theme`
6. `6c96228`: `fix(sheet): S28a gioi han pham vi sinh o rong cho conditional formatting toan cot`
7. `<commit-handoff>`: `docs: hoan thanh handoff sua 5 lop render VN Sheet vong 12 S28`

Tất cả các commit đều tuân thủ nghiêm ngặt quy định: sửa tại 1 vị trí đúng tầng kiến trúc, có unit test đi kèm, cập nhật quy ước tại `docs/QUY-UOC-DOI-CHIEU.md`, và thông điệp commit viết bằng tiếng Việt không dấu.
