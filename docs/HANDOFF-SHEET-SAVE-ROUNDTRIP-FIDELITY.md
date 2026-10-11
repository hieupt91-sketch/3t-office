# HANDOFF: Sheet Save Round-trip Fidelity

## Summary

Đã hoàn thành kiểm thử round-trip Lưu file THẬT của Sheet (Mở → Lưu → Mở lại)
theo đúng phương pháp đã dùng cho Writer.

## Kết quả

- **5 file `.xlsx` fixture**: `sample-sheet.xlsx`, `sample-sheet-formulas.xlsx`,
  `sample-sheet-charts.xlsx`, `sample-sheet-validation.xlsx`, `sample-sheet-pivot.xlsx`
- **2 test cases** trong `tests/test_sheet_save_roundtrip.py`:
  1. `test_all_fixtures_roundtrip`: Mở tất cả fixture → Save → Mở lại, so sánh:
     - Số sheet (đếm `<table:table` trong FODS)
     - Cell values (office:value + text:p) preservation ratio > 50%
     - Không có ký tự mojibake `\ufffd`
  2. `test_edit_before_save_preserves_new_content`: Chèn cell mới với
     `office:string-value` vào FODS → Save → Mở lại → Xác nhận giá trị còn nguyên

## Kết quả kiểm thử bắt buộc

| Kiểm thử | Kết quả |
|---|---|
| `python -m unittest discover -s tests -p "test_*.py"` | **101 tests OK** (tăng từ 99, thêm 2 test mới) |
| `node scripts/check-syntax.js` | **89/89 PASS** (không đổi) |
| `node tests/run-tests.js` | **1511/1511 PASS** (không đổi) |

## Phát hiện lỗi

Không phát hiện lỗi round-trip nghiêm trọng. Lưu ý hành vi LibreOffice:

- Khi round-trip FODS → XLSX → FODS, LibreOffice giữ nguyên `office:string-value`
  nhưng thay nội dung `<text:p>` bằng giá trị string-value. Đây là hành vi
 expected của LibreOffice, không phải lỗi.

## Files changed

- `tests/test_sheet_save_roundtrip.py` (NEW) — Unit test round-trip cho Sheet

## Git log

```
519fa57 test(sheet): add save round-trip fidelity tests for XLSX
```

## Git status

```
On branch test/sheet-save-roundtrip-fidelity
Untracked files:
  TASK-BRIEF-SHEET-SAVE-ROUNDTRIP.md

nothing added to commit but untracked files present
```

## Method

Theo đúng pattern `tests/test_writer_save_roundtrip.py`:
- Mở `.xlsx` qua `VnOfficeApi("sheet", path).open_document_dialog("sheet")`
- Lưu qua `save_document_dialog(content, "sheet", target_format="xlsx")`
  (mock `_active_window` + `create_file_dialog`)
- Mở lại file `.xlsx` vừa lưu
- So sánh cấu trúc FODS: số `<table:table>`, giá trị ô, mojibake

Sheet dùng FODS (không phải HTML như Writer), nên so sánh tập trung vào
`<table:table>`, `<table:table-cell>`, `office:value`, `office:string-value`.
