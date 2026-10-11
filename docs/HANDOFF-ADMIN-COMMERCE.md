# Handoff — Quản trị + bán hàng + cấp key tự động (GD-A)

Nhánh: `feat/admin-commerce-agy` · Người làm: agy (dừng sớm 02:28 04/10 không để lại handoff) → **Claude rà soát, vá bảo mật, viết handoff này (04/10/2026)**.
Phạm vi: chỉ `server/3t-api`, `server/3t-web`, `scripts/test-*`, `docs/`. **Chưa triển khai lên VPS.**

## Đã có (Claude tự chạy lại)
- `cd server/3t-api; python -m pytest -q .` → **43 passed** (agy 40 + 3 test an ninh của Claude).
- `node tests/unit/3t-web.test.js` → **500/500 PASS**. `node scripts/test-web-layout.mjs` → admin và tai-khoan PASS ở 360/390/768/1280 px.
- Tính năng (đọc mã): bảng dữ liệu thương mại + migration, bộ chuyển đổi thanh toán free/bank_transfer/manual, webhook HMAC + chống replay theo `event_id`, cấp key idempotent (`fulfillment.py`), `email_outbox` mã hoá, `admin_users` + vai trò owner/support/viewer kiểm ở máy chủ, scrypt, TOTP 2FA (RFC 6238, chuẩn thư viện), phiên 30 phút, khoá tạm theo IP thật (CF-Connecting-IP), cổng khách hàng `/tai-khoan/`, trang `/ban-quyen`, 7 kịch bản đầu–cuối bằng pytest.

## Lỗ hổng Claude tìm thấy khi rà soát và đã vá (có test)
1. **Bí mật webhook ghi cứng trong mã** (`"3t-webhook-secret-key-for-bank-reconcile"`) và không có cách cấu hình → ai đọc mã cũng ký được webhook giả để lấy key. **Vá:** không còn mặc định; nạp từ `PAYMENT_WEBHOOK_SECRET` (≥16 ký tự); thiếu thì mọi webhook bị từ chối (đóng an toàn).
2. **Số tài khoản nhận tiền mặc định là MÃ SỐ THUẾ (3101126773)** cùng ngân hàng "MB" tự nghĩ ra → mã QR có thể dẫn khách chuyển nhầm tài khoản. **Vá:** bỏ mặc định; nạp từ `PAYMENT_BANK_CODE`, `PAYMENT_BANK_ACCOUNT`, `PAYMENT_ACCOUNT_HOLDER`; thiếu thì đơn có tiền trả 503 `payment_not_configured` (đơn 0 đồng vẫn chạy).
3. **Giữ chỗ `event_id` bởi webhook giả:** webhook sai chữ ký được ghi bằng chính `event_id` của người gửi → webhook thật cùng `event_id` bị coi là trùng và bỏ qua (chặn cấp key). **Vá:** lưu sự kiện sai chữ ký với khoá riêng `invalid:<uuid>`, kiểm trùng chỉ tính sự kiện `signature_ok=1`.
4. Thân webhook không giới hạn kích thước → **Vá:** > 64 KB trả 413.

Test mới (đều trong `tests/test_commerce_e2e.py`): `test_forged_webhook_cannot_reserve_a_real_event_id`, `test_oversized_webhook_body_is_rejected`, `test_server_without_payment_configuration_fails_closed`. (Chưa chạy các test này trên mã cũ để chứng minh chúng FAIL trước khi vá — NOT RUN.)

## Việc còn lại / cần chủ sở hữu quyết định TRƯỚC khi triển khai
- Nhà cung cấp thanh toán, tài khoản nhận tiền thật, bí mật webhook → đặt trong `.env` VPS (`PAYMENT_*`).
- **Đơn 0 đồng công khai cấp key ngay và trả key trong phản hồi** (đúng spec "giá mặc định 0") → ai cũng lấy được khoá không giới hạn; cần chốt: xác minh email trước khi trả key? giới hạn theo IP/email? khi nào đặt giá > 0.
- SMTP (biến môi trường; thiếu thì thư nằm trong outbox), hoá đơn điện tử (GĐ-C), giá thật.
- Mật khẩu quản trị hiện tại là tạm; đổi + bật TOTP cho owner ngay khi triển khai; giới hạn `/admin` (Cloudflare Access/IP).
- Cấp key idempotent dựa vào một tiến trình uvicorn (chạy đồng bộ trong vòng lặp sự kiện); nếu chạy nhiều worker cần `BEGIN IMMEDIATE`/ràng buộc duy nhất trên đơn.
- Chưa có CDP trên trang web thật (ảnh chụp có trong `docs/screens-admin/`, do agy tạo).
- Triển khai: chỉ Claude, theo `reference_3t_office_web_deploy` (bind-mount inode), sau khi chủ sở hữu duyệt.
