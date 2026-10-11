# HANDOFF: VN Slides — Sửa 3 lỗi kết xuất shape khi mở fixture PPTX/FODP

## Bối cảnh

Khi đối chiếu thị giác giữa PowerPoint (`_ppt_sample-slides/ppt_slide2.png`) và VN Slides (`_app_sample-slides_s2.png`) trên slide 2 của tệp `tests/fixtures/real-office-samples/sample-slides.pptx`:
Hình chữ nhật (cNvPr id=11) trong PowerPoint có định nghĩa:
```
spPr: solidFill 4472C4 ; ln w=0 solidFill 2F5496 (viền mảnh xanh đậm hairline)
rPr:  sz=1800 b="0" solidFill FFFFFF latin Arial  → chữ trắng 18pt không đậm
```
Trên VN Slides trước khi sửa:
1. Chữ "Khối kiến trúc" bị đậm và to hơn (font-weight 700 thay vì normal 18pt).
2. Màu tô (fill) bị nhạt (#4a7bc5-ish thay vì #4472c4 đặc) do bị áp độ mờ 0.85.
3. Thiếu viền xanh đậm 1px (#2f5496) và bị bo góc 6px (thay vì góc vuông 0px).

## Nguyên nhân gốc rễ

1. **Adapter FODP (`slides-adapter.js`)**:
   - Khi soffice chuyển đổi PPTX sang FODP, thẻ `<draw:custom-shape draw:style-name="gr4">` tham chiếu style `gr4` có `draw:stroke="solid" svg:stroke-width="0cm" svg:stroke-color="#2f5496" draw:fill="solid" draw:fill-color="#4472c4"`. Văn bản bên trong dùng thẻ span với style `T4` có `fo:font-weight="normal"` và `fo:font-size="18pt"`.
   - `_parseDrawShape()` trước đây chỉ đọc màu `fill` cơ bản, bỏ qua toàn bộ định dạng viền (`draw:stroke`, `svg:stroke-color`, `svg:stroke-width`) và định dạng chữ (`fo:font-weight`, `fo:font-size`, `fo:color`).
   - `_odfInlineToHtml()` trước đây không xuất thuộc tính `font-weight: normal` vào inline style của span, làm cho văn bản rơi vào thừa kế style mặc định của class CSS.

2. **Canvas Renderer (`slides-canvas.js`)**:
   - Renderer hình học trước đây được thiết kế phục vụ các khối SmartArt diagram node, nên đặt cứng `opacity = 0.85` và `borderRadius = 6px` cho tất cả shape không phải textbox.
   - Lớp CSS `.vno-diagram-node-text` và `.vno-shape-text` có định nghĩa `font-weight: 700` cho node sơ đồ; khi shape thường không có inline style ghi đè `font-weight: normal`, chữ bị ép thành đậm (bold).
   - Renderer không vẽ thuộc tính `border` từ `shape.stroke` và `shape.strokeWidth`.

## Giải pháp thực hiện

1. **`adapters/libreoffice/slides/slides-adapter.js`**:
   - Mở rộng `_parseRichStyleMaps()`: bóc tách chính xác `fontWeight` và `weight` cho cả họ style `text` và `para`.
   - Cập nhật `_odfInlineToHtml()`: sinh inline style `font-weight:${fmt.fontWeight}` khi span có khai báo độ đậm, đảm bảo `normal` được bảo toàn nguyên vẹn.
   - Bổ sung vào `_parseGraphicFillStyles()`: phân tích đầy đủ `strokeKind`, `stroke`, `strokeWidth` (quy đổi hairline `0cm` solid stroke thành `1px`), `fontWeight`, `fontSize`, `fontColor`, `fontFamily`, `textAlign` và kế thừa từ style cha.
   - Cập nhật `_parseDrawShape()`: giải quyết triệt để `fill`, `stroke`, `strokeColor`, `strokeWidth`, `fontWeight`, `bold`, `fontSize`, `fontColor`, `textAlign`.
   - Cập nhật hàm tuần hoàn lưu FODP để duy trì `stroke` trong `<style:graphic-properties>`.

2. **`apps/slides/slides-canvas.js`**:
   - Cập nhật `_renderShapesLayer()`:
     - Đặt nền: `backgroundColor = shape.fill || shape.color`.
     - Vẽ viền nếu có: `border: ${sw}px solid ${sc}` kèm `boxSizing: border-box`.
     - Phân biệt diagram node vs shape thường: `opacity = isDiagramNode ? "0.85" : "1"`; `borderRadius = shape.type === "ellipse" ? "50%" : (isDiagramNode ? "6px" : "0")`.
     - Tách biệt CSS class: gán `.vno-diagram-node-text` cho sơ đồ và `.vno-shape-text` cho shape thông thường.
     - Đặt thẳng `textEl.style.fontWeight = shape.fontWeight`, `fontSize`, `textAlign` lên element chữ.
   - Cập nhật đồng bộ các màn hình trình chiếu (Slide Show), Slide Sorter và Thumbnails.

## Kết quả kiểm thử & Bằng chứng thị giác

1. **Ảnh chụp lại (`_app_after_s2.png`)**:
   - Khớp trực quan với `_ppt_sample-slides/ppt_slide2.png`:
     - Chữ "Khối kiến trúc" hiển thị đúng font chữ thường, không đậm, cỡ chữ 18pt màu trắng.
     - Hình chữ nhật có màu nền xanh đặc `#4472c4` (không mờ đục).
     - Viền mảnh 1px `#2f5496` hiển thị sắc nét.
     - Bốn góc hình chữ nhật vuông vức (0px radius).
     - Textbox bên phải "Kiến trúc nền tảng LibreOffice" hiển thị đúng 32pt chữ thường Arial.

2. **Unit Test bổ sung**:
   - Tệp `tests/unit/slides-import-fidelity.test.js`:
     - Bài kiểm tra: `parseFodp: custom-shape đọc đúng fill, stroke hairline 1px, và fo:font-weight normal từ FODP`.
     - Xác nhận cả tầng model parse từ XML FODP và tầng render canvas DOM.

3. **Toàn bộ Test Suite**:
   - Chạy lệnh: `npm test`
   - Kết quả: **1736/1736 PASS | 0 FAIL**.
