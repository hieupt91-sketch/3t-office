# Báo cáo Bàn giao: Rà soát & Đồng bộ Hộp thoại Căn chỉnh (Alignment Parity Audit)

## 1. Tổng quan & Ranh giới Kỹ thuật

Tài liệu này ghi nhận kết quả rà soát toàn diện hiện trạng các hộp thoại và nhóm điều khiển căn chỉnh (Alignment) trên ba ứng dụng VN Sheet, VN Writer và VN Slides so với các ứng dụng Microsoft Office tương ứng (Excel, Word, PowerPoint).

Toàn bộ công việc được thực hiện trên worktree độc lập tại E:\VNOffice-agy-alignment-parity thuộc nhánh fix/alignment-dialogs-parity, được tạo từ nhánh main. Nhánh này tuyệt đối KHÔNG merge vào main theo đúng quy định phân tách vai trò dự án.

Ranh giới kỹ thuật được tuân thủ nghiêm ngặt:
- Phạm vi giới hạn trong giao diện người dùng (UI), hộp thoại (dialog), thanh ribbon, menu ngữ cảnh và trợ giúp người dùng.
- Tuyệt đối KHÔNG can thiệp làm thay đổi hoặc gây xáo trộn logic tính toán công thức hay bộ serializer tệp tin thật (FODT, FODS, FODP, XLSX, DOCX, PPTX).
- Tuyệt đối KHÔNG tự ý bịa đặt backend giả lập (fake backend) hoặc tạo các tính năng không có logic thực tế nâng đỡ. Các tính năng chưa có backend được đánh dấu rõ ràng là GAP (khoảng trống chức năng) hoặc cố tình vô hiệu hóa để bảo đảm tính an toàn.

---

## 2. Bảng Đối chiếu Tổng thể với Microsoft Office Thật

Dưới đây là bảng so sánh chi tiết tính năng căn chỉnh giữa Microsoft Office và VN Office trên cả ba ứng dụng:

| Ứng dụng | Microsoft Office Thật | VN Office Hiện tại | Hiện trạng & Đánh giá Parity |
| :--- | :--- | :--- | :--- |
| **Sheet** | Hộp thoại Format Cells > Thẻ Alignment:<br>- Chiều ngang (Horizontal): General, Left (Indent), Center, Right (Indent), Fill, Justify, Center Across Selection, Distributed.<br>- Chiều dọc (Vertical): Top, Center, Bottom, Justify, Distributed.<br>- Thụt lề (Indent): 0–4+ nấc.<br>- Điều khiển chữ: Wrap text, Shrink to fit, Merge cells.<br>- Hướng chữ: Right-to-left Context, LTR, RTL.<br>- Hướng xoay: -90° đến +90°, chữ xếp chồng (stacked text). | Hộp thoại Định dạng ô > Thẻ Căn chỉnh:<br>- Chiều ngang: Hỗ trợ đầy đủ General, Left, Center, Right, Justify. Đánh dấu GAP vô hiệu hóa: Fill, Center Across Selection, Distributed.<br>- Chiều dọc: Hỗ trợ đầy đủ Top, Middle/Center, Bottom. Đánh dấu GAP vô hiệu hóa: Justify, Distributed.<br>- Thụt lề: Hỗ trợ 0–4 nấc (ánh xạ padding 8px–56px).<br>- Điều khiển chữ: Wrap text và Merge cells kết nối logic thật; Shrink to fit gắn nhãn GAP.<br>- Hướng chữ: Gắn nhãn GAP.<br>- Hướng xoay: Hỗ trợ nhập góc -90° đến 90°, 6 nút thiết lập nhanh (0°, 45°, -45°, 90°, -90°, 255 dọc xếp chồng), kèm khung xem trước trực quan SVG/CSS live preview.<br>- Ribbon: Nhóm Căn chỉnh trên tab Trang đầu bổ sung nút launcher mở trực tiếp thẻ Căn chỉnh. | **Đạt Parity UI & Dialog**.<br>Đã bổ sung thẻ Căn chỉnh hoàn chỉnh, nối dây 100% các hàm grid thật có sẵn, cách ly an toàn các tùy chọn nâng cao chưa có backend. |
| **Writer** | Hộp thoại Paragraph:<br>- Indents and Spacing: Alignment (Left, Centered, Right, Justified), Outline level (1–9), Indentation (Left, Right, Special: None/First line/Hanging), Spacing Before/After (pt), Line spacing (Single, 1.5, Double, At least, Exactly, Multiple).<br>- Line and Page Breaks: Widow/Orphan, Keep with next, Page break before. | Thanh Ribbon Trang đầu & Bố cục:<br>- Tab Trang đầu: Căn trái (Ctrl+L), Căn giữa (Ctrl+E), Căn phải (Ctrl+R), Căn đều (Ctrl+J), Thụt lề (Ctrl+M), Giảm thụt lề (Ctrl+Shift+M), Giãn dòng (1.0, 1.5, 2.0), Danh sách đa cấp 3 nấc.<br>- Tab Bố cục: Thụt lề, Giảm thụt lề, Giãn dòng, Khoảng trước đoạn (0, 6, 8, 12, 18 pt), Khoảng sau đoạn (0, 6, 8, 12, 18 pt). | **Chủ động Giữ nguyên trên Ribbon**.<br>Toàn bộ điều khiển căn lề và khoảng cách đoạn đã được bố trí công thái học trên ribbon, có kiểm thử nghiêm ngặt fo:margin-top/bottom/left và fo:line-height. Chủ động không tạo hộp thoại Paragraph giả lập để tránh làm sai lệch XML schema ODF. |
| **Slides** | Menu Arrange & Căn chỉnh Text:<br>- Arrange > Align: Align Left, Center, Right, Top, Middle, Bottom; Distribute Horizontally, Distribute Vertically; Align to Slide / Align Selected Objects.<br>- Home > Paragraph > Align Text: Top, Middle, Bottom cho khung văn bản / hình vẽ.<br>- Text Direction: Horizontal, Rotate all text 90°, Rotate all text 270°, Stacked. | Trình vẽ Canvas & Thanh Ribbon Trang đầu:<br>- Tab Trang đầu nhóm Đối tượng vẽ: Menu Sắp xếp hiện chỉ có Nhóm đối tượng (Ctrl+G) và Hủy nhóm đối tượng (Ctrl+Shift+G).<br>- Tab Trang đầu nhóm Đoạn văn: Chỉ hỗ trợ căn ngang trên dòng văn bản (Trái, Giữa, Phải, Đều hai bên) và Giãn dòng (1.0, 1.5, 2.0).<br>- Canvas: Chưa có thuật toán căn chỉnh đa hình, phân phối đều khoảng cách, căn lề dọc khung chữ, hoặc xoay hướng chữ. | **Xác định GAP Cần Backend**.<br>Slides chưa hỗ trợ các thuật toán căn chỉnh hình vẽ và căn lề dọc khung văn bản trên Canvas. Toàn bộ GAP được ghi nhận chi tiết để đội ngũ Codex/Grok phát triển logic thật ở pha sau. |

---

## 3. Chi tiết Nâng cấp trên VN Sheet (Format Cells - Alignment)

### 3.1. Lệnh Điều khiển & Nút Phóng to trên Ribbon
- Bổ sung lệnh mới sheet.format.alignmentDialog trong platform/commands/command-definitions.js thuộc danh mục format với icon formatCells.
- Lệnh này được ánh xạ hai chiều tương thích LibreOffice sang .uno:FormatCellDialog trong adapters/libreoffice/common/command-dispatch-mapper.js.
- Không gán phím tắt trùng lặp trên định nghĩa lệnh nhằm tuân thủ tuyệt đối quy tắc duy nhất phím tắt (tránh xung đột với Ctrl+1 của lệnh sheet.format.cellsDialog).
- Tại nhóm Căn chỉnh (alignment) trên tab Trang đầu của Ribbon Sheet (apps/sheet/sheet-ribbon.js), bổ sung launcherCommandId: "sheet.format.alignmentDialog" và tooltip "Căn chỉnh ô (Ctrl+1)". Khi người dùng nhấp chuột vào nút nhỏ ở góc nhóm Căn chỉnh, hộp thoại Định dạng ô sẽ mở ngay lập tức tại thẻ Căn chỉnh.

### 3.2. Cấu trúc Giao diện Thẻ Căn chỉnh
Hộp thoại trong apps/sheet/format-cells-dialog.js được nâng cấp toàn diện:
1. Thẻ điều hướng: Cho phép chuyển đổi mượt mà giữa thẻ Số (Number) và thẻ Căn chỉnh (Alignment) mà không làm mất trạng thái đang chọn.
2. Căn chỉnh ngang (Horizontal Alignment):
   - Danh sách hỗ trợ: Chung (General), Căn trái (Thụt lề), Căn giữa (Center), Căn phải (Thụt lề), Căn đều (Justify).
   - Tùy chọn nâng cao chưa hỗ trợ (GAP) được đánh dấu rõ ràng và vô hiệu hóa: Lấp đầy (Fill), Giữa qua vùng chọn (Center Across Selection), Phân phối đều (Distributed).
3. Thụt lề (Indent):
   - Ô nhập số từ 0 đến 4 nấc, tự động kích hoạt khi chọn căn trái hoặc căn phải, ánh xạ tương ứng vào độ đệm paddingLeft (8px đến 56px).
4. Căn chỉnh dọc (Vertical Alignment):
   - Danh sách hỗ trợ: Căn trên (Top), Căn giữa (Center/Middle), Căn dưới (Bottom).
   - Tùy chọn nâng cao chưa hỗ trợ (GAP) được đánh dấu rõ ràng và vô hiệu hóa: Căn đều dọc (Justify), Phân phối đều (Distributed).
5. Điều khiển văn bản (Text Control):
   - Ngắt dòng tự động (Wrap text): Kết nối trực tiếp phương thức grid.toggleWrapText().
   - Hợp nhất ô (Merge cells): Kết nối trực tiếp grid.mergeCells("mergeCells") và grid.unmergeCells().
   - Thu nhỏ vừa ô (Shrink to fit): Đánh dấu GAP và vô hiệu hóa an toàn.
6. Hướng văn bản (Right-to-left):
   - Đánh dấu GAP và vô hiệu hóa với các mục Context, Left-to-Right, Right-to-Left.
7. Hướng xoay văn bản (Orientation):
   - Ô nhập góc xoay số từ -90° đến 90°.
   - 6 nút thiết lập nhanh: 0° (Ngang chuẩn), 45° (Nghiêng lên), -45° (Nghiêng xuống), 90° (Dọc hướng lên), -90° (Dọc hướng xuống), và 255 (Dọc chữ xếp chồng chuẩn ODF/XLSX).
   - Khung xem trước trực quan (Visual Preview Box): Sử dụng SVG và CSS transform để phản ánh tức thì góc xoay chữ mẫu khi người dùng thay đổi giá trị hoặc bấm nút preset.
8. Áp dụng thay đổi an toàn:
   - Khi nhấn nút Đồng ý, hộp thoại chỉ gọi các phương thức có sẵn của SheetGridController: setStyle("textAlign"), setStyle("verticalAlign"), setStyle("paddingLeft"), toggleWrapText(), setCellOrientation(), mergeCells(), unmergeCells().
   - Mọi thay đổi đều được ghi nhận vào ngăn xếp hoàn tác undo/redo của bảng tính.

---

## 4. Quyết định Kiến trúc trên VN Writer (Đoạn văn & Khoảng cách)

Trong Microsoft Word, hộp thoại Paragraph chứa nhiều thiết lập chuyên sâu như First line/Hanging indent, Mirror indents, Spacing Before/After, Line spacing (At least/Exactly/Multiple), Widow/Orphan control.

Sau khi rà soát kỹ lưỡng kiến trúc VN Writer, quyết định được đưa ra là: **Chủ động KHÔNG tạo hộp thoại Paragraph modal giả lập, tiếp tục duy trì và hoàn thiện các điều khiển trực tiếp trên Ribbon**.

Căn cứ kiến trúc:
1. Đầy đủ trên Ribbon: Toàn bộ nhu cầu căn lề và giãn cách thông dụng nhất của người dùng văn phòng đã được đáp ứng đầy đủ trên hai tab:
   - Tab Trang đầu (nhóm Đoạn văn): Căn trái, Căn giữa, Căn phải, Căn đều, Tăng/Giảm thụt lề, Giãn dòng 1.0/1.5/2.0, Danh sách đa cấp chuẩn Nghị định 30/2020/NĐ-CP.
   - Tab Bố cục (nhóm Đoạn văn): Hai hộp chọn Khoảng trước đoạn và Khoảng sau đoạn với 5 nấc chuẩn (0 pt, 6 pt, 8 pt, 12 pt, 18 pt), Giãn dòng và Thụt lề.
2. An toàn cho Serializer ODF (FODT): Bộ serializer trong adapters/libreoffice/writer/writer-adapter.js chuyển dịch trực tiếp các thuộc tính trên sang các thẻ chuẩn ODF fo:text-align, fo:margin-top, fo:margin-bottom, fo:margin-left và fo:line-height. Bộ test tích hợp (tests 117–120) kiểm tra nghiêm ngặt tính toàn vẹn của ODF XML. Nếu tạo một hộp thoại có chứa các trường như Hanging indent hay Exactly line spacing mà canvas DOM và serializer chưa hỗ trợ, tài liệu xuất ra sẽ bị lỗi cấu trúc hoặc người dùng thao tác nhưng không có tác dụng thực tế.
3. Bổ sung bài viết trợ giúp: Đã bổ sung bài hướng dẫn chi tiết writer.para.alignmentSpacing trong platform/help/entries-writer.js nhằm hướng dẫn người dùng khai thác tối đa các công cụ căn lề và khoảng cách dòng trên Ribbon.

---

## 5. Báo cáo GAP trên VN Slides & Khuyến nghị cho Codex/Grok

### 5.1. Rà soát Hiện trạng VN Slides so với PowerPoint & Writer
- So sánh với PowerPoint: PowerPoint cung cấp menu Arrange > Align đầy đủ với 6 hướng căn lề đối tượng, 2 hướng phân phối đều, và tùy chọn căn theo Slide hay căn theo Cụm chọn. Ngoài ra, khung chữ (Text Frame) có thuộc tính căn lề dọc (Top, Middle, Bottom) và xoay hướng chữ 90°/270°/dọc.
- So sánh với VN Writer: Writer đã có WriterArrangeController (apps/writer/writer-arrange.js) hỗ trợ bao chữ (inline, square, tight, behind, front, topBottom) và 9 vị trí căn chỉnh ảnh đặt sẵn (topLeft, center, bottomRight,...). Trong khi đó, Canvas của VN Slides (apps/slides/slides-canvas.js) hiện mới chỉ có groupSelectedShapes() và ungroupSelectedShapes() dựa trên thuộc tính groupId.

### 5.2. Danh sách các GAP Cần Backend Xử lý
Dưới đây là các khoảng trống chức năng cần đội ngũ backend (Codex/Grok) cài đặt logic thuật toán:

1. GAP-SLIDES-01: Thuật toán Căn chỉnh Hình khối Đa chọn (Multi-shape Alignment)
   - Cần bổ sung các hàm tính toán tọa độ hộp bao (bounding box) trong slides-canvas.js:
     - Align Left: min(x) của các hình đang chọn.
     - Align Center: (min(x) + max(x + w)) / 2.
     - Align Right: max(x + w) của các hình đang chọn.
     - Align Top: min(y) của các hình đang chọn.
     - Align Middle: (min(y) + max(y + h)) / 2.
     - Align Bottom: max(y + h) của các hình đang chọn.
2. GAP-SLIDES-02: Phân phối Đều Đối tượng (Distribute Horizontally / Vertically)
   - Cần thuật toán tính toán khoảng trống giữa các đối tượng (khi chọn từ 3 đối tượng trở lên) và chia đều khoảng cách trên trục X hoặc trục Y.
3. GAP-SLIDES-03: Tùy chọn Phạm vi Căn chỉnh (Align to Slide vs Align Selected Objects)
   - Khi bật Align to Slide, tọa độ gốc tham chiếu sẽ là ranh giới khung chiếu (0, 0, slideWidth, slideHeight) thay vì bounding box của các hình được chọn.
4. GAP-SLIDES-04: Ngăn xếp Hoàn tác Canvas (Undo/Redo for Alignment)
   - Thao tác căn chỉnh cần phát sinh một bản ghi lịch sử dạng shapes-align lưu trữ vị trí cũ và vị trí mới của từng hình khối để hoàn tác chính xác bằng Ctrl+Z.
5. GAP-SLIDES-05: Căn lề Dọc Khung Văn bản (Vertical Text Alignment in Shapes)
   - Hỗ trợ căn lề dọc Top, Middle, Bottom bên trong khung chữ/hình vẽ. Trong PPTX, thuộc tính tương ứng là a:bodyPr anchor="t" | "ctr" | "b". Trong FODP, thuộc tính tương ứng là draw:text-style draw:textarea-vertical-align.
6. GAP-SLIDES-06: Xoay Hướng Văn bản trong Khung (Text Direction)
   - Hỗ trợ quay chữ 90°, 270°, hoặc xếp chồng. Trong PPTX là a:bodyPr vert="horz" | "vert" | "vert270" | "wordArtVert".

---

## 6. Kết quả Kiểm thử & Đảm bảo Chất lượng

Trước khi hoàn tất, toàn bộ quy trình kiểm thử chất lượng bắt buộc đã được thực hiện nghiêm ngặt và đạt tỷ lệ thành công 100%:

1. Kiểm tra cú pháp JavaScript:
   - Lệnh thực thi: node scripts/check-syntax.js
   - Kết quả: 88/88 tệp tin JavaScript hoàn toàn hợp lệ, không có bất kỳ lỗi cú pháp nào.

2. Bộ kiểm thử đơn vị tích hợp:
   - Lệnh thực thi: node tests/run-tests.js
   - Kết quả: 1326/1326 ca kiểm thử PASS (100% thành công, 0 ca thất bại), trong đó bao gồm các ca kiểm thử mới được bổ sung trong tests/unit/sheet-format-cells.test.js và tests/unit/writer-help.test.js.

3. Kiểm thử giao diện tự động Playwright (Ribbon Audit 1280px):
   - Lệnh thực thi: node tests/live/ribbon-audit-1280.playwright.mjs
   - Kết quả: 104/104 lượt kiểm tra tab (26 tab x 2 giao diện x 2 ngôn ngữ VI/EN) đạt 0px tràn ngang tại độ phân giải 1280px; toàn bộ các nút bấm và launcher tương tác tốt.

---

## 7. Lịch sử Commit trên Nhánh fix/alignment-dialogs-parity

Nhánh đã ghi nhận chuỗi commit độc lập, phân tách rành mạch theo từng ứng dụng:

1. Commit 70c0a65: feat(sheet): implement Format Cells alignment tab and alignment dialog launcher
2. Commit f98b815: docs(writer): document paragraph alignment and spacing ribbon parity architecture
3. Commit tiếp theo: docs(slides): audit alignment parity and provide comprehensive handoff report

Toàn bộ các yêu cầu của đợt kiểm tra và đồng bộ căn chỉnh đã hoàn thành đúng theo tôn chỉ kiến trúc vững chắc, chuẩn hóa trải nghiệm người dùng và an toàn tuyệt đối cho hệ thống.
