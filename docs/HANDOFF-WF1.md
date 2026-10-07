# Agent Handoff
TASK: WF1 — sửa import Writer giữ `w:trHeight` và khoảng dòng trong ô bảng d15
AGENT/ROLE: Codex / Writer adapter
BRANCH: `fix/writer-table-trheight-codex`
WORKTREE: `E:\VNOffice-codex-wf1`
OBJECTIVE: Khôi phục chiều cao tối thiểu hàng OOXML và single line-spacing cần thiết cho d15 mà không đổi API hoặc làm giảm fidelity corpus.
FINDINGS: Số 90,0/122,3 pt là proxy tọa độ ký tự trong ô căn giữa, không phải chiều cao hàng. `Word.Row.Height` và OOXML cho T2R1/R2 là 34,15/144,85 pt; HTML import trước sửa là 30,2/156,8 pt.
IMPLEMENTATION SUMMARY: Writer adapter ánh xạ bảng/hàng theo thứ tự mở, chỉ sửa hàng trực tiếp của từng bảng, áp CSS height cho `atLeast`/mặc định và giữ nguyên `exact`; phục hồi single spacing cho bảng có hàng minimum + ô căn giữa. Guard `.doc` ngăn dùng OOXML trung gian của legacy import. Harness Word đo `Row.Height` thật và giải phóng COM đầy đủ.
FILES CHANGED: `adapters/libreoffice/writer/writer-adapter.js`; `tests/unit/writer-doc-font-spacing.test.js`; `scripts/audit-0610/word_table_rows.ps1`; `scripts/audit-0610/compare_table_rows.ps1`; `docs/HANDOFF-WF1.md`.
COMMANDS RUN: targeted Writer unit runner; `word_table_rows.ps1`; desktop `app_table_rows.mjs`; `compare_table_rows.ps1`; `doc_linebreak_vs_word.mjs --reuse-word` (43 files); `node tests/run-tests.js`; `node --check`; PowerShell AST parse; `git diff --check`.
BUILD RESULT: NOT RUN — repository has no build script for this adapter-only JavaScript change; syntax validation is included in the full test suite.
TEST RESULTS: PASS — d15 T2R1/R2 = 34,1/144,8 pt; same-page row delta total -0,2 pt, 0 rows >5 pt; corpus 43/43 page totals, 4057/4327 = 93,760% (93,8%) paragraphs on the same Word page; automated suite 2862/2862 PASS, 0 FAIL; WINWORD remaining = 0.
KNOWN FAILURES: None in scope.
RISKS: `w:hRule="exact"` is deliberately untouched because exact-height pagination needs separate clipping semantics; source-format guard relies on the file extension supplied by the desktop bridge.
DEPENDENCIES/BLOCKERS: None.
CORE PATCH ID (if any): None — no LibreOffice Core/upstream change.
NEXT ACTION: Review and merge the branch; do not push directly to main.
