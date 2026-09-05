# Agent Handoff

TASK: Nối kiểm tra chính tả tiếng Việt có sẵn vào VN Sheet (tab Xem xét / F7)

AGENT/ROLE: Grok / Sheet

BRANCH: `feature/sheet-spellcheck-vi`

WORKTREE: `E:\VNOffice-grok-sheet-spellcheck`

KHÔNG MERGE VÀO MAIN.

OBJECTIVE: Wiring `VietnameseSpellChecker` (Shared Platform, đã dùng cho Writer và Slides) vào VN Sheet. Không viết lại từ điển. Không sửa `platform/text/vi-spellchecker.js` hay `platform/text/spellcheck-dom-controller.js`. Không đụng Writer/Slides.

## Phương án đã chọn

**Dialog quét toàn trang tính khi bấm Chính tả / F7** — không gạch chân realtime từng ô.

Lý do:

1. VN Writer/Slides gắn `SpellcheckDomController` vì chúng có `contenteditable` liên tục. VN Sheet là lưới ô (`td` + thanh công thức), không phải vùng gõ liên tục. Bọc token bằng span marker sẽ phá render số, công thức, selection và virtual scroll.
2. Excel thật cũng không gạch chân realtime từng ô. F7 mở hộp thoại Spelling, quét các ô văn bản, Bỏ qua / Thay thế / Thêm vào từ điển.
3. `VietnameseSpellChecker.checkText(text)` đã nhận một chuỗi và trả token sai kèm offset — đủ để quét từng ô TEXT mà không cần DOM controller.
4. Tái sử dụng đúng lớp từ điển/logic; không viết checker mới.

Excel-like: ô số, ô công thức (kể cả khi kết quả là chữ), ô không có chữ cái (tiền tệ, ngày thuần số) bị bỏ qua.

## Findings (Writer / Slides trước khi code)

- Writer: `apps/writer/writer-app.js` tạo `VietnameseSpellChecker` + `SpellcheckDomController` trên header/body/footer contenteditable; tắt spellcheck trình duyệt.
- Slides: `apps/slides/slides-canvas.js` cùng pattern, rebind roots sau mỗi lần render shape/chuyển slide, `destroy()` trước khi attach lại.
- Platform: tokenizer NFC, membership, Levenshtein, ignore theo phiên, từ điển cá nhân `vno-spellcheck-vi-personal`.
- Tab Xem xét của Sheet trước task này chỉ có `sheet.review.commentInsert`.

## Implementation summary

- Nút **Chính tả** nhóm **Chứng minh** trên tab **Xem xét**.
- `sheet.review.spellCheck` → `SheetGridController.showSpellcheckDialog()`.
- Quét `cellsData` của sheet đang mở, A1-order.
- Dialog: từ sai, ô, nội dung, gợi ý, Bỏ qua / Bỏ qua tất cả / Thêm vào từ điển / Thay thế / Thay thế tất cả / Đóng. Escape đóng. Focus trap.
- Thay thế đi qua `setCellValue` (undo có sẵn).
- Ignore All: `checker.ignore()` theo phiên. Thêm từ: cùng localStorage key với Writer/Slides.
- F7 khi Sheet active: bind runtime `globalShortcutManager.bind("F7", "sheet.review.spellCheck", "sheet")`. Không ghi `shortcut: "F7"` vào `SHEET_COMMANDS` vì F7 common đã thuộc `ai.assistant.grammarCheck` (test uniqueness/scope). Writer vẫn giữ F7 AI; Sheet overlay F7 thành chính tả giống Excel.
- UNO: `.uno:Spelling`. Icon `sheetSpellCheck` (SVG gốc, không copy branding).
- Không gửi nội dung tài liệu ra cloud. Không thư viện trả phí.

FILES CHANGED:

- `apps/sheet/sheet-ribbon.js`
- `apps/sheet/sheet-grid.js`
- `apps/sheet/sheet.css`
- `platform/commands/command-definitions.js`
- `platform/i18n/strings-vi.js`
- `platform/i18n/strings-en.js`
- `platform/ui-kit/icons.js`
- `adapters/libreoffice/sheet/sheet-adapter.js`
- `adapters/libreoffice/common/command-dispatch-mapper.js`
- `tests/unit/sheet-spellcheck-vi.test.js`
- `tests/live/sheet-spellcheck-vi.playwright.mjs`
- `tests/run-tests.js`
- `docs/HANDOFF-SHEET-SPELLCHECK-VI.md`

Không sửa: `platform/text/vi-spellchecker.js`, `platform/text/spellcheck-dom-controller.js`, `apps/writer/**`, `apps/slides/**`.

COMMANDS RUN:

- `node --check apps/sheet/sheet-grid.js`
- `node --check apps/sheet/sheet-ribbon.js`
- `node --check tests/unit/sheet-spellcheck-vi.test.js`
- `node --check tests/live/sheet-spellcheck-vi.playwright.mjs`
- `node tests/live/sheet-spellcheck-vi.playwright.mjs`
- `node tests/run-tests.js` (PowerShell Stopwatch)
- `git diff --check`

BUILD RESULT: NOT RUN — repository không có build script; syntax/module nằm trong master test suite.

TEST RESULTS:

- PASS — `node tests/run-tests.js`: **856/856 PASS, 0 FAIL, 52.575 giây** (< 60 giây). Suite 61b (12 test Sheet spellcheck) PASS, gồm: phát hiện ô text sai; ô text đúng không báo; ô số/công thức bỏ qua; replace; ignore; từ điển cá nhân dùng chung; cô lập theo sheet.
- PASS — live Playwright Edge, **không SendKeys**: click tab Xem xét → nút Chính tả → dialog bắt `chínnh` tại A20, gợi ý `chính`, Thay thế thành `chính`, số/công thức/ô đúng không bị đụng, không pageerror. Ảnh: `%TEMP%\sheet-spellcheck-vi.png`.

KNOWN FAILURES: Không có trong các test đã chạy.

RISKS:

- Corpus từ điển Writer vẫn nhỏ; false positive thuật ngữ chuyên ngành giữ nguyên. Heuristic tên riêng/viết hoa giữ nguyên.
- F7 trên Sheet ghi đè F7 AI grammar khi scope `sheet` active. Writer/Slides không đổi.
- Công thức chuỗi kiểu `="chínnh"` bị bỏ qua vì là công thức (đúng yêu cầu và đúng Excel: không quét ô công thức).

DEPENDENCIES/BLOCKERS: Không có. Phụ thuộc Shared Platform spellcheck đã có trên main.

CORE PATCH ID: Không có; không sửa LibreOffice Core.

NEXT ACTION: Người phụ trách review branch `feature/sheet-spellcheck-vi` và tự merge nếu chấp thuận. **Không merge vào main từ worktree này.**
