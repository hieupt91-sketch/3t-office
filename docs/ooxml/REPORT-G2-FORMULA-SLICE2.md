# G2 — Engine công thức, slice 2 (mở rộng bộ hàm)

Nhánh: `claude/ooxml-g2-formula-slice2` (base `claude/ooxml-g2-formula-engine`). Không mở PR, không đẩy vào vn-main.

## Đã làm (chỉ trong `ports/ios/OOXMLKit/Sources/OOXMLSpreadsheet/Formula/` + 1 file test mới)
- **Mới:** `FormulaFunctionsSlice2.swift` (các hàm), `FormulaDate.swift` (serial ngày Excel 1900), `FormulaTextSupport.swift` (ký tự đại diện `? * ~`, tiêu chí COUNTIF/SUMIF, định dạng TEXT).
- **Sửa nhỏ file slice-1:** `FormulaEvaluator.swift` (bỏ `private` ở eval/scalar/number/bool/flatten để extension dùng; `default` của `callScalar` chuyển sang `callSlice2`; `call` thử `callReference` trước; thêm `nowSerial` vào `FormulaContext`), `FormulaEngine.swift` (thêm `clock` và `timeZone` công khai để TODAY/NOW tất định khi test).

## Hàm (mọi hàm sai số đối số → `#VALUE!`, lỗi trong đối số lan truyền nguyên vẹn)
- Tra cứu: VLOOKUP, HLOOKUP (xấp xỉ + chính xác, ký tự đại diện cho văn bản), MATCH (0/1/-1), INDEX (trả **tham chiếu** → `SUM(INDEX(A1:C4,0,1))` chạy, đồ thị phụ thuộc thấy vùng), CHOOSE (tính lười, trả tham chiếu).
- Văn bản: LEFT, RIGHT, MID, LEN, FIND, SEARCH, UPPER, LOWER, TRIM, SUBSTITUTE, REPLACE, TEXT, VALUE, CONCAT, TEXTJOIN.
- Ngày giờ: serial 1900 kèm bug năm nhuận (serial 60 = 29/02/1900; serial 0 = "1900-01-00"), DATE, YEAR, MONTH, DAY, TODAY, NOW, EDATE, EOMONTH, DATEDIF (Y M D YM MD YD).
- Điều kiện/thống kê: SUMIF, COUNTIF, AVERAGEIF, SUMIFS, COUNTIFS.
- Toán: ROUNDUP, ROUNDDOWN (trên biểu diễn 15 chữ số, như ROUND slice-1), INT, MOD, POWER, SQRT.
- Logic: IFERROR, IFNA, IFS, SWITCH (tính lười).
- Lỗi: `#N/A` (MATCH/VLOOKUP/HLOOKUP không thấy, IFS/SWITCH không khớp), `#VALUE!`, `#REF!` (cột/chỉ số ngoài vùng, sheet lạ), `#DIV/0!`, `#NUM!`, `#NAME?` (hàm chưa biết).

## Test (chạy thật)
Swift 6.0.3 Linux x86_64: `cd ports/ios/OOXMLKit && swift test -c release -Xswiftc -enable-testing`
**191/191 PASS, 0 failures** (166 cũ + 25 test mới trong `Tests/OOXMLSpreadsheetTests/FormulaFunctionsSlice2Tests.swift`, 369 assertion với hằng số tính tay: serial 45306 = 15/01/2024, 36526 = 1/1/2000, 25569 = 1/1/1970…). `OfflineGuaranteeTests` vẫn PASS. Chưa chạy debug/macOS/iOS/CI.
Trung thực: lần chạy đầu có lỗi thật trong code (ROUNDUP/DOWN ra 3.1399999999999997 do chuyển Decimal→Double; SUMIFS/COUNTIFS crash do mặt nạ chưa khởi tạo) — đã sửa **code**; 4 assert sai do test (gõ nhầm kỳ vọng 44985 thay 44926, hai chuỗi TEXT dùng `\"` thay `""`, một ô lỗi lại thực sự được khớp, một assert tautology) — đã sửa test cho đúng ý đồ, không nới kết quả code.

## Giới hạn
- **Array formula (mục 5) chưa làm**; vùng nhiều ô ở ngữ cảnh đơn vẫn `#VALUE!`. Không có SUMPRODUCT/XLOOKUP/LET.
- Tham số bỏ trống (`F(a,,b)`) chưa được parser hỗ trợ; tham chiếu cả cột/hàng (`A:A`) chưa có.
- VLOOKUP/MATCH xấp xỉ quét tuyến tính đến phần tử đầu tiên vượt khóa (trùng Excel với dữ liệu đã sắp xếp; dữ liệu chưa sắp xếp có thể khác Excel nhị phân).
- TEXT: số (`0 # , . %`, nhiều section `;`, literal), ngày giờ (`yyyy yy mmmm mmm mm m dddd ddd dd d hh h mm ss AM/PM`) bằng **tên tiếng Anh**; chưa có ký hiệu khoa học, `[h]`, màu `[Red]`, điều kiện `[>100]`, locale Việt.
- Ngày: ISO `yyyy-mm-dd`/`yyyy/mm/dd` (+ giờ) mới được nhận khi ép chuỗi; không hỗ trợ `dd/mm/yyyy` (phụ thuộc locale). Ngày < 1900 → `#NUM!`; dùng 1900 date system (chưa 1904). DATEDIF "MD" dùng quy tắc ngày của tháng liền trước (Excel có lỗi riêng ở đây). Ngày trong tháng 1–2/1900 tuân bug Excel nhưng chưa đối chiếu toàn bộ.
- LEN/MID… đếm theo unicode scalar (≡ UTF-16 với ký tự BMP; emoji ngoài BMP có thể khác Excel).
- POWER(0,-1) trả `#DIV/0!` (đúng Excel) trong khi toán tử `^` slice-1 trả `#NUM!` — chưa thống nhất.
- Chưa đối chiếu Excel thật (việc G0/parity).
