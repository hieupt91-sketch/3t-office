# HANDOFF — G8 VN Slides basics vs PowerPoint 2016

## Task
Work package G8 (docs/BASELINE-CHECKLIST.md section D, items D1 and D3–D8; D2 / start state /
File dialogs belong to G7, printing to G9). Taken over from Grok (quota). Method: measure the real
app against PowerPoint 2016 (COM), fix each failure in the VN layer with a unit test that fails
before and passes after, re-measure.

## Branch
`fix/slides-basics-grok` (worktree `E:\VNOffice-grok-slides`, based on `e3d26dc`). Not merged, not pushed.

Commits:
- `107cc2b` test(slides): G8 audit harness — real app ops + PowerPoint 2016 COM readback
- `ff1e375` fix(slides): Save As *.ppt writes a real PowerPoint 97-2003 file
- `c46dee2` fix(slides): G8 basics match PowerPoint 2016 (slides, text box, z-order, show keys, notes, save fidelity)
- `174b5a0` docs(help): VN Slides help for G8 behaviour
- (this file) docs(handoff)

## Findings (measured, real app + PowerPoint COM)
1. **Ctrl+M** appended the new slide at the END (PowerPoint: right after the current slide) and filled it
   with prompt text as real content («Tiêu đề trang chiếu mới», two sample bullets) that was saved into the PPTX.
2. **Duplicate slide** renamed the copy «… (Bản sao)»; PowerPoint makes an identical copy.
3. **Insert > Text Box** did not insert a text box — it appended «• Khung văn bản mới bổ sung» to the body.
   Enter inside a text box ended editing (no multi-paragraph bullets/numbering possible).
4. **Font size** from the ribbon was stored as a CSS keyword (`xx-large`) → PowerPoint opened it as **1 pt**.
   The UI selection tint `rgba(254,242,242,.5)` was also copied into spans (would save as a pink highlight).
5. **Title/body formatting not saved**: LibreOffice ignores text properties of presentation styles
   (prTitle/prBody) on PPTX export, so every VN title opened in PowerPoint as Arial 44 pt black, centred,
   not bold, while the VN canvas shows theme font 24 pt bold theme colour left-aligned (body: 32 pt vs 15 pt).
6. **No z-order** (Bring Forward / Send Backward / Front / Back) anywhere in Slides.
7. **Insert Table** pre-filled the header row with «Cột 1», «Cột 2»… as real content.
8. **Drag / resize at zoom ≠ 100 %** moved the shape by screen pixels (at 80 % the shape lagged the mouse by 20 %).
9. **Rotated shapes** were saved/opened with the ODF `translate` (the rotated corner) taken as the unrotated
   top-left → PowerPoint position off by ~38 pt / 54 pt for a 30° shape; opened PowerPoint files were shifted too.
10. **Slide show**: ↓ / ↑ / Enter / Backspace / Home / End did nothing; **Page Down / Page Up were swallowed** by the
    editor shortcut `slides.nav.*`; the show injected «VN OFFICE» and «Tài liệu thuyết trình VN Office» when the
    master had no logo/footer.
11. **Speaker notes lost in PowerPoint**: the notes frame had no `presentation:style-name`, LibreOffice exported it
    as a blue text box on the notes page and PowerPoint's Notes pane was empty (model/VN round trip looked fine).
    The same loss hit notes of opened files saved back (real4.pptx slides 1, 3).
12. **Save As *.ppt** wrote a PPTX ZIP into the .ppt file (no "ppt" filter).
13. **Open → Save of real PowerPoint files** turned title/subtitle/body placeholders into plain text boxes
    (text kept, but PowerPoint lost the slide titles: outline, navigation, accessibility).
14. Empty title placeholders were saved as the fabricated text «Trang chiếu N».

## Table (PowerPoint / VN before / VN after)
Harness: `scripts/layout-audit/_slides_basic_ops.py` (real app, PowerPoint 2016 COM readback). Before = code at
`e3d26dc`, after = `174b5a0`. **Before 50/80 PASS, after 79/80 PASS.**

| item | check | PowerPoint (expected) | VN before | VN after | status |
|---|---|---|---|---|---|
| D1 | Ctrl+M adds a slide | 2 | 2 | 2 | PASS |
| D1 | Ctrl+M on slide 1 of 4 inserts at position 2 | 1 | 4 (FAIL) | 1 | PASS |
| D1 | new slide placeholders empty (no prompt text as content) | ''/'' | 'Tiêu đề trang chiếu mới'/'• Nhập nội dung…' (FAIL) | ''/'' | PASS |
| D1 | Delete key in thumbnail pane deletes slide | 4 | 4 | 4 | PASS |
| D1 | Duplicate keeps identical title | Doanh thu | Doanh thu (Bản sao) (FAIL) | Doanh thu | PASS |
| D1 | drag thumbnail 5 → 2 | …/Trống/… order | wrong title in model (FAIL) | correct | PASS |
| D1 | Layout dialog: Title / Two Content / Blank | two-content | two-content | two-content | PASS |
| D1 | empty new slide saved as EMPTY title placeholder | [] | prompt text saved (FAIL) | [] | PASS |
| D3 | Text Box inserts a text box object | True | False (FAIL) | True | PASS |
| D3 | title font / size 32 / red / centred (ribbon) | Arial/32/#FF0000/2 | Arial/**1**/#FF0000/2 (FAIL) | Arial/32/#FF0000/2 | PASS |
| D3 | bullets / bold in body | [1,1] / -1 | [1,1] / -1 | [1,1] / -1 | PASS |
| D3 | numbered list in text box | [2,2] | [] (FAIL) | [2,2] | PASS |
| D3 | text box right-aligned saved as own shape | 3 | None (FAIL) | 3 | PASS |
| D3 | title formatting PowerPoint == VN canvas | Segoe UI/24pt/bold/#1E3A8A/left | Arial/44pt/normal/#000000/center (FAIL) | same as canvas | PASS |
| D3 | body formatting PowerPoint == VN canvas | Segoe UI/15pt/#334155 | Arial/32pt/#000000 (FAIL) | same as canvas | PASS |
| D3 | no stray highlight fill | None | None | None | PASS |
| D4 | image + shape + table saved | True | True | True | PASS |
| D4 | table 2×3, cells start empty | ['A1','',…] | ['A1','Cột 2','Cột 3',…] (FAIL) | ['A1','',…] | PASS |
| D4 | move/resize with mouse at 80 % zoom → 150/120/240/90 pt | 150/120/240/90 | 97.6/162/222/90 (FAIL) | 150/120/240/90 | PASS |
| D4 | rotate 30° | 30 | 30 | 30 | PASS |
| D4 | align left (selection) | True | True | True | PASS |
| D4 | Bring Forward / Send Backward / Front / Back exist | True | False (FAIL) | True | PASS |
| D4 | Send to Back → shape bottom-most in PowerPoint | autoshape | picture (FAIL) | autoshape | PASS |
| D5 | 4:3 and 16:9 aspect ratio | 1.333 / 1.778 | same | same | PASS |
| D5 | physical size = PowerPoint 2016 presets | 720×540 / 960×540 pt | 540×405 / 720×405 (FAIL) | 540×405 / 720×405 | **FAIL (known, not fixed)** |
| D5 | slide background colour | #FFF2CC | #FFF2CC | #FFF2CC | PASS |
| D6 | F5 from slide 1 / Shift+F5 from current | 0 / 2 | 0 / 2 | 0 / 2 | PASS |
| D6 | → ↓ ← ↑ | 1,2,1,0 | 1,**1**,0,0 (FAIL) | 1,2,1,0 | PASS |
| D6 | Page Down in show (editor slide unchanged) | 1/2 | 0/2 (FAIL) | 1/2 | PASS |
| D6 | Esc closes show | closed | closed | closed | PASS |
| D6 | no injected VN branding in show | '' | VN OFFICE / Tài liệu thuyết trình VN Office (FAIL) | '' | PASS |
| D6 | fade transition saved (EntryEffect ≠ 0) | True | True | True | PASS |
| D7 | speaker notes in PowerPoint Notes pane | 2 slides with notes | all empty (FAIL) | correct | PASS |
| D8 | pptx: slide count / titles / shape counts | 5 / titles / [1,2,2,2,3] | 5 / «(Bản sao)» / [1,1,2,2,3] (FAIL) | match | PASS |
| D8 | pdf export page count | 5 | 5 | 5 | PASS |
| D8 | Save As .ppt is PowerPoint 97-2003 binary; PowerPoint opens 5 slides | ole2 / 5 | zip(pptx) / 5 (FAIL) | ole2 / 5 | PASS |
| REAL ×4 | open: slide count + title text per slide (real1 10, real2 17, real3 2, real4 3 slides) | PowerPoint values | match | match | PASS |
| REAL ×4 | save back: slide count, title text present, shape count per slide | original | match | match | PASS |
| REAL ×4 | save back: title stays in TITLE placeholder | [] | real1 [1,3,4,7], real2 [1,7,8,11,14], real3 [1], real4 [1,2,3] (FAIL) | [] | PASS |
| REAL real4 | save back: speaker notes | [] | slides [1,3] lost (FAIL) | [] | PASS |

Full 80-row machine report: produced by the harness as `_slides_basic_ops_report.md` in the chosen out dir.
Real files used (copied into the git-ignored `file test\slides\`, never committed): `E:\VN OFice\file test\sample-3.pptx`
(real1), `…\lan\BÁO CÁO KẾT QUẢ KINH DOANH NĂM 2021.pptx` (real2), `tests\fixtures\real-office-samples\sample-slides.pptx`
(real3), `sample-slides-notes.pptx` (real4). Only two real .pptx exist under `E:\VN OFice\file test`; the fifth candidate
(`sample-slides-smartart.pptx` fixture) is rejected by PowerPoint itself (COM E_FAIL) and was dropped.

## Files changed
- `apps/slides/slides-canvas.js` — addNewSlide after current + empty placeholders; duplicate keeps title; empty body2;
  `insertTextBox()`; text box Enter = new paragraph, multi-paragraph text kept; empty table cells;
  `reorderSelectedShapes()` + undo/redo `shape-order` + context-menu items; `_pointerScale()` used by drag/resize;
  slide show / presenter keys, shortcut scope suspended during show, no branding fallback.
- `adapters/libreoffice/slides/slides-adapter.js` — text.insert → text box; z-order dispatch; font size in pt
  (`_ribbonFontSizeToPt`, `_applyFontSizePt`, `_cssFontSizeToOdf`); ignore translucent bg, explicit un-bold;
  theme text base format on title/body (`_themeTextBase`, `_plainParagraphsWithBase`); empty title stays empty;
  notes placeholder `prNotes` + page thumbnail; rotated-shape translate ↔ unrotated position both directions;
  opened placeholders keep `presentation:class` on save.
- `adapters/libreoffice/common/command-dispatch-mapper.js` — `.uno:Forward/Backward/BringToFront/SendToBack`.
- `platform/commands/command-definitions.js`, `platform/i18n/strings-{vi,en}.js`, `platform/ui-kit/icons.js` — 4 z-order commands + icons.
- `platform/commands/shortcut-manager.js` — additive `getActiveScope()`.
- `apps/slides/slides-ribbon.js` — 4 z-order items added to the existing Sắp xếp dropdown (only ribbon change; needed for D4).
- `main.py` — `FORMAT_FILTERS["ppt"] = "MS PowerPoint 97"` (one line; G7 separately adds the .ppt entry to the Save dialog list).
- `platform/help/entries-slides.js` — Vietnamese help for new/changed behaviour.
- Tests: new `tests/unit/slides-basics-g8.test.js` (17 tests; 0/17 on old code, 17/17 now), new
  `tests/test_slides_ppt_save_format.py` (3 tests), registered in `tests/run-tests.js`. Updated tests that encoded
  the old behaviour: `adapter-mapping` (text.insert), `slides-animations-notes` + `slides-layouts` (new slide index is
  current+1, body2 ""), `slides-font-paragraph` (fontSize marker "7" → pt), `slides-rotated-shape-position`
  (expected x/y now the PPTX `a:off` recorded in that test's own fixture comment: 1000000 EMU → 105 px, 1500000/800000 →
  157/84 px, instead of the ODF translate).
- Harness: `scripts/layout-audit/_slides_basic_ops.py`, `_slides_ops_helpers.js`, `_pptx_readback.ps1`.

## Commands run
```
$env:LOCALAPPDATA='E:\VNOffice-profiles\claude-slides'
python scripts\layout-audit\_slides_basic_ops.py E:\VNOffice-grok-slides <out> --real "file test\slides\real1.pptx" ... real4.pptx
python scripts\layout-audit\_slides_basic_ops.py <git-archive copy of e3d26dc> <out> --real ...   (before column)
node tests/run-tests.js
python -m unittest discover -s tests
node <runner> tests/unit/slides-basics-g8.test.js   (against the fixed tree and a git-archive copy of e3d26dc)
```

## Test results
- `node tests/run-tests.js` → **PASS**: `KẾT QUẢ KIỂM THỬ: 2077/2077 PASS | 0 FAIL` (final state).
  An earlier run in this session had 2 soffice-based Sheet tests fail with `EBUSY … unlink` / convert failure under
  load (unrelated to Slides); they passed in the following full runs without any change.
- `python -m unittest discover -s tests` → **PASS**: `Ran 455 tests in 502.861s` / `OK`.
- `slides-basics-g8.test.js` → 17/17 PASS on the branch; 0/17 on `e3d26dc` (proves each test fails before the fix).
- Real-app harness → **PASS 79/80, FAIL 1** (D5 physical slide size, below). Before: 50/80.
- Playwright/live tests under `tests/live` → **NOT RUN** (not part of the two gates).

## Known failures / gaps
- **D5 physical slide size (FAIL, not fixed):** new VN decks are 960×540 px = 10×5.625 in (16:9) and 720×540 px =
  7.5×5.625 in (4:3); PowerPoint 2016 presets are 13.333×7.5 in and 10×7.5 in. Aspect ratios are correct and PowerPoint
  opens/scales them fine, but its Slide Size dialog shows «Custom». Fixing needs a document-wide unit change for
  VN-authored decks (1 canvas px = 1 pt instead of 0.75 pt: shapes, frames, font sizes, slide-size tests) — proposal
  for a follow-up, not done here to avoid a wide risky change.
- Theme text base: title/body text of VN-authored slides is now written with explicit span formatting (what the canvas
  shows). Opened (imported) files are untouched. PowerPoint "Reset slide" would not restore master formatting on those
  runs — acceptable trade-off for WYSIWYG, noted.
- Prompt text on the very first slide / blank presentation state is G7's (fix/file-basics-clean-start-codex); this branch
  only makes Ctrl+M / layout changes / tables not create prompt text. The harness emulates G7's clean master (no logo/footer).
- Merge notes: G7 also edits `slides-adapter.js` (save/open), `slides-canvas.js` (constructor/resetToBlank),
  `entries-slides.js` (new first entry), `main.py` (dialog lists). Hunks do not overlap with this branch as of 30/09
  (checked read-only); agy's ribbon rework may touch `slides-ribbon.js` — this branch only adds 4 items inside the
  existing `slides.drawing.arrange` dropdown.

## Next action
1. Lead review; merge after G7 (expect trivial conflicts only).
2. After merging G7, rerun `_slides_basic_ops.py` once (the harness does not depend on the start state).
3. Decide on the D5 physical-size follow-up (unit change) if PowerPoint «Custom» size matters to users.
