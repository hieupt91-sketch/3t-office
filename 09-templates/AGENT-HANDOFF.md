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
