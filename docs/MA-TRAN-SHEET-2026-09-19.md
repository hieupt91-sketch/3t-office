# Ma trận Sheet — 19/9/2026 (vòng 5 → 8 + đo bổ sung sau vòng 8)

Bộ đo: `scripts/layout-audit/_batch_audit.py` (mở + lưu app thật, Excel 2016 COM mở thử, lint XML/parts) + `_sheet_matrix.py`.
26 workbook LAN (lan06 = VAT 146 MB và lan14 = 1,5 triệu ô chạy riêng — số của hai file này trong bảng là số cũ).

## Tổng theo vòng (main)

| Vòng | main | Tổng lệch (26 file) | File 0 lệch | Excel mở | Lớp sửa |
|---|---|---:|---:|---|---|
| 4 (15/9) | trước S6 | ≈ 350.000 | 0 | 26/26 | — |
| 5 (19/9 sáng) | 8a26faa (S8 + S9 của agy) | 7.300 (lan09 KHÔNG lưu được >20 phút) | 2 | 26/26 | xác nhận S8/S9 |
| 6 | 5db873f | 3.780 | 6 | 23/26 (`<cols></cols>` rỗng) | S10 theme, S11 cột mặc định, S12 chữ ô, S8 một lượt (lan09 15 s) |
| 7 | 5bb0dd4 | 2.070 (lan03 772 → 0, lan25 1386 → 0) | 15 | 21/26 (S9b ghi `<col>` hỏng) | S10b bảng màu, S9b cột ẩn, S13 chuỗi rỗng, S14/S15 công thức, S8b numFmt |
| 8 | c5b038d | **371** | 14 | **26/26**, lint sạch | S9b XML, xfId |
| sau 8 (đo lẻ) | d78ba1c | lan08 98 → 0, lan01 9 → 0, lan25 14 → 0, lan11 41 → 1, lan09 134 → 32, lan26 13 → 0, lan04 18 → 0, lan12 12 → 10, lan15 18 → 14 → **≈ 40** | 19 | 26/26 | font[0], font-face, chữ shape, AutoFilter nhiều sheet, S16 drawing |

## Vòng 8 (main c5b038d) — loại lỗi × file

| file | total | numberFormat | font | alignment | border | fill | value | hiddenRow | image | columnWidth | visibility | hiddenColumn | formula | autoFilter | merge |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| lan01.xlsx | 9 | 0 | 8 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| lan02.xlsx | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 |
| lan03.xlsx | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| lan04.xlsx | 18 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 18 | 0 | 0 | 0 | 0 | 0 | 0 |
| lan05.xlsx | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| lan06.xlsx (cũ) | 7 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 7 | 0 | 0 | 0 | 0 |
| lan07.xlsx | 1 | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| lan08.xlsx | 98 | 0 | 98 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| lan09.xlsx | 134 | 17 | 19 | 19 | 2 | 18 | 29 | 0 | 30 | 0 | 0 | 0 | 0 | 0 | 0 |
| lan10.xlsx | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| lan11.xlsx | 41 | 7 | 8 | 8 | 8 | 0 | 8 | 0 | 1 | 0 | 0 | 0 | 0 | 1 | 0 |
| lan12.xlsx | 12 | 0 | 0 | 0 | 0 | 0 | 2 | 0 | 8 | 2 | 0 | 0 | 0 | 0 | 0 |
| lan13.xlsx | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| lan14.xlsx (cũ) | 921616 | 254088 | 196567 | 176483 | 176006 | 51261 | 33617 | 33579 | 1 | 8 | 0 | 5 | 1 | 0 | 0 |
| lan15.xlsx | 18 | 0 | 2 | 2 | 2 | 2 | 2 | 0 | 4 | 0 | 2 | 0 | 2 | 0 | 0 |
| lan16.xlsx | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| lan17.xlsx | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| lan18.xlsx | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| lan19.xlsx | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| lan20.xlsx | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 |
| lan21.xlsx | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| lan22.xlsx | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| lan23.xlsx | 1 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 1 | 0 | 0 | 0 | 0 |
| lan24.xlsx | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| lan25.xlsx | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| lan26.xlsx | 13 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 13 | 0 | 0 | 0 | 0 | 0 | 0 |
| lan27.xlsx | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 | 0 |
| lan28.xlsx | 10 | 0 | 0 | 0 | 0 | 0 | 3 | 0 | 0 | 7 | 0 | 0 | 0 | 0 | 0 |

## Lớp còn lại sau các sửa lẻ (main d78ba1c) → giao codex (`TASK-BRIEF-SHEET-RESIDUALS-R8.md`)

| Lớp | Ở đâu | Bản chất đã đo |
|---|---|---|
| value 2 | lan12 D46/D47 | chuỗi bắt đầu bằng `\r\n` mất dòng trống đầu |
| image 6 + 4 | lan12, lan15 | sheet S16 chưa nhận "chưa sửa" (đếm anchor: oneCell/absolute/grpSp/ảnh liên kết?) |
| formula/value 2 | lan15 C2/C15 | ô `=NA()` (t="e") bị bỏ hẳn |
| visibility 2 | lan15 | tên sheet chứa `_x0009_` (TAB) |
| columnWidth 7+2 | lan28, lan12 | 66.82 → 64.99 (làm tròn chars_for) |
| autoFilter 1 | lan20 | đo lại sau 90ff339 |
| merge 1 | lan02 | Excel `centerContinuous` ≠ ô gộp |
| visibility 1 | lan23 | in chi tiết |
| lan09 32 | | image 30 (S16) + value 2 |

## Phát hiện phương pháp (ghi vào QUY-UOC)

- Auditor cũ có hai giá trị giả: cột không có `<col>` = 100 px và màu indexed không giải → che 271 cột lệch thật và
  lớp bảng màu lệch 8 bậc của LibreOffice (Excel COM xác nhận chữ đen thành #800000).
- Excel "FAIL" trong batch: 8/8 lần là lỗi thật (XML hỏng, `<cols>` rỗng, rels sai đường dẫn) — lint XML + parts
  (`_xlsx_lint.py`, `_xlsx_parts_lint.py`) nay chạy trong batch để bắt trước khi mở Excel.
- Không chạy test/agent dùng soffice hay Excel COM song song với batch (lan10/lan26 vòng 6 chờ 15 phút).
