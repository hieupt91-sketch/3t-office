# TASK BRIEF — Writer: 2 lỗi lưu còn sót (legacy06 .doc 3→4 trang; d09 4 hình trang 8→9) (Codex)

Worktree: `E:\VNOffice-codex-writer-save-followups` (nhánh `fix/writer-save-followups-codex`, tách từ `fix/writer-legacy-doc-codex` đã gộp `main` — đã có lưu tại chỗ Ctrl+S của agy, đường mở .doc qua DOCX trung gian của bạn, và bản sửa vị trí hình của Claude). Đặt `$env:LOCALAPPDATA = "E:\VNOffice-profiles\codex"` trước mọi lần chạy app/soffice.

## Lỗi 1 — legacy06.doc: canvas 3 trang = Word, bản lưu .doc 4 trang
Handoff của bạn (`docs/HANDOFF-WRITER-LEGACY-DOC.md`) ghi lỗi này nằm ở đường lưu — nay đường lưu ĐƯỢC PHÉP sửa (agy đã merge lưu tại chỗ: `main.py` `save_document_in_place` / `save_document_dialog`, `FORMAT_FILTERS["doc"] = "MS Word 97"`). Lưu .doc hiện đi HTML → LibreOffice `MS Word 97` trực tiếp, KHÔNG qua hậu xử lý DOCX (`postprocess_writer_docx` chỉ chạy cho docx). Hướng gợi ý (tự đo trước khi chọn): xuất DOCX qua đúng đường docx đã chuẩn (postprocess có `source_docx` = DOCX trung gian chuyển từ .doc gốc) rồi LibreOffice DOCX → `MS Word 97`. Kiểm tra cả Ctrl+S tại chỗ trên .doc và Lưu thành .doc.

## Lỗi 2 — d09: 4 hình (Rectangle 7, 21, 27, 36) Word trang 8 → bản lưu trang 9
Claude đo bằng `scripts/layout-audit/_word_shape_pages.ps1 -Source "E:\VN OFice\file test\landocx\d09.docx" -Saved <bản lưu>`: nguồn p107/p108/p111 → bản lưu p109/p110/p112 (lệch 1–2 đoạn ở sát ngắt trang). Hàm liên quan: `_relocate_passthrough_anchors`, `_restore_missing_writer_drawings` (`slot_for`) trong `adapters/libreoffice/common/ooxml_zip_patch.py`. Có thể dùng harness ngoài app: bật tạm biến môi trường để ghi DOCX ngay trước `postprocess_writer_docx` trong `main.py` (KHÔNG commit phần debug), rồi chạy lại postprocess nhiều lần; mẫu harness của Claude: `C:\Users\3TCOMP~1\AppData\Local\Temp\claude\E--VN-OFice\a43656e9-bd73-4e02-842c-dd9db15498b4\scratchpad\anchor_harness.py`.

## Kiểm chứng bắt buộc
- 8 file `.doc` (`E:\VN OFice\file test\lan-legacy\legacy01-08.doc`): canvas = Word và bản lưu = Word (mục tiêu 8/8).
- 23 docx `E:\VN OFice\file test\landocx` (bỏ d10) bằng `_batch_writer.py`: 23/23 Word = canvas = bản lưu; `_writer_shape_counts.py` 0 file vượt gốc, 0 docPr trùng; `_word_shape_pages.ps1` d06 = 0 lệch, **d09 = 0 lệch**, d24 = 0 lệch, d04/d07 = 0 lệch.
- Bản lưu phải chứa đoạn sửa ZZ (không trả lại byte gốc). Word mở được mọi bản lưu.
- `node tests/run-tests.js` + `python -m unittest discover -s tests` foreground; unit test cho mỗi lỗi (fail trước sửa, pass sau sửa).

## Luật cứng
Commit sớm findings `docs/HANDOFF-WRITER-SAVE-FOLLOWUPS-FINDINGS.md` trước khi sửa. Không đụng Sheet. Không commit tài liệu thật. KHÔNG chạy tác vụ ở nền rồi ngồi chờ. Commit sau mỗi bước, tiền tố `fix(writer): W-savefollow`. Không rebase/force, không merge vào `main`. Handoff cuối `docs/HANDOFF-WRITER-SAVE-FOLLOWUPS.md`, PASS/FAIL/NOT RUN/BLOCKED trung thực.
