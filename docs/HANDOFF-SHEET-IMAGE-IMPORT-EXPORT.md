# HANDOFF: VN Sheet — Đọc/ghi ảnh nhúng (draw:image)

## Bối cảnh phát hiện

Theo yêu cầu người dùng kiểm thử trực tiếp bằng cách mở file Excel/Word thật
(không đọc code), đã mở file thật `E:\VN OFice\file test\GÓI THẦU MUA SẮM
MÁY BẢO MẬT\file mới\Copy of máy bảo mật - KTQT - thẩm định.xlsx` (có 5 ảnh
nhúng trong `xl/media/`) trong VN Sheet qua đối số dòng lệnh. Ảnh logo công
ty neo tại ô A1 (`xdr:oneCellAnchor`, `xdr:from col=0 row=0`) hoàn toàn
KHÔNG hiển thị, dù dữ liệu số/chữ trong các ô khác hiển thị đúng.

## Nguyên nhân gốc

`adapters/libreoffice/sheet/sheet-adapter.js` chỉ parse `<draw:frame>` chứa
`<chart:chart>` (biểu đồ, qua `_attachImportedCharts()`), KHÔNG BAO GIỜ đọc
`<draw:frame><draw:image>` (ảnh raster thường). Đối chiếu: Writer
(`writer-adapter.js`) và Slides (`slides-adapter.js`) đã hỗ trợ `draw:image`
từ trước — CHỈ RIÊNG Sheet bị thiếu.

Điều bất ngờ hơn: `apps/sheet/sheet-grid.js` đã có SẴN một tính năng ảnh đầy
đủ — `imagesBySheet`, `insertImage()`, `deleteImage()`, `renderImages()`,
tích hợp undo/redo và snapshot theo sheet — nhưng **sheet-adapter.js chưa
bao giờ đọc/ghi trường `imagesBySheet` này**. Hậu quả kép, xác nhận qua
`git grep imagesBySheet adapters/`:

1. Mở file XLSX/ODS thật (Excel, Google Sheets, LibreOffice Calc...) có ảnh
   nhúng → ảnh biến mất hoàn toàn.
2. Người dùng tự chèn ảnh qua `insertImage()` trong VN Sheet → Lưu file rồi
   Mở lại → ảnh cũng biến mất (vì `serializeToFods()` chưa từng ghi
   `imagesBySheet` ra FODS).

## Cấu trúc ODF thật (xác nhận qua probe soffice thật)

Convert file XLSX thật ở trên qua `soffice --convert-to fods`, ảnh được ghi
**trực tiếp làm con của `<table:table-cell>` neo** (không dùng thuộc tính
neo riêng như OOXML `xdr:from`):

```xml
<table:table-row>
 <table:table-cell>
  <draw:frame draw:name="Picture 1" svg:width="4.068cm" svg:height="3.548cm" svg:x="0.543cm" svg:y="0cm">
   <draw:image draw:mime-type="image/png">
    <office:binary-data>iVBORw0KGgo...</office:binary-data>
   </draw:image>
  </draw:frame>
 </table:table-cell>
</table:table-row>
```

Vị trí neo (ô nào) suy ra TRỰC TIẾP từ vị trí `<table:table-cell>` trong
chuỗi hàng/cột (đếm y hệt cách các ô giá trị bình thường được đếm — kể cả
`table:number-columns-repeated`).

## Giải pháp

Dùng ĐÚNG định dạng nhúng-trong-ô ở trên cho CẢ hai chiều đọc và ghi — không
cần thuộc tính riêng `vno:*` như các tính năng khác (Page Setup, Print
Titles, Freeze Panes), vì định dạng chuẩn ODF thật vốn đã đủ chính xác cho
round-trip của chính VN Office.

**Đọc (parse)** — `sheet-adapter.js`:
- `_parseCellEmbeddedImage(cellXml, fallbackId)`: bản regex, dùng trong
  nhánh parse dự phòng bằng regex.
- `_parseCellEmbeddedImageDom(cellElement, fallbackId)`: bản DOM-native,
  dùng trong nhánh parse chính bằng `DOMParser`.
- Cả hai được gọi ngay trong vòng lặp đọc từng `<table:table-cell>` sẵn có
  (đã dùng để đọc giá trị/công thức/ghi chú ô) — TÁI SỬ DỤNG nguyên vẹn
  logic đếm cột/hàng đã có (kể cả `table:number-columns-repeated`), không
  viết vòng lặp đếm vị trí riêng (tránh trùng lặp logic dễ lệch nhau).
- Kết quả gộp vào `workbook.imagesBySheet[sheetName]`, gán vào
  `this.grid.imagesBySheet[sheetName]` trong `loadFromFods()` — cùng cơ chế
  đã dùng cho `chartsBySheet`.

**Ghi (serialize)** — `sheet-adapter.js`:
- `_serializeCellImageXml(image)`: dựng `<draw:frame><draw:image>` từ
  `image.src` (data URI base64), `image.widthCm`/`heightCm` (mặc định
  6.35cm × 2.117cm nếu ảnh do `insertImage()` chèn tay chưa có kích thước
  thật).
- Trước khi dựng danh sách hàng/ô, một vòng lặp mới tính `imagesByAnchor`
  (Map tọa độ → ảnh) và ĐẢM BẢO ô neo được liệt kê riêng lẻ trong `rows`
  (không bị gộp vào vùng trống `table:number-columns-repeated`) — dùng
  ĐÚNG cơ chế đã có sẵn cho ô neo của vùng gộp (merged cell anchor).
- Cả 3 nhánh dựng `<table:table-cell>` (ô trống có thuộc tính, ô số, ô
  chữ) đều được sửa để chèn `cellImageXml` ngay sau thẻ mở.

## Ranh giới đã tuân thủ

- KHÔNG đụng vào Freeze Panes, Print Titles, Page Setup hay bất kỳ tính
  năng nào khác.
- KHÔNG cần đổi `renderImages()`/`insertImage()` trong `sheet-grid.js` —
  tầng render/data-model đã đúng từ trước, chỉ thiếu tầng đọc/ghi file.
- Ưu tiên đọc: vì đây là định dạng ODF chuẩn duy nhất (không có shortcut
  riêng cạnh tranh), không cần mẫu "3 nguồn ưu tiên" như Print Titles/Page
  Setup.

## Kiểm thử

- `node scripts/check-syntax.js`: 89/89 PASS.
- `node tests/run-tests.js`: 1435/1435 PASS (suite mới "130. Unit Tests —
  VN Sheet đọc/ghi ảnh nhúng", 7/7 PASS — bao gồm: parse 1 ô, ô không có
  ảnh, parse toàn FODS qua nhánh regex, ảnh neo ở ô trống sâu (không bị gộp
  vùng trống), round-trip Lưu→Mở qua `insertImage()` thật, không ghi thừa
  khi không có ảnh, nhiều ảnh trên 1 sheet).
- `node tests/live/ribbon-audit-1280.playwright.mjs`: 100% PASS, 26/26 tab.
- `node tests/live/sheet-fods-image-real-conversion.mjs` (mới): tạo XLSX
  thật có `xdr:oneCellAnchor` neo A1 → convert qua soffice thật → FODS →
  `parseFods()` trực tiếp → xác nhận ảnh parse đúng ô neo A1, dữ liệu PNG
  hợp lệ (đúng magic bytes) — PASS.
- Kiểm thử thủ công bằng script độc lập gọi `parseFods()` trực tiếp trên
  FODS thật (convert từ chính file test có 5 ảnh của người dùng): cả 5 ảnh
  (`3T-VP` 1 ảnh tại A1, `minh thanh-VP` 2 ảnh tại B1/E20, `NKA-VP` 2 ảnh
  tại A1/E20) đều parse đúng vị trí neo, đúng kích thước cm, đúng số byte
  ảnh (khớp `xl/media/image*.png` gốc, sai lệch nhỏ do soffice re-encode).

## Việc chưa làm (ghi nhận, không thuộc phạm vi)

- Chưa kiểm thử vòng OOXML gốc (XLSX→XLSX qua `xlsx-native-postprocess.js`)
  — phạm vi sửa lần này CHỈ áp dụng cho đường FODS (ODF), là đường mà
  `parseFods()`/`serializeToFods()` sử dụng cho cả Mở file thật (qua
  `_run_soffice_convert`) và Lưu file của VN Office. Nếu sau này phát hiện
  soffice có giới hạn tương tự Freeze Panes (`<pane>` bị rơi qua tầng ODF)
  áp dụng cho ảnh, sẽ cần lớp postprocess XLSX riêng — nhưng ảnh là tính
  năng rất phổ biến/chuẩn, rủi ro thấp hơn nhiều so với `<pane>`.
- Chưa xử lý ảnh xoay (`draw:transform="rotate(...) translate(...)"`, thấy
  trong file test thật ở "Picture 2") — VN Sheet chưa có khái niệm xoay ảnh
  trong data model hiện tại (`insertImage()` không có trường rotation), nên
  giữ nguyên phạm vi vị trí + kích thước, bỏ qua góc xoay (ảnh vẫn hiển thị,
  chỉ không đúng góc xoay gốc nếu có).
