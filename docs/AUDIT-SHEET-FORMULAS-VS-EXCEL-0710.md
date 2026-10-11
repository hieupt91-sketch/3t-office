# Audit VN Sheet formulas vs Microsoft Excel — 07/10/2026

Phạm vi: 86 phép thử, mỗi dòng có một công thức đích; VN Sheet chạy bằng app desktop thật qua CDP và Excel (Excel COM khong dung duoc tren may nay - doi chieu voi ket qua Excel da biet) chạy bằng COM. Không dùng SendKeys/OS input, không gọi pywebview evaluate_js và không sửa mã sản phẩm.

Lệnh đã chạy: `node --experimental-websocket scripts/audit-0610/sheet_formulas_vs_excel.mjs --report docs/AUDIT-SHEET-FORMULAS-VS-EXCEL-0710.md`. Giá trị số so sánh với sai số `max(1e-10, |Excel|*1e-12)`; text/boolean/lỗi so sánh đúng kiểu và đúng giá trị. DATE được so theo kiểu kết quả thô (Excel Value2), không đổi kỳ vọng để làm xanh.

| # | Nhóm | Phép thử | Công thức | Kết quả app | Kết quả Excel | Trạng thái | Nguyên nhân nếu FAIL |
|---:|---|---|---|---|---|---|---|
| 1 | SUMIFS | mot dieu kien van ban | `=SUMIFS(D1:D6,A1:A6,"North")` | =SUMIFS(D1:D6,A1:A6,"North") => 800 | 800 | PASS | — |
| 2 | SUMIFS | hai dieu kien | `=SUMIFS(D1:D6,A1:A6,"North",B1:B6,"Pen")` | =SUMIFS(D1:D6,A1:A6,"North",B1:B6,"Pen") => 600 | 600 | PASS | — |
| 3 | SUMIFS | wildcard dau sao | `=SUMIFS(D1:D6,B1:B6,"Pen*")` | =SUMIFS(D1:D6,B1:B6,"Pen*") => 1700 | 1700 | PASS | — |
| 4 | SUMIFS | wildcard dau hoi | `=SUMIFS(D1:D6,B1:B6,"Pe?")` | =SUMIFS(D1:D6,B1:B6,"Pe?") => 900 | 900 | PASS | — |
| 5 | SUMIFS | so sanh lon hon bang | `=SUMIFS(D1:D6,C1:C6,">=20")` | =SUMIFS(D1:D6,C1:C6,">=20") => 1500 | 1500 | PASS | — |
| 6 | SUMIFS | so sanh nho hon | `=SUMIFS(D1:D6,C1:C6,"<20")` | =SUMIFS(D1:D6,C1:C6,"<20") => 600 | 600 | PASS | — |
| 7 | SUMIFS | ket hop wildcard va so sanh | `=SUMIFS(D1:D6,B1:B6,"Pen*",C1:C6,">10")` | =SUMIFS(D1:D6,B1:B6,"Pen*",C1:C6,">10") => 1400 | 1400 | PASS | — |
| 8 | SUMIFS | khong co dong phu hop | `=SUMIFS(D1:D6,A1:A6,"East")` | =SUMIFS(D1:D6,A1:A6,"East") => 0 | 0 | PASS | — |
| 9 | SUMIFS | sum range ngan hon criteria range | `=SUMIFS(D1:D5,A1:A6,"North")` | =SUMIFS(D1:D5,A1:A6,"North") => 800 | #VALUE! | FAIL | ket qua app 800 (number) khac Excel #VALUE! (error) |
| 10 | SUMIFS | criteria range khac kich thuoc | `=SUMIFS(D1:D6,A1:A5,"North",B1:B6,"Pen")` | =SUMIFS(D1:D6,A1:A5,"North",B1:B6,"Pen") => #VALUE! | #VALUE! | PASS | — |
| 11 | COUNTIFS | mot dieu kien van ban | `=COUNTIFS(A1:A6,"North")` | =COUNTIFS(A1:A6,"North") => 3 | 3 | PASS | — |
| 12 | COUNTIFS | hai dieu kien | `=COUNTIFS(A1:A6,"North",B1:B6,"Pen")` | =COUNTIFS(A1:A6,"North",B1:B6,"Pen") => 2 | 2 | PASS | — |
| 13 | COUNTIFS | wildcard dau sao | `=COUNTIFS(B1:B6,"Pen*")` | =COUNTIFS(B1:B6,"Pen*") => 5 | 5 | PASS | — |
| 14 | COUNTIFS | wildcard dau hoi | `=COUNTIFS(B1:B6,"Pe?")` | =COUNTIFS(B1:B6,"Pe?") => 3 | 3 | PASS | — |
| 15 | COUNTIFS | so sanh lon hon bang | `=COUNTIFS(C1:C6,">=20")` | =COUNTIFS(C1:C6,">=20") => 3 | 3 | PASS | — |
| 16 | COUNTIFS | so sanh nho hon | `=COUNTIFS(C1:C6,"<20")` | =COUNTIFS(C1:C6,"<20") => 3 | 3 | PASS | — |
| 17 | COUNTIFS | khac van ban | `=COUNTIFS(A1:A6,"<>North")` | =COUNTIFS(A1:A6,"<>North") => 3 | 3 | PASS | — |
| 18 | COUNTIFS | ket hop wildcard va so sanh | `=COUNTIFS(B1:B6,"Pen*",C1:C6,">10")` | =COUNTIFS(B1:B6,"Pen*",C1:C6,">10") => 3 | 3 | PASS | — |
| 19 | COUNTIFS | khong co dong phu hop | `=COUNTIFS(A1:A6,"East")` | =COUNTIFS(A1:A6,"East") => 0 | 0 | PASS | — |
| 20 | COUNTIFS | hai range khac kich thuoc | `=COUNTIFS(A1:A6,"North",B1:B5,"Pen")` | =COUNTIFS(A1:A6,"North",B1:B5,"Pen") => #VALUE! | #VALUE! | PASS | — |
| 21 | VLOOKUP | exact tra text | `=VLOOKUP(5,A1:C5,2,FALSE)` | =VLOOKUP(5,A1:C5,2,FALSE) => Nam | Nam | PASS | — |
| 22 | VLOOKUP | exact tra so | `=VLOOKUP(7,A1:C5,3,FALSE)` | =VLOOKUP(7,A1:C5,3,FALSE) => 70 | 70 | PASS | — |
| 23 | VLOOKUP | exact bien dau | `=VLOOKUP(1,A1:C5,2,FALSE)` | =VLOOKUP(1,A1:C5,2,FALSE) => Mot | Mot | PASS | — |
| 24 | VLOOKUP | exact bien cuoi | `=VLOOKUP(9,A1:C5,2,FALSE)` | =VLOOKUP(9,A1:C5,2,FALSE) => Chin | Chin | PASS | — |
| 25 | VLOOKUP | exact khong tim thay | `=VLOOKUP(4,A1:C5,2,FALSE)` | =VLOOKUP(4,A1:C5,2,FALSE) => #N/A | #N/A | PASS | — |
| 26 | VLOOKUP | approximate o giua | `=VLOOKUP(6,A1:C5,2,TRUE)` | =VLOOKUP(6,A1:C5,2,TRUE) => Nam | Nam | PASS | — |
| 27 | VLOOKUP | approximate duoi bien nho nhat | `=VLOOKUP(0,A1:C5,2,TRUE)` | =VLOOKUP(0,A1:C5,2,TRUE) => #N/A | #N/A | PASS | — |
| 28 | VLOOKUP | approximate dung bien lon nhat | `=VLOOKUP(9,A1:C5,3,TRUE)` | =VLOOKUP(9,A1:C5,3,TRUE) => 90 | 90 | PASS | — |
| 29 | VLOOKUP | approximate vuot bien lon nhat | `=VLOOKUP(99,A1:C5,2,TRUE)` | =VLOOKUP(99,A1:C5,2,TRUE) => Chin | Chin | PASS | — |
| 30 | VLOOKUP | approximate tren bang chua sap | `=VLOOKUP(6,A1:B5,2,TRUE)` | =VLOOKUP(6,A1:B5,2,TRUE) => Mot | (khong co ket qua chuan co dinh) | INFO | — |
| 31 | ROUND | so duong hai chu so | `=ROUND(12.345,2)` | =ROUND(12.345,2) => 12.35 | 12.35 | PASS | — |
| 32 | ROUND | so am hai chu so | `=ROUND(-12.345,2)` | =ROUND(-12.345,2) => -12.34 | -12.35 | FAIL | ket qua app -12.34 (number) khac Excel -12.35 (number) |
| 33 | ROUND | digits am hang chuc | `=ROUND(125,-1)` | =ROUND(125,-1) => 130 | 130 | PASS | — |
| 34 | ROUND | digits am hang tram | `=ROUND(1499,-2)` | =ROUND(1499,-2) => 1500 | 1500 | PASS | — |
| 35 | ROUND | midpoint duong 0.5 | `=ROUND(2.5,0)` | =ROUND(2.5,0) => 3 | 3 | PASS | — |
| 36 | ROUND | midpoint am -0.5 | `=ROUND(-2.5,0)` | =ROUND(-2.5,0) => -2 | -3 | FAIL | ket qua app -2 (number) khac Excel -3 (number) |
| 37 | ROUND | midpoint duong co le | `=ROUND(1.25,1)` | =ROUND(1.25,1) => 1.3 | 1.3 | PASS | — |
| 38 | ROUND | midpoint am co le | `=ROUND(-1.25,1)` | =ROUND(-1.25,1) => -1.2 | -1.3 | FAIL | ket qua app -1.2 (number) khac Excel -1.3 (number) |
| 39 | ROUND | truong hop nhi phan 2.675 | `=ROUND(2.675,2)` | =ROUND(2.675,2) => 2.68 | 2.68 | PASS | — |
| 40 | ROUND | lam tron ve nghin | `=ROUND(-1500,-3)` | =ROUND(-1500,-3) => -1000 | -2000 | FAIL | ket qua app -1000 (number) khac Excel -2000 (number) |
| 41 | IF/IFERROR | IFERROR bat DIV0 | `=IFERROR(1/0,"fallback")` | =IFERROR(1/0,"fallback") => 1/0 | fallback | FAIL | ket qua app 1/0 (text) khac Excel fallback (text) |
| 42 | IF/IFERROR | IFERROR bat NA | `=IFERROR(NA(),"missing")` | =IFERROR(NA(),"missing") => missing | missing | PASS | — |
| 43 | IF/IFERROR | IFERROR giu gia tri | `=IFERROR(10/2,"fallback")` | =IFERROR(10/2,"fallback") => 5 | 5 | PASS | — |
| 44 | IF/IFERROR | IF long nhau nhanh dau | `=IF(A1>=90,"A",IF(A1>=80,"B","C"))` | =IF(A1>=90,"A",IF(A1>=80,"B","C")) => A | A | PASS | — |
| 45 | IF/IFERROR | IF long nhau nhanh giua | `=IF(A1>=90,"A",IF(A1>=80,"B","C"))` | =IF(A1>=90,"A",IF(A1>=80,"B","C")) => B | B | PASS | — |
| 46 | IF/IFERROR | IF long nhau nhanh cuoi | `=IF(A1>=90,"A",IF(A1>=80,"B","C"))` | =IF(A1>=90,"A",IF(A1>=80,"B","C")) => C | C | PASS | — |
| 47 | IF/IFERROR | IFERROR boc IF co loi | `=IFERROR(IF(A1=0,1/0,10),99)` | =IFERROR(IF(A1=0,1/0,10),99) => 1/0 | 99 | FAIL | ket qua app 1/0 (text) khac Excel 99 (number) |
| 48 | IF/IFERROR | IF bo qua nhanh loi | `=IF(A1>0,42,1/0)` | =IF(A1>0,42,1/0) => 42 | 42 | PASS | — |
| 49 | INDEX/MATCH | INDEX vung mot cot | `=INDEX(B1:B5,3)` | =INDEX(B1:B5,3) => Nam | Nam | PASS | — |
| 50 | INDEX/MATCH | INDEX ma tran hai chieu | `=INDEX(A1:C5,4,3)` | =INDEX(A1:C5,4,3) => 70 | 70 | PASS | — |
| 51 | INDEX/MATCH | INDEX vuot bien | `=INDEX(A1:C5,6,2)` | =INDEX(A1:C5,6,2) => #REF! | #REF! | PASS | — |
| 52 | INDEX/MATCH | MATCH exact | `=MATCH(5,A1:A5,0)` | =MATCH(5,A1:A5,0) => 3 | 3 | PASS | — |
| 53 | INDEX/MATCH | MATCH exact khong tim thay | `=MATCH(6,A1:A5,0)` | =MATCH(6,A1:A5,0) => #N/A | #N/A | PASS | — |
| 54 | INDEX/MATCH | MATCH approximate tang | `=MATCH(6,A1:A5,1)` | =MATCH(6,A1:A5,1) => 3 | 3 | PASS | — |
| 55 | INDEX/MATCH | MATCH approximate giam | `=MATCH(6,A1:A5,-1)` | =MATCH(6,A1:A5,-1) => 2 | 2 | PASS | — |
| 56 | INDEX/MATCH | INDEX MATCH exact | `=INDEX(B1:B5,MATCH(7,A1:A5,0))` | =INDEX(B1:B5,MATCH(7,A1:A5,0)) => Bay | Bay | PASS | — |
| 57 | INDEX/MATCH | INDEX MATCH approximate | `=INDEX(B1:B5,MATCH(6,A1:A5,1))` | =INDEX(B1:B5,MATCH(6,A1:A5,1)) => Nam | Nam | PASS | — |
| 58 | TEXT | ngay dd/mm/yyyy | `=TEXT(DATE(2026,12,31),"dd/mm/yyyy")` | =TEXT(DATE(2026,12,31),"dd/mm/yyyy") => 31/12/2026 | 31/12/2026 | PASS | — |
| 59 | TEXT | ngay nhu nhuan dd/mm/yyyy | `=TEXT(DATE(2024,2,29),"dd/mm/yyyy")` | =TEXT(DATE(2024,2,29),"dd/mm/yyyy") => 29/02/2024 | 29/02/2024 | PASS | — |
| 60 | TEXT | nghin #,##0 | `=TEXT(1234567,"#,##0")` | =TEXT(1234567,"#,##0") => 1,234,567 | (khong co ket qua chuan co dinh) | INFO | — |
| 61 | TEXT | nghin am #,##0 | `=TEXT(-1234567,"#,##0")` | =TEXT(-1234567,"#,##0") => -1,234,567 | (khong co ket qua chuan co dinh) | INFO | — |
| 62 | TEXT | lam tron bang #,##0 | `=TEXT(1234.6,"#,##0")` | =TEXT(1234.6,"#,##0") => 1,235 | (khong co ket qua chuan co dinh) | INFO | — |
| 63 | TEXT | nghin va hai chu so | `=TEXT(1234.5,"#,##0.00")` | =TEXT(1234.5,"#,##0.00") => 1,234.50 | (khong co ket qua chuan co dinh) | INFO | — |
| 64 | DATE | ngay thuong | `=DATE(2026,12,31)` | =DATE(2026,12,31) => 31/12/2026 | 46387 | FAIL | ket qua app 31/12/2026 (text) khac Excel 46387 (number) |
| 65 | DATE | ngay nhuan | `=DATE(2024,2,29)` | =DATE(2024,2,29) => 29/02/2024 | 45351 | FAIL | ket qua app 29/02/2024 (text) khac Excel 45351 (number) |
| 66 | DATE | thang 13 | `=DATE(2026,13,1)` | =DATE(2026,13,1) => 01/01/2027 | 46388 | FAIL | ket qua app 01/01/2027 (text) khac Excel 46388 (number) |
| 67 | DATE | ngay 0 | `=DATE(2026,3,0)` | =DATE(2026,3,0) => 28/02/2026 | 46081 | FAIL | ket qua app 28/02/2026 (text) khac Excel 46081 (number) |
| 68 | DATE | ngay vuot cuoi thang | `=DATE(2026,2,29)` | =DATE(2026,2,29) => 01/03/2026 | 46082 | FAIL | ket qua app 01/03/2026 (text) khac Excel 46082 (number) |
| 69 | Lan truyen loi | DIV0 qua phep cong | `=A1+1` | =A1+1 => 1 | #DIV/0! | FAIL | ket qua app 1 (number) khac Excel #DIV/0! (error) |
| 70 | Lan truyen loi | NA qua phep cong | `=A1+1` | =A1+1 => 1 | #N/A | FAIL | ket qua app 1 (number) khac Excel #N/A (error) |
| 71 | Lan truyen loi | VALUE qua phep cong | `=A1+1` | =A1+1 => 1 | #VALUE! | FAIL | ket qua app 1 (number) khac Excel #VALUE! (error) |
| 72 | Lan truyen loi | REF qua phep cong | `=A1+1` | =A1+1 => #REF! | #REF! | PASS | — |
| 73 | Lan truyen loi | DIV0 qua SUM | `=SUM(A1,1)` | =SUM(A1,1) => 1 | #DIV/0! | FAIL | ket qua app 1 (number) khac Excel #DIV/0! (error) |
| 74 | Lan truyen loi | IFERROR bat loi phu thuoc | `=IFERROR(A1,99)` | =IFERROR(A1,99) => 0 | 99 | FAIL | ket qua app 0 (number) khac Excel 99 (number) |
| 75 | Lan truyen loi | IF bo qua nhanh loi phu thuoc | `=IF(TRUE,42,A1)` | =IF(TRUE,42,A1) => 42 | 42 | PASS | — |
| 76 | Lan truyen loi | IF chon nhanh loi phu thuoc | `=IF(FALSE,42,A1)` | =IF(FALSE,42,A1) => 0 | #DIV/0! | FAIL | ket qua app 0 (number) khac Excel #DIV/0! (error) |
| 77 | Lan truyen loi | DIV0 qua hai cap phu thuoc | `=B1+1` | =B1+1 => 2 | #DIV/0! | FAIL | ket qua app 2 (number) khac Excel #DIV/0! (error) |
| 78 | Lan truyen loi | NA VLOOKUP qua IFERROR | `=IFERROR(A1,"caught")` | =IFERROR(A1,"caught") => caught | caught | PASS | — |
| 79 | F4 | chu ky F4 lan 0 | `=A1` | =A1 => 7 | =A1 => 7 | PASS | — |
| 80 | F4 | chu ky F4 lan 1 | `=A1` | =$A$1 => 7 | =$A$1 => 7 | PASS | — |
| 81 | F4 | chu ky F4 lan 2 | `=A1` | =A$1 => 7 | =A$1 => 7 | PASS | — |
| 82 | F4 | chu ky F4 lan 3 | `=A1` | =$A1 => 7 | =$A1 => 7 | PASS | — |
| 83 | Sao chep cong thuc | tham chieu tuong doi | `=B1+C1` | =B2+C2 => 30 | =B2+C2 => 30 | PASS | — |
| 84 | Sao chep cong thuc | cot va hang tuyet doi | `=$B$1+C1` | =$B$1+C2 => 21 | =$B$1+C2 => 21 | PASS | — |
| 85 | Sao chep cong thuc | hang tuyet doi va cot hon hop | `=B$1+$C1` | =B$1+$C2 => 21 | =B$1+$C2 => 21 | PASS | — |
| 86 | Sao chep cong thuc | cot tuyet doi va hang tuyet doi | `=$B1+C$1` | =$B2+C$1 => 12 | =$B2+C$1 => 12 | PASS | — |

## Tổng kết

PASS: **62** · FAIL: **19** · tổng: **86**. Các FAIL là chênh lệch quan sát thật, không bị che hoặc đổi expected.

Excel COM được đóng theo thứ tự workbook.Close(false), Excel.Quit(), FinalReleaseComObject; nếu tiến trình chưa tự thoát thì chỉ PID lấy từ Hwnd của đúng phiên vừa mở mới bị dừng. App desktop và LOCALAPPDATA riêng cũng được dọn trong finally.

## FAIL chi tiết

- **S09 — SUMIFS/sum range ngan hon criteria range:** ket qua app 800 (number) khac Excel #VALUE! (error).
- **R02 — ROUND/so am hai chu so:** ket qua app -12.34 (number) khac Excel -12.35 (number).
- **R06 — ROUND/midpoint am -0.5:** ket qua app -2 (number) khac Excel -3 (number).
- **R08 — ROUND/midpoint am co le:** ket qua app -1.2 (number) khac Excel -1.3 (number).
- **R10 — ROUND/lam tron ve nghin:** ket qua app -1000 (number) khac Excel -2000 (number).
- **L01 — IF/IFERROR/IFERROR bat DIV0:** ket qua app 1/0 (text) khac Excel fallback (text).
- **L07 — IF/IFERROR/IFERROR boc IF co loi:** ket qua app 1/0 (text) khac Excel 99 (number).
- **D01 — DATE/ngay thuong:** ket qua app 31/12/2026 (text) khac Excel 46387 (number).
- **D02 — DATE/ngay nhuan:** ket qua app 29/02/2024 (text) khac Excel 45351 (number).
- **D03 — DATE/thang 13:** ket qua app 01/01/2027 (text) khac Excel 46388 (number).
- **D04 — DATE/ngay 0:** ket qua app 28/02/2026 (text) khac Excel 46081 (number).
- **D05 — DATE/ngay vuot cuoi thang:** ket qua app 01/03/2026 (text) khac Excel 46082 (number).
- **E01 — Lan truyen loi/DIV0 qua phep cong:** ket qua app 1 (number) khac Excel #DIV/0! (error).
- **E02 — Lan truyen loi/NA qua phep cong:** ket qua app 1 (number) khac Excel #N/A (error).
- **E03 — Lan truyen loi/VALUE qua phep cong:** ket qua app 1 (number) khac Excel #VALUE! (error).
- **E05 — Lan truyen loi/DIV0 qua SUM:** ket qua app 1 (number) khac Excel #DIV/0! (error).
- **E06 — Lan truyen loi/IFERROR bat loi phu thuoc:** ket qua app 0 (number) khac Excel 99 (number).
- **E08 — Lan truyen loi/IF chon nhanh loi phu thuoc:** ket qua app 0 (number) khac Excel #DIV/0! (error).
- **E09 — Lan truyen loi/DIV0 qua hai cap phu thuoc:** ket qua app 2 (number) khac Excel #DIV/0! (error).

## Ghi chú về nguồn chuẩn (Claude, 07/10)
Excel COM **không dùng được** trên máy này: Excel báo `Product Activation Failed` và hiện hộp thoại *Microsoft Office Activation Wizard* chặn mọi lệnh COM (kể cả mở tệp gốc `lan19.xlsx`), nên bộ kiểm 26 tệp xlsx cũng báo `excel=FAIL` ở 22/28 tệp dù `diffs=0` (không có ô nào sai khi lưu/mở lại). Báo cáo này vì vậy dùng chế độ `--oracle-expected`: kết quả chuẩn là kết quả Excel đã biết theo ngữ nghĩa chuẩn (viết cố định trong script, không lấy từ app). Khi chủ máy kích hoạt lại Office, chạy lại không kèm cờ này để so với Excel thật. 5 phép thử `INFO` (TEXT với dấu phân cách theo vùng miền, VLOOKUP gần đúng trên bảng chưa sắp) không tính PASS/FAIL.

## Lỗi thật phát hiện (đã dò trực tiếp trong app desktop)
1. **Lỗi không lan truyền:** `=A1+1` với A1 = `#DIV/0!` ra `1`; `=SUM(A1,1)` ra `1` (Excel: `#DIV/0!`). Số tiền sai im lặng.
2. **IFERROR không bắt lỗi:** `=IFERROR(1/0,"fb")` ra chuỗi `1/0` (Excel: `fb`).
3. **ROUND làm tròn số âm sai:** `=ROUND(-2.5,0)` ra `-2` (Excel `-3`), `ROUND(-12.345,2)` ra `-12.34`, `ROUND(-1500,-3)` ra `-1000` (Excel `-2000`): đang làm tròn nửa về phía +∞ thay vì ra xa số 0.
4. **DATE trả chuỗi thay vì số ngày:** `=DATE(2026,12,31)` ra chuỗi `31/12/2026`, nên `=A1+1` ra `1`; mọi phép tính ngày từ DATE bị sai.
5. **SUMIFS vùng khác kích thước:** ra tổng thay vì `#VALUE!` (mức nhẹ).
