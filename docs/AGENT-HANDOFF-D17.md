# Agent Handoff
TASK: D17 — VN Writer Mail Merge Rules
AGENT/ROLE: Codex / Writer feature implementation
BRANCH: feat/writer-merge-rules-codex
WORKTREE: E:\\VNOffice-codex-d17
OBJECTIVE: Add If/Then/Else mail merge rules with preview and per-recipient merge evaluation.
FINDINGS: Existing mail merge and help are in Writer; unit suite was already imported and registered in tests/run-tests.js. DOCX creation happens in the Python/LibreOffice save pipeline, outside the JS mail merge engine.
IMPLEMENTATION SUMMARY: Added Rules command/dialog, span metadata, seven comparison operators, preview/finish evaluation, VI/EN strings, Writer help instructions, styles, unit coverage, and CDP audit. Word IF field serialization into DOCX is not implemented.
FILES CHANGED: apps/writer/mail-merge-data.js; apps/writer/mail-merge.js; apps/writer/writer-ribbon.js; apps/writer/writer.css; adapters/libreoffice/writer/writer-adapter.js; platform/commands/command-definitions.js; platform/i18n/strings-vi.js; platform/i18n/strings-en.js; platform/help/entries-writer.js; tests/unit/writer-mail-merge.test.js; scripts/audit-0610/doc_merge_rules_check.mjs; docs/AGENT-HANDOFF-D17.md.
COMMANDS RUN: Targeted writer-mail-merge unit runner; node --experimental-websocket scripts/audit-0610/doc_merge_rules_check.mjs; node --check on changed JS files.
BUILD RESULT: NOT RUN.
TEST RESULTS: Unit suite PASS (23 tests); CDP audit PASS (preview true/false branches and finish); syntax checks PASS. DOCX IF field XML NOT RUN / NOT IMPLEMENTED.
KNOWN FAILURES: None observed in executed checks.
RISKS: DOCX export currently serializes via the Python/LibreOffice path; preserving custom IF semantics requires an OOXML post-processing design and validation against Word-compatible field structure.
DEPENDENCIES/BLOCKERS: DOCX serializer integration remains for follow-up; no new dependencies.
CORE PATCH ID (if any): None.
NEXT ACTION: Implement and test Word IF fields in DOCX `word/document.xml`, including escaped values and nested field markers; then extend the CDP audit to save a DOCX and inspect its XML.
