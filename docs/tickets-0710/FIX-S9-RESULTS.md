# FIX-S9 — kết quả đối chiếu Sheet/Excel

Worktree: `E:\VNOffice-codex-fs9` (`fix/sheet-s9-codex`)
Profile CDP: `E:\VNOffice-profiles\codex-fs9`
Phương pháp: thao tác UI qua CDP; app lưu XLSX; Excel COM mở `ReadOnly=true`, đọc xong gọi `Close($false)`/`Quit()`.

## Nhóm 1 — Công thức

**PASS sau sửa.** Ca UI nhập 29 công thức trên fixture qua CDP. SUMIF/SUMIFS, COUNTIF/COUNTIFS, IFERROR, ROUND, LEFT/MID/RIGHT, TEXT số/ngày, NA, HLOOKUP, MATCH, OFFSET, INDIRECT, SUMPRODUCT, DATE/YEAR/MONTH/DAY, EDATE/EOMONTH, WEEKDAY, NETWORKDAYS, WORKDAY, DAYS, TODAY và NOW cho kết quả khớp khi Excel tính lại. Ảnh: [fix-s9-formulas.png](evidence/fix-s9-formulas.png).

Phát hiện và sửa: Calc chuyển chuỗi `C2` trong `INDIRECT("C2")` thành `INDIRECT("[.C2]")` ở OOXML. Excel trả `#REF!` dù Sheet đang hiện `1234.5`. Bước hậu xử lý XLSX nay gỡ wrapper ODF cho tham chiếu A1 nội bộ; Excel đọc lại công thức `=INDIRECT("C2")`, giá trị `1234.5`. Có ba kiểm thử hồi quy cho tham chiếu tương đối, tuyệt đối và trường hợp không được đổi.

Hướng dẫn tiếng Việt trong Trợ giúp: tìm “Hàm điều kiện, tra cứu, văn bản và ngày tháng”; bài ghi đường vào tab Công thức và ví dụ cú pháp dùng được.

## Nhóm 2 — Dán đặc biệt và thao tác dữ liệu

NOT RUN.

## Nhóm 3 — Biểu đồ

NOT RUN.

## Ghi chú harness

Excel reader ban đầu có nhánh `Stop-Process` dự phòng theo PID sau `Quit()`. Sau khi thấy nhánh này chạy, đã bỏ hẳn việc dừng tiến trình theo PID; các lần COM đọc lại sau đó chỉ dùng `Close($false)` và `Quit()`. Harness desktop CDP cũng không còn `taskkill`/`child.kill` dự phòng; khi CDP đóng mà tiến trình chưa thoát, để nguyên tiến trình và báo trạng thái.
