# Brief R11b (opencode) — Đo lại chiều lưu (23 file) trên main mới + truy nguyên lớp C (mất ngắt trang thủ công) và lớp F (mất ảnh neo). CHỈ ĐO

Kết quả R11 (main `c0bd5e1`, `docs/HANDOFF-WRITER-SAVEBACK-R11.md`): 12/23 file đổi số trang sau lưu; lớp C: 6 file mất
`w:br w:type="page"` (d03 d06 d13 d15 d21 d23); lớp F: mất `wp:anchor` (d06 60→48, d07 1→0); lớp D: d09 406→344 đoạn.
Từ đó main đã gộp W22a–g (agy) trong đó **W22d** ghi `w:pageBreakBefore` cho đoạn có `page-break-before` trong HTML
xuất — có thể đã bù lớp C. Cần số mới.

## Việc

1. Worktree `E:\VNOffice-opencode-writer-r11b` (branch `audit/writer-saveback-r11b`, tách từ main hiện tại).
   `$env:LOCALAPPDATA = "E:\VNOffice-profiles\opencode"` trước khi chạy python (cùng phiên).
2. Mở rộng `docx_stats()` trong `scripts/layout-audit/_batch_writer.py`: THÊM (không đổi cột cũ) `pbb` = số
   `<w:pageBreakBefore` trong body (ngoài txbxContent), `hdr` = số part `word/header*.xml`, `ftr` = `word/footer*.xml`,
   `media` = số file trong `word/media/`. Ghi thêm vào bảng report.
3. Chạy lại 23 file (bỏ d10) theo nhóm như R11 → `_saveback2/`. Bảng đầy đủ (gộp các nhóm) dán nguyên văn vào
   `docs/HANDOFF-WRITER-SAVEBACK-R11B.md`, kèm cột so với R11 (số trang bản lưu R11 → R11b).
4. Truy nguyên lớp C trên **d15** (1 br → 0): (a) giải nén `_saveback2/_rt_d15.docx`, tìm đoạn ngay sau vị trí
   ngắt trang gốc (đoạn "Căn cứ Bộ luật dân sự…" là đoạn đầu trang 2 của bản gốc — chỉ ghi 6 chữ đầu), xem nó có
   `w:pageBreakBefore` hay `w:br` không; (b) đối chiếu số trang bản lưu với Word gốc (10). Kết luận: lớp C còn hay đã
   được W22d bù; nếu còn, ghi rõ tầng rơi: HTML gửi LibreOffice có `page-break-before` không (bật log
   `_contentForExport` bằng cách chạy app với file đó và in `app.adapter._contentForExport()` qua
   `scripts/layout-audit/_canvas_para_metrics.py`-style probe — xem `_create_new_writer.py` cách evaluate_js).
5. Truy nguyên lớp F trên **d06** (60 → 48 anchor): giải nén gốc và bản lưu, liệt kê `wp:docPr name=` của các anchor
   mất; chúng nằm trong nhóm (`wpg:wgp`)? trong header? là `wps:wsp` (shape) hay `pic:pic`? Kết luận loại đối tượng
   bị rơi. Không sửa.
6. Truy nguyên lớp D trên **d09** (406 → 344 đoạn): đếm đoạn trong bảng (`w:tc`) gốc vs lưu, đoạn rỗng (`<w:p/>` hoặc
   không có `w:t`) gốc vs lưu → phần lớn 62 đoạn mất là loại nào.

## Ràng buộc

KHÔNG sửa code sản phẩm. Mọi số là output thật. Không commit `file test`, `_saveback2/`, không tên tài liệu thật.
Commit `docs/HANDOFF-WRITER-SAVEBACK-R11B.md` + thay đổi `_batch_writer.py` (`git commit -F`, tiếng Việt không dấu).
