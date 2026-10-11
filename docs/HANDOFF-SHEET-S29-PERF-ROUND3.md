# Handoff Sheet S29 Performance — Round 3

TASK: Diagnose the slow lan14 desktop open; profile the remaining Python cost and validate output fidelity.
AGENT/ROLE: Codex — Sheet performance
BRANCH: `perf/sheet-s29-codex-r3`
WORKTREE: `E:\VNOffice-codex-sheet-s29b`
OBJECTIVE: Measure the real desktop open path first, then reduce Python cost only where the change can be shown not to alter output.

## Findings

The fixture is outside this worktree. The first launch used the brief's relative path, which did not exist in this checkout and is not used as evidence. The valid run used `E:\VN OFice\file test\lan\lan14.xlsx` with `LOCALAPPDATA=E:\VNOffice-profiles\codex` and `VNO_PERF_DEBUG=1`.

The real desktop app reached the JavaScript `parseFods` and layout hooks. The desktop console reported:

| Hook | Measured duration |
|---|---:|
| `parseFods` | 102,376.7 ms |
| First grid render (cumulative from `loadFromFods` start) | 104,856.9 ms |
| `loadFromFods` (cumulative) | 105,535.2 ms |
| First layout (cumulative) | 105,599.1 ms |

Thus the dominant measured client phase is `parseFods`, at about 102.4 seconds. The render callback followed about 2.5 seconds later; this does not support `_renderVirtualRows` as the primary bottleneck. The app did reach the real JavaScript hook, so this run rules out a bridge failure. It does not establish the precise wall time from process creation to first layout: startup and phase durations were not captured by a single wall-clock timer. The round-2 report's two attempts that exceeded three minutes were not reproduced as an absent-hook failure here. The parser's measured duration remains a substantial open-file UX issue.

## Actual import flow

```text
main.py <lan14.xlsx>
  -> pywebview loads index.html (?app=sheet&openFile=1&perfDebug=1)
  -> bootstrapPlatform() waits for pywebview bridge and binds commands
  -> SheetApp.init() mounts grid and attaches SheetAdapter
  -> common.file.open -> UnoBridge.openRealFile("sheet")
  -> Python VnOfficeApi.open_document_dialog("sheet")
       -> make XLSX sheets visible if needed
       -> LibreOffice: XLSX -> FODS
       -> native overlays (visibility, active sheet, freeze panes, filter,
          layout, cell metadata, formula errors, drawing IDs)
       -> optimize_fods_streaming
       -> reoverlay_sheet_xf_indices
       -> return FODS payload
  -> SheetAdapter.open() -> loadFromFods()
       -> parseFods() [102.4 s measured]
       -> populate model, render first grid, apply layout
```

## Python timing and profile

Foreground command: `python scripts/layout-audit/_time_sheet_open_stages.py "E:\VN OFice\file test\lan\lan14.xlsx"`.

| Stage | Time |
|---|---:|
| Make sheets visible | 1.43 s |
| LibreOffice conversion | 19.61 s |
| Visibility + active sheet + freeze panes + autofilter + layout overlays | 9.69 s combined |
| Cell metadata overlay (formats + strings + XF) | 35.78 s |
| Promote formula errors + drawing IDs | 1.30 s |
| FODS optimize | 26.85 s |
| XF reoverlay | 42.44 s |
| **Total Python pipeline** | **138.22 s** |

The total is slower than the round-2 value of 115.48 s on this run; no Python optimization was applied, so this is a fresh measurement, not a before/after claim.

`cProfile` adds significant wall overhead; its results are used for call counts and relative hot spots, not as the normal pipeline timings. On the metadata pass it recorded 138,915,046 calls in 91.20 s profiled: `_overlay_sheet_cell_metadata_from_xlsx` 91.20 s cumulative, `_xlsx_cells_with_metadata` 35.75 s, and the single FODS `apply_row` traversal 47.69 s across 56,384 rows. On the optimizer, 129,174,671 calls in 71.76 s profiled; 72,255 `process_row` calls took 43.23 s cumulative, with millions of repeated `_quoted_attr`, `_cell_has_content`, and `_flat_xml_blocks` calls. XF reoverlay recorded 106,131,261 calls in 67.48 s profiled; `_overlay_sheet_xf_indices_from_xlsx` took 61.36 s cumulative, including both XLSX index construction and the FODS traversal. These profiles show multi-million-cell scan costs; they did not reveal a new quadratic scan.

No Python change was made. Cell metadata already shares its XLSX index and FODS pass. Removing or folding the post-optimization XF overlay would change when XF ownership is restored after cell runs are compacted; this round did not establish an equivalent replacement. The Python target of 60 seconds remains unmet.

## Output fidelity evidence

`python scripts/layout-audit/_compare_sheet_s29_metadata.py` ran on the six required fixtures. For every fixture, the script compared the legacy overlay sequence and combined metadata overlay against the same source XLSX bytes and same LibreOffice FODS bytes; the complete resulting strings were equal and their SHA-256 digests matched.

| Fixture | Result bytes | SHA-256 |
|---|---:|---|
| lan05 | 1,387,180 | `c4acd848b019f5df9bddd45743c75d3feb62761d930839672f653ba4b647c918` |
| lan08 | 1,304,450 | `60b64149c15f48790bd5404686feb1eaf79c98772b0d36cd2249ea4b81ff1319` |
| lan11 | 19,917,042 | `333bcb53d41a7314574cf4819fadf404c0352a6083f40dbc60e000f83fa0a93e` |
| lan12 | 22,639,811 | `48f4bc53bffaab4bd680dc66beb897be24897199ee93209dc8bfa4e5b8745ac7` |
| lan06 | 339,058,119 | `1b8b4512c27358a6a0e06f9d3b30a2f1e0cb36c7837dab0d40751e093ca4dfea` |
| lan14 | 328,216,603 | `fd08c6a8923aedf75e707ea83cd22ccc35f700f3d11ce47392ef3cf248cbe309` |

`python scripts/layout-audit/_compare_sheet_s29_geometry.py` compared current layout overlays to the available Excel COM caches: **0/6,887 rows mismatched; 0/973 columns mismatched**. Available caches cover lan05, lan08, lan11, and lan12. No `.geom.json` cache was present for lan06 or lan14 in the four supplied cache directories, so those two files could not be included in geometry comparison.

## Tests

- `node tests/run-tests.js` — PASS, 1834/1834.
- `python -m unittest discover -s tests -p "test_*.py"` — PASS, 346 tests in 290.686 s.
- App launch/profile, stage timing, cProfile, metadata SHA-256, and geometry comparison all ran in the foreground. No Excel COM generation script was run.

## Handoff

IMPLEMENTATION SUMMARY: Diagnostic and validation round only; no source behavior changed. Added this handoff report.
FILES CHANGED: `docs/HANDOFF-SHEET-S29-PERF-ROUND3.md`.
COMMANDS RUN: Real `main.py` lan14 launch; `_time_sheet_open_stages.py`; cProfile wrappers around metadata/optimize/reoverlay; `_compare_sheet_s29_metadata.py` on lan05/08/11/12/06/14; `_compare_sheet_s29_geometry.py`; Node and Python test suites; git status/review.
BUILD RESULT: NOT RUN (no code/build change).
TEST RESULTS: PASS as listed above.
KNOWN FAILURES: None in the executed tests or fidelity comparisons. Python and JS open latency targets remain unmet.
RISKS: lan14 parsing in the real renderer takes about 102.4 seconds. The in-app JS parse remains unoptimized. lan06/lan14 have no available Excel COM geometry cache in the specified directories.
DEPENDENCIES/BLOCKERS: None for this round.
CORE PATCH ID (if any): N/A.
NEXT ACTION: Profile `SheetAdapter.parseFods` by subphase and reduce its cost while preserving model fidelity; then profile the Python cell loops and safely evaluate whether XF restoration can be performed during FODS optimization. Re-run desktop hooks and the same byte/geometry comparisons after any behavior change.
