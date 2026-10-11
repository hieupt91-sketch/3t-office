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

NOT RUN.

## Ghi chú harness

Excel reader ban đầu có nhánh `Stop-Process` dự phòng theo PID sau `Quit()`. Sau khi thấy nhánh này chạy, đã bỏ hẳn việc dừng tiến trình theo PID; các lần COM đọc lại sau đó chỉ dùng `Close($false)` và `Quit()`. Harness desktop CDP cũng không còn `taskkill`/`child.kill` dự phòng; khi CDP đóng mà tiến trình chưa thoát, để nguyên tiến trình và báo trạng thái.
