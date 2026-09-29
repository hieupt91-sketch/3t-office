# Sheet Open performance — Phase 2 prototype results and next-step proposal

Date: 29/09/2026
Status: prototype and corpus measurements complete where input files exist; product integration is not part of this phase.

## Objective

Measure whether a streaming FODS-to-model payload can preserve the current `SheetAdapter.parseFods` workbook model while reducing the WebView2 transfer and JavaScript parse/build work for large Sheet workbooks. This is a scratch prototype only. It does not change how the desktop application opens a workbook.

## Current capability and prototype design

The current path converts XLSX into final FODS in Python, bridges the FODS text to WebView2, and then calls `parseFods`/`loadFromFods`. The approved Phase 1 branch was not run or modified.

The scratch path keeps that final FODS input and adds a Python serializer after it. It emits a compact JSON envelope containing support XML without table cell bodies, original style XML blocks where needed, and a deflate-compressed, base64 NDJSON stream for sheet/row/cell records. The WebView2 loader reconstructs the workbook with existing `SheetAdapter` parsing helpers. It does not use `DOMParser`. The harness can also parse the source FODS with the real WebView2/Edge `DOMParser` and deeply compare both models after `toPlain` normalization.

Schema inventory and measured details are in [the findings handoff](HANDOFF-SHEET-OPEN-PHASE2-FINDINGS.md). At a model level, the payload path reproduced the current adapter result for all tested fixtures and LAN FODS. It does not yet demonstrate full app, grid, editing, save, or round-trip behavior.

## Results

There were two independent foreground runs of the payload converter and two runs of each WebView2 stage per LAN workbook. MB is decimal. Each WebView tuple is `bridge / JSON.parse / model build` in milliseconds.

| Workbook | FODS MB | Converter seconds (two runs) | Payload MB | WebView tuple, run 1 | WebView tuple, run 2 | Parity |
|---|---:|---:|---:|---:|---:|---|
| LAN11 | 17.65 | 1.185 / 1.120 | 15.26 | 651 / 22 / 553 | 686 / 20 / 521 | PASS |
| LAN12 | 24.26 | 1.538 / 1.361 | 18.36 | 826 / 26 / 913 | 814 / 26 / 873 | PASS |
| LAN28 | 2.20 | 0.270 / 0.233 | 1.08 | 76 / 2 / 262 | 69 / 2 / 253 | PASS |
| LAN06 | 4.50 | 0.488 / 0.407 | 2.21 | 103 / 5 / 422 | 109 / 5 / 423 | PASS |
| LAN14 | 322.64 | 43.842 / 43.875 | 18.11 | 971 / 28 / 20,782 | 984 / 27 / 20,970 | PASS |

The four requested FODS fixtures (`sample-sheet`, `sample-sheet-validation`, `sample-sheet-pivot`, and `sample-sheet-formulas`) passed model equality in WebView2/Edge. An additional charts fixture also passed. All five LAN comparisons passed. On the final LAN14 parity run, `parseFods` took 87.850 s and the browser reported `parsererror=false`.

For LAN11, LAN12 and LAN28, the XLSX-to-final-FODS stage took 16.25 s, 12.38 s and 6.27 s respectively. LAN06 and LAN14 stage regeneration from XLSX is **NOT RUN / BLOCKED** because the source XLSX files are absent. Their benchmark inputs were existing final FODS artifacts; the LAN14 file is 322,640,518 bytes, matching the existing baseline size. See findings for artifact paths and provenance.

## What the numbers mean for LAN14

The payload falls from 322.64 MB to 18.11 MB (94.4% smaller). Across two WebView2 runs, transfer took 0.971–0.984 s, JSON parsing 0.027–0.028 s and model reconstruction 20.782–20.970 s. The payload converter itself took 43.842–43.875 s **after** the final FODS already existed.

Using the current approved baseline as context (Python FODS pipeline 111.83–112.64 s, FODS bridge 55.72–55.95 s, `loadFromFods` 94.55–97.13 s), an unintegrated projection is approximately 185 s: existing Python pipeline (~112 s) + prototype serializer (~44 s) + transfer/JSON (~1 s) + model build (~21 s) + an assumed ~7 s for remaining grid setup. The ~7 s is inferred from the gap between the current full `loadFromFods` and `parseFods` timings; it has not been measured on the prototype. The projection is not an end-to-end measurement and does not reach the <60 s target.

The observed improvement comes mainly from avoiding the current large FODS bridge and replacing DOM parsing/model build with a model build that still takes about 21 seconds on LAN14. The extra 44-second serializer is currently additional Python work, so this pathway alone does not meet the product goal. A later design would need to remove or combine existing FODS processing passes and likely reduce work before the first visible grid.

## Completeness and limits

No field-level difference was found in the normalized `parseFods` model for the ten FODS files compared in WebView2/Edge. The model includes cell maps and import features such as formulas/styles, comments, merges, names, layout, images, validations, conditional formatting, pivots, charts, protection, freeze panes, visibility, filters, page breaks, sparklines and outline groups when present in the tested FODS.

The LAN14 loader filters `_xlnm.Print_Area` from `namedRangesBySheet` because the current DOM-based `parseFods` result omits this built-in name there; its range is still represented in `printAreaBySheet`. This intentionally matches current adapter output. It does not independently validate whether that output is the ideal format semantics.

Parity is limited to the current FODS corpus. It does not prove completeness for every ODF form, every LAN workbook, or future parser behavior. It does not prove grid rendering, keyboard/navigation behavior, editing, search, recalculation, save/export, XLSX round-trip, failure recovery, offline packaging, or memory use in the complete application. The Node CLI comparator has a parser-regex fallback that differs from the browser DOM path on the formulas fixture; the reported parity therefore uses the Edge/WebView2 harness.

## Integration proposal for review

No product files are changed in this phase. If the owner chooses to continue, use a separate planned change set with these boundaries:

1. Keep LibreOffice conversion and all document semantics behind the existing Python/Adapter boundary. Run serialization inside the Python process already responsible for opening the workbook; do not add a separate Node server/process or move LibreOffice internals into Sheet UI.
2. Add an internal open-path flag defaulting to **off**. The existing FODS + `parseFods` + `loadFromFods` path remains the default and fallback.
3. Add a payload handoff method in the current Python bridge and an Adapter entry point that turns the payload into workbook model. The Sheet UI continues to call the Adapter surface only.
4. Before enabling the flag for any workbook, require model equality, successful grid initialization, mutation/save/round-trip checks, user-visible error handling and memory measurements. Keep the legacy path available for immediate rollback.
5. Integrate only after the owner approves a separate implementation plan covering `main.py`, the Sheet adapter and relevant import/save tests. No change to build system, framework, file-format semantics, security boundary or external dependencies is proposed here.

### Risks

- The scratch serializer depends on existing private `SheetAdapter` helpers, so helper changes can break the prototype and an eventual integration needs an owned Adapter API.
- FODS XML is normalized by ElementTree for support XML; style blocks are separately preserved. Unseen namespaces, unusual markup and embedded object forms need additional corpus coverage.
- The bridge, JSON text, decompressed records and model can overlap in memory. No full-process peak memory measurement was made.
- `parseFods` parity follows current behavior, including the built-in print area behavior described above; parity is not a substitute for round-trip checks.
- Full LAN14 processing remains much slower than the target with this design alone.

### Verification plan before any default switch

- Run the existing unit/import fidelity suite and add equality coverage for both open paths across feature-rich FODS and LAN files.
- Verify grid state, user interaction, search/formula behavior and save/export/round-trip on LAN06/LAN14 and the 26-file LAN regression corpus.
- Measure two foreground full-open runs from file selection through first visible grid, stage timings, Python/WebView2 peak memory, and failure/fallback behavior.
- Require two LAN14 full-open runs below 60 seconds and no round-trip discrepancy before considering a default-on flag.

The suite, full open, grid, round-trip and memory checks above are **NOT RUN** in this prototype phase.

## Rollback proposal

The prototype is isolated under `scripts/perf-proto/`; remove it by reverting its dedicated prototype commit if it is no longer useful. During any future integration, keep the flag off by default and preserve the legacy loader. A payload conversion, parse, model or grid failure must leave the prior workbook intact and fall back to legacy FODS loading or report a clear open error. Never permit save of a partially reconstructed model.

## Current status

- Scratch model comparison: **PASS** on 10 FODS inputs in Edge/WebView2.
- Two-run converter/bridge/parse/build benchmark: **PASS** for the five LAN FODS inputs available.
- LAN06/LAN14 XLSX-to-final-FODS regeneration: **NOT RUN / BLOCKED** (source XLSX absent).
- Product build and test suite: **NOT RUN** (no product source changed).
- Full application/open/render/save/round-trip/memory acceptance: **NOT RUN**.
- LAN14 under 60 seconds: **NOT ACHIEVED**; projection about 185 seconds, not measured end to end.
