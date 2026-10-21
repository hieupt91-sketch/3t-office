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
| Liên kết | NOT RUN | Chưa mở trong lượt này. |
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
| Chú thích cuối trang | NOT RUN | Chưa mở; lệnh có thể chèn nội dung trực tiếp. |
| Ngăn chọn | ĐẠT về hiển thị, sáng | Panel bên phải có Hiện tất cả/Ẩn tất cả/Nhóm/Bỏ nhóm và trạng thái rỗng rõ. [Ảnh](assets/q49-ui/writer-selection-pane-light.png). |
| Nguồn Trộn thư | ĐẠT về hiển thị, sáng | Hộp nguồn có các lựa chọn tệp/CSV/thủ công/dữ liệu mẫu, không gọi bộ chọn hệ điều hành. [Ảnh](assets/q49-ui/writer-mailmerge-source-light.png). |
| Hoàn tất Trộn thư | ĐẠT về hiển thị, sáng và tối | Nạp bộ dữ liệu mẫu (3 bản ghi/5 trường), lưu nguồn và chèn trường HọTên để mở hộp hoàn tất. Hộp yêu cầu xác nhận trước khi thay tài liệu; chưa thực thi trộn. [Nguồn mẫu](assets/q49-ui/writer-mailmerge-sample-light.png), [hộp sáng](assets/q49-ui/writer-mailmerge-finish-with-field-light.png), [hộp tối trước sửa](assets/q49-ui/writer-mailmerge-finish-dark.png), [hộp tối sau sửa](assets/q49-ui/writer-mailmerge-finish-after-dark.png), [sáng sau sửa](assets/q49-ui/writer-mailmerge-finish-after-light.png). |
| Soát lỗi chính tả | ĐẠT về hiển thị, sáng | Mở panel kiểm tra cục bộ; panel cuộn và thông báo kết quả nằm trong khung. [Ảnh](assets/q49-ui/writer-spellcheck-light.png). |
| Đếm từ | ĐẠT về hiển thị, sáng | Năm chỉ số và nút Đóng hiển thị đầy đủ. [Ảnh](assets/q49-ui/writer-wordcount-light.png). |

## Các hạng mục chung

| Hạng mục | Trạng thái |
|---|---|
| Tab/Shift+Tab, Esc, Enter, focus trả về nút kích hoạt trên mọi hộp | NOT RUN có hệ thống; đã lấy mẫu hộp Chèn Bảng: Tab chuyển từ hàng sang cột, Shift+Tab quay lại, Esc đóng hộp nhưng focus rơi vào canvas (`.vno-slide-canvas`) thay vì nút mở (FAIL). Chưa chạy Enter hoặc các hộp khác. Hộp mẫu: [ảnh](assets/q49-ui/slides-table-context-insert-light.png). |
| Nhập rỗng, âm, >1e9, chữ, 5000 ký tự, ký tự đặc biệt | NOT RUN. |
| Tooltip 3 nút đầu mỗi tab | NOT RUN. |
| Toast vị trí/thời lượng/che nút | NOT RUN có hệ thống. Đã nhìn thấy toast “Đang tải…” ở góc dưới phải trong vài ảnh; không đo thời gian hoặc che khuất. |
| Chụp và xem | Đã xem 78 ảnh (liệt kê trong `docs/assets/q49-ui/`), toàn bộ ảnh có khung 1366×768. Không có ảnh ở 1280×720 vì danh sách Q49 yêu cầu 1366×768. |

## Phát hiện và sửa

- **Sheet — dịch tiêu đề Định dạng thành Bảng:** trước sửa CDP thấy `Format as Table` trong tiêu đề (**FAIL**); sửa chuỗi tiếng Việt và ảnh sau sửa không còn chuỗi tiếng Anh (**PASS**). Commit riêng `143cc50e` (`fix(sheet): translate format as table title`). Ảnh trước/sau trong thư mục trên.
- **Writer — độ tương phản nút xác nhận Trộn thư:** trạng thái vô hiệu hóa ban đầu có opacity 0.45 (**FAIL**, khó đọc trên nền tối); CSS riêng của hộp đặt opacity 0.7, vẫn khóa nút cho tới khi xác nhận (**PASS**). CDP ghi nhận `disabled=true`, opacity 0.45 trước và 0.7 sau; ảnh sáng/tối trước/sau ở nhóm `writer-mailmerge-finish-*`. Commit riêng sau gate.
- **Slides — thanh điều khiển trình chiếu:** rê chuột không làm hiện thanh điều khiển; ghi nhận mức trung bình, chưa sửa vì cần xem xét hành vi.
- **Sheet — nút tạo Pivot:** nút còn bật cùng thông báo vùng không hợp lệ; ghi nhận mức trung bình, chưa sửa.

## Kiểm thử và gate

- `npm test`: PASS — 3791/3791, 0 lỗi.
- `node scripts/audit-0610/i18n_parity.mjs`: PASS — 0 khóa VI/EN còn thiếu, 0 placeholder mismatch; 20 khóa được công cụ đánh dấu nghi ngờ giống VI/EN.
- `python scripts/audit-0610/verify_checklist_evidence.py --all --no-fix`: PASS — 0 dòng bị hạ trong Word/Excel/Slides.
- Checklist generators: PASS — Excel 217 mục, Slides 269 mục, Writer 279 mục; đã sinh lại cả ba checklist.
- `python -m pytest tests -q -k "writer or sheet or slides or dialog or ribbon"`: PASS — 794 passed, 346 deselected, 545.24s.

## Tóm tắt

Phiên này hoàn thành một phần rà soát trực quan, một sửa dịch Sheet và một sửa tương phản nhỏ cho nút xác nhận Trộn thư; cả hai có CDP FAIL/PASS trước/sau. Nhiều hạng mục trong backlog, ma trận bàn phím và giá trị sai còn **NOT RUN**; không kết luận toàn bộ Q49 đạt.
