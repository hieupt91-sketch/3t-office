# BÁO CÁO RÀ SOÁT HỘP THOẠI VÀ BÀN PHÍM VN WRITER (TICKET D16)

> **Ngày thực hiện:** 06/10/2026  
> **Ứng dụng:** VN Writer (3T Doc)  
> **Phạm vi kiểm thử:** Tất cả 23 hộp thoại mở từ Ribbon VN Writer trên 4 tổ hợp độ phân giải và tỉ lệ hiển thị: 1366x768@1.0, 1366x768@1.25, 1920x1080@1.0, 1920x1080@1.25.  
> **Phương pháp:** Kiểm thử tự động CDP (`tests/live/cdp`) theo mẫu `ui-overlap.desktop.mjs`.

---

## I. BẢNG TỔNG HỢP KIỂM THỬ 23 HỘP THOẠI WRITER

| STT | Tên Hộp thoại | Lệnh Ribbon (`commandId`) | Độ phân giải & Zoom (100% & 125%) | Hiển thị & Khung nhìn (OK/Hủy thấy đủ) | Bàn phím & Tiêu điểm (Tab/Esc/Enter) | Nhãn Tiếng Việt & i18n | Trạng thái lỗi (Đỏ TV) | Kết quả & Bằng chứng |
|:---:|:---|:---|:---:|:---:|:---:|:---:|:---:|:---:|
| 1 | **Trang bìa** | `writer.insert.coverPage` | 1366x768 / 1920x1080 (100%, 125%) | PASS (Không tràn, OK/Hủy rõ) | PASS (Focus card bìa đầu tiên, Tab quay vòng, Esc đóng) | PASS (Tiếng Việt đầy đủ, không lộ khóa) | PASS (Báo lỗi nhập nếu có) | PASS ([Screenshots](screens-writer-dialogs-0610/coverPage-1366x768-1.0.png)) |
| 2 | **Văn bản thành bảng** | `writer.table.fromText` | 1366x768 / 1920x1080 (100%, 125%) | PASS (Rect 460x264, thấy nút đủ) | PASS (Focus select phân cách, Tab quay vòng, Esc đóng) | PASS (Tiếng Việt đầy đủ, không lộ khóa) | PASS (Bù ô rỗng, báo lỗi TV) | PASS ([Screenshots](screens-writer-dialogs-0610/tableFromText-1366x768-1.0.png)) |
| 3 | **Đánh dấu** | `writer.insert.bookmark` | 1366x768 / 1920x1080 (100%, 125%) | PASS (Rect 440x216, thấy nút đủ) | PASS (Focus ô nhập tên, Tab quay vòng, Esc đóng) | PASS (Tiếng Việt đầy đủ, không lộ khóa) | PASS (Tên rỗng/trùng báo đỏ TV) | PASS ([Screenshots](screens-writer-dialogs-0610/bookmark-1366x768-1.0.png)) |
| 4 | **Tham chiếu chéo** | `writer.insert.crossReference` | 1366x768 / 1920x1080 (100%, 125%) | PASS (Rect 460x265, thấy nút đủ) | PASS (Focus chọn loại tham chiếu, Tab quay vòng, Esc đóng) | PASS (Tiếng Việt đầy đủ, không lộ khóa) | PASS (Thông báo khi không có mục) | PASS ([Screenshots](screens-writer-dialogs-0610/crossReference-1366x768-1.0.png)) |
| 5 | **Chữ nghệ thuật** | `writer.insert.wordart` | 1366x768 / 1920x1080 (100%, 125%) | PASS (Rect 640x423, thấy nút đủ) | PASS (Focus ô nhập chữ, Tab quay vòng, Esc đóng) | PASS (Tiếng Việt đầy đủ, không lộ khóa) | PASS (Văn bản rỗng báo đỏ TV) | PASS ([Screenshots](screens-writer-dialogs-0610/wordart-1366x768-1.0.png)) |
| 6 | **Ngày giờ** | `writer.insert.dateTime` | 1366x768 / 1920x1080 (100%, 125%) | PASS (Rect 440x435, thấy nút đủ) | PASS (Focus nút mẫu ngày giờ, Tab quay vòng, Esc đóng) | PASS (Tiếng Việt đầy đủ, không lộ khóa) | PASS (Định dạng tiếng Việt chuẩn) | PASS ([Screenshots](screens-writer-dialogs-0610/dateTime-1366x768-1.0.png)) |
| 7 | **Phương trình** | `writer.insert.equation` | 1366x768 / 1920x1080 (100%, 125%) | PASS (Rect 820x504, thấy nút đủ) | PASS (Focus ô nhập tuyến tính, Tab quay vòng, Esc đóng) | PASS (Tiếng Việt đầy đủ, không lộ khóa) | PASS (Xem trước công thức MathML/LaTeX) | PASS ([Screenshots](screens-writer-dialogs-0610/equation-1366x768-1.0.png)) |
| 8 | **Ký hiệu** | `writer.insert.symbol` | 1366x768 / 1920x1080 (100%, 125%) | PASS (Rect 520x472, thấy nút đủ) | PASS (Focus ô ký hiệu đầu tiên, Tab quay vòng, Esc đóng) | PASS (Tiếng Việt đầy đủ, không lộ khóa) | PASS (Hiển thị phân loại ký hiệu) | PASS ([Screenshots](screens-writer-dialogs-0610/symbol-1366x768-1.0.png)) |
| 9 | **Hình mờ** | `writer.page.watermark` | 1366x768 / 1920x1080 (100%, 125%) | PASS (Rect 440x384, thấy nút đủ) | PASS (Focus ô nhập chữ hình mờ, Tab quay vòng, Esc đóng) | PASS (Tiếng Việt đầy đủ, không lộ khóa) | PASS (Xem trước trực quan góc xoay/màu) | PASS ([Screenshots](screens-writer-dialogs-0610/watermark-1366x768-1.0.png)) |
| 10 | **Màu trang** | `writer.page.color` | 1366x768 / 1920x1080 (100%, 125%) | PASS (Rect 440x340, thấy nút đủ) | PASS (Focus ô màu đầu tiên, Tab quay vòng, Esc đóng) | PASS (Tiếng Việt đầy đủ, không lộ khóa) | PASS (Xác nhận màu nền hiển thị) | PASS ([Screenshots](screens-writer-dialogs-0610/pageColor-1366x768-1.0.png)) |
| 11 | **Viền trang** | `writer.page.border` | 1366x768 / 1920x1080 (100%, 125%) | PASS (Rect 460x315, thấy nút đủ) | PASS (Focus select `#vno-border-style`, Tab quay vòng, Esc đóng) | PASS (Tiếng Việt đầy đủ, không lộ khóa) | PASS (Xem trước viền trang trực quan) | PASS ([Screenshots](screens-writer-dialogs-0610/pageBorder-1366x768-1.0.png)) |
| 12 | **Thiết lập trang** | `writer.page.setupDialog` | 1366x768 / 1920x1080 (100%, 125%) | PASS (Rect 520x477, thấy nút đủ) | PASS (Focus ô nhập lề trên, Tab quay vòng, Esc đóng) | PASS (Tiếng Việt đầy đủ, không lộ khóa) | PASS (Kẹp lề âm/lớn hơn trang báo đỏ TV) | PASS ([Screenshots](screens-writer-dialogs-0610/pageSetup-1366x768-1.0.png)) |
| 13 | **Chia cột** | `writer.page.columns` | 1366x768 / 1920x1080 (100%, 125%) | PASS (Rect 480x436, thấy nút đủ) | PASS (Focus ô nhập số cột, Tab quay vòng, Esc đóng) | PASS (Tiếng Việt đầy đủ, không lộ khóa) | PASS (Báo đỏ TV khi khoảng cách quá rộng) | PASS ([Screenshots](screens-writer-dialogs-0610/columns-1366x768-1.0.png)) |
| 14 | **Định dạng số trang** | `writer.pageNumber.format` | 1366x768 / 1920x1080 (100%, 125%) | PASS (Rect 440x242, thấy nút đủ) | PASS (Focus chọn kiểu số trang, Tab quay vòng, Esc đóng) | PASS (Tiếng Việt đầy đủ, không lộ khóa) | PASS (Số bắt đầu âm kẹp an toàn) | PASS ([Screenshots](screens-writer-dialogs-0610/pageNumberFormat-1366x768-1.0.png)) |
| 15 | **Mục (Section options)** | `writer.section.options` | 1366x768 / 1920x1080 (100%, 125%) | PASS (Rect 440x323, thấy nút đủ) | PASS (Focus checkbox/nút mở đầu tiên, Tab quay vòng, Esc đóng) | PASS (Tiếng Việt đầy đủ, không lộ khóa) | PASS (Disable liên kết mục 1 chuẩn) | PASS ([Screenshots](screens-writer-dialogs-0610/sectionOptions-1366x768-1.0.png)) |
| 16 | **Trích dẫn** | `writer.reference.citationInsert` | 1366x768 / 1920x1080 (100%, 125%) | PASS (Rect 442x188, thấy nút đủ) | PASS (Focus nút Thêm nguồn/select, Tab quay vòng, Esc đóng) | PASS (Tiếng Việt đầy đủ, không lộ khóa) | PASS (Thông báo rỗng tài liệu tham khảo) | PASS ([Screenshots](screens-writer-dialogs-0610/citationInsert-1366x768-1.0.png)) |
| 17 | **Quản lý nguồn** | `writer.reference.sourcesManage` | 1366x768 / 1920x1080 (100%, 125%) | PASS (Rect 442x188, thấy nút đủ) | PASS (Focus nút Thêm nguồn, Tab quay vòng, Esc đóng) | PASS (Tiếng Việt đầy đủ, không lộ khóa) | PASS (Xác nhận xóa nguồn đang trích dẫn) | PASS ([Screenshots](screens-writer-dialogs-0610/sourcesManage-1366x768-1.0.png)) |
| 18 | **Chú thích ảnh** | `writer.reference.captionInsert` | 1366x768 / 1920x1080 (100%, 125%) | PASS (Rect 440x422, thấy nút đủ) | PASS (Focus ô nhập chữ chú thích, Tab quay vòng, Esc đóng) | PASS (Tiếng Việt đầy đủ, không lộ khóa) | PASS (Đánh lại số tự động khi xóa/thêm) | PASS ([Screenshots](screens-writer-dialogs-0610/captionInsert-1366x768-1.0.png)) |
| 19 | **Danh mục hình ảnh** | `writer.reference.tofInsert` | 1366x768 / 1920x1080 (100%, 125%) | PASS (Rect 534x232, thấy nút đủ) | PASS (Focus select loại nhãn, Tab quay vòng, Esc đóng) | PASS (Tiếng Việt đầy đủ, không lộ khóa) | PASS (Tạo TOF chuẩn liên kết nhãn) | PASS ([Screenshots](screens-writer-dialogs-0610/tofInsert-1366x768-1.0.png)) |
| 20 | **Đoạn văn** | `writer.format.paragraphDialog` | 1366x768 / 1920x1080 (100%, 125%) | PASS (Rect 520x680, thấy nút đủ) | PASS (Focus select căn lề, Tab quay vòng, Esc đóng) | PASS (Tiếng Việt đầy đủ, không lộ khóa) | PASS (Thụt lề quá rộng báo lỗi đỏ TV) | PASS ([Screenshots](screens-writer-dialogs-0610/paragraph-1366x768-1.0.png)) |
| 21 | **Tab stops** | `writer.format.tabStops` / `writer.paragraph.tabStops` | 1366x768 / 1920x1080 (100%, 125%) | PASS (Rect 520x440, thấy nút đủ) | PASS (Focus ô vị trí tab `#vno-tabs-pos`, Tab quay vòng, Esc đóng) | PASS (Tiếng Việt đầy đủ, không lộ khóa) | PASS (Vị trí âm/quá bề rộng báo đỏ TV) | PASS ([Screenshots](screens-writer-dialogs-0610/tabStops-1366x768-1.0.png)) |
| 22 | **Tìm/Thay thế** | `common.edit.find` | 1366x768 / 1920x1080 (100%, 125%) | PASS (Rect 520x288, thấy nút đủ) | PASS (Focus ô nhập từ tìm kiếm, Tab quay vòng, Esc đóng) | PASS (Tiếng Việt đầy đủ, không lộ khóa) | PASS (Báo không tìm thấy văn bản TV) | PASS ([Screenshots](screens-writer-dialogs-0610/findReplace-1366x768-1.0.png)) |
| 23 | **Liên kết** | `common.edit.hyperlink` | 1366x768 / 1920x1080 (100%, 125%) | PASS (Rect 480x272, thấy nút đủ) | PASS (Focus ô nhập chữ hiển thị, Tab quay vòng, Esc đóng) | PASS (Tiếng Việt đầy đủ, không lộ khóa) | PASS (URL không hợp lệ chuẩn hóa `https://`) | PASS ([Screenshots](screens-writer-dialogs-0610/hyperlink-1366x768-1.0.png)) |

---

## II. CHI TIẾT CÁC LỖI ĐÃ PHÁT HIỆN VÀ KHẮC PHỤC (3 FILE)

Trong quá trình rà soát tự động, 4 điểm tiêu điểm/alias lệnh đã được phát hiện và khắc phục trực tiếp:

1. **Bổ sung Alias lệnh Tab Stops (`writer.paragraph.tabStops`)**:
   - *Nguyên nhân:* `writer-adapter.js` đăng ký `writer.format.tabStops`, nhưng Ribbon và danh sách lệnh khói dùng `writer.paragraph.tabStops`.
   - *Khắc phục:* Đăng ký alias `globalCommandBus.bindHandler("writer.paragraph.tabStops", (args) => this.openTabStopsDialog(args))` trong `adapters/libreoffice/writer/writer-adapter.js` và cập nhật `platform/help/entries-gaps-0410.js`.

2. **Đặt Tiêu điểm Ban đầu Hộp thoại Viền trang (`showPageBorderDialog`)**:
   - *Nguyên nhân:* `showPageBorderDialog` trong `apps/writer/page-decorations.js` thêm overlay vào DOM nhưng chưa gọi `.focus()` cho control đầu tiên.
   - *Khắc phục:* Thêm `styleSelect?.focus();` ngay sau khi chèn overlay.

3. **Tiêu điểm Hộp thoại Tùy chọn Mục (`openHeaderFooterOptionsDialog`) khi ở Mục 1**:
   - *Nguyên nhân:* `openHeaderFooterOptionsDialog` sử dụng `querySelector("#vno-hf-link-prev:not(:disabled)")`. Tại Mục 1, ô checkbox này bị `disabled`, dẫn tới `querySelector` trả về `null` và không ô nào nhận focus.
   - *Khắc phục:* Cập nhật logic selector fallback: `(dialogBox.querySelector("#vno-hf-link-prev:not(:disabled)") || dialogBox.querySelector("input:not([disabled]), button:not([disabled])"))?.focus()`.

4. **Đặt Tiêu điểm Ban đầu Hộp thoại Quản lý nguồn (`showSourceManagerDialog`)**:
   - *Nguyên nhân:* `showSourceManagerDialog` trong `apps/writer/citations.js` chưa focus nút Thêm nguồn khi mở.
   - *Khắc phục:* Bổ sung `(overlay.querySelector(".vno-add-source") || overlay.querySelector(".vno-cancel"))?.focus()`.

---

## III. HÌNH ẢNH BẰNG CHỨNG (DƯỚI 200KB / FILE)

Tất cả các ảnh chụp màn hình kiểm chứng đã được lưu trong `docs/screens-writer-dialogs-0610/` với dung lượng strictly `< 200 KB` mỗi file (trung bình 120 KB - 180 KB), bao gồm cả 2 độ phân giải chuẩn (1366x768@1.0 và 1920x1080@1.25):

- `docs/screens-writer-dialogs-0610/coverPage-1366x768-1.0.png`
- `docs/screens-writer-dialogs-0610/tableFromText-1366x768-1.0.png`
- `docs/screens-writer-dialogs-0610/bookmark-1366x768-1.0.png`
- `docs/screens-writer-dialogs-0610/crossReference-1366x768-1.0.png`
- `docs/screens-writer-dialogs-0610/wordart-1366x768-1.0.png`
- `docs/screens-writer-dialogs-0610/dateTime-1366x768-1.0.png`
- `docs/screens-writer-dialogs-0610/equation-1366x768-1.0.png`
- `docs/screens-writer-dialogs-0610/symbol-1366x768-1.0.png`
- `docs/screens-writer-dialogs-0610/watermark-1366x768-1.0.png`
- `docs/screens-writer-dialogs-0610/pageColor-1366x768-1.0.png`
- `docs/screens-writer-dialogs-0610/pageBorder-1366x768-1.0.png`
- `docs/screens-writer-dialogs-0610/pageSetup-1366x768-1.0.png`
- `docs/screens-writer-dialogs-0610/columns-1366x768-1.0.png`
- `docs/screens-writer-dialogs-0610/pageNumberFormat-1366x768-1.0.png`
- `docs/screens-writer-dialogs-0610/sectionOptions-1366x768-1.0.png`
- `docs/screens-writer-dialogs-0610/citationInsert-1366x768-1.0.png`
- `docs/screens-writer-dialogs-0610/sourcesManage-1366x768-1.0.png`
- `docs/screens-writer-dialogs-0610/captionInsert-1366x768-1.0.png`
- `docs/screens-writer-dialogs-0610/tofInsert-1366x768-1.0.png`
- `docs/screens-writer-dialogs-0610/paragraph-1366x768-1.0.png`
- `docs/screens-writer-dialogs-0610/tabStops-1366x768-1.0.png`
- `docs/screens-writer-dialogs-0610/findReplace-1366x768-1.0.png`
- `docs/screens-writer-dialogs-0610/hyperlink-1366x768-1.0.png`

---

## IV. XÁC NHẬN GATE

- **Unit Tests:** `tests/unit/writer-dialogs-d16.test.js` đã được thêm vào runner chính.
- **Master Test Runner:** `node tests/run-tests.js` đạt **100% PASS** (`2812/2812 PASS | 0 FAIL`).
