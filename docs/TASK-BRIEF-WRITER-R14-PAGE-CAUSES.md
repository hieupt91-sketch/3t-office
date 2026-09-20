# Brief R14 (opencode) — Phân loại nguyên nhân lớp `page` (442 đoạn / 15 file) sau W23: đoạn bị đẩy nguyên khối, bảng dài, keepNext, khác. CHỈ ĐO

Main `9c429a2`: lớp `page` còn 442 (d01 232, d09 39, d02 34, d07 30, d13 25, d11 27, d15 14, d16 14…). Bộ phân trang
canvas (`_recomputeLivePagination`) coi mỗi khối cấp 1 là nguyên tử: khối nào không vừa phần còn lại của trang thì đẩy
CẢ khối sang trang sau; Word thì cắt đoạn/bảng giữa chừng (widow/orphan 2 dòng). Cần số: bao nhiêu điểm lệch đầu tiên
do (a) đoạn bị đẩy nguyên khối, (b) bảng dài hơn một trang không được cắt, (c) `w:keepNext`/`w:keepLines`, (d) khác.

Worktree `E:\VNOffice-opencode-writer-r14` (branch `audit/writer-r14`). `$env:LOCALAPPDATA = "E:\VNOffice-profiles\opencode"`.
Cache Word: chép `E:\VNOffice-opencode-lan-audit\_writer_out_w12a\*.word.jsonl` vào `_out/`; chạy
`python scripts/layout-audit/_writer_layout_audit.py . "E:\VN OFice\file test\landocx" _out` (24 file, ~12 phút) để có
`*.canvas.jsonl`/`*.pairs.jsonl` trên main hiện tại.

## Việc: script `scripts/layout-audit/_page_causes.py <outdir> <docdir>` (mở rộng `_page_divergence.py`, KHÔNG đổi bộ đo)

Với mỗi file, duyệt các cặp (canvas, Word) theo thứ tự; tại MỖI điểm chuyển trang của Word (cặp i có `word.page` =
p, cặp i+1 có `word.page` = p+1) và của canvas, ghi lại:
- Word: đoạn cuối trang p có bị cắt không? = `y + lines × pitch` vượt đáy thân trang (đáy = cao trang − lề dưới − phần
  footer vượt lề; lấy `pgSz`/`pgMar` từ `document.xml`; pitch = `ls` theo `lsRule` như `_writer_layout_audit.py`
  tính) → nếu vượt → Word **cắt đoạn giữa chừng** (ghi số dòng ở trang p / p+1 ước lượng).
- Canvas: đoạn tương ứng nằm trọn trang nào; nếu Word cắt mà canvas đẩy cả đoạn → nguyên nhân **(a)**.
- Nếu khối canvas ngay trước điểm chuyển là `TABLE` cao hơn phần còn lại của trang → **(b)** (ghi chiều cao bảng/px và
  số trang Word bảng đó trải, từ `tbl` rows của Word).
- Nếu đoạn đầu trang p+1 của Word (hoặc đoạn trước nó) có `keepNext`/`keepLines`/`pageBreakBefore` trong OOXML (đoạn
  hoặc style chain) → **(c)**.
- Còn lại **(d)** kèm mô tả ngắn (chênh lệch tích luỹ y giữa Word và canvas tại điểm đó, px).

Xuất `docs/HANDOFF-WRITER-R14.md`: bảng file × (số điểm chuyển trang Word, số điểm khớp canvas, a, b, c, d), tổng
theo nguyên nhân, 3 ví dụ mỗi loại (file + 6 chữ đầu đoạn + số đo). Không sửa code sản phẩm, không bịa số, không
commit `file test`/`_out`, không tên tài liệu thật. Commit script + handoff (`git commit -F`, tiếng Việt không dấu).
