# Agent Handoff

TASK: Xác nhận S29 vòng 1–4 (tối ưu Python mở Sheet: `ooxml_zip_patch.py`, gộp 3 lượt quét XLSX thành 1) không hồi quy trên batch file LAN thật — đo nhập→sửa→lưu→mở Excel COM, không sửa code.
AGENT/ROLE: Grok (đo/xác nhận)
BRANCH: `audit/sheet-s29-regression-grok`
WORKTREE: `E:\VNOffice-grok-sheet-s29-regression`
OBJECTIVE: Chạy `_batch_audit.py` trên 26 file (lan01–lan28 trừ lan06/lan14 kích thước lớn), ghi TONG sai lệch + Excel mở + thời gian; đo riêng thời gian mở Python của lan06/lan14.
FINDINGS: **Không hồi quy.** 26/26 file batch TONG sai lệch 0, Excel 2016 COM mở OK, lint sạch. lan06/lan14 Python pipeline 125,10s / 109,89s — giữ (nhỉnh hơn) mốc S29 vòng 2 (136,4s / 115,5s). **S29 vòng 1–4 an toàn để giữ trên main.**

## Kết luận

| Hạng mục | Kết quả |
|---|---|
| Fidelity 26 file (bỏ lan06/lan14) | **PASS** — 26/26 TONG = 0 |
| Excel 2016 COM 26 file | **PASS** — 26/26 OK |
| Lint XML 26 file | **PASS** — 26/26 clean |
| Roundtrip lan06 / lan14 | **NOT RUN** — quy ước cũ (file lớn; batch vốn tách riêng) |
| Thời gian mở Python lan06 | **PASS** — 125,10s (trước S29 1721s; S29 R1 156s; S29 R2 136,4s) |
| Thời gian mở Python lan14 | **PASS** — 109,89s (trước S29 346s; S29 R1 132s; S29 R2 115,5s) |
| Sửa code | Không (chỉ đo) |

Không file nào lệch khác 0. Không bisect. Không merge vào main từ worktree này.

## Bảng 28 file

`seconds` của lan17–lan28 là tường batch `_batch_audit.py` (roundtrip app + auditor + Excel COM + lint). lan01–lan16 (trừ 06/14): roundtrip + auditor chạy phiên trước (stdout Excel/lint/seconds mất vì batch nền bị giết giữa lan16); phiên này **không chạy lại** roundtrip, chỉ xác nhận TONG từ `_audit_lanNN.txt`, rồi Excel COM + lint trên `_rt_lanNN.xlsx` còn lại.

| file | TONG sai lệch | Excel mở | lint | seconds | kết quả |
|---|---:|---|---|---:|---|
| lan01.xlsx | 0 | OK sheets=3 | clean | không đo lại | PASS |
| lan02.xlsx | 0 | OK sheets=2 | clean | không đo lại | PASS |
| lan03.xlsx | 0 | OK sheets=12 | clean | không đo lại | PASS |
| lan04.xlsx | 0 | OK sheets=2 | clean | không đo lại | PASS |
| lan05.xlsx | 0 | OK sheets=1 | clean | không đo lại | PASS |
| lan06.xlsx | NOT RUN | NOT RUN | NOT RUN | Python 125.10s | NOT RUN roundtrip; PASS timing |
| lan07.xlsx | 0 | OK sheets=10 | clean | không đo lại | PASS |
| lan08.xlsx | 0 | OK sheets=7 | clean | không đo lại | PASS |
| lan09.xlsx | 0 | OK sheets=15 | clean | không đo lại | PASS |
| lan10.xlsx | 0 | OK sheets=9 | clean | không đo lại | PASS |
| lan11.xlsx | 0 | OK sheets=3 | clean | không đo lại | PASS |
| lan12.xlsx | 0 | OK sheets=11 | clean | không đo lại | PASS |
| lan13.xlsx | 0 | OK sheets=12 | clean | không đo lại | PASS |
| lan14.xlsx | NOT RUN | NOT RUN | NOT RUN | Python 109.89s | NOT RUN roundtrip; PASS timing |
| lan15.xlsx | 0 | OK sheets=5 | clean | không đo lại | PASS |
| lan16.xlsx | 0 | OK sheets=14 | clean | không đo lại | PASS |
| lan17.xlsx | 0 | OK sheets=23 | clean | 25.6 | PASS |
| lan18.xlsx | 0 | OK sheets=1 | clean | 20.8 | PASS |
| lan19.xlsx | 0 | OK sheets=1 | clean | 20.8 | PASS |
| lan20.xlsx | 0 | OK sheets=1 | clean | 20.9 | PASS |
| lan21.xlsx | 0 | OK sheets=18 | clean | 20.7 | PASS |
| lan22.xlsx | 0 | OK sheets=2 | clean | 37.8 | PASS |
| lan23.xlsx | 0 | OK sheets=1 | clean | 20.9 | PASS |
| lan24.xlsx | 0 | OK sheets=4 | clean | 20.7 | PASS |
| lan25.xlsx | 0 | OK sheets=1 | clean | 24.2 | PASS |
| lan26.xlsx | 0 | OK sheets=6 | clean | 42.7 | PASS |
| lan27.xlsx | 0 | OK sheets=1 | clean | 21.2 | PASS |
| lan28.xlsx | 0 | OK sheets=12 | clean | 25.9 | PASS |

## Thời gian mở Python lan06 / lan14

Đo một lần mỗi file, foreground, `$env:LOCALAPPDATA = E:\VNOffice-profiles\grok`, `scripts/layout-audit/_time_sheet_open_stages.py`. Không lưu FODS ra đĩa.

### lan06.xlsx (11,25 MB) — tổng Python **125,10s**, FODS ra 4,44 MB

| Giai đoạn | Thời gian (s) | Kích thước (MB) |
|---|---:|---:|
| make_all_sheets_visible | 0.00 | 11.25 |
| soffice convert (XLSX → FODS) | 15.13 | 146.19 |
| overlay_fods_structure_protection | 0.00 | 146.18 |
| overlay_active_sheet_to_fods | 0.17 | 146.18 |
| overlay_sheet_xlsx_freeze_panes | 0.23 | 146.18 |
| _overlay_autofilter_from_xlsx | 0.64 | 146.18 |
| _overlay_sheet_layout_from_xlsx | 13.51 | 147.84 |
| _overlay_sheet_cell_metadata_from_xlsx (formats + strings + xf) | 44.91 | 334.36 |
| _promote_covered_formula_errors | 0.22 | 334.36 |
| _overlay_sheet_drawing_image_ids | 0.00 | 334.36 |
| optimize_fods_streaming | 32.14 | 4.15 |
| reoverlay_sheet_xf_indices | 17.52 | 4.44 |
| **Tổng cộng (Python)** | **125.10** | **4.44** |

### lan14.xlsx (9,74 MB) — tổng Python **109,89s**, FODS ra 316,01 MB

| Giai đoạn | Thời gian (s) | Kích thước (MB) |
|---|---:|---:|
| make_all_sheets_visible | 1.36 | 7.42 |
| soffice convert (XLSX → FODS) | 15.03 | 257.17 |
| overlay_fods_structure_protection | 0.00 | 255.07 |
| apply_sheet_visibility_to_fods | 2.25 | 255.07 |
| overlay_active_sheet_to_fods | 0.33 | 255.07 |
| overlay_sheet_xlsx_freeze_panes | 2.86 | 255.07 |
| _overlay_autofilter_from_xlsx | 0.95 | 255.07 |
| _overlay_sheet_layout_from_xlsx | 2.57 | 256.45 |
| _overlay_sheet_cell_metadata_from_xlsx (formats + strings + xf) | 29.31 | 325.62 |
| _promote_covered_formula_errors | 0.19 | 325.62 |
| _overlay_sheet_drawing_image_ids | 0.93 | 325.62 |
| optimize_fods_streaming | 24.27 | 311.25 |
| reoverlay_sheet_xf_indices | 28.88 | 316.01 |
| **Tổng cộng (Python)** | **109.89** | **316.01** |

So với TASK-QUEUE / handoff S29: lan06 1721s → 156s (R1) → 136,4s (R2) → **125,10s** (máy này); lan14 346s → 132s (R1) → 115,5s (R2) → **109,89s**. Không chậm hơn mốc sau tối ưu.

IMPLEMENTATION SUMMARY: Không sửa code nguồn. Profile `E:\VNOffice-profiles\grok`. 12 file lan17–lan28 chạy `_batch_audit.py` foreground từng file, chờ xong rồi sang file tiếp. 14 file lan01–05/07–13/15–16 giữ kết quả TONG 0 phiên trước, xác nhận Excel + lint trên `_rt_` còn lại. lan06/lan14 chỉ đo `_time_sheet_open_stages.py`.
FILES CHANGED: `docs/HANDOFF-SHEET-S29-REGRESSION-CHECK.md` (chỉ file này). Không commit `_audit_*.txt`, `_rt_*.xlsx`, `_batch_audit_report.md`, hay tài liệu trong `file test\`.
COMMANDS RUN:
- `$env:LOCALAPPDATA = "E:\VNOffice-profiles\grok"`
- `python scripts/layout-audit/_batch_audit.py <worktree> lanNN.xlsx` với NN = 17..28 (từng file)
- `python scripts/layout-audit/_time_sheet_open_stages.py file test\lan\lan06.xlsx`
- `python scripts/layout-audit/_time_sheet_open_stages.py file test\lan\lan14.xlsx`
- `_excel_open_test.ps1` + `_xlsx_lint.py` + `_xlsx_parts_lint.py` trên 14 `_rt_lan*.xlsx` phiên trước
BUILD RESULT: Không build (không đổi code).
TEST RESULTS: 26/26 TONG 0, 26/26 Excel OK, 26/26 lint clean. lan06 Python 125,10s. lan14 Python 109,89s.
KNOWN FAILURES: Không. lan06/lan14 roundtrip fidelity **NOT RUN** theo quy ước file lớn.
RISKS: `seconds` của 14 file phiên trước không khôi phục được (stdout batch nền bị giết). Excel COM xác nhận trên `_rt_` còn lại, không phải lần đo wall-clock gốc.
DEPENDENCIES/BLOCKERS: Không. Claude kiểm chứng độc lập rồi merge/ghi nhận.
CORE PATCH ID (if any): Không (chỉ đo).
NEXT ACTION: Claude đọc handoff này, xác nhận mốc "S29 vòng 1–4 an toàn để giữ trên main", merge/ghi nhận nếu đồng ý. Không merge từ agent đo.
