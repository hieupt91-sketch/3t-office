# Agent Handoff
TASK: MB-OOXML-1 — Thư viện OOXML ngoại tuyến cho iOS/iPadOS (ZIP core → XLSX → DOCX → PPTX)
AGENT/ROLE: Claude / Mobile (iOS) engine
BRANCH: claude/ooxml-offline-ios-library-fqqyj0
WORKTREE: phiên cloud (Linux), /home/user/3t-office
OBJECTIVE: Thư viện Swift thuần đọc/sửa/ghi DOCX/XLSX/PPTX ngoại tuyến, giữ ảnh/quan hệ/style/tính năng chưa sửa, round-trip không mất dữ liệu; mỗi phần có fixture, test mở–sửa–lưu–đóng–mở lại và báo cáo PASS/FAIL trước khi tích hợp UI.
FINDINGS: Không có engine dùng được trên iOS trong repo (LibreOffice + lớp vá Python chỉ chạy desktop). Đã viết mới toàn bộ trong ports/ios/OOXMLKit (không phụ thuộc ngoài, kể cả zlib). Fixture repo tests/fixtures/real-office-samples/sample-slides-smartart.pptx có quan hệ hỏng (rId3 → slideLayout2.xml không tồn tại) — lỗi có sẵn, thư viện giữ nguyên, cần chủ Slides sửa script đóng gói.
IMPLEMENTATION SUMMARY: OOXMLZip (DEFLATE nén/giải nén, CRC-32, ZIP64, data descriptor, chép nguyên byte mục không sửa, chống ZIP bomb/traversal); OOXMLPackage (XML không mất dữ liệu, chặn DTD, OPC content types/quan hệ/tên phần mã hóa %, nhân bản/dọn phần, kiểm tra hợp lệ trước khi ghi đè); OOXMLSpreadsheet (ô, chuỗi chia sẻ, style, công thức chia sẻ/mảng, calcChain, gộp ô, cột/hàng, thêm/đổi tên sheet cập nhật công thức/tên/biểu đồ/pivot); OOXMLWord (đoạn/run/bảng, thay chữ xuyên run mọi story, định dạng, chèn ảnh); OOXMLPresentation (hình/bảng/ghi chú, thay chữ, nhân bản/xóa/đổi thứ tự slide, phân đoạn).
FILES CHANGED: ports/ios/OOXMLKit/** (mới); .github/workflows/ios-ooxmlkit.yml (mới, CI macOS/iOS/iPadOS); docs/ios/BAO-CAO-OOXMLKIT-2310.md, docs/ios/KE-HOACH-OOXMLKIT-PHASES.md (mới); docs/SPEC-MOBILE.md (§10); 09-templates/AGENT-HANDOFF.md.
COMMANDS RUN: swift test (debug) và swift test -c release -Xswiftc -enable-testing (Swift 6.0.3 Linux); scripts/run-tests.sh (test + scripts/verify_artifacts.py với zipfile/zlib, expat, openpyxl, python-docx, python-pptx); scripts/fixtures/make_all.sh (tái tạo fixture, kiểm tất định); benchmark release sheet 300.000 ô.
BUILD RESULT: PASS trên Linux (debug + release) và trên CI macOS (Xcode 16.4): build thiết bị iOS/iPadOS arm64 PASS.
TEST RESULTS: PASS — 102/102 Linux (debug + release); CI macOS/iPhone/iPad: xem docs/ios/BAO-CAO-OOXMLKIT-2310.md §8.2; kiểm chéo độc lập 76/76 tệp. Theo phần: ZIP 20, XML+OPC+offline 21, XLSX 32, DOCX 14, PPTX 15. NOT RUN: iPhone/iPad thật; mở tệp kết quả bằng Microsoft Office thật.
KNOWN FAILURES: Không có test fail. Giới hạn chức năng ghi trong README "Chưa làm" (không tính công thức; chèn/xóa cột cắt ngang bảng bị từ chối; ngắt trang khi chèn hàng; thay chữ/định dạng DOCX chưa ghi theo dõi thay đổi).
RISKS: Chưa có tệp do Microsoft Office tạo trong bộ test (tổng hợp viết tay + LibreOffice); hiệu năng/bộ nhớ trên iPhone chưa đo (mô hình DOM); chưa có Hướng dẫn sử dụng vì chưa có UI (bắt buộc ở bước tích hợp, AGENTS.md §10).
DEPENDENCIES/BLOCKERS: Cần iPhone/iPad thật để đo bộ nhớ/tốc độ; cần bộ tệp Office thật không chứa dữ liệu cá nhân. CI .github/workflows/ios-ooxmlkit.yml tốn phút macOS (≈3,5 phút/lần).
CORE PATCH ID (if any): None.
NEXT ACTION: Người phụ trách duyệt docs/ios/BAO-CAO-OOXMLKIT-2310.md; team iOS chạy test trên Xcode/thiết bị; sau khi duyệt mới làm cầu nối WKWebView + UI + Hướng dẫn sử dụng.

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
