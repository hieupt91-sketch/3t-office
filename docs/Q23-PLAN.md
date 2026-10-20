# Q23 implementation plan

## Objective

1. Preserve a slide's chosen layout name through FODP to PPTX export and reopen, and verify the saved package plus hidden PowerPoint COM readback.
2. Add 3, 6, and 9 slides per handout page, including speaker notes, to the shared Slides print dialog and PDF worker path; preview and inspect generated PDFs.

## Current capability

- Slides serializes layout type into FODP; the Python OOXML patcher adjusts layout type after LibreOffice export, while PowerPoint COM currently reads `Standard` for each slide.
- Slides already opens the shared `platform/print/print-dialog.js`, with `prepare_print_document` and `print_document` behind the adapter. Its preview is separate and renders one slide per page.
- Slides Help already exists under Help > Help (F1). Add contextual Vietnamese content and VI/EN strings for the new print options.

## Files/modules likely involved

- `adapters/libreoffice/slides/slides-adapter.js`
- `adapters/libreoffice/common/ooxml_zip_patch.py`
- `apps/slides/slides-canvas.js` only if the shared print preview needs a faithful handout preview renderer
- `platform/print/print-dialog.js` and shared print styles only if the adapter-supplied renderer/settings need shared UI support
- `platform/i18n/strings-vi.js`, `platform/i18n/strings-en.js`, and Slides Help content
- focused unit/CDP coverage and evidence references

## Dependencies and risks

- Reuse LibreOffice's existing layout/master-page serialization and print/PDF backend; avoid LibreOffice Core changes.
- PPTX layout names may be derived from FODP master-page names; confirm the exact loss point before changing export behavior.
- Handout PDF layout must retain notes, page geometry, and selection of 3/6/9-up; print worker parameter compatibility is a risk.
- Do not alter document format semantics or the print security boundary.

## Test plan

- Capture CDP and COM evidence before implementation and after each change; inspect PPTX package relationships/layout names and PDF page count/layout using pypdf.
- Run `npm test`, i18n parity, checklist evidence, and `pytest -k "slides or pptx or print"`.

## Rollback

- Keep the layout round-trip and handout printing in separate commits; revert only the corresponding commit if its focused CDP/OOXML/PDF checks regress.

## Results

- **Layout loss point measured:** before the fix, each slide in the source FODP referenced the generic `Standard` master page, and LibreOffice derived the exported PowerPoint `CustomLayout.Name` from that master-page name. The adapter now assigns a stable master-page name for each supported layout before conversion; reopen maps those names back to the app layout types. PowerPoint COM ReadOnly returned `VNOTitleContent` (slides 1–2), `VNOTwoContent` (slide 3), and `VNOBlank` (slide 4). Baseline COM readback was `Standard` on all 8 Q18 slides.
- **Print implementation:** the shared print dialog now prepares slide, 3/6/9-up handout, and speaker-note PDFs through the existing preview and print APIs. Handouts are composed locally with pypdf; notes are rendered from the local FODP content through a temporary RTF and the installed PDF converter.
- **Before/after evidence:** baseline CDP reported 1/3 checks passing (layout names and print choices failed); final CDP reported 11/11. Final PDFs: 3-up 2 pages, 6-up 1 page, 9-up 1 page, notes 4 pages; extracted slide/note text was retained.
- **Gates:** `npm test` 3773/3773; i18n VI/EN 3122/3122, 0 missing; checklist verifier 0 lowered rows; focused pytest 204 passed, 902 deselected. PowerPoint COM readback completed in hidden ReadOnly mode.
- **Commits:** `ea8d9c2a` layout preservation; `eca5baab` handout and speaker-note printing.
