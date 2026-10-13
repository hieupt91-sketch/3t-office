TASK: FIX-L7 — Rà soát từng nút ribbon Slides với PowerPoint
AGENT/ROLE: Codex / Slides audit and implementation
BRANCH: audit/slides-l7-codex
WORKTREE: E:\VNOffice-codex-fl7
OBJECTIVE: Tạo ma trận parity 88 nút, đo UI thật qua CDP và PowerPoint COM, sửa sai khác tái hiện được, lưu bằng chứng và chạy các suite theo phiếu.
FINDINGS: Xem `docs/tickets-0710/FIX-L7-RESULTS.md` và `docs/SLIDES-BUTTON-MATRIX-1011.md`. Trạng thái ma trận: 30 khớp, 2 khác có chủ ý, 4 sai khác đã biết, 52 chưa đối chiếu. Layout native và theme cần quyết định chủ sở hữu; Zoom đang ánh xạ sai khác.
IMPLEMENTATION SUMMARY: Sửa đường lưu thụt lề đoạn văn qua FODP → PPTX; thêm regression tests. Thêm harness CDP và PowerPoint COM đọc lại. Không sửa semantics layout/theme, không thêm dependency hay Core patch.
FILES CHANGED: `adapters/libreoffice/slides/slides-adapter.js`; `adapters/libreoffice/common/ooxml_zip_patch.py`; `tests/unit/slides-font-paragraph.test.js`; `tests/test_slides_pptx_paragraph_indent.py`; `scripts/audit-0610/gen_slides_button_matrix.py`; `tests/live/cdp/slides-fix-l7-text.desktop.mjs`; `tests/live/cdp/claude-slides-roundtrip.desktop.mjs`; `scripts/audit-0610/office_parallel/slides/fix-l7-{text,roundtrip}-readback.ps1`; `docs/SLIDES-BUTTON-MATRIX-1011.md`; `docs/tickets-0710/FIX-L7-{PLAN,RESULTS}.md`; `docs/tickets-0710/evidence/fix-l7/*`.
COMMANDS RUN: CDP `claude-slides-roundtrip` (8/8), `slides-fix-l2` (20/20), `slides-fix-l3` (13/13); PowerPoint COM readbacks; focused Python indent unittest (3/3); focused Node Slides Font/Paragraph (12/12); `npm test`; `python -m unittest discover -s tests`; isolated retry for the updater cleanup test; encoding scan and `git diff --check`.
BUILD RESULT: NOT RUN (no build requested).
TEST RESULTS: `npm test` PASS 3079/3079. `python -m unittest discover -s tests` FAIL: 874 tests, one WinError 32 during TemporaryDirectory cleanup in detached updater helper test; assertions passed and isolated retry PASS 1/1. CDP suites PASS as above.
KNOWN FAILURES: 52 controls are unverified; layout COM enum differs; theme Design.Name is Office; Zoom returns BoxOut enum 3073. Overall Python unittest command remains FAIL despite the isolated flaky cleanup test passing on retry.
RISKS: Do not claim full PowerPoint parity. Do not change native layout/theme semantics without owner decision. No secret added; profile data used only at `E:\VNOffice-profiles\codex-fl7`.
DEPENDENCIES/BLOCKERS: Native layout/theme decisions require owner input under AGENTS.md §11. Official `/09-templates/AGENT-HANDOFF.md` does not exist in this worktree; this handoff follows the existing FIX-L6 handoff structure. No new runtime dependency.
CORE PATCH ID (if any): None.
NEXT ACTION: Get owner decisions for layout/theme, then continue the remaining 52 controls in priority order. Investigate Windows updater helper cleanup race separately if a green full Python suite is required.
