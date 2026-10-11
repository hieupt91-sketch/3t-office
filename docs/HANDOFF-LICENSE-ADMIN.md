# Bàn giao: Máy chủ Bản quyền bằng Key Vĩnh viễn & Trang Quản trị (3T Office)

- **Người thực hiện:** agy
- **Nhánh (Branch):** `feat/license-admin-agy`
- **Thư mục làm việc (Worktree):** `E:\VNOffice-agy-license`
- **Căn cứ đặc tả:** `docs/SPEC-LICENSE-KEYS.md`

---

## 1. Nội dung đã làm
- **Module bản quyền (`server/3t-api/license.py`):**
  - Sinh mã key Crockford Base32 chuẩn CSPRNG (`secrets`), định dạng `3TO-XXXXX-XXXXX-XXXXX-XXXXX` (loại bỏ `I`, `L`, `O`, `U`, ký tự thứ 20 là checksum modulo 32 với trọng số lẻ).
  - Tự động chuẩn hóa lỗi gõ nhầm (`O` -> `0`, `I`/`L` -> `1`, chữ thường thành hoa, bỏ dấu gạch ngang).
  - Băm SHA-256 của key + lưu 4 ký tự cuối (`key_hint`). Database tuyệt đối không lưu key thô.
  - Ký và xác thực token bản quyền bằng **Ed25519** (`cryptography`). Token bị sửa 1 byte ở chữ ký hoặc nội dung đều bị từ chối 100%.
  - Khởi tạo schema SQLite: `license_keys`, `activations`, `admin_audit`.
- **Script sinh khóa (`scripts/gen-license-keypair.py`):**
  - Sinh cặp khóa Ed25519 bằng thư viện `cryptography`.
  - Khóa riêng ghi vào tệp chỉ định dạng base64 (chế độ bảo mật `0600`, **tuyệt đối không in ra màn hình**).
  - Khóa công khai in ra stdout dạng base64 để cấu hình cho client.
- **API bản quyền (`server/3t-api/app.py`):**
  - `POST /api/v1/license/activate`: Kích hoạt trực tuyến, cấp token ký Ed25519 hạn 30 ngày. Kích hoạt lại cùng máy không tốn thêm slot. Chặn khi hết chỗ (409) kèm danh sách tên máy đang dùng.
  - `POST /api/v1/license/validate`: Xác thực token hoặc cặp (license_id, fingerprint), gia hạn hạn kiểm tra 30 ngày tiếp theo.
  - `POST /api/v1/license/deactivate`: Gỡ kích hoạt thiết bị, giải phóng slot máy.
  - `POST /api/v1/admin/license/activate-offline`: Kích hoạt ngoại tuyến cho máy văn phòng không có mạng (yêu cầu quyền admin).
- **API quản trị (`/api/v1/admin/*`):**
  - `POST /api/v1/admin/login`: Đăng nhập bằng `ADMIN_USERNAME`/`ADMIN_PASSWORD`, so sánh hằng số thời gian `hmac.compare_digest`. Khóa tạm 15 phút sau 5 lần sai. Cấp cookie phiên `session_id` (`HttpOnly; Secure; SameSite=Strict`) và mã `csrf_token`.
  - `POST /api/v1/admin/logout`: Hủy phiên, xóa cookie.
  - `GET /api/v1/admin/me`: Kiểm tra phiên hiện hành.
  - `GET /api/v1/admin/overview`: Thống kê tổng key, key hoạt động, key thu hồi, thiết bị kích hoạt, lượt 7 ngày, nhóm lỗi 24h, phiên bản các kênh.
  - `GET /api/v1/admin/keys`: Tìm kiếm theo hint/email/note, lọc trạng thái, phân trang, hiển thị `seats_used` (không lộ key_hash).
  - `POST /api/v1/admin/keys`: Tạo từ 1 đến 500 key một lần duy nhất, trả danh sách key để tải CSV. Database chỉ lưu băm SHA-256.
  - `GET /api/v1/admin/keys/{id}`: Chi tiết key và danh sách máy đã kích hoạt.
  - `POST /api/v1/admin/keys/{id}/revoke`: Thu hồi key và hủy hiệu lực toàn bộ máy liên quan.
  - `POST /api/v1/admin/keys/{id}/reissue`: Thu hồi key cũ và cấp lại key mới cùng cấu hình (trả key mới một lần).
  - `POST /api/v1/admin/keys/{id}/seats`: Cập nhật số máy tối đa (1-100).
  - `POST /api/v1/admin/keys/{id}/devices/{device_id}/remove`: Gỡ máy khỏi key.
  - `GET /api/v1/admin/reports`: Tận dụng API báo cáo sự cố đã có.
  - `GET /api/v1/admin/releases`: Danh sách kênh phát hành và bộ cài trong `/downloads` kèm SHA-256.
  - `GET /api/v1/admin/audit`: Danh sách nhật ký thao tác quản trị (không ghi key, token hay mật khẩu).
- **Giao diện trang quản trị (`server/3t-web/admin/`):**
  - HTML/CSS/JS thuần, không dùng bất kỳ framework nào.
  - Giao diện tiếng Việt 100%, dùng chung logo và nhận diện thương hiệu trang chủ.
  - Không chứa từ cấm hãng khác (Microsoft, Word, Excel, PowerPoint, Office 365, MS Office).
  - Đáp ứng màn hình hoàn hảo từ 360 px trở lên (không tràn ngang).
  - Các màn hình: Đăng nhập, Tổng quan, Quản lý Key (kèm xuất CSV), Kích hoạt ngoại tuyến (sao chép mã), Báo lỗi, Phát hành & Bộ cài, Nhật ký quản trị.
- **Ảnh chụp màn hình quản trị:**
  - Đã chụp đầy đủ 7 màn hình bằng script `scripts/capture-admin-screens.mjs` (CDP headless) lưu tại `docs/screens-admin/*.png`:
    - `01-admin-login.png`: Màn hình Đăng nhập
    - `02-admin-overview.png`: Màn hình Tổng quan
    - `03-admin-keys.png`: Màn hình Quản lý Key
    - `04-admin-offline.png`: Màn hình Kích hoạt ngoại tuyến
    - `05-admin-reports.png`: Màn hình Báo cáo lỗi
    - `06-admin-releases.png`: Màn hình Kênh phát hành & Bộ cài
    - `07-admin-audit.png`: Màn hình Nhật ký quản trị

---

## 2. Nội dung chưa làm
- Tích hợp giao diện "Tài khoản và bản quyền" trên ứng dụng desktop máy khách (Doc/Sheet/Slide) — theo đặc tả §5, việc này sẽ giao cho các agent client (Codex/Claude) ở giai đoạn tiếp theo sau khi máy chủ ổn định.

---

## 3. Kết quả kiểm thử thực tế (Test Results)
- **Pytest (`server/3t-api/tests`):**
  - `26/26 passed` (100% đạt, thời gian: ~1.69s).
  - Bao phủ toàn diện: sinh key, checksum Crockford base32, sửa 1 ký tự, sửa 1 byte token Ed25519 (chữ ký & payload), fingerprint, activate, activate cùng máy không tốn chỗ, activate hết chỗ (409), validate, heartbeat, deactivate, activate-offline, rate limiting IP & key, admin 401 khi chưa login, CSRF 403 khi thiếu/sai token, tạo key trả 1 lần & DB trực tiếp không chứa key gốc, cấp lại thu hồi key cũ, sửa số máy, gỡ máy, kiểm tra admin API đóng khi ADMIN_PASSWORD rỗng.
- **Node.js Web Unit Tests (`node tests/unit/3t-web.test.js`):**
  - `447/447 passed` (100% đạt).
  - Kiểm tra toàn bộ website tĩnh và trang admin: không có từ cấm hãng khác (Microsoft/Word/Excel), lang="vi", duy nhất 1 thẻ h1, internal links và tài nguyên hợp lệ.
- **Node.js Layout Matrix Tests (`node scripts/test-web-layout.mjs`):**
  - `40/40 layout checks passed` (100% đạt).
  - Toàn bộ 10 trang HTML (bao gồm `admin/index.html`) đạt chuẩn ở tất cả 4 độ rộng: 360 px, 390 px, 768 px, 1280 px. Không có phần tử nào tràn viền (`scrollWidth <= innerWidth`).

---

## 4. Cách chạy thử cục bộ
1. **Sinh cặp khóa ký bản quyền Ed25519:**
   ```powershell
   python scripts/gen-license-keypair.py -o test_private.key -f
   ```
2. **Khởi chạy máy chủ API và Website tĩnh:**
   ```powershell
   $env:LICENSE_SIGNING_KEY_FILE = "test_private.key"
   $env:ADMIN_USERNAME = "admin"
   $env:ADMIN_PASSWORD = "secretpassword123"
   $env:INSTALL_TOKEN_SECRET = "01234567890123456789012345678901"
   $env:WEB_DIR = "server/3t-web"
   $env:DATA_DIR = "server/3t-api/data"
   $env:UPDATES_DIR = "server/3t-api/updates"
   $env:REPORTS_DIR = "server/3t-api/reports"
   $env:BACKUPS_DIR = "server/3t-api/backups"
   python -m uvicorn app:app --app-dir server/3t-api --port 8000
   ```
3. **Mở trình duyệt truy cập trang quản trị:**
   - URL: `http://localhost:8000/admin/index.html`
   - Đăng nhập với: Tài khoản: `admin` / Mật khẩu: `secretpassword123`
4. **Chụp lại toàn bộ ảnh màn hình qua CDP:**
   ```powershell
   node scripts/capture-admin-screens.mjs
   ```
