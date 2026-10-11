# Brief S26 (codex) — Mở rộng bộ đo "TẠO MỚI trong VN Sheet → lưu XLSX → Excel 2016 đọc lại": kịch bản 2, tìm lệch, sửa theo lớp

Đọc trước: `docs/QUY-UOC-DOI-CHIEU.md` (mục Sheet S8–S25, đặc biệt **S24** mặc định workbook mới),
`scripts/layout-audit/_create_new_sheet.py`, `scripts/layout-audit/_excel_readback.ps1`, `docs/HANDOFF-SHEET-NEW-DOC-DEFAULTS.md`
(nếu có), `docs/MA-TRAN-SHEET-2026-09-19.md`.

Main hiện `3811c25`: kịch bản 1 (font/đậm/nghiêng/gạch chân, số/%/tiền/ngày, công thức, nền, viền, wrap, gộp ô, bề rộng
cột, cao dòng, cỡ chữ ribbon) đạt **CHECKS=40 DIFFS=0**. Người dùng soạn bảng tính trong VN Sheet, gửi XLSX, đối tác mở
bằng Excel phải thấy y hệt — kịch bản 1 mới phủ phần cơ bản. Việc: **kịch bản 2** phủ phần người dùng văn phòng Việt
Nam dùng hằng ngày, đo thật bằng Excel COM, sửa từng lớp lệch.

## Bước 1 — Kịch bản 2 (`SCENARIO2` trong `_create_new_sheet.py`, tham số `--scenario 2`, ghi `_new2.xlsx` + `.expected.json`)

Dùng đúng API grid / command bus như kịch bản 1 (nếu app có lệnh ribbon tương ứng thì dùng lệnh, vì đó là cái người
dùng bấm). Mỗi mục = kiểm tra đọc lại bằng Excel COM (mở rộng `_excel_readback.ps1`, ghi rõ thuộc tính COM):

| # | Người dùng tạo | Excel đọc lại |
|---|---|---|
| 1 | 2 sheet: "Doanh thu", "Chi phí" (đổi tên, thêm sheet); ô A1 sheet 2 = `='Doanh thu'!B2*2` | `Sheets.Count`=2, `.Name`, `Range.Formula` xuyên sheet, `.Value2` |
| 2 | Đóng băng dòng 1 + cột A (freeze panes) | `ActiveWindow.SplitRow`=1, `SplitColumn`=1, `FreezePanes`=True |
| 3 | Số âm định dạng `#,##0;[Red]-#,##0`; số 0 chữ số thập phân với dấu phân cách VN (nếu app có tuỳ chọn locale) | `NumberFormat` |
| 4 | Ngày nhập chuỗi "15/03/2026" (người dùng gõ) → phải thành ngày thật | `Value2` = 46096 (serial), `NumberFormat` chứa `dd/mm/yyyy` |
| 5 | Giờ `08:30`, số dạng phân số/khoa học `1.5E+10` | `Value2`, `NumberFormat` |
| 6 | Công thức thường dùng: `=IF(B2>100,"Đạt","Chưa")`, `=VLOOKUP(...)`, `=SUMIF(...)`, `=AVERAGE(...)`, `=ROUND(...,0)`, `=TEXT(B4,"dd/mm/yyyy")`, `=CONCATENATE`/`&`, `=COUNTA` | `Formula` đúng chuỗi (tiếng Anh, dấu `,`), `Value2` đúng (Excel tính lại) |
| 7 | Viền: viền ngoài dày (medium) + viền trong mỏng cho vùng A1:D5; viền dưới đôi (double) | `Borders(xlEdgeBottom).LineStyle/Weight`, `Borders(xlInsideHorizontal)` |
| 8 | Nền màu theme "xanh nhạt" `#DDEBF7`, chữ trắng trên nền `#1F4E78` | `Interior.Color`, `Font.Color` |
| 9 | Canh giữa dọc + ngang, xoay chữ 90°, thụt lề ô 2 | `VerticalAlignment`, `HorizontalAlignment`, `Orientation`=90, `IndentLevel`=2 |
| 10 | Bề rộng cột theo "AutoFit" sau khi nhập chuỗi dài; ẩn cột C; ẩn dòng 7 | `ColumnWidth` (ký tự) > mặc định, `Columns("C").Hidden`, `Rows(7).Hidden` |
| 11 | Định dạng có điều kiện: B2:B10 > 100 → nền xanh lá (nếu app có) | `FormatConditions.Count`=1, `.Type`, `.Formula1`, `.Interior.Color` |
| 12 | Data validation danh sách "Có,Không" ở D2:D10 (nếu app có) | `Validation.Type`=3, `.Formula1` |
| 13 | Autofilter A1:D10 | `AutoFilterMode`=True, `AutoFilter.Range.Address` |
| 14 | Thiết lập in: khổ A4 ngang, lề 1.5cm, in tiêu đề dòng 1 lặp lại, vùng in A1:D20 | `PageSetup.Orientation`=2, `PaperSize`=9, `PrintTitleRows`, `PrintArea` |
| 15 | Ghi chú (comment) ở A1 "Ghi chú kiểm tra" (nếu app có) | `Comment.Text()` |
| 16 | Chuỗi bắt đầu bằng `=` nhưng người dùng muốn văn bản (`'=abc`) và số điện thoại `0912345678` giữ số 0 đầu (định dạng Text) | `Value2`="=abc" là chuỗi; `NumberFormat`="@", `Value2`="0912345678" |

Ghi `expected.json` ngay khi tạo (giá trị người dùng đã chọn), **không** sửa expected cho khớp Excel. Mục app chưa có
lệnh → ghi "không có lệnh" trong handoff, không bịa.

## Bước 2 — Đo, gom lớp

`python scripts/layout-audit/_create_new_sheet.py . _new2.xlsx --scenario 2` rồi
`powershell -File scripts/layout-audit/_excel_readback.ps1 -File _new2.xlsx` → `CHECKS=N DIFFS=M`; chạy thêm
`python scripts/layout-audit/_xlsx_lint.py _new2.xlsx` và `_xlsx_parts_lint.py`. Dán nguyên văn vào
`docs/HANDOFF-SHEET-CREATE-NEW-S26.md`; mỗi lệch: expected / Excel đọc / nguyên nhân xác định bằng cách xem
`_new2.xlsx.sent.fods` (app gửi gì) và giải nén XLSX (`xl/worksheets/sheet1.xml`, `styles.xml`) → LibreOffice làm rơi
hay app chưa gửi. Gom theo lớp.

## Bước 3 — Sửa từng lớp (commit riêng)

Đúng tầng: app chưa gửi → `apps/sheet/sheet-grid.js` / `adapters/libreoffice/sheet/sheet-adapter.js` (FODS);
LibreOffice làm rơi/đổi → hậu xử lý `adapters/libreoffice/common/ooxml_zip_patch.py` (như S8–S24). Mỗi lớp: 1 chỗ sửa
+ unit test (`tests/unit/sheet-*.test.js` hoặc `tests/test_sheet_*.py`) + quy ước **S26a, S26b, …** trong QUY-UOC. Đo lại
sau mỗi lớp, DIFFS giảm, kịch bản 1 vẫn `CHECKS=40 DIFFS=0`, **26 file LAN vẫn 0 lệch**:
`python scripts/layout-audit/_batch_audit.py` trên 5 file `lan01 lan02 lan03 lan05 lan09` (không chạy lan06/lan14).

## Ràng buộc

- **Profile soffice dùng chung**: trước mỗi lần chạy app (`_create_new_sheet.py`, `_batch_audit.py`), kiểm tra
  `Get-Process soffice -ErrorAction SilentlyContinue`; nếu còn tiến trình → `Start-Sleep 60` rồi kiểm tra lại (tối đa
  30 phút) — có agent khác đang đo; chạy chồng cho số giả. Excel COM: mở `Visible=$false`, luôn `Quit`.
- Gate: `node scripts/check-syntax.js`, `node tests/run-tests.js` (main 1790/1790), `python -m unittest discover -s tests -p "test_sheet*.py"`.
- Không commit `file test`, không tên tài liệu thật, không bịa số, không đổi định nghĩa kiểm tra kịch bản 1, không đổi
  mặc định toàn cục. Commit `git commit -F` tiếng Việt không dấu. Hết hạn mức: commit phần xong + ghi rõ còn gì.
