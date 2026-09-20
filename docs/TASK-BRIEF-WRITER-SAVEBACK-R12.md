# Brief R12 (opencode) — Truy nguyên tầng rơi cho 3 lớp lưu-lại: d09 thân → bảng, d06 mất Rectangle, d15 ngắt trang gắn nhầm. CHỈ ĐO

R11b (`docs/HANDOFF-WRITER-SAVEBACK-R11B.md`) đã xác định hiện tượng; cần biết **rơi ở tầng nào**: (1) LibreOffice
HTML export khi mở (import), (2) canvas/app (`_contentForExport()`), (3) LibreOffice HTML→DOCX khi lưu, (4) hậu xử lý
`postprocess_writer_docx`/`postprocess_created_writer_docx` (`main.py` → `ooxml_zip_patch.py`).

Worktree `E:\VNOffice-opencode-writer-r12` (branch `audit/writer-saveback-r12`). `$env:LOCALAPPDATA =
"E:\VNOffice-profiles\opencode"` trước khi chạy python. Mẫu `E:\VN OFice\file test\landocx` (ngoài git).

## Cách lấy từng tầng (viết 1 script `scripts/layout-audit/_saveback_stages.py <wt> <docx> <outdir>`)

- Tầng 1: `main._run_soffice_convert(docx, "html", tmp, app_kind="writer")` → `stage1_lo_import.html` (xem
  `_writer_html_probe.py`).
- Tầng 2: mở app với file (như `_canvas_para_metrics.py`), `evaluate_js("window.__vnoAppInstance.adapter._contentForExport()")`
  → `stage2_export.html`; đồng thời `document.querySelector('.vno-writer-body').innerHTML` → `stage2_dom.html`.
- Tầng 3: gọi đúng đường lưu của app nhưng **tắt hậu xử lý**: tìm trong `main.py` hàm lưu (`save_document_dialog` →
  `_apply_native_export_postprocess`) — chạy `_run_soffice_convert(stage2_export.html → docx)` trực tiếp →
  `stage3_lo.docx`; tầng 4 = bản lưu thật của `_batch_writer.py` (`_saveback2/_rt_dNN.docx` nếu còn, hoặc chạy lại).
- Với mỗi tầng đếm: `<table>`/`<w:tbl>`, đoạn (`<p>`/`<w:p>`), `Rectangle`/`Straight Connector` (theo tên `wp:docPr`
  hoặc `<img name=...>`/`<div id=...>`), `page-break-before`/`break-before`/`w:br type=page`/`w:pageBreakBefore`.

## Câu hỏi phải trả lời (mỗi câu = số đếm ở 4 tầng + kết luận 1 dòng)

1. **d09**: bảng thứ 3 xuất hiện ở tầng nào? Nội dung của nó là gì (chữ đầu 6 từ của 3 đoạn đầu trong bảng)? Trong
   `stage2_dom.html`, phần tử bao quanh đoạn đó là gì (`div[data-vno-float]`? `div` cột? `section`?) — dán thẻ mở.
2. **d06**: 22 Rectangle còn ở tầng 1 không (LibreOffice có xuất chúng ra HTML không — dạng `<img>`, `<div>`, hay
   mất)? Nếu mất ngay tầng 1 → lớp thuộc chiều nhập (W5 mở rộng), không phải lưu.
3. **d15**: `break-before: page` của đoạn "Căn cứ Bộ luật…" ở tầng 2 có đứng trước một `<table>` ngay sát không? Ở
   tầng 3, `w:pageBreakBefore`/`w:br` nằm ở đoạn nào (dán 6 chữ đầu)? → rơi ở LibreOffice import (tầng 3) hay hậu xử lý
   (tầng 4)?
4. Thêm **d13** (br 1→0, đoạn +7) và **d21** (br 1→0): cùng cơ chế với d15?

Handoff `docs/HANDOFF-WRITER-SAVEBACK-R12.md`: bảng tầng × số đếm cho 4 file, trả lời 4 câu, đề xuất lớp (tầng + chỗ
sửa) nhưng KHÔNG sửa code sản phẩm. Không bịa số, không commit `file test`/output, không tên tài liệu thật. Commit
script + handoff (`git commit -F`, tiếng Việt không dấu).
