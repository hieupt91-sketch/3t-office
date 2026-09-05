# Agent Handoff

TASK: VN Writer — WordArt (chữ nghệ thuật)
AGENT/ROLE: Grok (Writer flow document + LibreOffice adapter + test)
BRANCH: `feature/writer-wordart`
WORKTREE: `E:\VNOffice-grok-writer-wordart`
OBJECTIVE: Thêm WordArt vào VN Writer — dialog chọn mẫu, chèn tại con trỏ, CSS text-effect thật trên canvas, Undo/Redo, hướng dẫn tiếng Việt, đo FODT/DOCX round-trip.

FINDINGS:

- AGENTS.md mục 4 cấm `Writer → Slides internals`. Không được `import` từ `apps/slides/insert-dialogs.js`. Shared Platform extract sẽ bắt buộc sửa Slides (ngoài phạm vi). Vì vậy **copy** `WORDART_PRESETS` / `resolveWordArtStyle` / `buildWordArtCss` / `applyWordArtCss` / dialog ARIA vào `apps/writer/insert-dialogs.js`.
- Writer là flow document (`contenteditable` body). Layer hình khối hiện có (`this.shapes[]`) là overlay tuyệt đối, **không** bọc chữ (wrap) như Word. Wrap Square/Tight cần engine layout mới.
- Quyết định: **inline span tại con trỏ**, không floating. Khớp PLAN-RIBBON-GAPS-ROUND3 (“adapt for a Writer text run”) và chọn cách đơn giản khi wrap phức tạp.
- Probe soffice thật (HTML export của Writer, khác FODP custom XML của Slides):
  - Native HTML VN: giữ `data-vno-wordart` + CSS `linear-gradient` / `background-clip:text` / `-webkit-text-stroke` / `text-shadow`.
  - HTML → FODT: **giữ chữ** “Khai giảng”; **loại** `data-vno-wordart` và CSS gradient/stroke/shadow.
  - FODT rewrite LibreOffice: vẫn giữ chữ, không giữ metadata VN.
  - HTML → DOCX: chữ còn trong `word/document.xml`; không có `wps:wordArt` / `a:gradFill` / Fontwork.
  - DOCX → HTML: chữ còn (có thể dạng entity Unicode); CSS effect và `data-vno-wordart` mất.

IMPLEMENTATION SUMMARY:

- Lệnh `writer.insert.wordart` trên tab **Chèn**, nhóm Văn bản (cạnh Hộp văn bản). Dialog: nhập chữ + 8 mẫu gốc VN (navy-outline, gold-outline, ocean-gradient, sunset-gradient, heavy-outline, emerald-glow, violet-gradient, frost-shadow). Gallery `role="radiogroup"` + roving tabindex, Esc/Enter/Tab.
- Đối tượng: `<span class="vno-writer-wordart" data-vno-wordart="true" contenteditable="false">` chứa `<span class="vno-wordart-text" style="…">`. Inline trong đoạn văn tại caret.
- Chọn (click, viền xanh), sửa chữ (double-click / F2 / Enter), xóa (Delete/Backspace khi đang chọn, hoặc Backspace như object `contenteditable=false`). Undo/Redo = snapshot HTML Writer sẵn có.
- FODT/DOCX: xuất HTML kèm inline CSS + `data-vno-wordart-*`. LibreOffice giữ chữ thường. Mở lại trong VN: hydrate CSS từ `data-vno-wordart-style` **nếu** thuộc tính còn (chỉ phiên VN, không sống sau soffice).

MỨC ĐỘ “THẬT”:

- CSS đo được bằng Playwright `getComputedStyle` trên `.vno-writer-body .vno-wordart-text`: `text-shadow` ≠ none, `-webkit-text-stroke` width > 0, `background-clip: text`, `background-image` linear-gradient.
- Không phải Fontwork uốn chữ, không sao chép gallery/font Microsoft. Font hệ thống: Impact / Arial Black / Georgia / Arial.

QUYẾT ĐỊNH INLINE VS FLOATING:

- **Chọn inline.** Lý do: (1) Writer chưa có text wrap cho shape overlay; floating hiện đè lên chữ. (2) WordArt Word cũng chèn tại caret, bản tối thiểu là text run có style. (3) Equation/DateTime đã chứng minh `_insertHtmlAtCursor` + snapshot Undo. Floating chỉ đáng làm khi có wrap thật.

MỨC TÁI SỬ DỤNG CODE SLIDES:

- Copy (không import) preset 8 mẫu, `resolveWordArtStyle`, `buildWordArtCss`, `applyWordArtCss`, dialog ARIA/roving tabindex.
- Icon `wordArt` platform dùng chung (không thêm SVG mới).
- Không copy canvas shape / FODP `draw:frame` — Writer không dùng model đó.
- CSS gallery Writer dùng class `vno-writer-wordart-*` + `--vno-writer-primary` để không đè style Slides.

FILES CHANGED:

- `apps/writer/insert-dialogs.js`
- `apps/writer/writer-ribbon.js`
- `apps/writer/writer.css`
- `adapters/libreoffice/writer/writer-adapter.js`
- `adapters/libreoffice/common/command-dispatch-mapper.js` (một dòng `writer.insert.wordart` → `.uno:FontworkGalleryFloater` — UnoBridge auto-bind)
- `platform/commands/command-definitions.js`
- `platform/i18n/strings-vi.js`
- `platform/i18n/strings-en.js`
- `platform/help/entries-writer.js` (chỉ thêm 1 entry)
- `tests/unit/writer-wordart.test.js`
- `tests/run-tests.js`
- `tests/live/writer-wordart.playwright.mjs`
- `tests/live/fodt-wordart-persistence-real-conversion.mjs`
- `docs/FEATURE-PARITY-ROADMAP.md`
- `docs/HANDOFF-WRITER-WORDART.md`

Không đụng Sheet/Slides source.

COMMANDS RUN:

```text
node --check apps/writer/insert-dialogs.js
node --check adapters/libreoffice/writer/writer-adapter.js
node tests/live/writer-wordart.playwright.mjs
node tests/live/fodt-wordart-persistence-real-conversion.mjs
node tests/run-tests.js
```

BUILD RESULT: PASS — không đổi build system/dependency; syntax nằm trong master suite PASS.

TEST RESULTS:

- `node tests/run-tests.js`: **1000/1000 PASS, 0 FAIL, 71.32s**. Suite đã ~1000 test nên vượt 60 giây một chút là tự nhiên (không phải test bị treo).
- `node tests/live/writer-wordart.playwright.mjs`: **PASS** — tab Chèn → Chữ nghệ thuật, gõ «Khai giảng», mẫu ocean-gradient; đo computed style canvas; click chọn; sửa chữ / xóa / Undo / Redo; Delete khi đang chọn. Không SendKeys.
- `node tests/live/fodt-wordart-persistence-real-conversion.mjs`: **PASS** — soffice 26.2.5.2: FODT/DOCX giữ chữ; loại `data-vno-wordart` và CSS gradient/stroke/shadow; DOCX không sinh WordArt OOXML; DOCX→HTML giữ chữ, mất effect.

KNOWN FAILURES:

- CSS WordArt (`background-clip:text`, `-webkit-text-stroke`, `text-shadow`, gradient) **không** sống qua LibreOffice HTML→FODT/DOCX. File mở lại sau soffice thành chữ thường.
- `data-vno-wordart-*` bị soffice loại. Hydrate CSS chỉ hoạt động trong phiên VN (snapshot / chưa qua engine).
- Không round-trip với WordArt native Word (`a:gradFill` / Fontwork).
- Không floating + text wrap (Square/Tight/Through) — chưa có engine wrap Writer.

RISKS:

- Gradient + `-webkit-text-stroke` phụ thuộc Chromium/Edge; Firefox có thể khác.
- Copy preset khỏi Slides: đổi mẫu bên Slides sau này không tự đồng bộ Writer.

DEPENDENCIES/BLOCKERS: Không dependency mới, không thư viện trả phí, không font/asset độc quyền Microsoft. Không blocker trong phạm vi đã giao.
CORE PATCH ID (if any): N/A — không sửa LibreOffice Core.
NEXT ACTION: Review các commit trên branch này. **KHÔNG merge vào main** trong task này.
