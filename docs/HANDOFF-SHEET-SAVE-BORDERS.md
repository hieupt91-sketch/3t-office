# HANDOFF: VN Sheet — Lưu viền ô (Round 3)

## Tóm tắt thay đổi

Vòng 3 sửa lỗi còn lại ở nhánh **regex** của `parseFods`: hàm `_fodsCellMarkupHasRealContent` trả về `false` cho ô rỗng có viền vì kiểm tra `markup` rỗng **TRƯỚC** khi kiểm tra border style. Điều này làm ô rỗng có viền không được materialize trong used-range, mất viền khi serialize. Nhánh DOM đã đúng (kiểm tra border sau paragraph). Vòng 2 chỉ sửa tham số `cellVisualStyles` nhưng chưa đổi thứ tự kiểm tra.

## Các file đã thay đổi

| File | Thay đổi chính |
|------|----------------|
| `adapters/libreoffice/sheet/sheet-adapter.js` | `_fodsCellMarkupHasRealContent`: di chuyển kiểm tra border style **TRƯỚC** kiểm tra `markup` rỗng (dòng 2463-2470). Nhánh DOM không đổi (đã đúng). |
| `tests/unit/sheet-import-cell-styles.test.js` | Thêm test "regex branch preserves empty cell with border at used-range edge" (Test 8). |

## Kết quả đo thực tế (Dahua HN-T11.2023.xlsx)

### Trước (Round 2 — regex branch sai thứ tự kiểm tra)

| Chỉ số | Sheet "Các mã sản phẩm dừng phân phối" |
|--------|------------------------------------------|
| Ô có viền (regex parse) | 469 |
| Ô có viền (soffice FODS) | 573 |
| Ô có viền (serialize round-trip) | 468 |

### Sau (Round 3 — regex branch sửa thứ tự)

| Chỉ số | Sheet "Các mã sản phẩm dừng phân phối" |
|--------|------------------------------------------|
| Ô có viền (regex parse) | **573** ✓ (khớp soffice FODS) |
| Ô có viền (serialize round-trip) | **573** ✓ |

> **Lưu ý**: 573 ô có viền khớp hoàn toàn với FODS do LibreOffice sinh. Vòng 2 chỉ đạt 469/573 do regex branch bỏ sót ô rỗng có viền.

## Chi tiết kỹ thuật

### 1. Sửa thứ tự kiểm tra trong `_fodsCellMarkupHasRealContent` (regex branch)

**Trước (sai):**
```javascript
const markup = String(content || "");
if (!markup) return false;  // ← Trả về false SỚM cho ô rỗng
// ... kiểm tra annotation, frame, text ...
// Kiểm tra border style ở CUỐI (không bao giờ chạy cho ô rỗng)
```

**Sau (đúng):**
```javascript
// Kiểm tra border style TRƯỚC (ô rỗng có viền vẫn = real content)
const styleName = attributes["table:style-name"];
if (styleName && cellVisualStyles.has(styleName)) {
  const visualStyle = cellVisualStyles.get(styleName);
  if (visualStyle && (visualStyle.borderLeft || visualStyle.borderRight || visualStyle.borderTop || visualStyle.borderBottom)) {
    return true;
  }
}
const markup = String(content || "");
if (!markup) return false;
// ...
```

### 2. Nhánh DOM đã đúng từ trước

`_fodsCellHasRealContent` (DOM branch) kiểm tra border sau paragraph loop, nên ô rỗng (không paragraph) vẫn rơi xuống kiểm tra border → đúng.

## Test coverage

```bash
# JS unit tests (regex + DOM branches)
node -e "import('./tests/unit/sheet-import-cell-styles.test.js').then(m => m.runSheetImportCellStylesTests())"
# 11 tests OK, bao gồm test mới: "regex branch preserves empty cell with border at used-range edge"

# Python tests
python -m unittest tests.test_sheet_borders_activetab -v
# 8 tests OK

python -m unittest tests.test_sheet_save_roundtrip -v
# 2 tests OK

python -m unittest tests.test_sheet_active_tab_overlay -v
# 18 tests OK

python -m unittest tests.test_sheet_freeze_panes tests.test_sheet_hidden_autofilter tests.test_sheet_xlsx_native_open -v
# All OK
```

## Kết quả xác minh thực tế

```bash
# Đo bằng script measure_border_branches.mjs trên Dahua HN-T11.2023.xlsx
# Trước Round 3: regex parse 469, serialize 468 (thiếu 104 ô)
# Sau Round 3:  regex parse 573, serialize 573 (khớp soffice FODS 573)
```

## Rollback plan

```bash
git revert <commit-hash-of-round-3>
```
Chỉ thay đổi `_fodsCellMarkupHasRealContent` và thêm 1 unit test, không ảnh hưởng tính năng khác.

## Tài liệu liên quan

- `docs/HANDOFF-SHEET-AUDIT-ROUND2.md` — cập nhật trạng thái audit
- `TASK-BRIEF-SHEET-SAVE-BORDERS-R3.md` — brief vòng 3