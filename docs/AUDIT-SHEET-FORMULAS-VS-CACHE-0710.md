# Báo Cáo Kiểm Chứng Công Thức VN Sheet Đối Chiếu Cache Excel (07/10/2026)

- **Ngày thực hiện**: 07/10/2026
- **Phạm vi**: 28 tệp `.xlsx` doanh nghiệp thật (`file test/lan/lan01.xlsx` – `lan28.xlsx`).
- **Phương pháp**: Đọc thẻ `<f>` (công thức) và thẻ `<v>` (kết quả cache do Excel đã tính toán và ghi lại trong XML tệp XLSX gốc); khởi chạy ứng dụng desktop thật VN Sheet qua Chrome DevTools Protocol (CDP); dùng `FormulaEngine` của ứng dụng (`window.__vnoAppInstance.grid.formulaEngine`) tính toán lại từng công thức trong đúng ngữ cảnh của bảng tính và đối chiếu với kết quả cache.
- **Nguyên tắc an toàn & bảo mật**: Ứng dụng chạy offline độc lập; không gửi dữ liệu ra bên ngoài; không ghi đè bất kỳ tệp dữ liệu gốc nào; không trích xuất nội dung nhạy cảm vào báo cáo; không sửa mã sản phẩm.
- **Quy tắc so sánh**: Số học chấp nhận sai số tương đối $\le 10^{-9}$ (`Math.max(1e-9, |Excel| * 1e-9)`); chuỗi ký tự so khớp chính xác; boolean so khớp đúng; mã lỗi chuẩn hóa mã lỗi (`#NAME?`, `#VALUE!`, `#REF!`, `#DIV/0!`, `#N/A`, `#NUM!`).

---

## 1. Bảng Tổng Hợp 28 Tệp XLSX

| STT | Tệp | Tổng ô `<f>` | Shared slave bỏ qua | Array bỏ qua | Thiếu cache bỏ qua | Đã kiểm tra | Khớp | Lệch | Tỷ lệ khớp |
|:---:|:---|---:|---:|---:|---:|---:|---:|---:|---:|
| 1 | `lan01.xlsx` | 1,285 | 420 | 0 | 0 | 865 | 224 | 641 | **25.90%** |
| 2 | `lan02.xlsx` | 4 | 0 | 0 | 0 | 4 | 2 | 2 | **50.00%** |
| 3 | `lan03.xlsx` | 241 | 146 | 0 | 0 | 95 | 81 | 14 | **85.26%** |
| 4 | `lan04.xlsx` | 56 | 7 | 0 | 0 | 49 | 8 | 41 | **16.33%** |
| 5 | `lan05.xlsx` | 106 | 91 | 0 | 0 | 15 | 15 | 0 | **100.00%** |
| 6 | `lan06.xlsx` | 2,905 | 1,882 | 0 | 0 | 1,023 | 412 | 611 | **40.27%** |
| 7 | `lan07.xlsx` | 468 | 141 | 0 | 0 | 327 | 301 | 26 | **92.05%** |
| 8 | `lan08.xlsx` | 111 | 60 | 0 | 0 | 51 | 51 | 0 | **100.00%** |
| 9 | `lan09.xlsx` | 2 | 0 | 0 | 0 | 2 | 1 | 1 | **50.00%** |
| 10 | `lan10.xlsx` | 3 | 0 | 0 | 0 | 3 | 3 | 0 | **100.00%** |
| 11 | `lan11.xlsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **100.0%** |
| 12 | `lan12.xlsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **100.0%** |
| 13 | `lan13.xlsx` | 373 | 74 | 0 | 0 | 299 | 299 | 0 | **100.00%** |
| 14 | `lan14.xlsx` | 128,660 | 60,535 | 0 | 0 | 68,125 | 33,953 | 34,172 | **49.84%** |
| 15 | `lan15.xlsx` | 2 | 0 | 0 | 0 | 2 | 2 | 0 | **100.00%** |
| 16 | `lan16.xlsx` | 144 | 80 | 0 | 0 | 64 | 64 | 0 | **100.00%** |
| 17 | `lan17.xlsx` | 2,704 | 1,255 | 0 | 0 | 1,449 | 1,383 | 66 | **95.45%** |
| 18 | `lan18.xlsx` | 1 | 0 | 0 | 0 | 1 | 1 | 0 | **100.00%** |
| 19 | `lan19.xlsx` | 7 | 2 | 0 | 0 | 5 | 4 | 1 | **80.00%** |
| 20 | `lan20.xlsx` | 345 | 337 | 0 | 0 | 8 | 8 | 0 | **100.00%** |
| 21 | `lan21.xlsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **100.0%** |
| 22 | `lan22.xlsx` | 124 | 0 | 0 | 0 | 124 | 0 | 124 | **0.00%** |
| 23 | `lan23.xlsx` | 21 | 9 | 0 | 12 | 0 | 0 | 0 | **N/A** |
| 24 | `lan24.xlsx` | 75 | 48 | 0 | 0 | 27 | 27 | 0 | **100.00%** |
| 25 | `lan25.xlsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **100.0%** |
| 26 | `lan26.xlsx` | 130 | 106 | 0 | 0 | 24 | 12 | 12 | **50.00%** |
| 27 | `lan27.xlsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **100.0%** |
| 28 | `lan28.xlsx` | 739 | 464 | 0 | 0 | 275 | 267 | 8 | **97.09%** |
| **Tổng** | **28 tệp** | **138,506** | **65,657** | **0** | **12** | **72,837** | **37,118** | **35,719** | **50.96%** |

---

## 2. Bảng Phân Tích Khớp / Lệch Theo Tên Hàm (Formula Catalog Breakdown)

| STT | Nhóm / Tên Hàm | Tổng ô kiểm tra | Số ô khớp | Số ô lệch | Tỷ lệ khớp | Ví dụ kiểm tra (Ô - Công thức - Cache Excel - App) |
|:---:|:---|---:|---:|---:|---:|:---|
| 1 | **VLOOKUP** | 67,999 | 34,236 | 33,763 | **50.35%** | `B6`: `VLOOKUP(B3,'Kho VAT'!A:G,2,FALSE)` (Excel: `Máy in canon LBP 290`, App: `2900`)<br>`B7`: `VLOOKUP($B$3,'Kho VAT'!$A:$G,5,FALSE)` (Excel: `0`, App: `#N/A`)<br>`B8`: `VLOOKUP($B$3,'Kho VAT'!$A:$G,6,FALSE)` (Excel: `0`, App: `#N/A`) |
| 2 | **Toán tử (+, -, *, /)** | 2,033 | 1,854 | 179 | **91.20%** | `A12`: `#REF!+1` (Excel: `#REF!`, App: `#VALUE!`)<br>`A13`: `A12+1` (Excel: `#REF!`, App: `#NAME?`)<br>`A22`: `#REF!+1` (Excel: `#REF!`, App: `#VALUE!`) |
| 3 | **SUMIF** | 1,104 | 408 | 696 | **36.96%** | `I2`: `SUMIF('Nguồn lệ phí'!$E$2:$L$300,'DS lệ ` (Excel: `1974000`, App: `3290000`)<br>`L2`: `SUMIF('Nguồn CĐKQHT 2020 (GVCN Trang)'!$` (Excel: `33`, App: `26`)<br>`L4`: `SUMIF('Nguồn CĐKQHT 2020 (GVCN Trang)'!$` (Excel: `7`, App: `14`) |
| 4 | **Tham chiếu ô** | 548 | 442 | 106 | **80.66%** | `G83`: `+G82` (Excel: `24 tháng`, App: `24`)<br>`G26`: `+G27` (Excel: `24 tháng`, App: `24`)<br>`G43`: `+G40` (Excel: `24 tháng`, App: `24`) |
| 5 | **TRIM** | 529 | 0 | 529 | **0.00%** | `AQ13`: `+TRIM(B13)` (Excel: `19200002`, App: `#VALUE!`)<br>`AQ14`: `+TRIM(B14)` (Excel: `19200003`, App: `#VALUE!`)<br>`AQ78`: `+TRIM(B78)` (Excel: `19200407`, App: `#VALUE!`) |
| 6 | **& (Nối chuỗi)** | 220 | 0 | 220 | **0.00%** | `H260`: `+F260&" "&G260` (Excel: `Nguyễn Mạnh Thành`, App: `#VALUE!`)<br>`AV19779`: `+Q19779&"_"&AU19779&"_"&W19779` (Excel: `Thi_Khởi sự kinh doa`, App: `#VALUE!`)<br>`AV19780`: `+Q19780&"_"&AU19780&"_"&W19780` (Excel: `Thi_Khởi sự kinh doa`, App: `#VALUE!`) |
| 7 | **TEXT** | 218 | 0 | 218 | **0.00%** | `AU19779`: `+TEXT(U19779,"dd/mm/yyyy")` (Excel: `25/12/2021`, App: `#VALUE!`)<br>`AU19780`: `+TEXT(U19780,"dd/mm/yyyy")` (Excel: `25/12/2021`, App: `#VALUE!`)<br>`AU19844`: `+TEXT(U19844,"dd/mm/yyyy")` (Excel: `25/12/2021`, App: `#VALUE!`) |
| 8 | **SUM** | 177 | 174 | 3 | **98.31%** | `G13`: `SUM(H9:H12)*F13` (Excel: `326000`, App: `#VALUE!`)<br>`L1`: `SUM(L3:L91)` (Excel: `0`, App: `2`)<br>`M1`: `SUM(M3:M91)` (Excel: `0`, App: `39446975046`) |
| 9 | **_XLL.VND** | 2 | 0 | 2 | **0.00%** | `G7`: `_xll.VND(G5)` (Excel: `#NAME?`, App: `Hai mươi chín triệu `)<br>`C15`: `_xll.VND(E14)` (Excel: `#NAME?`, App: `Hai mươi chín triệu `) |
| 10 | **Biểu thức khác** | 2 | 1 | 1 | **50.00%** | `G39`: `+#REF!` (Excel: `#REF!`, App: `#VALUE!`) |
| 11 | **NA** | 2 | 2 | 0 | **100.00%** | 100% Khớp (2 ô) |
| 12 | **TODAY** | 1 | 0 | 1 | **0.00%** | `A2`: `TODAY()` (Excel: `43894`, App: `46302`) |
| 13 | **LEFT** | 1 | 0 | 1 | **0.00%** | `B2`: `LEFT(A2,2)` (Excel: `43`, App: `46`) |
| 14 | **RIGHT** | 1 | 1 | 0 | **100.00%** | 100% Khớp (1 ô) |

---

## 3. Các Hàm Chưa Hỗ Trợ (#NAME?) Hoặc Phụ Thuộc Add-in Ngoài

Trong tập mẫu tài liệu doanh nghiệp thực tế, có các hàm sau liên quan đến mã lỗi `#NAME?`:

- **Hàm `_XLL.VND`**:
  - Tệp `lan02.xlsx`, Sheet `UNC`, Ô `G7`: `_xll.VND(G5)` → Cache Excel: `#NAME?`, App VN Sheet: `Hai mươi chín triệu không trăm chín mươi bảy ngàn bốn trăm năm mươi sáu đồng chẵn.`
  - Tệp `lan02.xlsx`, Sheet `DANH SÁCH CHI LƯƠNG`, Ô `C15`: `_xll.VND(E14)` → Cache Excel: `#NAME?`, App VN Sheet: `Hai mươi chín triệu không trăm chín mươi bảy ngàn bốn trăm năm mươi sáu đồng chẵn.`
- **Hàm `Toán tử (+, -, *, /)`**:
  - Tệp `lan04.xlsx`, Sheet `Phụ kiện`, Ô `A13`: `A12+1` → Cache Excel: `#REF!`, App VN Sheet: `#NAME?`
  - Tệp `lan04.xlsx`, Sheet `Phụ kiện`, Ô `A23`: `A22+1` → Cache Excel: `#REF!`, App VN Sheet: `#NAME?`
  - Tệp `lan04.xlsx`, Sheet `Phụ kiện`, Ô `A24`: `A23+1` → Cache Excel: `#REF!`, App VN Sheet: `#NAME?`

---

## 4. Top 10 Nguyên Nhân Lệch & Phân Tích Chi Tiết

### 1. Hàm VLOOKUP với bảng tra cứu có khoảng trống hoặc khác biệt kiểu chuỗi/số

Chênh lệch xảy ra trong các bảng dữ liệu lớn khi giá trị tra cứu hoặc cột đầu tiên chứa chuỗi số (e.g. mã hàng, mã sinh viên) có khoảng trắng thừa hoặc khác biệt giữa kiểu số nguyên và kiểu chuỗi ký tự, dẫn đến kết quả trả về `#N/A` hoặc lấy sai dòng.

- **Số lượng ô bị ảnh hưởng**: 33,763 ô
- **Ví dụ tiêu biểu**:
  - Tệp `lan06.xlsx`, Sheet `Kiểm Tra VAT`, Ô `B6`: `=VLOOKUP(B3,'Kho VAT'!A:G,2,FALSE)` | Excel Cache: `Máy in canon LBP 2900` | VN Sheet: `2900`
  - Tệp `lan06.xlsx`, Sheet `Kiểm Tra VAT`, Ô `B7`: `=VLOOKUP($B$3,'Kho VAT'!$A:$G,5,FALSE)` | Excel Cache: `0` | VN Sheet: `#N/A`
  - Tệp `lan06.xlsx`, Sheet `Kiểm Tra VAT`, Ô `B8`: `=VLOOKUP($B$3,'Kho VAT'!$A:$G,6,FALSE)` | Excel Cache: `0` | VN Sheet: `#N/A`

### 2. Hàm SUMIF với tiêu chí dải ô đa cột hoặc so khớp chuỗi có dấu/ô trống

Chênh lệch xảy ra khi dải điều kiện trải dài nhiều cột (ví dụ `$E$2:$L$300`) trong khi dải tính tổng chỉ có một cột (`$H$2:$H$300`). Excel tự động căn chỉnh kích thước dải ô hoặc chỉ xét cột đầu tiên, trong khi FormulaEngine của Sheet quét toàn bộ dải hoặc xử lý khác biệt.

- **Số lượng ô bị ảnh hưởng**: 696 ô
- **Ví dụ tiêu biểu**:
  - Tệp `lan01.xlsx`, Sheet `DS lệ phí CĐKQHT 2020`, Ô `I2`: `=SUMIF('Nguồn lệ phí'!$E$2:$L$300,'DS lệ phí CĐKQHT 2020'!B2,` | Excel Cache: `1974000` | VN Sheet: `3290000`
  - Tệp `lan01.xlsx`, Sheet `DS lệ phí CĐKQHT 2020`, Ô `L2`: `=SUMIF('Nguồn CĐKQHT 2020 (GVCN Trang)'!$A$2:$H$3000,'DS lệ p` | Excel Cache: `33` | VN Sheet: `26`
  - Tệp `lan01.xlsx`, Sheet `DS lệ phí CĐKQHT 2020`, Ô `L4`: `=SUMIF('Nguồn CĐKQHT 2020 (GVCN Trang)'!$A$2:$H$3000,'DS lệ p` | Excel Cache: `7` | VN Sheet: `14`

### 3. Dấu '+' tiền tố trước hàm xử lý chuỗi TRIM (+TRIM(...))

Trong Excel, dấu `+` ở đầu công thức được xem là tiền tố nhập dữ liệu thay cho `=`. Tuy nhiên, parser của VN Sheet nhận diện dấu `+` là toán tử cộng đơn nguyên số học (unary plus), ép kết quả chuỗi của hàm `TRIM` thành số; khi chuỗi không thể ép số, biểu thức sinh mã lỗi `#VALUE!`.

- **Số lượng ô bị ảnh hưởng**: 529 ô
- **Ví dụ tiêu biểu**:
  - Tệp `lan14.xlsx`, Sheet `Sheet1`, Ô `AQ13`: `=+TRIM(B13)` | Excel Cache: `19200002` | VN Sheet: `#VALUE!`
  - Tệp `lan14.xlsx`, Sheet `Sheet1`, Ô `AQ14`: `=+TRIM(B14)` | Excel Cache: `19200003` | VN Sheet: `#VALUE!`
  - Tệp `lan14.xlsx`, Sheet `Sheet1`, Ô `AQ78`: `=+TRIM(B78)` | Excel Cache: `19200407` | VN Sheet: `#VALUE!`

### 4. Dấu '+' tiền tố trước phép toán nối chuỗi ký tự (+A1&" "&B1)

Tương tự như trên, tiền tố `+` trước các phép nối chuỗi `&` làm thay đổi thứ tự ưu tiên hoặc khiến biểu thức bị coi là biểu thức số học, dẫn đến kết quả `#VALUE!` thay vì chuỗi văn bản ghép họ tên.

- **Số lượng ô bị ảnh hưởng**: 220 ô
- **Ví dụ tiêu biểu**:
  - Tệp `lan01.xlsx`, Sheet `Nguồn lệ phí`, Ô `H260`: `=+F260&" "&G260` | Excel Cache: `Nguyễn Mạnh Thành` | VN Sheet: `#VALUE!`
  - Tệp `lan14.xlsx`, Sheet `Sheet1`, Ô `AV19779`: `=+Q19779&"_"&AU19779&"_"&W19779` | Excel Cache: `Thi_Khởi sự kinh doanh (3TC)_DEC.TXQTTH1` | VN Sheet: `#VALUE!`
  - Tệp `lan14.xlsx`, Sheet `Sheet1`, Ô `AV19780`: `=+Q19780&"_"&AU19780&"_"&W19780` | Excel Cache: `Thi_Khởi sự kinh doanh (3TC)_DEC.TXQTTH1` | VN Sheet: `#VALUE!`

### 5. Dấu '+' tiền tố trước hàm định dạng văn bản TEXT (+TEXT(...))

Công thức dạng `=+TEXT(U19779,"dd/mm/yyyy")` trả về chuỗi định dạng ngày tháng trong Excel, nhưng bị ép kiểu số học bởi toán tử `+` tiền tố trong VN Sheet, dẫn đến lỗi `#VALUE!`.

- **Số lượng ô bị ảnh hưởng**: 218 ô
- **Ví dụ tiêu biểu**:
  - Tệp `lan14.xlsx`, Sheet `Sheet1`, Ô `AU19779`: `=+TEXT(U19779,"dd/mm/yyyy")` | Excel Cache: `25/12/2021` | VN Sheet: `#VALUE!`
  - Tệp `lan14.xlsx`, Sheet `Sheet1`, Ô `AU19780`: `=+TEXT(U19780,"dd/mm/yyyy")` | Excel Cache: `25/12/2021` | VN Sheet: `#VALUE!`
  - Tệp `lan14.xlsx`, Sheet `Sheet1`, Ô `AU19844`: `=+TEXT(U19844,"dd/mm/yyyy")` | Excel Cache: `25/12/2021` | VN Sheet: `#VALUE!`

### 6. Lan truyền mã lỗi tham chiếu #REF! trong toán tử số học (#REF!+1 hoặc +#REF!)

Khi ô công thức chứa tham chiếu ô bị xóa (`#REF!+1`), Excel tiếp tục lan truyền mã lỗi `#REF!`. VN Sheet xử lý các phép toán có toán hạng lỗi thành `#VALUE!` hoặc parser hiểu sai token lỗi thành tên không xác định (`#NAME?`).

- **Số lượng ô bị ảnh hưởng**: 180 ô
- **Ví dụ tiêu biểu**:
  - Tệp `lan03.xlsx`, Sheet `Camera HDCVI`, Ô `G39`: `=+#REF!` | Excel Cache: `#REF!` | VN Sheet: `#VALUE!`
  - Tệp `lan04.xlsx`, Sheet `Phụ kiện`, Ô `A12`: `=#REF!+1` | Excel Cache: `#REF!` | VN Sheet: `#VALUE!`
  - Tệp `lan04.xlsx`, Sheet `Phụ kiện`, Ô `A13`: `=A12+1` | Excel Cache: `#REF!` | VN Sheet: `#NAME?`

### 7. Tham chiếu ô tự động bóc tách đơn vị văn bản số ("24 tháng" -> 24)

Khi tham chiếu đến ô chứa văn bản kết hợp số và đơn vị (ví dụ chuỗi `"24 tháng"`), FormulaEngine tự động bóc tách phần số `24` để tính toán, trong khi Excel giữ nguyên dạng chuỗi văn bản gốc `"24 tháng"`.

- **Số lượng ô bị ảnh hưởng**: 106 ô
- **Ví dụ tiêu biểu**:
  - Tệp `lan03.xlsx`, Sheet `Camera IP`, Ô `G83`: `=+G82` | Excel Cache: `24 tháng` | VN Sheet: `24`
  - Tệp `lan03.xlsx`, Sheet `Camera HDCVI`, Ô `G26`: `=+G27` | Excel Cache: `24 tháng` | VN Sheet: `24`
  - Tệp `lan03.xlsx`, Sheet `Camera HDCVI`, Ô `G43`: `=+G40` | Excel Cache: `24 tháng` | VN Sheet: `24`

### 8. Hàm SUM kết hợp phép nhân ô trống hoặc dải ô lọc/ẩn

Phép nhân kết quả SUM với ô rỗng/chuỗi (như `=SUM(H9:H12)*F13`) bị trả về `#VALUE!` trong VN Sheet nếu ô nhân chưa có dữ liệu; hoặc dải ô `SUM(L3:L91)` tính cả hàng ẩn/lọc khác biệt với trạng thái cache lưu trong Excel.

- **Số lượng ô bị ảnh hưởng**: 3 ô
- **Ví dụ tiêu biểu**:
  - Tệp `lan19.xlsx`, Sheet `Sheet1`, Ô `G13`: `=SUM(H9:H12)*F13` | Excel Cache: `326000` | VN Sheet: `#VALUE!`
  - Tệp `lan28.xlsx`, Sheet `KPI Hiếu`, Ô `L1`: `=SUM(L3:L91)` | Excel Cache: `0` | VN Sheet: `2`
  - Tệp `lan28.xlsx`, Sheet `KPI Hiếu`, Ô `M1`: `=SUM(M3:M91)` | Excel Cache: `0` | VN Sheet: `39446975046`

### 9. Hàm Add-in / Tiện ích ngoài của Excel (_xll.VND - Đọc tiền tệ VNĐ)

Trong Excel gốc khi chưa cài add-in đọc số tiền VNĐ (_xll.VND), Excel lưu cache là `#NAME?`. VN Sheet tích hợp sẵn hàm đọc số tiền VNĐ (`vndInWords`) nên VN Sheet tự động tính ra chuỗi văn bản tiếng Việt hoàn chỉnh thay vì trả về lỗi `#NAME?`.

- **Số lượng ô bị ảnh hưởng**: 2 ô
- **Ví dụ tiêu biểu**:
  - Tệp `lan02.xlsx`, Sheet `UNC`, Ô `G7`: `=_xll.VND(G5)` | Excel Cache: `#NAME?` | VN Sheet: `Hai mươi chín triệu không trăm chín mươi`
  - Tệp `lan02.xlsx`, Sheet `DANH SÁCH CHI LƯƠNG`, Ô `C15`: `=_xll.VND(E14)` | Excel Cache: `#NAME?` | VN Sheet: `Hai mươi chín triệu không trăm chín mươi`

### 10. Hàm ngày tháng động TODAY() và các hàm trích xuất phụ thuộc (LEFT(TODAY(), 2))

Hàm `TODAY()` là hàm biến động (volatile function). Giá trị cache trong tệp XLSX lưu lại ngày tại thời điểm lưu file trong quá khứ (ví dụ năm 2020), trong khi VN Sheet tính theo thời gian thực của máy tính khi chạy kiểm tra (năm 2026), dẫn đến lệch giá trị ngày và các hàm phụ thuộc.

- **Số lượng ô bị ảnh hưởng**: 2 ô
- **Ví dụ tiêu biểu**:
  - Tệp `lan28.xlsx`, Sheet `Hàm cơ bàn`, Ô `A2`: `=TODAY()` | Excel Cache: `43894` | VN Sheet: `46302`
  - Tệp `lan28.xlsx`, Sheet `Hàm cơ bàn`, Ô `B2`: `=LEFT(A2,2)` | Excel Cache: `43` | VN Sheet: `46`

---

## 5. Kết Luận & Hướng Xử Lý Kế Tiếp

1. **Độ ổn định**: Script đã kiểm tra thành công toàn bộ **28 tệp** XLSX doanh nghiệp thật (lan01.xlsx – lan28.xlsx), xử lý tổng cộng **138,506** ô công thức, đánh giá **72,837** công thức hợp lệ.
2. **Tỷ lệ tương thích**: Bộ tính toán FormulaEngine của VN Sheet đạt tỷ lệ khớp **50.96%** so với kết quả cache chuẩn của Microsoft Excel.
3. **Độ an toàn**: Toàn bộ quy trình kiểm chứng thực hiện tự động qua CDP, không can thiệp hay sửa đổi bất kỳ tệp dữ liệu nào của người dùng. Các chênh lệch được tổng hợp đầy đủ làm cơ sở cho các ticket tối ưu tiếp theo.
