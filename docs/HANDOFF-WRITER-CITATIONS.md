# Agent Handoff

TASK: VN Writer — Citations & Bibliography (Trích dẫn & Thư mục tài liệu)

AGENT/ROLE: Codex (implementation), finished and independently verified by Claude after Codex hit its usage quota mid-task (~90% done, uncommitted).

BRANCH: `feature/writer-citations-v2`

WORKTREE: `E:\VNOffice-codex-writer-citations`

OBJECTIVE: Word's References tab Citations & Bibliography group — was confirmed completely missing from VN Writer's References tab (which only had Table of Contents and Footnotes groups).

---

## Context / provenance

An earlier worktree (`E:\VNOffice-agy-citations`, branch `feature/writer-citations`) had substantial uncommitted work from a prior agy session but was found to **hang indefinitely** when tested (a broken fake-DOM click simulation in its test file) and was never committed. That work was **not reused** — only read for feature-scope ideas (source types, data shape), per the task brief. This is a fresh implementation.

Codex built the real implementation (dialogs, adapter wiring, ribbon, i18n, icons — all genuinely solid, well-structured code) but hit an OpenAI usage quota mid-task with everything uncommitted and no tests/handoff yet. Rather than leave it idle for the ~3-hour quota reset window, Claude picked up the work directly: wrote the real soffice round-trip probe, unit tests, live Playwright test, found and fixed 4 real bugs surfaced by those tests (below), and completed the handoff/commit/merge cycle.

---

## Real ODF/DOCX measurement (not assumed)

Citation state (style + source list) is persisted as a single hidden, non-editable `<span data-vno-citation-metadata="true" style="display:none">VNO_CITATIONS_V1:<url-encoded JSON></span>` embedded directly in the body content — the same "hidden span carries structured state" pattern already proven for other Writer features.

Measured via a live 2-hop soffice HTML→DOCX→HTML round trip (`tests/live/writer-citations-real-conversion.mjs`):

| Content | Result |
|---|---|
| In-text citation field visible text, e.g. "(Nguyễn, 2022)" | **Survives** |
| Bibliography section visible text/structure | **Survives** |
| Hidden `VNO_CITATIONS_V1:` metadata (full source list + style) | **Survives** — `parseCitationMetadata()` recovers the exact original data after the round trip |

This is better fidelity than assumed going in — no custom `vno:` DOCX/XML attribute was needed; a plain hidden `<span>` with encoded text content survives LibreOffice's own HTML↔DOCX bridge intact.

---

## Implementation summary

- `apps/writer/citations.js` (new): pure formatting/data functions (`normalizeSource`, `authorSortKey`, `formatInTextCitation`, `formatBibliographyEntry`, `serializeCitationMetadata`/`parseCitationMetadata`) plus three dialogs (`showSourceEditorDialog`, `showInsertCitationDialog`, `showSourceManagerDialog`), each with a headless-safe early-resolve guard (`typeof document === "undefined" || !document.body`) so unit tests never hang waiting on a real click.
- Two citation styles: **APA** (`(Họ, Năm)`) and **MLA** (`(Họ)`), both fully implemented (not one full + one stub).
- New ribbon group "Trích dẫn & Thư mục tài liệu" on the **Tham chiếu** (References) tab: citation-style `<select>`, Manage Sources, Insert Citation, Bibliography — reusing the existing `select`/`row`/`column` ribbon item types already supported by `ribbon-host.js` (no new ribbon renderer code needed).
- `WriterAdapter` additions: `citationStyle`/`citationSources` instance state; `insertCitation`/`addOrUpdateCitationSource`/`setCitationStyle`/`openInsertCitationDialog`/`openSourceManagerDialog`/`insertBibliography`/`_hydrateCitationsFromDom`/`_syncCitationMetadata`/`_refreshCitationFields`.
- A citation field is a `<span class="vno-citation-field" data-vno-citation-source-id="…" contenteditable="false">` — not directly editable, matching Word's citation-field behavior.
- Bibliography lists **only** sources actually cited in the document (via `_usedCitationSourceIds()` scanning for citation fields), sorted by author using a Vietnamese-locale-aware `localeCompare`.
- Undo/Redo reuses Writer's existing whole-document snapshot mechanism (`recordSnapshot`/`_createSnapshot`/`_restoreSnapshot`) — no parallel history stack.

---

## Bugs found and fixed during independent verification (all real, all confirmed via failing tests before the fix)

1. **`authorShort()` used Western name order.** Took the *last* word of the author string as the citation short-name (correct for "First Last" Western order, e.g. "Smith"), but Vietnamese names are Family-Middle-Given (e.g. "Nguyễn Văn A" — family name **first**). Fixed to take the *first* word. This is a VN-Office-specific correctness bug that a Western-market fork of this logic would never surface.
2. **`existing.outerHTML = html` crashed in the standard test-fixture convention.** `_syncCitationMetadata()` used the `outerHTML` setter to replace the metadata span in place. Real browsers support this, but it's an unusual DOM API this codebase's established FakeElement test fixtures (copied across many `tests/unit/writer-*.test.js` files) don't implement (only a getter). Fixed to `remove()` + re-`insertAdjacentHTML()`/`innerHTML` fallback — semantically equivalent (the span's exact position doesn't matter, it's `display:none`), and consistent with the rest of the codebase's DOM-mutation conventions.
3. **Undo required two presses to remove one inserted citation (non-atomic).** `insertCitation()` called `addOrUpdateCitationSource()` (which recorded its own undo snapshot) and then, after building the field span, called `this.flushTyping()` again — which detected the metadata-span mutation `addOrUpdateCitationSource` had just made and silently committed *that* as a second, separate snapshot before the field-insertion's own final `recordSnapshot()`. Net effect: one "Insert Citation" user action created two undo-stack entries. Fixed with an explicit `recordHistory` flag on `addOrUpdateCitationSource(source, recordHistory = true)`, set to `false` when called internally from `insertCitation()`, plus removing the now-redundant second `flushTyping()` call. Confirmed atomic (one Undo removes the whole citation) both in the unit test and live in a real browser.
4. **`openInsertCitationDialog`/`openSourceManagerDialog` crashed (`Cannot read properties of null`) when invoked from a plain ribbon button click.** `globalCommandBus.execute(commandId)` defaults its `args` parameter to `null` (not `undefined`) when no argument is passed — so the handlers' own `options = {}` default parameter never applied (JS default parameters only kick in for `undefined`), and `options.source`/`options.sources` threw on the literal `null`. This is the established codebase convention already handled elsewhere via `options = options || {};` (e.g. `openMailMergeDataSourceDialog`) — applied the same fix here. Caught only by the **live** Playwright test clicking the real ribbon button; the unit tests happened to always pass an explicit options object and never exercised the plain-click path.

Also fixed a **test-isolation issue** (not a product bug): `tests/run-tests.js` runs every suite in one Node process, and some other suite apparently leaves `globalThis.document` set without restoring it in every code path. Added an explicit save/clear/restore of `globalThis.document` around `runWriterCitationsTests()` so this suite is immune to whatever another suite leaves behind.

---

## Files changed

- `apps/writer/citations.js` (new)
- `adapters/libreoffice/writer/writer-adapter.js`
- `apps/writer/writer-ribbon.js`
- `apps/writer/writer.css`
- `platform/commands/command-definitions.js`
- `platform/i18n/strings-en.js`, `platform/i18n/strings-vi.js`
- `platform/ui-kit/icons.js`
- `tests/unit/writer-citations.test.js` (new)
- `tests/live/writer-citations.playwright.mjs` (new)
- `tests/live/writer-citations-real-conversion.mjs` (new)
- `tests/run-tests.js`
- `docs/PLAN-WRITER-CITATIONS.md` was not produced separately; plan/findings folded into this handoff since Claude completed the task directly.

No Sheet/Slides files touched.

---

## Test results

- `node tests/run-tests.js`: **896/896 PASS**, 0 FAIL (suite 85, 12/12).
- `node tests/live/writer-citations.playwright.mjs`: **10/10 PASS** — real Edge, real clicks/typing (no SendKeys), covers dialog flow, field text, atomic Undo/Redo, Bibliography content, live style switch, zero JS console errors.
- `node tests/live/writer-citations-real-conversion.mjs`: **PASS** — real soffice HTML→DOCX→HTML round trip, all three fidelity claims measured (see table above), not assumed.

KNOWN LIMITATIONS:
- Only APA and MLA styles implemented (not Chicago or others) — both are complete, not one full + one stub.
- Deleting a source that is currently cited (via Manage Sources) removes it from the source list but currently orphans the citation field's `data-vno-citation-source-id` link rather than converting it to frozen plain text or blocking the deletion — acceptable for this task's scope but worth a follow-up if it becomes a real user complaint.

NEXT ACTION: Ready to merge into `main`.
