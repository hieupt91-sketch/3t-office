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
