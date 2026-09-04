# Agent Handoff
TASK: Verify/fix page-count consistency between Writer's live-editing pagination and Print Preview
AGENT/ROLE: Codex (implementation) + Claude (finish/verify — Codex hit a genuine usage-limit quota block, reset ~Sep 5th 2:43 AM, mid-task; real, complete work was left uncommitted, preserved)
BRANCH: fix/print-preview-pagination-consistency
WORKTREE: E:\VNOffice-codex-print-preview-consistency

## Finding

VN Writer's two independent pagination systems — live-editing (`_recomputeLivePagination()`) and Print Preview (`paginateContent()`) — did **not** reliably agree on page count. Two real bugs, both fixed:

1. **Duplicated "usable page height" formula.** Both live pagination and Print Preview independently computed `printableHeightPx - headerReservedPx - footerReservedPx` inline, hardcoding the same header/footer reserved-pixel constants (46/48px) in two separate places. Any future change to one (e.g. adjusting header height) without the other would silently desync them. Extracted into a single shared method, `WriterAdapter._getUsablePageHeight(dim)`, now called by both.
2. **Print Preview measured content in a detached DOM node.** `paginateContent()` built its temporary measurement `<div>`, set `innerHTML`, and read `offsetHeight` on child elements — all while the div was never attached to the document. Chromium's layout/wrapping for a detached subtree is not guaranteed to match what the same content renders as once actually in the page (real fonts/line-wrap/column layout can differ). Fixed by temporarily appending the measurement host into `this.editorDom` (inheriting the real document's typography), measuring, then removing it.
3. Also stripped live-pagination's own visual `.vno-page-auto-gap` markup from the HTML handed to Print Preview's `paginateContent()` — previously that auto-gap markup (a display-only artifact) could leak into the height math on the Print Preview side, an inconsistency in the opposite direction.

## Verification

- `node tests/run-tests.js`: 616/616 PASS.
- New `tests/live/writer-pagination-consistency.playwright.mjs`: real browser (installed Edge), types/inserts real overflowing content, reads the live status-bar page count, opens the real Print Preview overlay on the same document, reads its page count, asserts they match — for **two** paper/orientation combinations (A4 Portrait, Letter Landscape) to rule out a one-combination coincidence. All 5 assertions PASS: both combinations report 5/5 matching pages, zero browser errors.

## Files changed
- `adapters/libreoffice/writer/writer-adapter.js`
- `tests/live/writer-pagination-consistency.playwright.mjs` (new)

## Next action
Merged into `main` by Claude after independent re-verification (reran both the full suite and the new live test from a clean shell).
