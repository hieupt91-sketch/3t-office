# Audit định dạng có điều kiện và xác thực dữ liệu — 16/10/2026

## Phạm vi và phương pháp

- Mục tiêu: đối chiếu từng nhóm định dạng có điều kiện (CF) và xác thực dữ liệu (DV) của VN Sheet với Excel 2016, sửa sai lệch, rồi kiểm tra lưu/mở lại `.xlsx`.
- Năng lực hiện hữu được tái sử dụng: model CF trong `apps/sheet/conditional-formatting.js`, model DV trong `apps/sheet/sheet-data-rules.js`, UI của `SheetGridController`, metadata FODS và hậu xử lý OOXML trong VN LibreOffice Adapter. Không sửa LibreOffice Core, không thêm dependency.
- Oracle: `tests/live/sheet-cf-dv-excel2016-oracle.ps1` tạo sổ tạm bằng Excel COM 16.0, đọc `FormatConditions`, `DisplayFormat.Interior.Color`, DataBar, ColorScale, IconSet và `Range.Validation.Value`; lưu `.xlsx`, mở lại ReadOnly và đọc lại cấu trúc. Excel không bị đặt `Visible=$false`; test chỉ kết thúc PID Excel do chính nó tạo.
- VN Sheet: unit test đánh giá model trên cùng dữ liệu; desktop CDP tạo quy tắc thật, lưu `.xlsx`, mở lại trong app; PowerShell COM đọc ReadOnly chính tệp do app lưu.
- Rủi ro chính: LibreOffice có thể chuẩn hóa hoặc bỏ metadata CF/DV khi chuyển đổi. Cách giảm rủi ro là giữ metadata ở tầng Adapter và vá OOXML sau chuyển đổi. Rollback: hoàn nguyên commit H3; không có migration dữ liệu hay Core patch.

## Kết quả CF theo từng loại

Màu tô oracle là `#FFF2CC`. Dấu `-` nghĩa là không tô. Với dữ liệu trực quan, bảng ghi màu/ngưỡng thay vì màu nền thường.

| Loại | Excel 2016 đo thật | VN trước H3 | VN sau H3 |
|---|---|---|---|
| Lớn hơn (`1,2,3,4,5`; ngưỡng 3) | `-,-,-,#FFF2CC,#FFF2CC` | Khớp | Khớp |
| Nhỏ hơn (ngưỡng 3) | `#FFF2CC,#FFF2CC,-,-,-` | Khớp | Khớp |
| Giữa (2–4) | `-,#FFF2CC,#FFF2CC,#FFF2CC,-` | Khớp | Khớp |
| Bằng (3) | `-,-,#FFF2CC,-,-` | Khớp | Khớp |
| Văn bản chứa (`an`) | `#FFF2CC,#FFF2CC,-,#FFF2CC,-`; không phân biệt hoa thường | Khớp | Khớp |
| Ngày xảy ra — hôm nay | Chỉ ngày hiện tại được tô; `Type=11`, `DateOperator=0` | Khớp | Khớp |
| Giá trị trùng lặp (`1,2,2,4,4`) | `-,#FFF2CC,#FFF2CC,#FFF2CC,#FFF2CC` | Khớp | Khớp |
| Top N (`10,40,30,20,50`; N=2) | Tô 40 và 50; `Type=5`, `Rank=2`, `Percent=false`, `TopBottom=1` | Khớp | Khớp |
| Bottom N (N=2) | Tô 10 và 20; `TopBottom=0` | Khớp | Khớp |
| Top % (40%) | Tô 40 và 50; `Rank=40`, `Percent=true`, `TopBottom=1` | Thiếu loại riêng; không tạo/đọc lại đúng cờ `%` | Khớp; UI giới hạn 1–100, OOXML `top10 percent="1"` |
| Bottom % (40%) | Tô 10 và 20; `TopBottom=0` | Thiếu loại riêng | Khớp; UI và round-trip giữ đúng loại |
| Trên trung bình (`1,2,3,4,10`) | Chỉ 10 được tô | Khớp | Khớp |
| Dưới trung bình | 1, 2, 3 được tô | Khớp | Khớp |
| Thanh dữ liệu (`0,25,50,75,100`) | Mốc thấp/cao `lowest/highest`; `PercentMin=0`, `PercentMax=100`; màu `#638EC6` | Thanh nhỏ nhất bị ép thành 1% | Khớp 0%, 25%, 50%, 75%, 100%; giữ `cfvo` khi mở/lưu |
| Thang 2 màu | `#F8696B,#D37E6F,#AE9373,#89A877,#63BE7B` | Sai làm tròn một số kênh RGB (`#AE9473`, `#88A977`) | Khớp đủ 5/5 màu |
| Thang 3 màu (`0,1,2,3,100`) | `#F8696B,#FBAA77,#FFEB84,#FEEB84,#63BE7B`; giữa là percentile 50 | Dùng 50% khoảng min–max, không dùng phân vị; màu giữa sai | Khớp đủ 5/5 màu; giữ mốc `min / percentile 50 / max` |
| Bộ 3 biểu tượng (`0,32,33,66,67,100`) | Mốc phần trăm 0/33/67, toán tử `>=`; nhóm `thấp, thấp, giữa, giữa, cao, cao` | Giá trị 33 còn ở nhóm thấp do chia ba khoảng đều | Khớp đúng ranh 33/67 và cờ `gte` |
| Công thức (`=MOD(R1,2)=0`) | Tô hàng 2 và 4 | Khớp | Khớp |
| Ô trống (`blank,x,blank,0," "`) | Tô ô trống thật và chuỗi chỉ có khoảng trắng; `Type=10` | Khớp | Khớp |

Excel COM lưu và mở lại sổ oracle giữ 19/19 quy tắc. Desktop VN Sheet tạo/lưu/mở lại 19/19; Excel COM ReadOnly đọc đúng từng vùng B:T, gồm `Percent=true` ở S/T, DataBar `Type=4`, ColorScale `Type=3`, IconSet `Type=6`.

## Kết quả DV

| Nội dung | Excel 2016 đo thật | VN trước H3 | VN sau H3 |
|---|---|---|---|
| 7 kiểu | Số nguyên=1, Thập phân=2, Danh sách=3, Ngày=4, Giờ=5, Độ dài văn bản=6, Tùy chỉnh=7 | Khớp | Khớp; không cần sửa logic |
| 8 toán tử | Giữa=1, Không giữa=2, Bằng=3, Khác=4, Lớn hơn=5, Nhỏ hơn=6, Lớn hơn hoặc bằng=7, Nhỏ hơn hoặc bằng=8 | Khớp | Khớp |
| Bỏ qua ô trống | `IgnoreBlank=true` nhận ô rỗng; `false` từ chối ô rỗng | Khớp | Khớp |
| Thông báo nhập | Giữ `ShowInput`, tiêu đề và nội dung | Khớp | Khớp |
| Cảnh báo lỗi | Dừng=1, Cảnh báo=2, Thông tin=3; giữ tiêu đề/nội dung | Khớp | Khớp |
| Kiểm tra giá trị | Mỗi kiểu nhận mẫu đúng và từ chối mẫu sai qua `Range.Validation.Value` | Khớp | Khớp |
| Khoanh vòng dữ liệu sai | `CircleInvalid()` chạy; 16 ô được đặt mẫu sai đều có `Validation.Value=false` | Khớp bằng trạng thái `is-validation-invalid` trong lưới | Khớp |
| Lưu/mở lại | Excel mở lại giữ 16/16 ca kiểu/toán tử/IgnoreBlank/AlertStyle | Khớp | Desktop tạo đủ 7 kiểu và 8 toán tử trong 11 quy tắc; app và Excel COM ReadOnly mở lại đúng 11/11 |

## Thay đổi triển khai

- Bổ sung `topPercent` và `bottomPercent` xuyên suốt model, UI, i18n VI/EN, Help và OOXML (`percent="1"`).
- Nội suy màu dùng cách cắt phần chênh kênh RGB như Excel 2016; thang 3 màu dùng percentile 50.
- Thanh dữ liệu cho phép 0%; bộ biểu tượng xét đúng ngưỡng 33/67 và toán tử `>=`.
- Parser/writer OOXML giữ các `cfvo` của DataBar, ColorScale và IconSet, gồm `min`, `max`, `num`, `percent`, `percentile`, `formula` và `gte`.
- DV đã có đủ tính năng theo oracle nên không refactor ngoài scope; chỉ bổ sung oracle và test parity để khóa hành vi.

## Nghiệm thu đã chạy

- `npm test`: PASS 3396/3396.
- Python tập trung CF/DV: PASS 4/4.
- Excel 16.0 oracle: PASS; 19 CF, 16 ca DV, lưu/mở lại đủ.
- Desktop CDP + Excel COM ReadOnly: CF 19/19; DV 11/11 quy tắc, đủ 7 kiểu và 8 toán tử.
- Structural oracle 1–6: PASS 61/61 kịch bản, 580/580 ô.
- Dirty-save batch: PASS 10/10 (`lan01,02,04,06,09,11,22,26,13,19`), tất cả `saved=yes`, `diffs=0`, `lint=clean`, `excel=PASS`.
- Công thức/cache: lan28 271/275 = 98,55%; lan01 865/865 và lan04 49/49 = 100%.
- Build đóng gói: NOT RUN — ticket không yêu cầu thay build system hay tạo gói cài đặt.

## Giới hạn đã biết

- Bốn công thức cache còn lệch ở lan28 nằm ngoài CF/DV; tỷ lệ 98,55% vẫn vượt cổng 98,18%.
- Giao diện tạo quy tắc cung cấp các preset ngưỡng chuẩn. Ngưỡng native tùy chỉnh từ tệp được giữ và dựng lại, nhưng chưa có trình soạn chi tiết từng `cfvo` trong hộp thoại.
- Không có Core patch; không thay format semantics, security boundary hay luồng dữ liệu AI.
