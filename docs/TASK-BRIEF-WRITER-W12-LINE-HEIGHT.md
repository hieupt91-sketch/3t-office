# Brief W12 — Lớp `line-height` còn lại của Writer (126 đoạn / 12 file) + `font-size` (36 / 4 file)

## Bối cảnh (đọc trước)

- `docs/QUY-UOC-DOI-CHIEU.md` (W1–W11: giãn dòng = bội số × chiều cao dòng tự nhiên của font từng run; khoảng cách
  đoạn = MAX(sa, sb); strut của `<p>` = font của run đầu; font mặc định từ docDefaults + theme…).
- `docs/MA-TRAN-WRITER-2026-09-15b.md`: ma trận hiện tại. Lớp `line-height` tập trung ở d09 (43), d11 (24), d07 (21),
  d06 (15), d19 (6); `font-size` ở d19 (19), d21 (14).
- Bộ đo: `python scripts/layout-audit/_writer_layout_audit.py . "file test/docx" _out d09.docx d11.docx d07.docx d06.docx d19.docx d21.docx`
  → `_out/_writer_layout_matrix.md` và `_out/<tên>.pairs.jsonl` (từng đoạn: Word COM vs canvas app thật, có
  `kind`, chiều cao dòng Word/canvas, font, cỡ, `w:line`, `w:lineRule`, spacing). Word COM: `Font.NameOther` cho tên
  font Latin, `+Headings/+Body` giải qua theme1.xml. Thư mục mẫu nằm ngoài git (`file test/docx`, đã có sẵn trong worktree).

## Việc — theo đúng phương pháp "gom lớp → một giá trị chung → sửa một chỗ"

1. Chạy bộ đo trên 6 file trên. Từ các cặp `kind == "line-height"` lập bảng: `w:lineRule` (auto/exact/atLeast),
   `w:line`, font/cỡ run, chiều cao dòng Word (pt), chiều cao canvas (px), tỉ số canvas/Word. Gom theo
   (lineRule, font) — tìm giá trị chung: ví dụ `exact` bị canvas vẽ theo `auto`, `atLeast` bị coi là `exact`, font
   `.VnTime`/`VNI-Times` thiếu nên ratio đo trong trình duyệt khác Word, hay tab/`w:kern`…
2. Đề xuất MỘT quy ước (W12) giải thích ≥ 80% số cặp, ghi số đo gốc. Sửa MỘT chỗ trong
   `adapters/libreoffice/writer/writer-adapter.js` (+ `apps/writer/writer.css` nếu cần), thêm unit test vào
   `tests/unit/writer-doc-font-spacing.test.js` (suite 153) khoá quy ước.
3. Làm tương tự cho `font-size` (d19/d21): so `w:sz` run vs cỡ canvas; nghi vấn: cỡ lấy từ style đoạn thay vì run,
   hoặc `w:szCs`, hoặc `<font size=N>` HTML của LibreOffice (1–7) đổi sai sang pt.
4. Chạy lại bộ đo trên CẢ 24 file (`python scripts/layout-audit/_writer_layout_audit.py . "file test/docx" _out`):
   hàng `line-height` phải giảm ≥ 60% (126 → ≤ 50), `font-size` 36 → ≤ 10, KHÔNG lớp nào tăng, số trang canvas
   không xa Word hơn trước (cột `page`). Dán ma trận trước/sau vào báo cáo.

## Ràng buộc

- Không sửa "cho file X"; không chỉnh CSS theo cảm tính — mọi hằng số phải có số đo Word COM đi kèm.
- Không dùng tài liệu thật trong tên/commit; ma trận chỉ ghi số.
- Gate: `node scripts/check-syntax.js`, `node tests/run-tests.js` (1778/1778 hiện tại), `python -m unittest discover -s tests -p "test_writer*.py"`.
- Chỉ dùng soffice profile của Writer (app mở docx) — không chạy batch Sheet trong worktree này.
- Commit bằng `git commit -F` tiếng Việt không dấu; báo cáo phải có số đo thật (ma trận trước/sau), không có thì không nhận.
