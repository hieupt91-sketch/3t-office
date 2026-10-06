# Đối chiếu Word thật (06/10/2026)

Phương pháp: Word 16 điều khiển qua COM (ẩn, tuần tự, mỗi tệp một tiến trình), hộp thoại "Word không phải chương trình mặc định" tự đóng bằng thông điệp cửa sổ (`scripts/audit-0610/word_dialog_dismisser.ps1`). Số trang = `Content.Information(4)` ở bố cục in. (Bản đầu dùng `ComputeStatistics(2)` trong cửa sổ ẩn ở chế độ đọc nên đếm gấp đôi — đã bỏ.)

Quy trình: 44 tài liệu thật (24 `.docx` + 20 `.doc`) → đo số trang/số từ bản gốc bằng Word → mở bằng app thật, đợi tải xong, lưu (`saveRealFileInPlace`) → mở bản lưu bằng Word và đo lại. `d10.docx` là tệp PDF mang đuôi `.docx` nên loại.

| Chỉ tiêu | Kết quả |
|---|---|
| Bản gốc: Word = LibreOffice về số trang | 41/43 (`d01`: Word 19 / LO 20; `d20`: Word 3 / LO 4) |
| Bản app lưu **mở được trong Word** | 42/43 lúc đầu; **43/43 sau sửa** (`legacy13` bị Word từ chối: `<wp:wrapSquare/>` thiếu `wrapText`) |
| Số trang bản lưu = số trang bản gốc (Word) | **43/43** (sau sửa `legacy13`: 1 = 1; LibreOffice báo 2 là sai khác riêng của LibreOffice) |
| Số từ bản lưu = bản gốc (Word) | 40/42 trùng tuyệt đối; 2 tệp lệch 1 từ (`legacy06` +1, `legacy20` +1) |

Lỗi thật tìm được nhờ bước này: tài liệu `.doc` có ảnh bao chữ khi lưu ra DOCX mà **Word không mở được** (phần tử `wp:wrapSquare` thiếu thuộc tính bắt buộc). Đã sửa ở `ooxml_zip_patch.py` (giữ nguyên phần tử bao chữ gốc + lưới an toàn schema) kèm test.

Tái chạy: `node --experimental-websocket scripts/audit-0610/doc_corpus_save_all.mjs <thư-mục>`, `powershell -File scripts/audit-0610/word_pages_folder.ps1 -Dir <thư-mục> -Out <tsv>`, `powershell -File scripts/audit-0610/word_pages_batch.ps1 -Out <tsv>`.

Giới hạn trung thực: đây là số trang **sau khi mở bản lưu trong Word**, so với bản gốc trong Word; chưa so từng dòng ngắt trang, và hiển thị trong app (số trang trực tiếp) chưa đối chiếu với Word cho 44 tệp.
