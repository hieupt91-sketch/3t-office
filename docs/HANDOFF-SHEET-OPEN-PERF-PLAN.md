# Agent Handoff

TASK: S33 — đo và lập kế hoạch tăng tốc mở workbook lớn trong VN Sheet; không sửa code sản phẩm.
AGENT/ROLE: Codex — Sheet performance planning
BRANCH: `plan/sheet-open-perf-codex`
WORKTREE: `E:\VNOffice-codex-sheet-open-perf`
OBJECTIVE: Đo hai lượt trên lan14/lan06/lan11/lan12 cho Python, WebView2 bridge, renderer và peak working set; thử nguyên mẫu kiến trúc scratch; commit findings trước kế hoạch; đề xuất các phase có risk, test, rollback và estimates.

## FINDINGS

- Baseline ước tính gồm các lần đo độc lập: lan14 263–265 s, lan06 134–139 s, lan11 14.2–14.8 s, lan12 16.6–17.5 s. Đây chưa gồm app startup/file-dialog. lan14 có khoảng 56 s bridge Python→WebView2 mà ước lượng trước đây chưa tách.
- lan14: Python 111.83–112.64 s; bridge 55.72–55.95 s; `loadFromFods` 94.55–97.13 s; FODS cuối 316.01 triệu ký tự; peak working set process Python 4.92 GB.
- lan06: Python 131.96–136.87 s; bridge 0.24–0.30 s; `loadFromFods` 1.84–1.92 s; FODS cuối 4.44 triệu ký tự; peak 3.81 GB.
- lan11: Python 10.91–11.24 s; bridge 1.10–1.24 s; `loadFromFods` 2.20–2.31 s; FODS cuối 20.20 triệu ký tự; peak 0.36 GB.
- lan12: Python 12.62–13.42 s; bridge 1.54–1.63 s; `loadFromFods` 2.43 s; FODS cuối 27.39 triệu ký tự; peak 0.44 GB.
- Scratch `ElementTree.iterparse` emitted a compact but incomplete lan14 JSON subset in 38.34 s, 189.76 MB. WebView2 JSON bridge was 37.43–38.37 s; `JSON.parse` 1.50–1.79 s. The model omits important workbook semantics and is not a fidelity candidate yet.
- Scratch Expat scan measured active Sheet1 at 305.24 MB of 322.64 MB on disk; lazy loading by worksheet alone will not materially cut initial payload.

Full stage data, two runs per workbook, methods, limitations, and prototype details are in [HANDOFF-SHEET-OPEN-PERF-PLAN-FINDINGS.md](/E:/VNOffice-codex-sheet-open-perf/docs/HANDOFF-SHEET-OPEN-PERF-PLAN-FINDINGS.md). Architecture assessment, current capability, proposed modules, dependency constraints, risk controls, tests, rollback, phase estimates, and the proposed first step are in [PLAN-SHEET-OPEN-PERF.md](/E:/VNOffice-codex-sheet-open-perf/docs/PLAN-SHEET-OPEN-PERF.md).

IMPLEMENTATION SUMMARY: Measurement-only. No product source changed. Added scratch prototypes under `scripts/perf-proto/`, committed measurement findings before the plan, evaluated streaming JSON, pass fusion, lazy worksheet/viewport loading, and their combination. Recommended first approval step is a scratch-only prototype to fuse optimizer + XF reoverlay and compare semantics before editing the app.
FILES CHANGED: `docs/HANDOFF-SHEET-OPEN-PERF-PLAN-FINDINGS.md`, `docs/PLAN-SHEET-OPEN-PERF.md`, `scripts/perf-proto/fods_iterparse_json_probe.py`, `scripts/perf-proto/fods_sheet_size_probe.py`, `scripts/perf-proto/json_parse_probe.js`, `scripts/perf-proto/webview_payload_probe.py`, this handoff.
COMMANDS RUN: Eight foreground `_time_sheet_open_stages.py` runs; eight foreground app launches with `VNO_PERF_DEBUG=1`; eight scratch FODS bridge/DOMParser runs; two WebView2 JSON bridge/parse runs; iterparse/JSON size probes; Node V8 JSON parse proxy; Expat sheet-span scan; PowerShell process peak-working-set queries; `git diff --check`.
BUILD RESULT: NOT RUN (no product code changed).
TEST RESULTS: NOT RUN (measurement and planning only; no test suite was requested or run).
KNOWN FAILURES: The first scratch WebView2 harness stored its Window object on the API and triggered pywebview recursive native-property inspection; corrected by keeping the reference at module scope, then reran the measurements. Node could not construct a string from the naive 622.97 MB JSON variant due its V8 string-length limit; compact variant parsed successfully. No app measurement run failed.
RISKS: Runs were sequential but system load was not controlled. App peak working set excludes WebView2 child renderer processes. The compact JSON prototype omits many workbook semantics. Estimates are hypotheses, not measured post-change performance. lan14 remains far above the <60 s target.
DEPENDENCIES/BLOCKERS: No implementation blocker. Plan review by the responsible owner is needed before source changes begin. No new dependency was introduced.
CORE PATCH ID (if any): N/A — no upstream/Core changes.
NEXT ACTION: Have the responsible owner review the plan and decide whether to authorize phase 1 scratch prototype. No merge to `main` was performed.
