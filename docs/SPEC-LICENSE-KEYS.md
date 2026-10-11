# Spec — Bản quyền bằng key vĩnh viễn + trang quản trị (3T Cloud, GĐ2)

Ngày: 03/10/2026 · Cập nhật theo chỉ đạo: **chỉ cấp key vĩnh viễn, không bán theo năm**. Giá = 0 (cấu hình phía máy chủ, chưa chốt).
Căn cứ: `docs/SPEC-3T-CLOUD.md` §4.2, cách 3T Reader làm (activate/validate/heartbeat/deactivate, token ký số, gắn thiết bị).

## 1. Quyết định đề xuất (kèm lý do)

| # | Quyết định | Lý do |
|---|---|---|
| 1 | **Một loại key: vĩnh viễn, nhận mọi bản cập nhật.** Trường `updates_until` để trống = không giới hạn; giữ sẵn trường này (không hiện trên giao diện) | Đúng chỉ đạo; nếu sau này muốn bán nâng cấp thì không phải đổi cấu trúc dữ liệu |
| 2 | Key gắn với **tối đa N máy** (mặc định 2, sửa được theo từng key) | Quy ước phổ biến; 3T Reader cũng giới hạn số máy |
| 3 | Kích hoạt **trực tuyến một lần**, sau đó **dùng ngoại tuyến**: token ký số có hạn kiểm tra lại 30 ngày; quá hạn mà không kiểm tra được thì **vẫn dùng bình thường thêm 30 ngày ân hạn**, rồi mới nhắc kết nối mạng | Ứng dụng ưu tiên chạy ngoại tuyến; không khóa người dùng thật chỉ vì mất mạng |
| 4 | **Kích hoạt ngoại tuyến** bằng mã: máy hiện *mã thiết bị*, quản trị viên nhập key + mã thiết bị trên trang quản trị, nhận *mã kích hoạt* gõ lại vào máy | Máy văn phòng không có Internet vẫn kích hoạt được |
| 5 | **Chưa nhập key**: dùng thử đầy đủ 30 ngày. Hết hạn: **mở và xem, in, xuất PDF được; chặn lưu/xuất định dạng Office** cho tới khi nhập key. (Người phụ trách chốt chính sách này — xem §6) | Không mất dữ liệu của người dùng; vẫn có động lực kích hoạt |
| 6 | Key chỉ hiển thị **một lần** khi tạo; máy chủ chỉ lưu **băm SHA-256 + 4 ký tự cuối**. Mất key → "cấp lại" (tạo key mới, thu hồi key cũ) | Lộ cơ sở dữ liệu cũng không lộ key |
| 7 | Token ký **Ed25519** (khóa riêng chỉ ở máy chủ), máy khách nhúng **danh sách khóa công khai** (hỗ trợ xoay khóa) | Giống 3T Reader; khác khóa RSA ký bản cập nhật để lộ một khóa không ảnh hưởng khóa kia |
| 8 | Định dạng key: `3TO-XXXXX-XXXXX-XXXXX-XXXXX` (Crockford base32, bỏ I/L/O/U; ký tự cuối là checksum) | Gõ tay ít nhầm; phát hiện gõ sai ngay trên máy không cần mạng |
| 9 | Không dùng bảo vệ nặng (làm rối mã, khóa phần cứng). Chỉ: token ký số, gắn thiết bị, thu hồi | Tương xứng rủi ro; tránh làm hỏng trải nghiệm người dùng thật |

## 2. API (tiền tố `/api/v1/license`, JSON, HTTPS)

Mọi trả lời lỗi có `{"error": "<mã>", "message": "<tiếng Việt>"}`. Giới hạn tốc độ theo IP + theo key (chống dò key).

### `POST /activate`
Vào: `{product:"3t-office", key, device_fingerprint, device_name, app_version, email?}`
`device_fingerprint` = SHA-256 của (GUID máy Windows + tên máy), máy khách tính; máy chủ không biết dữ liệu gốc.
Ra 200: `{token, license:{id, edition:"perpetual", seats_used, seats_max, updates_until:null}, next_check_at}`
Lỗi: `invalid_key` (sai định dạng/checksum), `unknown_key`, `revoked`, `seats_exhausted` (kèm danh sách tên máy đang dùng), `rate_limited`.
Kích hoạt lại cùng key + cùng máy: trả token mới, **không tốn thêm chỗ**.

### `POST /validate` (và `/heartbeat`, gộp một)
Vào: `{token}` (hoặc `{license_id, device_fingerprint}`) → Ra: token mới (gia hạn hạn kiểm tra) hoặc `revoked`/`device_removed`.

### `POST /deactivate`
Vào: `{token}` → giải phóng chỗ của máy này. Ra: `{ok:true}`.

### `POST /activate-offline`  *(chỉ trang quản trị gọi, xem §3)*
Vào: `{key, device_code}` (mã thiết bị do máy khách sinh: base32 của fingerprint + app_version, có checksum) → Ra: `{activation_code}` (token ký số dạng chuỗi ngắn, in/gõ được).

### Nội dung token (payload ký)
`{v:1, lid, edition, fp, issued_at, check_by, grace_days:30, updates_until:null, key_hint:"…ABCDE"}`
Ký Ed25519; máy khách kiểm bằng khóa công khai nhúng sẵn, **kiểm tra `fp` khớp máy hiện tại**, kiểm `check_by`.

### Cập nhật theo quyền
`GET /api/v1/updates/{product}/{channel}/latest` giữ công khai (bản vá chung). Quyền cập nhật = có token hợp lệ và `updates_until` trống hoặc >= ngày phát hành. Máy khách đã tự kiểm tra; máy chủ không cần chặn.

## 3. Trang quản trị (`/admin`, một trang web tĩnh + API `/api/v1/admin/*`)

Đăng nhập: tài khoản quản trị từ biến môi trường (đã có `ADMIN_USERNAME`/`ADMIN_PASSWORD`), cookie phiên `HttpOnly; Secure; SameSite=Strict`, CSRF token cho mọi thao tác ghi, khóa tạm sau 5 lần sai, nhật ký thao tác quản trị (ai/lúc nào/làm gì, không ghi key).

Màn hình (giao diện tiếng Việt, dùng chung giao diện/logo trang chủ, hiển thị tốt từ 360 px):
1. **Tổng quan**: số key đang dùng/đã thu hồi, số máy kích hoạt, kích hoạt 7 ngày qua, nhóm lỗi mới 24 giờ, phiên bản hiện hành mỗi kênh.
2. **Key**: bảng tìm/lọc; **Tạo key** (số lượng 1–500, ghi chú khách hàng, email, số máy tối đa) → hiện danh sách key **một lần** + nút tải CSV; chi tiết key (máy đã kích hoạt, ngày, tên máy, lần kiểm tra cuối); **Thu hồi**, **Cấp lại**, **Sửa số máy**, **Gỡ máy**.
3. **Kích hoạt ngoại tuyến**: nhập key + mã thiết bị → ra mã kích hoạt (nút sao chép).
4. **Báo lỗi**: nhóm theo chữ ký (API `GET /api/v1/admin/reports` đã có) — số lần, phiên bản, ứng dụng, lần đầu/gần nhất, xem 1 báo cáo (không có nội dung tài liệu).
5. **Phát hành**: phiên bản mỗi kênh, ngày, số tệp, bộ cài trên trang tải (tên, kích thước, SHA-256), nút kiểm tra đường tải.
6. **Nhật ký quản trị**.

## 4. Lưu trữ
SQLite hiện có (`/data`): bảng `license_keys(id, key_hash, key_hint, note, email, seats_max, status, created_at, revoked_at)`, `activations(id, license_id, device_hash, device_name, first_at, last_check_at, app_version, removed_at)`, `admin_audit(id, at, admin, action, target)`. Sao lưu cùng `/backups` hiện có. Khóa ký Ed25519: biến môi trường/tệp bí mật ngoài kho mã.

## 5. Phía ứng dụng (giai đoạn sau, giao Codex/Claude sau khi máy chủ ổn định)
- **Tệp ▸ Tài khoản và bản quyền** (Doc/Sheet/Slide đều có): trạng thái (đã kích hoạt / dùng thử còn N ngày / hết hạn dùng thử), nút **Nhập key**, **Kích hoạt ngoại tuyến**, **Gỡ kích hoạt**, số máy.
- Ô nhập key tự định dạng `3TO-…`, kiểm checksum ngay khi gõ (không cần mạng), thông báo lỗi tiếng Việt rõ ràng.
- Lưu token trong thư mục dữ liệu người dùng; kiểm tra chữ ký + `fp` khi mở app; nền kiểm tra lại theo `check_by`, không làm chậm khởi động, không chặn thao tác.
- Hết dùng thử: banner không che nội dung + khóa lưu/xuất Office như §1 #5.
- Hướng dẫn sử dụng tiếng Việt trong Trợ giúp (bắt buộc theo AGENTS.md §10).

## 6. Cần Người phụ trách chốt
1. Chính sách sau 30 ngày dùng thử (đề xuất §1 #5) — hay cho dùng đầy đủ không giới hạn?
2. Số máy mặc định mỗi key (đề xuất 2).
3. Có dùng chung hệ key với 3T Reader (một key mở cả hai) — hiện đề xuất tách riêng, thêm trường `product` để sau này gộp.
4. Giá: để 0 trong cấu hình; thay bằng giá thật khi chốt (không ảnh hưởng mã).
