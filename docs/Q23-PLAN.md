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
