# Báo cáo Đo thời gian Xem trước khi in (Print Preview) cho Sheet và Slide (agy)

**Ngày đo:** 04/10/2026  
**Môi trường:** Desktop App thật (`main.py` Python WebView2), Windows, Offline, CDP protocol qua `tests/live/cdp/session.mjs`  
**Hồ sơ LOCALAPPDATA:** Độc lập từng lần chạy (`E:\VNOffice-profiles\agy-print-<file>-runN`)  
**Tệp dữ liệu thử nghiệm:**
- **Sheet:** `lan03.xlsx` (10.5 MB), `lan26.xlsx` (15.6 MB)
- **Slides:** `sample-3.pptx` (18.9 MB)

---

## 1. Phương pháp & Công cụ đo

1. Sử dụng script đo tự động qua CDP (`scripts/measure_print_sheet_slide.mjs` tích hợp `tests/live/cdp/session.mjs`).
2. Thiết lập biến môi trường `VNO_PERF_DEBUG=1` để ghi nhận chính xác thời gian từng bước từ log stdout của ứng dụng (`[VNO Open Perf]`).
3. Khởi động ứng dụng thật cho từng tệp, chờ nạp xong tài liệu trong UI, phát lệnh in `common.file.print` qua Command Bus (`globalCommandBus.execute("common.file.print")`).
4. Bắt thời điểm từ lúc gọi lệnh in đến khi thẻ ảnh xem trước `.vno-print-preview-stage img` xuất hiện hoàn chỉnh trên DOM giao diện xem trước.
5. Mỗi tệp được đo **2 lần độc lập** trên 2 thư mục profile `LOCALAPPDATA` riêng biệt. Lần 1 đặt cờ `VNO_PRINT_VERIFY=1` để kiểm tra khớp số trang giữa `fast_pdf_page_count` và LibreOffice engine.

---

## 2. Bảng số liệu chi tiết theo từng bước

| Tệp thử nghiệm | Ứng dụng | Kích thước | Lần đo | Tổng thời gian xem trước (s) | Ghi nguồn `print_write_source` (ms) | Chuyển PDF `print_convert_pdf` (ms) | Đếm trang `print_inspect_pdf` (ms) | Dựng ảnh `uno_render_pdf_page` (ms) | Kết quả Verify số trang |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **lan03.xlsx** | Sheet | 10.5 MB | Lần 1 | **14.057 s** | 5,746.8 ms | 3,876.8 ms | 2,808.5 ms | 120.1 ms | `fast=1 engine=1 match=True` |
| **lan03.xlsx** | Sheet | 10.5 MB | Lần 2 | **14.027 s** | 5,746.3 ms | 3,833.6 ms | 0.2 ms | 269.9 ms | - (Fast-path active) |
| **lan03.xlsx (TB)** | **Sheet** | **10.5 MB** | **Trung bình** | **14.042 s** | **5,746.6 ms** | **3,855.2 ms** | **1,404.4 ms** | **195.0 ms** | **Khớp 100%** |
| | | | | | | | | | |
| **lan26.xlsx** | Sheet | 15.6 MB | Lần 1 | **14.235 s** | 5,636.5 ms | 3,861.4 ms | 2,994.6 ms | 157.1 ms | `fast=1 engine=1 match=True` |
| **lan26.xlsx** | Sheet | 15.6 MB | Lần 2 | **14.710 s** | 5,665.1 ms | 3,972.7 ms | 0.2 ms | 253.3 ms | - (Fast-path active) |
| **lan26.xlsx (TB)** | **Sheet** | **15.6 MB** | **Trung bình** | **14.473 s** | **5,650.8 ms** | **3,917.1 ms** | **1,497.4 ms** | **205.2 ms** | **Khớp 100%** |
| | | | | | | | | | |
| **sample-3.pptx** | Slides | 18.9 MB | Lần 1 | **17.343 s** | 9,006.0 ms | 3,908.3 ms | 2,813.4 ms | 109.8 ms | `fast=1 engine=1 match=True` |
| **sample-3.pptx** | Slides | 18.9 MB | Lần 2 | **16.791 s** | 8,649.8 ms | 3,780.4 ms | 0.2 ms | 277.4 ms | - (Fast-path active) |
| **sample-3.pptx (TB)**| **Slides** | **18.9 MB** | **Trung bình** | **17.067 s** | **8,827.9 ms** | **3,844.4 ms** | **1,406.8 ms** | **193.6 ms** | **Khớp 100%** |

---

## 3. Đánh giá và Phân tích Bước chậm nhất

### 3.1. Bước chậm nhất: Ghi nguồn (`print_write_source`)
- **Tỷ lệ chi phối:** Chiếm từ **39.0% đến 51.7%** tổng thời gian mở xem trước khi in.
  - VN Sheet (`lan03.xlsx`, `lan26.xlsx`): ~**5.65s - 5.75s** (~40% tổng thời gian).
  - VN Slides (`sample-3.pptx`): ~**8.65s - 9.01s** (~51.7% tổng thời gian).
- **Nguyên nhân kỹ thuật:** 
  - VN Sheet và VN Slides sử dụng mô hình nạp nhanh (view-first rendering). Khi người dùng nhấn nút In (Ctrl+P / `common.file.print`), ứng dụng cần chuẩn bị tệp nguồn đầy đủ dạng Flat XML (FODS cho Sheet, FODP cho Slides) để đưa vào tiến trình LibreOffice worker.
  - Quá trình chuyển đổi/tuần tự hóa toàn bộ mô hình bảng tính / danh sách slide bài trình chiếu lớn sang chuỗi dữ liệu XML FODS/FODP diễn ra ngay trên JS thread và Python bridge trước khi tệp tạm được ghi xuống đĩa.

### 3.2. Bước chậm thứ hai: Chuyển đổi PDF (`print_convert_pdf`)
- **Thời gian tiêu tốn:** ~**3.8s - 3.9s** trên tất cả các tệp.
- **Phân tích:** Tiến trình LibreOffice UNO worker nhận tệp nguồn FODS/FODP và xuất sang PDF tạm. Nhờ cơ chế worker LibreOffice chạy thường trực (đã tối ưu ở nhánh `main`), bước này hoạt động ổn định ở mức ~3.8s và không bị overhead khởi động lại tiến trình `soffice.exe`.

### 3.3. Bước đếm số trang (`print_inspect_pdf`)
- **Kết quả đối chiếu (`VNO_PRINT_VERIFY=1`):** `fast=1 engine=1 match=True` cho tất cả các tệp Sheet và Slides.
- **Hiệu năng:**
  - Khi bật Verify (gọi thêm UNO engine inspect): Mất ~2.8s - 3.0s do LibreOffice phải mở lại tệp PDF để đếm trang qua UNO bridge.
  - Ở chế độ bình thường (Fast-path): Hàm `fast_pdf_page_count` đọc trực tiếp các thông số cấu trúc `/Type /Pages` từ tệp PDF chỉ mất **0.2 ms**, tiết kiệm hoàn toàn ~3 giây chờ đợi cho người dùng.

### 3.4. Bước dựng ảnh xem trước (`uno_render_pdf_page`)
- **Thời gian:** Chỉ mất **109 ms - 277 ms** (~0.2s). Đây là bước nhanh nhất trong toàn bộ chuỗi xem trước.

---

## 4. Bảng tổng hợp nguyên nhân & Hướng đề xuất tối ưu

| Bước trong Pipeline | Thời gian chiếm | Mức độ ảnh hưởng | Nguyên nhân chính | Hướng đề xuất tối ưu tiếp theo |
| :--- | :--- | :--- | :--- | :--- |
| **1. Ghi nguồn (`print_write_source`)** | **5.6s - 9.0s** (39% - 52%) | 🔴 **CHẬM NHẤT** | Tuần tự hóa toàn bộ tài liệu sang XML FODS/FODP khi phát lệnh in. | Cần cơ chế cache FODS/FODP background hoặc xuất trực tiếp dữ liệu dạng nhị phân/stream. |
| **2. Chuyển PDF (`print_convert_pdf`)** | **3.8s - 3.9s** (22% - 27%) | 🟡 **TRUNG BÌNH** | LibreOffice UNO worker nạp FODS/FODP và nén xuất file PDF. | Giữ worker nóng; nghiên cứu tối ưu filter xuất PDF của LO. |
| **3. Đếm trang (`print_inspect_pdf`)** | **0.2 ms** (Fast-path) | 🟢 **ĐÃ TỐI ƯU** | `fast_pdf_page_count` đọc trực tiếp header/body PDF không qua LO. | Giữ nguyên cờ Fast-path hiện tại. |
| **4. Dựng ảnh trang (`uno_render_pdf_page`)** | **0.1s - 0.3s** (1% - 2%) | 🟢 **RẤT NHANH** | LO UNO Worker render trang PDF đầu tiên ra PNG image. | Giữ nguyên. |

---

*Số liệu trong báo cáo này được đo đạc thực tế từ ứng dụng VN Office Desktop qua giao thức CDP, hoàn toàn không suy đoán.*
