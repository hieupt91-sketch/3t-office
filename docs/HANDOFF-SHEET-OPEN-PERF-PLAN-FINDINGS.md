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

The timing script also recorded these per-run stages (not repeated in the table): visibility adjustment; structure protection; active sheet; freeze panes; autofilter; covered formula errors; tab colors where present; drawing image IDs. Most were below one second. On lan06, layout and metadata are the notable exceptions. On lan14, metadata + optimize + XF reoverlay account for roughly 84 seconds, before JS parsing. “FODS final MB” above is the Python string character count divided by 1e6, as emitted by that script; it is not encoded UTF-8 file bytes.

Notable size behavior: lan14 raw FODS was 257.17 MB, metadata overlay peaked at 325.62 MB, optimizer output was 311.25 MB, and final XF reoverlay output was 316.01 million Python characters. The separate final FODS file supplied for profiling was 322.64 MB encoded on disk. lan06 raw FODS was 146.19 MB, layout overlay 147.84 MB, metadata overlay 334.36 MB, optimizer output 4.15 MB, and final XF output 4.44 million Python characters.

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

The scratch WebView2 harness measured Python→WebView transport separately from a direct `DOMParser` call on the received FODS string:

| Workbook/payload | Run | JS string chars | Bridge transfer | Direct DOMParser | Parse result |
|---|---:|---:|---:|---:|---|
| lan14 FODS | 1 | 316,007,034 | 55.95 s | 38.40 s | valid XML |
| lan14 FODS | 2 | 316,007,034 | 55.72 s | 38.46 s | valid XML |
| lan06 FODS | 1 | 4,443,368 | 0.30 s | 0.38 s | valid XML |
| lan06 FODS | 2 | 4,443,368 | 0.24 s | 0.39 s | valid XML |
| lan11 FODS | 1 | 20,196,922 | 1.24 s | 0.88 s | valid XML |
| lan11 FODS | 2 | 20,196,922 | 1.10 s | 1.03 s | valid XML |
| lan12 FODS | 1 | 27,385,022 | 1.63 s | 0.69 s | valid XML |
| lan12 FODS | 2 | 27,385,022 | 1.54 s | 0.79 s | valid XML |

Other `parseFods` phases observed on lan14: collecting table blocks ~0.25 s, removing table blocks ~0.23 s, renderer traversal ~45.95–46.28 s; remaining style scans and attachments were small compared with DOM parse and model construction. On lan06 the renderer path took ~1.5 s end-to-end; lan11/lan12 similarly took ~1.8–1.9 s.

Estimated pipeline + transport + app `loadFromFods` is 263–265 s for lan14, 134–139 s for lan06, 14.2–14.8 s for lan11, and 16.6–17.5 s for lan12. This remains an estimate assembled from separate harness/script runs, excludes initial app start and user file-selection delay, and is sensitive to machine load. It indicates the brief’s earlier 210–240 s lan14 estimate misses approximately 56 s of bridge transport under this harness. App `loadFromFods` is the actual load timer and is not substituted with the harness’s direct DOM parse.

## Scratch architecture probes

- A standard-library `ElementTree.iterparse` prototype walked lan14 and emitted a compact row/cell JSON subset, retaining cell/row attributes and cell text. It took 38.34 s including attribute-name interning and emitted 189.76 MB (185,784,503 JS string chars), versus a 316.01 million-character FODS string. It emitted 72,255 rows and 1,696,530 cells across 10 tables. This subset omits non-cell workbook semantics such as style tables, conditional formatting, validation, pivots, charts, names, protection, and other model features; it is not an equivalent parser.
- JSON.parse of that payload in the actual WebView2 runtime took 1.50 s and 1.79 s across two foreground runs; transfer of the JSON string took 37.43 s and 38.37 s. A Node/V8 proxy parsed in 2.90 s and reached 1.27 GB heap / 1.54 GB RSS. The naive verbose JSON variant was 622.97 MB and Node could not create a string over its 512 MiB limit. The compact probe is promising as a direction for investigation, not evidence that a complete workbook model is faster or equivalent.
- An Expat scratch scan took 6.31 s and found active sheet `Sheet1` occupies 305.24 MB of the 322.64 MB on-disk FODS (about 95%); the next sheet was 6.82 MB and remaining worksheets were smaller. Loading complete worksheets lazily alone therefore leaves nearly all lan14 payload in the initially active sheet; viewport/row chunking would be needed for a large first-render reduction.
- For option B, measured lan14 optimize + XF reoverlay passes consume 53.7–55.0 s; metadata overlay adds ~29.5–29.8 s. This bounds a possible saving only if a replacement actually removes work; it is not safe to assume fusion simply saves the sum because the operations encode different formatting/coordinate behaviors.

## Interpretation

1. lan14 is dominated by Python transformation (~112 s), bridge transport (~56 s), and renderer parse/model (~94–97 s). FODS is 316 million JS string characters; renderer DOM parsing and model construction alone are ~76 s.
2. lan06 is dominated by Python transformation (~132–137 s), with metadata overlay and layout overlay taking about 62–67 s together. Optimization reduces its XML from 334 MB to 4.15 MB, yet that happens after the expensive overlays.
3. lan11/lan12 are not representative of large intermediate FODS despite similarly large XLSX files; their end-to-end time is about 13–16 s. Benchmarks need at least these cases to catch regressions.
4. Peak Python process working set was ~4.9 GB (lan14), ~3.8 GB (lan06), ~0.36 GB (lan11), and ~0.44 GB (lan12). The Python process peak is sampled from the live app process; WebView2 renderer child-process memory is not included.

## Status

FINDINGS: Python pipeline, actual app renderer, and scratch bridge/DOMParser path measured twice per workbook in foreground. Also ran a compact JSON streaming prototype and WebView2 `JSON.parse` probe, and an Expat worksheet byte-span scan.
FILES CHANGED: Findings document and scratch-only probes under `scripts/perf-proto/`.
COMMANDS RUN: Eight Python stage-script runs; eight foreground desktop launches with `VNO_PERF_DEBUG=1`; eight FODS bridge/DOMParser harness runs; two WebView2 JSON bridge/parse runs; iterparse/JSON sizing runs; Node V8 proxy; Expat sheet sizing scan; PowerShell process peak-working-set queries; read-only source/doc inspection.
BUILD RESULT: NOT RUN.
TEST RESULTS: NOT RUN (measurement-only task).
KNOWN FAILURES: None in completed measurement runs.
RISKS: Machine load was not controlled; only two runs per workbook. `PeakWorkingSet64` excludes child renderer memory. JSON prototype omits workbook semantics and cannot support any fidelity claim.
DEPENDENCIES/BLOCKERS: None for this findings checkpoint.
NEXT ACTION: Compare streaming conversion, pass fusion, and viewport/lazy loading using these measurements; write a staged implementation plan with fidelity gates and rollback.
