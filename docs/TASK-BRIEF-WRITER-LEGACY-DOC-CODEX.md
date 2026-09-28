# TASK BRIEF — Writer: số trang lệch Word khi mở/lưu tài liệu .doc (Word 97-2003) (Codex)

Worktree: `E:\VNOffice-codex-writer-legacy-doc` (nhánh `fix/writer-legacy-doc-codex`, tách từ `main`). Đặt `$env:LOCALAPPDATA = "E:\VNOffice-profiles\codex"` trước mọi lần chạy app/soffice.

## Vì sao
Đo toàn ổ LAN công ty (28/9): 76/206 tài liệu Word thật là `.doc` cũ. Claude chạy `scripts/layout-audit/_batch_writer.py` trên 8 file `.doc` thật (`E:\VN OFice\file test\lan-legacy\legacy01.doc` … `legacy08.doc`, gitignored — chép sang worktree nếu cần, KHÔNG commit): 8/8 mở + sửa + lưu được, nhưng số trang lệch Word 2016 ở 3/8:

| file | Word gốc | canvas | bản lưu (Word) |
|---|---:|---:|---:|
| legacy01.doc | 5 | 4 | 4 |
| legacy04.doc | 11 | 12 | 10 |
| legacy06.doc | 3 | 4 | 5 |

Báo cáo gốc: `E:\VNOffice-profiles\claude\legacy-doc-audit\_batch_writer_report.md`. Lưu ý: `_batch_writer.py` đọc thống kê đoạn/sectPr bằng ZIP nên cột o (gốc) là `None` với .doc — cần chuyển .doc gốc sang DOCX bằng Word COM (read-only, SaveAs2 vào thư mục tạm; KHÔNG SendKeys) để có tham chiếu cấu trúc.

## Việc
1. **Chẩn đoán trước, commit sớm** `docs/HANDOFF-WRITER-LEGACY-DOC-FINDINGS.md`: với từng file lệch, tìm lớp gây lệch (khác biệt LibreOffice import .doc so với Word: lề/khổ giấy, section, bảng, font thay thế, khoảng cách dòng/đoạn, ngắt trang, header/footer, danh sách…). Dùng các công cụ có sẵn: `_word_oracle3.ps1` (trang theo PDF Word, KHÔNG dùng ComputeStatistics), `_word_para_pages.ps1` (trang từng đoạn) để tìm đoạn đầu tiên lệch trang; so với DOCX chuyển bởi Word và với đường mở DOCX tương ứng (đường .docx đã 23/23 khớp Word). Ghi rõ từng file lệch vì đâu.
2. **Sửa nguyên nhân gốc** theo thứ tự quyết định AGENTS.md mục 3 (reuse LibreOffice → adapter/platform → module VN). Không sửa LibreOffice Core. Không vá kiểu trả lại byte file gốc.
3. **Kiểm chứng bắt buộc:**
   - 8 file .doc: số trang canvas = Word và bản lưu = Word (mục tiêu 8/8; nếu không đạt ghi trung thực file nào còn lệch và vì sao).
   - Không hồi quy đường .docx: `_batch_writer.py` 23 file `E:\VN OFice\file test\landocx` (bỏ d10) phải 23/23 trang Word = canvas = bản lưu như `main`; `python scripts\layout-audit\_writer_shape_counts.py "E:\VN OFice\file test\landocx" <thư mục batch>` báo 0 file vượt gốc và 0 docPr id trùng; `scripts\layout-audit\_word_shape_pages.ps1` cho d06, d09, d24 không tệ hơn `main` (main: d06 0 lệch, d09 4 lệch, d24 0 lệch).
   - `node tests/run-tests.js` + `python -m unittest discover -s tests` foreground. Unit test cho từng lớp sửa.
4. Handoff cuối `docs/HANDOFF-WRITER-LEGACY-DOC.md` theo mẫu `09-templates/AGENT-HANDOFF.md`, PASS/FAIL/NOT RUN/BLOCKED trung thực.

## Luật cứng
Không đụng phần lưu tại chỗ (agy đang sửa `save()` trong adapter Writer/Sheet, `main.py` hàm `save_document_dialog`, `uno-bridge.js`) — nếu buộc phải sửa `main.py` thì chỉ phần mở/convert, ghi rõ trong handoff. Không commit tài liệu thật. KHÔNG chạy tác vụ ở nền rồi ngồi chờ. Commit sau mỗi bước, tiền tố `fix(writer): W-legacydoc`. Không rebase/force, không merge vào `main`.
