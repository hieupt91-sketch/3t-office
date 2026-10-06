# Audit VN Writer: số trang hiển thị so với Word thật — 06/10/2026

Phương pháp: mở từng DOC/DOCX bằng `launchApp('writer', { filePath })`; đợi body nạp và `_livePageCount` hợp lệ, chờ thêm 4 giây rồi đọc `_livePageCount` qua CDP. Số Word lấy từ `E:\VNOffice-profiles\word-pages-originals.tsv` (đo Word thật); bỏ `d10.docx` theo yêu cầu. Không lưu/chỉnh tài liệu corpus.

Kết quả: 42/43 khớp tuyệt đối (97.7%); 1 tài liệu lệch trên 1 trang; 0 lỗi/thiếu số đo. Mục tiêu: ≥90% khớp và không lệch quá 1 trang.

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
| d24.docx | 16 | 18 | 18 | 2 |
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

Vị trí ngắt do bộ phân trang app ghi nhận (đoạn đầu trang, rút gọn):
- **d24.docx**: lệch +2; ngắt đầu trang trong app: “HỆ SINH THÁI NHÀ THÔNG MINH TOÀN DIỆN DỄ DÀNG CÀI ĐẶT CÂU CHUYỆN THƯƠNG HIỆU THIẾT KẾ ĐẸP VÀ CHU ĐÁO”; “········································ Ngắt mục (Ngắt mục (Trang tiếp theo)) ·····················”; “[khối không có chữ]”; “CAMERA G3 TÍCH HỢP HUB CAMERA G2H TÍCH HỢP HUB HUB M2 AQARA HUB - BỘ ĐIỀU KHIỂN TRUNG TÂM HUB M1S • ”; “HUB E1 KÍCH SÓNG WIFI AQARA HUB - BỘ ĐIỀU KHIỂN TRUNG TÂM • Kích thước: 108x30x8mm. • Hỗ trợ kết nối”; “• Zigbee 3.0 Giá liên hệ THẺ NFC KHOÁ CỬA THÔNG MINH D100 KHOÁ CỬA THÔNG MINH N100 KHOÁ CỬA THÔNG MI”; “KHOÁ CỬA THÔNG MINH”; “········································ Ngắt mục (Ngắt mục (Trang tiếp theo)) ·····················”; “[khối không có chữ]”; “CẢM BIẾN (CẦN CÓ AQARA HUB)”; “[khối không có chữ]”; “[khối không có chữ]”; “CÔNG TẮC (CẦN CÓ AQARA HUB) Có dây nguội Chú thích Ký hiệu CÔNG TẮC BA H1 CÔNG TẮC BA H1 CÔNG TẮC ĐÔ”; “CÔNG TẮC (CẦN CÓ AQARA HUB) CHUÔNG CỬA VIDEO G4 BÓNG ĐÈN LED T1 Ổ CẮM THÔNG MINH (EU) Ổ CẮM THÔNG MI”; “• Kích thước: 140.5x96x44mm. • Kích thước ống trượt: 25-32mm. • Tích hợp sẵn cảm biến ánh sáng. • Tố”; “[khối không có chữ]”; “Địa chỉ: 245A Trần Quang Khải, P. Tân Định, Quận 1, Tp. Hồ Chí Minh. Website: www.smartconnection.co”. Số trang tổng hợp không đủ xác định ngắt tương ứng của Word; cần đối chiếu trực quan hai bản tại các vị trí trên trước khi quy nguyên nhân font/khoảng cách/bảng/ảnh/header-footer. Chưa sửa mã khi chưa có bằng chứng vị trí ngắt tương ứng.

## Quyết định sửa mã

Chưa sửa `apps/writer`/`adapters/libreoffice/writer`: d24 có nhiều `Ngắt mục (Trang tiếp theo)`, khối trống có khả năng là ảnh neo và nội dung catalogue có bảng/ảnh. Word COM `GoTo(page)` mở tệp nhưng không đọc ra mốc chữ đáng tin cậy ở hầu hết đầu trang, vì nhiều trang bắt đầu bởi đối tượng không văn bản; chưa thể gán chính xác hai trang chênh cho font, khoảng cách, bảng, ảnh hay header/footer. Nơi nghi ngờ để điều tra tiếp: `WriterAdapter._recomputeLivePagination()` tại `adapters/libreoffice/writer/writer-adapter.js` (ước lượng khối và xử lý ngắt mục/ảnh/bảng). Không sửa mã khi chưa có bằng chứng vị trí ghép cặp. Không có thay đổi tính năng UI; hướng dẫn/i18n không phát sinh.

Handoff: kết quả và lệnh tái chạy nằm trong ticket D21; corpus chỉ đọc. Trạng thái kiểm chứng: phép đo thực thi bởi script này; bảng ghi riêng từng tài liệu.
