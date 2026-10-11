# Handoff — UI Audit Toolbar & Shortcuts

TASK: Rà soát và sửa toolbar/ribbon, shortcut và icon của VN Writer, VN Sheet, VN Slides  
AGENT/ROLE: Codex — implementation + QA  
BRANCH: `fix/ui-audit-toolbar-shortcuts`  
WORKTREE: `E:\VNOffice-codex-ui-audit`  
OBJECTIVE: Xác minh command hiện hữu có handler thật, shortcut không bị ghi đè xuyên app, Undo/Redo vẫn đúng sau chuyển app và ribbon không dùng icon chấm tròn generic.

## Findings và fixes

| STT | Command ID | App | Loại lỗi | Đã sửa hay chưa | Cách xác minh |
|---:|---|---|---|---|---|
| 1 | `writer.text.bold` / `writer.text.italic` / `writer.text.underline` | Writer | Shortcut bị các command Sheet đăng ký sau ghi đè trong `ShortcutManager._shortcuts`; bấm Ctrl+B/I/U ở Writer dispatch sang `sheet.cell.*` | Đã sửa | `node scripts/audit-shortcuts.mjs`; Playwright bấm Ctrl+B thật ở VI/EN và kiểm tra history là `writer.text.bold` |
| 2 | `writer.para.indentInc` | Writer | Ctrl+M bị `slides.slide.new` đăng ký sau ghi đè; ở Writer có thể thêm slide command thay vì thụt lề | Đã sửa | Playwright Writer→Sheet→Slides→Writer, bấm Ctrl+M thật và kiểm tra command cuối là `writer.para.indentInc` |
| 3 | `sheet.cell.bold` / `sheet.cell.italic` / `sheet.cell.underline` | Sheet | Cùng tổ hợp với Writer nhưng Map toàn suite không có khái niệm app active | Đã sửa | Scope `sheet` được kích hoạt khi `SheetApp.init()`; Playwright xác nhận Ctrl+B dispatch `sheet.cell.bold` |
| 4 | `slides.slide.new` | Slides | Ctrl+M xung đột có chủ ý với Writer nhưng trước đây được giải quyết bằng thứ tự đăng ký, khiến Writer mất shortcut | Đã sửa | Scope `slides`; Playwright xác nhận Ctrl+M tăng thumbnail thật, Ctrl+Z giảm và Ctrl+Y khôi phục |
| 5 | `common.edit.undo` / `common.edit.redo` | Cả 3 app | Lỗi lịch sử đã biết cần tái xác nhận sau chuyển app | Không phát hiện hồi quy; không cần sửa handler | Playwright keyboard thật ở VI/EN: Writer thay nội dung DOM, Sheet thay dữ liệu A2, Slides thay số slide; tất cả Undo/Redo đối xứng |
| 6 | Toàn bộ command ribbon có icon | Cả 3 app | Nguy cơ fallback SVG chấm tròn generic | Không phát hiện icon generic | Playwright mở lần lượt mọi tab ở cả VI/EN, quét mọi `[data-command-id]`; không có SVG fallback `circle cx=12 cy=12 r=4` |

## Danh mục shortcut đã audit

- Common (23): `common.file.new`, `common.file.open`, `common.file.save`, `common.file.saveAs`, `common.file.print`, `common.file.close`, `common.edit.undo`, `common.edit.redo`, `common.edit.cut`, `common.edit.copy`, `common.edit.paste`, `common.edit.pastePlain`, `common.edit.formatPainter`, `common.edit.selectAll`, `common.edit.find`, `common.edit.replace`, `common.edit.hyperlink`, `common.view.ribbonToggle`, `common.view.zoomIn`, `common.view.zoomOut`, `common.view.fullScreen`, `ai.assistant.toggle`, `ai.assistant.grammarCheck`.
- Writer (23): `writer.text.bold`, `writer.text.italic`, `writer.text.underline`, `writer.font.grow`, `writer.font.shrink`, `writer.text.subscript`, `writer.text.superscript`, `writer.text.clearFormat`, `writer.para.alignLeft`, `writer.para.alignCenter`, `writer.para.alignRight`, `writer.para.justify`, `writer.para.spacing1`, `writer.para.spacing15`, `writer.para.spacing2`, `writer.para.indentInc`, `writer.para.indentDec`, `writer.page.break`, `writer.comment.insert`, `writer.trackChanges.toggle`, `writer.file.printPreview`, `writer.reference.footnoteInsert`, `writer.reference.endnoteInsert`.
- Sheet (12): `sheet.cell.edit`, `sheet.cell.bold`, `sheet.cell.italic`, `sheet.cell.underline`, `sheet.format.currencyVND`, `sheet.format.percent`, `sheet.format.standard`, `sheet.insert.date`, `sheet.formula.sum`, `sheet.formula.arrayEnter`, `sheet.data.filter`, `sheet.row.insert`.
- Slides (6): `slides.slide.new`, `slides.slide.duplicate`, `slides.slide.delete`, `slides.show.startFromBegin`, `slides.show.startFromCurrent`, `slides.show.presenterMode`.

Tất cả 64 shortcut có đường xử lý thật: command mapped qua UNO bridge tới `handleDispatch`, hoặc được `bindHandler()` trực tiếp ở AppShell/adapter. Danh sách thiếu handler thật: **không có**. Script audit dùng đúng `registerAllStandardCommands()` và kiểm tra Map runtime theo scope app active, không chỉ so sánh chuỗi định nghĩa.

## Implementation summary

- Shortcut được lưu theo scope `common`, `writer`, `sheet`, `slides`; Map hoạt động được dựng lại từ Common + app active.
- Mỗi app kích hoạt scope ngay trong `init()`, nên chuyển app nhiều lần không phụ thuộc thứ tự đăng ký ban đầu.
- Thêm script audit độc lập và test suite chống hồi quy runtime.
- Không phát hiện pattern inject DOM thủ công nào khác ngoài Style Gallery đã có `MutationObserver`; không sửa thêm.
- Không sửa `apps/writer/citations.js`, không sửa Core, không thêm dependency vào repo.

FILES CHANGED: `platform/commands/shortcut-manager.js`, `platform/commands/command-definitions.js`, ba app entrypoint, `scripts/audit-shortcuts.mjs`, `tests/unit/shortcut-scope.test.js`, `tests/live/ui-shortcuts.playwright.mjs`, `tests/run-tests.js`, tài liệu này.  
COMMANDS RUN: `node scripts/audit-shortcuts.mjs`; HTTP server tại cổng 8765; Playwright/Edge live test; `node tests/run-tests.js`.  
BUILD RESULT: Không có build step; syntax check toàn codebase PASS trong suite.  
TEST RESULTS: PASS — `411/411`; Playwright live PASS `20/20` (10 kiểm tra × 2 locale).  
KNOWN FAILURES: Không.  
RISKS: Live Playwright dùng `playwright-core` cài tạm ngoài repo và Edge hệ thống; test live không chạy tự động trong master runner.  
DEPENDENCIES/BLOCKERS: Không.  
CORE PATCH ID: Không áp dụng.  
NEXT ACTION: Claude review commit trên branch; không merge tự động.
