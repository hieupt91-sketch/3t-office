# Brief S27 (codex) — Chạy lại toàn bộ 28 file LAN Sheet trên main mới (sau S25/S26) kể cả 2 file lớn lan06/lan14; sửa lớp lệch nếu có

Main `5a1f486` đã gộp S25 (render vòng 10) và S26 (tạo mới kịch bản 2). Vòng 9 + S22/S23: 26/26 file 0 lệch (trừ lan06,
lan14 chưa chạy lại vì lớn — lan09 FODS 233 MB đã xử lý bằng S8 một lượt). Cần xác nhận không hồi quy trên **toàn bộ**
28 file và đo 2 file lớn.

## Việc

1. Worktree `E:\VNOffice-codex-sheet-s27` (branch `audit/sheet-s27-full`, tách từ main). Mẫu `file test/lan/lanNN.xlsx`
   (đã chép sẵn, ngoài git). `$env:LOCALAPPDATA = "E:\VNOffice-profiles\codex"` trước khi chạy python (cùng phiên).
2. `python scripts/layout-audit/_batch_audit.py .` (không tham số = tất cả `lan*.xlsx`, tuần tự) — đo thời gian từng
   file (ghi `Get-Date` trước/sau hoặc thêm cột `seconds` vào report — chỉ THÊM cột). Với lan06/lan14: nếu quá 20 phút
   một file → dừng, dùng `python scripts/layout-audit/_time_sheet_save_stages.py . <x.sent.fods> <src.xlsx> <out.xlsx>`
   để đo từng bước và tìm bước chậm (S8 đã từng quadratic 233 MB → 15 s).
3. `python scripts/layout-audit/_sheet_matrix.py .` → `_sheet_matrix.md`. Mọi file phải: `total 0`, Excel `OK`, lint
   `clean`. File nào lệch → gom lớp theo `_audit_lanNN.txt` (loại × mẫu lặp), tìm gốc (FODS app gửi / LibreOffice đổi /
   hậu xử lý), sửa MỘT chỗ theo quy ước S8–S26, unit test, quy ước **S27a…** vào QUY-UOC, chạy lại cả batch.
4. Handoff `docs/HANDOFF-SHEET-S27.md`: bảng `_batch_audit_report.md` nguyên văn (28 dòng, có thời gian), lớp lệch
   (nếu có) và sửa, gate.

## Ràng buộc

Không đổi định nghĩa auditor (`scripts/audit-sheet-import.mjs`), không đổi mặc định toàn cục, không bịa số, không
commit `file test`/`_rt_*`/`_audit_*`, không tên tài liệu thật. Gate: `node scripts/check-syntax.js`,
`node tests/run-tests.js` (main 1799/1799), `python -m unittest discover -s tests -p "test_sheet*.py"`. Commit
`git commit -F`, tiếng Việt không dấu. Hết hạn mức: commit phần xong + ghi rõ.
