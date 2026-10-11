# Brief S22 — 4 lớp lệch cuối của Sheet sau vòng 9 (19/9/2026, main 59bff83)

Vòng 9: 26 file, Excel mở 26/26, 22 file 0 lệch, còn 5 lệch. Đo lại bằng
`python scripts/layout-audit/_batch_audit.py . lan07.xlsx lan15.xlsx lan23.xlsx lan25.xlsx` rồi đọc `_audit_<file>.txt`.

| File | Lệch | Đã đo | Hướng |
|---|---|---|---|
| lan25 | autoFilter 1: gốc `""`, bản lưu `A1:Z183` | Sửa 90ff339 cho phép bộ lọc bật trong app không có `filterRange` dùng vùng đã dùng (`_usedRangeOfSheet`). Ở lan25 gốc KHÔNG có AutoFilter nhưng `sheetStates[...].isFilterActive` thành true khi mở — tìm chỗ bật (nghi: dòng ẩn `visibility="filter"`/S3 hoặc `_updateFilterButtons`) | Chỉ ghi database-range khi bộ lọc có từ file (`filterRange`) HOẶC người dùng bật trong app (đánh dấu `filterSetByUser` khi `toggleFilter()`); mở file không AutoFilter → không có `<table:database-range>` |
| lan23 | visibility 1: sheet gốc `state="hidden"` → bản lưu hiện | codex S20 `_restore_source_sheet_names_and_states` — kiểm tra vì sao không áp cho file này (tên sheet "Main", chỉ 1 sheet hiện?) | Giữ `state` gốc cho sheet app không đổi trạng thái |
| lan15 | rowHeight dòng 1: 32 → 30 px; freeze `{rows:1}` mất | Sheet có tên `_x0009_`; nghi S20 đối chiếu tên chưa khớp nên `_restore_row_heights`/freeze theo tên sheet không áp | Dùng cùng khoá tên đã chuẩn hoá (`_sheet_name_equivalence_key`) cho MỌI bước hậu xử lý theo tên sheet |
| lan07 | numberFormat 1 ô F22: mã Accounting gốc → `* #,##0 ; …` | Ô này không mang `vno:xf` trong `_rt_lan07.xlsx.sent.fods` (in ra để xác nhận) → tìm vì sao băm style lúc nhập ≠ lúc lưu cho đúng ô này (ô gộp? rich text? ô có comment?) | Sửa gốc băm; không hard-code |

## Yêu cầu / nghiệm thu

- Mỗi lớp: sửa một chỗ + unit test (JS `tests/unit/*.test.js` đăng ký trong `tests/run-tests.js`, hoặc `tests/test_sheet_*.py`);
  quy ước ghi vào `docs/QUY-UOC-DOI-CHIEU.md` (chỉ số, không tên file thật).
- Gate: `python -m unittest discover -s tests -p "test_sheet*.py"`, `node scripts/check-syntax.js`, `node tests/run-tests.js` (1779/1779).
- Đo: 4 file trên → 0 lệch, Excel OK, lint clean; sau đó chạy đủ 26 file (`_batch_audit.py .` không tham số, bỏ lan06/lan14)
  để chắc không lớp nào tăng — dán `_batch_audit_report.md`. Không chạy song song với tiến trình khác dùng soffice profile
  Sheet hay Excel COM. Commit `git commit -F`, tiếng Việt không dấu, không commit `file test`.
