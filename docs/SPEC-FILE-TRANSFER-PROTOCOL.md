# Đặc tả chuẩn (normative) — Giao thức 3T Transfer v1

Tài liệu này là **quy định bắt buộc** cho mọi bản cài đặt (JS, Python, Swift, Kotlin, máy chủ). Tài liệu thiết kế tổng thể: `docs/SPEC-FILE-TRANSFER-CODE.md`. Khi hai tài liệu mâu thuẫn, tài liệu này thắng; phải sửa cả hai trong cùng một PR.

Từ khóa: **PHẢI** (MUST), **KHÔNG ĐƯỢC** (MUST NOT), **NÊN** (SHOULD), **CÓ THỂ** (MAY) theo nghĩa RFC 2119.
Mọi số nguyên nhiều byte là **big-endian**. Chuỗi là UTF-8, chuẩn hóa NFC. Thời gian là mili-giây Unix (UTC).

---

## 1. Hằng số (mọi bên PHẢI dùng đúng giá trị này; chỉ máy chủ được đổi các giá trị đánh dấu *cấu hình*)

| Tên | Giá trị | Ghi chú |
|---|---|---|
| `PROTO_VER` | `1` | số nguyên trong mọi thông điệp |
| `SLOT_LEN` | 3 | ký tự |
| `SECRET_LEN` | 4 (mặc định), 6 (chế độ cao) | ký tự |
| `ALPHABET` | `23456789ABCDEFGHJKMNPQRSTUVWXYZ` | 31 ký tự, in hoa |
| `CODE_TTL_MS` | 600000 (*cấu hình 120000–1800000*) | tính từ lúc `open` |
| `PAKE_MAX_FAILS` | 3 | quá 3 lần sai khóa khe |
| `CHUNK_SIZE` | 262144 (256 KiB) bản rõ | đường A/B có thể thương lượng 262144–1048576; đường C cố định 262144 |
| `WINDOW` | 8 khối chưa ACK tối đa | |
| `MAX_RELAY_FILE` | 104857600 (100 MiB, *cấu hình*) | chỉ đường C |
| `MAX_FILES_PER_SESSION` | 20 | |
| `MAX_NAME_BYTES` | 255 | tên tệp sau NFC |
| `A_TIMEOUT_MS` | 4000 | thử đường A |
| `B_TIMEOUT_MS` | 8000 | thử đường B |
| `STALL_MS` | 10000 | không tiến triển → hạ đường |
| `MIN_RATE_BPS` | 16384 | dưới mức này liên tục `STALL_MS` coi là đứt |
| `RELAY_HOLD_MS` | 600000 | giữ tối đa bản mã chờ người nhận trên máy chủ |

---

## 2. Mã chia sẻ

### 2.1 Cấu trúc
`CODE = SLOT "-" SECRET`, hiển thị `SSS-RRRR` (ví dụ `K7M-4PQ9`). Chỉ có **một** dấu gạch.
- `SLOT`: 3 ký tự từ `ALPHABET`, do **máy chủ** cấp, duy nhất trong số khe đang mở. Dùng để định tuyến, **không** là bí mật.
- `SECRET`: `SECRET_LEN` ký tự từ `ALPHABET`, do **người gửi** sinh bằng CSPRNG; lấy ký tự bằng *rejection sampling* (`byte < 248` rồi `byte % 31`) để không thiên lệch. **KHÔNG ĐƯỢC** dùng `Math.random`, `random` của Python, `rand()`.
- `SECRET` **KHÔNG ĐƯỢC** rời máy người gửi ở bất kỳ dạng nào (kể cả băm), ngoại trừ qua QR/nhập tay sang máy người nhận.

### 2.2 Chuẩn hóa khi nhập (người nhận)
Theo thứ tự: bỏ khoảng trắng và các dấu `-`, `_`, `.`; chuyển in hoa. Bảng chữ **không có** `0 O 1 I L`: gặp một trong các ký tự này thì **từ chối** với thông báo "Mã không có chữ O, L, I hoặc số 0, 1" (không tự đoán để tránh nhập nhầm mà vẫn khớp). Sau đó tách `SLOT` = 3 ký tự đầu, `SECRET` = phần còn lại; kiểm độ dài đúng `SECRET_LEN` (4 hoặc 6) và mọi ký tự thuộc `ALPHABET`. Sai → báo lỗi định dạng **tại máy**, không gọi máy chủ.

### 2.3 QR / liên kết
Nội dung QR: `https://office.3tcomputer.com/r/SSS#SECRET` (SECRET ở **fragment** để trình duyệt không gửi lên máy chủ). Liên kết sâu của app: `vnoffice://receive?slot=SSS&s=SECRET`. App mở bằng liên kết **PHẢI** hiện hộp xác nhận "Nhận tệp từ mã SSS-…?" trước khi bắt đầu, không tự nhận.

---

## 3. Mật mã (chuẩn từng byte)

### 3.1 Thư viện được phép
JS: `@noble/curves`, `@noble/hashes`, `@noble/ciphers` (MIT). Python: `cryptography`, `pynacl` (nếu giấy phép được duyệt), `spake2` (MIT). Swift: `CryptoKit` / `swift-crypto`. Kotlin: `Tink` (Apache-2.0) hoặc `BouncyCastle` (MIT). **KHÔNG ĐƯỢC** tự cài hàm mật mã gốc; chỉ ghép từ thư viện trên.

### 3.2 PAKE: SPAKE2 (Ed25519) — định danh cố định
- Nhóm: Ed25519. Hằng điểm `M`, `N` theo **RFC 9382** (SPAKE2, bảng cho Ed25519). Hash: SHA-512.
- Mật khẩu `pw = UTF8("3T-Transfer-v1|" + SLOT + "|" + SECRET)`.
- Vai trò: người gửi = A, người nhận = B. `idA = "3T-S"`, `idB = "3T-R"`.
- Bản ghi bắt tay `TT = len(idA)‖idA‖len(idB)‖idB‖len(X)‖X‖len(Y)‖Y‖len(K)‖K‖len(w)‖w` (độ dài 8 byte).
- Khóa gốc `Ke‖Ka = SHA-512(TT)` cắt 32+32 byte (theo RFC 9382 §4).
> Nếu một nền tảng không có thư viện SPAKE2/Ed25519 đạt giấy phép, **PHẢI** báo BLOCKED ở GĐ0; **KHÔNG ĐƯỢC** thay bằng PAKE khác hoặc tự đặt giao thức.

### 3.3 Dẫn xuất khóa (HKDF-SHA256, `salt = SHA-256("3T-Transfer-v1|" + sid)`)
| Khóa | `info` | Độ dài |
|---|---|---|
| `K_confirm_S` | `"confirm-S"` | 32 |
| `K_confirm_R` | `"confirm-R"` | 32 |
| `K_data` | `"data"` | 32 |
| `K_ctrl` | `"ctrl"` | 32 |
| `NONCE_PREFIX` | `"nonce"` | 16 |
Đầu vào HKDF là `Ke` (SPAKE2).

### 3.4 Xác nhận khóa
Sau PAKE: S gửi `HMAC-SHA256(K_confirm_S, TT)`; R kiểm đúng rồi gửi `HMAC-SHA256(K_confirm_R, TT)`; S kiểm. So sánh **thời gian hằng**. Sai ở bất kỳ phía → đóng phiên, mã lỗi `E_BAD_CODE` (người dùng chỉ thấy "Mã không đúng"). Lần sai tính vào `PAKE_MAX_FAILS`.

### 3.5 Mã hóa dữ liệu (AEAD)
- Thuật toán: **XChaCha20-Poly1305** (nonce 24 byte). Nền tảng không có → **AES-256-GCM** (nonce 12 byte); hai bên chọn thuật toán trong thương lượng khả năng (§5.2), ưu tiên XChaCha.
- Nonce XChaCha 24 byte = `NONCE_PREFIX[0..16] ‖ u64(seq)`; AES-GCM 12 byte = `NONCE_PREFIX[0..4] ‖ u64(seq)`. `seq` tăng từ 0 theo từng khối **theo từng hướng riêng** (S→R dùng `dir=0`, R→S dùng `dir=1`; byte đầu `NONCE_PREFIX` XOR `dir`). **KHÔNG ĐƯỢC** dùng lại cặp (khóa, nonce).
- AAD mỗi khối = `"3T1" ‖ u8(dir) ‖ u32(file_index) ‖ u64(seq) ‖ u8(last_flag)`.
- Khối rõ tối đa `CHUNK_SIZE`; khối cuối của tệp đặt `last_flag=1`. Bản mã = AEAD(plaintext) (+16 byte thẻ).
- Khung điều khiển (HELLO, ACK, CANCEL…) dùng `K_ctrl` với bộ đếm riêng, cùng cách dựng AAD với `type` = `0x02`.

### 3.6 Băm toàn tệp
SHA-256 trên **toàn bộ byte tệp rõ**; người gửi tính khi đọc, người nhận tính khi ghi. Người nhận PHẢI so sánh với giá trị trong `FILE_META` **trước khi** đổi tên `.part` → tên chính thức. Sai → xóa `.part`, báo `E_HASH`.

### 3.7 Cấm
Ghi mã/khóa/SECRET/tên tệp vào log hoặc telemetry; dùng lại nonce; ECB/CBC/CTR không xác thực; tự suy ra khóa từ SECRET bằng băm đơn giản; so sánh MAC bằng `==`; chấp nhận khối sai thứ tự hoặc trùng `seq` (trừ gửi lại đúng nội dung sau đứt — xem §7.3).

---

## 4. Máy chủ: API chuẩn

Mọi yêu cầu: HTTPS; `Content-Type: application/json` trừ khi ghi khác; lỗi trả `{"error":"E_*","message":"…"}` với HTTP status theo bảng. Tiêu đề `X-VNO-Proto: 1` bắt buộc.

| Phương thức & đường dẫn | Nội dung yêu cầu | Phản hồi 200 | Lỗi |
|---|---|---|---|
| `POST /api/v1/transfer/open` | `{"ver":1,"platform":"win|mac|linux|ios|ipados|android","app":"writer|sheet|slides","caps":{…}}` | `{"slot":"K7M","sid":"<22 ký tự base64url, 128-bit>","expires":<ms>,"ttl":600000,"ice":[…],"relay":"wss://…/relay"}` | 429 `E_RATE`, 503 `E_FULL`, 426 `E_VERSION` |
| `POST /api/v1/transfer/join` | `{"ver":1,"slot":"K7M","platform":"…"}` | `{"sid":"…","expires":…,"ice":[…],"relay":"…"}` | 404 `E_NOT_FOUND` (cả khi hết hạn, đã dùng, bị khóa → **cùng một lỗi**), 429 `E_RATE` |
| `POST /api/v1/transfer/{sid}/mailbox` | `{"to":"S|R","seq":<n>,"data":"<base64url ≤ 8192 B>"}` | `{"ok":true}` | 404, 413 `E_TOO_BIG`, 410 `E_CLOSED` |
| `GET /api/v1/transfer/{sid}/mailbox?as=S|R&after=<seq>&wait=25000` | — | `{"messages":[{"seq":n,"data":"…"}]}` (long-poll tối đa 25 s) | 404, 410 |
| `POST /api/v1/transfer/{sid}/fail` | `{"as":"S|R"}` | `{"left":<số lần còn lại>}` | — (máy chủ tăng bộ đếm; ≥3 → khe `LOCKED`) |
| `WS /api/v1/transfer/{sid}/relay?as=S|R` | khung nhị phân §6 | — | đóng WS mã 4001/4002… §4.2 |
| `POST /api/v1/transfer/{sid}/close` | `{"as":"S|R","reason":"done|cancel|error"}` | `{"ok":true}` | — |
| `GET /api/v1/transfer/health` | — | `{"ok":true,"time":<ms>}` | — |

### 4.1 Trạng thái khe (máy chủ)
`OPEN` (đã `open`, chờ `join`) → `JOINED` (đã `join`; **một** người nhận duy nhất; `join` lần hai → `E_NOT_FOUND`) → `ACTIVE` (đã có tin nhắn PAKE hoàn chỉnh) → `CLOSED`. Ngoài ra `LOCKED` (≥3 `fail`) và `EXPIRED`. Chuyển trạng thái không đảo ngược. Mọi trạng thái cuối giải phóng `slot` sau 60 s và xóa mọi bản mã.

### 4.2 Mã đóng WebSocket
`4000` bình thường · `4001` hết hạn · `4002` khe khóa · `4003` quá dung lượng · `4004` vi phạm khung · `4005` người kia đã đóng.

### 4.3 Chống lạm dụng (máy chủ PHẢI cài)
`open`: ≤ 20/phút và ≤ 5 khe mở đồng thời mỗi IP; `join`: ≤ 30/phút/IP; kích thước thân ≤ 16 KiB (trừ relay); `relay` ≤ `MAX_RELAY_FILE` mỗi tệp và ≤ 500 MiB/ngày/IP. Phản hồi không bao giờ phân biệt "khe không tồn tại" và "khe hết hạn/khóa". Không liệt kê khe. IP chỉ được lưu dạng `HMAC(muối_ngày, ip)`.

### 4.4 Lưu trữ máy chủ
Chỉ giữ: `slot`, `sid_hash`, `state`, `created`, `expires`, `fail_count`, `ip_hmac`, `platform`, `bytes_relayed`. Bản mã chuyển tiếp chỉ ở RAM hoặc thư mục tạm có TTL ≤ `RELAY_HOLD_MS`, xóa bằng ghi đè khi đóng. **KHÔNG ĐƯỢC** lưu SECRET, khóa, tên tệp, loại tệp, nội dung rõ.

---

## 5. Thông điệp trong phiên (sau PAKE)

### 5.1 Khung điều khiển (JSON được mã hóa bằng `K_ctrl`)
Định dạng dây: `u8(type=0x02) ‖ u64(seq) ‖ AEAD(JSON UTF-8)`. Các `t` hợp lệ:

| `t` | Hướng | Trường | Ý nghĩa |
|---|---|---|---|
| `HELLO` | cả hai | `ver`, `aead:["xchacha","aesgcm"]`, `routes:{lan:{host,port,tok}|null, webrtc:bool, relay:true}`, `chunk:[min,max]`, `name:"<tên máy ≤64>"` | thương lượng khả năng |
| `FILE_META` | S→R | `idx`, `name`, `size`, `sha256`(hex), `mime`, `count` | tên tệp thật, kích thước |
| `ACCEPT` | R→S | `idx` | người nhận đồng ý nhận tệp `idx` |
| `REJECT` | R→S | `idx`, `why:"user|space|type"` | từ chối |
| `ACK` | R→S | `idx`, `upto` (khối liên tục cao nhất đã ghi), `sack:[khoảng khối]` | tiến độ |
| `DONE` | R→S | `idx`, `ok:true|false`, `why` | hash đã kiểm |
| `CANCEL` | cả hai | `why:"user|error"` | hủy |
| `ROUTE` | cả hai | `to:"lan|webrtc|relay"`, `reason` | thông báo hạ đường (§7) |
| `PING`/`PONG` | cả hai | `n` | giữ kết nối, đo độ trễ |

Bên nhận gặp `t` lạ **PHẢI** bỏ qua; gặp `ver` > hiểu được → gửi `CANCEL why:"version"` và hiện "Cần cập nhật ứng dụng".

### 5.2 Khung dữ liệu
Dây: `u8(type=0x01) ‖ u32(idx) ‖ u64(seq) ‖ u8(last) ‖ AEAD(chunk)`. Người nhận PHẢI kiểm `idx` đã `ACCEPT`, `seq` thuộc khoảng chờ, giải mã thành công mới được ghi.

### 5.3 Trình tự chuẩn (S = người gửi, R = người nhận)
1. S `open` → hiện mã. R nhập mã → `join`.
2. PAKE qua mailbox, xác nhận khóa (§3.4). Sai → `fail`, dừng.
3. Cả hai gửi `HELLO`. Chọn AEAD = giao của hai danh sách, ưu tiên `xchacha`; `chunk` = `min(max_S,max_R)`.
4. S gửi `FILE_META` cho tệp 0 (và các tệp sau khi tệp trước `DONE`). R hiện hộp "Nhận 'x.docx' (1,2 MB) từ <name>?". Người dùng: `ACCEPT` hoặc `REJECT`.
5. Sau `ACCEPT`: chọn đường (§7) rồi S gửi khối `seq=0…` tới `WINDOW`; R `ACK` mỗi 4 khối hoặc 250 ms.
6. Khối cuối `last=1`; R kiểm hash → `DONE ok`. S hiện "Đã gửi xong". Cả hai `close reason=done`.

---

## 6. Đường truyền

### 6.1 Đường A — LAN trực tiếp
- Người gửi mở `TCP` lắng nghe cổng ngẫu nhiên 49152–65535 chỉ trên các giao diện riêng tư (RFC 1918 / link-local / ULA); **KHÔNG ĐƯỢC** nghe trên `0.0.0.0` khi có giao diện công cộng cố ý (ưu tiên gắn giao diện cụ thể).
- Địa chỉ quảng bá trong `HELLO.routes.lan = {"host":"192.168.1.20","port":53211,"tok":"<16 byte base64url>"}`; `tok = HKDF(Ke, "lan-tok" ‖ sid)`. Người nhận kết nối TCP rồi gửi `tok` (16 byte). Sai `tok` → đóng ngay, không phản hồi.
- Khung TCP: `u32(length) ‖ khung` (khung = khung dữ liệu hoặc điều khiển §5). `length ≤ CHUNK_SIZE+64`.
- mDNS (tùy chọn, NÊN): loại dịch vụ `_vnotransfer._tcp.local`, TXT `v=1`, `s=<8 hex đầu của SHA-256(sid)>`. Chỉ để tăng cơ hội tìm thấy khi `HELLO` không có địa chỉ; **KHÔNG** chứa SECRET.
- Mỗi cổng chấp nhận **đúng 1** kết nối hợp lệ; sau đó đóng cổng lắng nghe.

### 6.2 Đường B — WebRTC DataChannel
- Tín hiệu SDP/ICE chuyển trong khung điều khiển `SIGNAL` qua mailbox (mã hóa bằng `K_ctrl`).
- DataChannel `label="3t-transfer"`, `ordered=true`, `maxRetransmits` không đặt (tin cậy). Khung dữ liệu/điều khiển gửi nguyên như §5; mỗi tin ≤ 16 KiB nên khối 256 KiB được cắt nhỏ ở lớp vận chuyển (tiền tố `u8(frag_flags)`; không ảnh hưởng AEAD vì AEAD áp trên khối nguyên).
- ICE: dùng danh sách `ice` do máy chủ cấp (STUN + TURN, thông tin xác thực HMAC hết hạn trong 10 phút). `iceTransportPolicy="all"`.
- Có TURN → đường B vẫn là P2P khi có thể; nếu ICE chọn cặp `relay`, vẫn tính là đường B (TURN không đọc được nội dung) nhưng hiển thị nhãn "Qua máy chủ 3T".

### 6.3 Đường C — Chuyển tiếp WebSocket
- Khung nhị phân qua WS: `u8(type) ‖ …` giống §5, mỗi tin = 1 khung. Máy chủ đếm byte; vượt `MAX_RELAY_FILE` → đóng `4003`.
- Máy chủ chỉ chuyển giữa hai đầu của cùng `sid`; giữ đệm tối đa `RELAY_HOLD_MS`.

---

## 7. Chọn đường và chuyển đường (máy trạng thái chuẩn)

### 7.1 Chọn lúc bắt đầu
Sau `ACCEPT`, **cả hai** bên chạy cùng thuật toán và PHẢI ra cùng kết quả:
1. `candidates = []`. Nếu `HELLO_S.routes.lan` có **hoặc** cả hai báo cùng /24 → thêm `lan`. Nếu cả hai `webrtc:true` → thêm `webrtc`. Luôn thêm `relay` cuối.
2. Khởi chạy song song: thử `lan` (hạn `A_TIMEOUT_MS`) và `webrtc` (hạn `B_TIMEOUT_MS`); `relay` chỉ mở khi hai đường trên đã hết hạn **hoặc** thất bại, hoặc khi `candidates` chỉ còn `relay`.
3. Khi một đường **nối xong và qua kiểm tra `PING/PONG`**, chọn theo ưu tiên `lan > webrtc > relay` trong các đường đã sẵn sàng tại thời điểm `A_TIMEOUT_MS` (nếu `lan` sẵn sàng sớm hơn, chọn ngay). Đường thua bị đóng.
4. Gửi `ROUTE{to:<đường chọn>}`; người nhận xác nhận bằng `ROUTE` cùng giá trị. Không thống nhất trong 2 s → cả hai dùng `relay`.

### 7.2 Hạ đường khi đang truyền
Điều kiện hạ: đường hiện tại đóng bất thường, hoặc `ACK.upto` không tăng trong `STALL_MS`, hoặc tốc độ < `MIN_RATE_BPS` trong `STALL_MS`. Thứ tự hạ: `lan → webrtc → relay`. Từ `relay` không còn đường dưới → báo lỗi `E_NET` và giữ `.part` (§7.3). **KHÔNG ĐƯỢC** nâng đường ngược lên trong cùng phiên.

### 7.3 Tiếp tục sau đứt
- Người nhận ghi `.part` + tệp `.part.map` (JSON: `size`, `chunk`, danh sách khối đã ghi và đã xác thực).
- Sau khi đổi đường, người nhận gửi `ACK{upto, sack}`; người gửi gửi lại **chỉ** các khối chưa có, **dùng lại cùng `seq`** (và cùng bản mã được phép gửi lại; không mã hóa khác nội dung cho cùng `seq`).
- Hết `CODE_TTL_MS` hoặc một bên thoát → phiên hết; `.part` giữ 24 giờ rồi xóa, người dùng có thể xóa ngay.

---

## 8. Giao diện: quy tắc hiển thị

### 8.1 Trạng thái hộp thoại Gửi
`confirm` → `waiting` (mã + QR + đếm ngược) → `pake` ("Đang kết nối…") → `offered` ("Chờ người nhận đồng ý…") → `sending` (tiến trình) → `done` | `rejected` | `expired` | `cancelled` | `error(code)`.
Hộp thoại Nhận: `enter` → `joining` → `pake` → `confirming` (xem tên/size, nút Nhận/Từ chối) → `receiving` → `verifying` → `done` | `error(code)`.

### 8.2 Quy tắc bắt buộc
- Mọi nút/ô có nhãn, thứ tự Tab hợp lý, Esc = hủy (hỏi lại nếu đang truyền), Enter = nút chính; trạng thái đọc được bằng trình đọc màn hình (`aria-live="polite"`).
- Đếm ngược cập nhật mỗi giây; khi < 60 s đổi màu cảnh báo.
- Tiến trình hiển thị: % (theo byte đã **ACK**), tốc độ (trung bình 3 s), thời gian còn lại; nhãn đường truyền: `Trực tiếp (cùng mạng)` | `Trực tiếp (Internet)` | `Qua máy chủ 3T`.
- Người nhận **PHẢI** thấy tên tệp (đã làm sạch §8.3), kích thước, tên máy gửi và bấm xác nhận trước khi ghi bất kỳ byte nào ra đĩa (ngoại trừ bản `.part` trong thư mục tạm của app sau `ACCEPT`).
- Hộp thoại không chặn soạn thảo; khi thu nhỏ thành chip trạng thái vẫn hủy được.

### 8.3 Làm sạch tên tệp (người nhận PHẢI)
Lấy phần tên cuối (cắt mọi `/` `\`), bỏ ký tự điều khiển và `<>:"/\|?*`, bỏ dấu chấm/khoảng trắng cuối, chặn tên dành riêng Windows (`CON`, `PRN`, `AUX`, `NUL`, `COM1-9`, `LPT1-9`), NFC, cắt về `MAX_NAME_BYTES` (giữ phần mở rộng). Trùng tên → thêm ` (2)`, ` (3)`… **KHÔNG ĐƯỢC** ghi đè tệp có sẵn. Tên rỗng sau làm sạch → `tep-nhan-<yyyymmdd-hhmmss>`.

### 8.4 Mở tệp sau khi nhận
Theo đuôi (không phân biệt hoa/thường): `.docx .doc .odt .rtf .txt` → Writer; `.xlsx .xls .ods .csv` → Sheet; `.pptx .ppt .odp` → Slides; khác → chỉ "Hiện trong thư mục". Mở dùng đúng luồng mở tệp hiện có của app (không đường tắt), **KHÔNG ĐƯỢC** tự chạy macro, **KHÔNG ĐƯỢC** mở tự động khi người dùng chưa bấm Mở (trừ khi người dùng bật tùy chọn "Tự mở sau khi nhận", mặc định **tắt**).

### 8.5 Mã lỗi hiển thị (bảng duy nhất, i18n qua khóa `transfer.err.<CODE>`)
| Mã | Khi nào | Chữ VI |
|---|---|---|
| `E_FORMAT` | mã sai định dạng | "Mã chưa đúng định dạng. Mã gồm 3 ký tự, dấu gạch, rồi 4 ký tự (không có chữ O, số 0, 1, I, L)." |
| `E_BAD_CODE` | PAKE/xác nhận sai, hoặc `E_NOT_FOUND` | "Mã không đúng hoặc đã hết hạn." |
| `E_LOCKED` | máy chủ báo khóa | "Mã này đã bị khóa vì nhập sai nhiều lần. Nhờ người gửi tạo mã mới." |
| `E_EXPIRED` | hết `CODE_TTL_MS` | "Mã đã hết hạn. Nhờ người gửi tạo mã mới." |
| `E_NET` | không còn đường truyền | "Mất kết nối và không thể nối lại. Hãy thử cùng mạng Wi-Fi hoặc lưu tệp rồi chép bằng USB." |
| `E_OFFLINE` | không có Internet và không tìm thấy qua LAN | "Không có kết nối mạng." |
| `E_TOO_BIG` | vượt giới hạn đường C và không có đường A/B | "Tệp lớn hơn 100 MB nên không thể gửi qua máy chủ. Hãy thử cùng mạng Wi-Fi hoặc chép bằng USB." |
| `E_REJECTED` | người nhận từ chối | "Người nhận đã từ chối." |
| `E_CANCEL` | một bên hủy | "Đã hủy." |
| `E_HASH` | sai hash cuối | "Tệp nhận về bị lỗi và đã được xóa. Vui lòng gửi lại." |
| `E_DISK` | không ghi được | "Không ghi được tệp (đĩa đầy hoặc không có quyền)." |
| `E_VERSION` | `ver` không tương thích | "Cần cập nhật ứng dụng để gửi/nhận tệp này." |
| `E_RATE` | quá nhiều yêu cầu | "Bạn thao tác quá nhanh. Hãy đợi một phút rồi thử lại." |
| `E_PERM_LAN` | hệ điều hành chặn mạng nội bộ | "Hãy cho phép ứng dụng truy cập mạng nội bộ trong Cài đặt." |

---

## 9. Quy tắc riêng theo nền tảng

| Nền tảng | Bắt buộc |
|---|---|
| Windows | Tường lửa: khi mở cổng nghe LAN lần đầu, hướng dẫn người dùng chọn "Mạng riêng"; không yêu cầu quyền quản trị. Lưu vào `Downloads\3T Office`. |
| macOS | `Info.plist`: `NSLocalNetworkUsageDescription` (tiếng Việt, nêu rõ chỉ để gửi tệp trong mạng nội bộ) và `NSBonjourServices = [_vnotransfer._tcp]`. Sandbox: entitlement client+server network. |
| Linux | Không yêu cầu root; mDNS qua Avahi nếu có, nếu không bỏ qua (vẫn có `HELLO`). Mở bằng `xdg-open`. |
| iOS / iPadOS | `NSLocalNetworkUsageDescription`, `NSBonjourServices`; giữ màn hình sáng (`isIdleTimerDisabled`) khi truyền; WKWebView có thể không nối được đường B → dùng `relay` mà không báo lỗi; nhận tệp lưu vào hộp "Tệp" của app và gọi Share Sheet; không giả định nền vẫn chạy. |
| Android | `INTERNET`, `ACCESS_NETWORK_STATE`, `NEARBY_WIFI_DEVICES` (Android 13+) chỉ khi cần mDNS; giữ `WAKE_LOCK` khi truyền; dùng Storage Access Framework để lưu; `Intent.ACTION_SEND` để nhận từ ứng dụng khác. |
Quy tắc chung: mã riêng nền tảng chỉ ở `platform/os_services/<nền-tảng>.py` và `ports/<nền-tảng>/`; không thêm `if (platform===…)` trong `apps/` hoặc `platform/*.js`.

---

## 10. Tương thích & phiên bản
- `PROTO_VER` chỉ tăng khi đổi định dạng dây. Máy chủ chấp nhận `ver` trong `[1, N]`; ngoài khoảng trả `426 E_VERSION`.
- Thêm trường mới vào JSON **không** tăng phiên bản; bên nhận bỏ qua trường lạ.
- Mọi thay đổi chuẩn PHẢI cập nhật tài liệu này, test vector (§11) và ghi vào mục Lịch sử cuối tệp.

---

## 11. Kiểm thử bắt buộc (mỗi bản cài đặt PHẢI đạt trước khi merge)

### 11.1 Test vector (file `tests/transfer/vectors.json`, dùng chung cho mọi ngôn ngữ)
Phải có: (a) SPAKE2 với `pw`, `x`, `y` cố định → `X`, `Y`, `Ke`, `Ka`, `TT` đã biết; (b) HKDF từng khóa §3.3; (c) AEAD: khóa, nonce, AAD, bản rõ → bản mã đã biết (cả XChaCha và AES-GCM); (d) dựng nonce theo `dir`/`seq`; (e) chuẩn hóa mã nhập (§2.2); (f) làm sạch tên (§8.3). Mọi ngôn ngữ chạy cùng tệp và kết quả **trùng từng byte**. Vector sinh một lần từ tài liệu RFC/thư viện tham chiếu, ghi cách sinh.

### 11.2 Kiểm thử âm (phải bị TỪ CHỐI)
Khối bị đảo `seq`; khối bị cắt; khối trùng `seq` khác nội dung; thẻ AEAD sai; AAD sai (đổi `idx`/`last`); mã sai 3 lần (khe khóa, lần 4 vẫn `E_NOT_FOUND`); mã dùng lần thứ hai; `join` hai người nhận; hết hạn; tên tệp `..\\..\\x.exe`, `CON.txt`, tên 300 byte; hash cuối sai; `ver` cao hơn; khung > giới hạn; `tok` LAN sai.

### 11.3 Kiểm thử chức năng
Tệp 0 byte, 1 byte, đúng `CHUNK_SIZE`, `CHUNK_SIZE±1`, 10 MB, 100 MB, 1 GB (A/B); nhiều tệp; hủy giữa chừng từ cả hai phía; rút mạng giữa chừng (chuyển `lan→webrtc→relay` và tiếp tục, hash cuối trùng); người nhận từ chối; người nhận đóng app; đĩa đầy; chạy 50 phiên song song trên máy chủ; kiểm máy chủ không chứa tên/nội dung/khóa (dump CSDL + bộ nhớ chuyển tiếp trong test).

### 11.4 Kiểm thử giao diện (qua CDP trên app desktop, không SendKeys/AppleScript)
Mọi trạng thái §8.1; điều hướng bàn phím; Esc/Enter; chip thu nhỏ; chữ VI và EN (i18n parity); bài Help; `npm test`, `help-coverage`.

### 11.5 Đo hiệu năng (ghi số thật vào báo cáo, không đoán)
LAN: ≥ 70% băng thông `iperf3` giữa hai máy; relay: độ trễ bắt tay < 3 s ở mạng bình thường; mở hộp thoại Gửi < 300 ms.

### 11.6 Cách báo cáo
Mỗi mục: PASS / FAIL / NOT RUN / BLOCKED kèm số liệu và lệnh chạy. Không tắt test để xanh (AGENTS.md §8).

---

## 12. Quy trình triển khai cho team
1. Đọc `AGENTS.md`, hai tài liệu SPEC Transfer, spec nền tảng của team.
2. **GĐ0 (bắt buộc trước khi code):** nộp báo cáo ngắn: thư viện đã chọn cho PAKE/AEAD (+ giấy phép), kết quả thử WebRTC trên nền tảng của team, xác nhận SPAKE2 vector khớp. Có điểm BLOCKED thì dừng và báo.
3. Mỗi PR chỉ làm một lớp (lõi / máy chủ / UI / cổng nền tảng) và kèm kế hoạch (AGENTS.md §6), test §11, bài Help VI/EN, handoff chuẩn.
4. Không được tự đổi hằng số §1, định dạng §3/§5, mã lỗi §8.5 mà không sửa tài liệu này và xin Người phụ trách duyệt.
5. Điểm tích hợp: lệnh `common.transfer.send`, `common.transfer.receive`, `common.transfer.cancel`, `common.transfer.copyCode`, `common.transfer.openReceived` — tên, vị trí ribbon (Tệp > Chia sẻ) cố định để Help và test dùng chung.

## 13. Lịch sử
- 17/10/2026 — v1: bản chuẩn đầu tiên.
