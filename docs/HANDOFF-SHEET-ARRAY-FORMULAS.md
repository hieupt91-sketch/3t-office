# Handoff — Sheet Array Formulas & Cross-Sheet References

## Phạm vi

- Branch/worktree: `feature/sheet-array-formulas` / `E:\VNOffice-codex-array-formulas`.
- Không sửa Writer, Slides, build system, dependency hay LibreOffice Core.
- FormulaEngine hỗ trợ tham chiếu ô/vùng chéo sheet, tên sheet có khoảng trắng trong dấu nháy đơn, Named Range workbook giữ sheet đích, và `#REF!` khi sheet nguồn bị xóa.
- Command `sheet.formula.arrayEnter` (`Ctrl+Shift+Enter`) điền phép toán mảng cơ bản vào vùng chọn, recalc theo nguồn, xóa cả vùng khi xóa một thành viên, Undo/Redo nguyên tử.

## Kiểm thử

- Baseline trước sửa: `node tests/run-tests.js` — PASS 395/395.
- Suite mới: `36. Behavioral Tests — VN Sheet Cross-Sheet & Array Formulas`.
- Full suite sau sửa: `node tests/run-tests.js` — PASS 403/403 (36 suites).
- Live browser thật: Microsoft Edge/Chromium tải `http://127.0.0.1:8765` từ `python -m http.server`; click chuyển Sheet, click/Shift+click chọn `C1:C5`, nhập formula bar, nhấn `Ctrl+Shift+Enter`, kiểm tra UI `2,6,12,20,30`, rồi `Ctrl+Z` khôi phục cả vùng. Tiếp tục click sang `Kế hoạch Q3`, nhập `A1:A5`, click về sheet đích và nhập `=SUM('Kế hoạch Q3'!A1:A5)`; UI hiển thị `15 ₫`. Không có `pageerror`.

## Giới hạn

- Chưa có dynamic array/spill, mảng 2D phức tạp, IF/comparison element-wise hay hằng mảng.
- Chưa round-trip metadata array formula qua luồng file trung gian CSV.
- Chèn hàng/cột chưa tự dịch tọa độ của công thức cross-sheet.
