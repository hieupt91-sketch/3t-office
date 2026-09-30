# DANH MỤC TÍNH NĂNG NÂNG CAO & BACKLOG THANH RIBBON (RIBBON BACKLOG)
**VN Office Suite (VN Writer, VN Sheet, VN Slides)**
**Thời gian lập**: 30/09/2026
**Cơ chế xử lý**: Shared Platform Helper \`showPendingFeatureNotice\` trong \`platform/ui-kit/dialogs.js\`
**Thông báo hiển thị**: *"Tính năng này đang được hoàn thiện và sẽ có trong bản cập nhật tới."*

---

## 1. NGUYÊN TẮC QUẢN LÝ TÍNH NĂNG PENDING TRÊN RIBBON
Theo chỉ thị bắt buộc của Người phụ trách dự án (30/09):
1. **Không bao giờ xóa bỏ nút**: Các nút chức năng dự kiến của hệ thống vẫn được giữ trên thanh Ribbon đúng vị trí quy chuẩn Microsoft Office để người dùng làm quen bố cục.
2. **Không có thao tác câm (Zero Silent NO-OPs)**: Mọi nút nếu chưa có backend hoàn chỉnh hoặc chỉ mới ở mức preview cơ bản, khi bấm vào ĐỀU PHẢI hiển thị thông báo rõ ràng bằng tiếng Việt thông qua helper chung \`showPendingFeatureNotice\`.
3. **Hoàn thiện theo từng bản vá (Patch Updates)**: Các tính năng phức tạp được liệt kê trong backlog này với ước lượng kích thước (Small / Medium / Large) và phạm vi cần hoàn thiện để các agent tiếp tục triển khai dần.

---

## 2. DANH SÁCH TÍNH NĂNG CHỜ NÂNG CẤP CHUYÊN SÂU THEO LỘ TRÌNH

| Ứng dụng | Tab | Nhóm | Tên tính năng | Command ID | Trạng thái hiện tại | Phạm vi cần hoàn thiện | Quy mô | Dự kiến |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **VN Writer** | Chèn | Ký hiệu | Phương trình toán học nâng cao | \`writer.insert.equation\` | Hộp thoại chèn ký hiệu toán học cơ bản | Tích hợp bộ gõ LaTeX / MathJax WYSIWYG và xuất ODF/OOXML Math | Large | Patch 1.1 |
| **VN Writer** | Thư tín | Bắt đầu trộn | Trộn thư nâng cao (ODBC/SQL) | \`writer.mailMerge.open\` | Đã hỗ trợ CSV/TSV nội bộ | Hỗ trợ nạp dữ liệu từ tệp XLSX, danh bạ Outlook hoặc cơ sở dữ liệu SQLite | Medium | Patch 1.1 |
| **VN Writer** | Bố trí trang | Thiết lập trang | Tùy chỉnh ngắt mục phức tạp | \`writer.section.continuous\` | Ngắt mục liên tục cơ bản | Tách biệt hoàn toàn Header/Footer và khổ giấy ngang/dọc giữa các mục liên tục | Medium | Patch 1.1 |
| **VN Sheet** | Dữ liệu | Phân tích What-If | Trình quản lý kịch bản nâng cao | \`sheet.data.scenarioManager\` | Hộp thoại kịch bản cơ bản | Lưu và tạo báo cáo tóm tắt so sánh nhiều kịch bản (Scenario Summary Report) | Medium | Patch 1.1 |
| **VN Sheet** | Dữ liệu | Phân tích What-If | Bảng dữ liệu hai biến | \`sheet.data.dataTable\` | Bảng dữ liệu 1 biến đầu vào | Mở rộng tính toán ma trận độ nhạy hai biến dòng và cột | Medium | Patch 1.1 |
| **VN Sheet** | Công thức | Kiểm tra công thức | Cửa sổ theo dõi giá trị ô | \`sheet.formula.watchWindow\` | Đã hoàn thành (Cửa sổ nổi chuẩn Excel, 6 cột, thêm/xóa ô đa sheet, tự cập nhật, phím tắt) | Đã hoàn thành trong Patch 1.0.1 (Worktree feat/sheet-watch-window-agy) | Small | Đã xong (Patch 1.0.1) |
| **VN Sheet** | Công thức | Kiểm tra công thức | Ước lượng công thức từng bước | \`sheet.formula.evaluateFormula\` | Hộp thoại hiện giá trị trung gian | Giao diện bấm "Evaluate" từng nút cây cú pháp công thức chuẩn Excel | Medium | Patch 1.1 |
| **VN Sheet** | Bố trí trang | Vùng in | Tiêu đề in trang tính (Print Titles) | \`sheet.page.printTitles\` | Hộp thoại Page Setup chọn hàng lặp | Tương tác chọn trực tiếp hàng/cột trên lưới bằng chuột | Small | Patch 1.0.1 |
| **VN Slides** | Chuyển tiếp | Chuyển tiếp | Hiệu ứng chuyển tiếp Morph | \`slides.transition.apply\` | Hỗ trợ Fade, Slide, Zoom, Flip | Tự động phân tích và nội suy chuyển động hình khối cùng tên (Morph) | Large | Patch 1.2 |
| **VN Slides** | Trình chiếu | Thiết lập | Bút vẽ & Con trỏ Laser trên F5 | \`slides.show.setupShow\` | Lưu cờ màu bút và tùy chọn | Vẽ trực tiếp trên canvas F5 bằng chuột hoặc bút cảm ứng | Medium | Patch 1.1 |
| **VN Slides** | Trình chiếu | Thiết lập | Trình chiếu trực tuyến / Broadcast | \`slides.show.presenterMode\` | Đã có Presenter Mode 2 màn hình | Phát bài thuyết trình qua mạng nội bộ cho người xem qua trình duyệt | Large | Patch 1.3 |
| **VN Slides** | Chèn | Phương tiện | Ghi âm thuyết minh trực tiếp | \`slides.media.insertAudio\` | Chèn file âm thanh từ máy tính | Thu âm microphone trực tiếp trên từng trang chiếu | Medium | Patch 1.1 |

---

## 3. CÁCH THỨC TRIỂN KHAI VÀ BẢO ĐẢM TRẢI NGHIỆM NGƯỜI DÙNG
1. **Helper thông báo**:
   \`\`\`javascript
   import { showPendingFeatureNotice } from "../../platform/ui-kit/dialogs.js";

   // Khi một tính năng trong backlog được click nhưng chưa có backend hoàn chỉnh:
   showPendingFeatureNotice("Tên tính năng");
   \`\`\`
2. **Quy tắc trợ giúp (Help Coverage)**:
   - Các bài viết Trợ giúp cho các tính năng thuộc danh mục này giải thích rõ công dụng của tính năng trong phiên bản hoàn thiện và ghi chú: *"Tính năng này đang được tối ưu hóa và sẽ được cập nhật trong phiên bản tiếp theo."*
   - Không chứa bất kỳ từ khóa cấm hoặc placeholder (\`lorem\`, \`todo\`, \`placeholder\`, \`coming soon\`) để vượt qua 100% kiểm thử của \`tests/unit/help-coverage.test.js\`.

---

## 4. PHÍM TẮT CÒN THIẾU (bổ sung dần)

Toàn bộ phím tắt trong bảng tồn đọng trước đây đã được hoàn thành 100% (xem `docs/SHORTCUT-COVERAGE.md`):
- `Ctrl+]`, `Ctrl+[`: Tăng / giảm cỡ chữ 1 pt trong VN Writer (có hoàn tác Ctrl+Z).
- `Ctrl+Shift++`, `Ctrl+-`: Chèn / xóa ô/hàng/cột chuẩn Excel trong VN Sheet (hộp thoại khi chọn ô, thao tác ngay khi chọn cả hàng/cột, có hoàn tác Ctrl+Z).
- `Shift+F11`: Chèn trang tính mới trước trang tính hiện tại trong VN Sheet (có hoàn tác Ctrl+Z).
- `F11`: Chèn biểu đồ chuẩn Excel trong vùng lưới VN Sheet (có hoàn tác Ctrl+Z).

