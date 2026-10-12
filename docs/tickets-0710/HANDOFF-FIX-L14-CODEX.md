# Agent Handoff

TASK: `docs/tickets-0710/FIX-L14.md`
AGENT/ROLE: Codex — Slides parity audit
BRANCH: `fix/slides-l14-codex`
WORKTREE: `E:\VNOffice-codex-fl14`
OBJECTIVE: Đo 20 nút Slides còn chờ bằng app desktop + PowerPoint COM; đo Zoom/WordArt, cập nhật evidence và matrix; giữ nguyên PowerPoint chủ sở hữu.
FINDINGS: COM gắn cửa sổ PID 12760/HWND 64291812, nhưng tiêu đề vẫn `PowerPoint (Product Activation Failed)`. Đo được ViewType/Zoom/line spacing; COM slideshow trả object thiếu View, gridline/ruler/guides không có property ổn định, legacy Comment không có Resolved. App Zoom đọc EntryEffect=3073 (BoxOut); WordArt đọc Type=17/PresetTextEffect=-2. Thử Fontwork không đạt native Type/TextEffect.
IMPLEMENTATION SUMMARY: Commit plan trước. Thêm COM audit có cleanup chỉ Presentation audit; desktop harness và bằng chứng giãn dòng. Cập nhật generator/matrix từ 57/20/9/2 lên 64/13/9/2. Không sửa app serializer vì probe không cho thấy cách đạt native WordArt/Zoom parity.
FILES CHANGED: `docs/PLAN-SLIDES-L14.md`; `scripts/audit-0610/office_parallel/slides/fix-l14-com-audit.ps1`; `tests/live/cdp/slides-fix-l14-line-spacing.desktop.mjs`; `scripts/audit-0610/gen_slides_button_matrix.py`; `docs/SLIDES-BUTTON-MATRIX-1011.md`; `docs/tickets-0710/FIX-L14-RESULTS.md`; `docs/tickets-0710/evidence/fix-l14/**`; handoff này.
COMMANDS RUN: PowerPoint COM probes against copies under `E:\VNOffice-profiles\codex-fl14`; Node 20 `--experimental-websocket tests/live/cdp/slides-fix-l12-office-compare.desktop.mjs` (10/10); `slides-fix-l14-line-spacing.desktop.mjs` (lineSpacing 1.0→1.5); `python -X utf8 scripts/audit-0610/gen_slides_button_matrix.py docs/ribbon-scan-slides-1011.json docs/SLIDES-BUTTON-MATRIX-1011.md`; Fontwork FODP/LibreOffice/PowerPoint COM probe; `npm test` (3112/3112); `python -m unittest discover -s tests` (907/907); desktop CDP roundtrip (8/8), FIX-L2 (20/20), FIX-L3 (13/13); UTF-8/no BOM scan (17 files) và `git diff main...HEAD --check`.
BUILD RESULT: NOT RUN (không sửa app/build).
TEST RESULTS: FIX-L12 desktop 10/10 PASS; FIX-L14 line spacing CDP + PowerPoint COM readback PASS; matrix generator 88 rows PASS (64 match, 13 unchecked, 9 intentional, 2 known gaps). `npm test` 3112/3112 PASS; Python 907/907 PASS (566.9s, có ResourceWarning file handle nhưng không fail); desktop roundtrip 8/8 PASS; FIX-L2 20/20 PASS; FIX-L3 13/13 PASS (exit code 0); UTF-8/no BOM 17 files PASS; `git diff main...HEAD --check` PASS.
KNOWN FAILURES: Ticket chưa đóng hết parity: 13 nút CHƯA ĐỐI CHIẾU, 2 LỆCH ĐÃ BIẾT (Zoom, WordArt). COM slideshow Run không trả View; Product Activation Failed ngăn tạo/đọc mẫu native transition/WordArt. Không dừng/kết thúc POWERPNT chủ sở hữu.
RISKS: Không đổi semantics PPTX. Không sửa test/fixture/expected. Không sửa LibreOffice Core. App code không đổi.
DEPENDENCIES/BLOCKERS: Cần PowerPoint đã kích hoạt và mẫu native Zoom/WordArt do chủ sở hữu tạo để đối chiếu nốt. COM `View`/legacy Comments không cung cấp property cần thiết cho một số hàng.
CORE PATCH ID (if any): None.
NEXT ACTION: Cần phiên PowerPoint đã kích hoạt và mẫu Zoom/WordArt native để xử lý 2 lệch đã biết; cần đối chiếu thêm 13 nút còn CHƯA ĐỐI CHIẾU. PowerPoint chủ sở hữu vẫn đang chạy; không gọi Quit/kill.
