# Q49 — Rà soát giao diện phần 4 (21-10)

## Phạm vi và kết quả

Phiên rà soát thực tế qua CDP trên app desktop Windows, cửa sổ 1366×768. Đã chụp và xem ảnh ở các trạng thái liệt kê bên dưới. Vì nhiều hạng mục yêu cầu chưa được chạy trong phiên này, chúng được giữ **NOT RUN**; báo cáo không kết luận toàn bộ Q49 đạt.

### Slides

| Mục | Trạng thái | Nhận xét / ảnh |
|---|---|---|
| Chèn Bảng | ĐẠT về hiển thị, sáng và tối | Hộp giữa cửa sổ, hai ô số và hai nút rõ; [sáng](assets/q49-ui/slides-table-light.png), [tối](assets/q49-ui/slides-table-dark.png). |
| Sơ đồ (Diagram) | ĐẠT về hiển thị, sáng và tối | Bốn lựa chọn, số hộp và nút dưới cùng hiển thị; [sáng](assets/q49-ui/slides-diagram-light.png), [tối](assets/q49-ui/slides-diagram-dark.png). |
| Đầu trang & Chân trang | ĐẠT về hiển thị, tối | Hộp gọn; các lựa chọn và nút Áp dụng/Hủy nằm trong khung. [Ảnh](assets/q49-ui/slides-header-footer-dark.png). |
| Ngày & Giờ | ĐẠT về hiển thị, tối | Năm kiểu ngày/giờ có thể chọn; nút nằm trong khung. [Ảnh](assets/q49-ui/slides-date-time-dark.png). |
| Ký hiệu | ĐẠT về hiển thị, tối | Các nhóm Ký hiệu thường dùng/Toán học/Mũi tên hiển thị đủ. [Ảnh](assets/q49-ui/slides-symbol-dark.png). |
| Liên kết | NOT RUN — không mở được bằng chuột | Tab Chèn không có nút Liên kết; tìm “hyperlink” trong ô tìm tính năng cũng không trả kết quả. Không thể mở hộp thoại bằng chuột trong giao diện hiện có. [Sáng](assets/q49-ui/slides-link-search-light.png), [tối](assets/q49-ui/slides-link-search-dark.png). |
| Tác vụ (Action) | ĐẠT về hiển thị, tối | Trên slide trống nút không mở hộp; sau khi chọn biểu đồ hộp Tác vụ khi nhấp mở đủ lựa chọn hành động, trang chiếu và địa chỉ web. [Ảnh](assets/q49-ui/slides-action-selected-context-dark.png). |
| Soát lỗi chính tả | ĐẠT về hiển thị, tối | Hộp thông báo hoàn tất kiểm tra trang chiếu và nút Đóng hiển thị rõ. [Ảnh](assets/q49-ui/slides-spellcheck-dark.png). |
| Chữ nghệ thuật | ĐẠT về hiển thị, tối | Ô nhập, 8 kiểu và hai nút nằm trong hộp. [Ảnh](assets/q49-ui/slides-wordart-dark.png). |
| Tab ngữ cảnh hình/bảng/biểu đồ | ĐẠT một phần, sáng và tối | Đã mở Định dạng hình, Thiết kế bảng, Bố cục bảng, Thiết kế biểu đồ; tên tab và nhóm lệnh hiển thị trong khung. [Hình](assets/q49-ui/slides-shape-format-context-light.png), [Thiết kế bảng](assets/q49-ui/slides-table-design-context-light.png), [Bố cục bảng](assets/q49-ui/slides-table-layout-context-light.png), [Biểu đồ sáng](assets/q49-ui/slides-chart-design-context-light.png), [Biểu đồ tối](assets/q49-ui/slides-chart-design-context-dark.png). Tab Định dạng ảnh vẫn NOT RUN vì không mở bộ chọn tệp hệ điều hành. Trong fixture, bảng/biểu đồ/hình được chèn chồng lên nhau để mở tab; ảnh bảng tối phản ánh trạng thái các đối tượng chồng trong tài liệu thử, không kết luận lỗi app. |
| F5 — thanh điều khiển | CẦN XEM LẠI (trung bình) | Sau F5 chỉ thấy trang chiếu và dòng “Space hoặc Click để tiếp / Esc để thoát”; rê chuột không hiện thanh điều khiển. [F5](assets/q49-ui/slides-f5-dark.png), [sau rê chuột](assets/q49-ui/slides-f5-controls-dark.png). |
| Chế độ tác giả ghi chú | ĐẠT về hiển thị, tối | Khung ghi chú mở dưới canvas, có trường nhập riêng và bộ đếm ký tự; nội dung pane nằm trong cửa sổ. [Ảnh](assets/q49-ui/slides-notes-pane-dark.png). |

### Sheet

| Mục | Trạng thái | Nhận xét / ảnh |
|---|---|---|
| Xác thực dữ liệu (hộp dài, tối) | ĐẠT về hiển thị | Hộp cao, có cuộn nội bộ và nút Hủy/Áp dụng cố định trong khung; chưa thử giá trị sai. [Ảnh](assets/q49-ui/sheet-validation-dark.png). |
| Goal seek (Dò tìm mục tiêu) | ĐẠT về hiển thị, tối | Ba ô và hai nút rõ. [Ảnh](assets/q49-ui/sheet-goalseek-dark.png). |
| Data table (Bảng dữ liệu) | ĐẠT về hiển thị, tối | Hai ô đầu vào và nút cố định hiển thị. [Ảnh](assets/q49-ui/sheet-datatable-dark.png). |
| Scenario (Trình quản lý kịch bản) | ĐẠT về hiển thị, tối | Danh sách, trường nhập và nhóm nút vừa trong hộp. [Ảnh](assets/q49-ui/sheet-scenario-dark.png). |
| Pivot (Bảng tổng hợp) | CẦN XEM LẠI (trung bình) | Khi vùng mặc định A1 không hợp lệ, có thông báo đỏ nhưng nút tạo vẫn bật. Không bấm nút; cần xác nhận quy tắc vô hiệu hóa. [Ảnh](assets/q49-ui/sheet-pivot-dark.png). |
| Định dạng có điều kiện (hộp dài, tối) | ĐẠT về hiển thị | Nội dung cuộn riêng, nút Đóng/Thêm quy tắc luôn thấy; chưa thử dữ liệu sai. [Ảnh](assets/q49-ui/sheet-conditional-dark.png). |
| Định dạng Bảng (hộp dài, tối) | ĐẠT sau sửa dịch | Trước sửa tiêu đề còn “Format as Table”; CDP FAIL. Sau sửa còn tiếng Việt; CDP PASS. [Trước](assets/q49-ui/sheet-format-as-table-dark.png), [sau](assets/q49-ui/sheet-format-as-table-after-dark.png). |
| Chiều cao hàng | ĐẠT về hiển thị, tối | Một ô số và hai nút cân đối. [Ảnh](assets/q49-ui/sheet-row-height-dark.png). |
| Launcher Font / Căn chỉnh / Số | ĐẠT về hiển thị, tối | Launcher Font và Số mở tab Số; launcher Căn chỉnh mở đúng tab. Các hộp vừa cửa sổ. [Font](assets/q49-ui/sheet-font-launcher-dark.png), [Căn chỉnh](assets/q49-ui/sheet-alignment-launcher-dark.png), [Số](assets/q49-ui/sheet-number-launcher-dark.png). |
| Lề tùy chỉnh | ĐẠT về hiển thị, tối | Sáu trường lề, căn giữa và nút dưới cùng đều thấy. [Ảnh](assets/q49-ui/sheet-custom-margins-dark.png). |
| Khổ giấy tùy chỉnh | ĐẠT về hiển thị, tối | Hộp có thanh cuộn nội bộ và nút Hủy/Áp dụng cố định. [Ảnh](assets/q49-ui/sheet-custom-paper-size-dark.png). |
| Tab/Enter/Esc từng hộp; thử nhập sai; light mode của các hộp dài | NOT RUN | Chưa chạy ma trận bàn phím/giá trị lỗi; không kết luận đạt. |

### Writer

| Mục | Trạng thái | Nhận xét / ảnh |
|---|---|---|
| Trang bìa | ĐẠT về hiển thị, sáng | Thư viện 4 mẫu, trường thông tin và nút cố định; nội dung cuộn bên trong. [Ảnh](assets/q49-ui/writer-cover-library-light.png). |
| Phương trình | ĐẠT về hiển thị, sáng | Khu nhập và xem trước song song, nút Hủy/Chèn nằm trong khung. [Ảnh](assets/q49-ui/writer-equation-light.png). |
| Ký hiệu | ĐẠT về hiển thị, sáng | Các nhóm và nút Hủy nằm trong khung. [Ảnh](assets/q49-ui/writer-symbol-light.png). |
| Tham chiếu chéo | ĐẠT về hiển thị, sáng | Khi không có tiêu đề/đánh dấu, cảnh báo rõ và nút Chèn bị khóa. [Ảnh](assets/q49-ui/writer-cross-reference-light.png). |
| Mục lục tùy chỉnh | NOT RUN | Lệnh Mục lục tự động đã chèn khung trạng thái rỗng trực tiếp; chưa tìm thấy hộp tùy chỉnh. [Trạng thái sau lệnh](assets/q49-ui/writer-toc-light.png). |
| Chú thích ảnh | ĐẠT về hiển thị, sáng | Nhãn, vị trí, nội dung và nút hiển thị rõ; hộp nhắc chưa chọn ảnh/bảng. [Ảnh](assets/q49-ui/writer-caption-light.png). |
| Đầu trang/Chân trang tùy chọn | NOT RUN | Nút Đầu trang chèn mẫu trực tiếp, không mở hộp cấu hình. Ảnh thao tác [tại đây](assets/q49-ui/writer-header-menu-light.png). |
| Chú thích cuối trang | ĐẠT về hiển thị, sáng và tối | Bấm Chú thích trang chèn số mốc và vùng nhập chú thích trực tiếp, không mở hộp thoại. Placeholder ban đầu có tương phản thấp trong theme tối; đã sửa và kiểm lại. [Sáng trước sửa](assets/q49-ui/writer-footnote-after-light.png), [tối trước sửa](assets/q49-ui/writer-footnote-after-dark.png), [sáng sau sửa](assets/q49-ui/writer-footnote-after-fix-light.png), [tối sau sửa](assets/q49-ui/writer-footnote-after-fix-dark.png). |
| Ngăn chọn | ĐẠT về hiển thị, sáng | Panel bên phải có Hiện tất cả/Ẩn tất cả/Nhóm/Bỏ nhóm và trạng thái rỗng rõ. [Ảnh](assets/q49-ui/writer-selection-pane-light.png). |
| Nguồn Trộn thư | ĐẠT về hiển thị, sáng | Hộp nguồn có các lựa chọn tệp/CSV/thủ công/dữ liệu mẫu, không gọi bộ chọn hệ điều hành. [Ảnh](assets/q49-ui/writer-mailmerge-source-light.png). |
| Hoàn tất Trộn thư | ĐẠT về hiển thị, sáng và tối | Nạp bộ dữ liệu mẫu (3 bản ghi/5 trường), lưu nguồn và chèn trường HọTên để mở hộp hoàn tất. Hộp yêu cầu xác nhận trước khi thay tài liệu; chưa thực thi trộn. [Nguồn mẫu](assets/q49-ui/writer-mailmerge-sample-light.png), [hộp sáng](assets/q49-ui/writer-mailmerge-finish-with-field-light.png), [hộp tối trước sửa](assets/q49-ui/writer-mailmerge-finish-dark.png), [hộp tối sau sửa](assets/q49-ui/writer-mailmerge-finish-after-dark.png), [sáng sau sửa](assets/q49-ui/writer-mailmerge-finish-after-light.png). |
| Soát lỗi chính tả | ĐẠT về hiển thị, sáng | Mở panel kiểm tra cục bộ; panel cuộn và thông báo kết quả nằm trong khung. [Ảnh](assets/q49-ui/writer-spellcheck-light.png). |
| Đếm từ | ĐẠT về hiển thị, sáng | Năm chỉ số và nút Đóng hiển thị đầy đủ. [Ảnh](assets/q49-ui/writer-wordcount-light.png). |

## Các hạng mục chung

| Hạng mục | Trạng thái |
|---|---|
| Tab/Shift+Tab, Esc, Enter, focus trả về nút kích hoạt trên mọi hộp | NOT RUN có hệ thống; đã lấy mẫu hộp Chèn Bảng: Tab chuyển hàng→cột→Hủy→Chèn, Shift+Tab quay lại; Enter xác nhận và Esc đóng hộp nhưng focus đều ở canvas (`.vno-slide-canvas`) thay vì nút mở (**FAIL**). Chưa kiểm trên các hộp khác. [Sau Enter sáng](assets/q49-ui/slides-table-enter-confirm-light.png), [tối](assets/q49-ui/slides-table-enter-confirm-dark.png). |
| Nhập rỗng, âm, >1e9, chữ, 5000 ký tự, ký tự đặc biệt | KIỂM TRA MỘT PHẦN — hộp Chèn Bảng | Ô số hàng cho phép rỗng (`valid=true`), âm và >1e9 (range invalid) nhưng nút Chèn vẫn bật; chữ bị ô số bỏ qua. 5000 chữ số tạo `badInput=true`, không crash; ô cuộn ngang trong khung nhưng nút Chèn vẫn bật. Không bấm Chèn ở giá trị sai; ký tự đặc biệt và các hộp khác NOT RUN. [Giá trị >1e9 sáng](assets/q49-ui/slides-table-invalid-large-light.png), [tối](assets/q49-ui/slides-table-invalid-large-dark.png), [5000 ký tự tối](assets/q49-ui/slides-table-5000-input-dark.png). |
| Tooltip 3 nút đầu mỗi tab | NOT RUN. |
| Toast vị trí/thời lượng/che nút | NOT RUN có hệ thống. Đã nhìn thấy toast “Đang tải…” ở góc dưới phải trong vài ảnh; không đo thời gian hoặc che khuất. |
| Chụp và xem | Đã xem 117 ảnh trong `docs/assets/q49-ui/`, toàn bộ ảnh có khung 1366×768. Không có ảnh ở 1280×720 vì danh sách Q49 yêu cầu 1366×768. |

### Bổ sung kiểm tra trực tiếp qua chuột — Slides

Chạy `tests/live/cdp/q49-slides-visual-review.desktop.mjs` trên app desktop với `VNO_CDP_LOCALAPPDATA` riêng. Bài chuyển tab và mở từng lệnh bằng CDP mouse, chụp hai theme ở 1366×768, kiểm khung dialog và đóng bằng Esc. **14/14** dialog nằm trọn trong viewport; ảnh dưới đây đều đã được mở và xem.

Lượt chạy đầu dừng trước khi mở hộp vì bài chưa chuyển từ tab Trang đầu sang Chèn. Bài đã được sửa để click tab phù hợp trước lệnh; lượt chạy lại hoàn tất **14/14**, không thay đổi app trong lần sửa bài kiểm tra này.

| Màn hình | Sáng | Tối | Kết luận |
|---|---|---|---|
| Chèn Bảng | [ảnh](assets/q49-ui/slides-table-light-1366x768.png) | [ảnh](assets/q49-ui/slides-table-dark-1366x768.png) | Đạt về bố cục; trường số và hai nút hiển thị rõ. |
| Sơ đồ | [ảnh](assets/q49-ui/slides-diagram-light-1366x768.png) | [ảnh](assets/q49-ui/slides-diagram-dark-1366x768.png) | Đạt về bố cục; bốn lựa chọn và số hộp nằm trong khung. |
| Đầu trang & Chân trang | [ảnh](assets/q49-ui/slides-header-footer-light-1366x768.png) | [ảnh](assets/q49-ui/slides-header-footer-dark-1366x768.png) | Đạt về bố cục và khả năng đọc. |
| Ngày & Giờ | [ảnh](assets/q49-ui/slides-date-time-light-1366x768.png) | [ảnh](assets/q49-ui/slides-date-time-dark-1366x768.png) | Đạt về bố cục; trong theme tối, các thẻ định dạng vẫn có nền trắng. Ghi nhận không đồng nhất theme, chữ vẫn đọc được. |
| Ký hiệu | [ảnh](assets/q49-ui/slides-symbol-light-1366x768.png) | [ảnh](assets/q49-ui/slides-symbol-dark-1366x768.png) | Đạt về bố cục; các nút ký hiệu nền trắng ở theme tối, vẫn đọc được. |
| Chữ nghệ thuật | [ảnh](assets/q49-ui/slides-wordart-light-1366x768.png) | [ảnh](assets/q49-ui/slides-wordart-dark-1366x768.png) | Đạt về bố cục; các thẻ mẫu giữ màu riêng ở theme tối, chữ mẫu vẫn đọc được. |
| Soát lỗi chính tả | [ảnh](assets/q49-ui/slides-spellcheck-light-1366x768.png) | [ảnh](assets/q49-ui/slides-spellcheck-dark-1366x768.png) | Đạt; thông báo và nút Đóng nằm trong khung. |

Kiểm tra bổ sung này chỉ xác nhận bố cục hai theme và Esc cho bảy dialog trên. Các ma trận Tab/Shift+Tab, Enter/focus trả về, nhập sai, tooltip và toast vẫn giữ trạng thái như bảng NOT RUN phía trên.

### Bổ sung kiểm tra trực tiếp qua chuột — Sheet

Chạy `tests/live/cdp/q49-sheet-visual-review.desktop.mjs` với profile riêng. Bài mở bảy hộp bằng chuột ở các tab Trang đầu/Dữ liệu, mở menu Phân tích What-If trước ba lệnh con, chụp hai theme 1366×768 và đóng bằng Esc. **14/14** hộp nằm trong viewport; ảnh đều đã mở và xem.

| Màn hình | Sáng | Tối | Kết luận |
|---|---|---|---|
| Xác thực dữ liệu (hộp dài) | [ảnh](assets/q49-ui/sheet-validation-light-1366x768.png) | [ảnh](assets/q49-ui/sheet-validation-dark-1366x768.png) | Đạt về bố cục; có cuộn nội bộ, chân hộp và nút luôn thấy. |
| Dò tìm mục tiêu | [ảnh](assets/q49-ui/sheet-goalseek-light-1366x768.png) | [ảnh](assets/q49-ui/sheet-goalseek-dark-1366x768.png) | Đạt về bố cục; ba trường và nút vừa khung. Chưa thử giá trị rỗng. |
| Bảng dữ liệu | [ảnh](assets/q49-ui/sheet-datatable-light-1366x768.png) | [ảnh](assets/q49-ui/sheet-datatable-dark-1366x768.png) | Đạt về bố cục; hai trường và nút vừa khung. |
| Trình quản lý kịch bản | [ảnh](assets/q49-ui/sheet-scenario-light-1366x768.png) | [ảnh](assets/q49-ui/sheet-scenario-dark-1366x768.png) | Đạt về bố cục; danh sách, trường và các nút hiển thị. |
| Tạo Bảng tổng hợp | [ảnh](assets/q49-ui/sheet-pivot-light-1366x768.png) | [ảnh](assets/q49-ui/sheet-pivot-dark-1366x768.png) | Lỗi trung bình đã ghi nhận: vùng nguồn A1 không hợp lệ nhưng nút Tạo Bảng tổng hợp vẫn bật. Không bấm nút. |
| Định dạng có điều kiện | [ảnh](assets/q49-ui/sheet-conditional-light-1366x768.png) | [ảnh](assets/q49-ui/sheet-conditional-dark-1366x768.png) | Hộp vừa khung, nội dung cuộn được; một số dòng cuối bị cắt ở mép vùng cuộn hiện tại, cần cuộn để xem tiếp. |
| Định dạng thành Bảng | [ảnh](assets/q49-ui/sheet-format-as-table-light-1366x768.png) | [ảnh](assets/q49-ui/sheet-format-as-table-dark-1366x768.png) | Đạt về bố cục; tiêu đề tiếng Việt, bảng mẫu cuộn được. Dải điều khiển đầu hộp còn nền trắng ở theme tối. |

Kiểm tra này chỉ xác nhận bố cục hai theme và Esc. Không chạy Tab/Shift+Tab/Enter/focus hoặc các bộ giá trị sai; các trạng thái đó vẫn NOT RUN.

## Phát hiện và sửa

- **Sheet — dịch tiêu đề Định dạng thành Bảng:** trước sửa CDP thấy `Format as Table` trong tiêu đề (**FAIL**); sửa chuỗi tiếng Việt và ảnh sau sửa không còn chuỗi tiếng Anh (**PASS**). Commit riêng `143cc50e` (`fix(sheet): translate format as table title`). Ảnh trước/sau trong thư mục trên.
- **Writer — độ tương phản nút xác nhận Trộn thư:** trạng thái vô hiệu hóa ban đầu có opacity 0.45 (**FAIL**, khó đọc trên nền tối); CSS riêng của hộp đặt opacity 0.7, vẫn khóa nút cho tới khi xác nhận (**PASS**). CDP ghi nhận `disabled=true`, opacity 0.45 trước và 0.7 sau; ảnh sáng/tối trước/sau ở nhóm `writer-mailmerge-finish-*`. Commit riêng `70993ad5` (`fix(writer): improve mail merge confirmation contrast`).
- **Writer — placeholder Chú thích trang trong theme tối:** CDP trước sửa thấy màu `rgb(71, 85, 105)`, tương phản 2.20:1 trên giấy `rgb(30, 30, 30)` (**FAIL**); bounding box 562×22 px nằm trong vùng cha và không tràn. CSS tối đặt màu placeholder `rgb(203, 213, 225)` và màu nội dung rõ hơn; CDP sau sửa tương phản 11.23:1, cùng bounding box nằm gọn, `overflow=false` (**PASS**). Ảnh trước/sau sáng/tối ở nhóm `writer-footnote-*`. Commit riêng `8d125703` (`fix(writer): improve dark footnote contrast`).
- **Slides — liên kết:** không thấy nút Liên kết trong tab Chèn; ô tìm tính năng với từ khóa “hyperlink” cũng không cho kết quả. Không thực hiện được kiểm tra dialog bằng chuột; ghi nhận thiếu điểm truy cập UI, chưa sửa vì cần xác định vị trí ribbon theo đúng phạm vi task. Ảnh sáng/tối tại `slides-link-search-*`.
- **Slides — hộp Chèn Bảng:** với `1000000001`, DOM báo `valid=false` nhưng nút Chèn vẫn bật ở cả sáng/tối; blank, âm và 5000 chữ số cũng không khóa nút. Không thử xác nhận số lớn. Ghi nhận mức trung bình vì cần đổi quy tắc validation. Bấm Enter với mặc định 3×3 chèn bảng đè lên placeholder “Bấm để thêm văn bản”; focus sau Enter/Esc ở canvas, không trở về nút kích hoạt. Ảnh trạng thái sau Enter sáng/tối. Chưa sửa vì cần thay hành vi.
- **Slides — thanh điều khiển trình chiếu:** rê chuột không làm hiện thanh điều khiển; ghi nhận mức trung bình, chưa sửa vì cần xem xét hành vi.
- **Sheet — nút tạo Pivot:** nút còn bật cùng thông báo vùng không hợp lệ; ghi nhận mức trung bình, chưa sửa.

## Kiểm thử và gate

- `npm test`: PASS — 3791/3791, 0 lỗi.
- `node scripts/audit-0610/i18n_parity.mjs`: PASS — 0 khóa VI/EN còn thiếu, 0 placeholder mismatch; 20 khóa được công cụ đánh dấu nghi ngờ giống VI/EN.
- `python scripts/audit-0610/verify_checklist_evidence.py --all --no-fix`: PASS — 0 dòng bị hạ trong Word/Excel/Slides.
- Checklist generators: PASS — Excel 217 mục, Slides 269 mục, Writer 279 mục; đã sinh lại cả ba checklist.
- `python -m pytest tests -q -k "writer or sheet or slides or dialog or ribbon"`: PASS — 794 passed, 346 deselected, 558.17s.

## Tóm tắt

Phiên này hoàn thành một phần rà soát trực quan, một sửa dịch Sheet, hai sửa tương phản nhỏ cho nút xác nhận Trộn thư và vùng nhập chú thích tối; ba sửa có CDP FAIL/PASS trước/sau. Sweep còn ghi nhận validation/focus và điểm truy cập Liên kết cần xử lý riêng. Nhiều hạng mục trong backlog, ma trận bàn phím và giá trị sai còn **NOT RUN**; không kết luận toàn bộ Q49 đạt.
