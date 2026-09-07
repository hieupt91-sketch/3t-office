# HANDOFF: main.py `_inline_html_images()` — thiếu `unquote()` làm vỡ ảnh nhúng

## Bối cảnh

Phát hiện bởi agy khi kiểm tra thị giác luồng Mở file THẬT của Writer
(`docs/HANDOFF-WRITER-LIVE-OPEN-PATH-VISUAL-QA.md`, mục "Vấn đề kiến
trúc 1"), trên file thật `hợp đồng sửa chữa 3T- UBXQT.docx`: cả 4 ảnh
shape trong file đều hiển thị lỗi (`broken image`, `naturalWidth: 0`).

## Nguyên nhân

`main.py`, hàm `_inline_html_images()` (~dòng 483), dòng cũ:
```python
decoded = html.unescape(src)
```

LibreOffice StarWriter HTML export ghi `src` của ảnh sidecar dưới dạng
URL-encoded khi tên tệp gốc (thường trùng tên file .docx + hậu tố) có
ký tự tiếng Việt/khoảng trắng — ví dụ:
```
src="h%E1%BB%A3p%20%C4%91%E1%BB%93ng%20s%E1%BB%ADa%20ch%E1%BB%AFa%203T-%20UBXQT_html_b19bf31e.gif"
```
Trong khi tệp thật trên đĩa Windows lại giữ nguyên tên Unicode:
`hợp đồng sửa chữa 3T- UBXQT_html_b19bf31e.gif`.

`html.unescape()` chỉ giải mã thực thể HTML (`&amp;`, `&lt;`...),
**không** giải mã phần trăm URL-encode — nên `decoded` vẫn giữ nguyên
chuỗi `%E1%BB%A3p%20...`, khiến `os.path.isfile(candidate)` luôn `False`
cho cả 3 candidate path. Ngay sau đó `tempfile.TemporaryDirectory` của
`open_document_dialog()` tự xóa thư mục tạm — ảnh vĩnh viễn không nhúng
được, thẻ `<img>` trỏ tới đường dẫn đã bị xóa.

**Tác động thật**: MỌI tệp Word có ảnh, mà tên tệp gốc chứa dấu tiếng
Việt hoặc khoảng trắng (cực kỳ phổ biến — hầu hết văn bản hành chính
Việt Nam đặt tên tiếng Việt), khi mở qua luồng Mở file thật của Writer
đều mất TOÀN BỘ ảnh nhúng.

## Giải pháp

Thêm `urllib.parse.unquote()` sau `html.unescape()`:
```python
from urllib.parse import urlencode, unquote
...
decoded = unquote(html.unescape(src))
```
Thứ tự đúng: giải mã thực thể HTML trước (một số bộ xuất có thể escape
`%` trong ngữ cảnh HTML — dù hiếm), rồi giải mã phần trăm URL sau, khớp
đúng cách trình duyệt/thư viện chuẩn xử lý `src` tương đối.

## Kiểm thử

- `tests/test_mainpy_image_inline.py`: thêm
  `test_percent_encoded_vietnamese_filename_is_decoded_before_join`
  (tái tạo chính xác chuỗi URL-encode thật từ file lỗi, xác nhận file
  sidecar tên Unicode được tìm thấy và nhúng đúng thành data URI).
- `python -m unittest discover -s tests -p "test_*.py"`: **94/94 PASS**
  (toàn bộ suite Python, không hồi quy — bao gồm cả test tích hợp thật
  dùng soffice `test_real_docx_html_has_data_uri_not_sidecar_path`).
- `node scripts/check-syntax.js`: 89/89 PASS (không đổi, đây là thay
  đổi Python thuần).
- `node tests/run-tests.js`: 1505/1505 PASS (1 lần chạy đầu bị 1 FAIL
  không liên quan do flaky, chạy lại PASS 100%).

## Xác nhận trên file thật

Chạy lại `scripts/generate_live_open_payloads.py` (script agy để lại,
gọi trực tiếp `main.VnOfficeApi.open_document_dialog()` — đúng luồng
production thật) trên `hợp đồng sửa chữa 3T- UBXQT.docx`: 4/4 ảnh giờ
nhúng thành `data:image/gif;base64,...` thay vì thẻ `<img>` trỏ đường
dẫn đã xóa.
