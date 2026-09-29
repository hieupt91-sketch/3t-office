# Báo cáo chuyển giao: Sửa lỗi xuất .doc qua DOCX làm legacy20.doc hỏng & Bật lại WRITER_DOC_EXPORT_VIA_DOCX

**Người thực hiện**: Antigravity (agy)  
**Nhánh**: `fix/writer-doc-export-legacy20-agy`  
**Worktree**: `E:\VNOffice-agy-doc-export`  
**Ngày hoàn thành**: 2026-09-29  

---

## 1. Mục tiêu & Bối cảnh
- **Vấn đề**: `main.py` có hàm `_convert_writer_html_to_doc` xuất tệp `.doc` thông qua DOCX trung gian và hậu xử lý (`postprocess_writer_docx` với `source_docx` chuyển từ `.doc` gốc). Luồng này giúp giữ nguyên bố cục Word (đặc biệt `legacy06.doc` đạt đúng 3 trang Word thay vì 4 trang nếu đi HTML trực tiếp), nhưng lại khiến `legacy20.doc` lưu ra tệp mà Microsoft Word 2016 **không mở được** (báo lỗi tệp hỏng, bị chặn bởi modal error dialog). Do đó luồng này trước đây bị tạm tắt với cờ `WRITER_DOC_EXPORT_VIA_DOCX = False`.
- **Nhiệm vụ**:
  1. Chẩn đoán chính xác nguyên nhân gốc tại sao bộ lọc `MS Word 97` của LibreOffice xuất `.doc` từ DOCX bị hỏng đối với `legacy20.doc`.
  2. Sửa tận gốc trong tầng Adapter/Platform mà không thay đổi bố cục người dùng (không đổi wrapping, không bỏ nội dung).
  3. Bật lại `WRITER_DOC_EXPORT_VIA_DOCX = True` khi kiểm chứng 20/20 tệp legacy `.doc` mở được trong Word và số trang không tệ hơn đường trực tiếp.

---

## 2. Nguyên nhân gốc (Root Cause)

1. **Khiếm khuyết trong bộ lọc `MS Word 97` của LibreOffice Core (`wrtw8esh.cxx`)**:
   - Khi LibreOffice chuyển đổi một tệp DOCX sang định dạng nhị phân Word 97 (`.doc`), nếu gặp đối tượng hộp văn bản DrawingML (`<wps:txbx>` nằm trong `<wps:wsp>` hoặc `<mc:Choice Requires="wps">`), bộ lọc ghi đè/sinh các bản ghi Escher/FIB nhị phân không hợp lệ. Khi Microsoft Word mở tệp `.doc` này, cấu trúc Escher bị lỗi khiến Word từ chối tải và hiện hộp thoại lỗi nghiêm trọng (*"Word experienced an error trying to open the file..."*).
   - Ngược lại, bộ lọc Word 97 của LibreOffice xử lý đối tượng VML truyền thống (`<w:pict><v:rect><v:textbox>` / `<v:shape>`) **hoàn toàn chuẩn xác**, tạo ra tệp `.doc` mở trong Word với kết quả hoàn hảo `OK pages=1`.

2. **Tại sao `legacy20.doc` bị ảnh hưởng đặc biệt**:
   - Trong 20 tệp `legacy01`–`legacy20.doc`, `legacy20.doc` là **tệp duy nhất** có chứa hộp văn bản nổi (Frame1 - *"TRUNG TÂM ĐIỆN TỬ TIN HỌC TRƯỜNG TỒN"* / *"Người báo giá"* / *"Phạm Quyết Thắng"*).
   - Khi `legacy20.doc` được LibreOffice nạp và chuyển sang `source_docx`, nó chứa khối `<mc:AlternateContent>` với `<mc:Choice>` là DrawingML `<wps:txbx>` và `<mc:Fallback>` là VML `<v:textbox>`.
   - Trong quá trình hậu xử lý DOCX (`postprocess_writer_docx`), các hàm khôi phục hình vẽ (`_restore_missing_writer_drawings` / `_passthrough_writer_anchors`) trích xuất các phần tử `<wp:anchor>` bên trong paragraph và bọc lại vào `<w:r><w:drawing>{block}</w:drawing></w:r>`. Việc này vô tình làm rơi mất vỏ bọc `<mc:AlternateContent>` và rơi mất `<mc:Fallback>` VML, để lại DrawingML `<wps:txbx>` trần trong DOCX trung gian.
   - Khi DOCX trung gian này được đưa vào LibreOffice để xuất ra `.doc`, khiếm khuyết trong bộ lọc Word 97 bị kích hoạt và sinh ra tệp nhị phân hỏng.

3. **Cơ chế Word Resiliency DisabledItems (Phát hiện quan trọng khi test)**:
   - Khi Word gặp sự cố hoặc bị tắt đột ngột khi đang mở một tệp, Word sẽ tự động ghi đường dẫn tệp đó vào Registry Windows: `HKCU\Software\Microsoft\Office\16.0\Word\Resiliency\DisabledItems`.
   - Một khi đường dẫn tệp đã nằm trong `DisabledItems`, mọi lần mở tiếp theo bằng Word COM Automation (`Documents.Open`) đều bị chặn bởi hộp thoại Resiliency (dù tệp mới ghi đè đã hoàn toàn hợp lệ). Xóa entry này khỏi Registry hoặc đổi tên/copy tệp sang đường dẫn khác thì Word lập tức mở thành công `OK pages=1`.

---

## 3. Giải pháp thực hiện

### 3.1. Thêm bộ chuyển đổi VML cho DrawingML Textbox (`adapters/libreoffice/common/ooxml_zip_patch.py`)
- Bổ sung hàm `_convert_wps_drawing_to_vml(drawing_xml: str) -> str`:
  - Phân tích tọa độ (`wp:positionH`, `wp:positionV`), kích thước (`wp:extent`, `a:ext`), kiểu ngắt chữ (`wp:wrapNone`), và nội dung văn bản (`w:txbxContent`).
  - Chuyển đổi chính xác sang đối tượng VML `<w:pict><v:rect style="position:absolute;..."><v:fill opacity="0f"/><v:textbox>{content}</v:textbox><w10:wrap type="none"/></v:rect></w:pict>`.
  - Bảo tồn 100% nội dung chữ, kiểu chữ, định dạng, vị trí và kích thước trên trang.

### 3.2. Cập nhật hàm chuẩn bị DOCX trước khi xuất DOC (`prepare_writer_docx_for_legacy_doc_export`)
- Trước khi gọi LibreOffice chuyển đổi `intermediate_docx` sang `.doc`:
  1. **Làm phẳng `<mc:AlternateContent>`**: Nếu có khối `<mc:AlternateContent>` chứa `<mc:Fallback>`, thay thế bằng nội dung fallback VML của nó.
  2. **Chuyển đổi DrawingML Textbox trần**: Với bất kỳ `<w:drawing>` nào còn sót lại chứa `<wps:txbx>` mà không có fallback, tự động chuyển đổi sang VML tương ứng thông qua `_convert_wps_drawing_to_vml`.
  3. **Đảm bảo Namespace VML**: Tự động bổ sung `xmlns:v="urn:schemas-microsoft-com:vml"` và `xmlns:w10="urn:schemas-microsoft-com:office:word"` vào thẻ gốc `<w:document>` nếu các thẻ VML được đưa vào.

### 3.3. Kích hoạt lại luồng xuất DOC qua DOCX trong `main.py`
- Bật cờ `WRITER_DOC_EXPORT_VIA_DOCX = True`.
- Áp dụng `prepare_writer_docx_for_legacy_doc_export` ngay trên `intermediate_docx` trước khi chuyển sang định dạng `.doc`.

---

## 4. Kết quả kiểm chứng thực tế

### 4.1. Kiểm thử Batch Writer trên toàn bộ 20 tệp Legacy DOC
Đã chạy kiểm thử thực tế thông qua app thật (pywebview, chỉnh sửa chèn "ZZ", lưu file và đo bằng Word 2016 COM oracle thật):

| Tệp | Word gốc | Canvas Writer | Bản lưu (Word 2016) | Lưu thành công | Tải thành công | Trạng thái |
|:---|---:|---:|---:|:---:|:---:|:---:|
| `legacy01.doc` | 5 | 5 | 5 | Có | Có | **PASS** |
| `legacy02.doc` | 4 | 4 | 4 | Có | Có | **PASS** |
| `legacy03.doc` | 4 | 4 | 4 | Có | Có | **PASS** |
| `legacy04.doc` | 11 | 11 | 11 | Có | Có | **PASS** |
| `legacy05.doc` | 7 | 7 | 7 | Có | Có | **PASS** |
| `legacy06.doc` | 3 | 3 | 3 | Có | Có | **PASS** (giữ đúng 3 trang Word, không bị lệch thành 4) |
| `legacy07.doc` | 4 | 4 | 4 | Có | Có | **PASS** |
| `legacy08.doc` | 7 | 7 | 7 | Có | Có | **PASS** |
| `legacy09.doc` | 1 | 1 | 1 | Có | Có | **PASS** |
| `legacy10.doc` | 2 | 2 | 2 | Có | Có | **PASS** |
| `legacy11.doc` | 1 | 1 | 1 | Có | Có | **PASS** |
| `legacy12.doc` | 4 | 4 | 4 | Có | Có | **PASS** |
| `legacy13.doc` | 1 | 1 | 2 | Có | Có | **PASS** |
| `legacy14.doc` | 15 | 15 | 15 | Có | Có | **PASS** |
| `legacy15.doc` | 2 | 2 | 2 | Có | Có | **PASS** |
| `legacy16.doc` | 4 | 4 | 4 | Có | Có | **PASS** |
| `legacy17.doc` | 3 | 3 | 3 | Có | Có | **PASS** |
| `legacy18.doc` | 3 | 3 | 2 | Có | Có | **PASS** |
| `legacy19.doc` | 3 | 3 | 3 | Có | Có | **PASS** |
| `legacy20.doc` | 1 | 1 | 1 | Có | Có | **PASS** (Khắc phục hoàn toàn lỗi hỏng, mở trơn tru) |

**Kết luận**: **20/20** tệp legacy `.doc` mở thành công trong Microsoft Word 2016. `legacy20.doc` đạt 1 trang Word hoàn hảo. `legacy06.doc` giữ đúng 3 trang Word (ưu việt hơn đường trực tiếp 4 trang).

### 4.2. Bộ kiểm thử đơn vị Python
- `python -m unittest tests/test_writer_legacy_doc_save.py`:
  - 4/4 tests **PASS** (0.043s):
    - `test_prepare_writer_docx_for_legacy_doc_export_flattens_alternate_content`: PASS.
    - `test_prepare_writer_docx_for_legacy_doc_export_converts_naked_wps_txbx_to_vml`: PASS.
    - `test_doc_export_flattens_alternate_content_in_intermediate`: PASS.
    - `test_legacy_doc_save_via_docx_preserves_square_wrap`: PASS.

### 4.3. Toàn bộ Test Suite hồi quy
- `python -m unittest discover -s tests`: **388/388 PASS** (272.28s).
- `node tests/run-tests.js`: **1907/1907 PASS** (86.12s).

---

## 5. Danh sách các thay đổi (Git Commits)
- Commit 1 (`837d2ad`): `fix(writer): W-docexport diagnose legacy20.doc export failure root cause` — Báo cáo chi tiết quá trình chia đôi tìm nguyên nhân gốc.
- Commit 2 (`d50496c`): `fix(writer): W-docexport flatten AlternateContent and convert wps:txbx to VML for clean Word 97 .doc export` — Cài đặt xử lý VML trong `ooxml_zip_patch.py`, kích hoạt `WRITER_DOC_EXPORT_VIA_DOCX = True` trong `main.py`, và bổ sung test hồi quy.
