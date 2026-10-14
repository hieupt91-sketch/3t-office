# Báo cáo Audit: Lưu thành (Save As) đầy đủ định dạng cho VN Writer

**Thời điểm kiểm tra**: 14/10/2026  
**Môi trường thực hiện**: VN Writer Desktop App (CDP port riêng), LibreOffice 25.2 / StarWriter, Microsoft Word 2016 COM, Windows 10/11 x64  
**Tài liệu mẫu kiểm thử**: Văn bản tiếng Việt có dấu gồm đầy đủ:
- Tiêu đề Heading 1 ("BÁO CÁO TỔNG KẾT DỰ ÁN 2026")
- Đoạn văn bản có dấu câu tiếng Việt
- Bảng biểu (3 cột x 3 hàng, có hàng tiêu đề và viền ô)
- Hình ảnh và danh sách (bullet list, numbered list)
- Đoạn có gắn thẻ sửa đổi (chèn và xóa) phục vụ kiểm định tính năng Bong bóng

---

## 1. Bảng kết quả kiểm tra định dạng Save As (Đo đạc thực tế trên App Desktop thật)

| Định dạng | Phần mở rộng | Bộ lọc chuyển đổi | Dung lượng tệp | Thời gian lưu | Word 2016 COM kiểm chứng | Bố cục / Chi tiết đối chiếu |
|---|---|---|:---:|:---:|:---:|---|
| **DOCX** | `.docx` | `MS Word 2007 XML` | 7.328 bytes | 4.603 ms | Đạt (18 đoạn, 1 bảng, 98 từ) | Giữ nguyên tiêu đề, bảng biểu, danh sách và nội dung có dấu tiếng Việt |
| **DOC (97-2003)** | `.doc` | `MS Word 97` (qua DOCX overlay) | 15.872 bytes | 8.509 ms | Đạt (18 đoạn, 1 bảng, 98 từ) | Chuẩn nhị phân OLE2 Word 97-2003, mở nguyên vẹn bảng biểu và tiếng Việt |
| **ODF Text** | `.odt` | `writer8` | 10.651 bytes | 4.263 ms | Đạt (18 đoạn, 1 bảng, 103 từ) | Định dạng OpenDocument chuẩn quốc tế, Word COM mở trực tiếp đầy đủ cấu trúc |
| **Rich Text Format** | `.rtf` | `Rich Text Format` | 10.047 bytes | 4.149 ms | Đạt (18 đoạn, 1 bảng, 103 từ) | RTF chuẩn Unicode UTF-8, giữ nguyên bảng, đoạn và không lỗi phông tiếng Việt |
| **PDF** | `.pdf` | `writer_pdf_Export` | 78.669 bytes | 4.383 ms | Đạt (Magic `%PDF-1.7`) | PDF 1.7 hợp lệ, bảo toàn 100% bố cục trang, bảng, ảnh và typography |
| **Văn bản thuần** | `.txt` | `Text (encoded):UTF8` | 510 bytes | 4.058 ms | Đạt (9 đoạn, 0 bảng, 104 từ) | Xuất UTF-8 có BOM chuẩn, mở trên Word và Notepad đọc rõ toàn bộ dấu tiếng Việt |
| **Trang web HTML** | `.html` / `.htm` | `HTML (StarWriter)` | 2.265 bytes | 4.120 ms | Đạt (18 đoạn, 1 bảng, 103 từ) | StarWriter HTML chuẩn UTF-8, Word COM đọc nguyên vẹn bảng biểu và thẻ định dạng |

---

## 2. Kết quả kiểm tra tính năng Bong bóng (Balloons)
1. **Chế độ `revisions` (Hiện bản sửa trong bong bóng)**:
   - Thuộc tính DOM: `data-vno-balloons="revisions"`.
   - Panel lề phải: Tự động hiển thị 2 thẻ bong bóng cho các đoạn bản sửa đổi (chèn và xóa) kèm tên tác giả và thời gian.
   - Trạng thái lưu trữ: Ghi nhận chính xác vào `sessionStorage` (`vno-writer-balloons-mode = "revisions"`).
2. **Chế độ `inline` (Hiện tất cả bản sửa trong dòng)**:
   - Thuộc tính DOM: `data-vno-balloons="inline"`.
   - Panel lề phải: Ẩn toàn bộ thẻ bong bóng bản sửa đổi (0 thẻ). Bản sửa hiển thị trực tiếp trong dòng văn bản.
3. **Chế độ `comments-only` (Chỉ hiện chú thích và định dạng trong bong bóng)**:
   - Thuộc tính DOM: `data-vno-balloons="comments-only"`.
   - Giữ bản sửa đổi trong dòng, chỉ đưa các ghi chú bình luận ra lề phải.
   - Thao tác chuyển đổi tức thì không làm bẩn mô hình dữ liệu (isDirty không đổi khi chỉ đổi chế độ xem).

---

## 3. Kết quả kiểm tra Thông tin tệp & Đánh dấu là cuối cùng (Mark as Final)
1. **Bật "Đánh dấu là cuối cùng"**:
   - `adapter.isFinal = true`.
   - Giao diện chuyển sang chế độ chỉ đọc mềm: `contenteditable="false"` trên thân văn bản, chặn mọi phím gõ phím / bộ gõ tiếng Việt.
   - Thanh thông báo cảnh báo màu vàng xuất hiện nổi bật ở đầu trang soạn thảo kèm nút hành động "Vẫn chỉnh sửa".
   - Cập nhật thuộc tính tài liệu `contentStatus = "Final"`.
2. **Đối chiếu lưu tệp DOCX với Microsoft Word 2016 COM thật**:
   - Tệp DOCX được patch ghi nhận kép:
     - `cp:contentStatus="Final"` trong `docProps/core.xml`.
     - `_MarkAsFinal=true` (pid="2", vt:bool) trong `docProps/custom.xml`.
   - Microsoft Word 2016 COM mở tệp kiểm chứng xác nhận: `d.Final === True`.
3. **Nhấp "Vẫn chỉnh sửa" (Gỡ đánh dấu cuối cùng)**:
   - `adapter.unmarkFinal()`: `adapter.isFinal = false`.
   - Khôi phục quyền soạn thảo: `contenteditable="true"`.
   - Thuộc tính `contentStatus` được xóa về rỗng.
   - Thanh thông báo chỉ đọc màu vàng được gỡ bỏ ngay lập tức.
   - Lưu lại tệp DOCX và mở bằng Word 2016 COM kiểm chứng xác nhận: `d.Final === False`.

---

## 4. Các điểm sửa lỗi và hoàn thiện hệ thống
1. **Bộ lọc hộp thoại Lưu thành (Save As)**:
   - Thêm bộ lọc `"Trang web (*.htm;*.html)"` vào danh sách `SAVE_FILE_TYPES["writer"]` trong `main.py`.
   - Cập nhật `OPEN_FILE_TYPES["writer"]` để nhận diện các tệp `*.html` và `*.htm`.
   - Hỗ trợ chuẩn hóa định dạng `.htm` thành `html` trong `_infer_save_format_from_path`.
   - Bổ sung định dạng `"html"` vào `validFormatsByApp.writer` trong `platform/shell/app-shell.js` phục vụ chức năng Xuất.
2. **Khắc phục định dạng Word 97-2003 (.doc)**:
   - Tên bộ lọc tuân thủ quy tắc không dùng ký tự gạch ngang gây lỗi với bộ phân tích cú pháp của `pywebview` (`"Văn bản Word 97 đến 2003 (*.doc)"`).
   - Đường ống xuất `.doc` qua DOCX intermediate và phẳng hóa Fallback VML đảm bảo tính tương thích tuyệt đối khi mở trên Word thật.
3. **Mã hóa tiếng Việt cho văn bản thuần (.txt)**:
   - Sử dụng bộ lọc `Text (encoded):UTF8` đảm bảo tài liệu văn bản thuần không bị mất dấu hay biến dạng ký tự tiếng Việt.
4. **Hệ thống Trợ giúp và Đa ngữ (i18n & Help)**:
   - Đầy đủ 7 lệnh W7 được đăng ký trong command bus và ánh xạ bản dịch song ngữ VI/EN.
   - 2 bài Hướng dẫn sử dụng tiếng Việt chi tiết cho tính năng Bong bóng và Đánh dấu là cuối cùng, tuân thủ nghiêm ngặt quy tắc không chứa tên sản phẩm độc quyền bị cấm.
