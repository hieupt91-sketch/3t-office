# Ma trận thao tác bàn phím và chuột của VN Sheet

Phạm vi E3 dùng Excel 2016 cài trên máy làm chuẩn thao tác. Bài kiểm tra giao diện phải chạy app desktop bằng CDP (`tests/live/cdp/e3-input.desktop.mjs`), gửi input bằng `Input.dispatchKeyEvent` và `Input.dispatchMouseEvent`. Không dùng SendKeys hay điều khiển hệ điều hành.

## Trạng thái hiện tại

| Nhóm | Hành vi chuẩn Excel 2016 | Trạng thái VN Sheet | Bằng chứng / ghi chú |
|---|---|---|---|
| Mũi tên | Di chuyển ô đang hoạt động; bỏ qua ô gộp/ẩn theo lưới | Đã có; chưa chạy đủ ca CDP | `sheet-grid.js`: điều hướng và `_resolveKeyboardTarget` |
| Ctrl + mũi tên | Đi tới biên vùng dữ liệu liền kề hoặc cuối vùng | PASS CDP cho vùng dọc liền kề | A10:A11 có dữ liệu; Ctrl+Down từ A10 tới A11; các hướng và vùng trống cần thêm ca |
| Shift + mũi tên | Mở rộng vùng chọn, giữ ô neo | PASS một ca CDP | A1 → Shift+Right cho A1:B1 |
| Ctrl + Shift + mũi tên | Mở vùng chọn tới biên dữ liệu | PASS CDP cho vùng dọc liền kề | Ctrl+Shift+Down mở rộng A10:A11 |
| Home | Về cột A cùng hàng; Shift+Home mở rộng vùng | PASS CDP | Đã thêm nhánh Home trong grid |
| End | Excel bật chế độ End để phím điều hướng kế tiếp nhảy tới biên | PASS CDP cho End+Down | Nhấn End bật trạng thái; End rồi ArrowDown đi từ A10 tới A11; End chưa có nhãn trạng thái riêng trong giao diện |
| Ctrl + Home / Ctrl + End | Đầu/cuối vùng đã dùng trong sheet | PASS cả hai | Ctrl+Home về A1; Ctrl+End tới K11 với vùng dùng A1:K11 |
| Page Up / Page Down | Cuộn và di chuyển ô theo viewport | PASS cả hai | Name Box đưa tới A40; PageDown tới A60, PageUp về A40; Ctrl+Page Up/Down đổi sheet chưa xác minh |
| Enter / Shift+Enter | Xác nhận sửa và đi xuống/lên; giữ cột đầu vùng Tab | PASS cả hai | CDP xác nhận Enter đi từ A1 xuống A2 và Shift+Enter nhập H4 rồi đi lên H3 |
| Tab / Shift+Tab | Xác nhận sửa và đi phải/trái; Enter kết thúc chuỗi theo hàng | PASS cả hai phím đơn | CDP xác nhận Tab tới B2; Shift+Tab từ C2 tới B2; chuỗi vùng chưa xác minh |
| Ctrl+A | Chọn vùng dữ liệu trước, nhấn lần nữa chọn cả sheet | PASS CDP; sửa trạng thái hai lần nhấn | Từ A1, lần đầu chọn A1:A2; lần hai chọn A1:XFD1048576 |
| Ctrl+Space / Shift+Space | Chọn cột / hàng | PASS CDP | Ctrl+Space chọn B1:B1048576; Shift+Space chọn A4:XFD4 |
| F5 / Ctrl+G | Mở Go To để nhập địa chỉ, vùng hoặc tên | PASS điều hướng qua Hộp tên | Gõ địa chỉ rồi Enter; hiện dùng Hộp tên thay hộp thoại Go To |
| F2 | Sửa nội dung ô hiện tại | PASS mở thanh công thức | CDP xác nhận giá trị hiện tại được nạp để sửa |
| Escape | Hủy nội dung đang sửa và khôi phục giá trị trước khi sửa | PASS; không để lại bước undo | Commit `27952e04`; CDP xác nhận |
| Enter khi sửa | Xác nhận và đi tới ô theo hướng Enter | Có; cần bổ sung kiểm thử riêng cho kết thúc sửa |
| Alt+Enter | Chèn xuống dòng trong một ô | PASS CDP | J1 nhận `LINE1` + xuống dòng + `LINE2` |
| F4 trong công thức | Luân phiên tham chiếu tương đối/tuyệt đối tại caret | PASS CDP | Khi sửa `=A4`, F4 đổi tham chiếu thành `=$A$4` |
| Ctrl+Enter | Điền giá trị hoặc công thức vào toàn vùng; dịch tham chiếu tương đối theo ô đích | PASS trong CDP; FAIL với chuỗi giống tham chiếu khi Excel mở XLSX | CDP xác nhận H1:H3 lần lượt dùng A4/A5/A6, giữ `$B$1` và literal `" A4"`; Excel 2016 COM đọc XLSX app đã lưu nhưng H2 formula thành `=A5+$B$1&" [.A4]"`. Cần Adapter owner sửa công đoạn ODF→XLSX |
| Ctrl+; / Ctrl+Shift+; | Chèn ngày hiện tại / giờ hiện tại | Cả hai lưu serial số và gắn định dạng ngày/giờ; giờ dùng mẫu HH:mm | CDP xác nhận chèn giờ, Undo/Redo giữ value/style và app lưu XLSX. Excel 2016 COM mở ReadOnly đọc F8 `Value2=0.20625` (System.Double), `NumberFormat=hh:mm` |
| Delete / Backspace | Xóa nội dung toàn vùng đang chọn, giữ định dạng | PASS cả hai phím | CDP xác nhận Delete xóa A6:A7, Backspace xóa ô hiện hành |
| Ctrl+D / Ctrl+R | Điền xuống / sang phải; dịch tham chiếu công thức tương đối | PASS cả hai với giá trị | Ctrl+D điền A1 xuống A2; Ctrl+R điền E10 sang F10 |
| Kéo tay nắm điền | Tiếp tục chuỗi số/ngày/danh sách hoặc sao chép | PASS kéo chuỗi số | D1:D2 = 1,2; kéo tới D4 tạo 3,4 |
| Nhấp đúp tay nắm | Điền xuống theo vùng dữ liệu liền kề | PASS CDP | D1:D2 = 1,2; dữ liệu liền kề C1:C4 khiến nhấp đúp điền tới D4 |
| Kéo chọn / Ctrl+nhấp / Shift+nhấp | Tạo vùng, thêm vùng rời, mở rộng từ ô neo | PASS cả ba | CDP kéo A1:B2, Shift+nhấp A1:A2, Ctrl+nhấp thêm vùng C2 |
| Tiêu đề hàng / cột | Chọn nguyên hàng/cột; kéo đường biên đổi kích thước | PASS CDP | C header chọn C1:C1048576; row 5 chọn A5:XFD5; kéo K tăng rộng 275→310 px, kéo hàng 1 tăng cao 48→66 px |
| Nhấp đúp đường biên | Tự vừa kích thước hàng/cột | PASS CDP | Cột K tăng 64→275 px; hàng 1 đã cao 48 px vì xuống dòng và giữ nguyên sau tự khớp |
| Ctrl+C / Ctrl+X / Ctrl+V | Sao chép, cắt, dán vùng và công thức | PASS copy và cut/paste ô | CDP xác nhận copy A1→C2, cut C2→E2 |
| Dán đặc biệt | Chọn giá trị/công thức/định dạng/chuyển vị | PASS mở hộp thoại; từng chế độ chưa xác minh | Ctrl+Alt+V mở hộp thoại Dán đặc biệt trên desktop |
| Ctrl+Z / Ctrl+Y | Hoàn tác / làm lại mỗi thao tác một bước | PASS copy/paste undo/redo | CDP xác nhận một bước cho mỗi phím |
| Chuột phải | Menu theo ô/hàng/cột đang chọn | PASS menu ô | CDP thấy Cắt, Sao chép, Dán, Dán đặc biệt, Chèn, Xóa, Sắp xếp, Lọc |
| Shift+F10 / Context Menu key | Mở menu tại ô đang chọn | PASS Shift+F10 | Menu có Cắt/Sao chép/Dán như khi nhấp phải; Context Menu key chưa xác minh |

## Cách đối chiếu Excel 2016

1. Chạy bài CDP trên app desktop và ghi lại ô đang chọn, vùng chọn, giá trị, công thức, định dạng và trạng thái undo/redo trước/sau input.
2. Khi cần xác nhận dữ liệu đã lưu, để VN Sheet tạo XLSX rồi mở từng tệp trong Excel 2016 bằng COM `ReadOnly`; chỉ đọc `Selection`, `Range.End`, `Application.Goto`, `Formula`, `Value2` và định dạng. Không sửa hay lưu workbook qua COM.
3. So sánh đúng kết quả theo từng thao tác. COM không thay cho bài input desktop; không mở nhiều tệp cùng lúc và không đụng cửa sổ Excel của người dùng.
4. Các hàng “chưa xác minh” không được tính là PASS. Ca Semicolon đã xác nhận bằng keydown Semicolon với modifier Ctrl trên desktop này.

## Giới hạn đã biết

- Hộp tên là đường truy cập F5/Ctrl+G hiện tại; UI chưa có hộp thoại Go To riêng.
- End mode chưa có chỉ báo trạng thái. Ctrl+Enter dịch tham chiếu đúng trong CDP; Excel 2016 COM cho thấy serializer làm hỏng literal giống tham chiếu sau khi lưu, nên tính tương đương công thức xuyên suốt chưa đạt.
- Kéo tay nắm đã thử với chuỗi số; ngày/tháng và danh sách tùy chỉnh cần ca riêng.
