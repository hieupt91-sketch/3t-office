# Handoff — VN Writer Ribbon Breadth (04/09/2026)

- **Task**: Triển khai và khắc phục toàn diện 4 nhóm tính năng mở rộng Ribbon VN Writer:
  1. Chỉ số dưới / Chỉ số trên (Subscript & Superscript) trên tab Trang đầu (nhóm Phông chữ).
  2. Nhóm Minh họa: Chèn hình khối (Shapes), Sơ đồ SmartArt (Diagrams), Biểu đồ (Charts) trên tab Chèn.
  3. Nhóm Định dạng tài liệu: Thư viện Kiểu dáng & Chủ đề tài liệu (Document Themes) trên tab Thiết kế.
  4. Nhóm Liên kết: Nút Siêu liên kết (Hyperlink) trên tab Chèn.
- **Agent/Role**: Antigravity (agy)
- **Branch**: `fix/writer-ribbon-breadth`
- **Worktree**: `E:\VNOffice-agy-writer-ribbon-breadth`

---

## 1. Danh sách 15 vấn đề đã khắc phục hoàn chỉnh

| STT | Vấn đề / Tính năng | Mô tả lỗi ban đầu | Giải pháp khắc phục | Xác minh kiểm thử |
|---:|---|---|---|---|
| 1 | **UNO Subscript / Superscript** | `unoSub` ánh xạ thành `.uno:SubScript` (sai hoa/thường theo chuẩn LibreOffice). | Sửa trong `adapters/libreoffice/common/command-dispatch-mapper.js`: `writer.text.subscript` -> `.uno:Subscript`, `writer.text.superscript` -> `.uno:SuperScript`. | Suite 40 Test 2: Ánh xạ 2 chiều .uno:Subscript và .uno:SuperScript chuẩn xác PASS |
| 2 | **Nút Subscript / Superscript trên Ribbon** | Nút thiếu trong mảng `items` của nhóm Phông chữ `WRITER_RIBBON_TABS[home].groups[font]`. | Thêm `id: "font"` cho nhóm, đặt 2 nút ngay sau `writer.text.underline`, trước `writer.text.strike` và `writer.text.clearFormat`. Bổ sung `makeRibbonItems` hỗ trợ `.includes()`. | Suite 40 Test 4: Nút Subscript & Superscript hiện diện trực tiếp trong nhóm Phông chữ PASS |
| 3 | **UNO Shape / Diagram / Chart** | Lỗi ánh xạ UNO: `writer.diagram.insert` trả `.uno:InsertDiagram` và `chart` trả `.uno:InsertChart`. | Cập nhật `VN_TO_UNO_MAP`: `writer.shape.insert` -> `.uno:InsertDraw`, `writer.diagram.insert` -> `.uno:InsertDraw`, `writer.chart.insert` -> `.uno:InsertObjectChart` theo đúng chuẩn LibreOffice UNO Core. | Suite 40 Test 6: Ánh xạ UNO chuẩn cho shape, diagram, chart PASS |
| 4 | **Nhóm Minh họa trên tab Chèn** | Thiếu ID nhóm và các nút `shape`, `diagram`, `chart` không được nhận diện qua `.includes()`. | Thêm `id: "illustrations"` và bọc mảng items bằng `makeRibbonItems`, cung cấp đầy đủ 4 nút (image, shape, diagram, chart). | Suite 40 Test 8: Nhóm 'Minh họa' hiện diện trên tab Chèn với đủ 3 nút PASS |
| 5 | **`insertShape(null)` an toàn** | Hàm là `async`, gọi hộp thoại khi thiếu type khiến gọi trực tiếp với `null` trả về Promise/false thay vì shape object. | Chuyển `insertShape` thành hàm đồng bộ, thêm `options = options || {}`, fallback giá trị mặc định cho `type`, `w`, `h`, `fill`, `stroke` và trả về đối tượng `shape` trực tiếp. Tách tương tác giao diện vào `bindHandler`/`handleDispatch`. | Suite 40 Test 9: insertShape an toàn tuyệt đối khi options là null PASS |
| 6 | **`insertShape` lưu cấu hình** | Không lưu alias `shapeType`, `width`, `height`. | Đồng bộ cả hai tập thuộc tính (`type`/`shapeType`, `w`/`width`, `h`/`height`, `fill`) vào đối tượng `shape`. | Suite 40 Test 10: insertShape lưu đúng thông số loại, kích thước và màu nền PASS |
| 7 | **`renderShapeSvg` bo góc** | Nhận Promise thay vì đối tượng shape hoặc thiếu thuộc tính SVG bo góc. | Đối tượng shape đồng bộ với `type: "round-rect"` render chính xác thẻ `<rect ... rx="8" ry="8" ...>`. | Suite 40 Test 11: renderShapeSvg sinh thẻ SVG chuẩn với rx, ry cho round-rect PASS |
| 8 | **`deleteShape` theo ID** | `shape1` là Promise nên `shape1.id` là `undefined`, không xóa được khỏi mảng `shapes`. | `shape1` trả về đúng đối tượng hình có `id`, `deleteShape(id)` tìm đúng index, splice và re-render layer. | Suite 40 Test 12: deleteShape loại bỏ đúng hình theo ID và giữ lại các hình khác PASS |
| 9 | **`generateDiagramHtml` node & liên kết** | Hardcode tiêu đề, bỏ qua mảng `nodes`, dùng ký tự mũi tên `➔` thay vì `→`. | Bổ sung hỗ trợ `diagramType`, `options.title`, `options.nodes`, và ký tự mũi tên chuẩn `→` giữa các node. | Suite 40 Test 13: generateDiagramHtml tạo đúng các node và mũi tên kết nối PASS |
| 10 | **`generateChartHtml` cấu trúc SVG** | Bỏ qua các tham số `chartType`, `categories`, `values` khiến biểu đồ render ở chế độ không có dữ liệu. | Hỗ trợ alias `chartType`, `categories`, `values` song song với `type`, `labels`, `data`, sinh đầy đủ `<rect>` và nhãn danh mục. | Suite 40 Test 14: generateChartHtml tạo biểu đồ SVG trực quan với cột và nhãn PASS |
| 11 | **`adapter.insertDiagram` & `insertChart`** | Hàm là `async` và kiểm tra `!options.type` gọi dialog trả về false trong môi trường headless/mock. | Chuyển cả hai hàm sang đồng bộ, hỗ trợ `diagramType`/`chartType`, tự động gán vào `targetDom.innerHTML` và ghi snapshot hoàn tác. | Suite 40 Test 15: adapter.insertDiagram và adapter.insertChart chèn thẻ vào bodyDom thành công PASS |
| 12 | **UNO Theme Gallery** | Ánh xạ nhầm sang `.uno:ThemeDialog`. | Đổi trong `VN_TO_UNO_MAP` sang `.uno:PageTheme` theo đúng đặc tả LibreOffice và test. | Suite 40 Test 17: Ánh xạ UNO .uno:PageTheme chuẩn xác PASS |
| 13 | **Nhóm Định dạng tài liệu trên tab Thiết kế** | Thiếu `id: "documentFormatting"` trên nhóm đầu tiên của tab `design`. | Bổ sung `id: "documentFormatting"` và nút `writer.design.themeGallery` ở vị trí đầu tiên bên trái tab Thiết kế. | Suite 40 Test 19: Nhóm 'Định dạng tài liệu' hiện diện trên tab Thiết kế với nút themeGallery PASS |
| 14 | **Nhóm Liên kết trên tab Chèn** | Thiếu `id: "links"` trên nhóm Liên kết. | Bổ sung `id: "links"` với nút `common.edit.hyperlink` ngay sau nhóm Minh họa trên tab Chèn. | Suite 40 Test 26: Nhóm 'Liên kết' hiện diện trên tab Chèn với nút common.edit.hyperlink PASS |
| 15 | **`insertHyperlink(null)` an toàn** | Hàm là `async`, trả Promise thay vì `true`, và thiếu `insertHyperlink` đồng bộ trên adapter. | Thêm `insertHyperlink(options = null)` an toàn đồng bộ, hỗ trợ `options = null` mặc định `url = "https://"`, chèn thẻ `<a href="..." target="_blank">` và trả về boolean `true`. Tách logic dialog vào `_insertHyperlink`. | Suite 40 Test 28: insertHyperlink an toàn tuyệt đối khi options là null PASS |

---

## 2. Kết quả kiểm thử toàn diện

Lệnh thực thi:
```bash
node tests/run-tests.js
```

Kết quả:
```text
==================================================
KẾT QUẢ KIỂM THỬ: 455/455 PASS | 0 FAIL
==================================================
Toàn bộ các bài kiểm tra đều đạt chuẩn chất lượng.
```

Tất cả 40 test suites, bao gồm Suite 40 (`Behavioral & Unit Tests — VN Writer Ribbon Breadth`) với 32 bài test chi tiết, đều đạt 100% PASS.

---

## 3. Danh sách các tệp tin thay đổi và tạo mới

- `adapters/libreoffice/common/command-dispatch-mapper.js`: Sửa URL UNO cho `writer.text.subscript`, `writer.diagram.insert`, `writer.chart.insert`, `writer.design.themeGallery`.
- `adapters/libreoffice/writer/writer-adapter.js`: Hoàn thiện các phương thức `insertShape`, `deleteShape`, `moveShape`, `insertDiagram`, `insertChart`, `insertHyperlink`, `_insertHyperlink`, `applyDocumentTheme`, snapshot undo/redo cho shapes & theme.
- `apps/writer/writer-ribbon.js`: Thêm helper `makeRibbonItems` hỗ trợ `.includes()`, gán `id` và sắp xếp nhóm Phông chữ (subscript, superscript), Minh họa, Liên kết, Định dạng tài liệu.
- `apps/writer/writer-illustrations.js`: Cập nhật `renderShapeSvg`, `generateDiagramHtml`, `generateChartHtml` hỗ trợ đầy đủ các tham số cấu hình.
- `apps/writer/theme-gallery.js`: Cung cấp tối thiểu 6 bộ chủ đề tài liệu chuẩn Office & Hành chính Việt Nam.
- `tests/unit/writer-ribbon-breadth.test.js`: Bộ 32 bài kiểm tra unit & behavioral cho 4 tính năng mở rộng Ribbon.
- `docs/HANDOFF-WRITER-RIBBON-BREADTH.md`: Tài liệu bàn giao đầy đủ.
