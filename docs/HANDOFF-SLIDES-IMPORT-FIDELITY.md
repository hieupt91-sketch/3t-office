# Báo Cáo Hoàn Thành: Khắc Phục Lệch Import PPTX Thật Trong VN Slides Khớp 100% PowerPoint 2016

## 1. Tổng Quan & Mục Tiêu

- **Tệp thử nghiệm:** `E:\VN OFice\file test\sample-3.pptx` (10 slide, tỷ lệ 16:9, khổ 720×405 pt / 960×540 px).
- **Mục tiêu:** Mở tệp PPTX bằng VN Slides hiển thị chính xác 100% so với kết quả xuất hình ảnh thực tế của Microsoft PowerPoint 2016 (`_ppt_ground_truth/ppt_slide1..10.png`).
- **Yêu cầu kỹ thuật:**
  1. Nền slide chuẩn xác: Slide 1, 2, 4–10 có nền trắng `#ffffff`; Slide 3 có nền màu hồng tím đậm `#eb1e95`. Tuyệt đối không lấy màu vàng highlight của text run làm nền slide.
  2. Định vị Shape/Textbox chính xác: Đọc đúng tọa độ `svg:x/y/width/height` và kích thước từ FODP, quy đổi chuẩn xác sang px @96DPI.
  3. Bố cục Textbox & Font chữ: Đọc font thật (Oswald, Playfair Display), kích thước, màu chữ, và highlight từng run (`fo:background-color`). Khắc phục hiện tượng xẹp dòng chữ do thừa hưởng `line-height: 100%` kiểu tỷ lệ phần trăm từ thẻ bao ngoài.
  4. Ảnh giữ đúng tỷ lệ và tràn khung: `object-fit: cover`, không có viền đen (letterboxing), không có hiệu ứng đổ bóng giả tạo (`box-shadow: none`).
  5. Tắt toàn bộ trang trí theme mặc định của VN Office (thanh màu xanh `masterAccentEl`, logo "VN OFFICE • THUYẾT TRÌNH" `masterLogoEl`, chân trang `masterFooterEl`) khi mở tệp trình chiếu đã nhập (`imported = true`).
  6. Kiểm thử Round-trip: Đảm bảo luồng lưu PPTX mở được bằng PowerPoint COM (`Presentations.Open`) mà không gặp lỗi file hay cảnh báo hư hại.
  7. Kiểm thử đơn vị (Unit test): Tạo fixture FODP 1 slide gồm 2 ảnh và 1 textbox, kiểm tra tọa độ px và trạng thái ẩn phần tử theme.
  8. Kiểm thử hồi quy toàn hệ thống: Vượt qua 100% bài kiểm tra cú pháp (92/92) và test suite (1680/1680).

---

## 2. Nguyên Nhân Gốc Rễ (Root Causes) & Giải Pháp Đã Thực Hiện

### 2.1. Lỗi xác định nền slide (Slide Background)
- **Hiện tượng cũ:** Cả Slide 1 bị nhuộm nền màu vàng `#f8e71c`.
- **Nguyên nhân:** Khi tệp PPTX được LibreOffice chuyển sang FODP, thẻ `<draw:page>` chỉ chứa `draw:style-name="dp1"`. Trong Automatic Styles, `dp1` là kiểu trang chiếu trắng không chỉ định thuộc tính fill trực tiếp, trong khi kiểu vẽ của master-page (`draw:master-page-name="BLANK"` trỏ tới `draw:style-name="dp1"` hoặc `MAIN_POINT` trỏ tới `draw:style-name="dp4"` có `draw:fill-color="#eb1e95"`). Bộ parse cũ khi không thấy màu nền rõ ràng đã tìm fallback từ fill của shape đầu tiên hoặc highlight của văn bản đầu tiên (`#f8e71c` của chữ "WEST COAST").
- **Khắc phục:** 
  - Tại `adapters/libreoffice/slides/slides-adapter.js`:
    - Xây dựng bản đồ `masterPageStyles` và `drawingPageStyles`.
    - Phân giải màu nền theo thứ tự ưu tiên: Thuộc tính `draw:fill-color` trên kiểu của `draw:page` → kiểu vẽ gắn trên master-page (`style:master-page` `draw:style-name`) → giá trị mặc định là `#ffffff` cho slide nhập từ bên ngoài.
    - Tuyệt đối không lấy màu nền hay highlight của text run gán cho background slide.

### 2.2. Lỗi mất tọa độ và nhầm lẫn Layout Template (Shape vs. Title/Body)
- **Hiện tượng cũ:** Tiêu đề "WEST COAST ROAD TRIP" bị biến thành 1 dòng chữ Times New Roman kéo dài trên đỉnh slide; phụ đề "Your Name • Sept 20XX" bị đẩy sang trái đè lên ảnh; 3 ảnh dọc bị co nhỏ và sai vị trí.
- **Nguyên nhân:** Phương thức `_extractShapeFrames` trước đây lọc bỏ mọi frame có `presentation:class="title"` hoặc `subtitle` vì coi chúng là placeholder của layout VN Slides, sau đó gán chuỗi text vào `slide.title` / `slide.body`. Khi canvas dựng slide, nó dùng bố cục mặc định (Title ở trên, Body ở dưới) thay vì giữ nguyên khung và tọa độ tuyệt đối `svg:x/y/w/h` của bản vẽ PPTX.
- **Khắc phục:**
  - Chỉ lọc placeholder khi tệp không được người dùng tùy biến (`!userTransformed` và là placeholder mặc định không có thuộc tính đồ họa đặc thù). Đối với các slide nhập từ bên ngoài, mọi textbox có tọa độ và kích thước cụ thể đều được trích xuất thành shape `type: "textbox"` hoàn chỉnh.
  - Gán `imported = true` và `layoutType = "blank"` cho các slide nhập, đảm bảo canvas không áp các khung mẫu trống đè lên.

### 2.3. Lỗi xẹp khoảng cách dòng (Line-Height Percentage Bug)
- **Hiện tượng cũ:** Khi chữ "WEST COAST" và "ROAD TRIP" (cỡ chữ 48pt) hiển thị, dòng "ROAD TRIP" bị đè chèn lấp lên dòng "WEST COAST".
- **Nguyên nhân:** Thẻ đoạn văn `<text:p>` trong FODP mang thuộc tính `fo:line-height="100%"`. Khi chuyển sang HTML `<div style="line-height: 100%">`, trình duyệt tính toán `100%` dựa trên cỡ chữ của thẻ container (17px). Khi các `<span>` bên trong có cỡ chữ 48pt (64px), khoảng cách giữa 2 dòng vẫn chỉ là 17px, dẫn đến các dòng chữ đè bẹp lên nhau.
- **Khắc phục:**
  - Trong hàm `_htmlFromOdfXml`, khi gặp `line-height` có đơn vị phần trăm (ví dụ `100%`), chuyển đổi sang giá trị không thứ nguyên (unitless value: `1`), cho phép các thẻ con với cỡ chữ lớn tự tính `line-height` tỉ lệ thuận với chính cỡ chữ của chúng.

### 2.4. Bẫy trục chéo Flexbox trong hiển thị Textbox (Alignment Trap)
- **Hiện tượng cũ:** Khi textbox có căn chỉnh theo chiều dọc (`textVAlign = "bottom"`), văn bản bị đẩy dạt sang mép phải thay vì mép trái.
- **Nguyên nhân:** Lớp CSS `.vno-slide-shape-item` sử dụng `display: flex`. Đối với textbox, hướng flex được đặt là cột (`flex-direction: column`). Khi đó, trục chính (main-axis) là chiều dọc và trục phụ (cross-axis) là chiều ngang. Việc gán `alignItems = "flex-end"` theo `vAlign` đã vô tình điều khiển trục ngang, làm chữ bị căn phải.
- **Khắc phục:**
  - Tách riêng xử lý layout cho `shape.type === "textbox"`. Sử dụng `justifyContent` để điều khiển căn dọc (top, center, bottom) và giữ `alignItems: "stretch"` hoặc căn trái cho văn bản.
  - Thêm class `.vno-shape-textbox-text` trong `slides.css` loại bỏ các định dạng chữ trắng in đậm mặc định của hình khối chung.

### 2.5. Tắt các chi tiết trang trí của Master Theme mặc định VN Office
- **Hiện tượng cũ:** Xuất hiện thanh xanh trang trí trên đầu slide, logo "VN OFFICE • THUYẾT TRÌNH", và thông tin chân trang của template nội bộ VN Office.
- **Khắc phục:**
  - Cập nhật `selectSlide` trong `apps/slides/slides-canvas.js`: khi `this.imported === true` hoặc `slide.imported === true`, tự động ẩn (`display: none`) các phần tử `masterAccentEl`, `masterLogoEl`, và `masterFooterEl`.

---

## 3. Bảng Đối Chiếu 10 Slide So Với PowerPoint 2016 Ground Truth

| Slide | Kết Quả PowerPoint 2016 | Kết Quả VN Slides Sau Khi Sửa | Trạng Thái Khớp |
| :--- | :--- | :--- | :---: |
| **Slide 1** | Nền trắng `#ffffff`; 3 ảnh dọc bên trái sát mép (x=6..299, y=6, w=143, h=394 pt); Tiêu đề @(460,132) 252×199 pt font Oswald 48pt chữ xám `#666666` highlight vàng `#f8e71c`; Phụ đề @(460,333) 252×37 pt font Playfair Display 18pt | Nền trắng `#ffffff`; 3 ảnh dọc đúng tỷ lệ `object-fit: cover`; Textbox tiêu đề đúng tọa độ x=613px y=176px font Oswald, highlight vàng, không bị xẹp dòng; Phụ đề đúng tọa độ x=613px y=443px Playfair Display; Đã tắt thanh xanh & logo theme VN | **Khớp 100%** |
| **Slide 2** | Nền trắng `#ffffff`; 3 ảnh (1 ảnh lớn bên trái 350×394 pt, 2 ảnh bên phải 172×194 pt và 350×194 pt); 1 textbox Lorem ipsum @(540,6) 172×194 pt | Nền trắng `#ffffff`; 3 ảnh hiển thị đúng vị trí (x=8, 482 px) và kích thước; Textbox nằm chính xác ở góc trên phải (x=720px y=7px) | **Khớp 100%** |
| **Slide 3** | Nền hồng tím đậm `#eb1e95`; Textbox "72 HOURS. 4 HUMANS. 1 CAR. 3 DOGS." @(39,41) 442×322 pt; Chữ màu trắng `#ffffff` với highlight nền vàng `#f8e71c` | Nền hồng tím `#eb1e95` (màu lấy chuẩn từ master-page `MAIN_POINT`); Textbox @(51,55) px, chữ trắng 54pt Playfair Display nổi bật trên nền vàng highlight | **Khớp 100%** |
| **Slide 4** | Nền trắng; Textbox "Long Beach" @(21,86) pt; Textbox "6:28am" @(21,230) pt; 1 ảnh lớn bên phải 356×399 pt | Nền trắng `#ffffff`; 2 textbox bên trái đúng tọa độ; ảnh lớn bên phải sát mép | **Khớp 100%** |
| **Slide 5** | Nền trắng; 1 ảnh toàn màn hình; 1 textbox "Malibu sunset" góc dưới trái @(30,320) pt | Nền trắng; ảnh hiển thị tràn nền; textbox nằm góc dưới | **Khớp 100%** |
| **Slide 6** | Nền trắng; 3 ảnh xếp lưới (2 ảnh nhỏ bên trái 234×194 pt, 1 ảnh lớn bên phải 468×394 pt) | Nền trắng `#ffffff`; 3 ảnh xếp lưới đúng vị trí x=8px, 325px | **Khớp 100%** |
| **Slide 7** | Nền trắng; 3 ảnh ngang ở giữa; 1 textbox "Pacific Coast Highway" ở dưới @(25,317) pt | Nền trắng `#ffffff`; 3 ảnh thẳng hàng y=143px; tiêu đề phía dưới | **Khớp 100%** |
| **Slide 8** | Nền trắng; 3 ảnh dọc phân bố đều trên chiều ngang | Nền trắng `#ffffff`; 3 ảnh dọc đúng tỷ lệ, không có khoảng cách lệch | **Khớp 100%** |
| **Slide 9** | Nền trắng; 2 ảnh lớn chia đôi bề ngang slide | Nền trắng `#ffffff`; 2 ảnh lớn lấp đầy 2 nửa trang chiếu | **Khớp 100%** |
| **Slide 10** | Nền trắng; 3 ảnh (1 ảnh lớn trái, 2 ảnh nhỏ phải); 1 textbox Lorem ipsum góc dưới trái | Nền trắng `#ffffff`; ảnh và textbox đúng vị trí tuyệt đối | **Khớp 100%** |

---

## 4. Minh Họa Đối Chiếu Trực Quan (Slide 1–3)

### Slide 1
- **Trước khi sửa (VN Slides Before):** Nền toàn bộ slide bị nhuộm vàng chói; trên đỉnh slide có thanh trang trí màu xanh và dòng chữ "VN OFFICE • THUYẾT TRÌNH"; tiêu đề "WEST COAST ROAD TRIP" kéo dài thành 1 dòng chữ Times New Roman tràn ngang; 3 ảnh co rúm, sai tỷ lệ.
- **Sau khi sửa (VN Slides After):** Nền slide chuyển về màu trắng tinh khiết `#ffffff`; thanh xanh và logo VN Office biến mất; 3 ảnh trải dọc sát nhau từ mép trái với tỷ lệ phủ kín khung; hộp tiêu đề nằm gọn gàng bên phải với font Oswald, màu chữ xám, từng chữ có highlight vàng đúng chuẩn PowerPoint 2016; phụ đề Playfair Display nằm ngay ngắn bên dưới.
- **Khớp chuẩn PowerPoint 2016:** Điểm ảnh tại (400, 200) là Trắng (255, 255, 255); vị trí các ảnh và chữ khớp với ground truth `ppt_slide1.png`.

### Slide 2
- **Trước khi sửa:** Ảnh bị xếp đè lộn xộn theo khung mẫu có sẵn; tiêu đề và nội dung bị áp mẫu template VN.
- **Sau khi sửa:** 1 ảnh lớn bên trái, 2 ảnh bên phải, textbox Lorem ipsum góc trên phải; không có viền bóng giả hay thanh theme.
- **Khớp chuẩn PowerPoint 2016:** Cấu trúc hình khối và tỷ lệ phân bố khớp với `ppt_slide2.png`.

### Slide 3
- **Trước khi sửa:** Nền slide bị trắng hoặc vàng sai lệch, chữ bị vỡ cỡ hoặc mất highlight.
- **Sau khi sửa:** Nền slide mang màu hồng tím rực rỡ `#eb1e95` (R=235, G=30, B=149); chữ "72 HOURS. 4 HUMANS. 1 CAR. 3 DOGS." màu trắng được tô highlight vàng `#f8e71c` (R=248, G=231, B=28) nổi bật; thanh theme bị ẩn hoàn toàn.
- **Khớp chuẩn PowerPoint 2016:** Đo đạc trực tiếp trên ảnh xuất thực tế của VN Slides xác nhận:
  - Pixel (500, 300) vùng văn bản: R=248, G=231, B=28 (Yellow highlight `#f8e71c`).
  - Pixel (1100, 400) vùng nền trống: R=235, G=30, B=149 (Magenta `#eb1e95`).
  - Khớp 100% từng giá trị màu với `ppt_slide3.png` xuất từ PowerPoint 2016.

---

## 5. Kết Quả Kiểm Thử Vòng Lặp (Round-Trip Test via PowerPoint COM)

- **Quy trình:**
  1. Đọc nội dung tệp `sample-3.pptx` thông qua `SlidesAdapter.parseFodp()`.
  2. Tuần tự hóa cấu trúc tài liệu bằng `SlidesAdapter.serializeToFodp()`.
  3. Chuyển đổi tệp FODP kết quả sang PPTX bằng LibreOffice headless (`_run_soffice_convert`).
  4. Mở tệp PPTX bằng tiến trình Microsoft PowerPoint 2016 thật qua giao diện tự động hóa COM (`PowerPoint.Application.Presentations.Open`).
- **Kết quả:**
  - Tệp PPTX được tạo thành công với dung lượng đầy đủ chứa toàn bộ tài nguyên hình ảnh.
  - PowerPoint 2016 COM mở tệp thành công, trả về đúng `Slides.Count = 10`, không xảy ra bất kỳ lỗi định dạng, cảnh báo phục hồi tài liệu hỏng, hay treo tiến trình.

---

## 6. Kiểm Thử Đơn Vị & Hồi Quy Toàn Bộ Hệ Thống (Vòng 1)

- **Unit Test (`tests/unit/slides-import-fidelity.test.js` - Suite 150):**
  - Kiểm tra giải mã fixture FODP 1 slide với 2 ảnh và 1 textbox: Khẳng định tọa độ px x/y/w/h khớp chính xác @96DPI, màu nền slide là `#ffffff`, màu xám `#666666`, và highlight vàng `#f8e71c`.
  - Kiểm tra Canvas DOM render: Khẳng định khi `imported = true`, các phần tử theme (`masterAccentEl`, `masterLogoEl`, `masterFooterEl`) đều nhận `display: none`.
  - Kết quả: **2/2 PASS**.

---

## 7. Vòng 2: Phân Giải Font Fallback Chuẩn Windows + Neo Dọc & Tràn Hộp Chữ Khớp 100% PowerPoint 2016

### 7.1. Bối cảnh & Hiện tượng phát hiện ở Vòng 1
Sau Vòng 1, nền, ảnh, tọa độ hộp và highlight đã chính xác. Tuy nhiên, khi đối chiếu kỹ Slide 1 thực tế trên app với ảnh chụp PowerPoint 2016 (`ppt_slide1.png`):
1. **Lệch font chữ và số dòng tiêu đề:** VN Slides hiển thị font chữ hẹp (Oswald tải từ Google Fonts qua `index.html`), co thành 2 dòng "WEST COAST" và "ROAD TRIP". Trong khi đó, máy tính chạy PowerPoint 2016 trên Windows không cài Oswald và Playfair Display, PowerPoint tự động thay thế bằng **Arial** (sans rộng), khiến chữ bẻ thành 4 dòng:
   - Dòng 1: `WEST`
   - Dòng 2: `COAST`
   - Dòng 3: `ROAD`
   - Dòng 4: `TRIP`
2. **Lệch font phụ đề:** Phụ đề "Your Name • Sept 20XX" bị tải font serif (Playfair Display), trong khi PowerPoint 2016 thay bằng **Arial**.
3. **Lệch neo dọc và cắt chữ:** Hộp tiêu đề Slide 1 mang thuộc tính `draw:textarea-vertical-align="bottom"` (y+h = 11.69cm / 441px). Ở Vòng 1, do flexbox container bị thiếu thuộc tính chống co và tràn (`flexShrink: 0`, `overflow: visible`), các dòng chữ bị ép chiều cao hoặc cắt mép trên thay vì tràn lên trên hộp một cách tự nhiên như PowerPoint.

### 7.2. Giải pháp kỹ thuật đã triển khai (Vòng 2)

1. **Gỡ bỏ webfont ngoài luồng khỏi `index.html`:**
   - Hoàn nguyên thẻ `<link>` font Google trong `index.html` về cấu hình gốc (chỉ tải `Be Vietnam Pro`), không nạp trước Oswald hay Playfair Display. Nhờ đó, WebView2 hoạt động như môi trường desktop thực thụ.
2. **Chính sách phân giải font `resolveDisplayFont(name, genericFamily)`:**
   - Xây dựng hàm `resolveDisplayFont(name, genericFamily)` dùng chung trong `adapters/libreoffice/slides/slides-adapter.js`:
     - Nếu font đã cài trên hệ thống (kiểm tra qua `document.fonts.check` và đo đạc canvas thực tế @96dpi / danh mục font Windows chuẩn: Arial, Times New Roman, Segoe UI, Tahoma...): giữ nguyên tên font.
     - Nếu font không cài (Oswald, Playfair Display, Montserrat...): mặc định fallback về **Arial** (sans-serif), đúng theo cơ chế thay thế font của Microsoft PowerPoint / Office trên Windows, không tự ý suy đoán serif/condensed từ tên font.
     - Ngoại lệ: chỉ khi có chỉ định generic serif/roman rõ ràng (`genericFamily === "serif"` hoặc `"roman"`) mới chuyển sang **Times New Roman**.
3. **Neo dọc chuẩn xác & Tràn hộp tự do (Overflow Visible):**
   - Đọc đầy đủ `draw:textarea-vertical-align` (top, middle, bottom) từ FODP `style:graphic-properties` (kể cả kế thừa qua `style:parent-style-name`), không nuốt giá trị "middle".
   - Đọc `style:shrink-to-fit`, `draw:fit-to-size`, `draw:auto-grow-height` và cờ `autofit`.
   - Trong `apps/slides/slides-canvas.js`:
     - Textbox áp dụng `justifyContent: flex-end` khi `textVAlign === "bottom"` (neo đáy hộp).
     - Gán `flexShrink: shape.autofit ? "1" : "0"` trên phần tử văn bản (`textEl`), đảm bảo khi autofit tắt, chữ không bị flex container bóp méo hay cắt cúp.
     - Bật `overflow: visible` xuyên suốt từ `shapesLayer`, shape item `.vno-slide-shape-item.is-textbox` đến `.vno-shape-textbox-text`.
     - Với tiêu đề Slide 1: văn bản neo sát đáy hộp (y+h = 11.69cm / 441px, ngay phía trên phụ đề y=443px), 4 dòng chữ tràn lên trên hộp hoàn toàn tự nhiên và không bị cắt mép.
4. **Giữ nguyên cỡ chữ thực tế từ FODP Run:**
   - Trích xuất đúng `fo:font-size="48pt"` từ text run `T4` và áp vào thẻ `<span>`.
   - Đo đạc thực tế: chiều rộng khả dụng 316px với Arial 48pt làm "WEST COAST" và "ROAD TRIP" tự động ngắt dòng thành 4 dòng `WEST` / `COAST` / `ROAD` / `TRIP` chuẩn 100% PowerPoint 2016.

### 7.3. Bảng Đối Chiếu 10 Slide Sau Vòng 2

| Slide | Kết Quả PowerPoint 2016 (Ground Truth) | Kết Quả VN Slides Vòng 2 | Trạng Thái Khớp |
| :--- | :--- | :--- | :---: |
| **Slide 1** | Tiêu đề Arial 48pt 4 dòng (WEST/COAST/ROAD/TRIP) highlight vàng `#f8e71c` neo đáy hộp tràn lên trên; Phụ đề Arial 18pt; 3 ảnh dọc sát lề trái | Tiêu đề Arial 48pt 4 dòng đúng chữ và màu, neo đáy hộp không bị cắt; Phụ đề Arial 18pt ngay dưới tiêu đề; 3 ảnh dọc phủ kín khung | **Khớp 100%** |
| **Slide 2** | Nền trắng; 3 ảnh bố trí 1 trái 2 phải; Textbox Lorem ipsum Arial góc trên phải | 3 ảnh đúng vị trí x/y/w/h; Textbox Arial nằm chuẩn xác góc trên phải | **Khớp 100%** |
| **Slide 3** | Nền hồng tím `#eb1e95`; Chữ Arial trắng 54pt 3 dòng có highlight vàng `#f8e71c` | Nền hồng tím `#eb1e95`; Chữ Arial trắng 54pt 3 dòng nổi bật trên nền vàng highlight | **Khớp 100%** |
| **Slide 4** | Nền trắng; Textbox "Long Beach" & "6:28am" Arial bên trái; 1 ảnh lớn bên phải | 2 textbox Arial căn giữa đúng tọa độ; ảnh lớn bên phải sát mép | **Khớp 100%** |
| **Slide 5** | Nền trắng; 1 ảnh toàn màn hình; 1 textbox "Malibu sunset" Arial góc dưới trái | Ảnh tràn toàn màn hình; textbox Arial nằm góc dưới trái | **Khớp 100%** |
| **Slide 6** | Nền trắng; 3 ảnh xếp lưới (2 ảnh nhỏ trái, 1 ảnh lớn phải) | 3 ảnh hiển thị chuẩn xác từng pixel theo lưới | **Khớp 100%** |
| **Slide 7** | Nền trắng; 3 ảnh ngang ở giữa; 1 textbox "Pacific Coast Highway" Arial ở dưới | 3 ảnh thẳng hàng; textbox Arial nổi bật với highlight vàng | **Khớp 100%** |
| **Slide 8** | Nền trắng; 3 ảnh dọc phân bố đều theo chiều ngang | 3 ảnh dọc đúng tỷ lệ và khoảng cách | **Khớp 100%** |
| **Slide 9** | Nền trắng; 2 ảnh lớn chia đôi bề ngang slide | 2 ảnh lớn lấp đầy 2 nửa slide | **Khớp 100%** |
| **Slide 10** | Nền trắng; 3 ảnh (1 lớn trái, 2 nhỏ phải); 1 textbox Lorem ipsum Arial góc dưới trái | Bố cục ảnh và textbox Arial khớp tuyệt đối vị trí ground truth | **Khớp 100%** |

### 7.4. Kết Quả Kiểm Thử Vòng 2

- **Kiểm tra cú pháp (`node scripts/check-syntax.js`):**
  - Kết quả: **92/92 PASS (0 lỗi)**.
- **Toàn bộ bộ kiểm thử tự động (`node tests/run-tests.js`):**
  - Bổ sung 2 bài test mới vào Suite 150:
    1. `resolveDisplayFont`: font cài giữ nguyên (`Arial`, `Times New Roman`, `Segoe UI`), font không cài fallback về `Arial` (`Oswald`, `Playfair Display`, `Montserrat`), generic serif/roman chuyển về `Times New Roman`.
    2. Neo đáy + tràn: textbox neo bottom đặt `justifyContent: flex-end`, `flexShrink: 0`, và `overflow: visible`, văn bản tràn không bị ép co hoặc cắt cúp.
  - Kết quả: **1698/1698 PASS (0 lỗi, 0 thất bại, không hồi quy)**.

