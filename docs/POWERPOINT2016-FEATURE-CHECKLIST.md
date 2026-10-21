# Danh sách tính năng PowerPoint 2016 và trạng thái trong VN Slides

Chuẩn: Microsoft PowerPoint 2016 (16.0.4266) cài trên máy, đọc chỉ-đọc qua COM. Lập 17/10/2026 từ quét ribbon PowerPoint thật (`docs/ribbon-scan-ppt-1710.json`), ma trận đối chiếu từng nút ribbon (`docs/SLIDES-BUTTON-MATRIX-1011.md`), kết quả đo kiểm 15 tính năng ưu tiên 1 (`docs/POWERPOINT2016-FINDINGS-1710.md`, `docs/ppt-oracle-1710.json`), ma trận Hoàn tác (`docs/AUDIT-DOC-UNDO-FULL-1610.md`), đọc mã và kiểm thực tế. Sinh bằng `scripts/audit-0610/gen_ppt_checklist.py` (sửa dữ liệu trong script rồi chạy lại).

## Cách đọc

- ✅ **Đã đối chiếu PowerPoint 2016**
- 🟢 **Có, chưa đối chiếu**
- 🟡 **Có một phần**
- 🔴 **Chưa có**
- ⚪ **Ngoài phạm vi**

Ưu tiên của mục thiếu/một phần: **1** = người dùng văn phòng dùng thường xuyên; **2** = khá thường; **3** = hiếm.

## Tổng hợp

| Trạng thái | Số mục | Tỷ lệ (trên mục áp dụng) |
|---|---|---|
| ✅ Đã đối chiếu PowerPoint 2016 | 116 | 44% |
| 🟢 Có, chưa đối chiếu | 80 | 30% |
| 🟡 Có một phần | 17 | 6% |
| 🔴 Chưa có | 50 | 19% |
| ⚪ Ngoài phạm vi | 6 | - |
| **Tổng** | **269** (áp dụng: 263) | |

- **Độ phủ so với PowerPoint 2016 (có hoặc có một phần, một phần tính 0,5): 78%**
- **Đã xác minh bằng đối chiếu PowerPoint 2016 thật: 44%** các mục áp dụng

Lưu ý: số mục chia đều cho mỗi dòng nên một dòng lớn chỉ tính một mục; đo kiểu ghi-rồi-đọc-lại trên PowerPoint COM chỉ xác nhận ngữ nghĩa thuộc tính của PowerPoint, KHÔNG tự nhận là parity hoàn chỉnh nếu chưa có kiểm chứng khứ hồi.

## Theo tab

| Tab | Mục | ✅ | 🟢 | 🟡 | 🔴 | ⚪ | Độ phủ |
|---|---|---|---|---|---|---|---|
| Tệp (Backstage) | 17 | 5 | 10 | 0 | 1 | 1 | 94% |
| Trang đầu | 57 | 40 | 12 | 3 | 2 | 0 | 94% |
| Chèn | 29 | 14 | 2 | 1 | 10 | 2 | 61% |
| Thiết kế | 15 | 9 | 0 | 2 | 4 | 0 | 67% |
| Chuyển tiếp | 11 | 5 | 3 | 1 | 2 | 0 | 77% |
| Hoạt ảnh | 16 | 12 | 3 | 0 | 1 | 0 | 94% |
| Trình chiếu | 16 | 4 | 6 | 0 | 5 | 1 | 67% |
| Xem lại | 14 | 2 | 6 | 0 | 4 | 2 | 67% |
| Chế độ xem | 25 | 7 | 11 | 2 | 5 | 0 | 76% |
| Công cụ vẽ > Định dạng | 17 | 4 | 8 | 2 | 3 | 0 | 76% |
| Công cụ hình ảnh > Định dạng | 12 | 1 | 0 | 4 | 7 | 0 | 25% |
| Công cụ bảng > Thiết kế | 8 | 1 | 7 | 0 | 0 | 0 | 100% |
| Công cụ bảng > Bố trí | 8 | 8 | 0 | 0 | 0 | 0 | 100% |
| Công cụ biểu đồ > Thiết kế | 8 | 0 | 3 | 0 | 5 | 0 | 38% |
| Công cụ phương tiện > Phát lại | 5 | 0 | 2 | 2 | 1 | 0 | 60% |
| Không thuộc ribbon | 11 | 4 | 7 | 0 | 0 | 0 | 100% |

## Việc cần làm (mục chưa có hoặc một phần, ưu tiên 1)

| Tab | Nhóm | Tính năng | Trạng thái | Ghi chú |
|---|---|---|---|---|
| Chèn | Minh họa | SmartArt (Danh sách, Quy trình, Chu trình, Phân cấp) | 🔴 | Chưa hỗ trợ tạo mới SmartArt native chuẩn DrawingML diagram; hiện dùng sơ đồ nhóm shape (docs/SLIDES-BUTTON-MATRIX-1011.md:53) |
| Chèn | Văn bản | Chữ nghệ thuật (WordArt) | 🟡 | FIX-L14: có lệnh slides.insert.wordart nhưng PowerPoint COM nhận dạng Type=17 PresetTextEffect=-2 chưa chuẩn native Type=15 (docs/SLIDES-BUTTON-MATRIX-1011.md:57) |
| Chuyển tiếp | Chuyển tiếp sang slide | Hiệu ứng Morph (Biến đổi hình thái) | 🟡 | Đã có xử lý chuyển đổi Morph sơ bộ; chưa hoàn thiện mapping đối tượng khớp định danh như PowerPoint 2016 Office 365 |
| Công cụ vẽ > Định dạng | Kiểu chữ WordArt | Hiệu ứng chữ nghệ thuật (Text Effects: Warp, Shadow, 3D) | 🟡 | FIX-L14: có textFadeRight nhưng PowerPoint COM nhận dạng PresetTextEffect=-2 chưa chuẩn native (docs/SLIDES-BUTTON-MATRIX-1011.md:57) |

Tổng: 4 mục ưu tiên 1.

## Danh sách 15 mục ưu tiên 1 thiếu nhất & Đề xuất 10 phiếu việc kế tiếp

### 15 mục ưu tiên 1 cần bổ sung sớm nhất cho người dùng văn phòng:
1. **Chèn > SmartArt**: Tạo SmartArt native (DrawingML diagram data/layout/colors) cho các mẫu quy trình, phân cấp, chu trình.
2. **Công cụ bảng > Bố trí > Chèn hàng**: Thao tác chèn hàng trên/dưới trong bảng biểu slide.
3. **Công cụ bảng > Bố trí > Chèn cột**: Thao tác chèn cột trái/phải trong bảng biểu slide.
4. **Công cụ bảng > Bố trí > Xóa hàng/cột/bảng**: Thao tác xóa hàng, xóa cột hoặc xóa toàn bộ bảng đang chọn.
5. **Công cụ bảng > Bố trí > Gộp ô (Merge Cells)**: Gộp các ô đang chọn thành một ô duy nhất.
6. **Chèn > Chữ nghệ thuật (WordArt)**: Chuẩn hóa xuất DrawingML WordArt native Type=15 (presetTextWarp) thay vì shape Type=17.
7. **Chuyển tiếp > Morph**: Hoàn thiện thuật toán ánh xạ đối tượng cùng tên `!!name` giữa các slide cho chuyển tiếp Morph mượt mà.
8. **Tệp > Thông tin > Mật khẩu**: Cơ chế mã hóa và thiết lập mật khẩu bảo vệ file PPTX.
9. **Trang đầu > Phông chữ > Đổ bóng chữ (Text Shadow)**: Nút Text Shadow trực tiếp trên ribbon Trang đầu.
10. **Công cụ vẽ > Hiệu ứng chữ WordArt**: Thư viện hiệu ứng uốn cong chữ nghệ thuật (Warp gallery).
11. **Trang đầu > Đoạn văn > Cột văn bản (Columns)**: Chia 2-3 cột văn bản bên trong khung chữ (Text Box).
12. **Hoạt ảnh > Nhóm Nhấn mạnh (Emphasis Effects)**: Các hiệu ứng chuyển động xoay, đổi cỡ chữ, nhấp nháy khi thuyết trình.
13. **Hoạt ảnh > Nhóm Thoát (Exit Effects)**: Các hiệu ứng biến mất đối tượng (Disappear, Fade Out, Fly Out).
14. **Thiết kế > Kích thước trang chiếu tùy chỉnh (Custom Slide Size)**: Hộp thoại đặt chiều rộng/chiều cao slide theo cm/pt.
15. **Công cụ hình ảnh > Cắt xén ảnh (Crop)**: Công cụ kéo chốt cắt xén ảnh trực quan trên canvas.

### Đề xuất 10 phiếu việc kế tiếp cho VN Slides:
- **FIX-S1-TABLE-STRUCTURE**: Thêm lệnh chèn/xóa hàng, cột và gộp ô trong bảng biểu slide.
- **FIX-S2-SMARTART**: Thiết kế engine sinh SmartArt native Diagram (danh sách, quy trình, phân cấp) chuẩn DrawingML.
- **FIX-S3-WORDART**: Chuẩn hóa WordArt native DrawingML `a:prstTxWarp` (PresetTextEffect 15) tương thích hoàn toàn PowerPoint.
- **FIX-S4-MORPH**: Nâng cấp hiệu ứng chuyển tiếp Morph nhận diện và biến đổi hình thái đối tượng giữa 2 slide kế tiếp.
- **FIX-S5-PPTX-PASSWORD**: Mã hóa mật khẩu bảo vệ file PPTX mở đọc/chỉnh sửa.
- **FIX-S6-TEXT-SHADOW**: Thêm nút Đổ bóng chữ (Text Shadow) vào nhóm Phông chữ ribbon Trang đầu và phím tắt.
- **FIX-S7-TEXT-COLUMNS**: Hỗ trợ chia 2-3 cột văn bản bên trong textbox.
- **FIX-S8-ANIMATION-EMPHASIS-EXIT**: Bổ sung nhóm hoạt ảnh Nhấn mạnh (Spin, Pulse) và Biến mất (Fade Out, Fly Out).
- **FIX-S9-CUSTOM-SLIDE-SIZE**: Hộp thoại thiết lập kích thước trang chiếu tùy biến theo kích thước cm/pt.
- **FIX-S10-IMAGE-CROP-UI**: Công cụ kéo chốt tương tác cắt xén ảnh (Crop) trực tiếp trên canvas.

## Chi tiết từng tab

### Tệp (Backstage)

| Nhóm | Tính năng PowerPoint 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Slides |
|---|---|---|---|---|
| Tệp | Mới (Ctrl+N) | 🟢 | - | common.file.new; tạo bản trình bày trống mới |
| Tệp | Mở (Ctrl+O): PPTX, PPT, ODP, FODP | 🟢 | - | Mở các định dạng trình chiếu qua LibreOffice adapter (docs/AUDIT-SLIDES-OFFICE-PARITY-1011.md:9; chưa đối chiếu riêng cho nút Backstage) |
| Tệp | Mở gần đây (danh sách tệp) | 🟢 | - | Danh sách tệp gần đây trong Backstage menu (platform/shell/app-shell.js:960-985) |
| Tệp | Lưu (Ctrl+S) | ✅ | - | Lưu PPTX khứ hồi không lỗi (docs/AUDIT-SLIDES-OFFICE-PARITY-1011.md:9-10; docs/SLIDES-BUTTON-MATRIX-1011.md:20) |
| Tệp | Lưu bản sao / Lưu thành (F12): PPTX, PPT 97-2003, ODP, FODP, PDF | 🟢 | - | common.file.saveAs; lưu thành các định dạng bản trình chiếu |
| Tệp | Xuất PDF | 🟢 | - | common.file.exportPdf; xuất toàn bộ slide sang PDF |
| Tệp | Xuất và chuyển đổi định dạng (giữ bố cục) | 🟢 | - | common.file.exportConvert; chuyển đổi giữ nguyên bố cục |
| Tệp | In (Ctrl+P) & Xem trước khi in (Ctrl+F2) | ✅ | - | slides.file.printPreview xem trước bản in (docs/SLIDES-BUTTON-MATRIX-1011.md:89) |
| Tệp | Đóng (Ctrl+W) | 🟢 | - | common.file.close; đóng bản trình bày hiện tại |
| Thông tin | Bảo vệ bản trình bày: Đánh dấu là cuối cùng (Mark as Final / Read-only) | ✅ | - | Backstage > Thông tin > Đánh dấu là cuối cùng ghi contentStatus=Final; PowerPoint COM đọc lại Content status = Final (adapters/libreoffice/slides/slides-adapter.js:180, scripts/audit-0610/ppt_docprops_readback.ps1:2) |
| Thông tin | Bảo vệ bản trình bày: Mật khẩu mở file (mã hóa PPTX) | ✅ | - | common.file.passwordProtection: Tệp > Thông tin > Mã hóa bằng mật khẩu (Agile AES-256, 2 ô nhập khớp); tệp lưu là vùng chứa mã hóa, mở lại hỏi mật khẩu, sai mật khẩu báo rõ, đặt hoặc gỡ được (tests/live/cdp/document-password.desktop.mjs 9/9; tests/test_ooxml_encryption_roundtrip.py; platform/commands/command-definitions.js:16 lệnh, platform/security/office_encryption.py:356 mã hóa, platform/dialogs/document-password-dialog.js:4 hộp thoại); Word và PowerPoint 2016 COM mở được bằng mật khẩu (mật khẩu thử dưới 16 ký tự vì COM từ chối dài hơn, kể cả tệp do chính Word lưu) |
| Thông tin | Kiểm tra bản trình bày (Inspect Document - loại bỏ metadata ẩn) | 🟢 | - | Backstage > Thông tin > Kiểm tra bản trình bày: 5 nhóm (thuộc tính, nhận xét, ghi chú, slide ẩn, ngoài vùng slide), xóa từng nhóm (adapters/libreoffice/slides/slides-adapter.js:245 openDocumentInspectorDialog; apps/slides/document-inspector-dialog.js:1; tests/live/cdp/slides-file-info.desktop.mjs:1); chưa đối chiếu Inspect Document của PowerPoint |
| Thông tin | Quản lý bản trình bày: Tự động khôi phục (AutoRecover) | 🟢 | - | Tự động khôi phục bản trình bày (platform/help/entries-autorecover.js:28-34) |
| Thông tin | Thuộc tính bản trình bày (Title, Author, Subject, Tags...) | ✅ | - | Backstage > Thông tin > Thuộc tính (Title/Author/Subject/Keywords/Comments) lưu docProps/core.xml; PowerPoint COM BuiltInDocumentProperties khớp (adapters/libreoffice/slides/slides-adapter.js:169, scripts/audit-0610/ppt_docprops_readback.ps1:2) |
| Tùy chọn | Tùy chọn PowerPoint (Hộp thoại Options) | 🔴 | 2 | Chưa có hộp thoại Tùy chọn (Options) riêng cho VN Slides |
| Tùy chọn | Tùy biến Thanh công cụ truy nhanh (Quick Access Toolbar) | 🟢 | - | Thanh truy nhanh tùy biến (platform/shell/quick-access.js:46-60) |
| Chia sẻ | Chia sẻ / OneDrive / Gửi Email đính kèm | ⚪ | - | Cần dịch vụ đám mây Microsoft |

### Trang đầu

| Nhóm | Tính năng PowerPoint 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Slides |
|---|---|---|---|---|
| Bảng nhớ tạm | Dán (Ctrl+V) | ✅ | - | FIX-L8: common.edit.paste dán vào textbox khớp COM (docs/SLIDES-BUTTON-MATRIX-1011.md:16) |
| Bảng nhớ tạm | Tùy chọn dán: Giữ định dạng nguồn / Chỉ giữ văn bản thuần | 🟢 | - | common.edit.pastePlain; hỗ trợ dán văn bản thuần không giữ định dạng (Ctrl+Shift+V) |
| Bảng nhớ tạm | Dán đặc biệt... (Ctrl+Alt+V) hộp thoại | 🟢 | - | slides.edit.pasteSpecial; bốn lựa chọn clipboard cục bộ (apps/slides/slides-ribbon.js; adapters/libreoffice/slides/slides-adapter.js; tests/unit/slides-paste-special.test.js) |
| Bảng nhớ tạm | Cắt (Ctrl+X) | ✅ | - | FIX-L8: common.edit.cut cắt nội dung khớp COM (docs/SLIDES-BUTTON-MATRIX-1011.md:17) |
| Bảng nhớ tạm | Sao chép (Ctrl+C) | ✅ | - | FIX-L8: common.edit.copy sao chép văn bản (docs/SLIDES-BUTTON-MATRIX-1011.md:18) |
| Bảng nhớ tạm | Sao chép định dạng (Format Painter, Ctrl+Shift+C) | ✅ | - | FIX-L10: slides.edit.formatPainter đối chiếu PowerPoint COM (docs/SLIDES-BUTTON-MATRIX-1011.md:19) |
| Bảng nhớ tạm | Ngăn Clipboard (Office Clipboard đa mục) | 🔴 | 3 | Chưa có ngăn lưu trữ nhiều mục clipboard lịch sử |
| Trang chiếu | Trang chiếu mới (Ctrl+M) | ✅ | - | FIX-L8: slides.slide.new tăng số slide đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:20, docs/ppt-oracle-1710.json:9-15) |
| Trang chiếu | Bố cục (Layout) | ✅ | - | FIX-L12: slides.layout.apply áp Hai nội dung Slide.Layout=3 khớp COM (docs/SLIDES-BUTTON-MATRIX-1011.md:21, docs/POWERPOINT2016-FINDINGS-1710.md:13) |
| Trang chiếu | Đặt lại bố cục (Reset) | ✅ | - | FIX-L12: slides.layout.reset đặt lại bố cục và placeholder (docs/SLIDES-BUTTON-MATRIX-1011.md:24) |
| Trang chiếu | Phần (Section: Thêm, Đổi tên, Xóa phần) | 🟢 | - | slides.section.add, slides.section.rename, slides.section.remove; quản lý các section trong deck |
| Trang chiếu | Nhân đôi trang chiếu (Duplicate, Ctrl+D) | ✅ | - | FIX-L7: slides.slide.duplicate nhân đôi slide đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:22, docs/ppt-oracle-1710.json:16-22) |
| Trang chiếu | Xóa trang chiếu (Delete) | ✅ | - | FIX-L8: slides.slide.delete xóa trang đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:23, docs/ppt-oracle-1710.json:30-36) |
| Phông chữ | Tên phông chữ (Font Family) | ✅ | - | FIX-L4: slides.font.family đối chiếu PowerPoint COM phông Calibri (docs/SLIDES-BUTTON-MATRIX-1011.md:25, docs/AUDIT-SLIDES-OFFICE-PARITY-1011.md:9) |
| Phông chữ | Cỡ chữ (Font Size 8–96 pt) | ✅ | - | FIX-L4: slides.font.size chuỗi đổi cỡ chữ đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:26, docs/AUDIT-SLIDES-OFFICE-PARITY-1011.md:10) |
| Phông chữ | Tăng cỡ chữ (Ctrl+Shift+>) | ✅ | - | FIX-L4: slides.font.grow tăng cỡ chữ theo thang chuẩn đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:27) |
| Phông chữ | Giảm cỡ chữ (Ctrl+Shift+<) | ✅ | - | FIX-L4: slides.font.shrink giảm cỡ chữ theo thang chuẩn đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:28) |
| Phông chữ | Xóa định dạng (Clear All Formatting, Ctrl+Space) | ✅ | - | FIX-L7: slides.text.clearFormat xóa định dạng Bold/Italic/Underline đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:33) |
| Phông chữ | Đậm (Ctrl+B / Bold) | ✅ | - | FIX-L4: slides.text.bold đối chiếu PowerPoint COM Bold=true (docs/SLIDES-BUTTON-MATRIX-1011.md:29, docs/AUDIT-SLIDES-OFFICE-PARITY-1011.md:17) |
| Phông chữ | Nghiêng (Ctrl+I / Italic) | ✅ | - | FIX-L7: slides.text.italic đối chiếu TextRange2.Font.Italic=-1 (docs/SLIDES-BUTTON-MATRIX-1011.md:30) |
| Phông chữ | Gạch chân (Ctrl+U / Underline) | ✅ | - | FIX-L7: slides.text.underline đối chiếu Font.Underline=-1 (docs/SLIDES-BUTTON-MATRIX-1011.md:31) |
| Phông chữ | Đổ bóng chữ (Text Shadow) | ✅ | - | 17/10: slides.text.shadow (nút trên ribbon Trang đầu, bật/tắt); CDP 7/7; lưu PPTX khôi phục outerShdw, PowerPoint 2016 COM đọc Shadow.Visible=-1 cho đúng đoạn chữ (docs/AUDIT-SLIDES-SHADOW-1710.md:11) |
| Phông chữ | Gạch ngang (Strikethrough) | ✅ | - | FIX-L7: slides.text.strike đối chiếu TextFrame2.Font.Strike=1 (docs/SLIDES-BUTTON-MATRIX-1011.md:32) |
| Phông chữ | Khoảng cách ký tự (Character Spacing: Very Tight, Tight, Normal, Loose, Very Loose) | 🟢 | - | slides.font.spacing: 5 mức -3/-1,5/0/3/6 pt qua nút Khoảng cách ký tự và hộp thoại Phông chữ; CDP 8/8; lưu PPTX spc=300 đúng (platform/commands/command-definitions.js:732, adapters/libreoffice/slides/slides-adapter.js:982); chưa đối chiếu giá trị mức dựng sẵn với PowerPoint |
| Phông chữ | Đổi chữ hoa/thường (Change Case, Shift+F3) | 🟢 | - | slides.text.changeCase (5 kiểu + Shift+F3 xoay vòng); test CDP tests/live/cdp/slides-change-case.desktop.mjs 9/9; logic dùng chung platform/text/change-case.js; chưa đối chiếu PowerPoint COM |
| Phông chữ | Màu chữ (Font Color) | ✅ | - | FIX-L7/FIX-L5: slides.color.text đối chiếu RGB=255 (docs/SLIDES-BUTTON-MATRIX-1011.md:34) |
| Phông chữ | Màu nền chữ (Highlight Color) | ✅ | - | FIX-L8: slides.color.highlight đối chiếu Highlight.RGB=52735 (docs/SLIDES-BUTTON-MATRIX-1011.md:35) |
| Phông chữ | Hộp thoại Phông chữ (Font Dialog) | ✅ | - | slides.font.dialog (Ctrl+T): phông, cỡ, màu, gạch chân đôi, chỉ số trên, giãn ký tự; PowerPoint COM đọc lại Georgia 28 pt đậm đỏ gạch chân baseline 0.33 (platform/commands/command-definitions.js:787, scripts/audit-0610/ppt_font_runs_readback.ps1:2) |
| Đoạn văn | Dấu đầu dòng (Bullets) | ✅ | - | FIX-L7: slides.list.bullet bật Bullet.Visible=-1, Type=1 đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:36) |
| Đoạn văn | Đánh số thứ tự (Numbering) | ✅ | - | FIX-L7: slides.list.numbered bật đánh số Type=2 đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:37) |
| Đoạn văn | Giảm thụt lề (Decrease Indent) | ✅ | - | FIX-L8: slides.para.indentDec giảm thụt lề về 0 pt đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:38) |
| Đoạn văn | Tăng thụt lề (Increase Indent) | ✅ | - | FIX-L7: slides.para.indentInc tăng thụt lề LeftIndent=36 pt đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:39) |
| Đoạn văn | Giãn dòng (Line Spacing 1.0, 1.5, 2.0) | ✅ | - | FIX-L14: slides.para.lineSpacing đổi 1.0->1.5 đối chiếu COM SpaceWithin=1.5 (docs/SLIDES-BUTTON-MATRIX-1011.md:40) |
| Đoạn văn | Căn trái (Ctrl+L / Align Left) | ✅ | - | FIX-L8: slides.para.alignLeft đối chiếu Paragraph.Alignment=1 (docs/SLIDES-BUTTON-MATRIX-1011.md:41) |
| Đoạn văn | Căn giữa (Ctrl+E / Center) | ✅ | - | FIX-L4: slides.para.alignCenter đối chiếu Alignment=2 (docs/SLIDES-BUTTON-MATRIX-1011.md:42, docs/AUDIT-SLIDES-OFFICE-PARITY-1011.md:17) |
| Đoạn văn | Căn phải (Ctrl+R / Align Right) | ✅ | - | FIX-L7: slides.para.alignRight đối chiếu Paragraph.Alignment=3 (docs/SLIDES-BUTTON-MATRIX-1011.md:43) |
| Đoạn văn | Căn đều (Ctrl+J / Justify) | ✅ | - | FIX-L7: slides.para.justify đối chiếu Paragraph.Alignment=4 (docs/SLIDES-BUTTON-MATRIX-1011.md:44) |
| Đoạn văn | Cột văn bản trong khung (Columns: 1, 2, 3 cột) | ✅ | - | 17/10: slides.text.columns, slides.text.columnsOne, slides.text.columnsTwo, slides.text.columnsThree (nút Cột, Trang đầu > Đoạn văn); CDP 9/9; PowerPoint 2016 COM đọc TextFrame2.Column = 2 cột, 18 pt; mở lại đúng (docs/AUDIT-SLIDES-COLUMNS-1710.md:9) |
| Đoạn văn | Hướng chữ (Text Direction: Ngang, Xoay 90°, Xoay 270°, Xếp chồng) | 🟢 | - | slides.text.directionHorizontal, slides.text.directionVertical, slides.text.directionVertical270, slides.text.directionStacked; đổi hướng hiển thị chữ trong shape |
| Đoạn văn | Căn lề dọc (Align Text: Top, Middle, Bottom) | 🟢 | - | slides.text.vAlignTop, slides.text.vAlignMiddle, slides.text.vAlignBottom; căn văn bản theo chiều dọc khung chữ |
| Đoạn văn | Chuyển sang SmartArt (Convert to SmartArt Graphic) | 🔴 | 2 | Chưa hỗ trợ chuyển đổi trực tiếp văn bản thành sơ đồ SmartArt |
| Vẽ | Hộp văn bản (Text Box) | ✅ | - | FIX-L6: slides.text.insert chèn textbox đối chiếu msoTextBox (docs/SLIDES-BUTTON-MATRIX-1011.md:45) |
| Vẽ | Hình khối (Shapes Gallery) | ✅ | - | FIX-L6: slides.shape.insert chèn shape đối chiếu fill/line RGB và rotation; thư viện 18 hình slides.shape.gallery (tam giác, thoi, sao, mũi tên, tim...) PowerPoint COM AutoShapeType khớp (apps/slides/slides-canvas.js:2862 insertPresetShape, docs/SLIDES-BUTTON-MATRIX-1011.md:46) |
| Vẽ | Sắp xếp: Thứ tự lớp (Bring to Front, Send to Back) | 🟢 | - | slides.arrange.bringToFront, slides.arrange.sendToBack, slides.arrange.bringForward, slides.arrange.sendBackward; sắp xếp thứ tự lớp |
| Vẽ | Sắp xếp: Nhóm đối tượng (Group, Ctrl+G) | ✅ | - | FIX-L12: sơ đồ nhóm 7 đối tượng Shape.Type=6 đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:53, docs/POWERPOINT2016-FINDINGS-1710.md:23) |
| Vẽ | Sắp xếp: Rã nhóm (Ungroup, Ctrl+Shift+G) | 🟢 | - | slides.shape.ungroup; tách các đối tượng trong nhóm |
| Vẽ | Sắp xếp: Căn lề đối tượng (Align Objects) | ✅ | - | Đo thực tế PowerPoint COM ShapeRange.Align đối chiếu hệ thống lệnh slides.arrange.alignLeft, slides.arrange.alignCenter (docs/ppt-oracle-1710.json:86-92, docs/POWERPOINT2016-FINDINGS-1710.md:24) |
| Vẽ | Sắp xếp: Phân phối đều ngang/dọc (Distribute) | 🟢 | - | slides.arrange.distributeHorizontal, slides.arrange.distributeVertical; phân phối đều khoảng cách |
| Vẽ | Sắp xếp: Xoay và lật hình (Rotate & Flip) | ✅ | - | slides.arrange.rotate, slides.arrange.flipHorizontal, slides.arrange.flipVertical; PowerPoint COM đọc lại rotation/hflip/vflip (adapters/libreoffice/slides/slides-adapter.js:278, adapters/libreoffice/slides/slides-adapter.js:287, adapters/libreoffice/slides/slides-adapter.js:288; scripts/audit-0610/ppt_shape_format_readback.ps1:4) |
| Vẽ | Kiểu nhanh hình dạng (Quick Styles Gallery) | 🟡 | 2 | Có thư viện kiểu màu cơ bản; chưa có gallery đầy đủ hiệu ứng 3D như PowerPoint |
| Vẽ | Tô nền hình (Shape Fill: Màu đơn, Chuyển sắc, Ảnh) | 🟡 | 2 | slides.shape.fill: bảng 15 màu, không tô, màu khác (PowerPoint COM đọc lại đúng màu); chưa có chuyển sắc / ảnh trên nút này |
| Vẽ | Viền hình (Shape Outline: Màu, Độ dày nét, Nét đứt) | ✅ | - | slides.shape.outline: màu, độ dày ½–6 pt, nét liền/gạch/chấm/gạch chấm; PowerPoint COM đọc lại line đỏ 3 pt nét gạch (adapters/libreoffice/slides/slides-adapter.js:1601; scripts/audit-0610/ppt_shape_format_readback.ps1:1) |
| Vẽ | Hiệu ứng hình (Shape Effects: Bóng, Phát sáng, Mềm cạnh) | 🟡 | 2 | slides.shape.effects: đổ bóng 4 hướng (PowerPoint COM đọc lại Shadow.Visible); chưa có phát sáng / mềm cạnh / tùy chỉnh |
| Chỉnh sửa | Tìm kiếm (Ctrl+F / Find) | ✅ | - | FIX-L8: common.edit.find tìm chuỗi ROAD TRIP đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:48) |
| Chỉnh sửa | Thay thế (Ctrl+H / Replace) | ✅ | - | FIX-L8: common.edit.replace thay thế văn bản đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:49) |
| Chỉnh sửa | Chọn: Chọn tất cả (Ctrl+A) | 🟢 | - | common.edit.selectAll; chọn toàn bộ đối tượng trên slide |
| Chỉnh sửa | Chọn: Chọn đối tượng / Ngăn chọn (Selection Pane) | 🟢 | - | slides.edit.selectionPane (Alt+F10): danh sách, chọn, đổi thứ tự lớp, đổi tên (nhấp đúp/F2) và ẩn/hiện từng hình ngoài nhóm; tên và trạng thái ẩn lưu vào PPTX, PowerPoint 2016 đọc Shape.Name đúng và Visible=0 (tests/live/cdp/slides-shape-names.desktop.mjs; apps/slides/slides-canvas.js:2679 đổi tên/ẩn, adapters/libreoffice/common/ooxml_zip_patch.py:12456 hidden) |

### Chèn

| Nhóm | Tính năng PowerPoint 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Slides |
|---|---|---|---|---|
| Trang chiếu | Trang chiếu mới (Insert New Slide) | ✅ | - | FIX-L8: slides.slide.new tăng số slide đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:20, docs/ppt-oracle-1710.json:9-15) |
| Bảng | Bảng (Table Grid) | ✅ | - | FIX-L6: slides.insert.table chèn bảng 3x3 đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:50, docs/ppt-oracle-1710.json:65-71) |
| Bảng | Vẽ bảng tự do (Draw Table) | 🔴 | 3 | Chưa có công cụ vẽ lưới bảng biểu tự do bằng bút |
| Bảng | Bảng tính Excel nhúng (Excel Spreadsheet) | 🔴 | 2 | Chưa hỗ trợ nhúng trang tính Excel trực tiếp vào slide |
| Hình ảnh | Hình ảnh từ tệp (Pictures) | ✅ | - | FIX-L6: slides.image.insert chèn ảnh đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:51) |
| Hình ảnh | Hình ảnh trực tuyến (Online Pictures) | ⚪ | - | Cần dịch vụ tìm kiếm hình ảnh đám mây |
| Hình ảnh | Ảnh chụp màn hình (Screenshot / Screen Clipping) | 🔴 | 3 | Chưa có tính năng chụp cửa sổ màn hình nhúng vào slide |
| Hình ảnh | Album ảnh trình chiếu (Photo Album) | 🔴 | 3 | Chưa có wizard tạo album ảnh hàng loạt từ thư mục |
| Minh họa | Hình khối (Shapes Gallery) | ✅ | - | FIX-L6: slides.shape.insert chèn shape đối chiếu fill/line RGB và rotation (docs/SLIDES-BUTTON-MATRIX-1011.md:52) |
| Minh họa | SmartArt (Danh sách, Quy trình, Chu trình, Phân cấp) | 🔴 | 1 | Chưa hỗ trợ tạo mới SmartArt native chuẩn DrawingML diagram; hiện dùng sơ đồ nhóm shape (docs/SLIDES-BUTTON-MATRIX-1011.md:53) |
| Minh họa | Sơ đồ (Diagram) | ✅ | - | FIX-L12: slides.diagram.insert sơ đồ nhóm 7 shape đối chiếu COM Shape.Type=6 (docs/SLIDES-BUTTON-MATRIX-1011.md:53) |
| Minh họa | Biểu đồ (Chart: Cột, Đường, Tròn, Thanh) | ✅ | - | FIX-L6: slides.insert.chart chèn biểu đồ ChartType 51 đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:54) |
| Phần bổ trợ | Cửa hàng Office Store / Add-in của tôi | ⚪ | - | Cần kết nối dịch vụ cửa hàng Microsoft Office |
| Liên kết | Siêu liên kết (Hyperlink, Ctrl+K) | 🟢 | - | common.edit.hyperlink; gắn liên kết URL hoặc liên kết tới slide khác |
| Liên kết | Tác vụ (Action: Chuyển slide khi click/hover) | 🟢 | - | slides.insert.action; hộp thoại và điều hướng khi nhấp lúc trình chiếu (apps/slides/slides-canvas.js; adapters/libreoffice/slides/slides-adapter.js) |
| Nhận xét | Nhận xét mới (New Comment) | ✅ | - | FIX-L10: slides.review.commentInsert chèn nhận xét đối chiếu Slide.Comments (docs/SLIDES-BUTTON-MATRIX-1011.md:55) |
| Văn bản | Hộp văn bản (Text Box) | ✅ | - | FIX-L6: slides.text.insert chèn textbox đối chiếu msoTextBox (docs/SLIDES-BUTTON-MATRIX-1011.md:56) |
| Văn bản | Đầu trang & Chân trang (Header & Footer) | ✅ | - | FIX-L12: slides.insert.headerFooter bật footer đối chiếu Footer.Visible=-1 (docs/SLIDES-BUTTON-MATRIX-1011.md:58) |
| Văn bản | Chữ nghệ thuật (WordArt) | 🟡 | 1 | FIX-L14: có lệnh slides.insert.wordart nhưng PowerPoint COM nhận dạng Type=17 PresetTextEffect=-2 chưa chuẩn native Type=15 (docs/SLIDES-BUTTON-MATRIX-1011.md:57) |
| Văn bản | Ngày & Giờ (Date & Time) | ✅ | - | FIX-L12: slides.insert.dateTime định dạng dd/MM/yyyy DateAndTime.Visible=-1 (docs/SLIDES-BUTTON-MATRIX-1011.md:59) |
| Văn bản | Số trang chiếu (Slide Number) | ✅ | - | FIX-L12: slides.insert.slideNumber bật số trang SlideNumber.Visible=-1 (docs/SLIDES-BUTTON-MATRIX-1011.md:60) |
| Văn bản | Đối tượng nhúng OLE (Object) | 🔴 | 3 | Chưa hỗ trợ nhúng đối tượng OLE bên ngoài |
| Ký hiệu | Phương trình toán học (Equation) | 🔴 | 2 | Chưa có thanh công cụ gõ phương trình toán học MathML/OMML |
| Ký hiệu | Ký hiệu (Symbol) | ✅ | - | FIX-L12: slides.insert.symbol chèn ký hiệu TM đối chiếu nội dung shape (docs/SLIDES-BUTTON-MATRIX-1011.md:61) |
| Phương tiện | Video từ tệp | ✅ | - | FIX-L12: slides.media.insertVideo chèn video đối chiếu COM Type=16 MediaType=3 (docs/SLIDES-BUTTON-MATRIX-1011.md:62) |
| Phương tiện | Video trực tuyến (Online Video) | 🔴 | 3 | Chưa hỗ trợ nhúng video trực tuyến YouTube/Vimeo |
| Phương tiện | Âm thanh từ tệp (Audio) | ✅ | - | FIX-L12: slides.media.insertAudio chèn âm thanh đối chiếu COM MediaType=2 (docs/SLIDES-BUTTON-MATRIX-1011.md:63) |
| Phương tiện | Ghi âm giọng nói (Record Audio) | 🔴 | 3 | Chưa có micro ghi âm trực tiếp vào slide |
| Phương tiện | Ghi màn hình (Screen Recording) | 🔴 | 3 | Chưa có công cụ quay màn hình nhúng vào slide |

### Thiết kế

| Nhóm | Tính năng PowerPoint 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Slides |
|---|---|---|---|---|
| Chủ đề | Chủ đề (Themes Gallery) | ✅ | - | FIX-L12: slides.design.themeGallery chọn chủ đề Than Chì Hiện Đại đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:64) |
| Chủ đề | Mẫu Slide Master | ✅ | - | FIX-L12: slides.master.apply chọn theme palette và font scheme đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:65) |
| Chủ đề | Duyệt tìm chủ đề (Browse for Themes: .thmx) | 🔴 | 2 | Chưa hỗ trợ nạp tệp chủ đề bên ngoài (.thmx) |
| Chủ đề | Lưu chủ đề hiện tại (Save Current Theme) | 🔴 | 3 | Chưa có chức năng lưu chủ đề tùy chỉnh thành tệp .thmx |
| Biến thể | Bảng màu biến thể (Theme Colors) | ✅ | - | slides.design.themeColors: 7 bảng màu; PowerPoint COM ThemeColorScheme accent1/nền/tiêu đề khớp (apps/slides/slides-canvas.js:9382, scripts/audit-0610/ppt_theme_readback.ps1:2) |
| Biến thể | Bộ phông chữ biến thể (Theme Fonts) | ✅ | - | slides.design.themeFonts: 6 bộ phông; PowerPoint COM MajorFont/MinorFont = Georgia (apps/slides/slides-canvas.js:9382, scripts/audit-0610/ppt_theme_readback.ps1:2) |
| Biến thể | Hiệu ứng biến thể (Theme Effects) | 🟡 | 3 | Có áp dụng hiệu ứng chung; chưa có bộ sưu tập hiệu ứng biến thể rời |
| Biến thể | Kiểu nền trang chiếu (Background Styles) | 🔴 | 2 | Chưa có thư viện kiểu nền mẫu (Background Styles gallery) |
| Tùy chỉnh | Cỡ trang chiếu (Slide Size 4:3 / 16:9) | ✅ | - | FIX-L8: slides.design.slideSize đổi tỷ lệ đối chiếu PageSetup 720x540 pt (docs/SLIDES-BUTTON-MATRIX-1011.md:66, docs/ppt-oracle-1710.json:37-43) |
| Tùy chỉnh | Kích thước trang chiếu tùy chỉnh (Custom Slide Size) | ✅ | - | 17/10: slides.design.slideSize có mục Tùy chỉnh (cm, 2,54-142,24); CDP 10/10; PowerPoint 2016 COM đọc SlideWidth/Height 842x595 pt, ppSlideSizeCustom; mở lại đúng (docs/AUDIT-SLIDES-SIZE-1710.md:7) |
| Tùy chỉnh | Định dạng nền: Màu đơn sắc (Solid Fill) | ✅ | - | FIX-L8: slides.design.formatBackground nền gradient ngang Fill.Type=3 đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:67) |
| Tùy chỉnh | Định dạng nền: Chuyển sắc (Gradient Fill) | ✅ | - | FIX-L8: slides.design.formatBackground nền gradient ngang Fill.Type=3 đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:67) |
| Tùy chỉnh | Định dạng nền: Hình ảnh hoặc họa tiết (Picture or Texture Fill) | 🟡 | 2 | slides.design.formatBackground: nền hình ảnh theo từng trang hoặc cả bài, lưu PPTX; PowerPoint COM đọc lại Background.Fill.Type = 6 (picture), nền màu đơn = 1, chuyển sắc = 3 (apps/slides/slides-canvas.js:9522 applySlideBackground, scripts/audit-0610/ppt_bg_fill_readback.ps1:2); chưa có họa tiết lặp (texture) |
| Tùy chỉnh | Định dạng nền: Hoa văn (Pattern Fill) | 🔴 | 3 | Chưa có thư viện mẫu hoa văn pattern cho nền |
| Tùy chỉnh | Ẩn đồ họa nền (Hide Background Graphics) | ✅ | - | slides.design.hideBackground; PowerPoint COM đọc lại DisplayMasterShapes (ppt_hide_bg_readback.ps1) (apps/slides/slides-canvas.js:6837; scripts/audit-0610/ppt_hide_bg_readback.ps1:1) |

### Chuyển tiếp

| Nhóm | Tính năng PowerPoint 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Slides |
|---|---|---|---|---|
| Xem trước | Xem trước hiệu ứng chuyển tiếp (Preview) | 🟢 | - | slides.transition.preview chạy hiệu ứng trên khung soạn (CDP slides-transition-tab 9/9) |
| Chuyển tiếp sang slide | Hiệu ứng chuyển tiếp (Transitions Gallery) | ✅ | - | FIX-L4/L7: slides.transition.apply áp Push Right (3854) và Fade (3849) đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:68, docs/AUDIT-SLIDES-OFFICE-PARITY-1011.md:20) |
| Chuyển tiếp sang slide | Hiệu ứng Morph (Biến đổi hình thái) | 🟡 | 1 | Đã có xử lý chuyển đổi Morph sơ bộ; chưa hoàn thiện mapping đối tượng khớp định danh như PowerPoint 2016 Office 365 |
| Chuyển tiếp sang slide | Hiệu ứng Fade / Push / Wipe / Split / Cover | ✅ | - | Q8: PPTX lưu hiệu ứng native và PowerPoint 2016 COM đọc EntryEffect lần lượt Push=3853, Wipe=2817, Split=3585, Cover=1281; adapters/libreoffice/slides/slides-adapter.js:2316 ánh xạ từ mô hình, adapters/libreoffice/common/ooxml_zip_patch.py:13106 ghi OOXML. Hiệu ứng Lật cho kết quả COM=0 nên không cung cấp trong gallery. |
| Chuyển tiếp sang slide | Hiệu ứng 3D phức tạp (Curtains, Wind, Fracture, Origami) | 🔴 | 2 | Chưa hỗ trợ các hiệu ứng chuyển tiếp 3D dựng hình chuyên sâu |
| Chuyển tiếp sang slide | Tùy chọn hiệu ứng (Effect Options: Hướng chuyển động) | 🟢 | - | slides.transition.apply; apps/slides/slides-canvas.js lưu hướng (apps/slides/slides-canvas.js:10187); adapters/libreoffice/slides/slides-adapter.js ghi smil:subtype (adapters/libreoffice/slides/slides-adapter.js:1925, adapters/libreoffice/slides/slides-adapter.js:2246); PPTX dir (adapters/libreoffice/common/ooxml_zip_patch.py:12466) |
| Thời gian | Âm thanh chuyển tiếp (Sound) | 🔴 | 3 | Chưa hỗ trợ gán âm thanh khi chuyển tiếp trang chiếu |
| Thời gian | Thời lượng chuyển tiếp (Duration) | ✅ | - | FIX-L4/L7: PowerPoint COM đọc Duration=0.8 s khớp thời lượng chuyển tiếp (docs/SLIDES-BUTTON-MATRIX-1011.md:68, docs/AUDIT-SLIDES-OFFICE-PARITY-1011.md:20) |
| Thời gian | Áp dụng cho tất cả trang chiếu (Apply to All) | 🟢 | - | slides.transition.applyAll, hoàn tác một bước (CDP 9/9) |
| Thời gian | Chuyển khi nhấp chuột (On Mouse Click) | ✅ | - | slides.transition.advanceClick; PowerPoint COM đọc lại AdvanceOnClick (ppt_transition_readback.ps1) (apps/slides/slides-canvas.js:10235; scripts/audit-0610/ppt_transition_readback.ps1:1) |
| Thời gian | Chuyển tự động sau thời gian (After X seconds) | ✅ | - | slides.transition.advanceAfter (3/5/10/30 s); PowerPoint COM đọc lại AdvanceOnTime/AdvanceTime (apps/slides/slides-canvas.js:10235; scripts/audit-0610/ppt_transition_readback.ps1:1) |

### Hoạt ảnh

| Nhóm | Tính năng PowerPoint 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Slides |
|---|---|---|---|---|
| Xem trước | Xem trước hoạt ảnh (Preview) | 🟢 | - | slides.animation.preview chạy theo timeline (CDP slides-animation-tab 9/9) |
| Hoạt ảnh | Hiệu ứng đối tượng (Animations Gallery) | ✅ | - | FIX-L6: slides.animation.apply hiệu ứng Fade, Fly EffectType 10, 2 đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:69) |
| Hoạt ảnh | Nhóm Xuất hiện (Entrance Effects: Appear, Fade, Fly In, Float In, Zoom) | ✅ | - | FIX-L6: slides.animation.apply hiệu ứng Fade, Fly EffectType 10, 2 đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:69) |
| Hoạt ảnh | Nhóm Nhấn mạnh (Emphasis Effects: Pulse, Spin, Grow/Shrink) | ✅ | - | slides.animation.apply; Xoay tròn (EffectType 61), Phóng to/thu nhỏ (59) và Nhịp đập (75) lưu PPTX rồi PowerPoint 2016 COM đọc đúng (docs/AUDIT-SLIDES-ANIM-1710.md:12; tests/live/cdp/slides-pulse-effect.desktop.mjs; apps/slides/slide-animation-classes.js:15 pulse) |
| Hoạt ảnh | Nhóm Thoát (Exit Effects: Disappear, Fade, Fly Out) | ✅ | - | slides.animation.apply; Mờ dần ra, Bay ra, Thu nhỏ ra, Biến mất lưu PPTX rồi PowerPoint 2016 COM đọc đúng EffectType và Exit=-1 (docs/AUDIT-SLIDES-ANIM-1710.md:15) |
| Hoạt ảnh | Đường chuyển động (Motion Paths: Line, Arc, Custom Path) | 🔴 | 2 | Chưa hỗ trợ vẽ và chạy hoạt ảnh theo đường cong tự do Motion Path |
| Hoạt ảnh | Tùy chọn hiệu ứng (Effect Options: Hướng, Theo đoạn/khung) | 🟢 | - | slides.animation.effectOptions; direction được lưu qua preset-sub-type/presetSubtype (apps/slides/slides-canvas.js; adapters/libreoffice/slides/slides-adapter.js; adapters/libreoffice/common/ooxml_zip_patch.py) |
| Hoạt ảnh nâng cao | Thêm hoạt ảnh (Add Animation) | ✅ | - | slides.animation.add / slides.animation.addEffect: vào + thoát trên cùng một hình, lưu PPTX rồi PowerPoint 2016 COM đọc đủ cả hai (Exit=0 và -1; tests/live/cdp/slides-add-animation.desktop.mjs; apps/slides/slides-canvas.js:2540 addObjectAnimation) |
| Hoạt ảnh nâng cao | Ngăn hoạt ảnh (Animation Pane) | ✅ | - | FIX-L7: slides.animation.pane đổi thứ tự hiệu ứng đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:70) |
| Hoạt ảnh nâng cao | Kích hoạt (Trigger: On Click of Object) | ✅ | - | slides.animation.trigger: hộp thoại chọn hình kích hoạt; lưu PPTX rồi PowerPoint 2016 COM đọc InteractiveSequences=1 và TriggerShape đúng (tests/live/cdp/slides-animation-trigger.desktop.mjs; apps/slides/slides-canvas.js:2580 openAnimationTriggerDialog) |
| Hoạt ảnh nâng cao | Sao chép hoạt ảnh (Animation Painter) | ✅ | - | slides.animation.painter: lấy hiệu ứng ở lần nhấn 1, dán ở lần 2; PowerPoint COM đọc lại hai hiệu ứng Bay vào cùng hướng trái, sau hiệu ứng trước, 1,5 giây, trễ 0,5 giây (apps/slides/slides-canvas.js:2626 animationPainter, scripts/audit-0610/ppt_animation_all_readback.ps1:2) |
| Thời gian | Bắt đầu (Start: On Click, With Previous, After Previous) | ✅ | - | slides.animation.startMenu; PowerPoint COM đọc lại TriggerType=AfterPrevious, Duration, Delay (ppt_anim_readback.ps1) (apps/slides/slides-canvas.js:2117; scripts/audit-0610/ppt_anim_readback.ps1:2) |
| Thời gian | Thời lượng hoạt ảnh (Duration) | ✅ | - | FIX-L6: PowerPoint COM đọc duration 0.8/0.8/0.5 s khớp timeline (docs/SLIDES-BUTTON-MATRIX-1011.md:69) |
| Thời gian | Độ trễ hoạt ảnh (Delay) | 🟢 | - | slides.animation.apply; cấu hình độ trễ (delay) trong hộp thoại Hiệu ứng đối tượng |
| Thời gian | Đổi thứ tự: Lên trước (Move Earlier) | ✅ | - | FIX-L7: slides.animation.pane đổi thứ tự hiệu ứng đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:70) |
| Thời gian | Đổi thứ tự: Xuống sau (Move Later) | ✅ | - | FIX-L7: slides.animation.pane đổi thứ tự hiệu ứng đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:70) |

### Trình chiếu

| Nhóm | Tính năng PowerPoint 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Slides |
|---|---|---|---|---|
| Bắt đầu trình chiếu | Từ đầu (From Beginning, F5) | 🟢 | - | slides.show.startFromBegin; mở overlay trình chiếu toàn màn hình từ slide 1 (docs/SLIDES-BUTTON-MATRIX-1011.md:71) |
| Bắt đầu trình chiếu | Từ trang hiện tại (From Current Slide, Shift+F5) | 🟢 | - | slides.show.startFromCurrent; mở trình chiếu từ slide đang chọn (docs/SLIDES-BUTTON-MATRIX-1011.md:72) |
| Bắt đầu trình chiếu | Trình chiếu trực tuyến (Present Online) | ⚪ | - | Cần dịch vụ phát trực tuyến của Microsoft |
| Bắt đầu trình chiếu | Trình chiếu tùy chỉnh (Custom Slide Show) | 🔴 | 3 | Chưa có tính năng tạo bản trình chiếu tùy chỉnh (Custom Slide Show) |
| Thiết lập | Thiết lập trình chiếu (Set Up Slide Show) | ✅ | - | FIX-L10: slides.show.setupShow lặp liên tục LoopUntilStopped=-1 đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:74) |
| Thiết lập | Lặp lại liên tục cho đến khi nhấn Esc (Loop) | ✅ | - | FIX-L10: slides.show.setupShow lặp liên tục LoopUntilStopped=-1 đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:74) |
| Thiết lập | Ẩn trang chiếu (Hide Slide) | ✅ | - | FIX-L5/L6: slides.slide.toggleHidden ẩn slide đối chiếu Hidden=-1 (docs/SLIDES-BUTTON-MATRIX-1011.md:75, docs/AUDIT-SLIDES-OFFICE-PARITY-1011.md:22) |
| Thiết lập | Tập dượt hẹn giờ (Rehearse Timings) | 🟢 | - | slides.show.rehearseTimings; chế độ tập dượt đo thời gian từng slide (docs/SLIDES-BUTTON-MATRIX-1011.md:76) |
| Thiết lập | Ghi lại trình chiếu (Record Slide Show) | 🔴 | 2 | Chưa hỗ trợ thu âm và lưu timeline trình diễn vào deck |
| Thiết lập | Phát thuyết minh (Play Narrations) | 🔴 | 3 | Chưa có tùy chọn bật/tắt phát thuyết minh |
| Thiết lập | Sử dụng thời gian tập dượt (Use Timings) | 🟢 | - | slides.show.setupShow: ô tích Dùng thời gian đã đặt để tự chuyển trang (mặc định bật): bật thì trang có «Sau N giây» tự sang trang kế, tắt thì đứng yên (tests/live/cdp/slides-use-timings.desktop.mjs 6/6, platform/commands/command-definitions.js:729); lưu PPTX thành p:showPr useTimings="0" và PowerPoint 2016 COM đọc SlideShowSettings.AdvanceMode = 1 (thủ công), mở lại giữ (tests/live/cdp/slides-use-timings-save.desktop.mjs, scripts/audit-0610/ppt_show_timings_readback.ps1); áp dụng cho thời gian đặt ở Chuyển tiếp, chưa tự dùng thời gian đã Tập dượt |
| Thiết lập | Hiện thanh điều khiển phương tiện (Show Media Controls) | 🔴 | 3 | Chưa có tùy chọn ẩn/hiện thanh điều khiển phương tiện khi chiếu |
| Màn hình | Chọn màn hình phát (Monitors) | 🔴 | 2 | Chưa có menu chọn màn hình hiển thị trình chiếu ngoài Presenter View |
| Màn hình | Chế độ Presenter (Presenter View, Alt+F5) | 🟢 | - | slides.show.presenterMode; giao diện người thuyết trình xem trước slide kế tiếp và ghi chú (docs/SLIDES-BUTTON-MATRIX-1011.md:73) |
| Diễn giả | Ghi chú thuyết trình (Speaker Notes) | ✅ | - | FIX-L4/L6: slides.notes.toggle ghi chú diễn giả đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:77, docs/AUDIT-SLIDES-OFFICE-PARITY-1011.md:19) |
| Điều khiển chiếu | Bút vẽ và con trỏ Laser khi đang chiếu | 🟢 | - | Ctrl+P bút, Ctrl+L laser, Ctrl+A mũi tên, tẩy nét: laser đo đúng vị trí chuột, bút để lại nét nhìn thấy (200x80 px khi kéo 200x80), một lần kéo một nét, tẩy xóa hết; sửa lỗi Ctrl+P mở Xem trước khi in phủ lên bài chiếu và nét vẽ tạo sai namespace SVG nên không hiện (tests/live/cdp/slides-show-pen-laser.desktop.mjs 7/7, apps/slides/slides-canvas.js:11963); thoát chiếu và Giữ chú thích thì nét thành hình tự do, lưu PPTX rồi PowerPoint 2016 COM đọc Type=5 (freeform) 183.8x60.9 pt, nét 3 pt màu #DC2626 đúng (tests/live/cdp/slides-ink-keep.desktop.mjs, scripts/audit-0610/ppt_ink_readback.ps1) |

### Xem lại

| Nhóm | Tính năng PowerPoint 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Slides |
|---|---|---|---|---|
| Kiểm lỗi | Chính tả (Spelling, F7) | 🟢 | - | slides.review.spellCheck; kiểm tra chính tả tiếng Việt (docs/SLIDES-BUTTON-MATRIX-1011.md:78) |
| Kiểm lỗi | Bật/tắt gạch chân kiểm lỗi chính tả | 🟢 | - | slides.review.toggleSpellCheck; ẩn hiện đường lượn sóng đỏ (docs/SLIDES-BUTTON-MATRIX-1011.md:79) |
| Kiểm lỗi | Từ điển đồng nghĩa (Thesaurus, Shift+F7) | 🔴 | 3 | Chưa tích hợp từ điển đồng nghĩa chuyên sâu |
| Thông tin chuyên sâu | Tra cứu thông minh (Smart Lookup) | ⚪ | - | Cần dịch vụ tìm kiếm thông minh Bing |
| Ngôn ngữ | Dịch văn bản (Translate) | ⚪ | - | Cần dịch vụ dịch máy đám mây |
| Ngôn ngữ | Chọn ngôn ngữ kiểm lỗi (Language) | 🔴 | 2 | Chưa có hộp thoại chọn ngôn ngữ kiểm tra chính tả (Language) |
| Nhận xét | Nhận xét mới (New Comment) | ✅ | - | FIX-L10: slides.review.commentInsert chèn nhận xét đối chiếu Slide.Comments (docs/SLIDES-BUTTON-MATRIX-1011.md:80) |
| Nhận xét | Xóa nhận xét (Delete Comment) | ✅ | - | FIX-L10: slides.review.commentDelete xóa nhận xét đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:81) |
| Nhận xét | Nhận xét trước (Previous Comment) | 🟢 | - | slides.review.commentPrevious; điều hướng tới nhận xét trước (docs/SLIDES-BUTTON-MATRIX-1011.md:82) |
| Nhận xét | Nhận xét sau (Next Comment) | 🟢 | - | slides.review.commentNext; điều hướng tới nhận xét kế tiếp (docs/SLIDES-BUTTON-MATRIX-1011.md:83) |
| Nhận xét | Đánh dấu đã xử lý (Resolve Comment) | 🟢 | - | slides.review.commentResolve; đánh dấu nhận xét đã giải quyết (docs/SLIDES-BUTTON-MATRIX-1011.md:84) |
| Nhận xét | Hiện/ẩn ngăn nhận xét (Show Comments) | 🟢 | - | slides.review.toggleComments: nút Hiện nhận xét trên tab Đánh giá bật/tắt ngăn nhận xét, hiện nhận xét đã thêm, Esc ẩn (tests/live/cdp/slides-toggle-comments.desktop.mjs 5/5, platform/commands/command-definitions.js:595); thao tác giao diện, không có đối chiếu PowerPoint thật |
| So sánh | So sánh bản trình bày (Compare Presentations) | 🔴 | 3 | Chưa có công cụ so sánh song song hai tệp PPTX |
| So sánh | Chấp nhận / Từ chối thay đổi (Accept / Reject Revision) | 🔴 | 3 | Chưa có quy trình duyệt thay đổi revision trong slide |

### Chế độ xem

| Nhóm | Tính năng PowerPoint 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Slides |
|---|---|---|---|---|
| Chế độ xem bản trình bày | Bình thường (Normal View) | ✅ | - | FIX-L14: slides.view.normal chuyển chế độ ppViewNormal ViewType=9 đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:85) |
| Chế độ xem bản trình bày | Bộ sắp xếp trang (Slide Sorter View) | ✅ | - | FIX-L14: slides.view.slideSorter bộ sắp xếp trang ppViewSlideSorter ViewType=7 đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:86) |
| Chế độ xem bản trình bày | Chế độ dàn bài (Outline View) | 🟢 | - | slides.view.outline: sửa tiêu đề/nội dung mọi trang, Ctrl+Enter thêm trang, hoàn tác (apps/slides/slides-canvas.js:8063; CDP 7/8 mục tests/live/cdp/slides-outline-view.desktop.mjs:1); chưa đối chiếu PowerPoint |
| Chế độ xem bản trình bày | Trang ghi chú (Notes Page View) | 🟢 | - | slides.view.notesPage: trang thu nhỏ kèm ô ghi chú, ghi chú lưu notesSlide1.xml (apps/slides/slides-canvas.js:7964; CDP 7/7 tests/live/cdp/slides-notes-page.desktop.mjs:1); chưa đối chiếu PowerPoint |
| Chế độ xem bản trình bày | Chế độ đọc (Reading View) | 🟢 | - | slides.view.reading; hiển thị trình chiếu trong cửa sổ ứng dụng (docs/SLIDES-BUTTON-MATRIX-1011.md:88) |
| Chế độ xem bản cái | Slide Master (Trang chiếu cái) | 🔴 | 2 | Chưa có giao diện thiết kế và chỉnh sửa Slide Master (chỉ có áp dụng qua slides.master.apply) |
| Chế độ xem bản cái | Handout Master (Bản phát tài liệu cái) | 🔴 | 3 | Chưa có giao diện thiết kế bố cục in bản phát tài liệu |
| Chế độ xem bản cái | Notes Master (Ghi chú cái) | 🔴 | 3 | Chưa có giao diện thiết kế bố trí trang in ghi chú |
| Hiển thị | Thước (Ruler) | 🟢 | - | slides.view.ruler; hiển thị thước đo ngang và dọc (docs/SLIDES-BUTTON-MATRIX-1011.md:90) |
| Hiển thị | Đường lưới (Gridlines) | 🟢 | - | slides.view.gridlines; hiển thị lưới tọa độ căn hình (docs/SLIDES-BUTTON-MATRIX-1011.md:91) |
| Hiển thị | Đường dẫn hướng (Guides) | 🟢 | - | slides.view.guides; hiển thị đường guide căn chỉnh thông minh (docs/SLIDES-BUTTON-MATRIX-1011.md:92) |
| Hiển thị | Ghi chú (Notes Pane toggle) | ✅ | - | FIX-L4/L6: slides.notes.toggle bật tắt vùng ghi chú diễn giả (docs/SLIDES-BUTTON-MATRIX-1011.md:87) |
| Thu phóng | Thu phóng (Zoom Dialog) | 🟢 | - | slides.view.zoomDialog: nhập phần trăm 50–200 chính xác (75% đúng 0,75), nút 200/100/75/50, Vừa cửa sổ, bấm số % thanh trạng thái cũng mở; khoảng 10–400% của bản gốc chưa có (CDP tests/live/cdp/slides-zoom-dialog.desktop.mjs; apps/slides/slides-zoom-dialog.js:5 hộp thoại) |
| Thu phóng | Phóng to (Zoom In) | ✅ | - | FIX-L14: slides.view.zoomIn bước tăng 10 điểm phần trăm đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:93) |
| Thu phóng | Thu nhỏ (Zoom Out) | ✅ | - | FIX-L14: slides.view.zoomOut bước giảm 10 điểm phần trăm đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:94) |
| Thu phóng | 100% (Zoom Reset) | ✅ | - | FIX-L14: slides.view.zoomReset đặt lại 100% đối chiếu View.Zoom=100 (docs/SLIDES-BUTTON-MATRIX-1011.md:95) |
| Thu phóng | Vừa cửa sổ (Fit to Window) | ✅ | - | FIX-L14: slides.view.fitToWindow bật View.ZoomToFit=true đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:96) |
| Màu sắc | Màu / Thang độ xám / Đen trắng (Color, Grayscale, B&W) | 🟡 | 2 | Chế độ hiển thị màn hình luôn là màu; chưa có bộ lọc xem thử thang độ xám trước khi in |
| Cửa sổ | Cửa sổ mới (New Window) | 🟡 | 2 | FIX-L13: desktop WebView đơn phiên bản trình chiếu; chưa mở nhiều cửa sổ độc lập cho cùng 1 deck (docs/SLIDES-BUTTON-MATRIX-1011.md:97) |
| Cửa sổ | Sắp xếp tất cả / Xếp tầng (Arrange All / Cascade) | 🔴 | 3 | Chưa có tính năng sắp xếp nhiều cửa sổ song song |
| Cửa sổ | Di chuyển thanh chia (Move Split) | 🔴 | 3 | Chưa có phím tắt di chuyển thanh chia ngăn (Move Split) |
| Macro | Ghi Macro (Record Macro) | 🟢 | - | common.macro.recordToggle; bộ ghi macro cục bộ VN Office (docs/SLIDES-BUTTON-MATRIX-1011.md:98) |
| Macro | Xem và chạy Macro (Alt+F8) | 🟢 | - | common.macro.manager; quản lý danh sách macro cục bộ (docs/SLIDES-BUTTON-MATRIX-1011.md:99) |
| Trợ giúp | Trợ giúp (Help, F1) | 🟢 | - | slides.help.open; hướng dẫn sử dụng tiếng Việt trong ứng dụng (docs/SLIDES-BUTTON-MATRIX-1011.md:100) |
| Trợ giúp | Giới thiệu bản quyền (About) | 🟢 | - | common.help.about; thông tin phiên bản VN Slides (docs/SLIDES-BUTTON-MATRIX-1011.md:101) |

### Công cụ vẽ > Định dạng

| Nhóm | Tính năng PowerPoint 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Slides |
|---|---|---|---|---|
| Chèn hình | Sửa điểm vẽ tự do (Edit Points) | 🟡 | 2 | Có vẽ hình tự do Bezier; chưa có giao diện kéo điểm nút trực quan |
| Chèn hình | Đổi hình dạng (Change Shape) | ✅ | - | slides.shape.changeType: đổi giữa chữ nhật, elip và 16 hình dựng sẵn, giữ vị trí/kích thước/màu; PowerPoint COM AutoShapeType elip=9, sao=92, mũi tên phải=33, tim=21 (apps/slides/slides-canvas.js:3110 changeShapeType, scripts/audit-0610/ppt_autoshape_readback.ps1:2) |
| Kiểu chữ WordArt | Tô màu chữ nghệ thuật (Text Fill) | 🔴 | 2 | Chưa có công cụ đổi màu tô chữ nghệ thuật độc lập trên ribbon |
| Kiểu chữ WordArt | Viền chữ nghệ thuật (Text Outline) | 🔴 | 2 | Chưa có công cụ đổi màu viền chữ nghệ thuật trên ribbon |
| Kiểu chữ WordArt | Hiệu ứng chữ nghệ thuật (Text Effects: Warp, Shadow, 3D) | 🟡 | 1 | FIX-L14: có textFadeRight nhưng PowerPoint COM nhận dạng PresetTextEffect=-2 chưa chuẩn native (docs/SLIDES-BUTTON-MATRIX-1011.md:57) |
| Sắp xếp | Lên trên một lớp (Bring Forward) | 🟢 | - | slides.arrange.bringForward; đưa đối tượng lên 1 bậc |
| Sắp xếp | Lên trên cùng (Bring to Front) | 🟢 | - | slides.arrange.bringToFront; đưa đối tượng lên đỉnh lớp vẽ |
| Sắp xếp | Xuống dưới một lớp (Send Backward) | 🟢 | - | slides.arrange.sendBackward; hạ đối tượng xuống 1 bậc |
| Sắp xếp | Xuống dưới cùng (Send to Back) | 🟢 | - | slides.arrange.sendToBack; hạ đối tượng xuống đáy lớp vẽ |
| Sắp xếp | Căn lề đối tượng (Align Left/Center/Right/Top/Middle/Bottom) | ✅ | - | Đo thực tế PowerPoint COM ShapeRange.Align đối chiếu hệ thống lệnh slides.arrange.alignLeft, slides.arrange.alignCenter (docs/ppt-oracle-1710.json:86-92, docs/POWERPOINT2016-FINDINGS-1710.md:24) |
| Sắp xếp | Phân phối đều khoảng cách (Distribute Horizontally / Vertically) | 🟢 | - | slides.arrange.distributeHorizontal, slides.arrange.distributeVertical; phân phối đều khoảng cách |
| Sắp xếp | Nhóm đối tượng (Group, Ctrl+G) | ✅ | - | FIX-L12: sơ đồ nhóm 7 đối tượng Shape.Type=6 đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:53, docs/POWERPOINT2016-FINDINGS-1710.md:23) |
| Sắp xếp | Rã nhóm đối tượng (Ungroup, Ctrl+Shift+G) | 🟢 | - | slides.shape.ungroup; giải phóng nhóm thành các hình riêng |
| Sắp xếp | Xoay và lật đối tượng (Rotate 90°, Flip) | ✅ | - | slides.arrange.rotateRight90, slides.arrange.rotateLeft90, slides.arrange.flipHorizontal, slides.arrange.flipVertical; PowerPoint COM đọc lại rotation/hflip/vflip (adapters/libreoffice/slides/slides-adapter.js:285, adapters/libreoffice/slides/slides-adapter.js:286, adapters/libreoffice/slides/slides-adapter.js:287, adapters/libreoffice/slides/slides-adapter.js:288; scripts/audit-0610/ppt_shape_format_readback.ps1:4) |
| Kích thước | Chiều cao đối tượng (Shape Height) | 🟢 | - | slides.shape.sizeDialog (Định dạng hình > Kích thước và vị trí…): đặt rộng, cao, góc xoay chính xác, hoàn tác/làm lại; lưu PPTX rồi PowerPoint 2016 COM đọc Width=320, Height=120, Rotation=30, Left/Top=100 đúng (tests/live/cdp/slides-shape-size-dialog.desktop.mjs, scripts/audit-0610/ppt_shape_size_readback.ps1, platform/commands/command-definitions.js:757); nhập trong hộp thoại chứ chưa có ô nhập ngay trên ruy-băng |
| Kích thước | Chiều rộng đối tượng (Shape Width) | 🟢 | - | slides.shape.sizeDialog (Định dạng hình > Kích thước và vị trí…): đặt rộng, cao, góc xoay chính xác, hoàn tác/làm lại; lưu PPTX rồi PowerPoint 2016 COM đọc Width=320, Height=120, Rotation=30, Left/Top=100 đúng (tests/live/cdp/slides-shape-size-dialog.desktop.mjs, scripts/audit-0610/ppt_shape_size_readback.ps1, platform/commands/command-definitions.js:757); nhập trong hộp thoại chứ chưa có ô nhập ngay trên ruy-băng |
| Kích thước | Khóa tỷ lệ khung hình (Lock Aspect Ratio) | 🔴 | 2 | Chưa có tùy chọn khóa tỷ lệ khung hình (Lock Aspect Ratio) |

### Công cụ hình ảnh > Định dạng

| Nhóm | Tính năng PowerPoint 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Slides |
|---|---|---|---|---|
| Điều chỉnh | Xóa nền ảnh tự động (Remove Background) | 🔴 | 2 | Chưa tích hợp thuật toán AI/canvas bóc tách nền ảnh tự động |
| Điều chỉnh | Hiệu chỉnh độ sáng và tương phản (Corrections) | 🟡 | 2 | Có bộ lọc CSS brightness/contrast; chưa lưu native vào DrawingML blip |
| Điều chỉnh | Màu sắc ảnh (Color Tone / Recolor) | 🟡 | 2 | Có grayscale/sepia; chưa có bộ lọc màu sắc phong phú như Office |
| Điều chỉnh | Hiệu ứng nghệ thuật (Artistic Effects) | 🔴 | 3 | Chưa có bộ lọc hiệu ứng tranh vẽ/kính mờ |
| Điều chỉnh | Nén ảnh (Compress Pictures) | 🔴 | 3 | Chưa có công cụ giảm độ phân giải DPI ảnh để tối ưu dung lượng deck |
| Điều chỉnh | Đổi ảnh khác (Change Picture) | 🔴 | 2 | Chưa có lệnh thay thế ảnh giữ nguyên vị trí/kích thước |
| Điều chỉnh | Đặt lại ảnh (Reset Picture) | 🔴 | 2 | Chưa có lệnh đặt lại kích thước/định dạng ảnh ban đầu |
| Kiểu ảnh | Kiểu khung viền ảnh (Picture Styles Gallery) | 🟡 | 2 | Có viền và bóng cơ bản; chưa có thư viện khung viền mỹ thuật |
| Kiểu ảnh | Viền ảnh (Picture Border) | 🔴 | 2 | Chưa có công cụ viền ảnh trên ribbon |
| Kiểu ảnh | Hiệu ứng ảnh (Picture Effects: Shadow, Glow, Soft Edges) | 🟡 | 2 | Hỗ trợ đổ bóng và phát sáng; chưa có 3D rotation |
| Kiểu ảnh | Bố cục ảnh sang SmartArt (Picture Layout) | 🔴 | 3 | Chưa hỗ trợ chuyển đổi ảnh vào sơ đồ SmartArt |
| Kích thước | Cắt xén ảnh (Crop to Shape / Aspect Ratio) | ✅ | - | slides.picture.cropDrag kéo tay cầm cắt trực tiếp, slides.picture.cropRatio theo tỉ lệ, slides.picture.cropDialog theo số đo; lưu PPTX rồi PowerPoint 2016 COM đọc CropRight 37.5 pt, CropTop 22.5 pt, khung 300×180 (tests/live/cdp/slides-crop-drag.desktop.mjs; apps/slides/slides-canvas.js:3404 toggleCropMode) |

### Công cụ bảng > Thiết kế

| Nhóm | Tính năng PowerPoint 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Slides |
|---|---|---|---|---|
| Tùy chọn kiểu | Hàng tiêu đề (Header Row) | 🟢 | - | slides.table.optHeaderRow bật tắt hàng tiêu đề: chữ đậm và tô màu theo kiểu; màu được lưu thành màu nền ô, chưa ghi cờ firstRow của PowerPoint (tests/live/cdp/slides-table-design.desktop.mjs) |
| Tùy chọn kiểu | Hàng tổng cộng (Total Row) | 🟢 | - | slides.table.optTotalRow làm hàng cuối nổi bật; lưu thành màu nền ô (tests/live/cdp/slides-table-design.desktop.mjs) |
| Tùy chọn kiểu | Hàng sọc xen kẽ (Banded Rows) | 🟢 | - | slides.table.optBandedRows tô xen kẽ hàng; lưu thành màu nền ô, PowerPoint COM đọc đúng màu từng ô (tests/live/cdp/slides-table-design.desktop.mjs) |
| Tùy chọn kiểu | Cột đầu tiên / Cột cuối cùng (First/Last Column) | 🟢 | - | slides.table.optFirstCol và slides.table.optLastCol tô màu cột đầu hoặc cuối; lưu thành màu nền ô (tests/live/cdp/slides-table-design.desktop.mjs) |
| Tùy chọn kiểu | Cột sọc xen kẽ (Banded Columns) | 🟢 | - | slides.table.optBandedCols tô xen kẽ cột; lưu thành màu nền ô (tests/live/cdp/slides-table-design.desktop.mjs) |
| Kiểu bảng | Thư viện kiểu dáng bảng (Table Styles Gallery) | 🟢 | - | slides.table.style có 6 bảng màu nhạt cộng Không kiểu; màu lưu thành màu nền ô, chưa ghi tableStyleId của PowerPoint nên mở lại trong PowerPoint không đổi kiểu theo (tests/live/cdp/slides-table-design.desktop.mjs) |
| Kiểu bảng | Tô màu nền ô (Table Shading) | ✅ | - | slides.table.shading tô ô, vùng ô hoặc cả bảng; lưu PPTX rồi PowerPoint 2016 COM đọc đúng màu nền từng ô FFFF00 và BDD7EE, ô không tô là FFFFFF (tests/live/cdp/slides-table-design.desktop.mjs; apps/slides/slides-canvas.js:3795 setTableShading, platform/commands/command-definitions.js:645) |
| Kiểu bảng | Đường viền bảng (Table Borders: Tất cả, Viền ngoài, Không viền) | 🟢 | - | bốn lệnh slides.table.bordersAll, slides.table.bordersOutside, slides.table.bordersInside, slides.table.bordersNone cho vùng chọn hoặc cả bảng; lưu PPTX rồi PowerPoint 2016 COM đọc đúng từng cạnh có viền hoặc không viền nhưng độ dày đọc ra 1,47 pt thay vì 0,75 pt đặt (tests/live/cdp/slides-table-borders.desktop.mjs; apps/slides/slides-canvas.js:3759 setTableBorders) |

### Công cụ bảng > Bố trí

| Nhóm | Tính năng PowerPoint 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Slides |
|---|---|---|---|---|
| Hàng & Cột | Chèn hàng trên / dưới (Insert Above / Below) | ✅ | - | 17/10: slides.table.insertRowAbove, slides.table.insertRowBelow; CDP 17/17, hoàn tác một bước, vùng gộp dài thêm (docs/AUDIT-SLIDES-TABLE-1710.md:8) |
| Hàng & Cột | Chèn cột trái / phải (Insert Left / Right) | ✅ | - | 17/10: slides.table.insertColLeft, slides.table.insertColRight; CDP 17/17, hoàn tác một bước (docs/AUDIT-SLIDES-TABLE-1710.md:9) |
| Hàng & Cột | Xóa hàng / Xóa cột / Xóa bảng (Delete) | ✅ | - | 17/10: slides.table.deleteRow, slides.table.deleteCol, slides.table.deleteTable; CDP 17/17, không mất chữ ô neo (docs/AUDIT-SLIDES-TABLE-1710.md:10) |
| Gộp ô | Gộp ô (Merge Cells) | ✅ | - | 17/10: slides.table.mergeCells; lưu PPTX rồi PowerPoint 2016 COM đọc đúng 2 vùng gộp, mở lại VN Slides đọc đúng (docs/AUDIT-SLIDES-TABLE-1710.md:11) |
| Gộp ô | Tách ô (Split Cells) | ✅ | - | 17/10: slides.table.splitCell; CDP 17/17, hoàn tác một bước (docs/AUDIT-SLIDES-TABLE-1710.md:12) |
| Kích thước ô | Chiều cao hàng / Chiều rộng cột bảng | ✅ | - | slides.table.cellSize đặt chiều cao hàng và bề rộng cột theo cm; lưu PPTX rồi PowerPoint 2016 COM đọc đúng hàng 40, 71, 40 pt và cột 140, 227, 140 pt, mở lại giữ đúng tỉ lệ (tests/live/cdp/slides-table-sizes.desktop.mjs; apps/slides/slides-canvas.js:3675 openTableSizeDialog, platform/commands/command-definitions.js:666) |
| Kích thước ô | Phân phối đều hàng / cột (Distribute Rows / Columns) | ✅ | - | slides.table.distributeRows và slides.table.distributeCols cho cả bảng hoặc vùng chọn; lưu PPTX rồi PowerPoint 2016 COM đọc hàng 50,3 pt bằng nhau và cột 169 pt bằng nhau (tests/live/cdp/slides-table-sizes.desktop.mjs; apps/slides/slides-canvas.js:3661 distributeTable, platform/commands/command-definitions.js:664) |
| Căn chỉnh ô | Căn lề ô: Trái, Giữa, Phải, Trên, Giữa dọc, Dưới | ✅ | - | sáu lệnh slides.table.alignLeft đến slides.table.alignBottom; lưu PPTX rồi PowerPoint 2016 COM đọc halign 2 giữa, 3 phải và valign 3 giữa dọc đúng từng ô (tests/live/cdp/slides-table-align.desktop.mjs; platform/commands/command-definitions.js:653, platform/commands/command-definitions.js:658) |

### Công cụ biểu đồ > Thiết kế

| Nhóm | Tính năng PowerPoint 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Slides |
|---|---|---|---|---|
| Bố cục | Thêm thành phần biểu đồ (Trục, Tiêu đề, Nhãn, Chú giải) | 🔴 | 2 | Chưa có menu Thêm thành phần biểu đồ (Add Chart Element) |
| Bố cục | Bố cục nhanh (Quick Layout) | 🔴 | 2 | Chưa có thư viện bố cục dựng sẵn Quick Layout cho biểu đồ |
| Kiểu biểu đồ | Đổi bảng màu chuỗi dữ liệu (Change Colors) | 🔴 | 2 | Chưa có menu đổi bảng màu chuỗi dữ liệu biểu đồ trên ribbon |
| Kiểu biểu đồ | Thư viện kiểu biểu đồ (Chart Styles Gallery) | 🔴 | 2 | Chưa có thư viện kiểu dáng biểu đồ Chart Styles trên ribbon |
| Dữ liệu | Chuyển hàng và cột dữ liệu (Switch Row/Column) | 🔴 | 2 | Chưa hỗ trợ chuyển đổi nhanh hàng/cột ma trận số liệu biểu đồ |
| Dữ liệu | Chọn dữ liệu nguồn (Select Data) | 🟢 | - | slides.chart.editData mở hộp thoại sửa tiêu đề, nhãn và giá trị (một chuỗi dữ liệu), cùng slides.chart.setType đổi kiểu cột, đường, tròn, miền; lưu PPTX rồi PowerPoint 2016 COM đọc ChartType 4 cho biểu đồ đường, tiêu đề và giá trị 10,20,15 đúng; chưa chọn lại dải ô nguồn hay nhiều chuỗi (tests/live/cdp/slides-chart-design.desktop.mjs; apps/slides/slides-canvas.js:4005 editChart) |
| Dữ liệu | Chỉnh sửa dữ liệu nguồn (Edit Data in Excel/Grid) | 🟢 | - | tab Thiết kế biểu đồ > Sửa dữ liệu mở bảng số liệu của biểu đồ để sửa nhãn và giá trị; hoàn tác; lưu PPTX (tests/live/cdp/slides-chart-design.desktop.mjs; platform/commands/command-definitions.js:630); chưa mở sửa trong Excel (không liên kết sổ tính ngoài) |
| Loại | Thay đổi loại biểu đồ (Change Chart Type) | 🟢 | - | tab Thiết kế biểu đồ > Đổi kiểu: cột, đường, tròn, miền; giữ dữ liệu, vẽ lại, Ctrl+Z trả về; lưu PPTX rồi PowerPoint 2016 COM đọc ChartType (scripts/audit-0610/ppt_chart_readback.ps1; tests/live/cdp/slides-chart-design.desktop.mjs; platform/commands/command-definitions.js:629) |

### Công cụ phương tiện > Phát lại

| Nhóm | Tính năng PowerPoint 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Slides |
|---|---|---|---|---|
| Xem trước | Phát thử media (Play Video / Audio) | 🟡 | 2 | Phát video/audio qua thanh điều khiển native controls của thẻ media trên canvas (apps/slides/slides-canvas.js:4312); chưa có tab ribbon Phát lại riêng |
| Chỉnh sửa | Cắt tỉa thời lượng media (Trim Video / Audio) | 🔴 | 2 | Chưa có công cụ cắt ngắn điểm đầu và điểm kết thúc video/audio |
| Tùy chọn | Mức âm lượng media (Low, Medium, High, Mute) | 🟡 | 2 | Điều chỉnh âm lượng qua thanh trượt volume native của media trên canvas (apps/slides/slides-canvas.js:4312); chưa có nút âm lượng trên ribbon |
| Tùy chọn | Bắt đầu phát: Tự động / Khi nhấp chuột | 🟢 | - | slides.media.autoplay bật tắt tự phát; lưu thành lệnh play trong dãy chính như PowerPoint ghi (COM đọc 1 hiệu ứng chính), mở lại nhận đúng; chưa đọc được PlayOnEntry của tệp do LibreOffice ghi (tests/live/cdp/slides-media-playback.desktop.mjs; apps/slides/slides-canvas.js:3720 toggleMediaOption) |
| Tùy chọn | Lặp lại cho đến khi dừng (Loop until Stopped) | 🟢 | - | slides.media.loop; lưu thêm p:audio cMediaNode repeatCount indefinite đúng cấu trúc PowerPoint (bù phần LibreOffice bỏ), mở lại nhận đúng; COM chưa đọc được LoopUntilStopped của tệp này (tests/test_slides_media_loops.py; adapters/libreoffice/common/ooxml_zip_patch.py:12492 media loops) |

### Không thuộc ribbon

| Nhóm | Tính năng PowerPoint 2016 | Trạng thái | Ưu tiên | Ghi chú / đường dẫn trong VN Slides |
|---|---|---|---|---|
| Bàn phím | Điều hướng slide (PageUp, PageDown, Home, End) | 🟢 | - | slides.nav.prevSlide, slides.nav.nextSlide, slides.nav.firstSlide, slides.nav.lastSlide; phím tắt điều hướng slide |
| Bàn phím | Phím tắt định dạng chữ (Ctrl+B/I/U, Ctrl+Shift+>/<, Ctrl+Space) | ✅ | - | FIX-L4: Ctrl+B/I/U và thang tăng giảm cỡ chữ đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:27-31) |
| Bàn phím | Phím tắt trình chiếu (F5 Từ đầu, Shift+F5 Từ trang hiện tại, Esc Thoát) | 🟢 | - | slides.show.startFromBegin, startFromCurrent; phím tắt điều khiển trình diễn |
| Bàn phím | Phím tắt chỉnh sửa slide (Ctrl+M Thêm, Ctrl+D Nhân đôi, Delete Xóa) | ✅ | - | FIX-L8: slides.slide.new, duplicate, delete đối chiếu COM (docs/SLIDES-BUTTON-MATRIX-1011.md:20,22,23) |
| Chuột | Kéo thả thay đổi thứ tự trang trong danh sách thumbnail | 🟢 | - | Kéo thả trực tiếp slide thumbnail để sắp xếp thứ tự (apps/slides/slides-canvas.js:7310, apps/slides/slides-canvas.js:7387) |
| Chuột | Kéo các góc/chốt đối tượng để đổi kích thước và xoay | 🟢 | - | Chốt điều khiển 8 hướng và xoay đối tượng (apps/slides/slides-canvas.js:190-200) |
| Chuột | Menu ngữ cảnh chuột phải trên slide, hình vẽ, ảnh, bảng | 🟢 | - | Menu chuột phải trên slide và hình vẽ (apps/slides/slides-canvas.js:8466, apps/slides/slides-canvas.js:5433) |
| Tính tương thích | Mở và Lưu PPTX giữ nguyên bố cục đối tượng | ✅ | - | Lưu PPTX và mở lại đối chiếu PowerPoint COM không mất đối tượng (docs/AUDIT-SLIDES-OFFICE-PARITY-1011.md:9-10) |
| Tính tương thích | Giữ nguyên hiệu ứng chuyển tiếp và timeline hoạt ảnh khi lưu | ✅ | - | FIX-L6/L7: transition và animation giữ nguyên timeline khi mở bằng PowerPoint COM (docs/SLIDES-BUTTON-MATRIX-1011.md:68-70) |
| Tính tương thích | Khứ hồi các định dạng ODP, FODP chuẩn mở | 🟢 | - | Hỗ trợ ODP/FODP qua LibreOffice adapter (adapters/libreoffice/common/ooxml_zip_patch.py:16-25) |
| Hiệu năng | Tải deck lớn mượt mà, chuyển trang không trễ | 🟢 | - | Kiến trúc render DOM tối ưu kiểm thử với deck nhiều trang (tests/live/slides-print-preview.playwright.mjs:55-60) |
