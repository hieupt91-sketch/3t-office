# Agent Handoff

**TASK:** Writer save follow-ups: legacy `.doc` page drift and d09 shape anchors  
**AGENT/ROLE:** Codex  
**BRANCH:** `fix/writer-save-followups-codex`  
**WORKTREE:** `E:\VNOffice-codex-writer-save-followups`  
**OBJECTIVE:** Save legacy Word documents through the source-aware DOCX postprocessor and restore d09's four floating anchors to their source page.

## FINDINGS

- `legacy06.doc` opened at 3 pages in Word and in the Writer canvas, but direct HTML → Word 97 export saved it at 4 pages. The DOC export skipped the existing DOCX postprocessing route.
- d09's Rectangle 7, 21, 27, and 36 were all on page 8 in Word and moved to page 9 after save. LibreOffice collapsed some untouched bookmarks at the start of the document. The empty anchor paragraphs also lost source paragraph formatting during a later text-only formatting pass.
- Pre-implementation evidence and scope are recorded in `docs/HANDOFF-WRITER-SAVE-FOLLOWUPS-FINDINGS.md`.

## IMPLEMENTATION SUMMARY

- Writer `.doc` saves now convert HTML → DOCX, apply the existing source-aware Writer OOXML postprocessing, then convert DOCX → Word 97 `.doc`. Source `.doc` files are normalized to a temporary DOCX for that overlay. Both save-in-place and Save As use the route.
- Empty floating-anchor carriers now use paragraph offsets when the full gap between stable text boundaries has equal length, even when LibreOffice moved bookmarks. Source paragraph properties stay attached to those restored anchor carriers.
- No Sheet behavior, LibreOffice Core, dependency, or document-format semantics changed.

## FILES CHANGED

- `main.py`
- `adapters/libreoffice/common/ooxml_zip_patch.py`
- `tests/test_save_in_place.py`
- `tests/test_writer_anchor_passthrough.py`
- `docs/HANDOFF-WRITER-SAVE-FOLLOWUPS-FINDINGS.md`
- `docs/HANDOFF-WRITER-SAVE-FOLLOWUPS.md`

## COMMANDS RUN

- `node tests/run-tests.js` — **PASS**, 1851/1851, exit 0.
- `python -m unittest discover -s tests` — **PASS**, 378 tests.
- `git diff --check` — **PASS** before the implementation commits; final repository status is clean.
- `scripts/layout-audit/_batch_writer.py` on d01–d09 and d11–d24 — **PASS**, 23/23 opened, edited with `ZZ`, and saved; Word/canvas/saved page counts matched for all 23. All saved files contained `ZZ`.
- `scripts/layout-audit/_writer_shape_counts.py` on that DOCX batch — **PASS**, no file exceeded source shape/media counts; no duplicate `docPr` IDs.
- `scripts/layout-audit/_word_shape_pages.ps1` for d04/d06/d07/d09/d24 — **PASS**, 0 mismatches or missing anchors for each.
- Legacy `.doc` Save As batch for legacy01–08 — **PASS**, all opened, accepted `ZZ`, and matched Word/canvas/saved page counts (8/8). Word confirmed `ZZ` in all eight saved files.
- legacy06 `.doc` Ctrl+S on a profile-local copy — **PASS**, Word 3 pages and `ZZ` retained.
- legacy06 `.doc` Save As — **PASS**, Word 3 pages and `ZZ` retained.
- Focused d09 Word anchor comparison — **PASS**, Rectangle 7/21/27/36 all source page 8 → saved page 8; saved document remained 14 pages in the app/Save As batch.

## BUILD RESULT

**NOT RUN** — no build-system changes were made.

## KNOWN FAILURES

- None in the final Node/Python suites or listed document audits.
- An initial d09 real-file check before the final paragraph-formatting correction still showed the page drift; after the correction, the final check reported 0/4 anchor mismatches.

## RISKS

- The `.doc` export uses an extra LibreOffice conversion through an intermediate DOCX, so saving legacy `.doc` takes an additional conversion pass.

## DEPENDENCIES/BLOCKERS

- No new dependencies or blockers.

## CORE PATCH ID

None.

## COMMITS

- `fea8fa5` — `fix(writer): W-savefollow findings`
- `0495a2c` — `fix(writer): W-savefollow route legacy doc export`
- `89fb10e` — `fix(writer): W-savefollow restore d09 anchor slots`
- Final handoff commit follows.

## NEXT ACTION

Review this branch and merge it through the project's normal owner review. No merge or main-branch change was performed.
