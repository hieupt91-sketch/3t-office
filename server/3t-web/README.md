# 3T Office Website (`server/3t-web`)

Trang web tĩnh chính thức giới thiệu bộ ứng dụng văn phòng **3T Office** (gồm 3T Doc, 3T Sheet và 3T Slide), phục vụ tên miền `https://office.3tcomputer.com`.

---

## 1. Sơ đồ cấu trúc thư mục (Folder Map)

```text
server/3t-web/
├── index.html                 # Trang chủ: Tổng quan 3T Office, 3 ứng dụng, 3 lợi ích cốt lõi, CTA
├── tinh-nang.html             # Danh mục tính năng: Phân loại chi tiết Đã sẵn sàng vs Sắp có
├── tai-ve.html                # Tải bộ cài: Phiên bản 0.9.6, dung lượng 502 MB, mã băm SHA-256, yêu cầu máy
├── co-gi-moi.html             # Nhật ký cập nhật: Ghi chú phát hành từ 0.9.1 đến 0.9.6
├── huong-dan.html             # Hướng dẫn sử dụng: 8 bài viết trọng tâm kèm ô tìm kiếm client-side
├── ban-quyen.html             # Bản quyền & Giá: Dùng thử 30 ngày, gói vĩnh viễn, thuê bao, cơ chế 30 ngày offline
├── lien-he.html               # Liên hệ: Tên miền chính thống và các trường chờ phê duyệt
├── trang-thai.html            # Giám sát dịch vụ: Truy vấn thời gian thực điểm cuối /health
├── 404.html                   # Trang thông báo không tìm thấy liên kết
├── robots.txt                 # Cấu hình robot thu thập dữ liệu
├── sitemap.xml                # Sơ đồ trang web XML cho office.3tcomputer.com
├── favicon.svg                # Biểu trưng vector 3T
├── favicon.ico                # Biểu trưng định dạng ico
├── css/
│   └── style.css              # Bảng kiểu CSS: Tự động đổi sáng/tối theo hệ điều hành, chuẩn responsive từ 360px
├── js/
│   └── main.js                # Vanilla JS: Điều khiển mobile nav, tìm kiếm bài viết, nạp release, ping /health
├── data/
│   └── releases.json          # Nguồn sự thật duy nhất (Single Source of Truth) về các bản phát hành
└── assets/
    ├── icons/                 # Biểu tượng SVG sản phẩm: 3t-mark.svg, writer.svg, sheet.svg, slides.svg, vnoffice.svg
    └── screenshots/           # Ảnh chụp màn hình thật từ ứng dụng desktop: doc-preview, sheet-preview, slide-preview
```

---

## 2. Hướng dẫn xem trước cục bộ (Local Preview)

Do trang web được xây dựng bằng công nghệ thuần túy (HTML5 + CSS3 + Vanilla JavaScript), không sử dụng CDN hay phông chữ ngoài, bạn có thể xem trước theo 2 cách:

### Cách 1: Xem trực tiếp từ tệp (Offline / file://)
- Nhấp đúp trực tiếp vào tệp `server/3t-web/index.html` trong File Explorer.
- Trang web hoạt động hoàn hảo khi không có kết nối Internet nhờ dữ liệu dự phòng nội tuyến.

### Cách 2: Xem qua máy chủ HTTP cục bộ của Python
Chạy lệnh sau từ thư mục gốc của repository:
```bash
python -m http.server 8090 -d server/3t-web
```
Sau đó mở trình duyệt và truy cập: `http://localhost:8090`.

---

## 3. Cách thức máy chủ API gắn kết sau này (Production Static Mount)

Khi triển khai lên máy chủ dịch vụ đám mây 3T Cloud (`office.3tcomputer.com`):
1. **Nginx Reverse Proxy / Static Serve:**
   Nginx sẽ cấu hình thư mục `server/3t-web` làm `root` tĩnh phục vụ trực tiếp cho các yêu cầu tại `/`.
   Các yêu cầu API (như `/api/v1/*` và `/health`) được chuyển tiếp ngược (proxy_pass) về tiến trình `3t-api` (FastAPI).
2. **FastAPI Static Mount (Tùy chọn):**
   Trong trường hợp phục vụ trực tiếp qua FastAPI, người phụ trách dịch vụ đám mây sẽ gắn kết thư mục qua:
   ```python
   app.mount("/", StaticFiles(directory="server/3t-web", html=True), name="static_web")
   ```

---

## 4. Danh sách các hạng mục cần chủ quản duyệt (TODO-CONFIRM)

Tuân thủ nghiêm ngặt nguyên tắc trung thực và không bịa đặt số liệu:

1. **TODO-CONFIRM: Ngày mở tải công khai bản Setup 0.9.6:**
   Hiện tại nút tải công khai trên trang `tai-ve.html` được tạm khóa và hiển thị thông báo. Cần quyết định thời điểm mở tải công khai sau khi máy chủ hoàn tất cấu hình.
2. **TODO-CONFIRM: Giá chính thức cho các gói bản quyền:**
   - Đơn giá cho Gói vĩnh viễn (sở hữu trọn đời + 1 năm cập nhật).
   - Đơn giá cho Gói thuê bao (theo tháng / theo năm).
   Đang được hiển thị dưới dạng nhãn `TODO-CONFIRM` trên trang `ban-quyen.html`.
3. **TODO-CONFIRM: Thông tin liên hệ chính thức của 3T Computer:**
   - Địa chỉ trụ sở văn phòng giao dịch chính thức.
   - Số điện thoại đường dây nóng / tổng đài hỗ trợ.
   - Hộp thư điện tử (email) tiếp nhận hỗ trợ khách hàng.
   - Khung giờ trực kỹ thuật tiếp nhận yêu cầu.
   Đang được hiển thị dưới dạng các khối thông báo nổi bật trên trang `lien-he.html`.
