# Excel 2016 E4 — Ma trận hộp thoại và tính năng

**Nhánh:** `fix/excel-e4-codex`  
**Worktree:** `E:\VNOffice-codex-fe4`  
**Chuẩn:** Excel 2016 bản 16.0.4266.1001. Excel COM chỉ đọc, mỗi tệp được mở riêng lẻ và đóng bằng đối tượng COM do phiên kiểm tra tạo. Tệp kiểm nằm trong `E:\VNOffice-profiles\codex-fe4`, không sửa bộ mẫu LAN.

## Phương pháp

1. Mở VN Sheet desktop từ worktree qua `main.py`; mọi thao tác tính năng dùng CDP mouse/key event từ `tests/live/cdp/actions.mjs`.
2. Lưu XLSX qua dịch vụ lưu của app sau khi thao tác UI. Tệp kiểm tra được lưu ngoài repo.
3. Mở riêng từng XLSX bằng Excel 2016 COM ở chế độ chỉ đọc và đọc thuộc tính/ô liên quan.
4. Mở lại XLSX trong VN Sheet desktop; với nhiều trang tính, chuyển trang bằng thao tác chuột CDP rồi đọc lại trạng thái ô.
5. Ghi đúng trạng thái: PASS chỉ khi thao tác, lưu, Excel đọc lại và app mở lại đều được xác nhận; FAIL khi có sai lệch đã tái hiện; NOT RUN khi chưa kiểm.

## Kết quả theo tính năng

| Tính năng | Đường dẫn UI hiện có | Thao tác desktop | Đọc lại Excel 2016 | Mở lại VN Sheet | Trạng thái |
|---|---|---|---|---|---|
| Định dạng ô (Số/Căn lề/Phông/Viền/Tô) | Trang đầu > Số > Định dạng ô (Ctrl+1); Trang đầu > Phông chữ/Căn lề | Tiền tệ 2 số lẻ; B2 đậm, 16 pt, Arial, tô vàng, bốn viền, căn giữa, xoay 90° | Excel NumberFormat=`#,##0.00 [$₫]`; Font.Bold=1, Size=16, Name=Arial, Fill=65535, HAl=-4108, 4 cạnh viền, Orientation=-4171 | VN Sheet mở lại xác nhận currency, bold, size, font, fill, borders, align, rotation | **PASS** |
| Dán đặc biệt | Trang đầu > Bảng nhớ tạm > Dán đặc biệt; hoặc Ctrl+Alt+V | Dán giá trị, định dạng và công thức qua hộp thoại; mở menu chuột phải để dán công thức | I2=1234.5; F3 giữ `=C3*D3`; kiểu chữ đậm của ô định dạng được giữ | I2=1234.5; F3 formula=`=C3*D3` | **PASS** |
| Tìm/Thay (tùy chọn) | Ctrl+H; hộp thoại Tìm và Thay thế | Thử phân biệt hoa/thường và thay “ghi chú C” thành “Đã thay” trên hai trang | Excel đọc “Đã thay” ở G2 trên Sheet1 và Sheet2 | Mở lại, bấm tab Sheet1 và đọc G2=“Đã thay” | **PASS** |
| Sắp xếp nhiều cấp | Dữ liệu > Sắp xếp & Lọc > Sắp xếp tùy chỉnh | Sắp xếp Tên tăng dần, rồi Số tiền giảm dần | B2:C6: Hoàng Văn E, Lê Văn C, Nguyễn Văn A/5678.9, Nguyễn Văn A/1234.5, Phạm Thị D | B2=Hoàng Văn E | **PASS** |
| Bộ lọc | Dữ liệu > Sắp xếp & Lọc > Bộ lọc | Bật AutoFilter trên bảng dữ liệu | Excel AutoFilterMode=1 | isFilterActive=true | **PASS** |
| Xác thực dữ liệu | Dữ liệu > Công cụ dữ liệu > Xác thực dữ liệu | Tạo danh sách Open,Closed cho C2 | C2 Validation.Type=3; Formula1=Open,Closed | data validation list trên C2 có hai giá trị | **PASS** |
| Định dạng có điều kiện / quản lý quy tắc | Trang đầu > Kiểu > Định dạng có điều kiện | Tạo quy tắc >2000, mở lại danh sách, xóa rồi thêm lại quy tắc | Excel FormatConditions=1; Formula1=2000; AppliesTo=C2:C6 | Một quy tắc greaterThan 2000 trên C2:C6 | **PASS** |
| Tên / Name Manager | Công thức > Tên đã xác định > Trình quản lý tên | Tạo tên workbook SampleNames trỏ B2 | Excel Names.Count=1; RefersTo=Sheet1!$B$2 | namedRangesWorkbook giữ SampleNames → B2 | **PASS** |
| Đóng băng ngăn | Chế độ xem > Cửa sổ > Cố định ngăn | Freeze Panes tại B2 | Excel SplitRow/SplitColumn=1/1 | Mở lại frozenRows=1, frozenCols=1 | **PASS** |
| Chia ngăn (Split) | Chưa thấy lệnh Split trong ribbon Sheet hiện tại | Chưa có thao tác | NOT RUN | NOT RUN | **GAP / NOT RUN** |
| Thiết lập trang / In | Bố trí trang > Thiết lập trang; Tệp > Xem trước khi in | Landscape, Legal, scale 80%, lặp hàng 1, header, print area A1, chèn/xóa ngắt tại C5 | Excel Orientation=2, PaperSize=5, Zoom=80, TitlesRows=$1:$1, HeaderRight=VN Office S12, PrintArea=$A$1; HBreaks=5/VBreaks=3 rồi xóa hết | Mở lại model xác nhận thiết lập và page breaks | **PASS** |
| Biểu đồ | Chèn > Biểu đồ | Tạo cột, đường, tròn, vùng từ A1:C6 | Excel ChartObjects=1, Series=1, HasTitle=true, HasLegend=true, tiêu đề Biểu đồ A1:C6; loại 51/4/5/1; trục có ở mọi loại trừ pie | Mở lại có chart model, tiêu đề, 5 nhãn/giá trị | **PASS; axis-title editing unavailable** |
| Bảng | Trang đầu > Kiểu > Định dạng dưới dạng bảng | Chọn kiểu TableStyleMedium2, xác nhận tên Table1 và vùng A1:G6 | Excel ListObjects.Count=1; style TableStyleMedium2; filter và stripes bật | Mở lại Table1, A1:G6, hasHeaders=true | **PASS** |
| PivotTable | Dữ liệu > Bảng tổng hợp > PivotTable | Tạo hàng Họ tên, tổng Số tiền từ A1:C6 | Excel Worksheet.PivotTables.Count=1 trên Sheet1 (2), tổng theo tên đọc được | Mở lại cấu hình nguồn, trường hàng/giá trị và trang đích | **PASS** |
| Sparkline | Chèn > Sparklines > Đường / Cột | Tạo từng loại trong C6 từ C2:C6 | Excel SparklineGroups.Count=1; Type=1 (line), 2 (column) | Mở lại type và sourceRange C2:C6 | **PASS** |

## Bằng chứng nhóm A

Lệnh desktop: `scripts/audit-0610/word_parallel/app-ops-sheet.desktop.mjs` với `OPS=s16CellsDialog,pasteSpecialPack,findReplacePack`. Lệnh đọc Excel: `scripts/audit-0610/word_parallel/excel-read.ps1`. Lệnh mở lại trong app: `tests/live/cdp/sheet-e4-reopen.desktop.mjs`.

- Định dạng ô: CDP thao tác hộp thoại Ctrl+1, lưu `app_s16CellsDialog.xlsx`; Excel đọc đúng mã tiền tệ; app mở lại đọc được category, số lẻ và ký hiệu. Riêng các phần font/căn lề/viền/tô/hướng chữ được chạy lần lượt qua ribbon/hộp thoại với `OPS=bold,size16,fontArial,fillDefault,bordersDefault,alignCenter,rotation90`; Excel và VN Sheet mở lại đều xác nhận các giá trị trên.
- Dán đặc biệt: CDP thao tác các lựa chọn Giá trị, Định dạng, Công thức; lưu `app_pasteSpecialPack.xlsx`; Excel và app mở lại đọc đúng giá trị/công thức.
- Tìm/Thay: CDP thay trên cả hai trang và lưu `app_findReplacePack.xlsx`; Excel xác nhận hai giá trị G2; app mở lại và chuyển sang Sheet1 bằng chuột CDP để xác nhận.
- Một lần chạy ban đầu trả lỗi lưu thoáng qua cho Tìm/Thay, nhưng chạy lại cùng luồng thành công. Không che lỗi; cần quan sát lại nếu lỗi lặp lại.

## Bằng chứng nhóm B

Lệnh desktop: `scripts/audit-0610/word_parallel/app-ops-sheet.desktop.mjs` với `OPS=customSort,filter,validation,conditional,definedName`, sau đó `OPS=conditionalManager`. Đọc Excel: `scripts/audit-0610/word_parallel/excel-read.ps1`. Mở lại app: `tests/live/cdp/sheet-e4-reopen.desktop.mjs`.

- Sắp xếp: CDP thao tác hai cấp; Excel xác nhận thứ tự tên tăng dần, số tiền giảm dần ở các tên trùng; Sheet mở lại giữ thứ tự.
- Lọc: Excel AutoFilterMode=1; Sheet mở lại isFilterActive=true.
- Xác thực: Excel đọc loại List và nguồn Open,Closed; Sheet mở lại giữ rule ở C2.
- Định dạng có điều kiện: UI cho xem danh sách và xóa rule; CDP xóa rồi thêm lại; Excel xác nhận AppliesTo=C2:C6, công thức ngưỡng 2000; Sheet mở lại giữ đúng vùng.
- Tên: Excel đọc tên SampleNames tham chiếu Sheet1!$B$2; Sheet mở lại giữ tên workbook.

## Giới hạn đang rà soát

- Lệnh Split chưa có đường dẫn UI rõ ràng trong ribbon; chưa được tính là tương đương Excel.
- Trạng thái PivotTable phải được đối chiếu bằng `Worksheet.PivotTables()` trong Excel; chỉ có bảng tổng hợp giá trị không đủ để xác nhận PivotTable thật.

## Bằng chứng nhóm C

Lệnh desktop: `OPS=freezePanes,pageSetup,pageSize,pageScale,printTitles,headerFooter,printArea`. Excel COM đọc lần lượt từng tệp với `ReadOnly=true`; VN Sheet mở lại từng tệp qua CDP.

- Cố định ngăn: Excel đọc `SplitRow=1`, `SplitColumn=1`; VN Sheet mở lại `frozenRows=1`, `frozenCols=1`.
- In: Excel đọc Landscape, Legal (PaperSize=5), Zoom=80, hàng lặp `$1:$1`, header phải `VN Office S12`, print area `$A$1`. CDP cũng chèn ngắt trang tại C5 (Excel HBreaks=5, VBreaks=3), sau đó chạy luồng xóa ngắt (Excel không còn H/V breaks). VN Sheet mở lại đọc lại các thiết lập trang từ model.
- Chia ngăn độc lập (Split) chưa có lệnh riêng trong ribbon; tính năng GAP, chưa xác minh.

## Bằng chứng nhóm D

Lệnh desktop: `OPS=chart,chartBar,chartLine,chartPie,chartArea,formatAsTable,pivotTable,sparklineLine,sparklineColumn`; với bảng, luồng CDP chọn kiểu, cuộn hộp thoại và bấm Tạo. Excel COM đọc từng tệp riêng ở ReadOnly; VN Sheet mở lại từng tệp.

- Biểu đồ: Excel xác nhận một chart, một series, `HasTitle=true`, `HasLegend=true`, title “Biểu đồ A1:C6”; loại chart COM lần lượt là 51 (default/bar), 51 (bar), 4 (line), 5 (pie), 1 (area). Axes hiện diện với bar/line/area, không có ở pie; hiện không có UI đặt tên riêng cho trục. VN Sheet đọc lại các chart model và tiêu đề.
- Bảng: Excel `ListObjects.Count=1`, `TableStyleMedium2`; VN Sheet giữ Table1, A1:G6, header, filter và row stripes.
- PivotTable: Excel `Worksheet.PivotTables().Count=1` trên Sheet1 (2); VN Sheet giữ nguồn A1:C6, hàng Họ tên và SUM Số tiền.
- Sparklines: Excel đọc một SparklineGroup trên C6; Type=1 cho line, Type=2 cho column. VN Sheet mở lại đúng type và source C2:C6.

## Cổng tổng thể trước handoff

| Cổng | Kết quả |
|---|---|
| `npm test` | **PASS** — 3120/3120, 0 lỗi |
| `python -m unittest discover -s tests` | **PASS** — 912 tests, 555.346 giây; có ResourceWarning về stream chưa đóng sau khi hoàn tất |
| Batch XLSX lan01/02/04/06/09/11/22/26 | **PASS** — 8/8; `saved=yes`, `diffs=0`, `lint=clean`, `excel=PASS` |
| So công thức/cache với mốc `win-v0.9.9` | **FAIL** — hiện 0.55% (400/72,837), mốc 50.96% (37,118/72,837); 16/27 tệp có tỷ lệ số thấp hơn mốc |

Report phép đo hiện tại: `E:\VNOffice-profiles\codex-fe4\formula-cache-report.md` (ngoài repo). Bảng so từng tệp:

| Tệp | Mốc 0.9.9 | Hiện tại | So với mốc |
|---|---:|---:|---|
| lan01.xlsx | 25.90% | 24.28% | BELOW |
| lan02.xlsx | 50.00% | 0.00% | BELOW |
| lan03.xlsx | 85.26% | 2.11% | BELOW |
| lan04.xlsx | 16.33% | 51.02% | OK |
| lan05.xlsx | 100.00% | 0.00% | BELOW |
| lan06.xlsx | 40.27% | 8.21% | BELOW |
| lan07.xlsx | 92.05% | 1.53% | BELOW |
| lan08.xlsx | 100.00% | 0.00% | BELOW |
| lan09.xlsx | 50.00% | 100.00% | OK |
| lan10.xlsx | 100.00% | 33.33% | BELOW |
| lan11.xlsx | 100.00% | 100.00% | OK |
| lan12.xlsx | 100.00% | 100.00% | OK |
| lan13.xlsx | 100.00% | 4.68% | BELOW |
| lan14.xlsx | 49.84% | 0.00% | BELOW |
| lan15.xlsx | 100.00% | 100.00% | OK |
| lan16.xlsx | 100.00% | 1.56% | BELOW |
| lan17.xlsx | 95.45% | 1.17% | BELOW |
| lan18.xlsx | 100.00% | 100.00% | OK |
| lan19.xlsx | 80.00% | 0.00% | BELOW |
| lan20.xlsx | 100.00% | 100.00% | OK |
| lan21.xlsx | 100.00% | 100.00% | OK |
| lan22.xlsx | 0.00% | 0.00% | OK |
| lan23.xlsx | N/A | N/A | N/A |
| lan24.xlsx | 100.00% | 18.52% | BELOW |
| lan25.xlsx | 100.00% | 100.00% | OK |
| lan26.xlsx | 50.00% | 0.00% | BELOW |
| lan27.xlsx | 100.00% | 100.00% | OK |
| lan28.xlsx | 97.09% | 7.64% | BELOW |

Các lệch lớn tập trung ở VLOOKUP, tham chiếu ô và toán tử; ví dụ `lan14` VLOOKUP trả `#REF!` thay vì cache Excel. Sai lệch này tồn tại trong nhánh trước khi các thay đổi E4 bắt đầu; E4 không sửa FormulaEngine. Không đánh dấu cổng formula/cache PASS.

### Hạn chế E4 còn mở

- Split độc lập chưa có command/UI để thao tác, lưu và đối chiếu; trạng thái **GAP**.
- Chart hiện xác nhận loại, title mặc định, legend và trục; chưa có UI để đổi riêng title của từng trục.
