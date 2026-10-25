# Agent Handoff

TASK: Q68 — Sheet D10: chart overlap and lost series name after XLSX reopen
AGENT/ROLE: Codex / Sheet
BRANCH: codex/q68
WORKTREE: E:\VNOffice-codex-q68
OBJECTIVE: Keep a newly inserted chart outside its source cells after save/reopen, preserve the header-based series name, and remove the duplicate broken chart preview image.
FINDINGS: Before changes, desktop CDP showed `left=346px`, series `Số lượng`; after XLSX reopen it showed `left=197.65px`, `Series 1`, and an image placeholder over the chart. The saved package retained the DrawingML anchor and `c:strRef` to `C1`. Excel COM was blocked by the task instruction.
IMPLEMENTATION SUMMARY: Store the same x/y anchor used by the rendered chart in its model. Include series label-cell ranges when deriving imported chart data so the header is present. Remove the redundant preview image from chart frames before ordinary image import.
FILES CHANGED: `apps/sheet/sheet-grid.js`; `adapters/libreoffice/sheet/sheet-adapter.js`; `tests/unit/sheet-charts.test.js`; `tests/unit/sheet-charts-import.test.js`; `tests/live/cdp/sheet-d10-chart-roundtrip.desktop.mjs`; `docs/PLAN-Q68-SHEET-D10.md`; `docs/EXCEL2016-FEATURE-CHECKLIST.md` (regenerated source references); `docs/evidence/q68-d10/*`.
COMMANDS RUN: `git merge main`; D10 CDP before/after (`node --experimental-websocket tests/live/cdp/sheet-d10-chart-roundtrip.desktop.mjs`); focused chart unit tests; `node tests/run-tests.js`; `node scripts/audit-0610/i18n_parity.mjs`; `python scripts/audit-0610/verify_checklist_evidence.py --all --no-fix`; `python -m pytest tests -q -k chart`; 27-file `batch_document_audit.py xlsx` with Excel COM explicitly marked BLOCKED and LibreOffice diff/lint enabled; XLSX XML anchor/series readback; `git diff --check`.
BUILD RESULT: NOT RUN — no build was required for this adapter/UI fix.
TEST RESULTS: D10 CDP before: 3/5 PASS, 2 FAIL (reopened position/name). D10 CDP after core fix: 5/5 PASS; after preview cleanup: 6/6 PASS. Focused chart units: 21/21 PASS. Full Node suite: 3853/3853 PASS. i18n parity: 3208 VI/3208 EN, 0 missing. Checklist evidence: 0 rows lowered. Pytest chart filter: 17 passed, 1196 deselected. LAN audit: 27 files, all `saved=yes`, `diffs=0`, `lint=clean`; 26 BLOCKED for COM, 1 FAIL (`lan14.xlsx`, CDP save timeout at 1,500,003 ms; 323,219,496-byte FODS input).
KNOWN FAILURES: `lan14.xlsx` exceeded the large-file CDP save timeout; its saved XLSX still passed package diff/lint. The 27-file batch ran after the anchor/name changes but before the chart-preview cleanup; the cleanup was then verified by focused unit/CDP tests. Excel COM was not an accepted oracle. Transparency: an initial unmodified audit wrapper accidentally invoked its hidden COM check for `lan01`–`lan06` before the wrapper behavior was detected; that batch was stopped and rerun with the COM check explicitly returning BLOCKED. A separate manual hidden COM probe was RPC-rejected. The final 27-file report uses BLOCKED COM status.
RISKS: Pixel positions can shift slightly with workbook column widths; the verified guarantee is that the reopened chart begins after the data range. The final CDP fixture uses `Số lượng` in C1 and verifies the saved package keeps `Sheet!$C$1`.
CORE PATCH ID (if any): None.
NEXT ACTION: Review the two commits and merge `codex/q68` when accepted.

## Giao diện đã xem

- `before-insert-light-1366x768.png`: chart inserted in light mode; no overlap before save.
- `before-fix-reopen-light-1366x768.png`: pre-fix reopen; chart overlaps data and series name is lost.
- `chart-preview-broken-before-light-1366x768.png`: pre-cleanup reopen; dashed broken-image placeholder over chart.
- `before-save-light-1366x768.png`, `before-save-dark-1366x768.png`: chart before save in both themes; controls and labels are legible and within the window.
- `after-reopen-light-1366x768.png`, `after-reopen-dark-1366x768.png`: chart after reopen in both themes; outside data cells, series label retained, no broken-image placeholder, and no clipped content.

Screenshots are in `docs/evidence/q68-d10/`. No further UI defect was observed in these screens.
