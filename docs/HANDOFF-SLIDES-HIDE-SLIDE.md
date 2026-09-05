# Agent Handoff

TASK: VN Slides — Hide Slide (Ẩn trang chiếu) trên tab Trình chiếu
AGENT/ROLE: Grok (Slides canvas + LibreOffice adapter + test)
BRANCH: `feature/slides-hide-slide`
WORKTREE: `E:\VNOffice-grok-slides-hide-slide`
OBJECTIVE: Thêm Ẩn trang chiếu chuẩn PowerPoint: slide vẫn trong file/Slide Sorter/sửa được, F5 tự bỏ qua. Lưu FODP bằng thuộc tính ODF thật, không custom `vno:` nếu chuẩn đã có.

KHÔNG MERGE VÀO MAIN.

---

## Plan gate

Thay đổi document model (`slide.hidden`), import/export FODP, >3 file, shared command/i18n. Không đụng Writer/Sheet, Core, build system, không gửi nội dung tài liệu ra cloud.

- **Objective:** `slide.hidden`, lệnh `slides.slide.toggleHidden` trên tab Trình chiếu / nhóm Thiết lập, Slide Sorter mờ + gạch số, F5/Presenter bỏ qua slide ẩn, FODP round-trip ODF.
- **Current capability trước task:** Model slide có `id/title/body/body2/layoutType/shapes/comments/notes/animations/transition`. Không có `hidden`. F5 `startSlideShow` đi `currentShowIdx ± 1`. Slide Sorter render đủ thumbnail, không phân biệt ẩn.
- **Files/modules:** `apps/slides/slides-canvas.js`, `apps/slides/slides-ribbon.js`, `apps/slides/slides.css`, `adapters/libreoffice/slides/slides-adapter.js`, command/i18n/icon, tests.
- **Dependency:** Playwright Edge + `soffice.exe` chỉ cho live test. Không thư viện trả phí.
- **Risk:** `_pageDrawingStyleName` trước đây chỉ tách style khi có transition; slide ẩn bắt buộc style riêng vì `presentation:visibility` nằm trên `style:drawing-page-properties`, không trên `draw:page`.
- **Test plan:** `node tests/run-tests.js` <60s; unit ẩn slide 2/3 + F5 1→3; Playwright canvas; soffice FODP→PPTX→FODP.
- **Rollback:** revert branch.

---

## FINDINGS — model & F5/Slide Sorter trước khi thêm

Đọc thật `apps/slides/slides-canvas.js` trước khi sửa:

- Constructor slides: `{ id, title, body, layoutType, shapes, comments, notes, titleAnimation, bodyAnimation }` — **không có `hidden`**.
- `addNewSlide` / `duplicateCurrentSlide` / `resetToBlank` không mang cờ ẩn.
- `startSlideShow`: `currentShowIdx = startIndex`; Next/Prev/click dùng `currentShowIdx ± 1` tới `slides.length - 1`. Không lọc.
- `_renderSlideSorterGrid`: mọi slide thành `.vno-slide-sorter-item`, số `${index + 1}`, kéo-thả/duplicate/delete. Không visual ẩn.
- `_renderThumbnails` (filmstrip trái): tương tự.

Grep `startSlideShow`, `renderShow`, `_renderSlideSorterGrid` khớp đúng các hàm trên. Không có `HideSlide` / `presentation:visibility` trong repo trước task.

---

## FINDINGS — ODF FODP thật (không đoán)

Câu hỏi: LibreOffice Impress có `presentation:visible=false` trên `draw:page` không?

**Không.** ODF 1.3 Part 3:

- `draw:page` **không** có `presentation:visible`.
- Thuộc tính chuẩn là **`presentation:visibility`** trên `<style:drawing-page-properties>` (schema 17.25 / 20.241), giá trị `visible` | `hidden`.

Đo bằng `tests/live/fodp-save-hide-slide-real-conversion.mjs` (soffice headless, 2026-09-05):

| Bước | Kết quả đo |
|---|---|
| `serializeToFodp()` slide 2 `hidden=true` | Có `presentation:visibility="hidden"` trên `style:drawing-page-properties` của style `dp3`. **Không** có `presentation:visible` trên `<draw:page>`. **Không** dùng `vno:hidden`. |
| FODP → PPTX | `ppt/slides/slide2.xml`: `<p:sld show="0" ...>`. Slide 1 và 3 không có `show` (mặc định hiện). |
| PPTX → FODP | LibreOffice ghi lại `presentation:visibility="hidden"` trên `dp4` (`style:family="drawing-page"`). `parseFodp()` → slide 2 `hidden=true`, title `An hai`. |
| FODP → ODP → FODP | Cùng kết quả: chỉ slide 2 hidden. |

Snippet soffice sau hop PPTX:

```xml
<style:style style:name="dp4" style:family="drawing-page">
  <style:drawing-page-properties presentation:visibility="hidden"
    presentation:background-visible="true"
    presentation:background-objects-visible="true" .../>
</style:style>
```

**Quyết định:** dùng chuẩn ODF `presentation:visibility="hidden"`. Không custom `vno:`.

UNO LibreOffice tương ứng: `.uno:HideSlide` / property `Visible` trên DrawPage.

---

## IMPLEMENTATION SUMMARY

1. Model: `slide.hidden = true/false` (mặc định `false`). Nhân đôi copy cờ; trang mới không ẩn.
2. Lệnh `slides.slide.toggleHidden` (toggle, `isToggle`) trên tab **Trình chiếu**, nhóm **Thiết lập** (Set Up — đúng nhóm PowerPoint chứa Hide Slide).
3. **Không gán phím tắt toàn cục.** PowerPoint Alt+H là keytip tab Home, sẽ xung đột. PowerPoint dùng Alt+S, H (ribbon keytips), không có shortcut toàn cục phổ biến. Ribbon button đủ.
4. Slide Sorter + filmstrip: class `is-hidden`, preview opacity 0.38, số gạch chéo + icon `⊘`. Vẫn chọn/sửa/xóa/kéo-thả.
5. F5 / Tập dượt / Presenter: `_resolveShowStartIndex` / `_findVisibleSlideIndex`. Next/Prev/click/mũi tên nhảy slide hiện. Nếu **mọi** slide ẩn: overlay thông báo, không crash, `isEmpty=true`.
6. Undo/Redo một bước `type: "hidden"`.
7. FODP: style drawing-page riêng khi hidden hoặc có transition.

---

## FILES CHANGED

- `apps/slides/slides-canvas.js`
- `apps/slides/slides-ribbon.js`
- `apps/slides/slides.css`
- `adapters/libreoffice/slides/slides-adapter.js`
- `adapters/libreoffice/common/command-dispatch-mapper.js`
- `platform/commands/command-definitions.js`
- `platform/i18n/strings-vi.js`
- `platform/i18n/strings-en.js`
- `platform/ui-kit/icons.js`
- `tests/unit/slides-hide-slide.test.js`
- `tests/run-tests.js`
- `tests/live/slides-hide-slide.playwright.mjs`
- `tests/live/fodp-save-hide-slide-real-conversion.mjs`
- `docs/HANDOFF-SLIDES-HIDE-SLIDE.md`

Không đụng Writer/Sheet.

---

## COMMANDS RUN

- `node tests/run-tests.js`
- `node tests/live/slides-hide-slide.playwright.mjs` (Playwright locators + `handle.next()`, **không SendKeys**)
- `node tests/live/fodp-save-hide-slide-real-conversion.mjs`

BUILD RESULT: NOT RUN — repo không có build step; syntax nằm trong master runner.

---

## TEST RESULTS

| Suite | Kết quả |
|---|---|
| `node tests/run-tests.js` | **PASS** — 870/870, ~54s (<60s). Suite 82 Hide Slide 9/9. |
| Unit ẩn slide 2 trong 3, F5 Next 1→3, hiện lại đi 1-2-3 | **PASS** |
| Slide Sorter vẫn hiện slide 2, mờ + gạch số + icon | **PASS** |
| Tất cả ẩn: không crash, thông báo rõ | **PASS** |
| Playwright live Edge canvas | **PASS** — click ribbon Ẩn trang chiếu, sorter opacity/line-through, F5 skip, unhide, all-hidden EN/VI |
| soffice FODP hop | **PASS** — `presentation:visibility="hidden"` sống sót PPTX (`show="0"`) và ODP |

KNOWN FAILURES: Không có.

---

## RISKS

- Shortcut Alt+H cố ý không gán (xung đột Home tab).
- Reading View vẫn hiện slide ẩn (đây là chế độ sửa/đọc, không phải F5 khán giả) — đúng spec “vẫn sửa được”.
- Số trang F5 vẫn là số gốc (`Trang 3 / 3` khi bỏ qua slide 2), giống PowerPoint.

DEPENDENCIES/BLOCKERS: Không dependency mới.

CORE PATCH ID: Không có.

NEXT ACTION: Review rồi merge vào `main` khi được phép. **Agent không tự merge.**
