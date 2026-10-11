# Báo cáo Bàn giao: Rà soát & Loại bỏ Trùng lặp Icon trên Ribbon (VN Office)

## 1. Tổng quan & Phạm vi Thực hiện

Tài liệu này ghi nhận kết quả rà soát toàn diện và xử lý triệt để hiện tượng trùng lặp hoặc gán nhầm icon SVG trên toàn bộ 26 tab của bộ ứng dụng VN Office (Writer, Sheet, Slides).

Công việc được thực hiện trên worktree riêng tại E:\VNOffice-agy-ribbon-icon-dedup thuộc nhánh fix/ribbon-icon-dedup-audit tách từ main (commit gốc 2e1ab94). Nhánh này tuyệt đối KHÔNG merge vào main theo đúng yêu cầu dự án.

Mọi chỉnh sửa tuân thủ nghiêm ngặt ranh giới an toàn được đề ra:
- Chỉ chỉnh sửa định nghĩa SVG trong platform/ui-kit/icons.js và thuộc tính icon trong platform/commands/command-definitions.js.
- Không thay đổi bất kỳ tệp logic, tệp adapter, tệp cấu trúc ribbon (apps/*/*-ribbon.js), hay tệp đa ngữ i18n nào.
- Toàn bộ các icon hiện có được giữ nguyên tính tương thích ngược, không xóa bỏ icon đang được nơi khác sử dụng.
- Đã chia nhỏ và hoàn thành tối thiểu 3 commit độc lập tương ứng với từng ứng dụng: Writer, Sheet và Slides.

---

## 2. Bảng Tổng hợp Rà soát & Xử lý Trùng lặp Icon

Dưới đây là danh sách chi tiết các trường hợp trùng lặp hoặc hiển thị icon chưa phù hợp đã được phát hiện và xử lý:

| Ứng dụng | Tab | Lệnh bị ảnh hưởng | Icon ban đầu | Vấn đề phát hiện | Icon mới sau xử lý | Kết quả |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Writer | Home | common.edit.selectAll | search | Dùng chung icon kính lúp với lệnh Find | selectAll | Biểu tượng trang tài liệu chọn toàn bộ với viền đứt và góc gập chuẩn Office |
| Writer | Home & Layout | writer.para.spacing1, spacing15, spacing2 | lineSpacing | Ba mức giãn dòng khác nhau dùng chung một icon giãn dòng đơn thuần | lineSpacing1, lineSpacing15, lineSpacing2 | Ba icon trực quan hiển thị rõ số 1.0, 1.5, 2.0 kèm thước dòng |
| Writer | Layout | writer.para.spacingBefore, spacingAfter | lineSpacing | Hai lệnh chỉnh khoảng cách trước/sau đoạn dùng chung icon giãn dòng | spacingBefore, spacingAfter | Icon đoạn văn bản kèm mũi tên chỉ hướng giãn lên trên hoặc xuống dưới |
| Writer | Layout | writer.section.continuous, evenPage, oddPage | sectionBreak | Ba loại ngắt phần dùng chung icon ngắt trang mặc định | sectionContinuous, sectionEvenPage, sectionOddPage | Ba icon thể hiện rõ đặc tính ngắt liên tục, ngắt trang chẵn và ngắt trang lẻ |
| Writer | View | writer.view.zoom100 | zoomReset | Dùng chung icon với nút hoàn tác thu phóng | zoom100 | Kính lúp hiển thị rõ chữ 100% sắc nét |
| Writer | Review | writer.trackChanges.acceptAll, rejectAll | redo, close | Dùng icon quay lại và đóng cửa sổ gây hiểu lầm chức năng | trackChangeAcceptAll, trackChangeRejectAll | Icon chấp nhận và từ chối toàn bộ vết sửa với dấu tick đôi xanh và chữ thập đôi đỏ |
| Sheet | Home | sheet.edit.pasteSpecial | paste | Dùng chung icon dán thông thường ngay cạnh nhau | pasteSpecial | Tấm kẹp tài liệu dán kèm tia sét vàng biểu trưng cho dán đặc biệt |
| Sheet | Home | sheet.cell.mergeCenter | mergeCells | Dùng chung icon gộp ô thông thường | mergeCenter | Hai ô nhập vào một kèm mũi tên định hướng căn giữa chuẩn Excel |
| Sheet | Data | sheet.data.textToColumns | table | Dùng icon bảng chung chung | textToColumns | Cột văn bản đơn phân tách thành hai cột dữ liệu với mũi tên chia tách |
| Sheet | Data | sheet.data.flashFill | autoSum | Dùng nhầm ký hiệu Sigma của tính tổng tự động | flashFill | Bảng tính với tia chớp vàng tự động điền thông minh |
| Sheet | Data | sheet.data.removeDuplicates | clearFormat | Dùng nhầm icon tẩy xóa định dạng | removeDuplicates | Các dòng dữ liệu trùng lặp bị gạch chéo đỏ loại trừ |
| Sheet | Data | sheet.data.sheetGroup, sheetUngroup | indentInc, indentDec | Dùng nhầm icon tăng giảm thụt lề văn bản | sheetGroup, sheetUngroup | Khung phân cấp dữ liệu kèm nút tròn dấu cộng và dấu trừ |
| Sheet | Data | sheet.data.subtotal | autoSum | Dùng trùng ký hiệu Sigma với lệnh Tính tổng | subtotal | Biểu tượng tính tổng phụ nhiều tầng có dòng tổng kết riêng |
| Sheet | PageLayout | sheet.page.scale | zoomReset | Dùng chung icon hoàn tác thu phóng | pageScale | Trang giấy kèm mũi tên co giãn hai chiều theo tỷ lệ phần trăm in |
| Sheet | Formulas | sheet.view.toggleFormulas | autoSum | Dùng chung ký hiệu Sigma với hàm tính tổng | showFormulas | Thẻ công thức chuẩn fx của Excel |
| Sheet | View | sheet.view.zoomReset | zoomReset | Biểu tượng chưa đồng bộ với Writer | zoom100 | Đồng bộ dùng kính lúp 100% |
| Slides | Home | slides.slide.duplicate | copy | Dùng chung icon sao chép bảng nhớ tạm với Copy | slideDuplicate | Hai trang chiếu xếp chồng tỷ lệ 16:9 với thanh tiêu đề màu cam đặc trưng |
| Slides | Home | slides.section.add | slideSection | Cả 3 lệnh quản lý phần đều dùng chung một icon thanh phân cách | slideSectionAdd | Thanh phân cách phần kèm huy hiệu tròn dấu cộng xanh lá |
| Slides | Home | slides.section.rename | slideSection | Dùng chung icon thanh phân cách | slideSectionRename | Thanh phân cách phần kèm huy hiệu tròn bút chì vàng |
| Slides | Home | slides.section.remove | slideSection | Dùng chung icon thanh phân cách | slideSectionRemove | Thanh phân cách phần kèm huy hiệu tròn dấu trừ đỏ |
| Slides | Home | slides.shape.group | shape | Nhóm hình và chèn hình đều dùng chung một icon hình khối | shapeGroup | Hộp bao quanh đối tượng có điểm mấu điều khiển ôm trọn hình khối |
| Slides | Home | slides.shape.ungroup | shape | Bỏ nhóm dùng chung icon hình khối | shapeUngroup | Hai hình khối tách rời kèm các mũi tên phân tán |
| Slides | Home | slides.para.lineSpacing | alignLeft | Gán nhầm icon căn lề trái do sơ suất định nghĩa | lineSpacing | Biểu tượng thước dòng kèm mũi tên giãn dòng hai chiều |

---

## 3. Các Trường hợp Giữ nguyên và Lý do

Trong quá trình rà soát, một số trường hợp có vẻ tương đồng đã được xem xét cẩn thận và quyết định giữ nguyên với các căn cứ xác đáng sau:

1. Trùng lặp xuyên tab (Cross-tab duplicates): Các lệnh cơ bản như Lưu (save), In (print), Cắt (cut), Sao chép (copy), Dán (paste) xuất hiện ở các vị trí khác nhau giữa các tab hoặc giữa các ứng dụng được chủ động giữ nguyên icon. Điều này phù hợp với nguyên lý thiết kế công thái học của Microsoft Office, giúp người dùng nhận diện ngay thao tác quen thuộc khi đổi ngữ cảnh.
2. Nút chọn phông chữ và cỡ chữ (Font Family, Font Size): Các phần tử này là các dropdown danh sách lựa chọn dạng select box, không có icon đi kèm theo thiết kế UI Kit chuẩn.
3. Hộp thoại Thiết lập Trang trong Sheet: Các nút lề trang, hướng trang, cỡ giấy, tiêu đề in trong Sheet Page Layout mở dialog tùy biến và được điều phối thông qua adapter. Định nghĩa lệnh được giữ nguyên vẹn để bảo đảm tuyệt đối bài kiểm thử nghiêm ngặt tests/unit/sheet-slides-i18n-shortcuts.test.js không bị ảnh hưởng.
4. Biểu tượng container nhóm và menu con: Nút dropdown cấp cha hiển thị icon đại diện nhóm chức năng trong khi các mục bên trong hiển thị icon hành động cụ thể. Ví dụ nút dropdown Phần (Section) mang icon tổng quát slideSection, còn bên trong menu con chứa các thao tác riêng biệt gồm slideSectionAdd, slideSectionRename, slideSectionRemove, slideSectionUp, slideSectionDown.

---

## 4. Kết quả Kiểm thử và Đảm bảo Chất lượng

Trước mỗi lần commit, toàn bộ quy trình kiểm thử bắt buộc đã được thực thi đầy đủ và đạt tỷ lệ thành công 100%:

1. Kiểm tra cú pháp JavaScript:
   - Lệnh thực hiện: node scripts/check-syntax.js
   - Kết quả: 88/88 tệp tin JavaScript hoàn toàn hợp lệ, không có bất kỳ lỗi cú pháp nào.

2. Bộ kiểm thử đơn vị tích hợp:
   - Lệnh thực hiện: node tests/run-tests.js
   - Kết quả: 1323/1323 ca kiểm thử PASS (100% thành công, 0 ca thất bại), bao gồm kiểm tra tính toàn vẹn chuỗi đa ngữ tiếng Việt và tiếng Anh, kiểm tra phím tắt, kiểm tra đăng ký lệnh và độ tương thích dữ liệu.

3. Kiểm thử giao diện tự động Playwright (Ribbon Audit 1280px):
   - Lệnh thực hiện: node tests/live/ribbon-audit-1280.playwright.mjs
   - Kết quả: Kiểm tra toàn bộ 104 lượt tab (26 tab x 2 giao diện sáng/tối x 2 ngôn ngữ VI/EN) ở độ phân giải 1280px. Toàn bộ 26 tab đều đạt mức 0px tràn ngang, các nút thu gọn và nút dropdown tương tác mượt mà không lỗi.

---

## 5. Lịch sử Commit trên Nhánh fix/ribbon-icon-dedup-audit

Nhánh đã ghi nhận chuỗi commit hoàn chỉnh, tách biệt rõ ràng theo từng giai đoạn:

1. Commit 236feed: fix(writer): eliminate ribbon icon duplicates and align icons on all tabs
2. Commit 2b488a1: fix(sheet): eliminate ribbon icon duplicates and align data tools icons
3. Commit 175f0ad: fix(slides): eliminate ribbon icon duplicates and align drawing/section icons

Toàn bộ công việc đã hoàn tất đúng theo yêu cầu, giao diện đồng bộ, sắc nét, chuẩn vector SVG và sẵn sàng phục vụ người dùng.
