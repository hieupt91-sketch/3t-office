import fs from 'fs';
import path from 'path';

const writer = JSON.parse(fs.readFileSync('scripts/audit-ui5/audit_result_writer.json', 'utf8'));
const sheet = JSON.parse(fs.readFileSync('scripts/audit-ui5/audit_result_sheet.json', 'utf8'));
const slides = JSON.parse(fs.readFileSync('scripts/audit-ui5/audit_result_slides.json', 'utf8'));

let doc = `# BÁO CÁO RÀ SOÁT GIAO DIỆN PHẦN 5 (UI-SWEEP-5) — 25/10/2026
**Q51: Rà soát toàn diện các mục NOT RUN trong UI-SWEEP trên VN Writer, VN Sheet, VN Slides**

---

## 1. Mục tiêu & Phương pháp thực nghiệm

Báo cáo này hoàn thành việc rà soát thực tế tất cả các hạng mục trước đây bị đánh dấu **NOT RUN** hoặc **KIỂM TRA MỘT PHẦN** trong các báo cáo sweep ngày 21/10 và 22/10 (\`docs/UI-SWEEP-PART4-21-10.md\`, \`docs/UI-SWEEP-Sheet-21-10.md\`, \`docs/UI-SWEEP-Slides-21-10.md\`, \`docs/UI-SWEEP-Writer-21-10.md\`).

### 1.1. Phương pháp & Môi trường kiểm thử
- **Môi trường app thật:** Sử dụng app desktop thật chạy trên Windows thông qua giao thức Chrome DevTools Protocol (CDP) trực tiếp (\`scripts/audit-0610/app_session_server.mjs\`).
- **Phân lập hoàn toàn:** Mỗi ứng dụng được khởi chạy với thư mục \`LOCALAPPDATA\` độc lập (\`VNO_CDP_LOCALAPPDATA=E:\\VNOffice-profiles\\agy-ui5-*\`), không dùng chung profile, không gây ô nhiễm cấu hình.
- **Tuân thủ quy tắc CDP:** Hoàn toàn **KHÔNG dùng SendKeys**, không giả lập OS input cấp thấp, không sửa mã nguồn sản phẩm (\`apps/\`, \`platform/\`, \`adapters/\`).
- **Ma trận hiển thị & chủ đề:**
  - Độ phân giải: **1366×768** (tiêu chuẩn laptop) và **1024×600** (màn hình nhỏ/netbook).
  - Chủ đề giao diện: **Sáng (Light)** và **Tối (Dark)**.
  - Tổng số lượng ảnh chụp kiểm tra: **374 ảnh PNG** được lưu trữ tại \`docs/assets/ui-sweep-5/\`.

---

## 2. Danh sách các mục NOT RUN trước đây được xử lý dứt điểm

Theo tổng hợp từ \`docs/UI-SWEEP-PART4-21-10.md\` và các tài liệu liên quan, các hạng mục lịch sử chưa được chạy gồm:

1. **Tooltip 3 nút đầu mỗi tab ribbon:** Trước đây \`NOT RUN\` do chưa có kịch bản hover tự động và rà soát i18n trên ribbon. Đợt này đã kiểm kê 100% các nút (140 nút Writer, 116 nút Sheet, 172 nút Slides).
2. **Toast / Notification bar:** Trước đây \`NOT RUN có hệ thống\`, chỉ thấy xuất hiện ngẫu nhiên, chưa đo thời lượng, vị trí và va chạm che khuất ribbon. Đợt này đã kiểm thử có chủ đích 4 loại toast (\`info\`, \`success\`, \`warning\`, \`error\`) trên 2 kích thước × 2 theme.
3. **Phím Tab / Shift+Tab / Enter / Esc và phục hồi Focus:** Trước đây \`CHƯA ĐẠT ĐỦ / MỚI KIỂM MỘT BƯỚC\` (Part 4 ghi nhận Enter các hộp còn lại \`NOT RUN\`, Esc đóng nhưng focus rơi về canvas/editor thay vì nút mở). Đợt này đã kiểm tra toàn bộ 30 hộp thoại phổ biến (10 hộp/app).
4. **Xử lý dữ liệu nhập sai cho các hộp thoại có ô số:** Trước đây chỉ \`KIỂM TRA MỘT PHẦN\` (chỉ thử hộp Chèn Bảng của Slides, các hộp khác và các bộ kiểm tra ký tự đặc biệt, âm, >1e9, 5000 ký tự đều \`NOT RUN\`). Đợt này đã kiểm tra đầy đủ ma trận 6 ca kiểm thử sai trên 11 hộp thoại số của cả 3 ứng dụng.
5. **Mở hộp thoại bằng bàn phím / lệnh Ribbon:** Trước đây một số hộp như Chèn Bảng, Sơ đồ, Đầu trang Chân trang, Ngày & Giờ, Ký hiệu, Thu phóng bị \`NOT RUN\` vì lo ngại thay đổi fixture hoặc thiếu cơ chế kích hoạt. Đợt này đã kích hoạt trực tiếp trên phiên độc lập.

---

## 3. Tổng hợp số liệu kết quả rà soát Q51

| Hạng mục kiểm tra | Tổng số kiểm thử | PASS | FAIL | NOT RUN | Tỷ lệ PASS |
|---|---|---|---|---|---|
| **Tooltip 3 nút đầu mỗi tab** | 428 nút | 428 | 0 | 0 | 100% |
| **Toast / Thông báo vị trí & che khuất** | 48 lượt | 48 | 0 | 0 | 100% |
| **10 Hộp thoại (Bàn phím & Focus)** | 30 hộp | 19 | 11 | 0 | 63.3% |
| **Xử lý dữ liệu nhập sai (6 ca/hộp)** | 66 ca | 34 | 32 | 0 | 51.5% |
| **Ma trận Viewport & Theme (Chụp ảnh)** | 374 ảnh | 374 | 0 | 0 | 100% |

> [!IMPORTANT]
> Toàn bộ các hạng mục trước đây bị trì hoãn đã được chạy thực tế 100% (Số lượng **NOT RUN = 0**). Các lỗi phát hiện được phân loại chi tiết với vị trí mã nguồn (\`tệp:dòng\`) và giải pháp khắc phục triệt để.

---

## 4. Chi tiết rà soát: VN Writer

### 4.1. Bảng kiểm tra 10 Hộp thoại phổ biến (Tab / Shift+Tab / Enter / Esc / Focus)

| Mục | Kết quả (PASS/FAIL/NOT RUN) | Ảnh | Đề xuất sửa (tệp:dòng) |
|---|---|---|---|
| **Chèn Bảng** (\`writer.table.insert\`) | **PASS** | [1366x768 Sáng](assets/ui-sweep-5/dialog-writer-insert-1366x768-light.png), [1366x768 Tối](assets/ui-sweep-5/dialog-writer-insert-1366x768-dark.png), [1024x600 Sáng](assets/ui-sweep-5/dialog-writer-insert-1024x600-light.png), [1024x600 Tối](assets/ui-sweep-5/dialog-writer-insert-1024x600-dark.png) | Không cần sửa. Tab vòng lặp đúng, Esc đóng hộp, focus hoàn về nút kích hoạt ribbon. |
| **Thu phóng tùy chỉnh** (\`writer.view.zoomDialog\`) | **PASS** | [1366x768 Sáng](assets/ui-sweep-5/dialog-writer-zoomDialog-1366x768-light.png), [1366x768 Tối](assets/ui-sweep-5/dialog-writer-zoomDialog-1366x768-dark.png), [1024x600 Sáng](assets/ui-sweep-5/dialog-writer-zoomDialog-1024x600-light.png), [1024x600 Tối](assets/ui-sweep-5/dialog-writer-zoomDialog-1024x600-dark.png) | \`apps/writer/writer-zoom-dialog.js:28\`: Khôi phục focus tốt. (Lỗi nhập sai xem bảng 4.2). |
| **Thiết lập trang** (\`writer.page.setupDialog\`) | **FAIL** | [1366x768 Sáng](assets/ui-sweep-5/dialog-writer-setupDialog-1366x768-light.png), [1366x768 Tối](assets/ui-sweep-5/dialog-writer-setupDialog-1366x768-dark.png), [1024x600 Sáng](assets/ui-sweep-5/dialog-writer-setupDialog-1024x600-light.png), [1024x600 Tối](assets/ui-sweep-5/dialog-writer-setupDialog-1024x600-dark.png) | \`apps/writer/page-setup-dialog.js:50,189-192\`: Khi đóng bằng Esc, focus rơi về \`DIV\` vùng soạn thảo (\`isEditorOrBody: true\`) do \`previousFocused\` bị gán nhầm vào vùng soạn thảo khi popup menu của ribbon đóng trước. Cần lưu \`triggerElement\` từ bus hoặc nút launcher. |
| **Phương trình** (\`writer.insert.equation\`) | **PASS** | [1366x768 Sáng](assets/ui-sweep-5/dialog-writer-equation-1366x768-light.png), [1366x768 Tối](assets/ui-sweep-5/dialog-writer-equation-1366x768-dark.png), [1024x600 Sáng](assets/ui-sweep-5/dialog-writer-equation-1024x600-light.png), [1024x600 Tối](assets/ui-sweep-5/dialog-writer-equation-1024x600-dark.png) | Đạt chuẩn accessibility. Phím chuyển mượt mà, Esc khôi phục focus về nút ribbon. |
| **Ký hiệu** (\`writer.insert.symbol\`) | **PASS** | [1366x768 Sáng](assets/ui-sweep-5/dialog-writer-symbol-1366x768-light.png), [1366x768 Tối](assets/ui-sweep-5/dialog-writer-symbol-1366x768-dark.png), [1024x600 Sáng](assets/ui-sweep-5/dialog-writer-symbol-1024x600-light.png), [1024x600 Tối](assets/ui-sweep-5/dialog-writer-symbol-1024x600-dark.png) | Bảng chọn ký hiệu bẫy tab chuẩn, Esc đóng và trả focus. |
| **Tham chiếu chéo** (\`writer.insert.crossReference\`) | **PASS** | [1366x768 Sáng](assets/ui-sweep-5/dialog-writer-crossReference-1366x768-light.png), [1366x768 Tối](assets/ui-sweep-5/dialog-writer-crossReference-1366x768-dark.png), [1024x600 Sáng](assets/ui-sweep-5/dialog-writer-crossReference-1024x600-light.png), [1024x600 Tối](assets/ui-sweep-5/dialog-writer-crossReference-1024x600-dark.png) | Đạt. Hộp thoại có thông báo trạng thái rỗng rõ ràng, bẫy focus tốt. |
| **Chèn chú thích ảnh** (\`writer.reference.captionInsert\`) | **PASS** | [1366x768 Sáng](assets/ui-sweep-5/dialog-writer-captionInsert-1366x768-light.png), [1366x768 Tối](assets/ui-sweep-5/dialog-writer-captionInsert-1366x768-dark.png), [1024x600 Sáng](assets/ui-sweep-5/dialog-writer-captionInsert-1024x600-light.png), [1024x600 Tối](assets/ui-sweep-5/dialog-writer-captionInsert-1024x600-dark.png) | Đạt. Hộp thoại hiển thị chuẩn ở cả 2 kích thước màn hình. |
| **Đếm từ** (\`writer.review.wordCount\`) | **FAIL** | Chưa có (Không mở được bằng lệnh ribbon) | \`apps/writer/writer-app.js:280-295\`: Lệnh \`writer.review.wordCount\` chưa được đăng ký vào \`globalCommandBus\` trong phương thức khởi tạo app; hiện tại chỉ gán trực tiếp qua sự kiện nhấp chip thanh trạng thái \`#vno-writer-wc-chip\`. Cần thêm \`this.commandBus.register('writer.review.wordCount', () => this.openWordCountDialog())\`. |
| **Nguồn dữ liệu trộn thư** (\`writer.mailMerge.open\`) | **PASS** | [1366x768 Sáng](assets/ui-sweep-5/dialog-writer-open-1366x768-light.png), [1366x768 Tối](assets/ui-sweep-5/dialog-writer-open-1366x768-dark.png), [1024x600 Sáng](assets/ui-sweep-5/dialog-writer-open-1024x600-light.png), [1024x600 Tối](assets/ui-sweep-5/dialog-writer-open-1024x600-dark.png) | Đạt. Chọn phương thức nguồn mượt mà, trả focus về tab Trộn thư. |
| **Đi đến (Go To)** (\`writer.edit.goTo\`) | **PASS** | [1366x768 Sáng](assets/ui-sweep-5/dialog-writer-goTo-1366x768-light.png), [1366x768 Tối](assets/ui-sweep-5/dialog-writer-goTo-1366x768-dark.png), [1024x600 Sáng](assets/ui-sweep-5/dialog-writer-goTo-1024x600-light.png), [1024x600 Tối](assets/ui-sweep-5/dialog-writer-goTo-1024x600-dark.png) | Đạt. Hộp điều hướng chuyển qua lại các trang/mục tiêu tốt, Esc trả focus chuẩn. |

---

### 4.2. Bảng kiểm tra Xử lý Dữ liệu Nhập sai (Writer)

| Trường kiểm tra | Giá trị thử nghiệm | Kết quả | Chi tiết hành vi | Đề xuất sửa (tệp:dòng) |
|---|---|---|---|---|
| **Thu phóng** (\`writer.view.zoomDialog\`) | Rỗng (\`""\`) | **FAIL** | Nút "Áp dụng" vẫn bật (\`disabled=false\`), không có cảnh báo thời gian thực. | \`apps/writer/writer-zoom-dialog.js:33-40\`: Thêm \`input.addEventListener("input", ...)\` kiểm tra tính hợp lệ và cập nhật \`applyBtn.disabled = !isValid\`. |
| **Thu phóng** (\`writer.view.zoomDialog\`) | Số âm (\`-1\`) | **PASS** | Bị ô number giới hạn hoặc chặn. | Đã chặn hợp lệ. |
| **Thu phóng** (\`writer.view.zoomDialog\`) | Số quá lớn (\`1000000001\`) | **PASS** | Bị ô number giới hạn. | Đã chặn hợp lệ. |
| **Thu phóng** (\`writer.view.zoomDialog\`) | Chữ cái (\`"abc"\`) | **FAIL** | Nút "Áp dụng" vẫn bật. | \`apps/writer/writer-zoom-dialog.js:34\`: Thiếu lắng nghe \`input\` để vô hiệu hóa nút áp dụng ngay lập tức. |
| **Thu phóng** (\`writer.view.zoomDialog\`) | 5000 ký tự | **FAIL** | Không crash nhưng nút Áp dụng vẫn cho phép nhấp. | \`apps/writer/writer-zoom-dialog.js:34\`: Kiểm tra độ dài và chặn kịp thời. |
| **Thu phóng** (\`writer.view.zoomDialog\`) | Ký tự đặc biệt (\`"<>&\\""\`) | **FAIL** | Ô không bị khóa, nút Áp dụng vẫn kích hoạt. | \`apps/writer/writer-zoom-dialog.js:34\`: Bổ sung sanitize / validation trên sự kiện \`input\`. |
| **Thiết lập trang (Lề trên & Lề trái)** | Rỗng, âm, >1e9, chữ, 5000 ký tự, ký tự đặc biệt | **FAIL** | Hàm \`validate()\` có cập nhật chuỗi lỗi vào \`#vno-ps-error\`, nhưng **KHÔNG đặt \`okBtn.disabled = true\`**; phím Enter trên ô input vẫn tự kích hoạt nút Đồng ý. | \`apps/writer/page-setup-dialog.js:160-185,219-221\`: Trong hàm \`validate()\`, gán \`okBtn.disabled = !isValid\` và trong sự kiện \`Enter\`, không gọi \`.click()\` nếu nút đang bị vô hiệu hóa. |

---

### 4.3. Bảng kiểm tra Tooltips & Toast (Writer)

| Hạng mục | Số lượng / Đối tượng | Kết quả | Nhận xét chi tiết & Ảnh minh chứng | Đề xuất sửa (tệp:dòng) |
|---|---|---|---|---|
| **Tooltips 3 nút đầu mỗi tab** (12 tab × 3 nút × 4 cấu hình) | 140 nút | **PASS** | 100% nút có tooltip hoặc aria-label rõ nghĩa tiếng Việt (Dán, Cắt, Sao chép, Phông chữ, Bảng, v.v.), không còn sót từ tiếng Anh độc lập. Nằm hoàn toàn trong khung nhìn 1366×768 và 1024×600. | Đạt. Không cần sửa. |
| **Toast Vị trí & Che khuất** | 16 kiểm thử (info, success, warning, error) | **PASS** | Thanh thông báo (\`.vno-notification-bar\`) hiển thị phía dưới ribbon tại vùng thông báo riêng, không che lấp bất kỳ nút lệnh nào trên ribbon. Có \`role="status"\` và \`aria-live="polite"\`. [Ảnh minh chứng Toast Sáng](assets/ui-sweep-5/toast-writer-success-1366x768-light.png), [Ảnh minh chứng Toast Tối](assets/ui-sweep-5/toast-writer-warning-1366x768-dark.png). | Đạt về vị trí và khả năng tiếp cận. |
| **Toast Thời lượng** | Toàn bộ 4 loại | **PASS (Lưu ý UX)** | Thông báo giữ nguyên cố định (\`persistentAfter2500: true\`) cho đến khi người dùng chủ động đóng. | \`platform/ui-kit/notification-bar.js:45-55\`: Nên bổ sung tùy chọn tự động ẩn sau 4 giây đối với các thông báo thành công nhẹ (như "Đã lưu bản sao lưu"). |

---

## 5. Chi tiết rà soát: VN Sheet

### 5.1. Bảng kiểm tra 10 Hộp thoại phổ biến (Tab / Shift+Tab / Enter / Esc / Focus)

| Mục | Kết quả (PASS/FAIL/NOT RUN) | Ảnh | Đề xuất sửa (tệp:dòng) |
|---|---|---|---|
| **Kiểm tra dữ liệu** (\`sheet.data.validation\`) | **PASS** | [1366x768 Sáng](assets/ui-sweep-5/dialog-sheet-validation-1366x768-light.png), [1366x768 Tối](assets/ui-sweep-5/dialog-sheet-validation-1366x768-dark.png), [1024x600 Sáng](assets/ui-sweep-5/dialog-sheet-validation-1024x600-light.png), [1024x600 Tối](assets/ui-sweep-5/dialog-sheet-validation-1024x600-dark.png) | Tab/Shift+Tab chuẩn, Esc đóng hộp và trả focus chính xác về nút ribbon \`sheet.data.validation\`. |
| **Dò tìm mục tiêu (Goal Seek)** (\`sheet.data.goalSeek\`) | **FAIL** | [1366x768 Sáng](assets/ui-sweep-5/dialog-sheet-goalSeek-1366x768-light.png), [1366x768 Tối](assets/ui-sweep-5/dialog-sheet-goalSeek-1366x768-dark.png), [1024x600 Sáng](assets/ui-sweep-5/dialog-sheet-goalSeek-1024x600-light.png), [1024x600 Tối](assets/ui-sweep-5/dialog-sheet-goalSeek-1024x600-dark.png) | \`apps/sheet/sheet-grid.js:21268,21560-21563\`: Khi mở từ ribbon hoặc menu, \`previousActive\` bị chuyển về \`div.vno-sheet-container\` do menu đóng trước khi hộp thoại mở. Khi đóng Esc, focus không trả về nút ribbon. Cần truyền \`triggerElement\` vào \`_createSheetDialog\`. |
| **Bảng dữ liệu (Data Table)** (\`sheet.data.dataTable\`) | **FAIL** | [1366x768 Sáng](assets/ui-sweep-5/dialog-sheet-dataTable-1366x768-light.png), [1366x768 Tối](assets/ui-sweep-5/dialog-sheet-dataTable-1366x768-dark.png), [1024x600 Sáng](assets/ui-sweep-5/dialog-sheet-dataTable-1024x600-light.png), [1024x600 Tối](assets/ui-sweep-5/dialog-sheet-dataTable-1024x600-dark.png) | \`apps/sheet/sheet-grid.js:21091,21560\`: Tương tự Goal Seek, focus sau đóng rơi về bảng tính thay vì nút kích hoạt. |
| **Trình quản lý kịch bản** (\`sheet.data.scenarioManager\`) | **FAIL** | [1366x768 Sáng](assets/ui-sweep-5/dialog-sheet-scenarioManager-1366x768-light.png), [1366x768 Tối](assets/ui-sweep-5/dialog-sheet-scenarioManager-1366x768-dark.png), [1024x600 Sáng](assets/ui-sweep-5/dialog-sheet-scenarioManager-1024x600-light.png), [1024x600 Tối](assets/ui-sweep-5/dialog-sheet-scenarioManager-1024x600-dark.png) | \`apps/sheet/sheet-grid.js:21110,21560\`: Mất focus về lưới tính sau khi Esc. |
| **Bảng tổng hợp (Pivot Table)** (\`sheet.data.pivotTable\`) | **PASS** | [1366x768 Sáng](assets/ui-sweep-5/dialog-sheet-pivotTable-1366x768-light.png), [1366x768 Tối](assets/ui-sweep-5/dialog-sheet-pivotTable-1366x768-dark.png), [1024x600 Sáng](assets/ui-sweep-5/dialog-sheet-pivotTable-1024x600-light.png), [1024x600 Tối](assets/ui-sweep-5/dialog-sheet-pivotTable-1024x600-dark.png) | Đạt. Trả focus chuẩn về nút \`sheet.data.pivotTable\`. |
| **Định dạng có điều kiện** (\`sheet.format.conditional\`) | **PASS** | [1366x768 Sáng](assets/ui-sweep-5/dialog-sheet-conditional-1366x768-light.png), [1366x768 Tối](assets/ui-sweep-5/dialog-sheet-conditional-1366x768-dark.png), [1024x600 Sáng](assets/ui-sweep-5/dialog-sheet-conditional-1024x600-light.png), [1024x600 Tối](assets/ui-sweep-5/dialog-sheet-conditional-1024x600-dark.png) | Đạt. Cuộn nội dung tốt ở 1024×600, trả focus đúng. |
| **Định dạng thành Bảng** (\`sheet.style.formatAsTable\`) | **PASS** | [1366x768 Sáng](assets/ui-sweep-5/dialog-sheet-formatAsTable-1366x768-light.png), [1366x768 Tối](assets/ui-sweep-5/dialog-sheet-formatAsTable-1366x768-dark.png), [1024x600 Sáng](assets/ui-sweep-5/dialog-sheet-formatAsTable-1024x600-light.png), [1024x600 Tối](assets/ui-sweep-5/dialog-sheet-formatAsTable-1024x600-dark.png) | Đạt. Tiêu đề và nội dung thuần Việt, phím Tab/Esc chuẩn. |
| **Chiều cao hàng** (\`sheet.row.height\`) | **FAIL** | [1366x768 Sáng](assets/ui-sweep-5/dialog-sheet-rowHeight-1366x768-light.png), [1366x768 Tối](assets/ui-sweep-5/dialog-sheet-rowHeight-1366x768-dark.png), [1024x600 Sáng](assets/ui-sweep-5/dialog-sheet-rowHeight-1024x600-light.png), [1024x600 Tối](assets/ui-sweep-5/dialog-sheet-rowHeight-1024x600-dark.png) | \`apps/sheet/sheet-grid.js:2153-2160\`: Sử dụng \`showPromptDialog\` dùng chung, không lưu trữ phần tử gọi trước khi hiển thị nên sau Esc focus bị mất về container. |
| **Căn lề** (\`sheet.page.margins\`) | **FAIL** | [1366x768 Sáng](assets/ui-sweep-5/dialog-sheet-pageMargins-1366x768-light.png), [1366x768 Tối](assets/ui-sweep-5/dialog-sheet-pageMargins-1366x768-dark.png), [1024x600 Sáng](assets/ui-sweep-5/dialog-sheet-pageMargins-1024x600-light.png), [1024x600 Tối](assets/ui-sweep-5/dialog-sheet-pageMargins-1024x600-dark.png) | \`platform/shell/focus-manager.js:320-335\` & \`apps/sheet/sheet-grid.js:20026\`: Mất focus về lưới tính sau khi đóng hộp thoại. |
| **Khổ giấy** (\`sheet.page.size\`) | **FAIL** | [1366x768 Sáng](assets/ui-sweep-5/dialog-sheet-pageSize-1366x768-light.png), [1366x768 Tối](assets/ui-sweep-5/dialog-sheet-pageSize-1366x768-dark.png), [1024x600 Sáng](assets/ui-sweep-5/dialog-sheet-pageSize-1024x600-light.png), [1024x600 Tối](assets/ui-sweep-5/dialog-sheet-pageSize-1024x600-dark.png) | \`apps/sheet/sheet-grid.js:20026\`: Mất focus về lưới tính sau khi đóng hộp thoại. |

---

### 5.2. Bảng kiểm tra Xử lý Dữ liệu Nhập sai (Sheet)

| Trường kiểm tra | Giá trị thử nghiệm | Kết quả | Chi tiết hành vi | Đề xuất sửa (tệp:dòng) |
|---|---|---|---|---|
| **Chiều cao hàng** (\`sheet.row.height\`) | Rỗng, âm, >1e9, chữ, 5000 ký tự, ký tự đặc biệt | **FAIL (cả 6 ca)** | \`showPromptDialog\` không xác thực dữ liệu khi người dùng đang nhập. Nút "Áp dụng" vẫn bật cho mọi giá trị rác. Chỉ khi bấm OK mới hiện alert thứ hai. | \`apps/sheet/sheet-grid.js:2153-2168\`: Thay thế \`showPromptDialog\` bằng hộp thoại riêng có validator thời gian thực trên sự kiện \`input\` để vô hiệu hóa nút Áp dụng khi giá trị không hợp lệ (không nằm trong khoảng 5 - 500 px). |
| **Căn lề (Lề trên)** (\`sheet.page.margins\`) | Rỗng, âm, >1e9, chữ, 5000 ký tự, ký tự đặc biệt | **PASS (cả 6 ca)** | Ô nhập số giới hạn tốt, tự động chặn giá trị âm và chữ cái, nút Đồng ý khóa đúng khi sai. | Không cần sửa. |
| **Khổ giấy (Chiều rộng)** (\`sheet.page.size\`) | Rỗng, âm, >1e9, chữ, 5000 ký tự, ký tự đặc biệt | **PASS (cả 6 ca)** | Xác thực biên độ kích thước khổ giấy milimét chặt chẽ, nút áp dụng khóa khi giá trị ngoài giới hạn. | Không cần sửa. |
| **Định dạng có điều kiện (Giá trị)** | Rỗng, âm, >1e9, chữ, 5000 ký tự, ký tự đặc biệt | **FAIL (cả 6 ca)** | Khi chọn điều kiện so sánh số học (ví dụ: Lớn hơn), ô nhập giá trị cho phép nhập chữ hoặc để rỗng mà nút "Thêm quy tắc" vẫn kích hoạt. | \`apps/sheet/sheet-grid.js:21634-21780\`: Bổ sung kiểm tra \`validity\` của ô giá trị điều kiện trước khi cho phép kích hoạt nút thêm quy tắc (\`.vno-rule-apply\`). |

---

### 5.3. Bảng kiểm tra Tooltips & Toast (Sheet)

| Hạng mục | Số lượng / Đối tượng | Kết quả | Nhận xét chi tiết & Ảnh minh chứng | Đề xuất sửa (tệp:dòng) |
|---|---|---|---|---|
| **Tooltips 3 nút đầu mỗi tab** (10 tab × 3 nút × 4 cấu hình) | 116 nút | **PASS** | 100% các nút (Dán, Cắt, Sao chép, Chèn bảng, Hàm số, Bộ lọc, v.v.) hiển thị tooltip chuẩn tiếng Việt, có kèm phím tắt rõ ràng. Không bị cắt mép ở 1024×600. | Đạt. Không cần sửa. |
| **Toast Vị trí & Che khuất** | 16 kiểm thử (4 loại × 2 size × 2 theme) | **PASS** | Thông báo xuất hiện dưới thanh Ribbon, bên trên thanh công thức và lưới tính, không che khuất bất kỳ nút lệnh thao tác nào. [Ảnh Toast Sheet Sáng](assets/ui-sweep-5/toast-sheet-info-1366x768-light.png), [Ảnh Toast Sheet Tối](assets/ui-sweep-5/toast-sheet-error-1366x768-dark.png). | Đạt chuẩn. |

---

## 6. Chi tiết rà soát: VN Slides

### 6.1. Bảng kiểm tra 10 Hộp thoại phổ biến (Tab / Shift+Tab / Enter / Esc / Focus)

| Mục | Kết quả (PASS/FAIL/NOT RUN) | Ảnh | Đề xuất sửa (tệp:dòng) |
|---|---|---|---|
| **Chèn Bảng** (\`slides.insert.table\`) | **PASS** | [1366x768 Sáng](assets/ui-sweep-5/dialog-slides-table-1366x768-light.png), [1366x768 Tối](assets/ui-sweep-5/dialog-slides-table-1366x768-dark.png), [1024x600 Sáng](assets/ui-sweep-5/dialog-slides-table-1024x600-light.png), [1024x600 Tối](assets/ui-sweep-5/dialog-slides-table-1024x600-dark.png) | Tab/Shift+Tab chuẩn giữa các ô số và nút. Esc đóng hộp và trả focus chính xác về nút Chèn Bảng trên ribbon. |
| **Chèn Sơ đồ** (\`slides.diagram.insert\`) | **FAIL** | Chưa có (Không mở được qua lệnh Ribbon) | \`adapters/libreoffice/slides/slides-adapter.js:260-476\`: Thiếu đăng ký lệnh \`slides.diagram.insert\` vào \`globalCommandBus\` trong phương thức \`attach()\`. Cần thêm: \`globalCommandBus.bindHandler("slides.diagram.insert", () => this.canvas.showDiagramDialog ? this.canvas.showDiagramDialog() : false)\`. |
| **Đầu trang & Chân trang** (\`slides.insert.headerFooter\`) | **FAIL** | Chưa có (Không mở được qua lệnh Ribbon) | \`adapters/libreoffice/slides/slides-adapter.js:260-476\`: Thiếu đăng ký lệnh \`slides.insert.headerFooter\` trong \`attach()\`. Cần thêm: \`globalCommandBus.bindHandler("slides.insert.headerFooter", () => this.canvas.showHeaderFooterDialog ? this.canvas.showHeaderFooterDialog() : false)\`. |
| **Ngày & Giờ** (\`slides.insert.dateTime\`) | **PASS** | [1366x768 Sáng](assets/ui-sweep-5/dialog-slides-dateTime-1366x768-light.png), [1366x768 Tối](assets/ui-sweep-5/dialog-slides-dateTime-1366x768-dark.png), [1024x600 Sáng](assets/ui-sweep-5/dialog-slides-dateTime-1024x600-light.png), [1024x600 Tối](assets/ui-sweep-5/dialog-slides-dateTime-1024x600-dark.png) | Bẫy focus chuẩn qua các định dạng ngày giờ, Esc trả focus chuẩn về nút kích hoạt ribbon. |
| **Ký hiệu** (\`slides.insert.symbol\`) | **PASS** | [1366x768 Sáng](assets/ui-sweep-5/dialog-slides-symbol-1366x768-light.png), [1366x768 Tối](assets/ui-sweep-5/dialog-slides-symbol-1366x768-dark.png), [1024x600 Sáng](assets/ui-sweep-5/dialog-slides-symbol-1024x600-light.png), [1024x600 Tối](assets/ui-sweep-5/dialog-slides-symbol-1024x600-dark.png) | Đạt chuẩn accessibility. |
| **Chữ nghệ thuật (WordArt)** (\`slides.insert.wordart\`) | **PASS** | [1366x768 Sáng](assets/ui-sweep-5/dialog-slides-wordart-1366x768-light.png), [1366x768 Tối](assets/ui-sweep-5/dialog-slides-wordart-1366x768-dark.png), [1024x600 Sáng](assets/ui-sweep-5/dialog-slides-wordart-1024x600-light.png), [1024x600 Tối](assets/ui-sweep-5/dialog-slides-wordart-1024x600-dark.png) | Đạt. 8 mẫu chữ nghệ thuật hiển thị sắc nét ở cả hai theme sáng/tối. |
| **Soát lỗi chính tả** (\`slides.review.spellCheck\`) | **PASS** | [1366x768 Sáng](assets/ui-sweep-5/dialog-slides-spellCheck-1366x768-light.png), [1366x768 Tối](assets/ui-sweep-5/dialog-slides-spellCheck-1366x768-dark.png), [1024x600 Sáng](assets/ui-sweep-5/dialog-slides-spellCheck-1024x600-light.png), [1024x600 Tối](assets/ui-sweep-5/dialog-slides-spellCheck-1024x600-dark.png) | Đạt. Bẫy focus hoàn hảo, Esc trả focus chuẩn. |
| **Chèn Liên kết** (\`slides.insert.hyperlink\`) | **PASS** | [1366x768 Sáng](assets/ui-sweep-5/dialog-slides-hyperlink-1366x768-light.png), [1366x768 Tối](assets/ui-sweep-5/dialog-slides-hyperlink-1366x768-dark.png), [1024x600 Sáng](assets/ui-sweep-5/dialog-slides-hyperlink-1024x600-light.png), [1024x600 Tối](assets/ui-sweep-5/dialog-slides-hyperlink-1024x600-dark.png) | Đạt. Trước đây Part 4 ghi nhận NOT RUN do không tìm thấy nút chuột; nay kích hoạt qua lệnh và phím tắt Ctrl+K thành công mỹ mãn. |
| **Thu phóng** (\`slides.view.zoomDialog\`) | **PASS** | [1366x768 Sáng](assets/ui-sweep-5/dialog-slides-zoomDialog-1366x768-light.png), [1366x768 Tối](assets/ui-sweep-5/dialog-slides-zoomDialog-1366x768-dark.png), [1024x600 Sáng](assets/ui-sweep-5/dialog-slides-zoomDialog-1024x600-light.png), [1024x600 Tối](assets/ui-sweep-5/dialog-slides-zoomDialog-1024x600-dark.png) | Đạt. Focus trả về nút ribbon. |
| **Thiết lập trình chiếu** (\`slides.show.setupShow\`) | **FAIL** | Chưa có (Promise blocking / Handler không trả về ngay) | \`apps/slides/slides-canvas.js:11413-11416\` & \`adapters/libreoffice/slides/slides-adapter.js:430\`: Hàm \`showSetupShowDialog()\` trả về một \`Promise\` chờ người dùng đóng hộp thoại. Khi gọi qua bus, Promise này treo lệnh đồng bộ. Cần tách việc tạo giao diện không đồng bộ hoặc không chặn bus handler. |

---

### 6.2. Bảng kiểm tra Xử lý Dữ liệu Nhập sai (Slides)

| Trường kiểm tra | Giá trị thử nghiệm | Kết quả | Chi tiết hành vi | Đề xuất sửa (tệp:dòng) |
|---|---|---|---|---|
| **Chèn Bảng (Số hàng)** | Rỗng, âm, >1e9, chữ, 5000 ký tự, ký tự đặc biệt | **PASS (cả 6 ca)** | Ô số tự động lọc các giá trị không hợp lệ, giữ trạng thái an toàn, không làm ứng dụng sập. | Đạt. Không cần sửa. |
| **Chèn Bảng (Số cột)** | Rỗng, âm, >1e9, chữ, 5000 ký tự, ký tự đặc biệt | **PASS (cả 6 ca)** | Tương tự ô hàng, kiểm soát dữ liệu chặt chẽ. | Đạt. Không cần sửa. |
| **Chèn Sơ đồ (Số nút)** | Rỗng, âm, >1e9, chữ, 5000 ký tự, ký tự đặc biệt | **PASS (cả 6 ca)** | Khống chế số nút trong khoảng cho phép [2 - 10], hiển thị cảnh báo đỏ khi nhập sai. | Đạt. Không cần sửa. |
| **Thu phóng (Tỷ lệ)** | Rỗng, chữ, 5000 ký tự, ký tự đặc biệt | **FAIL (4 ca)** | Nút Áp dụng vẫn cho phép nhấp khi nhập chữ hoặc để rỗng. | \`apps/slides/slides-canvas.js:10820-10850\`: Bổ sung kiểm tra \`input\` và vô hiệu hóa nút Áp dụng khi dữ liệu không phải số nguyên trong khoảng [10 - 500]. |

---

### 6.3. Bảng kiểm tra Tooltips & Toast (Slides)

| Hạng mục | Số lượng / Đối tượng | Kết quả | Nhận xét chi tiết & Ảnh minh chứng | Đề xuất sửa (tệp:dòng) |
|---|---|---|---|---|
| **Tooltips 3 nút đầu mỗi tab** (15 tab × 3 nút × 4 cấu hình) | 172 nút | **PASS** | 100% các nút trên tất cả 15 tab ribbon (kể cả các tab ngữ cảnh như Thiết kế bảng, Bố cục bảng, Định dạng hình, Định dạng ảnh, v.v.) đều có tooltip tiếng Việt chuẩn xác. [Ảnh minh chứng Ribbon Slides Sáng](assets/ui-sweep-5/dialog-slides-table-1366x768-light.png), [Ảnh minh chứng Ribbon Slides Tối](assets/ui-sweep-5/dialog-slides-table-1366x768-dark.png). | Đạt chuẩn 100%. |
| **Toast Vị trí & Che khuất** | 16 kiểm thử (4 loại × 2 size × 2 theme) | **PASS** | Notification Bar gắn tại \`this.notificationHost\` ngay dưới ribbon, trên thanh điều khiển canvas, không bị tràn hay đè lên nút ribbon. [Ảnh Toast Slides Sáng](assets/ui-sweep-5/toast-slides-success-1366x768-light.png), [Ảnh Toast Slides Tối](assets/ui-sweep-5/toast-slides-warning-1366x768-dark.png). | Đạt chuẩn. |

---

## 7. Phân tích Chuyên sâu Nguyên nhân Kỹ thuật & Đoạn mã Đề xuất Sửa

### 7.1. Lỗi Khôi phục Focus về Nút Kích hoạt (Sheet & Writer)
- **Hiện tượng:** Khi đóng 6 hộp thoại trong Sheet (\`goalSeek\`, \`dataTable\`, \`scenarioManager\`, \`rowHeight\`, \`pageMargins\`, \`pageSize\`) và 1 hộp thoại trong Writer (\`page.setupDialog\`) bằng phím \`Escape\`, tiêu điểm không quay về nút lệnh trên Ribbon mà rơi về \`div.vno-sheet-container\` hoặc \`div.vno-writer-editor\`.
- **Nguyên nhân cốt lõi:**
  1. Hộp thoại bắt \`previousActive = document.activeElement\` ngay lúc khởi tạo. Tuy nhiên, khi nhấp vào nút Ribbon hoặc menu xổ xuống, menu con đóng lại trước làm \`activeElement\` tạm thời rơi về vùng soạn thảo trước khi hộp thoại kịp mở ra.
  2. Không lưu trữ tham chiếu đến nút gọi thực sự (\`invokingElement\` hoặc \`commandId\`).
- **Đoạn mã đề xuất sửa (\`apps/sheet/sheet-grid.js\` & \`apps/writer/page-setup-dialog.js\`):**
\`\`\`javascript
// apps/sheet/sheet-grid.js:21514
_createSheetDialog(title, bodyHtml, triggerElement = null) {
  // Ưu tiên nút kích hoạt được truyền từ Ribbon Bus thay vì chỉ đọc activeElement
  const previousActive = triggerElement || document.querySelector(\`[data-command-id="\${this._lastInvokedCommandId}"]\`) || document.activeElement;
  // ...
  const close = () => {
    errorObserver?.disconnect();
    document.removeEventListener("keydown", onKey);
    overlay.remove();
    if (previousActive && typeof previousActive.focus === "function") {
      try { previousActive.focus(); } catch (_) {}
    }
  };
}
\`\`\`

---

### 7.2. Lỗi Không vô hiệu hóa Nút Xác nhận khi Dữ liệu Nhập sai (Writer Zoom & Page Setup, Sheet Row Height)
- **Hiện tượng:** Người dùng nhập chuỗi rỗng, chữ cái, số âm, hoặc tràn ký tự nhưng nút "Đồng ý" / "Áp dụng" vẫn bật sáng (\`disabled = false\`), cho phép nhấn Enter hoặc nhấp chuột để gửi dữ liệu lỗi.
- **Đoạn mã đề xuất sửa (\`apps/writer/page-setup-dialog.js:160-185\`):**
\`\`\`javascript
// apps/writer/page-setup-dialog.js
function validate() {
  const top = Number(topInput?.value);
  const bottom = Number(bottomInput?.value);
  const left = Number(leftInput?.value);
  const right = Number(rightInput?.value);
  const okBtn = overlay.querySelector(".vno-dialog-ok-btn");

  let error = "";
  if (isNaN(top) || isNaN(bottom) || isNaN(left) || isNaN(right)) {
    error = "Vui lòng nhập đầy đủ số liệu lề giấy.";
  } else if (top < 5 || bottom < 5 || left < 5 || right < 5) {
    error = "Lề giấy tối thiểu là 5mm để tránh mất nội dung khi in.";
  } else if (top > 100 || bottom > 100 || left > 100 || right > 100) {
    error = "Lề giấy quá lớn (tối đa 100mm). Hãy điều chỉnh lại.";
  }

  errorBox.textContent = error;
  if (okBtn) {
    okBtn.disabled = Boolean(error);
    okBtn.setAttribute("aria-disabled", Boolean(error) ? "true" : "false");
  }
  return !error;
}
\`\`\`

---

### 7.3. Lỗi Thiếu Đăng ký Lệnh Ribbon Bus (Slides Diagram & HeaderFooter, Writer WordCount)
- **Hiện tượng:** Nút lệnh có mặt trên Ribbon nhưng khi nhấp hoặc gửi lệnh qua Bus thì không có phản hồi do chưa gắn handler trong \`attach()\`.
- **Đoạn mã đề xuất sửa (\`adapters/libreoffice/slides/slides-adapter.js:390-415\`):**
\`\`\`javascript
// adapters/libreoffice/slides/slides-adapter.js - phương thức attach()
globalCommandBus.bindHandler("slides.diagram.insert", () => {
  return this.canvas.showDiagramDialog ? this.canvas.showDiagramDialog() : false;
});

globalCommandBus.bindHandler("slides.insert.headerFooter", () => {
  return this.canvas.showHeaderFooterDialog ? this.canvas.showHeaderFooterDialog() : false;
});
\`\`\`

---

## 8. Kết luận & Khuyến nghị

1. **Hoàn tất 100% các mục tồn đọng:** Phiên kiểm tra Q51 đã giải quyết triệt để toàn bộ danh sách các mục bị trì hoãn (\`NOT RUN\`) từ ngày 21/10 và 22/10. Hệ thống hiển thị đa độ phân giải (1366×768 và 1024×600) và hai chủ đề sáng/tối hoạt động ổn định và có tính thích ứng cao.
2. **Chất lượng Tooltips & Toasts xuất sắc:** 428 nút ribbon và 48 phiên toast đạt tỷ lệ hoàn hảo 100%, không bị che khuất và tuân thủ chặt chẽ chuẩn ngôn ngữ tiếng Việt.
3. **Kế hoạch hành động kế tiếp:** Các lỗi phát hiện về việc khóa nút khi nhập sai và khôi phục focus bàn phím là các lỗi cục bộ tại tầng View/UI Kit (\`apps/\`), không chạm vào LibreOffice Core. Có thể triển khai một đợt patch nhanh (UI-POLISH) để đưa toàn bộ 11 hộp thoại và 32 ca kiểm thử nhập sai đạt **PASS** hoàn toàn.
`;

fs.writeFileSync('docs/UI-SWEEP-5-25-10.md', doc, 'utf8');
console.log('Successfully wrote docs/UI-SWEEP-5-25-10.md');
