# EXCEL-H2 — Audit hộp thoại Thiết lập trang (14/10)

## Plan gate

- **Objective:** rà riêng từng control của bốn thẻ Trang / Lề / Đầu-Chân trang / Trang tính; control hiển thị phải đổi model thật, lưu XLSX, mở lại trong VN Office và cho Excel 2016 COM ReadOnly đọc cùng giá trị.
- **Current capability:** trước ticket, Sheet có một hộp thoại phẳng lưu được hướng, ba khổ giấy, bốn lề, phần trăm hoặc vừa số trang rộng/cao, căn giữa, hàng/cột lặp lại và năm tùy chọn in; đầu/chân trang nằm ở hộp riêng. Thiếu cấu trúc bốn thẻ, chất lượng in, số trang đầu, lề đầu/chân trang, bốn cờ đầu/chân trang, đen trắng, chất lượng nháp và Vùng in trong cùng hộp. Bài CDP hiện hữu đang gộp nhiều control và chưa đối chiếu COM từng control.
- **Files/modules:** `apps/sheet/page-setup-dialog.js` (UI app-specific mới), `apps/sheet/sheet-grid.js`, `apps/sheet/sheet.css`, adapter/parser Sheet và `adapters/libreoffice/common/ooxml_zip_patch.py` cho XLSX chuẩn, `platform/i18n/strings-{vi,en}.js`, `platform/help/entries-sheet.js`, unit/Python test, `tests/live/cdp/sheet-page-setup-controls.desktop.mjs` cùng COM ReadOnly helper, tài liệu audit và handoff.
- **Dependency:** không thêm dependency. UI chỉ gọi API của Sheet grid; grid tiếp tục đi qua Sheet adapter và LibreOffice. Excel COM chỉ mở ReadOnly file kết quả để kiểm, không điều khiển cửa sổ hay gửi phím.
- **Risk:** LibreOffice có thể chuẩn hóa hoặc bỏ các thuộc tính `horizontalDpi`, `verticalDpi`, `firstPageNumber`, `blackAndWhite`, `draft` và cờ đầu/chân trang. Các giá trị này sẽ được giữ trong metadata FODS VN rồi hậu xử lý vào OOXML chuẩn; không sửa Core. Rủi ro phụ là chuyển hộp thoại cũ sang bốn thẻ có thể làm hỏng chọn hàng/cột trên lưới hoặc focus bàn phím.
- **Test plan:** unit cho chuẩn hóa/validation/model/serializer; Python test cho đọc-ghi OOXML; một assertion CDP desktop riêng cho mỗi dòng dưới đây theo chuỗi đặt → Đồng ý → lưu XLSX → mở lại app → Excel 2016 COM ReadOnly; runtime ribbon; `npm test`; batch LAN 10 file dirty-save = 0 diff; công thức lan28 ≥98,18%.
- **Rollback:** toàn bộ H2 nằm trong một commit độc lập có thể `git revert`; không rewrite history, không merge `main`, không sửa Core và không xóa test cũ của năm tùy chọn in.

## Ma trận control

Trạng thái **Có (trước ticket)** nghĩa là model đã có trước H2 nhưng vẫn phải có kiểm tra độc lập mới. **Có (đã hoàn tất trong H2)** là control hoặc đường XLSX còn thiếu trước H2 và đã được nối thật. Mỗi mã `PS-*` là một kiểm tra CDP riêng; các control có dữ liệu được đặt trên trang tính riêng rồi cùng đi qua chuỗi Áp dụng → lưu XLSX → mở lại → COM ReadOnly, nên không assertion nào ăn theo trạng thái của control khác.

| Control | Làm gì trong Excel 2016 | Đã nối chưa? | Cách kiểm |
|---|---|---:|---|
| Mở hộp thoại Thiết lập trang | Mở cấu hình in của trang tính hiện tại | Có (trước ticket) | `PS-C00`: gọi lệnh ribbon, hộp thoại có đúng bốn thẻ |
| Thẻ Trang | Hiện hướng, co giãn, khổ, chất lượng và số trang đầu | Có (đã hoàn tất trong H2) | `PS-P00`: chọn thẻ, kiểm `aria-selected` và panel |
| Hướng — Dọc | In theo chiều dọc | Có (trước ticket) | `PS-P01`: chọn Dọc; COM `Orientation=xlPortrait` |
| Hướng — Ngang | In theo chiều ngang | Có (trước ticket) | `PS-P02`: chọn Ngang; COM `Orientation=xlLandscape` |
| Co giãn — Điều chỉnh theo % | Đặt `Zoom` 10–400% | Có (trước ticket) | `PS-P03`: chọn 83%; COM `Zoom=83`, `FitToPagesWide/Tall=False` |
| Co giãn — Vừa theo số trang | Bật chế độ vừa trang | Có (trước ticket) | `PS-P04`: chọn chế độ; COM `Zoom=False` |
| Vừa theo chiều rộng | Giới hạn số trang ngang, 0 là tự động | Có (trước ticket) | `PS-P05`: đặt rộng 2; COM `FitToPagesWide=2` |
| Vừa theo chiều cao | Giới hạn số trang dọc, 0 là tự động | Có (trước ticket) | `PS-P06`: đặt cao 3; COM `FitToPagesTall=3` |
| Khổ giấy | Chọn A4/Letter/Legal/A3/A5 | Có (đã hoàn tất trong H2) | `PS-P07`: chọn A3; COM `PaperSize=xlPaperA3` |
| Chất lượng in | Đặt DPI ngang/dọc cho trang in | Có (đã hoàn tất trong H2) | `PS-P08`: chọn 300 dpi; COM `PrintQuality(1)=300` |
| Số trang đầu | Đặt số bắt đầu hoặc Tự động | Có (đã hoàn tất trong H2) | `PS-P09`: đặt 7; COM `FirstPageNumber=7` |
| Thẻ Lề | Hiện sáu khoảng lề và hai kiểu căn giữa | Có (đã hoàn tất trong H2) | `PS-M00`: chọn thẻ và kiểm panel |
| Lề trên | Khoảng trống mép trên | Có (trước ticket) | `PS-M01`: đặt 2,11 cm; COM `TopMargin` quy đổi đúng |
| Lề dưới | Khoảng trống mép dưới | Có (trước ticket) | `PS-M02`: đặt 2,22 cm; COM `BottomMargin` quy đổi đúng |
| Lề trái | Khoảng trống mép trái | Có (trước ticket) | `PS-M03`: đặt 1,33 cm; COM `LeftMargin` quy đổi đúng |
| Lề phải | Khoảng trống mép phải | Có (trước ticket) | `PS-M04`: đặt 1,44 cm; COM `RightMargin` quy đổi đúng |
| Lề đầu trang | Khoảng cách đầu trang tới mép giấy | Có (đã hoàn tất trong H2) | `PS-M05`: đặt 0,75 cm; COM `HeaderMargin` quy đổi đúng |
| Lề chân trang | Khoảng cách chân trang tới mép giấy | Có (đã hoàn tất trong H2) | `PS-M06`: đặt 0,85 cm; COM `FooterMargin` quy đổi đúng |
| Căn giữa ngang | Căn nội dung theo chiều ngang trang | Có (trước ticket) | `PS-M07`: bật; COM `CenterHorizontally=True` |
| Căn giữa dọc | Căn nội dung theo chiều dọc trang | Có (trước ticket) | `PS-M08`: bật; COM `CenterVertically=True` |
| Thẻ Đầu-Chân trang | Cấu hình nội dung và hành vi đầu/chân trang | Có (đã hoàn tất trong H2) | `PS-H00`: chọn thẻ và kiểm panel |
| Mẫu đầu trang | Chọn mẫu dựng sẵn hoặc tùy chỉnh | Có (trước ticket, hộp riêng) | `PS-H01`: chọn mẫu số trang; COM `CenterHeader` chứa mã trang |
| Tùy chỉnh đầu trang | Mở ba vùng Trái/Giữa/Phải | Có (trước ticket, hộp riêng) | `PS-H02`: mở editor đầu trang và kiểm ba ô |
| Đầu trang — Trái | Nội dung vùng trái | Có (trước ticket) | `PS-H03`: nhập mã/từ; COM `LeftHeader` cùng nội dung |
| Đầu trang — Giữa | Nội dung vùng giữa | Có (trước ticket) | `PS-H04`: nhập mã/từ; COM `CenterHeader` cùng nội dung |
| Đầu trang — Phải | Nội dung vùng phải | Có (trước ticket) | `PS-H05`: nhập mã/từ; COM `RightHeader` cùng nội dung |
| Mẫu chân trang | Chọn mẫu dựng sẵn hoặc tùy chỉnh | Có (trước ticket, hộp riêng) | `PS-H06`: chọn mẫu ngày; COM `CenterFooter` chứa mã ngày |
| Tùy chỉnh chân trang | Mở ba vùng Trái/Giữa/Phải | Có (trước ticket, hộp riêng) | `PS-H07`: mở editor chân trang và kiểm ba ô |
| Chân trang — Trái | Nội dung vùng trái | Có (trước ticket) | `PS-H08`: nhập mã/từ; COM `LeftFooter` cùng nội dung |
| Chân trang — Giữa | Nội dung vùng giữa | Có (trước ticket) | `PS-H09`: nhập mã/từ; COM `CenterFooter` cùng nội dung |
| Chân trang — Phải | Nội dung vùng phải | Có (trước ticket) | `PS-H10`: nhập mã/từ; COM `RightFooter` cùng nội dung |
| Trang chẵn/lẻ khác nhau | Cho phép nội dung trang chẵn khác trang lẻ | Có (đã hoàn tất trong H2) | `PS-H11`: bật; COM `OddAndEvenPagesHeaderFooter=True` |
| Trang đầu khác | Cho phép đầu/chân trang đầu tiên riêng | Có (đã hoàn tất trong H2) | `PS-H12`: bật; COM `DifferentFirstPageHeaderFooter=True` |
| Co giãn cùng tài liệu | Co đầu/chân trang theo tỷ lệ in | Có (đã hoàn tất trong H2) | `PS-H13`: tắt; COM `ScaleWithDocHeaderFooter=False` |
| Căn theo lề trang | Căn đầu/chân trang theo lề trái/phải | Có (đã hoàn tất trong H2) | `PS-H14`: tắt; COM `AlignMarginsHeaderFooter=False` |
| Thẻ Trang tính | Cấu hình vùng in, tiêu đề lặp và tùy chọn in | Có (đã hoàn tất trong H2) | `PS-S00`: chọn thẻ và kiểm panel |
| Vùng in | Chỉ in vùng ô đã nhập | Có (đã hoàn tất trong H2) | `PS-S01`: đặt A1:H40; COM `PrintArea` cùng vùng |
| Nút chọn Vùng in | Thu gọn hộp thoại để chọn vùng trên lưới | Có (đã hoàn tất trong H2) | `PS-S02`: chọn vùng bằng CDP rồi mở lại, ô có A1:H40 |
| Hàng lặp lại | Lặp hàng tiêu đề trên mọi trang | Có (trước ticket) | `PS-S03`: đặt 1:2; COM `PrintTitleRows=$1:$2` |
| Nút chọn Hàng lặp | Chọn hàng trực tiếp trên lưới | Có (trước ticket) | `PS-S04`: chọn hàng 3:4 bằng CDP; COM `$3:$4` |
| Cột lặp lại | Lặp cột nhãn bên trái trên mọi trang | Có (trước ticket) | `PS-S05`: đặt A:B; COM `PrintTitleColumns=$A:$B` |
| Nút chọn Cột lặp | Chọn cột trực tiếp trên lưới | Có (trước ticket) | `PS-S06`: chọn C:D bằng CDP; COM `$C:$D` |
| In đường lưới | In đường kẻ ô | Có (trước ticket) | `PS-S07`: bật; COM `PrintGridlines=True` |
| In đen trắng | Bỏ màu khi in | Có (đã hoàn tất trong H2) | `PS-S08`: bật; COM `BlackAndWhite=True` |
| Chất lượng nháp | In nhanh ở chế độ nháp | Có (đã hoàn tất trong H2) | `PS-S09`: bật; COM `Draft=True` |
| In tiêu đề hàng/cột | In số hàng và chữ cột | Có (trước ticket) | `PS-S10`: bật; COM `PrintHeadings=True` |
| In ghi chú | Chọn không in/cuối trang/như hiển thị | Có (trước ticket) | `PS-S11`: chọn cuối trang; COM `PrintComments=xlPrintSheetEnd` |
| Lỗi ô hiển thị | Chọn như màn hình/trống/gạch/#N/A | Có (trước ticket) | `PS-S12`: chọn gạch; COM `PrintErrors=xlPrintErrorsDash` |
| Thứ tự — Xuống rồi sang | Đánh số trang theo cột trước | Có (trước ticket) | `PS-S13`: chọn; COM `Order=xlDownThenOver` |
| Thứ tự — Sang rồi xuống | Đánh số trang theo hàng trước | Có (trước ticket) | `PS-S14`: chọn; COM `Order=xlOverThenDown` |
| Đồng ý | Kiểm hợp lệ, áp dụng và đóng | Có (trước ticket) | `PS-C01`: đổi một giá trị, nhấn Đồng ý, model đổi và dirty |
| Hủy | Đóng mà không thay đổi | Có (trước ticket) | `PS-C02`: đổi nhiều giá trị, nhấn Hủy, model và XLSX giữ nguyên |

## Kết quả kiểm tra độc lập

- Các commit H2 đã có trên branch trước vòng rà cuối: `0cf16504` (UI/model/adapter/i18n/audit), `8db73425` (snapshot unit) và `0036792d` (đường XLSX + CDP/COM ban đầu). Các commit này đã là tổ tiên của `main`; vòng này tiếp tục ngay trên branch hiện tại, không merge `main`.
- `tests/live/cdp/sheet-page-setup-controls.desktop.mjs`: **62/62 PASS**. Có 47 kiểm tra giá trị/control độc lập trên 47 trang tính, cộng kiểm tra cấu trúc bốn thẻ, editor tùy chỉnh, ba picker, Hủy và lưu. Từng trang tính được Áp dụng, lưu chung vào XLSX, mở lại trong app rồi đọc riêng bằng Excel 2016 COM ReadOnly.
- Năm tùy chọn in đã có trước H2 vẫn được giữ và kiểm riêng: đường lưới (`PS-S07`), tiêu đề hàng/cột (`PS-S10`), ghi chú (`PS-S11`), lỗi ô (`PS-S12`) và thứ tự trang ở cả hai chiều (`PS-S13`, `PS-S14`). Chế độ tỷ lệ `%` không còn assertion hằng; `PS-P03` thực sự lưu `Zoom=83`.

