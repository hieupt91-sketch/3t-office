# Sheet Open Phase 1 — Early Findings

**Branch:** `perf/sheet-open-phase1-claude`  
**Worktree:** `E:\VNOffice-codex-sheet-open-phase1`  
**Checkpoint:** committed before product-code changes

## Confirmed source behavior

The external lookup results in `E:\VN OFice\file test\lan\lan14.xlsx` store the formula and the last calculated value in the same worksheet cell. For example, `Sheet1!AS10295` has an external `VLOOKUP` formula and cached text `Văn Ngọc Tú`; `Sheet1!AR10295` has an external `VLOOKUP` formula and cached error `#N/A`. This is the behavior VN Sheet must preserve: the formula remains editable/available, and the saved cached result remains what Excel stored. Opening offline must not replace that result by recalculating against an unavailable workbook.

The current XLSX metadata overlay does **not** restore formulas. `_xlsx_cells_with_metadata` indexes cached strings as `vno:original-string`; LibreOffice supplies the ODF `table:formula`, and `SheetAdapter._cellFromFodsAttributes` converts it to the workbook formula and marks it as an external link. Thus formula and cache are carried through separate paths. A fix must keep both paths intact and must not discard the source cache merely because the formula is external.

LibreOffice represents these formulas in FODS with an ODF formula referring to a `file:///...xlsx` target. The app retains that original ODF reference on untouched external-link cells so saving can preserve the link. The source XLSX is the authority for the Excel formula and its cached value; the FODS expression is an adapter representation.

## Phase 1 pipeline checkpoint

The prototype compares:

- A/current: native metadata overlay (including initial XF) → FODS optimizer → XF reoverlay.
- B/prototype: native metadata overlay (without initial XF) → FODS optimizer → XF reoverlay.

The exact logical cells on `Sheet1!10295` are:

| Cell | Source XLSX | Correct FODS cache/model |
|---|---|---|
| `AP10295` | Literal text `Nga` | `Nga`, no formula |
| `AQ10295` | `TRIM` formula | Formula and cached student code |
| `AR10295` | External `VLOOKUP`, cached `#N/A` | Formula plus cached `#N/A` |
| `AS10295` | External `VLOOKUP`, cached `Văn Ngọc Tú` | Formula plus cached `Văn Ngọc Tú` |

The B output was correct after its metadata overlay and after `optimize_fods_streaming`; the corruption appeared only in `reoverlay_sheet_xf_indices`. That pass splits repeated cells to attach per-cell XF metadata. For a self-closing repeated cell, `_set_repeat` inserted a new repeat attribute after `/>` (for example, `<table:table-cell/> table:number-columns-repeated="2">`). The result is malformed XML, and the following cells are interpreted at columns two places too early. The external formulas then occupy `AP/AQ`, overwriting the `Nga` model entry and detaching the formulas from their original caches.

The initial XF overlay had already split those runs, masking this `reoverlay` defect. Skipping the redundant initial XF pass exposed it. `_set_repeat` now inserts the attribute before a self-closing slash through the existing `_insert_repeat_before_end` helper. Reapplying XF to the saved B post-optimizer output now keeps `AP10295 = Nga`, `AR10295` as the external `#N/A` lookup, and `AS10295` as the external lookup with cached `Văn Ngọc Tú`.

The correct Excel behavior is confirmed by the source XLSX XML itself: the formula and last calculated value are both present in each external-formula cell. VN Office must retain both and avoid recalculating links to closed workbooks.

## Measurements after the reoverlay repair

Times below are Python pipeline seconds **after** LibreOffice XLSX→FODS conversion; each A/B pipeline begins with a cleared XLSX index memo so B cannot reuse A's warm XF index. The first exploratory lan06 pair, where B reused A's memo and showed a misleading 0.67-second reoverlay, is excluded.

| Workbook | A / B run 1 | A / B run 2 | FODS bytes | `parseFods` model |
|---|---:|---:|---|---|
| lan06 | 107.67 / 94.32 s | 107.54 / 96.40 s | identical both runs | IDENTICAL both runs |
| lan11 | 4.12 / 3.46 s | — | different bytes | IDENTICAL |
| lan12 | 4.03 / 3.83 s | — | identical bytes | IDENTICAL |
| lan14 | 94.56 / 85.47 s | 94.15 / 84.69 s | different bytes both runs | full model compare NOT RUN; `AP10295:AS10295` cells matched by streaming scan |
| lan28 | 0.71 / 0.60 s | — | identical bytes | IDENTICAL |

The measured phase-1 saving is roughly 9–13 seconds on lan06/lan14 in these runs. This does not satisfy the overall <60-second lan14 objective. The full lan14 Node model comparison is still deferred: `compare_parsefods_models.mjs` is specified to need about 14 GB, while the machine reported 11.38 GB available after the large-file runs.

## Verification limits at this checkpoint

- **PASS:** inspected source XLSX XML for the formula and cached value in `AR10295`/`AS10295`.
- **PASS:** inspected the exact `AP10295:AS10295` logical cell positions in the A/B FODS outputs and the B overlay/optimizer/reoverlay stages.
- **PASS:** after the `_set_repeat` fix, reapplied XF to the saved B post-optimizer lan14 output and confirmed formulas/caches remain in their source columns.
- **PASS:** lan06/11/12/28 `parseFods` A/B model comparisons; full Node suite also passes the four existing FODS import snapshots.
- **PASS:** focused tests cover feature-flag routing, external formula with string/error caches after XF reoverlay, and valid self-closing repeated-cell XML.
- **PASS:** two cache-balanced foreground timing runs each for lan06 and lan14.
- **PASS:** `node tests/run-tests.js` — 1907/1907.
- **PASS:** `python -m unittest discover -s tests` — 392 tests.
- **NOT RUN:** full `compare_parsefods_models.mjs` on lan14. The harness is specified to need about 14 GB; the machine reported 11.38 GB available, so this comparison was deferred rather than risking memory pressure.
- **NOT RUN:** 26-workbook LAN audit from this worktree. Another worktree currently has its own foreground 26-workbook audit in progress; this audit was not started concurrently.

## Next investigation

Run the lan14 full model comparison when at least the requested memory is available and run the 26-workbook LAN audit from this worktree after the other foreground audit ends. The production `SHEET_OPEN_SKIP_INITIAL_XF` setting remains opt-in (default off) until all requested fidelity and audit gates pass.
