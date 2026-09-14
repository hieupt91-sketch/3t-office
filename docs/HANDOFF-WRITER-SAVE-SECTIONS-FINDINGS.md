# HANDOFF-WRITER-SAVE-SECTIONS-FINDINGS.md

## Root Cause Analysis: MYTIME 44 pages → 73 pages after save

### Measured Data (using correct measurement tools)

**Original `file test\MYTIME.docx`:**
- Word PDF export page count (`_word_oracle3.ps1`): **44 pages**
- Paragraphs: **426** (`_docx_breaks_after_sect.py`)
- Section breaks (`w:sectPr` in `w:pPr`): **43** (44 sections total, all `nextPage` type)
- Section margins: **4 different margin sets** (top margins: 724, 1440, 726, 722 twips)
- Page breaks (`w:br type="page"`): **0**
- Anchored images: **137** (paragraph-relative)

**After round-trip save with edit (`_rt.docx`):**
- Word PDF export page count: **73 pages** (+29 pages)
- Paragraphs: **395** (lost **31 paragraphs**)
- Section breaks: **0**
- Page breaks (`w:br type="page"`): **43**
- Section margins: **1 margin set only** (top 726 twips — the 3rd margin from original)

**Other test files (must not regress):**
- `HDLD.docx` (1 section, has header): edit → save → 5 pages = 5 ✓
- `AQUARA.docx`: edit → save → 16 pages = 16 ✓

### Root Cause

**LibreOffice HTML import/export round-trip loses Word section structure:**

1. **Export (VN Writer → HTML):** 
   - `_contentForExport()` in `writer-adapter.js:8159-8171` wraps each section in `<div class="vno-export-section vno-export-${id}" data-vno-export-section="${id}">`
   - Section breaks (`nextPage`, `evenPage`, `oddPage`) are emitted as zero-height `<p style="page-break-before:always; break-before:page|left|right">` marker paragraphs
   - Per-section `@page` CSS rules are emitted via `_getSectionPageCss()` (line 1618) with margins/page-size for each section

2. **Import (HTML → LibreOffice → DOCX):**
   - LibreOffice's HTML→Writer filter **only honors `page-break-before` on a real `<p>`** (not on wrapping `<div>`)
   - It converts `page-break-before:always` → `w:br w:type="page"` (hard page break)
   - It **does not create `w:sectPr`** from `@page` CSS rules
   - All per-section margin/page-size settings are **lost**; only the first section's settings survive in the body-level `w:sectPr`

3. **Current post-process (`postprocess_writer_docx` in `ooxml_zip_patch.py:5198`):**
   - `_extract_docx_section_properties()` only extracts the **last** `w:sectPr` (body-level)
   - `_rebuild_docx_document_xml()` replaces only the body-level `w:sectPr`
   - **No logic exists to restore the 43 mid-document `w:sectPr`** that were in `w:pPr` of the last paragraph of each section

### Paragraph Loss (31 missing paragraphs)

The 31 missing paragraphs are likely **empty paragraphs** or **paragraphs containing only anchored images** that LibreOffice merges during HTML import. Evidence:
- Original: 426 paragraphs
- Saved: 395 paragraphs
- The page-map (`_word_para_pages.ps1`) shows ~29 pages with only 1 paragraph each (blank/image-only pages) in the saved version
- Section boundaries in original are at specific paragraphs (each `w:sectPr` is in the `w:pPr` of the last paragraph of that section)
- LibreOffice's HTML import likely collapses empty carrier paragraphs that only held a section break

### Required Fix

**In `adapters/libreoffice/common/ooxml_zip_patch.py` — `postprocess_writer_docx()`:**

1. **Extract ALL section breaks from original DOCX** (not just body-level):
   - Find all `w:sectPr` inside `w:pPr` (mid-document sections)
   - For each, record: the `w:sectPr` XML, the paragraph text/bookmark (`vno-untouched-N`) of the containing paragraph

2. **In converted DOCX, locate corresponding section boundaries:**
   - Find all `w:br w:type="page"` that LibreOffice created
   - Each should be in a paragraph that has a `w:bookmarkStart w:name="vno-untouched-N"` matching the original section's last paragraph
   - The 43 `w:br page` should map 1:1 to the 43 original mid-document `w:sectPr`

3. **Restore each section break:**
   - For each matched pair: remove the `w:br type="page"` from the converted paragraph
   - Inject the original `w:sectPr` (with correct margins, page size, header/footer refs) into that paragraph's `w:pPr`
   - Re-map header/footer `r:id` for each section (already done for body-level; need per-section)

4. **Handle missing paragraphs:**
   - The 31 missing paragraphs are likely empty/image-only carriers that LibreOffice dropped
   - If a section's last paragraph was such a carrier and is now missing, the section break must attach to the nearest surviving preceding paragraph with a matching `vno-untouched-N` bookmark
   - Use the LCS pairing logic already in `_restore_writer_matched_formatting` / `_relocate_passthrough_anchors` to find the correct target paragraph

### Implementation Plan

**New function: `_extract_all_docx_sections(original_xml)`**
- Returns list of `{ sect_pr_xml, paragraph_bookmark, paragraph_text, section_index }` for every `w:sectPr` in `w:pPr`
- Body-level `w:sectPr` (last one) handled separately as before

**Modify `postprocess_writer_docx()`:**
- After `_rebuild_docx_document_xml()` (which handles body-level sectPr), add a new pass:
  - Extract all mid-document sections from original
  - Find all `w:br type="page"` in converted XML
  - Pair them by `vno-untouched-N` bookmark on the preceding paragraph
  - For each pair: remove `w:br`, inject `w:sectPr` into that paragraph's `w:pPr`
  - Update header/footer references per section (need to track which header/footer belongs to which section)

### Success Criteria (measured by named scripts)

| Metric | Target | Measurement |
|--------|--------|-------------|
| PDF page count | 44 | `powershell -File _word_oracle3.ps1 -File _rt.docx` |
| Section breaks (`w:sectPr` in `w:pPr`) | 43 | `python _docx_breaks_after_sect.py _rt.docx` |
| Page breaks (`w:br type=page`) | 0 | `python _docx_breaks_after_sect.py _rt.docx` |
| Paragraph count | 426 (±1 for "ZZ") | `python _docx_breaks_after_sect.py _rt.docx` |
| Per-page paragraph map | 100% match | `powershell -File _word_para_pages.ps1 -File _rt.docx -Out _rt_pages.txt` vs original |
| AQUARA/HDLD | 16/5 pages unchanged | Same scripts |

### Files to Modify

1. `adapters/libreoffice/common/ooxml_zip_patch.py` — add section extraction + restoration logic in `postprocess_writer_docx()`
2. Add unit test in `tests/test_writer_section_headerfooter_postprocess.py` or new test file