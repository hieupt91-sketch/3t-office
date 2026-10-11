# Agent Handoff

TASK: Writer Home ribbon Editing group
AGENT/ROLE: agy (Antigravity) / Writer owner
BRANCH: `feature/writer-editing-group`
WORKTREE: `E:\VNOffice-agy-writer-editing-group`
OBJECTIVE: Thêm đường bấm trực quan cho Find, Replace và Select All ở cuối tab Home của VN Writer mà không thay đổi logic chỉnh sửa hiện hữu.
FINDINGS:
- `common.edit.find`, `common.edit.replace` và `common.edit.selectAll` đã được khai báo trong `platform/commands/command-definitions.js`.
- Writer adapter đã xử lý cả ba command qua dispatch hiện hữu; không cần và không được sửa adapter.
- Không có command Select Objects hiện hữu, nên dropdown Chọn chỉ chứa Chọn tất cả.
IMPLEMENTATION SUMMARY:
- Thêm nhóm `editing` / `Chỉnh sửa` ở cuối Writer Home.
- Dùng lại hai command button Find/Replace và một dropdown Chọn gọi `common.edit.selectAll`.
- Không thêm CSS: cấu trúc column hiện hữu đủ gọn và đo thực tế không có overflow.
- Thêm live Playwright test chạy Edge headless, kiểm tra render, click-command, handler cũ và kích thước ribbon.
FILES CHANGED:
- `apps/writer/writer-ribbon.js`
- `tests/live/writer-editing-group.playwright.mjs`
- `docs/HANDOFF-WRITER-EDITING-GROUP.md`
COMMANDS RUN:
- `node --check apps/writer/writer-ribbon.js`
- `node --check tests/live/writer-editing-group.playwright.mjs`
- `node tests/live/writer-editing-group.playwright.mjs`
- `node tests/run-tests.js`
- `git diff --check`
BUILD RESULT: NOT RUN — dự án không khai báo build script; syntax checks và full test suite đã chạy.
TEST RESULTS:
- PASS — live Playwright: 18 kiểm tra, gồm nút Find/Replace/Select, exact command IDs, direct `globalCommandBus.execute()`, dropdown Select All và không có pageerror.
- PASS — Writer Home 1366px: `scrollWidth=1366`, `clientWidth=1366`.
- PASS — Writer Home 1600px: `scrollWidth=1600`, `clientWidth=1600`.
- PASS — full suite: `849/849 PASS`, `0 FAIL`, `51.504s`.
KNOWN FAILURES: Không có.
RISKS: Select Objects chưa được hiển thị vì codebase chưa có command/handler tương ứng; không tạo command giả ngoài scope.
DEPENDENCIES/BLOCKERS: Không có.
CORE PATCH ID (if any): N/A — không sửa Core hoặc `adapters/libreoffice/**`.
NEXT ACTION: Review/cherry-pick branch khi phù hợp; không merge vào `main` trong task này.
