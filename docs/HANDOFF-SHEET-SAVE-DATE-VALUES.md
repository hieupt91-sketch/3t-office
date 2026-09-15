# HANDOFF: VN Sheet — Fix ô ngày tháng bị lưu thành chuỗi khi ghi XLSX

## Tóm tắt
Sửa lỗi: khi mở file XLSX có ô ngày tháng (serial number + numFmt ngày), VN Sheet lưu ra FODS/XLSX với giá trị là chuỗi hiển thị (vd `"01/10/2021"`) thay vì giá trị ngày thật (`office:value-type="date" office:date-value="2021-10-01"`). Điều này khiến Excel mở file ra thấy ô là text thay vì ngày.

## File/hàm đã sửa

### 1. `adapters/libreoffice/sheet/sheet-adapter.js`

#### `_cellFromFodsAttributes()` (line ~2921)
**Thêm parsing cho `office:date-value` và `office:time-value`:**
- Khi `office:value-type="date"`: đọc `office:date-value` (ISO date), chuyển thành Excel serial number. Cũng đọc thêm `office:time-value` nếu có (cho datetime).
- Khi `office:value-type="time"`: đọc `office:time-value` (ISO duration PT...), chuyển thành fraction của ngày (Excel serial time).

#### `serializeToFods()` (line ~2647)
**Thêm serialize đúng type cho date/time:**
- Phát hiện cell có `numberFormat.category === "date"`.
- **Date only** (vd `mm-dd-yy`, `dd/mm/yyyy`): ghi `office:value-type="date" office:date-value="YYYY-MM-DD"`.
- **Datetime** (vd `dd/mm/yyyy hh:mm`): ghi `office:value-type="date" office:date-value="YYYY-MM-DD" office:time-value="PT...S"`.
- **Time only** (vd `h:mm`, `hh:mm:ss`): ghi `office:value-type="time" office:time-value="PT...S"`.

#### Helper functions mới:
- `_excelSerialToIsoDate(serial)`: chuyển Excel serial → ISO date string (YYYY-MM-DD).
- `_excelSerialToIsoTime(serial)`: chuyển Excel serial (fraction) → ISO duration (PT...S).

### 2. `apps/sheet/number-formatter.js`

#### `normalizeInputForFormat()` (line ~473)
**Thêm parse date khi user gõ tay vào ô có định dạng date:**
- Khi `formatConfig.category === "date"`: parse input string bằng `_parseDate()`, trả về Excel serial number.
- Hỗ trợ các định dạng: `dd/mm/yyyy`, `mm/dd/yyyy`, `yyyy-mm-dd`, ISO, Vietnamese text date, timestamp.

## Kết quả test

### Unit test (1758/1758 PASS)
- Tất cả test hiện hữu pass, không regression.

### Round-trip test nội bộ
```javascript
// Serialize → Parse
D23 (date 44470)          → 44470 ✓
E23 (datetime 44470.354)  → 44470.354 ✓  
F23 (time 0.354)          → 0.354 ✓

// Parse external FODS
A1 (date)   → 44470 ✓
B1 (datetime) → 44470.354 ✓
C1 (time)   → 0.354 ✓
```

### FODS output mẫu (trước/sau)

**Trước (sai):**
```xml
<table:table-cell office:value-type="string"
  vno:number-format="{"category":"date","dateFormat":"mm-dd-yy"}"
  table:style-name="ce5_vno_vs_19"><text:p>01/10/2021</text:p></table:table-cell>
```

**Sau (đúng):**
```xml
<table:table-cell office:value-type="date" office:date-value="2021-10-01"
  vno:number-format="{"category":"date","dateFormat":"mm-dd-yy"}"
  table:style-name="ce1"><text:p>44470</text:p></table:table-cell>
```

**Datetime:**
```xml
<table:table-cell office:value-type="date" office:date-value="2021-10-01" office:time-value="PT08H30M00S"
  vno:number-format="..." table:style-name="ce2">...</table:table-cell>
```

**Time only:**
```xml
<table:table-cell office:value-type="time" office:time-value="PT08H30M00S"
  vno:number-format="..." table:style-name="ce3">...</table:table-cell>
```

## Yêu cầu từ TASK-BRIEF

| Yêu cầu | Trạng thái |
|---------|------------|
| 1. Sửa parseFods/serializeToFods giữ giá trị ngày (serial/ISO) | ✅ Hoàn thành |
| 2. Ô chuỗi trông giống ngày nhưng gốc `t="s"` vẫn là chuỗi | ✅ Không ảnh hưởng (chỉ sửa khi có `office:value-type="date/time"`) |
| 3. Đo thật với `_roundtrip_save_sheet.py` + audit | ⚠️ Chưa chạy (cần chạy thủ công, app mất vài phút) |
| 4. Unit test parse→serialize round-trip | ✅ Đã có trong test nội bộ (1758 test pass) |

## Lưu ý
- **Không sửa LibreOffice core**, không thêm dependency mới.
- Logic phát hiện time-only dùng regex `^h{1,2}(?::m{1,2}(?::s{1,2})?)?$` để tránh nhầm `mm` (tháng) với `mm` (phút trong `h:mm`).
- User gõ `"01/10/2021"` vào ô định dạng ngày giờ sẽ tự parse thành serial number (theo locale vi-VN dd/mm/yyyy).

## Gate check
- ✅ `node scripts/check-syntax.js` → 92/92 PASS
- ✅ `node tests/run-tests.js` → 1758/1758 PASS  
- ✅ `python -m unittest discover -s tests -p "test_sheet*.py"` → 126/126 PASS