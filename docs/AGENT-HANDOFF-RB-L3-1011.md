# Agent Handoff

TASK: RB-L3 — hoàn tất kiểm tra chức năng Slides và các mục NOT RUN còn lại của RB-L2
AGENT/ROLE: Codex / audit desktop, sửa lỗi nhỏ đã tái hiện
BRANCH: `audit/slides-functional-3-codex`
WORKTREE: `E:\VNOffice-codex-rl3`
OBJECTIVE: Kiểm bằng thao tác desktop mouse/keyboard, lưu PPTX thật, đọc OOXML và mở lại đúng file; sửa lỗi nhỏ trong phạm vi; cập nhật audit/backlog.
FINDINGS: Font family, 32 pt, line spacing 1.5, B/I/U/strike, màu chữ/nền, căn lề, bullet/numbering roundtrip thành công sau sửa đồng bộ shape rich-text. Section, slide ẩn, sắp xếp thumbnail qua Ctrl+Shift+Up/Down, bảng và ký hiệu © giữ sau roundtrip. U-L24: không có tab Định dạng Hình. U-L35: header/footer/ngày/slide number không giữ trong PPTX. U-L36: audio/video không được đóng gói đúng; audio mất sau reopen. U-L37: trạng thái resolved comment mất và chưa có reply UI. U-L38: panel ghi chú bị status bar che, chưa nhập/lưu được. Chi tiết trong `docs/AUDIT-SLIDES-FUNCTIONAL-1010.md`.
IMPLEMENTATION SUMMARY: `SlidesAdapter._applyFontSizePt` và `_setLineHeight` đồng bộ rich-text shape sau khi sửa DOM; line spacing tạo wrapper block nếu cần. Thêm kiểm tra unit cho hai luồng sync. Không gửi tài liệu ra AI/cloud.
FILES CHANGED: `adapters/libreoffice/slides/slides-adapter.js`; `tests/unit/slides-font-paragraph.test.js`; `docs/AUDIT-SLIDES-FUNCTIONAL-1010.md`; `docs/UI-TEST-SLIDES-1010.md`; `docs/RIBBON-BACKLOG.md`; handoff này.
COMMANDS RUN: Desktop CDP qua `tests/live/cdp/session.mjs`, `VNO_CDP_LOCALAPPDATA=E:\VNOffice-profiles\codex-rl3`, cổng riêng động cho mỗi phiên. `npm test`; `python -m unittest discover -s tests`; `git diff --check` (sau lượt kiểm tra cuối).
BUILD RESULT: NOT RUN — không có thay đổi build system.
TEST RESULTS: PASS — `npm test`, 3042/3042, 0 lỗi; `python -m unittest discover -s tests`, 824 tests / OK (470.217 giây). Có ResourceWarning cho hai file handle chưa đóng, không có test failure. `git diff --check` PASS.
KNOWN FAILURES: U-L24, U-L35–U-L38 nêu trên. Cỡ chữ native select được điều khiển bằng change event sau khi popup native không nhận thao tác bàn phím CDP; giá trị lưu/reopen được xác minh. Mẫu video dummy chỉ dùng để kiểm tra chọn file/đường dẫn, không xác nhận playback.
RISKS: Các trường hợp biên xóa slide cuối, toàn bộ biến thể layout, z-order roundtrip và một số tab đã có PASS/NOT RUN riêng ở bảng audit; ticket này không tuyên bố đã kiểm exhaustive mọi biến thể. Hướng dẫn sử dụng trong app không đổi vì đây là audit/sửa lỗi kỹ thuật, không thêm tính năng.
DEPENDENCIES/BLOCKERS: Không.
COMMITS: Sẽ ghi hash sau khi commit từng nhóm theo ticket.
