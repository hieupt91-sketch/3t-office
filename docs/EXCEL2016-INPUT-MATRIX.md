# Ma trận thao tác bàn phím và chuột của VN Sheet

Phạm vi E3 dùng Excel 2016 cài trên máy làm chuẩn thao tác. Bài kiểm tra giao diện phải chạy app desktop bằng CDP (`tests/live/cdp/e3-input.desktop.mjs`), gửi input bằng `Input.dispatchKeyEvent` và `Input.dispatchMouseEvent`. Không dùng SendKeys hay điều khiển hệ điều hành.

## Trạng thái hiện tại

| Nhóm | Hành vi chuẩn Excel 2016 | Trạng thái VN Sheet | Bằng chứng / ghi chú |
|---|---|---|---|
| Mũi tên | Di chuyển ô đang hoạt động; bỏ qua ô gộp/ẩn theo lưới | Đã có; chưa chạy đủ ca CDP | `sheet-grid.js`: điều hướng và `_resolveKeyboardTarget` |
| Ctrl + mũi tên | Đi tới biên vùng dữ liệu liền kề hoặc cuối vùng | Đã có; chưa đối chiếu đủ ca COM/CDP | `_findNextCtrlArrowRow/Col`; thuật toán hiện xét giá trị ô |
| Shift + mũi tên | Mở rộng vùng chọn, giữ ô neo | PASS một ca CDP | A1 → Shift+Right cho A1:B1 |
| Ctrl + Shift + mũi tên | Mở vùng chọn tới biên dữ liệu | Đã có; chưa xác minh CDP | Dùng chung điều hướng Ctrl và mở rộng Shift |
| Home | Về cột A cùng hàng; Shift+Home mở rộng vùng | PASS CDP | Đã thêm nhánh Home trong grid |
| End | Excel bật chế độ End để phím điều hướng kế tiếp nhảy tới biên | Chưa hỗ trợ đúng semantics | VN Sheet chưa có trạng thái End riêng |
| Ctrl + Home / Ctrl + End | Đầu/cuối vùng đã dùng trong sheet | Ctrl+Home PASS; Ctrl+End chưa xác minh | Ctrl+End hiện lấy hàng/cột cuối có dữ liệu |
| Page Up / Page Down | Cuộn và di chuyển ô theo viewport | Đã có; chưa xác minh CDP | Ctrl+Page Up/Down đổi sheet |
| Enter / Shift+Enter | Xác nhận sửa và đi xuống/lên; giữ cột đầu vùng Tab | PASS cả hai | CDP xác nhận Enter đi từ A1 xuống A2 và Shift+Enter nhập H4 rồi đi lên H3 |
| Tab / Shift+Tab | Xác nhận sửa và đi phải/trái; Enter kết thúc chuỗi theo hàng | PASS Tab; Shift+Tab và chuỗi vùng chưa xác minh | CDP xác nhận Tab tới B2 |
| Ctrl+A | Chọn vùng dữ liệu trước, nhấn lần nữa chọn cả sheet | Đã có; chưa xác minh CDP | `selectAll()` |
| Ctrl+Space / Shift+Space | Chọn cột / hàng | Đã có; chưa xác minh CDP | Header selection trong grid |
| F5 / Ctrl+G | Mở Go To để nhập địa chỉ, vùng hoặc tên | PASS điều hướng qua Hộp tên | Gõ địa chỉ rồi Enter; hiện dùng Hộp tên thay hộp thoại Go To |
| F2 | Sửa nội dung ô hiện tại | PASS mở thanh công thức | CDP xác nhận giá trị hiện tại được nạp để sửa |
| Escape | Hủy nội dung đang sửa và khôi phục giá trị trước khi sửa | PASS; không để lại bước undo | Commit `27952e04`; CDP xác nhận |
| Enter khi sửa | Xác nhận và đi tới ô theo hướng Enter | Có; cần bổ sung kiểm thử riêng cho kết thúc sửa |
| Alt+Enter | Chèn xuống dòng trong một ô | Có; chưa xác minh CDP | `insertLineBreak()` |
| F4 trong công thức | Luân phiên tham chiếu tương đối/tuyệt đối tại caret | PASS CDP | Khi sửa `=A4`, F4 đổi tham chiếu thành `=$A$4` |
| Ctrl+Enter | Ghi cùng nội dung vào toàn vùng chọn | PASS với giá trị; cần đối chiếu công thức bằng Excel COM | CDP desktop: G1:G3 nhận cùng nội dung, một Ctrl+Z hoàn tác cả vùng; chưa xác nhận quy tắc dịch tham chiếu công thức |
| Ctrl+; / Ctrl+Shift+; | Chèn ngày hiện tại / giờ hiện tại | PASS cả hai phím | CDP xác nhận ô ngày là serial ngày có định dạng date; ô giờ là serial thời gian có định dạng time |
| Delete / Backspace | Xóa nội dung toàn vùng đang chọn, giữ định dạng | PASS Delete vùng liên tục | CDP xác nhận A6:A7 được xóa; undo theo một thao tác |
| Ctrl+D / Ctrl+R | Điền xuống / sang phải; dịch tham chiếu công thức tương đối | Ctrl+D PASS; Ctrl+R chưa xác minh | `fillDown()` / `fillRight()` |
| Kéo tay nắm điền | Tiếp tục chuỗi số/ngày/danh sách hoặc sao chép | PASS kéo chuỗi số | D1:D2 = 1,2; kéo tới D4 tạo 3,4 |
| Nhấp đúp tay nắm | Điền xuống theo vùng dữ liệu liền kề | Có handler; chưa xác minh CDP | `_autofillDownToAdjacentData()` |
| Kéo chọn / Ctrl+nhấp / Shift+nhấp | Tạo vùng, thêm vùng rời, mở rộng từ ô neo | Kéo chọn PASS; Ctrl/Shift click chưa xác minh | CDP kéo A1 tới B2 tạo A1:B2 |
| Tiêu đề hàng / cột | Chọn nguyên hàng/cột; kéo đường biên đổi kích thước | Có; chưa xác minh CDP | Header và resizer riêng trong grid |
| Nhấp đúp đường biên | Tự vừa kích thước hàng/cột | Có; chưa xác minh CDP | `autoFitColumn/Row()` |
| Ctrl+C / Ctrl+X / Ctrl+V | Sao chép, cắt, dán vùng và công thức | PASS copy và cut/paste ô | CDP xác nhận copy A1→C2, cut C2→E2 |
| Dán đặc biệt | Chọn giá trị/công thức/định dạng/chuyển vị | Có UI và handler; chưa xác minh CDP E3 | Ctrl+Alt+V hoặc menu chuột phải |
| Ctrl+Z / Ctrl+Y | Hoàn tác / làm lại mỗi thao tác một bước | PASS copy/paste undo/redo | CDP xác nhận một bước cho mỗi phím |
| Chuột phải | Menu theo ô/hàng/cột đang chọn | PASS menu ô | CDP thấy Cắt, Sao chép, Dán, Dán đặc biệt, Chèn, Xóa, Sắp xếp, Lọc |
| Shift+F10 / Context Menu key | Mở menu tại ô đang chọn | Có; chưa xác minh CDP | Nhánh keyboard accessibility trong grid |

## Cách đối chiếu Excel 2016

1. Chạy bài CDP trên app desktop và ghi lại ô đang chọn, vùng chọn, giá trị, công thức, định dạng và trạng thái undo/redo trước/sau input.
2. Khi cần xác nhận dữ liệu đã lưu, để VN Sheet tạo XLSX rồi mở từng tệp trong Excel 2016 bằng COM `ReadOnly`; chỉ đọc `Selection`, `Range.End`, `Application.Goto`, `Formula`, `Value2` và định dạng. Không sửa hay lưu workbook qua COM.
3. So sánh đúng kết quả theo từng thao tác. COM không thay cho bài input desktop; không mở nhiều tệp cùng lúc và không đụng cửa sổ Excel của người dùng.
4. Các hàng “chưa xác minh” không được tính là PASS. Ca Semicolon đã xác nhận bằng keydown Semicolon với modifier Ctrl trên desktop này.

## Giới hạn đã biết

- Hộp tên là đường truy cập F5/Ctrl+G hiện tại; UI chưa có hộp thoại Go To riêng.
- Phím End chưa tương đương đầy đủ; Ctrl+Enter chưa đối chiếu quy tắc tham chiếu công thức với Excel COM.
- Kéo tay nắm đã thử với chuỗi số; ngày/tháng và danh sách tùy chỉnh cần ca riêng.
