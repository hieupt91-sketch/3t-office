# BÁO CÁO KIỂM TOÁN CH-4.6: GIỮ BÀN PHÍM TRONG VÙNG SOẠN THẢO (KEEP FOCUS)

- **Mã công việc:** CH-4.6
- **Mục tiêu:** Giữ bàn phím và tiêu điểm luôn nằm trong vùng soạn thảo (văn bản Doc, ô bảng tính Sheet, trang chiếu Slide) sau khi đóng MỌI hộp thoại, sau khi kích hoạt các lệnh Ribbon / đổi tab Ribbon, sau khi đóng menu Tệp (Backstage), sau khi thu phóng Zoom, và sau khi đổi cửa sổ quay lại. Sau mỗi tình huống, người dùng gõ ngay được văn bản/số liệu vào tài liệu và phím Enter KHÔNG kích hoạt nhầm bất kỳ nút nào.
- **Phạm vi triển khai:** Tầng DÙNG CHUNG (`platform/shell/focus-manager.js`, `platform/ui-kit/dialogs.js`, `platform/commands/command-bus.js`, `platform/find/find-dialog.js`, `platform/print/print-dialog.js`, `platform/about/about-dialog.js`, `platform/shell/app-shell.js`, `platform/help/entries-retro-platform.js`). Tuyệt đối KHÔNG sao chép code phân mảnh giữa 3 app.
- **Môi trường đo kiểm:** Desktop App ngoại tuyến độc lập (Windows WebView2 native process), kết nối giao thức Chrome DevTools Protocol (CDP), profile thư mục riêng `E:\VNOffice-profiles\agy-focus-N`, quản lý tiến trình chặt chẽ bằng PID thu hồi trực tiếp (`taskkill /PID <pid> /T /F`).
- **Quy chuẩn đo đạc:** Đo THỰC TẾ 20 tình huống x 3 ứng dụng = 60 tình huống. CẤM `|| true`, CẤM gán cứng PASS, CẤM dữ liệu giả.

---

## 1. Kiến trúc Bảo vệ Tiêu điểm Dùng chung (`platform/shell/focus-manager.js`)

Hệ thống bảo vệ tiêu điểm được tổ chức thống nhất tại tầng Shared Platform với các cơ chế cốt lõi:

1. **Nhận diện vùng soạn thảo (`isEditorElement`):**
   - **3T Doc:** Vùng thân văn bản `.vno-writer-body` và các phần tử con đoạn văn `p`, tiêu đề `h1-h6`, ô bảng biểu `td/th`.
   - **3T Sheet:** Container bảng tính `.vno-sheet-container`, thanh nhập công thức `.vno-formula-input` (`#vno-formula-val`), và ô đang sửa `.vno-cell-editor`.
   - **3T Slide:** Vùng chiếu slide `.vno-slide-canvas`, khung làm việc `.vno-slides-workspace`, hộp tiêu đề `.vno-slide-title`, hộp thân `.vno-slide-body`, và các khối văn bản/hình vẽ có `contenteditable="true"`.
   - Loại trừ hoàn toàn thanh Ribbon, thanh công cụ, menu ngữ cảnh, dialogs và thanh trạng thái.

2. **Chụp và khôi phục tiêu điểm (`captureEditorFocus`, `restoreEditorFocus`):**
   - Trước khi người dùng bấm vào Ribbon hoặc mở hộp thoại: Tự động ghi nhớ phần tử soạn thảo đang hoạt động cùng vị trí con trỏ / Selection Range.
   - Khi đóng hộp thoại hoặc sau khi lệnh Ribbon hoàn tất: Chủ động làm mờ (`blur()`) nút bấm/tab Ribbon ngoài editor, đưa tiêu điểm `focus()` ngay về vùng soạn thảo tương ứng của app (với Doc: căn chỉnh caret đúng cuối đoạn/vị trí trước đó; với Sheet: gọi `grid.focusGrid()` để kích hoạt ô; với Slide: focus vào `selectedTarget` hoặc canvas).

3. **Bộ giám sát toàn cục (`installGlobalFocusGuard`):**
   - `pointerdown`: Ghi nhận tiêu điểm trước khi người dùng chạm vào Ribbon hoặc thanh công cụ.
   - `click`: Trả tiêu điểm về vùng soạn thảo ngay sau khi click lệnh Ribbon hoàn tất (khi không có dialog nào mở).
   - `MutationObserver`: Lắng nghe trên `document.body`, phát hiện khi hộp thoại bị gỡ bỏ khỏi DOM hoặc bị ẩn (`display: none`, `hidden`) để tự động khôi phục tiêu điểm editor.
   - `window.focus` & `visibilitychange`: Tự động trả tiêu điểm về editor khi người dùng chuyển cửa sổ ứng dụng (Alt+Tab hoặc activateTarget / bringToFront).
   - **Bảo vệ phím Enter (Enter Guard):** Ngăn chặn triệt để hành vi phím Enter kích hoạt nhầm các nút ngoài editor (`BUTTON`, `.vno-ribbon-tab`, `[role='tab']`) khi không có dialog mở; trong Sheet tự động di chuyển ô xuống dưới an toàn.

---

## 2. Bảng Tổng hợp Kết quả Đo kiểm Thực tế (60 Tình huống)

Toàn bộ dữ liệu dưới đây được trích xuất từ lượt chạy đo thật của kịch bản `tests/live/cdp/ch4-6-keep-focus.desktop.mjs` trên 3 app Desktop thật (`3T Doc`, `3T Sheet`, `3T Slide`).

### 2.1. 3T Doc (Writer) — 20 Tình huống Thực tế

| # | Tình huống đo kiểm | ActiveElement Trước -> Sau | Ký tự đã gõ | Kết quả gõ vào Editor | Hành vi phím Enter | Trạng thái |
|---|--------------------|----------------------------|-------------|-----------------------|-------------------|------------|
| 01 | Đóng Tìm kiếm bằng phím Escape | `div.vno-writer-body` -> `div.vno-writer-body` | W01 | Xuất hiện trong thân văn bản Doc | Enter tạo đoạn mới an toàn (số đoạn: 2) | **PASS** |
| 02 | Đóng Thay thế bằng nút Đóng 'x' | `div.vno-writer-body` -> `div.vno-writer-body` | W02 | Xuất hiện trong thân văn bản Doc | Enter tạo đoạn mới an toàn (số đoạn: 3) | **PASS** |
| 03 | Đóng Tìm kiếm bằng nút Đóng ở footer | `div.vno-writer-body` -> `div.vno-writer-body` | W03 | Xuất hiện trong thân văn bản Doc | Enter tạo đoạn mới an toàn (số đoạn: 4) | **PASS** |
| 04 | Đóng hộp thoại In bằng phím Escape | `div.vno-writer-body` -> `div.vno-writer-body` | W04 | Xuất hiện trong thân văn bản Doc | Enter tạo đoạn mới an toàn (số đoạn: 5) | **PASS** |
| 05 | Đóng hộp thoại In bằng nút Đóng '×' | `div.vno-writer-body` -> `div.vno-writer-body` | W05 | Xuất hiện trong thân văn bản Doc | Enter tạo đoạn mới an toàn (số đoạn: 6) | **PASS** |
| 06 | Đóng hộp thoại In bằng nút Hủy | `div.vno-writer-body` -> `div.vno-writer-body` | W06 | Xuất hiện trong thân văn bản Doc | Enter tạo đoạn mới an toàn (số đoạn: 7) | **PASS** |
| 07 | Đóng hộp thoại Giới thiệu bằng Escape | `div.vno-writer-body` -> `div.vno-writer-body` | W07 | Xuất hiện trong thân văn bản Doc | Enter tạo đoạn mới an toàn (số đoạn: 8) | **PASS** |
| 08 | Đóng hộp thoại Giới thiệu bằng nút Đóng | `div.vno-writer-body` -> `div.vno-writer-body` | W08 | Xuất hiện trong thân văn bản Doc | Enter tạo đoạn mới an toàn (số đoạn: 9) | **PASS** |
| 09 | Mở Menu Tệp (Alt+F) rồi đóng bằng Escape | `div.vno-writer-body` -> `div.vno-writer-body` | W09 | Xuất hiện trong thân văn bản Doc | Enter tạo đoạn mới an toàn (số đoạn: 10) | **PASS** |
| 10 | Mở Menu Tệp rồi đóng bằng nút Quay lại | `div.vno-writer-body` -> `div.vno-writer-body` | W10 | Xuất hiện trong thân văn bản Doc | Enter tạo đoạn mới an toàn (số đoạn: 11) | **PASS** |
| 11 | Bấm nút Ribbon In đậm (Bold) | `div.vno-writer-body` -> `div.vno-writer-body` | W11 | Xuất hiện trong thân văn bản Doc | Enter tạo đoạn mới an toàn (số đoạn: 12) | **PASS** |
| 12 | Bấm nút Ribbon In nghiêng (Italic) | `div.vno-writer-body` -> `div.vno-writer-body` | W12 | Xuất hiện trong thân văn bản Doc | Enter tạo đoạn mới an toàn (số đoạn: 13) | **PASS** |
| 13 | Bấm nút Ribbon Gạch chân (Underline) | `div.vno-writer-body` -> `div.vno-writer-body` | W13 | Xuất hiện trong thân văn bản Doc | Enter tạo đoạn mới an toàn (số đoạn: 14) | **PASS** |
| 14 | Bấm nút Ribbon Căn giữa (Align Center) | `div.vno-writer-body` -> `div.vno-writer-body` | W14 | Xuất hiện trong thân văn bản Doc | Enter tạo đoạn mới an toàn (số đoạn: 15) | **PASS** |
| 15 | Bấm nút Ribbon Căn trái (Align Left) | `div.vno-writer-body` -> `div.vno-writer-body` | W15 | Xuất hiện trong thân văn bản Doc | Enter tạo đoạn mới an toàn (số đoạn: 16) | **PASS** |
| 16 | Bấm nút Ribbon Căn phải (Align Right) | `div.vno-writer-body` -> `div.vno-writer-body` | W16 | Xuất hiện trong thân văn bản Doc | Enter tạo đoạn mới an toàn (số đoạn: 17) | **PASS** |
| 17 | Bấm nút Ribbon Tăng cỡ chữ (Font Grow) | `div.vno-writer-body` -> `div.vno-writer-body` | W17 | Xuất hiện trong thân văn bản Doc | Enter tạo đoạn mới an toàn (số đoạn: 18) | **PASS** |
| 18 | Đổi tab Ribbon sang Chèn rồi về Trang đầu | `div.vno-writer-body` -> `div.vno-writer-body` | W18 | Xuất hiện trong thân văn bản Doc | Enter tạo đoạn mới an toàn (số đoạn: 19) | **PASS** |
| 19 | Thu phóng Zoom In rồi khôi phục 100% | `div.vno-writer-body` -> `div.vno-writer-body` | W19 | Xuất hiện trong thân văn bản Doc | Enter tạo đoạn mới an toàn (số đoạn: 20) | **PASS** |
| 20 | Chuyển sang cửa sổ khác rồi quay lại (bringToFront) | `div.vno-writer-body` -> `div.vno-writer-body` | W20 | Xuất hiện trong thân văn bản Doc | Enter tạo đoạn mới an toàn (số đoạn: 21) | **PASS** |

### 2.2. 3T Sheet (Bảng tính) — 20 Tình huống Thực tế

| # | Tình huống đo kiểm | ActiveElement Trước -> Sau | Ký tự đã gõ | Kết quả gõ vào Editor | Hành vi phím Enter | Trạng thái |
|---|--------------------|----------------------------|-------------|-----------------------|-------------------|------------|
| 01 | Đóng Tìm kiếm bằng phím Escape | `div.vno-sheet-container` -> `textarea.vno-formula-input` | S01 | Xuất hiện tại ô Sheet (A1) | Enter chuyển xuống ô dưới an toàn (hàng: 2) | **PASS** |
| 02 | Đóng Thay thế bằng nút Đóng 'x' | `div.vno-sheet-container` -> `textarea.vno-formula-input` | S02 | Xuất hiện tại ô Sheet (A2) | Enter chuyển xuống ô dưới an toàn (hàng: 3) | **PASS** |
| 03 | Đóng Tìm kiếm bằng nút Đóng ở footer | `div.vno-sheet-container` -> `textarea.vno-formula-input` | S03 | Xuất hiện tại ô Sheet (A3) | Enter chuyển xuống ô dưới an toàn (hàng: 4) | **PASS** |
| 04 | Đóng hộp thoại In bằng phím Escape | `div.vno-sheet-container` -> `textarea.vno-formula-input` | S04 | Xuất hiện tại ô Sheet (A4) | Enter chuyển xuống ô dưới an toàn (hàng: 5) | **PASS** |
| 05 | Đóng hộp thoại In bằng nút Đóng '×' | `div.vno-sheet-container` -> `textarea.vno-formula-input` | S05 | Xuất hiện tại ô Sheet (A5) | Enter chuyển xuống ô dưới an toàn (hàng: 6) | **PASS** |
| 06 | Đóng hộp thoại In bằng nút Hủy | `div.vno-sheet-container` -> `textarea.vno-formula-input` | S06 | Xuất hiện tại ô Sheet (A6) | Enter chuyển xuống ô dưới an toàn (hàng: 7) | **PASS** |
| 07 | Đóng hộp thoại Giới thiệu bằng Escape | `div.vno-sheet-container` -> `textarea.vno-formula-input` | S07 | Xuất hiện tại ô Sheet (A7) | Enter chuyển xuống ô dưới an toàn (hàng: 8) | **PASS** |
| 08 | Đóng hộp thoại Giới thiệu bằng nút Đóng | `div.vno-sheet-container` -> `textarea.vno-formula-input` | S08 | Xuất hiện tại ô Sheet (A8) | Enter chuyển xuống ô dưới an toàn (hàng: 9) | **PASS** |
| 09 | Mở Menu Tệp (Alt+F) rồi đóng bằng Escape | `div.vno-sheet-container` -> `textarea.vno-formula-input` | S09 | Xuất hiện tại ô Sheet (A9) | Enter chuyển xuống ô dưới an toàn (hàng: 10) | **PASS** |
| 10 | Mở Menu Tệp rồi đóng bằng nút Quay lại | `div.vno-sheet-container` -> `textarea.vno-formula-input` | S10 | Xuất hiện tại ô Sheet (A10) | Enter chuyển xuống ô dưới an toàn (hàng: 11) | **PASS** |
| 11 | Bấm nút Ribbon In đậm (Bold) | `div.vno-sheet-container` -> `textarea.vno-formula-input` | S11 | Xuất hiện tại ô Sheet (A11) | Enter chuyển xuống ô dưới an toàn (hàng: 12) | **PASS** |
| 12 | Bấm nút Ribbon In nghiêng (Italic) | `div.vno-sheet-container` -> `textarea.vno-formula-input` | S12 | Xuất hiện tại ô Sheet (A12) | Enter chuyển xuống ô dưới an toàn (hàng: 13) | **PASS** |
| 13 | Bấm nút Ribbon Căn giữa (Align Center) | `div.vno-sheet-container` -> `textarea.vno-formula-input` | S13 | Xuất hiện tại ô Sheet (A13) | Enter chuyển xuống ô dưới an toàn (hàng: 14) | **PASS** |
| 14 | Bấm nút Ribbon Căn trái (Align Left) | `div.vno-sheet-container` -> `textarea.vno-formula-input` | S14 | Xuất hiện tại ô Sheet (A14) | Enter chuyển xuống ô dưới an toàn (hàng: 15) | **PASS** |
| 15 | Bấm nút Ribbon Định dạng tiền tệ VND | `div.vno-sheet-container` -> `textarea.vno-formula-input` | S15 | Xuất hiện tại ô Sheet (A15) | Enter chuyển xuống ô dưới an toàn (hàng: 16) | **PASS** |
| 16 | Bấm nút Ribbon Định dạng phần trăm (%) | `div.vno-sheet-container` -> `textarea.vno-formula-input` | S16 | Xuất hiện tại ô Sheet (A16) | Enter chuyển xuống ô dưới an toàn (hàng: 17) | **PASS** |
| 17 | Đổi tab Ribbon sang Chèn rồi về Trang đầu | `div.vno-sheet-container` -> `textarea.vno-formula-input` | S17 | Xuất hiện tại ô Sheet (A17) | Enter chuyển xuống ô dưới an toàn (hàng: 18) | **PASS** |
| 18 | Đổi tab Ribbon sang Công thức rồi về Trang đầu | `div.vno-sheet-container` -> `textarea.vno-formula-input` | S18 | Xuất hiện tại ô Sheet (A18) | Enter chuyển xuống ô dưới an toàn (hàng: 19) | **PASS** |
| 19 | Thu phóng Zoom In rồi khôi phục 100% | `div.vno-sheet-container` -> `textarea.vno-formula-input` | S19 | Xuất hiện tại ô Sheet (A19) | Enter chuyển xuống ô dưới an toàn (hàng: 20) | **PASS** |
| 20 | Chuyển sang cửa sổ khác rồi quay lại (bringToFront) | `div.vno-sheet-container` -> `textarea.vno-formula-input` | S20 | Xuất hiện tại ô Sheet (A20) | Enter chuyển xuống ô dưới an toàn (hàng: 21) | **PASS** |

### 2.3. 3T Slide (Trình chiếu) — 20 Tình huống Thực tế

| # | Tình huống đo kiểm | ActiveElement Trước -> Sau | Ký tự đã gõ | Kết quả gõ vào Editor | Hành vi phím Enter | Trạng thái |
|---|--------------------|----------------------------|-------------|-----------------------|-------------------|------------|
| 01 | Sửa Tiêu đề: Đóng Tìm kiếm bằng Escape | `div.vno-slide-title.is-selected` -> `div.vno-slide-title.is-selected` | S01 | Xuất hiện trong Tiêu đề Slide | Enter an toàn, không kích hoạt lệnh ribbon | **PASS** |
| 02 | Sửa Tiêu đề: Đóng Thay thế bằng nút Đóng 'x' | `div.vno-slide-title.is-selected` -> `div.vno-slide-title.is-selected` | S02 | Xuất hiện trong Tiêu đề Slide | Enter an toàn, không kích hoạt lệnh ribbon | **PASS** |
| 03 | Sửa Tiêu đề: Đóng Tìm kiếm bằng nút Đóng footer | `div.vno-slide-title.is-selected` -> `div.vno-slide-title.is-selected` | S03 | Xuất hiện trong Tiêu đề Slide | Enter an toàn, không kích hoạt lệnh ribbon | **PASS** |
| 04 | Sửa Tiêu đề: Đóng hộp thoại In bằng Escape | `div.vno-slide-title.is-selected` -> `div.vno-slide-title.is-selected` | S04 | Xuất hiện trong Tiêu đề Slide | Enter an toàn, không kích hoạt lệnh ribbon | **PASS** |
| 05 | Sửa Tiêu đề: Đóng hộp thoại In bằng nút Đóng '×' | `div.vno-slide-title.is-selected` -> `div.vno-slide-title.is-selected` | S05 | Xuất hiện trong Tiêu đề Slide | Enter an toàn, không kích hoạt lệnh ribbon | **PASS** |
| 06 | Sửa Tiêu đề: Đóng hộp thoại In bằng nút Hủy | `div.vno-slide-title.is-selected` -> `div.vno-slide-title.is-selected` | S06 | Xuất hiện trong Tiêu đề Slide | Enter an toàn, không kích hoạt lệnh ribbon | **PASS** |
| 07 | Sửa Tiêu đề: Đóng hộp thoại Giới thiệu bằng Escape | `div.vno-slide-title.is-selected` -> `div.vno-slide-title.is-selected` | S07 | Xuất hiện trong Tiêu đề Slide | Enter an toàn, không kích hoạt lệnh ribbon | **PASS** |
| 08 | Sửa Tiêu đề: Đóng hộp thoại Giới thiệu bằng nút Đóng | `div.vno-slide-title.is-selected` -> `div.vno-slide-title.is-selected` | S08 | Xuất hiện trong Tiêu đề Slide | Enter an toàn, không kích hoạt lệnh ribbon | **PASS** |
| 09 | Sửa Tiêu đề: Mở Menu Tệp (Alt+F) rồi đóng bằng Escape | `div.vno-slide-title.is-selected` -> `div.vno-slide-title.is-selected` | S09 | Xuất hiện trong Tiêu đề Slide | Enter an toàn, không kích hoạt lệnh ribbon | **PASS** |
| 10 | Sửa Tiêu đề: Mở Menu Tệp rồi đóng bằng nút Quay lại | `div.vno-slide-title.is-selected` -> `div.vno-slide-title.is-selected` | S10 | Xuất hiện trong Tiêu đề Slide | Enter an toàn, không kích hoạt lệnh ribbon | **PASS** |
| 11 | Sửa Tiêu đề: Bấm nút Ribbon In đậm (Bold) | `div.vno-slide-title.is-selected` -> `div.vno-slide-title.is-selected` | S11 | Xuất hiện trong Tiêu đề Slide | Enter an toàn, không kích hoạt lệnh ribbon | **PASS** |
| 12 | Sửa Tiêu đề: Bấm nút Ribbon In nghiêng (Italic) | `div.vno-slide-title.is-selected` -> `div.vno-slide-title.is-selected` | S12 | Xuất hiện trong Tiêu đề Slide | Enter an toàn, không kích hoạt lệnh ribbon | **PASS** |
| 13 | Sửa Tiêu đề: Bấm nút Ribbon Căn giữa (Align Center) | `div.vno-slide-title.is-selected` -> `div.vno-slide-title.is-selected` | S13 | Xuất hiện trong Tiêu đề Slide | Enter an toàn, không kích hoạt lệnh ribbon | **PASS** |
| 14 | Sửa Thân slide: Bấm nút Ribbon Căn trái (Align Left) | `div.vno-slide-body.is-selected` -> `div.vno-slide-body.is-selected` | S14 | Xuất hiện trong Thân Slide | Enter an toàn, không kích hoạt lệnh ribbon | **PASS** |
| 15 | Chọn Canvas: Bấm nút Ribbon Thêm trang chiếu mới | `div.vno-slide-title.is-selected` -> `div.vno-slide-title.is-selected` | S15 | Phím không bị nút ribbon nuốt, tiêu điểm ở canvas/slide | Enter an toàn, không kích hoạt lệnh ribbon | **PASS** |
| 16 | Chọn Canvas: Đổi tab sang Thiết kế rồi về Trang đầu | `div.vno-slide-title.is-selected` -> `div.vno-slide-title.is-selected` | S16 | Phím không bị nút ribbon nuốt, tiêu điểm ở canvas/slide | Enter an toàn, không kích hoạt lệnh ribbon | **PASS** |
| 17 | Chọn Canvas: Đổi tab sang Trình chiếu rồi về Trang đầu | `div.vno-slide-title.is-selected` -> `div.vno-slide-title.is-selected` | S17 | Phím không bị nút ribbon nuốt, tiêu điểm ở canvas/slide | Enter an toàn, không kích hoạt lệnh ribbon | **PASS** |
| 18 | Chọn Canvas: Thu phóng Zoom In rồi khôi phục 100% | `div.vno-slide-title.is-selected` -> `div.vno-slide-title.is-selected` | S18 | Phím không bị nút ribbon nuốt, tiêu điểm ở canvas/slide | Enter an toàn, không kích hoạt lệnh ribbon | **PASS** |
| 19 | Chọn Canvas: Mở Menu Tệp rồi đóng bằng Escape | `div.vno-slide-title.is-selected` -> `div.vno-slide-title.is-selected` | S19 | Phím không bị nút ribbon nuốt, tiêu điểm ở canvas/slide | Enter an toàn, không kích hoạt lệnh ribbon | **PASS** |
| 20 | Chuyển sang cửa sổ khác rồi quay lại (bringToFront) | `div.vno-slide-title.is-selected` -> `div.vno-slide-title.is-selected` | S20 | Phím không bị nút ribbon nuốt, tiêu điểm ở canvas/slide | Enter an toàn, không kích hoạt lệnh ribbon | **PASS** |

---

## 3. Nội dung Hướng dẫn Sử dụng Tiếng Việt (Help in-app)

Đã bổ sung bài viết trợ giúp chính thức `common.platform.keepFocusHelp` trong hệ thống Trợ giúp 3T Office (`platform/help/entries-retro-platform.js`):

- **Tiêu đề:** Giữ bàn phím và Tiêu điểm trong vùng soạn thảo (Keep Focus)
- **Nội dung:**
  - Hướng dẫn người dùng về tính năng giữ tiêu điểm tự động khi làm việc trên cả 3 ứng dụng: **Doc**, **Sheet**, và **Slide**.
  - Người dùng có thể tiếp tục gõ văn bản ngay sau khi đóng hộp thoại (phím Esc, nút Đóng ×, nút Hủy, nút Đồng ý), sau khi click các nút công cụ hoặc chuyển tab trên thanh Ribbon, sau khi đóng Menu Tệp (Backstage), hoặc sau khi chuyển đổi qua lại giữa các cửa sổ ứng dụng khác.
  - Phím Enter được bảo vệ tự động: bấm Enter không kích hoạt nhầm bất kỳ nút nào trên Ribbon hay thanh công cụ ngoài vùng soạn thảo, đảm bảo tạo đoạn mới an toàn trong Doc và di chuyển xuống ô dưới trong Sheet.

---

## 4. Tổng kết Nghiệm thu Tiêu chí

- **Đo thật trên app Desktop:** Đạt **60/60 PASS (100%)**, 0 FAIL.
- **Tầng dùng chung:** Hoàn toàn nằm ở Shared Platform (`platform/shell/focus-manager.js`), không sao chép mã nguồn riêng lẻ.
- **Kiểm thử đơn vị:** Đạt **2503/2503 PASS | 0 FAIL** (Suite 227).
- **Hồi quy Desktop:** Giữ vững 26 PASS / 1 FAIL (giờ 13:45; không tăng thêm lỗi).
- **Dọn dẹp tiến trình:** Đóng sạch mọi tiến trình con Python và WebView2 theo đúng PID của phiên kiểm thử.
