# Agent Handoff

TASK: FIX-S5 — Sheet save postprocess performance on lan14
AGENT/ROLE: Codex / Sheet integration
BRANCH: `perf/sheet-postprocess-codex`
WORKTREE: `E:\VNOffice-codex-fs5`
OBJECTIVE: Reduce OOXML postprocess time while preserving XML output for lan01/02/04/06/09/11/14/22.

FINDINGS:
- lan14 input: `E:\VN OFice\file test\lan\lan14.xlsx`; source FODS: 329,536,087 bytes. On identical FODS and LibreOffice output, baseline postprocess took 146.8 s and the changed code took 88.4 s (58.4 s / 39.8% faster).
- The measured current lan14 optimize/LibreOffice/postprocess phases were 5.9 s / 16.9 s / 88.4 s. This implies about 111 s for these phases; the ticket's under-90-second total-save goal is not met.
- Direct desktop Ctrl+S did not produce a completed save timing or updated XLSX after more than eight minutes. A batch audit attempt timed out while writing the serialized FODS through CDP (`Runtime.evaluate` per-chunk timeout); its save result is not a PASS.
- XML members were SHA-256 compared between baseline `HEAD` postprocess and changed postprocess using the same input FODS, source XLSX, and LibreOffice conversion. All members matched: lan01 12/12, lan02 10/10, lan04 10/10, lan06 14/14, lan09 38/38, lan11 12/12, lan14 14/14, lan22 16/16.

IMPLEMENTATION SUMMARY:
- Extract FODS column widths and row heights from one lexical pass with one shared style index; the event scanner visits only table/column/row opening tags and does not capture large row/table bodies.
- Avoid full-document scenario and print-title regex scans when metadata is absent or only a small number of table tags need inspection.
- Build and reuse a source-cell repair index for formula results, literal errors, empty strings, source strings, styles, and formula coordinates. Reuse this index when restoring empty strings and lost leading newlines.
- Added regression coverage for shared FODS layout extraction and formula cells whose result type is a string.

FILES CHANGED:
- `adapters/libreoffice/common/ooxml_zip_patch.py`
- `tests/test_sheet_residuals_r8.py`
- `tests/test_sheet_save_colwidth.py`
- `docs/AGENT-HANDOFF-FIX-S5.md`

COMMANDS RUN:
- Direct profiling runner on lan14 baseline `HEAD` patcher and changed patcher, using FODS from `E:\VN OFice\_batch_document_audit`, source XLSX from `E:\VN OFice\file test\lan`, LibreOffice conversion, and `VNO_APP_ROOT=E:\VNOffice-codex-fs5`.
- Same baseline-vs-changed XML hash comparison for all eight ticket workbooks. All comparisons matched.
- `python -m py_compile adapters/libreoffice/common/ooxml_zip_patch.py`.
- Focused Python tests: 36 passed across Sheet residual, empty-string, literal-error, layout, row-height, and external-link tests; also 35 passed in a subsequent focused run after cache changes.
- `npm test` — 3044/3044 PASS.
- `python -m unittest discover -s tests` — 826 tests, OK (487.396 s).
- Desktop audit with `VNO_APP_ROOT=E:\VNOffice-codex-fs5`, `VNO_CDP_LOCALAPPDATA=E:\VNOffice-profiles\codex-fs5`, and its dynamically allocated dedicated CDP port failed before save completion while writing large serialized FODS chunks. A direct desktop Ctrl+S attempt with the same profile also did not complete within eight minutes.
- `git diff --check` — clean.

BUILD RESULT: NOT RUN (not requested).
TEST RESULTS:
- PASS — JavaScript suite, 3044/3044.
- PASS — Python unittest discovery, 826 tests.
- PASS — XML comparison, 8/8 workbooks byte-identical for XML members.
- PASS — lan14 postprocess benchmark, 146.8 s baseline to 88.4 s changed.
- FAIL — ticket's under-90-second total-save target; measured optimize + LibreOffice + postprocess estimate is about 111 s.
- BLOCKED — completed desktop CDP save timing; large FODS transfer timed out and direct Ctrl+S did not finish.

KNOWN FAILURES:
- Total-save target remains about 21 seconds above goal based on measured conversion/postprocess phases.
- Desktop save completion was not verified; no successful `.save-timings.json` was produced.

RISKS: Large-workbook direct desktop save performance needs another pass. Fidelity regression passed on the eight required workbooks.
DEPENDENCIES/BLOCKERS: None added. CDP large-payload transfer currently prevents the requested completed desktop audit.
CORE PATCH ID (if any): None.
NEXT ACTION: Reduce lan14 postprocess by at least another 21 seconds, then complete a desktop save audit under the dedicated profile and CDP port.
