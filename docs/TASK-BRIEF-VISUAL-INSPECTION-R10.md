# Brief V10 — Kiểm tra TRỰC QUAN vòng 10 (agy): Excel/Word thật ↔ VN Sheet/VN Writer, không sửa code

Bối cảnh: bộ đo tự động báo Sheet 26/26 file 0 lệch (main `b417653`), Writer còn ~600 đoạn lệch/24 file. Vòng 17/9 bạn
(agy) đã bắt được 3 lỗi mắt thường mà auditor không thấy (nền xám, mất ô gộp, chữ cụt) → lặp lại phương pháp đó trên
nhiều file hơn. **Chỉ báo cáo, không sửa code** — tôi sẽ gom thành lớp và giao sửa.

## Việc

1. Sheet — 6 workbook: `file test/lan/lan02.xlsx, lan03.xlsx, lan09.xlsx, lan12.xlsx, lan26.xlsx, lan28.xlsx`.
   - Mở + lưu qua app thật: `python scripts/layout-audit/_batch_audit.py . lan02.xlsx lan03.xlsx lan09.xlsx lan12.xlsx lan26.xlsx lan28.xlsx`
     (tạo `_rt_lanNN.xlsx`). Chạy tuần tự, không song song với tiến trình khác dùng soffice/Excel.
   - Với từng sheet có dữ liệu (tối đa 4 sheet/file): chụp Excel 2016 mở file GỐC, Excel mở `_rt_`, và VN Sheet mở
     file gốc (Playwright/Edge như lần trước, `scripts/capture_visual_lan02.mjs`, `scripts/export_excel_sheets_pdf.ps1`).
   - Ghi bảng: file | sheet | vị trí (ô/vùng) | Excel gốc | Excel bản lưu | VN Sheet | mô tả lệch (font, cỡ, màu,
     viền, gộp, ảnh, độ rộng, ẩn/hiện, chữ cụt, tràn ô…). Kèm ảnh cắt (crop) đúng vùng lệch, đặt trong
     `docs/screenshots/` (thư mục này đã gitignore các ảnh file thật — KHÔNG commit ảnh/PDF/HTM của tài liệu thật).
2. Writer — 3 tài liệu: `file test/landocx/d07.docx, d09.docx, d13.docx`.
   - Word 2016 xuất PDF từng trang (`scripts/layout-audit/_word_oracle3.ps1` hoặc COM ExportAsFixedFormat), VN Writer
     mở file và chụp từng trang (canvas). So cạnh nhau trang 1–3 của mỗi file.
   - Ghi bảng: file | trang | đoạn/vị trí | Word | VN Writer | mô tả (ngắt trang, khoảng cách đoạn, font, cỡ, thụt lề,
     bảng, ảnh, số trang).
3. Kết quả: `docs/HANDOFF-VISUAL-INSPECTION-R10.md` — bảng lệch (chỉ số/toạ độ, không tên tài liệu thật ngoài mã
   lanNN/dNN), xếp theo tần suất, và ước lượng "giống Office bao nhiêu %" theo mắt cho từng file. Ghi rõ những gì
   KHÔNG lệch để tôi biết auditor đang đúng ở đâu.

## Ràng buộc

- Không sửa `adapters/`, `apps/`, `scripts/` (chỉ được thêm script chụp mới trong `scripts/visual/` nếu cần).
- Không commit `file test/`, ảnh/PDF render của tài liệu thật. Commit chỉ gồm báo cáo md + script chụp (nếu có).
- Thời gian: ≤ 45 phút; nếu Excel/Word COM bị tranh (tiến trình khác đang dùng), chờ rồi thử lại, không bỏ qua.
