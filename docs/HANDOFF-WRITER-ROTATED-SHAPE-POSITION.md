# HANDOFF: VN Writer — Vị trí hình/text box bị xoay trong file DOCX thật

## Tóm tắt
Sửa lỗi vị trí hình bị xoay trong VN Writer: khi file DOCX thật có hình/text
box bị XOAY, soffice ghi vị trí qua `draw:transform="rotate(...) translate(...)"`
thay vì `svg:x`/`svg:y`. Code cũ đọc thẳng `svg:x`/`svg:y` khiến mọi hình
xoay luôn về (0,0).

## Vấn đề
- `_fodtShapeFromNode()`: đọc `svg:x`/`svg:y` không kiểm tra `draw:transform`
- `_fodtTextBoxFromFrame()`: cùng lỗi — text box có `draw:transform` cũng về (0,0)

## Giải pháp
Viết 1 hàm helper chung `_fodtParseDrawTranslate(attrs)` trong `writer-adapter.js`:
- Parse `draw:transform` hoặc `svg:transform` bằng regex
- Trích xuất giá trị `translate(xcm ycm)` từ chuỗi (xử lý cả khoảng trắng
  giữa `translate` và dấu ngoặc — định dạng soffice thật ghi ra)
- Xử lý số âm (translate có thể có giá trị âm)
- Fallback về `svg:x`/`svg:y` khi không có transform

Cả `_fodtShapeFromNode` và `_fodtTextBoxFromFrame` đều dùng chung helper này.

## Files thay đổi
- `adapters/libreoffice/writer/writer-adapter.js`: thêm `_fodtParseDrawTranslate()`,
  sửa `_fodtShapeFromNode()` (dòng ~5358) và `_fodtTextBoxFromFrame()` (dòng ~5626)
- `tests/unit/writer-fodt-rotated-shape-position.test.js`: 8 unit tests mới
  (4 cho `_fodtParseDrawTranslate`, 4 cho `parseFodt` integration)
- `tests/live/writer-rotated-shape-position-real-conversion.mjs`: 2 live tests
  (soffice thật → DOCX xoay → FODT → parseFodt → xác nhận vị trí)
- `tests/run-tests.js`: đăng ký test mới

## Kiểm thử
- `node scripts/check-syntax.js`: 89/89 PASS
- `node tests/run-tests.js`: 1488/1488 PASS (tăng +8 từ test mới)
- Live test yêu cầu soffice thật (LibreOffice)

## Phạm vi KHÔNG sửa
- Không thêm hiển thị góc xoay (chỉ sửa vị trí)
- Không đụng slides-adapter.js
- Không đụng OOXML_SHAPE_TYPE_MAP mới merge
