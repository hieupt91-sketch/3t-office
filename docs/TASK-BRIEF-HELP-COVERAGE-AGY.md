# TASK BRIEF — Rà soát độ phủ Hướng dẫn sử dụng (Help) cho MỌI lệnh Writer + Sheet (agy)

Worktree: `E:\VNOffice-agy-help-coverage` (nhánh `docs/help-coverage-agy`, tách từ `design/sheet-extlink-bar-agy`). Đặt `$env:LOCALAPPDATA = "E:\VNOffice-profiles\agy"` nếu mở app.

## Vì sao
AGENTS.md mục 10: mọi tính năng phải có hướng dẫn tiếng Việt cụ thể trong app, và cần một đợt rà soát bổ sung cho TẤT CẢ tính năng đã có. Hiện `platform/help/entries-writer.js` ~50 bài, `entries-sheet.js` ~55 bài, trong khi ribbon có ~131 lệnh Writer và ~151 lệnh Sheet.

## Việc
1. Viết `scripts/help-coverage.mjs`: liệt kê mọi `commandId` xuất hiện trên ribbon Writer (`apps/writer/writer-ribbon.js`) và Sheet (`apps/sheet/sheet-ribbon.js`) + định nghĩa trong `platform/commands/command-definitions.js`, đối chiếu với `commandIds` của các bài Help; in bảng lệnh CHƯA có bài Help nào nhắc tới, theo tab/nhóm. Commit script + kết quả vào `docs/HELP-COVERAGE.md` TRƯỚC khi viết bài.
2. Viết bài Help còn thiếu, gom theo nhóm ribbon (một bài có thể phủ nhiều lệnh cùng nhóm), đúng định dạng hiện có (`id`, `app`, `commandIds`, `title`, `summary`, `ribbon {tab, tabId, group}`, `keywords`, `steps`). Nội dung PHẢI khớp UI thật: tên tab/nhóm/nút đúng như ribbon đang hiển thị (đọc i18n `platform/i18n/strings-vi.js`), phím tắt đúng như `command-definitions.js`. Không viết chung chung, không hứa tính năng chưa có. Nếu một lệnh trên ribbon không có handler thật (nút chết), KHÔNG viết Help cho nó — ghi vào `docs/HELP-COVERAGE.md` mục "Nút chết cần xử lý".
3. Mục tiêu: 100% lệnh ribbon Writer + Sheet có handler đều được ít nhất một bài Help nhắc tới. Chạy lại script, ghi số trước/sau.
4. Thêm test `tests/unit/help-coverage.test.js` chạy logic của script: fail nếu có lệnh ribbon có handler mà không có bài Help (để tính năng mới sau này buộc phải kèm Help).

## Kiểm chứng
`node tests/run-tests.js` foreground (lưu ý: 4 test soffice Sheet FODS/Pivot/height-width/textRotation có thể FAIL do máy chậm khởi động soffice — ghi BLOCKED môi trường, KHÔNG sửa test, KHÔNG tăng timeout). Test live Help hiện có vẫn PASS. Tìm kiếm Help theo từ khóa tiếng Việt ra đúng bài mới.

## Luật cứng
Chỉ sửa `platform/help/**`, `scripts/help-coverage.mjs`, `docs/HELP-COVERAGE.md`, test mới, `tests/run-tests.js` (đăng ký test). KHÔNG sửa logic, KHÔNG sửa test helper/timeout. KHÔNG chạy tác vụ ở nền rồi ngồi chờ. Commit sau mỗi nhóm bài, tiền tố `docs(help): …`. Không merge vào `main`. Handoff `docs/HANDOFF-HELP-COVERAGE-AGY.md`, PASS/FAIL/NOT RUN/BLOCKED trung thực.