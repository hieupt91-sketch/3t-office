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

## Quy ước đã đo và khoá (Sheet)

| # | Quy ước | Số đo gốc | Khoá bởi |
|---|---|---|---|
| S1 | Ô ngày/giờ = `office:value-type="date"` `office:date-value="YYYY-MM-DD[THH:MM:SS]"` / `time-value`, không phải chuỗi | 7 file, 642 ô VAT | suite 154 |
| S2 | Ô chỉ có style (không giá trị) = `<table:table-cell style/>` trống, không phải chuỗi rỗng | lan09 21.930 ô | 7120d6b |
| S3 | Dòng bị lọc ẩn (`visibility="filter"`) = dòng ẩn | lan01 2635 dòng | suite 154 |
| S4 | Vùng AutoFilter: `'Tên sheet'.A1:'Tên sheet'.J2650` (nháy cả hai đầu) | lan01 sheet 3 | suite 154 |
| S5 | Dải style-only rộng hơn 64 cột là "định dạng nguyên hàng": bộ tối ưu FODS không được cắt xuống ≤ 64 | lan05 Map overflow | test_sheet_fods_optimize |
| S7 | Định dạng số nhập từ file: giữ nguyên data-style ODF LibreOffice sinh (`numberFormat.odf`), ghi lại verbatim; ô chuỗi/trống cũng giữ numFmt | lan10/26/27 | ade1bc8 |
| S6 | Auditor so theo ngữ nghĩa Excel: màu theme(+tint) → RGB; font/viền không màu = tự động; căn ngang trống = general, dọc trống = bottom; cạnh viền hiệu dụng với ô kề | lan09 115k → 1.246 lệch thật | audit-sheet-import.mjs |

## Đang đo / đang giao

- Sheet `numberFormat` (287k ô, 24 file) → opencode `fix/sheet-number-format-codes`; `border` (180k, 23 file) → agy `fix/sheet-border-fidelity`.
- Writer: ma trận 24 docx đang chạy (`_writer_layout_matrix.md`); lớp `wrap` (số dòng gãy khác Word) cần quy ước về đo chữ.
