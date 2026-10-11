# Brief R18 (opencode) — Quét hồi quy trên main hiện tại: W30b (bảng khi lưu), 3 kịch bản tạo mới Writer, 2 kịch bản Sheet, 5 file LAN Sheet. CHỈ ĐO

Main `f1d8d43` gộp nhiều sửa nhập Writer trong ngày và S27. Cần một lượt đo "tất cả còn sạch không".

Worktree `E:\VNOffice-opencode-r18` (branch `audit/r18`), `$env:LOCALAPPDATA = "E:\VNOffice-profiles\opencode"`.
Mẫu docx `E:\VN OFice\file test\landocx`, xlsx `file test/lan/` (chép sẵn vào worktree).

1. **W30b**: `python scripts/layout-audit/_batch_writer.py . "E:\VN OFice\file test\landocx" _sb d01.docx d04.docx d13.docx`
   → giải nén gốc vs `_sb/_rt_dNN.docx`: `w:tblW` (w, type) và dãy `w:gridCol` từng bảng cấp 1 — R17 báo d01 đổi
   pct→dxa, gridCol lệch 528 twips; sau W30b phải giữ nguyên (≤ 20 twips). Số trang bản lưu vs Word gốc.
2. **Tạo mới Writer**: `_create_new_writer.py . _new.docx` → `_word_readback.ps1` (36/0); `--scenario 2` → 39/0;
   `--scenario 3` → 49 checks, DIFFS = 27 (baseline V13, không tăng).
3. **Tạo mới Sheet**: `_create_new_sheet.py . _v1.xlsx` → `_excel_readback.ps1` (40/0); `--scenario 2` → 63/0.
4. **LAN Sheet**: `_batch_audit.py . lan02.xlsx lan03.xlsx lan12.xlsx lan26.xlsx lan28.xlsx` → 0 lệch, Excel OK, lint sạch.
5. Gate: `node scripts/check-syntax.js`, `node tests/run-tests.js`, `python -m unittest discover -s tests -p "test_*.py"`.

Handoff `docs/HANDOFF-R18.md`: dán nguyên văn từng kết quả; mục nào lệch → ghi expected/actual. Không sửa code, không
bịa số, không commit `file test`/output, không tên tài liệu thật. Commit handoff (`git commit -F`, tiếng Việt không dấu).
