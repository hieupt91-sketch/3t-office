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

Trạng thái trong bảng là trạng thái hiện tại: **Có** = control đã tác động model/UI thật và được kiểm độc lập; **Có (đã hoàn tất trong audit)** = control từng thiếu hoặc mới nối một phần trước ticket và đã được hoàn tất. Mỗi ID là một assertion CDP desktop riêng sau đặt → Đồng ý → lưu XLSX → mở lại → Excel 2016 COM chỉ-đọc.

| Control | Làm gì trong Excel 2016 | Đã nối chức năng thật chưa? | Cách kiểm |
|---|---|---:|---|
| Thẻ Số | Mở nhóm định dạng giá trị | Có | `FC-N00`: mở bằng Ctrl+1, chọn thẻ, kiểm tab active |
| Danh sách Thể loại | Chọn Chung/Số/Tiền tệ/Kế toán/Ngày/Giờ/Phần trăm/Phân số/Khoa học/Văn bản/Đặc biệt/Tùy chỉnh | Có (đã hoàn tất trong audit) | `FC-N01`: lần lượt chọn từng mục, kiểm panel và state |
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
| Ngày — Vùng | Chọn locale cho mẫu ngày | Có (đã hoàn tất trong audit) | `FC-N12`: chọn Việt Nam, COM format có locale `[$-42A]` |
| Giờ — Danh sách Kiểu | Chọn mẫu giờ | Có (đã hoàn tất trong audit) | `FC-N13`: chọn `hh:mm:ss`, COM cùng code |
| Giờ — Vùng | Chọn locale cho mẫu giờ | Có (đã hoàn tất trong audit) | `FC-N14`: chọn Việt Nam, COM format có locale `[$-42A]` |
| Phần trăm — Số chữ số thập phân | Đặt phần lẻ phần trăm | Có | `FC-N15`: đặt 1, COM `0.0%` |
| Phân số — Danh sách Kiểu | Chọn 1/2/3 chữ số hoặc mẫu cố định | Có (đã hoàn tất trong audit) | `FC-N16`: chọn tối đa 2 chữ số, COM `# ??/??` |
| Khoa học — Số chữ số thập phân | Đặt phần lẻ dạng mũ | Có | `FC-N17`: đặt 4, COM `0.0000E+00` |
| Văn bản — Thông báo | Gán format Text (`@`) | Có | `FC-N18`: OK, COM `NumberFormat=@` |
| Đặc biệt — Danh sách Kiểu | Chọn mã bưu chính/điện thoại định sẵn | Có (đã hoàn tất trong audit) | `FC-N19`: chọn số điện thoại, COM cùng pattern |
| Đặc biệt — Vùng | Chọn locale của mẫu đặc biệt | Có (đã hoàn tất trong audit) | `FC-N20`: đổi vùng, danh sách type cập nhật và lưu locale |
| Tùy chỉnh — Ô Mã định dạng | Nhập format code tùy chỉnh | Có | `FC-N21`: nhập `0.000 "kg"`, COM đọc cùng code |
| Tùy chỉnh — Danh sách mã | Chọn mã có sẵn/đã dùng | Có | `FC-N22`: chọn code, ô nhập và COM cùng code |
| Tùy chỉnh — Xóa | Xóa mã tùy chỉnh khỏi danh sách | Có (đã hoàn tất trong audit) | `FC-N23`: thêm/chọn/xóa, mục biến mất; format ô không đổi trước OK |
| Thẻ Căn chỉnh | Mở nhóm căn và hướng chữ | Có | `FC-A00`: chọn thẻ và kiểm tab active |
| Chiều ngang | Chọn General/Left/Center/Right/Fill/Justify/Center Across/Distributed | Có (đã hoàn tất trong audit) | `FC-A01`: chọn từng option trên các ô, COM `HorizontalAlignment` tương ứng |
| Thụt lề | Đặt mức indent 0–250 khi kiểu ngang hỗ trợ | Có (đã hoàn tất trong audit) | `FC-A02`: đặt 3, COM `IndentLevel=3` |
| Chiều dọc | Chọn Top/Center/Bottom/Justify/Distributed | Có (đã hoàn tất trong audit) | `FC-A03`: chọn từng option, COM `VerticalAlignment` tương ứng |
| Ngắt dòng tự động | Bật `WrapText` | Có | `FC-A04`: bật, COM `WrapText=True` |
| Thu nhỏ vừa ô | Bật `ShrinkToFit` | Có (đã hoàn tất trong audit) | `FC-A05`: bật, COM `ShrinkToFit=True` |
| Hợp nhất ô | Gộp/tách vùng chọn | Có | `FC-A06`: chọn A1:B1, bật, COM `MergeCells=True` |
| Hướng văn bản | Context/LTR/RTL | Có (đã hoàn tất trong audit) | `FC-A07`: chọn RTL, COM `ReadingOrder=-5004` (`xlRTL`) |
| Độ xoay | Đặt -90…90 | Có | `FC-A08`: đặt 37, COM `Orientation=37` |
| Xếp chữ dọc | Đặt orientation dọc | Có | `FC-A09`: bật, COM `Orientation=-4166` (vertical) |
| Mẫu hướng xoay | Xem trước, không sửa tài liệu riêng | Có | `FC-A10`: đổi độ, preview transform/writing-mode cập nhật |
| Thẻ Phông chữ | Mở nhóm font | Có (đã hoàn tất trong audit) | `FC-F00`: chọn thẻ và kiểm tab active |
| Danh sách Phông chữ | Chọn họ font | Có (đã hoàn tất trong audit) | `FC-F01`: chọn Arial, COM `Font.Name=Arial` |
| Kiểu chữ | Thường/Nghiêng/Đậm/Đậm nghiêng | Có (đã hoàn tất trong audit) | `FC-F02`: chọn Đậm nghiêng, COM Bold+Italic |
| Cỡ chữ | Đặt 1–409 pt | Có (đã hoàn tất trong audit) | `FC-F03`: đặt 14, COM `Font.Size=14` |
| Gạch chân | Không/đơn/kép/đơn kế toán/kép kế toán | Có (đã hoàn tất trong audit) | `FC-F04`: từng option trên ô riêng, COM `Font.Underline` tương ứng |
| Màu chữ | Chọn màu chữ | Có (đã hoàn tất trong audit) | `FC-F05`: chọn `#C00000`, COM `Font.Color` cùng RGB |
| Phông mặc định | Trả font về mặc định workbook | Có (đã hoàn tất trong audit) | `FC-F06`: bật, COM Name/Size bằng style Normal |
| Gạch ngang | Bật/tắt strike | Có (đã hoàn tất trong audit) | `FC-F07`: bật, COM `Font.Strikethrough=True` |
| Chỉ số trên | Bật/tắt superscript | Có (đã hoàn tất trong audit) | `FC-F08`: bật, COM `Font.Superscript=True` |
| Chỉ số dưới | Bật/tắt subscript | Có (đã hoàn tất trong audit) | `FC-F09`: bật, COM `Font.Subscript=True` |
| Mẫu phông | Xem trước tổ hợp font hiện tại | Có (đã hoàn tất trong audit) | `FC-F10`: đổi font/style/color, preview computed style đổi |
| Thẻ Viền | Mở nhóm đường viền | Có (đã hoàn tất trong audit) | `FC-B00`: chọn thẻ và kiểm tab active |
| Kiểu đường | Chọn none/thin/medium/thick/dashed/dotted/double | Có (đã hoàn tất trong audit) | `FC-B01`: chọn double rồi cạnh dưới, COM `Borders(9).LineStyle=-4119` |
| Màu đường | Chọn màu áp cho thao tác viền tiếp theo | Có (đã hoàn tất trong audit) | `FC-B02`: chọn đỏ, COM border Color cùng RGB |
| Preset Không | Xóa mọi viền | Có (đã hoàn tất trong audit) | `FC-B03`: áp viền rồi None, COM mọi cạnh `LineStyle=-4142` |
| Preset Ngoài | Bật bốn cạnh ngoài | Có (đã hoàn tất trong audit) | `FC-B04`: COM bốn edge có line |
| Preset Bên trong | Bật viền ngang+dọc bên trong vùng | Có (đã hoàn tất trong audit) | `FC-B05`: vùng 2x2, COM inside H/V có line |
| Cạnh trái | Bật/tắt cạnh trái | Có (đã hoàn tất trong audit) | `FC-B06`: COM `Borders(7)` |
| Cạnh phải | Bật/tắt cạnh phải | Có (đã hoàn tất trong audit) | `FC-B07`: COM `Borders(10)` |
| Cạnh trên | Bật/tắt cạnh trên | Có (đã hoàn tất trong audit) | `FC-B08`: COM `Borders(8)` |
| Cạnh dưới | Bật/tắt cạnh dưới | Có (đã hoàn tất trong audit) | `FC-B09`: COM `Borders(9)` |
| Viền ngang bên trong | Bật/tắt các đường ngang nội vùng | Có (đã hoàn tất trong audit) | `FC-B10`: COM `Borders(12)` |
| Viền dọc bên trong | Bật/tắt các đường dọc nội vùng | Có (đã hoàn tất trong audit) | `FC-B11`: COM `Borders(11)` |
| Đường chéo lên | Bật/tắt diagonal up | Có (đã hoàn tất trong audit) | `FC-B12`: COM `Borders(6)` |
| Đường chéo xuống | Bật/tắt diagonal down | Có (đã hoàn tất trong audit) | `FC-B13`: COM `Borders(5)` |
| Mẫu viền | Xem trước và là bề mặt bật/tắt cạnh | Có (đã hoàn tất trong audit) | `FC-B14`: từng nút đổi preview trước OK |
| Thẻ Tô màu | Mở nhóm nền/pattern | Có (đã hoàn tất trong audit) | `FC-L00`: chọn thẻ và kiểm tab active |
| Màu nền | Chọn màu nền đặc | Có (đã hoàn tất trong audit) | `FC-L01`: chọn vàng, COM `Interior.Color` cùng RGB |
| Không màu | Xóa nền/pattern | Có (đã hoàn tất trong audit) | `FC-L02`: chọn, COM `Interior.Pattern=-4142` |
| Màu mẫu | Chọn màu foreground của pattern | Có (đã hoàn tất trong audit) | `FC-L03`: chọn đỏ, COM `Interior.PatternColor` cùng RGB |
| Kiểu mẫu | Chọn kiểu pattern | Có (đã hoàn tất trong audit) | `FC-L04`: chọn sọc chéo, COM `Interior.Pattern` tương ứng |
| Hiệu ứng tô | Chọn gradient hai màu và hướng | Có (đã hoàn tất trong audit) | `FC-L05`: đặt 2 màu/hướng, COM `Interior.Gradient`/OOXML gradientFill cùng giá trị |
| Mẫu tô | Xem trước fill/pattern/gradient | Có (đã hoàn tất trong audit) | `FC-L06`: đổi control, preview nền đổi |
| Thẻ Bảo vệ | Mở nhóm bảo vệ ô | Có (đã hoàn tất trong audit) | `FC-P00`: chọn thẻ và kiểm tab active |
| Đã khóa | Cấm sửa ô khi trang tính được bảo vệ | Có (đã hoàn tất trong audit) | `FC-P01`: bỏ chọn, COM `Locked=False` |
| Ẩn công thức | Ẩn formula bar khi sheet được bảo vệ | Có (đã hoàn tất trong audit) | `FC-P02`: bật, COM `FormulaHidden=True` |
| Liên kết Bảo vệ trang tính | Mở luồng bảo vệ để hai cờ có hiệu lực | Có (đã hoàn tất trong audit) | `FC-P03`: click, dialog đóng và hộp bảo vệ sheet mở, không im lặng |
| Đóng (X) | Đóng không áp dụng | Có | `FC-G01`: đổi control rồi X, model/COM không đổi |
| Hủy bỏ | Đóng không áp dụng | Có | `FC-G02`: đổi control rồi Hủy, model/COM không đổi |
| Đồng ý | Áp dụng toàn bộ thay đổi đang chọn | Có | `FC-G03`: đổi nhiều thẻ rồi OK, tất cả giá trị được lưu |

## Kết quả chạy (14/10, Claude kiểm lại độc lập)

Bài kiểm tra `tests/live/cdp/sheet-format-cells-controls.desktop.mjs` trên app desktop: **77/77 PASS**. Có 76 kết quả độc lập cho từng control/tác vụ lưu và 1 xác nhận COM mở file ở chế độ chỉ-đọc; mỗi thuộc tính được đặt qua dialog, áp dụng, lưu chung một XLSX, mở lại trong app rồi đọc riêng bằng Excel 2016 COM.
- Số (FC-N03..N23): thập phân, nghìn, số âm, tiền tệ/ký hiệu, kế toán, ngày/giờ + vùng, phần trăm, phân số, khoa học, văn bản, đặc biệt, tùy chỉnh.
- Căn chỉnh (FC-A01..A10): ngang/dọc, thụt lề, ngắt dòng, thu nhỏ vừa ô, gộp ô, hướng chữ, độ xoay, xếp dọc.
- Phông chữ (FC-F01..F10): họ, kiểu, cỡ, gạch chân 5 loại, màu, mặc định, gạch ngang, chỉ số trên/dưới.
- Viền (FC-B01..B14): kiểu, màu, Không/Ngoài/Trong, 4 cạnh, ngang/dọc trong, 2 đường chéo.
- Tô màu (FC-L01..L06): màu nền, không màu, màu mẫu, kiểu mẫu, hiệu ứng tô (gradient 2 màu).
- Bảo vệ (FC-P01..P03): Đã khóa, Ẩn công thức, liên kết Bảo vệ trang tính.
- Đóng/Hủy/Đồng ý (FC-G01..G03).

Cổng: `npm test` 3198/3198; batch LAN 10 tệp (lan01 02 04 06 09 11 22 26 13 19) = 0 diff; công thức lan28 98,18%, lan01 100%, lan04 100%.
Lỗi hồi quy LAN do bản dở dang đã sửa (nền "solid" thành đen, gạch chân giả từ LibreOffice, ghi định dạng mặc định cho ~49.000 ô gây treo lan09): xem `docs/tickets-0710/H1-CLAUDE-NOTES.md`.
Độ phủ chi tiết: từng control có ID riêng; riêng Gạch chân kiểm đủ Không/Đơn/Kép/Đơn kế toán/Kép kế toán, Viền kiểm riêng từng preset/cạnh/đường chéo và màu, Tô kiểm riêng không màu/pattern/gradient. Mã tiền ₫ giữ đúng kiểu số âm trong ngoặc; mã Tùy chỉnh mới được thêm vào danh sách và có thể xóa với phản hồi rõ ràng.