# Findings: Writer save follow-ups

## Scope and current evidence

This worktree contains the already accepted Writer `.doc` import path and the
save-in-place / Save As paths. The existing legacy `.doc` handoff records that
all eight legacy samples open with canvas pagination matching Word, while
`legacy06.doc` changes from Word/canvas 3 pages to 4 pages after saving as
`.doc`. The established 23-file DOCX regression batch was reported as matching
Word in the canvas and saved output before this follow-up.

The save routes in `main.py` currently serialize Writer content as HTML and
convert that HTML directly to the target format. DOCX output then runs
`postprocess_created_writer_docx` and, when the source is DOCX, the source-aware
`postprocess_writer_docx`. `.doc` output selects LibreOffice's `MS Word 97`
filter and does not run the DOCX postprocessor. The task brief identifies a
possible compatible route through an intermediate DOCX, its source-aware
postprocessing, and a final DOCX-to-DOC conversion. This needs real-file
verification for both Ctrl+S and Save As before treating it as a fix.

The existing d09 shape-page audit reports four source anchors (Rectangle 7,
21, 27, and 36) shifting from Word page 8 to saved pages 9; source paragraphs
p107/p108/p111 were reported at output p109/p110/p112. The relevant adapter
postprocessor restores source drawings omitted by LibreOffice. Its
`_restore_missing_writer_drawings` maps source paragraph indices to converted
paragraphs with text LCS matches and `slot_for`; `_relocate_passthrough_anchors`
also maps anchors against paragraph text. The observed drift is near page
breaks, where source and converted paragraph counts differ. The exact mapping
failure still needs a focused regression fixture and real d09 validation.

## Constraints and next checks

- Keep the implementation in Writer save handling and the shared OOXML adapter;
  do not modify Sheet behavior or LibreOffice Core.
- Add a focused unit regression for each issue before changing its behavior.
- Validate legacy01–08 save-in-place and Save As, plus the 23-file DOCX batch
  and the specified shape-page audits when the supplied sample files and
  LibreOffice/Word tooling are available.
- Confirm saved `.doc` contains edits, opens in Word, and matches Word page
  counts; confirm d09 page placement and shape counts/docPr IDs remain valid.
- Run the repository JavaScript and Python test suites in the foreground, and
  report unavailable real-file checks as NOT RUN with the reason.

This file records the pre-implementation evidence. It does not assert a root
cause or claim either issue has been fixed.
