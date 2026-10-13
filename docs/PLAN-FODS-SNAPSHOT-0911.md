# Plan — Sửa lỗi Node snapshot FODS 0.9.11 (sample-sheet.fods)

Ngày: 13/10/2026 · Worktree: `macos-fods-snapshot-0911` (detached HEAD 7021db5) · Phạm vi: `tests/unit/real-office-import-fidelity.test.js` (test-layer only)

## 1. Objective
Khôi phục `npm test` về xanh mà KHÔNG che giấu regression: chứng minh hash lệch `sample-sheet.fods`
(`6490dc31…` thực tế vs `27d6a029…` baseline) là baseline stale, không phải regression 0.9.11,
rồi mới cập nhật baseline kèm assertions ngữ nghĩa khóa semantics.

## 2. Current capability / triệu chứng
- Focused reproduce: `runRealOfficeImportFidelityTests()` → 1 FAIL duy nhất:
  `sample-sheet.fods: workbook hash 6490dc31f4627743669263da9e197bf0ff13c6ced1943e2aa61ffb9d93dfef9f != baseline 27d6a029634b9d23b3018034ec3ac3e31f2695dc336f60a081eac86a2de15129`.
- 3 fixture còn lại (validation/pivot/formulas) vẫn EQUAL baseline.

## 3. Chẩn đoán đã thực hiện (bằng chứng)
- So sánh `8109bb4` (0.9.10) vs `5def067` (0.9.11) + worktree hiện tại bằng worktree tạm `/tmp/vno-0910`:
  - Hash (normalize loại `excelCodeInferred`) của **cả 4 fixture giống hệt nhau** giữa 0.9.10 và 0.9.11.
  - `sample-sheet.fods` cho `6490dc31…` ở **cả hai phiên bản** → lỗi đã tồn tại ở 0.9.10, không phải do 0.9.11.
- Loại trừ `excelCodeInferred`: test đã loại cờ này khỏi snapshot (dòng 246–249);
  old adapter (không có cờ) và new adapter (có cờ, đã loại) cho JSON dài 5266 ký tự **giống nhau từng byte**.
- Loại trừ các thay đổi 0.9.11 khác trong `SheetAdapter.parseFods`:
  `_attachImportedTables` (chỉ khi có `database-range`), hyperlink (chỉ khi có `text:a/xlink:href`),
  split/text-boxes/resolved-comments/calculationMode (chỉ khi có attr `vno:*`) — fixture này **không chứa**
  bất kỳ marker nào (đã quét: 0 hit cho database-range/xlink/_xlfn/vno:split/vno:text-boxes/calculation-mode).
- Fixture `sample-sheet.fods` trên đĩa: 3977 bytes; docs `HANDOFF-SHEET-S29-PERF-ROUND4.md` (lúc baseline còn EQUAL)
  ghi 4037 bytes. Fixture đã đổi nội dung **trước 0.9.10** (lịch sử đã squash nên không còn diff),
  trong khi baseline giữ nguyên → baseline stale. Không có thay đổi semantic nào trong parser gây ra lệch.
- Semantics hiện tại ĐÚNG (dump trực tiếp):
  - sheets `Doanh thu|Chi phí`; `Doanh thu.B2=120, B4=180, B5==SUM(B2:B4)/450`;
  - `Chi phí.B2=1250000 ₫ currency, B3=850000 ₫ currency, A3="Đi lại"`;
  - currency có `excelCode="₫ #,##0;#,##0;0;@" + excelCodeInferred=true` (đúng quy tắc ooxml_zip_patch: mã suy ra không ghi lại như mã gốc);
  - không có `tablesBySheet/splitPanesBySheet/textBoxesBySheet/calculationMode/hyperlink` — đúng vì fixture không có các thực thể đó.

## 4. Files / modules
- SỬA: `tests/unit/real-office-import-fidelity.test.js` — (a) thêm assertions ngữ nghĩa cho **fixture file thật**
  `tests/fixtures/real-office-samples/src/sample-sheet.fods` (sheets/giá trị/SUM/currency/`excelCodeInferred`/vắng mặt tables-hyperlink-split);
  (b) cập nhật baseline `sample-sheet.fods` → `6490dc31…` CHỈ SAU khi (a) đã khóa semantics.
- KHÔNG SỬA: `adapters/**` (không regression nên không đụng SheetAdapter — đúng layer boundary),
  `adapters/updater/*`, `platform/os_services/*`, `ooxml_zip_patch.py`, `reveal_path` (chỉ audit read-only qua `git diff`, đã xong).
- THÊM: plan này + handoff (`docs/HANDOFF-FODS-SNAPSHOT-0911.md`).

## 5. Dependency / ownership
- Vùng `tests/**`: relevant owner + QA — agent hiện tại là QA được phép sửa test.
- Không tạo dependency chéo Writer/Sheet/Slides; không cần Core patch (`VN-CORE-PATCH`: None).

## 6. Risk
- Rủi ro chính: cập nhật hash mà không khóa semantics → regression tương lai lọt. Giảm thiểu bằng assertions ngữ nghĩa mới
  (sheets, 16 ô giá trị, SUM, 2 ô currency ₫ + cờ inferred, absence của tables/hyperlink).
- Rủi ro phụ: baseline JSON gốc đã mất (không còn trong lịch sử squash) nên không thể diff từng byte baseline-vs-actual;
  thay bằng (i) chứng minh old==new trên cả 4 fixture, (ii) đối chiếu kích thước fixture 4037→3977 bytes từ docs ROUND4,
  (iii) dump ngữ nghĩa đầy đủ. Ghi rõ trong handoff để reviewer kiểm lại.
- Không ảnh hưởng runtime/production (chỉ test).

## 7. Test plan
- Focused: `node --input-type=module -e "import(...real-office-import-fidelity...)"` ≥ 3 lần, yêu cầu 10/10 PASS mỗi lần.
- `node scripts/check-syntax.js` (nếu có) hoặc `node --check` trên file sửa.
- `npm test` toàn bộ nếu đủ thời gian (mục tiêu 3167/3167; ghi trung thực PASS/FAIL/NOT RUN).
- `git diff --check` + `git status` trước commit.

## 8. Rollback
- Revert 1 commit trên nhánh `fix/fods-snapshot-0911` (chỉ chạm test + docs) → baseline cũ + không assertions mới.
  Không đụng parser nên không cần rollback runtime.
