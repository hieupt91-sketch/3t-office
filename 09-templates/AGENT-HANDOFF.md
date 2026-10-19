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

# Agent Handoff
TASK: BRIEF-CODEX-DOCPROPS — VN Slides Backstage properties, Mark as Final, Inspect Presentation
AGENT/ROLE: Codex / VN Slides + Shared Platform
BRANCH: feat/slides-docprops-codex
WORKTREE: E:\VNOffice-codex-docprops
OBJECTIVE: Add Slides Tệp > Thông tin properties, soft final mode, presentation inspector, and PPTX metadata preservation; move the shared document properties dialog to Platform without changing Writer/Sheet behavior.
FINDINGS: Shared dialog was duplicated in Writer/Sheet. Slides Backstage had no Info entry or metadata adapter API. Python PPTX conversion already provides the correct postprocess/open-overlay seam for core/app properties.
IMPLEMENTATION SUMMARY: Extracted the shared dialog to `platform/dialogs/document-properties.js` and retained Writer/Sheet compatibility modules. Added Slides Backstage information, properties and final status, a Slides inspector for document properties/comments/notes/hidden slides/external URLs, and soft text/notes edit lock with an explicit edit override. Added `docProps/core.xml` properties round-trip and app Manager/Company updates, help entry, VI/EN strings and regression tests. Plan commit: `1312276e`; feature commit: `bac390ac`.
FILES CHANGED: `platform/dialogs/document-properties.js`; `apps/sheet/document-properties.js`; `apps/writer/document-properties.js`; `apps/slides/document-inspector-dialog.js`; `adapters/libreoffice/slides/slides-adapter.js`; `adapters/libreoffice/common/ooxml_zip_patch.py`; `platform/shell/app-shell.js`; `platform/help/entries-slides.js`; `platform/i18n/strings-vi.js`; `platform/i18n/strings-en.js`; `tests/unit/slides-document-properties.test.js`; `tests/test_slides_document_properties.py`; `tests/live/cdp/slides-file-info.desktop.mjs`; `tests/run-tests.js`; `09-templates/AGENT-HANDOFF.md`.
COMMANDS RUN: `node tests/run-tests.js`; `python -m pytest -q tests/test_slides_source_transition.py tests/test_writer_run_effects.py tests/test_slides_document_properties.py`; `node --experimental-websocket tests/live/cdp/slides-file-info.desktop.mjs`; `node scripts/audit-0610/i18n_parity.mjs`; `node scripts/help-coverage.mjs`; `python -m py_compile adapters/libreoffice/common/ooxml_zip_patch.py`; `git diff --check`.
BUILD RESULT: NOT RUN — no build/package validation requested; no build system changed.
TEST RESULTS: PASS — Node suite 3699/3699; pytest 57/57; desktop CDP 6/6; i18n missing keys 0 (VI/EN 2944 each); Slides help coverage 154/154 (100%); Python compile and diff check passed. PPTX `docProps/core.xml` was directly inspected after desktop save: Title, Author, Subject, Keywords, Comments, Content status all matched.
KNOWN FAILURES: PowerPoint COM verification BLOCKED before opening a presentation: setting `PowerPoint.Application.Visible = false` returned “Hiding the application window is not allowed.” The app was quit; Office was not opened with a presentation and was not made visible. A second-process desktop launch with `filePath` did not load the file in this harness, so live no-change open/save is NOT RUN; metadata marker read and unchanged-property reapply are covered by unit tests.
RISKS: Inspector external-content scan identifies HTTP(S) URLs on shape `src`/`href`; it does not inspect all possible embedded/linked OOXML relationships. No Core patch or dependency added.
DEPENDENCIES/BLOCKERS: Hidden PowerPoint COM environment required to finish COM oracle. No code blocker for the passing tests.
CORE PATCH ID (if any): None.
NEXT ACTION: In an environment where PowerPoint COM can remain hidden, verify the six built-in properties and final content status, then open an existing attributed PPTX in desktop and save unchanged to confirm round-trip retention.
---

# Agent Handoff
TASK: CODEX-EFFECTOPTS — Tùy chọn hiệu ứng, Dán đặc biệt, Tác vụ khi nhấp trong VN Slides
AGENT/ROLE: Codex / Slides
BRANCH: feat/slides-effectopts-codex
WORKTREE: E:\VNOffice-codex-effectopts
OBJECTIVE: Thêm hướng cho hoạt ảnh/chuyển tiếp, Dán đặc biệt Ctrl+Alt+V, tác vụ khi nhấp cho hình/khung chữ, hướng dẫn tiếng Việt và kiểm chứng PPTX.
FINDINGS: Đường lưu thật đi qua adapter FODP rồi `ooxml_zip_patch.py`. Animation Fly In lưu preset subtype đúng hướng; transition Push lưu hướng bằng `<p:push dir=...>`; hyperlink/tác vụ được phát ra từ event listener ODF. PowerPoint COM có thể mở tệp chỉ đọc khi instance mới khởi động mặc định ẩn; không cần đặt thuộc tính `Visible`.
IMPLEMENTATION SUMMARY: Thêm direction vào model, preview, UI và round-trip; thêm hướng chuyển tiếp cùng bảo vệ khối custom gốc khi áp dụng; thêm hộp Dán đặc biệt với giữ định dạng nguồn/chủ đề đích/PNG/chỉ văn bản từ clipboard cục bộ; thêm tác vụ trang kế/trước/đầu/cuối/cụ thể/web cho shape; bổ sung Help VI/EN và bằng chứng checklist được sinh từ script.
FILES CHANGED: `adapters/libreoffice/common/ooxml_zip_patch.py`; `adapters/libreoffice/slides/slides-adapter.js`; `apps/slides/slide-animation-classes.js`; `apps/slides/slides-canvas.js`; `apps/slides/slides-ribbon.js`; `apps/slides/slides.css`; `platform/commands/command-definitions.js`; `platform/help/entries-slides.js`; `platform/i18n/strings-vi.js`; `platform/i18n/strings-en.js`; `scripts/audit-0610/gen_ppt_checklist.py`; `docs/POWERPOINT2016-FEATURE-CHECKLIST.md`; `tests/run-tests.js`; `tests/test_slides_native_animation_timing.py`; `tests/test_slides_source_transition.py`; `tests/unit/slides-paste-special.test.js`; `tests/unit/slide-animation-classes.test.js`; `tests/unit/help-coverage.test.js`; `tests/live/cdp/slides-animation-tab.desktop.mjs`; `tests/live/cdp/slides-transition-tab.desktop.mjs`; `09-templates/AGENT-HANDOFF.md`.
COMMANDS RUN: `node tests/run-tests.js`; four targeted pytest files; three desktop CDP scripts with `--experimental-websocket`; hidden PowerPoint COM read-only probes; i18n parity; Help coverage; checklist generator/verifier; JS syntax checks; Python compile; `git diff --check`.
BUILD RESULT: NOT RUN — no build system changes.
TEST RESULTS: PASS — Node 3707/3707; pytest 31 passed; CDP animation 10/10, transition 12/12, transition timing 8/8; VI/EN 2992 keys each, missing 0; Slides Help coverage 100%; checklist verifier lowered 0 rows. COM read-only/hidden: Fly In from left `Direction=4`; Push from left `EntryEffect=3853`; Next Slide action `Action=1`.
KNOWN FAILURES: Paste Special unit coverage passes; its CDP modal smoke was NOT RUN to completion because the injected clipboard fixture did not go through the active native clipboard bridge. The regular animation/transition/timing CDP suites pass.
RISKS: PPTX `p:wheel` has a spoke count and no cardinal `dir` attribute, so the current Fan transition serializes as a one-spoke wheel; directional Fan cannot be asserted in PowerPoint COM. Custom source transitions remain preserved when the user leaves them unchanged.
DEPENDENCIES/BLOCKERS: None for implementation. Paste Special modal/clipboard needs a desktop smoke with a populated native clipboard.
CORE PATCH ID (if any): None.
NEXT ACTION: Review the commits; run Paste Special desktop smoke with a native clipboard item and decide whether Fan should keep wheel semantics or use a directional alternative.

---

# Agent Handoff
TASK: Q2 — Mục lục bị ghi thành chèn/xóa theo dõi khi có nhận xét + theo dõi thay đổi (Writer)
AGENT/ROLE: Codex / VN Writer
BRANCH: codex/queue-19-10
WORKTREE: E:\VNOffice-codex-queue
OBJECTIVE: Keep generated TOC content free of tracked revisions/comments on DOCX save while preserving review markup in document body.
FINDINGS: The Writer export serializer created review bookmarks inside protected TOC entries. Word also refreshed the LibreOffice-marked dirty TOC field on open while Track Changes was enabled, recording the field refresh as revisions.
IMPLEMENTATION SUMMARY: Review serialization now unwraps ins/del/mark wrappers inside generated TOC blocks while preserving displayed text. DOCX review postprocessing clears dirty on cached TOC fields so Word does not introduce revisions when opening the saved document.
FILES CHANGED: adapters/libreoffice/writer/writer-adapter.js; adapters/libreoffice/common/ooxml_zip_patch.py; tests/live/cdp/writer-toc-comment-track-save.desktop.mjs; 09-templates/AGENT-HANDOFF.md.
COMMANDS RUN: node tests/live/cdp/writer-toc-comment-track-save.desktop.mjs (pre-fix and post-fix; WebSocket flag --experimental-websocket); Word COM readback through the desktop CDP test; python -m pytest tests/test_writer_review_roundtrip.py -q; node tests/unit/writer-review-export.test.js; node tests/run-tests.js; node scripts/audit-0610/i18n_parity.mjs; python scripts/audit-0610/verify_checklist_evidence.py --all --no-fix; git diff --check.
BUILD RESULT: NOT RUN — no build-system changes.
TEST RESULTS: PASS — desktop CDP + Word COM: TOCs=1, TOC revisions=0, body revisions=2, comments=1 in body; pre-fix CDP reproduced review markup inside TOC. PASS — pytest 11/11; full suite 3766/3766; i18n missing keys=0; diff check clean.
KNOWN FAILURES: Checklist evidence verifier reported 4 unrelated existing Sheet/Slides rows lowered (2 Sheet, 2 Slides); no related checklist or Sheet/Slides files changed. Do not report this repository-wide gate as PASS.
RISKS: TOC field cached results will not be marked dirty for automatic refresh on Word open; users can explicitly update the TOC from the Writer References tab.
DEPENDENCIES/BLOCKERS: None for Q2. Missing CODEX-COMMON-RULES.md was not present in the assigned worktree.
CORE PATCH ID (if any): None.
NEXT ACTION: Review and merge the Q2 commit; investigate pre-existing checklist evidence rows in separate tickets.


# Agent Handoff
TASK: Q3 — Writer: sửa lỗi giao diện nhỏ khi soạn thảo
AGENT/ROLE: Codex / VN Writer
BRANCH: codex/queue-19-10
WORKTREE: E:\VNOffice-codex-queue
OBJECTIVE: Fix six Writer UI issues with a CDP reproduction/check per item and separate commits.
FINDINGS: Heading 1 preview diverged from the saved built-in style. The Vietnamese style gallery exposed “Normal”; page-region labels mixed Vietnamese and English. The table header toggle omitted command state. Comment UI used both “Ghi chú” and “Nhận xét”. Recovery dialog stayed open after deleting its last item. The 1366×768 CDP window did not reproduce the reported zoom-group clipping.
IMPLEMENTATION SUMMARY: Matched Heading 1 preview to the existing applied style without changing DOCX style semantics; localized Writer style/page-region labels; synchronized `writer.table.toggleHeaderRow` state; standardized comment labels and Help copy; close recovery dialog when its final item is removed. Added a CDP fit regression check for the zoom group; no production change because it passes at 1366×768.
FILES CHANGED: apps/writer/style-gallery.js; apps/writer/writer-app.js; apps/writer/writer.css; adapters/libreoffice/writer/writer-adapter.js; platform/autorecover/recovery-dialog.js; platform/i18n/strings-vi.js; platform/i18n/strings-en.js; platform/help/entries-writer.js; tests/live/cdp/writer-style-preview-parity.desktop.mjs; tests/live/cdp/writer-vietnamese-ui-labels.desktop.mjs; tests/live/cdp/writer-table-header-toggle-state.desktop.mjs; tests/live/cdp/writer-comment-terminology.desktop.mjs; tests/live/cdp/writer-autorecover-last-item.desktop.mjs; tests/live/cdp/writer-zoom-ribbon-fit.desktop.mjs; docs/WORD2016-FEATURE-CHECKLIST.md; docs/EXCEL2016-FEATURE-CHECKLIST.md; docs/POWERPOINT2016-FEATURE-CHECKLIST.md; 09-templates/AGENT-HANDOFF.md.
COMMITS: bff5531e; d7a1ab1b; caaa42fc; 8089d089; 439593ab; a00b9e36; 033aa420; 53fd7f04; 9cc66f77.
COMMANDS RUN: `git merge main`; all six CDP scripts before/after as applicable; `node tests/run-tests.js`; `python -m pytest tests -q -k writer`; `node scripts/audit-0610/i18n_parity.mjs`; `node scripts/help-coverage.mjs`; all three `gen_*_checklist.py`; `python scripts/audit-0610/verify_checklist_evidence.py --all --no-fix`; `git diff --check`.
BUILD RESULT: NOT RUN — no build/package changes.
TEST RESULTS: PASS — Node suite 3766/3766; Writer pytest 307 passed, 786 deselected; CDP pre/post: style preview 1/1 fail→pass, labels 2/2 fail→pass, table toggle 1/1 fail→pass, comment labels 2/2 fail→pass, recovery last item 1/1 fail→pass. Zoom fit 1/1 PASS at 1366×768 without a code change. i18n VI/EN 3093 keys each, missing 0; Writer Help 230/230 (100%).
KNOWN FAILURES: Checklist evidence verifier reports one unrelated Word checklist row lowered (right-click text context menu, A→N; missing valid command/evidence); Excel and PowerPoint have zero lowered rows. `CODEX-COMMON-RULES.md` was absent from the assigned worktree.
RISKS: The requested zoom clipping could not be reproduced with a real 1366×768 app window via CDP, so no production adjustment was made. No DOCX style names were changed.
DEPENDENCIES/BLOCKERS: None for implemented fixes. Zoom clipping requires a reproducible environment if it persists on another display configuration.
CORE PATCH ID (if any): None.
NEXT ACTION: Review the nine commits. If zoom clipping remains reproducible on another 1366 px setup, record the CDP geometry and handle it as a follow-up.
---


# Agent Handoff
TASK: Q4 — Writer: chọn kích thước bảng và chèn mục lục tại con trỏ
AGENT/ROLE: Codex / VN Writer
BRANCH: codex/queue-19-10
WORKTREE: E:\VNOffice-codex-queue
OBJECTIVE: Thêm bộ chọn bảng 10×8 và hộp thoại 1–63 hàng/cột; chèn mục lục tại caret, tách đoạn nếu caret ở giữa đoạn.
FINDINGS: Lệnh writer.table.insert trước đây chèn cố định 3×4. TOC trước đây được đặt sau paragraph chứa caret. CODEX-COMMON-RULES.md không có trong worktree; áp dụng AGENTS.md và quy tắc phiếu được giao.
IMPLEMENTATION SUMMARY: Writer UI mở lưới kích thước có chọn bằng rê/kéo, điều hướng phím, Esc, hộp thoại tùy chỉnh và báo lỗi giá trị; Adapter chèn bảng tự cân rộng, đặt caret vào ô đầu và giới hạn kích thước 1–63. TOC được chèn tại caret thật bằng cách tách block; nhánh headless cũ vẫn giữ tương thích. Cập nhật Help VI, nhãn i18n VI/EN, và checklist Word với dẫn chứng kiểm được.
FILES CHANGED: adapters/libreoffice/writer/writer-adapter.js; apps/writer/writer-app.js; apps/writer/writer-table-size-picker.js; platform/help/entries-writer.js; platform/i18n/strings-vi.js; platform/i18n/strings-en.js; tests/live/cdp/writer-table-size-picker.desktop.mjs; tests/live/cdp/writer-table-size-picker.word-readback.ps1; tests/live/cdp/writer-toc-at-caret.desktop.mjs; scripts/audit-0610/gen_word_checklist.py; docs/WORD2016-FEATURE-CHECKLIST.md; 09-templates/AGENT-HANDOFF.md.
COMMITS: 0fe85b0b (merge main); eb1cfab5 (resolve merge); 56f07440 (feature).
COMMANDS RUN: `git merge main`; CDP table test before/after; CDP TOC test before/after; hidden Word COM readback; `node tests/run-tests.js`; `python -m pytest tests -q -k writer`; `node scripts/audit-0610/i18n_parity.mjs`; `node scripts/help-coverage.mjs`; all three `gen_*_checklist.py`; `python scripts/audit-0610/verify_checklist_evidence.py --all --no-fix`; `git diff --check`.
BUILD RESULT: NOT RUN — no build/package changes.
TEST RESULTS: PASS — Node 3768/3768; pytest 307 passed, 786 deselected; table CDP baseline 0/2 → final 6/6 (drag 5×3, dialog 6×4, Esc, save, undo); TOC CDP baseline 1/2 → final 2/2; hidden Word COM readback found 3×5 and 4×6 tables. i18n VI/EN 3105 each, missing 0; Help Writer 230/230; checklist evidence lowered rows Word/Excel/Slides 0/0/0.
KNOWN FAILURES: None in ticket scope.
RISKS: Word COM readback used the local hidden Office installation. No Core or file-format implementation changes.
DEPENDENCIES/BLOCKERS: None.
CORE PATCH ID (if any): None.
NEXT ACTION: Review Q4 commits; ticket completion log is E:\VNOffice-briefs\logs\Q4-writer-table-toc.DONE.
---

# Agent Handoff
TASK: Q5 — Sheet: thao tác bảng doanh thu, tìm lỗi nhỏ và kiểm tra XLSX
AGENT/ROLE: Codex / VN Sheet QA
BRANCH: codex/queue-19-10
WORKTREE: E:\VNOffice-codex-queue
OBJECTIVE: Thực hiện quy trình bảng doanh thu qua CDP bằng chuột và bàn phím; ghi ít nhất 15 thao tác, sửa lỗi nhỏ có kiểm tra trước/sau, lưu/mở lại XLSX và audit 5 tệp LAN.
FINDINGS: Đã thực hiện 22 thao tác gồm công thức, sắp xếp hai chiều, hai kiểu lọc, định dạng có điều kiện, biểu đồ cột, cố định hàng, định dạng số/tiền/ngày, gộp ô, căn lề, lưu và mở lại. Lỗi căn giữa chỉ áp dụng lên ô hoạt động thay vì vùng chọn; sửa theo vùng và xác nhận lại trên CDP. Cột ngày cần tự căn để hiển thị đủ nội dung. Hộp thoại Lưu thành native không thể điều khiển theo quy tắc CDP; dùng tệp XLSX trống tạo sẵn rồi Ctrl+S.
IMPLEMENTATION SUMMARY: Sửa căn lề/style để áp dụng tới vùng chọn và giữ fallback cho ô hoạt động khi selection cũ không còn chứa ô đó. Không thay đổi định dạng tệp hay LibreOffice Core. Nhật ký và ảnh CDP: `docs/EXPLORE-SHEET-2026-10-19.md` và `docs/assets/q5-sheet-2026-10-19/`.
FILES CHANGED: `apps/sheet/sheet-grid.js`; `tests/unit/sheet-editing-styles.test.js`; `scripts/audit-0610/app_session_server.mjs`; `scripts/audit-0610/gen_excel_checklist.py`; `docs/EXCEL2016-FEATURE-CHECKLIST.md`; `docs/EXPLORE-SHEET-2026-10-19.md`; `docs/assets/q5-sheet-2026-10-19/*`; `09-templates/AGENT-HANDOFF.md`.
COMMITS: `d7fd7922` (merge main); `4e6a0dce` (profile isolation); `2d9ad885` (range styles); `01fd5baa` (active-cell fallback); `1e2d2b5f` (Excel checklist evidence).
COMMANDS RUN: CDP app session for workbook authoring, save and fresh-session reopen; `node tests/run-tests.js`; `node scripts/audit-0610/i18n_parity.mjs`; `python scripts/audit-0610/verify_checklist_evidence.py --all --no-fix`; `python -m pytest tests -q -k sheet`; five-file `batch_document_audit.py xlsx` for lan25/20/07/13/23; inspected resulting XLSX and batch audit implementation.
BUILD RESULT: NOT RUN — no build/package changes.
TEST RESULTS: PASS — Node suite 3769/3769; pytest 295 passed, 798 deselected; i18n VI/EN 3105 each, 0 missing; checklist evidence 0 lowered rows (Word 279, Excel 217, PowerPoint 269). Alignment test was FAIL before (`B3 phải được căn giữa`), PASS after (22/22); direct CDP confirmed B2:B7 all centered. Five-file audit reported 5/5 saved, diffs=0, lint clean.
KNOWN FAILURES: Save As native dialog BLOCKED under the no-OS-control rule. The batch audit internally invoked hidden Excel COM despite the ticket’s COM-blocked rule and wrote `office=PASS`; this was an out-of-policy run, is disclosed in the exploration log, and is not counted as an accepted COM comparison. Excel COM verification remains BLOCKED for this ticket.
RISKS: Five LAN files were round-tripped and structurally compared; the batch tool also invoked the prohibited COM branch. A fresh five-file run through a COM-free audit path is needed if independent acceptance requires excluding that branch.
DEPENDENCIES/BLOCKERS: None for the UI fix. Excel COM comparison is BLOCKED by task rules; Save As automation is BLOCKED because the dialog is native.
CORE PATCH ID (if any): None.
NEXT ACTION: Review Q5 commits and exploration evidence; use a COM-free five-file round-trip audit for any follow-up verification.
---


---

# Agent Handoff
TASK: Q7 LAN14 open-to-edit latency
AGENT/ROLE: Codex / VN Sheet performance
BRANCH: perf/lan14-open-codex
WORKTREE: E:\VNOffice-codex-lan14
OBJECTIVE: Reduce LAN14.xlsx open-to-edit time to <=93 s at the median across three runs, preserve Quick View <=3.01 s, and retain the 28-file LAN baseline.
FINDINGS: Branch and current main baseline measured effectively the same (editable median 112.00 s vs 112.51 s). XLSX fast overlay rescanned 65 MB worksheet XML for native format targets; a separate FODS metadata traversal and a full cell scan for structured formulas were additional avoidable costs. Python overlay and JS model/load/render stages do not overlap on the critical path; LibreOffice app conversion remained about 13.75 s after changes.
IMPLEMENTATION SUMMARY: Reused parsed XF indices in fast import; fused native cell-format stamping into P1 metadata parsing; skipped full structured-formula cell scan when a quick formula-text check found no structured references. VNO_FAST_IMPORT_OVERLAY=0 provides rollback. Output hashes and the 5,000-cell sample stayed exact.
FILES CHANGED: adapters/libreoffice/common/ooxml_zip_patch.py; tests/test_sheet_format_cells_native.py; 09-templates/AGENT-HANDOFF.md.
COMMANDS RUN: Three-run LAN14 stage measurements at current branch and main; 28-file parity audits for overlay modes; LAN14 FODS/payload SHA parity; focused Python tests; node tests/run-tests.js; pytest -k "sheet or import or fods or ooxml"; i18n parity; checklist evidence; 27-file desktop roundtrip/layout audit with Excel COM blocked; LibreOffice PDF open/export for 27 saved workbooks.
BUILD RESULT: NOT RUN (no build change).
TEST RESULTS: PASS — editable 90.43/90.73/91.10 s (min/median/max); Quick View 2.63/2.65/2.78 s; 28/28 fast-overlay parity; LAN14 overlay/optimized FODS/final FODS/payload hashes exact; JS sample 5,000 cells hash -1959260462. `node tests/run-tests.js` 3769/3769; pytest 360 passed, 737 deselected; i18n missing VI/EN 0; checklist evidence 0 lowered lines. 27/27 workbook round trips had 0 layout diffs and clean lint; LibreOffice opened/exported 27/27 PDFs.
KNOWN FAILURES: LAN14 desktop save audit BLOCKED after 494.6 s in savePipeline; CDP connection closed during save of a 323,219,496-byte FODS intermediate. Excel COM was not run per task rule.
RISKS: LO PDF export confirms documents open but is not an Excel rendering oracle. LAN14 remains too large for the existing whole-document save pipeline; next material gain likely requires lazy/partial sheet loading and save, with format-preserving parity tests.
DEPENDENCIES/BLOCKERS: None.
CORE PATCH ID (if any): None.
NEXT ACTION: Review commits def682d0, be96c13a, e8a7ef30; consider a separate task for partial/lazy sheet loading to reduce first-edit latency and LAN14 save cost.


---

# Agent Handoff
TASK: Q8 — Slides: mở rộng hiệu ứng chuyển trang
AGENT/ROLE: Codex / VN Slides
BRANCH: codex/queue-19-10
WORKTREE: E:\VNOffice-codex-queue
OBJECTIVE: Bổ sung các hiệu ứng chuyển trang có thể lưu thành PPTX và được PowerPoint 2016 COM đọc lại đúng; cập nhật Help tiếng Việt, i18n VI/EN và checklist.
FINDINGS: Gallery có Push nhưng thiếu Wipe, Split, Cover. Đã tạo PPTX trong app và COM đọc EntryEffect: Push=3853, Wipe=2817, Split=3585, Cover=1281. Flip trả 0 nên bị loại khỏi gallery/hộp thoại.
IMPLEMENTATION SUMMARY: Bổ sung Wipe/Split/Cover cho gallery và hộp thoại, ánh xạ FODP sang OOXML native; thêm preview keyframes, hướng dẫn cụ thể và nhãn VI/EN. Help tái sử dụng command slides.transition.apply nên số lệnh Slides giữ 192; unit test kiểm tra nội dung Help mới.
FILES CHANGED: adapters/libreoffice/common/ooxml_zip_patch.py; adapters/libreoffice/slides/slides-adapter.js; apps/slides/slides-canvas.js; apps/slides/slides-ribbon.js; apps/slides/slides.css; platform/help/entries-slides.js; platform/i18n/strings-vi.js; platform/i18n/strings-en.js; tests/unit/help-coverage.test.js; tests/test_slides_source_transition.py; tests/live/cdp/slides-transitions-more.desktop.mjs; scripts/audit-0610/gen_ppt_checklist.py; docs/POWERPOINT2016-FEATURE-CHECKLIST.md; docs/WORD2016-FEATURE-CHECKLIST.md; docs/PLAN-Q8-SLIDES-TRANSITIONS.md; 09-templates/AGENT-HANDOFF.md.
COMMANDS RUN: git merge main; node --experimental-websocket tests/live/cdp/slides-transitions-more.desktop.mjs (trước 2/5, ba thiếu; sau 14/14); PowerPoint COM hidden readback via ppt_author_deck_readback.ps1; node tests/run-tests.js; python -m pytest tests -q -k slides_source_transition; node scripts/audit-0610/i18n_parity.mjs; python scripts/audit-0610/verify_checklist_evidence.py --all --no-fix; all three gen_*_checklist.py scripts; git diff --check.
BUILD RESULT: NOT RUN — không đổi build system.
TEST RESULTS: PASS — node suite 3769/3769; CDP 14/14; pytest 20 passed; PowerPoint COM đọc đúng 4 EntryEffect nêu trên; i18n missing=0 (VI/EN 3108 mỗi bên); checklist evidence 0 dòng hạ.
KNOWN FAILURES: Flip serialize/readback thành EntryEffect=0, vì vậy không hiển thị như lựa chọn mới. Generator cập nhật lại tham chiếu dòng trong checklist Writer; không đổi trạng thái tính năng.
RISKS: Cover và Split đang dùng hướng/hình học OOXML native cơ bản; COM xác nhận đúng loại transition và các enum đã đọc lại. Chưa đánh giá biến thể hướng của từng hiệu ứng bằng COM.
DEPENDENCIES/BLOCKERS: None.
CORE PATCH ID (if any): None.
NEXT ACTION: Review commit Q8 trên branch và merge theo quy trình.

---

# Agent Handoff
TASK: Q9 — Sheet lan14.xlsx save hang diagnosis
AGENT/ROLE: Codex / VN Sheet diagnostics
BRANCH: perf/lan14-open-codex
WORKTREE: E:\VNOffice-codex-lan14
OBJECTIVE: Reproduce dirty-save hang for lan14, locate the blocking phase, compare pre-Q7 code, and fix only with a clear safe cause.
FINDINGS: Current branch: FODS 323,219,496 bytes; staging stopped at 109,667,465 bytes from 00:57:31 to 01:05:49. Pre-Q7 snapshot 6cf93a11: open 110,270 ms, serialize 321,316,585 chars, staging stopped at 8,430,164 bytes from 01:20:18 to 01:28:26. Both saves failed before _write_save_source/soffice/OOXML patch. Therefore the staging hang predates Q7; different stall offsets leave the specific call/cause unknown.
IMPLEMENTATION SUMMARY: No product code changed. Added docs/LAN14-SAVE-DIAG.md with both runtime runs, phase evidence, and an instrumentation proposal.
FILES CHANGED: docs/LAN14-SAVE-DIAG.md; 09-templates/AGENT-HANDOFF.md.
COMMANDS RUN: git merge main; current dirty-save via tests/live/cdp/roundtrip-file.mjs with unique profile and output; pre-Q7 source archive at 6cf93a11 and direct CDP call to globalUnoBridge.saveRealFileInPlace with separate profile/output; npm test; i18n_parity; verify_checklist_evidence; pytest -k "sheet or ooxml".
BUILD RESULT: NOT RUN — diagnostic documentation only.
TEST RESULTS: Current save FAIL at staged transfer after 10 minutes; pre-Q7 save FAIL at same phase after 8m08s. npm test PASS 3769/3769; i18n parity missingVI=0/missingEN=0; checklist evidence 0 downgraded rows across 3 files; pytest -k "sheet or ooxml" PASS 321, 777 deselected. 27-file LAN regression NOT RUN.
KNOWN FAILURES: Staged-content transfer remains unresponsive at variable offsets; neither run produced XLSX.
RISKS: The bridge request/chunk that stalls is unknown. LibreOffice conversion and OOXML postprocessing remain untested in both runs.
DEPENDENCIES/BLOCKERS: None.
CORE PATCH ID (if any): None.
NEXT ACTION: Add unit and CDP probes for per-chunk append_content_stage timing/results, isolate the stalled call, fix only with a reproduction, then run the 27-file LAN audit.

---

# Agent Handoff
TASK: Q10 — Sheet lan14 large save staging
AGENT/ROLE: Codex / VN Sheet integration
BRANCH: perf/lan14-open-codex
WORKTREE: E:\VNOffice-codex-lan14
OBJECTIVE: Measure every append_content_stage call, bound staging waits, save and reopen lan14.xlsx, and run the 27-file LAN regression.
FINDINGS: Pre-fix live rerun succeeded rather than reproducing Q9's intermittent hang: 77/77 sequential 4 Mi-character append calls, 9,517 ms aggregate, 294 ms maximum, 3.00 GB maximum reported JS heap; end-to-end save was 33,772 ms from first append to output. The exact Q9 stalled call was therefore not observed. Post-fix 512 Ki-character chunks completed 613/613 sequential calls, 9,762 ms aggregate, 106 ms maximum, 17 ms p95, one concurrent call; save was 33,321 ms from first append to output. Added a 60-second timeout for each bridge call and made large staging failures abort and propagate instead of retrying the entire payload. Source and saved file both reopened via CDP with 1,435,546 cells, identical first-5,000-cell SHA-256 `abc8c19984fc06c81a0f4066fcf1b8a675be855e9420bdd81bcd8a941dfebd09`, and open times 89,137 ms / 89,668 ms. LibreOffice converted both to FODS with identical SHA-256 `A45EC1CD7FF721DF2EF6973795F536BCAB9825B6E420C3387BE1589ACBCE39FB`.
IMPLEMENTATION SUMMARY: Reduced large bridge chunks from 4 Mi to 512 Ki UTF-16 characters; bounded begin/append calls at 60 seconds; staging errors now abort best-effort and propagate without sending the entire large document again. Large content now fails clearly if the host lacks staging APIs; small content remains on the existing direct path. Added unavailable/delayed/stalled/rejected-call unit coverage and CDP per-append logging of duration, result, chunk characters/UTF-8 bytes, in-flight count, pywebview callable metadata, and JS heap.
FILES CHANGED: adapters/libreoffice/common/uno-bridge.js; tests/unit/uno-bridge-content-stage.test.js; tests/live/cdp/lan14-save-stage-probe.mjs; tests/live/cdp/lan14-reopen-verify.mjs; 09-templates/AGENT-HANDOFF.md.
COMMANDS RUN: git merge main; pre-fix `node tests/run-tests.js` (3 new cases fail: 3767/3770); post-fix `npm test`; `python -m pytest tests -q -k "sheet or ooxml or save"`; both CDP scripts on source/output with unique VNO_CDP_LOCALAPPDATA; `node scripts/audit-0610/i18n_parity.mjs`; `python scripts/audit-0610/verify_checklist_evidence.py --all --no-fix`; 27-file batch LAN roundtrip and diff/lint with Excel COM function deliberately marked BLOCKED; LibreOffice source/output FODS conversion and SHA-256 comparison; `node --check` on changed JavaScript; `git diff --check`.
BUILD RESULT: NOT RUN — no build-system changes.
TEST RESULTS: PASS — `npm test` 3770/3770; pytest 397 passed, 701 deselected; i18n missing VI/EN keys 0; checklist rows lowered 0; saved lan14 reopen count/hash matched and open time 89,668 ms (under 93,000 ms); batch 27/27 files saved with 0 value diffs and clean lint. CDP source hash matched output hash. Excel COM: BLOCKED by task instructions; no COM process launched. Pre-fix staging hang itself did not reproduce in the live rerun.
KNOWN FAILURES: The original intermittent append hang was not reproduced in either Q10 full-save run, so its triggering runtime condition remains unobserved. The batch runner exits with BLOCKED status for all 27 rows only because its Excel COM column is blocked; conversion, value comparison, and lint all completed cleanly.
RISKS: A legitimate bridge request taking longer than 60 seconds now fails the save and attempts stage abort; timeout does not cancel a pywebview request already executing. The 3.2 GB peak heap comes from workbook serialization/loading and was not reduced by smaller chunks; current source/output reopen times meet the 93-second gate with 331 ms margin.
DEPENDENCIES/BLOCKERS: Excel COM verification BLOCKED per task instruction; LibreOffice verification completed successfully.
CORE PATCH ID (if any): None.
NEXT ACTION: Review the Q10 commit and merge per branch policy; if Q9's intermittent stall recurs, use the committed per-call probe report to identify its exact call and backend state.


# Agent Handoff
TASK: Q11 — Writer soạn thư lần 2 như người dùng thật
AGENT/ROLE: Codex / VN Office Writer QA
BRANCH: codex/queue-19-10
WORKTREE: E:\VNOffice-codex-queue
OBJECTIVE: Dùng phiên Writer desktop qua CDP soạn thư mời/phụ lục; kiểm tra ảnh, hộp văn bản, phương trình, đầu/chân trang, ngắt trang, cột, trộn thư, PDF/xem trước/in, tìm-thay thế và soát lỗi; ghi ít nhất 15 thao tác và chỉ sửa lỗi nhỏ khi có thể tái hiện.
FINDINGS: Đã ghi 20 thao tác trong `docs/EXPLORE-WRITER-20-10.md` kèm 15 ảnh chứng cứ. Nhập nội dung, Enter đúng tên phím, ngắt trang, phương trình, đầu/chân trang, 2 cột, hộp tìm/thay thế và tab trộn thư hoạt động. Hộp văn bản chèn nội dung mẫu và che dòng thư. Xem trước in chờ dựng trang và báo 1/1 trong khi vùng soạn thảo báo 1/2. Không thấy bộ chọn tệp khi chèn ảnh; Ctrl+S không tạo tệp/đường dẫn kiểm chứng được; trộn thư chưa có nguồn người nhận.
IMPLEMENTATION SUMMARY: Không sửa mã nguồn; các lỗi xem trước in/hộp văn bản được ghi nhận để tái hiện tiếp. `CODEX-COMMON-RULES.md` không có trong worktree.
FILES CHANGED: `docs/EXPLORE-WRITER-20-10.md`; `docs/assets/q11-writer-2026-10-20/*`; `09-templates/AGENT-HANDOFF.md`.
COMMANDS RUN: `git merge main`; phiên `scripts/audit-0610/app_session_server.mjs writer --port=47011` với VNO_CDP_LOCALAPPDATA riêng; thao tác UI chuột/bàn phím qua CDP; `node tests/run-tests.js`; `node scripts/audit-0610/i18n_parity.mjs`; `python scripts/audit-0610/verify_checklist_evidence.py --all --no-fix`; `python -m pytest tests -q -k "writer or docx or ooxml"`.
BUILD RESULT: NOT RUN — không đổi build system.
TEST RESULTS: PASS — node suite 3770/3770; i18n VI=3108/EN=3108, missing=0; checklist lowered=0 (Word 279, Excel 217, PowerPoint 269); pytest 340 passed, 758 deselected. Lưu/mở DOCX và Word readback: BLOCKED vì Ctrl+S không tạo tệp có thể truy cập qua CDP.
KNOWN FAILURES: Hộp văn bản mẫu che nội dung; preview in treo ở dựng trang và số trang 1/1 so với 1/2; ảnh chưa thao tác được qua picker CDP. Không có sửa lỗi, vì vậy không có đo FAIL-trước/PASS-sau.
RISKS: Chưa có round-trip DOCX/PDF; chưa xác định được nguyên nhân lỗi hộp văn bản và in.
DEPENDENCIES/BLOCKERS: Cần tái hiện luồng lưu DOCX bằng CDP để chạy Word readback ẩn; cần nguồn nhận thư cho luồng trộn.
CORE PATCH ID (if any): None.
NEXT ACTION: Tái hiện hộp văn bản và xem trước in trong phiên có thể lưu tài liệu; sau khi có DOCX, đọc lại bằng script `scripts/audit-0610/word_author_report_readback.ps1` và xác minh khác biệt trang trong preview.

---

# Agent Handoff
TASK: Q12 — Slides soạn thử như người dùng thật
AGENT/ROLE: Codex / VN Slides QA
BRANCH: codex/queue-19-10
WORKTREE: E:\VNOffice-codex-queue
OBJECTIVE: Soạn thử bài thuyết trình 5 trang qua CDP, bao gồm ảnh, bảng, biểu đồ, sơ đồ, hoạt hình, chuyển trang, ghi chú, mẫu chủ đạo, trình chiếu, in/PDF, lưu PPTX và mở lại; ghi ít nhất 15 thao tác, chỉ sửa lỗi nhỏ khi có tái hiện FAIL trước và PASS sau.
FINDINGS: Nhật ký `docs/EXPLORE-SLIDES-2026-10-20.md` có 25 thao tác và 21 ảnh: 16 PASS, 2 FAIL, 7 BLOCKED. Bảng chọn 4×3 hiển thị 12×12; tiêu đề biểu đồ bị dính với tiêu đề mặc định. Chèn ảnh không có picker quan sát được trong CDP. Trình chiếu F5, điều hướng đến trang 5 bằng mũi tên phải, Esc và xem trước in 5 trang hoạt động. Ngăn ghi chú nhận 94 ký tự; hoạt hình Fade In/Fly In có thứ tự 1–2; mẫu Xanh Lá Thiên Nhiên áp dụng được.
IMPLEMENTATION SUMMARY: Không sửa mã nguồn. Chưa sửa hai sai khác bảng/tiêu đề vì lượt thử không xác minh giá trị hai ô nhập ngay trước khi xác nhận để tạo bài FAIL độc lập. Lưu thành/PPTX và PDF không tạo tệp quan sát được; không điều khiển hộp thoại hệ điều hành.
FILES CHANGED: `docs/EXPLORE-SLIDES-2026-10-20.md`; `docs/assets/q12-slides-2026-10-20/*`; `09-templates/AGENT-HANDOFF.md`.
COMMANDS RUN: `git merge main` (Already up to date); `npm test`; `node scripts/audit-0610/i18n_parity.mjs`; `python scripts/audit-0610/verify_checklist_evidence.py --all --no-fix`; `python -m pytest tests -q -k "slides or pptx"`; CDP app session Slides port 47013 with unique `VNO_CDP_LOCALAPPDATA`.
BUILD RESULT: NOT RUN — no build-system changes.
TEST RESULTS: PASS — npm test 3770/3770; pytest 152 passed, 946 deselected; i18n VI=3108/EN=3108, missing=0; checklist 0 downgraded rows (Word 279, Excel 217, PowerPoint 269). PPTX round-trip and PowerPoint COM readback BLOCKED: no saved PPTX was produced. PDF export BLOCKED: no PDF file was produced. No PASS-after-fix claimed because no code fix was made.
KNOWN FAILURES: Table dimensions differ from the attempted 4×3; chart title shows “Biểu đồ dữ liệuTiến độ triển khai”. Image insertion was not verified. Print preview took about 15 seconds to show “Sẵn sàng in” and 5 pages.
RISKS: Deck structure, animation/transition and notes are only verified in the live session and recovery FODP, not in a reopened PPTX. PowerPoint COM comparison remains unverified.
DEPENDENCIES/BLOCKERS: A CDP-accessible save/export destination is needed to create PPTX/PDF and run readback. `CODEX-COMMON-RULES.md` is absent from this worktree; root `AGENTS.md` and the specified exploration docs were read.
CORE PATCH ID (if any): None.
NEXT ACTION: Reproduce table-size and chart-title discrepancies while checking the dialog values before commit; fix only if independently reproducible, with CDP/unit FAIL before and PASS after. Retry image/file-save/export via a permitted CDP-visible path, then reopen PPTX and run hidden PowerPoint COM readback using `-Mode read`.

---
# Agent Handoff
TASK: Q13 — VN Writer: tái hiện và xử lý các lỗi Q11
AGENT/ROLE: Codex / VN Writer
BRANCH: codex/queue-19-10
WORKTREE: E:\VNOffice-codex-queue
OBJECTIVE: Tái hiện qua CDP, sửa lỗi hộp văn bản, xác minh xem trước in hai trang, lưu DOCX mới và đọc lại, chèn ảnh qua CDP; mỗi thay đổi có kiểm tra trước/sau và commit riêng.
FINDINGS: Hộp văn bản ban đầu chồng lên đoạn đang soạn. Preview Q11 không tái hiện với tài liệu Q13 gồm ngắt trang, phương trình, textbox và header/footer: preview hiện 2 trang sau 30,116 ms (30.1 s). Lưu DOCX mới giữ equation/shape/columns nhưng bỏ liên kết section tới header/footer; đã khôi phục headerReference/footerReference trong DOCX.
IMPLEMENTATION SUMMARY: Hộp mặc định đặt dưới đoạn hiện tại, vẫn giữ fallback caret. Ảnh chèn căn giữa và được giới hạn theo vùng in; Word COM đo 468×291 pt, căn giữa (baseline 1024.5×637.5 pt, căn trái). Hậu xử lý OOXML nối các part đầu/chân trang vào section. Thêm CDP repro cho textbox, ảnh, preview và round-trip cùng unit test OOXML.
FILES CHANGED: adapters/libreoffice/writer/writer-adapter.js; adapters/libreoffice/common/ooxml_zip_patch.py; tests/live/cdp/q13-writer-textbox.desktop.mjs; tests/live/cdp/q13-writer-image.desktop.mjs; tests/live/cdp/q13-writer-preview.desktop.mjs; tests/live/cdp/q13-writer-roundtrip.desktop.mjs; tests/test_writer_basic_ops_ooxml.py; 09-templates/AGENT-HANDOFF.md.
COMMITS: b1db2bbd (textbox placement); 2fa59b9d (image size/alignment); fc076ace (new DOCX header/footer references); 42f96b17 (two-page preview repro); 5cec0f39 (mock caret fallback).
COMMANDS RUN: CDP textbox baseline/final; CDP image chooser baseline/final; hidden Word COM image readback; CDP two-page print preview baseline/final; save_document_in_place DOCX and reopen via launchApp; scripts/audit-0610/word_author_report_readback.ps1; hidden Word COM shape/header/footer/columns/equation/pages; targeted pytest; npm test; node scripts/audit-0610/i18n_parity.mjs; python scripts/audit-0610/verify_checklist_evidence.py --all --no-fix; python -m pytest tests -q -k "writer or docx or ooxml".
BUILD RESULT: NOT RUN — phiếu không thay đổi build system.
TEST RESULTS: PASS — CDP textbox 3/3; CDP ảnh 2/2; CDP preview 2 trang, 30,116 ms (30.1 s); round-trip app 5/5; Word COM pages=2, shapes=1, columns=2, equations=1, đầu/chân trang đúng; ảnh inlineShapes=1, 468×291 pt, căn giữa; npm test 3770/3770; parity VI=3108/EN=3108, thiếu 0; checklist hạ 0; pytest 341 passed, 758 deselected (401.79s); unit header/footer ref trước FAIL, sau PASS.
KNOWN FAILURES: Không còn lỗi trong bốn mục Q13. Khi app mở lại DOCX, text hộp hiện trong body nhưng `adapter.shapes` chưa tái tạo model shape; Word COM xác nhận shape native vẫn tồn tại trong DOCX.
RISKS: Bộ xem trước hai trang đo được 30,116 ms (30.1 s) trong phiên CDP này; thời gian có thể thay đổi theo máy và tài liệu. Không sửa LibreOffice Core, không thêm dependency.
DEPENDENCIES/BLOCKERS: None.
CORE PATCH ID (if any): None.
NEXT ACTION: Review các commit trên branch; giữ log Q13.DONE tại E:\VNOffice-briefs\logs.

---
# Agent Handoff
TASK: Q14 — Slides xác minh lỗi Q12, lưu/mở PPTX và xuất PDF
AGENT/ROLE: Codex / VN Slides QA
BRANCH: codex/queue-19-10
WORKTREE: E:\VNOffice-codex-queue
OBJECTIVE: Tái kiểm tra hai FAIL Q12 bằng CDP và giá trị ô thực tế; tạo PPTX 5 trang có bảng, biểu đồ, ảnh, ghi chú, chuyển trang và hoạt hình; mở lại, đọc bằng PowerPoint COM ẩn; tạo PDF thật; cập nhật khám phá và handoff.
FINDINGS: Bài `slides-q14-insert-fields.desktop.mjs` đọc giá trị ngay trước Chèn là 4/3 và `Tiến độ triển khai`, kết quả mô hình đúng 2/2. Hai FAIL Q12 do Ctrl+A không chọn nội dung trong các ô thử nghiệm, không phải lỗi sản phẩm. PPTX mở lại đủ 5 trang; PowerPoint COM xác nhận bảng 4×3, biểu đồ, ảnh, ghi chú trang 4, EntryEffect=2817 và hoạt hình trang 5. PDF API status=ok; `fast_pdf_page_count`=5.
IMPLEMENTATION SUMMARY: Không sửa mã sản phẩm. Thêm `tests/live/cdp/slides-q14-roundtrip.desktop.mjs` để tạo/lưu/mở lại PPTX bằng CDP, chèn ảnh PNG thật bằng `DOM.setFileInputFiles`, rồi chuẩn bị/in PDF qua API với đường dẫn đích. Cập nhật `docs/EXPLORE-SLIDES-2026-10-20.md` theo số liệu Q14.
FILES CHANGED: `tests/live/cdp/slides-q14-roundtrip.desktop.mjs`; `docs/EXPLORE-SLIDES-2026-10-20.md`; `09-templates/AGENT-HANDOFF.md`.
COMMANDS RUN: `git merge main`; CDP `slides-q14-insert-fields.desktop.mjs`; CDP `slides-q14-roundtrip.desktop.mjs`; hidden PowerPoint COM read-only; `ppt_table_readback.ps1`; `ppt_animation_all_readback.ps1`; `npm test`; `node scripts/audit-0610/i18n_parity.mjs`; `python scripts/audit-0610/verify_checklist_evidence.py --all --no-fix`; `python -m pytest tests -q -k "slides or pptx"`.
BUILD RESULT: NOT RUN — không đổi build system.
TEST RESULTS: PASS — field CDP 2/2; round-trip CDP 10/10; PPTX 5 trang; PDF 5 trang; PowerPoint COM read-only xác nhận bảng 4×3, biểu đồ, ảnh, ghi chú, chuyển tiếp và hoạt hình; npm test 3770/3770; i18n VI=3108/EN=3108, missing=0; checklist hạ 0 (Word 279, Excel 217, PowerPoint 269); pytest 152 passed, 947 deselected.
KNOWN FAILURES: Không có lỗi sản phẩm tái hiện. Hộp thoại Lưu thành của hệ điều hành không chạy theo quy tắc Q14; tệp đã được lưu qua adapter API.
RISKS: Kết quả lưu/đọc lại được xác minh trên bộ trình bày Q14 tạo mới; luồng hộp thoại hệ điều hành F12 không nằm trong kiểm thử.
DEPENDENCIES/BLOCKERS: None.
CORE PATCH ID (if any): None.
NEXT ACTION: Commit riêng Q14 và tạo `E:\VNOffice-briefs\logs\Q14.DONE`.
