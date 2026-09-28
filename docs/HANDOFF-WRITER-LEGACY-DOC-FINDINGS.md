# Findings — Writer pagination for legacy `.doc`

## Scope and evidence

The source set is `E:\VN OFice\file test\lan-legacy\legacy01.doc` through
`legacy08.doc`. These are user documents and must remain outside Git. The prior
batch report is `E:\VNOffice-profiles\claude\legacy-doc-audit\_batch_writer_report.md`.
It records Word 2016 PDF page counts, Writer canvas counts, and page counts after
editing and saving through the app.

| File | Word source | Canvas | Saved file in Word | Discrepancy |
|---|---:|---:|---:|---|
| legacy01.doc | 5 | 4 | 4 | canvas and saved file each one page short |
| legacy04.doc | 11 | 12 | 10 | canvas one page long; saved file one page short |
| legacy06.doc | 3 | 4 | 5 | canvas one page long; saved file two pages long |

The other five files match Word at all three measured stages. The original batch
report's OOXML structural columns are `None` for source `.doc` files because a
binary `.doc` is not a ZIP/OOXML package. The saved outputs do have OOXML counts,
but those counts alone do not identify the first layout divergence.

## Per-file diagnosis

| File | Word paragraph evidence | Difference in direct `.doc` → HTML vs `.doc` → LibreOffice DOCX → HTML |
|---|---|---|
| legacy01.doc | 84 paragraphs in both the source and Word `SaveAs2` DOCX; page, y-position, font, size, and spacing measurements match paragraph-for-paragraph. | Same A4 page setup and paragraph text/count. Direct `.doc` HTML labels paragraphs 12, 15, and 17 `lang=en-US`; the DOCX round trip labels them `vi-VN`. DOCX round trip also emits explicit `text-align:left` on the default paragraph CSS. This implicates direct `.doc` language/style serialization; the individual property responsible is not isolated. |
| legacy04.doc | 226 paragraphs in both Word versions; page, y-position, font, size, and spacing measurements match paragraph-for-paragraph. | Same Letter page setup, paragraph text/count, and explicit paragraph spacing. Direct `.doc` HTML labels 39 paragraphs `vi-VN`/`fr-FR`; the DOCX round trip labels them `en-US`. The language/style serialization difference is implicated; its individual rendering effect is not isolated. |
| legacy06.doc | 351 paragraphs in both Word versions; pagination and positions match for aligned text paragraphs. One blank paragraph has a 13pt vs 14pt reported font size. | Same page dimensions and paragraph text/count. Direct `.doc` HTML uses the fallback family `"VNtimes new roman", "Courier New", sans-serif`; the DOCX round trip emits `"VNtimes new roman", "Courier New", serif`. Direct output has no default `margin-bottom`; round-trip output emits `margin-bottom:0cm`. Paragraph languages also change from `vi-VN`/`nl-NL` to `en-US`. The direct `.doc` style/fallback serialization is implicated; these individual properties were not isolated from one another. |

The paragraph-level comparison ruled out page setup and Word's own pagination
for the three target files. The HTML changes above are importer symptoms, not a
proven single-property cause. The brief's `_word_para_pages.ps1` is absent from
this worktree; `_word_para_metrics.ps1` supplied paragraph page/y/font/spacing
data.

## Attempted reference conversion

All eight source files were opened read-only through Word COM and converted with
`SaveAs2` into `E:\VNOffice-profiles\codex\legacy-doc-findings`; none of those
outputs is in the repository. Word paragraph metrics were collected from each
source and converted DOCX using `_word_para_metrics.ps1`. The matched target
files retain the same Word page count and aligned paragraph positions across
that conversion.

For the three discrepant inputs, LibreOffice was also used to convert `.doc` to
`.docx`, then the app's existing DOCX open path was exercised through
`_batch_writer.py`. Results were:

| LibreOffice DOCX round trip | Word pages | Canvas | Saved pages in Word |
|---|---:|---:|---:|
| legacy01.doc | 5 | 5 | 5 |
| legacy04.doc | 11 | 11 | 11 |
| legacy06.doc | 3 | 3 | 3 |

All three target discrepancies disappear through this path when opened as
DOCX. The app initially normalized `.doc` into DOCX and converted its HTML, but
the canvas still missed legacy01/04. Comparing the payload paths isolated the
remaining defect: `open_document_dialog()` collected OOXML sidecars from the
original `src_path`. For a `.doc`, that produced no document/styles/numbering/
header/footer XML even though the normalized temporary DOCX had them. The
Writer adapter consequently missed the existing DOCX-derived layout overlays.
Passing those sidecars from the normalized DOCX fixed the remaining canvas
discrepancies. The CSS/font/language differences listed above describe
LibreOffice's conversion output; they were not individually altered or proven
to cause the page drift.

## Findings summary

Root cause: the `.doc` open path did not pass the normalized DOCX's OOXML
sidecars to Writer, so document/style/list/header/footer layout overlays were
missing. The fix reuses LibreOffice's DOC-to-DOCX filter, the existing DOCX to
HTML conversion and overlays, and carries sidecar XML into the returned payload
before the temporary directory is removed.

## Validation

- Before fix: prior report had 8/8 files opened, edited, and saved; 5/8 matched
  Word page counts at canvas and saved-file stages.
- Word COM read-only DOCX references and paragraph metrics: PASS for all 8
  sources; page/y/format comparisons completed.
- Fixed `.doc` app batch: PASS 8/8 loaded/edited/saved and PASS 8/8 canvas pages
  match Word. Saved page count: 7/8 match Word; legacy06 is Word 3 vs saved 4.
  The remaining mismatch occurs after saving to `.doc`, in the save/export flow
  excluded by the task's hard boundary.
- DOCX regression batch: PASS 23/23 Word = canvas = saved Word pages (d10
  excluded).
- `_writer_shape_counts.py`: PASS; no saved file exceeded source wsp/txbx/txc/
  media counts and no duplicate `wp:docPr` ids were reported.
- Word shape anchor page comparison d06/d09/d24: PASS; 0 page mismatches for
  each.
- `node tests/run-tests.js`: PASS, 1840/1840.
- `python -m unittest discover -s tests`: PASS, 370 tests.
