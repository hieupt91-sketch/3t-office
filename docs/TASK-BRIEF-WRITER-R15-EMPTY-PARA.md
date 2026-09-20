# Brief R15 (opencode) — Đo lớp "đoạn rỗng cao theo cỡ dấu đoạn" (drift:empty-para 14, header/footer d15) trên 24 file. CHỈ ĐO

Word: đoạn rỗng cao = cỡ chữ của DẤU ĐOẠN (`w:pPr/w:rPr/w:sz`, rồi style, rồi docDefaults) × giãn dòng. LibreOffice
HTML xuất đoạn rỗng thành `<p ...><br></p>` KHÔNG mang cỡ dấu đoạn → canvas dùng cỡ mặc định (d15 footer: Word 10pt,
canvas 12–14pt; thân nhiều file có `drift:empty-para`). Cần biết lớp này lớn bao nhiêu để làm W26.

Worktree `E:\VNOffice-opencode-writer-r15` (branch `audit/writer-r15`), `$env:LOCALAPPDATA = "E:\VNOffice-profiles\opencode"`.
Cache Word đã chép ở `_out/*.word.jsonl`; canvas: chạy `python scripts/layout-audit/_writer_layout_audit.py . "E:\VN OFice\file test\landocx" _out`.

## Script `scripts/layout-audit/_empty_para_class.py <wt> <docdir> <outdir>`

1. OOXML (`document.xml` + `header*.xml` + `footer*.xml`): với mỗi `w:p` KHÔNG có `w:t` (rỗng, ngoài bảng và trong
   bảng đếm riêng): cỡ dấu đoạn = `pPr/rPr/sz` nếu có, không thì style chain (`pStyle` → basedOn) `rPr/sz`, không thì
   docDefaults; cỡ "mặc định" = Normal/docDefaults. Đếm: tổng đoạn rỗng, số đoạn rỗng có cỡ dấu đoạn ≠ cỡ mặc định
   (theo file, theo vùng thân/bảng/header/footer), phân bố cỡ (8/9/10/11/12/13/14pt…).
2. Word COM (`Visible=false`, `Quit`): với 10 đoạn rỗng đầu tiên có cỡ ≠ mặc định (thân) của 5 file có nhiều nhất: pitch
   thật = `y(đoạn sau) − y(đoạn rỗng)` (Information(6)) và `Font.Size` của range đoạn rỗng → xác nhận Word dùng cỡ dấu đoạn.
3. Canvas (`*.canvas.jsonl`): khối `text == ""` tương ứng (ánh xạ theo thứ tự trong cùng vùng thân: đoạn rỗng thứ k) →
   `h` và `size`. Bảng: file × (đoạn rỗng ≠ mặc định) × (Word pitch trung bình) × (canvas h trung bình) × chênh px.
4. Handoff `docs/HANDOFF-WRITER-R15.md`: bảng 23 file, tổng, 5 ví dụ (file + cỡ Word + pitch Word + h canvas), kết
   luận lớp W26 gồm: (a) thân (document.xml có sẵn cho adapter) và (b) header/footer (adapter chưa nhận header/footer
   XML — cần `main.py` truyền `ooxmlHeaderXml/ooxmlFooterXml`). Không sửa code sản phẩm, không bịa số, không commit
   `file test`/`_out`, không tên tài liệu thật. Commit script + handoff (`git commit -F`, tiếng Việt không dấu).
