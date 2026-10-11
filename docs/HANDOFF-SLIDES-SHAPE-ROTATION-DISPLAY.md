# HANDOFF: VN Slides — Hiển thị (chỉ đọc) góc xoay hình từ file thật

## Bối cảnh

Tiếp nối trực tiếp 2 lần sửa lỗi VỊ TRÍ hình bị xoay (`_parseFrameShape`,
`_parseDrawShape` — xem `HANDOFF-SLIDES-ROTATED-SHAPE-POSITION.md` +
`HANDOFF-SLIDES-ROTATED-BASIC-SHAPE-POSITION.md`). agy đã xác nhận qua
Visual QA độc lập: VN Slides **hoàn toàn không có** bất kỳ cơ chế nào đọc
hay hiển thị góc xoay (`shape.rotation` không tồn tại ở đâu trong
`slides-canvas.js`, không tay cầm xoay, không ô nhập góc trên ribbon).

Vì `_parseDrawTranslate()` đã đọc đúng vị trí từ `draw:transform=
"rotate(...) translate(...)"`, việc trích thêm GÓC XOAY từ CÙNG một
regex match là một bước mở rộng nhỏ, rủi ro thấp, tận dụng hạ tầng đã có.

## Phạm vi lần này: CHỈ HIỂN THỊ, CHƯA TƯƠNG TÁC

- Đọc góc xoay từ file thật (PPTX → soffice → FODP → `parseFodp()`).
- Hiển thị đúng góc xoay bằng CSS `transform: rotate(deg)` trên canvas.
- **CHƯA CÓ**: tay cầm xoay kéo bằng chuột, ô nhập góc trên
  ribbon/context menu, ghi góc xoay khi Lưu (serialize), cập nhật vị trí
  8 tay cầm co giãn theo đúng hình đã xoay (handles vẫn hiển thị theo
  bounding box KHÔNG xoay — hạn chế đã biết, chấp nhận được cho bản hiển
  thị chỉ-đọc này).

## Vấn đề kỹ thuật quan trọng: quy ước chiều xoay NGƯỢC nhau giữa ODF và OOXML/CSS

Xác nhận qua probe soffice thật (PPTX `a:xfrm rot="1800000"` = 30° THEO
QUY ƯỚC OOXML/PowerPoint — **xuôi kim đồng hồ dương**):

```
soffice ghi: draw:transform="rotate (-0.5235987755982988) translate (...)"
```

`-0.5235987755982988` rad = **-30°** theo quy ước ODF (rotate dương =
**ngược kim đồng hồ**, chuẩn toán học). Để hiển thị đúng bằng CSS
`transform: rotate(deg)` (CSS dùng dương = xuôi kim đồng hồ, giống OOXML),
PHẢI **ĐẢO DẤU** khi quy đổi radian ODF sang độ CSS:

```js
rotationDeg = -(radianODF * 180 / Math.PI)
```

Đã xác minh: OOXML `rot="1800000"` (30° xuôi kim đồng hồ thật trong
PowerPoint) → `_parseDrawTranslate()` trả về `rotationDeg = 30` (đúng,
khớp CSS `transform: rotate(30deg)` cũng xoay xuôi kim đồng hồ).

## Thay đổi

- `adapters/libreoffice/slides/slides-adapter.js`:
  - `_parseDrawTranslate(attrs)`: thêm trích xuất `rotate(radian)` từ
    cùng chuỗi `draw:transform`, trả về thêm trường `rotationDeg` (đảo
    dấu theo công thức trên; `0` khi không có `rotate(...)`).
  - `_parseDrawShape()` (rect/ellipse/custom-shape) và
    `_parseFrameShape()` (ảnh/bảng/chart/wordart/textbox): gán
    `shape.rotation = origin.rotationDeg` CHỈ KHI khác 0 (không thêm
    trường thừa cho hình không xoay — giữ tương thích ngược hoàn toàn
    với mọi code/test hiện có không biết đến trường `rotation`).
- `apps/slides/slides-canvas.js` — `_renderShapesLayer()`: nếu
  `shape.rotation` có giá trị, thêm
  `transform:rotate(${shape.rotation}deg); transform-origin:center center;`
  vào `el.style.cssText`.

## Kiểm thử

- `node scripts/check-syntax.js`: 89/89 PASS.
- `node tests/run-tests.js`: 1454/1454 PASS (thêm 4 test mới vào suite
  131: dấu/độ lớn `rotationDeg` đúng, `rotationDeg=0` khi không xoay,
  ảnh xoay 45° có `shape.rotation` đúng + ảnh không xoay KHÔNG có trường
  `rotation`, hình chữ nhật xoay 30° qua `_parseDrawShape` cũng đúng).
- `node tests/live/ribbon-audit-1280.playwright.mjs`: 100% PASS.
- `node tests/live/slides-smartart-import-real-conversion.mjs`: PASS
  (không thoái lui — SmartArt dùng chung `_parseDrawTranslate`).
- Xác minh dấu/độ lớn qua probe soffice thật độc lập (PPTX rot=1800000 →
  FODP → parseFodp() → `shape.rotation` = 30.00000000000001, đúng như kỳ
  vọng CSS clockwise-positive).

## Việc còn lại (đề xuất giao cho agy — UI/tương tác)

1. Tay cầm xoay trực quan (chấm tròn phía trên hình, có "cần" nối tới
   viền trên) khi 1 shape được chọn trên canvas.
2. Tính góc kéo chuột (`Math.atan2`) để cập nhật `shape.rotation` theo
   thời gian thực khi kéo tay cầm.
3. Cập nhật vị trí 8 tay cầm co giãn (`_ensureShapeSelectionHandles`)
   theo đúng hộp bao đã xoay (hiện tại handles KHÔNG xoay theo).
4. Ô nhập góc xoay chính xác trên Ribbon "Sắp xếp"/context menu (tương tự
   `slides.text.direction` đã có cho hướng chữ).
5. Ghi góc xoay khi Lưu — nối vào `_serializeShapesXml`/hàm serialize
   tương ứng, dùng CHÍNH XÁC công thức đảo dấu ngược lại
   (`radianODF = -(rotationDeg * Math.PI / 180)`) để ghi
   `draw:transform="rotate(...) translate(...)"` đúng chuẩn ODF khi VN
   Slides tự lưu file có hình xoay.

Đây là công việc UI + tương tác chuột + (một phần) serialize — phù hợp
giao cho agy phần UI/CSS/canvas-interaction, Claude xử lý phần serialize
XML nếu cần.
