# TASK BRIEF — Writer: 3 tài liệu .doc thật còn lệch số trang Word (đợt 2) (Codex)

Worktree: `E:\VNOffice-codex-writer-legacy-doc2` (nhánh `fix/writer-legacy-doc2-codex`, tách từ `fix/writer-save-followups-codex` — đã có đường mở .doc qua DOCX trung gian và xuất .doc qua DOCX hậu xử lý của bạn). Đặt `$env:LOCALAPPDATA = "E:\VNOffice-profiles\codex"` trước mọi lần chạy app/soffice.

## Vì sao
Claude đo thêm 12 file .doc thật từ LAN (`E:\VN OFice\file test\lan-legacy\legacy09.doc` … `legacy20.doc`, gitignored, KHÔNG commit) bằng `_batch_writer.py` trên `main` `37fb7f2` (trước bản sửa lưu .doc của bạn): 9/12 khớp. Lệch:

| file | Word gốc | canvas | bản lưu |
|---|---:|---:|---:|
| legacy14.doc (2,7 MB) | 15 | 15 | 18 |
| legacy17.doc | 3 | 3 | 2 |
| legacy18.doc | 3 | 2 | 2 |

Báo cáo: `E:\VNOffice-profiles\claude\legacydoc-wave2\_batch_writer_report.md`. Đo lại trên nhánh này trước (bản lưu có thể đã đổi nhờ xuất qua DOCX hậu xử lý).

## Việc
1. Commit sớm `docs/HANDOFF-WRITER-LEGACY-DOC2-FINDINGS.md`: số đo lại + với từng file lệch, đoạn đầu tiên lệch trang (`_word_para_pages.ps1`) và lớp nguyên nhân.
2. Sửa nguyên nhân gốc (thứ tự AGENTS.md mục 3; không sửa LibreOffice Core; không trả lại byte gốc).
3. Kiểm chứng: 20 file .doc (`legacy01`–`legacy20`): canvas = Word và bản lưu = Word (báo trung thực file nào còn lệch và vì sao); 23 docx `E:\VN OFice\file test\landocx` (bỏ d10): 23/23 Word = canvas = bản lưu; `_writer_shape_counts.py` 0 vượt gốc + 0 docPr trùng; `_word_shape_pages.ps1` d04/d06/d07/d09/d24 = 0 lệch; bản lưu có ZZ; `node tests/run-tests.js` + `python -m unittest discover -s tests` foreground; unit test cho mỗi lớp sửa.
4. Handoff `docs/HANDOFF-WRITER-LEGACY-DOC2.md` theo mẫu `09-templates/AGENT-HANDOFF.md`, PASS/FAIL/NOT RUN/BLOCKED trung thực.

## Luật cứng
Không đụng Sheet (`adapters/libreoffice/sheet/**`, `apps/sheet/**`, phần sheet trong `main.py`). Không commit tài liệu thật. KHÔNG chạy tác vụ ở nền rồi ngồi chờ. Commit sau mỗi bước, tiền tố `fix(writer): W-legacydoc2`. Không rebase/force, không merge vào `main`.