# Handoff S30-batch — Hình học render Sheet, 26 workbook lan (opencode đo 21/9, Claude tổng hợp)

opencode chạy `_sheet_geometry_audit.py` cho 26 file (bỏ lan06/lan14) rồi rớt (504 upstream) trước khi viết handoff;
số liệu nằm ở `E:\VNOffice-opencode-lan-audit\_geom_batch\lanNN.geom.md` / `.geomcmp.json`. Worktree lúc đo ở
`d6040cd` (chưa có S30c/S30d) — các dòng lệch cột đã được Claude đo lại trên main sau S30c/S30d.

## Ma trận (chỉ sheet có lệch; 75 sheet đo, dung sai 1px)

| file | sheet | cột lệch/tổng | hàng lệch/tổng | lớp hàng | lines | fit | sau S30c/S30d (Claude đo lại) |
|---|---:|---:|---:|---|---:|---:|---|
| lan01 | s1 | 0/12 | 1/300 | auto (hàng 1: 57 vs 60) | 0 | 0 | |
| lan03 | s3 | 0/22 | 5/107 | auto (bọc chữ 16–17 dòng) | 0 | 0 | S31 |
| lan05 | s1 | 0/10 | 4/300 | auto (E32… 4 vs 3 dòng) | 0 | 0 | S31 |
| lan08 | s1 | 0/7 | 1/16 | auto (45 vs 47) | 0 | 0 | |
| lan09 | s1 | 1/27 | 0/300 | | 0 | 0 | **0** — S30d (cột ẩn D làm F nhận bề rộng E) |
| lan11 | s2 | 0/6 | 22/300 | auto (hàng 20–30 dòng bọc chữ) | 0 | 0 | S31 |
| lan11 | s3 | 16/40 | 4/300 | auto | 0 | 0 | **cột 0** — S30c (cột mặc định 100 vs 106) |
| lan16 | s4 | 0/7 | 5/119 | auto | 0 | 0 | |
| lan21 | s1–s4 | 3/3 mỗi sheet | 0/1 | | 0 | 0 | **0** — S30c (72 vs 69) |
| lan22 | s2 | 1/1 | 0/1 | | 0 | 0 | **0** — S30d (điền A..Z mặc định) |
| lan23 | s1 | 0/10 | 1/300 | norow (default) | 0 | 0 | |
| lan26 | s2 | 0/26 | 0/300 | | 0 | 1 | |

Tổng trước: cột 30, hàng 43 (auto 42, norow 1). Sau S30c/S30d: **cột 0**, hàng còn ~40, tất cả là lớp S31
(số dòng bọc chữ ±1 vì bề rộng chữ GDI ≠ trình duyệt) trừ lan01/lan08/lan23 (1 hàng mỗi file — chưa soi).

## Bề rộng chữ (S31): tỉ lệ (AutoFit − 7px)/textW trình duyệt, gộp mọi file, n ≥ 5

| font | cỡ | đậm | n | median | min–max |
|---|---:|---|---:|---:|---|
| Arial | 9 | – | 369 | 1.032 | 1.002–1.048 |
| Times New Roman | 11 | – | 253 | 1.019 | 0.991–1.123 |
| Calibri | 11 | – | 218 | 0.989 | 0.941–1.027 |
| Times New Roman | 12 | đậm | 202 | 0.983 | 0.959–1.040 |
| Calibri | 11 | đậm | 184 | 0.999 | 0.999–1.017 |
| Times New Roman | 12 | – | 178 | 0.977 | 0.961–1.000 |
| Times New Roman | 10 | đậm | 150 | 0.983 | 0.889–1.033 |
| Times New Roman | 18 | đậm | 100 | 1.019 | 1.010–1.022 |
| Trebuchet MS | 9 | – | 81 | 1.025 | |
| Times New Roman | 11 | đậm | 77 | 1.058 | 1.024–1.117 |
| Times New Roman | 13 | đậm | 69 | 1.012 | |
| Times New Roman | 15 | – | 57 | 1.030 | |
| Times New Roman | 14 | đậm | 32 | 1.055 | 1.045–1.083 |
| Cambria | 12 | đậm | 11 | 1.035 | |
| Calibri | 15 | đậm | 8 | 1.044 | |

Kết luận cho S31: sai khác ±2–6% theo (font, cỡ, đậm), không theo tỉ lệ chung → cần bảng hệ số theo font/cỡ
(letter-spacing) hoặc đo GDI qua Python; ưu tiên TNR 11 đậm (1.058), TNR 14 đậm (1.055), TNR 15 (1.030), Arial 9
(1.032) vì hay bọc chữ.
