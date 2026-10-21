# Plan Q43 — Sheet XLSX overlay metadata

## Objective
Reduce warm, editable Sheet open time for LAN01 and LAN09 by at least 50% (median <=25 s), without regressing LAN28 or LAN14 (<=91 s), and preserve byte-identical overlay/compact-payload output and save quality. The first implementation step is measurement; optimization is conditional on a safe, attributable bottleneck.

## Current capability
- The XLSX→FODS import calls `overlay_sheet_xlsx_fods_p1` and emits per-helper timings only when `VNO_PERF_DEBUG=1`.
- The P1 path parses cell metadata once and shares it with the cell overlay; chart/pivot metadata helpers remain sequential and several independently read XLSX XML.
- Q42 warm editable medians: LAN01 51.73 s, LAN09 42.03 s, LAN28 3.50 s. LAN14's Q42 app run did not respond after 562.8 s; separate save-stage probes are required for save validation.
- Existing prototype notes report only 0.136 s mean savings for an earlier scratch overlay optimization, so that result does not support the current 50% target.

## Files/modules
- Primary candidate: `adapters/libreoffice/common/ooxml_zip_patch.py`.
- Focused regression tests: existing Python OOXML/overlay tests; add a focused test only if a reproducible behavior needs a new assertion.
- Evidence: `docs/PERF-Q43-OVERLAY.md` and the standard handoff template.
- No LibreOffice Core patch, document-format change, app UI change, or dependency change is planned.

## Dependencies and measurements
- LAN corpus at `E:\VN OFiceile test\lan`, including LAN01/09/28/14.
- Desktop app via CDP with a unique `VNO_CDP_LOCALAPPDATA` profile per run; one app at a time. Excel COM remains BLOCKED; use the approved LibreOffice comparison/audit path.
- `CODEX-COMMON-RULES.md` exists under `E:\VNOffice-briefs`; requested `docs/LAN14-DIAG.md` is named `docs/DIAG-LAN14.md` in this checkout. The requested memory entry has no accessible source in the current tool session.

## Risks
- Concurrent parsing can increase peak memory and change ordering; do not parallelize until measured independence and deterministic output are proven.
- Lazy chart/pivot metadata may expose incomplete state or alter save results; do not defer metadata beyond first grid without an explicit parity and save proof.
- Any fast path must be opt-in with a `VNO_` flag and retain the existing fallback.
- LAN14 can take several minutes and has a known renderer hang during one historical round-trip path; never run multiple app instances concurrently.

## Test and comparison plan
1. Capture at least three baseline app runs each for LAN01 and LAN09, and baseline LAN28/LAN14 where practical; record min/median/max and per-helper overlay timings.
2. Profile the existing overlay helper internals and select only a measurable, byte-preserving optimization. Run a focused regression that fails before and passes after for that optimization.
3. Measure after runs with the same app, fixture, and profile policy; SHA-256 compare overlay FODS and compact payloads for all 27 requested LAN files and the first 5,000 JavaScript cells.
4. Run the requested full unit/integration gates, LAN batch audit, LAN14 save probe and reopen verification, and visually inspect CDP screenshots for each app screen reached.

## Rollback
Disable the new optimization with its `VNO_` flag or remove the opt-in path; the current overlay pipeline remains the fallback. Keep changes confined to the adapter and targeted tests unless evidence requires a separately planned follow-up.
