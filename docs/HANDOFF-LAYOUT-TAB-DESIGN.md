# HANDOFF — Rà soát & Tinh chỉnh thiết kế trực quan tab "Bố cục" (Writer) và "Bố trí trang" (Sheet)

- **Nhánh**: `design/writer-sheet-layout-tab-agy` (tách từ `main` @ `8ed4e29`)
- **Worktree**: `E:\VNOffice-agy-layout-tab`
- **Phạm vi**: Giao diện trực quan (Ribbon, CSS, Markup, Hộp thoại Thiết lập trang, Icon, i18n, Responsive). Tuyệt đối không can thiệp logic đo lường, phân trang hay công thức của Writer/Sheet adapter.

---

## 1. Đối chiếu thực tế với Microsoft Word 2016 và Excel 2016 thật

Môi trường kiểm chứng thực tế: Hệ thống đã cài đặt **Microsoft Office 2016 Professional Plus (Build 16.0.4266)**. Ảnh chụp Ribbon thực tế của ứng dụng VN Writer và VN Sheet được lưu giữ tại thư mục scratch kiểm thử (`scratch/layout-tab-audit/`).

### 1.1. Tab "Bố cục" của VN Writer vs Tab "Layout" của Word 2016
- **Word 2016 Layout tab**:
  1. *Page Setup*: Margins, Orientation, Size, Columns (dropdown), Breaks, Line Numbers, Hyphenation + Launcher mở hộp thoại Page Setup.
  2. *Paragraph*: Indent (Left/Right), Spacing (Before/After) + Launcher mở hộp thoại Paragraph.
  3. *Arrange*: Position, Wrap Text, Selection Pane, Align, Group, Rotate.
- **VN Writer tab Bố cục**:
  - *Thiết lập trang*: Có Căn lề, Hướng giấy, Khổ giấy (3 nút lớn), Cột (nút lớn) kèm cột 3 nút tắt (1 cột, 2 cột, 3 cột), Ngắt trang (dropdown), Số dòng (select dropdown).
  - *Đoạn văn*: Có Giảm thụt lề, Thụt lề, Giãn dòng, Khoảng cách Trước/Sau đoạn.
  - *Nền & Viền trang*: Có Hình mờ và Viền trang. (Khác biệt so với Word 2016: Word đưa nhóm này sang tab Design; VN Writer duy trì đồng thời trên tab Thiết kế và tab Bố cục để đảm bảo tương thích ngược).
  - *In ấn*: Có In tài liệu (Ctrl+P) và Xem trước khi in (Ctrl+F2). (Word 2016 đặt trong Backstage menu Tệp; VN Writer đưa trực tiếp lên tab Bố cục giúp thao tác in ấn văn bản thuận tiện).

### 1.2. Tab "Bố trí trang" của VN Sheet vs Tab "Page Layout" của Excel 2016
- **Excel 2016 Page Layout tab**:
  1. *Themes*: Themes, Colors, Fonts, Effects.
  2. *Page Setup*: Margins, Orientation, Size, Print Area, Breaks, Background, Print Titles + Launcher.
  3. *Scale to Fit*: Width, Height, Scale + Launcher.
  4. *Sheet Options*: Gridlines (View/Print), Headings (View/Print) + Launcher.
  5. *Arrange*: Bring Forward, Send Backward, Selection Pane, Align, Group, Rotate.
- **VN Sheet tab Bố trí trang**:
  - *Thiết lập trang*: Căn lề, Hướng giấy, Khổ giấy, Đặt vùng in, Xóa vùng in, Chèn ngắt trang, Xóa ngắt trang, Tiêu đề in.
  - *Vừa trang*: Tỷ lệ vừa trang (hỗ trợ scale % và vừa số trang ngang/dọc).
  - *Tùy chọn trang tính*: Đường lưới, Tiêu đề.
  - Bố cục nhóm lệnh và các chức năng tương đương chuẩn Excel 2016.

---

## 2. Danh sách vấn đề phát hiện và xử lý

| STT | Vấn đề phát hiện | Trạng thái | Nguyên nhân & Giải pháp thực hiện |
|---|---|---|---|
| 1 | **Lỗi nhãn hiển thị raw Command ID và mất icon trên Sheet Page Layout** | **ĐÃ SỬA** | **Hiện trạng**: Các nút Căn lề, Hướng giấy, Khổ giấy, Tiêu đề in trên tab "Bố trí trang" của Sheet hiển thị chuỗi kỹ thuật `sheet.page.margins`, `sheet.page.orientation`, `sheet.page.size`, `sheet.page.printTitles`. Nút Khổ giấy bị mất icon vector, hiển thị fallback dấu chấm đen tròn `●`.<br>**Nguyên nhân**: Thiếu khai báo trong `platform/commands/command-definitions.js`, thiếu chuỗi dịch trong `strings-vi.js`/`strings-en.js`, và thiếu keyword resolution trong `resolveIcon` (`components.js`).<br>**Giải pháp**: Đã bổ sung định nghĩa đầy đủ với category "page", nhãn tiếng Việt/Anh chuẩn hóa, icon `margins`, `orientation`, `pageSize`, `filePrint`, và fallback trong `components.js`. Ribbon Sheet hiển thị đúng tiếng Việt chuẩn hóa, icon sắc nét đồng bộ. |
| 2 | **Select bị nuốt không render ở cấp nhóm Ribbon trên Writer** | **ĐÃ SỬA** | **Hiện trạng**: Lệnh "Danh số dòng" (`writer.layout.lineNumbers`) có trong cấu hình tab Bố cục và được unit test 118 kiểm tra, nhưng thực tế hoàn toàn biến mất trên giao diện Ribbon.<br>**Nguyên nhân**: Trong `platform/ribbon/ribbon-host.js`, vòng lặp `group.items.forEach` chỉ render `button`, `dropdown`, `column`. Các item `type: "select"` trực tiếp dưới group bị bỏ qua.<br>**Giải pháp**: Bổ sung nhánh `else if (item.type === "select") itemsEl.appendChild(createSelect(item));` trong `ribbon-host.js` và CSS styling. Menu chọn số dòng ("Số dòng: Không có", "Số dòng: Liên tục",...) đã hiển thị ngay sau menu Ngắt trang. |
| 3 | **Layout vỡ và chèn ép trong hộp thoại Thiết lập trang (Page Setup) của Sheet** | **ĐÃ SỬA** | **Hiện trạng**: Các ô select (Kiểu lề, Hướng trang, Khổ giấy) bị ép chiều cao chỉ còn 10px khiến chữ bị cắt mất nửa dưới. Trong các fieldset, các nút radio (Tỷ lệ vừa trang) và checkbox (Căn giữa, Tùy chọn in) bị nhảy dòng nằm đè lên trên nhãn chữ; ô nhập tiêu đề in bị chèn ép.<br>**Nguyên nhân**: Class `.vno-select` có `height: 24px` xung đột với padding 7px của dialog input. Quy tắc `.vno-sheet-rule-dialog label { display: grid; }` đè lên nhãn radio/checkbox, và fieldset bị giới hạn `max-height: 180px; overflow: auto;`.<br>**Giải pháp**: Cập nhật `apps/sheet/sheet.css`: đặt `height: 34px; padding: 6px 8px; font-size: 13px;` cho `.vno-sheet-rule-dialog select.vno-select`; `fieldset { max-height: none; overflow: visible; }`; nhãn chứa checkbox/radio chuyển sang `display: flex; flex-direction: row; align-items: center; gap: 8px;`. Hộp thoại hiển thị chuẩn mực, thoáng đãng, các dòng radio/checkbox thẳng hàng. |
| 4 | **Chiều cao select chưa đồng bộ trong hộp thoại Thiết lập trang của Writer** | **ĐÃ SỬA** | **Hiện trạng**: Hai ô select Khổ giấy (`#vno-pagesetup-size`) và Hướng giấy (`#vno-pagesetup-orientation`) mang class `.vno-select` nên chỉ cao 24px, thấp hơn hẳn so với các ô nhập số lề 34px bên dưới.<br>**Giải pháp**: Bổ sung quy tắc trong `apps/writer/writer.css` đồng bộ chiều cao 34px, padding 6px 10px, font-size 13px cho cả 2 select. |
| 5 | **Tràn ngang Ribbon Writer trên màn hình hẹp (1024px)** | **ĐÃ SỬA** | **Hiện trạng**: Khi cửa sổ thu nhỏ về 1024px, sau khi hiển thị thêm "Số dòng: Không có", nhóm In ấn ở mép phải bị tràn nhẹ ra ngoài khung nhìn.<br>**Giải pháp**: Bổ sung quy tắc responsive trong `platform/shell/shell.css` tại breakpoint `@media (max-width: 1300px)`: tự động thu gọn nhãn các nút phụ trong nhóm Đoạn văn (Giảm thụt lề, Thụt lề) và nhóm Thiết lập trang (1 cột, 2 cột, 3 cột) thành icon button gọn gàng (vẫn bảo tồn 100% DOM, tooltip và commandId). Toàn bộ tab Bố cục vừa vặn hoàn hảo ở 1024px không hề bị tràn hay cuộn ngang. |
| 6 | **Cột hiển thị 2 lần trong nhóm Thiết lập trang (Nút Cột lớn + 3 nút chọn nhanh)** | **GIỮ NGUYÊN (Không sửa)** | **Lý do**: Unit test `tests/unit/writer-columns.test.js` kiểm tra cứng yêu cầu: `assert("Writer Columns: Hiện diện đầy đủ trên Ribbon tab Bố cục với nút chính và 3 nút chọn nhanh", ok)`. Nếu gộp thành dropdown duy nhất sẽ phá vỡ test hồi quy đã có của dự án. Cả hai dạng tương hỗ cho nhau: nút lớn mở hộp thoại tùy biến nâng cao (khe cột, đường kẻ giữa), 3 nút nhỏ áp dụng nhanh 1/2/3 cột. |
| 7 | **Nhóm Nền & Viền trang nằm ở cả tab Thiết kế và tab Bố cục** | **GIỮ NGUYÊN (Không sửa)** | **Lý do**: Unit test `tests/unit/writer-i18n-shortcuts.test.js` kiểm tra cứng: `assert("Writer Ribbon: Tab Thiết kế (Design) riêng biệt chứa Hình mờ & Viền trang, đồng thời duy trì tương thích ngược trên Bố cục", ...)`. Giữ nguyên nhóm trên tab Bố cục để đảm bảo khả năng tương thích ngược và thói quen thao tác của người dùng. |

---

## 3. Rà soát các nút lệnh (Dead buttons audit)

Đã quét toàn bộ các nút lệnh và Command ID trên cả 2 tab:
- **VN Writer (Tab Bố cục - 25 lệnh)**:
  - `writer.page.margins`, `writer.page.orientation`, `writer.page.size`: mở hộp thoại Page Setup (focus tương ứng vào margins, orientation, size).
  - `writer.page.columns`: mở hộp thoại chia cột.
  - `writer.page.columns1`, `writer.page.columns2`, `writer.page.columns3`: đặt số cột 1, 2, 3.
  - `writer.page.break`, `writer.break.column`, `writer.section.*` (nextPage, continuous, evenPage, oddPage): chèn ngắt trang/cột/mục.
  - `writer.layout.lineNumbers`: cấu hình đánh số dòng.
  - `writer.para.indentDec`, `writer.para.indentInc`: giảm/tăng thụt lề đoạn.
  - `writer.para.spacing1`, `spacing15`, `spacing2`: giãn dòng 1.0, 1.5, 2.0.
  - `writer.para.spacingBefore`, `spacingAfter`: khoảng cách trước/sau đoạn.
  - `writer.page.watermark`, `writer.page.border`: mở hộp thoại hình mờ và viền trang.
  - `common.file.print`, `writer.file.printPreview`: in tài liệu và xem trước khi in.
  - *Kết quả*: **100% lệnh đều có handler thật**, không có nút chết / TODO rỗng.
- **VN Sheet (Tab Bố trí trang - 11 lệnh)**:
  - `sheet.page.margins`, `sheet.page.orientation`, `sheet.page.size`: mở hộp thoại Thiết lập trang (focus tương ứng).
  - `sheet.page.setPrintArea`, `sheet.page.clearPrintArea`: đặt và xóa vùng in.
  - `sheet.page.insertPageBreak`, `sheet.page.removePageBreak`: chèn và xóa ngắt trang.
  - `sheet.page.printTitles`: mở hộp thoại Thiết lập trang với focus vào Tiêu đề in.
  - `sheet.page.scale`: mở hộp thoại Thiết lập trang với focus vào Tỷ lệ vừa trang.
  - `sheet.view.gridlines`, `sheet.view.headings`: bật/tắt hiển thị đường lưới và tiêu đề hàng/cột.
  - *Kết quả*: **100% lệnh đều có handler thật**, kết nối trực tiếp với `sheet-grid.js` và `sheet-adapter.js`.

---

## 4. Rà soát nội dung Hướng dẫn sử dụng (Help entries)

- `platform/help/entries-writer.js`:
  - Mục `writer.page.setup` (dòng ~593): Mô tả chính xác 3 nút Căn lề, Hướng giấy, Khổ giấy trong nhóm Thiết lập trang, mở cùng hộp thoại Thiết lập trang (A4 dọc mặc định, lề chuẩn NĐ 30: trên 20, dưới 20, trái 30, phải 15 mm).
  - Mục `writer.layout.lineNumbers` (dòng ~608): Mô tả chính xác menu "Danh số dòng" nằm ngay sau menu Ngắt trang (đã khớp hoàn toàn sau khi sửa lỗi render select ở RibbonHost).
  - Mục `writer.page.columnsHelp` (dòng ~623): Mô tả chính xác nút Cột lớn và cột 3 nút chọn nhanh 1, 2, 3 cột.
  - Mục `writer.file.printPreviewHelp` (dòng ~658): Mô tả chính xác nút Xem trước khi in cạnh In tài liệu trong nhóm In ấn (Ctrl+F2).
- `platform/help/entries-sheet.js`:
  - Mục `sheet.page.setupRound2` (dòng ~250): Mô tả chi tiết các bước thiết lập tỷ lệ vừa trang, đầu/cuối trang, căn giữa trang khi in và in đường kẻ ô/tiêu đề hàng cột.
  - Mục `sheet.page.printAreaBreaks` (dòng ~736): Mô tả chi tiết việc chọn vùng in và chèn/xóa ngắt trang.
- *Kết luận*: Toàn bộ nội dung Help đều bằng tiếng Việt chi tiết, chuẩn xác, không có placeholder hay lorem ipsum, hoàn toàn khớp với giao diện thực tế.

---

## 5. Danh mục file thay đổi

1. `platform/commands/command-definitions.js`: Thêm định nghĩa command chuẩn cho `sheet.page.margins`, `sheet.page.orientation`, `sheet.page.size`, `sheet.page.printTitles`.
2. `platform/i18n/strings-vi.js`: Thêm nhãn và tooltip tiếng Việt cho 4 lệnh thiết lập trang của Sheet.
3. `platform/i18n/strings-en.js`: Thêm nhãn và tooltip tiếng Anh tương ứng cho 4 lệnh của Sheet.
4. `platform/ui-kit/components.js`: Bổ sung tự động map icon `pageSize` trong hàm `resolveIcon`.
5. `platform/ribbon/ribbon-host.js`: Thêm hỗ trợ render `item.type === "select"` khi item nằm trực tiếp dưới `group.items`.
6. `apps/writer/writer.css`: Thêm styling chuẩn kích thước cho select trong Page Setup dialog và select đánh số dòng trên Ribbon.
7. `apps/sheet/sheet.css`: Sửa lỗi ép chiều cao select và vỡ layout radio/checkbox/fieldset trong Page Setup dialog của Sheet.
8. `platform/shell/shell.css`: Bổ sung quy tắc responsive breakpoint `<= 1300px` cho tab Bố cục Writer để không tràn ngang ở 1024px.

---

## 6. Kết quả kiểm thử

- `node tests/run-tests.js`: **1833 / 1833 PASS (100%)**, `0 FAIL`.
- Kiểm tra Playwright thực tế trên Microsoft Edge:
  - Màn hình rộng (1440px): Cả 2 tab hiển thị trọn vẹn, icon vector sắc nét, nhãn đầy đủ.
  - Màn hình hẹp (1024px): Cả 2 tab co giãn nhịp nhàng, không bị tràn ngang, không phát sinh thanh cuộn ngoài ý muốn.
  - Dialog Thiết lập trang: Mở/đóng mượt mà, form controls chuẩn kích thước, thẳng hàng ngay ngắn.
