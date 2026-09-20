# Brief W25 (agy, sau W23) — Cỡ chữ nửa điểm (w:sz lẻ: 8,5 / 11,5 / 14,5 / 16,5 pt) bị LibreOffice HTML làm tròn xuống (lớp `font-size`, 36 đoạn / 4 file, d19 19 + d21 14)

Đọc trước: `docs/QUY-UOC-DOI-CHIEU.md` (W6, W9, W12a/b, W12d), `main.py` (overlay khi mở DOCX: chỗ chèn `p.western`
theo docDefaults/theme của W9/W12b), `_applyOoxmlContextualSpacing` (W12a: ánh xạ `w:p` ↔ `<p>` theo THỨ TỰ),
`scripts/layout-audit/_writer_html_probe.py`.

## Số đo Claude (21/9, Word 2016 COM + HTML LibreOffice)

| File | Word (Font.Size) | Canvas | OOXML | HTML LibreOffice |
|---|---|---|---|---|
| d19 | Heading1 Tahoma **14,5** (`w:sz=29`), Normal Tahoma **8,5** (`w:sz=17`) | 18,67 px = 14 pt; 10,67 px = 8 pt | style `Heading1`/`Normal` `w:sz` lẻ | head CSS `h1.western { font-size: 14pt }`, `p.western { font-size: 8pt }` — **cắt 0,5 pt** |
| d21 | run Times New Roman **11,5** (`w:sz=23`), **16,5** (`w:sz=33`) trực tiếp trên run/pPr | 14,67 px = 11 pt; 21,33 px = 16 pt | `w:rPr/w:sz` lẻ trên từng run | inline `font-size: 11pt` — cắt 0,5 pt |

Word vẽ đúng 14,5/8,5/11,5/16,5 pt (nửa điểm hợp lệ trong Word; ribbon Word cho phép 0,5). LibreOffice HTML export
ghi cỡ chữ pt nguyên → canvas nhỏ hơn Word 0,5 pt → sai số dòng/trang (d19 2 trang, d21 9 trang).

## Việc (một lớp, hai tầng cùng quy ước)

**W25a — cỡ style:** khi mở DOCX, overlay Python (`main.py`, cùng chỗ với W9/W12b) đọc `styles.xml`: với mỗi style
đoạn có `w:sz` lẻ (docDefaults → Normal → Heading1..6 → style tuỳ biến) mà LibreOffice ánh xạ thành `p.western`,
`h1.western`… (đối chiếu `w:name`: `heading 1` → `h1`, `Normal` → `p`, style khác → class LibreOffice đặt theo tên
style), ghi đè `font-size: <sz/2>pt` chính xác (14.5pt) vào head CSS (thêm rule sau rule của LibreOffice, không sửa
rule cũ). Đo: d19 font-size 19 → ~0.

**W25b — cỡ run:** trong `writer-adapter.js` (bước `_normalizeImportedHtml`, ngay sau W12a), ánh xạ `w:p` ↔ `<p>` theo
thứ tự (dùng lại cơ chế W12a, KHÔNG ánh xạ theo text), trong mỗi đoạn: các run OOXML có `w:sz` lẻ (hoặc thừa kế từ
`pPr/rPr`) ↔ `<font style="font-size: Npt">` / `<span style="font-size: Npt">` cùng thứ tự/cùng chữ đầu → đặt
`font-size: <sz/2>pt` chính xác. Không đụng run có `w:sz` chẵn. Đo: d21 font-size 14 → ~0, line-height/page d21 không
tăng.

Xuất ngược (lưu DOCX): kiểm tra `font-size: 11.5pt` trong HTML gửi LibreOffice có ra `w:sz=23` không (LibreOffice
HTML import nhận pt thập phân) — chạy `_batch_writer.py` cho d19/d21, giải nén bản lưu, đếm `w:sz w:val="23"`/`"29"`
so với gốc; ghi kết quả vào handoff (nếu mất, ghi rõ, không sửa trong brief này).

## Ràng buộc

`$env:LOCALAPPDATA = "E:\VNOffice-profiles\agy"` trước khi chạy python. Cache Word: `_out/*.word.jsonl` (xoá
`*.canvas.jsonl` trước khi đo lại). Không hằng số không có số đo, không đổi định nghĩa kind. Mỗi tầng: unit test
(`tests/test_writer_default_font_css.py` cho W25a, `tests/unit/writer-doc-font-spacing.test.js` cho W25b) + quy ước
W25a/b vào QUY-UOC + commit riêng. Gate: `node scripts/check-syntax.js`, `node tests/run-tests.js`,
`python -m unittest discover -s tests -p "test_writer*.py"`. Ma trận 24 file trước/sau: `font-size` giảm, không lớp
nào tăng. Không commit `file test`/`_out`, không tên tài liệu thật, không bịa số.
