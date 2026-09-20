# Brief W21 — Lỗi HIỂN THỊ của VN Writer phát hiện bằng mắt (vòng 10) — agy

Nguồn: `docs/HANDOFF-VISUAL-INSPECTION-R10.md` mục 5 (ảnh cắt `docs/screenshots/r10/`). Mẫu `file test/landocx/d09.docx, d13.docx`.

| # | Lớp | Vị trí | Triệu chứng | Hướng |
|---|---|---|---|---|
| L6 | **Chồng chữ (double paint)** | d13 trang 2, mục 2.1 dòng 1 | chữ "cùng một hệ thống" vẽ đè lên chính nó, bóng kép | nghi hai lớp: `<span data-vno-float>`/khung nổi hoặc lớp phân trang (`_recomputeLivePagination`) sao chép nội dung; hoặc `text-shadow`/`::after`. Dùng DevTools (Playwright) tại vị trí đó: `document.elementsFromPoint(x,y)` liệt kê mọi phần tử chồng nhau, in HTML |
| L8 | **Gạch đầu dòng `-` thành `•`** | d09 trang 1 mục 1–2 | Word: bullet là ký tự hyphen (numbering `w:lvlText="-"`), VN Writer: chấm tròn | LibreOffice HTML ghi `<ul>` không kèm ký tự; lấy `w:lvlText` + font (`w:rPr/w:rFonts` của lvl) từ `word/numbering.xml` theo `numId/ilvl` của đoạn và đặt `list-style`/`::marker` đúng ký tự. Quy ước W21b: bullet = đúng `lvlText` của numbering.xml |

## Cách làm (đọc đủ AGENTS.md và docs/QUY-UOC-DOI-CHIEU.md trước)

1. Đo trước: mở d13/d09 trong app thật (Playwright/Edge như lần chụp), chụp lại đúng vùng lỗi, và dán HTML của đoạn
   lỗi (`_writer_html_probe.py . "file test/landocx/d13.docx" "<chuỗi>"`) vào handoff.
2. Sửa MỘT chỗ mỗi lớp trong `adapters/libreoffice/writer/writer-adapter.js` hoặc `apps/writer/writer.css`; unit test
   trong `tests/unit/writer-*.test.js` (đăng ký `tests/run-tests.js`); ghi W21a/b vào QUY-UOC.
3. Đo sau: chụp lại vùng đó (hết chồng chữ; bullet là `-`), và chạy `python scripts/layout-audit/_writer_layout_audit.py . "file test/landocx" _out d09.docx d13.docx`
   (chép cache Word `*.word.jsonl` từ `E:\VNOffice-opencode-lan-audit\_writer_out_w12a`, KHÔNG chép canvas cache) — số
   trang canvas d09 14/14, d13 10/10 giữ nguyên, không lớp nào tăng.
4. Gate: `node scripts/check-syntax.js`, `node tests/run-tests.js` (100%), `python -m unittest discover -s tests -p "test_writer*.py"`.
   Chạy mọi lệnh ĐỒNG BỘ trong phiên (không background task). Không commit `file test`/ảnh tài liệu thật. Commit
   `git commit -F` tiếng Việt không dấu, kèm handoff `docs/HANDOFF-WRITER-RENDER-R10.md` có ảnh trước/sau.
