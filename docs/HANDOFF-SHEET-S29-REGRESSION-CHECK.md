# Agent Handoff

TASK: Xác nhận S29 vòng 1–4 (tối ưu Python mở Sheet) không hồi quy trên batch file LAN thật — đo nhập→sửa→lưu→mở Excel COM, không sửa code.
AGENT/ROLE: Grok (đo/xác nhận)
BRANCH: audit/sheet-s29-regression-grok
WORKTREE: E:\VNOffice-grok-sheet-s29-regression
OBJECTIVE: Chạy `_batch_audit.py` trên 26 file (lan01–lan28 trừ lan06/lan14 kích thước lớn), ghi TONG sai lệch + Excel mở + thời gian; đo riêng thời gian mở lan06/lan14 nếu kịp.
FINDINGS: ĐANG CHẠY. Checkpoint sau lan17–lan28 (12/12 TONG 0). Chưa thấy hồi quy. Còn đo thời gian mở lan06/lan14.

## Tiến độ

- Đã đo (không chạy lại): lan01 lan02 lan03 lan04 lan05 lan07 lan08 lan09 lan10 lan11 lan12 lan13 lan15 lan16 — phiên trước, TONG sai lệch 0 (file `_audit_lanNN.txt` ở gốc worktree). Stdout Excel/lint/seconds của 14 file đó mất vì batch nền bị giết giữa lan16.
- Vừa đo phiên này (foreground, từng file): lan17–lan28 — cả 12 TONG 0, Excel mở OK, lint sạch.
- Còn: đo `_time_sheet_open_stages.py` lan06 và lan14.

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
| lan25.xlsx | 0 | OK sheets=1 | clean | 24.2 | tồn kho 3t.xlsx |
| lan26.xlsx | 0 | OK sheets=6 | clean | 42.7 | TỔNG HỢP BÁO GIÁ KHÓA CỬA (NIÊM YẾT+ ĐẠI LÝ) 2024( Anh thạo ).xlsx |
| lan27.xlsx | 0 | OK sheets=1 | clean | 21.2 | TỔNG HỢP XUẤT NHẬP TỒN VẬT TƯ HÀNG HÓA.xlsx |
| lan28.xlsx | 0 | OK sheets=12 | clean | 25.9 | xét lương công ty.xlsx |

IMPLEMENTATION SUMMARY: Không sửa code. Chỉ đo. `$env:LOCALAPPDATA = E:\VNOffice-profiles\grok`. Lệnh: `python scripts/layout-audit/_batch_audit.py <worktree> lanNN.xlsx` từng file, chờ xong rồi sang file tiếp.
FILES CHANGED: `docs/HANDOFF-SHEET-S29-REGRESSION-CHECK.md` (checkpoint tạm).
COMMANDS RUN: `_batch_audit.py` lan17–lan28 (foreground, từng file).
BUILD RESULT: Không build (không đổi code).
TEST RESULTS: 12/12 file mới TONG 0, Excel mở OK, lint sạch. 14 file phiên trước TONG 0. Tổng 26/26 file batch TONG 0 (lan06/lan14 không chạy roundtrip).
KNOWN FAILURES: Không có lệch khác 0. lan06/lan14 thời gian mở chưa đo.
RISKS: Excel COM bị tranh nếu agent khác mở Excel. Batch nền phiên trước bị giết nên thiếu seconds/Excel của 14 file đầu.
DEPENDENCIES/BLOCKERS: Không.
CORE PATCH ID (if any): Không (chỉ đo).
NEXT ACTION: `_time_sheet_open_stages.py` lan06 rồi lan14 (foreground, mỗi file một lần); hoàn thiện handoff PASS/FAIL/NOT RUN.
