# PLAN-DOC-T12-CHART

## Objective

Make charts newly inserted with VN Writer save as editable native charts in DOCX (a `word/charts/chart*.xml` part with its workbook embedding), and keep newly inserted diagrams editable as grouped shapes. Preserve imported documents and existing chart/image behavior. This plan covers the native-object work required by FIX-T12; the remaining Word parity items are sequenced in the ticket handoff.

## Current capability

- `writer.chart.insert` and `writer.diagram.insert` are owned by the Writer adapter and UI command layer.
- New chart HTML is serialized into ODF/FODT chart objects by `writer-adapter.js`; the existing LibreOffice conversion path is the preferred route to DOCX.
- The prior Word COM audit in `docs/AGENT-HANDOFF-FIX-T11-CODEX.md` found no native Chart or SmartArt for the examples, and current UI help describes chart/diagram as illustrations.
- The adapter already has OOXML package patching support in `adapters/libreoffice/common/ooxml_zip_patch.py`; inspect and reuse it before adding any serializer or dependency.

## Files and modules to inspect/change

- `adapters/libreoffice/writer/writer-adapter.js`: new-object serialization/export integration; preserve imported HTML and existing document parts.
- `adapters/libreoffice/common/ooxml_zip_patch.py`: only if the existing LibreOffice-produced DOCX needs a narrowly scoped package/relationship fix.
- `apps/writer/` chart/diagram presentation and ribbon commands: only if needed to keep inserted objects editable in the app.
- `platform/help/entries-writer.js`, `platform/i18n/strings-vi.js`, `platform/i18n/strings-en.js`: concrete Vietnamese usage help and labels/tooltips for any changed UI.
- Writer unit/live tests and ticket-specific Word COM/CDP audit artifacts: add coverage for newly inserted native objects, without rewriting expected results to mask failures.

## Dependencies and boundaries

- Reuse LibreOffice's ODF chart import/export and the existing DOCX patcher before writing new OOXML.
- Keep UI on the Writer command/adapter boundary; do not call LibreOffice internals from UI.
- Only objects newly inserted by this app may receive changed DOCX semantics. Do not rewrite or normalize imported document objects.
- Do not modify LibreOffice Core or add a large dependency. If the existing conversion route cannot produce editable Word charts, document the exact limitation and reassess before choosing another format path.

## Sequence

1. Inspect the existing chart export and package patch paths and establish the Word COM oracle on a minimal document with one inserted chart and one diagram.
2. Reuse the LibreOffice chart conversion path; adjust the adapter/package integration only where the minimal oracle shows the exported object is not editable.
3. Keep diagrams as editable grouped shapes; verify selection and editing after DOCX round-trip.
4. Add targeted automated coverage and Vietnamese in-app guidance for the actual Insert ribbon controls.
5. Run the ticket's required tests, DOCX corpus batch and Word COM checks; record each result truthfully in the handoff.

## Risks

- DOCX chart relationships and embedded workbook parts must agree; a visually rendered image alone does not meet the requirement.
- LibreOffice conversion can change unsupported chart attributes; test representative chart types and preserve existing content.
- Grouped-shape export may differ from SmartArt semantics; the accepted target is editability as a group, not native SmartArt.
- Package patching can damage imported parts if it is not restricted to new objects.

## Test plan

- Focused chart/diagram unit and round-trip tests, without modifying tests merely to pass.
- Word COM inspection of `InlineShapes`/`Shapes` and chart editability for a newly inserted chart; inspect resulting DOCX parts/relationships/embedding.
- Existing ticket corpus batch: DOCX d01,d02,d06,d07,d13,d20,d24; verify imported documents remain unchanged in semantics.
- Required project suites from FIX-T12: `npm test`, `python -m unittest discover -s tests`, encoding sweep, and relevant batch audits. Report unavailable or flaky portions as NOT RUN/BLOCKED/FAIL accurately.

## Rollback

Revert only the T12 chart/diagram implementation commit(s). The plan and handoff remain as audit records. Do not reset, clean, or rewrite unrelated worktree history.
