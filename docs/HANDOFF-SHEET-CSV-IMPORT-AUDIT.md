# HANDOFF: Rà soát và vá lỗ hổng CSV nâng cao cho VN Sheet

## Tóm tắt

Đã rà soát 4 khả năng CSV nâng cao theo yêu cầu trong `TASK-BRIEF-CSV-IMPORT-AUDIT.md`.
Phát hiện **2 lỗi thật** trong Gap 2 (định dạng số), đã vá. Các gap còn lại
không có lỗi thực sự.

## Kết quả từng khả năng

### Gap 1: Bỏ qua dòng trống/dòng tiêu đề phụ ở đầu file
**Kết quả: Không có lỗi.**

LibreOffice xử lý đúng:
- Dòng trống ở đầu file được tự động bỏ qua, header được nhận diện đúng.
- Dòng mô tả (ví dụ "Báo cáo doanh thu tháng 3") trở thành dòng dữ liệu
  thường trong sheet — đúng hành vi spreadsheet tiêu chuẩn (giống Excel thật).
- File chỉ có dòng mô tả (không có data) không crash.

Đã kiểm tra qua soffice thật: file có 2 dòng trống + header + data,
file có 2 dòng mô tả + header + data, file chỉ có mô tả.

### Gap 2: Định dạng số kiểu nước ngoài
**Kết quả: CÓ LỖI — đã vá.**

#### Lỗi 2a: Delimiter detection sai khi có dòng mô tả
`csv.Sniffer` chỉ xem 20 dòng đầu tiên (không trống). Khi file CSV có
dòng mô tả (không chứa ký hiệu delimiter) ở đầu, Sniffer không nhận ra
delimiter đúng và mặc định dùng `,`. Kết quả: toàn bộ file bị xử lý
thành 1 cột duy nhất.

**Ví dụ thật**: File CSV từ ngân hàng Việt Nam dùng `;` làm delimiter,
nhưng có 2 dòng mô tả ở đầu → toàn bộ dữ liệu bị gộp vào 1 ô.

**Fix**: Thay vì dùng Sniffer trên 20 dòng đầu, đếm số field splits
trên 200 dòng cho mỗi delimiter candidate (`\,`, `;`, `\t`), chọn delimiter
có mode count cao nhất và ít nhất 2 fields. Sniffer chỉ dùng làm fallback.

#### Lỗi 2b: Số US bị coi là text
Số dạng US `1234.56` hoặc `"1,234.56"` bị LibreOffice đọc thành **string**
thay vì **float**. Nguyên nhân: filter options dùng locale Vietnamese (1066),
LibreOffice diễn giải `.` là dấu phân cách hàng nghìn → `1234.56` không
hợp lệ nên trả về text.

**Fix**: Thêm hàm `_looks_like_us_numbers()` kiểm tra regex US format
(`1,234.56` hoặc `1234.56`) vs VN format (`1.234,56`). Nếu file chứa
nhiều số US hơn VN, đặt language=1033 (English) trong filter options.

**File đã sửa**: `main.py` (hàm `_detect_csv_import_options` và
`_looks_like_us_numbers` mới)

### Gap 3: Định dạng ngày tháng đa dạng
**Kết quả: Không có lỗi nghiêm trọng.**

Đã kiểm tra qua soffice thật:
- **ISO `yyyy-mm-dd`**: Nhận diện đúng, type=date. ✓
- **DMY `dd/mm/yyyy`**: Nhận diện đúng với locale VN (1066). Ngày 25/12/2026
  → `25/12/26` (2 chữ số năm, LO tự xử lý). ✓
- **MDY `mm/dd/yyyy`**: Ngày 04/03/2026 → `04/03/26` (date type). Ngày hợp
  lệ MDY nhưng >12 (như 12/25/2026) → LO giữ nguyên text, không crash. ✓

Hành vi LO hợp lý: ưu tiên DMY theo locale VN, giữ nguyên text khi
không parse được. Không cần fix.

### Gap 4: Dòng cuối file không đủ cột / cột thừa
**Kết quả: Không có lỗi.**

- Dòng thiếu cột: LO padding ô trống, dữ liệu không bị lệch. ✓
- Dòng thừa cột: LO giữ nguyên, thêm cột mới. ✓
- Dòng trống giữa file: được bỏ qua, dữ liệu sau không bị lệch. ✓

## Files đã sửa

| File | Thay đổi |
|------|----------|
| `main.py` |Thêm `_CSV_VN_LANG`, `_CSV_EN_LANG`, `_CSV_DESCRIPTION_MAX_FIELDS` constants. Refactor `_detect_csv_import_options`: dùng field-count counting thay vì Sniffer, thêm `_looks_like_us_numbers()`. Thêm `from collections import Counter`. |
| `tests/test_sheet_csv_import_advanced.py` | Thêm 3 test methods: `test_delimiter_detection_with_leading_description_rows`, `test_us_number_format_detects_english_locale`, `test_looks_like_us_numbers_unit`. |

## Kiểm thử bắt buộc — Kết quả

### `python -m unittest discover -s tests -p "test_*.py"`
```
Ran 104 tests in 260.478s
OK
```
(Trước: 101 tests OK — tăng 3 test mới)

### `node scripts/check-syntax.js`
```
KẾT QUẢ: 90/90 files hợp lệ | 0 lỗi cú pháp
```
(Không đổi)

### `node tests/run-tests.js`
```
KẾT QUẢ KIỂM THỬ: 1521/1521 PASS | 0 FAIL
```
(Không đổi)

## Git status

```
On branch feature/sheet-csv-import-audit
Changes not staged for commit:
  modified:   main.py
  modified:   tests/test_sheet_csv_import_advanced.py

Untracked files:
  TASK-BRIEF-CSV-IMPORT-AUDIT.md

no changes added to commit (use "git add" and/or "git commit -a")
```

```
git log --oneline main..HEAD
(no output — chưa có commit mới trên nhánh này)
```

## Ranh giới an toàn

- Không làm tính năng kết nối Database.
- Không xây Text Import Wizard đầy đủ.
- Không đụng Writer/Slides.
- Chưa commit, chưa merge vào main, chưa push.
