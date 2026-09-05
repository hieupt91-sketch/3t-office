# Agent Handoff

TASK: VN Slides — WordArt (chữ nghệ thuật)
AGENT/ROLE: Grok (Slides canvas + LibreOffice adapter + test)
BRANCH: `feature/slides-wordart`
WORKTREE: `E:\VNOffice-grok-slides-wordart`
OBJECTIVE: Thêm WordArt vào VN Slides — dialog chọn mẫu, shape mới, CSS text-effect thật trên canvas/F5/Slide Sorter, lưu FODP trung thực kèm giới hạn đo được.

FINDINGS:

- Trước task, `grep wordart/WordArt/text-effect` trong `apps/` không có kết quả. Shape text thường là `rect`/`ellipse`/`textbox` với `shape.text`, render nền `background-color` + `contentEditable`. Kéo-thả, xóa, Undo (`shape-add` / `shape-delete` / `shape-text-edit`) đã có.
- LibreOffice Impress không có thuộc tính ODF tương đương CSS `background-clip:text` / `-webkit-text-stroke` / `text-shadow` cho chữ. Fontwork (`.uno:FontworkGalleryFloater`) là chữ uốn theo path, khác PowerPoint WordArt fill/outline/shadow.
- Probe thật bằng soffice headless trên FODP adapter sinh ra:
  - Native FODP (serialize/parse VN): giữ `vno:wordart="true"` + preset/fill/gradient/stroke/shadow + chữ.
  - FODP → FODP rewrite LibreOffice: **loại toàn bộ `vno:wordart-*`**; chữ còn trong `draw:text-box`; parser VN đọc lại thành `textbox`.
  - FODP → PPTX: chữ **"Khai giảng" còn**; không có `wordArt` / `fontwork` / `a:gradFill` / `a:outerShdw` kiểu WordArt PowerPoint.

IMPLEMENTATION SUMMARY:

- Lệnh `slides.insert.wordart` trên tab **Chèn**, nhóm Văn bản. Dialog: nhập chữ + 8 mẫu gốc VN (không dùng asset Microsoft): navy outline, gold outline, ocean gradient, sunset gradient, heavy outline, emerald glow, violet gradient, frost shadow.
- Shape `type = wordart` trong `slide.shapes[]` với `text`, `fontFamily`, `fontSize`, `fillColor`/`gradient`, `strokeColor`/`strokeWidth`, `shadow`.
- Render CSS thật: `text-shadow`, `-webkit-text-stroke`, `background-clip:text` (+ `-webkit-background-clip` / `-webkit-text-fill-color` cho gradient) trên canvas soạn thảo, HTML trình chiếu F5, và thumbnail Slide Sorter.
- Chọn, kéo, đổi chữ (double-click / gõ), xóa, Undo/Redo tái dùng cơ chế shape có sẵn — không viết stack mới.
- FODP: `draw:frame` + `draw:text-box` (chữ thật + `style:text-properties` fo:color / style:text-outline / fo:text-shadow best-effort) và metadata `vno:wordart-*` để round-trip trong VN Office.

MỨC ĐỘ “THẬT”:

- CSS đo được bằng Playwright `getComputedStyle`: canvas và F5 có `text-shadow`, `-webkit-text-stroke` width > 0, `background-clip: text`, `background-image` linear-gradient.
- Không phải Fontwork uốn chữ, không sao chép gallery/font Microsoft. Font hệ thống: Impact / Arial Black / Georgia / Arial.

FILES CHANGED:

- `apps/slides/slides-canvas.js`
- `apps/slides/insert-dialogs.js`
- `apps/slides/slides-ribbon.js`
- `apps/slides/slides.css`
- `adapters/libreoffice/slides/slides-adapter.js`
- `adapters/libreoffice/common/command-dispatch-mapper.js`
- `platform/commands/command-definitions.js`
- `platform/i18n/strings-vi.js`
- `platform/i18n/strings-en.js`
- `platform/ui-kit/icons.js`
- `tests/unit/slides-wordart.test.js`
- `tests/run-tests.js`
- `tests/live/slides-wordart.playwright.mjs`
- `tests/live/fodp-wordart-persistence-real-conversion.mjs`
- `docs/FEATURE-PARITY-ROADMAP.md`
- `docs/HANDOFF-SLIDES-WORDART.md`

Không đụng Writer/Sheet.

COMMANDS RUN:

```text
node --check apps/slides/slides-canvas.js
node --check apps/slides/insert-dialogs.js
node --check adapters/libreoffice/slides/slides-adapter.js
node tests/live/slides-wordart.playwright.mjs
node tests/live/fodp-wordart-persistence-real-conversion.mjs
node tests/run-tests.js
```

BUILD RESULT: PASS — không đổi build system/dependency; syntax nằm trong master suite PASS.

TEST RESULTS:

- `node tests/run-tests.js`: **817/817 PASS, 0 FAIL, 53.14s** (dưới 60 giây).
- `node tests/live/slides-wordart.playwright.mjs`: **PASS** — click tab Chèn → WordArt, gõ chữ, chọn mẫu ocean-gradient; đo computed style canvas/F5/Slide Sorter; đổi chữ, xóa, Undo/Redo. Không SendKeys.
- `node tests/live/fodp-wordart-persistence-real-conversion.mjs`: **PASS** — soffice thật: rewrite FODP loại `vno:wordart-*` nhưng giữ chữ; PPTX giữ chữ thường, không sinh WordArt OOXML.

KNOWN FAILURES:

- Metadata `vno:wordart-*` không sống qua LibreOffice rewrite hoặc xuất PPTX. File mở lại sau soffice thành `textbox` (chữ còn, mất gradient/viền/bóng CSS).
- Không round-trip với WordArt native PowerPoint (`a:gradFill` / `a:ln` / `a:effectLst`).
- Filmstrip trái không render shape (giới hạn có sẵn); WordArt hiện trên canvas, F5 và Slide Sorter.

RISKS:

- Gradient + `-webkit-text-stroke` phụ thuộc engine Chromium/Edge; Firefox có thể khác.
- `vno:` custom attributes cùng pattern Morph/Sections — sidecar ngoài FODP mới giữ được effect sau hop LibreOffice.

DEPENDENCIES/BLOCKERS: Không dependency mới, không thư viện trả phí, không font/asset độc quyền Microsoft. Không blocker trong phạm vi đã giao.
CORE PATCH ID (if any): N/A — không sửa LibreOffice Core.
NEXT ACTION: Review các commit trên branch này. **KHÔNG merge vào main** trong task này.
