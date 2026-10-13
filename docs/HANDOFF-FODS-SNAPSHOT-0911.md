# Handoff — Node snapshot FODS 0.9.11 (sample-sheet.fods)

TASK: FODS-SNAPSHOT-0911 — lỗi Node snapshot duy nhất `tests/unit/real-office-import-fidelity.test.js`
AGENT/ROLE: QA / Sheet Adapter audit (worktree `macos-fods-snapshot-0911`)
BRANCH: fix/fods-snapshot-0911
WORKTREE: /Users/hieupc/.codex/worktrees/macos-fods-snapshot-0911/3t-office
OBJECTIVE: Chẩn đoán hash lệch `sample-sheet.fods` (thực tế `6490dc31…` vs baseline `27d6a029…`),
  phân biệt regression 0.9.11 thật vs baseline stale, sửa tối thiểu đúng layer, không đụng
  updater/reveal_path/ooxml_zip_patch ngoài audit read-only.

## FINDINGS
- Reproduce: focused `runRealOfficeImportFidelityTests()` FAIL duy nhất ở snapshot `sample-sheet.fods`
  (`6490dc31… != 27d6a029…`); 3 fixture còn lại EQUAL baseline.
- KHÔNG phải regression 0.9.11: chạy `SheetAdapter.parseFods` ở `8109bb4` (0.9.10, worktree tạm `/tmp/vno-0910`)
  và `5def067`+HEAD (0.9.11) trên cả 4 fixture → hash (normalize loại `excelCodeInferred`) **giống hệt nhau**,
  JSON dài 5266 ký tự bằng nhau từng byte. Lỗi đã tồn tại ở 0.9.10.
- KHÔNG liên quan `excelCodeInferred`: test đã loại cờ này; old adapter (chưa có cờ) vs new (có cờ, đã loại)
  cho kết quả trùng khớp. Các thay đổi 0.9.11 khác (`_attachImportedTables`, hyperlink, split, text-boxes,
  resolved-comments, calculationMode, mapOoxmlFunctionPrefixes) chỉ kích hoạt khi fixture có marker tương ứng;
  đã quét fixture: 0 hit cho database-range/xlink/_xlfn/vno:split/vno:text-boxes/calculation-mode.
- Baseline stale: `docs/HANDOFF-SHEET-S29-PERF-ROUND4.md` ghi lúc baseline còn EQUAL thì `sample-sheet.fods`
  dài 4037 bytes; file hiện tại 3977 bytes (fixture đổi nội dung trước 0.9.10, lịch sử đã squash nên không còn diff).
- Semantics hiện tại ĐÚNG: sheets `Doanh thu|Chi phí`, `B5==SUM(B2:B4)/450`, 2 ô currency ₫
  (`1250000`, `850000`) kèm `excelCode + excelCodeInferred=true` (đúng quy tắc không ghi mã suy ra như mã gốc).

## IMPLEMENTATION SUMMARY
Chỉ sửa test-layer (không đụng parser/runtime):
1. Thêm test ngữ nghĩa `Sheet: sample-sheet.fods fixture giữ semantics…` khóa sheets/giá trị/SUM/2 ô currency ₫ +
   cờ `excelCodeInferred` + vắng mặt tables/split/text-boxes/calculationMode/hyperlink (chống cập nhật hash mù).
2. Cập nhật baseline `sample-sheet.fods` → `6490dc31…` kèm comment ghi rõ bằng chứng stale (fixture 4037→3977 bytes,
   old==new trên cả 4 fixture). 3 baseline còn lại giữ nguyên.

## FILES CHANGED
- `tests/unit/real-office-import-fidelity.test.js` (thêm 1 test ngữ nghĩa + 1 hash baseline + comment)
- `docs/PLAN-FODS-SNAPSHOT-0911.md` (plan trước code, theo AGENTS.md §6)
- `docs/HANDOFF-FODS-SNAPSHOT-0911.md` (file này)

## COMMANDS RUN
- Focused 3 lần: `node --input-type=module -e "import('./tests/unit/real-office-import-fidelity.test.js')…"` → 11/11 ALL-PASS cả 3 lần.
- `node --check tests/unit/real-office-import-fidelity.test.js` → SYNTAX-OK; `git diff --check` → OK.
- `npm test` (full): trước fix 3151/3167 (16 FAIL, gồm 1 snapshot); sau fix **3153/3168 PASS | 15 FAIL**.
- Audit read-only (không sửa): `git diff 8109bb4..5def067 -- adapters/libreoffice/sheet/sheet-adapter.js`,
  `adapters/updater/*`, `platform/os_services/*`, `ooxml_zip_patch.py` (chỉ đọc).

## BUILD RESULT
NOT RUN (thay đổi chỉ ở test Node + docs, không yêu cầu build theo ticket).

## TEST RESULTS
- PASS — focused fidelity suite 11/11, chạy 3 lần liên tiếp.
- Full `npm test`: 3153/3168 PASS. 15 FAIL còn lại đều cần `soffice`/Python bridge
  (FODS→XLSX convert, Python twin overlay, GUID/patcher, textRotation XML, CH-9.4/9.5 tracker/perf probe),
  không có trong suite fidelity, là giới hạn môi trường Mac (không có LibreOffice), tồn tại trước fix.

## KNOWN FAILURES
15 FAIL môi trường như trên (chi tiết trong log `npm test`; ví dụ `soffice --convert-to … failed`,
`Python overlay failed`, `python uuid failed`). Không liên quan snapshot đã sửa.

## RISKS
- Baseline JSON gốc đã mất (lịch sử squash) nên không diff từng byte baseline-vs-actual được;
  đã thay bằng chứng minh old==new + đối chiếu kích thước fixture từ docs ROUND4 + dump ngữ nghĩa.
  Reviewer nên kiểm lại assertions ngữ nghĩa trước khi merge.
- Snapshot hash vẫn giòn (bao gồm `styleHashAtImport`, chuỗi XML `odf`); assertions ngữ nghĩa mới là lưới an toàn chính.

## DEPENDENCIES/BLOCKERS
None. Không cần Windows/COM; `scripts/layout-audit/batch_document_audit.py` không áp dụng (cần Excel thật).

## CORE PATCH ID (if any)
None (không sửa Core/upstream; không sửa SheetAdapter).

## NEXT ACTION
Review diff test + plan này, chạy lại focused suite 1 lần trên máy reviewer, rồi merge `fix/fods-snapshot-0911`.
Không push/merge từ agent (đã commit cục bộ, không push).
