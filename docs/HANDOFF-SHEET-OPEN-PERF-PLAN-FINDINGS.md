# Sheet Open Performance — Findings (measurement pass)

TASK: Measure the current Sheet open path on LAN workbooks; do not change product code.
AGENT/ROLE: Codex — Sheet performance planning
BRANCH: `plan/sheet-open-perf-codex`
WORKTREE: `E:\VNOffice-codex-sheet-open-perf`
OBJECTIVE: Capture two foreground Python pipeline runs and two real WebView renderer runs per requested workbook, plus identify measurement gaps before proposing an architecture.

## Environment and method

- Workbooks: `E:\VN OFice\file test\lan\lan14.xlsx`, `lan06.xlsx`, `lan11.xlsx`, `lan12.xlsx`.
- Python pipeline: `scripts/layout-audit/_time_sheet_open_stages.py`, foreground, `LOCALAPPDATA=E:\VNOffice-profiles\codex`, `VNO_PERF_DEBUG=1`.
- Renderer: foreground `python -u main.py <workbook>` using the same environment; timings are the existing `window.__vnoPerfDebug` hooks in actual Chromium/WebView2. Peak working set was read from the live Python process using `Get-Process.PeakWorkingSet64` before closing each app.
- All file sizes below are decimal MB (10^6 bytes). Times are seconds. Runs were sequential on one machine; background load was not controlled.
- `loadFromFods` includes JS parse and model setup; it does not isolate Python→WebView string marshaling. That boundary has no current timer. Peak working set is the Python process only and does not include Chromium child processes.

## Python pipeline results

| Workbook | Input MB | Run | Convert XLSX→FODS | Layout overlay | Cell metadata overlay | Optimize | XF reoverlay | Total Python | FODS final MB |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| lan14 | 9.74 | 1 | 16.39 | 2.59 | 29.52 | 24.92 | 28.78 | 111.83 | 316.01 |
| lan14 | 9.74 | 2 | 15.50 | 2.60 | 29.82 | 25.15 | 29.82 | 112.64 | 316.01 |
| lan06 | 11.25 | 1 | 14.88 | 15.02 | 51.77 | 34.53 | 18.60 | 136.87 | 4.44 |
| lan06 | 11.25 | 2 | 14.36 | 14.42 | 46.91 | 35.01 | 19.47 | 131.96 | 4.44 |
| lan11 | 8.38 | 1 | 6.40 | 0.33 | 0.91 | 1.23 | 1.10 | 10.91 | 20.20 |
| lan11 | 8.38 | 2 | 6.57 | 0.35 | 0.98 | 1.24 | 1.19 | 11.24 | 20.20 |
| lan12 | 8.45 | 1 | 9.08 | 0.51 | 0.61 | 0.94 | 0.95 | 13.42 | 27.39 |
| lan12 | 8.45 | 2 | 8.04 | 0.54 | 0.66 | 0.98 | 1.04 | 12.62 | 27.39 |

The timing script also recorded these per-run stages (not repeated in the table): visibility adjustment; structure protection; active sheet; freeze panes; autofilter; covered formula errors; tab colors where present; drawing image IDs. Most were below one second. On lan06, layout and metadata are the notable exceptions. On lan14, metadata + optimize + XF reoverlay account for roughly 84 seconds, before JS parsing.

Notable size behavior: lan14 raw FODS was 257.17 MB, metadata overlay peaked at 325.62 MB, optimizer output was 311.25 MB, and final XF reoverlay output was 316.01 MB. lan06 raw FODS was 146.19 MB, layout overlay 147.84 MB, metadata overlay 334.36 MB, optimizer output 4.15 MB, and final XF output 4.44 MB.

## Renderer and memory results

| Workbook | Run | DOM parse | Find used range | Build workbook model | parseFods total | First grid | loadFromFods | First layout | Python process peak WS |
|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| lan14 | 1 | 41.66 | 2.75 | 34.71 | 93.82 | 93.88 | 94.55 | 94.74 | 4924 MB |
| lan14 | 2 | 41.40 | 2.68 | 34.54 | 95.27 | 96.35 | 97.13 | 97.35 | 4920 MB |
| lan06 | 1 | 0.41 | 0.07 | 0.75 | 1.54 | 1.59 | 1.92 | 1.95 | 3807 MB |
| lan06 | 2 | 0.39 | 0.06 | 0.71 | 1.46 | 1.51 | 1.84 | 1.86 | 3808 MB |
| lan11 | 1 | 0.90 | 0.16 | 0.26 | 1.91 | 1.95 | 2.31 | 2.50 | 362 MB |
| lan11 | 2 | 0.93 | 0.15 | 0.23 | 1.86 | 1.90 | 2.20 | 2.38 | 363 MB |
| lan12 | 1 | 0.72 | 0.01 | 0.14 | 1.82 | 1.85 | 2.43 | 2.51 | 439 MB |
| lan12 | 2 | 0.74 | 0.01 | 0.13 | 1.86 | 1.88 | 2.43 | 2.50 | 436 MB |

Other `parseFods` phases observed on lan14: collecting table blocks ~0.25 s, removing table blocks ~0.23 s, renderer traversal ~45.95–46.28 s; remaining style scans and attachments were small compared with DOM parse and model construction. On lan06 the renderer path took ~1.5 s end-to-end; lan11/lan12 similarly took ~1.8–1.9 s.

The approximate full open time (Python pipeline + `loadFromFods`) is therefore 206–210 s for lan14, 134–139 s for lan06, 13.1–13.6 s for lan11, and 15.0–15.9 s for lan12, subject to startup, payload marshal, and stage-script versus app timing differences. `loadFromFods` time cannot be subtracted from parser time and called a clean bridge measurement: it contains additional JS work and no separate Python return timer. Exact bridge transfer and total peak memory including renderer children remain NOT RUN / unavailable with current hooks.

## Interpretation

1. lan14 is dominated by both Python transformation (~112 s) and renderer parse/model (~94–97 s). FODS is 316 MB; renderer DOM parsing and model construction alone are ~76 s.
2. lan06 is dominated by Python transformation (~132–137 s), with metadata overlay and layout overlay taking about 62–67 s together. Optimization reduces its XML from 334 MB to 4.15 MB, yet that happens after the expensive overlays.
3. lan11/lan12 are not representative of large intermediate FODS despite similarly large XLSX files; their end-to-end time is about 13–16 s. Benchmarks need at least these cases to catch regressions.
4. Peak Python process working set was ~4.9 GB (lan14), ~3.8 GB (lan06), ~0.36 GB (lan11), and ~0.44 GB (lan12). This is high even though process sampling excludes Chromium's memory.

## Status

FINDINGS: Python pipeline and renderer measured twice per workbook in foreground. Renderer bridge transfer was not separately measurable; peak memory is Python-only. No prototype evaluation has been performed yet.
FILES CHANGED: This findings document only.
COMMANDS RUN: Eight Python stage-script runs; eight foreground desktop launches with `VNO_PERF_DEBUG=1`; PowerShell process peak-working-set queries; read-only source/doc inspection.
BUILD RESULT: NOT RUN.
TEST RESULTS: NOT RUN (measurement-only task).
KNOWN FAILURES: None in completed measurement runs.
RISKS: Machine load was not controlled; only two runs per workbook. `PeakWorkingSet64` is process-local and excludes child renderer process memory. The bridge transfer interval is not instrumented.
DEPENDENCIES/BLOCKERS: None for this findings checkpoint.
NEXT ACTION: Evaluate streaming XML/model prototype and other architecture options in scratch, then write the implementation plan with measured uncertainties and safeguards.
