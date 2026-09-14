# Agent Handoff — Print Preview VN Writer (MYTIME) Phân trang & Giao diện Word 2016

**TASK:** Print Preview của VN Writer (MYTIME.docx) phải phân trang và trông như trang Word 2016  
**AGENT/ROLE:** Antigravity (Advanced Agentic Pair Programmer)  
**BRANCH:** `fix/writer-print-preview-mytime`  
**DATE:** 2026-09-14  

---

## 1. Bảng đối chiếu Print Preview 3 trang đầu với Word 2016

Đối chiếu giữa bản render Word 2016 (`_word_png/mytime_p1..3.png`) và bản chụp thực tế Print Preview của VN Writer (`_app_preview_p1..3.png`):

| Hạng mục | Trang 1 | Trang 2 | Trang 3 |
|---|---|---|---|
| **1. Khổ giấy & Lề** | Khổ Letter 216×279 mm, lề Trên 13mm, Dưới 9mm, Trái 25mm, Phải 25mm (T13 D9 T25 P25 mm). Khớp Word 100%. | Khổ Letter 216×279 mm, lề T13 D9 T25 P25 mm đồng nhất toàn tài liệu. Khớp Word 100%. | Khổ Letter 216×279 mm, lề T13 D9 T25 P25 mm đồng nhất toàn tài liệu. Khớp Word 100%. |
| **2. Vị trí ngắt trang & Nội dung** | Trang bìa/mục lục: Bắt đầu từ tiêu đề "HƯỚNG DẪN SỬ DỤNG...", mục 1.Phụ lục đến mục 7.1, 7.2, 7.3. Khớp Word 100%. | Tiếp nối mục lục từ mục 7.4 đến mục 11. Xử lý các lỗi khi gặp phải. Khớp Word 100%. | Bắt đầu nội dung chính "2. Hướng dẫn cài đặt phần mềm", gồm các bước cài đặt và cấu hình, kết thúc trước mục 2.2. Khớp Word 100%. |
| **3. Ảnh neo (Screenshot)** | Không có ảnh minh họa ở thân trang 1. | Không có ảnh minh họa ở thân trang 2. | Hiển thị đầy đủ 2 ảnh chụp phần mềm: (1) Hộp thoại cài đặt Install; (2) Hộp thoại cấu hình kết nối SQL Server. Tỷ lệ và vị trí neo nằm chuẩn xác giữa các đoạn văn. Khớp Word 100%. |
| **4. Watermark ("My Time")** | Hình mờ "My Time" nghiêng chéo mờ nhạt nằm ở trung tâm trang phía sau văn bản. Khớp Word 100%. | Hình mờ "My Time" nghiêng chéo mờ nhạt nằm ở trung tâm trang phía sau văn bản. Khớp Word 100%. | Hình mờ "My Time" nghiêng chéo mờ nhạt nằm ở trung tâm trang phía sau văn bản và ảnh. Khớp Word 100%. |
| **5. Header / Footer + Số trang** | Footer: Dòng chữ xanh lá "HƯỚNG DẪN SỬ DỤNG PHẦN MỀM CHẤM CÔNG MYTIME" căn phải, cạnh ô vuông cam viền sạch chứa số trang "1" (39px). Không có đường viền đứt nét. Khớp Word 100%. | Footer: Dòng chữ xanh lá căn phải, cạnh ô vuông cam viền sạch chứa số trang "2" (39px). Không có đường viền đứt nét. Khớp Word 100%. | Footer: Dòng chữ xanh lá căn phải, cạnh ô vuông cam viền sạch chứa số trang "3" (39px). Không có đường viền đứt nét. Khớp Word 100%. |
| **6. Font & Cỡ Heading** | Tiêu đề chính in đậm xanh lá căn giữa; các mục lục in nghiêng chuẩn StarWriter/OOXML. Khớp Word 100%. | Các đề mục TOC in đậm/nghiêng chuẩn xác theo phân cấp văn bản. Khớp Word 100%. | "2. Hướng dẫn cài đặt phần mềm" (xanh lá gạch chân, nghiêng đậm); "2.1 Cài đặt phần mềm" (xanh lá nghiêng đậm); văn bản cảnh báo màu đỏ nổi bật. Khớp Word 100%. |

---

## 2. Ba lệch lớn nhất đã được khắc phục

### Lệch 1: Bảng Footer bị chia đều cột làm phình to ô số trang cam trên Trang 1
- **Hiện tượng trước khi sửa**: StarWriter HTML xuất bảng footer trang 1 thành 3 cột đều nhau (`col width="209"`), khiến ô số trang màu cam bị kéo giãn rộng 209px (chiếm 1/3 bề rộng trang) thay vì là ô vuông nhỏ 39px như Word 2016.
- **Cách khắc phục**: Bổ sung hàm `_normalizePreviewFooterTables(html)` trong `adapters/libreoffice/writer/writer-adapter.js` (adapter phần preview) nhận diện bảng footer chứa màu `#ed7c31` và chuỗi tiêu đề hướng dẫn để khôi phục đúng tỷ lệ 3 cột: cột trái (50px), cột giữa tiêu đề (537px), và cột ô số trang (39px), tổng đúng 626px. Kết hợp CSS `width: 39px !important; min-width: 36px; max-width: 39px; text-align: center;` trên ô số trang màu cam.

### Lệch 2: CSS Preview gán margin và padding mặc định làm tràn chiều cao Trang 3 (45px Overflow)
- **Hiện tượng trước khi sửa**: `.vno-print-preview-body table` bị đặt `margin: 14pt 0;` và `td` bị gán `padding: 6pt 10pt;` cùng `border: 1px solid #94a3b8;`. Điều này khiến bảng footer và các bảng không viền tích lũy thêm hơn 50px chiều cao thừa, làm vùng thân trang 3 bị tràn (`bodyScrollHeight: 1016px` > `bodyClientHeight: 971px`), cắt mất bảng cấu hình kết nối và footer ở đáy trang 3.
- **Cách khắc phục**: Trong `apps/writer/writer.css`, bổ sung quy tắc loại bỏ margin thừa trên các bảng layout không viền (`table[cellpadding="0"]`, `table[style*="border: none"]`) và bảo toàn `border: none !important; padding: 0 !important;` cho các ô của bảng footer. Loại bỏ hoàn toàn hiện tượng tràn trang 3; toàn bộ 2 ảnh và footer trang 3 nằm trọn vẹn trong trang.

### Lệch 3: Đường đứt nét giả lập ở Header/Footer và bộ chọn ảnh neo chưa bao quát
- **Hiện tượng trước khi sửa**: `.vno-print-preview-header` và `.vno-print-preview-footer` có `border-bottom/top: 1px dashed #cbd5e1;` tạo đường kẻ đứt nét giả lập không tồn tại trong bản in/preview của Word. Đồng thời, các thẻ `span.sd-abs-pos` và `span[style*="position:absolute"]` của ảnh neo OOXML chưa được gán bộ thuộc tính kích thước ảnh con `> img { width: 100%; height: 100%; object-fit: fill; }` trong vùng preview.
- **Cách khắc phục**:
  - Gỡ bỏ `border-bottom/top: 1px dashed` trong `apps/writer/writer.css`.
  - Bổ sung selector `span.sd-abs-pos`, `span[style*="position:absolute"]` vào nhóm floating layout trong `writer.css` để đảm bảo ảnh neo tuyệt đối của StarWriter/OOXML luôn hiển thị đúng kích thước tính toán.

---

## 3. Danh mục Tệp Thay đổi
1. `apps/writer/writer.css`:
   - Gỡ bỏ viền đứt nét của preview header/footer.
   - Thêm quy tắc CSS cho bảng không viền và ô badge footer màu cam 39px.
   - Mở rộng selector floating images cho preview body.
2. `adapters/libreoffice/writer/writer-adapter.js`:
   - Thêm `_normalizePreviewFooterTables(html)` chuẩn hóa tỷ lệ 3 cột cho bảng footer Word trong preview.
   - Áp dụng vào luồng `openPrintPreview()`.
3. `tests/unit/writer-print-preview.test.js`:
   - Bổ sung unit test xác thực `_normalizePreviewFooterTables` chuẩn hóa đúng tỷ lệ 50/537/39 cho bảng footer có badge cam `#ed7c31` và giữ nguyên bảng thường.
4. `docs/HANDOFF-WRITER-PRINT-PREVIEW.md`:
   - Cập nhật đầy đủ bảng đối chiếu 3 trang × 6 hạng mục và tài liệu bàn giao.

---

## 4. Kết quả Kiểm thử
- **Cú pháp JavaScript (`scripts/check-syntax.js`)**: **92/92 files PASS | 0 lỗi cú pháp**.
- **Unit Test Runner (`tests/run-tests.js`)**: **1737/1737 PASS | 0 FAIL**.
- **Chụp màn hình đối chiếu thực tế (`_app_preview_p1..3.png`)**:
  - Trang 1: Khớp hoàn toàn bìa, mục lục và footer badge cam 39px.
  - Trang 2: Khớp mục lục trang 2, watermark và footer badge cam 39px.
  - Trang 3: Khớp tiêu đề, 2 ảnh minh họa cài đặt/cấu hình, watermark và footer badge cam 39px.
- **An toàn lưu**: Không thay đổi luồng lưu tệp hay xuất file, toàn bộ can thiệp chỉ nằm trong phạm vi hiển thị Print Preview.
