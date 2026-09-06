# Báo Cáo Bàn Giao: Mở Rộng Danh Sách Phông Chữ (Font Family Expansion) Cho VN Office

## 1. Bối cảnh và Mục tiêu

Trước đây, danh sách Phông chữ (Font Family) trên thanh Ribbon của cả ba ứng dụng trong VN Office (VN Writer, VN Sheet, VN Slides) chỉ có đúng 5 lựa chọn: Times New Roman, Be Vietnam Pro, Arial, Calibri và Roboto. Số lượng này quá ít so với trải nghiệm soạn thảo thực tế của bộ công cụ văn phòng như Microsoft Word, Excel và PowerPoint (thường cung cấp từ 20 đến 30+ font phổ biến).

Mục tiêu của đợt nâng cấp này là mở rộng danh sách phông chữ lên 24 phông phổ biến, đáp ứng đầy đủ các nhóm phong cách văn bản khác nhau, đảm bảo độ đồng bộ tuyệt đối giữa 3 ứng dụng và 2 ngôn ngữ tiếng Việt / tiếng Anh, đồng thời giữ vững 100% độ tương thích giao diện và quy chuẩn an toàn bản quyền.

## 2. Danh sách 24 Phông Chữ Được Bổ Sung

Danh sách phông chữ mới bao gồm 24 phông được chuẩn hóa đồng bộ trên cả 3 ứng dụng:

### Nhóm Chữ Có Chân (Serif)
1. Times New Roman: Phông chữ tiêu chuẩn cho văn bản hành chính Việt Nam theo Nghị định 30/2020/NĐ-CP và báo cáo khoa học.
2. Georgia: Phông chữ có chân thanh lịch, hiển thị rất rõ ràng trên màn hình độ phân giải thấp và tài liệu trang nhã.
3. Cambria: Phông chữ chuẩn trong bộ ClearType của Microsoft Office, rất thông dụng trong văn bản học thuật và công thức toán học.
4. Garamond: Phông chữ cổ điển tinh tế, thường dùng trong in ấn sách, tiểu thuyết và ấn phẩm xuất bản.
5. Book Antiqua: Biến thể dựa trên phông Palatino, mang phong cách cổ điển truyền thống.
6. Palatino Linotype: Phông serif thanh thoát, dễ đọc ở cả tiêu đề lớn và đoạn văn dài.
7. Constantia: Phông serif hiện đại với tỷ lệ nét cân đối, được thiết kế tối ưu cho đọc trên màn hình điện tử.

### Nhóm Chữ Không Chân (Sans-serif)
8. Arial: Phông chữ không chân phổ biến nhất thế giới, tương thích với hầu hết mọi hệ điều hành.
9. Calibri: Phông chữ mặc định của Microsoft Office nhiều năm qua, đường nét bo tròn thân thiện và hiện đại.
10. Be Vietnam Pro: Phông chữ không chân hiện đại được thiết kế riêng với các dấu thanh tiếng Việt cân đối, thẩm mỹ cao.
11. Roboto: Phông chữ sans-serif tiêu chuẩn trên hệ sinh thái web và di động hiện đại.
12. Segoe UI: Phông chữ giao diện tiêu chuẩn của hệ điều hành Windows, hiện đại và trung tính.
13. Tahoma: Phông chữ kinh điển với khoảng cách ký tự hẹp, hiển thị sắc nét trong bảng tính và ô dữ liệu.
14. Verdana: Phông chữ không chân có khoảng cách thoáng và chiều cao ký tự lớn, cực kỳ dễ đọc.
15. Trebuchet MS: Phông chữ không chân năng động, phù hợp cho tiêu đề và các bản trình chiếu hiện đại.
16. Century Gothic: Phông chữ hình học (geometric sans-serif) với nét chữ tròn trịa, sang trọng, thường dùng trong thiết kế slide và biểu đồ.
17. Franklin Gothic Medium: Phông chữ đậm nét công nghiệp, thích hợp cho tiêu đề bài báo, bảng dữ liệu nổi bật.
18. Candara: Phông chữ mềm mại với những đường cong tự nhiên, tạo cảm giác nhẹ nhàng trong bản trình bày.
19. Corbel: Phông chữ cân đối, tối ưu cho đọc lướt văn bản nhanh và giao diện bảng tính.

### Nhóm Phông Đơn Khoảng (Monospace)
20. Courier New: Phông chữ đơn khoảng kinh điển gợi nhớ máy đánh chữ, chuyên dùng cho hiển thị mã nguồn, số liệu và hóa đơn kế toán.
21. Consolas: Phông đơn khoảng hiện đại trong bộ ClearType, cực kỳ rõ ràng khi trình bày khối mã lập trình hoặc bảng số liệu đối chiếu.
22. Lucida Console: Phông chữ đơn khoảng chắc chắn, từng là tiêu chuẩn dòng lệnh và bảng biểu kỹ thuật.

### Nhóm Phông Nghệ Thuật / Tiêu Đề (Fantasy / Display)
23. Impact: Phông chữ dày đậm, lực nhấn cực mạnh, chuyên dùng cho tiêu đề lớn, khẩu hiệu hoặc trang bìa thuyết trình.
24. Comic Sans MS: Phông chữ dạng viết tay thoải mái, dùng cho tài liệu thiếu nhi, minh họa hoặc ghi chú không chính thức.

## 3. Xác Nhận An Toàn Bản Quyền và Cơ Chế Kỹ Thuật

### Giải pháp không nhúng file font
VN Office hoàn toàn không đưa bất kỳ tệp font nào (như định dạng ttf, otf, woff, woff2) vào mã nguồn dự án. Ứng dụng cũng tuyệt đối không gọi tới bất kỳ dịch vụ máy chủ ngoài hay mạng phân phối nội dung (CDN) nào như Google Fonts hay Adobe Fonts.

Thay vào đó, giải pháp hoàn toàn dựa trên phông chữ hệ thống (system fonts) đã được cài đặt sẵn trên Windows và macOS. Trình duyệt sẽ tự động gọi phông chữ từ hệ điều hành nếu máy người dùng đã cài đặt. Khi người dùng soạn thảo và chọn một phông chữ, tên phông chữ sẽ được gán trực tiếp vào thuộc tính font-family của phần tử văn bản tương ứng. Vì không phân phối lại bất kỳ tệp phông chữ bản quyền nào, giải pháp này an toàn tuyệt đối về mặt pháp lý và sở hữu trí tuệ, tương tự cơ chế hoạt động của các bộ ứng dụng văn phòng thương mại.

### Cơ chế dự phòng an toàn (Generic Fallback)
Ở cấp độ khung trang và nền tảng:
- Văn bản tài liệu Writer kế thừa dự phòng nhóm serif qua cấu hình font tài liệu chuẩn.
- Lưới ô tính Sheet kế thừa dự phòng nhóm sans-serif qua giao diện chuẩn của bảng tính.
- Trang trình chiếu Slides kế thừa dự phòng sans-serif hoặc serif tùy theo chủ đề trang chiếu được chọn.

## 4. Xử Lý Giao Diện và Chống Tràn Ribbon (Ribbon Audit 1280px)

Khi mở rộng danh sách font từ 5 lên 24 font, một số tên phông chữ có độ dài ký tự đáng kể như Franklin Gothic Medium hay Palatino Linotype. Trong phần tử HTML select mặc định, trình duyệt có xu hướng tự động mở rộng chiều rộng của thẻ select theo chiều dài của option dài nhất.

Tại độ phân giải 1280px (chuẩn màn hình laptop phổ biến tại Việt Nam), tab Trang đầu của Writer và Slides trước đây có tổng chiều rộng các nhóm là 1265px (chỉ còn cách biên 1280px đúng 15px). Nếu thẻ select bị nới rộng tự nhiên thêm 26px (từ 125px lên 151px), thanh Ribbon sẽ bị tràn ngang và gây lỗi kiểm thử giao diện.

Để khắc phục triệt để vấn đề này, một quy tắc CSS đã được bổ sung trong tệp ribbon.css:
Thiết lập giới hạn chiều rộng tối đa 125px đối với phần tử select có định danh font.family trên thanh Ribbon. Nhờ đó:
- Chiều rộng của dropdown trên thanh Ribbon được cố định chính xác 125px, tương đương với kích thước trước khi mở rộng.
- Tổng chiều rộng các nhóm trên thanh Ribbon tại 1280px luôn nằm trong ngưỡng an toàn (1257px), hoàn toàn không xảy ra tràn ngang (0px overflow).
- Khi người dùng click chuột mở dropdown, menu popup tự nhiên của trình duyệt vẫn bung đủ chiều rộng để hiển thị trọn vẹn toàn bộ 24 tên phông chữ mà không bị che khuất.

## 5. Lý Do Bỏ Qua Xem Trước Kiểu Font Trực Tiếp Trong Dropdown

Theo yêu cầu số 2 trong đề bài: nếu kiến trúc dropdown hiện tại không hỗ trợ áp dụng kiểu font riêng cho từng option mà không phải can thiệp nhiều vào mã nguồn dùng chung, nhóm phát triển nên bỏ qua phần này để đảm bảo tính ổn định.

Lý do cụ thể như sau:
1. Thẻ select của thanh Ribbon được tạo ra bởi hàm createSelect trong components.js, vốn là component dùng chung cho toàn bộ các dropdown khác (chọn cỡ chữ, chọn kiểu bảng, chọn khoảng cách dòng, v.v.). Việc can thiệp sâu vào hàm dùng chung này tiềm ẩn nguy cơ phá vỡ cấu trúc và hành vi của các dropdown khác.
2. Trên các trình duyệt hiện đại chạy trên nền tảng Windows (đặc biệt là Microsoft Edge và Google Chrome), menu xổ xuống của thẻ select được hệ điều hành vẽ trực tiếp ở tầng giao diện cửa sổ hệ thống. Các trình duyệt này thường bỏ qua thuộc tính font-family gán riêng cho từng thẻ option vì lý do bảo mật và hiệu năng hiển thị của hệ thống.
3. Để vẽ được từng phông chữ khác nhau cho từng dòng lựa chọn, ứng dụng sẽ buộc phải thay thế toàn bộ thẻ select bằng một widget custom dropdown phức tạp bằng HTML/CSS/JS. Việc này đi ngược lại nguyên tắc an toàn, có thể phá vỡ tính năng phím tắt điều hướng bàn phím chuẩn và kiểm thử tự động.

Do đó, việc giữ nguyên cấu trúc select gốc và tập trung chuẩn hóa danh sách tên font là lựa chọn kỹ thuật tối ưu và đúng định hướng đã đề ra.

## 6. Tính Đồng Bộ Giữa 3 Ứng Dụng và Đa Ngôn Ngữ

1. Tính nhất quán đa ngôn ngữ: Tên của 24 phông chữ được giữ nguyên bằng tiếng Anh trên cả hai phiên bản giao diện tiếng Việt và tiếng Anh, hoàn toàn tương đồng với cách Microsoft Word, Excel và PowerPoint xử lý.
2. Tính đồng bộ liên ứng dụng: Danh sách 24 phông chữ và thứ tự sắp xếp được chuẩn hóa giống hệt nhau trên cả ba tệp cấu hình writer-ribbon.js, sheet-ribbon.js và slides-ribbon.js. Người dùng chuyển đổi giữa soạn thảo văn bản, bảng tính và trình chiếu sẽ luôn nhìn thấy danh sách phông chữ quen thuộc.
3. Giá trị mặc định đặc thù từng ứng dụng:
   - VN Writer mặc định là Times New Roman, đáp ứng đúng quy định văn bản hành chính Việt Nam.
   - VN Sheet mặc định là Calibri, đáp ứng chuẩn hiển thị bảng tính truyền thống.
   - VN Slides mặc định là Calibri, tạo nét hiện đại cho các slide trình chiếu.
4. Xử lý mở rộng danh sách hợp lệ trong VN Sheet: Trong sheet-grid.js, phương thức setFontFamily có danh sách kiểm tra các phông hợp lệ trước khi áp dụng vào thuộc tính ô tính. Danh sách này đã được cập nhật đồng bộ đủ 24 phông mới, cho phép người dùng click chọn bất kỳ phông nào trong dropdown để đổi phông chữ của ô tính ngay lập tức.

## 7. Kết Quả Kiểm Thử và Nghiệm Thu

Tất cả các bài kiểm thử bắt buộc đều đã vượt qua với kết quả hoàn hảo:

1. Kiểm tra cú pháp toàn dự án:
   Lệnh thực thi: node scripts/check-syntax.js
   Kết quả: 88/88 tệp JavaScript hợp lệ, 0 lỗi cú pháp.

2. Kiểm tra chống tràn thanh Ribbon tại 1280px (Ribbon Audit):
   Lệnh thực thi: node tests/live/ribbon-audit-1280.playwright.mjs
   Kết quả: 104/104 lượt kiểm tra (26 tab x 2 độ phân giải 1280x800 và 1280x720 x 2 ngôn ngữ VI và EN) đều đạt 100% PASS với độ tràn ngang chính xác 0px. Toàn bộ các tương tác click chuột kiểm tra trên các tab thu gọn đều hoạt động chính xác.

3. Bộ kiểm thử chức năng và hồi quy toàn hệ thống:
   Lệnh thực thi: node tests/run-tests.js
   Kết quả: 1352/1352 bài kiểm tra đạt chuẩn (100% PASS, 0 FAIL).

4. Kiểm thử tương tác trực tiếp trên trình duyệt thật (Playwright Live):
   - Đã kiểm tra mở ứng dụng Writer thật, nhập văn bản, bôi đen và chuyển đổi giữa các font mới (Georgia, Courier New, Times New Roman), kiểm tra DOM nhận diện đúng định dạng và không phát sinh bất kỳ lỗi console nào.
   - Đã kiểm tra mở ứng dụng Sheet thật, chọn ô dữ liệu, đổi font qua lại trong dropdown, xác nhận ô tính được cập nhật thuộc tính fontFamily trực tiếp và kiểm thử ribbon-gaps-real-office.playwright.mjs đạt 100% PASS.
   - Đã kiểm tra mở ứng dụng Slides thật, chọn hộp tiêu đề slide, chuyển đổi font chữ trên thanh Ribbon, xác nhận kiểm thử slides-font-paragraph.playwright.mjs đạt 100% PASS.

## 8. Lịch Sử Commit

Các thay đổi đã được chia nhỏ và commit riêng biệt theo từng ứng dụng trên nhánh feat/font-family-expansion (worktree E:\VNOffice-agy-font-family-expansion):
1. Commit cho Writer: feat(writer): expand font family dropdown to 24 common system fonts
2. Commit cho Sheet: feat(sheet): expand font family dropdown to 24 common system fonts
3. Commit cho Slides: feat(slides): expand font family dropdown to 24 common system fonts
4. Commit tài liệu bàn giao: docs: add font family expansion handoff report
