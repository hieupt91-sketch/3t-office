# Brief R13 (opencode) — Đo kích thước lớp "đối tượng vẽ mất khi LibreOffice xuất HTML" trên 23 file, và kiểm lại số bảng tầng 3. CHỈ ĐO

R12 cho thấy d06 mất 37 Rectangle + 54 Straight Connector ngay ở tầng 1 (LibreOffice DOCX→HTML). Cần biết lớp này lớn
bao nhiêu trên toàn bộ mẫu để xếp ưu tiên, và số "Tables" ở tầng 3/4 của R12 (d13 49, d15 14) mâu thuẫn với R11b
(`<w:tbl>` đếm chính xác: d13 7/7, d15 2/2) — phải xác định cách đếm nào đúng.

Worktree `E:\VNOffice-opencode-writer-r13` (branch `audit/writer-r13`). `$env:LOCALAPPDATA = "E:\VNOffice-profiles\opencode"`.
Mẫu `E:\VN OFice\file test\landocx` (ngoài git, bỏ d10).

## Việc

1. Script `scripts/layout-audit/_import_drawing_loss.py <wt> <docdir> <outdir>`: với mỗi docx —
   (a) OOXML gốc (`word/document.xml` + `word/header*.xml` + `word/footer*.xml`): đếm theo loại: `pic:pic` (ảnh),
   `wps:wsp` (shape), `wpg:wgp` (nhóm), `w:pict`/`v:shape` (VML), `w:txbxContent` (hộp văn bản), `c:chart`, tổng
   `wp:anchor` và `wp:inline`; kèm tên `prstGeom prst=` của shape (rect, line, roundRect…) đếm theo loại;
   (b) HTML tầng 1 (`main._run_soffice_convert(docx, "html", tmp, app_kind="writer")`): đếm `<img`, `<div` có
   `style*="position: absolute"`, `<svg`, `<hr`; và số `<img name="...">` theo tiền tố tên (`Shape`, `Picture`, `Text Box`…);
   (c) bảng: file × (loại OOXML: gốc) × (HTML: img/absolute-div/svg) → ước lượng "mất" = đối tượng gốc không có đại
   diện nào ở HTML (giải thích cách suy luận, không đoán mò).
2. Đếm lại `<w:tbl>` (thẻ mở chính xác, có `>` hoặc khoảng trắng sau `tbl`) ở 4 tầng cho d09 d13 d15 (dùng
   `audit_out/` của R12 nếu còn, không thì chạy lại `_saveback_stages.py`), và giải thích con số 49/14 của R12 (đếm
   nhầm `<w:tblPr`/`<w:tblGrid`?). Với d09: vị trí bảng nhân đôi trong `document.xml` tầng 3 — đoạn ngay trước và ngay
   sau bảng 2 và bảng 3 (6 chữ đầu), 2 bảng có nằm trong `<li>`/danh sách hay `div[data-vno-float]` ở tầng 2 không (dán
   thẻ cha ở stage2_dom).
3. Handoff `docs/HANDOFF-WRITER-R13.md`: bảng 23 file (mục 1c), tổng theo loại (bao nhiêu file có shape/VML/textbox
   mất), mục 2 với số đếm đúng và kết luận. Không sửa code sản phẩm, không bịa số, không commit `file test`/output,
   không tên tài liệu thật. Commit script + handoff (`git commit -F`, tiếng Việt không dấu).
