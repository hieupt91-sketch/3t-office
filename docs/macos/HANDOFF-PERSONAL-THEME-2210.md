# Handoff — Chủ đề cá tính Mac 2026-10-22

## Phạm vi

- `platform/theme/theme-manager.js`: lưu cục bộ 20 preset gồm 6 bộ màu tương thích thư viện theme mặc định Windows/VN Writer, các phong cách cá tính và nhóm chuyển sắc động (Aurora, Nebula, Gaming neon, Cyber, Nữ tính); màu nhấn tự chọn, nền sáng/tối và preview/restore.
- `platform/shell/app-shell.js`: Tệp → Tùy chọn → Chủ đề cá tính; lựa chọn không gửi tài liệu/hình ảnh lên mạng.
- Hình ảnh cục bộ vẫn dùng mục Khu vực tiêu đề để phủ thanh tiêu đề + toàn bộ phần ribbon (thẻ và nội dung); có cắt vị trí và lớp phủ tối để bảo đảm độ đọc.
- `platform/help/entries-retro-platform.js`: hướng dẫn tiếng Việt cụ thể cho luồng trên.

## Bằng chứng kiểm tra

- `node scripts/check-syntax.js`: PASS 158/158.
- `tests/unit/personal-theme.test.js`: PASS 2/2.
- `tests/unit/header-theme.test.js`: PASS 5/5.
- `npm test`: 3155/3170 PASS, 15 FAIL là các hồi quy môi trường/LibreOffice đã biết (FODS/PPTX overlay, activeTab, startup sweep, JSONL); không có FAIL ở suite chủ đề cá tính.
- Native CDP visual test: NOT RUN/BLOCKED do WebEngine remote debugging endpoint chưa mở; không claim PASS.

## Cách dùng

Mở Doc/Sheet/Slide → Tệp → Tùy chọn → Chủ đề cá tính. Chọn preset hoặc Màu nhấn, chọn Nền sáng/Nền tối, rồi vào Khu vực tiêu đề để chọn màu/hình ảnh. Bấm Đồng ý để lưu trên máy; Hủy/Esc để khôi phục.

## Rollback

Revert commit `bca7dab1` hoặc bấm Mặc định trong Chủ đề cá tính và Đặt lại mặc định trong Khu vực tiêu đề.
