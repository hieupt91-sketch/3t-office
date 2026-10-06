# Audit D22: Word IF và REF trong DOCX

Ngày: 2026-10-06  
Nhánh: `feat/writer-if-ref-fields-codex`

## Mục tiêu và cách làm

DOCX của VN Writer cần giữ quy tắc trộn thư dưới dạng trường Word `IF { MERGEFIELD ... } ...` và tham chiếu chéo nội bộ dưới dạng `REF <bookmark> \\h`. Tái sử dụng pipeline postprocess OOXML đang áp dụng cho merge field và caption; không sửa LibreOffice Core, không thêm dependency.

`postprocess_writer_if_ref_fields` đọc marker `data-merge-if` và anchor `vno-cross-ref` trong `source_html`, sau khi LibreOffice tạo DOCX. Bộ so khớp hỗ trợ `equals` (`=`), `notEquals` (`<>`), `greaterThan` (`>`), `lessThan` (`<`), `empty` (`= ""`) và `notEmpty` (`<> ""`). Literal và nội dung kết quả được escape cho XML/field code. Tham chiếu có anchor nội bộ chuyển thành `REF <anchor> \\h`. Pipeline gọi postprocess sau merge field.

## Hướng dẫn trong ứng dụng

Help Catalog Writer có mục “Lưu quy tắc trộn thư và tham chiếu trong DOCX”, gắn với lệnh Quy tắc và Tham chiếu chéo. Mục hướng dẫn nêu tab Trộn thư > Quy tắc, tab Tham chiếu > Chú thích ảnh > Tham chiếu chéo, cách lưu DOCX, và phím F9 / Ctrl+A rồi F9 trong Word. Tooltip VI/EN của hai lệnh cũng nhắc loại trường Word tương ứng.

## Bằng chứng

| Kiểm tra | Trạng thái | Kết quả |
|---|---|---|
| `python -m unittest tests.test_writer_notes_export -v` | PASS | 24/24; gồm các toán tử, giá trị rỗng, quote/XML escaping, fallback lẫn trong run và REF tới bookmark. |
| CDP tạo nội dung trong Writer và gọi `saveRealFileInPlace` | BLOCKED | App trong harness không có `pywebview`/LibreOffice thật; bridge trả `Chức năng Lưu tệp thật chỉ khả dụng trong 3T Office bản cài trên máy.` Script `scripts/audit-0610/doc_if_ref_roundtrip.mjs` đã được thêm để chạy trong bản desktop. |
| Mở gói DOCX đã patch bằng Microsoft Word thật qua `word_inspect_features.ps1` | PASS | Word đọc được; `fields="7x1,3x1"` (wdFieldIf=7 ×1, wdFieldRef=3 ×1), bookmark `D22Heading`, 1 trang. Fixture tạo từ bản sao corpus chỉ đọc, không sửa corpus. |
| `Fields.Update` bằng Word COM | BLOCKED | Lệnh COM không trả kết quả trong thời gian chờ; đã dừng phiên PowerShell automation riêng. Chưa kết luận update pass. |
| E2E CDP lưu DOCX từ desktop cài đặt rồi Word mở lại | NOT RUN | Bản desktop không có trong môi trường hiện tại; chưa đo được yêu cầu này theo đúng luồng app. |

## Giới hạn và rủi ro còn lại

- UI còn toán tử `contains`; Word IF không có toán tử chứa trực tiếp nên postprocess không chuyển toán tử này và để nội dung xuất gốc nguyên trạng. Các toán tử được yêu cầu trong D22 đã được ánh xạ.
- Cần chạy lại script CDP trên bản VN Office desktop có LibreOffice, sau đó mở đúng file app lưu bằng Word; xác nhận `Fields.Update` không lỗi và số trường đúng. Không claim hoàn tất kiểm chứng desktop cho tới khi có kết quả đó.

## Rollback

Gỡ lời gọi `postprocess_writer_if_ref_fields` trong `main.py`, helper tương ứng trong `ooxml_zip_patch.py`, test, mục Help và tooltip. Không cần rollback dữ liệu người dùng hay thay đổi Core.
