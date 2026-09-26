# TASK BRIEF — Rà soát thiết kế trực quan tab "Chèn" (Insert) — Writer và Sheet (agy)

Worktree: `E:\VNOffice-agy-insert-tab` (nhánh `design/writer-sheet-insert-tab-agy`, tách từ `main`). Chỉ làm trong worktree này.
Việc **UI/thiết kế/trực quan** — KHÔNG sửa logic đo lường/phân trang/công thức (agent khác đang sửa logic ở worktree riêng cùng lúc). Cùng phương pháp như hai đợt trước — đọc `docs/HANDOFF-LAYOUT-TAB-DESIGN.md` VÀ `docs/HANDOFF-HOME-TAB-DESIGN.md` trước để nắm các dạng lỗi đã tìm thấy hai lần (nhãn raw command-id, icon thiếu, item không được `ribbon-host.js` render, dialog vỡ layout, tràn ngang 1440px/1024px, thiếu launcher góc nhóm, thiếu `iconOnly` gây phình to hàng icon).

## Việc cần làm
Tab **Chèn** (Insert) là tab dùng nhiều thứ ba sau Home và Layout (bảng, hình ảnh, biểu đồ, liên kết, đầu/cuối trang, ký hiệu…).

### 1. Screenshot thật + so sánh với Word/Excel 2016 thật
- VN Writer tab Chèn: so với Word 2016 Insert tab (Pages, Tables, Illustrations [Pictures/Shapes/SmartArt/Chart/Screenshot], Add-ins, Media, Links, Comments, Header & Footer, Text [Text Box/Quick Parts/WordArt/Drop Cap/Signature Line/Date & Time/Object], Symbols [Equation/Symbol]).
- VN Sheet tab Chèn: so với Excel 2016 Insert tab (Tables [PivotTable/Table], Illustrations, Add-ins, Charts, Tours, Sparklines, Filters [Slicer/Timeline], Links, Text [Text Box/Header&Footer/WordArt/Signature/Object], Symbols).
- Ghi lại đúng những gì VN Writer/Sheet ĐÃ CÓ trên tab này (không giả định — có thể một số tính năng như SmartArt/3D Models chưa làm, đó không phải lỗi thiết kế, chỉ ghi nhận là chưa có tính năng, không tự thêm nút giả).
- Kiểm tra Command ID thiếu định nghĩa/i18n/icon (như 2 lần trước), item type chưa render trong `ribbon-host.js`, launcher góc nhóm thiếu, tràn ngang ở 1440px và 1024px, nút bị phình do thiếu `iconOnly`.

### 2. Sửa những gì thấy rõ ràng lệch (chỉ CSS/markup/định nghĩa lệnh/i18n/icon-mapping, KHÔNG viết logic xử lý mới)
File liên quan: `apps/writer/writer-ribbon.js`, `apps/writer/writer.css`, `apps/sheet/sheet-ribbon.js`, `apps/sheet/sheet.css`, `platform/commands/command-definitions.js`, `platform/i18n/strings-vi.js`, `platform/i18n/strings-en.js`, `platform/ui-kit/components.js`, `platform/ribbon/ribbon-host.js`, `platform/ribbon/ribbon.css`, `platform/shell/shell.css`.
Nếu hộp thoại nào mở từ tab này (Insert Table, Insert Chart, Header/Footer editor…) có lỗi layout rõ ràng — sửa cùng phương pháp đã dùng (kiểm tra chiều cao input đồng nhất, không đè label lên control).

### 3. Rà soát nút chết (dead buttons)
Liệt kê mọi command ID trên hai tab Chèn, xác nhận có handler thật (dùng `globalCommandBus._handlers` trên môi trường app thật như đã làm 2 lần trước). Không tự thêm handler — chỉ báo cáo nếu có nút chết thật.

### 4. Rà soát nội dung Hướng dẫn sử dụng (Help)
`platform/help/entries-writer.js` và `platform/help/entries-sheet.js` — xác nhận mục mô tả tab Chèn khớp UI thật; cập nhật nếu có sửa UI ở bước 2.

## Test / xác nhận trước khi bàn giao
- `node tests/run-tests.js` phải PASS toàn bộ (đang là 1834/1834 trên `main`).
- Playwright thực tế: kiểm tra không tràn ngang ở 1440px và 1024px, `scrollWidth <= clientWidth`.
- **Không** chạy `python -m unittest` liên quan Word/Excel COM.

## Luật cứng
Không đụng logic đo lường/phân trang trong `adapters/libreoffice/writer/writer-adapter.js`, `adapters/libreoffice/sheet/sheet-adapter.js`, `adapters/libreoffice/common/ooxml_zip_patch.py`, `apps/sheet/sheet-grid.js`, `main.py`, `index.html` — các agent khác đang sửa các file đó cùng lúc ở worktree riêng, đụng vào sẽ xung đột khi merge. Không commit/copy tài liệu Office thật. Không đổi framework UI, không thêm dependency mới. Commit tiền tố `design(ui): …`. Không rebase/force. Không chạy tác vụ ở nền rồi ngồi chờ.

## Bàn giao
`docs/HANDOFF-INSERT-TAB-DESIGN.md`: cùng cấu trúc như hai handoff trước.
