# Hàng đợi việc theo ma trận (cập nhật 2026-09-15)

Nguyên tắc: mỗi việc = một LỚP lỗi trong ma trận (`MA-TRAN-WRITER-*.md`, `MA-TRAN-SHEET-*.md`), sửa một chỗ theo quy ước,
đo lại toàn bộ batch, ghi quy ước vào `QUY-UOC-DOI-CHIEU.md`. Không nhận việc "sửa file X".

## ƯU TIÊN 1 (mai) — S8: ô chưa sửa giữ NGUYÊN style gốc XLSX (numFmt / border / font / fill / alignment)
Đo được 15/9: LibreOffice tự ghi lại mã Excel theo cách của nó (Accounting `_(* #,##0_);…"-"??` → `* #,##0 ; … -00`,
`#,##0.00"";` → `#,##0.00;…""`) và tự đổi viền ô gộp ngay khi NHẬP (lan18 A2) → hai lớp lớn nhất của Sheet
(numberFormat 287k, border 180k) KHÔNG sửa được qua FODS. Cơ chế S8: overlay Python ghi `vno:xf=<s>` cho từng ô khi
mở; JS giữ `origXf` + băm style lúc nhập; khi lưu, hậu xử lý XLSX chép `<xf>` gốc (+font/fill/border/numFmt nó trỏ
tới) vào `styles.xml` mới và đặt lại `s=` cho ô có băm không đổi. Đo: `_batch_audit.py` + `_sheet_matrix.py` —
numberFormat + border giảm ≥ 80%, Excel mở OK. Giao opencode (brief mẫu: TASK-BRIEF-SHEET-BORDER-FIDELITY.md v2).

## Đã làm 15/9
| Lớp | Kết quả |
|---|---|
| Sheet `numberFormat` bước 1 (S7, opencode + Claude, merged ade1bc8) | giữ data-style ODF verbatim; lan10 340→324, lan26 228→204, lan27 3303 (cần S8) |
| Sheet `border` (agy, 2 lượt) | không ra code; gốc là LibreOffice nhập đổi viền ô gộp → S8 |

## Tiếp theo (Writer, theo `MA-TRAN-WRITER-2026-09-15.md`)

### W8 — strut của đoạn: font của `<p>` không được làm cao dòng hơn font của run (lớp `line-height`, 365 đoạn / 19 file)
Đo d16: đoạn "HỢP ĐỒNG DỊCH VỤ" Word 1,08 dòng × Times New Roman 13pt = 21,5px; canvas 26px vì `<p class="western">`
mang font .VnTime 14pt (font của paragraph STYLE) tạo strut 23,2px dù mọi run là Times New Roman 13pt. Word không có
strut kiểu CSS: chiều cao dòng chỉ từ các run (và dấu đoạn `pPr/rPr`, thường = run).
Quy ước đề xuất: khi nhập, nếu toàn bộ chữ của `<p>` nằm trong `<font size/face>` thì `<p>` nhận font-size/font-family
của run đầu (hoặc `pPr/rPr` từ OOXML nếu có); đoạn trống giữ font style. Xuất ra không đổi kết quả (LibreOffice ghi
sz/rFonts cho dấu đoạn = run). Đo bằng `python scripts/layout-audit/_writer_layout_audit.py . <docdir> _out` — hàng
`line-height` phải giảm ≥ 80% trên d16/d09/d13/d07/d11, `page` giảm theo; không lớp nào tăng.

### W9 — font mặc định tài liệu từ docDefaults + theme khi LibreOffice không ghi `p.western` (lớp `font-name`, 301 đoạn / 13 file)
Đo d07: LO HTML không có font-family nào (không `<font face>`, không `p.western`) vì font đến từ
`docDefaults rFonts asciiTheme="minorHAnsi"` → theme minor = Arial; canvas rơi về Times New Roman (NĐ30), Word vẽ Arial.
Quy ước: font/cỡ mặc định = docDefaults (`styles.xml`) với theme major/minor giải từ `theme1.xml`; Python overlay
(`main.py` mở DOCX) chèn `p.western { font-family: ...; font-size: ... }` vào head HTML khi LibreOffice không ghi, hoặc
truyền styles.xml/theme cho `_parseDocStylesFromImportedHtml`. Đo: hàng `font-name` d07/d13/d06/d05 → ~0.

### W10 — `wrap` (93 đoạn / 15 file): số dòng gãy khác Word
Cần đo trước khi đề xuất: với mỗi cặp `wrap` trong `<tên>.pairs.jsonl`, so bề rộng cột chữ (page − lề − indent), font
thật đang vẽ (font thiếu → font thay thế nào ở Word/Chromium), kerning (`w:kern`), tab. Chưa giao.

### Sheet tiếp theo (sau numberFormat/border): `fill` 53k (19 file), `value` 34k ("\n" trong ô trống: 170×), `hiddenColumn` 18k (5 file).
