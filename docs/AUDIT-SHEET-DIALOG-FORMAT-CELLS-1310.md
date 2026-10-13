# Audit hộp thoại Định dạng ô (Ctrl+1) — 13/10

## Plan gate

- **Objective:** rà từng control trong sáu thẻ Số / Căn chỉnh / Phông chữ / Viền / Tô màu / Bảo vệ; control hiển thị phải tác động model thật, lưu XLSX, mở lại trong VN Office và đọc cùng giá trị bằng Excel 2016 COM ReadOnly.
- **Current capability:** thẻ Số đã nối phần lớn nhóm cơ bản; Căn chỉnh mới nối căn ngang/dọc cơ bản, thụt lề, ngắt dòng, gộp ô và vài góc xoay; bốn thẻ còn lại bị vô hiệu hóa. Style model và FODS serializer đã có font, màu, nền, bốn cạnh viền, căn lề, wrap, indent và rotation để tái sử dụng.
- **Files/modules:** `apps/sheet/format-cells-dialog.js`, `apps/sheet/sheet-grid.js`, `apps/sheet/number-formatter.js`, `adapters/libreoffice/sheet/sheet-adapter.js`, parser liên quan nếu cần, `platform/i18n/strings-{vi,en}.js`, `platform/help/entries-sheet.js`, unit test và `tests/live/cdp/sheet-format-cells-controls.desktop.mjs`.
- **Dependency:** không thêm dependency; UI chỉ gọi API của Sheet grid, grid tiếp tục đi qua Sheet adapter và LibreOffice. Excel COM chỉ đọc file kết quả trong test.
- **Risk:** LibreOffice có thể chuẩn hóa mã số, kiểu viền/pattern và alignment đặc biệt; phải đo OOXML/COM sau mỗi nhóm. Không sửa Core; thuộc tính LO không giữ được sẽ đi qua metadata VN và native XLSX post-process hiện có.
- **Test plan:** unit theo model/serializer; CDP desktop từng dòng kiểm tra bên dưới (đặt → OK → lưu → mở lại app → COM ReadOnly); `npm test`; batch LAN 10 file = 0 diff; formula cache lan28 ≥98,18%, lan01/lan04 =100%.
- **Rollback:** mỗi nhóm Số+Căn chỉnh, Phông+Viền+Tô, Bảo vệ+XLSX, Help+audit là commit độc lập và có thể revert riêng; không rewrite history, không merge `main`.

## Ma trận control

Quy ước trạng thái ban đầu: **Có** = đã tác động model; **Một phần** = có UI/handler nhưng thiếu lựa chọn hoặc chưa bảo đảm XLSX; **Chưa** = bị khóa, chỉ xem trước hoặc chưa tồn tại. Cột kiểm là test CDP desktop dự kiến; mỗi ID là một assertion riêng sau save/reopen/COM.

| Control | Làm gì trong Excel 2016 | Đã nối chức năng thật trước audit? | Cách kiểm |
|---|---|---:|---|
| Thẻ Số | Mở nhóm định dạng giá trị | Có | `FC-N00`: mở bằng Ctrl+1, chọn thẻ, kiểm tab active |
| Danh sách Thể loại | Chọn Chung/Số/Tiền tệ/Kế toán/Ngày/Giờ/Phần trăm/Phân số/Khoa học/Văn bản/Đặc biệt/Tùy chỉnh | Một phần | `FC-N01`: lần lượt chọn từng mục, kiểm panel và state |
| Mẫu xem trước | Hiển thị kết quả theo tùy chọn hiện tại | Có | `FC-N02`: đổi decimal và kiểm mẫu đổi trước khi OK |
| Số — Số chữ số thập phân | Đặt số chữ số 0–30 | Có | `FC-N03`: đặt 3, COM `NumberFormat` có 3 số 0 |
| Số — Dấu phân cách hàng nghìn | Bật/tắt phân nhóm hàng nghìn | Có | `FC-N04`: bật, COM `NumberFormat` có `#,##0` |
| Số — Danh sách số âm | Chọn dấu trừ/đỏ/ngoặc/ngoặc đỏ | Có | `FC-N05`: chọn ngoặc đỏ, COM có `[Red]` và ngoặc |
| Tiền tệ — Số chữ số thập phân | Đặt phần lẻ tiền | Có | `FC-N06`: đặt 2, COM có `.00` |
| Tiền tệ — Ký hiệu | Chọn ký hiệu tiền hoặc không ký hiệu | Có | `FC-N07`: chọn ₫, COM chứa ký hiệu |
| Tiền tệ — Danh sách số âm | Chọn cách hiển thị tiền âm | Có | `FC-N08`: chọn ngoặc, COM có section âm ngoặc |
| Kế toán — Số chữ số thập phân | Đặt phần lẻ kế toán | Có | `FC-N09`: đặt 2, COM có `.00` |
| Kế toán — Ký hiệu | Chọn ký hiệu căn riêng | Có | `FC-N10`: chọn ₫, COM có `_`/`*` và ký hiệu |
| Ngày — Danh sách Kiểu | Chọn mẫu ngày | Có | `FC-N11`: chọn `yyyy-mm-dd`, COM cùng code |
| Ngày — Vùng | Chọn locale cho mẫu ngày | Chưa | `FC-N12`: chọn Việt Nam, COM format có locale `[$-42A]` |
| Giờ — Danh sách Kiểu | Chọn mẫu giờ | Chưa | `FC-N13`: chọn `hh:mm:ss`, COM cùng code |
| Giờ — Vùng | Chọn locale cho mẫu giờ | Chưa | `FC-N14`: chọn Việt Nam, COM format có locale `[$-42A]` |
| Phần trăm — Số chữ số thập phân | Đặt phần lẻ phần trăm | Có | `FC-N15`: đặt 1, COM `0.0%` |
| Phân số — Danh sách Kiểu | Chọn 1/2/3 chữ số hoặc mẫu cố định | Chưa | `FC-N16`: chọn tối đa 2 chữ số, COM `# ??/??` |
| Khoa học — Số chữ số thập phân | Đặt phần lẻ dạng mũ | Có | `FC-N17`: đặt 4, COM `0.0000E+00` |
| Văn bản — Thông báo | Gán format Text (`@`) | Có | `FC-N18`: OK, COM `NumberFormat=@` |
| Đặc biệt — Danh sách Kiểu | Chọn mã bưu chính/điện thoại định sẵn | Chưa | `FC-N19`: chọn số điện thoại, COM cùng pattern |
| Đặc biệt — Vùng | Chọn locale của mẫu đặc biệt | Chưa | `FC-N20`: đổi vùng, danh sách type cập nhật và lưu locale |
| Tùy chỉnh — Ô Mã định dạng | Nhập format code tùy chỉnh | Có | `FC-N21`: nhập `0.000 "kg"`, COM đọc cùng code |
| Tùy chỉnh — Danh sách mã | Chọn mã có sẵn/đã dùng | Có | `FC-N22`: chọn code, ô nhập và COM cùng code |
| Tùy chỉnh — Xóa | Xóa mã tùy chỉnh khỏi danh sách | Chưa | `FC-N23`: thêm/chọn/xóa, mục biến mất; format ô không đổi trước OK |
| Thẻ Căn chỉnh | Mở nhóm căn và hướng chữ | Có | `FC-A00`: chọn thẻ và kiểm tab active |
| Chiều ngang | Chọn General/Left/Center/Right/Fill/Justify/Center Across/Distributed | Một phần | `FC-A01`: chọn từng option trên các ô, COM `HorizontalAlignment` tương ứng |
| Thụt lề | Đặt mức indent 0–250 khi kiểu ngang hỗ trợ | Một phần | `FC-A02`: đặt 3, COM `IndentLevel=3` |
| Chiều dọc | Chọn Top/Center/Bottom/Justify/Distributed | Một phần | `FC-A03`: chọn từng option, COM `VerticalAlignment` tương ứng |
| Ngắt dòng tự động | Bật `WrapText` | Có | `FC-A04`: bật, COM `WrapText=True` |
| Thu nhỏ vừa ô | Bật `ShrinkToFit` | Chưa | `FC-A05`: bật, COM `ShrinkToFit=True` |
| Hợp nhất ô | Gộp/tách vùng chọn | Có | `FC-A06`: chọn A1:B1, bật, COM `MergeCells=True` |
| Hướng văn bản | Context/LTR/RTL | Chưa | `FC-A07`: chọn RTL, COM `ReadingOrder=2` |
| Độ xoay | Đặt -90…90 | Có | `FC-A08`: đặt 37, COM `Orientation=37` |
| Xếp chữ dọc | Đặt orientation dọc | Có | `FC-A09`: bật, COM `Orientation=-4166` (vertical) |
| Mẫu hướng xoay | Xem trước, không sửa tài liệu riêng | Có | `FC-A10`: đổi độ, preview transform/writing-mode cập nhật |
| Thẻ Phông chữ | Mở nhóm font | Chưa | `FC-F00`: chọn thẻ và kiểm tab active |
| Danh sách Phông chữ | Chọn họ font | Chưa | `FC-F01`: chọn Arial, COM `Font.Name=Arial` |
| Kiểu chữ | Thường/Nghiêng/Đậm/Đậm nghiêng | Chưa | `FC-F02`: chọn Đậm nghiêng, COM Bold+Italic |
| Cỡ chữ | Đặt 1–409 pt | Chưa | `FC-F03`: đặt 14, COM `Font.Size=14` |
| Gạch chân | Không/đơn/kép/đơn kế toán/kép kế toán | Chưa | `FC-F04`: từng option trên ô riêng, COM `Font.Underline` tương ứng |
| Màu chữ | Chọn màu chữ | Chưa | `FC-F05`: chọn `#C00000`, COM `Font.Color` cùng RGB |
| Phông mặc định | Trả font về mặc định workbook | Chưa | `FC-F06`: bật, COM Name/Size bằng style Normal |
| Gạch ngang | Bật/tắt strike | Chưa | `FC-F07`: bật, COM `Font.Strikethrough=True` |
| Chỉ số trên | Bật/tắt superscript | Chưa | `FC-F08`: bật, COM `Font.Superscript=True` |
| Chỉ số dưới | Bật/tắt subscript | Chưa | `FC-F09`: bật, COM `Font.Subscript=True` |
| Mẫu phông | Xem trước tổ hợp font hiện tại | Chưa | `FC-F10`: đổi font/style/color, preview computed style đổi |
| Thẻ Viền | Mở nhóm đường viền | Chưa | `FC-B00`: chọn thẻ và kiểm tab active |
| Kiểu đường | Chọn none/thin/medium/thick/dashed/dotted/double | Chưa | `FC-B01`: chọn double rồi cạnh dưới, COM `Borders(9).LineStyle=-4119` |
| Màu đường | Chọn màu áp cho thao tác viền tiếp theo | Chưa | `FC-B02`: chọn đỏ, COM border Color cùng RGB |
| Preset Không | Xóa mọi viền | Chưa | `FC-B03`: áp viền rồi None, COM mọi cạnh `LineStyle=-4142` |
| Preset Ngoài | Bật bốn cạnh ngoài | Chưa | `FC-B04`: COM bốn edge có line |
| Preset Bên trong | Bật viền ngang+dọc bên trong vùng | Chưa | `FC-B05`: vùng 2x2, COM inside H/V có line |
| Cạnh trái | Bật/tắt cạnh trái | Chưa | `FC-B06`: COM `Borders(7)` |
| Cạnh phải | Bật/tắt cạnh phải | Chưa | `FC-B07`: COM `Borders(10)` |
| Cạnh trên | Bật/tắt cạnh trên | Chưa | `FC-B08`: COM `Borders(8)` |
| Cạnh dưới | Bật/tắt cạnh dưới | Chưa | `FC-B09`: COM `Borders(9)` |
| Viền ngang bên trong | Bật/tắt các đường ngang nội vùng | Chưa | `FC-B10`: COM `Borders(12)` |
| Viền dọc bên trong | Bật/tắt các đường dọc nội vùng | Chưa | `FC-B11`: COM `Borders(11)` |
| Đường chéo lên | Bật/tắt diagonal up | Chưa | `FC-B12`: COM `Borders(6)` |
| Đường chéo xuống | Bật/tắt diagonal down | Chưa | `FC-B13`: COM `Borders(5)` |
| Mẫu viền | Xem trước và là bề mặt bật/tắt cạnh | Chưa | `FC-B14`: từng nút đổi preview trước OK |
| Thẻ Tô màu | Mở nhóm nền/pattern | Chưa | `FC-L00`: chọn thẻ và kiểm tab active |
| Màu nền | Chọn màu nền đặc | Chưa | `FC-L01`: chọn vàng, COM `Interior.Color` cùng RGB |
| Không màu | Xóa nền/pattern | Chưa | `FC-L02`: chọn, COM `Interior.Pattern=-4142` |
| Màu mẫu | Chọn màu foreground của pattern | Chưa | `FC-L03`: chọn đỏ, COM `Interior.PatternColor` cùng RGB |
| Kiểu mẫu | Chọn kiểu pattern | Chưa | `FC-L04`: chọn sọc chéo, COM `Interior.Pattern` tương ứng |
| Hiệu ứng tô | Chọn gradient hai màu và hướng | Chưa | `FC-L05`: đặt 2 màu/hướng, COM `Interior.Gradient`/OOXML gradientFill cùng giá trị |
| Mẫu tô | Xem trước fill/pattern/gradient | Chưa | `FC-L06`: đổi control, preview nền đổi |
| Thẻ Bảo vệ | Mở nhóm bảo vệ ô | Chưa | `FC-P00`: chọn thẻ và kiểm tab active |
| Đã khóa | Cấm sửa ô khi trang tính được bảo vệ | Chưa | `FC-P01`: bỏ chọn, COM `Locked=False` |
| Ẩn công thức | Ẩn formula bar khi sheet được bảo vệ | Chưa | `FC-P02`: bật, COM `FormulaHidden=True` |
| Liên kết Bảo vệ trang tính | Mở luồng bảo vệ để hai cờ có hiệu lực | Chưa | `FC-P03`: click, dialog đóng và hộp bảo vệ sheet mở, không im lặng |
| Đóng (X) | Đóng không áp dụng | Có | `FC-G01`: đổi control rồi X, model/COM không đổi |
| Hủy bỏ | Đóng không áp dụng | Có | `FC-G02`: đổi control rồi Hủy, model/COM không đổi |
| Đồng ý | Áp dụng toàn bộ thay đổi đang chọn | Có | `FC-G03`: đổi nhiều thẻ rồi OK, tất cả giá trị được lưu |

## Kết quả chạy

Sẽ cập nhật trạng thái sau khi test thật. Không ghi PASS nếu chưa chạy.

