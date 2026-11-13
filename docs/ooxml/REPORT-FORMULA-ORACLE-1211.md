# Báo cáo — Bộ đối chiếu công thức với LibreOffice và lỗi tiền tố `_xlfn.` (12/11/2026)

Thuộc mục M1 (đối chiếu kết quả công thức) và M7 của roadmap #14. Đây là bước đối chiếu tự động đầu tiên của engine công thức với một bộ tính độc lập. LibreOffice chỉ làm oracle tham khảo (không chép mã) và KHÔNG thay cho đối chiếu Microsoft Excel thật (#11).

## Công cụ
- `scripts/formula-oracle/cases.txt`: 196 công thức trên một bộ dữ liệu cố định (số học, thống kê, điều kiện, logic, văn bản, ngày giờ, tra cứu, tài chính, mảng động).
- `scripts/formula-oracle/run_oracle.py` (chỉ thư viện chuẩn Python): sinh XLSX không có giá trị đệm → LibreOffice headless mở, tính, lưu lại → đọc giá trị LibreOffice → chạy `ooxml-bench eval` trên chính tệp gốc → so từng ô (số: sai số tương đối 1e-9; chuỗi, bool, mã lỗi: bằng nhau). Hàm mới hơn Excel 2007 được ghi kèm `_xlfn.` / `_xlfn._xlws.` như Excel ghi.
- `ooxml-bench eval <tệp.xlsx> <sheet>`: in kết quả engine cho mọi ô có công thức.

Chạy: `swift build -c release --product ooxml-bench && python3 -I scripts/formula-oracle/run_oracle.py` (thêm `--strict` để trả mã lỗi khi có lệch).

## Lỗi tìm ra và đã sửa
**Engine trả `#NAME?` cho mọi hàm mang tiền tố `_xlfn.`** (STDEV.S, VAR.P, PERCENTILE.INC, RANK.EQ, NORM.DIST, IFS, SWITCH, IFNA, CONCAT, TEXTJOIN, XLOOKUP…). Trong tệp XLSX, Excel luôn ghi các hàm ra đời sau bản 2007 theo dạng này, nên với tệp Excel thật các hàm đó đều tính ra lỗi. Hơn 600 test công thức trước đây chỉ dùng tên trần nên không lộ.

Sửa: bộ tách từ chuẩn hóa tên hàm (bỏ `_xlfn.`, `_xlws.`), bỏ `_xlpm.` ở tham số LAMBDA/LET; thêm dạng hàm `TRUE()` / `FALSE()`.

## Kết quả (LibreOffice 24.2.7.2, Linux)
| | Trước khi sửa | Sau khi sửa |
|---|---|---|
| Công thức | 196 | 196 |
| Khớp | 152 | 182 |
| Lệch hoặc khác mã lỗi do engine | 30 | 0 |
| Khác biệt đã biết của oracle | 6 | 6 |
| Oracle không hỗ trợ (LibreOffice trả `#NAME?`) | 8 | 8 |

Sáu khác biệt của oracle, engine đang theo hành vi Excel ghi trong tài liệu của Microsoft; chưa kiểm bằng Excel thật ở đây, cần xác nhận ở #11:
- `SQRT(-1)`: Excel `#NUM!`; LibreOffice ghi `#VALUE!` khi xuất XLSX.
- `COUNT` trên vùng có TRUE/FALSE: Excel bỏ qua, LibreOffice đếm.
- `PERCENTRANK`, `PERCENTRANK.INC`: Excel cắt cụt về 3 chữ số, LibreOffice làm tròn (2 ca).
- `TEXTJOIN` với bool: Excel nối `TRUE`/`FALSE`, LibreOffice ghi `1`/`0`.
- `FILTER`: LibreOffice 24.2 chưa có (trả `#VALUE!`).

Tám công thức LibreOffice 24.2 không biết hàm (XLOOKUP, XMATCH, SEQUENCE, SORT, UNIQUE, TAKE, DROP…): chưa đối chiếu được, chờ Excel thật hoặc LibreOffice mới hơn.

## Kiểm thử
- `FormulaSyntaxTests.testStoragePrefixesAreStrippedFromFunctionNames`, `testTrueFalseFunctionForms`.
- `swift test -c release`: 634/634, 0 lỗi (build sạch, Linux Swift 6.0.3).

## Giới hạn
- 196 công thức trên một bộ dữ liệu nhỏ; chưa phủ mọi tham số và ca biên của từng hàm.
- Khớp LibreOffice không có nghĩa là khớp Excel; sáu khác biệt trên cho thấy hai bên có chỗ khác nhau.
- Bộ đối chiếu cần LibreOffice trên máy chạy, nên chưa đưa vào CI.
