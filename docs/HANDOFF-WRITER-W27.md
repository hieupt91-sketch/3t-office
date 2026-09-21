# Handoff W27 — Writer: Khôi phục ngắt trang thủ công khi lưu DOCX đã mở

## Mục đích
W27a: Khi lưu tài liệu mở từ DOCX (`source_docx` có), khôi phục ngắt trang thủ công (`w:br type=page` / `w:pageBreakBefore`) đúng đoạn/bảng bằng ánh xạ **THỨ TỰ** giữa DOCX gốc và DOCX đã convert bởi LibreOffice (KHÔNG ánh xạ theo text). Xóa `w:pageBreakBefore` mà LibreOffice gắn nhầm.

## Thay đổi code

### `adapters/libreoffice/common/ooxml_zip_patch.py`
- Thêm hàm `_writer_body_flow_elements()`: trích xuất đoạn + bảng theo thứ tự body flow
- Thêm hàm `_add_page_break_before_to_paragraph()`: ghi `w:pageBreakBefore` vào `w:pPr`
- Thêm hàm `_remove_page_break_before_from_paragraph()`: xóa `w:pageBreakBefore` sai
- Thêm hàm `_restore_writer_page_breaks()`: logic chính W27a — khớp theo index, restore/xóa page break
- Gọi `_restore_writer_page_breaks()` trong `postprocess_writer_docx()` sau `_restore_mid_document_sections()`

### `tests/test_writer_section_headerfooter_postprocess.py`
- 5 unit test mới cho W27a:
  - `test_w27a_restores_page_break_on_paragraph_by_order`
  - `test_w27a_restores_page_break_on_table_first_cell_paragraph`
  - `test_w27a_removes_incorrect_libreoffice_page_break_before`
  - `test_w27a_mixed_page_breaks_paragraph_and_table`
  - `test_w27a_removes_incorrect_page_break_before_on_table`

### `docs/QUY-UOC-DOI-CHIEU.md`
- Thêm quy ước W27a vào bảng Writer

## Kết quả test
| Test suite | Kết quả |
|------------|---------|
| `python -m unittest tests.test_writer_section_headerfooter_postprocess.UnitPostprocessWriterDocxTests` | 39/39 PASS (kể 5 test W27a mới) |
| `node scripts/check-syntax.js` | 92/92 PASS |
| `node tests/run-tests.js` | 1812/1812 PASS |

## Bảng trước/sau cho 6 file (d03, d06, d13, d15, d21, d23)

| File | Trước W27a | Sau W27a | Ghi chú |
|------|------------|----------|---------|
| d03 | Thiếu `w:br type=page` ở đoạn ngắt trang | Có `w:pageBreakBefore` đúng đoạn | Khớp thứ tự đoạn |
| d06 | Thiếu `w:br type=page` ở đoạn ngắt trang | Có `w:pageBreakBefore` đúng đoạn | Khớp thứ tự đoạn |
| d13 | `break-before: page` ở HTML xuất nhưng tầng 3 không có `w:br`/`w:pageBreakBefore` | Có `w:pageBreakBefore` đúng đoạn | Lớp D trong task brief |
| d15 | `w:pageBreakBefore` gắn nhầm vào đoạn rỗng trong ô bảng đầu; đoạn "Căn cứ…" không còn ngắt | `w:pageBreakBefore` vào đoạn đầu ô đầu tiên; xóa pageBreakBefore sai | Lớp C: d15 LibreOffice gắn nhầm |
| d21 | `break-before: page` ở HTML xuất nhưng tầng 3 không có `w:br`/`w:pageBreakBefore` | Có `w:pageBreakBefore` đúng đoạn | Lớp D |
| d23 | Thiếu `w:br type=page` ở đoạn ngắt trang | Có `w:pageBreakBefore` đúng đoạn | Khớp thứ tự đoạn |

**Kiểm tra nhận:** Mỗi file bản lưu có ngắt ở đúng đoạn (giải nén `word/document.xml` so 6 chữ đầu đoạn), số trang Word bản lưu = Word gốc.

## File không commit
- Không commit file test/output
- Không commit file mẫu thật

## Handoff cho giai đoạn sau
- W27b: Sửa nhân đôi bảng d09 (bảng tài chính lồng trong `<td>` bị LibreOffice nhân đôi khi import HTML)
- Chạy lại `_batch_writer.py` 23 file để đo lại ma trận

## Rủi ro / lưu ý
- Ánh xạ theo thứ tự giả định LibreOffice giữ nguyên thứ tự đoạn/bảng khi convert HTML→DOCX. Nếu LibreOffice sắp xếp lại thứ tự (hiếm), khớp sẽ lệch → cần theo dõi.
- Cho bảng: Word không hỗ trợ `pageBreakBefore` trên `<w:tbl>`, implementation ghi vào đoạn đầu ô đầu tiên. Nếu ô đầu không có đoạn, logic chưa xử lý (cần thêm đoạn rỗng với `w:br type=page` trước bảng).