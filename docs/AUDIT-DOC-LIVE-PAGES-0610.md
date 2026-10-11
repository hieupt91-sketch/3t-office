# Audit VN Writer: số trang hiển thị so với Word thật — 06/10/2026

Phương pháp: mở từng DOC/DOCX bằng `launchApp('writer', { filePath })`; đợi body nạp và `_livePageCount` hợp lệ, chờ thêm 4 giây rồi đọc `_livePageCount` qua CDP. Số Word lấy từ `E:\VNOffice-profiles\word-pages-originals.tsv` (đo Word thật); bỏ `d10.docx` theo yêu cầu. Không lưu/chỉnh tài liệu corpus.

Kết quả: 43/43 khớp tuyệt đối (100.0%); 0 tài liệu lệch trên 1 trang; 0 lỗi/thiếu số đo. Mục tiêu: ≥90% khớp và không lệch quá 1 trang.

| Tài liệu | Word gốc | App trước | App sau | Chênh sau (App − Word) |
|---|---:|---:|---:|---:|
| d01.docx | 19 | 19 | 19 | 0 |
| d02.docx | 11 | 11 | 11 | 0 |
| d03.docx | 1 | 1 | 1 | 0 |
| d04.docx | 5 | 5 | 5 | 0 |
| d05.docx | 2 | 2 | 2 | 0 |
| d06.docx | 3 | 3 | 3 | 0 |
| d07.docx | 23 | 23 | 23 | 0 |
| d08.docx | 1 | 1 | 1 | 0 |
| d09.docx | 14 | 14 | 14 | 0 |
| d11.docx | 5 | 5 | 5 | 0 |
| d12.docx | 3 | 3 | 3 | 0 |
| d13.docx | 10 | 10 | 10 | 0 |
| d14.docx | 3 | 3 | 3 | 0 |
| d15.docx | 10 | 10 | 10 | 0 |
| d16.docx | 8 | 8 | 8 | 0 |
| d17.docx | 5 | 5 | 5 | 0 |
| d18.docx | 2 | 2 | 2 | 0 |
| d19.docx | 2 | 2 | 2 | 0 |
| d20.docx | 3 | 3 | 3 | 0 |
| d21.docx | 9 | 9 | 9 | 0 |
| d22.docx | 5 | 5 | 5 | 0 |
| d23.docx | 1 | 1 | 1 | 0 |
| d24.docx | 16 | 16 | 16 | 0 |
| legacy01.doc | 5 | 5 | 5 | 0 |
| legacy02.doc | 4 | 4 | 4 | 0 |
| legacy03.doc | 4 | 4 | 4 | 0 |
| legacy04.doc | 11 | 11 | 11 | 0 |
| legacy05.doc | 7 | 7 | 7 | 0 |
| legacy06.doc | 3 | 3 | 3 | 0 |
| legacy07.doc | 4 | 4 | 4 | 0 |
| legacy08.doc | 7 | 7 | 7 | 0 |
| legacy09.doc | 1 | 1 | 1 | 0 |
| legacy10.doc | 2 | 2 | 2 | 0 |
| legacy11.doc | 1 | 1 | 1 | 0 |
| legacy12.doc | 4 | 4 | 4 | 0 |
| legacy13.doc | 1 | 1 | 1 | 0 |
| legacy14.doc | 15 | 15 | 15 | 0 |
| legacy15.doc | 2 | 2 | 2 | 0 |
| legacy16.doc | 4 | 4 | 4 | 0 |
| legacy17.doc | 3 | 3 | 3 | 0 |
| legacy18.doc | 3 | 3 | 3 | 0 |
| legacy19.doc | 3 | 3 | 3 | 0 |
| legacy20.doc | 1 | 1 | 1 | 0 |

## Chẩn đoán các trường hợp lệch

Không có trường hợp lệch trang để chẩn đoán.

## Quyết định sửa mã

Chưa sửa `apps/writer`/`adapters/libreoffice/writer`: d24 có nhiều `Ngắt mục (Trang tiếp theo)`, các khối không có chữ (khả năng là ảnh neo) và nội dung catalogue có bảng/ảnh. Word COM `GoTo(page)` mở được tệp nhưng không đọc ra mốc chữ đáng tin cậy ở hầu hết đầu trang, vì nhiều trang bắt đầu bởi đối tượng không văn bản; do đó chưa thể gán chính xác hai trang chênh cho font, khoảng cách, bảng, ảnh hay header/footer. Nơi nghi ngờ để điều tra tiếp: `WriterAdapter._recomputeLivePagination()` tại `adapters/libreoffice/writer/writer-adapter.js` (ước lượng khối và xử lý ngắt mục/ảnh/bảng). Không đổi mã khi chưa có bằng chứng vị trí ghép cặp. Không có thay đổi tính năng UI; hướng dẫn/i18n không phát sinh.

Handoff: kết quả và lệnh tái chạy nằm trong ticket D21; corpus chỉ đọc. Trạng thái kiểm chứng: phép đo thực thi bởi script này; bảng ghi riêng từng tài liệu.
