# Handoff: Sửa dứt điểm mất đường kẻ ngang (.doc lines) trong VN Writer

## 1. Mục tiêu
Giải quyết dứt điểm lỗi mất đường kẻ Word (đường kẻ tiêu ngữ, đường kẻ chữ ký trong văn bản hành chính Việt Nam) khi lưu tệp `.doc` (cụ thể: `legacy06.doc` mất `Line 13`, `legacy17.doc` và `legacy18.doc` mất `Line 115`), cũng như khi chuyển đổi lưu `.doc` sang `.docx`.

## 2. Phân tích nguyên nhân gốc rễ (Root Cause)
Chu trình xử lý tệp `.doc`:
1. `soffice` chuyển `.doc` → intermediate `.docx`. LibreOffice chuyển các hình vẽ Escher không tên (unnamed shapes) thành `<wp:docPr id="1" name=""/>` (`name=""`).
2. Intermediate `.docx` → HTML StarWriter: đường kẻ mảnh được xuất thành ảnh GIF carrier (chiều cao ≤ 2px).
3. `main.py` lọc bỏ các hairline images (`_is_decorative_hairline_image`) để tránh vỡ dàn trang văn bản trên Canvas. Canvas giữ hình vẽ qua `_ooxmlImportedBasicShapes`.
4. Khi xuất tài liệu, cơ chế `_restore_missing_writer_drawings` trong `adapters/libreoffice/common/ooxml_zip_patch.py` có nhiệm vụ phục hồi các hình vẽ bị thiếu từ `source_docx`.
5. **Điểm nghẽn 1 (`ooxml_zip_patch.py`)**: Hàm `_writer_anchor_name` trả về `None` khi `name=""`. Hàm `_writer_should_restore_drawing` kiểm tra:
   ```python
   name = _writer_anchor_name(block)
   if not name or name in present:
       return False
   ```
   Do đó, 100% hình vẽ không có tên (`name=""`) bị từ chối phục hồi.
6. **Điểm nghẽn 2 (`main.py`)**: Khi lưu trực tiếp từ `.doc` sang `.docx`, `_apply_native_export_postprocess` truyền `source_path` (định dạng nhị phân `.doc`) vào `postprocess_writer_docx`. Hàm này kỳ vọng ZIP DOCX, dẫn tới lỗi mở tệp ZIP và bỏ qua toàn bộ khâu phục hồi shape.

## 3. Giải pháp thực hiện
Không dùng hack chép byte nhị phân thô; xử lý đúng tầng kiến trúc OOXML và pipeline xuất khẩu:

1. **`adapters/libreoffice/common/ooxml_zip_patch.py`**:
   - Bổ sung `_writer_anchor_extent(anchor)` để lấy kích thước hình vẽ `(cx, cy)`.
   - Bổ sung `_writer_anchor_identifier(anchor)`: nếu `name` rỗng, sử dụng định danh tạm theo docPr id (`__unnamed_docpr_<id>`).
   - Cập nhật `_writer_should_restore_drawing`: cho phép phục hồi shape không tên nếu chưa có trong tài liệu xuất ra. Kiểm tra kích thước `cx, cy` đối chiếu với `converted_drawings` để tránh nhân đôi shape đã được chuyển qua HTML (như đường kẻ trong `legacy20.doc`).
   - Cập nhật `_restore_missing_writer_drawings`: ghi nhận identifier của shape không tên vào tập `present`.

2. **`main.py`**:
   - Trong `_apply_native_export_postprocess`: khi `source_path` là tệp nhị phân `.doc`, tự động chuyển đổi sang `.docx` chuẩn qua `_run_soffice_convert` làm nguồn `source_docx` trước khi chuyển cho `postprocess_writer_docx`.

3. **`tests/test_writer_legacy_doc_save.py`**:
   - Bổ sung `test_postprocess_writer_docx_restores_unnamed_lines` kiểm tra phục hồi đường kẻ không tên.
   - Bổ sung `test_postprocess_writer_docx_does_not_duplicate_existing_unnamed_lines` đảm bảo không nhân đôi đường kẻ đã tồn tại.

## 4. Kết quả kiểm thử trung thực và đối chiếu

### A. Kiểm tra 20 tệp legacy `.doc` (`legacy01` - `legacy20`)
- **Word mở thành công**: **20/20** tệp.
- **Bảo toàn Shape**:
  - `legacy06.doc`: Word source = 1 (`Line 13`, Page 1) -> Saved = 1 (Page 1) [PASS - đã khôi phục]
  - `legacy13.doc`: Word source = 1 (`Picture 3`, Page 1) -> Saved = 1 (Page 1) [PASS]
  - `legacy17.doc`: Word source = 1 (`Line 115`, Page 1) -> Saved = 1 (Page 1) [PASS - đã khôi phục]
  - `legacy18.doc`: Word source = 1 (`Line 115`, Page 1) -> Saved = 1 (Page 1) [PASS - đã khôi phục]
  - `legacy20.doc`: Word source = 2 (`Line 3`, `Text Box 2`, Page 1) -> Saved = 2 (Page 1) [PASS - không nhân đôi]
  - Các tệp còn lại (15 tệp): source = 0 -> saved = 0.
  - **Tất cả 20/20 tệp đều đạt `saved >= source`**.
- **Số trang so với baseline main**:
  - 18/20 tệp có số trang không đổi.
  - `legacy13.doc`: Word 1, Saved 2 (khớp baseline `main` 1→2).
  - `legacy18.doc`: Word 3, Saved 2 (khớp baseline `main` 3→2).
  - **0 tệp bị suy thoái (degraded) số trang so với `main`**.

### B. Kiểm tra bộ 23 tệp `.docx` trong `landocx` (trừ `d10.docx`)
- **Word mở thành công**: **23/23** tệp.
- **`_writer_shape_counts.py`**:
  - **0** tệp vượt source (`files with more wsp/txbx/txc/media than source: 0`).
  - **0** lỗi trùng lặp docPr ID (`DUPLICATE-DOCPR-IDS: 0`).
- **`_word_shape_pages.ps1` trên các tệp có shape**:
  - `d04.docx`: source = 5, saved = 5, page-mismatch/missing = **0**
  - `d06.docx`: source = 60, saved = 60, page-mismatch/missing = **0**
  - `d07.docx`: source = 1, saved = 1, page-mismatch/missing = **0**
  - `d09.docx`: source = 30, saved = 30, page-mismatch/missing = **0**
  - `d24.docx`: source = 14, saved = 14, page-mismatch/missing = **0**

### C. Bộ test tự động Monorepo
- **Unit test Python**: `python -m unittest discover -s tests` -> **390/390 PASS** (0 FAIL) trong 284s.
- **E2E / Integration test Node**: `node tests/run-tests.js` -> **1907/1907 PASS** (0 FAIL).

## 5. Tệp tin đã thay đổi
- `adapters/libreoffice/common/ooxml_zip_patch.py`: cơ chế khôi phục unnamed shape dựa trên extent và identifier.
- `main.py`: chuẩn hóa legacy `.doc` source sang `.docx` khi postprocess.
- `tests/test_writer_legacy_doc_save.py`: bổ sung 2 unit test xác thực khôi phục và tránh nhân đôi shape.
- `docs/HANDOFF-WRITER-DOC-LINES-FINDINGS.md`: chẩn đoán ban đầu.
- `docs/HANDOFF-WRITER-DOC-LINES.md`: tài liệu bàn giao hoàn chỉnh.
