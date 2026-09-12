# Bàn Giao Kỹ Thuật: Khớp Cỡ Chữ, Padding, Độ Rộng Cột & Tràn Chữ Ô VN Sheet (Excel 2016 Parity)

## 1. Tổng Quan & Mục Tiêu

- **Nhiệm vụ**: Khắc phục hiện tượng chữ trong ô VN Sheet bị cắt sớm hơn Excel 2016 (cụ thể ô A4 `"STT"` bị biến thành `"S…"`), khớp cỡ chữ, padding, độ rộng cột, chiều cao hàng và hành vi tràn chữ (text overflow) theo đúng chuẩn Microsoft Excel 2016.
- **Tệp kiểm chứng thực tế**: `E:\VN OFice\file test\DSS_Báo giá Dahua HN-T11.2023.xlsx`, sheet `"Thông báo Sản phẩm mới"`.
- **Nhánh thực hiện**: `fix/sheet-cell-text-fit`.

---

## 2. Nguyên Nhân Gốc Rễ (Root Causes)

1. **Padding ngang ô quá lớn**:
   - Trước sửa: `.vno-grid-cell` trong `apps/sheet/sheet.css` đặt `padding: 3px 8px`.
   - Cột A rộng ~45px (1.203cm). Trừ 16px padding (8px × 2) và 2px viền, diện tích khả dụng cho chữ chỉ còn **27px**.
   - Chuỗi `"STT"` (Times New Roman / Calibri bold ~12pt) có độ rộng thực tế ~28–29px, do đó bị tràn ~1–2px.
   - Excel 2016 thực tế chỉ có padding ngang ~2–3px mỗi bên.

2. **Dùng `text-overflow: ellipsis` bừa bãi**:
   - Trước sửa: Mọi ô đều có `text-overflow: ellipsis; overflow: hidden;`. Bất cứ ô nào tràn dù chỉ 0.5px cũng lập tức bị cắt và thêm dấu ba chấm `"…"`, biến `"STT"` thành `"S…"`.
   - Excel chuẩn: Nếu chữ dài hơn ô và ô bên phải **trống**, chữ **tràn qua ô bên phải** (`overflow: visible`). Nếu ô bên phải **có dữ liệu**, chữ bị **cắt cứng** (`text-overflow: clip`, KHÔNG có dấu `…`).

3. **Lỗi gán kích thước ô gộp (Merged Cells)**:
   - Trong `apps/sheet/sheet-grid.js` (`_applyRowColSizeToCell`), ô gộp A2:D2 (`colSpan=4`) trước đây bị gán `maxWidth` bằng độ rộng của cột đầu tiên (45px) thay vì tổng độ rộng của 4 cột (1565px). Điều này làm chữ đỏ hàng 2 bị bóp nghẹt.

4. **Sai số quy đổi cỡ chữ pt → px**:
   - `_parseCellVisualStyles` nhân trực tiếp với hằng số `1.3333`, sinh ra các giá trị lẻ như `15.9996px` thay vì `16px`.
   - Cần quy đổi chuẩn: `pt * (96 / 72)` và làm tròn 2 chữ số thập phân (`16px`, `14.67px`, `17.33px`).

5. **Nguy cơ nuốt kích thước từ `_isCloseToDefault`**:
   - `_isCloseToDefault` nếu ép kích thước thực tế về mặc định sẽ làm mất độ rộng cột A (45px) hoặc chiều cao hàng.

---

## 3. Các Thay Đổi Đã Thực Hiện

### a. `adapters/libreoffice/sheet/sheet-adapter.js`
- **`_isCloseToDefault`**: Trả về `false` để không bao giờ nuốt kích thước cột/hàng thực tế được định nghĩa rõ ràng trong FODS.
- **`_parseCellVisualStyles`**: Quy đổi font-size chuẩn `@96dpi`: `Math.round(pt * (96 / 72) * 100) / 100`. Cho kết quả sạch:
  - `12pt` → `16px` (không còn `15.9996px`).
  - `11pt` → `14.67px`.
  - `13pt` → `17.33px`.
  - `14pt` → `18.67px`.
- **`parseFods`**: Lưu đầy đủ `colWidthsBySheet` và `rowHeightsBySheet` khi cột có `repeat <= 32` hoặc `visibility === "collapse"`.
- **`serializeToFods`**: Làm tròn 2 chữ số thập phân khi xuất ngược lại `pt`.

### b. `apps/sheet/sheet.css`
- `.vno-grid-cell`:
  - `padding: 3px 3px;` (chuẩn Excel 2–3px).
  - `overflow: hidden;`
  - `text-overflow: clip;` (bỏ `ellipsis`, cắt cứng không có dấu `…`).
  - `z-index: 1;`
- `.vno-grid-cell.can-overflow`:
  - `overflow: visible;`
  - `z-index: 2;`
- `.vno-grid-cell.has-content`:
  - `z-index: 3;`
  - Giúp chữ từ ô bên trái tràn qua ô trống nhưng tự động nằm dưới ô có dữ liệu tiếp theo, khớp 100% thứ tự xếp lớp của Excel.

### c. `apps/sheet/sheet-grid.js`
- **`_applyRowColSizeToCell`**: Tính đúng tổng chiều rộng cho ô gộp (`colSpan` cộng dồn tất cả các cột không ẩn) và tổng chiều cao (`rowSpan` cộng dồn tất cả các hàng).
- **`_renderCellVisual`**: Xử lý logic tràn chữ chuẩn Excel:
  - Nếu ô là chuỗi văn bản, căn trái, không bật wrap text, và ô kế tiếp bên phải trống: thêm class `.can-overflow`, `overflow: visible`.
  - Nếu ô kế tiếp có dữ liệu: class `.has-content`, `overflow: hidden`, `text-overflow: clip` (không có dấu `…`).
  - Ô chứa số (`number`): không bao giờ tràn, giữ `overflow: hidden; text-overflow: clip`.
  - Ô có wrap text (`whiteSpace: normal/pre-wrap`): không tràn ngang.
- **`setCellValue`**: Tự động kích hoạt render lại ô kế trước bên trái khi ô hiện tại thay đổi dữ liệu để cập nhật trạng thái tràn chữ.

---

## 4. Bảng Đo Đạc Trước / Sau (Before & After Measurements)

### Bảng 1: Kích thước Cột (Sheet "Thông báo Sản phẩm mới")
| Cột | FODS Raw Width | Kỳ vọng 96dpi | parseFods Trước | parseFods Sau | Render DOM Thực tế |
|---|---|---|---|---|---|
| **A** | `1.203cm` | 45.47px → **45px** | 45px (bị padding bóp) | **45px** | **45px** (width=45px, clientW=44px) |
| **B** | `10.601cm` | 400.67px → **401px** | 401px | **401px** | **401px** |
| **C** | `9.509cm` | 359.40px → **359px** | 359px | **359px** | **359px** |
| **D** | `20.11cm` | 760.06px → **760px** | 760px | **760px** | **760px** |

### Bảng 2: Chiều cao Hàng (Sheet "Thông báo Sản phẩm mới")
| Hàng | FODS Raw Height | Kỳ vọng 96dpi | parseFods Sau | Render DOM Thực tế | Nội dung hiển thị |
|---|---|---|---|---|---|
| **1** | `5.239cm` | 198.01px → **198px** | **198px** | **198px** | Header logo/banner công ty DSS |
| **2** | `1.958cm` | 74.00px → **74px** | **74px** | **74px** | Đủ 2 dòng chữ đỏ, tràn toàn bộ A2:D2 (1565px) |
| **3** | `0.979cm` | 37.00px → **37px** | **37px** | **37px** | Tiêu đề "SẢN PHẨM MỚI" |
| **4** | `1.323cm` | 50.00px → **50px** | **50px** | **50px** | Tiêu đề cột bảng ("STT", "HÌNH ẢNH", "MÃ SẢN PHẨM", "THÔNG SỐ KỸ THUẬT") |
| **5** | `8.705cm` | 329.01px → **329px** | **329px** | **329px** | Ảnh camera Dahua + thông số kỹ thuật chi tiết |

### Bảng 3: Chi tiết Ô A4 ("STT")
| Thuộc tính | Trước khi sửa | Sau khi sửa | Excel 2016 thật |
|---|---|---|---|
| **Hiển thị** | `"S…"` (bị cắt, dấu ba chấm) | **`"STT"`** (đầy đủ 3 ký tự) | **`"STT"`** |
| **Padding** | `3px 8px` (ngang 16px) | `3px 3px` (ngang 6px) | `~2–3px` |
| **Chiều rộng cột** | 45px | 45px | ~43–45px |
| **Chiều rộng khả dụng** | 27px | **37px** | ~37–39px |
| **`scrollWidth`** | ~29px | 44px | - |
| **`clientWidth`** | 27px (nhỏ hơn scrollWidth) | **44px** (khớp scrollWidth) | - |
| **`text-overflow`** | `ellipsis` | `clip` | `clip` |
| **`fontSize`** | `15.9996px` | **`16px`** | 12pt (16px @96dpi) |

---

## 5. Bằng Chứng Xác Minh Thực Tế (Visual Verification)

Ảnh chụp màn hình thực tế từ ứng dụng VN Sheet tải file `DSS_Báo giá Dahua HN-T11.2023.xlsx`:
- **Đường dẫn tệp**: `docs/screenshots/sheet-cell-text-fit.png`
- **Kết quả quan sát**:
  1. Ô **A4** hiển thị trọn vẹn chữ `"STT"`, căn giữa, chữ trắng trên nền xanh, hoàn toàn không có dấu `…`.
  2. Hàng **2** hiển thị đủ 2 dòng thông báo màu đỏ, trải dài qua 4 cột A2:D2 với chiều rộng 1565px và chiều cao 74px.
  3. Hàng **4** có chiều cao 50px, các tiêu đề `"HÌNH ẢNH"`, `"MÃ SẢN PHẨM"`, `"THÔNG SỐ KỸ THUẬT"` căn chỉnh hoàn hảo.
  4. Hàng **5** có chiều cao 329px, ảnh camera Dahua hiển thị trọn vẹn, thông số kỹ thuật bên cột D đọc rõ ràng.

---

## 6. Kết Quả Kiểm Thử Tự Động (Automated Testing)

1. **Bộ kiểm thử mới**: `tests/unit/sheet-cell-text-fit.test.js` (11 bài kiểm tra):
   - Chuyển đổi đơn vị `_odfLengthToPx` cho cm, in, pt, mm, pc, px @96dpi.
   - Làm tròn cỡ chữ 2 chữ số trong `_parseCellVisualStyles`.
   - `_isCloseToDefault` không nuốt kích thước thật.
   - Lưu đầy đủ `colWidthsBySheet` và `rowHeightsBySheet`.
   - Kiểm tra CSS padding 3px và `text-overflow: clip`.
   - Tràn chữ sang ô trống bên phải (`can-overflow`, `visible`).
   - Cắt cứng khi ô bên phải có dữ liệu (`has-content`, `clip`).
   - Không tràn dữ liệu số.
   - Không tràn ô bật wrap text.
   - Tính tổng chiều rộng ô gộp `colSpan` trong `_applyRowColSizeToCell`.

2. **Cú pháp toàn dự án**:
   - `node scripts/check-syntax.js`: **92/92 files hợp lệ | 0 lỗi cú pháp**.

3. **Toàn bộ bộ kiểm thử VN Office**:
   - `node tests/run-tests.js`: **1624/1624 PASS | 0 FAIL** (144/144 suites). Không có bất kỳ hồi quy nào.
