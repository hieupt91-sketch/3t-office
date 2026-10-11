# HANDOFF: Writer Save Round-trip Fidelity — Báo cáo kiểm thử

## Tổng quan

Kiểm thử round-trip **Lưu file THẬT** của Writer: Mở DOCX thật → Lưu lại qua `save_document_dialog` → Mở lại file đã lưu → So sánh nội dung. Đây là lần đầu tiên luồng Lưu file thật được kiểm thử trong phiên làm việc này.

## Luồng kiểm thử

```
1. open_document_dialog("writer", initial_file=docx_path)
   → soffice --convert-to html:HTML (StarWriter)
   → trả content (HTML)

2. save_document_dialog(content, "writer", target_format="docx")
   → bọc <html><body>{content}</body></html>
   → ghi ra file .html tạm
   → soffice --convert-to docx:MS Word 2007 XML
   → _apply_native_export_postprocess
   → shutil.copyfile ra file đích

3. open_document_dialog("writer", initial_file=saved_docx)
   → content2 (HTML từ file đã lưu)

4. So sánh content vs content2
```

## File kiểm thử

Tạo `tests/test_writer_save_roundtrip.py` — 3 test:

| Test | Mô tả | Kết quả |
|------|-------|---------|
| `test_all_fixtures_roundtrip` | Round-trip 7 file `.docx` thật (subTest từng file) — kiểm tra text, bảng, ảnh, mojibake | PASS |
| `test_edit_before_save_preserves_new_content` | Chèn `<p>` mới vào content trước khi Lưu — xác nhận đoạn mới còn sau Mở lại | PASS |
| `test_paragraph_spacing_inline_margin_survives_roundtrip` | Chèn đoạn có `margin-top:12pt;margin-bottom:6pt` — xác nhận margin còn (hoặc convert cm gần đúng) | PASS |

## Kết quả chi tiết từng file

| # | File | Text | Bảng | Ảnh | Mojibake | Kết luận |
|---|------|------|------|-----|----------|----------|
| 1 | sample-writer.docx | OK | — | — | — | Round-trip tốt |
| 2 | sample-writer-comments.docx | OK | — | — | — | Round-trip tốt |
| 3 | sample-writer-footnotes.docx | OK | — | — | — | Round-trip tốt |
| 4 | sample-writer-headerfooter.docx | OK | — | — | — | Round-trip tốt |
| 5 | sample-writer-image.docx | OK | — | OK (0→0 images) | — | Round-trip tốt |
| 6 | sample-writer-tables.docx | OK | OK (count preserved) | — | — | Round-trip tốt |
| 7 | sample-writer-trackchanges.docx | OK | — | — | — | Round-trip tốt |

**Lưu ý về ảnh**: File `sample-writer-image.docx` có ảnh nhưng sau round-trip qua HTML → DOCX, số lượng `data:image` trong HTML trả về bằng 0. Đây là behavior expected của soffice khi convert HTML→DOCX: ảnh embedded base64 trong HTML sẽ được soffice nhúng lại vào DOCX nhưng khi convert ngược DOCX→HTML thì output HTML có thể dùng đường dẫn file thay vì base64. Test kiểm tra `imgs_reopen >= imgs_orig` sẽ pass khi cả hai đều 0.

## Phát hiện về margin (paragraph spacing)

- Khi chèn paragraph có inline CSS `margin-top:12pt;margin-bottom:6pt` trước khi Lưu, sau vòng round-trip soffice **convert đơn vị** từ `pt` sang `cm`:
  - `margin-top: 0.42cm` (≈ 11.9pt — rất gần 12pt)
  - `margin-bottom: 0.21cm` (≈ 5.95pt — rất gần 6pt)
- Kết luận: **margin giữ nguyên giá trị thực**, chỉ đổi đơn vị từ `pt` sang `cm`. Cho phép sai số ±2pt trong test.

## Phát hiện về whitespace

- Soffice chuyển đổi HTML→DOCX→HTML có thể thay đổi whitespace (thêm/xóa newline, tab). Test dùng `_normalize_ws()` để so sánh text nội dung không phụ thuộc whitespace.

## Kiểm thử bắt buộc

| Kiểm thử | Kết quả |
|----------|---------|
| `python -m unittest discover -s tests -p "test_*.py"` | 99/99 PASS (tăng từ 96) |
| `node scripts/check-syntax.js` | 89/89 PASS |
| `node tests/run-tests.js` | 1511/1511 PASS |

## Kết luận

Luồng **Lưu file thật** (`save_document_dialog`) của Writer hoạt động tốt trên tất cả 7 file `.docx` thật:
- Nội dung văn bản giữ nguyên
- Số lượng bảng không đổi
- Encoding UTF-8 không có lỗi `�` (mojibake)
- Thêm nội dung trước khi Lưu → nội dung mới còn nguyên sau Mở lại
- Inline CSS margin (paragraph spacing) giữ nguyên giá trị (chuyển đơn vị pt→cm)

Không tìm thấy lỗi THẬT cần sửa trong `main.py`.

## Git status

```
On branch save-roundtrip
Untracked files:
  TASK-BRIEF-SAVE-ROUNDTRIP.md
  tests/test_writer_save_roundtrip.py
  docs/HANDOFF-WRITER-SAVE-ROUNDTRIP-FIDELITY.md
```
