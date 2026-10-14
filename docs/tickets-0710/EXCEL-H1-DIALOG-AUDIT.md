# EXCEL-H1 — Rà soát từng hộp thoại Sheet (từng tab, ô nhập, nút)

**Bối cảnh (chủ dự án 13/10):** rà từng tính năng một, không gộp; UI có mà chưa có chức năng là thiếu sót chính. Vòng ribbon đã xong (`docs/AUDIT-SHEET-RIBBON-COMMANDS-1310.md`). Vòng này: bên trong hộp thoại.

**Phạm vi mỗi phiếu = 1 hộp thoại** (làm lần lượt, mỗi hộp thoại 1 commit):
Định dạng ô (Số/Căn chỉnh/Phông/Viền/Tô/Bảo vệ), Page Setup (Trang/Lề/Đầu-chân/Sheet), Định dạng có điều kiện, Kiểm tra dữ liệu, Sắp xếp tùy chỉnh, Tìm & thay thế, Dán đặc biệt, Chèn hàm, Quản lý tên, Subtotal, Consolidate, Goal Seek, Data Table, Scenario, PivotTable (field list + tùy chọn), Format Chart, Hyperlink, Protect Sheet/Workbook.

**Việc cho mỗi hộp thoại:**
1. Liệt kê mọi control (tab, checkbox, ô nhập, nút, danh sách) thành bảng: control | làm gì trong Excel 2016 | đã nối chức năng thật? | kiểm bằng cách nào.
2. Control chưa nối: nối chức năng thật (không chỉ ẩn/giả vờ), hoặc nếu quá lớn thì thông báo rõ + ghi `docs/RIBBON-BACKLOG.md`; cấm nút im lặng.
3. Mỗi control: 1 kiểm tra CDP trên app desktop (không SendKeys), đặt giá trị → áp dụng → lưu XLSX → mở lại → Excel 2016 COM đọc cùng giá trị.
4. Hướng dẫn tiếng Việt cập nhật trong `platform/help/entries-sheet.js` (không dùng tên hãng).

**Cổng trước khi báo xong:** `npm test` 100%; `tests/live/cdp/sheet-ribbon-runtime-audit.desktop.mjs` không có NO_HANDLER/THREW; nếu đụng lưu/nhập: batch LAN (lan01 02 04 06 09 11 22 26 13 19) 0 diff và `sheet_formulas_vs_cache.mjs` lan28 ≥98,18%.

**Báo cáo:** 3 dòng/hộp thoại: số control, số đã nối trước/sau, số đã xác nhận bằng Excel 2016.
