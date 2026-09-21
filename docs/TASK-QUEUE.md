# Hàng đợi việc theo ma trận (cập nhật 2026-09-21)

## Trạng thái 21/9 14:30 (main `2a00720`)

| Chiều | Số đo | Ghi chú |
|---|---|---|
| Sheet nhập→lưu (26 file LAN, bỏ lan06/lan14) | **26/26 0 lệch** sau S29a/S30a/S30b/S30c (batch chạy lại 21/9 13:40) | lan14 (33k dòng)/lan06 mở > 15 phút — lớp S29 hiệu năng chưa đo |
| Sheet render (bộ đo hình học S30, opencode đang chạy toàn bộ) | cột 0 lệch mọi file đã đo (lan11 s3 16 → 0 nhờ S30c); hàng: lan01 1, lan03 5, lan05 4, lan08 1, lan11 26 (tất cả lớp S31 bề rộng chữ GDI → số dòng bọc chữ ±1), còn lại 0 | S31 chưa sửa |
| Writer nhập (23 docx, bộ đo tách `<li>`) | **page 276, wrap 34, drift:unknown 34, line-height 24, spacing 11, empty-para 9, table 5, float 3, font-name 1, font-size 1**; trang canvas = Word ở 19/23 file (lệch: d01 20/19, d14 4/3, d16 9/8, d21 10/9) | W24b, W32, W33 trong buổi chiều; d20 5 → 3 trang = Word |
| Writer mở→sửa→lưu→Word (23 docx) | đang chạy lại sau W27a/W27b (`_writer_out_w27b`): d01 19=Word (trước 20), d13 10=Word, d09 12 (Word 14), d02 13 (11), d07 22 (23), d11 6 (5), d16 11 (8) | lớp kế: số trang bản lưu |

Lớp kế tiếp (lớn → nhỏ): (1) Writer lưu đổi số trang d16/d02/d09/d11/d07 — đo bằng `_pb_where.py` + Word COM từng trang;
(2) Writer nhập `page 276` (d01 155, d07 34, d02 27, d13 17, d16 14) — trôi tích luỹ + keepNext (W24c);
(3) S31 bề rộng chữ GDI (bảng hệ số font/cỡ + letter-spacing hoặc đo GDI qua Python); (4) S29 hiệu năng lan14/lan06;
(5) W28 tạo mới kịch bản 3 (codex khi có hạn mức ~26/9).

## Trạng thái 21/9 05:00 (main `46e52e1`)

| Chiều | Số đo | Ghi chú |
|---|---|---|
| Sheet nhập→lưu (28 file LAN) | 25/28 0 lệch (vòng codex S27, main 5a1f486); lan11/lan20 hỏng XML do S26b → **S27a đã sửa** (0 lệch); lan14 (33k dòng) 167 lệch + mất 1 ảnh, lan06 visibility 7 — codex S27 đang xử lý (tiếp 06:29) | S8–S27a |
| Sheet tạo mới → Excel | kịch bản 1: 40/0; kịch bản 2 (16 mục, 63 phép đo): **63/0** (codex S26, Claude đo lại) | |
| Writer tạo mới → Word | kịch bản 1: 36/0; kịch bản 2 (16 mục, 39 phép đo): **39/0** (agy V12 W22a–g, Claude đo lại) | |
| Writer nhập (24 docx, bộ đo tách `<li>`) | **page 445, wrap 32, drift:unknown 36, line-height 27, spacing 12, font-size 36, empty-para 14, table 3** | W10b, W23a–c, W12e trong ngày; trước đó (bộ đo cũ) page 613 / wrap 87 |
| Writer mở→sửa→lưu→Word (23 docx) | 12/23 đổi số trang; mất ngắt trang thủ công 6 file (LibreOffice HTML→DOCX gắn nhầm/rơi), d09 bảng lồng bị nhân đôi, d06 shape → ảnh raster khi nhập | R11/R11b/R12/R13 (opencode đo); **W27** brief sẵn cho codex |

Lớp Writer nhập còn lại (lớn → nhỏ) và người nhận:
1. **page 445** — d01 232 / d09 54 / d02 34 / d07 30 / d11 27: (b) bảng dài hơn trang không được cắt (canvas coi bảng là
   1 khối; d01 bảng 10022px = 9 trang) → **W24 cắt trang trong bảng (theo hàng) và trong đoạn dài** (codex sau W27);
   (c) keepNext/keepLines (d13, d19/d20) → gộp vào W24; còn lại là trôi tích luỹ của các lớp dưới.
2. **font-size 36** (d19 19, d21 14: cỡ nửa điểm bị LibreOffice cắt 0,5pt) → **W25** agy (05:25).
3. **drift:unknown 36, line-height 27, empty-para 14** → **W26** đoạn rỗng theo cỡ dấu đoạn (opencode R15 đang đo), phần
   còn lại gom sau W25/W26.
4. **wrap 32** — d01 7 (trong bảng), d09 4, d13 1…: đo lại sau W24.

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
