# Agent Handoff

TASK: VN Slides ribbon batch — Format Painter, Review spellcheck button, Format Background
AGENT/ROLE: Grok / Slides
BRANCH: `feature/slides-ribbon-batch`
WORKTREE: `E:\VNOffice-grok-slides-ribbon-batch`
OBJECTIVE: Ba khoảng trống ribbon Round 3 của VN Slides (đối chiếu PowerPoint 365): Format Painter trên Home, nút Chính tả trên tab Đánh giá, Format Background trên Design. Không merge vào main.

KHÔNG MERGE VÀO MAIN.

---

## Plan gate

Thay đổi >3 file, command-definitions (`slides.*` mới), i18n, icons, FODP drawing-page fill. Không đụng Writer/Sheet source, Core, build system, không gửi nội dung tài liệu ra cloud.

- **Objective:** (1) `slides.edit.formatPainter` copy định dạng chữ + fill hình theo pattern Writer/Sheet. (2) `slides.review.spellCheck` chỉ gắn ribbon/dialog vào checker đã có. (3) `slides.design.formatBackground` đổi nền 1 slide hoặc tất cả (solid / gradient 2 màu / ảnh) bằng ODF chuẩn.
- **Current capability trước task:** Home Slides clipboard chỉ Cut/Copy/Paste; Review chỉ Nhận xét; Design Customize chỉ Cỡ trang chiếu. Spellcheck DOM (marker F7-class) đã có từ `HANDOFF-SLIDES-SPELLCHECK-VI.md` nhưng không có nút ribbon. Nền canvas = `masterTheme.bgColor` toàn bài.
- **Files/modules:** `apps/slides/*`, `adapters/libreoffice/slides/slides-adapter.js`, `adapters/libreoffice/common/command-dispatch-mapper.js` (chỉ thêm mapping `slides.*`), `platform/commands/command-definitions.js` (chỉ thêm dòng `slides.*`), `platform/i18n/*`, `platform/ui-kit/icons.js`, tests.
- **Dependency:** Playwright Edge cho live; `soffice.exe` chỉ đo FODP→PPTX→FODP của Format Background. Không thư viện trả phí.
- **Risk:** Format Painter chữ phụ thuộc `execCommand` + selection; title CSS `font-weight: 800`. Spellcheck dialog chỉ quét slide hiện tại (không cả bài). Gradient chỉ tuyến tính 2 màu. Ảnh nền data-URL có thể làm FODP lớn.
- **Test plan:** `node tests/run-tests.js` <60s; unit + Playwright live từng tính năng; soffice round-trip nền.
- **Rollback:** revert 3 commit trên branch.

---

## 1. Format Painter

### Findings

- Writer: `common.edit.formatPainter` — `getComputedStyle` + `document.execCommand`, cursor class `vno-format-painter-active`, **không** khóa double-click.
- Sheet: `sheet.edit.formatPainter` — copy `style` ô, toggle/lock/Esc, history `batch-cells`.
- Slides chưa có command/nút. Text đã `execCommand` như Writer (`slides.text.*`). Shape fill là `shape.color`.

### Implementation

- Command `slides.edit.formatPainter` (toggle, icon `formatPainter`, **không** Ctrl+Shift+C).
- Ribbon Home > Bảng nhớ tạm, hàng thứ 3 dưới Cắt/Sao chép (layout Writer/PowerPoint).
- Bật: copy fill của hình đang chọn (rect/ellipse/arrow/textbox) **và/hoặc** computed style chữ (đậm/nghiêng/gạch chân/màu/font).
- Click hình đích → sơn `shape.color`. Mouseup trên title/body/body2 → `execCommand` như Writer.
- Double-click nút = khóa; Esc hủy. Con trỏ cọ vẽ cùng SVG data-URI với Sheet.
- Undo: `shape-format` / `text-format` trên `undoStack` sẵn có. Không stack riêng.
- Mousedown trên nút ribbon `preventDefault` để khỏi mất selection chữ (cùng trick Font group).

### Limits

- Không sơn fill ảnh / bảng / WordArt / chart / connector / video / audio.
- Không copy animation, size, position.
- `fontSize` được capture nhưng apply chữ theo Writer (B/I/U/color/highlight/fontName); không map HTML size 1–7.

### Tests

- Unit `tests/unit/slides-format-painter.test.js`
- Live `tests/live/slides-format-painter.playwright.mjs` — PASS (Edge headless, click thật, không SendKeys): bật nút, sơn fill shape, khóa, Esc, Undo QAT, copy màu chữ body → title.

Commit: `58e1fe8 feat(slides): add Format Painter for text and shape fill`

---

## 2. Spellcheck trên tab Đánh giá (Review)

### Findings

- `HANDOFF-SLIDES-SPELLCHECK-VI.md`: marker sóng đã chạy trên title/body/shape qua `SpellcheckDomController`. **Không** có command `slides.review.spellCheck`, Review ribbon chỉ `slides.review.commentInsert`. F7 common là `ai.assistant.grammarCheck`.
- Sheet đã có pattern đúng: nhóm **Chứng minh** / `sheetRibbon.group.proofing`, command `sheet.review.spellCheck`, F7 **scope sheet**, dialog quét `VietnameseSpellChecker`.

### Implementation

- Command `slides.review.spellCheck` (icon `slidesSpellCheck`, **không** khai báo shortcut F7 trong định nghĩa). Adapter `globalShortcutManager.bind("F7", ..., "slides")`.
- Ribbon Review: nhóm **Chứng minh** (`slidesRibbon.group.proofing`) trước Nhận xét, nút lớn trỏ thẳng `showSpellcheckDialog`.
- Dialog tái sử dụng `this.spellcheckChecker` / `_ensureSpellChecker()` — `checkText` / `suggest` / `ignore` / `addToPersonalDictionary`. Không viết tokenizer/từ điển.
- Quét title, body, body2, `shape.text` của **slide hiện tại**. Thay thế ghi `text-format` trên undo stack sẵn có. Ô “Thay thế” sẵn gợi ý đầu (PowerPoint Change to).
- Cùng localStorage key `vno-spellcheck-vi-personal` với Writer/Sheet.

### Limits

- Không quét Speaker Notes (vẫn textarea, như handoff spellcheck trước).
- Không quét toàn bộ bài; từng trang một, giống “slide hiện tại”.
- Marker sóng vẫn hoạt động độc lập (chuột phải); nút ribbon là dialog rà soát.

### Tests

- Unit `tests/unit/slides-spellcheck-ribbon.test.js`
- Live `tests/live/slides-spellcheck-ribbon.playwright.mjs` — PASS: tab Đánh giá, click Chính tả, dialog hiện `chínnh`, thay thành `chính` trên title.

Commit: `ed39677 feat(slides): expose Vietnamese spellcheck on the Review ribbon`

---

## 3. Format Background (Design > Customize)

### Findings

- PowerPoint: Design > Customize > Format Background — solid / gradient / picture, this slide hoặc all slides. Khác Theme Gallery (đổi theme toàn bài).
- Trước task: canvas/thumbnail/F5 dùng `masterTheme.bgColor`. FODP `style:drawing-page-properties` chỉ transition/hidden, không fill trang.

### Implementation

- Command `slides.design.formatBackground`. Ribbon Design > Tùy chỉnh, cạnh Cỡ trang chiếu.
- Dialog: màu đơn (`input type=color`), gradient 2 màu tuyến tính ngang/dọc, ảnh (file picker data-URL như Insert Picture). Áp dụng trang này / tất cả. Xóa nền tùy chỉnh.
- Model: `slide.background = { type, color?, gradient?, picture? }`. Nhân đôi slide copy nền. Theme **không** đổi.
- Undo type `slide-background` trên stack sẵn có.
- FODP **ODF chuẩn, đo soffice, không `vno:*`**:
  - solid: `draw:fill="solid" draw:fill-color="#…"` trên `style:drawing-page-properties`
  - gradient: `draw:fill="gradient"` + `<draw:gradient>` trong `office:styles`
  - picture: `draw:fill="bitmap"` + `<draw:fill-image><office:binary-data>`
- Đo thật `soffice` headless (2026-09-05): FODP → PPTX → FODP, `parseFodp()` khôi phục solid `#dc2626` và gradient `#1e3a8a`→`#ffffff` horizontal.

### Limits

- Gradient chỉ 2 màu, tuyến tính, 2 hướng. Không radial / nhiều stop.
- Ảnh nền `cover` + data-URL; FODP có thể phình nếu ảnh lớn.
- Không “hide background graphics” của master; không pattern/texture.

### Tests

- Unit `tests/unit/slides-format-background.test.js` (ribbon, apply current vs all, undo, FODP ODF, picture binary)
- Live `tests/live/slides-format-background.playwright.mjs` — PASS: tab Thiết kế, dialog, solid `#dc2626` trang hiện tại, không đụng slide khác/theme, Undo QAT.

Commit: `7b675b5 feat(slides): add Format Background on the Design tab`

---

## COMMANDS RUN

- `node --check` trên canvas/adapter/ribbon/tests từng tính năng
- Unit Format Painter 9/9 PASS; Spellcheck ribbon 11/11 PASS; Format Background 9/9 PASS
- Live Playwright Edge headless (không SendKeys): 3 file `tests/live/slides-format-painter.playwright.mjs`, `slides-spellcheck-ribbon.playwright.mjs`, `slides-format-background.playwright.mjs` — cả 3 PASS
- soffice FODP→PPTX→FODP Format Background — solid + gradient sống sót
- `node tests/run-tests.js` — **944/944 PASS, 0 FAIL, 59.74 giây** (<60s). Suite gồm color-contrast audit sẵn có.

BUILD RESULT: NOT RUN — repository không có build script; syntax/module nằm trong master suite.

TEST RESULTS: PASS — full suite `944/944` trong `59.74s`. PASS — 3 live Playwright. PASS — soffice background round-trip.

KNOWN FAILURES: Không có trong các test đã chạy.

RISKS:

- Format Painter chữ: `execCommand` + title CSS đậm sẵn; fill không áp cho media/WordArt/table.
- Spellcheck dialog không thay thế Notes; F7 Slides ghi đè grammar AI trong lúc app Slides active (cùng pattern Sheet).
- Ảnh nền data-URL làm FODP lớn; gradient chỉ 2 màu tuyến tính.

DEPENDENCIES/BLOCKERS: Không thêm dependency, không dùng thư viện trả phí.

CORE PATCH ID: Không có — không sửa LibreOffice Core/upstream.

NEXT ACTION: Người phụ trách review 3 commit trên `feature/slides-ribbon-batch` và tự merge nếu chấp thuận. **Không merge vào main từ worktree này.**
