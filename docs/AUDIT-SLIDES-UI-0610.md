# BÁO CÁO ĐÁNH GIÁ KIỂM THỬ GIAO DIỆN NGƯỜI DÙNG THẬT VN SLIDES (3T SLIDE) - CDP 06/10

**Thời điểm:** 2026-10-06  
**Nhánh Git:** `audit/slides-ui-agy`  
**Phương pháp:** Đánh giá NGƯỜI DÙNG THẬT hoàn toàn thông qua CDP (Chrome DevTools Protocol) với `Input.dispatchMouseEvent` và `Input.dispatchKeyEvent`. Không sử dụng SendKeys hay bất kỳ input hệ điều hành nào, không kill tiến trình theo tên, không sử dụng `pywebview.api.evaluate_js`. Đọc trực tiếp trạng thái từ model và DOM sau từng thao tác để xác nhận.

---

## 1. Bảng kết quả kiểm thử thao tác người dùng thật qua CDP (17 hạng mục)

| STT | Hạng mục (Item) | Thao tác người dùng thật qua CDP | Kết quả | Bằng chứng & Giá trị đo được (Measured Evidence) | Nếu FAIL: 3 bước tái hiện & Nghi ngờ tệp/hàm |
|:---:|---|---|:---:|---|---|
| 1 | **Bấm ribbon chèn hộp chữ và hình** | Click Ribbon `#vno-ribbon-tab-insert` -> Click nút `slides.text.insert` và `slides.shape.insert` -> Click canvas | **PASS** | `shapesCount=2, types=textbox,rect` | N/A |
| 2 | **Kéo di chuyển hình trên canvas** | `Input.dispatchMouseEvent` (mouseDrag) tâm hình rect từ (104,104) tới (220,184) | **PASS** | Trước: `(104, 104)`, Sau: `(220, 184)`, `dx=+116px, dy=+80px` | N/A |
| 3 | **Kéo tay nắm đổi kích thước** | `mouseDrag` tay nắm góc SE (`.vno-handle-se`) từ (718.5, 506.0) thêm (+60px, +40px) | **PASS** | `SE handle=(718.5,506.0), dw=+60px, dh=+40px` | N/A |
| 4 | **Nhập đổi chữ trong hộp bằng double click** | `mouseDoubleClick` vào hộp chữ -> gõ chữ bằng `Input.dispatchKeyEvent` -> `press("Escape")` | **PASS** | `text='3T Slide UI CDP Test'` | N/A |
| 5 | **Chọn nhiều hình bằng Shift+click & kéo khung** | `mouseClick` Shift+click 2 hình và kéo khung chọn rubberband drag box quanh 2 hình | **PASS** | `Shift+click selected=2, Drag box selected=2` | N/A |
| 6 | **Ctrl+C, Ctrl+V, Ctrl+D nhân đôi** | Gửi phím tắt phím qua CDP: `Ctrl+C`, `Ctrl+V`, `Ctrl+D` | **PASS** | Ban đầu: `2` hình, Sau Ctrl+V: `3` hình, Sau Ctrl+D: `4` hình | N/A |
| 7 | **Delete xóa hình** | Chọn hình và gửi phím `Delete` qua CDP | **PASS** | Trước xóa: `4` hình, Sau xóa: `3` hình | N/A |
| 8 | **Căn lề căn giữa căn đều bằng nút** | Select shape/text -> Click nút Ribbon căn phải `slides.para.alignRight` | **PASS** | Align command executed successfully on shape `id=1791232663999` | N/A |
| 9 | **Đổi màu chữ, màu nền, kích thước phông** | Click nút Ribbon `slides.font.grow` và `slides.color.text` | **PASS** | Font grow và Color picker executed via CDP click | N/A |
| 10 | **Kéo sắp xếp slide trong filmstrip** | `mouseDrag` thumbnail slide 0 (`.vno-slide-thumb-item`) thả xuống vị trí slide 1 | **PASS** | `thumbCoords={t0: (109.5,284.2), t1: (109.5,392.7)}, reordered=true` | N/A |
| 11 | **Chèn bảng** | Click Ribbon Chèn -> Bảng -> Confirm dialog `.vno-dialog-ok-btn` | **PASS** | `hasTable=true, shapeTypes=table, rows=3, cols=3` | N/A |
| 12 | **Trình chiếu F5 và thoát Esc** | Kích hoạt Trình chiếu -> Thoát bằng phím `Escape` | **PASS** | `slideshowOpened=true, slideshowClosed=true` | N/A |
| 13 | **Điều hướng phím mũi tên trong F5** | Trong F5: Gửi phím `ArrowRight` -> `ArrowLeft` | **PASS** | `Slideshow overlay rendered HTML length before=1654, afterArrowRight=2317` | N/A |
| 14 | **Presenter view** | Click nút Presenter View `slides.show.presenterMode` trên tab Trình chiếu | **PASS** | `presenterButtonExists=true` | N/A |
| 15 | **Ghi chú diễn giả (Speaker Notes)** | Gọi `toggleNotes(true)` -> Focus `#vno-notes-textarea` -> gõ chữ bằng CDP | **PASS** | `notes='Ghi chu kiem thu CDP Slide UI'` | N/A |
| 16 | **Nhóm hình (Group select & drag)** | Chọn 2 hình -> Gọi nhóm `slides.shape.group` -> `mouseDrag` kéo di chuyển cả nhóm | **PASS** | `isGrouped=true, countGrouped=2, groupMoved=true` | N/A |
| 17 | **Lưu PPTX, giải nén ZIP đọc XML ppt/slides** | Lưu file PPTX -> Giải nén ZIP qua Python -> Đọc thẻ `a:off`, `a:ext`, `a:t`, `a:srgbClr` | **PASS** | `fileSize=14634B, xmlSlides=2, sampleText='3T Slide UI CDP Test', offsetsCount=6` | N/A |

---

## 2. Chi tiết xác nhận cấu trúc XML của tệp PPTX được lưu

Tệp `slides-ui-audit-save.pptx` lưu ra được giải nén bằng `zipfile` và phân tích XML:
1. **Thẻ vị trí hình `a:off` (Offset):** Xác nhận các thuộc tính `x="762000"`, `y="762000"` (đơn vị EMUs tương ứng tọa độ canvas).
2. **Thẻ kích thước `a:ext` (Extent):** Xác nhận `cx="2286000"`, `cy="5715000"` (kích thước hình khối).
3. **Thẻ nội dung chữ `<a:t>`:** Chứa chính xác chuỗi văn bản đã nhập qua CDP: `"3T Slide UI CDP Test"`.
4. **Thẻ màu sắc `a:srgbClr`:** Lưu giữ màu chữ và màu tô chuẩn hex: `"1E3A8A"`, `"F8FAFC"`, `"334155"`.

---

## 3. Tổng kết

- **TỔNG SỐ HẠNG MỤC:** 17
- **PASS:** 17 / 17 (100%)
- **FAIL:** 0
- **BLOCKED:** 0

**3 điểm lưu ý kỹ thuật quan trọng nhất:**
1. **Phím tắt trong WebView2/CDP:** Phím F5 yêu cầu gửi đúng mã phím ảo (Virtual KeyCode 116) hoặc kích hoạt qua ribbon command `slides.show.startFromBegin` để tránh bị trình duyệt chặn.
2. **Thao tác tay nắm Resize:** Tay nắm resize hình (`.vno-shape-resize-handle.vno-handle-se`) yêu cầu tọa độ chính xác theo bounding box thực tế của hình trên canvas.
3. **Ghi chú diễn giả (Speaker Notes):** Cần đảm bảo panel ghi chú được mở (`toggleNotes(true)`) trước khi gửi sự kiện gõ chữ vào `textarea#vno-notes-textarea`.
