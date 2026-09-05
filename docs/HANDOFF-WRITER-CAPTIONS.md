# Agent Handoff

TASK: VN Writer — Captions & Table of Figures (Chú thích ảnh)

AGENT/ROLE: Grok (implementation)

BRANCH: `feature/writer-captions`

WORKTREE: `E:\VNOffice-grok-writer-captions`

OBJECTIVE: Word's References tab Captions group — Insert Caption, Insert Table of Figures, Update Table of Figures — was confirmed completely missing from VN Writer (References already had Mục lục, Chú thích, Trích dẫn & Thư mục tài liệu).

KHÔNG merge vào main.

---

## Context / provenance

- Cross-reference/Bookmark in `apps/writer/insert-dialogs.js` was **read only** for dialog/pattern reference. File was not modified.
- Table of Contents (`insertTableOfContents` / `updateTableOfContents` / `_collectHeadings` / `_bindReferenceInteractions`) was reused as the architecture for Table of Figures: scan objects instead of headings, same auto list + jump link + Update button.
- Citations hidden-span metadata pattern (`VNO_CITATIONS_V1`) was reused after **measuring** soffice HTML↔DOCX, not assumed.

---

## Real ODF/DOCX measurement (not assumed)

Measured via live soffice conversion (`tests/live/writer-captions-real-conversion.mjs`).

HTML → DOCX → HTML:

| Content | Result |
|---|---|
| Visible caption text (`Hình 1: …`, `Bảng 1: …`) | **Survives** |
| Table of Figures visible title/entries (`DANH MỤC HÌNH`) | **Survives** |
| Caption `id` / anchor (`vno-cap-figure-demo-1`) | **Survives** |
| Hidden `VNO_CAPTIONS_META_V1:` document metadata span | **Survives** — same pattern as Citations |
| Hidden `VNO_TOF_V1:` marker inside the TOF block | **Survives** |
| Per-caption `VNO_CAPTION_V1:` marker nested inside the `<p>` | **Stripped** by soffice |
| `data-vno-caption` / `data-vno-tof` attributes | **Stripped** by soffice |

HTML → FODT (`OpenDocument Text Flat XML`) → HTML:

| Content | Result |
|---|---|
| Visible caption text | **Survives** |
| Table of Figures title | **Survives** |
| `data-vno-caption` attributes | **Stripped** |
| Nested per-caption `VNO_CAPTION_V1` marker | **Stripped** |

Bare `--convert-to fodt` without a filter name fails (`no export filter`). The helper now uses `fodt:OpenDocument Text Flat XML`.

Implication: after File→Save→Open through LibreOffice, visible numbering/text remains, and structured state is recovered from `VNO_CAPTIONS_META_V1` plus visible `Hình N:` / `Bảng N:` parse. Custom `data-vno-*` attributes are session-only.

---

## Implementation summary

- `apps/writer/captions.js` (new): kinds `figure` / `table` / `equation`; labels Hình / Bảng / Phương trình; format/parse visible text; serialize/parse markers + document metadata; Insert Caption and Insert Table of Figures dialogs (headless-safe).
- Ribbon group **Chú thích ảnh** on tab **Tham chiếu**, matching Mục lục style (three large buttons).
- `WriterAdapter`: `insertCaption`, `deleteCaption`, `renumberCaptions` (per-kind independent sequences), `insertTableOfFigures` / `updateTableOfFigures` / `deleteTableOfFigures`, click-to-jump like TOC, MutationObserver only on **caption node removal** (not on metadata writes).
- Caption DOM: `<p class="vno-caption" data-vno-caption="true" data-vno-caption-kind="…">` with label + number + editable text. Default position: figure/equation below, table above. If nothing is selected, insert at cursor.
- Table of Figures: `data-vno-tof` block, entries from captions in document order, estimated page + `href` jump, in-block Update/Delete like TOC. One TOF per kind (`figure` / `table` / `equation` / `all`).
- Undo/Redo reuses Writer snapshot stack. Hydrate is skipped while `_isUndoingRedoing` so restore does not wipe the redo branch.
- Commands added only as new `writer.*` rows in `command-definitions.js`. i18n VI/EN. Icons in `icons.js`.

UNO mapping in `adapters/libreoffice/common/command-dispatch-mapper.js` was **not** edited (out of listed scope / Core owner). Suggested handoff:

```
"writer.reference.captionInsert": ".uno:InsertCaption",
"writer.reference.tofInsert": ".uno:InsertMultiIndex",
"writer.reference.tofUpdate": ".uno:UpdateCurIndex",
```

No Sheet/Slides source was modified. `insert-dialogs.js` was not modified.

---

## Files changed

- `apps/writer/captions.js` (new)
- `apps/writer/writer-ribbon.js`
- `apps/writer/writer.css`
- `adapters/libreoffice/writer/writer-adapter.js`
- `platform/commands/command-definitions.js` (3 new `writer.reference.*` lines)
- `platform/i18n/strings-vi.js`, `platform/i18n/strings-en.js`
- `platform/ui-kit/icons.js`
- `tests/unit/writer-captions.test.js` (new)
- `tests/live/writer-captions.playwright.mjs` (new)
- `tests/live/writer-captions-real-conversion.mjs` (new)
- `tests/run-tests.js` (suite 87)
- `tests/helpers/soffice-convert.mjs` (`fodt` filter name)
- `docs/HANDOFF-WRITER-CAPTIONS.md` (this file)

---

## Commands run / test results

- `node tests/run-tests.js`: **915/915 PASS**, 0 FAIL, **54.95s** (< 60s). Suite 87: 9/9.
- `node tests/live/writer-captions.playwright.mjs`: **13/13 PASS** — real Edge, real ribbon clicks/typing (no SendKeys). Inserted 3 images + 3 Hình captions + 1 table caption, verified independent numbering, deleted the middle Hình and confirmed 1,2 remaining, inserted Table of Figures, click-jumped, Undo/Redo TOF, zero page errors.
- `node tests/live/writer-captions-real-conversion.mjs`: **measured** HTML→DOCX→HTML and HTML→FODT→HTML (see table above). Not assumed.

BUILD RESULT: N/A (JS suite, no compile step). Syntax check suite included in run-tests.js: PASS.

KNOWN FAILURES: none in the required suites.

---

## Known limitations

- LibreOffice HTML/DOCX/FODT round-trip strips `data-vno-*` attributes and nested per-caption markers. Recovery uses surviving visible text + `VNO_CAPTIONS_META_V1` / `VNO_TOF_V1`. After a round trip, TOF jump links work when caption `id` survived (measured: yes on the HTML→DOCX path).
- Page numbers in the Table of Figures are the same heuristic as TOC (`_estimateHeadingPage`), not a binary layout engine.
- Selecting a picture still switches VN Writer to the contextual Picture Format tab (pre-existing). Insert Caption lives on References — user must be on that tab (test re-selects it).
- Equation captions are implemented (third label) but were not the live-test focus; Figure and Table were.
- UNO map for the three new commands is not in `command-dispatch-mapper.js` (ownership). Desktop LibreOffice dispatch of those IDs will not hit `.uno:InsertCaption` until Core adds the three lines above.
- Captions are HTML paragraphs, not OOXML `SEQ` fields / ODF `text:sequence`. Word/LibreOffice will show the visible text after export; they will not treat them as native SEQ captions until a later Core/import pass.

CORE PATCH ID: none.

RISKS: metadata span is the structured round-trip path; if a future soffice HTML filter starts stripping hidden spans the way it already strips nested caption markers, hydrate falls back to parsing `Hình N:` / `Bảng N:` visible text.

DEPENDENCIES/BLOCKERS: none for this branch. Optional follow-up: Core UNO map; SEQ/text:sequence import from real DOCX/ODT.

NEXT ACTION: Review on `feature/writer-captions`. Do **not** merge into `main` from this worktree.
