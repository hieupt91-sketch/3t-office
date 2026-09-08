# AGENT HANDOFF: ACCESSIBILITY KEYBOARD NAVIGATION AUDIT

**TASK:** Kiểm thử và hoàn thiện điều hướng bàn phím trợ năng (Zero Mouse Clicks) cho VN Office (Writer, Sheet, Slides)  
**AGENT/ROLE:** Antigravity Accessibility Keyboard Engineer  
**BRANCH:** feature/accessibility-keyboard-nav-audit  
**WORKTREE:** E:\VNOffice-agy-accessibility-keyboard  
**DATE:** 2026-09-08  

---

## 1. MỤC TIÊU & PHẠM VI
- Rà soát, kiểm thử thực tế và sửa lỗi điều hướng bàn phím toàn diện trên cả 3 ứng dụng: **VN Writer**, **VN Sheet** và **VN Slides** bằng Playwright live tests, đảm bảo người dùng có thể thao tác hoàn toàn qua bàn phím mà không cần chuột (Zero Mouse Clicks).
- Tuân thủ nghiêm ngặt các nguyên tắc trong `AGENTS.md` và `TASK-BRIEF-ACCESSIBILITY-KEYBOARD.md`:
  - KHÔNG can thiệp vào `aria-label` / `role` (để tránh xung đột với nhánh đang xử lý nhãn trợ năng song song).
  - KHÔNG chỉnh sửa `main.py`.
  - Giữ vững toàn bộ bộ kiểm thử nền tảng (89/89 syntax check, 1511/1511 unit tests, 104/104 ribbon tabs).
  - Bổ sung tài liệu Hướng dẫn sử dụng trong ứng dụng (Rule 10).

---

## 2. KẾT QUẢ RÀ SOÁT & CÁC LỖI ĐÃ PHÁT HIỆN / KHẮC PHỤC

### 2.1. Lỗi Bẫy Tiêu Điểm (Focus Trap) trong Hộp thoại Định dạng ô (Format Cells Dialog)
- **Hiện tượng lỗi:** Khi mở hộp thoại Định dạng ô (Ctrl+1), nếu người dùng nhấn Tab liên tục để duyệt qua các điều khiển, sau khi đi hết tab hiện tại (ví dụ: tab "Số"), tiêu điểm bị thoát ra ngoài hộp thoại và rơi xuống lưới ô tính phía sau.
- **Nguyên nhân gốc rễ:** Hàm `trapFocus` trong `apps/sheet/format-cells-dialog.js` và `apps/sheet/cell-styles.js` sử dụng `container.querySelectorAll(...)` để lấy danh sách phần tử nhận tiêu điểm mà không lọc bỏ các phần tử nằm trong các tab panel đang ẩn (`display: none`). Do đó, phần tử "cuối cùng" được tính toán nằm ở một tab ẩn, khiến phím Tab không bao giờ kích hoạt quay vòng lại đầu hộp thoại mà nhảy thẳng ra ngoài trang.
- **Giải pháp:** Bổ sung bộ lọc kiểm tra hiển thị thực tế:
  ```javascript
  const focusables = Array.from(container.querySelectorAll(...))
    .filter(el => el.offsetParent !== null || el.offsetWidth > 0 || el.offsetHeight > 0);
  ```
  Nhờ đó, phím Tab và Shift+Tab luôn bẫy chính xác 100% trong phạm vi hiển thị của hộp thoại, bất kể người dùng đang đứng ở tab con nào.

### 2.2. Nút «Tệp» (File Button) trên Ribbon bị cô lập khỏi luồng phím mũi tên
- **Hiện tượng:** Nút `.vno-ribbon-tab-file` không nằm trong mảng `this.tabButtons`, nên khi người dùng dùng ArrowLeft từ tab đầu tiên ("Trang đầu"), focus không thể đi sang nút Tệp, và ngược lại.
- **Giải pháp:** Trong `platform/ribbon/ribbon-host.js`, liên kết nút Tệp vào chu trình phím mũi tên:
  - Phím `ArrowRight` hoặc `ArrowDown` trên nút Tệp chuyển tiêu điểm ngay sang tab Ribbon đang hoạt động.
  - Phím `ArrowLeft` từ tab đầu tiên chuyển tiêu điểm sang nút Tệp.
  - Phím `ArrowRight` từ tab cuối cùng khi wrap-around quay về nút Tệp.

### 2.3. Bổ sung phím tắt mở Backstage (`Alt+F`) và điều hướng bàn phím bên trong Menu Tệp
- **Hiện tượng:** Menu Backstage (Tệp) chỉ có thể mở bằng cách click chuột vào nút Tệp hoặc nhấn Enter khi focus nút Tệp; chưa có phím tắt trực tiếp phổ biến (`Alt+F`), và danh sách các mục trong thanh bên Backstage chưa hỗ trợ phím mũi tên Lên/Xuống.
- **Giải pháp:**
  - Đăng ký lệnh `common.file.backstage` với phím tắt `Alt+F` trong `platform/commands/command-definitions.js`.
  - Trong `platform/shell/app-shell.js`:
    - Xử lý mở Backstage khi bấm Alt+F và tự động đặt tiêu điểm ban đầu (initial focus) vào nút "Quay lại" (`.vno-backstage-back-btn`).
    - Thêm trình lắng nghe phím mũi tên: `ArrowUp`/`ArrowDown` di chuyển tuần tự qua các mục sidebar (Trang chủ, Mới, Mở, Lưu, Lưu bản sao, In, Tùy chọn...), `ArrowRight` chuyển tiêu điểm sang các thẻ mẫu văn bản / nội dung bên phải, và `Escape` đóng menu Backstage trở về vùng làm việc.

---

## 3. NĂM PHÂN VÙNG ĐIỀU HƯỚNG BÀN PHÍM ĐÃ KIỂM THỬ THÀNH CÔNG

Bộ kiểm thử trực tiếp mới `tests/live/accessibility-keyboard-navigation.playwright.mjs` bao phủ toàn diện 39 kịch bản không chuột:

| Phân vùng | Nội dung kiểm thử | Kết quả |
|-----------|-------------------|---------|
| **Phần 1: Thứ tự Tab trên Ribbon & Viền Focus** | Tab tuần tự từ thanh truy cập nhanh qua nút Tệp, tab Ribbon đang chọn, các nút lệnh trong nhóm Ribbon. Kiểm tra 100% phần tử nhận focus đều hiển thị thực tế (không rơi vào vùng ẩn), có `:focus-visible` chuẩn tương phản WCAG 2.1 AA. | **PASS** (4/4 kịch bản) |
| **Phần 2: Chuyển Tab Ribbon bằng Phím** | Tab vào thanh tab; ArrowRight/ArrowLeft chuyển tab tức thì và cập nhật panel nội dung; Home về tab đầu, End về tab cuối; ArrowLeft từ tab đầu sang nút Tệp; ArrowRight từ tab cuối xoay vòng về nút Tệp. | **PASS** (9/9 kịch bản) |
| **Phần 3: Dialog Focus Traps, Esc & Khôi phục Focus** | Kiểm thử 5 hộp thoại trọng yếu:<br>1. **Columns Dialog** (Chèn cột)<br>2. **Page Setup Dialog** (Thiết lập trang)<br>3. **Watermark Dialog** (Thủy ấn)<br>4. **Mail Merge Dialog** (Trộn thư)<br>5. **Format Cells Dialog** (Định dạng ô trên Sheet, xử lý tab ẩn).<br>Tất cả 5 hộp thoại đều bẫy focus 100% với Tab và Shift+Tab; nhấn Esc đóng hộp thoại và khôi phục chính xác tiêu điểm về nút mở ban đầu hoặc ô tính đang chọn. | **PASS** (13/13 kịch bản) |
| **Phần 4: Vùng Soạn thảo Chính** | - **VN Writer:** Nhập văn bản hoàn toàn bằng phím, định dạng in đậm (Ctrl+B), in nghiêng (Ctrl+I).<br>- **VN Sheet:** Điều hướng mũi tên, gõ trực tiếp công thức `=100+250`, nhấn Enter tính ra `350`.<br>- **VN Slides:** Nhấn phím Tab để duyệt và chọn đối tượng hình khối (`is-selected`), dịch chuyển bằng phím mũi tên. | **PASS** (3/3 kịch bản) |
| **Phần 5: Menu Backstage (Tệp)** | Mở Backstage bằng `Alt+F`, tiêu điểm tự động vào nút Quay lại; ArrowDown/ArrowUp duyệt danh sách sidebar; ArrowRight sang các thẻ mẫu; phím Escape đóng hoàn toàn Backstage. | **PASS** (10/10 kịch bản) |

---

## 4. HƯỚNG DẪN SỬ DỤNG TRONG ỨNG DỤNG (RULE 10)

Đã bổ sung 3 mục hướng dẫn sử dụng tiếng Việt chi tiết về **Điều hướng bàn phím và Trợ năng** vào hệ thống Trợ giúp tích hợp trong ứng dụng (`platform/help/`):
- `WRITER_HELP_ENTRIES` trong `platform/help/entries-writer.js`: Hướng dẫn phím tắt mở menu Tệp (Alt+F), chuyển tab Ribbon bằng mũi tên Trái/Phải, di chuyển giữa các nút lệnh bằng Tab, bẫy tiêu điểm trong hộp thoại và các phím tắt định dạng văn bản chuẩn.
- `SHEET_HELP_ENTRIES` trong `platform/help/entries-sheet.js`: Hướng dẫn di chuyển ô lưới bằng phím mũi tên, Tab, Enter; mở hộp thoại Định dạng ô (Ctrl+1); bẫy tiêu điểm trong hộp thoại và khôi phục về ô lưới sau khi nhấn Escape.
- `SLIDES_HELP_ENTRIES` trong `platform/help/entries-slides.js`: Hướng dẫn duyệt chọn đối tượng trên slide bằng phím Tab và Shift+Tab, dịch chuyển hình vẽ bằng các phím mũi tên, mở Backstage bằng Alt+F và đóng bằng Escape.

---

## 5. TỔNG HỢP CÁC TỆP ĐÃ THAY ĐỔI

1. `apps/sheet/format-cells-dialog.js`: Nâng cấp hàm bẫy tiêu điểm `trapFocus` loại trừ các phần tử bên trong tab ẩn.
2. `apps/sheet/cell-styles.js`: Nâng cấp hàm bẫy tiêu điểm `trapFocus` lọc phần tử hiển thị thực tế.
3. `apps/sheet/sheet-grid.js`: Đảm bảo khôi phục tiêu điểm lưới ô tính sau khi đóng hộp thoại.
4. `platform/commands/command-definitions.js`: Khai báo lệnh `common.file.backstage` với phím tắt `Alt+F`.
5. `platform/ribbon/ribbon-host.js`: Tích hợp nút Tệp `.vno-ribbon-tab-file` vào chu trình phím mũi tên chuyển tab.
6. `platform/shell/app-shell.js`: Xử lý phím tắt Alt+F mở Backstage, focus ban đầu vào nút Back, phím mũi tên điều hướng sidebar và cards, Esc đóng Backstage.
7. `platform/help/entries-writer.js`: Thêm bài hướng dẫn trợ năng điều hướng bàn phím VN Writer.
8. `platform/help/entries-sheet.js`: Thêm bài hướng dẫn trợ năng điều hướng bàn phím VN Sheet.
9. `platform/help/entries-slides.js`: Thêm bài hướng dẫn trợ năng điều hướng bàn phím VN Slides.
10. `docs/PLAN-ACCESSIBILITY-KEYBOARD-NAV.md`: Kế hoạch kiểm thử và thực thi.
11. `tests/live/accessibility-keyboard-navigation.playwright.mjs`: Bộ kiểm thử Playwright tự động hóa 39 ca kiểm thử không chuột.
12. `docs/HANDOFF-ACCESSIBILITY-KEYBOARD-NAV.md`: Tài liệu bàn giao chi tiết.

---

## 6. KẾT QUẢ KIỂM THỬ NỀN TẢNG (GATES VERIFICATION)

1. **Cú pháp JavaScript:**
   - Lệnh: `node scripts/check-syntax.js`
   - Kết quả: **PASS** (89/89 tệp hợp lệ, 0 lỗi cú pháp).
2. **Kiểm thử đơn vị:**
   - Lệnh: `node tests/run-tests.js`
   - Kết quả: **PASS** (1511/1511 tests PASS, 0 fail).
3. **Kiểm thử hồi quy Ribbon 1280px:**
   - Lệnh: `node tests/live/ribbon-audit-1280.playwright.mjs`
   - Kết quả: **PASS** (104/104 tabs đạt 0px tràn ngang trên cả 3 ứng dụng ở cả 2 ngôn ngữ VI và EN).
4. **Kiểm thử trực tiếp điều hướng bàn phím:**
   - Lệnh: `node tests/live/accessibility-keyboard-navigation.playwright.mjs`
   - Kết quả: **PASS** (39/39 kịch bản PASS, 0 fail).

---

## 7. RỦI RO & KHUYẾN NGHỊ (RISKS & NEXT ACTIONS)
- **Rủi ro:** Không có. Không thay đổi cấu trúc dữ liệu, không sửa LibreOffice Core, không chạm vào `main.py`, không chạm vào `aria-label`/`role`.
- **Hành động kế tiếp:** 
  - Nhánh sẵn sàng để review và merge vào nhánh chính theo quy trình QA/Lead.
  - Phối hợp với nhánh xử lý ARIA Labels song song để hoàn thiện 100% chứng chỉ trợ năng cho VN Office.
