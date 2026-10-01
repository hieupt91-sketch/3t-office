# 3T Doc basic acceptance audit

**Date:** 2026-10-01  
**Branch:** `audit/doc-basics-codex`  
**Scope:** `docs/BASELINE-CHECKLIST.md`, section A and B1–B12. Slides are deferred by owner priority.

## Method

Acceptance actions ran in the desktop app started by `main.py` with pywebview, using the same UI/ribbon/keyboard event path as `scripts/test_g7_file_basics.py`. Temporary documents, profiles, and exports stayed under `E:\tmp\doc-basics-audit`; no company document was added to this repository. Word COM opened disposable audit DOCX files read-only. COM calls were sequential and retried when Word returned `RPC_E_CALL_REJECTED`; the audit did not close or terminate pre-existing Office processes.

The WebView probe used UI clicks and keyboard events, not physical input devices. The Vietnamese composition case simulates a Telex-style composition event and checks NFC/caret position; it does not run the Unikey IME itself. A `PASS` below means the desktop UI result was observed. `FAIL` means the action ran and exposed a product gap. `NOT RUN` means no trustworthy result was obtained. `BLOCKED` means an external condition prevented the check. Unit tests are supporting evidence and do not substitute for a desktop result.

Evidence files are temporary unless a repository path is shown:

- `E:\tmp\doc-basics-audit\g7\g7-file-basics-report-writer.json` — G7 desktop file/open/save/print/close audit, including its serial Word page oracle.
- `E:\tmp\doc-basics-audit\desktop-acceptance.json` — pywebview UI acceptance probe and first DOCX round trip.
- `E:\tmp\doc-basics-audit\targeted-ui.json` — clean follow-up for paragraph indents/spacing and inserted objects.
- `E:\tmp\doc-basics-audit\desktop-fix-verification.json` — desktop verification of fixes made in this task.
- `E:\tmp\doc-basics-audit\word-roundtrip.json` — Word COM inspection of a disposable DOCX. This reports 1 page, A4 portrait, PAGE/NUMPAGES fields, but 0 comments and 0 revisions.

## Acceptance results

| Item | Sub-point | Status | Evidence |
|---|---|---|---|
| A1 | Starts with an empty document | PASS | G7 `blank`: empty body, one page. |
| A1 | 3T Doc startup name/title | PASS | G7 `blank`: tab/title `Tài liệu 1.docx — 3T Doc`. |
| A2 | Ctrl+N opens a blank document | PASS | G7 `new`: body empty after Ctrl+N. |
| A2 | New-document name increments | PASS | G7 names `Tài liệu 1.docx`, then `Tài liệu 2.docx`. |
| A3 | Ctrl+O opens the file dialog | PASS | G7 `openDialogCancel`, `openFilter`. |
| A3 | Open dialog format filters | PASS | G7 `openFilter` covered Writer-supported formats. |
| A3 | Corrupt file shows a clear error | PASS | G7 `badOpen.message` showed an invalid/corrupt Office package error. |
| A3 | Failed open keeps the active document | PASS | G7 `badOpenKeepsCurrent` true. |
| A4 | Ctrl+S on a new document opens Save As | PASS | G7 `newCtrlSOpensSaveAs` true. |
| A4 | Existing document saves in its source format | PASS | G7 `saveInPlace`, `saveAsCurrentFormatFirst`, and reopen checks true. |
| A5 | F12 opens Save As | PASS | G7 triggered F12. |
| A5 | Save As format list / alternate export | PASS | G7 exercised DOC/DOCX/ODT/RTF/TXT/PDF filters and alternate-format export. |
| A5 | Overwrite confirmation | NOT RUN | Existing Writer file was not replaced in the G7 run. |
| A6 | Dirty close → Save | PASS | G7 `dirtyCloseSave` and saved-content verification true. |
| A6 | Dirty close → Discard | PASS | G7 `dirtyCloseDiscard` true. |
| A6 | Dirty close → Cancel | PASS | G7 `dirtyCloseCancel` true. |
| A7 | Ctrl+P opens print preview | PASS | G7 opened preview; page count matched. |
| A7 | Printer selection | PASS | G7 used Microsoft Print to PDF. |
| A7 | Number of copies | PASS | G7 print dialog exposed the copies control. |
| A7 | Page range | PASS | G7 print dialog exposed range and All pages options. |
| A7 | PDF print/export page count | PASS | Blank produced 1 page; the test document produced 3 pages. |
| A8 | Ctrl+Z undo | PASS | Desktop removed the bold edit and restored the original markup. |
| A8 | Ctrl+Y redo | PASS | Desktop restored the bold markup after undo. |
| A9 | Ctrl+X / ribbon Cut | NOT RUN | No reliable desktop clipboard result was captured. |
| A9 | Ctrl+C / ribbon Copy | NOT RUN | No reliable desktop clipboard result was captured. |
| A9 | Ctrl+V / ribbon Paste | NOT RUN | No reliable desktop clipboard result was captured. |
| A9 | Paste retaining formatting | NOT RUN | Not exercised in the desktop app. |
| A9 | Paste plain text | NOT RUN | Not exercised in the desktop app. |
| A9 | Paste from Word or Excel | NOT RUN | External Office clipboard source was not tested. |
| A10 | Ctrl+F find | NOT RUN | No reliable find result was captured. |
| A10 | Ctrl+H replace | NOT RUN | No reliable replace result was captured. |
| A11 | Zoom slider | PASS | Desktop probe changed the slider from 100% to 125%. |
| A11 | Ctrl+mouse-wheel zoom | PASS | After the fix, Ctrl+wheel changed controller/page/slider from 100% to 110% and prevented browser zoom. |
| A12 | App-wide 100% Vietnamese strings | NOT RUN | The probe checked key tabs/status, not every ribbon label and dialog. |
| A12 | Standard ribbon tabs | PASS | Desktop probe listed Trang đầu, Chèn, Bố cục, Đánh giá, Chế độ xem, Trợ giúp, and other Writer tabs. |
| A12 | Status bar | PASS | Desktop showed word count and `Trang 1 / 1`. |
| A12 | Alt ribbon key tips | PASS | Desktop rendered Alt key-tip badges. |
| A13 | F1 opens Vietnamese Help | PASS | F1 opened the Help panel. |
| A13 | Contextual F1 article | PASS | After the fix, focused Theo dõi thay đổi + F1 opened the matching Vietnamese article. |
| A14 | AutoSave / recovery while running | NOT RUN | Unit coverage was not used as desktop acceptance evidence. |
| A14 | Recover after restart | NOT RUN | Not exercised in a desktop restart/reopen scenario. |
| B1 | Telex-style composition | PASS | Simulated composition produced `áb`; NFC and caret offset 2 were verified. |
| B1 | VNI input | NOT RUN | VNI composition was not simulated. |
| B1 | Precomposed Unicode / no lost diacritics / caret stability | PASS | Desktop composition simulation remained NFC-normalized and did not move the caret. The OS Unikey engine itself was not run. |
| B2 | Font family | PASS | Desktop applied Arial to the selected text. |
| B2 | Font size, including 13.5 pt | PASS | New 13.5 pt option applied; DOM recorded `font-size: 13.5pt`. |
| B2 | Bold by mouse | PASS | Desktop recorded bold weight 700. |
| B2 | Italic by mouse | PASS | Desktop recorded italic style. |
| B2 | Underline by mouse | PASS | Desktop recorded underline decoration. |
| B2 | Ctrl+B / Ctrl+I / Ctrl+U | PASS | Desktop recorded bold, italic, and underline after each shortcut. Initial result parser misread CSS bold weight; the DOM evidence is correct. |
| B2 | Font colour | PASS | Desktop recorded red text colour. |
| B2 | Highlight | PASS | Desktop recorded yellow highlight. |
| B2 | Superscript | PASS | Desktop recorded a `<sup>` selection. |
| B2 | Subscript | PASS | Desktop recorded a `<sub>` selection. |
| B2 | Ctrl+Shift+> / Ctrl+Shift+< | PASS | Desktop size changed 18.67→20→18 CSS px. |
| B3 | Left alignment: ribbon and Ctrl+L | PASS | Desktop recorded `left` through both paths. |
| B3 | Center alignment: ribbon and Ctrl+E | PASS | Desktop recorded `center` through both paths. |
| B3 | Right alignment: ribbon and Ctrl+R | PASS | Desktop recorded `right` through both paths. |
| B3 | Justify: ribbon and Ctrl+J | PASS | Desktop recorded `justify` through both paths. |
| B3 | Increase/decrease paragraph indent | PASS | Clean desktop probe increased then restored indent (`targeted-ui.json`). |
| B3 | First-line indent | PASS | New Layout control applied 14.17 pt in pywebview. |
| B3 | Line spacing 1.0 | NOT RUN | First probe read a stale paragraph node; corrected desktop result pending. |
| B3 | Line spacing 1.15 | PASS | Desktop dropdown applied `--vno-lh: 1.15`. |
| B3 | Line spacing 1.5 | NOT RUN | First probe read a stale paragraph node; corrected desktop result pending. |
| B3 | Line spacing 2.0 | PASS | Clean desktop probe applied `--vno-lh: 2`. |
| B3 | Exact line spacing | PASS | Desktop prompt applied exact 18 pt line height. |
| B3 | Paragraph spacing before | PASS | Clean desktop probe applied 12 pt before. |
| B3 | Paragraph spacing after | PASS | Clean desktop probe applied 6 pt after. |
| B4 | Bulleted list | NOT RUN | Not exercised in the desktop acceptance probe. |
| B4 | Number formats 1., a), i. | PASS | Desktop multilevel preset showed and applied the `1. / a. / i.` scheme. |
| B4 | Multilevel list | PASS | Desktop produced nested and multilevel list markup. |
| B4 | Tab changes list level | PASS | Desktop Tab nested the selected numbered item. |
| B4 | Shift+Tab changes list level back | PASS | Desktop Shift+Tab restored the prior level. |
| B4 | Continue/restart numbering | FAIL | No visible continue/restart command was found in the Writer List ribbon. |
| B5 | Normal style | NOT RUN | Normal was visible in the gallery but was not explicitly applied to a selected paragraph. |
| B5 | Heading 1 | PASS | Desktop applied Heading 1; the automatic TOC linked to it. |
| B5 | Heading 2 | NOT RUN | Heading 2 was visible in the gallery but was not applied to a selected paragraph. |
| B5 | Heading 3 | NOT RUN | Heading 3 was visible in the gallery but was not applied to a selected paragraph. |
| B5 | Title | PASS | Added Title preset; desktop applied centered, bold 26 pt visual formatting. DOCX semantic style-name check is pending. |
| B5 | Automatic TOC from Heading | PASS | Desktop inserted a linked TOC entry for Heading 1 text. |
| B6 | Insert table | PASS | Desktop inserted a 3×4 table. |
| B6 | Add row | FAIL | No row-edit command was exposed in the tested table UI. |
| B6 | Delete row | FAIL | No row-edit command was exposed in the tested table UI. |
| B6 | Add column | FAIL | No column-edit command was exposed in the tested table UI. |
| B6 | Delete column | FAIL | No column-edit command was exposed in the tested table UI. |
| B6 | Merge cells | FAIL | No merge control was exposed in the tested table UI. |
| B6 | Split cells | FAIL | No split control was exposed in the tested table UI. |
| B6 | Table borders | FAIL | No table border-edit control was exposed in the tested table UI. |
| B6 | Column width | FAIL | No table column-width control was exposed in the tested table UI. |
| B6 | Repeat header row | FAIL | No repeat-header control was exposed in the tested table UI. |
| B6 | Tab in final cell appends row | FAIL | Desktop table remained 3 rows after Tab in the final cell. |
| B7 | A4 page size | NOT RUN | Dialog option was observed; apply/save/reopen result pending. |
| B7 | Letter page size | NOT RUN | Dialog option was observed; apply/save/reopen result pending. |
| B7 | Margins | NOT RUN | Margin inputs were observed; apply/save/reopen result pending. |
| B7 | Portrait orientation | NOT RUN | Dialog option was observed; apply/save/reopen result pending. |
| B7 | Landscape orientation | NOT RUN | Dialog option was observed; apply/save/reopen result pending. |
| B7 | Ctrl+Enter page break | PASS | Desktop inserted one page-break marker. |
| B7 | Section break | NOT RUN | Excluded because another agent is changing section breaks. |
| B8 | Header | PASS | Desktop inserted header content; Word COM round trip retained its text. |
| B8 | Footer | PASS | Desktop inserted footer content; Word COM round trip retained its text. |
| B8 | PAGE / NUMPAGES fields | PASS | Desktop inserted both; Word COM saw two footer fields. |
| B8 | Different first page | FAIL | No different-first-page control was available in Header/Footer UI. |
| B9 | Insert image | NOT RUN | Native file-picker insertion was not completed by the WebView harness. |
| B9 | Drag/drop image | NOT RUN | Not exercised in the desktop app. |
| B9 | Resize image | NOT RUN | Not exercised in the desktop app. |
| B9 | Text wrapping around image | NOT RUN | Not exercised in the desktop app. |
| B9 | Insert shape | PASS | Clean desktop probe inserted a rectangle shape in the Writer canvas. |
| B9 | Insert text box | PASS | Clean desktop probe created a textbox shape with its own geometry and text. |
| B9 | Insert symbol | PASS | Desktop picker inserted a selected symbol. |
| B9 | Insert hyperlink | PASS | Desktop applied the entered URL to selected text. |
| B10 | Horizontal ruler | PASS | Desktop Writer canvas rendered the horizontal ruler. |
| B10 | Vertical ruler | FAIL | No vertical ruler rendered in the desktop canvas. |
| B10 | Print Layout | PASS | Desktop command entered Print Layout. |
| B10 | Word count in status bar | PASS | Desktop status showed word count. |
| B10 | Page count in status bar | PASS | Desktop status showed `Trang 1 / 1`. |
| B10 | Zoom slider | PASS | Desktop slider changed from 100% to 125%. |
| B10 | Ctrl+wheel zoom | PASS | Fixed desktop result synchronized controller/page/slider at 110%. |
| B11 | Vietnamese misspelling red underline | PASS | `chínnh` was underlined in the desktop app. |
| B11 | Vietnamese correction suggestion | PASS | Context suggestion included `chính`. |
| B12 | Track Changes UI | PASS | Desktop enabled tracking and rendered inserted text with review markup. |
| B12 | Comment UI | PASS | Desktop showed comment card and anchor. |
| B12 | Track Changes/comment survive DOCX reopen in Word and 3T Doc | FAIL | Word COM reported 0 revisions and 0 comments; 3T reopen rendered an insertion/deletion differently from Word. Page count was 1. This crosses the excluded DOCX save pipeline. |

## Larger gaps and follow-up tasks

| Priority | Symptom | Word behavior | Likely code location | Task / scope |
|---|---|---|---|---|
| High | Continue/restart numbering is absent. | Continue the prior list or restart at 1 from the list context menu/ribbon. | `apps/writer/writer-ribbon.js`, Writer list commands/adapter. | Add visible, keyboard-usable continue/restart commands; preserve list identity and restart values on DOCX round trip; test undo. |
| High | Table UI only inserts a table; edit operations are missing, and Tab in the last cell does not append a row. | Table Layout exposes row/column insert/delete, merge/split, borders/width and repeat-header; Tab in the last cell creates a row. | `apps/writer/writer-ribbon.js`, Writer table command handlers/adapter. | Implement the contextual table UI and verify each operation plus Undo and DOCX reopen. |
| High | Review markup/comment UI is not retained by Word after DOCX save. | Word shows inserted/deleted revisions and comment anchors after save and reopen. | `adapters/libreoffice/common/ooxml_zip_patch.py` and Writer save/export path. | Trace loss across export/import, retain comments/revisions through a DOCX round trip, and verify with Word COM. Core save-pipeline changes were excluded from this task. |
| Medium | No different-first-page header/footer option. | First page can have distinct header/footer content from later pages. | Writer header/footer UI, model, and DOCX serialization. | Add the option and round-trip verification; include page-number behavior on first/subsequent pages. |
| Medium | Vertical ruler is absent. | View > Ruler shows a vertical ruler in Print Layout. | Writer view controller and Writer canvas/layout CSS. | Add a vertical ruler toggle/state and keyboard access; test resizing/page setup changes. |
| Medium | Image picker, drag/drop, resize, and wrapping were not completed in this audit. | Insert an image, move/resize it, select wrapping, save, and reopen with the same layout. | Writer image insertion and image arrangement UI. | Complete a desktop test with a disposable image; file selection failure in the probe is not evidence that image insertion itself is broken. |
| Medium | Clipboard and Find/Replace were not verified from the desktop app. | Word supports cut/copy/paste, paste options, Ctrl+F and Ctrl+H. | Shared clipboard/find commands plus Writer UI. | Exercise both keyboard and ribbon paths, including paste formatting/plain text and replacement results. |
| Medium | AutoRecover was not exercised in a desktop crash/reopen scenario. | Word offers recovery of the latest unsaved snapshot after restart. | Shared AutoRecover UI and desktop startup/recovery path. | Verify local recovery end to end without relying on unit-only coverage. |
| Low | Bulleted list path not exercised. | Apply/remove bullets and continue typing at the expected level. | Writer List ribbon. | Add to the next desktop audit run. |

## Fixes made in this branch

| Fix | Unit coverage | Desktop evidence |
|---|---|---|
| Added 13.5 pt font size and exact-point application. | `tests/unit/writer-doc-font-spacing.test.js` | `B2_apply_13_5` applied 13.5 pt. |
| Added first-line indent and 1.15/exact line-spacing choices; round-trip paragraph indent/spacing properties in FODT. | `tests/unit/writer-paragraph-spacing.test.js` | First-line 14.17 pt, 1.15, and exact 18 pt applied in pywebview. |
| Added the Writer Title gallery preset and visual formatting. | `tests/unit/writer-style-gallery-watermark.test.js` | Title applied as centered, bold, 26 pt in pywebview. |
| Synchronized Ctrl+wheel zoom with the shared 3T zoom slider and cleaned up the listener. | `tests/unit/writer-zoom-wheel.test.js` | Controller/page/slider all changed to 110%. |
| F1 now resolves the focused Writer ribbon command to its Vietnamese Help article. | `tests/unit/writer-help.test.js` | Focused Track Changes + F1 opened the matching article. |
| Updated the Help coverage guard’s expected Writer command count for the newly covered command. | `tests/unit/help-coverage.test.js` | Focused Help coverage test passed. |

## Verification and handoff

| Gate | Result | Evidence / note |
|---|---|---|
| Focused Writer unit tests | PASS | Font/spacing, paragraph spacing, style gallery, Help, and Ctrl+wheel test files exited 0. |
| Focused Help coverage test | PASS | `node tests/unit/help-coverage.test.js` exited 0 after updating the command count. |
| `node tests/run-tests.js` | FAIL | First full run: 2189/2193 PASS, 4 FAIL. Three failures were Sheet LibreOffice FODS→XLSX conversions with empty process output; the fourth was the Help count, since fixed. Full rerun is pending. |
| `python -m unittest discover -s tests` | NOT RUN | No repository Python source was changed. |
| Writer layout batch on `E:\VN OFice\file test\landocx` | IN PROGRESS | Output is isolated at `E:\tmp\doc-basics-audit\layout-batch`; compare page counts with `E:\tmp\S44-Writer-Audit-final-20261001\_batch_writer_report.md`. |
| `git diff --check` | NOT RUN | Run before commit. |

| Handoff field | Value |
|---|---|
| Task / objective | Acceptance audit of 3T Doc against checklist A and B1–B12; fix small local gaps. |
| Agent / role | Codex — Writer acceptance audit |
| Branch / worktree | `audit/doc-basics-codex` / `E:\VNOffice-codex-audit-doc` |
| Findings | See the itemized results and larger-gap table above. |
| Implementation summary | Small Writer UI/adapter/help fixes with focused unit tests. |
| Files changed | Pending final review. |
| Commands run | Desktop G7, pywebview acceptance probes, focused Writer tests, full Node suite, Writer layout batch. |
| Build result | NOT RUN — no build was requested by the checklist gates. |
| Test results | See verification table; final rerun and layout comparison pending. |
| Known failures / risks | Track Changes/comment DOCX persistence; table editing; list restart/continue; different first page; vertical ruler. |
| Dependencies / blockers | Pre-existing Word process can prevent a new Word COM page oracle; it is left untouched. |
| Core patch ID | None. |
| Next action | Finish the in-progress layout batch; verify the saved fix DOCX in Word and 3T Doc; rerun required tests; commit on this branch only. |

**Overall status:** In progress. No PASS claim is made for gates that are still pending.
