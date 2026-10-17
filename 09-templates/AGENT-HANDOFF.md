# Agent Handoff
TASK: CODEX-SLICER — Slicer cho Bảng giai đoạn 1
AGENT/ROLE: Codex / VN Sheet
BRANCH: feat/sheet-slicer-codex
WORKTREE: E:\VNOffice-codex-slicer
OBJECTIVE: Thêm Slicer cho Table với UI desktop đầy đủ, lọc thật, undo/redo và round-trip XLSX native được Excel 2016 nhận diện.
FINDINGS: Excel 16.0 dùng một cache cho mỗi cột, nhiều Slicer của sheet trong một slicer part, lựa chọn trong Table AutoFilter, workbook/worksheet ext x15/x14 và drawing AlternateContent. Đơn chọn, đa chọn, nhiều Slicer và AutoFilter giao theo VÀ; HasData phản ánh giao lọc.
IMPLEMENTATION SUMMARY: Thêm TableSlicerController và ribbon Thiết kế Bảng; dùng lại hiddenRows/activeFilters/rowVisibilityResolver/SUBTOTAL; serialize model qua FODS; đọc/ghi đầy đủ slicer/cache/ext/relationships/content types/drawing/table filters trong OOXML. Có Help VI, i18n VI/EN, unit, pytest, desktop CDP và hai COM oracle/read-only.
FILES CHANGED: apps/sheet/table-slicer.js; apps/sheet/sheet-grid.js; apps/sheet/sheet-ribbon.js; apps/sheet/sheet.css; adapters/libreoffice/sheet/sheet-adapter.js; adapters/libreoffice/common/ooxml_zip_patch.py; platform/commands/command-definitions.js; platform/help/entries-sheet.js; platform/i18n/strings-vi.js; platform/i18n/strings-en.js; tests/run-tests.js; tests/unit/help-coverage.test.js; tests/unit/sheet-slicer.test.js; tests/test_sheet_slicer_xlsx.py; tests/live/cdp/sheet-slicer.desktop.mjs; tests/live/sheet-slicer-excel2016-oracle.ps1; tests/live/sheet-slicer-excel-readonly.ps1; docs/AUDIT-SLICER-1610.md; docs/RIBBON-BACKLOG.md; docs/EXCEL2016-FEATURE-CHECKLIST.md; 09-templates/AGENT-HANDOFF.md.
COMMANDS RUN: npm test; pytest tests/test_sheet_slicer_xlsx.py; desktop CDP sheet-slicer; Excel 2016 COM oracle và ReadOnly; structural_oracle cases 1–12; sheet_formulas_vs_cache --force cho lan28/lan04; dirty-save batch_document_audit 10 XLSX; syntax, diff và UTF-8/BOM scan.
BUILD RESULT: NOT RUN — không đổi build system; nghiệm thu desktop và npm test là cổng của phiếu.
TEST RESULTS: PASS — npm 3526/3526; unit Slicer 6/6; pytest 3/3; structural 156/156 kịch bản và 1567/1567 ô; lan28 271/275 (98,55%); lan04 49/49; batch LAN 10/10 saved=yes, diffs=0, lint sạch, Excel PASS; Excel ReadOnly thấy 1 cache/1 Slicer và đúng lựa chọn.
KNOWN FAILURES: Bốn mismatch cache còn lại của lan28 là baseline ngoài phạm vi; cổng 98,18% vẫn vượt. Không có lỗi Slicer đã biết trong phạm vi giai đoạn 1.
RISKS: PivotTable Slicer và Timeline chưa triển khai. LibreOffice không sở hữu model Slicer đầy đủ nên adapter phải overlay metadata và hậu xử lý OOXML; batch dirty-save và COM đã phủ rủi ro này.
DEPENDENCIES/BLOCKERS: None.
CORE PATCH ID (if any): None.
NEXT ACTION: Review các commit trên branch và merge theo quy trình; Pivot Slicer/Timeline là phiếu riêng.

---

# Agent Handoff
TASK: FIX-P1b (Sheet formula regression audit and P1 edit latency)
AGENT/ROLE: Codex / Sheet QA
BRANCH: fix/sheet-p1b-codex
WORKTREE: E:\VNOffice-codex-fp1b
OBJECTIVE: Verify each of the 28 real XLSX files matches its pre-P1 formula-cache baseline, lan01 remains 100%, and quick-view first-character/Enter latency stays within 100/300 ms.
FINDINGS: The corrected desktop audit matches the pre-P1 baseline commit 0be02c89 exactly for all 28 files: 72,707/72,837 (99.82%); lan01 is 865/865 (100%). The background preview check on lan01 verified 78/78 visible cross-sheet formulas. Closed external-workbook formulas must use the workbook's stored cached values, matching the app's offline behavior. Latency probe results (first key / Enter): lan01 39/42 ms; lan04 35/43 ms; lan06 32/48 ms; lan09 32/46 ms; lan16 40/47 ms. Each edit was retained in the quick-view journal during 12% background load. XLSX round-trip audit: 7/8 PASS; lan11 has a conditional-formatting L2 difference already present in the pre-P1 structural audit.
IMPLEMENTATION SUMMARY: Corrected audit timing and offline external-link semantics, added per-file baseline gates and quick-view checks, and made the typing probe wait for the editable preview and verify a retained edit. No product source changes were needed because the desktop formula results already meet the ticket baseline.
FILES CHANGED: scripts/audit-0610/sheet_formulas_vs_cache.mjs; scripts/audit-0610/probe_typing_cost.mjs; 09-templates/AGENT-HANDOFF.md.
COMMANDS RUN: npm test; python -m unittest discover -s tests; 28-file desktop sheet_formulas_vs_cache audit against 0be02c89; dirty-save XLSX round-trip for lan01/02/04/06/09/11/22/26; desktop CDP typing probe for lan01/04/06/09/16; node --check scripts/audit-0610/probe_typing_cost.mjs. Desktop runs used VNO_CDP_LOCALAPPDATA=E:\VNOffice-profiles\codex-fp1b and E: TEMP/TMP.
BUILD RESULT: NOT RUN (no build was required by the ticket).
TEST RESULTS: PASS — npm test 3119/3119; Python unittest 912 tests; formula baseline gate 28/28 files with zero per-file regressions; typing metrics all within thresholds. XLSX round-trip 7/8 PASS; lan11's L2 CF difference is documented in the pre-P1 structural audit.
KNOWN FAILURES: No formula-baseline regressions. lan02 (2/4), lan14 (68,121/68,125), lan19 (4/5), and lan28 (152/275) retain the same pre-P1 per-file results; lan23 has no formulas to evaluate. lan11 CF L2 is pre-existing.
RISKS: The formula-cache check intentionally treats closed external workbook links as stored offline values; recalculating those formulas without the linked workbook does not represent app behavior.
DEPENDENCIES/BLOCKERS: None.
CORE PATCH ID (if any): None.
NEXT ACTION: Review the committed audit/handoff changes, then merge FIX-P1b. P2 merge is not required for this task because no product formula changes were needed.

---

# Agent Handoff
TASK: E0 — Restore VLOOKUP for numeric lookup values and text identifier keys
AGENT/ROLE: Codex / Sheet Formula Engine
BRANCH: fix/excel-e0-codex
WORKTREE: E:\VNOffice-codex-fe0
OBJECTIVE: Fix the first-load formula-cache regression on lan28 and verify all 28 real workbooks without per-file regressions.
FINDINGS: On the desktop load path, lan28 had 12 sheets and the lookup source was fully loaded (315 cells, 105 populated A-column keys). B3 loaded as numeric 20413. Source key A40 was text-formatted "00020413" and passed the existing text-cell marker, but the exact-lookup index's numeric branch only checked numMap and concluded #N/A before considering eligible text identifiers.
IMPLEMENTATION SUMMARY: Added a numericTextMap to both regular lookup indexes and whole-column VLOOKUP indexes for text-formatted zero-padded identifiers and six-or-more-digit codes. Numeric exact lookup consults this index after the native numeric index misses, while short text such as "5" remains distinct from number 5. Existing FormulaEngine regression cases cover zero-padded IDs, long digit codes, and short numeric text.
FILES CHANGED: apps/sheet/formula-engine.js; 09-templates/AGENT-HANDOFF.md.
COMMANDS RUN: npm test; desktop 28-file audit: node --experimental-websocket scripts/audit-0610/sheet_formulas_vs_cache.mjs --force --report E:\VNOffice-temp\e0-audit-28-after.md. All desktop profile and TEMP data were stored under E:\VNOffice-temp.
BUILD RESULT: NOT RUN (no build requested or required for this JavaScript engine change).
TEST RESULTS: PASS — npm test 3136/3136. Fresh --force audit evaluated 72,837 formulas across all 28 files; lan28 improved from 152/275 (55.27%) to 270/275 (98.18%), exceeding 0.9.9's 97.45% gate. Lan28 VLOOKUP mismatches were eliminated. Other recorded baseline exceptions remained unchanged: lan02 2/4, lan14 68,121/68,125, lan19 4/5; lan23 had no evaluable formulas.
KNOWN FAILURES: The five remaining lan28 mismatches are outside VLOOKUP; report examples include S18, M1, A2, and B2. The audit report is on E:\VNOffice-temp and was not added to the repository.
RISKS: Numeric-to-text matching is limited to text-formatted zero-padded identifiers or digit strings of at least six characters, preserving the existing distinction for short numeric text.
DEPENDENCIES/BLOCKERS: None.
CORE PATCH ID (if any): None.
NEXT ACTION: Commit this E0 fix for independent review and merge following review.

---

# Agent Handoff
TASK: EXCEL-H1 — Audit hộp thoại Định dạng ô (Ctrl+1)
AGENT/ROLE: Codex / Sheet Dialog Audit
BRANCH: feat/sheet-h1-format-cells-audit
WORKTREE: E:\VNOffice-codex-h1
OBJECTIVE: Rà từng control trong sáu thẻ Số, Căn chỉnh, Phông chữ, Đường viền, Tô màu và Bảo vệ; nối chức năng thật, giữ đúng XLSX, kiểm qua desktop CDP và Excel 2016 COM ReadOnly, đồng thời cập nhật Help tiếng Việt.
FINDINGS: Audit có 76 control/tác vụ riêng. Các thiếu sót chính đã được hoàn tất gồm kiểu số âm, mã tùy chỉnh, locale/ngày/giờ/phân số/đặc biệt, các alignment mở rộng, font/underline/effect, mọi cạnh/preset/đường chéo, pattern/gradient và cờ bảo vệ. Hồi quy lưu thử nghiệm (solid fill thành đen, underline giả và metadata mặc định làm lan09 chậm) đã được loại bỏ.
IMPLEMENTATION SUMMARY: Hộp thoại áp dụng model thật qua Sheet grid/adapter, giữ metadata native cần thiết khi lưu XLSX và phản hồi rõ khi không xóa được mã dựng sẵn hoặc không mở được bảo vệ trang tính. Ma trận audit liệt kê từng control; bài CDP đặt giá trị, Đồng ý, lưu XLSX, mở lại app và đối chiếu COM. Help tiếng Việt hướng dẫn cụ thể đủ sáu thẻ; i18n VI/EN đã đồng bộ.
FILES CHANGED: apps/sheet/format-cells-dialog.js; adapters/libreoffice/sheet/sheet-adapter.js; adapters/libreoffice/common/ooxml_zip_patch.py; platform/help/entries-sheet.js; platform/i18n/strings-vi.js; platform/i18n/strings-en.js; tests/unit/sheet-format-cells.test.js; tests/live/cdp/sheet-format-cells-controls.desktop.mjs; tests/live/cdp/sheet-format-cells-controls-readonly.ps1; docs/AUDIT-SHEET-DIALOG-FORMAT-CELLS-1310.md; docs/tickets-0710/H1-CLAUDE-NOTES.md; 09-templates/AGENT-HANDOFF.md.
COMMANDS RUN: npm test; node --experimental-websocket tests/live/cdp/sheet-format-cells-controls.desktop.mjs; node --experimental-websocket tests/live/cdp/sheet-ribbon-runtime-audit.desktop.mjs; VNO_AUDIT_MARK_DIRTY=1 python scripts/layout-audit/batch_document_audit.py xlsx E:\VNOffice-codex-h1 lan01.xlsx lan02.xlsx lan04.xlsx lan06.xlsx lan09.xlsx lan11.xlsx lan22.xlsx lan26.xlsx lan13.xlsx lan19.xlsx --no-reuse-saved; sheet_formulas_vs_cache.mjs --force riêng cho lan28, lan01 và lan04. Mỗi desktop run dùng VNO_CDP_LOCALAPPDATA riêng dưới E:\VNOffice-profiles.
BUILD RESULT: NOT RUN — ticket không yêu cầu build/đóng gói; `npm test` đã chạy đầy đủ.
TEST RESULTS: PASS — npm test 3199/3199; Format Cells desktop CDP + Excel COM ReadOnly 77/77; runtime ribbon 157 lệnh với NO_HANDLER=0 và THREW=0; batch LAN 10/10 tệp 0 diff, lint sạch, COM PASS; công thức lan28 270/275 (98,18%), lan01 865/865 và lan04 49/49 (100%).
KNOWN FAILURES: Năm công thức cache còn lệch trên lan28 là baseline đã biết ngoài phạm vi hộp thoại; tỷ lệ vẫn đạt đúng cổng 98,18%. Runtime ribbon có 17 NO_VISIBLE_EFFECT ngoài phạm vi, không có NO_HANDLER hoặc THREW.
RISKS: Một số thuộc tính nâng cao cần metadata native và hậu xử lý OOXML vì LibreOffice chuẩn hóa format; batch LAN đã phủ đường lưu dirty thật để giảm rủi ro hồi quy. Không sửa LibreOffice Core và không thêm dependency.
DEPENDENCIES/BLOCKERS: None.
CORE PATCH ID (if any): None.
NEXT ACTION: Review các commit trên branch này; không merge vào main trong phiên EXCEL-H1.

---

# Agent Handoff
TASK: EXCEL-H3 — Định dạng có điều kiện và xác thực dữ liệu khớp Excel 2016
AGENT/ROLE: Codex / Sheet CF-DV Audit
BRANCH: feat/sheet-h3-cf-codex
WORKTREE: E:\VNOffice-codex-h3
OBJECTIVE: Đo từng loại CF/DV bằng Excel 2016 COM, sửa mọi sai lệch trong VN Sheet, giữ nguyên quy tắc khi lưu/mở `.xlsx`, bổ sung Help tiếng Việt và nghiệm thu hồi quy.
FINDINGS: Excel 16.0 xác nhận 19 loại CF. VN Sheet trước H3 thiếu Top/Bottom theo phần trăm; thanh dữ liệu ép tối thiểu 1%; thang màu làm tròn kênh RGB và đặt giữa thang 3 màu theo 50% khoảng min–max thay vì percentile 50; bộ biểu tượng lệch ranh 33%. DV hiện hữu đã khớp đủ 7 kiểu, 8 toán tử, IgnoreBlank, thông báo nhập, ba mức cảnh báo và khoanh dữ liệu sai nên không cần refactor logic.
IMPLEMENTATION SUMMARY: Bổ sung hai loại phần trăm xuyên model/UI/i18n/Help/OOXML; sửa cách nội suy màu, percentile, thanh 0% và ngưỡng icon; giữ `cfvo` native khi mở/lưu. Thêm oracle Excel COM, unit parity và assertion round-trip. Không sửa LibreOffice Core, không thêm dependency.
FILES CHANGED: adapters/libreoffice/common/ooxml_zip_patch.py; apps/sheet/conditional-formatting.js; apps/sheet/sheet-grid.js; platform/help/entries-sheet.js; platform/i18n/strings-en.js; platform/i18n/strings-vi.js; tests/live/cdp/sheet-excel-g1.desktop.mjs; tests/live/sheet-excel-g1-readonly.ps1; tests/live/sheet-excel-g2-readonly.ps1; tests/live/sheet-cf-dv-excel2016-oracle.ps1; tests/run-tests.js; tests/test_sheet_conditional_formatting_xlsx.py; tests/unit/sheet-cf-dv-excel2016-parity.test.js; docs/AUDIT-CF-DV-1610.md; 09-templates/AGENT-HANDOFF.md.
COMMANDS RUN: npm test; python -m unittest tests.test_sheet_conditional_formatting_xlsx tests.test_sheet_validation_advanced; Excel COM oracle; desktop CDP G1/G2; Excel COM ReadOnly G1/G2; structural_oracle.mjs cases 1–6; dirty-save batch_document_audit.py trên 10 XLSX; sheet_formulas_vs_cache.mjs --force cho lan28/lan01/lan04; git diff --check và UTF-8/BOM scan.
BUILD RESULT: NOT RUN — ticket không thay build system và không yêu cầu đóng gói.
TEST RESULTS: PASS — npm 3396/3396; Python 4/4; Excel oracle 19 CF + 16 DV; desktop/COM CF 19/19 và DV 11/11 (đủ 7 kiểu, 8 toán tử); structural 61/61 kịch bản, 580/580 ô; batch LAN 10/10 tệp `saved=yes`, 0 diff, lint sạch, Excel PASS; công thức lan28 271/275 (98,55%), lan01 865/865, lan04 49/49.
KNOWN FAILURES: Bốn công thức cache lan28 còn lệch ngoài phạm vi CF/DV; cổng yêu cầu vẫn đạt. Giao diện chưa có trình soạn chi tiết từng ngưỡng `cfvo` tùy chỉnh, nhưng ngưỡng nhập từ XLSX được giữ và hiển thị đúng.
RISKS: CF nâng cao phụ thuộc metadata FODS và hậu xử lý OOXML vì LibreOffice có thể chuẩn hóa quy tắc. Dirty-save batch và Excel COM ReadOnly đã phủ đường rủi ro này.
DEPENDENCIES/BLOCKERS: None.
CORE PATCH ID (if any): None.
NEXT ACTION: Review commit H3 và merge theo quy trình; không cần handoff Core/Upstream.

---

# Agent Handoff
TASK: CODEX-ARRAYS — Công thức mảng nhiều ô và hàm mảng VN Sheet
AGENT/ROLE: Codex / VN Sheet
BRANCH: feat/sheet-arrays-codex
WORKTREE: E:\VNOffice-codex-arrays
OBJECTIVE: Hoàn thiện CSE một/nhiều ô, chín hàm mảng mục tiêu, lưu/mở XLSX array formula chuẩn và hướng dẫn sử dụng tiếng Việt.
FINDINGS: FormulaEngine, MatrixValue, metadata arrayRange và serializer FODS hiện hữu đủ để tái sử dụng. LibreOffice đã chuyển matrix formula sang `<f t="array" ref="…">` đúng chuẩn nên không cần patch Core/OOXML. Kết quả mảng cần được truyền qua ngữ cảnh evaluateArray để giữ implicit intersection cho công thức thường nhưng cho phép CSE và wrapper tiêu thụ ma trận.
IMPLEMENTATION SUMMARY: Thêm module hàm ma trận/hồi quy; mở rộng engine cho nested arrays, IF/INDEX/SUM/SUMPRODUCT; hoàn thiện nhập, hiển thị, khóa sửa, xóa và undo khối CSE; bổ sung golden/oracle, round-trip XLSX, COM ReadOnly, desktop CDP, Help VI và i18n VI/EN.
FILES CHANGED: apps/sheet/formula-array-functions.js; apps/sheet/formula-engine.js; apps/sheet/formula-definitions-vi.js; apps/sheet/sheet-grid.js; adapters/libreoffice/sheet/sheet-adapter.js; platform/help/entries-sheet.js; platform/i18n/strings-vi.js; platform/i18n/strings-en.js; scripts/audit-0610/function_oracle.mjs; tests/unit/function-golden.test.js; tests/unit/sheet-array-formulas.test.js; tests/functions/cases-batch16-array-functions.json; tests/functions/golden-batch16-array-functions.json; tests/test_sheet_array_formula_xlsx.py; tests/live/cdp/sheet-array-formulas.desktop.mjs; tests/live/cdp/sheet-array-xlsx-readonly.ps1; docs/PLAN-ARRAYS-1610.md; docs/AUDIT-ARRAYS-1610.md; 09-templates/AGENT-HANDOFF.md.
COMMANDS RUN: function oracle/golden batch 16; focused array/help/i18n tests; python round-trip XLSX; desktop CDP; Excel COM ReadOnly; npm test; structural oracle cases 1–13 và 15; sheet_formulas_vs_cache --force cho lan01/04/28; dirty-save batch_document_audit.py trên 10 XLSX; syntax, diff và UTF-8/BOM scan.
BUILD RESULT: NOT RUN — không đổi build system; npm test và desktop là cổng của phiếu.
TEST RESULTS: PASS — golden 30/30; unit array 11/11; XLSX 1/1; desktop 8/8; npm 3550/3550; structural 172/172 kịch bản và 1019/1019 ô; lan01/04 100%, lan28 98,55%; batch LAN 10/10 saved=yes, diffs=0, lint sạch, Excel PASS.
KNOWN FAILURES: Bốn mismatch cache còn lại của lan28 là baseline ngoài phạm vi; tỷ lệ vẫn vượt cổng 98,18%.
RISKS: Sai số số thực trong hồi quy được kiểm bằng oracle/tolerance; SEQUENCE không thuộc mục tiêu. Không có Core patch hoặc dependency mới.
DEPENDENCIES/BLOCKERS: None.
CORE PATCH ID (if any): None.
NEXT ACTION: Review commit trên branch và merge theo quy trình; không cần handoff Core/Upstream.

---

# Agent Handoff
TASK: CODEX-WRITER-STYLES — Ngăn Kiểu và tạo kiểu đoạn văn
AGENT/ROLE: Codex / VN Writer
BRANCH: feat/writer-styles-codex
WORKTREE: E:\VNOffice-codex-styles
OBJECTIVE: Thêm Ngăn Kiểu, hộp thoại tạo kiểu từ vùng chọn và round-trip kiểu đoạn tùy chỉnh qua DOCX; kèm hướng dẫn tiếng Việt trong ứng dụng.
FINDINGS: Writer đã có gallery và help contextual F1. Đường lưu DOCX chạy qua main.py và adapters/libreoffice/common/ooxml_zip_patch.py; dùng lại lớp hướng dẫn hiện hữu, không sửa LibreOffice Core hoặc thêm dependency.
IMPLEMENTATION SUMMARY: Thêm nút Ngăn Kiểu trong Trang đầu > Kiểu dáng, phím Ctrl+Alt+Shift+S, danh sách kiểu đoạn, trạng thái kiểu đoạn hiện tại, Esc để đóng; thêm hộp thoại tạo kiểu có basedOn/next và định dạng đoạn. Python patch tạo w:style custom paragraph và liên kết w:pStyle; import đánh dấu đoạn, giúp kiểu hiện lại sau khi mở. Bổ sung Help VI, i18n VI/EN và bài CDP desktop.
FILES CHANGED: apps/writer/styles-pane.js; apps/writer/create-style-dialog.js; apps/writer/style-gallery.js; apps/writer/writer-ribbon.js; apps/writer/writer.css; adapters/libreoffice/writer/writer-adapter.js; adapters/libreoffice/common/ooxml_zip_patch.py; platform/commands/command-definitions.js; platform/help/entries-writer.js; platform/i18n/strings-vi.js; platform/i18n/strings-en.js; tests/test_writer_style_gallery_semantics.py; tests/unit/help-coverage.test.js; tests/live/cdp/writer-styles-pane.desktop.mjs; tests/live/cdp/writer-styles-reopen.desktop.mjs; 09-templates/AGENT-HANDOFF.md.
COMMANDS RUN: python -m py_compile adapters/libreoffice/common/ooxml_zip_patch.py main.py; python -m pytest -q tests/test_writer_style_gallery_semantics.py; python -m pytest -q tests/test_writer_run_effects.py; node tests/run-tests.js; node scripts/audit-0610/i18n_parity.mjs; desktop CDP create/reopen; hidden Word COM read-only oracle.
BUILD RESULT: NOT RUN.
TEST RESULTS: pytest style semantics 6/6 PASS; writer run effects 37/37 PASS; CDP create 8/8 PASS; CDP reopen 2/2 PASS; Word COM style oracle PASS (hidden; Arial 13, bold, center, 12 pt after, paragraph style name matched); i18n missing keys 0. Full node suite FAIL: 3629/3655 PASS, 27 FAIL; i18n parity PASS, missing keys 0/2910.
KNOWN FAILURES: No LAN DOCX fixtures are present in this worktree, so the requested two-file LAN compare is BLOCKED. Full node suite: 27 unrelated undo/caret, mail merge, selection, citation, caption and other existing Writer/Sheet failures. Character style application currently saves inline formatting; native w:rStyle linkage is not implemented.
RISKS: Character style formatting is applied to selected text and saved as inline formatting, without preserving the native w:rStyle relationship. No external dependencies or Core changes.
DEPENDENCIES/BLOCKERS: LAN comparison blocked because no test\lan\*.docx fixtures exist in this checkout.
CORE PATCH ID (if any): None.
NEXT ACTION: Review the three commits; resolve the full-suite failures and add native character-style round-trip before merge.

# Agent Handoff
TASK: CODEX-TABS-GOTO — Writer Tab Stops và Go To
AGENT/ROLE: Codex / VN Writer
BRANCH: feat/writer-tabs-goto-codex
WORKTREE: E:\VNOffice-codex-tabs
OBJECTIVE: Hoàn thiện dialog Dừng tab, round-trip w:tabs qua DOCX, dialog Đi đến (Ctrl+G/F5), hướng dẫn VI và kiểm thử desktop/Word COM.
FINDINGS: Dialog và đường ghi w:tabs đã có; thiếu ánh xạ w:tabs khi mở tệp, dialog mất đoạn đích khi đóng modal, Go To đảo hướng Trước/Tiếp và kẹp đích ngoài phạm vi về phần tử đầu/cuối. Writer dùng marker ngắt trang tự động cho các phân đoạn trang trong editor.
IMPLEMENTATION SUMMARY: Khôi phục w:tabs trực tiếp từ OOXML vào data-vno-tabs; giữ các đoạn đã chọn trong lúc dialog Tab mở; sửa Go To theo chỉ mục 1-based, báo không tìm thấy, sửa Trước/Tiếp, lọc bookmark nội bộ, escape tên đề mục/dấu trang; thêm F5 alias theo scope Writer. Cập nhật Help VI và VI/EN tooltip. Không sửa LibreOffice Core, không thêm dependency.
FILES CHANGED: adapters/libreoffice/writer/writer-adapter.js; apps/writer/writer-goto-dialog.js; platform/commands/command-definitions.js; platform/help/entries-writer.js; platform/i18n/strings-vi.js; platform/i18n/strings-en.js; tests/live/cdp/actions.mjs; tests/live/cdp/writer-tabs-goto.desktop.mjs; tests/live/cdp/writer-tabs-word-import.desktop.mjs; tests/live/cdp/writer-tabs-word-readonly.ps1; tests/unit/help-shortcut-consistency.test.js; tests/unit/shortcut-scope.test.js; tests/unit/writer-tabs-tables-agy.test.js; 09-templates/AGENT-HANDOFF.md.
COMMITS: 6d96ad3a fix(writer): restore imported tab stops and preserve dialog target; e93bb250 feat(writer): complete Go To navigation and keyboard access.
COMMANDS RUN: git merge main (Already up to date); node tests/run-tests.js; python -m pytest -q tests/test_writer_run_effects.py tests/test_writer_style_gallery_semantics.py tests/test_writer_tabs_export.py; node --experimental-websocket tests/live/cdp/writer-tabs-goto.desktop.mjs; node --experimental-websocket tests/live/cdp/writer-tabs-word-import.desktop.mjs; node scripts/audit-0610/i18n_parity.mjs; node scripts/perf-proto/help-coverage-report.mjs; git diff --check.
BUILD RESULT: NOT RUN — không thay build system; yêu cầu nghiệm thu tập trung ở test và desktop.
TEST RESULTS: PASS — node tests/run-tests.js 3691/3691; pytest 47/47; desktop CDP Tab/Go To 11/11; Word COM tạo tệp ẩn → app import/dialog 3/3; app save DOCX → Word COM đọc đúng hai custom stop: 7 cm center/none và 14 cm right/dot. i18n missing VI/EN=0/0.
KNOWN FAILURES: Word COM TabStops.Count=3 dù word/document.xml chứa đúng hai w:tab trực tiếp; mục thứ ba là stop hiệu lực mặc định ở 396.9 pt trùng gần vị trí custom 14 cm (396.85 pt). Help coverage hiện Writer 280/283, thiếu 3 lệnh ngoài hai lệnh của task. Chưa chạy đối chiếu Go To trang/dòng với Word COM trên tài liệu 2 trang.
RISKS: Đếm TabStops của Word COM gồm một stop mặc định trùng gần stop tùy chỉnh; giữ nguyên defaultTabStop để tránh đổi semantics các đoạn khác. Tệp LAN không có trong checkout (`test/lan` không tồn tại), nên probe/compare trên 3 file LAN BLOCKED; không có số liệu delta đoạn/trang. Cần chạy CDP và Word page/line oracle trên tài liệu 2 trang trước khi coi nghiệm thu Go To đầy đủ.
DEPENDENCIES/BLOCKERS: Bộ tệp `test/lan/*.docx` vắng mặt; Go To page/line COM parity chưa chạy.
CORE PATCH ID (if any): None.
NEXT ACTION: Review hai commit; cung cấp test LAN và chạy đối chiếu Word COM trang/dòng trước khi gộp.