# HANDOFF: VN Writer — Mở file DOCX thật có ảnh neo nổi bị ném lỗi, hỏng cả file

## Bối cảnh phát hiện

Tiếp nối yêu cầu kiểm thử trực tiếp bằng file thật (đã làm cho VN Sheet:
xem `docs/HANDOFF-SHEET-IMAGE-IMPORT-EXPORT.md` và
`docs/HANDOFF-SHEET-IMAGE-RENDER-ON-OPEN` — không có file test Word thật
nào có ảnh nhúng trong `file test/`, nên xác minh trực tiếp qua vòng
soffice thật (cùng phương pháp đã dùng suốt phiên làm việc): tạo DOCX
chuẩn OOXML có ảnh, convert qua `soffice`, gọi `WriterAdapter.parseFodt()`
trực tiếp trên FODT thật.

## Nguyên nhân gốc

`writer-adapter.js` đã hỗ trợ `draw:image` từ trước (khác Sheet), nhưng
`imageHtml()` (dòng ~6740) CHỈ chấp nhận `text:anchor-type="as-char"` —
đúng bằng kiểu neo mà chính VN Writer tự ghi khi người dùng chèn ảnh qua
UI của mình (`insertImage`-style, luôn `as-char`).

Vấn đề: ảnh **neo nổi** (floating — Word dùng `wp:anchor` thay vì
`wp:inline`, rất phổ biến cho logo/letterhead có chữ chạy quanh, khác ảnh
chèn thẳng vào dòng) khi soffice convert DOCX→FODT lại ghi
`text:anchor-type="char"` (đã xác nhận qua probe soffice thật, xem test
mới). Trước đây gặp giá trị này, `imageHtml()` **ném lỗi ngay lập tức**:

```
Writer FODT Phase A không hỗ trợ nội dung này: draw:frame anchor-type 'char' (Phase B chỉ hỗ trợ as-char)
```

Vì đây là lỗi ném ra giữa lúc dựng HTML của TOÀN BỘ tài liệu (không phải
lỗi cục bộ chỉ mất 1 ảnh), hậu quả là **cả file DOCX không mở được** —
nghiêm trọng hơn nhiều so với lỗi ảnh-bị-mất-âm-thầm đã sửa ở Sheet.

## Giải pháp

Kiến trúc hiện tại đặt MỌI `draw:frame` (bất kể anchor-type) ngay trong
luồng nội dung đoạn văn (`inlineNodeHtml` → `frameHtml` → `imageHtml`),
không có cơ chế định vị nổi/chữ-chạy-quanh (float/absolute positioning)
nào trong DOM model của Writer. Vì vậy, việc "hỗ trợ đầy đủ" ảnh neo nổi
đúng nghĩa (giữ đúng vị trí tuyệt đối + hiệu ứng chữ chạy quanh) sẽ là một
tính năng kiến trúc lớn, ngoài phạm vi một bản vá lỗi.

Thay vào đó, đã mở rộng danh sách `text:anchor-type` được chấp nhận từ chỉ
`["as-char"]` thành `["as-char", "char", "paragraph"]` (2 kiểu neo nổi phổ
biến nhất của Word thật) — đặt ảnh **inline tại đúng vị trí đó trong luồng
văn bản**. Đánh đổi: mất hiệu ứng chữ chạy quanh + vị trí nổi chính xác,
nhưng:
- KHÔNG mất ảnh (vẫn hiển thị).
- KHÔNG mất nội dung văn bản khác trong tài liệu.
- File MỞ ĐƯỢC thay vì báo lỗi toàn bộ.

Anchor-type thực sự chưa hỗ trợ (ví dụ `"page"` — neo theo trang, hiếm gặp
hơn) vẫn bị từ chối rõ ràng (ném lỗi có thông báo), không âm thầm bỏ qua —
giữ nguyên triết lý "fail loud" của phần còn lại của parser cho các
trường hợp thực sự chưa xử lý được.

## Kiểm thử

- `node scripts/check-syntax.js`: 89/89 PASS.
- `node tests/run-tests.js`: 1439/1439 PASS (thêm 3 test mới vào suite
  "111b. Writer FODT Phase B.2": chấp nhận anchor-type "char", chấp nhận
  "paragraph", vẫn từ chối anchor-type thật sự chưa hỗ trợ như "page").
- `node tests/live/ribbon-audit-1280.playwright.mjs`: 100% PASS, 26/26 tab.
- `node tests/live/writer-fodt-floating-image-real-conversion.mjs` (mới):
  tạo DOCX chuẩn OOXML có ảnh neo nổi (`wp:anchor` + `wrapSquare`) →
  convert qua soffice thật → xác nhận FODT thật ghi
  `text:anchor-type="char"` → `parseFodt()` mở đúng, ảnh hiển thị, văn bản
  trước/sau không mất — PASS.

## Việc chưa làm (ghi nhận, không thuộc phạm vi)

- Chưa xây dựng kiến trúc định vị nổi/chữ-chạy-quanh thật cho ảnh trong
  Writer (float/absolute positioning + text wrap CSS) — đây là tính năng
  lớn riêng, không phải bản vá lỗi mở-file. Ảnh neo nổi hiện hiển thị
  ĐÚNG nội dung nhưng SAI vị trí tương đối/không có chữ chạy quanh.
- Chưa kiểm tra `text:anchor-type="page"` (neo theo trang tuyệt đối) có
  thực sự xuất hiện trong file Word thật hay không — hiện vẫn bị từ chối
  có chủ đích (rơi vào nhánh lỗi rõ ràng, không mất dữ liệu âm thầm).
