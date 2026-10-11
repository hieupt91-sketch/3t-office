# Agent Handoff

TASK: Writer edited-document save — MYTIME (44 sections, per-section margins) came back as 73 pages: all 43 mid-document `w:sectPr` were converted to `w:br type="page"` by the LibreOffice HTML round trip
AGENT/ROLE: opencode/nemotron (findings + first implementation) → Claude (verification, carrier placement, measurements)
BRANCH: fix/writer-save-sections-mytime
WORKTREE: E:\VNOffice-opencode-writer-sections
OBJECTIVE: Saved MYTIME (with a "ZZ" edit) must keep its 43 section breaks with their own page margins and paginate like the original in Word 2016 (44 pages).

FINDINGS (measured — see HANDOFF-WRITER-SAVE-SECTIONS-FINDINGS.md):
- Page counts must be measured with Word's PDF export (`_word_oracle3.ps1`); `ComputeStatistics(2)` reported 88 for a 44-page document.
- Original: 44 sections (43 `w:sectPr` in `w:pPr`), 4 distinct `pgMar` sets, 426 paragraphs. Main's edited save: 0 sectPr, 43 `w:br type="page"`, 395 paragraphs, **73 pages**.
- LibreOffice drops the empty paragraph that carried each `w:sectPr` and puts the page break at the end of the previous section's last paragraph. Re-creating an empty carrier paragraph before the page-break paragraph produced 86 pages; injecting the sectPr into the page-break paragraph's own `w:pPr` (and removing the break) is the correct placement.

IMPLEMENTATION SUMMARY: `_extract_all_docx_sections` collects every mid-document sectPr with the text of the nearest preceding non-empty paragraph; `_restore_mid_document_sections` (called from `postprocess_writer_docx` after `_repair_writer_double_fills`) matches each converted `w:br page` paragraph to a section by that text (ordinal fallback), removes the break run, injects the original sectPr (header/footer rIds remapped) into that paragraph's `w:pPr`, creating `w:pPr` when missing.
FILES CHANGED: adapters/libreoffice/common/ooxml_zip_patch.py; docs/HANDOFF-WRITER-SAVE-SECTIONS-FINDINGS.md; docs/HANDOFF-WRITER-SAVE-SECTIONS.md
COMMANDS RUN: `_roundtrip_save_writer_edit.py` + `_word_oracle3.ps1` + `_docx_breaks_after_sect.py` + `_dbg_sections_cmp.py` on MYTIME/AQUARA/HDLD; node/python gates.
BUILD RESULT: PASS — syntax; node tests 1748/1748; python writer tests OK.
TEST RESULTS (Word 2016 PDF pages):
| Document (edited "ZZ") | main a57d184 | this branch | Word original |
|---|---:|---:|---:|
| MYTIME | 73 | **51** | 44 |
| MYTIME sectPr / br page | 0 / 43 | **43 / 0** (margins per section identical to the original, `_dbg_sections_cmp.py`) | 43 / 0 |
| AQUARA | 16 | 16 | 16 |
| HDLD | 5 | 5 | 5 |
KNOWN FAILURES: MYTIME still 51 pages: 7 sections spill onto a second page (e.g. section 16, 17 paragraphs on Word page 17 → 11 + 5 here). Paragraph count 395 vs 426 (each section loses its empty carrier paragraph; sections 25/26 gain paragraphs from split line-break paragraphs). Likely paragraph spacing / image height differences inside those sections — next step is a per-paragraph height comparison (`_word_para_pages.ps1` on both files) for section 16.
RISKS: ordinal fallback when two sections share the same preceding text; header/footer references inside restored sectPr rely on `_remap_header_footer_rids`.
DEPENDENCIES/BLOCKERS: None.
CORE PATCH ID (if any): None.
NEXT ACTION: measure section 16 (orig page 17) paragraph by paragraph in Word vs saved; check the untouched-paragraph pPr overlay still aligns after the carrier paragraphs disappear; then MYTIME 44.
