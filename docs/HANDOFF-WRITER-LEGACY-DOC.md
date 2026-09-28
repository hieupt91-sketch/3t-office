# Agent Handoff

TASK: Fix Writer page-count drift when opening legacy Word 97–2003 `.doc` files.
AGENT/ROLE: Codex
BRANCH: `fix/writer-legacy-doc-codex` (not merged)
WORKTREE: `E:\VNOffice-codex-writer-legacy-doc`
OBJECTIVE: Reuse LibreOffice and the existing DOCX import path to correct legacy
`.doc` canvas pagination while preserving DOCX behavior.

## FINDINGS

The initial real-file batch opened, edited, and saved all 8 documents, but
legacy01, legacy04, and legacy06 had page-count drift. Word COM paragraph
metrics and per-file import observations are recorded in
`docs/HANDOFF-WRITER-LEGACY-DOC-FINDINGS.md`.

Root cause: after normalizing `.doc` through LibreOffice to DOCX, the open path
still loaded OOXML document/styles/numbering/header/footer sidecars from the
original `.doc` path. Those reads returned no data, so Writer did not receive
the OOXML-derived layout overlays used by the existing DOCX path. The fix reads
the sidecars from the normalized DOCX while the temporary directory exists and
includes them in the open payload.

## IMPLEMENTATION SUMMARY

- `main.py`: Writer `.doc` open/convert now runs LibreOffice DOC → DOCX → HTML,
  then applies the existing DOCX font/style overlays and forwards the temporary
  DOCX OOXML sidecars. No save implementation or LibreOffice Core changes.
- `tests/test_writer_legacy_doc_open.py`: covers the conversion order, DOCX
  overlays, and OOXML payload sourced from the intermediate DOCX.
- Findings are committed before implementation as requested.

FILES CHANGED: `main.py`; `tests/test_writer_legacy_doc_open.py`;
`docs/HANDOFF-WRITER-LEGACY-DOC-FINDINGS.md`;
`docs/HANDOFF-WRITER-LEGACY-DOC.md`.

## TEST RESULTS

| Check | Result |
|---|---|
| Legacy `.doc` batch | PASS — 8/8 opened, edited, saved; canvas = Word 8/8 |
| Legacy `.doc` saved page count | 7/8 match Word; legacy06 is Word 3 vs saved 4 |
| DOCX regression batch | PASS — 23/23 Word = canvas = saved Word (d10 excluded) |
| Shape counts / duplicate `docPr` ids | PASS — no shape/media count growth; no duplicate IDs reported |
| Word anchor pages d06 / d09 / d24 | PASS — 0 page mismatches for each |
| `node tests/run-tests.js` | PASS — 1840/1840 |
| `python -m unittest discover -s tests` | PASS — 370 tests |
| `git diff --check` | PASS |

The legacy06 saved-page mismatch appears only after saving to `.doc`. The task's
hard boundary excludes changes to the save path, so this remains open and is
reported as a limitation; the canvas itself matches Word at 3 pages.

## COMMITS

- `b0c9ec5` — `fix(writer): W-legacydoc findings`
- `7649de8` — `fix(writer): W-legacydoc measured findings`
- `f86ecfc` — `fix(writer): W-legacydoc clarify findings table`
- `76afa4e` — `fix(writer): W-legacydoc normalize legacy imports`
- `d3a7dc2` — `fix(writer): W-legacydoc carry normalized OOXML`

CORE PATCH ID: None.
DEPENDENCIES/BLOCKERS: No new dependency. The repository did not contain the
referenced `09-templates/AGENT-HANDOFF.md`; this handoff follows the field layout
used by existing handoff documents.
NEXT ACTION: Handle legacy06's saved `.doc` page drift in a separate task scoped
to the save/export path; do not merge this branch without the owner's review.
