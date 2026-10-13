# E2 formula and cache gate (2026-10-13)

Đã chạy bằng VN Sheet desktop, P1b nạp đầy đủ (`VNO_OPEN_VIEWFIRST=0`) và `--force`; tệp kết quả cũ không được dùng. JSON đầy đủ và ví dụ ô được giữ ngoài repo tại `E:\VNOffice-profiles\cdp-fe2\formula-results-force.json` để không đưa nội dung workbook mẫu vào git.

| Tệp | 0.9.9 match rate | Chạy hiện tại | Checked | Match | Mismatch |
|---|---:|---:|---:|---:|---:|
| lan01.xlsx | 25.90% | 100.00% | 865 | 865 | 0 |
| lan02.xlsx | 50.00% | 50.00% | 4 | 2 | 2 |
| lan03.xlsx | 85.26% | 100.00% | 95 | 95 | 0 |
| lan04.xlsx | 16.33% | 100.00% | 49 | 49 | 0 |
| lan05.xlsx | 100.00% | 100.00% | 15 | 15 | 0 |
| lan06.xlsx | 40.27% | 100.00% | 1023 | 1023 | 0 |
| lan07.xlsx | 92.05% | 100.00% | 327 | 327 | 0 |
| lan08.xlsx | 100.00% | 100.00% | 51 | 51 | 0 |
| lan09.xlsx | 50.00% | 100.00% | 2 | 2 | 0 |
| lan10.xlsx | 100.00% | 100.00% | 3 | 3 | 0 |
| lan11.xlsx | 100.0% | 100.0% | 0 | 0 | 0 |
| lan12.xlsx | 100.0% | 100.0% | 0 | 0 | 0 |
| lan13.xlsx | 100.00% | 100.00% | 299 | 299 | 0 |
| lan14.xlsx | 49.84% | 99.99% | 68125 | 68121 | 4 |
| lan15.xlsx | 100.00% | 100.00% | 2 | 2 | 0 |
| lan16.xlsx | 100.00% | 100.00% | 64 | 64 | 0 |
| lan17.xlsx | 95.45% | 100.00% | 1449 | 1449 | 0 |
| lan18.xlsx | 100.00% | 100.00% | 1 | 1 | 0 |
| lan19.xlsx | 80.00% | 80.00% | 5 | 4 | 1 |
| lan20.xlsx | 100.00% | 100.00% | 8 | 8 | 0 |
| lan21.xlsx | 100.0% | 100.0% | 0 | 0 | 0 |
| lan22.xlsx | 0.00% | 100.00% | 124 | 124 | 0 |
| lan23.xlsx | N/A | N/A | 0 | 0 | 0 |
| lan24.xlsx | 100.00% | 100.00% | 27 | 27 | 0 |
| lan25.xlsx | 100.0% | 100.0% | 0 | 0 | 0 |
| lan26.xlsx | 50.00% | 100.00% | 24 | 24 | 0 |
| lan27.xlsx | 100.0% | 100.0% | 0 | 0 | 0 |
| lan28.xlsx | 97.09% | 55.27% | 275 | 152 | 123 |

- Overall: 72,707 / 72,837 matches (99.82%); 130 mismatches. 0.9.9 aggregate baseline: 37,118 / 72,837 (50.96%).
- LAN02: two `_XLL.VND` formulas evaluate to text in VN Sheet while the source cache is `#NAME?`; this is consistent with the legacy add-in being unavailable to Excel during cache generation.
- LAN14: four text outputs differ only in LF versus CRLF line endings.
- LAN19: one `SUM` formula returns `#VALUE!` in VN Sheet while the cache is numeric; formula engine discrepancy remains.
- LAN28: 152 / 275 (55.27%) versus 267 / 275 (97.09%) at 0.9.9; the VLOOKUP regression remains release-blocking.
- Result: aggregate exceeds the 0.9.9 aggregate, but the per-file gate FAILS because LAN28 is below its baseline.
