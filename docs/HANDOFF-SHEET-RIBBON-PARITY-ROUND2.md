# Báo cáo chuyển giao: VN Sheet Ribbon Parity Vòng 2

Nhánh: fix/sheet-ribbon-parity-round2
Worktree: E:\VNOffice-agy-sheet-ribbon-parity-r2
Tách từ nhánh: main
Người thực hiện: agy (phụ trách UI và thiết kế)
Trạng thái: Hoàn thành đầy đủ 3 tab Data, Review, View với 3 commit riêng biệt. Không merge vào main.

## 1. Tổng quan công việc

Vòng 2 hoàn thiện đối chiếu chuẩn giao diện Microsoft Excel cho 3 tab còn lại của VN Sheet: tab Dữ liệu (Data), Xem xét (Review), và Chế độ xem (View).

Toàn bộ các thay đổi tuân thủ nghiêm ngặt ranh giới an toàn:
- Chỉ điều chỉnh cấu trúc ribbon trong tệp apps/sheet/sheet-ribbon.js.
- Không thay đổi bất kỳ logic tính toán, serialization ODF/OOXML hay command handler nào trong sheet-adapter.js hoặc formula engine.
- Không tạo lệnh giả hoặc nút rỗng cho các tính năng chưa có backend.
- Mỗi tab được kiểm thử độc lập và tạo commit riêng ngay sau khi hoàn tất.

Kết quả kiểm thử trước khi commit:
- Kiểm thử đơn vị (node tests/run-tests.js): 1300/1300 bài kiểm tra đạt chuẩn (100% PASS, 0 FAIL).
- Kiểm thử kiểm toán thanh Ribbon (node tests/live/ribbon-audit-1280.playwright.mjs): 104/104 lượt kiểm tra đạt (100% PASS, 0px tràn ngang tại độ phân giải 1280px trên cả 26 tab, 2 ngôn ngữ VI/EN).
- Kiểm tra trực quan bằng Playwright trên Microsoft Edge thật: Cả 3 tab hiển thị đồng đều, các icon vector sắc nét, bố cục cân đối và các nút lệnh phản hồi chính xác.

## 2. Chi tiết điều chỉnh từng tab

### Tab Dữ liệu (Data) - Commit 273d0cc

Đối chiếu với Microsoft Excel thật:
Excel chuẩn có thứ tự nhóm: Get & Transform Data, Queries & Connections, Sort & Filter, Data Tools, Forecast, Outline.

Các điều chỉnh thực hiện:
- Bổ sung định danh nhóm rõ ràng cho toàn bộ các nhóm trong tab: sortFilter, dataTools, outline, pivotTable.
- Nhóm Sắp xếp & Lọc (Sort & Filter): Giữ nguyên 3 nút lớn độc lập gồm Sắp xếp A-Z (sheet.data.sortAsc), Sắp xếp Z-A (sheet.data.sortDesc) và Bộ lọc (sheet.data.filter). Việc giữ các nút hiển thị trực tiếp là bắt buộc nhằm đảm bảo hợp đồng kiểm thử trong ribbon-audit-1280.
- Nhóm Công cụ dữ liệu (Data Tools): Sắp xếp lại thứ tự các công cụ theo đúng quy trình của Excel. Trước đây nút Hợp nhất dữ liệu (sheet.data.consolidate) bị đặt trước Điền nhanh và Xóa trùng lặp. Đã chuyển nút Hợp nhất dữ liệu ra sau cột công cụ, tạo thành thứ tự chuẩn: Tách văn bản (sheet.data.textToColumns) -> Điền nhanh (sheet.data.flashFill), Xóa trùng lặp (sheet.data.removeDuplicates), Kiểm tra dữ liệu (sheet.data.validation) -> Hợp nhất dữ liệu (sheet.data.consolidate) -> Menu thả xuống Phân tích What-If (sheet.data.goalSeek, sheet.data.dataTable, sheet.data.scenarioManager).
- Nhóm Dàn bài (Outline): Giữ nguyên cột 3 lệnh Nhóm (sheet.data.group), Bỏ nhóm (sheet.data.ungroup) và Tổng phụ (sheet.data.subtotal).
- Nhóm Bảng tổng hợp (Pivot Table): Giữ nguyên tại tab Data gồm Tạo bảng tổng hợp (sheet.data.pivotTable) và Làm mới Pivot (sheet.data.pivotRefresh). Mặc dù trong Excel hiện đại PivotTable nằm ở tab Insert nhóm Tables, nhưng các kịch bản kiểm thử tự động của dự án (ví dụ sheet-pivot-chart) bắt buộc hai nút này phải hiện diện và click được tại tab Data.

### Tab Xem xét (Review) - Commit f508e14

Đối chiếu với Microsoft Excel thật:
Excel chuẩn có thứ tự nhóm: Proofing, Accessibility, Insights, Language, Comments, Notes, Protect.

Các điều chỉnh thực hiện:
- Nhóm Chứng minh (Proofing): Chứa nút lớn Kiểm tra chính tả (sheet.review.spellCheck, phím tắt F7). Nhãn nhóm được giữ nguyên là Chứng minh để đáp ứng yêu cầu khẳng định nghiêm ngặt trong bộ kiểm thử sheet-spellcheck-vi.test.js và slides-spellcheck-ribbon.test.js.
- Nhóm Ghi chú (Comments): Tái cấu trúc từ dạng dàn ngang 4 nút nhỏ thành bố cục 2 cột xếp chồng khoa học, đồng bộ với thiết kế tab Đánh giá của Writer. Nút Ghi chú mới (sheet.review.commentInsert) đứng đầu dạng nút lớn. Tiếp theo là cột thứ nhất chứa Xóa nhận xét (sheet.review.commentDelete) và Đã xử lý (sheet.review.commentResolve). Cột thứ hai chứa Nhận xét trước (sheet.review.commentPrevious) và Nhận xét sau (sheet.review.commentNext). Thứ tự đưa nút Xóa lên trước nút Điều hướng phản ánh đúng cấu trúc nhóm Comments của Excel thật (New Comment -> Delete -> Previous/Next). Bố cục mới giúp chiều rộng nhóm thu gọn từ 773px xuống 589px ở giao diện tiếng Việt và từ 885px xuống 642px ở giao diện tiếng Anh, loại bỏ hoàn toàn khoảng trống thừa.
- Nhóm Bảo vệ (Protection): Giữ nguyên hai nút lớn gồm Bảo vệ trang tính (sheet.sheet.protect) và Bảo vệ workbook (sheet.workbook.protect), khớp chính xác với hai tính năng cốt lõi Protect Sheet và Protect Workbook của Excel.

### Tab Chế độ xem (View) - Commit ee4cf3f

Đối chiếu với Microsoft Excel thật:
Excel chuẩn có thứ tự nhóm: Sheet View (Workbook Views), Show, Zoom, Window, Macros.

Các điều chỉnh thực hiện:
- Nhóm Chế độ xem bảng tính (Workbook Views): Giữ nguyên 3 nút lớn gồm Bình thường (sheet.view.normal), Xem ngắt trang (sheet.view.pageBreakPreview) và Bố trí trang (sheet.view.pageLayout).
- Nhóm Hiển thị (Show): Sắp xếp lại thứ tự các nút để Đường lưới (sheet.view.gridlines) đứng trước Thanh công thức (sheet.view.formulaBar), tiếp theo là Tiêu đề hàng cột (sheet.view.headings), khớp đúng thứ tự hiển thị của Excel. Toàn bộ các nút được giữ là phần tử trực tiếp của danh sách items nhằm tuân thủ chặt chẽ phép ánh xạ phẳng trong bài kiểm tra sheet-view-slides-comments.test.js dòng 53.
- Nhóm Thu phóng (Zoom): Nâng cấp nút 100% (sheet.view.zoomReset) và nút Thu phóng vùng chọn (sheet.view.zoomToSelection) thành các nút lớn trực quan, kết hợp cùng nút Phóng to (sheet.view.zoomIn) để tạo thành bộ 3 nút lớn đặc trưng của Excel (Zoom, 100%, Zoom to Selection). Nút Thu nhỏ (sheet.view.zoomOut) được bố trí liền kề gọn gàng.
- Nhóm Cửa sổ (Window): Giữ nguyên hai nút lớn gồm Cửa sổ mới (sheet.view.newWindow) và Cố định hàng cột (sheet.view.freezePanes), đúng thứ tự của Excel.

## 3. Danh mục các khoảng trống tính năng (Gaps) ghi nhận cho Grok và Codex

Dưới đây là danh mục các tính năng xuất hiện trên thanh Ribbon chuẩn của Microsoft Excel nhưng hiện chưa có backend xử lý hoặc chưa có command trong VN Sheet. Không tạo nút giả trên giao diện để tránh gây lỗi cho người dùng.

### Khoảng trống trong tab Dữ liệu (Data)
1. Nhóm Get & Transform Data: Chưa có logic nhập dữ liệu từ tệp ngoài như CSV/Text, dữ liệu từ trang Web, hoặc truy vấn cơ sở dữ liệu.
2. Nhóm Queries & Connections: Chưa có hệ thống quản lý kết nối ngoài và lệnh Làm mới tất cả (Refresh All) cho các nguồn dữ liệu bên ngoài.
3. Hộp thoại Sắp xếp tùy chỉnh nhiều cấp (Custom Sort dialog): Hiện tại Sheet chỉ có lệnh sắp xếp đơn cột A-Z và Z-A, chưa có hộp thoại cho phép thêm nhiều tầng điều kiện sắp xếp (Sort by Column, Then by Column).
4. Các lệnh Lọc nâng cao: Hiện chỉ có bật/tắt AutoFilter. Chưa có lệnh Xóa bộ lọc (Clear Filter), Áp dụng lại bộ lọc (Reapply Filter), và Bộ lọc nâng cao (Advanced Filter).
5. Dự báo (Forecast Sheet): Chưa có thuật toán hồi quy chuỗi thời gian và giao diện tạo bảng dự báo xu hướng.
6. Mối quan hệ dữ liệu (Relationships): Chưa có mô hình quản lý quan hệ bảng dữ liệu phục vụ phân tích nhiều bảng.

### Khoảng trống trong tab Xem xét (Review)
1. Từ điển đồng nghĩa (Thesaurus): Chưa tích hợp từ điển tiếng Việt đồng nghĩa/trái nghĩa.
2. Đếm từ (Word Count) cho bảng tính: Writer đã có writer.review.wordCount nhưng Sheet chưa có lệnh thống kê tổng số từ/ký tự trên bảng tính.
3. Kiểm tra khả năng truy cập (Check Accessibility): Chưa có bộ máy kiểm tra độ tương phản màu, văn bản thay thế (alt-text) và khả năng tiếp cận của người khiếm thị.
4. Tra cứu thông minh (Smart Lookup / Insights): Chưa có tích hợp tìm kiếm kiến thức trực tuyến cho nội dung ô.
5. Dịch thuật (Translate): Chưa có dịch tự động văn bản ô.
6. Bật/tắt hiện đồng thời tất cả ghi chú (Show All Comments): Hiện tại ghi chú ô chỉ hiển thị khi rê chuột (tooltip popup). Excel có nút bấm cho phép ghim mở toàn bộ hộp chú thích trên màn hình.
7. Tách biệt Ghi chú (Notes) và Nhận xét có luồng thảo luận (Threaded Comments): Hiện VN Sheet gom chung nhận xét và ghi chú thành một khái niệm duy nhất.
8. Chia sẻ sổ làm việc (Share Workbook) và Cho phép chỉnh sửa vùng (Allow Edit Ranges): Chưa có cơ chế phân quyền khóa từng vùng ô theo tài khoản.

### Khoảng trống trong tab Chế độ xem (View)
1. Dạng xem tùy chỉnh (Custom Views): Chưa có bộ nhớ lưu trạng thái ẩn/hiện hàng cột, bộ lọc và thiết lập in theo từng cấu hình xem có tên.
2. Thước đo bảng tính (Ruler): Chỉ khả dụng trên Word/Writer hoặc chế độ Page Layout đặc thù. Hiện lưới ô tính của VN Sheet chưa có thước đo pixel/cm kéo thả lề.
3. Quản lý cửa sổ nâng cao: Chưa có lệnh Sắp xếp tất cả cửa sổ (Arrange All), Chia đôi màn hình (Split Pane), Xem song song hai bảng tính (View Side by Side), Cuộn đồng bộ (Synchronous Scrolling), và Chuyển đổi giữa các cửa sổ (Switch Windows).
4. Ẩn và hiện cửa sổ workbook (Hide/Unhide Window): Khác với ẩn hàng/cột, Excel có tính năng ẩn toàn bộ cửa sổ tệp đang mở.
5. Bộ ghi Macro và trình soạn thảo mã (Macros / VBA): Bỏ qua theo đúng yêu cầu do chưa có engine thực thi mã macro an toàn.

### Tham chiếu các công việc song song của Grok
- Lệnh xoay góc chữ ô tính (sheet.cell.orientation): Đang được Grok phát triển xử lý, không can thiệp trùng lặp.
- Lệnh Thay thế văn bản trong bảng tính (common.edit.replace): Vòng 1 đã phát hiện thiếu bindHandler trong sheet-adapter.js và đã bàn giao Grok xử lý nối hộp thoại Tìm kiếm & Thay thế. Không sửa đổi logic adapter ở vòng này.

## 4. Lịch sử commit trên nhánh fix/sheet-ribbon-parity-round2

1. Commit 273d0cc: feat(sheet-ribbon): Data tab - parity with Excel Round 2
   Nội dung: Bổ sung định danh nhóm, chuẩn hóa thứ tự nhóm Công cụ dữ liệu đưa Hợp nhất dữ liệu về đúng vị trí sau Xóa trùng lặp và Kiểm tra dữ liệu theo chuẩn Excel.
2. Commit f508e14: feat(sheet-ribbon): Review tab - parity with Excel Round 2
   Nội dung: Sắp xếp lại nhóm Ghi chú thành cấu trúc 2 cột xếp chồng cân đối, đưa nút Xóa lên trước nút Điều hướng theo quy trình chuẩn Excel, giữ nguyên nhãn Chứng minh theo cam kết kiểm thử.
3. Commit ee4cf3f: feat(sheet-ribbon): View tab - parity with Excel Round 2
   Nội dung: Chuẩn hóa thứ tự nhóm Hiển thị với Đường lưới đứng trước Thanh công thức, nâng cấp 100% và Thu phóng vùng chọn thành các nút lớn nổi bật của nhóm Thu phóng theo chuẩn Excel.

Toàn bộ nhánh làm việc trên thư mục riêng biệt E:\VNOffice-agy-sheet-ribbon-parity-r2, bảo đảm an toàn tuyệt đối cho nhánh main.
