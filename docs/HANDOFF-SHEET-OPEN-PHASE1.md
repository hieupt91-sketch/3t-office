# Agent Handoff

**TASK:** Sheet open performance phase 1 completion  
**AGENT/ROLE:** Codex — VN Sheet import performance  
**BRANCH:** `perf/sheet-open-phase1-claude`  
**WORKTREE:** `E:\VNOffice-codex-sheet-open-phase1`

## OBJECTIVE

Add the phase-1 initial-XF skip behind `SHEET_OPEN_SKIP_INITIAL_XF`, preserve Excel external formulas and cached values, and validate fidelity/performance before enabling it by default.

## FINDINGS

- Excel stores external-link formulas and their last calculated values in the same cell. lan14 has a literal `Nga` at `AP10295`, external VLOOKUP plus cached `#N/A` at `AR10295`, and external VLOOKUP plus cached `Văn Ngọc Tú` at `AS10295`.
- B's metadata overlay and optimizer preserved these cells. `reoverlay_sheet_xf_indices` split self-closing repeated cells using `_set_repeat`, which placed the repeat attribute after `/>`. The malformed markup reduced the logical column run and shifted subsequent cells left, overwriting `AP10295` and displacing formulas.
- `_set_repeat` now uses `_insert_repeat_before_end`, placing attributes inside self-closing tags. The fixed B output preserves all four cells at their original coordinates.
- The initial XF skip reduces the measured lan06/lan14 Python post-conversion pipeline by about 9–13 seconds in these runs. This does not meet the overall lan14 <60-second objective.

## IMPLEMENTATION SUMMARY

- `main.py` reads `SHEET_OPEN_SKIP_INITIAL_XF`; the flag is explicitly opt-in and defaults off until all requested gates pass.
- `ooxml_zip_patch.py` can omit only the first XF stamp while retaining format/string overlays and the final XF reoverlay.
- Repeat attributes are inserted before self-closing slashes. Regression tests cover an external formula with a string cache and an external formula with an error cache after optimize + reoverlay.
- The phase-1 benchmark script now uses the product flag and clears its XF index memo between A/B so each path is timed cold.

## FILES CHANGED

- `main.py`
- `adapters/libreoffice/common/ooxml_zip_patch.py`
- `scripts/perf-proto/phase1_skip_initial_xf.py`
- `tests/test_sheet_open_phase1.py`
- `tests/test_sheet_s29_overlay_speed.py`
- `docs/HANDOFF-SHEET-OPEN-PHASE1-FINDINGS.md`
- `docs/HANDOFF-SHEET-OPEN-PHASE1.md`

## COMMANDS RUN

- `node scripts/perf-proto/compare_parsefods_models.mjs ...` for lan06 (two runs), lan11, lan12, lan28.
- `python scripts/perf-proto/phase1_skip_initial_xf.py ...` for lan06 and lan14 (two cache-balanced foreground runs each), and once each for lan11/lan12/lan28.
- Streaming cell scan of lan14 A/B row 10295 after the fixed reoverlay.
- `node tests/run-tests.js`.
- `python -m unittest discover -s tests`.
- Focused `unittest` runs for `test_sheet_open_phase1.py` and `test_sheet_s29_overlay_speed.py`.

## BUILD RESULT

**NOT RUN** — this task does not change the build system; build was not requested.

## TEST RESULTS

- **PASS:** Node suite, 1907/1907 tests.
- **PASS:** Python suite, 392 tests.
- **PASS:** lan06 (two runs), lan11, lan12, and lan28 `parseFods` A/B models are IDENTICAL. lan12 and lan28 are also byte-identical; lan06 is byte-identical in both runs.
- **PASS:** lan14 inspected cells have matching A/B logical coordinates and formula/cache values after the fix.
- **PASS:** 26 LAN files plus separate lan06/lan14 audits on the phase-1 flag path — 28/28 saved, Excel COM opened, lint clean, `TONG sai lech: 0`.
- **NOT RUN:** Full lan14 `parseFods` model comparison. The comparator requires about 14 GB; available memory was 11.38 GB.

## KNOWN FAILURES

No test failures. Full lan14 model equality and this worktree's 26-file audit remain unverified.

## RISKS

`SHEET_OPEN_SKIP_INITIAL_XF` remains disabled by default because the lan14 full-model gate has not completed. Phase 1 improves the measured Python pipeline by 9–13 seconds but does not achieve the overall <60-second target.

## DEPENDENCIES/BLOCKERS

- Run the lan14 model comparator only when the machine can safely provide the specified memory.

## CORE PATCH ID

None. No LibreOffice Core change.

## NEXT ACTION

Run the lan14 full-model comparison when the memory constraint is satisfied. Keep the environment flag opt-in until that gate passes.
