# Bàn giao: VN Slides — Căn lề dọc khung chữ & Hướng văn bản (GAP-SLIDES-05/06)

## 1. Bối cảnh

`docs/HANDOFF-ALIGNMENT-DIALOGS-PARITY-AUDIT.md` ghi nhận 6 khoảng trống (GAP-SLIDES-01..06) so với PowerPoint thật. GAP-SLIDES-01/02/03/04 (Căn/Phân phối đối tượng, Undo gộp) đã được đóng ở đợt trước (`docs/HANDOFF-SLIDES-SHAPE-ALIGNMENT.md`). Đây là đợt đóng nốt 2 khoảng trống còn lại:

- **GAP-SLIDES-05**: Căn lề dọc khung chữ (Top/Middle/Bottom) — PowerPoint thật: `a:bodyPr anchor="t"|"ctr"|"b"`.
- **GAP-SLIDES-06**: Xoay hướng văn bản trong khung (Horizontal/Rotate 90°/Rotate 270°/Stacked) — PowerPoint thật: `a:bodyPr vert="horz"|"vert"|"vert270"|"wordArtVert"`.

Trước đợt này, mọi hình vẽ có chữ trong VN Slides LUÔN căn giữa cố định (`align-items:center` hardcode trong `slides.css`'s `.vno-slide-shape-item`), không có cách nào đổi.

## 2. Xác nhận bằng vòng chuyển đổi soffice THẬT trước khi làm

Trước khi cài đặt, đã dựng một FODP điều khiển khai báo `draw:textarea-vertical-align` và `style:writing-mode` trên `style:graphic-properties`, chuyển qua `soffice --convert-to pptx` và ngược lại. Kết quả: **soffice giữ đúng cả 2 thuộc tính** qua cả 2 chiều FODP↔PPTX (`anchor`/`vert` thật trong `a:bodyPr`) — khác hẳn lỗi Slide Size (`docs/HANDOFF-SLIDES-SLIDESIZE-EXPORT-FIX.md`), nơi soffice hoàn toàn bỏ qua thuộc tính ODF chuẩn. Vì vậy giải pháp ở đây CHỈ cần serialize/parse đúng chuẩn ODF, KHÔNG cần hậu xử lý ZIP OOXML.

**Giới hạn hẹp phát hiện phụ** (không chặn tính năng): kết hợp `textarea-vertical-align="bottom"` + `writing-mode` dọc bị soffice làm lệch thành `"middle"` qua vòng PPTX thật (trường hợp hiếm: văn bản vừa xoay dọc vừa căn dưới). Căn lề dọc một mình (chữ ngang) và hướng chữ một mình đều chính xác 100%.

## 3. Kiến trúc giải pháp

### 3.1 Dữ liệu: `shape.textVAlign` / `shape.textDirection`

Không bắt buộc — vắng mặt nghĩa là mặc định (`middle`/`horizontal`), khớp hành vi cũ, không phá vỡ file cũ.

### 3.2 `SlidesCanvasController` (`apps/slides/slides-canvas.js`)

- `_textStyleEligible(shape)`: loại `connector/image/video/audio/chart/table/wordart` (các loại không có khung chữ tự do hoặc đã có định dạng chữ riêng).
- `setTextVerticalAlign(align)` / `setTextDirection(direction)`: áp dụng cho TẤT CẢ hình đang chọn (`selectedShapeIds`) hoặc hình đang focus đơn (`selectedTarget`), bỏ qua hình không hợp lệ, gộp MỘT bản ghi undo `"shapes-text-style"` (kiểu `{shapeId, before, after}[]`) cho toàn bộ thay đổi — tái dùng đúng triết lý gộp-nhiều-hình-một-bước-undo đã thiết lập từ tính năng Căn/Phân phối trước đó. Không tạo undo entry nếu giá trị không đổi (idempotent).
- `_renderShapesLayer()`: áp `el.style.alignItems` (`flex-start`/`center`/`flex-end`) theo `textVAlign`.
- `_textDirectionCss(direction)`: sinh CSS `writing-mode` cho phần tử text bên trong — `vertical-rl` (90°), `vertical-rl` + `rotate(180deg)` (270°, mẹo lật chiều đọc mà vẫn giữ đúng hướng ký tự), `vertical-lr` + `text-orientation:upright` (xếp chồng, không xoay ký tự).

### 3.3 Serialize/Parse FODP (`adapters/libreoffice/slides/slides-adapter.js`)

- `_shapeTextStyleSuffix(shape)`: hậu tố tên style CHỈ khi khác mặc định — giữ nguyên tên style cũ (`gr3b82f6`...) cho trường hợp phổ biến, tránh phá vỡ fixture/test cố định tên style có sẵn.
- `_textStyleGraphicAttrs(shape)`: sinh `draw:textarea-vertical-align` (ODF chuẩn, 1:1) + `style:writing-mode` (ODF chỉ có `tb-rl`/`tb-lr` — không đủ 3 giá trị phân biệt cho vertical/vertical270/stacked) + `vno:text-direction` riêng (thuộc tính mở rộng private, giữ ĐÚNG Ý ĐỊNH gốc cho round-trip nội bộ VN Office, giống hệt tiền lệ `vno:page-*` ở bản sửa Sheet Page Setup).
- `_serializeGraphicStyles()`: tách các hình có `textVAlign`/`textDirection` khác mặc định vào một style riêng (`namedStyles` map) thay vì gộp chung theo màu như bình thường.
- `_parseGraphicFillStyles()`/`_parseDrawShape()`/`_parseFrameShape()`: đọc lại `draw:textarea-vertical-align`/`style:writing-mode`/`vno:text-direction` từ style tham chiếu, ưu tiên `vno:text-direction` (chính xác tuyệt đối) rồi mới suy ra từ `writing-mode` chuẩn khi mở file ngoài không có thuộc tính riêng này.

### 3.4 Ribbon: 2 dropdown mới trong nhóm Đoạn văn (Home)

Đặt CẠNH hàng canh trái/giữa/phải/đều — đúng vị trí thật của PowerPoint (nhóm Paragraph, không phải nhóm Arrange của GAP-SLIDES-01/02/03, vì đây là căn VĂN BẢN trong khung chữ, không phải căn ĐỐI TƯỢNG trên trang). 7 icon SVG mới, không tái dùng icon căn đối tượng đã có (khác khái niệm).

### 3.5 UNO thật

`.uno:TextVertAnchorTop/Center/Bottom`, `.uno:TextdirectionLeftToRight`, `.uno:TextdirectionTopToBottom` — LibreOffice không có lệnh UNO riêng cho vertical270/stacked (chỉ có toggle nhị phân), 2 lệnh này chỉ có app-command, không có UNO mapping (giống "Căn theo trang chiếu" ở tính năng trước).

## 4. Kết quả kiểm thử

- `node scripts/check-syntax.js`: 88/88 PASS.
- `node tests/run-tests.js`: **1403/1403 PASS** (1396 nền + 7 test mới trong suite 128 "VN Slides Text Vertical Align & Direction (GAP-SLIDES-05/06)"): khai báo lệnh + UNO, vị trí ribbon đúng nhóm, áp dụng nhiều hình + loại trừ hình không hợp lệ, Undo/Redo đúng (kể cả khôi phục về `undefined` ban đầu), không tạo undo entry khi giá trị không đổi, CSS `align-items` đúng theo từng giá trị, round-trip FODP chính xác cho cả 3 giá trị vAlign + 4 giá trị direction, không ghi thuộc tính thừa cho hình mặc định.
- `node tests/live/ribbon-audit-1280.playwright.mjs`: **100% PASS** — 26/26 tab, 0px tràn ngang.
- `node tests/live/slides-text-vertical-direction.playwright.mjs` (mới — trình duyệt thật): mở cả 2 dropdown thật, bấm lệnh thật, xác nhận `shape.textVAlign`/`textDirection` VÀ CSS DOM thật (`align-items`, `writing-mode`) đổi đúng, một lần Ctrl+Z hoàn tác đúng.
- Đánh giá thiết kế trực quan (screenshot Playwright thật ở 1600px): 2 dropdown đặt đúng vị trí, nhãn tiếng Việt rõ ràng ("Căn lề trên/giữa/dưới", "Ngang/Xoay chữ 90°/270°/Xếp chồng"), icon dễ phân biệt ở kích thước nhỏ, không chồng lấn hay lộn xộn.

---
Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NQAtxPSqMH9cVDTLUuckNw
