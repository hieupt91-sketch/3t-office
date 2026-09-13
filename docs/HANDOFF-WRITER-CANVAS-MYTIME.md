# Handoff: Canvas VN Writer hiển thị MYTIME (88 trang) đồng bộ Word 2016

## 1. Tổng quan & Mục tiêu
- **Tài liệu kiểm thử**: `file test/MYTIME.docx` (88 trang, 137 hình vẽ/ảnh neo, 48 bảng, watermark "My Time").
- **Yêu cầu**: Canvas soạn thảo VN Writer hiển thị chính xác các ảnh screenshot phần mềm, hình mờ watermark chéo trang, và tỷ lệ cột bảng tương đương bản render Word 2016.
- **Nhánh thực hiện**: `fix/writer-canvas-mytime-agy` (dựa trên commit `1f2d6a4`).

---

## 2. Bảng đối chiếu Trước và Sau khi sửa

| Hạng mục | Trước khi sửa (Commit 1f2d6a4) | Sau khi sửa (fix/writer-canvas-mytime-agy) | Hình ảnh đối chiếu |
|---|---|---|---|
| **1. Ảnh neo (Screenshot phần mềm)** | Bị xếp chồng toàn bộ 137 ảnh lên trang 1 do paragraph carrier có `position: static` (khiến toạ độ `top` tính theo root container). Trang 3 và các trang sau hoàn toàn trống ảnh. Ngoài ra `z-index: -1` bị nền trắng che khuất. | Ảnh neo được gán `data-vno-page-image="1"`, container ngắt trang mang `position: relative`, toạ độ canvas tính theo lề trang (`displayTop - marginTopCm`). Ảnh screenshot hiển thị đúng trang 3 giữa các đoạn hướng dẫn như Word. | Word: `_word_png/mytime_p3.png`<br>App: `_app_after_p3.png` |
| **2. Watermark ("My Time" chéo mờ)** | Watermark bị ẩn sau nền trang do `z-index: -1` kết hợp `isolation: isolate` trên `.vno-writer-page`. Không phân loại được ảnh watermark lặp lại qua nhiều trang. | Phân loại tự động qua `isRepeatedPageWatermark` (ảnh lặp >= 3 lần, `behindDoc="1"`, kích thước >= 10cm x 10cm, `relativeFrom="page"`), gán `data-vno-imported-watermark="1"`, `z-index: 0`. Watermark hiện rõ trên mọi trang (trang 1, trang 3...). | Word: `_word_png/mytime_p1.png`, `_word_png/mytime_p3.png`<br>App: `_app_after_p1.png`, `_app_after_p3.png` |
| **3. Bề rộng cột bảng (Table Geometry)** | StarWriter HTML xuất bảng footer với tỷ lệ cột chia đều (313px / 313px), làm tiêu đề footer bên trái bị co hẹp, số trang bên phải bị đẩy lệch. | Bổ sung `_applyOoxmlTableColumnGeometry` ánh xạ tỷ lệ `w:tcW` từ OOXML sang `<col width="...">` và `<td width="...">` (khôi phục tỷ lệ 586px / 39px của Word). Footer dàn chuẩn hàng và số trang nằm đúng lề phải. | Word: `_word_png/mytime_p3.png`<br>App: `_app_after_p3.png` |
| **4. Khoảng cách đoạn / Heading** | Text và ảnh bị lệch thứ tự nếu đẩy ảnh vào flow (`display:block`). | Giữ nguyên thứ tự luồng văn bản tự nhiên của đoạn văn; ảnh neo đặt toạ độ tuyệt đối rơi chính xác vào khoảng cách đoạn Word đã căn lề sẵn. | Word: `_word_png/mytime_p3.png`<br>App: `_app_after_p3.png` |

---

## 3. Các thay đổi mã nguồn chính
1. **`adapters/libreoffice/writer/writer-adapter.js`**:
   - `_ooxmlTableColumnWidths(xml)` & `_applyOoxmlTableColumnGeometry(html, ooxmlDocumentXml)`: Đọc bề rộng ô hàng đầu tiên trong OOXML để điều chỉnh chính xác `<col>` và `<td>` của bảng trong StarWriter HTML.
   - `_preserveImportedFloatingFrames(html, ooxmlDocumentXml, page)`:
     - Đếm tần suất ảnh lặp lại để nhận diện watermark toàn trang (`isRepeatedPageWatermark`).
     - Nhận diện ảnh neo trang (`isPageImage` với `behindDoc="1"`, `wrapNone`, `relativeFrom="page"`).
     - Tính toạ độ hiển thị page-relative: `canvasLeft = displayLeft - marginLeftCm`, `canvasTop = displayTop - marginTopCm`.
     - Đặt `z-index: 0` cho các phần tử phía sau tài liệu để không bị ẩn dưới lớp nền editor.
   - `_makeFloatingAnchorContainers(html)`:
     - Áp dụng `position: relative` cho container chứa watermark hoặc ảnh neo trang, đảm bảo ảnh của từng trang định vị chính xác theo đoạn ngắt trang tương ứng.
2. **`tests/unit/writer-floating-image-import.test.js`**:
   - Bổ sung unit test kiểm tra phân loại watermark lặp lại (`Repeated full-page behind image is classified as an imported watermark`).
   - Bổ sung unit test kiểm tra khôi phục tỷ lệ cột bảng từ OOXML (`OOXML first-row cell widths restore imported table column proportions`).

---

## 4. Kết quả kiểm thử & Gate verification
- **Node Test Suite**: `node tests/run-tests.js`
  - Kết quả: **1732 / 1732 PASS | 0 FAIL** (100%).
  - Suite 138 (`Unit Tests — Writer floating image (sd-abs-pos) import normalization`): 32/32 PASS.
- **Python Writer Unit Tests**: `python -m unittest discover -s tests -p "test_writer*.py"`
  - Kết quả: **46 / 46 PASS** (100%).
- **Round-trip & An toàn lưu**:
  - Không thay đổi chiều lưu hoặc xuất file gốc.
  - Toàn bộ cơ chế chỉ can thiệp hiển thị canvas và print preview.
