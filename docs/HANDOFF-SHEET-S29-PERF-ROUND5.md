# Handoff Sheet S29 Performance — Round 5

TASK: Profile lan14 `parseFods` workbook-model construction and evaluate one per-cell optimization.
AGENT/ROLE: Codex — Sheet performance
BRANCH: `perf/sheet-s29-codex-r5`
WORKTREE: `E:\VNOffice-codex-sheet-s29d`
OBJECTIVE: Measure multiple foreground runs before and after a single targeted change; preserve parser output and report observed performance honestly.

## Findings

The candidate targeted per-cell attribute collection:

```js
Object.fromEntries(Array.from(cell.attributes).map(attr => [attr.name, attr.value]))
```

was temporarily replaced with a direct `for...of` loop assigning to a plain object. This removes the intermediate array and `[name, value]` pairs. It was the only parser change evaluated. The candidate did **not** establish a measurable improvement larger than run-to-run variation, so it was reverted. The parser source is unchanged from the branch starting point.

All measurements used foreground desktop launches with `LOCALAPPDATA=E:\VNOffice-profiles\codex`, `VNO_PERF_DEBUG=1`, and `python -u main.py "E:\VN OFice\file test\lan\lan14.xlsx"`. The phase values below are from the real Chromium DOM path.

| Run | Build workbook model (ms) | DOM parse (ms) | parseFods total (ms) |
|---|---:|---:|---:|
| Before 1 | 32,745.9 | 36,940.3 | 87,156.1 |
| Before 2 | 34,745.0 | 37,795.9 | 89,029.1 |
| Before 3 | 36,421.1 | 37,160.1 | 91,534.5 |
| After 1 | 32,161.4 | 42,849.8 | 98,112.5 |
| After 2 | 33,660.2 | 38,533.9 | 90,214.8 |
| After 3 | 38,103.7 | 38,597.6 | 97,098.6 |

Before model range: **32.7–36.4 s** (median 34.7 s). After candidate range: **32.2–38.1 s** (median 33.7 s). The medians differ by about 1.1 s, while the ranges overlap by 3.7 s and the after run spans 5.9 s. This is not enough evidence to attribute a speedup to the candidate. `parseFods` total also varied substantially; before range was **87.2–91.5 s**, after range **90.2–98.1 s**. Do not claim a performance improvement.

The first before run took approximately 4 minutes to emit its first phase timers; later runs showed similar startup/conversion delay. Run order was three baseline runs, one parser edit, then three candidate runs. Other system load was not controlled, which further limits comparison.

## Output equivalence

While the candidate was active, `node tests/run-tests.js` ran the committed workbook SHA-256 snapshot check for all four FODS fixtures. It passed as part of the full suite (**1835/1835 PASS**). The check normalizes `Map` and `Set` values before hashing; hashes matched the pre-optimization baselines:

| Fixture | SHA-256 | Result |
|---|---|---|
| `sample-sheet.fods` | `27d6a029634b9d23b3018034ec3ac3e31f2695dc336f60a081eac86a2de15129` | EQUAL |
| `sample-sheet-validation.fods` | `5a61f84f3e86fec0fbda3ce2f3184723f5282a2109e2669ac85bd5c7343bf4d0` | EQUAL |
| `sample-sheet-pivot.fods` | `9da11d96699646fd171f3e71d520aeeb5c3ce61fea3683e1657fd601195c56c5` | EQUAL |
| `sample-sheet-formulas.fods` | `6fe5161ffbdb734037194fd132e3ddfd615074142f7a4ff2c00f9b3b9f19d9db` | EQUAL |

## Handoff fields

IMPLEMENTATION SUMMARY: Measured three foreground baseline and three candidate runs. Evaluated direct DOM-attribute copying, observed no improvement beyond measurement noise, and reverted it. Added this handoff with the measurements and snapshot evidence.
FILES CHANGED: `docs/HANDOFF-SHEET-S29-PERF-ROUND5.md` only.
COMMANDS RUN: Three baseline and three candidate foreground app launches; `node tests/run-tests.js`; `python -m unittest discover -s tests -p "test_*.py"`; `git diff --check`.
BUILD RESULT: NOT RUN.
TEST RESULTS: Node suite PASS 1835/1835 (including all four workbook SHA-256 snapshots). Python suite PASS, 346 tests in 283.693s.
KNOWN FAILURES: None observed in completed Node suite or fixture hash checks.
RISKS: No measurable speedup established; timing ranges overlap and vary substantially. Full end-to-end parser totals have even greater variance. No source optimization is retained.
DEPENDENCIES/BLOCKERS: None.
CORE PATCH ID (if any): N/A.
NEXT ACTION: If profiling continues, instrument broad per-row subphases with low timer overhead before choosing another edit; preserve the used-range and S8–S32 behavior.
