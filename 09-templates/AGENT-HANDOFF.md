# Agent Handoff
TASK: MAC-3 — bộ lọc mẫu bảng tính và UTI macOS
AGENT/ROLE: Codex / macOS file registration
BRANCH: mac/filetypes-1910
WORKTREE: /Users/hieupc/.codex/worktrees/mac-filetypes-1910/3t-office
OBJECTIVE: Đăng ký .xltx/.xlt cho Sheet trên macOS và kiểm đường lưu/mở lại mẫu mà không đổi semantics.
FINDINGS: vn-main đã có toàn bộ hằng và đường lưu XLTX dùng chung; thiếu Info.plist macOS. Runtime thiếu pywebview/cryptography nên mở lại trong app bị BLOCKED, nhưng LibreOffice macOS mở lại tệp app vừa lưu thành công.
IMPLEMENTATION SUMMARY: Thêm Sheet-Info.plist với imported UTI, Editor/Alternate, cùng test plist/hợp đồng/content type; không sửa mã dùng chung hay thêm dependency.
FILES CHANGED: ports/macos/Sheet-Info.plist; tests/macos/test_sheet_file_types.py; docs/macos/PLAN-MAC-3-FILE-TYPES-2010.md; docs/macos/HANDOFF-MAC-3-FILE-TYPES-2010.md; 09-templates/AGENT-HANDOFF.md.
COMMANDS RUN: Python 3.12 unittest; plutil; API save XLTX; LibreOffice reopen; i18n parity; npm test; git diff --check.
BUILD RESULT: NOT RUN — chưa có pipeline bundle macOS trên vn-main.
TEST RESULTS: PASS focused Python 3/3, plist, native save + LibreOffice reopen, i18n 3091/3091; full Node FAIL 3729/3749 (20 baseline failures).
KNOWN FAILURES: App-native reopen BLOCKED do thiếu cryptography; pywebview parser BLOCKED do thiếu pywebview; Node focused wrapper phụ thuộc lệnh python/webview.
RISKS: Pipeline MAC-11 phải thực sự nhúng plist; overlay Sheet hiện chỉ nhận hậu tố .xlsx nên cần phiếu shared trên vn-main nếu muốn parity metadata hoàn toàn khi nhập .xltx.
DEPENDENCIES/BLOCKERS: MAC-11, MAC-12 và shared-owner.
CORE PATCH ID (if any): None.
NEXT ACTION: Review rồi merge; chạy lại hộp thoại native trên bundle đầy đủ dependency.

---

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
# Agent Handoff
TASK: M7-XCODE-BUILD-2010 — Build launcher macOS từ `vn-main`
AGENT/ROLE: Codex / macOS Packaging
BRANCH: mac/xcode-build-2010
WORKTREE: /Users/hieupc/.codex/worktrees/mac-xcode-build-2010/3t-office
OBJECTIVE: Khôi phục project Xcode launcher trên nền `vn-main` và tạo ba bundle phát triển universal cho Doc, Sheet, Slide.
FINDINGS: `vn-main` chưa chứa project Xcode; commit 0.9.11 có project tái sử dụng được. Script cũ nhận output tương đối nhưng Xcode diễn giải nó từ thư mục project, làm build Swift thành công rồi thất bại ở bước `ditto`.
IMPLEMENTATION SUMMARY: Tái sử dụng project/Swift/plist/script từ commit `7ed054e8`; chuẩn hóa output tương đối thành tuyệt đối trước khi truyền cho Xcode; thêm plan và handoff 20/10.
FILES CHANGED: ports/macos/VNOfficeLauncher.xcodeproj/project.pbxproj; ports/macos/launcher/*; ports/macos/scripts/*; docs/macos/PLAN-M7-XCODE-BUILD-2010.md; docs/macos/HANDOFF-M7-XCODE-BUILD-2010.md; 09-templates/AGENT-HANDOFF.md.
COMMANDS RUN: xcodebuild -list; ports/macos/scripts/build-development.sh build/macos-xcode-2010; validate-development-bundles.py; lipo -info; PlistBuddy; launcher print-command probes; git diff --check.
BUILD RESULT: PASS — Xcode 26.3 Release build Doc/Sheet/Slide, universal x86_64 + arm64, unsigned.
TEST RESULTS: PASS — validator 3/3; architecture 3/3; bundle ID/app kind 3/3; print-command probe 3/3; diff check sạch.
KNOWN FAILURES: Lượt build đầu tạo được Doc universal nhưng bước sao chép FAIL do output tương đối; đã sửa và lượt build đầy đủ sau đó PASS. App UI thực tế NOT RUN.
RISKS: Bundle chưa gồm runtime offline và chưa ký/notarize, vì vậy chưa phải bộ cài cho người dùng. Info.plist từ mốc cũ cần nhận các UTI mới từ MAC-3 trước khi gộp phát hành.
DEPENDENCIES/BLOCKERS: Runtime Python/cryptography/pywebview hoặc Qt/LibreOffice chưa nhúng; giấy phép Qt, Apple Developer, ký/notarize cần người phụ trách quyết định.
CORE PATCH ID (if any): None.
NEXT ACTION: Tích hợp MAC-3 UTI và MAC-12 runtime packaging, rồi mở ba app native và chạy CDP trước khi tạo DMG.

---

# Agent Handoff
TASK: MAC-3-XCODE-FILE-TYPES-2010 — Hợp nhất UTI MAC-3 vào ba bundle Xcode
AGENT/ROLE: Codex / macOS Packaging
BRANCH: mac/xcode-filetypes-opencode
WORKTREE: /Users/hieupc/.codex/worktrees/opencode-xcode-filetypes/3t-office
OBJECTIVE: Đưa kết quả MAC-3 (commit 4f8f64b8) vào đúng ba bundle Xcode Doc/Sheet/Slide, đặc biệt UTI .xltx/.xlt cho Sheet, không cherry-pick mù và không đổi file-format semantics.
FINDINGS: MAC-3 đặt plist ở ports/macos/Sheet-Info.plist nhưng build-development.sh truyền INFOPLIST_FILE=launcher/<Doc|Sheet|Slide>-Info.plist cho Xcode, nên UTI của MAC-3 chưa từng tới Launch Services và tồn tại hai nguồn sự thật. Đo lsregister -dump trên máy: UTI ODF đúng là org.oasis-open.opendocument.* (có "open"), MIME application/vnd.ms-excel cho .xlt của MAC-3 khớp CoreTypes, và macOS tự ánh xạ .xltx -> org.openxmlformats.spreadsheetml.template, .xlt -> com.microsoft.excel.xlt (khớp MAC-3).
IMPLEMENTATION SUMMARY: Merge commit 208571be để nhánh này chứa nội dung MAC-3; hợp nhất UTI vào ports/macos/launcher/Sheet-Info.plist (giữ nguyên mapping .xltx/.xlt của MAC-3, thêm .xltx/.xlt vào CFBundleTypeExtensions) và đưa Doc/Slide về cùng mô hình đăng ký cho đúng các định dạng ứng dụng đã hỗ trợ; xoá ports/macos/Sheet-Info.plist để chỉ còn một nguồn sự thật; validator kiểm thêm UTImportedTypeDeclarations/LSItemContentTypes/role/rank; bài test MAC-3 mở rộng ba bundle và chốt "chỉ khai loại tệp mà main.py mở được". Không sửa main.py, không đổi định dạng, không thêm dependency, không ký.
FILES CHANGED: ports/macos/launcher/Doc-Info.plist; ports/macos/launcher/Sheet-Info.plist; ports/macos/launcher/Slide-Info.plist; ports/macos/Sheet-Info.plist (xoá, hợp nhất); ports/macos/scripts/validate-development-bundles.py; tests/macos/test_sheet_file_types.py; docs/macos/PLAN-MAC-3-XCODE-FILE-TYPES-2010.md; docs/macos/HANDOFF-MAC-3-XCODE-FILE-TYPES-2010.md; 09-templates/AGENT-HANDOFF.md.
COMMANDS RUN: plutil -lint x3; python3.12 -m unittest tests.macos.test_sheet_file_types; kiểm âm tính (tiêm .dotx); ports/macos/scripts/build-development.sh build/macos-xcode-filetypes với DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer; validate-development-bundles.py; lipo -info x3; lsregister -dump (trước/sau build); mdls -name kMDItemContentType; payload Python của bài Node sheet-template-save với python3.12 + stub webview; LibreOffice headless mở lại .xltx; node scripts/audit-0610/i18n_parity.mjs; npm test trên nhánh và trên checkout sạch fa0ec31b (worktree tạm, đã gỡ); git diff --check.
BUILD RESULT: PASS — Xcode 26.3 Release build 3/3 (BUILD SUCCEEDED), universal x86_64 + arm64, unsigned; validator PASS 3/3 kèm phần UTI.
TEST RESULTS: PASS — plutil 3/3; unittest 7/7; validator 3/3; lipo 3/3; lsregister xác nhận cả ba bundle đã đăng ký và Sheet.app nhận org.openxmlformats.spreadsheetml.template + com.microsoft.excel.xlt với mô tả tiếng Việt; payload sheet-template-save cho template=true/plain=false/infer=xltx/saveTypes=1/openTypes=true, tạo .xltx 9.622 byte; LibreOffice mở lại .xltx ra FODS 71.612 byte; i18n VI=EN=3091 thiếu 0; npm test 3730/3749 với 19 FAIL IDENTICAL với baseline fa0ec31b (diff danh sách FAIL rỗng); git diff --check sạch.
KNOWN FAILURES: npm test 19 FAIL là baseline môi trường (thiếu python trên PATH, thiếu pywebview/LibreOffice/Windows COM), không do phiếu này. python -m pytest tests -q BLOCKED vì máy không có pytest cho Python nào (3.9 và 3.12); bài tập trung chạy bằng unittest. Chạy giao diện ba app BLOCKED vì bundle chưa nhúng runtime Python + cryptography + pywebview/Qt + LibreOffice (MAC-11/MAC-12).
RISKS: UTImportedTypeDeclarations chỉ khai "dùng" UTI của hãng khác, không chiếm quyền sở hữu; máy này đã có nhiều app khai cùng UTI mà không lỗi. CFBundleTypeExtensions giữ trong cùng dict làm đường dự phòng. Chưa khai .dotx/.potx vì mã dùng chung chưa mở (cần phiếu shared-owner trên vn-main). Build Xcode tự RegisterWithLaunchServices nên ba bundle phát triển đã đăng ký trên máy (gỡ bằng lsregister -u <đường dẫn .app>).
DEPENDENCIES/BLOCKERS: Runtime packaging (MAC-12) và ký/notarize (MAC-11) còn chặn; pytest chưa cài trên máy.
CORE PATCH ID (if any): None.
NEXT ACTION: Người phụ trách gộp mac/xcode-filetypes-opencode thay cho mac/filetypes-1910 (nếu gộp cả nhánh kia thì ở xung đột add/delete của ports/macos/Sheet-Info.plist chọn giữ bản xoá); quyết định có mở rộng FILE_APP_KINDS cho .dotx/.potx trên vn-main hay không; sau MAC-12 thì mở Sheet.app native, lưu .xltx, đóng, mở lại để kiểm vòng tròn.

---

# Agent Handoff
TASK: MAC-12 / Xcode Product Run development runtime
AGENT/ROLE: agy / macOS runtime
BRANCH: mac/xcode-run-dev-2010
WORKTREE: /Users/hieupc/.codex/worktrees/mac-xcode-run-dev-2010/3t-office
OBJECTIVE: Make Xcode Product > Run stage a usable development-only runtime and app payload without machine-specific paths, Qt selection/license changes, signing, or changes to production offline packaging.
FINDINGS: Launcher previously expected Runtime beside the app but Xcode built only the Swift shell; Debug app code defaulted to Application Support/current, and no shared Xcode scheme existed. Existing x86_64 pilot contains Python 3.12, pywebview, PySide6 and LibreOffice, but no cryptography. Root requirements already declare cryptography>=44.0.0,<51.0.0. Version 50.0.2 fails on this runtime with unresolved _BIO_ADDR_free; 44.0.2 passes the encryption runtime check.
IMPLEMENTATION SUMMARY: Committed a plan gate before code. Added a shared Debug scheme and Debug-only build phase that creates relative symlinks to the pilot Runtime/LibreOffice and active checkout app source, then installs existing cryptography into a build-only overlay and validates OOXML AES-256 round-trip. Xcode arm64 Debug can use an x86_64 runtime via Rosetta; a generated architecture marker selects its overlay. Release routing remains Application Support/current. No new product dependency, Qt/ license decision, signing, notarization, or production payload mutation.
FILES CHANGED: docs/macos/PLAN-XCODE-RUN-DEV-2010.md; ports/macos/VNOfficeLauncher.xcodeproj/project.pbxproj; ports/macos/VNOfficeLauncher.xcodeproj/xcshareddata/xcschemes/VNOfficeLauncher.xcscheme; ports/macos/launcher/AppDelegate.swift; ports/macos/requirements-xcode-run-constraints.txt; ports/macos/scripts/prepare-xcode-run-payload.sh; ports/macos/scripts/validate-encryption-runtime.py; ports/macos/scripts/validate-xcode-run-payload.py; tests/macos/test_xcode_run_payload.py; 09-templates/AGENT-HANDOFF.md.
COMMANDS RUN: /tmp/vno-mac12-verify/bin/python -m pytest tests/macos/test_xcode_run_payload.py -q; /tmp/vno-mac12-verify/bin/python -m pytest tests/test_ooxml_encryption.py tests/test_ooxml_encryption_main.py -q; xcodebuild Debug x86_64 and arm64 (arm64 launcher with x86_64 pilot); xcodebuild Release x86_64; staged-runtime encryption/layout validators; launcher print-command probe; bash -n; py_compile; xmllint; plutil -lint; git diff --check.
BUILD RESULT: PASS — Xcode Debug x86_64 and arm64 builds succeeded; arm64 build detected and staged x86_64 runtime via Rosetta. Release x86_64 build passed before architecture-marker refinement; Release behavior unchanged.
TEST RESULTS: PASS — focused Xcode payload pytest 3/3; OOXML encryption pytest 6 passed plus 3 subtests; exact pilot runtime cryptography 44.0.2/OpenSSL 3.4.1 Agile AES-256 encrypt/decrypt round-trip; staged bundle validator; launcher dry-run resolves Runtime/bin/python3 and Versions/development/app/main.py; syntax/plist/scheme/diff checks.
KNOWN FAILURES: Native editor/UI launch NOT RUN because it would use the real ~/Library/Application Support/VNOffice and this checkout has no safe isolated data-root override. COM verification BLOCKED (macOS task; no COM oracle available). `arch -arm64` cannot execute an x86_64 binary directly; the build phase explicitly invokes the runtime with `arch -x86_64` for Rosetta.
RISKS: First Debug staging may require network access to pip-install the already-declared cryptography wheel; the actual Xcode Run after overlay creation is offline. Build output is a development symlink layout, not a distributable package. Pilot is external/local and must exist at the conventional build path or be supplied via VNO_XCODE_PILOT_ROOT. No artifact or secret is committed.
DEPENDENCIES/BLOCKERS: Full application UI smoke needs a safe app data-root override or disposable macOS user profile. No production packaging/sign/notarize changes included.
CORE PATCH ID (if any): None.
NEXT ACTION: Review and merge this branch; run native Product > Run from Xcode with isolated user data. Ensure production packaging independently materializes its runtime and remains offline.

---

