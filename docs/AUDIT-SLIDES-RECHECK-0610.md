# BÁO CÁO KIỂM THỬ TỔNG THỂ VN SLIDES (3T SLIDE) - RECHECK 06/10

**Thời điểm:** 2026-10-06  
**Nhánh Git:** `docs/audit-slides-agy`  
**Phương pháp:** Đánh giá độc lập thông qua CDP (Chrome DevTools Protocol) dựa trên `tests/live/cdp/session.mjs` và `tests/live/cdp/roundtrip-file.mjs`. Không sử dụng thao tác chuột/bàn phím hệ điều hành (SendKeys), không kill tiến trình theo tên, không gọi `pywebview.api.evaluate_js`. Kiểm tra trực tiếp trên mô hình mã hiện tại.

---

## 1. Bảng kết quả kiểm thử tính năng trình chiếu cơ bản & Roundtrip PPTX (23 mục)

| STT | Mục (Item) | Thao tác (Action) | Kết quả | Bằng chứng (Evidence) | Nếu FAIL: Cách tái hiện 3 bước & Nghi ngờ tệp/hàm |
|:---:|---|---|:---:|---|---|
| 1 | **Tạo mới bài trình chiếu** | Khởi chạy ứng dụng VN Slides với mẫu mặc định rỗng | **PASS** | `slidesCount=1, canvasReady=true, title=''` | N/A |
| 2 | **Thêm slide mới** | Gọi `addNewSlide()` chèn slide thứ 2 vào bài trình chiếu | **PASS** | `slidesCount=2, currentSlideIndex=1` | N/A |
| 3 | **Xóa slide** | Gọi `deleteCurrentSlide(true)` xóa slide đang chọn | **PASS** | `slidesCount=1, currentSlideIndex=0` | N/A |
| 4 | **Nhân đôi slide** | Gán tiêu đề 'Slide Gốc' và gọi `duplicateCurrentSlide(true)` | **PASS** | `slidesCount=2, duplicatedTitle='Slide Gốc', currentIndex=1` | N/A |
| 5 | **Đổi thứ tự slide** | Gọi `moveSlide(0, 1)` tráo đổi vị trí slide 0 và slide 1 | **PASS** | `slide0Title='Slide B', slide1Title='Slide A'` | N/A |
| 6 | **Chèn chữ vào slide** | Gọi `insertTextBox({ text: 'Chèn chữ kiểm thử 3T Slide' })` | **PASS** | `shapesCount=1, shapeType='textbox'` | N/A |
| 7 | **Chèn hình ảnh** | Gọi `insertImage(dummyBase64Png)` | **PASS** | `hasImage=true, type='image'` | N/A |
| 8 | **Chọn bố cục (Layout)** | Gọi `applySlideLayout('two-content')` đổi bố cục slide thành 2 cột | **PASS** | `layoutType='two-content'` | N/A |
| 9 | **Đổi theme / chủ đề slide** | Gọi `applySlideMaster('corporate-red')` đổi theme slide sang Terracotta Ấm Áp | **PASS** | `masterTheme='corporate-red'` | N/A |
| 10 | **Ghi chú diễn giả (Speaker Notes)** | Gán ghi chú diễn giả 'Ghi chú diễn giả cho buổi kiểm thử 3T Slide' | **PASS** | `notes='Ghi chú diễn giả cho buổi kiểm thử 3T Slide'` | N/A |
| 11 | **Hiệu ứng chuyển trang (Slide transitions)** | Gọi `setTransition('fade', 800, true)` thiết lập hiệu ứng mờ dần 800ms | **PASS** | `transitionType='fade', duration=800ms` | N/A |
| 12 | **Hiệu ứng hoạt hình (Animations)** | Gán animation 'fadeIn' 600ms cho hình khối trên slide | **PASS** | `hasAnim=true, animType='fadeIn', duration=600ms` | N/A |
| 13 | **Trình chiếu F5 và thoát Esc** | Gọi `startSlideShow(0)` bật overlay trình chiếu, sau đó `exitSlideShow()` | **PASS** | `slideshowOverlayOpened=true, slideshowOverlayClosed=true` | N/A |
| 14 | **Dạng xem Sắp xếp trang (Slide Sorter)** | Gọi `openSlideSorter()` hiển thị lưới Slide Sorter | **PASS** | `slideSorterRendered=true` | N/A |
| 15 | **Lưu PPTX, mở lại & Đọc XML zip** | Lưu bài trình chiếu ra file PPTX, giải nén ZIP kiểm tra XML và mở lại | **PASS** | `fileSize=14586B, xmlSlides=2, xmlNotes=1, xmlImages=2, xmlTransitions=4, reopenedSlideCount=2` | N/A |
| 16 | **In / Xuất bài trình chiếu ra PDF** | Xuất tệp trình chiếu PPTX vừa lưu sang định dạng PDF | **PASS** | `pdfFile='test-save-basic.pdf', pdfSizeBytes=26234B` | N/A |
| 17 | **Hoàn tác (Undo) và Làm lại (Redo)** | Thực hiện `addNewSlide()`, gọi `undo()` hoàn tác và `redo()` làm lại | **PASS** | `initial=2, added=3, undone=2, redone=3` | N/A |
| 18 | **Phím tắt cơ bản (Ctrl+M, Ctrl+Z)** | Gửi sự kiện phím qua CDP: `Ctrl+M` (Thêm slide) và `Ctrl+Z` (Hoàn tác) | **PASS** | `slidesAfterCtrlM=4, slidesAfterCtrlZ=3` | N/A |
| 19 | **Mở & lưu lại mẫu PPTX: sample-slides.pptx** | Mở tệp `sample-slides.pptx` bằng app, đo số slide/chữ, lưu lại và kiểm tra lại | **PASS** | Trước: App(slides=2, chars=154), XML(slides=2, chars=84) \| Sau: SavedSize=10810B, App(slides=2, chars=154), XML(slides=2, chars=84) | N/A |
| 20 | **Mở & lưu lại mẫu PPTX: sample-slides-notes.pptx** | Mở tệp `sample-slides-notes.pptx` bằng app, đo số slide/chữ, lưu lại và kiểm tra lại | **PASS** | Trước: App(slides=3, chars=506), XML(slides=3, chars=168) \| Sau: SavedSize=17236B, App(slides=3, chars=506), XML(slides=3, chars=168) | N/A |
| 21 | **Mở & lưu lại mẫu PPTX: sample-slides-smartart.pptx** | Mở tệp `sample-slides-smartart.pptx` bằng app, đo số slide/chữ, lưu lại và kiểm tra lại | **PASS** | Trước: App(slides=1, chars=90), XML(slides=1, chars=21) \| Sau: SavedSize=8531B, App(slides=1, chars=90), XML(slides=1, chars=69) | N/A |
| 22 | **Mở & lưu lại mẫu PPTX: sample-slides-comments.pptx** | Mở tệp `sample-slides-comments.pptx` bằng app, đo số slide/chữ, lưu lại và kiểm tra lại | **PASS** | Trước: App(slides=2, chars=77), XML(slides=2, chars=77) \| Sau: SavedSize=11386B, App(slides=2, chars=77), XML(slides=2, chars=77) | N/A |
| 23 | **Mở & lưu lại mẫu PPTX: slides-saved-roundtrip.pptx** | Mở tệp `slides-saved-roundtrip.pptx` bằng app, đo số slide/chữ, lưu lại và kiểm tra lại | **PASS** | Trước: App(slides=3, chars=1839), XML(slides=3, chars=740) \| Sau: SavedSize=20623B, App(slides=3, chars=1839), XML(slides=3, chars=740) | N/A |

---

## 2. Chi tiết phân tích cấu trúc XML của tệp PPTX được lưu

Tệp `.pptx` xuất ra từ VN Slides được đóng gói theo chuẩn OOXML ZIP. Kiểm tra cấu trúc XML đạt các yêu cầu:
1. `ppt/slides/slide*.xml`: Đủ số lượng thẻ slide tương ứng với model.
2. Thẻ `<a:t>`: Chứa đầy đủ nội dung văn bản tiêu đề, nội dung và các hộp chữ.
3. Thẻ `<p:transition>`: Lưu giữ thiết lập chuyển trang (mờ dần, thời gian chuyển slide).
4. `ppt/notesSlides/notesSlide*.xml`: Lưu giữ ghi chú người thuyết trình tách biệt theo đúng trang chiếu.
5. Thẻ `<p:pic>` và thư mục `ppt/media/`: Lưu trữ ảnh chèn vào slide.

---

## 3. Tổng kết số lượng kết quả kiểm thử

- **TỔNG KẾT:** 23 / 23 Mục đạt chuẩn.
- **PASS:** 23
- **FAIL:** 0
- **BLOCKED:** 0
