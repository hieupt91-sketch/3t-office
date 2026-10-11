# FIX-S12 results

## Nhóm Trang đầu: căn ngang

- Chạy app Sheet desktop từ worktree này trên fixture `tests/live/cdp/test_sheet_home.xlsx`; CDP thao tác nút ribbon bằng chuột, mỗi lệnh lưu thành một XLSX riêng.
- Căn giữa: `app_alignCenter.xlsx`, Excel COM mở `ReadOnly=true`, ô B2 `HorizontalAlignment=-4108` (center). **KHỚP EXCEL**.
- Căn phải: `app_alignRight.xlsx`, Excel COM mở `ReadOnly=true`, ô B2 `HorizontalAlignment=-4152` (right). **KHỚP EXCEL**.
- Ảnh CDP: `evidence/s12/fix-s12-alignCenter.png`, `evidence/s12/fix-s12-alignRight.png`.
- Nút Ngắt dòng tự động đã chạy CDP và lưu `app_wrap.xlsx`; Excel đọc `WrapText=0`, giống fixture gốc. Chưa xác nhận được kết quả bật ngắt dòng nên vẫn **CHƯA ĐỐI CHIẾU**; ảnh `evidence/s12/fix-s12-wrap.png`. Fixture gốc được mở read-only riêng và B2 cũng có `WrapText=0`.

### Kiểm chứng

- **PASS** — ba thao tác CDP lưu XLSX riêng; log ở profile audit `s12-home-format.log`.
- **PASS** — Excel COM chỉ đọc xác nhận căn giữa và căn phải; log `s12-home-format-excel.log`, `excel-alignRight.log`.
- **CHƯA ĐỐI CHIẾU** — nút Ngắt dòng: readback khớp trạng thái fixture nên chưa chứng minh thao tác đổi trạng thái.

## Nhóm Trang đầu: định dạng số

- Nút Phần trăm: thao tác CDP trên D2; Excel COM chỉ đọc xác nhận `Value2=0.075`, `NumberFormat=0%`, hiển thị `8%`. **KHỚP EXCEL**. Ảnh `evidence/s12/fix-s12-percentBtn.png`.
- Nút Tăng số thập phân: thao tác CDP trên C2; Excel COM chỉ đọc xác nhận `Value2=1234.5`, `NumberFormat=0.00`, hiển thị `1234.50`. **KHỚP EXCEL**. Ảnh `evidence/s12/fix-s12-decInc.png`.
- Lựa chọn trong danh sách Định dạng số chưa được xác nhận bằng UI/readback và vẫn **CHƯA ĐỐI CHIẾU**.

### Kiểm chứng nhóm định dạng số

- **PASS** — hai thao tác CDP lưu XLSX riêng; log `s12-format-buttons.log` trong profile audit.
- **PASS** — Excel COM ReadOnly xác nhận NumberFormat cho `app_S12_percentBtn.xlsx` và `app_S12_decInc.xlsx`; log `excel-percentBtn.log`, `excel-decInc.log`.
- **NOT RUN** — chưa chạy bộ kiểm thử tổng (`npm test`, unittest và batch XLSX); sẽ chạy khi hoàn tất lượt rà soát.

## Tab Dữ liệu: sắp xếp Z-A

- CDP chọn ô B2, bấm Sắp xếp Z-A và lưu riêng `app_S12_sortDesc.xlsx`.
- Excel COM ReadOnly xác nhận thứ tự B2:B6: `Trần Thị B / Phạm Thị D / Nguyễn Văn A / Lê Văn C / Hoàng Văn E`, đúng thứ tự giảm dần theo thao tác; **KHỚP EXCEL**.
- Ảnh UI: `evidence/s12/fix-s12-sortDesc.png`; log CDP `s12-sort-desc.log`, Excel COM `excel-sortDesc.log` trong profile audit.
- Danh sách Định dạng số qua CDP bàn phím chưa được xác nhận: probe XLSX vẫn đọc `General`; giữ CHƯA ĐỐI CHIẾU, không tính các probe này là bằng chứng.

## Tab Công thức: Trung bình

- Probe đầu phát hiện C7 nhận sai `=AVERAGE(C3:C6)`, bỏ số ở C2. Excel hướng dẫn AutoAverage nhận dải số liền kề; đã sửa `insertFormula` để quét dải số liên tục phía trên ô đang chọn.
- Sau sửa, CDP bấm Trung bình tại C7 tạo `=AVERAGE(C2:C6)`. Excel COM ReadOnly đọc lại công thức và tính `Value2=4123.02`; **KHỚP EXCEL**. AutoSum cùng điểm chọn tạo `=SUM(C2:C6)`, Excel đọc `Value2=20615.1`.
- Ảnh: `evidence/s12/fix-s12-averageBtn.png`, `evidence/s12/fix-s12-autoSum.png`. Log CDP `s12-formula-buttons-fixed.log`; Excel COM `excel-averageBtn-fixed.log`, `excel-autoSum-fixed.log`.
- Hướng dẫn range detection của Excel: [Calculate the average of a group of numbers](https://support.microsoft.com/en-us/excel/calculate-the-average-of-a-group-of-numbers).
- **PASS** — focused unit tests cho range liền kề và dừng tại ô không phải số. **NOT RUN** — npm test, unittest tổng, batch XLSX và quét mã hóa (chạy khi hoàn tất lượt rà soát).

## Tab Công thức: Đếm số

- CDP bấm Đếm số tại C7; app tạo `=COUNT(C2:C6)`. Excel COM ReadOnly xác nhận công thức và `Value2=5`; **KHỚP EXCEL**.
- Ảnh `evidence/s12/fix-s12-countNumbersBtn.png`; log CDP `s12-count-numbers.log`, Excel COM `excel-countNumbersBtn.log` trong profile audit.

## Trang đầu: tăng/giảm cỡ chữ

- Tăng cỡ chữ trên B2 từ 11 lên 12 pt; Excel COM ReadOnly xác nhận `Font.Size=12`.
- Giảm cỡ chữ ban đầu không đổi 11 pt do quy đổi 14.67 px thành 11.0025 pt, rồi chọn lại nấc 11. Đã làm tròn điểm hiện tại trước khi chọn nấc; sau sửa B2 giảm còn 10 pt trong Excel.
- Ảnh: `evidence/s12/fix-s12-fontGrow.png`, `evidence/s12/fix-s12-fontShrink.png`. Log CDP `s12-fontsize.log`, `s12-font-shrink-fixed.log`; Excel COM `excel-fontGrow.log`, `excel-fontShrink-fixed.log`.
- **PASS** — focused unit suite gồm 3 kiểm tra range AutoSum/AutoAverage và bước giảm cỡ chữ.

## Trang đầu: lệnh trộn ô

- CDP chọn A8:B8 rồi lần lượt bấm Trộn theo hàng và Trộn ô trên fixture riêng.
- Excel COM ReadOnly mở từng XLSX và xác nhận `A8.MergeCells=True` cho cả hai lệnh; **KHỚP EXCEL**.
- Ảnh `evidence/s12/fix-s12-mergeAcross.png`, `evidence/s12/fix-s12-mergeCells.png`; log CDP `s12-merge.log`, Excel COM `excel-mergeAcross.log`, `excel-mergeCells.log`.
