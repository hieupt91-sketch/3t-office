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
| Định dạng ô (Số/Căn lề/Phông/Viền/Tô) | Trang đầu > Số > Định dạng ô; hoặc Ctrl+1 | Đổi B2 sang Tiền tệ, 2 chữ số thập phân | B2 NumberFormat = `#,##0.00 [$₫]`; giá trị “Nguyễn Văn A” còn nguyên | category=currency, decimals=2, currencySymbol=₫ | **PASS** |
| Dán đặc biệt | Trang đầu > Bảng nhớ tạm > Dán đặc biệt; hoặc Ctrl+Alt+V | Dán giá trị, định dạng và công thức qua hộp thoại; mở menu chuột phải để dán công thức | I2=1234.5; F3 giữ `=C3*D3`; kiểu chữ đậm của ô định dạng được giữ | I2=1234.5; F3 formula=`=C3*D3` | **PASS** |
| Tìm/Thay (tùy chọn) | Ctrl+H; hộp thoại Tìm và Thay thế | Thử phân biệt hoa/thường và thay “ghi chú C” thành “Đã thay” trên hai trang | Excel đọc “Đã thay” ở G2 trên Sheet1 và Sheet2 | Mở lại, bấm tab Sheet1 và đọc G2=“Đã thay” | **PASS** |
| Sắp xếp nhiều cấp | Dữ liệu > Sắp xếp & Lọc > Sắp xếp tùy chỉnh | NOT RUN | NOT RUN | NOT RUN | **NOT RUN** |
| Bộ lọc | Dữ liệu > Sắp xếp & Lọc > Bộ lọc | NOT RUN | NOT RUN | NOT RUN | **NOT RUN** |
| Xác thực dữ liệu | Dữ liệu > Công cụ dữ liệu > Xác thực dữ liệu | NOT RUN | NOT RUN | NOT RUN | **NOT RUN** |
| Định dạng có điều kiện / quản lý quy tắc | Trang đầu > Kiểu > Định dạng có điều kiện | NOT RUN | NOT RUN | NOT RUN | **NOT RUN** |
| Tên / Name Manager | Công thức > Tên đã xác định > Trình quản lý tên | NOT RUN | NOT RUN | NOT RUN | **NOT RUN** |
| Đóng băng ngăn | Chế độ xem > Cửa sổ > Cố định ngăn | NOT RUN | NOT RUN | NOT RUN | **NOT RUN** |
| Chia ngăn (Split) | Chưa thấy lệnh Split trong ribbon Sheet hiện tại | Chưa có thao tác | NOT RUN | NOT RUN | **GAP / NOT RUN** |
| Thiết lập trang / In | Bố trí trang > Thiết lập trang; Tệp > Xem trước khi in | NOT RUN | NOT RUN | NOT RUN | **NOT RUN** |
| Biểu đồ | Chèn > Biểu đồ | NOT RUN | NOT RUN | NOT RUN | **NOT RUN** |
| Bảng | Trang đầu > Kiểu > Định dạng dưới dạng bảng | NOT RUN | NOT RUN | NOT RUN | **NOT RUN** |
| PivotTable | Dữ liệu > Bảng tổng hợp > PivotTable | NOT RUN | NOT RUN | NOT RUN | **NOT RUN** |
| Sparkline | Chèn > Sparklines > Đường / Cột | NOT RUN | NOT RUN | NOT RUN | **NOT RUN** |

## Bằng chứng nhóm A

Lệnh desktop: `scripts/audit-0610/word_parallel/app-ops-sheet.desktop.mjs` với `OPS=s16CellsDialog,pasteSpecialPack,findReplacePack`. Lệnh đọc Excel: `scripts/audit-0610/word_parallel/excel-read.ps1`. Lệnh mở lại trong app: `tests/live/cdp/sheet-e4-reopen.desktop.mjs`.

- Định dạng ô: CDP thao tác hộp thoại Ctrl+1, lưu `app_s16CellsDialog.xlsx`; Excel đọc đúng mã tiền tệ; app mở lại đọc được category, số lẻ và ký hiệu.
- Dán đặc biệt: CDP thao tác các lựa chọn Giá trị, Định dạng, Công thức; lưu `app_pasteSpecialPack.xlsx`; Excel và app mở lại đọc đúng giá trị/công thức.
- Tìm/Thay: CDP thay trên cả hai trang và lưu `app_findReplacePack.xlsx`; Excel xác nhận hai giá trị G2; app mở lại và chuyển sang Sheet1 bằng chuột CDP để xác nhận.
- Một lần chạy ban đầu trả lỗi lưu thoáng qua cho Tìm/Thay, nhưng chạy lại cùng luồng thành công. Không che lỗi; cần quan sát lại nếu lỗi lặp lại.

## Giới hạn đang rà soát

- Lệnh Split chưa có đường dẫn UI rõ ràng trong ribbon; chưa được tính là tương đương Excel.
- Trạng thái PivotTable phải được đối chiếu bằng `Worksheet.PivotTables()` trong Excel; chỉ có bảng tổng hợp giá trị không đủ để xác nhận PivotTable thật.
- Các nhóm còn lại đang là NOT RUN cho đến khi hoàn tất cả bốn bước: thao tác UI, lưu, Excel COM chỉ đọc, mở lại VN Sheet.
