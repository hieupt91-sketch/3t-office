# Brief W27 (codex, sau S27) — Chiều LƯU tài liệu đã mở: ngắt trang thủ công mất/gắn nhầm (6 file) và bảng bị nhân đôi (d09)

Đọc trước: `docs/HANDOFF-WRITER-SAVEBACK-R11.md`, `-R11B.md`, `-R12.md` (opencode đo, 4 tầng), `docs/QUY-UOC-DOI-CHIEU.md`
(W7, W12a ánh xạ theo thứ tự, W20e, W22d), `main.py::_apply_native_export_postprocess`,
`ooxml_zip_patch.py::postprocess_writer_docx` (có `source_docx`) và `postprocess_created_writer_docx` (có `source_html`),
`scripts/layout-audit/_batch_writer.py`, `_saveback_stages.py` (R12).

## Số đo (Word 2016 COM + 4 tầng, 21/9)

| Lớp | File | Hiện tượng | Tầng rơi |
|---|---|---|---|
| **C** | d15 | `w:br type=page` gốc (trong run của đoạn "Căn cứ Bộ luật…" = đầu trang 2) → bản lưu: `w:pageBreakBefore` gắn vào đoạn RỖNG trong ô bảng đầu tiên; đoạn "Căn cứ…" không còn ngắt | LibreOffice HTML→DOCX (tầng 3); hậu xử lý không đổi |
| **D** | d13, d21 (+ d03 d06 d23 theo R11: br 1→0) | `break-before: page` có ở HTML xuất (tầng 2) nhưng tầng 3 không có `w:br` lẫn `w:pageBreakBefore` | tầng 3 |
| **A** | d09 | bảng tài chính (35 ô, "Năm Tài Chính 2019 2020 2021…") xuất hiện 2 lần ở tầng 3 dù tầng 2 chỉ có 1 lần; 124 đoạn thân → đoạn trong bảng | tầng 3 |

Số trang bản lưu vs Word gốc (R11b): 12/23 file lệch (d20 3→7, d16 8→11, d01 19→22, d09 14→12 …) — sau khi sửa A/C/D
đo lại để tách phần còn lại.

## Việc

1. **Quy ước W27a (C+D):** khi lưu tài liệu mở từ DOCX (`source_docx` có), hậu xử lý phải khôi phục ngắt trang thủ
   công đúng đoạn: ánh xạ đoạn theo THỨ TỰ giữa HTML xuất (đoạn có `break-before: page`/`page-break-before: always`,
   kể cả `<table style="page-break-before">`) và `<w:p>`/`<w:tbl>` của DOCX LibreOffice sinh ra (không ánh xạ theo text —
   hai đoạn cùng chữ), rồi ghi `<w:pageBreakBefore/>` vào đúng `w:pPr` (với bảng: vào đoạn đầu của ô đầu — Word không có
   pageBreakBefore cho bảng; hoặc chèn đoạn rỗng có `w:br type=page` trước bảng, đo Word xem cách nào giữ đúng số trang)
   và XOÁ `w:pageBreakBefore` LibreOffice gắn nhầm. Kiểm: d15 d13 d21 d03 d06 d23 bản lưu có ngắt ở đúng đoạn (giải nén
   so 6 chữ đầu), số trang Word bản lưu = Word gốc.
2. **Quy ước W27b (A):** tìm vì sao LibreOffice nhân đôi bảng d09 (R13: bảng tài chính nằm LỒNG trong `<td>` của một
   bảng bố cục — nghi LibreOffice HTML import nhân đôi bảng lồng): dùng `_saveback_stages.py` lấy `stage2_export.html`,
   cắt dần (bisect HTML quanh bảng 2: bỏ thuộc tính/thẻ bao) đến khi tầng 3 còn 1 bảng → xác định thẻ/thuộc tính gây
   nhân đôi (nghi: bảng nằm trong `<li>`, `div[data-vno-float]`, hoặc `contenteditable`/`data-vno-*` còn sót trong
   HTML xuất) → sửa MỘT chỗ ở `_contentForExport` (không gửi thứ LibreOffice hiểu sai) hoặc hậu xử lý bỏ bảng trùng
   (chỉ khi XML bảng giống hệt và bảng gốc chỉ có 1). Kiểm: d09 bản lưu 2 bảng, đoạn 406/406, số trang 14.
3. Đo lại `_batch_writer.py` 23 file (`$env:LOCALAPPDATA = "E:\VNOffice-profiles\codex"`), bảng trước/sau: cột
   `saved pages`, `br`, `pbb`, `tables` — không file nào xa Word hơn.
4. Unit test (`tests/test_writer_*.py` hoặc `tests/unit/writer-*.test.js`), quy ước W27a/b vào QUY-UOC, commit riêng
   từng lớp. Gate: `node scripts/check-syntax.js`, `node tests/run-tests.js`, `python -m unittest discover -s tests -p "test_writer*.py"`;
   và **chiều nhập không hồi quy**: `_writer_layout_audit.py` 24 file (cache Word `_out/*.word.jsonl`, xoá canvas) — không
   lớp nào tăng; harness tạo mới `_new.docx` 36/0 và `_new2.docx` 39/0 vẫn sạch.

Không commit `file test`/output, không tên tài liệu thật, không bịa số. Hết hạn mức: commit phần xong + ghi rõ.
