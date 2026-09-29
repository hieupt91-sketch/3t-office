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

Both generated lan14 FODS files contain the external formula markup and an original-string cache around the inspected `AQ10295` lookup region. That rules out a simple claim that the prototype serializer deletes the formula text or the cached text at this location. The reported `parseFods` model difference is therefore still under investigation; the remaining check is to resolve exact logical cell coordinates and identify the pass/parser decision that produces the different model entries.

## Verification limits at this checkpoint

- **PASS:** inspected source XLSX XML for the formula and cached value in `AR10295`/`AS10295`.
- **PASS:** inspected matching external-formula and cached-string markup in both existing A/B FODS outputs.
- **NOT RUN:** `compare_parsefods_models.mjs` on lan14. The harness is specified to need about 14 GB; the machine reported 10.39 GB available at this checkpoint, so the large model comparison was deferred rather than risking memory pressure.
- **NOT RUN:** product-code changes, tests, LAN audit, and timing measurements; this is an early findings checkpoint.

## Next investigation

Resolve the A/B model difference at exact logical coordinates, add a regression fixture for an external formula with a string cache and one with an error cache, then make the production skip-XF flag conditional on measured fidelity/performance gates. If those gates are not met, leave the default disabled and report the reason in the final handoff.
