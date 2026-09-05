# Agent Handoff

TASK: Slides Speaker Notes import fidelity (mở PPTX thật có `ppt/notesSlides/notesSlideN.xml`)
AGENT/ROLE: Grok / implementation & verification
BRANCH: `fix/slides-speakernotes-import-fidelity`
WORKTREE: `E:\VNOffice-grok-slides-notes-import`
OBJECTIVE: Xác nhận khi mở file PPTX thật có Speaker Notes (không do VN Office tự tạo) thì VN Slides có đọc đúng nội dung ghi chú hay bị mất/hiện sai; nếu mất dữ liệu sửa được trong adapter thì sửa; nếu là giới hạn thật thì ghi rõ kèm bằng chứng đo.

**Không merge vào `main`.** Không đụng Writer/Sheet. Không sửa `apps/slides/slides-canvas.js` (chỉ đọc).

---

## Plan gate

Thay đổi parse FODP notes trên Slides adapter + test. Không đụng Core, Writer, Sheet, canvas, build system, không gửi nội dung tài liệu ra cloud.

- **Objective:** Đo PPTX Speaker Notes → soffice FODP → `parseFodp()` / `loadFromFodp()`; panel nhận `slide.notes`.
- **Current capability trước task:** `serializeToFodp()` ghi `<presentation:notes>` + `presentation:class="notes"`. `parseFodp()` lấy **mọi** `<text:p>` trong notes page (`_paragraphsFromXml`). Test `slides-animations-notes.test.js` chỉ round-trip FODP do VN serialize — chưa có PPTX `notesSlides`.
- **Files/modules:** `adapters/libreoffice/slides/slides-adapter.js`; fixture `tests/fixtures/real-office-samples/sample-slides-notes.pptx`; unit `tests/unit/slides-speakernotes-import.test.js`.
- **Dependency:** `soffice.exe` (probe/live/generate). Unit suite không gọi soffice.
- **Risk:** lấy nhầm header/footer/date/page-number trên notes page — đã lọc `presentation:class="notes"`.
- **Test plan:** unit zip PPTX + canned FODP (<60s); live soffice PPTX→FODP; regression suite đầy đủ.
- **Rollback:** revert branch; parser cũ vẫn đọc notes VN serialize.

Chi tiết plan: `docs/PLAN-SLIDES-SPEAKERNOTES-IMPORT-FIDELITY.md`.

---

## FINDINGS (trước khi sửa — đo bằng đường import thật)

Đường mở Slides hiện tại:

```
common.file.open
  → SlidesAdapter.open()
    → globalUnoBridge.openRealFile("slides")
      → main.py open_document_dialog()
        → soffice --convert-to fodp   (không filter tường minh)
        → trả chuỗi FODP
      → SlidesAdapter.loadFromFodp() → parseFodp()
      → canvas.selectSlide(0) copy slide.notes vào textarea panel
```

Cấu trúc PPTX Speaker Notes (ECMA-376, đo được trên fixture soffice):

| Part | Vai trò |
| --- | --- |
| `ppt/notesSlides/notesSlideN.xml` | `<p:notes>` + placeholder `type="body"` chứa `<a:t>` ghi chú; thường có `type="sldImg"` |
| `ppt/slides/_rels/slideN.xml.rels` | `Type=.../notesSlide` → `../notesSlides/notesSlideN.xml` |
| `ppt/notesMasters/notesMaster1.xml` | notes master (header/date/footer/page-number) |
| `[Content_Types].xml` | `notesSlide` + `notesMaster` |

Fixture độc lập VN Office:

1. Viết tay `src/sample-slides-notes.fodp` với ODF `<presentation:notes>` / `presentation:class="notes"` trong `<draw:page>` (slide 1 hai đoạn tiếng Việt có `&`; slide 2 **không** notes; slide 3 một đoạn). **Không** đi qua `serializeToFodp()`.
2. `soffice --convert-to pptx:Impress MS PowerPoint 2007 XML`.
3. Giải nén — **không bịa part**.

Kết quả đo (`node tests/scripts/probe-slides-speakernotes-import.mjs`, tmp `vno-probe-notes-CdXt9k`):

| Tầng | Slide 1 notes (2 dòng, `&`) | Slide 2 (không notes) | Slide 3 notes |
| --- | --- | --- | --- |
| FODP nguồn viết tay | còn trong `presentation:class="notes"` | không có `<presentation:notes>` | còn |
| PPTX soffice | `ppt/notesSlides/notesSlide1.xml` `<p:notes>` + `ph type=body` + `<a:t>` đúng 2 dòng; rel `slide1.xml.rels` | **không** có `notesSlide2.xml`; rel slide2 **không** notesSlide | `notesSlide3.xml` + rel slide3 |
| FODP soffice (PPTX→FODP, đúng `main.py`) | `<presentation:notes>` trên `draw:page`, class=`notes`, `text:span`, còn `&amp;` | notes **placeholder rỗng** (`presentation:placeholder="true"`) | còn 1 đoạn |
| `parseFodp()` **trước** lọc class | đọc đúng 2 dòng; body/title không lẫn; slide 2 `notes=""` | rỗng | đúng |

Notes master (soffice FODP): 2 khối `<presentation:notes>` trên `style:master-page` với class header / date-time / footer / page-number (paragraph `&lt;number&gt;`). Nằm ngoài `draw:page` nên `parseFodp()` **không** biến thành slide. Per-page notes từ hop này **không** nhúng header/footer.

Kết luận đo:

- File PPTX soffice **là** Speaker Notes PowerPoint thật (`notesSlides` + relationship), không phải VN serialize.
- soffice **không** nuốt notes khi PPTX → FODP. Filter Impress giữ `<presentation:notes>`.
- `parseFodp()` **đã đọc đúng** nội dung ghi chú trên đường mở hiện tại. **Không** mất dữ liệu notes.
- Đây **không** phải giới hạn LibreOffice “PPTX notes không convert được”.
- Điểm yếu parser cũ: lấy mọi `<text:p>` trong notes page. `_paragraphsFromXml` đã special-case `"<number>"` — bằng chứng placeholder page-number từng rò. Nếu notes master bị inline (header/date/footer có chữ), notes panel sẽ lẫn. Sửa được trong adapter: chỉ lấy `presentation:class="notes"`.

---

## IMPLEMENTATION SUMMARY

Sửa hẹp trong adapter, **không** viết parser OOXML `notesSlides` (soffice FODP đã đủ):

1. `_parseNotesText()`: nếu có `presentation:class="notes"` thì chỉ lấy paragraph từ frame đó (`_frameParagraphsByClass`). Không có class thì fallback `_paragraphsFromXml` (ODF tối giản).
2. `parseFodp()` dùng helper này rồi strip `<presentation:notes>` trước khi parse title/body/shape — giữ hành vi chống lẫn body.

Không sửa Core LibreOffice. Không đụng canvas (panel đã bind `slide.notes` qua `selectSlide`). Không merge `main`.

---

## FILES CHANGED

- `adapters/libreoffice/slides/slides-adapter.js` — `_parseNotesText()` chỉ lấy class=`notes`
- `tests/fixtures/real-office-samples/src/sample-slides-notes.fodp` — ODF viết tay
- `tests/fixtures/real-office-samples/sample-slides-notes.pptx` — soffice FODP→PPTX, có `notesSlides`
- `tests/scripts/generate-real-office-fixtures.mjs` + README fixture
- `tests/scripts/probe-slides-speakernotes-import.mjs`
- `tests/unit/slides-speakernotes-import.test.js`
- `tests/live/slides-speakernotes-import-real-conversion.mjs`
- `tests/run-tests.js` — suite 75
- `docs/PLAN-SLIDES-SPEAKERNOTES-IMPORT-FIDELITY.md`
- `docs/FEATURE-PARITY-ROADMAP.md`
- `docs/HANDOFF-SLIDES-SPEAKERNOTES-IMPORT-FIDELITY.md`

Không đụng `apps/slides/slides-canvas.js`, `apps/writer/**`, `apps/sheet/**`, adapter Writer/Sheet, `main.py`.

---

## COMMANDS RUN

- `node tests/scripts/probe-slides-speakernotes-import.mjs` — PPTX có `notesSlide1.xml` + `notesSlide3.xml`; FODP còn notes; parse cũ đã đọc đúng
- `node --check adapters/libreoffice/slides/slides-adapter.js`
- `node tests/run-tests.js`
- `node tests/live/slides-speakernotes-import-real-conversion.mjs`
- `git diff --check`

## BUILD RESULT

PASS — repo không có bước build; `node --check` Slides adapter PASS.

## TEST RESULTS

| Suite | Result | Ghi chú |
| --- | --- | --- |
| `node tests/run-tests.js` | **PASS** 794/794, 0 FAIL, **57.70s** (< 60s) | Gồm suite 75 Speaker Notes import |
| Suite 75 Speaker Notes import | **PASS** 6/6 | PPTX native notesSlide; canned FODP; lọc header/footer; loadFromFodp panel; open(); VN serialize |
| `node tests/live/slides-speakernotes-import-real-conversion.mjs` | **PASS** | PPTX→FODP soffice: 3 slide, notes slide 1 hai dòng, slide 2 rỗng, slide 3 đúng; panel mock nhận notes |

Không claim PASS cho test chưa chạy. Không disable test. Không SendKeys.

Chưa mở WebView2/browser UI (không có browser tool trong session). Đã xác minh hợp đồng panel: `loadFromFodp` → `selectSlide(0)` → `notesTextarea.value = slide.notes` (canvas `selectSlide` dòng 2446–2448). Live soffice gán đúng chuỗi notes vào textarea mock.

## TRẢ LỜI CÂU HỎI GỐC (trung thực)

**VN Slides có đọc được Speaker Notes thật từ PowerPoint không?**

Có — trên đường mở hiện tại (PPTX → soffice FODP → `parseFodp` → panel).

| Mức | Trước task (đo được) | Sau task |
| --- | --- | --- |
| Mất trắng notes từ PPTX thật | Không — soffice giữ `presentation:notes`, parser đã đọc | Không |
| Text tiếng Việt nhiều đoạn + `&` | Đọc đúng | Giữ |
| Slide không notes | Rỗng, không bịa `notesSlide2` | Giữ |
| Không lẫn title/body | Đúng (strip notes trước body) | Giữ |
| Header/footer/date/page-number notes page | Per-page soffice hop không nhúng; parser cũ **sẽ** lẫn nếu inline | Chỉ lấy `presentation:class="notes"` |
| Panel Speaker Notes | `selectSlide` copy `slide.notes` | `loadFromFodp`/`open()` đẩy đúng notes slide 0 |
| Ghi OOXML `notesSlides` khi Lưu từ VN | Ngoài scope — serialize FODP rồi soffice PPTX (đã đo FODP nguồn → notesSlide) | Không đổi |

## KNOWN FAILURES

Không.

Giới hạn ngoài phạm vi:

- Không parse trực tiếp `ppt/notesSlides/*.xml` (không cần: FODP soffice còn notes).
- Notes master header/footer không hiện trên panel (đúng: đó không phải speaker notes).
- Chưa đo file PowerPoint 365 tạo bằng Microsoft PowerPoint trên máy khác; fixture là PPTX native do LibreOffice ghi từ ODF notes — cùng schema `p:notes` / `notesSlide` relationship.

## RISKS

Parser chỉ lấy class=`notes`. Nếu một bản soffice tương lai ghi notes body **không** có class đó, fallback `_paragraphsFromXml` vẫn chạy khi không có frame class=notes. Canned + live test khóa cấu trúc đo được 05/09/2026.

## DEPENDENCIES/BLOCKERS

Không. Fixture regenerate: `node tests/scripts/generate-real-office-fixtures.mjs`.

## CORE PATCH ID (if any)

Không. Không sửa LibreOffice Core.

## NEXT ACTION

Review trên branch `fix/slides-speakernotes-import-fidelity`. **Không merge `main`.** Có thể đo thêm một PPTX xuất từ Microsoft PowerPoint nếu có máy Office.
