# Ma trận hàm VN Sheet đối chiếu Excel 2016

Ngày chạy: 2026-10-13. Oracle: Excel 16.0.4266.1001; VN Sheet ghi một XLSX; Excel COM mở ReadOnly, gọi CalculateFullRebuild trong bộ nhớ và không lưu workbook.

Danh mục nguồn Microsoft có 462 hàm duy nhất; 424 được đánh dấu dùng được trong Excel 2016 và 38 có mốc sau 2016. Danh sách: [Microsoft Excel functions by category](https://support.microsoft.com/en-us/excel/excel-functions-by-category).
VN Sheet hiện có 143 mục gợi ý hàm (bao gồm hàm riêng VND); 137 hàm đã nhập qua desktop/CDP và đọc lại từ Excel trong lượt này.

## Kết quả lượt COM

**Giới hạn tương thích lưu:** ca RANK.EQ và FORMULATEXT trong lượt này nhập công thức có tiền tố `_xlfn.` qua CDP để Excel 2016 tính được. Công thức thông thường không có tiền tố vẫn chưa được sửa ở đường lưu XLSX; mapping đề xuất nằm trong `docs/PLAN-EXCEL-2016-E1-OOXML-COMPAT.md` và đang chờ phê duyệt do thay đổi output XLSX.

| Chỉ số | Kết quả |
|---|---:|
| Hàm đã nhập và đọc qua Excel COM | 137 |
| Ca scalar có thể so sánh | 118 |
| Khớp | 118 |
| Lệch cần xử lý | 0 |
| Hậu Excel 2016 | 38 |
| Chưa chạy COM trong ma trận nguồn | 337 |

`MATCH` chỉ ghi khi giá trị khớp; hậu Excel 2016 và TRANSPOSE scalar không được tính là mismatch E1. Mỗi hàng đã chạy COM chỉ có một ca tham số đại diện; các kiểu dữ liệu/biên khác được đánh dấu riêng bên dưới.

## Ma trận theo hàm

| Hàm | Nhóm | Phiên bản | Có trong danh mục VN | Gọi rỗng trong FormulaEngine | Ca COM | Rỗng | Lỗi | Kiểu trộn | Cả cột | Mảng | VN Sheet | Excel 2016 | Kết quả |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|

### Math and trigonometry functions

| ABS | Math and trigonometry functions | Excel 2016 | Có | `0` | `=ABS(-15.5)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `15.5` | `15.5` | MATCH |
| ACOS | Math and trigonometry functions | Excel 2016 | Không | `#NAME? (ACOS)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| ACOSH | Math and trigonometry functions | Excel 2016 | Không | `#NAME? (ACOSH)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| ACOT | Math and trigonometry functions | Excel 2016 | Không | `#NAME? (ACOT)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| ACOTH | Math and trigonometry functions | Excel 2016 | Không | `#NAME? (ACOTH)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| AGGREGATE | Math and trigonometry functions | Excel 2016 | Không | `#NAME? (AGGREGATE)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| ARABIC | Math and trigonometry functions | Excel 2016 | Không | `#NAME? (ARABIC)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| ASIN | Math and trigonometry functions | Excel 2016 | Không | `#NAME? (ASIN)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| ASINH | Math and trigonometry functions | Excel 2016 | Không | `#NAME? (ASINH)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| ATAN | Math and trigonometry functions | Excel 2016 | Không | `#NAME? (ATAN)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| ATAN2 | Math and trigonometry functions | Excel 2016 | Không | `#NAME? (ATAN2)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| ATANH | Math and trigonometry functions | Excel 2016 | Không | `#NAME? (ATANH)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| BASE | Math and trigonometry functions | Excel 2016 | Không | `#NAME? (BASE)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| CEILING | Math and trigonometry functions | Excel 2016 | Có | `#VALUE!` | `=CEILING(2.5, 1)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `3` | `3` | MATCH |
| CEILING.MATH | Math and trigonometry functions | Excel 2016 | Không | `#NAME? (CEILING.MATH)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| CEILING.PRECISE | Math and trigonometry functions | Excel 2016 | Không | `#NAME? (CEILING.PRECISE)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| COMBIN | Math and trigonometry functions | Excel 2016 | Có | `#VALUE!` | `=COMBIN(8, 3)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `56` | `56` | MATCH |
| COMBINA | Math and trigonometry functions | Excel 2016 | Không | `#NAME? (COMBINA)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| COS | Math and trigonometry functions | Excel 2016 | Có | `#VALUE!` | `=COS(0)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `1` | `1` | MATCH |
| COSH | Math and trigonometry functions | Excel 2016 | Không | `#NAME? (COSH)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| COT | Math and trigonometry functions | Excel 2016 | Không | `#NAME? (COT)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| COTH | Math and trigonometry functions | Excel 2016 | Không | `#NAME? (COTH)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| CSC | Math and trigonometry functions | Excel 2016 | Không | `#NAME? (CSC)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| CSCH | Math and trigonometry functions | Excel 2016 | Không | `#NAME? (CSCH)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| DECIMAL | Math and trigonometry functions | Excel 2016 | Không | `#NAME? (DECIMAL)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| DEGREES | Math and trigonometry functions | Excel 2016 | Có | `#VALUE!` | `=DEGREES(PI())` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `180` | `180` | MATCH |
| EVEN | Math and trigonometry functions | Excel 2016 | Có | `#VALUE!` | `=EVEN(1.5)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `2` | `2` | MATCH |
| EXP | Math and trigonometry functions | Excel 2016 | Có | `#VALUE!` | `=EXP(1)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `2.718281828459045` | `2.718282` | MATCH |
| FACT | Math and trigonometry functions | Excel 2016 | Có | `#VALUE!` | `=FACT(5)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `120` | `120` | MATCH |
| FACTDOUBLE | Math and trigonometry functions | Excel 2016 | Không | `#NAME? (FACTDOUBLE)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| FLOOR | Math and trigonometry functions | Excel 2016 | Có | `#VALUE!` | `=FLOOR(2.5, 1)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `2` | `2` | MATCH |
| FLOOR.MATH | Math and trigonometry functions | Excel 2016 | Không | `#NAME? (FLOOR.MATH)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| FLOOR.PRECISE | Math and trigonometry functions | Excel 2016 | Không | `#NAME? (FLOOR.PRECISE)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| GCD | Math and trigonometry functions | Excel 2016 | Không | `#NAME? (GCD)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| INT | Math and trigonometry functions | Excel 2016 | Có | `0` | `=INT(8.9)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `8` | `8` | MATCH |
| ISO.CEILING | Math and trigonometry functions | Excel 2016 | Không | `#NAME? (ISO.CEILING)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| LCM | Math and trigonometry functions | Excel 2016 | Không | `#NAME? (LCM)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| LN | Math and trigonometry functions | Excel 2016 | Có | `#VALUE!` | `=LN(2.71828)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `0.999999327347282` | `0.999999` | MATCH |
| LOG | Math and trigonometry functions | Excel 2016 | Có | `#VALUE!` | `=LOG(8, 2)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `3` | `3` | MATCH |
| LOG10 | Math and trigonometry functions | Excel 2016 | Có | `#VALUE!` | `=LOG10(100)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `2` | `2` | MATCH |
| MDETERM | Math and trigonometry functions | Excel 2016 | Không | `#NAME? (MDETERM)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| MINVERSE | Math and trigonometry functions | Excel 2016 | Không | `#NAME? (MINVERSE)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| MMULT | Math and trigonometry functions | Excel 2016 | Không | `#NAME? (MMULT)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| MOD | Math and trigonometry functions | Excel 2016 | Có | `#VALUE!` | `=MOD(10, 3)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `1` | `1` | MATCH |
| MROUND | Math and trigonometry functions | Excel 2016 | Có | `#VALUE!` | `=MROUND(10, 3)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `9` | `9` | MATCH |
| MULTINOMIAL | Math and trigonometry functions | Excel 2016 | Không | `#NAME? (MULTINOMIAL)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| MUNIT | Math and trigonometry functions | Excel 2016 | Không | `#NAME? (MUNIT)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| ODD | Math and trigonometry functions | Excel 2016 | Có | `#VALUE!` | `=ODD(2.1)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `3` | `3` | MATCH |
| PERCENTOF | Math and trigonometry functions | Excel 2016 | Không | `#NAME? (PERCENTOF)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| PI | Math and trigonometry functions | Excel 2016 | Có | `3.141592653589793` | `=PI()` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `3.141592653589793` | `3.141593` | MATCH |
| POWER | Math and trigonometry functions | Excel 2016 | Có | `#VALUE!` | `=POWER(2, 8)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `256` | `256` | MATCH |
| PRODUCT | Math and trigonometry functions | Excel 2016 | Có | `1` | `=PRODUCT(A1:A5)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `24` | `24` | MATCH |
| QUOTIENT | Math and trigonometry functions | Excel 2016 | Không | `#NAME? (QUOTIENT)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| RADIANS | Math and trigonometry functions | Excel 2016 | Có | `#VALUE!` | `=RADIANS(180)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `3.141592653589793` | `3.141593` | MATCH |
| RAND | Math and trigonometry functions | Excel 2016 | Có | `0.6480383347141856` | `=RAND()` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `0.9431956358609933` | `0.518131` | VOLATILE: không so sánh |
| RANDARRA | Math and trigonometry functions | Sau Excel 2016 (2021) | Không | `#NAME? (RANDARRA)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| RANDBETWEEN | Math and trigonometry functions | Excel 2016 | Có | `#VALUE!` | `=RANDBETWEEN(1, 100)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `82` | `66` | VOLATILE: không so sánh |
| ROMAN | Math and trigonometry functions | Excel 2016 | Không | `#NAME? (ROMAN)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| ROUND | Math and trigonometry functions | Excel 2016 | Có | `#VALUE!` | `=ROUND(123.456, 2)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `123.46` | `123.46` | MATCH |
| ROUNDDOWN | Math and trigonometry functions | Excel 2016 | Có | `#VALUE!` | `=ROUNDDOWN(12.39, 1)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `12.3` | `12.3` | MATCH |
| ROUNDUP | Math and trigonometry functions | Excel 2016 | Có | `#VALUE!` | `=ROUNDUP(12.31, 1)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `12.4` | `12.4` | MATCH |
| SEC | Math and trigonometry functions | Excel 2016 | Không | `#NAME? (SEC)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| SECH | Math and trigonometry functions | Excel 2016 | Không | `#NAME? (SECH)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| SEQUENCE | Math and trigonometry functions | Excel 2016 | Không | `#NAME? (SEQUENCE)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| SERIESSUM | Math and trigonometry functions | Excel 2016 | Không | `#NAME? (SERIESSUM)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| SIGN | Math and trigonometry functions | Excel 2016 | Có | `#VALUE!` | `=SIGN(-42)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `-1` | `-1` | MATCH |
| SIN | Math and trigonometry functions | Excel 2016 | Có | `#VALUE!` | `=SIN(1.5707963267948966)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `1` | `1` | MATCH |
| SINH | Math and trigonometry functions | Excel 2016 | Không | `#NAME? (SINH)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| SQRT | Math and trigonometry functions | Excel 2016 | Có | `#VALUE!` | `=SQRT(16)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `4` | `4` | MATCH |
| SQRTPI | Math and trigonometry functions | Excel 2016 | Không | `#NAME? (SQRTPI)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| SUBTOTAL | Math and trigonometry functions | Excel 2016 | Không | `#NAME? (SUBTOTAL)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| SUM | Math and trigonometry functions | Excel 2016 | Có | `0` | `=SUM(A1:A10)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `115` | `115` | MATCH |
| SUMIF | Math and trigonometry functions | Excel 2016 | Có | `0` | `=SUMIF(A2:A20, "Hà Nội", C2:C20)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `0` | `0` | MATCH |
| SUMIFS | Math and trigonometry functions | Excel 2016 | Có | `#VALUE!` | `=SUMIFS(C2:C50, A2:A50, "Đã bán", A2:A50, ">100")` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `0` | `0` | MATCH |
| SUMPRODUCT | Math and trigonometry functions | Excel 2016 | Có | `#VALUE!` | `=SUMPRODUCT(A2:A6,C2:C6)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `74807.6` | `74807.6` | MATCH |
| SUMSQ | Math and trigonometry functions | Excel 2016 | Không | `#NAME? (SUMSQ)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| SUMX2MY2 | Math and trigonometry functions | Excel 2016 | Không | `#NAME? (SUMX2MY2)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| SUMX2PY2 | Math and trigonometry functions | Excel 2016 | Không | `#NAME? (SUMX2PY2)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| SUMXMY2 | Math and trigonometry functions | Excel 2016 | Không | `#NAME? (SUMXMY2)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| TAN | Math and trigonometry functions | Excel 2016 | Có | `#VALUE!` | `=TAN(0.7853981633974483)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `0.9999999999999999` | `1` | MATCH |
| TANH | Math and trigonometry functions | Excel 2016 | Không | `#NAME? (TANH)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| TRUNC | Math and trigonometry functions | Excel 2016 | Có | `#VALUE!` | `=TRUNC(8.756, 2)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `8.75` | `8.75` | MATCH |

### Financial functions

| ACCRINT | Financial functions | Excel 2016 | Không | `#NAME? (ACCRINT)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| ACCRINTM | Financial functions | Excel 2016 | Không | `#NAME? (ACCRINTM)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| AMORDEGRC | Financial functions | Excel 2016 | Không | `#NAME? (AMORDEGRC)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| AMORLINC | Financial functions | Excel 2016 | Không | `#NAME? (AMORLINC)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| COUPDAYBS | Financial functions | Excel 2016 | Không | `#NAME? (COUPDAYBS)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| COUPDAYS | Financial functions | Excel 2016 | Không | `#NAME? (COUPDAYS)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| COUPDAYSNC | Financial functions | Excel 2016 | Không | `#NAME? (COUPDAYSNC)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| COUPNCD | Financial functions | Excel 2016 | Không | `#NAME? (COUPNCD)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| COUPNUM | Financial functions | Excel 2016 | Không | `#NAME? (COUPNUM)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| COUPPCD | Financial functions | Excel 2016 | Không | `#NAME? (COUPPCD)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| CUMIPMT | Financial functions | Excel 2016 | Không | `#NAME? (CUMIPMT)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| CUMPRINC | Financial functions | Excel 2016 | Không | `#NAME? (CUMPRINC)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| DB | Financial functions | Excel 2016 | Có | `#VALUE!` | `=DB(100000000, 10000000, 5, 1, 12)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `36900000` | `########` | MATCH |
| DDB | Financial functions | Excel 2016 | Không | `#NAME? (DDB)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| DISC | Financial functions | Excel 2016 | Không | `#NAME? (DISC)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| DOLLARDE | Financial functions | Excel 2016 | Không | `#NAME? (DOLLARDE)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| DOLLARFR | Financial functions | Excel 2016 | Không | `#NAME? (DOLLARFR)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| DURATION | Financial functions | Excel 2016 | Không | `#NAME? (DURATION)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| EFFECT | Financial functions | Excel 2016 | Không | `#NAME? (EFFECT)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| FV | Financial functions | Excel 2016 | Có | `#VALUE!` | `=FV(0.06/12, 24, -2000000, -10000000, 0)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `62135508.24420944` | `########` | MATCH |
| FVSCHEDULE | Financial functions | Excel 2016 | Không | `#NAME? (FVSCHEDULE)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| INTRATE | Financial functions | Excel 2016 | Không | `#NAME? (INTRATE)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| IPMT | Financial functions | Excel 2016 | Có | `#VALUE!` | `=IPMT(0.08/12, 1, 36, 100000000)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `-666666.6666666667` | `########` | MATCH |
| IRR | Financial functions | Excel 2016 | Có | `#VALUE!` | `=IRR(A1:A10, 0.1)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `#NUM!` | `#NUM!` | MATCH |
| ISPMT | Financial functions | Excel 2016 | Không | `#NAME? (ISPMT)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| MDURATION | Financial functions | Excel 2016 | Không | `#NAME? (MDURATION)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| MIRR | Financial functions | Excel 2016 | Không | `#NAME? (MIRR)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| NOMINAL | Financial functions | Excel 2016 | Không | `#NAME? (NOMINAL)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| NPER | Financial functions | Excel 2016 | Có | `#VALUE!` | `=NPER(0.08/12, -6000000, 250000000)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `48.97589107529118` | `48.97589` | MATCH |
| NPV | Financial functions | Excel 2016 | Có | `#NUM!` | `=NPV(0.1, C2:C6)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `14729.338749837003` | `########` | MATCH |
| ODDFPRICE | Financial functions | Excel 2016 | Không | `#NAME? (ODDFPRICE)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| ODDFYIELD | Financial functions | Excel 2016 | Không | `#NAME? (ODDFYIELD)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| ODDLPRICE | Financial functions | Excel 2016 | Không | `#NAME? (ODDLPRICE)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| ODDLYIELD | Financial functions | Excel 2016 | Không | `#NAME? (ODDLYIELD)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| PDURATION | Financial functions | Excel 2016 | Không | `#NAME? (PDURATION)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| PMT | Financial functions | Excel 2016 | Có | `#VALUE!` | `=PMT(0.08/12, 60, 500000000, 0, 0)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `-10138197.144206924` | `########` | MATCH |
| PPMT | Financial functions | Excel 2016 | Có | `#VALUE!` | `=PPMT(0.08/12, 1, 36, 100000000)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `-2466969.8794764457` | `########` | MATCH |
| PRICE | Financial functions | Excel 2016 | Không | `#NAME? (PRICE)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| PRICEDISC | Financial functions | Excel 2016 | Không | `#NAME? (PRICEDISC)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| PRICEMAT | Financial functions | Excel 2016 | Không | `#NAME? (PRICEMAT)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| PV | Financial functions | Excel 2016 | Có | `#VALUE!` | `=PV(0.05/12, 36, -5000000, 0, 0)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `166828506.41870353` | `########` | MATCH |
| RATE | Financial functions | Excel 2016 | Có | `#VALUE!` | `=RATE(48, -5000000, 200000000)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `0.007701472488202456` | `0.77%` | MATCH |
| RECEIVED | Financial functions | Excel 2016 | Không | `#NAME? (RECEIVED)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| RRI | Financial functions | Excel 2016 | Không | `#NAME? (RRI)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| SLN | Financial functions | Excel 2016 | Có | `#VALUE!` | `=SLN(100000000, 10000000, 5)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `18000000` | `########` | MATCH |
| SYD | Financial functions | Excel 2016 | Không | `#NAME? (SYD)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| TBILLEQ | Financial functions | Excel 2016 | Không | `#NAME? (TBILLEQ)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| TBILLPRICE | Financial functions | Excel 2016 | Không | `#NAME? (TBILLPRICE)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| TBILLYIELD | Financial functions | Excel 2016 | Không | `#NAME? (TBILLYIELD)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| VDB | Financial functions | Excel 2016 | Không | `#NAME? (VDB)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| XIRR | Financial functions | Excel 2016 | Không | `#NAME? (XIRR)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| XNPV | Financial functions | Excel 2016 | Không | `#NAME? (XNPV)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| YIELD | Financial functions | Excel 2016 | Không | `#NAME? (YIELD)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| YIELDDISC | Financial functions | Excel 2016 | Không | `#NAME? (YIELDDISC)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| YIELDMAT | Financial functions | Excel 2016 | Không | `#NAME? (YIELDMAT)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |

### Lookup and reference functions

| ADDRESS | Lookup and reference functions | Excel 2016 | Có | `#VALUE!` | `=ADDRESS(1, 1, 1)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `$A$1` | `$A$1` | MATCH |
| AREAS | Lookup and reference functions | Excel 2016 | Không | `#NAME? (AREAS)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| CHOOSE | Lookup and reference functions | Excel 2016 | Có | `#VALUE!` | `=CHOOSE(2, "Nhất", "Nhì", "Ba")` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `Nhì` | `Nhì` | MATCH |
| CHOOSECOLS | Lookup and reference functions | Sau Excel 2016 (2024) | Không | `#NAME? (CHOOSECOLS)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| CHOOSEROWS | Lookup and reference functions | Sau Excel 2016 (2024) | Không | `#NAME? (CHOOSEROWS)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| COLUMN | Lookup and reference functions | Excel 2016 | Có | `1` | `=COLUMN(C1)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `3` | `3` | MATCH |
| COLUMNS | Lookup and reference functions | Excel 2016 | Có | `#VALUE!` | `=COLUMNS(A1:D10)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `4` | `4` | MATCH |
| DROP | Lookup and reference functions | Sau Excel 2016 (2024) | Không | `#NAME? (DROP)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| EXPAND | Lookup and reference functions | Sau Excel 2016 (2024) | Không | `#NAME? (EXPAND)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| FILTER | Lookup and reference functions | Sau Excel 2016 (2021) | Có | `#NAME? (FILTER)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Có metadata; COM NOT RUN |
| FORMULATEXT | Lookup and reference functions | Excel 2016 | Có | `#VALUE!` | `=_xlfn.FORMULATEXT(B2)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `=SUM(A1:A10)` | `=SUM(A1:A10)` | MATCH |
| GETPIVOTDATA | Lookup and reference functions | Excel 2016 | Không | `#NAME? (GETPIVOTDATA)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| GROUPBY | Lookup and reference functions | Excel 2016 | Không | `#NAME? (GROUPBY)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| HLOOKUP | Lookup and reference functions | Excel 2016 | Có | `#VALUE!` | `=HLOOKUP(A1, A1:Z5, 3, 0)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `2` | `2` | MATCH |
| HSTACK | Lookup and reference functions | Sau Excel 2016 (2024) | Không | `#NAME? (HSTACK)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| HYPERLINK | Lookup and reference functions | Excel 2016 | Có | `#VALUE!` | `=HYPERLINK("#A1", "Ô đầu tiên")` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `Ô đầu tiên` | `Ô đầu tiên` | MATCH |
| IMAGE | Lookup and reference functions | Sau Excel 2016 (2024) | Không | `#NAME? (IMAGE)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| INDEX | Lookup and reference functions | Excel 2016 | Có | `#VALUE!` | `=INDEX(A2:D20, 3, 2)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `123.46` | `123.46` | MATCH |
| INDIRECT | Lookup and reference functions | Excel 2016 | Có | `#VALUE!` | `=INDIRECT("A" & 5)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `4` | `4` | MATCH |
| LOOKUP | Lookup and reference functions | Excel 2016 | Có | `#VALUE!` | `=LOOKUP(8.5, A2:A10, A2:A10)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `5` | `5` | MATCH |
| MATCH | Lookup and reference functions | Excel 2016 | Có | `#VALUE!` | `=MATCH(A2, A2:A100, 0)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `1` | `1` | MATCH |
| OFFSET | Lookup and reference functions | Excel 2016 | Có | `#VALUE!` | `=OFFSET(A1, 2, 3, 1, 1)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `0.125` | `0.125` | MATCH |
| PIVOTBY | Lookup and reference functions | Excel 2016 | Không | `#NAME? (PIVOTBY)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| ROW | Lookup and reference functions | Excel 2016 | Có | `1` | `=ROW(A5)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `5` | `5` | MATCH |
| ROWS | Lookup and reference functions | Excel 2016 | Có | `#VALUE!` | `=ROWS(A1:D10)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `10` | `10` | MATCH |
| RTD | Lookup and reference functions | Excel 2016 | Không | `#NAME? (RTD)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| SORT | Lookup and reference functions | Sau Excel 2016 (2021) | Có | `#NAME? (SORT)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Có metadata; COM NOT RUN |
| SORTBY | Lookup and reference functions | Sau Excel 2016 (2021) | Không | `#NAME? (SORTBY)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| TAKE | Lookup and reference functions | Sau Excel 2016 (2024) | Không | `#NAME? (TAKE)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| TOCOL | Lookup and reference functions | Sau Excel 2016 (2024) | Không | `#NAME? (TOCOL)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| TOROW | Lookup and reference functions | Sau Excel 2016 (2024) | Không | `#NAME? (TOROW)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| TRANSPOSE | Lookup and reference functions | Excel 2016 | Có | `#NAME? (TRANSPOSE)` | `=TRANSPOSE(A1:A5)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `#NAME? (TRANSPOSE)` | `#VALUE!` | Scalar không tương đương CSE |
| TRIMRANGE | Lookup and reference functions | Excel 2016 | Không | `#NAME? (TRIMRANGE)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| UNIQUE | Lookup and reference functions | Sau Excel 2016 (2021) | Có | `#NAME? (UNIQUE)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Có metadata; COM NOT RUN |
| VLOOKUP | Lookup and reference functions | Excel 2016 | Có | `#VALUE!` | `=VLOOKUP(A2, A:C, 3, 0)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `1234.5` | `1234.5` | MATCH |
| VSTACK | Lookup and reference functions | Sau Excel 2016 (2024) | Không | `#NAME? (VSTACK)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| WRAPCOLS | Lookup and reference functions | Sau Excel 2016 (2024) | Không | `#NAME? (WRAPCOLS)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| WRAPROWS | Lookup and reference functions | Sau Excel 2016 (2024) | Không | `#NAME? (WRAPROWS)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| XLOOKUP | Lookup and reference functions | Sau Excel 2016 (2021) | Có | `#VALUE!` | `=XLOOKUP(A2, A:A, C:C, "Không thấy", 0)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `1234.5` | `#NAME?` | Ngoài Excel 2016 |
| XMATCH | Lookup and reference functions | Sau Excel 2016 (2021) | Không | `#NAME? (XMATCH)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |

### Logical functions

| AND | Logical functions | Excel 2016 | Có | `true` | `=AND(A2>0, A2<10)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `true` | `TRUE` | MATCH |
| BYCOL | Logical functions | Excel 2016 | Không | `#NAME? (BYCOL)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| BYROW | Logical functions | Sau Excel 2016 (2024) | Không | `#NAME? (BYROW)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| FALSE | Logical functions | Excel 2016 | Không | `#NAME? (FALSE)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| IF | Logical functions | Excel 2016 | Có | `false` | `=IF(A2>=5, "Đậu", "Hỏng")` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `Hỏng` | `Hỏng` | MATCH |
| IFERROR | Logical functions | Excel 2016 | Có | `#VALUE!` | `=IFERROR(VLOOKUP(A2, A:C, 2, 0), "")` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `115` | `115` | MATCH |
| IFNA | Logical functions | Excel 2016 | Có | `#VALUE!` | `=IFNA(VLOOKUP(A2, A:C, 2, 0), 0)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `115` | `115` | MATCH |
| IFS | Logical functions | Sau Excel 2016 (2019) | Có | `#VALUE!` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | NOT RUN |
| LAMBDA | Logical functions | Sau Excel 2016 (2024) | Không | `#NAME? (LAMBDA)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| LET | Logical functions | Sau Excel 2016 (2021) | Không | `#NAME? (LET)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| MAKEARRAY | Logical functions | Sau Excel 2016 (2024) | Không | `#NAME? (MAKEARRAY)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| MAP | Logical functions | Sau Excel 2016 (2024) | Không | `#NAME? (MAP)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| NOT | Logical functions | Excel 2016 | Có | `true` | `=NOT(ISBLANK(A1))` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `true` | `TRUE` | MATCH |
| OR | Logical functions | Excel 2016 | Có | `false` | `=OR(A2="Đậu", A2="Đặc cách")` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `false` | `FALSE` | MATCH |
| REDUCE | Logical functions | Sau Excel 2016 (2024) | Không | `#NAME? (REDUCE)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| SCAN | Logical functions | Sau Excel 2016 (2024) | Không | `#NAME? (SCAN)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| SWITCH | Logical functions | Sau Excel 2016 (2019) | Có | `#VALUE!` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | NOT RUN |
| TRUE | Logical functions | Excel 2016 | Không | `#NAME? (TRUE)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| XOR | Logical functions | Excel 2016 | Không | `#NAME? (XOR)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |

### Text functions

| ARRAYTOTEXT | Text functions | Sau Excel 2016 (2021) | Không | `#NAME? (ARRAYTOTEXT)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| ASC | Text functions | Excel 2016 | Không | `#NAME? (ASC)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| BAHTTEXT | Text functions | Excel 2016 | Không | `#NAME? (BAHTTEXT)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| CHAR | Text functions | Excel 2016 | Có | `#VALUE!` | `=CHAR(65)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `A` | `A` | MATCH |
| CLEAN | Text functions | Excel 2016 | Có | `` | `=CLEAN(A1)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `STT` | `STT` | MATCH |
| CODE | Text functions | Excel 2016 | Có | `#VALUE!` | `=CODE("A")` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `65` | `65` | MATCH |
| CONCAT | Text functions | Sau Excel 2016 (2019) | Có | `` | `=CONCAT(A1, " ", A1)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `STT STT` | `STT STT` | Ngoài Excel 2016 |
| CONCATENATE | Text functions | Excel 2016 | Có | `` | `=CONCATENATE(A1, "-", A1)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `STT-STT` | `STT-STT` | MATCH |
| DBCS | Text functions | Excel 2016 | Không | `#NAME? (DBCS)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| DETECTLANGUAGE | Text functions | Excel 2016 | Không | `#NAME? (DETECTLANGUAGE)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| DOLLAR | Text functions | Excel 2016 | Không | `#NAME? (DOLLAR)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| EXACT | Text functions | Excel 2016 | Có | `#VALUE!` | `=EXACT(A1, A1)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `true` | `TRUE` | MATCH |
| FIXED | Text functions | Excel 2016 | Không | `#NAME? (FIXED)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| LOWER | Text functions | Excel 2016 | Có | `` | `=LOWER(A1)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `stt` | `stt` | MATCH |
| NUMBERVALUE | Text functions | Excel 2016 | Không | `#NAME? (NUMBERVALUE)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| PHONETIC | Text functions | Excel 2016 | Không | `#NAME? (PHONETIC)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| PROPER | Text functions | Excel 2016 | Có | `#VALUE!` | `=PROPER("nguyễn văn an")` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `Nguyễn Văn An` | `Nguyễn Văn An` | MATCH |
| REGEXEXTRACT | Text functions | Excel 2016 | Không | `#NAME? (REGEXEXTRACT)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| REGEXREPLACE | Text functions | Excel 2016 | Không | `#NAME? (REGEXREPLACE)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| REGEXTEST | Text functions | Excel 2016 | Không | `#NAME? (REGEXTEST)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| REPT | Text functions | Excel 2016 | Có | `#VALUE!` | `=REPT("*", 5)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `*****` | `*****` | MATCH |
| SUBSTITUTE | Text functions | Excel 2016 | Có | `` | `=SUBSTITUTE(A1, "Hà Nội", "TP.HCM")` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `STT` | `STT` | MATCH |
| T | Text functions | Excel 2016 | Có | `` | `=T(A1)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `STT` | `STT` | MATCH |
| TEXT | Text functions | Excel 2016 | Có | `undefined` | `=TEXT(TODAY(), "dd/mm/yyyy")` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `13/10/2026` | `13/10/2026` | VOLATILE: không so sánh |
| TEXTAFTER | Text functions | Sau Excel 2016 (2024) | Không | `#NAME? (TEXTAFTER)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| TEXTBEFORE | Text functions | Sau Excel 2016 (2024) | Không | `#NAME? (TEXTBEFORE)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| TEXTJOIN | Text functions | Sau Excel 2016 (2019) | Có | `#VALUE!` | `=TEXTJOIN(", ", TRUE, A1:A5)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `STT, 1, 2, 3, 4` | `#NAME?` | Ngoài Excel 2016 |
| TEXTSPLIT | Text functions | Sau Excel 2016 (2024) | Không | `#NAME? (TEXTSPLIT)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| TRANSLATE | Text functions | Excel 2016 | Không | `#NAME? (TRANSLATE)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| TRIM | Text functions | Excel 2016 | Có | `` | `=TRIM(A1)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `STT` | `STT` | MATCH |
| UNICHAR | Text functions | Excel 2016 | Không | `#NAME? (UNICHAR)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| UNICODE | Text functions | Excel 2016 | Không | `#NAME? (UNICODE)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| UPPER | Text functions | Excel 2016 | Có | `` | `=UPPER(A1)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `STT` | `STT` | MATCH |
| VALUE | Text functions | Excel 2016 | Có | `#VALUE!` | `=VALUE("1250000")` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `1250000` | `1250000` | MATCH |
| VALUETOTEXT | Text functions | Sau Excel 2016 (2021) | Không | `#NAME? (VALUETOTEXT)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |

### Statistical functions

| AVEDEV | Statistical functions | Excel 2016 | Không | `#NAME? (AVEDEV)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| AVERAGE | Statistical functions | Excel 2016 | Có | `0` | `=AVERAGE(A1:A10)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `19.166666666666668` | `19.16667` | MATCH |
| AVERAGEA | Statistical functions | Excel 2016 | Không | `#NAME? (AVERAGEA)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| AVERAGEIF | Statistical functions | Excel 2016 | Có | `#VALUE!` | `=AVERAGEIF(A2:A20, "Phòng A", A2:A20)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `#DIV/0!` | `#DIV/0!` | MATCH |
| AVERAGEIFS | Statistical functions | Excel 2016 | Có | `#VALUE!` | `=AVERAGEIFS(D2:D50, A2:A50, "Nam", A2:A50, ">20")` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `#DIV/0!` | `#DIV/0!` | MATCH |
| BETA.DIST | Statistical functions | Excel 2016 | Không | `#NAME? (BETA.DIST)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| BETA.INV | Statistical functions | Excel 2016 | Không | `#NAME? (BETA.INV)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| BINOM.DIST | Statistical functions | Excel 2016 | Không | `#NAME? (BINOM.DIST)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| BINOM.DIST.RANGE | Statistical functions | Excel 2016 | Không | `#NAME? (BINOM.DIST.RANGE)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| BINOM.INV | Statistical functions | Excel 2016 | Không | `#NAME? (BINOM.INV)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| CHISQ.DIST | Statistical functions | Excel 2016 | Không | `#NAME? (CHISQ.DIST)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| CHISQ.DIST.RT | Statistical functions | Excel 2016 | Không | `#NAME? (CHISQ.DIST.RT)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| CHISQ.INV | Statistical functions | Excel 2016 | Không | `#NAME? (CHISQ.INV)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| CHISQ.INV.RT | Statistical functions | Excel 2016 | Không | `#NAME? (CHISQ.INV.RT)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| CHISQ.TEST | Statistical functions | Excel 2016 | Không | `#NAME? (CHISQ.TEST)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| CONFIDENCE.NORM | Statistical functions | Excel 2016 | Không | `#NAME? (CONFIDENCE.NORM)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| CONFIDENCE.T | Statistical functions | Excel 2016 | Không | `#NAME? (CONFIDENCE.T)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| CORREL | Statistical functions | Excel 2016 | Không | `#NAME? (CORREL)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| COUNT | Statistical functions | Excel 2016 | Có | `0` | `=COUNT(A1:A50)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `8` | `8` | MATCH |
| COUNTA | Statistical functions | Excel 2016 | Có | `0` | `=COUNTA(A1:A50)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `9` | `9` | MATCH |
| COUNTBLANK | Statistical functions | Excel 2016 | Có | `#VALUE!` | `=COUNTBLANK(D1:D20)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `14` | `14` | MATCH |
| COUNTIF | Statistical functions | Excel 2016 | Có | `1` | `=COUNTIF(A2:A20, ">50")` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `3` | `3` | MATCH |
| COUNTIFS | Statistical functions | Excel 2016 | Có | `#VALUE!` | `=COUNTIFS(A2:A50, "Nam", A2:A50, ">18")` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `0` | `0` | MATCH |
| COVARIANCE.P | Statistical functions | Excel 2016 | Không | `#NAME? (COVARIANCE.P)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| COVARIANCE.S | Statistical functions | Excel 2016 | Không | `#NAME? (COVARIANCE.S)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| DEVSQ | Statistical functions | Excel 2016 | Không | `#NAME? (DEVSQ)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| EXPON.DIST | Statistical functions | Excel 2016 | Không | `#NAME? (EXPON.DIST)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| F.DIST | Statistical functions | Excel 2016 | Không | `#NAME? (F.DIST)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| F.DIST.RT | Statistical functions | Excel 2016 | Không | `#NAME? (F.DIST.RT)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| F.INV | Statistical functions | Excel 2016 | Không | `#NAME? (F.INV)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| F.INV.RT | Statistical functions | Excel 2016 | Không | `#NAME? (F.INV.RT)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| F.TEST | Statistical functions | Excel 2016 | Không | `#NAME? (F.TEST)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| FISHER | Statistical functions | Excel 2016 | Không | `#NAME? (FISHER)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| FISHERINV | Statistical functions | Excel 2016 | Không | `#NAME? (FISHERINV)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| FORECAST | Statistical functions | Excel 2016 | Không | `#NAME? (FORECAST)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| FORECAST.ETS | Statistical functions | Excel 2016 | Không | `#NAME? (FORECAST.ETS)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| FORECAST.ETS.CONFINT | Statistical functions | Excel 2016 | Không | `#NAME? (FORECAST.ETS.CONFINT)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| FORECAST.ETS.SEASONALITY | Statistical functions | Excel 2016 | Không | `#NAME? (FORECAST.ETS.SEASONALITY)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| FORECAST.ETS.STAT | Statistical functions | Excel 2016 | Không | `#NAME? (FORECAST.ETS.STAT)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| FORECAST.LINEAR | Statistical functions | Excel 2016 | Không | `#NAME? (FORECAST.LINEAR)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| FREQUENCY | Statistical functions | Excel 2016 | Không | `#NAME? (FREQUENCY)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| GAMMA | Statistical functions | Excel 2016 | Không | `#NAME? (GAMMA)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| GAMMA.DIST | Statistical functions | Excel 2016 | Không | `#NAME? (GAMMA.DIST)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| GAMMA.INV | Statistical functions | Excel 2016 | Không | `#NAME? (GAMMA.INV)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| GAMMALN | Statistical functions | Excel 2016 | Không | `#NAME? (GAMMALN)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| GAMMALN.PRECISE | Statistical functions | Excel 2016 | Không | `#NAME? (GAMMALN.PRECISE)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| GAUSS | Statistical functions | Excel 2016 | Không | `#NAME? (GAUSS)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| GEOMEAN | Statistical functions | Excel 2016 | Không | `#NAME? (GEOMEAN)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| GROWTH | Statistical functions | Excel 2016 | Không | `#NAME? (GROWTH)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| HARMEAN | Statistical functions | Excel 2016 | Không | `#NAME? (HARMEAN)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| HYPGEOM.DIST | Statistical functions | Excel 2016 | Không | `#NAME? (HYPGEOM.DIST)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| INTERCEPT | Statistical functions | Excel 2016 | Không | `#NAME? (INTERCEPT)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| KURT | Statistical functions | Excel 2016 | Không | `#NAME? (KURT)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| LARGE | Statistical functions | Excel 2016 | Có | `#VALUE!` | `=LARGE(A1:A50, 2)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `200` | `200` | MATCH |
| LINEST | Statistical functions | Excel 2016 | Không | `#NAME? (LINEST)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| LOGEST | Statistical functions | Excel 2016 | Không | `#NAME? (LOGEST)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| LOGNORM.DIST | Statistical functions | Excel 2016 | Không | `#NAME? (LOGNORM.DIST)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| LOGNORM.INV | Statistical functions | Excel 2016 | Không | `#NAME? (LOGNORM.INV)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| MAX | Statistical functions | Excel 2016 | Có | `0` | `=MAX(A1:A20)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `300` | `300` | MATCH |
| MAXA | Statistical functions | Excel 2016 | Không | `#NAME? (MAXA)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| MAXIFS | Statistical functions | Sau Excel 2016 (2019) | Không | `#NAME? (MAXIFS)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| MEDIAN | Statistical functions | Excel 2016 | Có | `#NUM!` | `=MEDIAN(A1:A15)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `4.5` | `4.5` | MATCH |
| MIN | Statistical functions | Excel 2016 | Có | `0` | `=MIN(A1:A20)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `1` | `1` | MATCH |
| MINA | Statistical functions | Excel 2016 | Không | `#NAME? (MINA)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| MINIFS | Statistical functions | Sau Excel 2016 (2019) | Không | `#NAME? (MINIFS)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| MODE.MULT | Statistical functions | Excel 2016 | Không | `#NAME? (MODE.MULT)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| MODE.SNGL | Statistical functions | Excel 2016 | Không | `#NAME? (MODE.SNGL)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| NEGBINOM.DIST | Statistical functions | Excel 2016 | Không | `#NAME? (NEGBINOM.DIST)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| NORM.DIST | Statistical functions | Excel 2016 | Không | `#NAME? (NORM.DIST)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| NORM.INV | Statistical functions | Excel 2016 | Không | `#NAME? (NORM.INV)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| NORM.S.DIST | Statistical functions | Excel 2016 | Không | `#NAME? (NORM.S.DIST)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| NORM.S.INV | Statistical functions | Excel 2016 | Không | `#NAME? (NORM.S.INV)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| PEARSON | Statistical functions | Excel 2016 | Không | `#NAME? (PEARSON)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| PERCENTILE.EXC | Statistical functions | Excel 2016 | Không | `#NAME? (PERCENTILE.EXC)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| PERCENTILE.INC | Statistical functions | Excel 2016 | Không | `#NAME? (PERCENTILE.INC)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| PERCENTRANK.EXC | Statistical functions | Excel 2016 | Không | `#NAME? (PERCENTRANK.EXC)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| PERCENTRANK.INC | Statistical functions | Excel 2016 | Không | `#NAME? (PERCENTRANK.INC)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| PERMUT | Statistical functions | Excel 2016 | Không | `#NAME? (PERMUT)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| PERMUTATIONA | Statistical functions | Excel 2016 | Không | `#NAME? (PERMUTATIONA)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| PHI | Statistical functions | Excel 2016 | Không | `#NAME? (PHI)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| POISSON.DIST | Statistical functions | Excel 2016 | Không | `#NAME? (POISSON.DIST)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| PROB | Statistical functions | Excel 2016 | Không | `#NAME? (PROB)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| QUARTILE.EXC | Statistical functions | Excel 2016 | Không | `#NAME? (QUARTILE.EXC)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| QUARTILE.INC | Statistical functions | Excel 2016 | Không | `#NAME? (QUARTILE.INC)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| RANK.AVG | Statistical functions | Excel 2016 | Không | `#NAME? (RANK.AVG)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| RANK.EQ | Statistical functions | Excel 2016 | Có | `#VALUE!` | `=_xlfn.RANK.EQ(A2, $A$2:$A$50, 0)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `8` | `8` | MATCH |
| RSQ | Statistical functions | Excel 2016 | Không | `#NAME? (RSQ)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| SKEW | Statistical functions | Excel 2016 | Không | `#NAME? (SKEW)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| SKEW.P | Statistical functions | Excel 2016 | Không | `#NAME? (SKEW.P)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| SLOPE | Statistical functions | Excel 2016 | Không | `#NAME? (SLOPE)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| SMALL | Statistical functions | Excel 2016 | Có | `#VALUE!` | `=SMALL(A1:A50, 1)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `1` | `1` | MATCH |
| STANDARDIZE | Statistical functions | Excel 2016 | Không | `#NAME? (STANDARDIZE)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| STDEV.P | Statistical functions | Excel 2016 | Không | `#NAME? (STDEV.P)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| STDEV.S | Statistical functions | Excel 2016 | Không | `#NAME? (STDEV.S)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| STDEVA | Statistical functions | Excel 2016 | Không | `#NAME? (STDEVA)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| STDEVPA | Statistical functions | Excel 2016 | Không | `#NAME? (STDEVPA)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| STEYX | Statistical functions | Excel 2016 | Không | `#NAME? (STEYX)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| T.DIST | Statistical functions | Excel 2016 | Không | `#NAME? (T.DIST)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| T.DIST.2T | Statistical functions | Excel 2016 | Không | `#NAME? (T.DIST.2T)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| T.DIST.RT | Statistical functions | Excel 2016 | Không | `#NAME? (T.DIST.RT)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| T.INV | Statistical functions | Excel 2016 | Không | `#NAME? (T.INV)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| T.INV.2T | Statistical functions | Excel 2016 | Không | `#NAME? (T.INV.2T)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| T.TEST | Statistical functions | Excel 2016 | Không | `#NAME? (T.TEST)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| TREND | Statistical functions | Excel 2016 | Không | `#NAME? (TREND)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| TRIMMEAN | Statistical functions | Excel 2016 | Không | `#NAME? (TRIMMEAN)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| VAR.P | Statistical functions | Excel 2016 | Không | `#NAME? (VAR.P)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| VAR.S | Statistical functions | Excel 2016 | Không | `#NAME? (VAR.S)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| VARA | Statistical functions | Excel 2016 | Không | `#NAME? (VARA)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| VARPA | Statistical functions | Excel 2016 | Không | `#NAME? (VARPA)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| WEIBULL.DIST | Statistical functions | Excel 2016 | Không | `#NAME? (WEIBULL.DIST)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| Z.TEST | Statistical functions | Excel 2016 | Không | `#NAME? (Z.TEST)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |

### Engineering functions

| BESSELI | Engineering functions | Excel 2016 | Không | `#NAME? (BESSELI)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| BESSELJ | Engineering functions | Excel 2016 | Không | `#NAME? (BESSELJ)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| BESSELK | Engineering functions | Excel 2016 | Không | `#NAME? (BESSELK)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| BESSELY | Engineering functions | Excel 2016 | Không | `#NAME? (BESSELY)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| BIN2DEC | Engineering functions | Excel 2016 | Không | `#NAME? (BIN2DEC)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| BIN2HEX | Engineering functions | Excel 2016 | Không | `#NAME? (BIN2HEX)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| BIN2OCT | Engineering functions | Excel 2016 | Không | `#NAME? (BIN2OCT)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| BITAND | Engineering functions | Excel 2016 | Không | `#NAME? (BITAND)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| BITLSHIFT | Engineering functions | Excel 2016 | Không | `#NAME? (BITLSHIFT)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| BITOR | Engineering functions | Excel 2016 | Không | `#NAME? (BITOR)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| BITRSHIFT | Engineering functions | Excel 2016 | Không | `#NAME? (BITRSHIFT)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| BITXOR | Engineering functions | Excel 2016 | Không | `#NAME? (BITXOR)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| COMPLEX | Engineering functions | Excel 2016 | Không | `#NAME? (COMPLEX)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| CONVERT | Engineering functions | Excel 2016 | Không | `#NAME? (CONVERT)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| DEC2BIN | Engineering functions | Excel 2016 | Không | `#NAME? (DEC2BIN)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| DEC2HEX | Engineering functions | Excel 2016 | Không | `#NAME? (DEC2HEX)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| DEC2OCT | Engineering functions | Excel 2016 | Không | `#NAME? (DEC2OCT)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| DELTA | Engineering functions | Excel 2016 | Không | `#NAME? (DELTA)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| ERF | Engineering functions | Excel 2016 | Không | `#NAME? (ERF)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| ERF.PRECISE | Engineering functions | Excel 2016 | Không | `#NAME? (ERF.PRECISE)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| ERFC | Engineering functions | Excel 2016 | Không | `#NAME? (ERFC)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| ERFC.PRECISE | Engineering functions | Excel 2016 | Không | `#NAME? (ERFC.PRECISE)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| GESTEP | Engineering functions | Excel 2016 | Không | `#NAME? (GESTEP)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| HEX2BIN | Engineering functions | Excel 2016 | Không | `#NAME? (HEX2BIN)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| HEX2DEC | Engineering functions | Excel 2016 | Không | `#NAME? (HEX2DEC)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| HEX2OCT | Engineering functions | Excel 2016 | Không | `#NAME? (HEX2OCT)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| IMABS | Engineering functions | Excel 2016 | Không | `#NAME? (IMABS)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| IMAGINARY | Engineering functions | Excel 2016 | Không | `#NAME? (IMAGINARY)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| IMARGUMENT | Engineering functions | Excel 2016 | Không | `#NAME? (IMARGUMENT)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| IMCONJUGATE | Engineering functions | Excel 2016 | Không | `#NAME? (IMCONJUGATE)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| IMCOS | Engineering functions | Excel 2016 | Không | `#NAME? (IMCOS)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| IMCOSH | Engineering functions | Excel 2016 | Không | `#NAME? (IMCOSH)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| IMCOT | Engineering functions | Excel 2016 | Không | `#NAME? (IMCOT)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| IMCSC | Engineering functions | Excel 2016 | Không | `#NAME? (IMCSC)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| IMCSCH | Engineering functions | Excel 2016 | Không | `#NAME? (IMCSCH)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| IMDIV | Engineering functions | Excel 2016 | Không | `#NAME? (IMDIV)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| IMEXP | Engineering functions | Excel 2016 | Không | `#NAME? (IMEXP)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| IMLN | Engineering functions | Excel 2016 | Không | `#NAME? (IMLN)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| IMLOG10 | Engineering functions | Excel 2016 | Không | `#NAME? (IMLOG10)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| IMLOG2 | Engineering functions | Excel 2016 | Không | `#NAME? (IMLOG2)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| IMPOWER | Engineering functions | Excel 2016 | Không | `#NAME? (IMPOWER)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| IMPRODUCT | Engineering functions | Excel 2016 | Không | `#NAME? (IMPRODUCT)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| IMREAL | Engineering functions | Excel 2016 | Không | `#NAME? (IMREAL)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| IMSEC | Engineering functions | Excel 2016 | Không | `#NAME? (IMSEC)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| IMSECH | Engineering functions | Excel 2016 | Không | `#NAME? (IMSECH)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| IMSIN | Engineering functions | Excel 2016 | Không | `#NAME? (IMSIN)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| IMSINH | Engineering functions | Excel 2016 | Không | `#NAME? (IMSINH)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| IMSQRT | Engineering functions | Excel 2016 | Không | `#NAME? (IMSQRT)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| IMSUB | Engineering functions | Excel 2016 | Không | `#NAME? (IMSUB)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| IMSUM | Engineering functions | Excel 2016 | Không | `#NAME? (IMSUM)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| IMTAN | Engineering functions | Excel 2016 | Không | `#NAME? (IMTAN)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| OCT2BIN | Engineering functions | Excel 2016 | Không | `#NAME? (OCT2BIN)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| OCT2DEC | Engineering functions | Excel 2016 | Không | `#NAME? (OCT2DEC)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| OCT2HEX | Engineering functions | Excel 2016 | Không | `#NAME? (OCT2HEX)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |

### Information functions

| CELL | Information functions | Excel 2016 | Không | `#NAME? (CELL)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| ERROR.TYPE | Information functions | Excel 2016 | Không | `#NAME? (ERROR.TYPE)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| INFO | Information functions | Excel 2016 | Không | `#NAME? (INFO)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| ISBLANK | Information functions | Excel 2016 | Có | `#VALUE!` | `=ISBLANK(A1)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `false` | `FALSE` | MATCH |
| ISERR | Information functions | Excel 2016 | Không | `#NAME? (ISERR)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| ISERROR | Information functions | Excel 2016 | Có | `#VALUE!` | `=ISERROR(1/0)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `true` | `TRUE` | MATCH |
| ISEVEN | Information functions | Excel 2016 | Không | `#NAME? (ISEVEN)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| ISFORMULA | Information functions | Excel 2016 | Có | `false` | `=ISFORMULA(C5)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `false` | `FALSE` | MATCH |
| ISLOGICAL | Information functions | Excel 2016 | Có | `false` | `=ISLOGICAL(A1)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `false` | `FALSE` | MATCH |
| ISNA | Information functions | Excel 2016 | Có | `#VALUE!` | `=ISNA(NA())` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `true` | `TRUE` | MATCH |
| ISNONTEXT | Information functions | Excel 2016 | Có | `true` | `=ISNONTEXT(A1)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `false` | `FALSE` | MATCH |
| ISNUMBER | Information functions | Excel 2016 | Có | `#VALUE!` | `=ISNUMBER(A2)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `true` | `TRUE` | MATCH |
| ISODD | Information functions | Excel 2016 | Không | `#NAME? (ISODD)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| ISOMITTED | Information functions | Sau Excel 2016 (2024) | Không | `#NAME? (ISOMITTED)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| ISREF | Information functions | Excel 2016 | Không | `#NAME? (ISREF)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| ISTEXT | Information functions | Excel 2016 | Có | `#VALUE!` | `=ISTEXT(C3)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `false` | `FALSE` | MATCH |
| N | Information functions | Excel 2016 | Có | `0` | `=N(A1)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `0` | `0` | MATCH |
| NA | Information functions | Excel 2016 | Có | `#N/A` | `=NA()` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `#N/A` | `#N/A` | MATCH |
| SHEET | Information functions | Excel 2016 | Không | `#NAME? (SHEET)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| SHEETS | Information functions | Excel 2016 | Không | `#NAME? (SHEETS)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| STOCKHISTORY | Information functions | Excel 2016 | Không | `#NAME? (STOCKHISTORY)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| TYPE | Information functions | Excel 2016 | Không | `#NAME? (TYPE)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |

### Cubes

| CUBEKPIMEMBER | Cubes | Excel 2016 | Không | `#NAME? (CUBEKPIMEMBER)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| CUBEMEMBER | Cubes | Excel 2016 | Không | `#NAME? (CUBEMEMBER)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| CUBEMEMBERPROPERTY | Cubes | Excel 2016 | Không | `#NAME? (CUBEMEMBERPROPERTY)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| CUBERANKEDMEMBER | Cubes | Excel 2016 | Không | `#NAME? (CUBERANKEDMEMBER)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| CUBESET | Cubes | Excel 2016 | Không | `#NAME? (CUBESET)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| CUBESETCOUNT | Cubes | Excel 2016 | Không | `#NAME? (CUBESETCOUNT)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| CUBEVALUE | Cubes | Excel 2016 | Không | `#NAME? (CUBEVALUE)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |

### Date and time functions

| DATE | Date and time functions | Excel 2016 | Có | `#VALUE!` | `=DATE(2026, 10, 3)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `46298` | `########` | MATCH |
| DATEDIF | Date and time functions | Excel 2016 | Có | `#NUM!` | `=DATEDIF(A1, TODAY(), "Y")` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `#NUM!` | `#VALUE!` | VOLATILE: không so sánh |
| DATEVALUE | Date and time functions | Excel 2016 | Không | `#NAME? (DATEVALUE)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| DAY | Date and time functions | Excel 2016 | Có | `#VALUE!` | `=DAY(TODAY())` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `13` | `13` | VOLATILE: không so sánh |
| DAYS | Date and time functions | Excel 2016 | Có | `#VALUE!` | `=DAYS(A1, A1)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `#VALUE!` | `#VALUE!` | MATCH |
| DAYS360 | Date and time functions | Excel 2016 | Không | `#NAME? (DAYS360)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| EDATE | Date and time functions | Excel 2016 | Có | `#VALUE!` | `=EDATE(TODAY(), 3)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `46400` | `########` | VOLATILE: không so sánh |
| EOMONTH | Date and time functions | Excel 2016 | Có | `#VALUE!` | `=EOMONTH(TODAY(), 0)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `46326` | `########` | VOLATILE: không so sánh |
| HOUR | Date and time functions | Excel 2016 | Có | `0` | `=HOUR(NOW())` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `1` | `1` | VOLATILE: không so sánh |
| ISOWEEKNUM | Date and time functions | Excel 2016 | Không | `#NAME? (ISOWEEKNUM)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| MINUTE | Date and time functions | Excel 2016 | Có | `0` | `=MINUTE(NOW())` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `18` | `18` | VOLATILE: không so sánh |
| MONTH | Date and time functions | Excel 2016 | Có | `#VALUE!` | `=MONTH(TODAY())` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `10` | `10` | VOLATILE: không so sánh |
| NETWORKDAYS | Date and time functions | Excel 2016 | Có | `#VALUE!` | `=NETWORKDAYS(A1, A1, C1:C10)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `#VALUE!` | `#VALUE!` | MATCH |
| NETWORKDAYS.INTL | Date and time functions | Excel 2016 | Không | `#NAME? (NETWORKDAYS.INTL)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| NOW | Date and time functions | Excel 2016 | Có | `46308.07056712963` | `=NOW()` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `46308.053611111114` | `########` | VOLATILE: không so sánh |
| SECOND | Date and time functions | Excel 2016 | Có | `0` | `=SECOND(NOW())` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `35` | `50` | VOLATILE: không so sánh |
| TIME | Date and time functions | Excel 2016 | Có | `#VALUE!` | `=TIME(14, 30, 0)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `0.6041666666666666` | `14:30:00` | MATCH |
| TIMEVALUE | Date and time functions | Excel 2016 | Không | `#NAME? (TIMEVALUE)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| TODAY | Date and time functions | Excel 2016 | Có | `46308` | `=TODAY()` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `46308` | `########` | VOLATILE: không so sánh |
| WEEKDAY | Date and time functions | Excel 2016 | Có | `#VALUE!` | `=WEEKDAY(TODAY(), 2)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `2` | `2` | VOLATILE: không so sánh |
| WEEKNUM | Date and time functions | Excel 2016 | Không | `#NAME? (WEEKNUM)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| WORKDAY | Date and time functions | Excel 2016 | Có | `#VALUE!` | `=WORKDAY(A1, 10, C1:C5)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `#VALUE!` | `#VALUE!` | MATCH |
| WORKDAY.INTL | Date and time functions | Excel 2016 | Không | `#NAME? (WORKDAY.INTL)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| YEAR | Date and time functions | Excel 2016 | Có | `#VALUE!` | `=YEAR(TODAY())` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `2026` | `2026` | VOLATILE: không so sánh |
| YEARFRAC | Date and time functions | Excel 2016 | Có | `#VALUE!` | `=YEARFRAC(A1, A1, 1)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `#VALUE!` | `#VALUE!` | MATCH |

### Database functions

| DAVERAGE | Database functions | Excel 2016 | Không | `#NAME? (DAVERAGE)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| DCOUNT | Database functions | Excel 2016 | Không | `#NAME? (DCOUNT)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| DCOUNTA | Database functions | Excel 2016 | Không | `#NAME? (DCOUNTA)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| DGET | Database functions | Excel 2016 | Không | `#NAME? (DGET)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| DMAX | Database functions | Excel 2016 | Không | `#NAME? (DMAX)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| DMIN | Database functions | Excel 2016 | Không | `#NAME? (DMIN)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| DPRODUCT | Database functions | Excel 2016 | Không | `#NAME? (DPRODUCT)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| DSTDEV | Database functions | Excel 2016 | Không | `#NAME? (DSTDEV)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| DSTDEVP | Database functions | Excel 2016 | Không | `#NAME? (DSTDEVP)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| DSUM | Database functions | Excel 2016 | Không | `#NAME? (DSUM)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| DVAR | Database functions | Excel 2016 | Không | `#NAME? (DVAR)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |
| DVARP | Database functions | Excel 2016 | Không | `#NAME? (DVARP)` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | Chưa nhận dạng; COM NOT RUN |

### Thống kê

| RANK | Thống kê | Hàm VN | Có | `#VALUE!` | `=RANK(A2, $A$2:$A$50, 0)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `8` | `8` | MATCH |
| STDEV | Thống kê | Hàm VN | Có | `#DIV/0!` | `=STDEV(A1:A30)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `115.12531991579561` | `115.1253` | MATCH |
| VAR | Thống kê | Hàm VN | Có | `#DIV/0!` | `=VAR(A1:A30)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `13253.839285714286` | `13253.84` | MATCH |
| MODE | Thống kê | Hàm VN | Có | `#N/A` | `=MODE(A1:A50)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `#N/A` | `#N/A` | MATCH |
| PERCENTILE | Thống kê | Hàm VN | Có | `#NUM!` | `=PERCENTILE(A1:A100, 0.9)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `229.99999999999997` | `230` | MATCH |

### Văn bản

| LEN | Văn bản | Hàm VN | Có | `0` | `=LEN(A1)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `3` | `3` | MATCH |
| LEFT | Văn bản | Hàm VN | Có | `` | `=LEFT(A1, 3)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `STT` | `STT` | MATCH |
| RIGHT | Văn bản | Hàm VN | Có | `` | `=RIGHT(A1, 4)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `STT` | `STT` | MATCH |
| FIND | Văn bản | Hàm VN | Có | `1` | `=FIND("A", A1, 1)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `#VALUE!` | `#VALUE!` | MATCH |
| MID | Văn bản | Hàm VN | Có | `#VALUE!` | `=MID(A1, 2, 5)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `TT` | `TT` | MATCH |
| SEARCH | Văn bản | Hàm VN | Có | `#VALUE!` | `=SEARCH("abc", A1)` | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | `#VALUE!` | `#VALUE!` | MATCH |

### Tài chính

| VND | Tài chính | Hàm VN | Có | `#VALUE!` | — | NOT RUN | NOT RUN | NOT RUN | NOT RUN | NOT RUN | — | — | NOT RUN |

## Sai lệch đã xác nhận

- Chưa có sai lệch trong các ca COM thuộc Excel 2016.
## Phạm vi chưa hoàn tất

- Còn 337 hàm trong danh mục nguồn chưa có ca COM.
- Nhiều ca dùng cách gọi rỗng để kiểm tra nhận dạng; các hàm cần đối số, vùng dữ liệu, workbook ngoài hoặc mảng vẫn cần ca có đối số tương ứng.
- Các hàm dynamic array mới hơn Excel 2016 được liệt kê để phân biệt, không chấm là lệch E1.
- Hàm riêng VND không thuộc danh mục Excel và không gửi vào workbook oracle.
