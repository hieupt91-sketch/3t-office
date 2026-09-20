# QUY ƯỚC ĐỐI CHIẾU — VN Office ↔ MS Office 2016

Cách làm (thống nhất 2026-09-15): **đo tổng quát trên toàn bộ file mẫu → gom lệch theo LOẠI → tìm giá trị chung →
sửa MỘT chỗ → ghi thành quy ước ở đây + unit test khoá → chạy lại toàn bộ batch, ma trận phải giảm đồng loạt.**
Không sửa "cho file X". Mọi con số trong file này là số đo thật (Word/Excel 2016 COM, app thật), không suy đoán.

## Bộ đo chuẩn (`scripts/layout-audit/`)

| Lệnh | Việc |
|---|---|
| `python scripts/layout-audit/_writer_layout_audit.py <wt> <thư mục docx> <outdir> [tên...]` | Writer: từng đoạn Word COM (`_word_para_metrics.ps1`) vs canvas app thật (`_canvas_para_metrics.py`) → ma trận `_writer_layout_matrix.md` (loại lỗi × file) + `<tên>.pairs.jsonl` chi tiết |
| `python scripts/layout-audit/_batch_writer.py <wt> <docdir> <outdir>` | Writer: mở + sửa + lưu 1 lượt, số trang Word gốc / canvas / bản lưu (`_word_oracle3.ps1` đếm trang PDF) |
| `python scripts/layout-audit/_batch_audit.py <wt> [lanNN.xlsx...]` | Sheet: mở + lưu app thật, Excel mở thử, auditor `scripts/audit-sheet-import.mjs --xlsx-vs-xlsx` |
| `python scripts/layout-audit/_sheet_matrix.py <wt> [outdir]` | Sheet: gom auditor của mọi `_rt_lanNN.xlsx` thành `_sheet_matrix.md` (loại lỗi × file + mẫu lặp) |
| `powershell -File scripts/layout-audit/_word_oracle3.ps1 -File x.docx` | Số trang Word (PDF export). KHÔNG dùng `ComputeStatistics(wdStatisticPages)` (sai: 88 cho tài liệu 44 trang) |
| `powershell -File scripts/layout-audit/_excel_mdw.ps1 ["Calibri:11" ...]` | Excel COM: chiều rộng cột mặc định (px) và max digit width theo font Normal — nguồn số cho S11 |
| `python scripts/layout-audit/_time_sheet_save_stages.py <wt> <x.sent.fods> <src.xlsx> <out.xlsx>` | Đo thời gian từng bước lưu Sheet (tối ưu FODS → soffice → hậu xử lý) không cần mở app; dùng khi file lớn không lưu xong |
| `powershell -File scripts/layout-audit/_excel_cell_probe.ps1 -File x.xlsx -Sheet 1 -Cells E3,F3` | Excel COM: màu chữ/nền/viền THẬT Excel vẽ cho từng ô — trọng tài khi auditor và mắt không thống nhất |

Lưu ý khi chạy batch: soffice dùng chung một profile, Excel COM dùng chung một tiến trình → KHÔNG chạy unit test
(`test_sheet_save_roundtrip`), opencode/agy hay batch khác song song với batch (vòng 6: lan10/lan26 chờ 15 phút vì
soffice bị tranh). Excel FAIL trong batch phải mở lại từng file bằng `_excel_open_test.ps1` để phân biệt lỗi thật
(vòng 6: lan21/22/24 thật — `<cols></cols>` rỗng) với tranh chấp COM.

File mẫu thật nằm ngoài git (`file test/`, LAN `\\192.168.1.252\company1`); ma trận chỉ ghi số, không ghi tên file thật.

## Quy ước đã đo và khoá (Writer)

| # | Quy ước | Số đo gốc | Khoá bởi |
|---|---|---|---|
| W1 | Giãn dòng "multiple" (`w:line` auto) = bội số × **chiều cao dòng tự nhiên của font từng run** (ascent+descent+lineGap), không phải × font-size | HDLD: Arial 12pt/Calibri Light run, `line=312` → Word 19,1pt/dòng; CSS 130% chỉ 20,8px | `--vno-lh` × `--vno-font-ratio` (suite 153) |
| W2 | Khoảng cách 2 đoạn = **MAX(space-after, space-before)** (compatibilityMode 15) = gộp lề CSS | HDLD đoạn sa=6/sb=6 cách nhau 6pt | không triệt margin collapsing |
| W3 | Space-before của đoạn đầu trang bị bỏ sau ngắt trang tự động; giữ sau ngắt thủ công/đầu tài liệu; space-after cuối trang bị cắt | MYTIME, HDLD | `_recomputeLivePagination` đo offsetTop |
| W4 | Đoạn chỉ chứa đối tượng neo = 1 dòng (LibreOffice xuất `<br/><br/>`) | MYTIME 44 đoạn, d06 10 đoạn | `_collapseFloatOnlyParagraphBreaks` |
| W5 | Nhóm hình `wp:anchor` (wrapNone) xuất thành `<img name=ShapeN>` trần vẫn là float tuyệt đối, không phải inline | d06: 3 nhóm | test R3(a2) |
| W6 | Cỡ chữ/font mặc định tài liệu chỉ lấy từ style Normal / head CSS; không lấy từ run đầu | d14: tiêu đề 28pt → strut 64px | 37596ed |
| W7 | Lưu: header/footer chép theo `.rels` + media; giữ `theme1.xml` gốc; run chỉ 1 họ font | d20 corrupted, HDLD 6 trang | test_writer_headerfooter_dependencies |
| W12b | Tài liệu tiếng Việt (docDefaults `w:lang="vi"` / đa số run vi-VN): font theme = typeface `<a:font script="Viet">` (Times New Roman/Arial trong theme Office), KHÔNG phải `<a:latin>` (Calibri Light/Calibri) — Word COM `Font.Name` = TNR trong khi LibreOffice ghi Calibri Light. Áp cho font mặc định (W9) và `<font face>` run (thay khi tài liệu không đặt tường minh font latin đó) | d07: line-height 22 → 0, page 147 → 134; bộ đo `theme_fonts()` cùng quy tắc | test_writer_default_font_css (W12b) |
| W12c | `w:lineRule="atLeast"` (đoạn hoặc style chain) = MAX(giá trị, dòng tự nhiên 1em × tỉ số font W1); LibreOffice ghi giá trị tuyệt đối (`line=10` → 0,02 cm → canvas 0,76 px) | d06: line-height 15 → 3, drift 15 → 3 (đo lại với cache canvas xoá — bộ đo dùng lại `*.canvas.jsonl` nếu còn) | writer-doc-font-spacing (W12c) |
| W12a | contextualSpacing: hai đoạn kế tiếp cùng pStyle và style/pPr có `<w:contextualSpacing/>` → Word bỏ MAX(sa, sb) giữa chúng (lề = 0). Khi nhập: ánh xạ w:p → HTML <p> theo thứ tự, đoạn trước margin-bottom:0, đoạn sau margin-top:0. | d09 ListParagraph: Word pitch 23px (sa 10pt bỏ), canvas 37px; 43 cặp spacing | `_applyOoxmlContextualSpacing` (suite 153) |

| W12d | Inline wrapper không có chữ trực tiếp không được giữ strut lớn hơn các run con: hạ wrapper về cỡ run nhỏ nhất bên trong; run lớn có cỡ tường minh vẫn quyết định line box | d11: LibreOffice lồng run TNR 8 pt trong `<font size="3" style="font-size:12pt">`; line-height 15 → 2, page 20 → 18, không tăng lớp khác trên ma trận 24 file (d10 Word COM báo file hỏng) | writer-doc-font-spacing (W12d) |
| W20a | Word COM `LineSpacingRule=1` là `wdLineSpace1pt5`, và `LineSpacing=18pt` là đúng 1,5 dòng; không chia 18 cho cỡ chữ run 13pt để kết luận 1,38 | Harness tạo mới: OOXML sẵn có `w:line="360" w:lineRule="auto"`; sửa diễn giải bộ đo 2 lệch → 0 | test_writer_create_new_readback (W20a) |
| W20b | `text-indent` của tài liệu tạo mới phải thành `w:ind w:firstLine` theo `cm / 2,54 × 1440` | 1,27 cm → 720 twip | test_writer_section_headerfooter_postprocess (W20b) |
| W20c | `<ul>` phải tham chiếu abstract numbering có `w:numFmt="bullet"` và `w:lvlText="•"`; không dùng decimal | Harness tạo mới: Word numbered → bullet | test_writer_section_headerfooter_postprocess (W20c) |
| W20d | Ảnh data URI tạo mới phải hiện thành inline shape trong DOCX; harness phải thực sự khai báo payload ảnh trong browser trước khi kết luận | Harness sạch: `InlineShapes.Count=1`, không cần sửa sản phẩm | test_writer_create_new_readback (W20d) |
| W20e | Marker section break gồm cả spacer UI `<p><br></p>`; export phải tiêu thụ spacer và chỉ sinh một paragraph page-break | Harness sạch trước sửa: 3 trang → mục tiêu 2 | writer-sectionbreaks-pagecolor (W20e) |
| W20f | Header/footer tạo mới được LibreOffice xuất thành part thật; field/trang được Word nhận khi scenario chạy hết | Harness sạch: header `VN Office` căn giữa, footer có PAGE đều PASS | harness 36 checks (W20f) |
| W20g | Lề DOCX tạo mới lấy từ `@page` và được khóa lại ở `w:pgMar` sau HTML import; mm → twip theo `mm / 25,4 × 1440` | 20/20/20/30 mm → 1134/1134/1134/1701 twip | test_writer_section_headerfooter_postprocess (W20g) |

## Quy ước đã đo và khoá (Sheet)

| # | Quy ước | Số đo gốc | Khoá bởi |
|---|---|---|---|
| S1 | Ô ngày/giờ = `office:value-type="date"` `office:date-value="YYYY-MM-DD[THH:MM:SS]"` / `time-value`, không phải chuỗi | 7 file, 642 ô VAT | suite 154 |
| S2 | Ô chỉ có style (không giá trị) = `<table:table-cell style/>` trống, không phải chuỗi rỗng | lan09 21.930 ô | 7120d6b |
| S3 | Dòng bị lọc ẩn (`visibility="filter"`) = dòng ẩn | lan01 2635 dòng | suite 154 |
| S4 | Vùng AutoFilter: `'Tên sheet'.A1:'Tên sheet'.J2650` (nháy cả hai đầu) | lan01 sheet 3 | suite 154 |
| S5 | Dải style-only rộng hơn 64 cột là "định dạng nguyên hàng": bộ tối ưu FODS không được cắt xuống ≤ 64 | lan05 Map overflow | test_sheet_fods_optimize |
| S7 | Định dạng số nhập từ file: giữ nguyên data-style ODF LibreOffice sinh (`numberFormat.odf`), ghi lại verbatim; ô chuỗi/trống cũng giữ numFmt | lan10/26/27 | ade1bc8 |
| S8 | Ô không bị sửa trong app giữ NGUYÊN <xf> gốc XLSX (numFmt/font/fill/border/alignment): overlay `vno:xf` khi mở, băm style lúc nhập, hậu xử lý chép xf+phụ thuộc vào styles.xml mới | lan27 3667→0, lan04 1849→134, lan03 1823→246 | 0d9c35e, test_sheet_untouched_cell_styles |
| S9 | Dải cột ẩn ngoài used range (kéo tới 16384/XFD) và dòng ẩn trống được khôi phục từ XLSX gốc qua hậu xử lý | lan02: 16.370→8 (hiddenColumn 16.358→0, hiddenRow 4→0) | test_sheet_hidden_cols_rows |
| S10 | xf/font/fill chép theo S8 trỏ màu `theme="N"`/`indexed="N"` → file lưu phải giữ `xl/theme/theme1.xml` và `<colors><indexedColors>` của file gốc (LibreOffice ghi theme "Office" của nó: accent6 C9211E thay vì 70AD47) | vòng 5: fill #A9D18E→#E9706D 574 ô (lan07/13/17), #558ED5→#666666 168 ô (lan03/10/16) | test_sheet_untouched_cell_styles (S10) |
| S11 | Cột KHÔNG có `<col width>` trong file gốc và app không đổi (lệch < 0,5 ký tự) thì không ghi `width=`; `defaultColWidth` LibreOffice tự thêm (11.535) bị bỏ khi file gốc không có; `baseColWidth` giữ nguyên. Excel: thuộc tính width đã gồm lề 5px (9.140625 = 64px/7 cho cột hiển thị "8.43"), cột mặc định = 8×MDW+8 px; MDW đo Excel COM (`_excel_mdw.ps1`): Calibri 11/Arial 10/Tahoma 10 = 7, Calibri 12/Arial 11/Times New Roman 12/Verdana 10 = 8 | vòng 5: 271 cột / 9 file (lan21 104, lan17 69, lan28 20, lan01 20…) ghi `width="8.43"` = 59px cho cột 64px | test_sheet_save_colwidth (S11), auditor `columnPx`/`defaultColumnPx` |
| S9b | Cột ẩn NGOÀI vùng dữ liệu (sau cột cuối của `<dimension>`) là phần app không thấy → phủ dải ẩn gốc lên `<cols>` đã lưu, cắt `<col>` chồng (không chỉ nối sau cột lớn nhất: dải 265..4096 nằm trong `<cols>` LibreOffice ghi tới 4096) | vòng 6: lan19 150, lan08 231, lan22 15 | test_sheet_hidden_cols_rows (S9b) |
| S10b | LibreOffice ghi `<indexedColors>` 64 màu nhưng bỏ khối 8 màu lặp (chỉ số 8–15) → mọi `indexed="N"` lệch 8 bậc (đen → #800000). File gốc không có bảng riêng → bỏ khối này; có → thay bằng của file gốc | Excel COM lan03 E3: font #800000 → #000000 sau khi bỏ (`_excel_cell_probe.ps1`); vòng 6 lan03 232→772, lan08 348→554 vì auditor mới nhìn thấy | test_sheet_untouched_cell_styles (S10b) |
| S13 | Ô chuỗi rỗng `<c t="s">`→`<si><t/></si>` (hoặc inlineStr rỗng) bị soffice BỎ khi nhập (app không thấy) nhưng Excel coi là ô thật → hậu xử lý chèn lại từ file gốc, xf qua `_SourceXfCopier` (không chép thẳng `s=` gốc) | vòng 5/6: lan25 686+686, lan20 20, lan15 2 | test_sheet_empty_string_cells |
| S14 | Ô giá trị lỗi thuần `<c t="e"><v>#N/A</v></c>` (giá trị dán) bị LibreOffice biến thành công thức `=#N/A` → bỏ `<f>` khi ô lưu cùng giá trị lỗi và công thức đúng bằng chữ lỗi | vòng 6: lan01 200 | test_sheet_literal_error_cells |
| S15 | LibreOffice xuất `TRUE/FALSE` thành `TRUE()/FALSE()`; công thức cùng nghĩa với file gốc (không shared/array) → ghi lại đúng chữ của file gốc | lan28 142 | test_sheet_literal_error_cells |
| S8b | Mã numFmt built-in (5–8, 41–44) được file gốc khai báo tường minh (`numFmtId="41" formatCode=…`) → cấp id ≥ 164 và chép đúng mã (Excel dùng mã locale cho 41 nếu không) | lan28 1540 ô, lan07 95 | test_sheet_untouched_cell_styles |
| S16 | Drawing ảnh (ảnh + shape) của sheet KHÔNG bị app sửa → lưu nguyên `xl/drawings/drawingN.xml` + rels + media gốc (media đổi tên `vnosrc_*`) qua hậu xử lý; Mở: gắn `vno:image-id` lên `<draw:frame>` ảnh theo thứ tự anchor gốc; Lưu: đối chiếu `vno:image-id` FODS vs anchor gốc → khớp trọn thì khôi phục | Vòng 7: 4 file 75 ảnh (lan04/09/11/15) + 7 file 550 ảnh (lan26) → lớp image 13/8/18/4 → 0; shapes (sp) cũng được khôi phục | test_sheet_drawing_passthrough |
| S17 | Chuỗi có xuống dòng đầu phải giữ đoạn rỗng đầu tiên; nếu rich-text ODF không còn đoạn đó thì `vno:original-string` là nguồn chuẩn khi lưu | vòng 8: value 2 → 0 | test_sheet_residuals_r8 + sheet-import-cell-styles |
| S18 | Cột có `width` tường minh ở nguồn được snap về width gốc khi sai số đổi cm→ký tự không quá 2 px; cache kết quả của công thức không đổi được giữ từ nguồn | vòng 8: columnWidth 9 → 0; value công thức 3 → 0 | test_sheet_residuals_r8 |
| S19 | Ô lỗi có công thức nằm trong `covered-table-cell` vẫn là dữ liệu thật: nâng thành ô dữ liệu khi nhập, không để marker merge xóa khi serialize; mọi xf nguồn đi qua `_SourceXfCopier` | vòng 8: value/formula/font/fill/border/alignment 12 → 0 | test_sheet_residuals_r8 + sheet-import-cell-styles |
| S20 | `centerContinuous` là căn giữa qua vùng chọn, không phải merge; merge do LibreOffice tự sinh phải bỏ. Tên sheet `_xHHHH_` đối chiếu theo tên đã giải mã/chuẩn hóa khoảng trắng, nhưng lưu lại tên/state gốc | vòng 8: merge 1 → 0; visibility 2 → 0 | test_sheet_residuals_r8 |
| S21 | Drawing chưa sửa được nhận theo tập `vno:image-id` là tập con hợp lệ của nguồn và số ảnh hiện tại không tăng; ảnh linked/grouped/HD Photo cũng được đếm, chép media và khai báo content type | vòng 8: image 6 → 0 | test_sheet_residuals_r8 + test_sheet_drawing_passthrough |
| S12 | Chữ của ô = các `<text:p>` con trực tiếp của ô (không lấy `<text:p/>` trong `<draw:frame>` ảnh neo ô, không lấy trong annotation); rich text duyệt mọi nút con của `<text:p>` theo thứ tự (chữ trần trước/giữa span là run không style); `<text:s text:c>`/`<text:tab/>`/`<text:line-break/>` = dấu cách/tab/xuống dòng | vòng 5: ô chỉ có ảnh → chuỗi "\n" 233 ô / 7 file (lan04 B23…); "SỐ TIỀN (With Amount)" → " (With Amount)" 52 ô / 5 file (lan02 G3…) | sheet-import-rich-text.test.js (4 test S12) |
| S6 | Auditor so theo ngữ nghĩa Excel: màu theme(+tint) → RGB; màu indexed theo bảng chuẩn 0–63 (+`<indexedColors>` riêng); font/viền không màu = tự động; căn ngang trống = general, dọc trống = bottom; cạnh viền hiệu dụng với ô kề; cột không có `<col>` = mặc định theo sheetFormatPr + MDW | lan09 115k → 1.246 lệch thật | audit-sheet-import.mjs |

## Đang đo / đang giao

- Sheet: Đã triệt tiêu 16.358 lỗi `hiddenColumn` qua S9. Lớp còn lại: fill (53k), value (34k), merge ô gộp (`G4:I4` UNC, `A4:F4` DANH SÁCH CHI LƯƠNG).
- Writer: MA-TRAN-WRITER-2026-09-15b.md; còn wrap (86), line-height (126), drift:unknown (119), d20 bảng trHeight (W11b).

# S24 — Tài liệu VN Sheet tạo mới (19/09/2026)

- **S24a — chiều rộng:** pixel trong model/UI VN Sheet là pixel Excel hiển thị. Khi nhập XLSX, `width` ký tự được đổi thành `width × MDW`; khi lưu, đổi ngược bằng `px / MDW`, không cộng/trừ lề 5 px.
- **S24b — mặc định workbook mới:** Normal là Calibri 11 pt; hàng 20 px (15 pt); cột 64 px (MDW 7); XLSX có `sheetFormatPr defaultRowHeight="15"` và không giữ `defaultColWidth` do LibreOffice tự sinh.
- **S24c — cỡ chữ ribbon:** giá trị người dùng chọn là point. Model CSS lưu `pt × 4/3` px (làm tròn hai chữ số); tăng/giảm cỡ chữ so sánh theo point.
