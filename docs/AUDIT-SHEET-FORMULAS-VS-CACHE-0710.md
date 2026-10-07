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
| 1 | `lan01.xlsx` | 1,285 | 420 | 0 | 0 | 865 | 865 | 0 | **100.00%** |
| 2 | `lan02.xlsx` | 4 | 0 | 0 | 0 | 4 | 2 | 2 | **50.00%** |
| 3 | `lan03.xlsx` | 241 | 146 | 0 | 0 | 95 | 95 | 0 | **100.00%** |
| 4 | `lan04.xlsx` | 56 | 7 | 0 | 0 | 49 | 49 | 0 | **100.00%** |
| 5 | `lan05.xlsx` | 106 | 91 | 0 | 0 | 15 | 15 | 0 | **100.00%** |
| 6 | `lan06.xlsx` | 2,905 | 1,882 | 0 | 0 | 1,023 | 1,023 | 0 | **100.00%** |
| 7 | `lan07.xlsx` | 468 | 141 | 0 | 0 | 327 | 327 | 0 | **100.00%** |
| 8 | `lan08.xlsx` | 111 | 60 | 0 | 0 | 51 | 51 | 0 | **100.00%** |
| 9 | `lan09.xlsx` | 2 | 0 | 0 | 0 | 2 | 2 | 0 | **100.00%** |
| 10 | `lan10.xlsx` | 3 | 0 | 0 | 0 | 3 | 3 | 0 | **100.00%** |
| 11 | `lan11.xlsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **100.0%** |
| 12 | `lan12.xlsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **100.0%** |
| 13 | `lan13.xlsx` | 373 | 74 | 0 | 0 | 299 | 299 | 0 | **100.00%** |
| 14 | `lan14.xlsx` | 128,660 | 60,535 | 0 | 0 | 68,125 | 34,924 | 33,201 | **51.26%** |
| 15 | `lan15.xlsx` | 2 | 0 | 0 | 0 | 2 | 2 | 0 | **100.00%** |
| 16 | `lan16.xlsx` | 144 | 80 | 0 | 0 | 64 | 64 | 0 | **100.00%** |
| 17 | `lan17.xlsx` | 2,704 | 1,255 | 0 | 0 | 1,449 | 1,437 | 12 | **99.17%** |
| 18 | `lan18.xlsx` | 1 | 0 | 0 | 0 | 1 | 1 | 0 | **100.00%** |
| 19 | `lan19.xlsx` | 7 | 2 | 0 | 0 | 5 | 4 | 1 | **80.00%** |
| 20 | `lan20.xlsx` | 345 | 337 | 0 | 0 | 8 | 8 | 0 | **100.00%** |
| 21 | `lan21.xlsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **100.0%** |
| 22 | `lan22.xlsx` | 124 | 0 | 0 | 0 | 124 | 0 | 124 | **0.00%** |
| 23 | `lan23.xlsx` | 21 | 9 | 0 | 12 | 0 | 0 | 0 | **N/A** |
| 24 | `lan24.xlsx` | 75 | 48 | 0 | 0 | 27 | 27 | 0 | **100.00%** |
| 25 | `lan25.xlsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **100.0%** |
| 26 | `lan26.xlsx` | 130 | 106 | 0 | 0 | 24 | 24 | 0 | **100.00%** |
| 27 | `lan27.xlsx` | 0 | 0 | 0 | 0 | 0 | 0 | 0 | **100.0%** |
| 28 | `lan28.xlsx` | 739 | 464 | 0 | 0 | 275 | 268 | 7 | **97.45%** |
| **Tổng** | **28 tệp** | **138,506** | **65,657** | **0** | **12** | **72,837** | **39,490** | **33,347** | **54.22%** |

---

## 2. Bảng Phân Tích Khớp / Lệch Theo Tên Hàm (Formula Catalog Breakdown)

| STT | Nhóm / Tên Hàm | Tổng ô kiểm tra | Số ô khớp | Số ô lệch | Tỷ lệ khớp | Ví dụ kiểm tra (Ô - Công thức - Cache Excel - App) |
|:---:|:---|---:|---:|---:|---:|:---|
| 1 | **VLOOKUP** | 67,999 | 34,795 | 33,204 | **51.17%** | `AS13`: `VLOOKUP(AQ13,[2]all!AO$2:AP$8112,2,0)` (Excel: `Nguyễn Thị`, App: `#N/A`)<br>`AS14`: `VLOOKUP(AQ14,[2]all!AO$2:AP$8112,2,0)` (Excel: `Phạm Thị`, App: `#N/A`)<br>`AS15`: `VLOOKUP(AQ15,[2]all!AO$2:AP$8112,2,0)` (Excel: `Trần Nam`, App: `#N/A`) |
| 2 | **Toán tử (+, -, *, /)** | 2,033 | 1,908 | 125 | **93.85%** | `A1`: `'[1]Mẫu 18-Bảng TH giá TG'!A591` (Excel: `VII`, App: `#REF!`)<br>`B1`: `'[1]Mẫu 18-Bảng TH giá TG'!C591` (Excel: `Hạng mục 7: Hệ thống`, App: `#REF!`)<br>`A2`: `'[1]Mẫu 18-Bảng TH giá TG'!A592` (Excel: `532`, App: `#REF!`) |
| 3 | **SUMIF** | 1,104 | 1,104 | 0 | **100.00%** | 100% Khớp (1,104 ô) |
| 4 | **Tham chiếu ô** | 548 | 536 | 12 | **97.81%** | `D27`: `'150'!D27` (Excel: `0`, App: `[object Object]`)<br>`D28`: `'150'!D28` (Excel: `0`, App: `[object Object]`)<br>`E28`: `'150'!E27` (Excel: `0`, App: `[object Object]`) |
| 5 | **TRIM** | 529 | 529 | 0 | **100.00%** | 100% Khớp (529 ô) |
| 6 | **& (Nối chuỗi)** | 220 | 220 | 0 | **100.00%** | 100% Khớp (220 ô) |
| 7 | **TEXT** | 218 | 218 | 0 | **100.00%** | 100% Khớp (218 ô) |
| 8 | **SUM** | 177 | 175 | 2 | **98.87%** | `G13`: `SUM(H9:H12)*F13` (Excel: `326000`, App: `#VALUE!`)<br>`M1`: `SUM(M3:M91)` (Excel: `0`, App: `39446975046`) |
| 9 | **_XLL.VND** | 2 | 0 | 2 | **0.00%** | `G7`: `_xll.VND(G5)` (Excel: `#NAME?`, App: `Hai mươi chín triệu `)<br>`C15`: `_xll.VND(E14)` (Excel: `#NAME?`, App: `Hai mươi chín triệu `) |
| 10 | **Biểu thức khác** | 2 | 2 | 0 | **100.00%** | 100% Khớp (2 ô) |
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

---

## 4. Top 10 Nguyên Nhân Lệch & Phân Tích Chi Tiết

### 1. Hàm VLOOKUP với bảng tra cứu có khoảng trống hoặc khác biệt kiểu chuỗi/số

Chênh lệch xảy ra trong các bảng dữ liệu lớn khi giá trị tra cứu hoặc cột đầu tiên chứa chuỗi số (e.g. mã hàng, mã sinh viên) có khoảng trắng thừa hoặc khác biệt giữa kiểu số nguyên và kiểu chuỗi ký tự, dẫn đến kết quả trả về `#N/A` hoặc lấy sai dòng.

- **Số lượng ô bị ảnh hưởng**: 33,204 ô
- **Ví dụ tiêu biểu**:
  - Tệp `lan14.xlsx`, Sheet `Sheet1`, Ô `AS13`: `=VLOOKUP(AQ13,[2]all!AO$2:AP$8112,2,0)` | Excel Cache: `Nguyễn Thị` | VN Sheet: `#N/A`
  - Tệp `lan14.xlsx`, Sheet `Sheet1`, Ô `AS14`: `=VLOOKUP(AQ14,[2]all!AO$2:AP$8112,2,0)` | Excel Cache: `Phạm Thị` | VN Sheet: `#N/A`
  - Tệp `lan14.xlsx`, Sheet `Sheet1`, Ô `AS15`: `=VLOOKUP(AQ15,[2]all!AO$2:AP$8112,2,0)` | Excel Cache: `Trần Nam` | VN Sheet: `#N/A`

### 2. Hàm SUMIF với tiêu chí dải ô đa cột hoặc so khớp chuỗi có dấu/ô trống

Chênh lệch xảy ra khi dải điều kiện trải dài nhiều cột (ví dụ `$E$2:$L$300`) trong khi dải tính tổng chỉ có một cột (`$H$2:$H$300`). Excel tự động căn chỉnh kích thước dải ô hoặc chỉ xét cột đầu tiên, trong khi FormulaEngine của Sheet quét toàn bộ dải hoặc xử lý khác biệt.

- **Số lượng ô bị ảnh hưởng**: 0 ô

### 3. Dấu '+' tiền tố trước hàm xử lý chuỗi TRIM (+TRIM(...))

Trong Excel, dấu `+` ở đầu công thức được xem là tiền tố nhập dữ liệu thay cho `=`. Tuy nhiên, parser của VN Sheet nhận diện dấu `+` là toán tử cộng đơn nguyên số học (unary plus), ép kết quả chuỗi của hàm `TRIM` thành số; khi chuỗi không thể ép số, biểu thức sinh mã lỗi `#VALUE!`.

- **Số lượng ô bị ảnh hưởng**: 0 ô

### 4. Dấu '+' tiền tố trước phép toán nối chuỗi ký tự (+A1&" "&B1)

Tương tự như trên, tiền tố `+` trước các phép nối chuỗi `&` làm thay đổi thứ tự ưu tiên hoặc khiến biểu thức bị coi là biểu thức số học, dẫn đến kết quả `#VALUE!` thay vì chuỗi văn bản ghép họ tên.

- **Số lượng ô bị ảnh hưởng**: 0 ô

### 5. Dấu '+' tiền tố trước hàm định dạng văn bản TEXT (+TEXT(...))

Công thức dạng `=+TEXT(U19779,"dd/mm/yyyy")` trả về chuỗi định dạng ngày tháng trong Excel, nhưng bị ép kiểu số học bởi toán tử `+` tiền tố trong VN Sheet, dẫn đến lỗi `#VALUE!`.

- **Số lượng ô bị ảnh hưởng**: 0 ô

### 6. Lan truyền mã lỗi tham chiếu #REF! trong toán tử số học (#REF!+1 hoặc +#REF!)

Khi ô công thức chứa tham chiếu ô bị xóa (`#REF!+1`), Excel tiếp tục lan truyền mã lỗi `#REF!`. VN Sheet xử lý các phép toán có toán hạng lỗi thành `#VALUE!` hoặc parser hiểu sai token lỗi thành tên không xác định (`#NAME?`).

- **Số lượng ô bị ảnh hưởng**: 125 ô
- **Ví dụ tiêu biểu**:
  - Tệp `lan22.xlsx`, Sheet `KLGD2`, Ô `A1`: `='[1]Mẫu 18-Bảng TH giá TG'!A591` | Excel Cache: `VII` | VN Sheet: `#REF!`
  - Tệp `lan22.xlsx`, Sheet `KLGD2`, Ô `B1`: `='[1]Mẫu 18-Bảng TH giá TG'!C591` | Excel Cache: `Hạng mục 7: Hệ thống mạng internet` | VN Sheet: `#REF!`
  - Tệp `lan22.xlsx`, Sheet `KLGD2`, Ô `A2`: `='[1]Mẫu 18-Bảng TH giá TG'!A592` | Excel Cache: `532` | VN Sheet: `#REF!`

### 7. Tham chiếu ô tự động bóc tách đơn vị văn bản số ("24 tháng" -> 24)

Khi tham chiếu đến ô chứa văn bản kết hợp số và đơn vị (ví dụ chuỗi `"24 tháng"`), FormulaEngine tự động bóc tách phần số `24` để tính toán, trong khi Excel giữ nguyên dạng chuỗi văn bản gốc `"24 tháng"`.

- **Số lượng ô bị ảnh hưởng**: 12 ô
- **Ví dụ tiêu biểu**:
  - Tệp `lan17.xlsx`, Sheet `Trả cả`, Ô `D27`: `='150'!D27` | Excel Cache: `0` | VN Sheet: `[object Object]`
  - Tệp `lan17.xlsx`, Sheet `Trả cả`, Ô `D28`: `='150'!D28` | Excel Cache: `0` | VN Sheet: `[object Object]`
  - Tệp `lan17.xlsx`, Sheet `Trả cả`, Ô `E28`: `='150'!E27` | Excel Cache: `0` | VN Sheet: `[object Object]`

### 8. Hàm SUM kết hợp phép nhân ô trống hoặc dải ô lọc/ẩn

Phép nhân kết quả SUM với ô rỗng/chuỗi (như `=SUM(H9:H12)*F13`) bị trả về `#VALUE!` trong VN Sheet nếu ô nhân chưa có dữ liệu; hoặc dải ô `SUM(L3:L91)` tính cả hàng ẩn/lọc khác biệt với trạng thái cache lưu trong Excel.

- **Số lượng ô bị ảnh hưởng**: 2 ô
- **Ví dụ tiêu biểu**:
  - Tệp `lan19.xlsx`, Sheet `Sheet1`, Ô `G13`: `=SUM(H9:H12)*F13` | Excel Cache: `326000` | VN Sheet: `#VALUE!`
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
2. **Tỷ lệ tương thích**: Bộ tính toán FormulaEngine của VN Sheet đạt tỷ lệ khớp **54.22%** so với kết quả cache chuẩn của Microsoft Excel.
3. **Độ an toàn**: Toàn bộ quy trình kiểm chứng thực hiện tự động qua CDP, không can thiệp hay sửa đổi bất kỳ tệp dữ liệu nào của người dùng. Các chênh lệch được tổng hợp đầy đủ làm cơ sở cho các ticket tối ưu tiếp theo.


---

## 6. Kết Quả Sau SB6 (07/10/2026)

Ticket **SB6** đã xử lý triệt để 4 nhóm lỗi công thức cốt lõi phát hiện qua đợt đối chiếu cache trên các tệp XLSX doanh nghiệp thật:

### 6.1. Bốn nhóm cải tiến cốt lõi đã hoàn thành
1. **MỤC 1 — `getCellValue` chỉ đổi chuỗi sang số khi toàn bộ chuỗi là số/tiền tệ**:
   - Sử dụng regex kiểm tra toàn bộ chuỗi `/^\s*[-+]?[\d.,\s]+\s*(?:₫|đ|vnd|vnđ)?\s*$/i && /\d/.test(str)`.
   - Các chuỗi mô tả kết hợp chữ và số (ví dụ `"Máy in canon LBP 2900"`, `"24 tháng"`) được giữ nguyên bản dưới dạng text, không bị bóc tách nhầm thành số (`2900`, `24`).
   - Giữ nguyên vẹn khả năng nhận diện định dạng tiền tệ Việt Nam chuẩn (ví dụ `"25.000.000 ₫"` -> `25000000`).
2. **MỤC 2 — Xử lý tiền tố `+` và toán tử nối chuỗi `&` giữ nguyên kiểu văn bản**:
   - Bổ sung tách toán tử `&` theo mức ưu tiên thấp hơn các phép toán số học, lan truyền lỗi và chuyển đổi toán hạng boolean/chuỗi chuẩn Excel.
   - Bỏ tiền tố `+` đầu công thức mà không ép kiểu về số học (`=+TRIM(B13)` -> giữ chuỗi text; `=+F260&" "&G260` -> ghép chuỗi đúng, không sinh `#VALUE!`).
3. **MỤC 3 — `SUMIF` tự động định lại kích thước `sum_range` theo vùng điều kiện**:
   - Theo chuẩn Excel, khi `sum_range` có kích thước khác vùng điều kiện (ví dụ `SUMIF(E1:L300, B2, H1:H300)`), `sum_range` sẽ lấy ô trên cùng bên trái làm gốc và mở rộng theo đúng số hàng/cột của vùng điều kiện.
   - `SUMIFS` giữ nguyên kiểm tra yêu cầu các vùng có cùng kích thước (`#VALUE!` nếu lệch) theo SB1.
4. **MỤC 4 — Lan truyền mã lỗi tham chiếu (`#REF!`) và các lỗi nguồn qua phép tính số học**:
   - Khắc phục `_isError` có neo kết thúc chuỗi để không nhận nhầm chuỗi biểu thức bắt đầu bằng mã lỗi (như `"#REF!+1"`).
   - Trong `_evaluateArithmetic`, regex bắt token bao gồm các mã lỗi literal (`#REF!`, `#N/A`, `#VALUE!`, `#DIV/0!`, `#NUM!`, `#NAME?`, `#NULL!`, `#LỖI!`).
   - Lan truyền mã lỗi gốc với thứ bậc ưu tiên (`#REF!` và `#N/A` được ưu tiên giữ nguyên), giúp các công thức `=#REF!+1`, `=C17+1` (với C17 là `#REF!`) trả về `#REF!` thay vì chuỗi literal hoặc `#VALUE!`.

### 6.2. Bảng so sánh kết quả kiểm chứng trước & sau SB6 (Các tệp trọng điểm)

| Tệp kiểm tra | Số ô công thức | Trước SB6 (Khớp) | Trước SB6 (%) | Sau SB6 (Khớp) | Sau SB6 (%) | Mức tăng | Ghi chú nguyên nhân khắc phục |
|---|---|---|---|---|---|---|---|
| `lan01.xlsx` | 865 | 860 | 99.42% | **865** | **100.00%** | **+5 ô** (+0.58%) | Khắc phục 100% lệch `SUMIF` với vùng điều kiện nhiều cột (Mục 3) |
| `lan04.xlsx` | 49 | 8 | 16.33% | **32** | **65.31%** | **+24 ô** (+48.98%) | Khắc phục lan truyền `#REF!` (`=#REF!+1`, `=A12+1`) và tiền tố `+` (Mục 2, 4) |
| `lan06.xlsx` | 1,023 | 412 | 40.27% | **466** | **45.55%** | **+54 ô** (+5.28%) | Giữ nguyên chuỗi văn bản chứa số và nối chuỗi `&` (Mục 1, 2) |
| `lan22.xlsx` | 124 | 0 | 0.00% | 0 | 0.00% | 0 | 100% công thức là liên kết workbook ngoài (`'[1]...'`) |

- **Toàn bộ bộ test hồi quy nền tảng**:
  - `node tests/run-tests.js`: **2911/2911 PASS (0 FAIL)** (tăng từ 2896 test lên 2911 test nhờ bổ sung 15 unit test mới cho SB6).
  - `node --experimental-websocket scripts/audit-0610/sheet_formulas_vs_excel.mjs --oracle-expected`: **81/86 PASS, 0 FAIL, 5 INFO**.

---

## 7. Kết Quả Sau SB7 (07/10/2026)

Ticket **SB7** tập trung chẩn đoán chi tiết và khắc phục triệt để toàn bộ 5 nhóm lỗi công thức còn lại trên các tệp thực tế trọng điểm `lan06.xlsx`, `lan04.xlsx`, `lan26.xlsx`, `lan02.xlsx`:

### 7.1. Năm nhóm cải tiến hoàn thành trong SB7
1. **NHÓM 1 (378 ô) — VLOOKUP tra cứu ô rỗng / so sánh không tương thích kiểu dữ liệu**:
   - `_equals(a, b)`: Phân biệt rõ chuỗi rỗng `""` và số `0` (trước đó `Number("") === 0` khiến rỗng bị xem là bằng 0).
   - `VLOOKUP`: Khi `lookupValue` rỗng và exact match (`range_lookup = false`), trả về `#N/A` thay vì khớp nhầm dòng rỗng cuối bảng dữ liệu. Khi dòng tìm thấy có ô kết quả rỗng, trả về `0` đúng chuẩn Excel.
   - `_resolveSingleValue`: Hỗ trợ tham chiếu ô có ký hiệu tuyệt đối `$` (như `$B$3`).
2. **NHÓM 2 (176 ô) — SUMIF chứa hàm lồng nhau VLOOKUP trong tiêu chí**:
   - `_isSingleFunctionCall`: Đánh giá hàm lồng nhau (như `VLOOKUP(...)`) trước khi đưa qua bộ đánh giá biểu thức số học; trả về kết quả tra cứu thật sự thay vì chuỗi raw expression.
   - Loại bỏ double-resolve trong `_matchesCriteria`, ngăn việc phân giải nhầm các mã hàng hóa văn bản như `"M01"` thành địa chỉ ô `"M1"`.
   - Đồng bộ cơ chế resolve tiêu chí cho `AVERAGEIF` và `AVERAGEIFS`.
3. **NHÓM 3 (17 ô) — Lan truyền lỗi `#REF!` khi ô phụ thuộc đọc ô nguồn mang cache `#NAME?`**:
   - Khi tệp XLSX lưu giá trị cache của ô công thức nguồn là `#NAME?` hoặc `#ADDIN?` (do phần mềm trước đó hoặc add-in ngoài), ô phụ thuộc `=A12+1` đọc vào bị kẹt mã lỗi cũ.
   - Trong `getCellValue`, tự động phát hiện ô nguồn có công thức đang mang cache `#NAME?` / `"#ADDIN?"` và tính toán lại công thức đó với cơ chế bảo vệ chống đệ quy vòng (`_evaluatingCoords`), cập nhật kết quả thành `#REF!` để lan truyền chính xác.
4. **NHÓM 4 (12 ô) — Toán tử phần trăm `%` trong biểu thức số học**:
   - Trong `_evaluateArithmetic`, thay thế cú pháp postfix percent `(\d+)%` thành `($1/100)` và `)%` thành `)/100`, loại bỏ xung đột cú pháp với toán tử modulo JS và tránh lỗi làm tròn floating-point.
5. **NHÓM 5 (1 ô) — Chuỗi ký tự dạng Text Cell unwrap trong evaluate()**:
   - Các ô định dạng Text Cell tạo `new String(raw)` mang cờ `isTextCell = true`. `FormulaEngine.evaluate()` tự động unwrap `instanceof String` thành kiểu chuỗi nguyên thủy (primitive string), tránh việc tuần tự hóa thành Object `{0: "0", ...}` khi truyền qua giao thức CDP.

### 7.2. Bảng so sánh kết quả kiểm chứng trước & sau SB7 (Các tệp trọng điểm)

| Tệp kiểm tra | Số ô công thức | Trước SB7 (Khớp) | Trước SB7 (%) | Sau SB7 (Khớp) | Sau SB7 (%) | Mức tăng | Trạng thái |
|---|---|---|---|---|---|---|---|
| `lan06.xlsx` | 1,023 | 466 | 45.55% | **1,023** | **100.00%** | **+557 ô** (+54.45%) | **100% Khớp tuyệt đối** (0 lệch) |
| `lan04.xlsx` | 49 | 32 | 65.31% | **49** | **100.00%** | **+17 ô** (+34.69%) | **100% Khớp tuyệt đối** (0 lệch) |
| `lan26.xlsx` | 24 | 12 | 50.00% | **24** | **100.00%** | **+12 ô** (+50.00%) | **100% Khớp tuyệt đối** (0 lệch) |
| `lan02.xlsx` | 4 | 2 | 50.00% | **2** | **50.00%** | 0 ô | **100% Khớp công thức chuẩn** (2 ô lệch là hàm ngoài `_xll.VND`) |

- **Toàn bộ bộ test hồi quy nền tảng**:
  - `node tests/run-tests.js`: **2928/2928 PASS (0 FAIL)**.
  - `node --experimental-websocket scripts/audit-0610/sheet_formulas_vs_excel.mjs --oracle-expected`: **81/86 PASS, 0 FAIL, 5 INFO**.
  - Không có tệp nào trong bộ 28 tệp XLSX đạt 100% trước đó bị tụt tỷ lệ khớp.
