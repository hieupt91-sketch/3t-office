# HANDOFF: main.py — bỏ qua ảnh đường kẻ trang trí 1px làm vỡ dòng chữ

## Bối cảnh

Phát hiện bởi agy khi mở rộng QA thị giác luồng Mở file thật sang toàn
bộ 15 file `.docx` thật (`docs/HANDOFF-WRITER-LIVE-OPEN-PATH-VISUAL-QA.md`,
"Vấn đề kiến trúc 3"), trên file `1. QĐ thành lập TỔ MUA SẮM.docx`:
tiêu đề hiển thị `"P HÒNG KINH TẾ"` và `"C ỘNG HOÀ XÃ"` — có khoảng
trắng lạ ngay sau chữ cái đầu tiên.

## Nguyên nhân

Word có công cụ vẽ "đường kẻ ngang trang trí" (Insert Shapes → Line),
thường dùng để gạch chân/nhấn tiêu đề. Khi LibreOffice StarWriter xuất
HTML, các đường kẻ này thành `<img>` GIF **THẬT SỰ chỉ 1px cao** (xác
nhận qua đọc trực tiếp header GIF, không phải đoán từ thuộc tính HTML
`width`/`height` — ví dụ `126x1`, `203x1`), với `align="left"` (float).

Vị trí anchor trong luồng HTML giữ nguyên đúng vị trí ký tự trong văn
bản gốc — với các file này, đường kẻ nằm NGAY SAU chữ cái đầu tiên của
từ đầu tiêu đề (`<b>P<img ... align="left" ...>HÒNG KINH TẾ</b>`). Ảnh
float 1px này làm vỡ luồng dòng chữ (line box), tạo khoảng trắng nhìn
thấy được giữa "P" và "HÒNG" dù ảnh gần như vô hình.

## Giải pháp

Thêm `_probe_pixel_dimensions()` (đọc kích thước pixel THẬT từ header
GIF/PNG, không tin thuộc tính HTML) và `_is_decorative_hairline_image()`
(kích thước THẬT có 1 chiều ≤2px VÀ chiều còn lại ≥10px — hình dạng
đường kẻ, không phải icon nhỏ) vào `main.py`. Trong
`_inline_html_images()`, khi phát hiện ảnh hairline, **bỏ qua hoàn
toàn** (không nhúng thành data URI) thay vì giữ lại — đường kẻ trang
trí này không mang thông tin, và giữ lại chỉ để vỡ dòng chữ.

**Cố ý KHÔNG** áp dụng cho ảnh vuông nhỏ (ví dụ icon 16×16, hay ảnh
1×1 pixel thật — cả 2 chiều đều <10px, không khớp "hình dạng đường
kẻ") — tránh xóa nhầm ảnh thật. Xác nhận qua file thật
`hợp đồng sửa chữa 3T- UBXQT.docx`: 3/4 shape (đường kẻ dài thật, ví
dụ 190×1/199×1/197×1) bị bỏ qua đúng như kỳ vọng, còn 1/4 shape (đúng
1×1 pixel thật) vẫn giữ lại — không ảnh hưởng thị giác (1px không tạo
khoảng trắng nhìn thấy được) nên giữ lại là an toàn, không cần xóa.

## Kiểm thử

- Thêm 2 test vào `tests/test_mainpy_image_inline.py`:
  `test_decorative_hairline_gif_is_dropped_not_inlined` (đường kẻ
  126×1 giữa "P" và "HÒNG" → bỏ qua, kết quả là `"<b>PHÒNG</b>"` liền
  mạch) và `test_small_square_gif_is_still_inlined_not_treated_as_hairline`
  (icon vuông 16×16 vẫn nhúng bình thường, không bị xóa nhầm).
- `python -m unittest discover -s tests -p "test_*.py"`: **96/96 PASS**
  (toàn bộ suite Python, không hồi quy).
- `node scripts/check-syntax.js`: 89/89 PASS.
- `node tests/run-tests.js`: 1511/1511 PASS.
- Xác nhận trực tiếp trên file thật từng lỗi
  (`1. QĐ thành lập TỔ MUA SẮM.docx`, gọi thật
  `main.VnOfficeApi.open_document_dialog()`): `"PHÒNG"` giờ liền một
  từ, không còn thẻ `<img>` nào sót lại (cả 2 đường kẻ trang trí của
  file này đều bị bỏ qua đúng).
- Quét lại cả 8 file gốc trong batch QA: không file nào bị mất ảnh
  THẬT (chỉ mất đúng các shape hairline).
