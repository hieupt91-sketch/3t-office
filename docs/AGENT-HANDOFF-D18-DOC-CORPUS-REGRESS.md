# Agent Handoff
TASK: Ticket D18 — Writer corpus regression audit after recent fixes.
AGENT/ROLE: Codex / audit
BRANCH: `test/doc-corpus-regress-codex`
WORKTREE: `E:\VNOffice-codex-d18`
OBJECTIVE: Rerun 44 `.doc`/`.docx` files sequentially through LibreOffice and Writer/CDP; diagnose legacy13 and d10; report before/after.
FINDINGS: Full batch 42 PASS, 1 FAIL (`legacy13.doc`, 1→2 pages), 1 BLOCKED (`d10.docx`, actually PDF). legacy13 DOM and saved DOCX show first paragraph shifts from Normal 10 pt in direct LO conversion to BodyText 12 pt in Writer output; image Square wrap, extent, A4 geometry, and spacing match. d10 has `%PDF-1.7`; PDF page count works (1), Writer roundtrip is inapplicable.
IMPLEMENTATION SUMMARY: Script now uses encoded UTF-8 text export, supports `--report`, and identifies PDF magic after PDF page count so d10 is reported as a format blocker rather than TXT-export failure. New before/after audit report includes all 44 records and targeted diagnostics.
FILES CHANGED: `scripts/audit-0610/corpus_pages_lo.py`, `docs/AUDIT-DOC-CORPUS-REGRESS-0610.md`, this handoff.
COMMANDS RUN: `python -m py_compile scripts/audit-0610/corpus_pages_lo.py`; full `python scripts/audit-0610/corpus_pages_lo.py --report docs/AUDIT-DOC-CORPUS-REGRESS-0610.md`; focused d10 rerun; CDP open/DOM/save diagnostics for legacy13; LibreOffice DOCX/PDF comparison.
BUILD RESULT: NOT RUN (audit-only; no app source changed).
TEST RESULTS: PASS — full batch 44/44 completed sequentially before the final d10 header guard; PASS — isolated d10 rerun after guard (P0=1, BLOCKED with correct source-type reason, 14.2s); PASS — Python syntax check. Other 43 files are unaffected by the d10-only guard.
KNOWN FAILURES: `legacy13.doc` remains P0=1/P1=2/P2=2. No safe narrow correction was made because forcing 10 pt changes document formatting semantics. `d10.docx` is a PDF mislabeled as DOCX and remains BLOCKED for Writer.
RISKS: LibreOffice, not Microsoft Word, is the page-count oracle. legacy13 paragraph font/style difference is the likely page-overflow cause; it needs a correctly scoped import fix and regression coverage before changing globally.
DEPENDENCIES/BLOCKERS: LibreOffice installation; local corpus at `E:\VN OFice\file test\lan-legacy` and `E:\VN OFice\file test\landocx`; local CDP runtime.
CORE PATCH ID (if any): None.
NEXT ACTION: Treat legacy13 as a Writer `.doc` import regression; scope a focused import fix with document-specific regression check. Exclude d10 from Writer corpus or correct its file extension/content at source.
