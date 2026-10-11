# TASK BRIEF — Rà soát thiết kế trực quan tab "Trang chủ" (Home) — Writer và Sheet (agy)

Worktree: `E:\VNOffice-agy-home-tab` (nhánh `design/writer-sheet-home-tab-agy`, tách từ `main` @ 209a0fa). Chỉ làm trong worktree này.
Đây là việc **UI/thiết kế/trực quan** — KHÔNG sửa logic đo lường/phân trang/công thức (agent khác đang làm logic ở worktree riêng cùng lúc). Cùng phương pháp và tiêu chuẩn như đợt rà soát tab Bố cục vừa xong (đọc `docs/HANDOFF-LAYOUT-TAB-DESIGN.md` trước để nắm cách làm và các lỗi dạng đã tìm thấy lần trước: nhãn hiện raw command-id, icon thiếu do thiếu keyword resolution, item type không được `ribbon-host.js` render, select bị ép chiều cao trong dialog, tràn ngang ở màn hẹp).

## Việc cần làm
Tab **Trang chủ** (Home) là tab dùng nhiều nhất trong Word/Excel thật — ưu tiên cao hơn các tab khác.

### 1. Screenshot thật + so sánh với Word/Excel 2016 thật
- Mở VN Writer, vào tab Trang chủ, chụp toàn bộ ribbon (font, đoạn văn, kiểu, chỉnh sửa…) ở trạng thái bình thường và khi mở các dropdown (Font, Cỡ chữ, Màu chữ, Highlight, Styles gallery nếu có).
- Mở VN Sheet, vào tab Trang chủ tương ứng, chụp tương tự (Clipboard, Font, Căn chỉnh, Số, Kiểu ô, Ô, Chỉnh sửa).
- So với Word 2016 / Excel 2016 thật cùng tab: vị trí nhóm lệnh, launcher góc dưới mỗi nhóm (mũi tên mở dialog), icon nhất quán, không có 2 nút cùng biểu diễn 1 tính năng.
- Kiểm tra Command ID nào bị thiếu định nghĩa trong `platform/commands/command-definitions.js` / thiếu chuỗi trong `platform/i18n/strings-vi.js` (raw ID hiện ra là dấu hiệu) và thiếu icon trong `resolveIcon` (`platform/ui-kit/components.js`) — đây CHÍNH XÁC là lớp lỗi vừa tìm thấy ở tab Bố cục, rất có thể tab Trang chủ (nhiều lệnh hơn) cũng có sót tương tự.
- Kiểm tra `platform/ribbon/ribbon-host.js`: mọi `item.type` mà layout Home tab dùng có được render không (đợt trước phát hiện `type: "select"` bị bỏ qua ở cấp nhóm).

### 2. Sửa những gì thấy rõ ràng lệch (chỉ CSS/markup/định nghĩa lệnh/i18n/icon-mapping, KHÔNG viết logic xử lý mới)
- File liên quan: `apps/writer/writer-ribbon.js`, `apps/writer/writer.css`, `apps/sheet/sheet-ribbon.js`, `apps/sheet/sheet.css`, `platform/commands/command-definitions.js`, `platform/i18n/strings-vi.js`, `platform/i18n/strings-en.js`, `platform/ui-kit/components.js`, `platform/ribbon/ribbon-host.js`, `platform/shell/shell.css`.
- Nếu có hộp thoại liên quan mở từ tab này (Font dialog, Format Cells / Định dạng ô) — kiểm tra bố cục hộp thoại đó (căn lề, khoảng cách, chiều cao input đồng nhất — lỗi `.vno-select` 24px vs input 34px đã gặp ở Page Setup, kiểm tra có lặp lại ở đây không).
- Kiểm tra responsive ở 1024px (không tràn ngang, không mất nút quan trọng).

### 3. Rà soát nút chết (dead buttons)
Liệt kê MỌI command ID xuất hiện trên hai tab Home, xác nhận từng cái có handler thật kết nối tới logic app (không tự thêm handler mới — nếu tìm thấy nút chết thật sự, chỉ báo cáo trong handoff, không code logic).

### 4. Rà soát nội dung Hướng dẫn sử dụng (Help)
`platform/help/entries-writer.js` và `platform/help/entries-sheet.js` — xác nhận các mục mô tả tab Trang chủ khớp đúng UI thật hiện tại; cập nhật nếu có sửa UI ở bước 2.

## Test / xác nhận trước khi bàn giao
- `node tests/run-tests.js` phải vẫn PASS toàn bộ.
- Chụp ảnh trước/sau các sửa CSS để tự so sánh không vỡ layout ở màn rộng lẫn hẹp.
- **Không** chạy `python -m unittest` liên quan Word/Excel COM — không cần cho việc này.

## Luật cứng
- Không đụng logic đo lường/phân trang trong `adapters/libreoffice/writer/writer-adapter.js`, `adapters/libreoffice/sheet/sheet-adapter.js`, `adapters/libreoffice/common/ooxml_zip_patch.py` — hai agent khác đang sửa logic đó cùng lúc ở worktree riêng.
- Không commit/copy tài liệu Office thật hay ảnh chụp nội dung tài liệu thật; ảnh UI thuần có thể lưu tạm ngoài git.
- Không đổi framework UI, không thêm dependency mới. Commit tiền tố `design(ui): …`. Không rebase/force.
- **Không chạy tác vụ ở nền rồi ngồi chờ** — mọi lệnh chạy foreground, đọc kết quả ngay rồi làm bước tiếp.

## Bàn giao
`docs/HANDOFF-HOME-TAB-DESIGN.md`: cùng cấu trúc như `HANDOFF-LAYOUT-TAB-DESIGN.md` (bảng vấn đề/trạng thái/nguyên nhân/giải pháp, rà soát nút chết, rà soát Help, danh mục file thay đổi, kết quả test).
