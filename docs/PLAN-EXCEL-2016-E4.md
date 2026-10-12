# Kế hoạch E4: hộp thoại và tính năng Sheet qua XLSX

**Ngày:** 12/10/2026  
**Nhánh/worktree:** `fix/excel-e4-codex` / `E:\VNOffice-codex-fe4`  
**Chuẩn:** Microsoft Excel 2016 cài trên máy; Excel COM chỉ mở từng tệp chỉ đọc sau khi VN Sheet lưu.

## Objective

Xác minh bằng thao tác desktop CDP thật từng luồng trong E4: Định dạng ô, Dán đặc biệt, Tìm/Thay, Sắp xếp nhiều cấp, Lọc, Xác thực dữ liệu, Định dạng có điều kiện/quản lý quy tắc, Tên, Đóng băng/Chia, Thiết lập trang/In, Biểu đồ, Bảng, PivotTable, Sparkline. Với mỗi luồng: thao tác UI → lưu XLSX → mở lại trong VN Sheet và Excel 2016 → so thuộc tính/giá trị liên quan. Sửa các sai lệch tái hiện được, bổ sung ma trận tài liệu và hướng dẫn tiếng Việt khớp UI.

## Current capability

Ribbon, command handlers, model state, dialogs, serializers and unit/live test files already exist for most listed features. Existing relevant files include `apps/sheet/sheet-grid.js`, `apps/sheet/sheet-ribbon.js`, `apps/sheet/format-cells-dialog.js`, `adapters/libreoffice/sheet/*`, `tests/unit/sheet-*.test.js`, and `tests/live/cdp/*sheet*.mjs`. Reuse these paths; do not redesign the UI or add a dependency.

## Files/modules and sequence

1. Capture baseline behavior and existing 0.9.9 formula/cache rate for all 28 LAN workbooks.
2. Add `docs/EXCEL2016-FEATURES-MATRIX.md` describing each feature, actual ribbon path, UI actions, reopened XLSX assertions and Excel COM assertions.
3. Exercise existing dialogs/actions in the desktop app. Group commits by related feature workflow: (A) formatting and paste/find, (B) sort/filter/validation/conditional rules/names, (C) freeze/split and page setup/printing, (D) charts/tables/pivot/sparkline. For any reproducible persistence defect, patch the narrowest Sheet or adapter serializer and add a regression test; commit the group immediately.
4. Verify Help panel entries for each affected capability; add Vietnamese steps and VI/EN strings when behavior or entry points are changed.
5. Reopen saved workbooks in VN Sheet and Excel 2016 COM read-only; record evidence and limits in the matrix.
6. Write the required agent handoff.

## Dependency and layer boundary

No external dependencies, framework/build changes, shared-platform changes, or LibreOffice core patches are planned. UI stays in `apps/sheet/**`; XLSX behavior stays in existing Sheet adapter/export code. UI never calls LibreOffice internals.

## Risk and containment

XLSX metadata overlay fixes can alter save output. Any new overlay must be limited to the affected feature metadata, preserve untouched-workbook behavior, include a regression assertion, and be protected by `VNO_SHEET_E4_XLSX_METADATA_OVERLAY=1` (enabled by default only after the regression is verified). The conditional-formatting fix captures the selected range when its existing dialog opens and passes that range to the existing FODS/XLSX serializer; it does not add a metadata overlay or a new save path. Rollback for this UI correction is the feature-group commit. Do not alter workbook semantics without owner approval.

## Test plan

Per group: run its existing unit/live CDP checks, create/save/reopen a workbook through real UI input, read back with one Excel 2016 COM instance in read-only mode and close only the PID started by this audit. Before completion run `npm test`, `python -m unittest discover -s tests`, batch XLSX audit for lan01/02/04/06/09/11/22/26, and `scripts/audit-0610/sheet_formulas_vs_cache.mjs` for all 28 files; compare each formula rate against 0.9.9. Scan UTF-8 (no BOM/mojibake). Never edit tests, fixtures or expected outputs to improve results.

## Rollback

Each feature group is committed separately on this worktree branch. Revert only the relevant group commit if it regresses unrelated XLSX files; for metadata overlay behavior, first disable `VNO_SHEET_E4_XLSX_METADATA_OVERLAY`. Do not reset, rebase destructively or touch another worktree.
