# Brief W23 (codex) — Header/footer: chiều cao vùng đầu/chân trang và vùng thân trang theo đúng Word (lớp `page`)

Đọc trước: `docs/QUY-UOC-DOI-CHIEU.md` (W1–W12d, W21a, bộ đo), `docs/TASK-QUEUE.md` (trạng thái 21/9),
`scripts/layout-audit/_writer_layout_audit.py`, `_canvas_para_metrics.py` (từ 21/9 tách `<li>`), `_page_divergence.py`.
Cache Word 23 file: `E:\VNOffice-opencode-lan-audit\_writer_out_w12a\*.word.jsonl` (chép vào `_out/`, KHÔNG chép
`*.canvas.jsonl`). Mẫu: `E:\VN OFice\file test\landocx\d01..d24.docx` (ngoài git; d10 hỏng, bỏ).
Baseline main `76b4050` (bộ đo tách `<li>`): page 552, wrap 32, drift:unknown 58, line-height 31, spacing 38.

## Số đo Claude (21/9, Word 2016 COM + app thật)

Quy tắc Word: **thân trang bắt đầu tại `max(lề trên, headerDistance + chiều cao header)`, kết thúc tại
`min(cao trang − lề dưới, cao trang − footerDistance − chiều cao footer)`** — header/footer cao hơn lề thì đẩy thân
trang, không đè.

| File | Word (pt) | Canvas (px, 1pt = 4/3px) | Hệ quả |
|---|---|---|---|
| d09 | lề trên 72, headerDist 36, header 3 đoạn → thân bắt đầu **y=96** (header cao 60pt) | header h=**126px** (=94,5pt, cao hơn Word 34,5pt), bodyTop=175px (=131pt) | thân trang canvas ngắn hơn Word 35pt/trang; lớp `page` d09 = 37 |
| d15 | lề dưới 56,7, footerDist 2,85, footer 6 đoạn: footer top **y=765** → thân kết thúc 765 (ngắn hơn lề 20pt) | footer h=**158px** (=118,5pt; Word 74pt); header 2 đoạn rỗng h=95,9px nhưng bodyTop=76,6px = lề (không đẩy) | canvas xếp nhiều hơn Word/trang → "II. SẢN PHẨM" Word p3, canvas p2; `page` d15 = 15 |
| d07 | lề trên 72, headerDist 0, header 4 đoạn 46 ký tự → thân bắt đầu y=72 (header nằm gọn trong lề) | header h=**150,5px** (=113pt > 72), bodyTop=152px | canvas mất 41pt/trang so với Word; `page` d07 = 136 (Word p1 y=700 → canvas p2) |
| d05 | footer top 802,5 < lề 817,5 (−15pt/trang) | chưa đo | 2 trang, `page` 0 |
| d13 | header 36 ký tự, footer 24 ký tự đều nằm trong lề (thân y=46,5 = lề) | chưa đo | `page` d13 = 30, cần loại trừ header/footer trước |

Hai lớp con, sửa theo thứ tự:

**W23a — đoạn trong header/footer đo như thân:** header/footer canvas cao gấp 1,5–2 lần Word vì các đoạn trong zone
không qua cùng đường chuẩn hoá của thân (`--vno-lh`/`--vno-font-ratio` W1, strut W8/W12d, lề đoạn W2, `<br>` thừa
W4…). Bước 1: dán HTML LibreOffice của zone header d09/d07/d15 (`_writer_html_probe.py` hoặc log `result.content`) và
số đo Word từng đoạn header (`_word_para_metrics.ps1` mở rộng cho `Sections(1).Headers(1).Range.Paragraphs` — thêm
trường `zone: "header"/"footer"`, KHÔNG đổi định nghĩa các trường có sẵn). Bước 2: áp đúng pipeline thân cho zone (một
chỗ: nơi `_normalizeImportedHtml`/`_normalizeImportedFontMetrics` chạy cho body nhưng bỏ zone). Đo: chiều cao header/
footer canvas ≈ Word ±2px trên d07/d09/d13/d15.

**W23b — vùng thân trang theo quy tắc Word:** khi header/footer (sau W23a) cao hơn lề: đẩy `bodyTop` = headerDist +
cao header; cắt đáy thân = cao trang − footerDist − cao footer. Khi nằm trong lề: giữ nguyên lề (d07/d13/d15 header).
Bộ phân trang (`_recomputeLivePagination`, `.vno-page-auto-gap`) phải dùng chiều cao thân này cho MỌI trang (cả
trang 2+). Đo: `_page_divergence.py` d09/d15/d07 — điểm lệch đầu tiên phải lùi xa hơn; ma trận 24 file `page` giảm,
không lớp nào tăng (wrap/line-height/spacing/font-size).

## Ràng buộc

- Chạy app với profile riêng: `$env:LOCALAPPDATA = "E:\VNOffice-profiles\codex"` trong cùng phiên trước khi chạy python.
- Không đổi định nghĩa `kind` trong `_writer_layout_audit.py`; chỉ được THÊM trường. Không hằng số không có số đo.
- Mỗi lớp con: 1 chỗ sửa + unit test (`tests/unit/writer-*.test.js`) + quy ước W23a/W23b vào QUY-UOC + commit riêng.
- Gate: `node scripts/check-syntax.js`, `node tests/run-tests.js` (main 1797/1797), `python -m unittest discover -s tests -p "test_writer*.py"`.
- Không commit `file test`, không tên tài liệu thật, không bịa số; báo cáo có bảng kind trước/sau 24 file. Hết hạn mức:
  commit phần xong + ghi rõ.
