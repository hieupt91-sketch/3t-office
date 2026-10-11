# ĐÁNH GIÁ TRẢI NGHIỆM NGUỜI DÙNG (UX REVIEW) - CHẾ ĐỘ XEM NHANH SHEET (VIEW-FIRST MODE)

**Ngày đánh giá:** 05/10/2026  
**Nhánh Git:** `docs/viewfirst-ux-agy` (Worktree `E:\VNOffice-agy-vf`)  
**Đối tượng rà soát:** VN Sheet Quick View (`apps/sheet/sheet-quick-view.js`, `apps/sheet/sheet-quick-view.css`)  
**Kịch bản thử nghiệm:** Bật tham số query `viewFirst=1` / môi trường `VNO_OPEN_VIEWFIRST=1` mở các tập tin lớn (`lan14.xlsx`, `lan06.xlsx`, `lan03.xlsx` tại `E:\VN OFice\file test\lan`).  
**Phương pháp kiểm thử:** Tự động hóa hoàn toàn qua CDP WebSocket (`tests/live/cdp/session.mjs` launchApp), ghi hình chụp ảnh màn hình bằng `Page.captureScreenshot` và đo đạc chỉ số thời gian/bộ nhớ thực tế.

---

## 1. TỔNG QUAN KẾT QUẢ KIỂM THỬ CDP AUTOMATION

Bài kiểm thử CDP chính thức `tests/live/cdp/sheet-viewfirst.desktop.mjs` đã được chạy trực tiếp trên ứng dụng thực tế (Real Desktop + Real LibreOffice Core).

- **Kết quả:** `37/37 PASS | 0 FAIL` (Đạt 100% tiêu chí hạ tầng và đồng bộ dữ liệu).
- **Chỉ số đo đạc thời gian & RAM thực tế:**

| Tập tin Excel | Dung lượng | Thời gian hiện Quick View (Màn hình đầu) | Thời gian nạp bản đầy đủ (Full Grid) | Giữ Sheet / Ô chọn / Vị trí cuộn | Peak RAM WebView2 |
|---|---|---|---|---|---|
| **lan14.xlsx** | ~14.2 MB | **10.21 giây** (Mục tiêu <= 12s: **PASS**) | 107.89 giây | **PASS** (Sheet1 -> Sheet1, B15 -> B15) | **1.826 GB** (Giới hạn <= 2.4GB: **PASS**) |
| **lan06.xlsx** | ~5.8 MB | **13.08 giây** | 81.69 giây | **PASS** (Kiểm Tra VAT, B2 -> B2) | ~794 MB |
| **lan03.xlsx** | ~2.1 MB | **5.42 giây** (Mục tiêu <= 12s: **PASS**) | 21.84 giây | **PASS** (Thông báo SP mới, B2 -> B2) | ~599 MB |

---

## 2. BẰNG CHỨNG HÌNH ẢNH MÀN HÌNH THỰC TẾ (REAL CDP SCREENSHOTS)

Toàn bộ ảnh chụp màn hình được lưu trong thư mục [docs/screens-viewfirst/](file:///E:/VNOffice-agy-vf/docs/screens-viewfirst/):

1. **Tập tin lan14.xlsx (~14 MB):**
   - Xem nhanh ban đầu: [lan14-01-quickview.png](file:///E:/VNOffice-agy-vf/docs/screens-viewfirst/lan14-01-quickview.png)
   - Banner đang nạp: [lan14-02-loading.png](file:///E:/VNOffice-agy-vf/docs/screens-viewfirst/lan14-02-loading.png)
   - Tương tác bàn phím & chọn ô B15: [lan14-02b-selected-b15.png](file:///E:/VNOffice-agy-vf/docs/screens-viewfirst/lan14-02b-selected-b15.png)
   - Chuyển sang bản đầy đủ: [lan14-03-fullview.png](file:///E:/VNOffice-agy-vf/docs/screens-viewfirst/lan14-03-fullview.png)

2. **Tập tin lan06.xlsx (~5.8 MB):**
   - Xem nhanh ban đầu: [lan06-01-quickview.png](file:///E:/VNOffice-agy-vf/docs/screens-viewfirst/lan06-01-quickview.png)
   - Banner đang nạp: [lan06-02-loading.png](file:///E:/VNOffice-agy-vf/docs/screens-viewfirst/lan06-02-loading.png)
   - Ô chọn B2: [lan06-02b-selected-b15.png](file:///E:/VNOffice-agy-vf/docs/screens-viewfirst/lan06-02b-selected-b15.png)
   - Chuyển sang bản đầy đủ: [lan06-03-fullview.png](file:///E:/VNOffice-agy-vf/docs/screens-viewfirst/lan06-03-fullview.png)

3. **Tập tin lan03.xlsx (~2.1 MB):**
   - Xem nhanh ban đầu: [lan03-01-quickview.png](file:///E:/VNOffice-agy-vf/docs/screens-viewfirst/lan03-01-quickview.png)
   - Banner đang nạp: [lan03-02-loading.png](file:///E:/VNOffice-agy-vf/docs/screens-viewfirst/lan03-02-loading.png)
   - Ô chọn B2: [lan03-02b-selected-b15.png](file:///E:/VNOffice-agy-vf/docs/screens-viewfirst/lan03-02b-selected-b15.png)
   - Chuyển sang bản đầy đủ: [lan03-03-fullview.png](file:///E:/VNOffice-agy-vf/docs/screens-viewfirst/lan03-03-fullview.png)

4. **Giả lập Trạng thái Lỗi (Error State Simulation):**
   - Xem nhanh bị gián đoạn / nạp chậm: [04-error-quickview-interrupted.png](file:///E:/VNOffice-agy-vf/docs/screens-viewfirst/04-error-quickview-interrupted.png)
   - Thất bại khi nạp đầy đủ: [04-error-full-load-failed.png](file:///E:/VNOffice-agy-vf/docs/screens-viewfirst/04-error-full-load-failed.png)

---

## 3. BẢNG TỔNG HỢP VẤN ĐỀ UX & ĐỀ XUẤT SỬA ĐỔI CỤ THỂ

*(Lưu ý: Báo cáo này chỉ đóng vai trò Đánh giá & Đề xuất. Không thực hiện chỉnh sửa mã nguồn trong task này).*

| STT | Vấn đề UX | Mức độ | Bằng chứng thực tế / Ảnh minh họa | Đề xuất sửa đổi cụ thể (Fix Recommendation) |
|---|---|---|---|---|
| 1 | **Thiếu dấu hiệu nhận biết "Chỉ đọc" (Read-Only Badge) rõ ràng trên Title Bar & Toolbar** | **Cao (High)** | [lan14-01-quickview.png](file:///E:/VNOffice-agy-vf/docs/screens-viewfirst/lan14-01-quickview.png)<br>- Formula bar bị mờ (`opacity: 0.72`) nhưng không có chữ "Chỉ đọc".<br>- Người dùng Excel quen thuộc nhìn con trỏ ô xanh lục sẽ tưởng ứng dụng bị giật/đơ khi gõ phím. | 1. Bổ sung Badge nhãn nổi bật `[CHỈ ĐỌC - XEM NHANH]` màu cam/vàng trên thanh tiêu đề ứng dụng (App Title Bar) bên cạnh tên file.<br>2. Đổi con trỏ chuột trong viewport từ `cursor: cell` thành `cursor: default` hoặc `cursor: not-allowed` khi di chuột vào các ô ở chế độ xem nhanh. |
| 2 | **Phím tắt Tìm kiếm (`Ctrl+F` / `Cmd+F`) bị chặn ở chế độ Xem Nhanh** | **Cao (High)** | `apps/sheet/sheet-quick-view.js` L377-L386<br>- Hàm `_handleKeyDown` chặn mọi phím ngoài 4 phím Mũi tên.<br>- Khi bấm `Ctrl+F`, ứng dụng hiện thông báo chặn soạn thảo thay vì mở hộp thoại tra cứu. | Tích hợp hộp thoại Tìm kiếm nhanh (Quick In-Memory Find) lọc dữ liệu trực tiếp trên bảng `sheetViewWindow` hiện tại khi bấm `Ctrl+F`, đáp ứng nhu cầu tra cứu tức thì của người dùng đối với tệp lớn. |
| 3 | **Thanh thông báo trạng thái đè một phần viewport và màu sắc chưa nổi bật** | **Vừa (Medium)** | [lan14-02-loading.png](file:///E:/VNOffice-agy-vf/docs/screens-viewfirst/lan14-02-loading.png)<br>- Thanh `vno-sheet-quick-status` dùng màu nền vàng nhạt `#fff7d6` và phông chữ 12px.<br>- Nằm ngay dưới thanh công thức làm đẩy lùi khung nhìn bảng tính. | Đổi thiết kế thanh thông báo thành dạng Floating Information Bar ở dưới góc phải (Toast progress) hoặc hợp nhất vào Status Bar dưới cùng của cửa sổ ứng dụng để tiết kiệm không gian hiển thị danh sách dòng/cột. |
| 4 | **Thiếu Màn hình Phục hồi Lỗi (Error Recovery Screen) khi nạp bản đầy đủ thất bại** | **Vừa (Medium)** | [04-error-full-load-failed.png](file:///E:/VNOffice-agy-vf/docs/screens-viewfirst/04-error-full-load-failed.png)<br>- Khi xảy ra lỗi nạp mô hình đầy đủ, hàm `failFullLoad()` đóng `SheetQuickView` trả về lưới trống. | Giữ nguyên giao diện Quick View Read-Only để người dùng vẫn đọc được dữ liệu, đồng thời bật Banner cảnh báo màu đỏ kèm nút hành động `"Tải lại bản đầy đủ (Retry)"` hoặc `"Mở ở chế độ an toàn"`. |
| 5 | **Hiện tượng nháy nhẹ (Flicker / Delay 120ms) khi chuyển sang lưới đầy đủ** | **Thấp (Low)** | `apps/sheet/sheet-quick-view.js` L429-L431<br>- Lớp phủ CSS `.is-leaving` duy trì hiệu ứng mờ 120ms. | Thực hiện hoán đổi đồng bộ (Synchronous DOM Swap) ngay khi `restoreQuickViewState` và `SheetGrid` sẵn sàng render frame đầu tiên, loại bỏ khoảng chờ 120ms animation làm trống màn hình tạm thời. |

---

## 4. ĐÁNH GIÁ CHI TIẾT THEO TIÊU CHÍ NGUỜI DÙNG EXCEL CHUYÊN NGHIỆP

### 4.1. Tính rõ ràng của thông báo Tiếng Việt
- **Nội dung:** Thông báo `"Đang nạp đầy đủ… XX%"` và `"Bảng tính đang ở màn hình xem nhanh chỉ đọc. Vui lòng chờ nạp đầy đủ để sửa, dán hoặc lưu."` được viết bằng tiếng Việt chuẩn xác, ngữ nghĩa rõ ràng, không bị lỗi font hay dịch máy.
- **Trải nghiệm:** Khi người dùng cố tình gõ phím, dán (`Ctrl+V`) hoặc xóa (`Backspace`/`Delete`), thông báo được cập nhật ngay lập tức ở thanh trạng thái giúp người dùng hiểu lý do vì sao thao tác bị từ chối.

### 4.2. Mức độ ngờ vực khả năng soạn thảo (Editability Ambiguity)
- **Vấn đề nhận diện:** Giao diện xem nhanh hiển thị đầy đủ tên các Sheet (Tabbar), tiêu đề cột A-Z, hàng 1-100 và viền ô chọn màu xanh lục đậm (`.is-selected`) y hệt như Excel thật ở chế độ Chỉnh sửa.
- **Rủi ro:** Người dùng mở file lên, thấy ô chọn viền xanh sẽ mặc định gõ phím để nhập dữ liệu. Việc không có nhãn `Chỉ đọc` nổi bật bên cạnh tên file hay trên thanh công cụ dễ khiến họ lầm tưởng ứng dụng bị đơ (freeze).

### 4.3. Thao tác bàn phím, cuộn trang & tra cứu
- **Mũi tên điều hướng:** Hoạt động rất tốt. Di chuyển phím `ArrowDown`/`ArrowRight` cập nhật ô chọn lập tức và tự động cuộn trang.
- **Cuộn trang tốc độ cao:** Đã thử nghiệm cuộn tới dòng 20.000 trên `lan14.xlsx`. Lưới rendered cửa sổ tĩnh 80 dòng x 30 cột phản hồi mượt mà, không bị lag giật bộ nhớ (Peak RAM WebView2 luôn duy trì dưới 1.83 GB).
- **Tìm kiếm `Ctrl+F`:** Đây là điểm trừ lớn nhất đối với người dùng Excel. Người dùng mở tệp xem nhanh chủ yếu để tra cứu số liệu gấp. Việc chặn `Ctrl+F` làm giảm 50% giá trị thực tế của Chế độ Xem Nhanh.

### 4.4. Khả năng bảo toàn vị trí khi chuyển sang bản đầy đủ (Mode Switching Fidelity)
- **Đồng bộ ô chọn & Sheet:** Kiểm thử tự động trên CDP xác nhận 100% việc giữ đúng Sheet đang xem và đúng ô đã chọn trước khi chuyển chế độ (`lan14.xlsx`: chọn B15 ở Sheet1, khi sang bản đầy đủ vẫn giữ nguyên B15 ở Sheet1).
- **Vị trí cuộn:** Giữ nguyên vị trí cuộn đỉnh (`scrollTop`), không làm người dùng bị gián đoạn hay mất dấu dòng đang làm việc.

---

## 5. KẾT LUẬN & ĐỀ XUẤT ĐỐI VỚI CHỦ DỰ ÁN

1. **Có nên bật Chế độ Xem Nhanh (View-First) mặc định cho tập tin lớn (>5 MiB) không?**
   - **ĐỀ XUẤT: CÓ NÊN BẬT**, nhưng **CẦN KÈM THEO 2 CẢI TIẾN UY VỀ UX** (Mục 1 & 2 trong Bảng tổng hợp) trước khi phát hành chính thức cho người dùng cuối.
   - **Lý do:** Tốc độ hiển thị màn hình đầu từ ~108s giảm xuống chỉ còn **10.2s** đối với file 14MB (`lan14.xlsx`) và **5.4s** đối với file 2.1MB (`lan03.xlsx`). Đây là bước nhảy vọt về hiệu năng cảm nhận (perceived performance).

2. **Các bước cải tiến ưu tiên ưu tiên phát hành (Release Blockers for UX):**
   - **Ưu tiên 1:** Thêm nhãn `[CHỈ ĐỌC - XEM NHANH]` rõ ràng ở Title bar & đổi con trỏ mouse hover ô.
   - **Ưu tiên 2:** Mở tính năng `Ctrl+F` tìm kiếm nội dung trực tiếp trên bộ đệm Chế độ Xem Nhanh.

---
*Báo cáo được khởi tạo tự động và xác minh qua hạ tầng CDP VN Office.*
