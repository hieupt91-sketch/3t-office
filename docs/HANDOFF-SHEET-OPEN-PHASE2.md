# Agent Handoff

TASK: Sheet open performance Phase 2 scratch prototype and measurements
AGENT/ROLE: Codex / primary coding agent
BRANCH: `perf/sheet-open-phase2-codex`
WORKTREE: `E:\VNOffice-codex-sheet-open-phase2`

OBJECTIVE: Test a streaming FODS-to-model payload under `scripts/perf-proto/` only; compare its normalized workbook model with `SheetAdapter.parseFods`; record two-run converter and WebView2 measurements; propose a later, flagged integration with rollback.

FINDINGS:

- Edge/WebView2 model comparison: **PASS — MODEL IDENTICAL** for four required fixtures, one extra charts fixture and LAN11/12/28/06/14 (10 FODS inputs total).
- Two foreground converter and WebView2 benchmark runs completed for each available LAN FODS. LAN14 payload was 18.11 MB from a 322.64 MB FODS; conversion took 43.842/43.875 s and renderer model build took 20.782/20.970 s.
- An estimated ~185 s full-open path remains far above the <60 s target. This is a projection only; the application path was not integrated or timed end to end.
- LAN06 and LAN14 FODS regeneration from XLSX is **NOT RUN / BLOCKED** because source XLSX inputs were unavailable. Existing FODS artifacts were used read-only.
- Full findings, exact measurements, field inventory and limitations: `docs/HANDOFF-SHEET-OPEN-PHASE2-FINDINGS.md`.

IMPLEMENTATION SUMMARY: Added a standard-library Python streaming payload converter, scratch JavaScript workbook loader using existing SheetAdapter helpers, payload-aware model comparison, and WebView2 bridge/parse/build/parity harness. Updated the initial findings and wrote the Phase 2 proposal. No production source changed and no dependency was added.

FILES CHANGED:

- `scripts/perf-proto/fods_to_sheet_payload.py`
- `scripts/perf-proto/sheet-payload-loader.mjs`
- `scripts/perf-proto/compare_parsefods_models.mjs`
- `scripts/perf-proto/webview_payload_probe.py`
- `scripts/perf-proto/webview_payload_probe.html`
- `scripts/perf-proto/webview_payload_probe.mjs`
- `docs/HANDOFF-SHEET-OPEN-PHASE2-FINDINGS.md`
- `docs/PLAN-SHEET-OPEN-PERF-PHASE2.md`
- `docs/HANDOFF-SHEET-OPEN-PHASE2.md`

COMMANDS RUN:

- `python scripts/layout-audit/_time_sheet_open_stages.py <xlsx> <out.fods>` for available LAN11, LAN12 and LAN28 XLSX sources.
- `python scripts/perf-proto/fods_to_sheet_payload.py <fods> <payload.json>` twice per LAN FODS input.
- `python scripts/perf-proto/webview_payload_probe.py <payload.json>` twice per LAN input for timings; also used with source FODS for model parity and baseline parse timing.
- WebView2/Edge parity run for five fixture FODS and five LAN FODS.
- `node --check` on changed `.mjs` files and Python `py_compile` on changed `.py` files.
- `git diff --check` before final commit.

BUILD RESULT: **NOT RUN** — no product code or build configuration changed.

TEST RESULTS:

- Scratch prototype parity: **PASS** on 10 inputs in Edge/WebView2.
- Scratch two-run performance measurements: **PASS** for LAN11/12/28/06/14 FODS inputs.
- Product unit/integration suite: **NOT RUN** — no product source changed.
- Full app, grid, editing, save/round-trip and process memory acceptance: **NOT RUN**.
- LAN06/LAN14 source-to-final-FODS regeneration: **BLOCKED** — XLSX input files unavailable.
- LAN14 <60 s acceptance: **NOT ACHIEVED**; estimated path is ~185 s and not measured end to end.

KNOWN FAILURES: The Node CLI comparator can use a regex parser fallback instead of the WebView2 DOMParser path and differs on the formulas fixture. Reported parity was therefore measured in Edge/WebView2. No Edge/WebView2 model differences were found.

RISKS: The payload still costs about 44 seconds to create for LAN14 after current FODS processing and about 21 seconds to reconstruct its model. Full app memory, grid initialization, save behavior, unusual FODS forms and end-to-end timing remain unmeasured. The prototype calls existing private Adapter helpers, so later integration should expose an owned adapter entry point. See `docs/PLAN-SHEET-OPEN-PERF-PHASE2.md`.

DEPENDENCIES/BLOCKERS: No new dependency. Missing LAN06/LAN14 source XLSX inputs block regenerating those FODS artifacts from the source files.

CORE PATCH ID (if any): N/A — no Core/upstream changes.

NEXT ACTION: Review the Phase 2 integration proposal. If accepted, prepare a separate implementation plan and review before touching `main.py` or product Adapter code. Keep the feature flag off by default and preserve legacy loading/rollback.
