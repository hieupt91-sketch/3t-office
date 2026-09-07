# HANDOFF: VN Writer — File DOCX thật có hình chữ nhật/elip/bo góc bị ném lỗi, hỏng cả file

## Bối cảnh phát hiện

Trong lúc điều tra riêng lỗi vị trí hình xoay ở Writer (nhánh `_fodtShapeFromNode`
cũng có cùng lớp lỗi svg:x/svg:y không kiểm tra `draw:transform` như đã sửa
ở Slides), phát hiện một lỗi KHÁC nghiêm trọng hơn nhiều, không liên quan
gì đến xoay: mở file DOCX thật có MỘT hình chữ nhật hoàn toàn bình thường
(không xoay, chèn qua "Insert Shapes" của Word — rất phổ biến trong văn
bản hành chính: khung nhấn mạnh, khung ghi chú) khiến **toàn bộ file
không mở được**.

## Nguyên nhân gốc

`_fodtShapeFromNode()` (dòng ~5358) xử lý `<draw:custom-shape>` với whitelist
CHỈ chấp nhận `draw:type="right-arrow"` — bất kỳ giá trị nào khác đều ném
lỗi ngay lập tức, làm hỏng toàn bộ quá trình dựng HTML tài liệu.

Xác nhận qua probe soffice thật (4 loại hình phổ biến: rect, ellipse,
triangle, diamond, roundRect): soffice **LUÔN LUÔN** ghi hình cơ bản từ
Word thật thành `<draw:custom-shape draw:enhanced-geometry draw:type=
"ooxml-<PrstGeomName>">` — KHÔNG BAO GIỜ dùng `<draw:rect>`/`<draw:ellipse>`
chuẩn ODF (đó là dạng CHỈ VN Writer tự ghi khi người dùng chèn hình qua
UI của chính mình). Mọi giá trị `ooxml-*` đều bị từ chối trước khi sửa.

## Giải pháp

Mở rộng whitelist để ánh xạ CHÍNH XÁC các kiểu `ooxml-*` có tương đương
trong model hình VN Writer đã hỗ trợ (`apps/writer/writer-illustrations.js`
chỉ có 4 type: `rectangle`, `round-rect`, `circle`, `arrow`, cộng `line`
riêng):

| OOXML `prstGeom` | soffice `draw:type` | VN Writer `type` |
|---|---|---|
| `rect` | `ooxml-rect` | `rectangle` |
| `roundRect` | `ooxml-roundRect` | `round-rect` |
| `ellipse` | `ooxml-ellipse` | `circle` |

**QUAN TRỌNG**: các kiểu hình KHÁC (xác nhận qua probe: `triangle` →
`ooxml-triangle`, `diamond` → `ooxml-diamond`) **VẪN BỊ TỪ CHỐI có chủ
đích** — VN Writer chưa có renderer cho tam giác/hình thoi trong
`writer-illustrations.js`, nên thay vì âm thầm vẽ sai (ví dụ ép một tam
giác hiển thị thành hình chữ nhật), giữ nguyên hành vi "fail loud" hiện
có cho các trường hợp thật sự chưa hỗ trợ.

## Kiểm thử

- `node scripts/check-syntax.js`: 89/89 PASS.
- `node tests/run-tests.js`: 1457/1457 PASS (thêm 3 test mới vào suite
  "111b. Writer FODT Phase B.2": chấp nhận `ooxml-rect`→rectangle, chấp
  nhận `ooxml-ellipse`→circle và `ooxml-roundRect`→round-rect, vẫn từ
  chối `ooxml-triangle` không có renderer).
- `node tests/live/ribbon-audit-1280.playwright.mjs`: 100% PASS.
- `node tests/live/writer-fodt-common-shape-types-real-conversion.mjs`
  (mới): 3 file DOCX thật (rect/ellipse/roundRect) → soffice thật → FODT
  → `parseFodt()` mở đúng, ánh xạ đúng type — PASS cả 3.

## Việc chưa làm (ghi nhận, không thuộc phạm vi)

- `triangle`, `diamond`, và các preset geometry OOXML khác (`star5`,
  `hexagon`, `pentagon`...) vẫn chưa mở được — cần thêm shape type mới
  vào `writer-illustrations.js` (renderer) TRƯỚC KHI có thể chấp nhận
  parse, việc đó ngoài phạm vi bản vá lỗi mở-file này.
- Vị trí hình xoay trong Writer (cùng lớp lỗi `svg:x`/`svg:y` không kiểm
  tra `draw:transform` như đã sửa ở Slides) — CHƯA sửa, ghi nhận riêng để
  đánh giá sau (Writer canvas cũng không có renderer cho rotation, tương
  tự giới hạn đã ghi nhận ở Slides trước khi thêm hiển thị góc xoay).
