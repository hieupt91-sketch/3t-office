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

## Per-file diagnosis status

| File | First paragraph/page divergence | Structural/layout cause |
|---|---|---|
| legacy01.doc | NOT MEASURED | NOT DETERMINED |
| legacy04.doc | NOT MEASURED | NOT DETERMINED |
| legacy06.doc | NOT MEASURED | NOT DETERMINED |

The available evidence establishes that the page-count defect is specific to
some legacy `.doc` inputs in this sample, but it does not establish whether the
cause is page setup, section import, table geometry, font substitution,
paragraph metrics, breaks, headers/footers, or list layout. Attribution to any
one of those would be speculation. The brief's referenced
`_word_para_pages.ps1` is absent from this worktree; available alternatives are
`_word_para_pos.ps1` and `_word_para_metrics.ps1`.

## Attempted reference conversion

The source files and prior report are accessible. A synchronous Word COM
read-only `SaveAs2` conversion to a scratch directory under
`E:\VNOffice-profiles\codex\legacy-doc-findings` was attempted, but it produced
no DOCX outputs or per-file completion output. A WINWORD process remained
running afterward, so no further Word automation was launched to avoid
interfering with an existing/user Word session. Consequently there is no
Word-converted DOCX structural reference or paragraph-position comparison yet.

## Findings summary

The prior batch measurements provide reliable symptoms but are insufficient to
identify a root cause or justify a code change. The next diagnostic step is to
obtain Word-converted DOCX references and compare per-paragraph Word positions
against the corresponding converted DOCX opened by VN Writer, starting with the
first paragraph whose page or vertical position diverges. Until that evidence
exists, no implementation change is proposed in this findings commit.

## Validation

- Prior report: 8/8 files opened, edited, and saved; 5/8 match Word page counts at
  canvas and saved-file stages; the three discrepancies are listed above.
- Word COM reference conversion and paragraph-level diagnosis: NOT RUN to
  completion; conversion produced no output and left an unresolved WINWORD
  process.
- Root cause: NOT DETERMINED.
