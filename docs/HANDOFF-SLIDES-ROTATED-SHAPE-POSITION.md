# HANDOFF: VN Slides — Vị trí hình bị xoay trong PPTX thật bị đọc sai (dồn về 0,0)

## Bối cảnh phát hiện

Tiếp nối chuỗi kiểm thử hình ảnh trong file thật (Sheet: xem
`HANDOFF-SHEET-IMAGE-IMPORT-EXPORT.md` +
`HANDOFF-SHEET-IMAGE-RENDER-ON-OPEN`; Writer: xem
`HANDOFF-WRITER-IMAGE-ANCHOR-TYPE-CRASH.md`). Đánh giá sâu code Slides cho
thấy `slides-adapter.js` đã hỗ trợ `draw:image` khá trưởng thành (có sẵn
comment ghi nhận các bẫy đã gặp khi test với soffice thật: poster-image
che khuất bảng/media). Xác minh thêm bằng cách tạo PPTX chuẩn OOXML có ảnh
XOAY 45° + CẮT (crop) — rất phổ biến trong slide thật (ảnh chụp xoay, khối
trang trí chéo) — convert qua soffice thật, gọi `parseFodp()` trực tiếp.

## Nguyên nhân gốc (2 lỗi lồng nhau)

**Lỗi 1**: `_parseFrameShape()` (dòng ~1890) tính `base.x`/`base.y` TRỰC
TIẾP từ `svg:x`/`svg:y`. Nhưng khi soffice convert một hình BỊ XOAY, nó ghi
vị trí qua `draw:transform="rotate(...) translate(...)"` — `svg:x`/`svg:y`
**HOÀN TOÀN VẮNG MẶT** trong trường hợp này (xác nhận qua probe soffice
thật). Kết quả: mọi hình bị xoay luôn hiển thị ở góc (0,0) thay vì đúng vị
trí thật.

**Lỗi 2 (ẩn sâu hơn, phát hiện khi sửa lỗi 1)**: file đã có sẵn hàm
`_parseDrawTranslate()` xử lý CHÍNH XÁC trường hợp này — nhưng vốn CHỈ
được dùng cho `<draw:g>` (nhóm SmartArt, `_extractDrawGroups()`), CHƯA BAO
GIỜ được gọi từ `_parseFrameShape()`. Khi thử gọi nó cho ảnh, vẫn trả về
(0,0) — vì bản thân `_parseDrawTranslate()` CŨNG CÓ BUG: regex của nó yêu
cầu `translate(` liền nhau, nhưng soffice thật ghi
`translate (5.318cm 1.726cm)` — **CÓ khoảng trắng** giữa tên hàm và dấu
ngoặc — nên regex không bao giờ khớp, luôn rơi về nhánh dự phòng
svg:x/svg:y (vắng mặt) → vẫn (0,0). Điều này nghĩa là NHÓM SmartArt xoay
(nếu có) CŨNG đã bị lỗi này từ trước, chỉ là chưa có fixture test nào có
SmartArt bị xoay để lộ ra.

## Giải pháp

1. `_parseFrameShape()`: thay `x: this._odfLengthToPx(get("svg:x"))` /
   `y: ...svg:y...` bằng `const origin = this._parseDrawTranslate(attrs)`
   rồi `x: origin.x, y: origin.y` — tái sử dụng hàm đã có sẵn, đúng mẫu
   đã dùng cho `<draw:g>`.
2. `_parseDrawTranslate()`: sửa regex từ `/translate\(.../ ` thành
   `/translate\s*\(.../ ` — chấp nhận khoảng trắng tùy chọn trước dấu
   ngoặc, khớp đúng định dạng soffice thật ghi ra. Vẫn tương thích ngược
   với định dạng không khoảng trắng (dùng dấu phẩy, không gặp trong thực
   tế nhưng test riêng xác nhận không thoái lui).

## Phạm vi KHÔNG sửa (có chủ đích)

- **Góc xoay (rotation)**: `apps/slides/slides-canvas.js` KHÔNG có bất kỳ
  cơ chế render nào cho thuộc tính xoay của shape (grep xác nhận 0 kết
  quả cho `shape.rotation`). Thêm trường `rotation` vào data model mà
  không có tầng render tương ứng là dữ liệu chết — đây là một tính năng
  kiến trúc riêng, lớn hơn nhiều so với phạm vi bản vá vị trí này. Ảnh
  xoay hiện hiển thị ĐÚNG VỊ TRÍ nhưng KHÔNG XOAY (giữ nguyên hạn chế cũ
  về hiển thị góc xoay, chỉ sửa phần vị trí bị sai hoàn toàn).
- **Cắt ảnh (crop)**: `a:srcRect` trong PPTX gốc — chưa kiểm tra riêng có
  được bảo toàn qua vòng soffice hay không; ngoài phạm vi bản vá này.

## Kiểm thử

- `node scripts/check-syntax.js`: 89/89 PASS.
- `node tests/run-tests.js`: 1443/1443 PASS (suite mới "131. Unit Tests —
  VN Slides: vị trí hình bị xoay trong PPTX thật", 4/4 PASS: vị trí ảnh
  xoay đúng, kích thước không đổi, `_parseDrawTranslate()` khớp cả 2 định
  dạng có/không khoảng trắng, shape KHÔNG xoay vẫn đúng như trước).
- `node tests/live/ribbon-audit-1280.playwright.mjs`: 100% PASS, 26/26 tab.
- `node tests/live/slides-smartart-import-real-conversion.mjs`: PASS
  (xác nhận không thoái lui — cùng đường code `_parseDrawTranslate`/
  `_extractDrawGroups` mà SmartArt phụ thuộc).
- `node tests/live/slides-rotated-shape-position-real-conversion.mjs`
  (mới): tạo PPTX thật có ảnh xoay 45° + cắt → convert qua soffice thật →
  xác nhận FODP thật ghi `draw:transform` (không có `svg:x`) →
  `parseFodp()` đọc đúng vị trí (không phải 0,0) — PASS.
