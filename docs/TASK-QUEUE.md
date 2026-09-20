# Hàng đợi việc theo ma trận (cập nhật 2026-09-21)

## Trạng thái 21/9 (main)

| Chiều | Số đo | Ghi chú |
|---|---|---|
| Sheet nhập→lưu (26 file LAN) | 0 lệch auditor, Excel mở 26/26, lint sạch | S8–S25; lan06/lan14 (file lớn) chưa chạy lại vòng mới |
| Sheet tạo mới → Excel | kịch bản 1: CHECKS=40 DIFFS=0 | S26 (kịch bản 2, 16 mục) đang giao codex |
| Writer tạo mới → Word | kịch bản 1: CHECKS=36 DIFFS=0 (codex W20, Claude đo lại) | V12 (kịch bản 2, 16 mục) đang giao agy — W22a–d đã có |
| Writer nhập (24 docx, bộ đo tách <li> từ 21/9) | page 552, wrap 32, drift:unknown 58, line-height 31, spacing 38, font-size 36 | sau W10b (wrap 67→32); trước W12c-thu-hẹp bộ đo cũ: page 613, wrap 87 |

Lớp Writer nhập còn lại theo thứ tự lớn → nhỏ:
1. **page (552)** — d01 232 (19 trang Word / 17 canvas), d07 136, d09 37, d13 30, d11 27: phần lớn là hệ quả tích lũy của
   lớp khác + **keepNext/widow** (d15: heading II. Word đẩy sang trang 3 vì w:keepNext, canvas giữ trang 2) → cần
   đo w:keepNext/w:keepLines/w:widowControl trong bộ phân trang canvas (chưa giao).
2. **drift:unknown (58)**, **spacing (38)**, **line-height (31)**, **font-size (36: d19 19, d21 14)** — chưa gom lớp mới.
3. **wrap (32)** — còn d09 4, d11 1, d13 2, d01 7 (trong bảng), d15 1: đo tiếp sau khi tách bảng.

Nguyên tắc: mỗi việc = một LỚP lỗi trong ma trận (`MA-TRAN-WRITER-*.md`, `MA-TRAN-SHEET-*.md`), sửa một chỗ theo quy ước,
đo lại toàn bộ batch, ghi quy ước vào `QUY-UOC-DOI-CHIEU.md`. Không nhận việc "sửa file X".

## (XONG 16/9, merged 0d9c35e — chạy lại batch 28 file để xác nhận) S8: ô chưa sửa giữ NGUYÊN style gốc XLSX (numFmt / border / font / fill / alignment)
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

### Sheet:
- **(XONG 19/9, main 39c54e8 — `MA-TRAN-SHEET-2026-09-19.md`) Vòng 5→7 theo lớp**: S12 chữ ô/rich text (value 285), S10/S10b theme +
  bảng màu indexed (fill 742, font/border lan03 540), S11 cột mặc định (columnWidth 271), S9b cột ẩn ngoài vùng dữ liệu
  (396), S13 ô chuỗi rỗng (lan25 1372), S14/S15 công thức (342), S8b numFmt built-in khai báo tường minh (1635), S8 một
  lượt quét (lan09 lưu 15 s thay vì không lưu được). opencode S13 (e967f2a) không merge: chép thẳng `s=` gốc, tính sai
  chỉ số shared string; Claude viết lại + `_SourceXfCopier`.
- **(XONG 19/9 chiều, main d78ba1c)** vòng 8: Excel 26/26, lint sạch, 371 lệch → sau sửa lẻ ≈ 40 (font[0] gộp,
  font-face "Calibri1", chữ shape, AutoFilter sheet cuối, S16 drawing passthrough — opencode viết Python, Claude nối
  id qua JS + sửa rels/ảnh ngoài).
- **ĐANG GIAO (19/9 13:40)**: codex → `TASK-BRIEF-SHEET-RESIDUALS-R8.md` (worktree `E:\VNOffice-codex-sheet-r8`,
  branch `fix/sheet-residuals-r8`); opencode → `TASK-BRIEF-WRITER-W12-LINE-HEIGHT.md` (worktree
  `E:\VNOffice-opencode-writer-w12`, branch `fix/writer-w12-line-height`). Claude gate + đo lại rồi merge.
- Sau đó: lan06 (VAT) và lan14 (1,5 triệu ô) chạy riêng với bộ đo mới; `numberFormat` ở ô ĐÃ sửa trong app (S7 chiều
  lưu); Writer W13 font-size, W10 wrap, W11b bảng trHeight.
- **(XONG 17/9, merged 2feaaf0 & dc0d825) S9 — Khôi phục dải cột ẩn (hiddenColumn), dòng ẩn và kiểm tra trực quan (Visual Inspection)**:
  - Khôi phục `<col min="9" max="16384" hidden="1"/>` và dòng ẩn ngoài vùng dữ liệu từ source XLSX.
  - Sửa xung đột style cột ẩn: gán `style="0"` thay vì copy source style index chưa qua map (tránh bị tô nền xám `#969696` toàn bộ trang tính).
  - Sửa `optimize_fods_streaming`: bảo vệ ô gộp (`number-columns-spanned`, `covered-table-cell`) không bị gộp trùng vào `number-columns-repeated`, khôi phục trọn vẹn ô gộp `G4:I4` trên sheet UNC.
  - Sửa `SheetAdapter`: cập nhật `styleHashAtImport` sau khi `_normalizeRichTextCellFont` chuẩn hóa, giúp ô rich text chưa sửa (như A19 "PHẦN DÀNH CHO NGÂN HÀNG") giữ trọn vẹn S8 `vno:xf` gốc, không bị cắt cụt chữ.
  - Kiểm tra trực quan bằng ảnh chụp thực tế từ Microsoft Excel 2016 COM và giao diện VN Sheet: độ tương đồng đạt 100%.
- **Tiếp theo**:
  + `fill` 53k (19 file) — mapping indexed pattern / tint color.
  + `value` 34k — rà soát các trường hợp multiline/ô trống còn lại.
  + Writer W8 (strut của đoạn) & W9 (font mặc định docDefaults + theme).
