# Brief V12 — Kiểm tra TRỰC QUAN vòng 12 (agy): sau S28 (Sheet) và W24a/W26/W29a/W30/W31 (Writer). Không sửa code

Vòng 11 (`docs/HANDOFF-VISUAL-INSPECTION-R11.md`): còn L2/L3/L5/L7/L10/L11/L12/L13. Từ đó: S28a–e (L5/L2/L3/L10/L11),
W29a (L13), W24a (cắt trang trong bảng/danh sách), W30/W31 (bề rộng bảng, giãn dòng mặc định), W26 (đoạn rỗng).

Worktree `E:\VNOffice-agy-visual-r12` (branch `audit/visual-r12`), `$env:LOCALAPPDATA = "E:\VNOffice-profiles\agy"`,
Excel/Word COM `Visible=false` + `Quit`. Mẫu + script chụp như R11 (`scripts/visual/capture_r11.mjs`…).

## Việc

1. **Sheet — xác nhận S28** đúng vị trí R11: lan02 s2 A10:B13 (vàng CF) & s1 A4/A7/A19 (tràn chữ), lan03 s1 hàng 1,
   lan12 s1 hàng 1–3, lan16 s4 hàng 1–3 & s2 banner, lan10 s2 A10:A30 (ảnh). Ghi "hết / còn / đổi dạng" + ảnh cắt.
   Soi thêm **4 workbook mới**: lan05, lan15, lan17, lan21 (tối đa 4 sheet/file), cùng cách so 3 chiều.
2. **Writer — sau cắt trang trong bảng/danh sách**: d01 (bảng 64 hàng qua nhiều trang: dải ngắt trang có nằm đúng
   giữa hai hàng, viền/nền bảng có vỡ ở chỗ ngắt không?), d04 (bảng ảnh sản phẩm, 5 trang), d07 (danh sách qua trang),
   d09, d15, d20: Word PDF ↔ VN Writer từng trang (trang 1–4). Ghi cả lỗi THẨM MỸ của gap trong bảng (dải xám cắt
   ngang bảng có chấp nhận được?), L12 d20 còn không, L13 placeholder còn đè không (d02 trang 1).
3. `docs/HANDOFF-VISUAL-INSPECTION-R12.md`: phần "đã hết" (L1–L13 với trạng thái), bảng lệch mới (L14…), ước lượng
   giống Office % từng file, ảnh cắt `docs/screenshots/r12/` (KHÔNG commit ảnh/PDF/HTM tài liệu thật; `git status` trước
   khi commit). Không sửa code; commit md + script chụp (`git commit -F`, tiếng Việt không dấu).
