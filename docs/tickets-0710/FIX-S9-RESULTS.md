# FIX-S9 — kết quả đối chiếu Sheet/Excel

Worktree: `E:\VNOffice-codex-fs9` (`fix/sheet-s9-codex`)
Profile CDP: `E:\VNOffice-profiles\codex-fs9`
Phương pháp: thao tác UI qua CDP; app lưu XLSX; Excel COM mở `ReadOnly=true`, đọc xong gọi `Close($false)`/`Quit()`.

## Nhóm 1 — Công thức

**PASS sau sửa.** Ca UI nhập 29 công thức trên fixture qua CDP. SUMIF/SUMIFS, COUNTIF/COUNTIFS, IFERROR, ROUND, LEFT/MID/RIGHT, TEXT số/ngày, NA, HLOOKUP, MATCH, OFFSET, INDIRECT, SUMPRODUCT, DATE/YEAR/MONTH/DAY, EDATE/EOMONTH, WEEKDAY, NETWORKDAYS, WORKDAY, DAYS, TODAY và NOW cho kết quả khớp khi Excel tính lại. Ảnh: [fix-s9-formulas.png](evidence/fix-s9-formulas.png).

Phát hiện và sửa: Calc chuyển chuỗi `C2` trong `INDIRECT("C2")` thành `INDIRECT("[.C2]")` ở OOXML. Excel trả `#REF!` dù Sheet đang hiện `1234.5`. Bước hậu xử lý XLSX nay gỡ wrapper ODF cho tham chiếu A1 nội bộ; Excel đọc lại công thức `=INDIRECT("C2")`, giá trị `1234.5`. Có ba kiểm thử hồi quy cho tham chiếu tương đối, tuyệt đối và trường hợp không được đổi.

Hướng dẫn tiếng Việt trong Trợ giúp: tìm “Hàm điều kiện, tra cứu, văn bản và ngày tháng”; bài ghi đường vào tab Công thức và ví dụ cú pháp dùng được.

## Nhóm 2 — Dán đặc biệt và thao tác dữ liệu

**PASS.** Thao tác UI qua CDP và đối chiếu Excel COM read-only: Paste Special values giữ `I2=1234.5` dưới dạng giá trị, formats chuyển định dạng đậm `B1 → I3` (`Bold=1` cả hai), formulas-only giữ `F3=C3*D3` và tính `709.8625`. Find/Replace phân biệt hoa/thường không thay chuỗi khác dạng; bỏ phân biệt thay trên phạm vi sổ làm việc. Excel đọc lại sheet `Sheet2` với `A1=Đã thay`.

Sắp xếp hai mức trả về Hoàng Văn E, Lê Văn C, Nguyễn Văn A (`5678.9` trước `1234.5`), Phạm Thị D; khóa sắp xếp là tên tăng dần rồi số tiền giảm dần. Xóa trùng lặp giữ một hàng cho mỗi mã. Freeze Panes lưu SplitRow/SplitColumn `1/1`. Trạng thái sheet lưu đúng: tệp thử ẩn có `Sheet2:Visible=0`, tệp sau hiện có cả hai sheet Visible; ca quản lý đổi tên/di chuyển/xóa cho thứ tự cuối `S9 Review / Sheet1`. Ảnh: `fix-s9-find-replace.png`, `fix-s9-paste-special.png`, `fix-s9-multi-sort.png`, `fix-s9-sheet-hide.png`, `fix-s9-sheet-unhide.png`, `fix-s9-sheet-management.png` trong `evidence/`.

Trợ giúp tiếng Việt mới trong tab Trợ giúp giải thích ẩn/hiện trang tính, đường dẫn Trang đầu → Ô → Định dạng và menu chuột phải trên thẻ trang tính.

## Nhóm 3 — Biểu đồ

**PASS.** Chọn từng kiểu bằng nút trong hộp xem trước rồi lưu XLSX qua UI/CDP; Excel COM read-only mở từng tệp xác nhận chart type: Cột `51`, Đường `4`, Tròn `5`, Miền `1`. Cả bốn giữ tiêu đề `Biểu đồ A1:C6` và một series `Số tiền`, công thức series `=SERIES(Sheet1!$C$1,Sheet1!$A$2:$A$6,Sheet1!$C$2:$C$6,1)`. Biểu đồ Cột/Đường/Miền có trục hạng mục và trục giá trị; Tròn không có trục. UI hiện đặt tiêu đề theo vùng và không có trường đặt tên riêng cho trục. Ảnh chọn kiểu/xem trước: `fix-s9-chartBar.png`, `fix-s9-chartLine.png`, `fix-s9-chartPie.png`, `fix-s9-chartArea.png` trong `evidence/`.

## Ghi chú harness

Excel reader ban đầu có nhánh `Stop-Process` dự phòng theo PID sau `Quit()`. Sau khi thấy nhánh này chạy, đã bỏ hẳn việc dừng tiến trình theo PID; các lần COM đọc lại sau đó chỉ dùng `Close($false)` và `Quit()`. Harness desktop CDP cũng không còn `taskkill`/`child.kill` dự phòng; khi CDP đóng mà tiến trình chưa thoát, để nguyên tiến trình và báo trạng thái.

Batch `_excel_open_test.ps1` cũng chỉ gọi `Close($false)`/`Quit()` và để nguyên Excel nếu COM không thoát; batch Python không còn sweep/dừng tiến trình Office theo PID.

## Kiểm thử cuối

- `npm test`: **PASS 3061/3061, 0 FAIL**.
- Batch XLSX (mỗi tệp chạy tuần tự, round-trip qua app, `diffs=0`, lint sạch, Excel read-only PASS): `lan01` 87,7 giây; `lan02` 26,8; `lan04` 25,8; `lan06` 111,1; `lan09` 92,0; `lan11` 36,3; `lan22` 36,4; `lan26` 38,5. Log và tệp round-trip ở `E:\VNOffice-profiles\codex-fs9\batch-xlsx.log` và `E:\VNOffice-profiles\codex-fs9\batch\`.
