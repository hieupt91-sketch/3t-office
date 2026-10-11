# Brief W12d + W10 (codex) — strut `<p>` cao hơn run (d11, 15–24 đoạn) rồi lớp `wrap` (86 đoạn / 15 file)

Đọc trước: `docs/QUY-UOC-DOI-CHIEU.md` (W1–W12c), `docs/TASK-BRIEF-WRITER-W12-LINE-HEIGHT.md` (v2, mục W12d),
`docs/TASK-BRIEF-WRITER-W10-WRAP.md`. Main hiện `1b5ff81`: W12a/b/c đã merge (24 file: page 518→?, line-height 75→~50,
d07 line-height 0, d06 3). Cache Word có sẵn: chép `E:\VNOffice-opencode-lan-audit\_writer_out_w12a\*.word.jsonl` vào
`_out/` (KHÔNG chép `*.canvas.jsonl` — bộ đo dùng lại cache canvas nếu còn → số "sau" sẽ giả).

## W12d (làm trước)

- Số đo: d11 Times New Roman 8 pt `lsRule` single → Word 12–13 px/dòng (8 pt × 1.149); canvas 18 px = strut của `<p>`
  12 pt. W8 (`_normalizeImportedFontMetrics`) đặt font `<p>` = run đầu nhưng chưa phủ trường hợp này.
- Bước 1 (dán kết quả): `python scripts/layout-audit/_writer_html_probe.py . "file test/landocx/d11.docx" "<chuỗi 1 đoạn 8pt>"`
  → xem HTML LibreOffice: run 8 pt nằm trong `<font size="1">`/`<span style="font-size:8pt">`/lồng `<b>`? `<p>` có
  `style="font-size:12pt"`? Xác định vì sao W8 bỏ sót (lồng nhau? đơn vị %? `<font size=N>` 1–7?).
- Bước 2: mở rộng W8 một chỗ (`adapters/libreoffice/writer/writer-adapter.js`), unit test suite 153
  (`tests/unit/writer-doc-font-spacing.test.js`), ghi W12d vào QUY-UOC. Đo lại d11 (xoá `_out/d11.canvas.jsonl` trước):
  line-height 15 → ≤ 3, không lớp nào tăng.

## W10 wrap (sau W12d)

Làm đúng 4 bước trong `TASK-BRIEF-WRITER-W10-WRAP.md` (bổ sung bề rộng cột chữ vào bộ đo Word + canvas → gom theo
nguyên nhân (a) ô bảng hẹp / (b) thụt lề list / (c) cột rộng hơn Word → mỗi nguyên nhân một quy ước + sửa một chỗ + test).
Mục tiêu: `wrap` 86 → ≤ 20 trên 24 file, không lớp nào tăng.

## Gate & nộp

`node scripts/check-syntax.js`, `node tests/run-tests.js` (main 1783/1783), `python -m unittest discover -s tests -p "test_writer*.py"`;
bảng tổng `kind` trước/sau 24 file (`_out/_writer_layout_matrix.md`). Chạy tuần tự (Word COM + profile Writer). Không
commit `file test`, không ghi tên tài liệu thật, không đổi mặc định toàn cục, không bịa số. Nếu sắp hết hạn mức: commit
phần xong + ghi rõ còn gì. Commit `git commit -F` tiếng Việt không dấu.
