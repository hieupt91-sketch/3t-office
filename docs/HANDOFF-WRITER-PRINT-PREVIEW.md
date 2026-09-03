# Agent Handoff — Print Preview Thật cho VN Writer

**TASK:** Triển khai tính năng Print Preview thật cho VN Writer (Tier 1 Feature Parity, tham khảo Word & LibreOffice Print Preview).  
**AGENT/ROLE:** Antigravity (UI & Adapter Agent)  
**BRANCH:** `feature/writer-print-preview`  
**WORKTREE:** `E:\VNOffice-agy-printpreview`  
**DATE:** 2026-09-04  

---

## 1. Mục tiêu Đã Hoàn thành

1. **Khai báo & Ánh xạ Lệnh chuẩn hóa:**
   - Thêm command `writer.file.printPreview` vào `platform/commands/command-definitions.js` (nhóm `file`, label "Xem trước khi in", phím tắt `Ctrl+F2`, icon `filePrint`).
   - Ánh xạ sang UNO command `.uno:PrintPreview` trong `adapters/libreoffice/common/command-dispatch-mapper.js`.
   - Bổ sung nhóm "In ấn" trong ribbon tab "Bố cục" (`apps/writer/writer-ribbon.js`) chứa hai nút cạnh nhau: "In tài liệu" (`common.file.print`) và "Xem trước khi in" (`writer.file.printPreview`).

2. **Overlay Print Preview Thật sự (WYSIWYG Fidelity):**
   - Tái sử dụng nguồn dữ liệu trung thực nhất từ `_contentForExport()` và `_getPageSetupCss()` trong `writer-adapter.js` (đã strip comment metadata, đóng gói Header/Footer).
   - Bản xem trước hiển thị đúng khổ giấy (`A4`, `Letter`, `Legal`), hướng giấy (`Portrait`, `Landscape`), và lề trang (`top`, `bottom`, `left`, `right` mm) hiện tại từ `adapter.pageSetup`.
   - Kiểm thử thực tế: Khi đổi Page Setup sang `Letter` `Landscape` hoặc lề tùy chỉnh, preview lập tức phản ánh đúng tỷ lệ và kích thước (279mm × 216mm), tuyệt đối không bị cố định A4.

3. **Thuật toán Phân trang Động & Điều hướng Nhiều trang:**
   - Tính toán chiều cao vùng thân trang khả dụng (`availableBodyHeightPx`) dựa trên chiều cao trang trừ lề và không gian Header/Footer.
   - Nhận diện ngắt trang thủ công (`style*="page-break-before"` / `Phân tách trang`) để tách trang dứt khoát.
   - Khi nội dung vượt quá chiều cao khả dụng (hoặc khi đổi sang khổ ngang làm giảm chiều cao), tự động tính toán ngắt trang mượt mà.
   - Header và Footer tự động lặp lại trên từng trang. Đánh số trang động trong Footer ("Trang X / Y") phản ánh đúng vị trí trang thực tế.
   - Điều hướng đầy đủ: Nút "◀ Trang trước", "Trang sau ▶", ô nhập số trang nhảy trực tiếp, phím tắt `ArrowLeft`/`PageUp` và `ArrowRight`/`PageDown`.

4. **In Thật & Đóng An toàn:**
   - Nút "In tài liệu" trong preview gọi trực tiếp `this.print()` (kích hoạt `window.print()` của trình duyệt).
   - Đóng preview bằng nút `&times;` (X) hoặc phím `Escape`. Tự động dọn dẹp sạch sẽ event listener, null hóa tham chiếu và trả lại focus cho trình soạn thảo, không gây rò rỉ bộ nhớ hay xung đột state.
   - Công cụ Zoom: Phóng to (+), Thu nhỏ (-), Vừa trang (tự tính scale vừa vặn chiều cao viewport).

---

## 2. Danh mục Tệp Thay đổi

1. `platform/commands/command-definitions.js`: Khai báo `writer.file.printPreview`.
2. `adapters/libreoffice/common/command-dispatch-mapper.js`: Ánh xạ `"writer.file.printPreview": ".uno:PrintPreview"`.
3. `apps/writer/writer-ribbon.js`: Thêm nhóm "In ấn" với 2 nút In và Xem trước khi in.
4. `adapters/libreoffice/writer/writer-adapter.js`:
   - State: `printPreviewOverlay`, `currentPreviewPage`, `previewTotalPages`, `previewZoom`, `_previewKeyHandler`.
   - Phương thức: `getPageDimensions()`, `paginateContent()`, `openPrintPreview()`, `goToPreviewPage()`, `setPreviewZoom()`, `closePrintPreview()`.
   - Gắn lệnh trong `attach()` và `handleDispatch()`.
5. `apps/writer/writer.css`: Thêm bộ style hoàn chỉnh cho Overlay, Toolbar, Viewport, Sheet, Page Number Tag và `@media print`.
6. `tests/unit/writer-print-preview.test.js`: Suite kiểm thử 10 ca kiểm thử hành vi độc lập (khổ giấy, hướng trang, lề, phân trang, điều hướng, print, close, command dispatch).
7. `tests/run-tests.js`: Tích hợp suite 16 vào master test runner.
8. `tests/smoke/html-smoke.test.js`: Bổ sung ca kiểm thử headless browser (Edge/Chrome) thật mở Print Preview với khổ Letter Landscape.
9. `docs/FEATURE-PARITY-ROADMAP.md`: Đánh dấu `[x] Print Preview thật trước khi in`.

---

## 3. Kết quả Kiểm thử Đạt được

- **Syntax Checker (`scripts/check-syntax.js`)**: 38/38 files PASS (0 lỗi cú pháp).
- **Master Test Runner (`tests/run-tests.js`)**: **192/192 PASS | 0 FAIL**.
- **Real Browser Headless (msedge.exe)**: Nạp VN Writer và mở Print Preview render chính xác khổ Letter Landscape thật thành công.
