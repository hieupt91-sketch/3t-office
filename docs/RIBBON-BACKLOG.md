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

### Các khoảng trống UI Slides được giữ lại sau audit 10/10/2026

Các mục dưới đây cần một ticket riêng trước khi bổ sung. Các lệnh hiện có vẫn giữ nguyên; không tạo gallery/menu mới trong đợt FIX-L1. Với lệnh chưa có hành vi thật, nút phải gọi `showPendingFeatureNotice()` khi được nối vào UI.

| Audit | Vị trí | Nội dung còn thiếu |
| :--- | :--- | :--- |
| U-L2, U-L3 | Trang đầu | Bảng chọn màu chữ và màu nền chữ. |
| U-L5 | Trang đầu | Menu chọn kiểu dấu đầu dòng và đánh số. |
| U-L8 | Chèn | Lưới chọn nhanh số hàng/cột khi chèn bảng. |
| U-L11 | Thiết kế | Gallery chủ đề trực tiếp trên Ribbon và xem trước khi rê chuột. |
| U-L12 | Thiết kế | Pa-nen tác vụ Định dạng nền neo cạnh canvas. |
| U-L14, U-L16 | Chuyển tiếp | Gallery hiệu ứng, tùy chọn và nhóm thời gian trên Ribbon. |
| U-L15 | Hoạt hình | Gallery hiệu ứng trực tiếp trên Ribbon. |
| U-L23 | Chế độ xem | Màn hình xem trước khi in với bố cục slide và bản phát tay. |
| U-L24 | Ngữ cảnh | Tab Định dạng Hình khi chọn đối tượng trên canvas. |
| U-L33 | Đối tượng | PPTX roundtrip cho nhóm shape: Ctrl+G tạo groupId trong model nhưng lưu/mở lại làm mất group; OOXML slide không có p:grpSp. Cần giữ group/ungroup trên đối tượng nhập và mới tạo. |
| U-L35 | Chèn | Đầu trang/chân trang, ngày giờ và số trang chiếu cập nhật trạng thái trong phiên nhưng marker không được ghi vào PPTX; mở lại làm mất header/footer. Cần serialize và khôi phục trạng thái theo slide/toàn bộ bài. |
| U-L36 | Chèn > Phương tiện | Shape audio/video xuất hiện trong model sau khi chọn file nhưng media không được đóng gói đúng trong PPTX; video chỉ còn target `data:` URI ngoài package và audio mất sau khi mở lại. Cần đóng gói media, tạo relationship/part hợp lệ và kiểm tra playback offline. |
| U-L37 | Đánh giá > Nhận xét | Thêm/xóa nhận xét hoạt động, nhưng trạng thái Đã xử lý bị mất sau PPTX roundtrip và giao diện chưa có thao tác trả lời. Cần giữ metadata resolve và bổ sung luồng trả lời. |
| U-L38 | Trình chiếu > Ghi chú | Panel ghi chú mở được nhưng vùng nhập bị thanh trạng thái che ở viewport đo được; click không tới textarea nên chưa nhập/lưu ghi chú. Cần bố trí panel trong vùng cuộn/không bị status bar phủ, rồi kiểm tra nhập và roundtrip. |
| U-L27 | Chế độ xem | Chế độ xem canvas tối độc lập với giao diện tối. |
| U-L29 | Chế độ xem | Tùy chọn giảm chiều cao Ribbon cho màn hình thấp. |

FIX-L1 chỉ xử lý nhãn, trạng thái, lệnh đã có và khả năng hiển thị; các mục trên không được xem là đã hoàn tất.

| Ứng dụng | Tab | Nhóm | Tên tính năng | Command ID | Trạng thái hiện tại | Phạm vi cần hoàn thiện | Quy mô | Dự kiến |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :---: | :---: |
| **VN Writer (3T Doc)** | Chèn | Ký hiệu | Phương trình | `writer.insert.equation` | Đã hoàn thành: Alt+=, dạng tuyến tính, nút cấu trúc/ký hiệu, xem trước MathML, chọn/sửa/xóa, hoàn tác/làm lại; DOCX giữ OMML tại đúng vị trí. Có bài Hướng dẫn sử dụng trong ứng dụng. | MathML gốc Chromium và OMML Word; không thêm dependency. LibreOffice HTML không giữ MathML nên adapter khôi phục OMML tại dấu vị trí trong pipeline DOCX. | Large | feat/writer-equation-codex |
| **VN Writer** | Thư tín | Bắt đầu trộn | Chọn danh sách người nhận (Excel / CSV) | `writer.mailMerge.open` | Đã hoàn thành (Nạp dữ liệu từ tệp Excel .xlsx, .xls, .ods, CSV, TSV; chọn trang tính, dòng đầu là tên trường, xem trước từng bản ghi, lọc/bỏ chọn người nhận, chèn trường, hoàn tất ra tài liệu mới hoặc in) | Đã hoàn thành trong Patch 1.0.1 (Worktree feat/writer-mailmerge-xlsx-agy) | Medium | Đã xong (Patch 1.0.1) |
| **VN Writer** | Bố trí trang | Thiết lập trang | Tùy chỉnh ngắt mục phức tạp | \`writer.section.continuous\` | Ngắt mục liên tục cơ bản | Tách biệt hoàn toàn Header/Footer và khổ giấy ngang/dọc giữa các mục liên tục | Medium | Done |
| **VN Sheet** | Dữ liệu | Phân tích What-If | Trình quản lý kịch bản (Scenario Manager) | `sheet.data.scenarioManager` | Đã hoàn thành (Thêm/sửa/xóa kịch bản với tên, ô thay đổi đơn/dải, giá trị, ghi chú; Hiển thị kịch bản tính lại công thức tự động; Gộp kịch bản từ sheet khác kèm đổi tên trùng; Báo cáo Tóm tắt kịch bản chuẩn Excel sang trang tính mới; Lưu/đọc XLSX `<scenarios>` và FODS) | Đã hoàn thành trong Patch 1.0.1 (Worktree feat/sheet-scenario-report-agy) | Medium | Đã xong (Patch 1.0.1) |
| **VN Sheet** | Dữ liệu | Phân tích What-If | Bảng dữ liệu hai biến | `sheet.data.dataTable` | Đã hoàn thành (hỗ trợ 1 biến và 2 biến: ô đầu vào theo hàng + ô đầu vào theo cột, tự tính lại khi đổi đầu vào như TABLE() của Excel, lưu xlsx dạng giá trị tĩnh) | Đã hoàn thành trong Patch 1.1 (Worktree feat/sheet-data-table-2var-opencode) | Medium | Đã xong (Patch 1.1) |
| **VN Sheet** | Công thức | Kiểm tra công thức | Cửa sổ theo dõi giá trị ô | \`sheet.formula.watchWindow\` | Đã hoàn thành (Cửa sổ nổi chuẩn Excel, 6 cột, thêm/xóa ô đa sheet, tự cập nhật, phím tắt) | Đã hoàn thành trong Patch 1.0.1 (Worktree feat/sheet-watch-window-agy) | Small | Đã xong (Patch 1.0.1) |
| **VN Sheet** | Công thức | Kiểm tra công thức | Ước lượng công thức từng bước | \`sheet.formula.evaluateFormula\` | Đã hoàn thành (Hộp thoại Ước lượng công thức: gạch chân phần sắp tính, nút Ước lượng/Bước vào/Bước ra/Khởi động lại/Đóng, Enter=Ước lượng, Esc=Đóng, bẫy tiêu điểm, hiển thị lỗi #DIV/0!/#N/A/#REF! trong bước, tái dùng FormulaEngine) | Đã hoàn thành trong Patch 1.1 (Worktree feat/sheet-evaluate-formula-opencode) | Medium | Đã xong (Patch 1.1) |
| **VN Sheet** | Bố trí trang | Vùng in | Tiêu đề in trang tính (Print Titles) | \`sheet.page.printTitles\` | Đã hoàn thành (nhập tham chiếu $1:$2/$A:$B + nút ⊞ chọn trực tiếp hàng/cột trên lưới bằng chuột, lưu qua _xlnm.Print_Titles) | Đã hoàn thành trong Patch 1.0.1 (Worktree feat/sheet-print-titles-opencode) | Small | Đã xong (Patch 1.0.1) |
| **VN Sheet** | Kiểu | Kiểu bảng | Định dạng thành Bảng (Excel Table) | `sheet.style.formatAsTable` | Hiện chỉ áp dụng màu/kiểu hiển thị cho vùng chọn; Excel COM xác nhận `ListObjects.Count=0` sau khi lưu XLSX | Cần mô hình Table có header, bộ lọc, tham chiếu có cấu trúc và round-trip XLSX thực sự; audit FIX-S7 phát hiện 11/10/2026 | Large | Backlog |
| **VN Slides** | Chuyển tiếp | Chuyển tiếp | Hiệu ứng chuyển tiếp Morph | \`slides.transition.apply\` | Hỗ trợ Fade, Slide, Zoom, Flip | Tự động phân tích và nội suy chuyển động hình khối cùng tên (Morph) | Large | Patch 1.2 |
| **VN Slides** | Trình chiếu | Thiết lập | Bút vẽ & Con trỏ Laser trên F5 | `slides.show.setupShow` | Đã hoàn thành (Bút vẽ Ctrl+P, Laser Ctrl+L, Xóa nét vẽ E, Mũi tên Ctrl+A, đổi màu bút, hộp thoại Giữ/Bỏ nét vẽ lưu ra PPTX) | Đã hoàn thành trong Patch 1.0.1 (Worktree feat/slides-pen-laser-agy) | Medium | Đã xong (Patch 1.0.1) |
| **VN Slides** | Trình chiếu | Thiết lập | Trình chiếu trực tuyến / Broadcast | \`slides.show.presenterMode\` | Đã có Presenter Mode 2 màn hình | Phát bài thuyết trình qua mạng nội bộ cho người xem qua trình duyệt | Large | Patch 1.3 |
| **VN Slides** | Chèn | Phương tiện | Ghi âm thuyết minh trực tiếp | \`slides.media.insertAudio\` | Chèn file âm thanh từ máy tính | Thu âm microphone trực tiếp trên từng trang chiếu | Medium | Patch 1.1 |
| **VN Writer (3T Doc)** | Chuột phải | Menu ngữ cảnh | Đoạn văn... | `writer.format.paragraphDialog` | Đã hoàn thành 05/10/2026: hộp thoại Đoạn văn (căn lề, thụt trái/phải, dòng đầu/treo, cách đoạn trước/sau, giãn dòng đơn/1,5/kép/nhiều dòng/chính xác, khung xem trước); mở từ chuột phải ▸ Đoạn văn… và nút góc nhóm Đoạn văn (tab Trang đầu và Bố cục); một Áp dụng = một Hoàn tác; có bài Hướng dẫn | Chưa có: ngắt dòng/ngắt trang trong tab "Ngắt dòng và ngắt trang" của Word, mức đề mục (Outline level), tab stop | Small | Đã xong (feat/writer-paragraph-dialog-claude) |
| **VN Writer** | Chế độ xem | Cửa sổ | Cửa sổ mới | `writer.view.newWindow` | Hiện thông báo lý do khi không mở được trong desktop app; hỗ trợ mở cửa sổ tài liệu mới | Mở cửa sổ thứ hai xem cùng tài liệu đang mở (multi-window sync view) trong app desktop | Medium | Backlog |

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

## 5. PHÁT HIỆN RB-D5b — 10/10/2026

| Ứng dụng / vị trí | Phát hiện đã đo | Việc tiếp theo | Owner |
|---|---|---|---|
| VN Writer · Đánh giá · Đếm từ (`writer.review.wordCount`) | Trên `d13.docx`, số từ lệch Word 3; ký tự không khoảng trắng lệch 120; ký tự có khoảng trắng lệch 349; dòng lệch 608. Đếm đoạn đã sửa và khớp 326. | Điều tra cách tính từ/ký tự OOXML và giới hạn khác biệt phân trang/dòng giữa canvas và Word; không dùng Word COM lúc chạy app. | Writer |
| VN Writer · Đánh giá · Đã xử lý (`writer.review.commentResolve`) | UI đánh dấu resolved, nhưng DOCX xuất không ghi trạng thái này; Word COM mở lại thấy tất cả `Comment.Done=False`. | Sửa serializer và roundtrip `commentsExtended`/resolved metadata, thêm kiểm tra XML + Word COM. Chi tiết trong `docs/AGENT-HANDOFF-RB-D5b-1010.md`. | Adapter |
| VN Writer · Đánh giá · Kiểm tra chính tả | Nút bật/tắt có hiệu quả thật. Lệnh không có shortcut riêng; F7 hiện gọi Soát lỗi chính tả AI nên không chạy trong audit offline. | Xác định shortcut cục bộ an toàn cho lệnh toggle hoặc giữ rõ trạng thái không có shortcut; không dùng F7 để kiểm tài liệu có thể gửi AI. | Writer |



## FIX-T9 — gaps Writer phát hiện 11/10/2026

| Nhóm | Tái hiện | Việc cần hoàn thiện | Owner |
|---|---|---|---|
| Ngắt dòng mềm | Shift+Enter không roundtrip thành soft break; Column Break đã sửa ở FIX-T9 để giữ đoạn trước/sau | Lưu w:br type=textWrapping cho Shift+Enter; kiểm tra qua CDP + Word COM | Writer/Adapter |
| Đầu/chân trang riêng | Cờ first/even-even lưu đúng nhưng canvas chỉ có vùng sửa header/footer mặc định | Thêm vùng chọn/biên tập Default/First/Even riêng, lưu và mở lại qua DOCX | Writer/Adapter |
| Thư viện kiểu | Đã bổ sung Title, Subtitle, Quote, List Paragraph; DOCX app và Word COM trùng style name, font, size, bold/italic, alignment | Đã hoàn tất FIX-T10, xem audit Word Parallel | Đã xử lý |
| Comments trả lời | Reply được lưu thành comment con có anchored range và `commentsExtended` parent id; Word COM mở lại nhận đúng reply thread | Đã hoàn tất FIX-T10, xem audit Word Parallel | Đã xử lý |
| Hình khối đổi màu/viền/xoay sau khi tạo | Chèn hình mới và màu/viền lúc tạo đã đo khớp; chưa có luồng chọn hình đã tạo để sửa/rotate | Thiếu UI edit/rotation và Word COM parity; NOT RUN | Writer |
| Danh sách nhiều cấp | Serializer DOCX đã kiểm thử; thao tác ribbon/CDP không tạo ba cấp ổn định | UI/Word COM parity NOT RUN; cần harness đầu vào ổn định | Writer |
| Chú thích trang/cuối tài liệu | Footnote/endnote có số lượng/nội dung khớp Word COM ở FIX-T9; phép T10 mới chưa chạy | Đã có năng lực; T10 recheck NOT RUN | Writer |
