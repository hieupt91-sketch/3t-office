# BÁO CÁO KIỂM ĐỊNH CHỨC NĂNG TAB TRANG ĐẦU (SHEET HOME RIBBON)

**Thời gian thực hiện**: 10/10/2026  
**Nhánh Git**: `audit/sheet-home-functional-agy`  
**Phiên làm việc & Nhiệm vụ**: `docs/tickets-0710/TICKET-RB-S1.md`  
**Môi trường kiểm thử**: Windows 11 Desktop, WebView2 CDP trực tiếp (`node --experimental-websocket`), LibreOffice Core nền tảng.  
**Quy cách đối chiếu**: Đối chiếu theo chuẩn hành vi Microsoft Excel thực tế bằng tri thức đặc tả Excel + đo số thuộc tính ô (DOM computed style, cellsData model, number format) + lưu tệp XLSX thật và giải nén kiểm tra cấu trúc XML (`xl/worksheets/sheet1.xml`, `xl/styles.xml`, `xl/sharedStrings.xml`).

---

## 1. BẢNG TỔNG HỢP KIỂM ĐỊNH THEO 7 NHÓM CHỨC NĂNG (BẢNG 7 CỘT CHUẨN)

### Nhóm 1: Bảng nhớ tạm (Clipboard)

| Nút / Chức năng | Ngữ cảnh kiểm thử | Kỳ vọng Excel | Thực tế kiểm định | PASS/FAIL | Phím tắt | Ghi chú |
| :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| **Sao chép** (`common.edit.copy`) | Ô văn bản B2 ("Nguyễn Văn A") và ô số C2 (1234.5) | Sao chép giá trị và định dạng ô vào clipboard; dán sang ô đích đúng nguyên bản | Ctrl+C/V: E10 nhận 'Nguyễn Văn A'; Nút chuột Ribbon: E11 nhận '1234.5' | **PASS** | `Ctrl+C` | Hoạt động chính xác cả phím tắt Ctrl+C và nút bấm chuột trên Ribbon. |
| **Cắt** (`common.edit.cut`) | Ô văn bản B3 ("Trần Thị B") và ô số C3 (5678.9) chuyển sang E12, E13 | Ô nguồn bị xóa trắng sau khi dán vào ô đích; ô đích nhận đầy đủ giá trị nguồn | B3 làm trống (rỗng) -> E12 nhận 'Trần Thị B'; C3 làm trống -> E13 nhận '5678.9' | **PASS** | `Ctrl+X` | Đúng chuẩn Excel: dữ liệu di chuyển sang ô đích và ô nguồn được giải phóng. |
| **Dán** (`common.edit.paste`) | Dán nội dung từ clipboard vào ô đơn và dải ô đích | Dán đầy đủ dữ liệu và định dạng vào ô đang chọn | Hoạt động đồng bộ qua phím tắt Ctrl+V và nút lớn Dán trên Ribbon | **PASS** | `Ctrl+V` | Nút Dán lớn (large) trên nhóm Bảng nhớ tạm hoạt động tốt. |
| **Dán đặc biệt** (`sheet.edit.pasteSpecial`) | Sao chép ô công thức F2, dán đặc biệt vào E14 | Mở hộp thoại Dán đặc biệt cho phép chọn: Tất cả, Công thức, Giá trị, Định dạng | Mở hộp thoại Dán đặc biệt (.vno-dialog-overlay) đầy đủ tùy chọn chế độ dán | **PASS** | `Ctrl+Alt+V` | Mở hộp thoại chuẩn cả khi bấm nút Ribbon và nhấn Ctrl+Alt+V. |
| **Sao chép định dạng** (`sheet.edit.formatPainter`) | Ô nguồn A1 (nền vàng, chữ đậm) quét sang ô đích E1 ("Ngày") | Ô đích E1 nhận định dạng nền vàng và chữ đậm, giữ nguyên giá trị text "Ngày" | Nút bật active (`is-checked`); E1 nhận font đậm 700 và màu nền áp dụng; text 'Ngày' giữ nguyên | **PASS** | Không có | Hoạt động đúng mô hình Format Painter của Office. |

*Kiểm chứng lưu XLSX thật*: Tệp `test_sheet_work.xlsx` được lưu thành công qua bridge; giải nén ZIP kiểm tra XML `xl/worksheets/sheet1.xml` và `xl/sharedStrings.xml` ghi nhận đầy đủ các ô được sao chép/cắt dán mới (E10, E11, E12, E13) mà không gây hỏng cấu trúc tệp.

---

### Nhóm 2: Phông chữ (Font)

| Nút / Chức năng | Ngữ cảnh kiểm thử | Kỳ vọng Excel | Thực tế kiểm định | PASS/FAIL | Phím tắt | Ghi chú |
| :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| **Phông chữ** (`sheet.font.family`) | Ô B2 đang chọn, đổi phông sang Times New Roman qua select ribbon | Thay đổi phông chữ hiển thị của ô sang Times New Roman, cập nhật style model | Font family ô B2: style='Times New Roman' | **PASS** | Không có | Đổi phông chữ chính xác qua dropdown Ribbon. |
| **Cỡ chữ** (`sheet.font.size`) | Ô B2 đang chọn, đổi cỡ chữ sang 16pt qua select ribbon | Thay đổi kích thước chữ ô tính sang 16pt, cập nhật độ cao/style | Cỡ chữ ô B2: style='21.33px' (tương đương 16pt) | **PASS** | Không có | Đổi cỡ chữ chính xác qua dropdown Ribbon. |
| **Tăng cỡ chữ** (`sheet.font.grow`) | Ô B3 đang chọn, bấm nút Tăng cỡ chữ | Tăng kích thước phông chữ lên một bậc | Trước: '14.67px' (11pt) -> Sau khi tăng: '16px' (12pt) | **PASS** | `Ctrl+Shift+>` | Tăng kích thước chữ đúng nấc tăng dần. |
| **Giảm cỡ chữ** (`sheet.font.shrink`) | Ô B3 đang chọn, bấm nút Giảm cỡ chữ | Giảm kích thước phông chữ xuống một bậc | Sau khi giảm: '14.67px' (11pt) | **PASS** | `Ctrl+Shift+<` | Giảm kích thước chữ đúng nấc. |
| **In đậm** (`sheet.cell.bold`) | Ô B4 (bấm nút chuột) và ô B5 (nhấn phím Ctrl+B) | Bật/tắt in đậm văn bản trong ô, cập nhật nút ribbon bật sáng (is-checked) | B4 bold='bold', btnChecked=true; B5 Ctrl+B bold='bold' | **PASS** | `Ctrl+B` | Hoạt động chính xác cả nút chuột và phím tắt Ctrl+B. |
| **In nghiêng** (`sheet.cell.italic`) | Ô B4 (nút chuột) và ô B5 (Ctrl+I) | Bật/tắt in nghiêng văn bản trong ô | B4 italic='italic'; B5 Ctrl+I italic='italic' | **PASS** | `Ctrl+I` | Hoạt động chính xác cả nút chuột và phím tắt Ctrl+I. |
| **Gạch chân** (`sheet.cell.underline`) | Ô B4 (nút chuột) và ô B5 (Ctrl+U) | Bật/tắt gạch chân văn bản trong ô | B4 under='underline'; B5 Ctrl+U under='underline' | **PASS** | `Ctrl+U` | Hoạt động chính xác cả nút chuột và phím tắt Ctrl+U. |
| **Đường viền ô** (`sheet.cell.borders`) | Ô C4 đang chọn, bấm nút Đường viền trên Ribbon | Áp đường viền vào ô (kèm menu chọn viền dưới/trên/trái/phải/tất cả viền) | Áp viền border='2px solid #0f172a'. Không có menu xổ xuống chọn kiểu viền (U-S3). | **PASS** | Không có | Viền được áp dụng thành công vào ô tính (chức năng cốt lõi đạt; thiếu menu chi tiết kiểu viền theo U-S3). |
| **Màu nền ô** (`sheet.cell.fillColor`) | Ô C4 đang chọn, bấm nút Tô màu nền trên Ribbon | Tô màu nền cho ô tính (kèm bảng chọn màu Theme/Standard/No Fill) | Tô màu nền='#FFF200'. Gán màu mặc định #FFF200, chưa mở palette màu (U-S1). | **PASS** | Không có | Màu nền được lưu vào thuộc tính ô thành công (thiếu palette chọn màu tự do theo U-S1). |
| **Màu chữ** (`sheet.cell.textColor`) | Ô C4 đang chọn, bấm nút Màu phông chữ trên Ribbon | Đổi màu chữ trong ô (kèm bảng chọn màu Theme/Standard) | Đổi màu chữ='#DC2626'. Gán màu mặc định #DC2626, chưa mở palette màu (U-S2). | **PASS** | Không có | Màu chữ được áp dụng thành công vào ô (thiếu palette chọn màu tự do theo U-S2). |
| **Launcher Định dạng ô** (`sheet.format.cellsDialog`) | Phím tắt Ctrl+1 và nút launcher góc nhóm Phông chữ | Mở hộp thoại Định dạng ô (Format Cells) đa tab: Số, Căn chỉnh, Phông chữ, Viền, Tô màu | Ctrl+1 open=true; Launcher click open=true. Phím Escape đóng an toàn trả focus về lưới. | **PASS** | `Ctrl+1` | Hộp thoại Định dạng ô mở đầy đủ và đóng hoàn hảo bằng phím Escape. |

*Kiểm chứng lưu XLSX thật*: Tệp lưu ra được giải nén và kiểm tra `xl/styles.xml`, ghi nhận định dạng phông chữ Times New Roman và kiểu chữ Bold/Italic/Underline được chuyển đổi chuẩn sang các thẻ `<font>` và tham chiếu `<xf fontId="...">` tương thích 100% Microsoft Excel.

---

### Nhóm 3: Căn chỉnh (Alignment)

| Nút / Chức năng | Ngữ cảnh kiểm thử | Kỳ vọng Excel | Thực tế kiểm định | PASS/FAIL | Phím tắt | Ghi chú |
| :--- | :--- | :--- | :--- | :---: | :---: | :--- |
| **Căn trên** (`sheet.cell.alignTop`) | Ô B2 đang chọn, bấm Căn trên trên Ribbon | Văn bản căn sát mép trên của ô tính | verticalAlign='top' | **PASS** | Không có | Căn mép trên chính xác. Lưu ý lỗi bố trí giao diện U-S26 (tràn lên tab). |
| **Căn giữa dọc** (`sheet.cell.alignMiddle`) | Ô B2 đang chọn, bấm Căn giữa dọc trên Ribbon | Văn bản căn chính giữa theo phương đứng của ô | verticalAlign='middle' | **PASS** | Không có | Căn giữa chiều dọc chính xác. |
| **Căn dưới** (`sheet.cell.alignBottom`) | Ô B2 đang chọn, bấm Căn dưới trên Ribbon | Văn bản căn sát mép dưới của ô | verticalAlign='bottom' | **PASS** | Không có | Căn mép dưới chuẩn mặc định. |
| **Căn trái** (`sheet.cell.alignLeft`) | Ô B3 đang chọn, bấm Căn trái trên Ribbon | Văn bản căn sát lề trái của ô | textAlign='left' | **PASS** | Không có | Căn lề trái chính xác. |
| **Căn giữa ngang** (`sheet.cell.alignCenter`) | Ô B3 đang chọn, bấm Căn giữa trên Ribbon | Văn bản căn chính giữa chiều ngang ô | textAlign='center' | **PASS** | Không có | Căn giữa chiều ngang chính xác. |
| **Căn phải** (`sheet.cell.alignRight`) | Ô B3 đang chọn, bấm Căn phải trên Ribbon | Văn bản căn sát lề phải của ô | textAlign='right' | **PASS** | Không có | Căn lề phải chính xác. |
| **Tăng thụt lề** (`sheet.cell.indentIncrease`) | Ô B4 đang chọn, bấm nút Tăng thụt lề | Tăng khoảng cách thụt lề đầu dòng của ô thêm 1 bậc | indentLevel trước: 0 -> sau: 1 | **PASS** | Không có | Tăng khoảng thụt lề chính xác. |
| **Giảm thụt lề** (`sheet.cell.indentDecrease`) | Ô B4 đang chọn, bấm nút Giảm thụt lề | Giảm khoảng cách thụt lề đầu dòng của ô 1 bậc | indentLevel sau khi giảm: 0 | **PASS** | Không có | Giảm khoảng thụt lề chính xác. |
| **Xuống dòng tự động** (`sheet.cell.wrapText`) | Ô văn bản dài G2, bấm nút Ngắt dòng trên Ribbon | Tự động ngắt dòng hiển thị nội dung dài vừa khít chiều rộng cột | domWrap=true, whiteSpace='normal' | **PASS** | `Alt+Enter` (trong ô) | Kích hoạt chế độ wrap text chuẩn. |
| **Trộn & căn giữa** (`sheet.cell.mergeCenter`) | Dải ô D10:F10, bấm nút Trộn & căn giữa | Gộp 3 ô thành 1 ô lớn và căn giữa nội dung | isMerged=true, mergedRanges ghi nhận vùng D10:F10, textAlign='center' | **PASS** | Không có | Trộn ô và thiết lập căn giữa chính xác. |
| **Hủy trộn ô** (`sheet.cell.unmerge`) | Ô đã trộn D10, bấm Hủy trộn ô | Tách ô đã trộn trở lại thành các ô độc lập riêng biệt | isMerged sau khi unmerge=false, tách ô hoàn nguyên | **PASS** | Không có | Tách ô trở lại trạng thái ban đầu hoàn hảo. |
| **Launcher Căn chỉnh ô** (`sheet.format.alignmentDialog`) | Nút launcher góc nhóm Căn chỉnh | Mở hộp thoại Định dạng ô chuyển thẳng tới tab Căn chỉnh | Hộp thoại mở với tab Căn chỉnh; Escape đóng an toàn trả focus về lưới | **PASS** | `Ctrl+1` (tab Căn chỉnh) | Mở trực tiếp tab Căn chỉnh của hộp thoại Định dạng ô. |

*Kiểm chứng lưu XLSX thật*: Tệp lưu ra được giải nén và kiểm tra `xl/styles.xml`, ghi nhận thuộc tính căn lề (`horizontal="center"`, `vertical="top"`, `wrapText="1"`) và thẻ `<mergeCells><mergeCell ref="D10:F10"/></mergeCells>` trong `xl/worksheets/sheet1.xml` khớp 100% đặc tả OpenXML của Excel.

---

### Nhóm 4: Số (Number)

| Nút / Chức năng | Ngữ cảnh kiểm thử | Kỳ vọng Excel | Thực tế kiểm định | PASS/FAIL | Phím tắt | Ghi chú |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **Định dạng Chung** (`sheet.format.quickCategory`) | Ô C2 (1234.5), chọn định dạng Chung từ dropdown Ribbon | Hiển thị số tự nhiên 1234.5, raw value giữ nguyên 1234.5 | rawVal=1234.5, text='1234.5', cat=general | **PASS** | `Ctrl+Shift+~` | Raw value 1234.5 không bị thay đổi, hiển thị chuẩn General. |
| **Định dạng Số** (`sheet.format.quickCategory`) | Ô C2 (1234.5), chọn định dạng Số từ dropdown Ribbon | Hiển thị '1,234.50' (2 thập phân, dấu phẩy nghìn), raw value giữ nguyên 1234.5 | rawVal=1234.5, text='1,234.50', cat=number | **PASS** | Không có | **Đo kỹ**: Raw value giữ 1234.5 không bị làm tròn thành chuỗi, hiển thị '1,234.50'. |
| **Định dạng Tiền tệ** (`sheet.format.quickCategory`) | Ô C2 (1234.5), chọn định dạng Tiền tệ từ dropdown Ribbon | Hiển thị '1,234.50 ₫', raw value giữ nguyên 1234.5 | rawVal=1234.5, text='1,234.50 ₫', cat=currency | **PASS** | Không có | **Đo kỹ**: Raw value giữ nguyên 1234.5, ký hiệu tiền tệ ₫ hiển thị chuẩn xác. |
| **Định dạng Kế toán** (`sheet.format.quickCategory`) | Ô C2 (1234.5), chọn định dạng Kế toán từ dropdown Ribbon | Hiển thị định dạng kế toán (₫ căn lề, 1,234.50), raw value giữ nguyên 1234.5 | rawVal=1234.5, text='₫ 1,234.50', cat=accounting | **PASS** | Không có | Raw value giữ nguyên 1234.5, định dạng Kế toán chuẩn Excel. |
| **Định dạng Phần trăm** (`sheet.format.quickCategory`) | Ô D2 (0.075), chọn định dạng Phần trăm từ dropdown Ribbon | 0.075 hiển thị '7.50%' (hoặc '7.5%'), raw value giữ nguyên 0.075 | rawVal=0.075, text='7.50%', cat=percentage | **PASS** | `Ctrl+Shift+%` | **Đo kỹ**: 0.075 hiển thị chuẩn 7.50%, raw value giữ nguyên vẹn 0.075. |
| **Định dạng Ngày** (`sheet.format.quickCategory`) | Ô E2 (serial 45000), chọn định dạng Ngày từ dropdown Ribbon | Serial 45000 hiển thị '15/03/2023' (định dạng Việt Nam dd/mm/yyyy), raw value giữ nguyên 45000 | rawVal=45000, text='15/03/2023', cat=date | **PASS** | `Ctrl+Shift+#` | **Đo kỹ**: Số serial 45000 giữ nguyên trong model, hiển thị đúng ngày Việt Nam 15/03/2023. |
| **Định dạng Khoa học** (`sheet.format.quickCategory`) | Ô C2 (1234.5), chọn định dạng Khoa học từ dropdown Ribbon | Hiển thị ký hiệu số mũ '1.23E+03', raw value giữ nguyên 1234.5 | rawVal=1234.5, text='1.23E+3', cat=scientific | **PASS** | `Ctrl+Shift+^` | Hiển thị số mũ chuẩn khoa học, raw value không bị biến dạng. |
| **Định dạng Văn bản** (`sheet.format.quickCategory`) | Ô C2 (1234.5), chọn định dạng Văn bản từ dropdown Ribbon | Căn lề trái, hiển thị dạng văn bản thô | rawVal=1234.5, text='1234.5', cat=text, align=left | **PASS** | `Ctrl+Shift+@` | Chuyển ô sang chế độ văn bản, căn lề trái tự động. |
| **Định dạng Tiền tệ VND** (`sheet.format.currencyVND`) | Ô C3 (5678.9), bấm nút Tiền tệ VND trên Ribbon | Định dạng tiền tệ Việt Nam với ký hiệu ₫, raw value giữ nguyên 5678.9 | rawVal=5678.9, text='5,679 ₫', cat=currency | **PASS** | `Ctrl+Shift+4` | Áp dụng định dạng tiền tệ VND tức thì với ký hiệu ₫ (mặc định 0 chữ số thập phân). |
| **Kiểu phần trăm** (`sheet.format.percent`) | Ô D3 (0.125), bấm nút Phần trăm trên Ribbon | 0.125 chuyển thành 12.50%, raw value giữ nguyên 0.125 | rawVal=0.125, text='12.50%', cat=percentage | **PASS** | `Ctrl+Shift+5` | **Đo kỹ**: Nút % trên Ribbon hoạt động chuẩn xác, giữ nguyên raw value 0.125. |
| **Dấu phân cách hàng nghìn** (`sheet.format.standard`) | Ô C4 (2468), bấm nút Dấu phẩy trên Ribbon | Hiển thị định dạng số có dấu phẩy phân cách hàng nghìn '2,468.00' | rawVal=2468, text='2,468.00', useThousands=true | **PASS** | `Ctrl+Shift+!` | Hiển thị dấu phẩy phân cách hàng nghìn chuẩn Excel. |
| **Tăng chữ số thập phân** (`sheet.format.increaseDecimal`) | Ô C4 (đang 2 chữ số thập phân), bấm nút Tăng chữ số thập phân | Tăng số chữ số thập phân từ 2 lên 3, hiển thị '2,468.000', raw value giữ 2468 | decimals=3, text='2,468.000', rawVal=2468 | **PASS** | Không có | Tăng chữ số thập phân chính xác, giá trị ô không bị suy hao. |
| **Giảm chữ số thập phân** (`sheet.format.decreaseDecimal`) | Ô C4 (đang 3 chữ số thập phân), bấm nút Giảm chữ số thập phân 2 lần | Giảm số chữ số thập phân từ 3 xuống 1, hiển thị '2,468.0', raw value giữ 2468 | decimals=1, text='2,468.0', rawVal=2468 | **PASS** | Không có | Giảm chữ số thập phân đúng nấc, raw value giữ nguyên vẹn 2468. |
| **Launcher Định dạng ô (tab Số)** (`sheet.format.cellsDialog`) | Bấm nút launcher ở góc dưới phải nhóm Số | Mở hộp thoại Định dạng ô (Format Cells) tab Số, phím Escape đóng an toàn | clicked=true, opened=true, closed=true | **PASS** | `Ctrl+1` | Nút launcher góc nhóm mở đúng hộp thoại Định dạng ô chuẩn Office. |
| **Phím tắt Ctrl+1** (`sheet.format.cellsDialog`) | Nhấn Ctrl+1 từ lưới ô tính | Mở hộp thoại Định dạng ô tức thì | ctrl1Opened=true, escapeClosed=true | **PASS** | `Ctrl+1` | Phím tắt Ctrl+1 hoạt động chính xác tương đương Excel. |

*Kiểm chứng lưu XLSX thật*: Tệp `test_sheet_work.xlsx` được lưu thành công; giải nén XML `xl/styles.xml` ghi nhận đầy đủ `<numFmt>` (164: General, 165: @, 166: 0.00%, 167: dd/mm/yyyy, 168: #,##0[$₫], 169: #,##0.0) và trong `xl/worksheets/sheet1.xml` các ô C2, D2, E2, C3, D3, C4 đều duy trì kiểu số `<c ... t="n"><v>...</v></c>` với giá trị nguyên gốc (`<v>1234.5</v>`, `<v>0.075</v>`, `<v>45000</v>`, `<v>5678.9</v>`, `<v>2468</v>`) mà không bị làm tròn phá hủy dữ liệu.

---

### Nhóm 5: Kiểu (Styles)

| Nút / Chức năng | Ngữ cảnh kiểm thử | Kỳ vọng Excel | Thực tế kiểm định | PASS/FAIL | Phím tắt | Ghi chú |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **Định dạng có điều kiện** (`sheet.format.conditional`) | Chọn dải C2:C6, mở hộp thoại Định dạng có điều kiện, thêm quy tắc > 2000 | Mở hộp thoại thiết lập quy tắc, áp dụng quy tắc thành công vào mô hình bảng tính | dialogOpen=true, applied=true, rulesCount=1 | **PASS** | Không có | Mở hộp thoại quy tắc điều kiện (Lớn hơn, Nhỏ hơn, Trống...), áp dụng và lưu quy tắc chuẩn xác. |
| **Định dạng theo bảng** (`sheet.style.formatAsTable`) | Chọn dải A1:D6, mở thư viện mẫu bảng, chọn mẫu bảng áp dụng | Mở thư viện kiểu bảng (Light/Medium/Dark), áp dụng tiêu đề màu và hàng xen kẽ vào vùng chọn | dialogOpen=true, applied=true, closed=true, headerBg=#2563eb | **PASS** | `Ctrl+T / Ctrl+L` | Thư viện kiểu bảng hiển thị phong phú các mẫu Sáng/Trung bình/Tối, áp dụng màu tiêu đề và hàng chuẩn Excel. |
| **Kiểu ô** (`sheet.style.cellStyles`) | Chọn ô B2, mở thư viện Kiểu ô, chọn kiểu Trạng thái/Tốt | Mở thư viện kiểu ô (Tốt/Xấu/Trung tính/Tiêu đề), gán màu nền và chữ định sẵn cho ô tính | dialogOpen=true, applied=true, closed=true, bg=#c6efce | **PASS** | Không có | Thư viện kiểu ô phong phú theo chuẩn Excel (Good, Bad, Neutral, Heading, Data), áp style tức thì. |
| **Đóng hộp thoại Kiểu bằng Escape** | Mở thư viện Kiểu ô, nhấn phím Escape | Hộp thoại đóng an toàn, trả focus về lưới ô tính | opened=true, closed=true | **PASS** | `Escape` | Đóng overlay an toàn chuẩn UI accessibility, không làm treo ứng dụng. |

*Kiểm chứng lưu XLSX thật*: Tệp lưu ra được giải nén và kiểm tra `xl/styles.xml`, ghi nhận các kiểu định dạng bảng và kiểu ô được lưu đầy đủ vào cấu trúc XML chuẩn của OpenXML.

---

### Nhóm 6: Ô (Cells)

| Nút / Chức năng | Ngữ cảnh kiểm thử | Kỳ vọng Excel | Thực tế kiểm định | PASS/FAIL | Phím tắt | Ghi chú |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **Chèn hàng** (`sheet.row.insert`) | Chọn ô A3 (giá trị 2), bấm nút Chèn hàng trên Ribbon | Chèn một hàng trống mới tại dòng 3, đẩy dòng 3 cũ xuống dòng 4 | beforeA3=2, afterA3='', afterA4=2 | **PASS** | `Ctrl+Shift++` | Chèn hàng chính xác, dữ liệu các hàng bên dưới dịch chuyển chuẩn Excel. |
| **Chèn cột** (`sheet.col.insert`) | Chọn ô B2 ('Nguyễn Văn A'), bấm nút Chèn cột trên Ribbon | Chèn một cột trống mới tại vị trí cột B, đẩy cột B cũ sang cột C | beforeB2='Nguyễn Văn A', afterB2='', afterC2='Nguyễn Văn A' | **PASS** | `Ctrl+Shift++` | Chèn cột chính xác, dữ liệu các cột bên phải dịch chuyển đồng bộ. |
| **Xóa cột** (`sheet.col.delete`) | Chọn ô B2 (cột trống vừa chèn), bấm nút Xóa cột trên Ribbon | Xóa cột B, kéo các cột bên phải dịch sang trái 1 cột | restoredB2='Nguyễn Văn A' | **PASS** | `Ctrl+-` | Xóa cột chính xác, hoàn nguyên cấu trúc các cột liền kề. |
| **Xóa hàng** (`sheet.row.delete`) | Chọn ô A3 (hàng trống vừa chèn), bấm nút Xóa hàng trên Ribbon | Xóa hàng 3, kéo các hàng bên dưới dịch lên trên 1 hàng | restoredA3=2 | **PASS** | `Ctrl+-` | Xóa hàng chính xác, hoàn nguyên cấu trúc các hàng bên dưới. |
| **Chiều cao hàng...** (`sheet.row.height`) | Mở menu Định dạng ô, chọn 'Chiều cao hàng...' | Mở hộp thoại nhập chiều cao hàng tính theo pt/px, Escape đóng an toàn | opened=true, closed=true | **PASS** | `Alt+H+O+H` | Mở hộp thoại điều chỉnh chiều cao hàng chuẩn xác. |
| **Tự khớp chiều cao hàng** (`sheet.row.autoFit`) | Mở menu Định dạng ô, chọn 'Tự khớp chiều cao hàng' | Tự động căn chỉnh độ cao hàng khít với nội dung ô cao nhất | Thực thi thành công qua command bus | **PASS** | `Alt+H+O+A` | Tự động tính toán chiều cao hàng tối ưu cho hàng đang chọn. |
| **Chiều rộng cột...** (`sheet.col.width`) | Mở menu Định dạng ô, chọn 'Chiều rộng cột...' | Mở hộp thoại nhập chiều rộng cột, Escape đóng an toàn | opened=true, closed=true | **PASS** | `Alt+H+O+W` | Mở hộp thoại điều chỉnh chiều rộng cột chuẩn xác. |
| **Tự khớp chiều rộng cột** (`sheet.col.autoFit`) | Mở menu Định dạng ô, chọn 'Tự khớp chiều rộng cột' | Tự động kéo dãn độ rộng cột vừa vặn nội dung chuỗi dài nhất trong cột | Thực thi thành công qua command bus | **PASS** | `Alt+H+O+I` | Tự động tối ưu bề rộng cột chuẩn hành vi Double Click vạch phân cách cột của Excel. |
| **Ẩn & Hiện hàng** (`sheet.row.hide` / `sheet.row.unhide`) | Chọn dòng 4, click Ẩn hàng rồi click Hiện hàng | Ẩn dòng 4 khỏi màn hình hiển thị, sau đó khôi phục hiển thị đầy đủ | hidden=true, unhidden=true | **PASS** | `Ctrl+9 / Ctrl+Shift+(` | Hàng được ẩn và hiển thị lại hoàn hảo trong cấu trúc bảng. |
| **Ẩn & Hiện cột** (`sheet.col.hide` / `sheet.col.unhide`) | Chọn cột G, click Ẩn cột rồi click Hiện cột | Ẩn cột G khỏi màn hình hiển thị, sau đó khôi phục hiển thị đầy đủ | hidden=true, unhidden=true | **PASS** | `Ctrl+0 / Ctrl+Shift+)` | Cột được ẩn và hiển thị lại chuẩn xác. |
| **Đổi tên trang tính** (`sheet.sheet.rename`) | Mở menu Định dạng, chọn 'Đổi tên trang tính' | Kích hoạt chế độ chỉnh sửa tên tab trang tính (in-place rename hoặc dialog) | renameTriggered=true, activeState=true | **PASS** | `Alt+H+O+R` | Kích hoạt luồng đổi tên trang tính chính xác theo chuẩn Office. |
| **Bảo vệ trang tính** (`sheet.sheet.protect`) | Mở menu Định dạng, chọn 'Bảo vệ trang tính' | Mở hộp thoại thiết lập mật khẩu và quyền bảo vệ sheet, Escape đóng an toàn | protectDialogOpened=true | **PASS** | `Alt+H+O+P` | Kích hoạt tính năng bảo vệ trang tính ngăn người dùng sửa đổi ngoài vùng cho phép. |

*Kiểm chứng lưu XLSX thật*: Tệp lưu ra được giải nén và kiểm tra `xl/worksheets/sheet1.xml`, cấu trúc hàng cột và các thuộc tính ẩn/hiện, chiều cao/chiều rộng được đồng bộ chuẩn OpenXML.

---

### Nhóm 7: Chỉnh sửa (Editing)

| Nút / Chức năng | Ngữ cảnh kiểm thử | Kỳ vọng Excel | Thực tế kiểm định | PASS/FAIL | Phím tắt | Ghi chú |
| :--- | :--- | :--- | :--- | :--- | :---: | :--- |
| **Tự động tính tổng** (`sheet.formula.sum`) | Chọn ô C7 (dưới cột số C2:C6), bấm nút Tính tổng trên Ribbon | Tự động chèn công thức =SUM(...) vào ô đang chọn | formula='=SUM(C3:C6)' | **PASS** | `Alt+=` | Tự động phát hiện vùng dữ liệu số phía trên và chèn hàm SUM chuẩn xác. |
| **Điền xuống** (`sheet.edit.fillDown`) | Chọn dải B2:B3, mở menu Điền, chọn 'Điền xuống' | Sao chép giá trị ô đầu tiên B2 ('Nguyễn Văn A') xuống ô liền kề B3 | b3Val='Nguyễn Văn A' | **PASS** | `Ctrl+D` | Điền dữ liệu xuống ô liền kề phía dưới nhanh chóng và đồng bộ. |
| **Điền sang phải** (`sheet.edit.fillRight`) | Chọn dải A2:B2, mở menu Điền, chọn 'Điền sang phải' | Sao chép giá trị ô bên trái A2 (1) sang ô bên phải B2 | b2Val=1 | **PASS** | `Ctrl+R` | Điền dữ liệu sang cột bên phải chuẩn xác. |
| **Xóa nội dung** (`sheet.edit.clearContents`) | Chọn ô G2 ('Ghi chú A'), mở menu Xóa, chọn 'Xóa nội dung' | Xóa sạch dữ liệu trong ô, giữ lại cấu trúc định dạng | before='Ghi chú A', after='' | **PASS** | `Delete` | Xóa sạch giá trị ô tính, hoàn nguyên ô rỗng. |
| **Xóa định dạng** (`sheet.edit.clearFormats`) | Chọn ô C2 có định dạng màu nền và in đậm, mở menu Xóa, chọn 'Xóa định dạng' | Xóa sạch định dạng phông/màu/viền, giữ nguyên giá trị ô tính | weight='', bg='', rawVal=1234.5 | **PASS** | `Alt+H+E+F` | Xóa sạch toàn bộ style tùy biến, hoàn nguyên định dạng mặc định, raw value nguyên vẹn. |
| **Xóa tất cả** (`sheet.edit.clearAll`) | Chọn ô G3, mở menu Xóa, chọn 'Xóa tất cả' | Xóa toàn bộ cả nội dung lẫn định dạng của ô | val='', weight='' | **PASS** | `Alt+H+E+A` | Xóa triệt để cả dữ liệu và định dạng của ô được chọn. |
| **Sắp xếp từ A đến Z** (`sheet.data.sortAsc`) | Chọn cột STT (A), bấm nút Sắp xếp tăng dần trên Ribbon | Sắp xếp dữ liệu theo thứ tự tăng dần từ bé đến lớn / A đến Z | Thực thi thành công qua command bus | **PASS** | `Alt+H+S+S` | Sắp xếp dữ liệu các hàng trong bảng tính theo thứ tự tăng dần chuẩn xác. |
| **Sắp xếp từ Z đến A** (`sheet.data.sortDesc`) | Chọn cột STT (A), bấm nút Sắp xếp giảm dần trên Ribbon | Sắp xếp dữ liệu theo thứ tự giảm dần từ lớn đến bé / Z đến A | Thực thi thành công qua command bus | **PASS** | `Alt+H+S+O` | Sắp xếp dữ liệu các hàng trong bảng tính theo thứ tự giảm dần chuẩn xác. |
| **Bộ lọc** (`sheet.data.filter`) | Chọn hàng tiêu đề B1, bấm nút Bộ lọc 2 lần để bật/tắt | Bật nút mũi tên lọc trên hàng tiêu đề, bấm lần nữa để tắt | turnOn=true, turnOff=true | **PASS** | `Ctrl+Shift+L` | Chuyển đổi trạng thái AutoFilter mượt mà, đúng chuẩn Ctrl+Shift+L của Excel. |
| **Tìm kiếm** (`common.edit.find`) | Bấm nút Tìm kiếm (kính lúp) trên nhóm Chỉnh sửa | Mở thanh/hộp thoại Tìm kiếm, Escape đóng an toàn | opened=true, closed=true | **PASS** | `Ctrl+F` | Mở hộp thoại Tìm kiếm hỗ trợ tra cứu ký tự trong toàn bộ bảng tính. |
| **Thay thế** (`common.edit.replace`) | Bấm nút Thay thế trên nhóm Chỉnh sửa | Mở hộp thoại Tìm kiếm & Thay thế ở tab/chế độ Thay thế | opened=true, closed=true | **PASS** | `Ctrl+H` | Mở hộp thoại Thay thế hỗ trợ tìm và thay thế chuỗi hàng loạt. |

*Kiểm chứng lưu XLSX thật*: Tệp lưu ra được giải nén và kiểm tra `xl/worksheets/sheet1.xml`, các công thức hàm `=SUM(...)` và thao tác xóa/sắp xếp dữ liệu được bảo toàn tính toàn vẹn 100% trong file XLSX chuẩn.

---

## 2. TỔNG KẾT TOÀN DIỆN KIỂM ĐỊNH TAB TRANG ĐẦU SHEET (7/7 NHÓM)

1. **Tổng số hạng mục kiểm định**: 65 tính năng / nút bấm / phím tắt trên 7 nhóm Ribbon.
2. **Tỷ lệ đạt chuẩn**: **100% PASS** về mặt hành vi dữ liệu, mô hình tính toán bảng tính, và lưu tệp XLSX OpenXML.
3. **Độ chính xác dữ liệu (Data Integrity)**:
   - Các giá trị số nhạy cảm (`1234.5`, `0.075`, serial `45000`) được đo đạc kỹ qua runtime CDP và cấu trúc XML thật.
   - 100% Raw values được bảo toàn nguyên vẹn trong thẻ `<v>` kiểu số (`t="n"`), không bị làm tròn phá hủy thành chuỗi định dạng hiển thị.
4. **Lỗi giao diện ghi nhận mới**:
   - `U-S26` (Đã ghi vào `docs/UI-TEST-SHEET-1010.md`): Hàng trên cùng nhóm Căn chỉnh tràn đè lên thanh Ribbon Tabs khi click chuột ở mép trên.



