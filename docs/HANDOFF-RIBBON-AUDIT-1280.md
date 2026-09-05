# Báo Cáo Bàn Giao: Audit Toàn Diện Ribbon 26 Tab Ở Độ Phân Giải 1280px

**Người thực hiện**: agy (Antigravity)  
**Nhánh git**: `fix/ribbon-audit-1280` (tách từ `main`, **KHÔNG** merge vào `main`)  
**Thư mục làm việc**: `E:\VNOffice-agy-ribbon-audit-1280`  
**Ngày hoàn thành**: 05/09/2026  
**Phạm vi**: Giao diện người dùng (UI / CSS / Ribbon DOM Markup). Hoàn toàn không can thiệp formula engine hay `adapters/libreoffice/**`.

---

## 1. Bối Cảnh & Mục Tiêu

Trước đây, hệ thống VN Office đã qua audit toàn diện 26 tab x 2 độ phân giải (1600px và 1366px), đạt chuẩn 0px tràn ngang. Tuy nhiên, độ phân giải **1280px** (cụ thể là `1280x800` trên laptop cũ tỉ lệ 16:10 và `1280x720` HD trên máy chiếu / màn hình phổ thông tại Việt Nam) vẫn là phân khúc phần cứng rất lớn trong khối giáo dục và doanh nghiệp vừa/nhỏ, chưa từng được kiểm thử.

Nhiệm vụ đợt này là:
1. Audit toàn bộ 26 tab của cả 3 ứng dụng (**VN Writer**, **VN Sheet**, **VN Slides**) tại độ phân giải 1280px bề rộng qua dev server và Edge Playwright.
2. Xác định chính xác các tab bị tràn ngang hoặc có nguy cơ tràn cao khi xuất hiện thanh cuộn dọc OS (vertical scrollbar 17px).
3. Áp dụng kỹ thuật responsive breakpoint trong `platform/shell/shell.css` để loại bỏ triệt để tràn ngang, bảo toàn 100% nút lệnh và khả năng click tương tác.

---

## 2. Kết Quả Đo Lường Trước & Sau (Before vs. After Metrics)

### 2.1. Các tab có vấn đề phát hiện qua Audit ban đầu tại 1280px:

| Ứng dụng | Tab | Ngôn ngữ | scrollWidth Trước | clientWidth | Trạng thái Trước | scrollWidth Sau | Trạng thái Sau | Mức tối ưu |
|---|---|---|---|---|---|---|---|---|
| **Sheet** | **Formulas** (Công thức) | **EN** | **1340px** | 1280px | **TRÀN (+60px)** | **1280px** (sum: 1146px) | **Hết tràn (0px)** | **-194px** tổng nhóm |
| **Sheet** | **Formulas** (Công thức) | **VI** | 1280px (sum: 1228px) | 1280px | Khít (dư 52px) | **1280px** (sum: 1091px) | **Rộng rãi (dư 189px)** | **-137px** tổng nhóm |
| **Sheet** | **Home** (Trang đầu) | **VI** | 1280px (sum: 1266px) | 1280px | Nguy cơ tràn khi có thanh cuộn dọc (dư 14px) | **1280px** (sum: 1182px) | **An toàn tuyệt đối (dư 98px)** | **-84px** tổng nhóm |
| **Sheet** | **Home** (Trang đầu) | **EN** | 1280px (sum: 1263px) | 1280px | Nguy cơ tràn khi có thanh cuộn dọc (dư 17px) | **1280px** (sum: 1190px) | **An toàn tuyệt đối (dư 90px)** | **-73px** tổng nhóm |

### 2.2. Chi tiết theo từng nhóm lệnh (Group Breakdown):

#### A. Tab Sheet Formulas (Công thức) — Nguyên nhân chính gây tràn 60px ở EN:
| Nhóm lệnh | Bề rộng Trước (VI) | Bề rộng Sau (VI) | Bề rộng Trước (EN) | Bề rộng Sau (EN) | Giải pháp kỹ thuật |
|---|---|---|---|---|---|
| **Hàm tính toán** (Function Library) | 494px | **455px** (-39px) | 569px | **528px** (-41px) | Tối ưu padding (2px 3px) & font-size 10.5px cho các nút danh mục hàm nhỏ |
| **Tên đã xác định** (Defined Names) | 235px | **233px** (-2px) | 258px | **216px** (-42px) | Nút phụ "Tạo từ vùng chọn" (Create from Selection) thu gọn nhãn thành icon button + tooltip |
| **Kiểm tra công thức** (Formula Auditing) | 345px | **251px** (-94px) | 356px | **250px** (-106px) | 3 nút mũi tên phụ (Tìm ô tiền lệ, Tìm ô phụ thuộc, Xóa mũi tên) thu gọn nhãn thành icon button + tooltip |
| **Tính toán** (Calculation) | 154px | **152px** (-2px) | 154px | **152px** (-2px) | Giữ nguyên dropdown Tùy chọn tính toán & 2 nút Tính toán |
| **TỔNG BỀ RỘNG CÁC NHÓM** | **1228px** | **1091px** (-137px) | **1337px** | **1146px** (-191px) | **Loại bỏ hoàn toàn 60px tràn ngang ở EN; tạo khoảng đệm an toàn 189px ở VI** |

#### B. Tab Sheet Home (Trang đầu) — Phòng ngừa triệt để tràn do thanh cuộn dọc OS:
| Nhóm lệnh | Bề rộng Trước | Bề rộng Sau | Chênh lệch | Giải pháp kỹ thuật |
|---|---|---|---|---|
| **Bảng nhớ tạm** (Clipboard) | 164px | **162px** | -2px | Giữ nguyên cấu trúc cột 3 hàng chuẩn Excel |
| **Phông chữ** (Font) | 248px | **246px** | -2px | Tối ưu padding nhóm |
| **Căn chỉnh** (Alignment) | 217px | **215px** | -2px | Tối ưu padding nhóm |
| **Định dạng số** (Number) | 117px | **115px** | -2px | Tối ưu padding nhóm |
| **Kiểu ô** (Styles) | 143px | **141px** | -2px | Tối ưu padding nhóm |
| **Ô** (Cells) | 69px | **67px** | -2px | 4 nút icon button chuẩn Excel |
| **Chỉnh sửa** (Editing) | 308px | **236px** | **-72px** | Thu gọn nhãn của cột Sắp xếp A-Z, Sắp xếp Z-A, Bộ lọc thành icon button + tooltip chuẩn Excel |
| **TỔNG BỀ RỘNG CÁC NHÓM** | **1266px** | **1182px** | **-84px** | **Khoảng đệm an toàn tăng từ 14px lên 98px, hoàn toàn không bị ảnh hưởng bởi thanh cuộn dọc** |

---

## 3. Bảng Kiểm Tra Toàn Diện 26 Tab Tại Độ Phân Giải 1280px

Kiểm thử tự động Playwright trên cả 2 độ phân giải (`1280x800` & `1280x720`) và 2 ngôn ngữ (`VI` & `EN`):

| Ứng dụng | # | Tab ID | Tên tab (VI) | Bề rộng nhóm (VI) | Bề rộng nhóm (EN) | Tràn ngang 1280x800 | Tràn ngang 1280x720 |
|---|---|---|---|---|---|---|---|
| **Writer** | 1 | `home` | Trang đầu | 1055px | 1033px | **0px PASS** | **0px PASS** |
| **Writer** | 2 | `insert` | Chèn | 1165px | 1067px | **0px PASS** | **0px PASS** |
| **Writer** | 3 | `design` | Thiết kế | 240px | 298px | **0px PASS** | **0px PASS** |
| **Writer** | 4 | `layout` | Bố trí trang | 626px | 692px | **0px PASS** | **0px PASS** |
| **Writer** | 5 | `references` | Tham chiếu | 410px | 398px | **0px PASS** | **0px PASS** |
| **Writer** | 6 | `mailings` | Thư tín | 513px | 552px | **0px PASS** | **0px PASS** |
| **Writer** | 7 | `review` | Xem xét | 461px | 426px | **0px PASS** | **0px PASS** |
| **Writer** | 8 | `view` | Chế độ xem | 666px | 676px | **0px PASS** | **0px PASS** |
| **Writer** | 9 | `ai` | VN AI | 232px | 264px | **0px PASS** | **0px PASS** |
| **Sheet** | 10 | `home` | Trang đầu | 1182px | 1190px | **0px PASS** | **0px PASS** |
| **Sheet** | 11 | `formulas` | Công thức | 1091px | 1146px | **0px PASS** | **0px PASS** |
| **Sheet** | 12 | `data` | Dữ liệu | 721px | 722px | **0px PASS** | **0px PASS** |
| **Sheet** | 13 | `insert` | Chèn | 392px | 365px | **0px PASS** | **0px PASS** |
| **Sheet** | 14 | `pageLayout` | Bố trí trang | 404px | 468px | **0px PASS** | **0px PASS** |
| **Sheet** | 15 | `review` | Xem xét | 83px | 99px | **0px PASS** | **0px PASS** |
| **Sheet** | 16 | `view` | Chế độ xem | 946px | 890px | **0px PASS** | **0px PASS** |
| **Sheet** | 17 | `ai` | VN AI | 177px | 205px | **0px PASS** | **0px PASS** |
| **Slides** | 18 | `home` | Trang đầu | 578px | 551px | **0px PASS** | **0px PASS** |
| **Slides** | 19 | `insert` | Chèn | 770px | 705px | **0px PASS** | **0px PASS** |
| **Slides** | 20 | `design` | Thiết kế | 265px | 221px | **0px PASS** | **0px PASS** |
| **Slides** | 21 | `transitions` | Chuyển tiếp | 128px | 131px | **0px PASS** | **0px PASS** |
| **Slides** | 22 | `animations` | Hoạt hình | 109px | 81px | **0px PASS** | **0px PASS** |
| **Slides** | 23 | `slideshow` | Trình chiếu | 463px | 514px | **0px PASS** | **0px PASS** |
| **Slides** | 24 | `review` | Xem xét | 90px | 99px | **0px PASS** | **0px PASS** |
| **Slides** | 25 | `view` | Chế độ xem | 899px | 836px | **0px PASS** | **0px PASS** |
| **Slides** | 26 | `ai` | VN AI | 177px | 205px | **0px PASS** | **0px PASS** |

**Tổng cộng**: 104/104 lượt kiểm tra (26 tab x 2 độ phân giải x 2 ngôn ngữ) đều đạt **0px tràn ngang (100% PASS)**.

---

## 4. Giải Pháp Kỹ Thuật Chi Tiết

### 4.1. Cơ Chế Responsive Cấp 3 (`@media (max-width: 1300px)`) — `platform/shell/shell.css`
Kế thừa hoàn hảo kiến trúc 2 cấp responsive đã thiết lập trước đó (Cấp 1: `<=1650px`, Cấp 2: `<=1400px`), cấp 3 áp dụng cho `<= 1300px`:

1. **Điều chỉnh container padding**:
   - `padding: 4px 2px` cho `.vno-ribbon-content`.
   - `padding: 0 2px` cho `.vno-ribbon-group`.
   - `gap: 2px` cho `.vno-ribbon-group-items`.

2. **Tối ưu nhóm Chỉnh sửa (Editing) trong Sheet Home**:
   - Thu gọn nhãn chữ (`.vno-btn-label { display: none; }`) của 3 nút trong cột: `sheet.data.sortAsc` (Sắp xếp A-Z), `sheet.data.sortDesc` (Sắp xếp Z-A), và `sheet.data.filter` (Bộ lọc).
   - Biểu tượng SVG (A-Z, Z-A, phễu lọc) hiển thị sắc nét, trực quan ở vị trí trung tâm nút.
   - Tiết kiệm ngay **72px**.

3. **Tối ưu nhóm Kiểm tra công thức (Formula Auditing) trong Sheet Formulas**:
   - Thu gọn nhãn chữ của 3 nút mũi tên phụ: `sheet.formula.tracePrecedents` (Tìm ô tiền lệ), `sheet.formula.traceDependents` (Tìm ô phụ thuộc), và `sheet.formula.removeArrows` (Xóa mũi tên).
   - Giữ nguyên hiển thị nhãn lớn cho `showFormulas` và `watchWindow`.
   - Tiết kiệm ngay **94px** (VI) và **106px** (EN).

4. **Tối ưu nhóm Tên đã xác định (Defined Names) trong Sheet Formulas**:
   - Thu gọn nhãn chữ nút phụ `sheet.formula.createFromSelection` (Tạo từ vùng chọn / Create from Selection).
   - Nút lớn Quản lý tên (Name Manager) và nút Xác định tên (Define Name) vẫn hiển thị chữ đầy đủ.
   - Tiết kiệm **42px** (EN).

5. **Tối ưu nhóm Hàm tính toán (Function Library) trong Sheet Formulas**:
   - Tinh chỉnh padding nút danh mục từ `2px 8px` xuống `2px 3px`, cỡ chữ `10.5px`.
   - Tiết kiệm **39px** (VI) và **41px** (EN).

### 4.2. Bảo Toàn Tuyệt Đối DOM & Tính Năng
- Toàn bộ `<button>` vẫn tồn tại nguyên vẹn trong DOM.
- Các thuộc tính `data-command-id`, `aria-label`, `title` (tooltip giải thích chức năng), và bộ xử lý sự kiện click không hề bị thay đổi hay ngắt kết nối.
- Người dùng rê chuột vào nút đều thấy tooltip tiếng Việt/tiếng Anh chi tiết.
- Phím tắt (shortcuts) hoạt động bình thường.

---

## 5. Kết Quả Kiểm Thử (Verification Results)

### 5.1. Master Test Runner (`node tests/run-tests.js`)
- **Kết quả**: **783 / 783 PASS (100%)**
- **Thời gian chạy**: ~45 giây (đáp ứng tiêu chuẩn bắt buộc < 60 giây).
- **Lỗi / Thất bại**: 0 FAIL.
- *(Đã sửa lỗi TDZ pre-existing shadowing biến `t` trong `apps/slides/slides-canvas.js` line 4218 giúp suite đạt 783/783)*.

### 5.2. Live Playwright Test Mới (`tests/live/ribbon-audit-1280.playwright.mjs`)
- Kiểm thử thực tế trên Microsoft Edge Chromium headless, tự động khởi tạo HTTP server phục vụ worktree.
- Đo đạc `scrollWidth` vs `clientWidth` cho 26 tab ở cả 1280x800 và 1280x720, ngôn ngữ VI và EN: **104/104 PASS**.
- Kiểm tra tương tác click thực tế:
  - Đã click và xác nhận phản hồi thành công **23/23 nút lệnh** trong Sheet Home.
  - Đã click và xác nhận phản hồi thành công **18/18 nút lệnh** trong Sheet Formulas.
  - Không có bất kỳ lỗi console / runtime exception nào.

---

## 6. Danh Mục Tệp Thay Đổi (Git Diff Scope)

```
 apps/slides/slides-canvas.js                       |   9 +-
 docs/HANDOFF-RIBBON-AUDIT-1280.md                  | 195 ++++++++++++++++++
 docs/VNO-GAPS.md                                   |   1 +
 platform/shell/shell.css                           |  56 ++++++
 tests/live/ribbon-audit-1280.playwright.mjs        | 260 +++++++++++++++++++++++
 5 files changed, 517 insertions(+), 4 deletions(-)
```

- **Quy tắc an toàn**: Không sử dụng SendKeys hay bất kỳ kỹ thuật điều khiển app desktop nào.
- **Phạm vi code**: Chỉ can thiệp CSS responsive, sửa lỗi TDZ UI slides và viết test live. Không can thiệp formula engine hay `adapters/libreoffice/**`.
- **Trạng thái nhánh**: Hoàn thành trong worktree `E:\VNOffice-agy-ribbon-audit-1280`, branch `fix/ribbon-audit-1280`. KHÔNG merge vào `main`.
