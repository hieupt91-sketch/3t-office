# Plan: Writer real-export fidelity audit

## Objective

Verify Writer features against files genuinely converted by LibreOffice (`_contentForExport()` -> soffice -> PDF/DOCX), add permanent `node:assert` probes, and immediately fix small/clear HTML-filter incompatibilities found within the allowed Writer scope.

## Current capability

- Baseline `main` is `800ae63`; the supplied status is 1103/1103 tests passing.
- Existing real probes cover Page Break/Mail Merge, Labels, Citations, Captions, Arrange, Page Color, and part of Section Breaks.
- The canvas uses browser HTML/CSS and therefore cannot prove LibreOffice Writer HTML-import fidelity.

## Files/modules in scope

- `adapters/libreoffice/writer/writer-adapter.js`
- Relevant `apps/writer/**` implementation only
- Permanent real-conversion probes under `tests/live/**`
- Final report `docs/HANDOFF-WRITER-REALEXPORT-AUDIT.md`

No Sheet/Slides source, shared platform, LibreOffice Core/upstream, build-system, dependency, security-boundary, or file-format semantic changes are planned.

## Audit order and measurements

1. Watermark, Page Border, Header/Footer, Track Changes export view, Table of Contents.
2. Columns/Column Break, Drop Cap, WordArt.
3. Footnotes/Endnotes, Citations.
4. Reconfirm Page Color and Section Break outcomes from existing probes; inventory remaining Writer export-facing features and classify their evidence.

Measurements will use assertions over real PDF bytes/content streams/page geometry and DOCX package XML or soffice round-trip output. Visual-only properties will be rasterized/pixel-tested when byte/XML evidence is insufficient. A probe must fail clearly when the promised effect is absent.

## Dependencies

- Installed LibreOffice/soffice via `tests/helpers/soffice-convert.mjs`.
- Built-in Node modules only; no paid library or new dependency.

## Risks

- LibreOffice may flatten visual effects, so HTML round trips alone can lose evidence even when PDF is visually correct.
- PDF streams can be compressed; probes must inflate streams or inspect DOCX XML rather than search naïve plaintext.
- Header/footer and notes may survive only as visible static content rather than native OOXML structures; the report will distinguish visual fidelity from semantic/native fidelity.

## Test plan

- Run every new/updated `tests/live/*.mjs` probe with installed soffice.
- Run the existing relevant live probes for Page Break, Labels, Citations, and Section Break/Page Color.
- Run `node tests/run-tests.js`; report exact counts and never claim PASS for an unrun check.

## Rollback

Each independently found bug gets its own commit. Reverting that commit restores the prior export implementation and its paired regression probe without affecting other fixes. The branch will not be merged into `main` by this task.
