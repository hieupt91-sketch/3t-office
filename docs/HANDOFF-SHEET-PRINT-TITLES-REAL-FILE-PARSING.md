# Bàn giao: Sửa lỗi thật — Print Titles (Tiêu đề in lặp lại) bị MẤT HOÀN TOAN khi mở file XLSX thật

## 1. Cách phát hiện

Sau khi sửa lỗi Page Setup bị reset (HANDOFF-SHEET-PAGESETUP-REAL-FILE-PARSING.md), phát hiện Print Titles (Tiêu đề in lặp lại — hàng/cột lặp lại trên mỗi trang in) cũng bị **mất hoàn toàn** khi mở file XLSX thật (từ Excel, Google Sheets, hoặc LibreOffice) qua VN Office. Người dùng thiết lập Print Titles trong Excel, lưu file, mở bằng VN Office → Print Titles biến mất, in ra không có hàng/cột đầu lặp lại trên mỗi trang.

## 2. Nguyên nhân gốc

`parseFods()` (cả hai nhánh DOM và regex) chỉ đọc Print Titles từ thuộc tính **riêng** `vno:print-title-rows`/`vno:print-title-cols` trên `<table:table>`. Thuộc tính `vno:*` này CHỈ tồn tại khi chính VN Office ghi ra file và file chưa qua vòng chuyển đổi nào — LibreOffice/Excel không giữ thuộc tính lạ khi convert.

Khi LibreOffice convert XLSX → FODS, Print Titles được ghi vào **chuẩn ODF** dưới dạng:

```xml
<table:named-expressions>
  <table:named-expression
    table:name="_xlnm.Print_Titles"
    table:base-cell-address="$Sheet1.$A$1"
    table:expression="[$Sheet1.$1:.$1];[.$A:.$A]"/>
</table:named-expressions>
```

- `table:name` luôn là `_xlnm.Print_Titles` (tên đặc biệt Excel/Calc)
- `table:expression` chứa chuỗi phân cách bởi `;`, mỗi phần là một vùng tham chiếu ODF:
  - `[$Sheet.$1:.$1]` — lặp lại hàng 1
  - `[.$A:.$A]` — lặp lại cột A (sheet name có thể bị省略 khi trùng)
  - `[$Sheet.$1:.$3]` — lặp lại hàng 1 đến 3
  - `[.$A:.$C]` — lặp lại cột A đến C
- Mỗi sheet có thể có một `<table:named-expression>` riêng với `table:base-cell-address` trỏ đúng sheet đó

## 3. Cách sửa

Thêm hàm `_parseStandardPrintTitles(xml, sheetName)` trong `adapters/libreoffice/sheet/sheet-adapter.js` (đặt ngay sau `_parseStandardOdfPageLayout()`), đọc đúng chuẩn ODF:

1. Tìm tất cả `<table:named-expression table:name="_xlnm.Print_Titles">` trong toàn bộ XML
2. Với mỗi phần tử, extract `table:expression` và split theo `;`
3. Parse mỗi phần `[$Sheet.$Ref]` hoặc `[$Sheet.$Ref:.$Ref]` hoặc `[.$Ref:.$Ref]` (hỗ trợ cả shorthand khi LibreOffice省略 sheet name)
4. Phân biệt hàng vs cột: nếu ref là số → hàng, nếu ref là chữ cái → cột
5. Trả về `{ rows: "1" hoặc "1:3", cols: "A" hoặc "A:C" }` hoặc `null`

Tích hợp vào `parseFods()` theo mô hình **3 ưu tiên** (giống Page Setup):
- **Ưu tiên 1**: `vno:print-title-rows/cols` (nếu có — fidelity tuyệt đối cho tự-round-trip VN Office)
- **Ưu tiên 2**: `_parseStandardPrintTitles()` (chuẩn ODF — hoạt động với BAT KY file thật nào)
- **Ưu tiên 3**: mặc định rỗng `{ rows: "", cols: "" }`

KHÔNG đụng vào logic serialize — VN Office vẫn tiếp tục ghi `vno:print-title-rows/cols` khi lưu file.

## 4. Phát hiện bổ sung: LibreOffice省略 sheet name trong expression

Khi debug với soffice thật, phát hiện LibreOffice ghi expression dạng `[.$A:.$A]` (省略 tên sheet, chỉ giữ `.`) thay vì `[$Sheet1.$A:.$A]` đầy đủ cho phần tham chiếu thứ hai cùng sheet. Regex phải hỗ trợ cả hai định dạng này — nếu không sẽ chỉ đọc được rows mà mất cols (vì cols là phần thứ hai trong expression).

## 5. Kết quả kiểm thử

- `node scripts/check-syntax.js`: **89/89 PASS**.
- `node tests/run-tests.js`: **1428/1428 PASS** (tăng từ 1419 — thêm 9 test mới trong suite 123b).
- `node tests/live/sheet-fods-print-titles-real-conversion.mjs` (mới): tạo XLSX thật có Print Titles → convert qua soffice → đọc FODS thật → xác nhận `printTitles.rows`/`printTitles.cols` được parse đúng.
- `node tests/live/ribbon-audit-1280.playwright.mjs`: **100% PASS** (không regress UI).

## 6. Files thay đổi

- `adapters/libreoffice/sheet/sheet-adapter.js`: thêm `_parseStandardPrintTitles()` (~45 dòng), sửa `parseFods()` cả DOM và regex path (thêm fallback sau khi đọc `vno:*`)
- `tests/unit/sheet-print-titles-real-file-import.test.js` (mới): 9 test unit cho `_parseStandardPrintTitles()` và `parseFods()` với nhiều định dạng ODF
- `tests/live/sheet-fods-print-titles-real-conversion.mjs` (mới): test live soffice thật
- `tests/run-tests.js`: thêm import và suite 123b
