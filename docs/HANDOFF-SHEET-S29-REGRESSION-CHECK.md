# Agent Handoff

TASK: Xác nhận S29 vòng 1–4 (tối ưu Python mở Sheet) không hồi quy trên batch file LAN thật — đo nhập→sửa→lưu→mở Excel COM, không sửa code.
AGENT/ROLE: Grok (đo/xác nhận)
BRANCH: audit/sheet-s29-regression-grok
WORKTREE: E:\VNOffice-grok-sheet-s29-regression
OBJECTIVE: Chạy `_batch_audit.py` trên 26 file (lan01–lan28 trừ lan06/lan14 kích thước lớn), ghi TONG sai lệch + Excel mở + thời gian; đo riêng thời gian mở lan06/lan14 nếu kịp.
FINDINGS: ĐANG CHẠY. Checkpoint sau lan17–lan24. Chưa thấy hồi quy.

## Tiến độ

- Đã đo (không chạy lại): lan01 lan02 lan03 lan04 lan05 lan07 lan08 lan09 lan10 lan11 lan12 lan13 lan15 lan16 — phiên trước, TONG sai lệch 0 (file `_audit_lanNN.txt` ở gốc worktree). Stdout Excel/lint/seconds của 14 file đó mất vì batch nền bị giết giữa lan16.
- Vừa đo phiên này (foreground, từng file): lan17–lan24 — cả 8 TONG 0, Excel mở OK, lint sạch.
- Còn: lan25 lan26 lan27 lan28.
- Chưa đo thời gian mở: lan06, lan14.

## Bảng kết quả

| file | TONG sai lệch | Excel mở | lint | seconds | ghi chú |
|---|---:|---|---|---:|---|
| lan01.xlsx | 0 | (stdout mất) | (stdout mất) | (stdout mất) | phiên trước; `_audit_lan01.txt` TONG 0 |
| lan02.xlsx | 0 | (stdout mất) | (stdout mất) | (stdout mất) | phiên trước |
| lan03.xlsx | 0 | (stdout mất) | (stdout mất) | (stdout mất) | phiên trước |
| lan04.xlsx | 0 | (stdout mất) | (stdout mất) | (stdout mất) | phiên trước |
| lan05.xlsx | 0 | (stdout mất) | (stdout mất) | (stdout mất) | phiên trước |
| lan06.xlsx | NOT RUN | NOT RUN | NOT RUN | NOT RUN | file lớn; đo `_time_sheet_open_stages.py` sau batch |
| lan07.xlsx | 0 | (stdout mất) | (stdout mất) | (stdout mất) | phiên trước |
| lan08.xlsx | 0 | (stdout mất) | (stdout mất) | (stdout mất) | phiên trước |
| lan09.xlsx | 0 | (stdout mất) | (stdout mất) | (stdout mất) | phiên trước |
| lan10.xlsx | 0 | (stdout mất) | (stdout mất) | (stdout mất) | phiên trước |
| lan11.xlsx | 0 | (stdout mất) | (stdout mất) | (stdout mất) | phiên trước |
| lan12.xlsx | 0 | (stdout mất) | (stdout mất) | (stdout mất) | phiên trước |
| lan13.xlsx | 0 | (stdout mất) | (stdout mất) | (stdout mất) | phiên trước |
| lan14.xlsx | NOT RUN | NOT RUN | NOT RUN | NOT RUN | file lớn; đo `_time_sheet_open_stages.py` sau batch |
| lan15.xlsx | 0 | (stdout mất) | (stdout mất) | (stdout mất) | phiên trước |
| lan16.xlsx | 0 | (stdout mất) | (stdout mất) | (stdout mất) | phiên trước |
| lan17.xlsx | 0 | OK sheets=23 | clean | 25.6 | File Hiếu.xlsx |
| lan18.xlsx | 0 | OK sheets=1 | clean | 20.8 | MAT THAN BAO GIA EZVIZ.xlsx |
| lan19.xlsx | 0 | OK sheets=1 | clean | 20.8 | nhà thông minh anh quế.xlsx |
| lan20.xlsx | 0 | OK sheets=1 | clean | 20.9 | Pricelist TPLink_Dealer.xlsx |
| lan21.xlsx | 0 | OK sheets=18 | clean | 20.7 | Template_SoKho_HDDT.xlsx |
| lan22.xlsx | 0 | OK sheets=2 | clean | 37.8 | thiết bị mạng.xlsx |
| lan23.xlsx | 0 | OK sheets=1 | clean | 20.9 | Thuyết minh tài chính  cty 3 t mới- 20240330204732.xlsx |
| lan24.xlsx | 0 | OK sheets=4 | clean | 20.7 | Tính BHXH 1 lần.xlsx |
| lan25.xlsx | NOT RUN | NOT RUN | NOT RUN | NOT RUN | |
| lan26.xlsx | NOT RUN | NOT RUN | NOT RUN | NOT RUN | |
| lan27.xlsx | NOT RUN | NOT RUN | NOT RUN | NOT RUN | |
| lan28.xlsx | NOT RUN | NOT RUN | NOT RUN | NOT RUN | |

IMPLEMENTATION SUMMARY: Không sửa code. Chỉ đo. `$env:LOCALAPPDATA = E:\VNOffice-profiles\grok`. Lệnh: `python scripts/layout-audit/_batch_audit.py <worktree> lanNN.xlsx` từng file, chờ xong rồi sang file tiếp.
FILES CHANGED: `docs/HANDOFF-SHEET-S29-REGRESSION-CHECK.md` (checkpoint tạm).
COMMANDS RUN: `_batch_audit.py` lan17–lan24 (foreground, từng file).
BUILD RESULT: Không build (không đổi code).
TEST RESULTS: 8/8 file mới TONG 0, Excel OK, lint sạch. 14 file phiên trước TONG 0.
KNOWN FAILURES: Chưa có lệch khác 0. 4 file còn lại + lan06/lan14 chưa đo.
RISKS: Excel COM bị tranh nếu agent khác mở Excel. Batch nền phiên trước bị giết nên thiếu seconds/Excel của 14 file đầu.
DEPENDENCIES/BLOCKERS: Không.
CORE PATCH ID (if any): Không (chỉ đo).
NEXT ACTION: Chạy lan25–lan28 foreground từng file; sau đó `_time_sheet_open_stages.py` lan06 và lan14; hoàn thiện handoff PASS/FAIL/NOT RUN.
