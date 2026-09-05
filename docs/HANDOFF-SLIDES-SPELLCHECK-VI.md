# Agent Handoff

TASK: Áp dụng kiểm tra chính tả tiếng Việt thật cho VN Slides

AGENT/ROLE: Codex / Slides

BRANCH: `feature/slides-spellcheck-vi`

WORKTREE: `E:\VNOffice-codex-slides-spellcheck`

OBJECTIVE: Tái sử dụng toàn bộ spellchecker tiếng Việt của Shared Platform cho title, body/body2 và text trong shape của slide đang biên tập; bảo đảm marker/menu/cá nhân hóa và lifecycle khi chuyển/xóa slide.

FINDINGS:

- `platform/text/vi-spellchecker.js` đã cung cấp tokenizer Unicode NFC, membership, Levenshtein, ignore theo phiên và từ điển cá nhân.
- `platform/text/spellcheck-dom-controller.js` nhận nhiều root độc lập, debounce 400 ms, giữ caret, render marker, menu chuột phải và có `destroy()` để tháo listener/timer/menu.
- Title/body/body2 là ba `contenteditable` ổn định; shape/table text được dựng lại toàn bộ mỗi lần `_renderShapesLayer()` chạy.
- Speaker Notes hiện là `textarea`. DOM controller dùng span marker nên không thể gạch chân từng token bên trong textarea. Chuyển Notes sang contenteditable sẽ mở rộng thay đổi model/UI và không còn là phần “làm gọn”; vì vậy Notes chưa được tích hợp trong task này.
- File có hai method `destroy()` từ trước, trong JavaScript method cuối ghi đè method trước. Lifecycle cleanup cần được đặt trong method cuối đang thực thi.

IMPLEMENTATION SUMMARY:

- Import và dùng trực tiếp `VietnameseSpellChecker`, `SpellcheckDomController`, `VIETNAMESE_DICTIONARY_WORDS`; không viết lại tokenizer/controller và không sửa Platform/từ điển/giấy phép.
- Một checker tồn tại theo vòng đời canvas. Controller được destroy rồi attach lại với title/body/body2 và mọi `[contenteditable]` trong shape layer sau mỗi lần layer render/chuyển slide. Timer, root listeners, document pointer listener và menu cũ vì thế không giữ DOM của slide trước.
- Gắn `data-shape-text-id` để đồng bộ thay thế từ qua menu về đúng shape model; title/body model cũng được đồng bộ sau action menu.
- `destroy()` cuối cùng dọn spellcheck controller, checker và document click listener, đồng thời giữ các cleanup show/presenter/window vốn nằm ở method bị ghi đè trước đó.
- Marker CSS được scope trong Slides và đã kiểm chứng khi canvas zoom 90%. Menu dùng lại style `.vno-spellcheck-menu` hiện hữu được load cùng suite.
- Dùng chung localStorage key mặc định `vno-spellcheck-vi-personal` với Writer. Lý do: từ cá nhân là preference ngôn ngữ của cùng người dùng, không phải dữ liệu riêng của app; dùng chung tránh nhập lại và giữ đúng shared capability.
- Không thêm dependency, không gọi cloud, không gửi nội dung tài liệu ra ngoài.

FILES CHANGED:

- `apps/slides/slides-canvas.js`
- `apps/slides/slides.css`
- `tests/unit/slides-spellcheck-vi.test.js`
- `tests/live/slides-spellcheck-vi.playwright.mjs`
- `tests/run-tests.js`
- `docs/HANDOFF-SLIDES-SPELLCHECK-VI.md`

COMMANDS RUN:

- `node --check apps/slides/slides-canvas.js`
- `node --check tests/live/slides-spellcheck-vi.playwright.mjs`
- `node tests/live/slides-spellcheck-vi.playwright.mjs`
- `node tests/run-tests.js` (đo bằng PowerShell Stopwatch)
- `git diff --check`

BUILD RESULT: NOT RUN — repository không có build script; syntax/module/browser smoke nằm trong master test suite.

TEST RESULTS:

- PASS — live Playwright: marker thật trong title và shape, CSS wavy, bounding box nằm trong canvas ở zoom 90%, menu/gợi ý, thêm từ vào shared localStorage, chuyển slide không rò marker, không pageerror. Không dùng SendKeys.
- PASS — `node tests/run-tests.js`: 684/684 PASS, 0 FAIL, 14.196 giây trên trạng thái cuối.

KNOWN FAILURES: Không có trong các test đã chạy.

RISKS:

- Speaker Notes chưa có marker vì là textarea; cần task riêng nếu muốn đổi sang rich contenteditable hoặc một overlay marker được thiết kế riêng.
- Dictionary corpus nhỏ và heuristic/false-positive giữ nguyên hoàn toàn từ Writer; task này không thay dữ liệu hay semantics.
- Shape text chỉ vào edit mode sau double-click/keyboard như hành vi Slides hiện hữu; marker vẫn được tính trên root shape đang render.

DEPENDENCIES/BLOCKERS: Không có dependency runtime hoặc blocker. Phụ thuộc nội bộ vào Shared Platform spellcheck đã merge trên main.

CORE PATCH ID (if any): Không có; không sửa LibreOffice Core.

NEXT ACTION: Người phụ trách review các commit trên branch và tự merge nếu chấp thuận. Không merge vào main từ worktree này.
