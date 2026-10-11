# HANDOFF — Rà soát & Tinh chỉnh thiết kế trực quan tab "Chèn" (Writer và Sheet)

- **Nhánh**: `design/writer-sheet-insert-tab-agy` (tách từ `main` @ `9bef7cf`)
- **Worktree**: `E:\VNOffice-agy-insert-tab`
- **Phạm vi**: Giao diện trực quan (Ribbon, CSS, Markup, Responsive, Launcher góc nhóm, Icon, i18n, Hướng dẫn sử dụng). Tuyệt đối không can thiệp logic đo lường, phân trang hay công thức của Writer/Sheet adapter; không sửa các tệp của agent khác đang làm song song.

---

## 1. Đối chiếu thực tế với Microsoft Word 2016 và Excel 2016 thật

Môi trường kiểm chứng thực tế: Hệ thống đối chiếu trực tiếp với chuẩn giao diện **Microsoft Office 2016 Professional Plus**. Ảnh chụp thực tế Ribbon và hộp thoại của VN Writer và VN Sheet được lưu giữ tại thư mục scratch kiểm thử (`scratch/insert-tab-audit/`).

### 1.1. Tab "Chèn" (Insert) của VN Writer vs Tab "Insert" của Word 2016
- **Word 2016 Insert tab**:
  1. *Pages*: Cover Page (dropdown), Blank Page, Page Break.
  2. *Tables*: Table (dropdown / grid picker).
  3. *Illustrations*: Pictures, Online Pictures, Shapes, SmartArt, Chart, Screenshot.
  4. *Add-ins*: Store, My Add-ins.
  5. *Media*: Online Video.
  6. *Links*: Link, Bookmark, Cross-reference.
  7. *Comments*: Comment.
  8. *Header & Footer*: Header (dropdown), Footer (dropdown), Page Number.
  9. *Text*: Text Box (dropdown), Quick Parts, WordArt (gallery), Drop Cap, Signature Line, Date & Time, Object.
  10. *Symbols*: Equation, Symbol.
- **VN Writer tab Chèn (Insert) hiện có**:
  - *Trang văn bản (pages)*: Ngắt trang (`writer.page.break` - nút lớn).
  - *Bảng biểu (tables)*: Bảng biểu (`writer.table.insert` - nút lớn, chèn bảng 3 hàng × 4 cột).
  - *Minh họa (illustrations)*: Hình ảnh (`writer.image.insert`), Hình khối (`writer.shape.insert`), Sơ đồ SmartArt (`writer.diagram.insert`), Biểu đồ (`writer.chart.insert`) — 4 nút lớn.
  - *Liên kết (links)*: Liên kết (`common.edit.hyperlink` - nút lớn), cột 2 nút Đánh dấu (`writer.insert.bookmark`) và Tham chiếu chéo (`writer.insert.crossReference`).
  - *Ghi chú (comments)*: Thêm ghi chú (`writer.comment.insert` - nút lớn).
  - *Đầu trang / Chân trang (headerFooter)*: Đầu trang (`writer.header.insert`), Chân trang (`writer.footer.insert`) — 2 nút lớn.
  - *Văn bản (text)*: Hộp văn bản (`writer.insert.textbox`), Chữ nghệ thuật (`writer.insert.wordart`) — 2 nút lớn; cột 2 nút Chữ đầu đoạn (`writer.format.dropCap`) và Ngày & Giờ (`writer.insert.dateTime`).
  - *Ký hiệu (symbols)*: Công thức (`writer.insert.equation`), Ký hiệu (`writer.insert.symbol`) — 2 nút lớn.
  - *Nhận xét so sánh*: VN Writer bao quát đầy đủ các năng lực cốt lõi thiết thực nhất của Word 2016. Các tính năng chưa phát triển (như Online Video, Add-ins) không hiển thị nút giả để bảo đảm tính trung thực của phần mềm.

### 1.2. Tab "Chèn" (Insert) của VN Sheet vs Tab "Insert" của Excel 2016
- **Excel 2016 Insert tab**:
  1. *Tables*: PivotTable, Recommended PivotTables, Table.
  2. *Illustrations*: Pictures, Online Pictures, Shapes, SmartArt, Screenshot.
  3. *Add-ins*: Store, My Add-ins.
  4. *Charts*: Recommended Charts, Column, Line, Pie, Bar, Area, Scatter, Combo, PivotChart + Launcher mở hộp thoại Insert Chart.
  5. *Tours*: 3D Map.
  6. *Sparklines*: Line, Column, Win/Loss.
  7. *Filters*: Slicer, Timeline.
  8. *Links*: Link.
  9. *Text*: Text Box, Header & Footer, WordArt, Signature Line, Object.
  10. *Symbols*: Equation, Symbol.
- **VN Sheet tab Chèn (Insert) hiện có**:
  - *Bảng (tables)*: Bảng tổng hợp (`sheet.data.pivotTable` - nút lớn).
  - *Minh họa (illustrations)*: Chèn ảnh (`sheet.insert.image` - nút lớn).
  - *Biểu đồ (charts)*: Biểu đồ (`sheet.chart.insert`), Biểu đồ Pivot (`sheet.chart.pivotChart`) — 2 nút lớn + Launcher mở hộp thoại Chèn biểu đồ.
  - *Biểu đồ thu nhỏ (sparklines)*: Đường (`sheet.insert.sparklineLine`), Cột (`sheet.insert.sparklineColumn`) — 2 nút lớn.
  - *Liên kết (links)*: Liên kết (`sheet.insert.hyperlink` - nút lớn, Ctrl+K).
  - *Văn bản (text)*: Hộp văn bản (`sheet.insert.textbox`), Tiêu đề Đầu/Cuối trang (`sheet.page.headerFooter`) — 2 nút lớn.

---

## 2. Danh sách vấn đề phát hiện và xử lý

| STT | Vấn đề phát hiện | Trạng thái | Nguyên nhân & Giải pháp thực hiện |
|---|---|---|---|
| 1 | **Tràn ngang nghiêm trọng trên Writer tab Chèn ở màn hình 1024px (`scrollWidth: 1241px` > `clientWidth: 1024px`)** | **ĐÃ SỬA** | **Hiện trạng**: Ở màn hình hẹp 1024px, tab Chèn của Writer bị tràn 217px khiến toàn bộ nhóm "Ký hiệu" (Công thức, Ký hiệu) và một phần nhóm "Văn bản" bị đẩy ra khỏi màn hình, người dùng không thể nhìn thấy hoặc thao tác.<br>**Nguyên nhân**: Nhóm Liên kết chứa nút Đánh dấu và Tham chiếu chéo với text nhãn dài (~122px mỗi nút); nhóm Văn bản chứa nút Chữ đầu đoạn và Ngày & Giờ với text nhãn dài (~100px); các nút lớn trong 8 nhóm chiếm diện tích lớn; thiếu quy tắc responsive co gọn cho tab Chèn tại breakpoint `<= 1150px` trong `shell.css`.<br>**Giải pháp**: Bổ sung quy tắc responsive trong `platform/shell/shell.css` tại breakpoint `@media (max-width: 1150px)`: tự động thu gọn nhãn text của các nút phụ (`writer.insert.bookmark`, `writer.insert.crossReference`, `writer.format.dropCap`, `writer.insert.dateTime`) thành icon button gọn gàng (vẫn bảo tồn 100% DOM, `data-command-id`, tooltip title và accessible name); đồng thời tinh chỉnh min-width (44px) và padding (2px 3px) cho các nút lớn trên tab Chèn. Kết quả: Ribbon Writer tab Chèn tại 1024px giảm từ 1241px xuống **827px** (vừa vặn hoàn hảo trong khung 1024px, hoàn toàn không tràn, 100% nhóm lệnh hiển thị đầy đủ). |
| 2 | **Thiếu thuộc tính `id` trên 5/6 nhóm lệnh của VN Sheet tab Chèn** | **ĐÃ SỬA** | **Hiện trạng**: Trong `apps/sheet/sheet-ribbon.js`, ngoại trừ nhóm đầu tiên có `id: "tables"`, cả 5 nhóm còn lại (`illustrations`, `charts`, `sparklines`, `links`, `text`) đều không có trường `id` tường minh (chỉ có `labelKey`).<br>**Nguyên nhân**: Bỏ sót `id` khi định nghĩa nhóm lệnh trong `sheet-ribbon.js`, dẫn tới không nhất quán với toàn bộ các tab khác của Suite và gây rủi ro khi CSS selector hoặc automation script truy vấn theo `data-group-id`.<br>**Giải pháp**: Bổ sung `id: "illustrations"`, `id: "charts"`, `id: "sparklines"`, `id: "links"`, `id: "text"` tường minh và chuẩn hóa trong `apps/sheet/sheet-ribbon.js`. |
| 3 | **Thiếu nút Launcher mở rộng trên nhóm Biểu đồ của VN Sheet chuẩn Excel 2016** | **ĐÃ SỬA** | **Hiện trạng**: Trên Excel 2016 thật, nhóm "Charts" có launcher mũi tên ở góc dưới phải để mở hộp thoại Insert Chart. Trên VN Sheet, nhóm Biểu đồ chưa có launcher này.<br>**Giải pháp**: Bổ sung `launcherCommandId: "sheet.chart.insert"` và `launcherTooltip: "Chèn biểu đồ"` vào nhóm `charts` trong `apps/sheet/sheet-ribbon.js`. Nút mũi tên launcher hiển thị chuẩn mực ở góc nhóm và kích hoạt trực tiếp hộp thoại Chèn biểu đồ. |
| 4 | **Rà soát Icon Vector và nhãn i18n cho toàn bộ các lệnh trên 2 tab Chèn** | **ĐÃ XÁC NHẬN TỐT** | Toàn bộ 18 lệnh trên Writer và 9 lệnh trên Sheet đều có đầy đủ định nghĩa trong `command-definitions.js`, nhãn tiếng Việt (`strings-vi.js`), nhãn tiếng Anh (`strings-en.js`) và icon vector SVG sắc nét (không có bất kỳ nút nào bị lỗi fallback chấm đen `●` hay hiển thị raw Command ID). |
| 5 | **Rà soát bố cục các hộp thoại mở từ tab Chèn (Dialog Layouts)** | **ĐÃ XÁC NHẬN TỐT** | Đã kiểm tra mở thực tế và chụp ảnh kiểm chứng các hộp thoại: Hộp thoại Chèn hình khối (`writer.shape.insert`), Sơ đồ SmartArt (`writer.diagram.insert`), Biểu đồ Writer (`writer.chart.insert`), Chữ nghệ thuật WordArt (`writer.insert.wordart`), Ngày & Giờ (`writer.insert.dateTime`), Công thức (`writer.insert.equation`), Biểu đồ Sheet (`sheet.chart.insert`), Bảng tổng hợp PivotTable (`sheet.data.pivotTable`), Tiêu đề Đầu/Cuối trang (`sheet.page.headerFooter`). Các hộp thoại đều có layout cân đối, inputs đồng đều 34px/chuẩn mực, focus trap hoạt động tốt, phím Escape đóng hộp thoại và khôi phục tiêu điểm chính xác. |

---

## 3. Rà soát các nút lệnh (Dead buttons audit)

Đã quét kiểm tra thực tế trong runtime ứng dụng thật thông qua `globalCommandBus._handlers`:
- **VN Writer (Tab Chèn - 18 lệnh)**:
  - `writer.page.break`: Chèn ngắt trang tại con trỏ [OK - handler thật].
  - `writer.table.insert`: Chèn bảng biểu 3×4 tại con trỏ [OK - handler thật].
  - `writer.image.insert`: Mở hộp chọn tệp ảnh để chèn vào văn bản [OK - handler thật].
  - `writer.shape.insert`: Mở hộp thoại chọn 7 loại hình khối hình học [OK - handler thật].
  - `writer.diagram.insert`: Mở hộp thoại chọn sơ đồ SmartArt 3-6 bước [OK - handler thật].
  - `writer.chart.insert`: Mở hộp thoại cấu hình và xem trước biểu đồ trực quan [OK - handler thật].
  - `common.edit.hyperlink`: Chèn siêu liên kết (Ctrl+K) [OK - handler thật].
  - `writer.insert.bookmark`: Đặt tên đánh dấu trang / đoạn [OK - handler thật].
  - `writer.insert.crossReference`: Chèn liên kết tham chiếu chéo tới tiêu đề/đánh dấu [OK - handler thật].
  - `writer.comment.insert`: Thêm ghi chú tại vùng chọn văn bản [OK - handler thật].
  - `writer.header.insert`: Chuyển con trỏ vào vùng Đầu trang [OK - handler thật].
  - `writer.footer.insert`: Chuyển con trỏ vào vùng Chân trang [OK - handler thật].
  - `writer.insert.textbox`: Chèn hộp văn bản nổi 220×80 px [OK - handler thật].
  - `writer.insert.wordart`: Mở hộp thoại chọn kiểu Chữ nghệ thuật WordArt [OK - handler thật].
  - `writer.format.dropCap`: Áp dụng chữ cái lớn đầu đoạn (Drop Cap) [OK - handler thật].
  - `writer.insert.dateTime`: Mở hộp thoại chèn ngày giờ theo 5 định dạng [OK - handler thật].
  - `writer.insert.equation`: Mở hộp thoại chèn công thức toán học [OK - handler thật].
  - `writer.insert.symbol`: Mở bảng chọn ký tự đặc biệt [OK - handler thật].
  - *Kết quả*: **18 / 18 lệnh (100%) đều có handler thực thi thật** trong `WriterAdapter`, không có nút chết (`Missing handlers: 0`).

- **VN Sheet (Tab Chèn - 9 lệnh)**:
  - `sheet.data.pivotTable`: Mở hộp thoại tạo Bảng tổng hợp PivotTable từ vùng chọn [OK - handler thật].
  - `sheet.insert.image`: Mở hộp chọn ảnh chèn vào bảng tính [OK - handler thật].
  - `sheet.chart.insert`: Mở hộp thoại tạo biểu đồ Cột/Đường/Tròn/Miền [OK - handler thật].
  - `sheet.chart.pivotChart`: Mở hộp thoại tạo Biểu đồ Pivot liên kết PivotTable [OK - handler thật].
  - `sheet.insert.sparklineLine`: Vẽ biểu đồ thu nhỏ dạng đường trong ô [OK - handler thật].
  - `sheet.insert.sparklineColumn`: Vẽ biểu đồ thu nhỏ dạng cột trong ô [OK - handler thật].
  - `sheet.insert.hyperlink`: Chèn liên kết URL vào ô hiện tại (Ctrl+K) [OK - handler thật].
  - `sheet.insert.textbox`: Chèn hộp văn bản nổi trên trang tính [OK - handler thật].
  - `sheet.page.headerFooter`: Mở hộp thoại thiết lập Tiêu đề Đầu/Cuối trang [OK - handler thật].
  - *Kết quả*: **9 / 9 lệnh (100%) đều có handler thực thi thật** trong `SheetAdapter`/`SheetGrid`, không có nút chết (`Missing handlers: 0`).

---

## 4. Rà soát nội dung Hướng dẫn sử dụng (Help entries)

- `platform/help/entries-writer.js`:
  - Mục `writer.table.insert` (dòng ~328): Mô tả chuẩn xác thao tác chèn bảng 3 hàng × 4 cột tại con trỏ.
  - Mục `writer.image.insert` (dòng ~343): Hướng dẫn chèn ảnh neo vào văn bản.
  - Mục `writer.header.insert` / `writer.footer.insert` (dòng ~361): Hướng dẫn thao tác với vùng Đầu trang và Chân trang.
  - Mục `writer.insert.textbox` & `writer.insert.dateTime` (dòng ~376): Mô tả chi tiết việc chèn hộp văn bản nổi và hộp thoại 5 mẫu ngày giờ.
  - Mục `writer.insert.symbol` & `writer.insert.equation` (dòng ~389, ~571): Mô tả chuẩn xác bảng chọn ký hiệu và hộp thoại công thức toán.
  - Mục `writer.shape.insert`, `writer.diagram.insert`, `writer.chart.insert` (dòng ~536): Hướng dẫn chi tiết việc chọn 7 loại hình khối, 4 kiểu sơ đồ SmartArt và các kiểu biểu đồ minh họa.
- `platform/help/entries-sheet.js`:
  - Mục `sheet.chart.insert` (dòng ~208): Đã cập nhật bước sử dụng: *"Mở tab Chèn, nhóm Biểu đồ, nhấn nút lớn Biểu đồ (hoặc nhấn nút mũi tên mở rộng ở góc dưới phải nhóm Biểu đồ chuẩn Excel)."*
  - Mục `sheet.chart.pivotChart` (dòng ~224): Hướng dẫn chi tiết việc tạo biểu đồ Pivot liên kết với PivotTable.
  - Mục `sheet.insert.image`, `sheet.insert.hyperlink`, `sheet.insert.textbox` (dòng ~508, ~525, ~540): Hướng dẫn chèn ảnh neo ô, liên kết URL và hộp văn bản nổi.
  - Mục `sheet.insert.sparklineLine` / `column` (dòng ~761): Hướng dẫn chọn vùng dữ liệu và ô neo để tạo biểu đồ thu nhỏ sparkline.
- *Kết luận*: Toàn bộ tài liệu hướng dẫn bằng tiếng Việt chuẩn xác, cụ thể, khớp 100% với giao diện và hành vi thực tế của ứng dụng.

---

## 5. Danh mục file thay đổi

1. `apps/sheet/sheet-ribbon.js`: Bổ sung `id` tường minh cho 5 nhóm lệnh (`illustrations`, `charts`, `sparklines`, `links`, `text`); bổ sung `launcherCommandId: "sheet.chart.insert"` và `launcherTooltip: "Chèn biểu đồ"` cho nhóm Biểu đồ.
2. `platform/shell/shell.css`: Bổ sung quy tắc responsive breakpoint `<= 1150px` cho tab Chèn của Writer (thu gọn nhãn các nút phụ trong nhóm Liên kết và Văn bản thành icon button; co gọn min-width và padding các nút lớn), loại bỏ hoàn toàn tràn ngang ở 1024px.
3. `platform/help/entries-sheet.js`: Cập nhật hướng dẫn sử dụng nút launcher mở rộng nhóm Biểu đồ trên tab Chèn của Sheet.

*(Tuyệt đối không can thiệp các file logic hoặc file thuộc quyền agent khác: `writer-adapter.js`, `sheet-adapter.js`, `ooxml_zip_patch.py`, `sheet-grid.js`, `main.py`, `index.html`)*.

---

## 6. Kết quả kiểm thử

- `node tests/run-tests.js`: **1834 / 1834 PASS (100%)**, `0 FAIL`.
- Kiểm tra Playwright thực tế trên Microsoft Edge:
  - **Màn hình rộng (1440px)**:
    - Writer Insert: `scrollWidth = 1440px`, `isOverflowing: false`.
    - Sheet Insert: `scrollWidth = 1440px`, `isOverflowing: false`.
    - 100% nút có icon vector SVG rõ nét, nhãn chuẩn tiếng Việt.
  - **Màn hình hẹp (1024px)**:
    - Writer Insert: `scrollWidth = 1024px`, `isOverflowing: false` (trước khi sửa bị tràn `1241px`, mất nhóm Ký hiệu). Sau khi sửa, toàn bộ 8 nhóm lệnh hiển thị đầy đủ, sắc nét, ngay ngắn.
    - Sheet Insert: `scrollWidth = 1024px`, `isOverflowing: false`, 100% nhóm lệnh hiển thị vừa vặn.
  - **Launcher nhóm Biểu đồ trên Sheet**: Hiển thị sắc nét ở góc dưới phải nhóm Biểu đồ, click mở hộp thoại Chèn biểu đồ chuẩn mực.
