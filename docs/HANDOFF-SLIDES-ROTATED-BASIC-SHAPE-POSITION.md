# HANDOFF: VN Slides — Vị trí hình chữ nhật/ellipse xoay cũng bị đọc sai

## Bối cảnh

Tiếp nối trực tiếp `HANDOFF-SLIDES-ROTATED-SHAPE-POSITION.md` (đã sửa cho
ảnh, qua `_parseFrameShape()`). Rà soát tiếp các hàm parse hình dạng khác
trong `slides-adapter.js` để tìm cùng lớp lỗi (đọc thẳng `svg:x`/`svg:y`,
không kiểm tra `draw:transform`) — phát hiện `_parseDrawShape()` (dòng
~1789, xử lý `<draw:rect>`/`<draw:ellipse>`/`<draw:custom-shape>`) có
**Y HỆT lỗi đó, hoàn toàn độc lập** với `_parseFrameShape()` (2 hàm không
dùng chung object khởi tạo).

Đây là lỗi phổ biến hơn về mặt thực tế so với ảnh xoay: hình chữ nhật,
mũi tên, hộp văn bản xoay chéo là thành phần rất thường gặp trong sơ đồ/
biểu trình bày (flowchart, timeline chéo, nhãn xoay).

## Xác nhận qua probe soffice thật

PPTX có 1 `<p:sp>` hình chữ nhật xoay 30° (`a:xfrm rot="1800000"`, offset
x=1500000/y=800000 EMU), convert qua soffice → FODP ghi:

```xml
<draw:custom-shape draw:name="Rectangle 1" ... svg:width="5.555cm" svg:height="2.777cm"
  draw:transform="rotate (-0.523598775598299) translate (5.233cm 1.019cm)">
```

Không có `svg:x`/`svg:y` — giống hệt cơ chế đã xác nhận cho ảnh.

## Giải pháp

`_parseDrawShape()`: thay `x: this._odfLengthToPx(get("svg:x"))` /
`y: ...svg:y...` bằng `const origin = this._parseDrawTranslate(attrs)`
rồi `x: origin.x, y: origin.y` — tái sử dụng đúng hàm đã sửa (bao gồm cả
bản vá regex khoảng-trắng) ở lần trước, không viết logic mới.

## Kiểm thử

- `node scripts/check-syntax.js`: 89/89 PASS.
- `node tests/run-tests.js`: 1444/1444 PASS (thêm 1 test vào suite "131.
  VN Slides: vị trí hình bị xoay" — hình chữ nhật xoay qua
  `_parseDrawShape`, khác hàm ảnh, cũng lấy đúng vị trí).
- `node tests/live/ribbon-audit-1280.playwright.mjs`: 100% PASS.
- `node tests/live/slides-smartart-import-real-conversion.mjs`: PASS
  (không thoái lui — SmartArt dùng `<draw:custom-shape>` bên trong
  `<draw:g>`, cùng đường code này).
- `node tests/live/slides-rotated-basic-shape-real-conversion.mjs`
  (mới): PPTX thật có hình chữ nhật xoay 30° → soffice thật → FODP xác
  nhận `draw:transform` → `parseFodp()` đọc đúng vị trí (không phải
  0,0) — PASS.
