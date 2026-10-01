# HANDOFF — Xây dựng Website Tĩnh 3T Office (`server/3t-web`)

- **Đặc trách**: agy (Kỹ sư Giao diện & Trải nghiệm Web)
- **Worktree**: `E:\VNOffice-agy-web`
- **Nhánh**: `feat/3t-web-agy` (tách từ `feat/3t-cloud-phase1-codex`)
- **Tài liệu tham chiếu**: `docs/SPEC-3T-CLOUD.md` §4.5, `docs/SPEC-HANG-MUC-CHUNG.md`, `docs/FEATURE-PARITY-ROADMAP.md`, `docs/HANDOFF-3T-BRAND-UX.md`, `AGENTS.md`
- **Tên miền phục vụ**: `https://office.3tcomputer.com`

---

## 1. Tổng quan & Kết quả bàn giao

Đã hoàn thành toàn bộ website tĩnh cho sản phẩm **3T Office** tại thư mục `server/3t-web/` theo đúng các nguyên tắc cốt lõi:
1. **Công nghệ thuần túy (Vanilla Stack)**: 100% HTML5 ngữ nghĩa, CSS3 hiện đại, Vanilla JavaScript; **không dùng bất kỳ CDN ngoài, không nạp phông chữ ngoài, không mã theo dõi**.
2. **Khả năng chạy ngoại tuyến hoàn hảo**: Hoạt động đầy đủ và trơn tru khi mở trực tiếp từ tệp cục bộ (`file://`), có dữ liệu dự phòng nội tuyến cho các trang động khi không có máy chủ HTTP.
3. **Thiết kế thích ứng & Đa chủ đề**: Tối ưu hiển thị chuẩn xác từ màn hình nhỏ di động 360 px đến màn hình rộng 1280+ px; tự động chuyển đổi giao diện Sáng / Tối theo thiết lập hệ điều hành (`prefers-color-scheme`).
4. **Bản sắc thương hiệu 3T**: Kế thừa màu sắc cam - xanh hoàng gia đặc trưng từ `branding/3t/3t-mark.svg` và bộ biểu trưng 3 ứng dụng `writer.svg`, `sheet.svg`, `slides.svg`.
5. **Tuân thủ quy chuẩn bảo mật & pháp lý**:
   - Tuyệt đối không xuất hiện tên hoặc biểu trưng bị cấm ("Microsoft" không xuất hiện ở bất kỳ tệp nào; "Windows" chỉ dùng định danh hệ điều hành).
   - Mô tả định dạng tài liệu trung thực: `.docx`, `.xlsx`, `.pptx`, `.doc`, `.xls`, `.ppt`.
   - Mọi tệp trong `server/3t-web` đều có dung lượng dưới 400 KB.

---

## 2. Danh mục tệp & Cấu trúc đã xây dựng

| Tệp / Thư mục | Mô tả nội dung & Chức năng | Trạng thái kỹ thuật |
|---|---|---|
| `server/3t-web/index.html` | Trang chủ: Giới thiệu 3T Office, bộ 3 ứng dụng (3T Doc, 3T Sheet, 3T Slide), 3 lợi ích cốt lõi, bộ sưu tập ảnh chụp thật, kêu gọi hành động. | Hoàn thành, 1 thẻ h1, lang=vi |
| `server/3t-web/tinh-nang.html` | Danh mục tính năng: Phân loại chi tiết từng ứng dụng, gắn nhãn minh bạch "Sẵn sàng" và "Sắp có". | Hoàn thành, 1 thẻ h1, lang=vi |
| `server/3t-web/tai-ve.html` | Trang tải về: Phiên bản 0.9.6 pilot, tên tệp `VNOffice-Setup-0.9.6.exe` (hoặc `Setup-0.9.6.exe`), dung lượng thật 502 MB, mã băm SHA-256 thật, yêu cầu hệ thống, 5 bước cài đặt, nút tải tạm khóa kèm thông báo `TODO-CONFIRM`. | Hoàn thành, 1 thẻ h1, lang=vi |
| `server/3t-web/co-gi-moi.html` | Nhật ký cập nhật: Toàn văn ghi chú phát hành từ bản 0.9.1 đến 0.9.6 (lấy từ các tệp `notes-*.txt` có thật). | Hoàn thành, 1 thẻ h1, lang=vi |
| `server/3t-web/huong-dan.html` | Hướng dẫn sử dụng: 8 bài viết trọng tâm (Bắt đầu nhanh, 15 phím tắt thường dùng, Khác biệt cần biết, Dán dữ liệu liên ứng dụng, Cập nhật một chạm, Tự động khôi phục, Khởi động nhanh, Thiết lập trang in NĐ 30) kèm ô tìm kiếm client-side không dấu/có dấu. | Hoàn thành, 1 thẻ h1, lang=vi |
| `server/3t-web/ban-quyen.html` | Chính sách bản quyền: Gói dùng thử 30 ngày, Gói vĩnh viễn (1 năm cập nhật), Gói thuê bao; giải thích cơ chế dùng ngoại tuyến 30 ngày (Grace Period); ghi chú nhập khóa bản quyền "Sắp có" ở GĐ2. | Hoàn thành, 1 thẻ h1, lang=vi |
| `server/3t-web/lien-he.html` | Trang liên hệ: Tên miền chính thống (`3tcomputer.com`, `office.3tcomputer.com`, `reader.3tcomputer.com`) và các trường chờ phê duyệt gắn thẻ `TODO-CONFIRM`. | Hoàn thành, 1 thẻ h1, lang=vi |
| `server/3t-web/trang-thai.html` | Giám sát kết nối: Truy vấn thời gian thực `/health`, hiển thị OK/lỗi tiếng Việt, cơ chế chuyển tiếp an toàn khi mở từ `file://`. | Hoàn thành, 1 thẻ h1, lang=vi |
| `server/3t-web/404.html` | Trang thông báo không tìm thấy liên kết, điều hướng về Trang chủ, Tải về, Hướng dẫn. | Hoàn thành, 1 thẻ h1, lang=vi |
| `server/3t-web/css/style.css` | Bảng kiểu CSS tổng thể: Biến màu thương hiệu, chế độ tối/sáng tự động, điều hướng di động, bố cục lưới, hỗ trợ trợ năng (`:focus-visible`, skip-link). | 28.5 KB, không thư viện ngoài |
| `server/3t-web/js/main.js` | Kịch bản Vanilla JS: Menu mobile, chuyển tab ảnh chụp thật, tìm kiếm bài viết tức thì, kiểm tra `/health`, nạp dữ liệu bản phát hành. | 8.3 KB, không thư viện ngoài |
| `server/3t-web/data/releases.json` | Nguồn sự thật duy nhất (Single Source of Truth) về phiên bản, tệp tải về, kích thước byte, mã SHA256 và nhật ký thay đổi. | 5.0 KB, JSON hợp lệ |
| `server/3t-web/robots.txt` | Chỉ thị thu thập dữ liệu tìm kiếm cho `office.3tcomputer.com`. | 0.1 KB |
| `server/3t-web/sitemap.xml` | Sơ đồ liên kết XML 9 trang chính thức với giao thức HTTPS. | 1.6 KB |
| `server/3t-web/assets/icons/` | Bộ biểu tượng SVG: `3t-mark.svg`, `writer.svg`, `sheet.svg`, `slides.svg`, `vnoffice.svg`. | Tối ưu vector sắc nét |
| `server/3t-web/assets/screenshots/` | 3 bộ ảnh chụp màn hình desktop thật qua CDP (WebP + PNG). | Mỗi tệp 54–100 KB (< 250 KB) |
| `server/3t-web/README.md` | Hướng dẫn cấu trúc thư mục, cách xem trước và phương án tích hợp máy chủ API. | Tài liệu kỹ thuật |

---

## 3. Bảng đối chiếu: Dữ liệu Thật vs Đánh dấu TODO-CONFIRM

Tuyệt đối không bịa đặt số liệu hay thông tin không có trong tài liệu dự án:

| Hạng mục | Dữ liệu thật (Đã kiểm chứng từ mã nguồn / hệ thống) | Điểm đánh dấu TODO-CONFIRM (Chờ chủ quản phê duyệt) |
|---|---|---|
| **Phiên bản & Kênh** | Phiên bản 0.9.6 kênh `pilot` (cùng họ phiên bản `0.9.x` với `APP_VERSION = "0.9.0-pilot1"` trong `main.py`). | — |
| **Tệp bộ cài** | `VNOffice-Setup-0.9.6.exe` (và bí danh `Setup-0.9.6.exe`), dung lượng chính xác **526.479.307 byte** (~502 MB). | — |
| **Mã băm SHA-256** | `6387f9358327e442a6ba9c0367a2277a57b06d8b4b3cd9f37ffef9b228c46f11` (tính trực tiếp bằng `Get-FileHash` trên `E:\VNOffice-dist\VNOffice-Setup-0.9.6.exe`). | — |
| **Cổng tải công khai** | Nút tải trên trang `tai-ve.html` tạm thời bị khóa vô hiệu hóa. | **TODO-CONFIRM: Ngày mở tải công khai** khi máy chủ phân phối tệp hoàn tất triển khai. Hiện tại phân phối qua kho nội bộ `\\192.168.1.252\company1\Software\VNOffice`. |
| **Yêu cầu hệ thống** | Đo đạc từ ứng dụng: Windows 10/11 64-bit, Edge WebView2 Runtime, RAM tối thiểu 4 GB / khuyến nghị 8 GB, đĩa trống ~1.5 GB. | — |
| **Gói bản quyền** | 3 gói theo `docs/SPEC-3T-CLOUD.md`: Dùng thử 30 ngày, Gói vĩnh viễn (1 năm cập nhật), Gói thuê bao; thời hạn ngoại tuyến 30 ngày an toàn. | **TODO-CONFIRM: Mức giá chính thức** cho Gói vĩnh viễn và Gói thuê bao chưa được chủ quản công bố. |
| **Nhập khóa bản quyền** | Giao diện nhập key chưa có trong ứng dụng hiện hành. | Đã ghi chú minh bạch là **Sắp có (Giai đoạn 2 theo lộ trình 3T Cloud)**. |
| **Tên miền liên hệ** | `office.3tcomputer.com`, `3tcomputer.com`, `reader.3tcomputer.com`. | **TODO-CONFIRM: Địa chỉ văn phòng, số điện thoại hotline, email hỗ trợ kỹ thuật** chưa công bố. |
| **Tính năng ứng dụng** | Các tính năng gắn nhãn "Sẵn sàng" đều dựa trên test suites thật (multi-sheet, 96 hàm, ngắt mục NĐ 30, Slide Master, bút vẽ F5). | Các tính năng Morph, Macro, thu âm mic trực tiếp, biểu đồ Scatter/Radar gắn nhãn **Sắp có**. |

---

## 4. Danh sách Ảnh chụp màn hình thật (Desktop App Screenshots via CDP)

Theo đúng quy định, ảnh chụp được thực hiện tự động từ ứng dụng desktop thật qua **WebView2 Remote Debugging và giao thức CDP `Page.captureScreenshot`** (không dùng bất kỳ công cụ nhập liệu OS nào). Văn bản mẫu được nhập tự động bằng sự kiện CDP `Input.dispatchKeyEvent`:

| Ứng dụng | Tệp ảnh WebP | Tệp ảnh PNG | Dung lượng | Nội dung kiểm chứng thực tế |
|---|---|---|---|---|
| **3T Doc** | `assets/screenshots/doc-preview.webp` | `assets/screenshots/doc-preview.png` | 56.6 KB (WebP) / 89.7 KB (PNG) | Giao diện thanh Ribbon tiếng Việt chuẩn Word, thước đo lề, thanh cuộn, vùng soạn thảo trang A4 hiển thị văn bản kế hoạch tiếng Việt có dấu và kiểm tra chính tả. |
| **3T Sheet** | `assets/screenshots/sheet-preview.webp` | `assets/screenshots/sheet-preview.png` | 54.5 KB (WebP) / 79.4 KB (PNG) | Bảng tính với lưới ô, công thức `=B3-C3` tính toán doanh thu/lợi nhuận tự động, thanh công thức (Formula Bar) và thanh trạng thái tiếng Việt. |
| **3T Slide** | `assets/screenshots/slide-preview.webp` | `assets/screenshots/slide-preview.png` | 64.9 KB (WebP) / 97.9 KB (PNG) | Trang chiếu tỉ lệ 16:9 với tiêu đề và danh sách điểm nổi bật, khung dải phim slide thu nhỏ bên trái và thanh công cụ vẽ hình. |

*Toàn bộ 6 tệp ảnh đều nằm trong khoảng 54–98 KB, thấp hơn rất nhiều so với ngưỡng tối đa 250 KB.*

---

## 5. Danh sách Ảnh chụp kiểm chứng giao diện Headless (Web Proofs)

Đã render toàn bộ 9 trang web bằng Edge Headless (`--headless --hide-scrollbars`) tại 2 độ phân giải: **390 px** (di động) và **1280 px** (máy tính để bàn), lưu tại `docs/web-proof/`:

1. `docs/web-proof/index-1280.png` (177.8 KB)
2. `docs/web-proof/index-390.png` (65.3 KB)
3. `docs/web-proof/tinh-nang-1280.png` (89.4 KB)
4. `docs/web-proof/tinh-nang-390.png` (43.6 KB)
5. `docs/web-proof/tai-ve-1280.png` (91.8 KB)
6. `docs/web-proof/tai-ve-390.png` (42.8 KB)
7. `docs/web-proof/co-gi-moi-1280.png` (81.3 KB)
8. `docs/web-proof/co-gi-moi-390.png` (49.3 KB)
9. `docs/web-proof/huong-dan-1280.png` (109.0 KB)
10. `docs/web-proof/huong-dan-390.png` (44.5 KB)
11. `docs/web-proof/ban-quyen-1280.png` (100.6 KB)
12. `docs/web-proof/ban-quyen-390.png` (46.7 KB)
13. `docs/web-proof/lien-he-1280.png` (106.5 KB)
14. `docs/web-proof/lien-he-390.png` (43.0 KB)
15. `docs/web-proof/trang-thai-1280.png` (64.2 KB)
16. `docs/web-proof/trang-thai-390.png` (35.4 KB)
17. `docs/web-proof/404-1280.png` (63.8 KB)
18. `docs/web-proof/404-390.png` (34.8 KB)

*Kết quả thẩm định thị giác*: Bố cục cân đối, tỷ lệ chữ rõ ràng, thanh điều hướng co giãn linh hoạt, không bị vỡ khung hay tràn nội dung ngang ở độ phân giải 360–390 px.

---

## 6. Kết quả Kiểm thử Trung thực (Test Truthfulness)

### 6.1. Bộ kiểm thử tích hợp Master Runner (`tests/run-tests.js`)
Đã đăng ký Suite 169 (`tests/unit/3t-web.test.js`) vào bộ kiểm tra tự động chung của toàn bộ dự án.

- **Lệnh thực thi**: `node tests/run-tests.js`
- **Dòng kết quả chính xác**:
```text
==================================================
KẾT QUẢ KIỂM THỬ: 2646/2646 PASS | 0 FAIL
==================================================
Toàn bộ các bài kiểm tra đều đạt chuẩn chất lượng.
```

### 6.2. Bộ kiểm thử riêng Suite 169 (`scripts/test-web.mjs`)
- **Lệnh thực thi**: `node scripts/test-web.mjs`
- **Kết quả**:
```text
KET QUA 3T WEB: 397/397 PASS | 0 FAIL
```

### 6.3. Bộ kiểm thử Python Unittest (`tests/test_3t_web.py`)
- **Lệnh thực thi**: `python -m unittest tests/test_3t_web.py`
- **Kết quả tóm tắt chính xác**:
```text
......
----------------------------------------------------------------------
Ran 6 tests in 0.010s

OK
```

---

## 7. Trạng thái Git & Kết luận

- Nhánh: `feat/3t-web-agy`
- Đã tuân thủ nghiêm ngặt mọi quy tắc cấm:
  - Không sửa `server/3t-api/app.py` hay bất kỳ mã nguồn API nào.
  - Không sáp nhập vào `main`.
  - Không triển khai lên máy chủ khi chưa có lệnh.
  - Không có tiến trình chạy nền hay nhập liệu cấp hệ điều hành.
- Toàn bộ sản phẩm trang web tĩnh đã sẵn sàng để chủ quản dự án duyệt và tích hợp.
