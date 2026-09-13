# Handoff: Báo Cáo Rà Soát Chiều Lưu Slides 2..10 (sample-3.pptx)

## 1. Kết Quả Khắc Phục 2 Lỗi Trọng Tâm

### Lỗi 1: Mất inset (padding) hộp chữ làm chữ lệch lên ~0.13cm
- **Nguyên nhân gốc:** FODP sinh bởi LibreOffice từ file PPTX gốc có chứa `fo:padding-top/bottom/left/right="0.254cm"` trong `style:graphic-properties` của `style:family="graphic|presentation"`. Hàm `_odfLengthToPx` trước đây làm tròn số nguyên (`Math.round`) và `serializeToFodp` không ghi lại thuộc tính `fo:padding-*` cho các style đồ họa của frame. LibreOffice khi thiếu `fo:padding-*` trong FODP tự động gán giá trị mặc định `lIns="90000" tIns="45000" rIns="90000" bIns="45000"`, làm chữ bị thụt top chỉ còn 0.125cm thay vì 0.254cm (lệch lên ~0.13cm).
- **Giải pháp:**
  - `_odfLengthToPx(raw, round = true)`: hỗ trợ `round = false` để giữ nguyên giá trị pixel thực (9.6px cho 0.254cm), khi chuyển đổi ngược qua `_pxToOdf(9.6)` trả lại chính xác `0.254cm`.
  - `_parseGraphicFillStyles`: đọc đủ 4 cạnh `fo:padding-top/bottom/left/right` và dạng gộp `fo:padding`. Kế thừa `fill` và `stroke` qua chuỗi `parentStyleName`.
  - `_parseFrameShape` & `_parseDrawShape`: trích xuất padding từ style và thuộc tính trực tiếp.
  - `_padKey(shape)` & `_shapeTextStyleSuffix(shape)`: tạo hậu tố phân biệt theo padding cho các shape có padding khác rỗng.
  - `_textStyleGraphicAttrs(shape)`: xuất `fo:padding-top/bottom/left/right="${this._pxToOdf(shape.padding*)}"` vào `style:graphic-properties`.
- **Kết quả xác minh XML:**
  - Slide 4: `Google Shape;80;p16` bodyPr trong `_rt_after.pptx` có `tIns="91440" bIns="91440"` (lIns/rIns mặc định OOXML = 91440), khôi phục chuẩn 91440 EMU (~0.254cm) 4 cạnh.
  - Slide 7: `Google Shape;100;p19` bodyPr có `tIns="91440" bIns="91440"`.

### Lỗi 2: Mất màu nền hộp chữ (Slide 10: hộp trắng "Lorem ipsum" biến thành trong suốt)
- **Nguyên nhân gốc:** `_isTransparentFill(shape)` trước đây trả về `true` vô điều kiện cho mọi shape có `type === "textbox" || type === "text"`, bỏ qua `shape.color`. Do đó, khi lưu, hộp chữ luôn dùng style `grNone` (`draw:fill="none"`), LibreOffice xuất ra OOXML `<p:spPr><a:noFill/></p:spPr>`.
- **Giải pháp:**
  - Sửa `_isTransparentFill(shape)`: chỉ trả về `true` khi `shape.type === "wordart"` hoặc `!shape?.color || shape.color === "transparent" || shape.color === "none"`. Hộp chữ có màu (ví dụ `#ffffff`) được giữ nguyên kiểu fill `solid` và màu `draw:fill-color="#ffffff"`.
  - Sửa `_parseFrameShape`: đọc `draw:fill-color` và `draw:fill` từ frame, box hoặc graphicStyles.
  - Cập nhật canvas (`apps/slides/slides-canvas.js`): gán đồng thời `backgroundColor` và `background` theo màu shape.
  - Cập nhật `apps/slides/slides.css`: bỏ `background: transparent` cưỡng bức tại `.vno-slide-shape-item.is-textbox`.
- **Kết quả xác minh XML:**
  - Slide 10: `Google Shape;122;p22` trong `_rt_after.pptx` khôi phục thành `<p:spPr><a:prstGeom prst="rect"><a:avLst/></a:prstGeom><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:ln w="0"><a:noFill/></a:ln></p:spPr>`, khớp hoàn toàn thẻ `<a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill>` của bản gốc.

---

## 2. Bảng Rà Soát 10 Slide (_ppt_orig vs _ppt_rt_after)

| Slide | Tỉ lệ khác biệt pixel (trước -> sau) | Lệch còn lại | Nguyên nhân kỹ thuật |
| :--- | :--- | :--- | :--- |
| **Slide 1** | 10.29% -> 8.12% | Vị trí các dòng chữ tiêu đề và khử răng cưa font | Font Arial hiển thị trên hệ thống qua LibreOffice có kerning/tracking hơi khác Google Slides/PowerPoint gốc; ảnh nền 3 dải dọc đã khớp crop. |
| **Slide 2** | 21.91% -> 21.04% | Hai textbox bên phải có khoảng cách dòng (line spacing) | `sample-3.pptx` gốc dùng `spcAft="1600"` (space after 16pt) trên các đoạn văn bản; LibreOffice FODP chuyển đổi sang `fo:line-height` có độ dãn dòng tương đối khác một chút so với DrawingML native. |
| **Slide 3** | 22.76% -> 22.10% | Tông màu nền ảnh toàn trang chiếu | Ảnh nền raster lớn trải qua chu trình giải mã/tái nén của LibreOffice engine có độ lệch nhẹ về color profile / gamma. |
| **Slide 4** | 1.94% -> **0.66%** | Gần như trùng khớp hoàn toàn (±1-2px viền chữ) | Sau khi khôi phục padding 0.254cm, text box "Long Beach" và nội dung bên dưới đã khớp đúng vị trí Y của bản gốc. Độ lệch 0.66% chủ yếu là anti-aliasing chữ. |
| **Slide 5** | 7.79% -> **0.45%** | Gần như trùng khớp hoàn toàn (<0.5%) | Padding và căn lề hộp chữ được bảo toàn, chữ trùng vị trí gốc. |
| **Slide 6** | 3.70% -> 3.70% | Khung chữ và viền các thẻ nội dung | Bố cục các thẻ dạng lưới khớp tốt; độ lệch nhẹ do font metrics và padding mặc định của thẻ cha. |
| **Slide 7** | 9.92% -> **8.59%** | Vị trí chữ tiêu đề dưới chân slide | Khôi phục padding `tIns="91440" bIns="91440"` giúp dòng chữ hạ đúng tọa độ, giảm độ lệch so với gốc; phần lệch còn lại do font metrics và kerning. |
| **Slide 8** | 14.04% -> 14.04% | Hai cột so sánh văn bản | Hai khối chữ dạng danh sách có bullet / indentation phụ thuộc vào rendering engine của LibreOffice Impress. |
| **Slide 9** | 24.49% -> 24.49% | Bố cục khối nội dung chia cột | Các shape nhóm và khoảng cách dòng giữa các khối nội dung. |
| **Slide 10** | 12.54% -> **2.25%** | Giảm mạnh từ 12.54% xuống 2.25% (±1-2px viền) | Hộp chữ "Lorem ipsum" đã khôi phục trọn vẹn nền trắng `#ffffff` và padding 0.254cm, không còn bị trong suốt. Khác biệt còn lại chỉ là anti-aliasing chữ trên nền trắng. |

---

## 3. Tóm Lược Tiến Trình Kiểm Thử
- **Roundtrip save:** `_roundtrip_save_slides.py` chạy thực tế qua Desktop engine, lưu thành công `_rt_after.pptx` (18.4 MB).
- **PowerPoint 2016 COM export:** `_ppt_export_all.ps1` xuất đủ 10/10 slide PNG vào `_ppt_rt_after`.
- **Đối chiếu XML native:** `_pptx_textshapes.py` và `_pptx_sppr.py` xác nhận bodyPr insets 91440 và spPr solidFill FFFFFF.
