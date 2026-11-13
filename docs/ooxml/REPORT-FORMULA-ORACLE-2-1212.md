# Báo cáo — Đối chiếu công thức đợt 2: ca biên (12/11/2026)

Nối tiếp `REPORT-FORMULA-ORACLE-1211.md` (M1/M7 của roadmap #14). Bộ đối chiếu tăng từ 196 lên 534 công thức, thêm vào các ca biên: tiêu chí COUNTIF/SUMIF, ép kiểu, làm tròn, ngày, tra cứu, lan truyền lỗi và tham số hiếm. Oracle vẫn là LibreOffice 24.2.7.2, chỉ để tham khảo, không phải Excel.

## Kết quả đợt này
| | Trước khi sửa | Sau khi sửa |
|---|---|---|
| Công thức | 534 | 534 |
| Khớp LibreOffice | 442 | 478 |
| Lệch do engine | 69 | 0 |
| Khác biệt đã biết của oracle | 6 | 40 |
| Chưa kiểm được với Excel | 0 | 1 |
| Oracle không hỗ trợ hàm | 17 | 15 |

69 ca lệch ban đầu gồm 31 ca engine thiếu hàm và 38 ca khác. Em xét từng ca theo hành vi Excel đã được tài liệu hóa.

## Engine sai, đã sửa
1. **So sánh số theo 15 chữ số có nghĩa như Excel.** `0.1+0.2=0.3` trả FALSE (Excel: TRUE). Áp cho mọi toán tử so sánh; số khác nhau thật ở chữ số thứ 15 vẫn khác.
2. **Dấu trừ đơn trên mảng/vùng.** `SUMPRODUCT(--(vùng="a"))`, mẫu rất phổ biến để đếm có điều kiện, trả `#VALUE!`.
3. **`TEXT(x,"@")`** trả đúng chữ `@` thay vì văn bản của giá trị.
4. **`WEEKDAY(ngày,11…17)`** trả `#NUM!`; nay hỗ trợ đủ các kiểu 11–17.

## Hàm còn thiếu, đã thêm
`ISBLANK`, `ISNUMBER`, `ISTEXT`, `ISLOGICAL`, `ISERROR`, `ISERR`, `ISNA`, `ISEVEN`, `ISODD`, `N`, `T`, `TYPE`, `ERROR.TYPE`, `XOR`. Họ `IS…` không lan truyền lỗi của đối số (`ISERROR(1/0)` là TRUE), đúng như Excel.

## 40 khác biệt đã xác định của LibreOffice (engine theo Excel)
Nhóm chính, mỗi ca có ghi chú riêng trong `run_oracle.py`:
- LibreOffice gom nhiều mã lỗi nội bộ về `#VALUE!` khi xuất XLSX, trong khi Excel trả `#NUM!`, `#N/A`, `#REF!`… (LN(0), LARGE vượt cỡ, PERCENTILE ngoài [0,1], VLOOKUP cột vượt vùng, DATEDIF ngược…).
- Giá trị logic: Excel bỏ qua TRUE/FALSE trong vùng tham chiếu cho SUM/AVERAGE/MAX/COUNT nhưng ép khi viết thẳng làm đối số; LibreOffice ngược lại ở nhiều chỗ. `TRUE>5` là TRUE trong Excel.
- Chuỗi số viết thẳng làm đối số (`SUM("3",4)` = 7 trong Excel).
- Ngày trước 1/3/1900: Excel giữ ngày 29/2/1900 không có thật; LibreOffice lệch một ngày.
- `POWER(0,0)`, `POWER(-8,1/3)`, `FIND("","abc")`, `LEN(TRUE)`, `TEXT(-0.4,"0")`…

Các nhận định về Excel dựa trên tài liệu và hành vi đã biết của Excel, chưa kiểm bằng Excel thật trong môi trường này. Đối chiếu Excel thật vẫn là việc của #11.

## Một ca chưa kết luận
`LOG(10,1)`: engine trả `#NUM!`, nhiều khả năng Excel trả `#DIV/0!` (ln 1 = 0), nhưng em chưa chắc nên không đổi engine. Ca được tách riêng trong bộ đối chiếu, không tính là khớp hay lệch.

## Kiểm thử
- `FormulaExcelParityTests` (8 bài) khóa toàn bộ hành vi trên, gồm cả ca biên của so sánh 15 chữ số, mảng, các dạng `IS…`, mã `ERROR.TYPE` và dạng có tiền tố `_xlfn.XOR`.
- `swift test -c release`: 643/643, 0 lỗi (build sạch, Linux Swift 6.0.3).
- `run_oracle.py --strict`: thoát mã 0.

## Giới hạn
- 15 công thức LibreOffice 24.2 chưa có hàm (XLOOKUP, XMATCH, SEQUENCE, SORT, UNIQUE, TAKE, DROP): chưa đối chiếu được.
- Khớp LibreOffice không phải khớp Excel; 40 khác biệt trên cho thấy hai bên lệch nhau nhiều ở ca biên.
- Bộ đối chiếu cần LibreOffice trên máy chạy nên chưa đưa vào CI.
