# Agent Handoff

TASK: `writer.insert.equation` — equation editing and editable DOCX save
AGENT/ROLE: Codex / Writer implementation
BRANCH: `feat/writer-equation-codex`
WORKTREE: `E:\VNOffice-codex-equation`
OBJECTIVE: Add Word-style equation insertion to 3T Doc with native MathML preview, in-place selection/edit/delete/undo/redo, lossless preservation of untouched source OMML, and editable OMML for new equations, without adding a dependency.

FINDINGS:
- Existing DOCX equations are converted by LibreOffice to named `ObjectN` GIFs in the intermediate Writer HTML. Source `word/document.xml` retains `m:oMath` / `m:oMathPara`; no native equation overlay was present in the app open path.
- A baseline LibreOffice HTML-to-DOCX conversion flattened MathML structures, so the existing DOCX adapter pipeline needed an OMML insertion mapping for new or edited equations.
- The app now overlays native MathML at the corresponding LibreOffice equation-image slot on open. Unedited equations carry their original OMML through save and are restored unchanged at their text marker's position. Other paragraph runs remain in order.
- New or edited MathML is mapped to OMML by the existing OOXML adapter postprocess. A generated DOCX test confirms `m:f` and `m:rad` stay in the original paragraph between its surrounding text. A new-document integration test confirms Word COM reports one editable equation.
- The implementation follows the existing HTML/LibreOffice save pipeline. LibreOffice's Math object is not exposed through the existing insertion abstraction, so the adapter mapping is used where the standard conversion would flatten equations.

IMPLEMENTATION SUMMARY:
- Added a no-dependency linear-format parser/serializer for fractions, scripts, roots, integrals, sums/products, brackets, 2×2 and 3×3 matrices, Greek letters and common symbols. The editor previews MathML using the WebView2 Chromium renderer.
- Added an equation dialog in Vietnamese/English with linear entry, structure and symbol controls, preview, keyboard navigation, and `\alpha` + Space replacement.
- Added `Alt+=`, insertion at the saved cursor selection, block presentation on an otherwise empty paragraph, equation selection/edit/delete, and undo/redo snapshots.
- Integrated DOCX OMML-to-MathML overlay on open and marker-based preservation/mapping back to OMML on save. Save fails explicitly if LibreOffice drops or changes an equation marker.
- Added a concrete Vietnamese 3T Doc Help article with ribbon location and usage steps; updated the ribbon backlog.
- No LibreOffice Core changes or external dependencies.

FILES CHANGED:
- `apps/writer/equation-editor.js`
- `apps/writer/insert-dialogs.js`
- `apps/writer/writer.css`
- `adapters/libreoffice/writer/writer-adapter.js`
- `adapters/libreoffice/common/ooxml_zip_patch.py`
- `main.py`
- `platform/commands/command-definitions.js`
- `platform/help/entries-writer.js`
- `platform/i18n/strings-en.js`
- `platform/i18n/strings-vi.js`
- `docs/RIBBON-BACKLOG.md`
- `tests/unit/writer-equation-editor.test.js`
- `tests/unit/writer-help.test.js`
- `tests/test_writer_equation_omml_roundtrip.py`
- `tests/test_writer_legacy_doc_open.py`
- `tests/run-tests.js`
- `docs/HANDOFF-WRITER-EQUATION.md`

COMMANDS RUN:
- `node tests/run-tests.js`
- `python -m unittest tests.test_writer_equation_omml_roundtrip -v`
- `python -m unittest discover -s tests`
- `python -m unittest tests.test_writer_legacy_doc_open tests.test_g7_save_as_dialog.SaveAsAlternateFormatTests.test_save_as_converts_each_supported_alternate_format -v`
- `python -m unittest tests.test_writer_save_roundtrip -v`
- `git diff --check`
- `scripts/layout-audit/_batch_writer.py` over `E:\VN OFice\file test\landocx`: BLOCKED. Another worktree's serialized run reported `Word pages: FAIL (timeout - Word blocked by modal error dialog)` on `d10.docx`; further Word/LibreOffice automation then started in other worktrees. Did not start a competing COM session. Re-run when the shared Office automation and Word modal state are clear.

BUILD RESULT: NOT RUN — no build-system changes; runtime and test suites were exercised directly.

TEST RESULTS:
- PASS — `node tests/run-tests.js`: 2,191/2,191 tests.
- PASS — focused equation Python tests: 3/3, including in-place source OMML round trip and Word COM `OMaths.Count = 1`.
- PASS — `python -m unittest tests.test_writer_save_roundtrip -v`: 3/3 when run in isolation; initial temp-file lock failures occurred during concurrent LibreOffice activity.
- PASS — focused legacy DOCX open test after updating its mock for the equation overlay.
- PASS — `git diff --check` (Git emitted only CRLF conversion warnings).
- FAIL — `python -m unittest discover -s tests`: 518 tests, one failure, no errors. The remaining failure is `test_g7_save_as_dialog.SaveAsAlternateFormatTests.test_save_as_converts_each_supported_alternate_format`; its PDF mock returns only a path while production unpacks `(out_path, pdf_engine)`. The same mismatch reproduces when that test is run alone. No FODS-to-XLSX failure remained in the final full run.
- BLOCKED — requested 24-file Writer page-count audit; Word COM was blocked by a modal error dialog in the shared automation environment, with other worktrees continuing to use Office/LibreOffice.

KNOWN FAILURES: The unrelated PDF Save As test mock mismatch above makes the full Python suite FAIL. No equation-specific failures were reported by the focused or full runs.

RISKS: Equation editing supports the structures represented by the editor's documented linear syntax and the corresponding MathML/OMML mapping. LibreOffice must preserve the export marker run; the adapter raises a save error if it does not, rather than silently moving or dropping equation content.

DEPENDENCIES/BLOCKERS: No new software dependencies. The external layout audit remains outstanding until shared Word COM is usable and the concurrent Office/LibreOffice jobs finish.

CORE PATCH ID (if any): None — no Core/upstream patch.

NEXT ACTION: When shared Office automation is available, rerun the sequential layout audit on `E:\VN OFice\file test\landocx` and update this handoff. Commit the implementation on `feat/writer-equation-codex`; do not merge.
