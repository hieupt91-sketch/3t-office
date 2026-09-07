# HANDOFF: VN Writer — Bổ sung 2 loại hình khối mới (Hình tam giác, Hình thoi) vào bộ công cụ Insert Shapes

## 1. Bối cảnh & Mục tiêu

- **Bối cảnh**: Claude vừa xử lý lỗi file DOCX thật chứa các hình cơ bản (`rect`, `ellipse`, `roundRect`) làm hỏng file khi mở trong VN Writer (ghi nhận tại `docs/HANDOFF-WRITER-COMMON-SHAPE-TYPES.md`). Trong quá trình đó, phát hiện VN Writer trước đây chỉ hỗ trợ 5 loại hình (`rectangle`, `round-rect`, `circle`, `arrow`, `line`). Các hình `triangle` và `diamond` buộc phải từ chối chủ đích khi đọc file DOCX vì VN Writer chưa có renderer vẽ 2 loại hình này.
- **Mục tiêu**: Bổ sung định nghĩa và renderer SVG cho 2 loại hình khối mới là **Hình tam giác** (`triangle`) và **Hình thoi** (`diamond`) trong VN Writer (`apps/writer/writer-illustrations.js`), kèm theo kiểm thử đơn vị, kiểm thử giao diện trực quan và tài liệu hướng dẫn sử dụng tiếng Việt trong ứng dụng.
- **Ranh giới an toàn**:
  - CHỈ sửa `apps/writer/writer-illustrations.js` về mặt logic ứng dụng Writer.
  - TUYỆT ĐỐI KHÔNG sửa `adapters/libreoffice/writer/writer-adapter.js` (logic mở/lưu DOCX/FODT cho 2 hình này thuộc phạm vi task sau của Claude/đồng đội).
  - Không ảnh hưởng Sheet hay Slides.

## 2. Chi tiết thay đổi

### 2.1. `apps/writer/writer-illustrations.js`
1. **Mảng `SHAPE_TYPES`**:
   Bổ sung 2 mục mới với đầy đủ thông tin đa ngữ và kích thước mặc định:
   ```javascript
   { id: "triangle", nameVi: "Hình tam giác", nameEn: "Triangle", defaultW: 120, defaultH: 100 },
   { id: "diamond", nameVi: "Hình thoi", nameEn: "Diamond", defaultW: 120, defaultH: 100 },
   ```
2. **Hàm `renderShapeSvg(shape)`**:
   - Thêm màu sắc mặc định hài hòa trong biểu thức tam phân:
     - `triangle`: `fill: "#16a34a"` (xanh lá), `stroke: "#15803d"`
     - `diamond`: `fill: "#9333ea"` (tím thạch anh), `stroke: "#7e22ce"`
   - Bổ sung 2 nhánh vẽ SVG `<polygon>` chuẩn viewBox `0 0 100 100` với `stroke-linejoin="round"`:
     - `triangle`: `points="50,4 96,92 4,92"` (tam giác cân hướng lên, cách mép 4px, không bị cắt nét vẽ).
     - `diamond`: `points="50,4 96,50 50,96 4,50"` (hình thoi đối xứng 4 góc, cách mép 4px).
3. **Hộp thoại `showShapeDialog`**:
   - Lưới hiển thị 7 thẻ hình khối tự động render SVG preview của từng hình (không vỡ layout).
   - Truyền màu mặc định khi người dùng bấm Chèn hoặc gõ Enter.

### 2.2. `platform/help/entries-writer.js` (Tuân thủ AGENTS.md Điều 10)
- Cập nhật bài hướng dẫn `writer.insert.illustrationsExtra` ("Chèn hình khối, sơ đồ và biểu đồ"):
  - Cập nhật tóm tắt và từ khóa: bổ sung `tam giác`, `hình thoi`, `triangle`, `diamond`.
  - Cập nhật các bước sử dụng: mô tả rõ 7 thẻ radio trong hộp thoại Chèn hình khối (kèm thông số kích thước và màu sắc mặc định).

### 2.3. Kiểm thử bổ sung
1. **`tests/unit/writer-illustration-dialogs.test.js`**:
   - Thêm 3 bài kiểm tra đơn vị:
     - Kiểm tra `SHAPE_TYPES` có `triangle` và `diamond` đúng tên tiếng Việt, tiếng Anh và kích thước `120x100`.
     - Kiểm tra `renderShapeSvg` sinh đúng thẻ SVG `<polygon>` với viewBox, points và màu sắc mặc định/tùy chỉnh.
     - Kiểm tra chọn `triangle` và `diamond` qua command chèn đúng loại và kích thước.
2. **`tests/live/writer-illustration-dialogs.playwright.mjs`**:
   - Mở rộng kiểm tra Playwright cho hộp thoại: xác nhận đủ 7 loại thẻ hình, preview SVG polygon cho tam giác và hình thoi.
   - Chèn tam giác và hình thoi lên canvas văn bản, kiểm tra đúng thẻ `<polygon>` với tọa độ points tương ứng.
   - Chụp ảnh màn hình hộp thoại (`writer-shape-dialog.png`) và canvas (`writer-shapes-canvas.png`).

## 3. Kết quả kiểm thử

- `node scripts/check-syntax.js`: **89/89 PASS** (0 lỗi cú pháp).
- `node tests/live/ribbon-audit-1280.playwright.mjs`: **100% PASS** (104/104 lượt kiểm tra, 0px tràn ngang tại 1280px).
- `node tests/live/writer-illustration-dialogs.playwright.mjs`: **100% PASS** (toàn bộ các bước kiểm tra hộp thoại, chèn tam giác, hình thoi, sơ đồ, biểu đồ, undo/redo).
- `node tests/run-tests.js`: **1471/1471 PASS** (tăng 3 test so với baseline 1468/1468, không giảm).
