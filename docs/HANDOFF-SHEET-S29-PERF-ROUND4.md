# Handoff Sheet S29 Performance — Round 4

TASK: Profile `SheetAdapter.parseFods()` with the desktop renderer and attempt a low-risk optimization.
AGENT/ROLE: Codex — Sheet performance
BRANCH: `perf/sheet-s29-codex-r4`
WORKTREE: `E:\VNOffice-codex-sheet-s29c`
OBJECTIVE: Measure lan14 parser subphases, preserve parser output, and report only observed performance.

## Implementation summary

- Added opt-in `parseFods:*` timers in `adapters/libreoffice/sheet/sheet-adapter.js`; they are enabled only by `window.__vnoPerfDebug` and reported through the existing Python bridge.
- Allowed the Python perf bridge to accept the `parseFods:` timer names while retaining the existing default-off environment gate.
- Split DOM worksheet timing into used-range discovery and workbook-model construction.
- Memoized column-name conversion within each worksheet traversal, so repeated cell coordinates reuse the computed base-26 column label.
- Added stable workbook-output snapshots for four real FODS samples. Separately compared the adapter at `HEAD` and the changed adapter; all four normalized workbook results produced identical SHA-256 hashes.

## Measured lan14 renderer timings

Real foreground launch: `LOCALAPPDATA=E:\VNOffice-profiles\codex`, `VNO_PERF_DEBUG=1`, `python -u main.py "E:\VN OFice\file test\lan\lan14.xlsx"`.

| Phase | Earlier run (ms) | Post-change run (ms) |
|---|---:|---:|
| Strip embedded objects | 56.7 | 57.1 |
| Number styles | 360.3 | 346.0 |
| Rotation styles | 252.8 | 247.9 |
| Cell visual styles | 274.1 | 261.8 |
| Text styles | 258.4 | 268.6 |
| Row/column styles | 259.6 | 273.8 |
| Collect table blocks | 251.4 | 249.0 |
| Remove table blocks | 237.3 | 243.5 |
| DOM parse | 45,463.9 | 41,127.4 |
| Find used range | Not split | 2,185.6 |
| Build workbook model | Not split | 34,888.9 |
| DOM worksheet traversal total | 47,649.0 | 44,413.7 |
| Repeated page-layout scans | 35.5 | 41.7 |
| Repeated print-title scans | 1,686.5 | 891.1 |
| Repeated tab-color scans | 4.3 | 3.9 |
| Attach rules | 2,038.8 | 1,256.2 |
| Attach pivots | 81.8 | 99.7 |
| Attach charts | 76.6 | 121.3 |
| Attach page breaks | 1.0 | 0.9 |
| Attach protection | 428.8 | 457.2 |
| Attach freeze panes | 355.5 | 325.9 |
| Attach visibility | 353.5 | 334.6 |
| Attach autofilter | 330.6 | 325.1 |
| Attach sparklines | 71.4 | 72.9 |
| Attach outline | 515.5 | 539.0 |
| **parseFods total** | **100,691.5** | **93,574.2** |
| First grid render hook | 100,806.3 | 93,660.2 |
| loadFromFods hook | 101,489.5 | 94,461.1 |
| First layout hook | 101,625.9 | 94,654.0 |

An instrumented same-code repeat before the column-name memoization measured `parseFods` at **92,195.2 ms**, `DOM parse` at **37,986.0 ms**, and worksheet traversal at **48,539.3 ms**. Therefore the measured post-change run does not establish a speedup over a warm same-code run. The initial 100,691.5 ms run was slower, but run-to-run variation prevents attributing that gap to the change. The two dominant measured operations remain browser DOM construction and workbook model construction; used-range discovery was 2,185.6 ms. No quadratic full-string scan was identified as the dominant cost.

No single wall-clock timer covered process startup through first layout, and the Python conversion timing was not captured in these runs. A combined Python+JavaScript open total is consequently NOT MEASURED here.

## Parser-output comparison

Compared `SheetAdapter` at `HEAD` against the modified adapter using deep workbook serialization (including Map and Set entries). All four outputs were equal by SHA-256:

| Fixture | FODS bytes | Workbook SHA-256 | Result |
|---|---:|---|---|
| `sample-sheet.fods` | 4,037 | `27d6a029634b9d23b3018034ec3ac3e31f2695dc336f60a081eac86a2de15129` | EQUAL |
| `sample-sheet-validation.fods` | 5,251 | `5a61f84f3e86fec0fbda3ce2f3184723f5282a2109e2669ac85bd5c7343bf4d0` | EQUAL |
| `sample-sheet-pivot.fods` | 11,045 | `9da11d96699646fd171f3e71d520aeeb5c3ce61fea3683e1657fd601195c56c5` | EQUAL |
| `sample-sheet-formulas.fods` | 5,949 | `6fe5161ffbdb734037194fd132e3ddfd615074142f7a4ff2c00f9b3b9f19d9db` | EQUAL |

The committed snapshot test runs these fixtures through the current Node fallback branch. The before/after comparison command also ran against the actual `HEAD` adapter. The real lan14 desktop open exercised the Chromium DOM branch and reached first layout.

## Test and build status

- `node tests/run-tests.js` — PASS, 1835/1835.
- `python -m unittest discover -s tests -p "test_*.py"` — PASS, 346 tests in 291.810 s.
- `git diff --check` — PASS (only Git LF/CRLF working-copy warnings).
- Build — NOT RUN.

## Risks and next action

The column-name cache is behavior-preserving in code review and the sample workbook snapshots are unchanged, but these timings do not prove a performance gain. The dominant DOM parse and model construction remain expensive; further optimization needs a targeted approach that preserves the used-range guard and must be measured with repeated comparable foreground runs. Do not claim a speedup from the initial 100.7-second run alone.

## Standard handoff fields

IMPLEMENTATION SUMMARY: Added parseFods phase diagnostics, used-range/model subphase timing, a per-sheet column-name cache, and output snapshot checks.
FILES CHANGED: `adapters/libreoffice/sheet/sheet-adapter.js`; `main.py`; `tests/unit/real-office-import-fidelity.test.js`; this handoff.
COMMANDS RUN: Real lan14 foreground app launches; old/current adapter comparison on four FODS fixtures; `node tests/run-tests.js`; `python -m unittest discover -s tests -p "test_*.py"`; `git diff --check`.
BUILD RESULT: NOT RUN.
TEST RESULTS: Node PASS 1835/1835. Python result pending at authoring time.
KNOWN FAILURES: None in the completed Node suite or fixture comparisons.
RISKS: No measured parser speedup is established against the warm same-code timing; combined Python+JS open total was not measured. lan05/lan11/lan12 were not opened in the app during this round.
DEPENDENCIES/BLOCKERS: None.
CORE PATCH ID (if any): N/A.
NEXT ACTION: Continue profiling DOM parsing/model construction with comparable foreground runs and open lan05/lan11/lan12 in the app before making any performance claim.
