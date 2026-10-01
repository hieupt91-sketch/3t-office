# Spec — 3T Cloud: máy chủ dữ liệu + API cho 3T Office (mở rộng CH-9)

Ngày: 01/10/2026 · Yêu cầu Người phụ trách: "xây dựng VPS có data có API luôn để sau này các dịch vụ, thư viện, bản tải cập nhật hay mọi thông tin sẽ từ đó, làm web giống cơ chế vận hành của 3T Reader, sau này sẽ cấp key".
Trạng thái: **ĐỀ XUẤT — chờ Người phụ trách duyệt các mục ở §8 trước khi code** (AGENTS.md §6/§11: thay đổi security boundary + external dependency).

## 1. Học từ 3T Reader (đã xác minh từ tài liệu và mã client, 01/10)

| Thành phần 3T Reader | Cách làm |
|---|---|
| Máy chủ | `3tserver` = máy 192.168.1.254 trong văn phòng, IP công khai 116.97.215.211, ra Internet qua **Cloudflare Tunnel** (`ssh.3tcomputer.com`) |
| Dịch vụ | **FastAPI + uvicorn**, sau **Nginx + Let's Encrypt**, chạy bằng systemd dưới user riêng (`threet`), dữ liệu ở `/data` |
| Tên miền | `reader.3tcomputer.com` |
| API bản quyền | `/api/v1/license/activate`, `/validate`, `/heartbeat`, `/deactivate`; gắn thiết bị (fingerprint), giới hạn số máy, **token ký số cho phép dùng ngoại tuyến có hạn (grace 7 ngày)**, thu hồi |
| Cập nhật | Manifest cập nhật có chữ ký; delta update |
| Bí mật | `.env` trên máy chủ (signing secret, mật khẩu admin) — không nằm trong mã |

**Kết luận:** 3T Office dùng **cùng máy chủ, cùng công nghệ, cùng khuôn API**; tách sản phẩm bằng tham số `product` để sau này một tài khoản/key quản lý cả 3T Reader và 3T Office.

## 2. Mục tiêu

1. **Một nguồn sự thật** cho: bản cập nhật, thư viện tải thêm, bản quyền/key, báo lỗi, thông tin sản phẩm.
2. **App vẫn chạy OFFLINE đầy đủ** (AGENTS.md: ưu tiên số 1). Máy chủ chỉ là nguồn cập nhật/kích hoạt; mất mạng không làm app ngừng chạy (bản quyền có thời hạn dùng ngoại tuyến).
3. **Không gửi nội dung tài liệu** lên máy chủ trong bất kỳ trường hợp nào (báo lỗi chỉ thông tin kỹ thuật, có xin phép).
4. Mạng nội bộ (`\\192.168.1.252`) vẫn là nguồn cập nhật dự phòng.

## 3. Kiến trúc

```
3T Office (desktop)  ──HTTPS──▶  office.3tcomputer.com (Cloudflare Tunnel)
                                     │
                                  Nginx (TLS, giới hạn tần suất)
                                     │
                    ┌────────────────┴─────────────────┐
              3t-api (FastAPI, multi-product)      Kho tệp tĩnh
              ├─ /api/v1/license/*                 /updates/<product>/<channel>/  (manifest ký số + blobs)
              ├─ /api/v1/updates/*                 /downloads/  (bộ cài, thư viện)
              ├─ /api/v1/reports/*                 /web/        (trang sản phẩm)
              ├─ /api/v1/catalog/*
              └─ /api/v1/admin/*  (chỉ quản trị, 2 lớp xác thực)
                                     │
                         CSDL SQLite (giai đoạn 1) → PostgreSQL khi cần
                         /data/3t-office/  (sao lưu hằng ngày)
```

## 4. Các dịch vụ

### 4.1 Cập nhật (thay thế/bổ sung kho LAN)
- `GET /api/v1/updates/{product}/{channel}/latest` → manifest hiện tại (đã ký RSA-3072 bằng khóa phát hành hiện có, khóa riêng KHÔNG đưa lên máy chủ — chỉ đưa manifest đã ký).
- Blobs theo địa chỉ nội dung (sha256) phục vụ tĩnh qua Nginx, hỗ trợ tải tiếp (Range).
- Kênh: `pilot`, `stable`; giới hạn theo gói bản quyền: **gói vĩnh viễn nhận cập nhật 1 năm**, **gói thuê bao nhận liên tục** (máy chủ trả bản mới nhất mà key được phép).
- App: thử máy chủ trước, lỗi thì dùng kho LAN; vẫn kiểm chữ ký như hiện nay.

### 4.2 Bản quyền / key (cùng khuôn 3T Reader)
- `POST /api/v1/license/activate {key, email, device_fingerprint, product}` → token ký số (hết hạn, số máy, gói).
- `POST /validate`, `/heartbeat` (định kỳ, nền), `/deactivate` (chuyển máy).
- Ngoại tuyến: token cho phép dùng tiếp **N ngày** (đề xuất 30 ngày cho bản desktop văn phòng) rồi mới nhắc kết nối; không khóa tài liệu người dùng.
- Dùng thử: số ngày dùng thử cấu hình được.
- Quản trị: tạo key hàng loạt, gói (vĩnh viễn/thuê bao), số máy, thu hồi, xem máy đang kích hoạt.

### 4.3 Báo lỗi (CH-9.1)
- `POST /api/v1/reports` với token cài đặt; nội dung: phiên bản, Windows, ngăn xếp lỗi đã lọc đường dẫn/chuỗi tài liệu (bộ lọc `_QUOTED_TEXT` hiện có), mã máy ẩn danh. **Không có nội dung tài liệu.**
- Gom nhóm lỗi trùng, đếm số máy gặp; trang quản trị xem theo phiên bản.

### 4.4 Thư viện / tải thêm (catalog)
- `GET /api/v1/catalog/{product}` → danh sách gói tải thêm có chữ ký: từ điển chính tả, mẫu tài liệu, phông chữ được phép phân phối, gói ngôn ngữ, mẫu hóa đơn/biểu mẫu VN.
- **Bản quyền nội dung:** mọi gói phải ghi rõ giấy phép; gói GPL/copyleft cần Người phụ trách ký duyệt riêng (quy tắc hiện hành).

### 4.5 Trang web
- `office.3tcomputer.com`: giới thiệu 3T Office (3T Doc / 3T Sheet / 3T Slide), tải bộ cài, ghi chú phát hành, hướng dẫn, trang tài khoản (xem key, máy đã kích hoạt), trang quản trị.
- Nhận diện 3T; không dùng tên/biểu tượng Microsoft.

## 5. Bảo mật
- HTTPS bắt buộc (Cloudflare + Let's Encrypt); HSTS.
- Bí mật trong `.env` trên máy chủ (quyền 600), không vào git; khóa ký bản phát hành vẫn ở máy phát hành, không lên máy chủ.
- Token cài đặt riêng cho từng máy để gửi báo lỗi; giới hạn tần suất theo IP/token.
- Trang quản trị: mật khẩu mạnh + mã OTP; chỉ truy cập qua tên miền quản trị riêng hoặc whitelist IP văn phòng.
- Sao lưu CSDL hằng ngày ra ổ khác; nhật ký truy cập 90 ngày.
- Kiểm thử bảo mật cơ bản trước khi mở công khai (OWASP top 10 cho API).

## 6. Giai đoạn triển khai

| GĐ | Nội dung | Tiêu chí xong |
|---|---|---|
| **GĐ1** | Dựng `3t-api` (FastAPI) trên `3tserver` cạnh API 3T Reader: `/health`, `/api/v1/reports`, kho cập nhật qua HTTPS (đồng bộ từ kho LAN); app 3T Office gửi báo lỗi (có xin phép) và tải cập nhật qua HTTPS, LAN làm dự phòng | Báo lỗi thật từ máy văn phòng hiện trong trang quản trị; một bản vá tải qua Internet áp thành công |
| **GĐ2** | Bản quyền: activate/validate/heartbeat/deactivate, dùng thử, gói vĩnh viễn 1 năm cập nhật / thuê bao; trang quản trị tạo key | Kích hoạt, chuyển máy, hết hạn, ngoại tuyến 30 ngày đều có test tự động + thử thật |
| **GĐ3** | Catalog thư viện tải thêm, trang web sản phẩm, trang tài khoản | Tải 1 gói từ điển có chữ ký vào app |
| **GĐ4** | Hợp nhất với 3T Reader: một API đa sản phẩm, một tài khoản | Một key quản lý cả 2 sản phẩm (nếu Người phụ trách muốn) |

Mỗi GĐ: agent làm trong nhánh riêng; Claude kiểm (test API tự động + thử thật từ app desktop); triển khai lên máy chủ chỉ khi Người phụ trách đồng ý.

## 7. Phân công dự kiến
- **Codex**: `server/3t-api` (FastAPI, CSDL, test), client trong `platform/cloud` (báo lỗi, cập nhật HTTPS, bản quyền), script triển khai.
- **agy / opencode**: trang web và trang quản trị (giao diện), không đụng phần bảo mật.
- **Claude**: kiểm tra, thử thật, rà bảo mật; không tự viết code.

## 8. Cần Người phụ trách quyết / cung cấp
1. **Dùng chung máy `3tserver`** (như 3T Reader) hay thuê VPS riêng?
2. **Tên miền**: ✅ **ĐÃ CHỐT (01/10): `office.3tcomputer.com` trước mắt**, có thể đổi sau → tên miền là CẤU HÌNH (`app/vnoffice-config.json` phía app, `.env` phía máy chủ), không viết cứng trong mã; app hỗ trợ danh sách nguồn dự phòng (tên miền mới + cũ + kho LAN) để chuyển tên miền bằng một bản vá mà không làm máy cũ mất kết nối.
3. **Quyền SSH** vào máy chủ cho agent triển khai (tài khoản riêng, không dùng root) — hoặc Người phụ trách tự chạy script triển khai.
4. **Dùng chung API bản quyền với 3T Reader** (một tài khoản/key cho nhiều sản phẩm) hay tách riêng?
5. **Chính sách bản quyền**: số máy mỗi key, số ngày dùng ngoại tuyến (đề xuất 30), số ngày dùng thử, giá/gói (vĩnh viễn + 1 năm cập nhật, thuê bao).
6. Cổng thanh toán (nếu bán trực tuyến) — để GĐ sau.
