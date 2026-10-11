# Agent Handoff

TASK: VN Slides — nhóm Phông chữ (Font) và Đoạn văn (Paragraph) trên tab Trang đầu
AGENT/ROLE: Grok (Slides ribbon + LibreOffice adapter + canvas HTML persist + test)
BRANCH: `feature/slides-font-paragraph`
WORKTREE: `E:\VNOffice-grok-slides-font-paragraph`
OBJECTIVE: Bổ sung định dạng chữ/đoạn văn thường dùng nhất trên slide (đậm/nghiêng/gạch chân/font/size/màu, bullet/số, căn lề, giãn dòng, thụt lề) theo pattern `document.execCommand` đã có sẵn của Writer. Không merge vào main.

KHÔNG MERGE VÀO MAIN.

---

## Plan gate

Thay đổi >3 file, command bus, i18n, FODP serialize/parse (rich text). Không đụng Writer/Sheet source, Core, build system, không gửi nội dung tài liệu ra cloud.

- **Objective:** Lệnh `slides.text.*` / `slides.font.*` / `slides.para.*` / `slides.list.*` / `slides.color.*` trên tab Trang đầu, nhóm Phông chữ + Đoạn văn đặt giữa Bảng nhớ tạm và Đối tượng vẽ. Áp `execCommand` lên contentEditable title/body/textbox/table-cell. Nút toggle đồng bộ `is-checked`/`aria-pressed`. Lưu HTML vào model và FODP ODF `style:text-properties`.
- **Current capability trước task:** Home tab Slides chỉ có Trang chiếu / Bảng nhớ tạm / Đối tượng vẽ. `command-definitions.js` chỉ có `slides.text.insert` (chèn textbox), không có bold/italic/font. Title/body lưu `innerText` thuần. FODP ghi `<text:p>` plain, parse strip mọi thẻ.
- **Files/modules:** `apps/slides/*`, `adapters/libreoffice/slides/slides-adapter.js`, `adapters/libreoffice/common/command-dispatch-mapper.js` (chỉ thêm mapping `slides.*`), `platform/commands/command-definitions.js` (chỉ thêm dòng `slides.*`), i18n slides, tests.
- **Dependency:** Playwright Edge + `soffice.exe` chỉ cho live/FODP measurement. Không thư viện trả phí.
- **Risk:** Title CSS `font-weight: 800` nên `queryCommandState("bold")` sẵn true — bấm Đậm trên tiêu đề là **gỡ đậm** (đúng toggle). Ribbon `<select>` cướp focus/selection: adapter chỉ nhớ selection khi focus còn trong vùng chữ, restore trước `execCommand`.
- **Test plan:** `node tests/run-tests.js` <60s; unit execCommand + FODP HTML; Playwright click ribbon thật; soffice FODP→PPTX→FODP.
- **Rollback:** revert branch.

---

## FINDINGS — Writer pattern (tham khảo, không sửa)

`adapters/libreoffice/writer/writer-adapter.js` ~1602–1736:

| Lệnh Writer | `document.execCommand` |
|---|---|
| `writer.text.bold/italic/underline/strike` | `bold` / `italic` / `underline` / `strikeThrough` |
| `writer.text.clearFormat` | `removeFormat` |
| `writer.para.alignLeft/Center/Right/justify` | `justifyLeft/Center/Right/Full` |
| `writer.list.bullet/numbered` | `insertUnorderedList` / `insertOrderedList` |
| `writer.para.indentInc/Dec` | `indent` / `outdent` |
| `writer.font.family/size` | `fontName` / `fontSize` (cỡ HTML 1–7) |
| `writer.color.text/highlight` | `foreColor` / `hiliteColor` |
| giãn dòng | CSS `lineHeight` (không phải execCommand) |

`apps/writer/writer-ribbon.js` nhóm `font` / `paragraph`: select family+size, hàng B/I/U, hàng bullet/number/indent/align.

Slides canvas đã `contentEditable = "true"` trên title/body/body2 (khoảng dòng 361+), textbox/table-cell khi edit. **Không cần rich-text engine riêng.**

---

## FINDINGS — FODP (đo thật, không đoán)

Trước task: `serializeToFodp()` ghi title/body bằng `_escapeXml(innerText)` trong `<text:p>`. `parseFodp` / `_paragraphsFromXml` **strip mọi thẻ**. Định dạng chữ **không** sống sót.

Sau task: HTML format (`<b>/<i>/<u>/<ul>/<font>` + CSS align/color) được đổi sang ODF:

- `style:style style:family="text"` → `fo:font-weight="bold"`, `fo:font-style="italic"`, `style:text-underline-style="solid"`, `fo:color`, `fo:font-family`, `fo:font-size`
- `style:family="paragraph"` → `fo:text-align`
- `text:list-style` + `<text:list>` cho bullet/number
- **Không** dùng `vno:titleHtml`

Đo `tests/live/fodp-save-font-paragraph-real-conversion.mjs` (soffice headless, 2026-09-05):

| Bước | Kết quả đo |
|---|---|
| `serializeToFodp()` titleHtml `<b>Dam</b> <i>nghieng</i> <u>gach</u>`, body `<ul><li>` | Có `fo:font-weight="bold"`, `fo:font-style="italic"`, `style:text-underline-style="solid"`, `<text:list>`. Không `vno:titleHtml`. |
| parse in-memory | `titleHtml` còn `<b>`, `bodyHtml` còn `<ul>/<li>` |
| FODP → PPTX | `ppt/slides/slide1.xml`: bold+italic+bullet+center. Slide 2: `a:srgbClr val="DC2626"` (màu chữ). Regex `<a:u` không bắt underline (PPTX hay ghi `u="sng"`). |
| PPTX → FODP → `parseFodp()` | `titleHtml` có `<b>Dam</b> <i>nghieng</i> <u>gach</u>`; `bodyHtml` còn `<ul><li>Muc mot`. Center + list sống sót. |

**Kết luận:** Định dạng chữ/đoạn văn **giữ được** qua round-trip FODP→PPTX→FODP với ODF chuẩn. LibreOffice có thể đổi tên font (`Arial1`) và thêm `font-size` theme (44pt title / 32pt body) — không mất B/I/U/list/align/color.

---

## IMPLEMENTATION SUMMARY

1. Commands (prefix `slides.`, không sửa Writer/Sheet): bold/italic/underline/strike/clearFormat, font family/size/grow/shrink, color text/highlight, bullet/numbered, align L/C/R/justify, indent Inc/Dec, lineSpacing. Shortcut Ctrl+B/I/U và Ctrl+L/E/R/J **scope slides** (không trùng Writer vì shortcut manager đã scope theo app). Không gán Ctrl+M cho indent (đã là New Slide).
2. Ribbon Home: nhóm **Phông chữ** rồi **Đoạn văn**, đúng chỗ giữa Clipboard và Drawing (layout PowerPoint).
3. Adapter: `document.execCommand` trên contentEditable đang chọn (title/body/textbox/ô bảng). `mousedown` preventDefault trên nút ribbon để khỏi mất selection; `<select>` không preventDefault. `globalCommandBus.updateState(..., { checked })` từ `queryCommandState` → nút `is-checked` / `aria-pressed`.
4. Canvas: `titleHtml` / `bodyHtml` / `body2Html` / `shape.textHtml`. Input lưu cả innerText (thumbnail) và HTML (định dạng). `selectSlide` restore HTML. Strip marker spellcheck khi capture.
5. FODP: HTML → ODF text/paragraph/list styles; parse ngược lại HTML.

---

## FILES CHANGED

- `apps/slides/slides-ribbon.js`
- `apps/slides/slides-canvas.js`
- `adapters/libreoffice/slides/slides-adapter.js`
- `adapters/libreoffice/common/command-dispatch-mapper.js` (chỉ thêm mapping slides.*)
- `platform/commands/command-definitions.js` (chỉ thêm dòng slides.*)
- `platform/i18n/strings-vi.js` / `strings-en.js` (command + `slidesRibbon.group.font/paragraph`)
- `tests/unit/slides-font-paragraph.test.js`
- `tests/run-tests.js`
- `tests/live/slides-font-paragraph.playwright.mjs`
- `tests/live/fodp-save-font-paragraph-real-conversion.mjs`
- `docs/HANDOFF-SLIDES-FONT-PARAGRAPH.md`

Không đụng Writer/Sheet source.

---

## COMMANDS RUN

- `node tests/run-tests.js`
- `node tests/live/slides-font-paragraph.playwright.mjs` (Playwright locators + `fill`/`click`/`selectOption`, **không SendKeys**)
- `node tests/live/fodp-save-font-paragraph-real-conversion.mjs`

BUILD RESULT: NOT RUN — repo không có build step; syntax nằm trong master runner.

---

## TEST RESULTS

| Suite | Kết quả |
|---|---|
| `node tests/run-tests.js` | **PASS** — 886/886, 51s (<60s). Suite 84 Font/Paragraph 9/9. |
| Unit execCommand bold/italic/underline/font/list/align | **PASS** |
| Unit FODP serialize `fo:font-weight` + parse `<b>` / list / center | **PASS** |
| Unit canvas persist `titleHtml` qua `selectSlide` | **PASS** |
| Playwright live Edge canvas | **PASS** — Home có Font+Paragraph đúng thứ tự; body fill + click Đậm/Nghiêng/Gạch chân ra `<b><i><u>`; Arial + size; bullet + căn giữa; HTML persist khi đổi slide |
| soffice FODP hop | **PASS** — bold/italic/underline/list/align/color sống sót PPTX→FODP |

KNOWN FAILURES: Không có.

---

## RISKS

- Title mặc định `font-weight: 800` nên nút Đậm trên tiêu đề là toggle gỡ đậm, giống chỗ đã bold trong Word.
- `execCommand("fontSize")` dùng thang HTML 1–7 (10/13/16/18/24/32/48), không phải pt tự do như PowerPoint. Grow/shrink ghi `style.fontSize` px.
- Màu chữ/highlight mặc định `#dc2626` / `#ffcd00` khi bấm nút (giống Writer, chưa có color picker).
- soffice có thể đổi `Arial` → `Arial1` và gắn cỡ theme 44pt/32pt sau hop; B/I/U/list vẫn còn.

DEPENDENCIES/BLOCKERS: Không dependency mới.

CORE PATCH ID: Không có.

NEXT ACTION: Review rồi merge vào `main` khi được phép. **Agent không tự merge.**
