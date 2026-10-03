# Spec — Quản trị, bán hàng và cấp key tự động cho 3T Office (từ thanh toán đến kích hoạt)

Ngày: 03/10/2026 · Người phụ trách yêu cầu: "xây dựng trang admin chặt chẽ… từ thanh toán đến cấp key tự động, liên kết kỹ càng từ ứng dụng đến web và trang quản trị".
Căn cứ: `docs/SPEC-3T-CLOUD.md`, `docs/SPEC-LICENSE-KEYS.md` (key vĩnh viễn), máy chủ hiện có `server/3t-api` (đã triển khai: API cập nhật, báo lỗi, tải bộ cài, API key + trang quản trị cơ bản). Máy chủ phải **dùng chung cho Windows hiện tại và macOS / iOS / Android về sau** (trường `platform` ở mọi nơi).

## 0. Nguyên tắc
1. **Một nguồn sự thật**: mọi thứ (đơn hàng, thanh toán, key, thiết bị, phiên bản, lỗi) nằm trong cơ sở dữ liệu máy chủ; web, trang quản trị và ứng dụng chỉ là ba cách nhìn vào cùng dữ liệu đó.
2. **Không bao giờ cấp key khi chưa chắc đã thu tiền**, và **không bao giờ cấp trùng** (idempotent): một thanh toán chỉ sinh đúng một lần cấp key dù webhook gửi lặp.
3. **Không lưu dữ liệu thẻ**; không lưu key dạng đọc được (chỉ băm + 4 ký tự cuối; key chỉ hiện đúng một lần cho khách và gửi qua email).
4. **Giá để cấu hình** (hiện 0 — chưa chốt); đổi giá không cần sửa mã. Đơn giá 0 vẫn đi đủ luồng (để thử toàn bộ hệ thống không cần tiền thật).
5. Mọi thao tác nhạy cảm của quản trị viên có **nhật ký kiểm toán** (ai/khi nào/làm gì/đối tượng; không ghi key, mật khẩu, token).
6. Ứng dụng **vẫn dùng được ngoại tuyến** (key đã kích hoạt không cần mạng 30 ngày + 30 ngày ân hạn); máy chủ chỉ cần khi kích hoạt, kiểm tra định kỳ, cập nhật, báo lỗi.
7. Tiếng Việt toàn bộ giao diện và email; không nhắc tên sản phẩm của hãng khác.

## 1. Các bên và luồng tổng thể

```
Khách ──(1) web: chọn gói, nhập thông tin──► ĐƠN HÀNG (pending)
   │                                           │ (2) hiển thị mã QR chuyển khoản / cổng thanh toán
   │                                           ▼
   │                     NHÀ CUNG CẤP THANH TOÁN ──(3) webhook có chữ ký──► THANH TOÁN (paid)
   │                                           │ (4) đối soát: số tiền, mã đơn, trạng thái
   │                                           ▼
   │                          CẤP KEY TỰ ĐỘNG (idempotent) ──(5) email: key + link cổng khách hàng
   ▼                                           │
Ứng dụng ──(6) Nhập key → /license/activate ◄──┘        Quản trị viên: thấy mọi thứ ở mục Đơn hàng/Key/Thiết bị
Cổng khách hàng: xem đơn, key (che), thiết bị, gỡ máy, kích hoạt ngoại tuyến, tải bộ cài, hóa đơn
```

Trạng thái đơn: `draft → pending_payment → paid → fulfilled` ; nhánh: `expired` (quá hạn thanh toán), `cancelled`, `refunded`, `failed`.
Trạng thái thanh toán: `created → pending → succeeded | failed | expired`, `refunded`.

## 2. Mô hình dữ liệu (SQLite hiện có, thêm bảng; mọi bảng có `created_at`, `updated_at`)

| Bảng | Trường chính |
|---|---|
| `customers` | id, email (unique, chữ thường), full_name, phone, company_name, tax_code (MST), address, created_at, email_verified_at |
| `products` | id (`3t-office`), name, active |
| `plans` | id, product_id, code (`perpetual`), name, price_vnd (mặc định 0), seats_default, platforms (`windows`,`macos`…), active |
| `orders` | id, code (ngắn, đọc được, vd `3T-240903-A7K2`), customer_id, plan_id, quantity, seats_per_key, amount_vnd, discount_vnd, status, note, expires_at, source (`web`/`admin`/`apple_iap`/`google_play`), created_at |
| `payments` | id, order_id, provider (`bank_transfer`,`vnpay`,`momo`,`manual`,`free`), provider_ref (unique theo provider), amount_vnd, currency, status, raw_event_id, paid_at, reconciled_by |
| `payment_events` | id, provider, event_id (unique), received_at, signature_ok, payload_json (đã loại dữ liệu nhạy cảm), processed_at, result |
| `license_keys` | (đã có) + order_id, customer_id, source, plan_id, platforms |
| `activations` | (đã có, có `platform`) |
| `invoices` | id, order_id, number, status (`none`,`requested`,`issued`), buyer_name, buyer_tax_code, buyer_address, issued_at, external_ref, pdf_path |
| `email_outbox` | id, to_email, template, payload_json, status (`queued`,`sent`,`failed`), attempts, last_error, scheduled_at, sent_at |
| `admin_users` | id, username, password_hash (argon2/scrypt), role (`owner`,`support`,`viewer`), totp_secret_enc, active, last_login_at |
| `admin_audit` | (đã có) mở rộng: ip, user_agent, result |
| `portal_sessions` / `login_codes` | email, code_hash, expires_at, attempts (đăng nhập cổng khách hàng bằng mã gửi email, không mật khẩu) |

Ràng buộc: `payments(provider, provider_ref)` unique; `payment_events(provider, event_id)` unique; một đơn chỉ có tối đa một thanh toán `succeeded`; số key cấp = `quantity`.

## 3. API công khai (web/cổng khách hàng/ứng dụng) — tiền tố `/api/v1`

| Phương thức | Đường dẫn | Mục đích |
|---|---|---|
| GET | `/shop/plans` | Danh sách gói đang bán (tên, giá, số máy, nền tảng) |
| POST | `/shop/orders` | Tạo đơn `{plan, quantity, customer:{email,name,phone,company?,tax_code?,address?}, want_invoice?}` → `{order_code, amount, payment:{method, qr_url, transfer_content, bank_account, expires_at}}`; giá 0 → thanh toán tự hoàn tất |
| GET | `/shop/orders/{code}` | Trạng thái đơn (không lộ key); web hỏi lại mỗi 3–5 giây |
| POST | `/payments/webhook/{provider}` | Webhook nhà cung cấp: kiểm chữ ký, ghi `payment_events`, idempotent, đối soát số tiền + mã đơn, đánh dấu paid, **cấp key tự động**, xếp email |
| POST | `/portal/login` / `/portal/verify` | Gửi mã 6 số qua email / đổi mã lấy phiên (hết hạn 30 phút, tối đa 5 lần thử, giới hạn tốc độ) |
| GET | `/portal/me`, `/portal/orders`, `/portal/licenses`, `/portal/devices` | Dữ liệu của chính khách |
| POST | `/portal/licenses/{id}/reissue` | Cấp lại key (thu hồi key cũ, tạo key mới, gửi email) — giới hạn số lần |
| POST | `/portal/devices/{id}/remove` | Gỡ một máy khỏi key |
| POST | `/portal/offline-activation` | Nhập key + mã thiết bị → mã kích hoạt ngoại tuyến (cho máy không có mạng) |
| POST | `/license/activate`, `/validate`, `/deactivate` | (đã có) ứng dụng |
| GET | `/license/status` | (mới) ứng dụng hỏi: key còn hiệu lực? thu hồi? số máy? có bản cập nhật hợp lệ? |

Mọi API: giới hạn tốc độ theo IP + theo đối tượng, kiểm đầu vào chặt (độ dài/kiểu/mẫu), trả lỗi `{"error","message"}` tiếng Việt, không lộ chi tiết nội bộ.

## 4. Thanh toán — kiến trúc "bộ chuyển đổi" (provider adapter)

Giao diện chung: `create_payment(order) → hướng dẫn thanh toán`, `verify_webhook(request) → event đã xác thực`, `reconcile(event) → payment`. Mỗi nhà cung cấp một bộ chuyển đổi, đặt trong `server/3t-api/payments/`.

Triển khai theo giai đoạn (xem §9):
1. **`free`** (giá 0): đơn tự hoàn tất, dùng để thử toàn bộ luồng và cấp key thử/khuyến mãi.
2. **`bank_transfer` + webhook đối soát tự động**: sinh mã QR chuyển khoản chuẩn VietQR với nội dung `<mã đơn>`; nhận webhook của dịch vụ đối soát ngân hàng (SePay/Casso hoặc tương đương) hoặc nhập tay trên trang quản trị. **Chọn nhà cung cấp là quyết định của Người phụ trách** (xem §10) — bộ chuyển đổi viết theo hợp đồng chung nên đổi nhà cung cấp chỉ là thêm một lớp mỏng.
3. **`vnpay` / `momo`** (cổng thẻ/ví): chỉ làm sau khi chọn; khung và test dùng sandbox giả lập.
4. **`manual`**: quản trị viên đánh dấu "đã thu tiền" kèm lý do + ảnh/ghi chú; bắt buộc quyền `owner`, ghi nhật ký.

Đối soát an toàn: khớp **mã đơn trong nội dung chuyển khoản**, **số tiền đúng hoặc dư**, **chưa hết hạn**; thiếu tiền → đơn ở `pending_payment` + cảnh báo; dư tiền → cấp key và ghi chú hoàn lại; tiền về nhưng không khớp đơn nào → vào hàng đợi **"Giao dịch chưa khớp"** để quản trị viên xử lý. Webhook trùng (cùng `event_id`) → bỏ qua, trả 200.

## 5. Cấp key tự động (fulfillment)
- Chạy trong **một giao dịch cơ sở dữ liệu**: khóa đơn → kiểm trạng thái `paid` và chưa `fulfilled` → sinh `quantity` key bằng `generate_license_key()` → ghi `license_keys` (băm + gợi ý) → đặt đơn `fulfilled` → ghi email vào `email_outbox`. Lỗi giữa chừng → rollback, thử lại được.
- Key rõ chỉ có trong **bộ nhớ khi cấp** và trong email gửi khách (mẫu email có key + hướng dẫn 3 bước + link cổng khách hàng). Không lưu key rõ vào cơ sở dữ liệu, nhật ký hay bảng outbox (outbox lưu mẫu và tham số đã được mã hóa/hoặc key hiển thị một lần qua link dùng một lần hết hạn 48 giờ — chọn một cách và ghi rõ trong tài liệu).
- Hoàn tiền / hủy: thu hồi tất cả key của đơn (kèm lý do), thiết bị đã kích hoạt nhận trạng thái thu hồi ở lần kiểm tra kế tiếp; cấu hình được "ân hạn" theo chính sách.
- Cấp thủ công (khuyến mãi, thử nghiệm, đối tác): quản trị viên tạo đơn `source=admin`, giá 0, có lý do bắt buộc.

## 6. Liên kết ứng dụng ↔ web ↔ trang quản trị (bắt buộc, có test)

| Từ | Đến | Cách nối |
|---|---|---|
| Ứng dụng: nút "Mua bản quyền" / "Quản lý tài khoản" | Web `/ban-quyen` và cổng khách hàng | Mở trình duyệt mặc định, kèm `?src=app&platform=windows&version=…` |
| Ứng dụng: "Nhập key" | `/license/activate` | Kiểm checksum cục bộ trước; lỗi hiển thị tiếng Việt (hết máy, đã thu hồi…) kèm nút "Quản lý máy" mở cổng khách hàng |
| Ứng dụng: "Kích hoạt ngoại tuyến" | Cổng khách hàng `/portal/offline-activation` hoặc quản trị viên | Hiện mã thiết bị; khách dán vào cổng/gửi cho quản trị |
| Web: trang tải về | Kho phát hành | Phiên bản, dung lượng, SHA-256, ghi chú **tự lấy** từ kho cập nhật + `releases` (không sửa tay) |
| Web `/ban-quyen` | Mua hàng / cổng khách hàng | Bảng giá từ `/shop/plans`, nút mua, liên hệ |
| Quản trị: Đơn hàng ↔ Key ↔ Thiết bị ↔ Khách hàng | Nhau | Từ một đơn bấm sang key, thiết bị, hóa đơn; từ thiết bị bấm sang key và khách |
| Quản trị: Phát hành | Kho cập nhật + bộ cài | Xem phiên bản mỗi nền tảng/kênh, kiểm tra đường tải, **xuất bản / rút lại** bản (rút lại = đưa con trỏ kênh về bản trước) |
| Ứng dụng ↔ Báo lỗi ↔ Quản trị | `/reports` | (đã có) nhóm lỗi hiện ở quản trị; thêm liên kết lỗi → khách (nếu máy đã kích hoạt) để hỗ trợ chủ động |

Ma trận này là tiêu chí nghiệm thu: mỗi hàng có ít nhất một test tự động hoặc kịch bản CDP chứng minh.

## 7. Trang quản trị (`/admin`) — màn hình
1. **Tổng quan**: doanh thu hôm nay/7 ngày/tháng, đơn chờ thanh toán, giao dịch chưa khớp, key cấp 7 ngày, máy kích hoạt, nhóm lỗi mới, phiên bản hiện hành.
2. **Đơn hàng**: lọc theo trạng thái/ngày/khách/phương thức; chi tiết đơn (dòng thời gian trạng thái, thanh toán, key đã cấp [che], hóa đơn, email đã gửi); thao tác: đánh dấu đã thu (quyền owner), hủy, hoàn tiền (thu hồi key), gửi lại email, cấp lại key.
3. **Thanh toán / Đối soát**: danh sách sự kiện từ nhà cung cấp, hàng đợi "chưa khớp" (gán vào đơn bằng tay), xuất CSV đối soát theo ngày.
4. **Khách hàng**: hồ sơ, đơn, key, thiết bị, ghi chú nội bộ, nhập MST.
5. **Key & thiết bị** (đã có, mở rộng): liên kết đơn/khách, nền tảng, lần kiểm tra cuối, thu hồi, cấp lại, đổi số máy, gỡ máy, kích hoạt ngoại tuyến.
6. **Hóa đơn**: danh sách yêu cầu xuất hóa đơn (MST, tên, địa chỉ), trạng thái, số hóa đơn, tệp PDF đính kèm (giai đoạn đầu nhập tay; kết nối nhà cung cấp hóa đơn điện tử sau).
7. **Phát hành** (xem §6) + **Báo lỗi** (đã có) + **Email** (hàng đợi, thử lại, xem mẫu, gửi thử).
8. **Cài đặt**: gói và giá (giá 0 lúc đầu), số máy mặc định, chính sách ân hạn, mẫu email, tài khoản quản trị & vai trò, thông tin công ty trên hóa đơn.
9. **Nhật ký kiểm toán**: lọc theo người/hành động/thời gian, xuất CSV.

Vai trò: `owner` (mọi thứ, gồm đánh dấu thu tiền/hoàn tiền/đổi giá/quản lý admin), `support` (xem, gỡ máy, cấp lại key, gửi email, không đụng tiền/giá), `viewer` (chỉ xem). Phân quyền kiểm ở **máy chủ** cho mọi API, không chỉ ẩn nút.

Bảo mật quản trị: mật khẩu băm argon2/scrypt (đổi từ mật khẩu env hiện tại sang bảng `admin_users`, giữ tài khoản env làm "khẩn cấp"), **2FA TOTP bắt buộc cho owner**, phiên cookie `HttpOnly; Secure; SameSite=Strict`, CSRF, khóa tạm 5 lần sai (đếm theo IP thật `CF-Connecting-IP` + theo tài khoản), buộc đổi mật khẩu lần đầu, hết phiên sau 30 phút không hoạt động, tùy chọn giới hạn IP/Cloudflare Access (cấu hình, không bắt buộc trong mã).

## 8. Email
Hàng đợi `email_outbox` + tiến trình gửi nền (thử lại có giãn cách, tối đa 5 lần, báo lỗi lên trang quản trị). Cấu hình SMTP qua biến môi trường (máy chủ, cổng, người dùng, mật khẩu, địa chỉ gửi) — **nhà cung cấp email là quyết định của Người phụ trách**. Mẫu: xác nhận đơn, hướng dẫn thanh toán, đã nhận tiền + key, đơn hết hạn, key bị thu hồi, mã đăng nhập cổng khách hàng. Không đưa key vào nhật ký; gửi thử được trên trang quản trị. Khi chưa cấu hình SMTP: email nằm trong outbox trạng thái `queued` và quản trị viên xem/gửi tay được.

## 9. Giai đoạn và nghiệm thu

**GĐ-A (giao agy ngay): lõi thương mại + quản trị chặt chẽ — dùng nhà cung cấp `free` và `bank_transfer` (webhook giả lập)**
- Bảng dữ liệu §2 + migration không mất dữ liệu cũ; API §3 (shop, webhook, portal, license/status); bộ chuyển đổi `free`, `bank_transfer` (+ lớp giả lập webhook ký HMAC để test), `manual`; cấp key tự động idempotent; email_outbox + gửi SMTP cấu hình được; trang quản trị §7 (trừ hóa đơn điện tử thật), vai trò + 2FA TOTP + `admin_users`; cổng khách hàng (web tĩnh `server/3t-web/tai-khoan/`) và trang `/ban-quyen` có mua hàng.
- **Kịch bản đầu-cuối bắt buộc (tự động, trong pytest + một bài CDP trên trang web):**
  1. Tạo đơn giá 0 → tự hoàn tất → key được cấp → email xuất hiện trong outbox → `/license/activate` bằng key đó thành công → quản trị thấy đơn, key, thiết bị.
  2. Tạo đơn giá > 0 → `pending_payment` → webhook ký đúng với số tiền đúng → `paid` → `fulfilled` đúng một lần dù gửi webhook 3 lần.
  3. Webhook sai chữ ký / thiếu tiền / không có mã đơn / đơn hết hạn → không cấp key, vào đúng hàng đợi.
  4. Hoàn tiền → key bị thu hồi → `/license/validate` của máy đã kích hoạt trả `revoked`.
  5. Cấp lại key từ cổng khách hàng → key cũ vô hiệu.
  6. Phân quyền: `support` không đánh dấu thu tiền được (403); `viewer` không ghi được; không đăng nhập → 401; thiếu CSRF → 403.
  7. Giới hạn tốc độ và khóa tạm đăng nhập hoạt động theo IP thật.
- Kiểm bảo mật: không có key/token/mật khẩu trong nhật ký; mọi truy vấn tham số hóa; webhook so sánh chữ ký hằng thời gian; thử tấn công lặp lại (replay) bị chặn bởi `event_id`; kiểm tra đầu vào dị dạng.
- Tài liệu: `docs/HANDOFF-ADMIN-COMMERCE.md` (đã làm/chưa làm, số test thật), ảnh chụp màn hình thật các trang vào `docs/screens-admin/`.

**GĐ-B**: nhà cung cấp đối soát ngân hàng thật (SePay/Casso…) hoặc cổng thẻ/ví (VNPay/MoMo) theo lựa chọn; sandbox → thật. **GĐ-C**: hóa đơn điện tử (nhà cung cấp do Người phụ trách chọn); giá thật. **GĐ-D**: macOS (kho cập nhật + bộ cài theo nền tảng), iOS/Android (mua trong ứng dụng → `source=apple_iap/google_play`, đối soát biên lai máy chủ).

## 10. Quyết định cần Người phụ trách (agy KHÔNG tự chọn)
1. Nhà cung cấp thanh toán GĐ-B: chuyển khoản + đối soát tự động (SePay/Casso…) hay cổng VNPay/MoMo/ZaloPay, hay cả hai.
2. Hóa đơn điện tử: có xuất hóa đơn VAT cho mọi đơn hay chỉ khi khách yêu cầu; nhà cung cấp hóa đơn.
3. Giá và chính sách: giá gói vĩnh viễn, số máy mặc định mỗi key (đề xuất 2), chính sách hoàn tiền/hủy, thời gian giữ đơn chờ thanh toán (đề xuất 24 giờ).
4. Email: máy chủ gửi thư (SMTP của công ty hay dịch vụ ngoài) và địa chỉ gửi (đề xuất `no-reply@3tcomputer.com`).
5. Dùng thử: chính sách sau 30 ngày (xem SPEC-LICENSE-KEYS §6).

## 11. Ràng buộc kỹ thuật
Python/FastAPI + SQLite hiện có, không thêm khung lớn; thư viện mới chỉ khi cần và đã ghim phiên bản (ví dụ `pyotp`/`argon2-cffi`, kiểm tra giấy phép — không dùng thư viện phải trả phí hoặc copyleft mạnh, báo trước). Giữ tương thích ngược với ứng dụng 0.9.7/0.9.8 đang chạy (các đường dẫn `/api/v1/updates/*`, `/updates/*`, `/api/v1/reports*`, `/downloads/*`, `/license/*` không đổi). Sao lưu cơ sở dữ liệu trước mọi migration. Không triển khai lên VPS trong phiên làm của agy — Claude kiểm rồi triển khai.
