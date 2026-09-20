# Brief V11 — Kiểm tra TRỰC QUAN vòng 11 (agy): sau S25/S26/S27a (Sheet) và W10b/W12e/W21–W26 (Writer). Không sửa code

Vòng 10 (`docs/HANDOFF-VISUAL-INSPECTION-R10.md`) bắt 9 lớp L1–L9; đã sửa: L1–L5, L9 (S25, opencode), L6/L8 (W21, agy).
Vòng này: (1) xác nhận 9 lớp đó đã hết trên đúng file/vị trí cũ, (2) tìm lớp MỚI trên file chưa soi.

Worktree `E:\VNOffice-agy-visual-r11` (branch `audit/visual-r11`). `$env:LOCALAPPDATA = "E:\VNOffice-profiles\agy"` trước
khi chạy python/app (profile riêng; Excel/Word COM: `Visible=false`, luôn `Quit`).

## Việc

1. **Sheet — xác nhận L1–L5, L9** trên lan02/lan12/lan26/lan28 (vị trí trong handoff R10): chụp lại đúng vùng, ghi
   "hết / còn / đổi dạng". Rồi **6 workbook mới**: `file test/lan/lan04.xlsx, lan07.xlsx, lan08.xlsx, lan10.xlsx,
   lan13.xlsx, lan16.xlsx` — `python scripts/layout-audit/_batch_audit.py . lan04.xlsx lan07.xlsx lan08.xlsx lan10.xlsx lan13.xlsx lan16.xlsx`
   (tạo `_rt_`), mỗi file tối đa 4 sheet: Excel gốc ↔ Excel `_rt_` ↔ VN Sheet (như R10:
   `scripts/capture_visual_lan02.mjs`, `scripts/export_excel_sheets_pdf.ps1`, `export_excel_to_html.ps1`). Bảng: file |
   sheet | ô/vùng | Excel gốc | Excel bản lưu | VN Sheet | mô tả (font/cỡ/màu/viền/gộp/ảnh/độ rộng/ẩn/chữ cụt/tràn/
   số định dạng/ngày/đóng băng/lọc).
2. **Writer — xác nhận L6 (d13 chồng chữ), L8 (d09 bullet)** rồi **4 tài liệu mới**: `file test/landocx/d02.docx,
   d11.docx, d16.docx, d20.docx` — Word PDF từng trang (`_word_oracle3.ps1`/ExportAsFixedFormat) ↔ VN Writer chụp
   trang (canvas). So trang 1–3 mỗi file: ngắt trang, khoảng cách đoạn, font/cỡ, thụt lề danh sách (W10b), header/
   footer (W23), đoạn rỗng (W26), bảng, ảnh, số trang.
3. `docs/HANDOFF-VISUAL-INSPECTION-R11.md`: bảng lệch theo tần suất (chỉ mã lanNN/dNN + toạ độ), lớp mới đặt tên
   L10, L11…, ước lượng "giống Office %" theo mắt từng file, và phần "đã hết" cho L1–L9. Ảnh cắt đặt
   `docs/screenshots/r11/` (gitignore chặn `*lanNN*`, `*dNN_*` — KHÔNG commit ảnh/PDF/HTM tài liệu thật; kiểm
   `git status` trước khi commit).

## Ràng buộc

Không sửa `adapters/`, `apps/`, `scripts/layout-audit/` (chỉ thêm script chụp trong `scripts/visual/`). Không bịa: mỗi
dòng lệch phải có ảnh cắt tương ứng đã xem. Commit chỉ md + script chụp (`git commit -F`, tiếng Việt không dấu).
