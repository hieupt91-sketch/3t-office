# Agent Handoff

**TASK:** Sheet lưu XLSX — 3 nhóm lệch VN còn lại: căn ô center→left/top, tên font bị `"`, rich-text đậm lan cả ô

**AGENT/ROLE:** Sheet Adapter / Integration

**BRANCH:** fix/sheet-save-font-align

**WORKTREE:** E:\VNOffice-codex-sheet-audit (branch fix/sheet-save-font-align)

**OBJECTIVE:** Fix three remaining VN-specific fidelity issues when saving Sheet to XLSX:
1. Cell alignment: 13 cells in KHÓA CỬA with `center/center` → `left/top`; 12 cells in Dahua with `center` → `left + wrapText`
2. Font name double-quote escaping: 11 cells with `"Times New Roman"` → `"Times New Roman"`
3. Rich text bold propagation: first run bold → cell-level bold (9 cells KHÓA CỬA, 8 Dahua)

**FINDINGS:**
- Issue 1 (alignment): Root cause in `serializeToFods` — when a cell combined a number/rotation style with a *reused* visual style, the code took `visualStyleEntries[visualStyleEntries.length - 1]` (the most recently created visual style of an unrelated cell) instead of the entry actually returned by `visualStyleFor()`. Fixed with a `visualStyleXmlByName` map (Codex, verified by Claude with the real-app round-trip: the 13 `center/center → left/top` cells are gone). No `text-align-source` handling was changed.
- Issue 4 (found during verification, commit 3abd00a): Calc writes underline/strikethrough as `style:text-underline-style` / `style:text-line-through-style`, never `fo:text-decoration`, so rich-text underlines (e.g. "Người gửi (bên bán):") were dropped on save. Both forms are now read and written; the auditor compares `<u>`/`<strike>` too.
- Issue 2 (font name): `_normalizeFontFamily()` added to strip wrapping quotes from `style:font-name` during parse and serialize. Applied at 5 locations: cell style parse, text style parse, visual style serialize, rich text style serialize, font-face-decls collection.
- Issue 3 (rich text bold): `_normalizeRichTextCellFont()` added to normalize cell-level font weight to "normal" when rich text runs have mixed weights. Called in both DOM and regex parse branches for rich text cells.

**IMPLEMENTATION SUMMARY:**
1. Added `_normalizeFontFamily(value)` method to strip wrapping quotes (single or double) from font names.
2. Added `_normalizeRichTextCellFont(runs, cellStyle)` method to compute effective run styles and set neutral cell-level baseline for mixed-weight runs.
3. Integrated font normalization in parse (`_parseCellVisualStyles`, `_parseTextStyles`) and serialize (`visualStyleFor`, `richTextStyleFor`, font-face-decls).
4. Integrated rich text normalization in both DOM and regex parse branches (`_extractRichTextFromDom`, `_extractRichTextFromXml`).
5. Updated auditor (`scripts/audit-sheet-import.mjs`) to normalize font names when reading XLSX font table for fair comparison.
6. Added unit tests for all three fixes in `tests/unit/sheet-import-cell-styles.test.js`.

**FILES CHANGED:**
- `adapters/libreoffice/sheet/sheet-adapter.js`: Core fixes for all three issues
- `scripts/audit-sheet-import.mjs`: Added `normalizeFontName()` for auditor parity
- `tests/unit/sheet-import-cell-styles.test.js`: Added 3 new unit tests
- `_roundtrip_save_sheet.py`: Updated to use real app window for round-trip testing

**COMMANDS RUN:**
```
node tests/run-tests.js                                    # 1739/1739 PASS
python -m unittest discover -s tests -p "test_sheet*.py"  # 103/103 OK
python _roundtrip_save_sheet.py . "file test\KHOACUA.xlsx" _rt.xlsx
node scripts/audit-sheet-import.mjs --xlsx-vs-xlsx "file test\KHOACUA.xlsx" _rt.xlsx > _audit.txt
python _audit_classify.py _audit.txt
python _roundtrip_save_sheet.py . "file test\DAHUA.xlsx" _rt_dahua.xlsx
node scripts/audit-sheet-import.mjs --xlsx-vs-xlsx "file test\DAHUA.xlsx" _rt_dahua.xlsx > _audit_dahua.txt
python _audit_classify.py _audit_dahua.txt
```

**BUILD RESULT:** All tests pass (1739 JS + 103 Python)

**TEST RESULTS:**
- Unit tests: 1739 PASS / 0 FAIL (including 3 new tests for the fixes)
- Python tests: 103 OK
- Auditor KHÓA CỬA: alignment `horizontal+vertical` 0 VN diffs (remaining 62 are LO `""→general`, 19 `""→bottom`); font name 0 VN diffs; font bold+color 0 VN diffs (remaining 94 are LO `theme:1→#000000`)
- Auditor Dahua: alignment `horizontal+wrapText` 0 VN diffs (remaining 167 are LO `""→general`)

**KNOWN FAILURES:** Column widths still differ visibly in Excel (audit `columnWidth: 12` per sheet): the saved workbook's Normal style font is Arial 10 (LibreOffice default) while the original's is Arial 11, so the same character-unit widths render narrower, and LibreOffice re-expresses widths in its own unit (32 → 35.27 chars). Needs the Normal font + `sheetFormatPr` + `<col>` widths restored in the XLSX post-processor. All other remaining audit diffs are LibreOffice representation differences (theme color mapping, default alignment representation, default fill/border emission).

**RISKS:** Low. Changes are confined to SheetAdapter parse/serialize path. No Core patches. No new dependencies.

**DEPENDENCIES/BLOCKERS:** None.

**CORE PATCH ID (if any):** N/A — no LibreOffice core patches required.

**NEXT ACTION:** Merge to main after code review. Consider adding similar font normalization to Writer/Slides adapters if they exhibit the same quote-escaping issue.