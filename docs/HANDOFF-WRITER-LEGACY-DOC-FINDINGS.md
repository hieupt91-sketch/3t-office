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

The available evidence establishes a difference in LibreOffice's direct
binary-`.doc` to HTML serialization. Page setup, paragraph text/count, and
Word's measured pagination do not differ between each source and its Word
`SaveAs2` DOCX reference. The brief's `_word_para_pages.ps1` is absent from this
worktree; `_word_para_metrics.ps1` supplied paragraph page/y/font/spacing data.

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

All three target discrepancies disappear through this path. This supports
normalizing the `.doc` import through LibreOffice's DOCX filter and then using
the existing DOCX-to-HTML import path. It does not prove which one of the
measured style/language serialization changes is individually causal.

## Findings summary

The best-supported root cause is the direct LibreOffice binary-`.doc` to HTML
import path: its emitted default styles, font fallback, and language attributes
differ from the HTML produced after normalizing the same file through LibreOffice
DOCX. The existing DOCX import path renders the three discrepant files at the
Word page count, including after save. The findings do not identify one
individual attribute as the cause; the candidate fix is the tested LibreOffice
DOC-to-DOCX normalization followed by existing DOCX conversion and overlays.

## Validation

- Prior report: 8/8 files opened, edited, and saved; 5/8 match Word page counts at
  canvas and saved-file stages; the three discrepancies are listed above.
- Word COM read-only DOCX references and paragraph metrics: PASS for all 8
  sources; page/y/format comparisons completed.
- LO DOC-to-DOCX then app batch: PASS for the three target files (3/3 canvas and
  saved page counts match Word).
- Individual CSS/language/font fallback causal attribution: NOT ISOLATED; the
  measured import serialization differences are listed above.
