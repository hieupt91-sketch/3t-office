# Agent Handoff

TASK: `docs/tickets-0710/FIX-P1.md` — Sheet mở chậm, sửa đầu chậm, undo/redo lỗi
AGENT/ROLE: Codex / Sheet implementation
BRANCH: `fix/sheet-p1-codex`
WORKTREE: `E:\VNOffice-codex-fp1`
OBJECTIVE: Cho phép xem/cuộn workbook XLSX nhanh, sửa lần đầu trong ≤1 giây khi full model nạp nền, giữ edit history qua hydration; giữ LibreOffice/UNO làm nguồn authoritative cho workbook đầy đủ, lưu và in.
FINDINGS:
- Baseline LAN01: first quick view 5.08–6.40 s; full grid 42.67–45.53 s; pipeline XLSX→FODS/model stages tổng 71.50 s. Ticket bản cài ghi LAN01 open 46 s, sửa đầu 100 s; LAN04 undo lỗi; LAN06 open 60 s.
- Sau sửa, CDP first paint LAN01/02/04/06/09/14/16: 109/127/113/1536/171/108–142/119 ms; sửa đầu 792/762/766/801/799/404–824/787 ms.
- LAN14 fast preview scroll trước UNO attach tải hàng 41–80 trong 348 ms; UNO attach ~5.4 s; hydration đủ 71.1 s. Ctrl+Z/Ctrl+Y đúng cả trước và sau hydration.
- Fidelity batch LAN28: 25 PASS, 2 FAIL, 1 BLOCKED. LAN14 save pipeline vượt CDP timeout sau 1754.2 s dù output tạo được, diffs=0, lint sạch, Excel mở được; LAN25 có 9419 style/number-format diffs, tái hiện với `VNO_OPEN_VIEWFIRST=0`; LAN04 Excel COM BLOCKED (`CO_E_SERVER_EXEC_FAILURE`), roundtrip diffs=0.
IMPLEMENTATION SUMMARY:
- Thêm parser OOXML read-only bằng Python standard library, giới hạn viewport 40×20; đọc active sheet, shared/inline strings, cached formula values; không ghi lại XLSX.
- App gửi local viewport trước khi UNO sẵn sàng; worker hydrate nền. Scroll preview lấy viewport local trước attach, chuyển bridge sang UNO sau attach mà giữ selection, editor và journal.
- Giữ rollback `VNO_OPEN_VIEWFIRST=0`; không thêm dependency, không sửa LibreOffice Core.
- Cập nhật trợ giúp tiếng Việt hiện hữu cho trạng thái quick view.
FILES CHANGED:
- `main.py`, `apps/sheet/xlsx_preview.py`, `apps/sheet/sheet-app.js`, `apps/sheet/sheet-quick-view.js`, `apps/sheet/sheet-quick-view.css`
- `adapters/libreoffice/common/soffice_uno_worker.py`, `adapters/libreoffice/common/uno-bridge.js`, `adapters/libreoffice/sheet/sheet-adapter.js`
- `platform/help/entries-gaps-0410.js`
- `tests/test_view_worker.py`, `tests/test_xlsx_preview.py`, `tests/unit/sheet-quick-view.test.js`
- `docs/PLAN-SHEET-P1.md`, `docs/PERF-SHEET-OPEN-1012.md`, `docs/HANDOFF-FIX-P1.md`
COMMANDS RUN:
- `npm test`
- `python -m unittest discover -s tests`
- `python -m unittest tests.test_xlsx_preview`
- Sheet quick-view unit test runner
- `python -m py_compile main.py apps/sheet/xlsx_preview.py tests/test_xlsx_preview.py`
- Desktop CDP matrix/scroll/edit/undo/redo, LAN28 fidelity batch, LAN25 legacy rerun, print-preview and quick-view save/print guard.
- `git diff --check`; UTF-8/no-BOM verification is part of final closeout.
BUILD RESULT: No separate production build command was required or run. `npm test` includes the repository test build/runtime checks.
TEST RESULTS:
- `npm test`: PASS, 3116/3116.
- `python -m unittest tests.test_xlsx_preview`: PASS, 5 tests.
- Sheet quick-view unit suite: PASS, 18 tests.
- `python -m py_compile main.py apps/sheet/xlsx_preview.py tests/test_xlsx_preview.py`: PASS.
- Full Python suite: final rerun PASS, 912 tests in 518.929 s. A prior full run had one intermittent WinError 32 on Writer sample temp-file replace; the exact test passed in three isolated runs and the final full rerun passed. ResourceWarning reported unclosed subprocess streams in integration tests.
- Desktop CDP open/scroll/edit/undo/redo goals passed on the cases measured. LAN01 PDF print preview opened after hydration. Actual physical print was NOT RUN.
KNOWN FAILURES:
- Fidelity batch is not fully green: LAN14 save evaluation timed out, LAN25 has 9419 diffs also on legacy path, LAN04 Excel COM could not initialize. No test expectation or fixture was changed.
- One earlier full Python suite run had an intermittent, unrelated Writer file-lock failure; the isolated test passed three times and the final full suite rerun passed.
RISKS:
- Local parser is a bounded preview source only; full workbook styles/model and persistence continue to depend on UNO hydration.
- LAN14 complete save latency remains unresolved. Do not report the ticket's full fidelity gate as PASS.
DEPENDENCIES/BLOCKERS: None added. Excel COM environment issue on LAN04; LAN25 legacy fidelity discrepancy and LAN14 save timeout need separate investigation.
CORE PATCH ID (if any): None.
NEXT ACTION: Keep P1 fast preview behind existing fallback. Investigate LAN14 save latency and LAN25 style/number-format diffs in separately scoped tasks.
