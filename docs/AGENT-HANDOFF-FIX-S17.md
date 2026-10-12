# Agent Handoff

TASK: `docs/tickets-0710/FIX-S17.md` — preserve Sheet XLSX calculation mode, text boxes, and resolved legacy note state.
AGENT/ROLE: Codex / VN Sheet adapter and persistence.
BRANCH: `fix/sheet-s17-codex`.
WORKTREE: `E:\VNOffice-codex-fs17`.
OBJECTIVE: Fix the three XLSX persistence gaps found in S16, verify real saved files through desktop CDP and Excel ReadOnly, update in-app Vietnamese Help and the Sheet button matrix.

FINDINGS: Calculation mode is persisted through `calcPr` and restored into Sheet on reopen. Text boxes are emitted as DrawingML shapes with measured size and cell anchor; resizing now marks the document dirty. Legacy notes retain the app's resolved flag in an ignorable worksheet extension and FODS metadata. Other spreadsheet apps continue to see the legacy note, but do not expose the resolved state; this is not a threaded comment.

IMPLEMENTATION SUMMARY: Reused the existing Python OOXML postprocessor and adapter save/open path. No LibreOffice Core change, new dependency, framework change, or format-semantic substitution. Added Vietnamese Help details and updated generated command matrix classifications/evidence.

COMMITS:
- `22dcec8e` docs: plan Sheet FIX-S17 XLSX persistence
- `e4947764` fix(sheet): persist XLSX calculation mode
- `77d0c31c` fix(sheet): export text boxes and preserve resolved notes
- `0aa05819` docs(sheet): explain XLSX persistence and comment limits
- `26b237d2` fix(sheet): match textbox export size to the canvas
- `e007361d` fix(sheet): mark textbox resizing as a document edit
- `0ff9822b` docs(sheet): update FIX-S17 button evidence
- `7ea7c5b2` docs(sheet): use current name in comment help
- `87db1ef8` docs(sheet): avoid third-party names in XLSX help
- This handoff commit.

FILES CHANGED: `adapters/libreoffice/common/ooxml_zip_patch.py`; `adapters/libreoffice/sheet/sheet-adapter.js`; `apps/sheet/sheet-grid.js`; `platform/help/entries-sheet.js`; `tests/test_sheet_calculation_mode_xlsx.py`; `tests/unit/sheet-xlsx-native-postprocess.test.js`; `scripts/audit-0610/gen_sheet_button_matrix.py`; `docs/PLAN-SHEET-S17.md`; `docs/SHEET-BUTTON-MATRIX-1011.md`; `docs/tickets-0710/evidence/s17/{CalculationManual.png,CommentResolve.png,TextBoxResized.png}`.

COMMANDS / TESTS:
- Focused `python -m unittest tests.test_sheet_calculation_mode_xlsx`: PASS, 4 tests.
- Focused `runSheetXlsxNativePostprocessTests()`: PASS, 11 tests.
- `node --check` on changed JS and `python -m py_compile adapters/libreoffice/common/ooxml_zip_patch.py`: PASS.
- Live CDP save/reopen: PASS for manual calculation mode, resized text box (250×94 px), and resolved note state. CDP used `VNO_CDP_LOCALAPPDATA=E:\VNOffice-profiles\codex-fs17`.
- Excel COM ReadOnly: PASS for manual calculation (`Calculation=-4135`), default DrawingML text box shape/content, and resolved legacy note presence/content. The resolution flag was verified in the OOXML extension and after reopening in Sheet; Excel does not expose it.
- XLSX batch command covered `lan01, lan02, lan04, lan06, lan09, lan11, lan22, lan26.xlsx`: PASS 8/8, each `saved=yes`, `diffs=0`, `lint=clean`, `excel=PASS`. Report: `E:\VNOffice-profiles\codex-fs17\batch-xlsx\batch_document_audit_report.md`.
- `npm test`: FAIL, final result 3071/3087 PASS, 17 FAIL. The S17 FODS metadata/text-box/resolved-note tests and Help/name checks pass. Failures include `SheetAdapter._commitWorkbook` raising `TypeError: Cannot set properties of undefined (setting 'Sheet1')`, followed by related Sheet/FODS snapshot, repeat, and serialize failures. Full log: `E:\VNOffice-profiles\codex-fs17\npm-test-final.log`.
- `python -m unittest discover -s tests`: FAIL, 891 tests in 593.971s, 2 failures: `test_sections_starting_with_list_heading_or_table_keep_their_breaks` and `test_open_document_dialog_html_keeps_table_merge_border_shading`; both receive a conversion error from the Writer/LibreOffice path. ResourceWarnings for unclosed text streams were also printed.
- UTF-8/BOM scan: PASS, 9 changed text files scanned, no BOM or invalid UTF-8. `git diff --check`: PASS.
- Build: NOT RUN; no build-system change.

KNOWN FAILURES: The full repository suites are not green for the failures listed above. They are outside S17's Sheet XLSX behavior. Do not report the full suite as PASS. No claim is made that other spreadsheet apps show the resolved flag.

RISKS: Resolved status relies on the app-specific ignorable extension; apps that discard unknown worksheet extensions may discard that state. DrawingML text boxes round-trip only the implemented text, anchor, and size fields; this is not full text-box formatting fidelity.

DEPENDENCIES/BLOCKERS: No new dependency. The repository does not contain `09-templates/AGENT-HANDOFF.md`; this handoff follows the existing `docs/*HANDOFF*.md` convention. A separate unittest process launched by another parent was observed in the same worktree during the full suite; it was not stopped or modified.

CORE PATCH ID (if any): N/A.
NEXT ACTION: Adapter/QA owners should triage the full-suite SheetAdapter/FODS failures and the two Writer conversion failures separately; rerun full suites after their fixes. FIX-S17 implementation and targeted verification are complete.