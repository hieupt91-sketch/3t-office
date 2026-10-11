# Brief S30d-batch (opencode) — Chạy lại batch lưu Sheet 26 file lan sau S30c/S30d. CHỈ ĐO

Worktree `E:\VNOffice-opencode-sheet-s30d` (branch `audit/sheet-s30d-batch`), `$env:LOCALAPPDATA = "E:\VNOffice-profiles\opencode"`.
KHÔNG chạy `_sheet_geometry_audit.py`/`_excel_geometry.ps1` (Excel COM đang được người khác dùng).

```
$env:LOCALAPPDATA = "E:\VNOffice-profiles\opencode"
python scripts/layout-audit/_batch_audit.py . lan01.xlsx lan02.xlsx lan03.xlsx lan04.xlsx lan05.xlsx lan07.xlsx lan08.xlsx lan09.xlsx lan10.xlsx lan11.xlsx lan12.xlsx lan13.xlsx lan15.xlsx lan16.xlsx lan17.xlsx lan18.xlsx lan19.xlsx lan20.xlsx lan21.xlsx lan22.xlsx lan23.xlsx lan24.xlsx lan25.xlsx lan26.xlsx lan27.xlsx lan28.xlsx
```
(một lệnh, chạy tuần tự ~25 phút; bỏ lan06/lan14). Kết quả `_batch_audit_report.md` trong worktree.

Handoff `docs/HANDOFF-SHEET-S30D-BATCH.md`: bảng file × (total lệch, excel mở OK?, số sheet, giây); với file total > 0
chạy `node scripts/audit-sheet-import.mjs --xlsx-vs-xlsx "file test\lan\lanNN.xlsx" _rt_lanNN.xlsx` và chép nguyên
các dòng `kind: N` + 3 dòng `{...}` đầu của từng kind. Không bịa số; không sửa code; không commit `file test`,
`_rt_*.xlsx`, `_batch_audit_report.md`; không tên tài liệu thật (chỉ lanNN). Commit md (`git commit -F`, tiếng Việt không dấu).
