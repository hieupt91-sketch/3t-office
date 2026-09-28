# TASK BRIEF — Writer: vì sao xuất .doc qua DOCX làm legacy20.doc hỏng (để bật lại đường này) (agy, CODE — chẩn đoán trước)

Worktree: `E:\VNOffice-agy-doc-export` (nhánh `fix/writer-doc-export-legacy20-agy`, tách từ `main`). Đặt `$env:LOCALAPPDATA = "E:\VNOffice-profiles\agy"` trước mọi lần chạy app/soffice.

## Bối cảnh
- `main.py` có `_convert_writer_html_to_doc` (HTML → DOCX → hậu xử lý `postprocess_writer_docx` với DOCX chuẩn hoá từ .doc gốc → LibreOffice `MS Word 97`). Đường này làm bản lưu .doc đúng số trang Word (legacy06 3 trang) NHƯNG làm `legacy20.doc` lưu ra tệp **Word 2016 không mở được** (hộp thoại lỗi, kể cả đổi tên). Nên hiện đang TẮT bằng cờ `WRITER_DOC_EXPORT_VIA_DOCX = False`.
- Tệp: `E:\VN OFice\file test\lan-legacy\legacy20.doc` (gitignored, KHÔNG commit). Bản lưu lỗi mẫu: `E:\VNOffice-profiles\claude\ld20-main\_rt_legacy20.doc`; bản lưu tốt (đường trực tiếp): `E:\VNOffice-profiles\claude\ld20-pre\_rt_legacy20.doc`.
- Chẩn đoán dở của Codex (đọc): `docs/HANDOFF-WRITER-LEGACY-DOC2.md` mục Vòng 3 trên nhánh `fix/writer-legacy-doc2-codex` (worktree `E:\VNOffice-codex-writer-legacy-doc2`).

## Việc
1. **Chia đôi các bước** để tìm bước sinh tệp hỏng: (a) HTML → DOCX (chưa hậu xử lý) → DOC; (b) có hậu xử lý → DOC; rồi tắt/bật từng bước con trong `postprocess_writer_docx` (dùng bản sao hàm trong script scratch, KHÔNG sửa code sản phẩm khi đang chia đôi) cho tới khi tìm ra bước/phần tử XML làm bộ lọc `MS Word 97` của LibreOffice sinh .doc hỏng. Mỗi lần kiểm tra Word mở được bằng `scripts\layout-audit\_word_oracle3.ps1 -File <tệp>` (trả `OK pages=N` là mở được; `FAIL (timeout…)` là hỏng). Trước mỗi lần đo, tắt các WINWORD ẨN (không có tiêu đề cửa sổ) do chính bạn mở; KHÔNG tắt Word có cửa sổ của người dùng. Commit sớm `docs/HANDOFF-WRITER-DOC-EXPORT-LEGACY20-FINDINGS.md`.
2. Sửa nguyên nhân gốc (trong hậu xử lý hoặc chuẩn bị DOCX trước khi xuất .doc), KHÔNG đổi bố cục tài liệu người dùng (không đổi kiểu bao chữ, không bỏ nội dung) để né lỗi.
3. Chỉ bật lại `WRITER_DOC_EXPORT_VIA_DOCX = True` khi: Word mở được **20/20** bản lưu `legacy01`–`legacy20.doc`, VÀ số trang bản lưu không tệ hơn đường trực tiếp ở bất kỳ tệp nào (hiện đường trực tiếp lệch legacy06/14/17/18). Nếu không đạt, giữ `False`, ghi trung thực.

## Kiểm chứng
`python scripts\layout-audit\_batch_writer.py <worktree> "E:\VN OFice\file test\lan-legacy" <out> legacy01.doc … legacy20.doc` (canvas/lưu/Word mở được); 23 docx `E:\VN OFice\file test\landocx` (bỏ d10) 23/23; `_writer_shape_counts.py` 0 vượt gốc; `node tests/run-tests.js` + `python -m unittest discover -s tests` foreground; test hồi quy cho nguyên nhân tìm được.

## Luật cứng
Không đụng Sheet. Không commit tài liệu thật. KHÔNG chạy tác vụ ở nền rồi ngồi chờ. KHÔNG tăng timeout test. Commit sau mỗi bước, tiền tố `fix(writer): W-docexport`. Không merge vào `main`. Handoff `docs/HANDOFF-WRITER-DOC-EXPORT-LEGACY20.md`, PASS/FAIL/NOT RUN/BLOCKED trung thực.