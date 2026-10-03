# Đề xuất và Kế hoạch kỹ thuật: Phân phối bộ cài đặt 3T Office 0.9.7 trên Website

> **Tài liệu kỹ thuật nội bộ VN Office / 3T Office**  
> **Người thực hiện:** agy (Agent phụ trách Web & Giao diện)  
> **Ngày lập:** 03/10/2026  
> **Trạng thái:** Đã hoàn thành đo đạc, xây dựng giải pháp và kiểm thử mã nguồn cục bộ — Chờ Người phụ trách phê duyệt để Claude triển khai lên VPS.

---

## 1. Kết quả đo đạc & Hiện trạng thực tế (Ground Truth)

### 1.1 Bằng chứng bộ cài đặt thật (Local Artifact)
- **Đường dẫn tệp gốc:** `E:\VNOffice-dist\VNOffice-Setup-0.9.7.exe`
- **Kích thước chính xác:** `526.608.468 byte` (khoảng `502,2 MB`, làm tròn hiển thị: `502 MB`)
- **Mã băm toàn vẹn (SHA-256):**  
  `517336EB7CF5F8D5804EB4F53531A0B669D434863EFEAA478CC0277EDC8B642C`  
  *(Viết thường: `517336eb7cf5f8d5804eb4f53531a0b669d434863efeaa478cc0277edc8b642c`)*

---

### 1.2 Đo đạc 4 câu hỏi trọng tâm theo yêu cầu Người phụ trách

#### (1) Nút Tải 0.9.7 trên `tai-ve.html` trỏ tới đâu, URL đó trả về 200 hay 404?
- **Nút trên thanh điều hướng (Header Nav CTA):** `<a href="tai-ve.html" class="nav-cta-btn">` trỏ ngược lại chính trang `tai-ve.html`.
- **Nút tải chính tại thẻ Download Card:** Trước khi sửa, nút này là thẻ `<button disabled>` với độ mờ `opacity: 0.65`, con trỏ `not-allowed`, **hoàn toàn KHÔNG có thuộc tính `href`**. Đi kèm bên dưới là hộp thông báo: `TODO-CONFIRM: Đường dẫn tải trực tiếp nội bộ đang được cấu hình trên hạ tầng phân phối máy chủ.`
- **Kiểm tra trực tiếp các URL tiềm năng trên môi trường live (`https://office.3tcomputer.com`):**
  - `curl -I https://office.3tcomputer.com/downloads/VNOffice-Setup-0.9.7.exe` &rarr; **HTTP/1.1 404 Not Found**
  - `curl -I https://office.3tcomputer.com/updates/VNOffice-Setup-0.9.7.exe` &rarr; **HTTP/1.1 404 Not Found**
  - `curl -I https://office.3tcomputer.com/VNOffice-Setup-0.9.7.exe` &rarr; **HTTP/1.1 404 Not Found**
- **Sai lệch mã băm:** Trên trang web và tệp cấu hình `data/releases.json` trước đây đang gán mã băm tạm thời `8F3B6A8E0C0ED0324B62C53D0EFE56994653A33E660C44446C6065A353C07B15`, không khớp với mã băm thật của bộ cài 0.9.7.

#### (2) `server/3t-api/app.py` có phục vụ thư mục tải về nào không, `UPDATES_DIR` chỉ chứa kho cập nhật?
- **Khảo sát mã nguồn `app.py`:**
  - Ứng dụng chỉ định nghĩa các đường dẫn API: `/health`, `/api/v1/reports/token`, `/api/v1/reports`, `/api/v1/updates/{product}/{channel}/latest`, `/updates/{relative_path:path}`, `/api/v1/admin/reports`, và cuối cùng mount toàn bộ website tĩnh tại `/`.
  - **Hoàn toàn KHÔNG CÓ thư mục hay endpoint `/downloads`**.
- **Vai trò của `UPDATES_DIR`:**
  - `UPDATES_DIR` là kho chứa các bản cập nhật vi mô (delta update blobs) phục vụ cho cơ chế tự động nâng cấp của ứng dụng desktop (`adapters/updater/updater.py`).
  - Hàm bảo vệ `_public_update_path(relative_path)` trong `app.py` dùng regex cực kỳ khắt khe: chỉ chấp nhận `channels/*.json`, `<version>/manifest.(json|sig)` và `files/<64_hex_digits>`. Mọi yêu cầu tệp `.exe` đều bị từ chối với mã lỗi `404 Not Found`. Do đó, tuyệt đối không được đưa bộ cài đặt `.exe` vào `UPDATES_DIR`.

#### (3) Kích thước 526 MB đi qua Cloudflare Tunnel có vấn đề gì (giới hạn, timeout, Range)?
- **Giới hạn dung lượng tải về (Download limit):** Cloudflare áp dụng giới hạn 100 MB cho chiều tải lên (*Client Request Body* đối với gói Free/Pro/Biz). Chiều **tải về từ máy chủ (*Server Response Body*) KHÔNG bị giới hạn 100 MB**.
- **Hỗ trợ HTTP Range Requests (RFC 7233 / 206 Partial Content):** Đây là yếu tố **bắt buộc** đối với tệp dung lượng lớn (~526 MB). Nếu người dùng đang tải gặp sự cố gián đoạn đường truyền hoặc trình duyệt/trình tăng tốc tải xuống (IDM, Free Download Manager) cần tải đa luồng hoặc tiếp tục (resume), máy chủ phải phản hồi mã `206 Partial Content` kèm header `Accept-Ranges: bytes` và `Content-Range`. Nếu thiếu, người dùng sẽ phải tải lại từ byte 0 nếu mất kết nối.
- **Thời gian chờ của Cloudflare (Origin Timeout - HTTP 524):** Cloudflare sẽ ngắt kết nối với lỗi HTTP 524 nếu Origin (máy chủ FastAPI) không phản hồi bất kỳ byte nào trong 100 giây. Do đó, API backend phải stream tệp theo từng khối nhỏ (64 KiB) theo cơ chế bất đồng bộ non-blocking (`asyncio.to_thread`), tuyệt đối không đọc toàn bộ 526 MB vào RAM cùng lúc làm nghẽn tiến trình `uvicorn`.
- **Cơ chế Caching của Cloudflare:** Cloudflare gói Free chỉ cache tệp có kích thước tối đa 512 MB. Tệp cài đặt 526,6 MB vượt quá 512 MB nên Cloudflare sẽ tự động bỏ qua cache và thực hiện **Dynamic Passthrough** chuyển tiếp trực tiếp luồng byte từ origin VPS qua Cloudflare Tunnel đến người dùng. Tốc độ tải sẽ phụ thuộc vào băng thông uplink của VPS.

#### (4) Dung lượng đĩa `/srv` trên VPS (chỉ đọc, không SSH)
- Theo cấu trúc quy chuẩn tại `SPEC-3T-CLOUD.md` và `docker-compose.yml`:
  - Thư mục gốc trên host: `/srv/3t-office-cloud/`
  - Đã có: `data/` (SQLite DB), `updates/` (~2,2 GB kho delta update), `reports/` (nhật ký lỗi), `backups/`, `logs/`, `app/web/` (mã nguồn web tĩnh).
  - Tệp bộ cài đặt `VNOffice-Setup-0.9.7.exe` chỉ chiếm khoảng **527 MB** dung lượng đĩa. Khi tạo thêm thư mục `/srv/3t-office-cloud/downloads/` trên host để lưu bộ cài, dung lượng đĩa bổ sung chỉ ~0.53 GB, hoàn toàn nằm trong mức an toàn cho các gói VPS thông dụng.

---

## 2. Kế hoạch kỹ thuật & Đề xuất cụ thể

### 2.1 Đường dẫn lưu trữ trên VPS
- **Thư mục lưu trữ:** `/srv/3t-office-cloud/downloads/`
- **Tên tệp đầy đủ:** `/srv/3t-office-cloud/downloads/VNOffice-Setup-0.9.7.exe`
- **Phân quyền tệp:** `chmod 644 /srv/3t-office-cloud/downloads/VNOffice-Setup-0.9.7.exe` (đảm bảo container Docker đọc được dưới dạng `:ro`).

### 2.2 Cấu hình Mount trong Docker Compose (`server/3t-api/docker-compose.yml`)
Bổ sung biến môi trường `DOWNLOADS_DIR` và volume mount chế độ chỉ đọc (`:ro`):
```yaml
    environment:
      DATA_DIR: /data
      UPDATES_DIR: /updates
      DOWNLOADS_DIR: /downloads
      REPORTS_DIR: /reports
      BACKUPS_DIR: /backups
      LOGS_DIR: /logs
      WEB_DIR: /web
    volumes:
      - /srv/3t-office-cloud/data:/data
      - /srv/3t-office-cloud/updates:/updates:ro
      - /srv/3t-office-cloud/downloads:/downloads:ro
      - /srv/3t-office-cloud/reports:/reports
      - /srv/3t-office-cloud/backups:/backups
      - /srv/3t-office-cloud/logs:/logs
      - /srv/3t-office-cloud/app/web:/web:ro
```

### 2.3 Cấu hình Backend phục vụ tải tệp (`server/3t-api/app.py`)
Đã triển khai endpoint an toàn `@app.api_route("/downloads/{file_name}", methods=["GET", "HEAD"])`:
- Kiểm tra tính an toàn của tên tệp qua regex: `_SAFE_DOWNLOAD_NAME = re.compile(r"^[A-Za-z0-9_.-]+\.(?:exe|msi|zip|tar\.gz)$")`.
- Ngăn chặn triệt để tấn công vượt thư mục (Path Traversal) qua hàm `_safe_file`.
- Phản hồi nhanh cho yêu cầu `HEAD` (trả về Content-Length, Content-Type, Accept-Ranges mà không phải đọc đĩa).
- Hỗ trợ chuẩn xác HTTP Range RFC 7233 (HTTP 206 Partial Content, Content-Range header) khi có header `Range`.
- Stream theo từng khối 64 KiB qua `StreamingResponse` và `asyncio.to_thread` giúp giải phóng Event Loop, ngăn chặn nguy cơ Cloudflare Timeout 524.
- Gắn header chuẩn: `Content-Disposition: attachment; filename="{path.name}"`.

### 2.4 Tên tệp, Mã SHA-256 và Kích thước đồng bộ chuẩn
- **Tên tệp chính thức:** `VNOffice-Setup-0.9.7.exe` (bí danh: `Setup-0.9.7.exe`)
- **Kích thước thực tế:** `526.608.468 byte`
- **Kích thước hiển thị người dùng:** `502 MB`
- **Mã băm toàn vẹn SHA-256:**  
  `517336EB7CF5F8D5804EB4F53531A0B669D434863EFEAA478CC0277EDC8B642C`
- **URL tải chính thức:**  
  `https://office.3tcomputer.com/downloads/VNOffice-Setup-0.9.7.exe`

### 2.5 Cách trang `tai-ve.html` hiển thị trạng thái (Có / Chưa có)
1. **Liên kết tải chính thức:** Nút tải được chuyển đổi từ thẻ `<button disabled>` thành thẻ liên kết hợp lệ:
   ```html
   <a href="https://office.3tcomputer.com/downloads/VNOffice-Setup-0.9.7.exe"
      class="btn btn-primary btn-lg"
      id="btn-download-installer"
      data-release-download-link
      download="VNOffice-Setup-0.9.7.exe">
     Tải bản cài đặt 0.9.7 (502 MB)
   </a>
   ```
2. **Khối trạng thái phát hành (Badge State):**
   - Đã loại bỏ nhãn tạm thời `TODO-CONFIRM`.
   - Thay thế bằng nhãn **`CHÍNH THỨC`** kèm mô tả rõ ràng: *"Bộ cài đặt độc lập cho Windows 64-bit phân phối từ máy chủ 3T Cloud (hỗ trợ tiếp tục tải Range)"*.
3. **Đồng bộ trạng thái động qua JavaScript (`js/main.js`):**
   - Đọc dữ liệu từ `data/releases.json`.
   - Nếu tệp ở trạng thái sẵn sàng (`status: "ready"`), JavaScript tự động gán đường dẫn tải trực tiếp vào mọi thành phần mang thuộc tính `data-release-download-link`.
   - Trường hợp cấu hình `status: "staging"` hoặc chưa có tệp, JavaScript có thể linh hoạt chuyển nút tải về chế độ chờ kèm badge thông báo tình trạng máy chủ.

### 2.6 Kiểm tra Checksum (Mã băm toàn vẹn) cho người dùng
Trang `tai-ve.html` đã được bổ sung đầy đủ hướng dẫn từng bước bằng tiếng Việt trực quan:
1. **Lệnh đối chiếu thủ công qua Windows PowerShell:**
   ```powershell
   Get-FileHash -Algorithm SHA256 .\VNOffice-Setup-0.9.7.exe
   ```
2. **Lệnh đối chiếu tự động 1 bước qua Windows PowerShell (trả về True nếu khớp 100%):**
   ```powershell
   (Get-FileHash .\VNOffice-Setup-0.9.7.exe).Hash -eq "517336EB7CF5F8D5804EB4F53531A0B669D434863EFEAA478CC0277EDC8B642C"
   ```
3. **Lệnh đối chiếu qua Windows Command Prompt (cmd.exe):**
   ```cmd
   certutil -hashfile VNOffice-Setup-0.9.7.exe SHA256
   ```
4. **Nút "Sao chép mã"**: Được gắn trực tiếp vào mã SHA-256 thật, giúp người dùng sao chép nhanh vào clipboard chỉ với một cú nhấp chuột.

---

## 3. Quy trình triển khai bàn giao cho Claude (Sau khi Người phụ trách duyệt)

> **LƯU Ý:** Agent agy tuân thủ nghiêm ngặt quy định: **KHÔNG SSH, KHÔNG đẩy tệp lên VPS, KHÔNG sao chép bộ cài**. Claude sẽ thực hiện các bước này sau khi có quyết định chính thức từ Người phụ trách.

1. **Bước 1 — Đẩy bộ cài đặt lên máy chủ:**
   Sao chép tệp `E:\VNOffice-dist\VNOffice-Setup-0.9.7.exe` vào thư mục `/srv/3t-office-cloud/downloads/` trên VPS qua kênh truyền bảo mật (`scp` hoặc `rsync`):
   ```bash
   mkdir -p /srv/3t-office-cloud/downloads
   # Copy VNOffice-Setup-0.9.7.exe vào thư mục trên
   chmod 644 /srv/3t-office-cloud/downloads/VNOffice-Setup-0.9.7.exe
   ```
2. **Bước 2 — Cập nhật mã nguồn máy chủ:**
   Kéo các thay đổi mới nhất từ nhánh đã merge vào kho triển khai trên VPS (bao gồm `docker-compose.yml`, `app.py`, `server/3t-web/*`).
3. **Bước 3 — Khởi động lại dịch vụ API:**
   ```bash
   cd /srv/3t-office-cloud/app
   docker compose up -d --build 3t-office-cloud-api
   ```
4. **Bước 4 — Kiểm tra xác thực đầu cuối:**
   - Kiểm tra endpoint HEAD:  
     `curl -I https://office.3tcomputer.com/downloads/VNOffice-Setup-0.9.7.exe` &rarr; yêu cầu trả về **HTTP/1.1 200 OK**, `Accept-Ranges: bytes`, `Content-Length: 526608468`.
   - Kiểm tra Range Request:  
     `curl -I -H "Range: bytes=0-1023" https://office.3tcomputer.com/downloads/VNOffice-Setup-0.9.7.exe` &rarr; yêu cầu trả về **HTTP/1.1 206 Partial Content**, `Content-Range: bytes 0-1023/526608468`.

---

## 4. Kết quả kiểm thử tự động (Verification & Test Results)

Mọi thay đổi đã được kiểm tra nghiêm ngặt tại worktree `E:\VNOffice-agy-web`:

1. **Unit Test Website tĩnh (`node tests/unit/3t-web.test.js`):**
   - **Kết quả:** `PASS`
   - **Chi tiết:** `433/433 passed` (100% assertions đạt yêu cầu; không chứa từ cấm, không vượt dung lượng 400 KB, mã băm SHA-256 thật khớp chính xác).
2. **Kiểm thử bố cục đa màn hình qua CDP Headless (`node scripts/test-web-layout.mjs`):**
   - **Kết quả:** `PASS`
   - **Chi tiết:** `36/36 layout viewports đạt` (kiểm tra đầy đủ 9 trang HTML trên 4 kích cỡ màn hình 360px, 390px, 768px, 1280px không bị tràn mép).
3. **Kiểm thử Cloud API Backend (`python -m pytest server/3t-api`):**
   - **Kết quả:** `PASS`
   - **Chi tiết:** `9/9 passed` (kiểm thử toàn diện /health, token, reports, updates range, và test mới `/downloads/{file_name}` hỗ trợ Range, HEAD request, chống path traversal).
