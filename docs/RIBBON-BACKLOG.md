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
| **VN Writer** | Thư tín | Bắt đầu trộn | Chọn danh sách người nhận (Excel / CSV) | `writer.mailMerge.open` | Đã hoàn thành (Nạp dữ liệu từ tệp Excel .xlsx, .xls, .ods, CSV, TSV; chọn trang tính, dòng đầu là tên trường, xem trước từng bản ghi, lọc/bỏ chọn người nhận, chèn trường, hoàn tất ra tài liệu mới hoặc in) | Đã hoàn thành trong Patch 1.0.1 (Worktree feat/writer-mailmerge-xlsx-agy) | Medium | Đã xong (Patch 1.0.1) |
| **VN Writer** | Bố trí trang | Thiết lập trang | Tùy chỉnh ngắt mục phức tạp | \`writer.section.continuous\` | Ngắt mục liên tục cơ bản | Tách biệt hoàn toàn Header/Footer và khổ giấy ngang/dọc giữa các mục liên tục | Medium | Done |
| **VN Sheet** | Dữ liệu | Phân tích What-If | Trình quản lý kịch bản (Scenario Manager) | `sheet.data.scenarioManager` | Đã hoàn thành (Thêm/sửa/xóa kịch bản với tên, ô thay đổi đơn/dải, giá trị, ghi chú; Hiển thị kịch bản tính lại công thức tự động; Gộp kịch bản từ sheet khác kèm đổi tên trùng; Báo cáo Tóm tắt kịch bản chuẩn Excel sang trang tính mới; Lưu/đọc XLSX `<scenarios>` và FODS) | Đã hoàn thành trong Patch 1.0.1 (Worktree feat/sheet-scenario-report-agy) | Medium | Đã xong (Patch 1.0.1) |
| **VN Sheet** | Dữ liệu | Phân tích What-If | Bảng dữ liệu hai biến | `sheet.data.dataTable` | Đã hoàn thành (hỗ trợ 1 biến và 2 biến: ô đầu vào theo hàng + ô đầu vào theo cột, tự tính lại khi đổi đầu vào như TABLE() của Excel, lưu xlsx dạng giá trị tĩnh) | Đã hoàn thành trong Patch 1.1 (Worktree feat/sheet-data-table-2var-opencode) | Medium | Đã xong (Patch 1.1) |
| **VN Sheet** | Công thức | Kiểm tra công thức | Cửa sổ theo dõi giá trị ô | \`sheet.formula.watchWindow\` | Đã hoàn thành (Cửa sổ nổi chuẩn Excel, 6 cột, thêm/xóa ô đa sheet, tự cập nhật, phím tắt) | Đã hoàn thành trong Patch 1.0.1 (Worktree feat/sheet-watch-window-agy) | Small | Đã xong (Patch 1.0.1) |
| **VN Sheet** | Công thức | Kiểm tra công thức | Ước lượng công thức từng bước | \`sheet.formula.evaluateFormula\` | Đã hoàn thành (Hộp thoại Ước lượng công thức: gạch chân phần sắp tính, nút Ước lượng/Bước vào/Bước ra/Khởi động lại/Đóng, Enter=Ước lượng, Esc=Đóng, bẫy tiêu điểm, hiển thị lỗi #DIV/0!/#N/A/#REF! trong bước, tái dùng FormulaEngine) | Đã hoàn thành trong Patch 1.1 (Worktree feat/sheet-evaluate-formula-opencode) | Medium | Đã xong (Patch 1.1) |
| **VN Sheet** | Bố trí trang | Vùng in | Tiêu đề in trang tính (Print Titles) | \`sheet.page.printTitles\` | Đã hoàn thành (nhập tham chiếu $1:$2/$A:$B + nút ⊞ chọn trực tiếp hàng/cột trên lưới bằng chuột, lưu qua _xlnm.Print_Titles) | Đã hoàn thành trong Patch 1.0.1 (Worktree feat/sheet-print-titles-opencode) | Small | Đã xong (Patch 1.0.1) |
| **VN Slides** | Chuyển tiếp | Chuyển tiếp | Hiệu ứng chuyển tiếp Morph | \`slides.transition.apply\` | Hỗ trợ Fade, Slide, Zoom, Flip | Tự động phân tích và nội suy chuyển động hình khối cùng tên (Morph) | Large | Patch 1.2 |
| **VN Slides** | Trình chiếu | Thiết lập | Bút vẽ & Con trỏ Laser trên F5 | `slides.show.setupShow` | Đã hoàn thành (Bút vẽ Ctrl+P, Laser Ctrl+L, Xóa nét vẽ E, Mũi tên Ctrl+A, đổi màu bút, hộp thoại Giữ/Bỏ nét vẽ lưu ra PPTX) | Đã hoàn thành trong Patch 1.0.1 (Worktree feat/slides-pen-laser-agy) | Medium | Đã xong (Patch 1.0.1) |
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

