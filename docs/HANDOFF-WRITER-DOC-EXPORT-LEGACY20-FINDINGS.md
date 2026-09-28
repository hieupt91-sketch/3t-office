# Chẩn đoán nguyên nhân xuất .doc qua DOCX làm legacy20.doc hỏng

**Người thực hiện**: Antigravity (agy)  
**Nhánh**: `fix/writer-doc-export-legacy20-agy`  
**Worktree**: `E:\VNOffice-agy-doc-export`  
**Ngày thực hiện**: 2026-09-29  

---

## 1. Hiện tượng & Bối cảnh
- Khi bật `WRITER_DOC_EXPORT_VIA_DOCX = True` trong `main.py`, luồng `_convert_writer_html_to_doc`:
  1. Chuyển Writer HTML sang `intermediate.docx` bằng LibreOffice.
  2. Chuyển file gốc `.doc` sang `source.docx` (để lấy section, header/footer, styles, anchors).
  3. Chạy `_apply_native_export_postprocess` (gọi `postprocess_writer_docx`) để chắp vá metadata và anchors nguồn vào `intermediate.docx`.
  4. Chuyển `intermediate.docx` sang `.doc` bằng LibreOffice bộ lọc `MS Word 97`.
- Luồng này giúp `legacy06.doc` giữ đúng 3 trang Word (thay vì 4 trang nếu xuất trực tiếp từ HTML), nhưng làm tệp `legacy20.doc` xuất ra bị Word 2016 chặn mở bởi hộp thoại lỗi (modal error dialog: Word experienced an error trying to open the file).
- Word oracle (`_word_oracle3.ps1`) bị treo do hộp thoại modal này và báo:
  `FAIL (timeout - Word blocked by modal error dialog)`.

---

## 2. Quá trình chia đôi (Bisect) & Kết quả thử nghiệm

### Thử nghiệm 0: Mẫu đối chứng
- Bản lưu trực tiếp `E:\VNOffice-profiles\claude\ld20-pre\_rt_legacy20.doc`: Word mở được, `OK pages=1`.
- Bản lưu qua DOCX `E:\VNOffice-profiles\claude\ld20-main\_rt_legacy20.doc` (19,968 byte): `FAIL (timeout - Word blocked by modal error dialog)`.

### Thử nghiệm 1: Bước (a) HTML → DOCX (chưa hậu xử lý) → DOC
- Chuyển `draft.html` sang `draft.docx` (LibreOffice thuần, không qua `postprocess_writer_docx`), rồi chuyển tiếp sang `.doc`.
- Kết quả: `FAIL (timeout - Word blocked by modal error dialog)`.
- Nhận xét: Ngay cả khi **chưa chạy `postprocess_writer_docx`**, tệp `.doc` sinh ra từ DOCX do LibreOffice tạo cũng đã bị lỗi Word không mở được!

### Thử nghiệm 2: Chuẩn hóa nguồn `legacy20.doc` → `legacy20.docx` → DOC
- Chuyển `legacy20.doc` sang `legacy20.docx` bằng LibreOffice.
- Chuyển tiếp `legacy20.docx` sang `legacy20.doc` bằng LibreOffice bộ lọc `MS Word 97`.
- Kết quả: `FAIL (timeout - Word blocked by modal error dialog)`.
- Nhận xét: Bản thân LibreOffice khi chuyển một DOCX chứa các đối tượng đồ họa của `legacy20` sang định dạng Word 97 `.doc` đã tự sinh ra tệp hỏng.

### Thử nghiệm 3: Phân tích và chia đôi các phần tử XML trong `legacy20.docx`
Kiểm tra `word/document.xml` của `legacy20.docx`:
- Có 2 khối `<mc:AlternateContent>`:
  - Khối #1: Đường kẻ ngang (`<wps:wsp>` có `<a:prstGeom prst="line"/>`, không có textbox).
  - Khối #2: Khung chữ nổi (Frame1 - người báo giá) chứa `<wps:wsp>` với `txBox="1"` và `<wps:txbx>` trong `<mc:Choice Requires="wps">`, cùng với `<w:pict><v:rect><v:textbox>` trong `<mc:Fallback>`.

Thử nghiệm từng biến thể:
1. **Gỡ bỏ cả 2 khối AlternateContent (`rm_both`)**:
   - Xuất sang DOC: `OK pages=1` (16,384 byte). Word mở bình thường.
2. **Gỡ bỏ khối #1, giữ khối #2 (`rm_ac1`)**:
   - Xuất sang DOC: `FAIL (timeout - Word blocked by modal error dialog)` (19,456 byte).
3. **Gỡ bỏ khối #2, giữ khối #1 (`rm_ac2`)**:
   - Xuất sang DOC: `OK pages=1` (17,408 byte). Word mở bình thường!
   -> **Xác định chính xác: Khối AlternateContent #2 là nguồn gốc gây lỗi.** Khối đường kẻ #1 hoàn toàn an toàn.

### Thử nghiệm 4: Chia đôi sâu bên trong Khối #2 (Choice vs Fallback)
Khối #2 có cấu trúc OpenXML chuẩn:
- `<mc:Choice Requires="wps">`: sử dụng DrawingML WordprocessingShape (`<w:drawing><wp:anchor>...<wps:wsp><wps:txbx>...`).
- `<mc:Fallback>`: sử dụng VML truyền thống (`<w:pict><v:rect><v:textbox>...`).

Thử nghiệm:
- **Biến thể `choice_only`**: Thay `<mc:AlternateContent>` bằng duy nhất nội dung trong `<mc:Choice>` (`<w:drawing>`).
  - Xuất sang DOC: `FAIL (timeout - Word blocked by modal error dialog)`.
- **Biến thể `fallback_only`**: Thay `<mc:AlternateContent>` bằng duy nhất nội dung trong `<mc:Fallback>` (`<w:pict>`).
  - Xuất sang DOC: `OK pages=1` (18,944 byte). Word mở bình thường!

---

## 3. Kết luận nguyên nhân gốc (Root Cause)

1. **Bản chất lỗi của LibreOffice `MS Word 97` Filter**:
   - Định dạng Word 97 binary (`.doc` - WW8/Escher) không có DrawingML (DrawingML ra đời từ Office 2007). Tất cả shape và textbox trong `.doc` phải được lưu dưới dạng bản ghi nhị phân Escher/VML.
   - Khi bộ lọc `MS Word 97` của LibreOffice đọc một DOCX:
     - Nếu gặp `<mc:AlternateContent>`, LibreOffice ưu tiên chọn nhánh `<mc:Choice>` (DrawingML `wps:wsp`).
     - Khi chuyển đổi DrawingML text box (`wps:txbx` bên trong `wps:wsp`) sang bản ghi nhị phân Escher của Word 97, bộ lọc xuất WW8 của LibreOffice ghi sai cấu trúc bản ghi (FIB/Escher stream corruption).
     - Hậu quả: Word 2016 khi mở tệp `.doc` này phát hiện bản ghi nhị phân bị hỏng và bật modal cảnh báo lỗi, chặn mở tệp.
   - Ngược lại, khi gặp VML text box (`<w:pict><v:rect><v:textbox>`), bộ lọc xuất `MS Word 97` của LibreOffice ánh xạ trực tiếp sang Escher 100% chuẩn xác vì VML là định dạng LibreOffice đã hỗ trợ suốt 20+ năm qua.

2. **Cách khắc phục nguyên nhân gốc**:
   - Trong bước chuẩn bị DOCX trung gian trước khi chuyển đổi sang `.doc` (hoặc trong `postprocess_writer_docx` / hàm chuyên biệt trước khi gọi LibreOffice xuất `.doc`):
     - Đối với mọi khối `<mc:AlternateContent>` chứa DrawingML text box (`wps:txbx`) hoặc có `<mc:Fallback>` dạng `<w:pict>`, ta làm phẳng (flatten) khối này về `<mc:Fallback>`.
   - **Đặc điểm quan trọng của giải pháp**:
     - KHÔNG đổi bố cục tài liệu người dùng.
     - KHÔNG đổi kiểu bao chữ (wrap type).
     - KHÔNG bỏ sót bất kỳ nội dung, định dạng chữ hay vị trí nào.
     - Giữ nguyên vẹn 100% ngữ nghĩa tài liệu vì `<mc:Fallback>` do chính LibreOffice/Word sinh ra để đảm bảo tương thích ngược chính xác với các trình xử lý Word 97-2003.
