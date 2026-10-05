# Phân tích: định dạng ô XLSX qua LibreOffice

Phạm vi: đọc mã LibreOffice tại `E:\VN OFice\core-master\core-master`; không chạy ứng dụng.

## 1. XF gốc và mô hình ô

- Parser ghi `s` của cell vào `CellModel.mnXfId`; `SheetDataBuffer::setCellFormat` dùng ID đó làm khóa thu thập các `ScRange` theo XF (`sheetdatacontext.cxx:371`; `sheetdatabuffer.cxx:721-724`).
- XF được tra cứu để áp nội dung định dạng; `ScAttrArray` giữ các đoạn hàng trỏ tới `ScPatternAttr`, không có trường XF trên entry (`sheetdatabuffer.cxx:768`; `attarray.cxx:181-183,235-269`; `patattr.hxx:126-154`).
- Vì vậy không thấy bằng chứng XF gốc được giữ 1:1 trong mô hình ô sau import. `CellStyleBuffer` ánh xạ XF của *style record* sang CellStyle, khác với cell XF; đó không chứng minh mỗi cell XF có tên style tương ứng (`stylesbuffer.cxx:2945-2968`).
- Các `ScPatternAttr` liền kề được nối nếu cùng thuộc tính; nhiều XF có thể hội tụ về thuộc tính giống nhau sau chuyển đổi. Không thể khẳng định tên kiểu Excel như `ce12` tồn tại/ánh xạ 1:1 (`attarray.cxx:149-170`).

## 2. Run và style-name trong FODS

- Export duyệt cell theo thứ tự; gộp ngang khi hai cell kề nhau, cùng hàng và `IsCellEqual` đúng, rồi ghi `table:number-columns-repeated` với số ô lặp (`xmlexprt.cxx:2986-3015,3182-3184,3946-3955`).
- Điều kiện gồm auto-style index, validation, kiểu nội dung và giá trị/chuỗi; giá trị còn so sánh number format. Ô merged/matrix/annotation/shape bị hạn chế gộp (`xmlexprt.cxx:3966-4018`).
- Không có so XF gốc: nó không còn trong `ScMyCell`; hai XF có thể chung `table:style-name` khi export ra cùng auto-style/property index; riêng cell số, khác number format ngăn gộp (`xmlexprt.cxx:3966-4018`; `sheetdatabuffer.cxx:721-724`).
- Style name được ghi trên cell khi `nStyleIndex != -1`; `xmlstyle.cxx` xuất thuộc tính number-format thành tên data-style (`xmlexprt.cxx:3182-3185`; `xmlstyle.cxx:652-670`).

## 3. Number format và giá trị text/ngày

- Import ngày giờ XLSX đổi thành serial số rồi gán NumberFormat chuẩn ngày/giờ; ô text lấy chuỗi đã giải mã từ shared/rich string và ghi vào document (`sheetdatabuffer.cxx:123-145,153-166`).
- FODS lưu định dạng trong automatic cell styles; mapper lấy mã NumberFormat của thuộc tính và xuất `style:data-style-name` trỏ đến data style, nên có thể lấy map style → data-style → mô tả format từ XML FODS, không cần lặp thuộc tính vào từng ô (`xmlstyle.cxx:652-670`; `xmlexprt.cxx:3182-3185`).
- Cell export mang style-name và nội dung; chuỗi được xuất thành text content, còn ngày/giờ được biểu diễn theo kiểu dữ liệu/giá trị ODF. Đây là biểu diễn đã chuẩn hóa, không phải bản lưu nguyên văn XML/kiểu lưu XLSX (`xmlexprt.cxx:3182-3185`; `xmlexprt.cxx:3075-3095`).
- UNO NumberFormat là khóa trong bảng định dạng LibreOffice, không phải mã XF XLSX; `XNumberFormatsSupplier`/`XNumberFormatTypes` được dùng ngay trong import để gán format (`sheetdatabuffer.cxx:153-166`).

## 4. UNO truy vấn vùng định dạng và độ phức tạp

- `XCellFormatRangesSupplier.getCellFormatRanges()` trả ranges định dạng qua `ScCellFormatsObj`; `getUniqueCellFormatRanges()` có bản unique theo pattern (`cellsuno.cxx:5602-5618`).
- Bộ unique quét các đoạn do iterator trả, lấy pattern theo đầu đoạn rồi gom bằng hash map; chi phí xấp xỉ O(R) kỳ vọng + gom/sắp xếp, R là số đoạn thuộc tính, bộ nhớ O(U), U là số pattern (`cellsuno.cxx:9072-9094`).
- `ScCellFormatsEnumeration` tiến bằng iterator định dạng, trả từng range/cell; nên phù hợp tránh stamp từng ô nếu cần vùng liên tục (`cellsuno.cxx:8813-8847`). `queryContentCells(flags)` là lọc theo loại nội dung và lặp `ScCellIterator`, không phải truy vấn định dạng (`cellsuno.cxx:3380-3395`).
- Không có cơ sở ở đây để khẳng định UNO call nhanh tuyệt đối: enumeration/range giảm số đối tượng theo run, nhưng overhead UNO và số run vẫn tồn tại; tránh `getCellFormatRanges` trên từng cell riêng lẻ.

## Kết luận

- (a) Từ FODS/UNO có thể lấy format hiện hành, style/data-style và các vùng có pattern tương ứng; không cần XLSX để tái dựng định dạng đang được LibreOffice biểu diễn (`xmlstyle.cxx:652-670`; `cellsuno.cxx:5602-5618,9072-9094`).
- (b) XF index/ID ban đầu và khác biệt XML XLSX đã chuẩn hóa không được mô hình `ScPatternAttr`/FODS nêu giữ; nếu payload cần danh tính XF gốc hoặc metadata XLSX khác thì phải đọc và lưu khi còn XLSX (`sheetdatacontext.cxx:371`; `attarray.cxx:181-183`; `xmlexprt.cxx:3182-3185`).
- (c) Đề xuất JS nhận danh sách run `{sheet, range, styleName, numberFormat}` cùng bảng style/data-style → format; chỉ giữ `{range, sourceXf}` riêng khi importer đọc XLSX, không đóng dấu từng ô. Validate range/style ID và dùng dữ liệu cục bộ; không gửi nội dung tài liệu ra ngoài.
