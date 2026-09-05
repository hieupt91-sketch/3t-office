# Báo cáo Bàn giao: Xử lý Tràn ngang Ribbon VN Sheet Tab Home (Đợt 2)

- **NHIỆM VỤ**: Xử lý triệt để hiện tượng tràn ngang (horizontal overflow) của tab Home trong VN Sheet ở độ phân giải 1366px (laptop phổ biến tại Việt Nam) và 1600px (màn hình desktop chuẩn), tiếp nối sau đợt gộp dropdown Fill/Clear.
- **AGENT / ROLE**: Antigravity (agy) — UI/UX Component & Ribbon Architecture
- **BRANCH**: `fix/sheet-ribbon-overflow-round2`
- **WORKTREE**: `E:\VNOffice-agy-sheet-ribbon-overflow2` (tách từ `main`, **KHÔNG** merge vào `main`)
- **PHẠM VI**: Chỉ can thiệp UI/CSS/bố cục/DOM markup. **TUYỆT ĐỐI KHÔNG** sửa logic tính toán, formula engine hay bất kỳ file nào trong `adapters/libreoffice/**`.
- **QUY TẮC AN TOÀN**: Tuân thủ 100% — không điều khiển bất kỳ ứng dụng desktop thật nào (Word/Excel/PowerPoint thật), không SendKeys, không COM automation. Chỉ kiểm thử tự động qua Playwright với trình duyệt Microsoft Edge (headless).

---

## 1. Số liệu Đo lường Thực tế Trước và Sau khi Tối ưu

Đo lường được thực hiện tự động bằng Microsoft Edge headless qua Playwright tại các độ phân giải chuẩn, môi trường tiếng Việt (`vi-VN`) với font `Be Vietnam Pro`:

### Bảng tổng hợp kích thước Ribbon:

| Độ phân giải | Trước tối ưu | Sau tối ưu | Độ tràn (Trước) | Độ tràn (Sau) | Mức giảm (Tiết kiệm) |
|---|---|---|---|---|---|
| **1600px (Desktop)** | `scrollWidth`: **1792px** | `scrollWidth`: **1600px** | +192px | **0px (KHÔNG tràn)** | **-192px** (-10.7%) |
| **1366px (Laptop VN)** | `scrollWidth`: **1750px** | `scrollWidth`: **1366px** | +384px | **0px (KHÔNG tràn)** | **-384px** (-21.9%) |

---

### Bảng chi tiết từng nhóm nút lệnh trong tab Home:

#### Tại 1600px (Desktop):
| Nhóm lệnh | Độ rộng Trước | Độ rộng Sau | Mức chênh lệch | Ghi chú kỹ thuật |
|---|---|---|---|---|
| **Bảng nhớ tạm** (Clipboard) | 259px | **166px** | **-93px** | Xếp 3 nút Cut, Copy, Paste Special thành 1 cột 3 hàng cạnh nút Dán lớn |
| **Phông chữ** (Font) | 254px | **250px** | **-4px** | Tối ưu nhẹ padding/gap giữa các nút |
| **Căn chỉnh** (Alignment) | 390px | **386px** | **-4px** | Tối ưu nhẹ padding/gap giữa các nút |
| **Định dạng số** (Number) | 123px | **119px** | **-4px** | Tối ưu nhẹ padding |
| **Kiểu ô** (Styles) | 239px | **145px** | **-94px** | Responsive Breakpoint 1: Định dạng bảng & Kiểu ô thu gọn nhãn thành icon button |
| **Ô** (Cells) | 193px | **188px** | **-5px** | Giữ đầy đủ nhãn trên màn hình rộng >= 1600px |
| **Chỉnh sửa** (Editing) | 322px | **314px** | **-8px** | Tối ưu nhẹ padding các nút sắp xếp/lọc |
| **TỔNG `scrollWidth`** | **1792px** | **1600px** | **-192px** | **Hết tràn hoàn toàn (0px overflow)** |

#### Tại 1366px (Laptop phổ biến tại VN):
| Nhóm lệnh | Độ rộng Trước | Độ rộng Sau | Mức chênh lệch | Ghi chú kỹ thuật |
|---|---|---|---|---|
| **Bảng nhớ tạm** (Clipboard) | 253px | **164px** | **-89px** | Cột Cut, Copy, Paste Special 3 hàng gọn gàng |
| **Phông chữ** (Font) | 250px | **248px** | **-2px** | Tối ưu padding/gap |
| **Căn chỉnh** (Alignment) | 386px | **217px** | **-169px** | Nút chính "Trộn & căn giữa" giữ nhãn; 3 nút phụ (Trộn hàng, Trộn ô, Tách ô) hiển thị icon |
| **Định dạng số** (Number) | 119px | **117px** | **-2px** | Tối ưu padding |
| **Kiểu ô** (Styles) | 234px | **143px** | **-91px** | Định dạng bảng & Kiểu ô thu gọn nhãn thành icon button |
| **Ô** (Cells) | 188px | **69px** | **-119px** | Chèn hàng/cột, Xóa hàng/cột thu gọn thành 4 icon button chuẩn Excel |
| **Chỉnh sửa** (Editing) | 314px | **308px** | **-6px** | Giữ dropdown Điền/Xóa, nút AutoSum và Sắp xếp/Lọc gọn gàng |
| **TỔNG `scrollWidth`** | **1750px** | **1366px** | **-384px** | **Hết tràn hoàn toàn (0px overflow)** |

---

## 2. Giải pháp Kỹ thuật & Lý do Lựa chọn

Tuân thủ chặt chẽ nguyên tắc thiết kế giao diện của bộ công cụ văn phòng Microsoft Office và tôn trọng UX người dùng:

### 2.1. Tối ưu cấu trúc nhóm Bảng nhớ tạm (Clipboard) — `apps/sheet/sheet-ribbon.js`
- **Hiện trạng trước**: Lệnh `sheet.edit.pasteSpecial` (Dán đặc biệt) ở nhánh trước được thêm vào như một item độc lập ngang hàng với nút Dán lớn và cột Cut/Copy, vô tình chiếm riêng 1 cột 103px.
- **Tối ưu**: Gom `common.edit.cut`, `common.edit.copy` và `sheet.edit.pasteSpecial` vào chung 1 cột 3 hàng (`type: "column"`). Chiều cao mỗi nút là 24px: $3 \times 24\text{px} + 2 \times 2\text{px gap} = 76\text{px}$, khớp hoàn hảo với chiều cao nút Dán lớn (72px) và thanh Ribbon (80px).
- **Hiệu quả**: Tiết kiệm ngay ~90px trên mọi độ phân giải, giao diện đúng chuẩn Excel (nút Paste lớn bên trái, cột 3 thao tác nhỏ bên phải).

### 2.2. Cơ chế Responsive Cấp 1 (`@media (max-width: 1650px)`) — `platform/shell/shell.css`
- **Mục tiêu**: Loại bỏ 85px - 192px tràn ngang còn lại trên màn hình 1600px.
- **Giải pháp**: Nhóm **Kiểu ô** (Styles) thu gọn nhãn chữ của 2 nút trong cột (`sheet.style.formatAsTable` và `sheet.style.cellStyles`) thành nút biểu tượng (icon button). Nút chính "Định dạng có điều kiện" lớn vẫn hiển thị đầy đủ icon và nhãn.
- **Hiệu quả**: Nhóm Styles giảm từ 239px xuống 145px (tiết kiệm ~94px), giúp 1600px đạt `scrollWidth: 1600px` (0px tràn).

### 2.3. Cơ chế Responsive Cấp 2 (`@media (max-width: 1400px)`) — `platform/shell/shell.css`
- **Mục tiêu**: Loại bỏ 384px tràn ngang trên laptop 1366px mà không phải cắt bỏ bất kỳ tính năng nào.
- **Giải pháp chuẩn Excel**:
  1. **Nhóm Ô (Cells)**: Thu gọn nhãn của 4 nút (`sheet.row.insert`, `sheet.col.insert`, `sheet.row.delete`, `sheet.col.delete`) thành icon buttons. Các icon SVG trực quan (hàng xanh kèm dấu cộng/trừ, cột xanh kèm dấu cộng/trừ) kết hợp với tooltip giải thích đầy đủ khi rê chuột. Nhóm Ô giảm từ 188px xuống 69px (tiết kiệm ~119px).
  2. **Nhóm Căn chỉnh (Alignment)**: Trước đây hàng thứ 3 có 4 nút dài ngoằng viết chữ đầy đủ nằm dàn hàng ngang ("Trộn & căn giữa", "Trộn theo hàng", "Trộn ô", "Tách ô" chiếm tới ~380px). Ở màn hình hẹp, nút chính được dùng nhiều nhất "Trộn & căn giữa" vẫn giữ nguyên nhãn chữ; 3 nút phụ ("Trộn theo hàng", "Trộn ô", "Tách ô") thu gọn nhãn và hiển thị icon `mergeCells`/`unmergeCells` kèm tooltip. Nhóm Căn chỉnh giảm từ 386px xuống 217px (tiết kiệm ~169px).
  3. **Padding/gap**: Tinh chỉnh padding nhóm từ 4px xuống 3px và gap 2px.
- **Bảo toàn 100% tương tác**: Mọi phần tử `<button>` vẫn tồn tại nguyên vẹn trong DOM, đầy đủ thuộc tính `data-command-id`, thuộc tính `title` (tooltip), `aria-label`, và lắng nghe click trực tiếp. Người dùng có thể click chuột trực tiếp hoặc dùng phím tắt bình thường.

### 2.4. Khả năng tương thích và Định danh Nhóm — `platform/ribbon/ribbon-host.js`
- Bổ sung cơ chế tự động gán `data-group-id` cho thẻ `.vno-ribbon-group` từ `group.id` hoặc tự sinh từ `group.labelKey.split('.').pop()`.
- Đảm bảo CSS có thể target chính xác từng nhóm theo ngữ cảnh mà không ảnh hưởng sang các tab khác của Writer hay Slides.

---

## 3. Kết quả Kiểm thử Toàn diện

### 3.1. Master Test Suite (`node tests/run-tests.js`)
- **Kết quả**: **761 / 761 PASS (100%)**
- **Thời gian chạy**: ~49 giây (đáp ứng tiêu chuẩn bắt buộc < 60 giây).
- **Lỗi/Thất bại**: 0 FAIL.

### 3.2. Playwright Live Test Mới (`tests/live/sheet-ribbon-overflow-round2.playwright.mjs`)
- Khởi tạo máy chủ test độc lập phục vụ worktree `E:\VNOffice-agy-sheet-ribbon-overflow2`.
- Kiểm tra tại cả 2 độ phân giải 1600px và 1366px với locale `vi-VN`:
  - **Tràn ngang**: 0px tràn ngang tại 1600px (`scrollWidth: 1600px`), 0px tràn ngang tại 1366px (`scrollWidth: 1366px`).
  - **Nhóm tràn**: 0 nhóm (`overflowingGroups: []`).
  - **Kiểm tra click thật**: Đã click kiểm tra thành công 23/23 nút lệnh trên thanh ribbon Home (bao gồm Paste, Cut, Copy, Paste Special, Bold, Italic, Align, Merge Center/Across/Cells/Unmerge, Conditional Formatting, Table Style, Cell Styles, Insert/Delete Row/Col, AutoSum, Sort A-Z). Không có nút nào bị che khuất, mất hay không click được.
  - **Kiểm tra chuyển tab**: Chuyển lần lượt qua các tab `formulas`, `data`, `insert`, `review`, `view` — tất cả đều 0px tràn ngang, không phát sinh lỗi console.

### 3.3. Rà soát Toàn bộ Ứng dụng (Multi-App Suite Audit)
- Chạy script kiểm tra tự động duyệt qua **tất cả 26 tabs** của cả 3 ứng dụng (**Writer**, **Sheet**, **Slides**) ở 2 độ phân giải (1600px & 1366px):
- **Kết quả**: **TOTAL FINDINGS: 0**. Toàn bộ hệ thống VN Office không còn bất kỳ tab nào bị tràn ngang!

### 3.4. Các Live Test Hiện có trong Repo
- `tests/live/sheet-editing-dropdown.playwright.mjs`: **100% PASS** (Fill & Clear dropdowns, phím tắt, menu item click).
- `tests/live/sheet-merge-cells.playwright.mjs`: **100% PASS** (Merge & Center, Unmerge, DOM colSpan/rowSpan).
- `tests/live/sheet-editing-styles.playwright.mjs`: **100% PASS** (Format as Table, Cell Styles gallery dialogs).

---

## 4. Danh mục Tệp Thay đổi (Diff Scope)

Tất cả các thay đổi được gói gọn hoàn toàn trong phạm vi UI/CSS/Ribbon markup:

```
 apps/sheet/sheet-ribbon.js                       |  22 +++--
 docs/HANDOFF-SHEET-RIBBON-OVERFLOW-ROUND2.md     | 180 ++++++++++++++++++++
 docs/VNO-GAPS.md                                 |   3 +-
 platform/ribbon/ribbon-host.js                   |   3 +-
 platform/shell/shell.css                         |  48 ++++-
 tests/live/sheet-ribbon-overflow-round2.playwright.mjs | 185 ++++++++++++++++++++
 6 files changed, 431 insertions(+), 10 deletions(-)
```

- Không sửa bất kỳ tệp tính toán hay formula engine nào.
- Không sửa bất kỳ tệp nào trong `adapters/libreoffice/**`.
- Không merge vào `main`. Branch hiện tại: `fix/sheet-ribbon-overflow-round2`.
