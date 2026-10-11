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
