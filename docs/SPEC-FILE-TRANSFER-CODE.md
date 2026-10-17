# Spec — 3T Transfer: gửi/nhận tệp bằng mã, truyền thẳng giữa hai máy, mọi nền tảng

Ngày: 17/10/2026 · Người phụ trách đã **chốt hướng** (17/10): dùng mã ngắn, ưu tiên truyền thẳng máy-với-máy, tự chuyển đường khi không nối thẳng được, một lõi dùng chung cho Writer / Sheet / Slides và mọi nền tảng.
**Quy định chuẩn từng byte, hằng số, API, mã lỗi, test vector: `docs/SPEC-FILE-TRANSFER-PROTOCOL.md` (thắng khi mâu thuẫn).**
Trạng thái: **ĐÃ CHỐT HƯỚNG — sẵn sàng chia việc.** Mục §14 liệt kê các điểm vẫn cần xác minh trong lúc làm. Chưa có dòng code nào.

Phạm vi nền tảng: Windows · macOS · Linux · iOS · iPadOS · Android. Phạm vi ứng dụng: VN Writer, VN Sheet, VN Slides (và mọi app sau này) — **một** chức năng ở Shared Platform, không nhân bản theo app (AGENTS.md §2).

---

## 1. Trải nghiệm người dùng

### 1.1 Gửi
Vào bằng: **Tệp > Chia sẻ > Gửi bằng mã…** (cả 3 app), nút Gửi trên thanh truy cập nhanh, menu chuột phải tệp gần đây, hoặc **Chia sẻ** của hệ điều hành trên điện thoại/máy tính bảng.
1. Hộp thoại xác nhận rõ ràng: tên tệp, kích thước, dòng "Tệp được mã hóa trên máy bạn và chỉ người có mã mới mở được." Nút **Gửi** / **Hủy**. Không bao giờ gửi âm thầm (AGENTS.md §2).
2. Hiện **mã cỡ lớn** `7K4-9QX2` (nhóm 3-4 ký tự, dễ đọc qua điện thoại), mã **QR** (chứa mã + địa chỉ), nút **Sao chép mã**, đếm ngược 10:00, trạng thái: `Đang chờ người nhận…` → `Đã kết nối (Trực tiếp)` → thanh tiến trình % + tốc độ → `Đã gửi xong` / `Hết hạn` / `Đã hủy`.
3. Gửi nhiều tệp một lần: chọn nhiều tệp → cùng một mã, nhận về từng tệp.

### 1.2 Nhận
Vào bằng: **Tệp > Chia sẻ > Nhận bằng mã…**, màn hình chính (ô "Nhận tệp"), hoặc quét QR bằng camera điện thoại (mở app, điền sẵn mã).
1. Gõ mã (không phân biệt hoa/thường, tự bỏ dấu gạch, tự sửa O↔0, I↔1↔L).
2. Thấy trước: tên tệp, kích thước, tên máy gửi → **Nhận** / **Từ chối**.
3. Tải xong: **Mở** (tự mở đúng app theo đuôi: docx/doc/odt/rtf→Writer, xlsx/xls/ods/csv→Sheet, pptx/ppt/odp→Slides, còn lại → Lưu vào…), **Hiện trong thư mục**, **Lưu vào…**.
4. Tệp lưu mặc định vào thư mục `Tải về/3T Office`.

### 1.3 Nguyên tắc tiện dụng
- Không tài khoản, không cài thêm, không cấu hình cổng/IP.
- Toàn bộ chữ tiếng Việt (có bản EN), nút lớn, bàn phím dùng được (Tab, Enter, Esc), đọc được bằng trình đọc màn hình.
- Mọi trạng thái lỗi nói rõ nguyên nhân và cách xử lý (xem §10).
- Người dùng chỉ thấy một dòng nhỏ cho biết đường truyền: `Trực tiếp (cùng mạng)`, `Trực tiếp (Internet)` hoặc `Qua máy chủ 3T`. Không bắt chọn.

---

## 2. Kiến trúc tổng thể

```
        ┌──────── Ứng dụng (Writer / Sheet / Slides) ────────┐
        │  UI chung: hộp thoại Gửi / Nhận  (platform/dialogs)  │
        └───────────────────────┬──────────────────────────────┘
                                │ lệnh common.transfer.send / .receive
                ┌───────────────▼────────────────┐
                │  Lõi 3T Transfer (platform/transfer)│
                │  mã · PAKE · mã hóa · chia khối  │
                │  máy trạng thái chọn đường        │
                └───┬──────────┬───────────┬───────┘
         Đường A    │  Đường B │   Đường C │
        LAN trực tiếp│ P2P Internet│ Chuyển tiếp 3T
        (TCP + mDNS)│ (WebRTC)   │ (WebSocket/HTTPS)
                    └──────┬─────┴───────────┘
                           │ chỉ bắt tay, không chứa tệp
                 ┌─────────▼──────────┐
                 │ 3t-api: /api/v1/transfer/* │  (tín hiệu + chuyển tiếp dự phòng)
                 └────────────────────┘
```

Quy tắc phân lớp (AGENTS.md §4): UI → lệnh → Lõi Transfer → cầu nối hệ điều hành. UI **không** gọi trực tiếp socket/WebRTC; app Writer/Sheet/Slides không import lẫn nhau.

### 2.1 Vị trí mã nguồn (monorepo, không tách codebase)
| Thành phần | Thư mục | Ghi chú |
|---|---|---|
| Lõi giao thức (JS thuần) | `platform/transfer/` | `code.js`, `pake.js`, `crypto.js`, `chunker.js`, `session.js`, `route.js`, `transport-*.js` |
| Hộp thoại + ribbon | `platform/dialogs/transfer-dialog.js` + đăng ký lệnh trong `platform/commands/` | dùng `platform/ui-kit` |
| Cầu nối OS (Python) | `platform/os_services/<nền-tảng>.py`, `ports/<nền-tảng>/` | thư mục lưu, mở tệp, mDNS, share-sheet |
| Dịch vụ LAN/Python | `platform/transfer_service.py` (dùng chung Win/mac/Linux) | socket TCP + mDNS trong tiến trình `main.py` |
| Máy chủ | repo máy chủ `3t-api` (nhóm `transfer`) + `docs/` mô tả API | không nằm trong app |
| Help / i18n | `platform/help/entries-*.js`, `platform/i18n/strings-{vi,en}.js` | bắt buộc (AGENTS.md §10) |
| Test | `tests/unit/transfer-*.test.js`, `tests/test_transfer_*.py`, `tests/live/cdp/transfer-*.desktop.mjs` | |

Không đặt điều kiện theo hệ điều hành rải rác trong `apps/` hay `platform/*.js` (AGENTS.md §12).

---

## 3. Mã chia sẻ

- Định dạng hiển thị: `SSS-RRRR` — `SSS` = **số khe** (slot) 3 ký tự do máy chủ cấp (định tuyến), `RRRR` = **4 ký tự bí mật** ngẫu nhiên từ bảng chữ 31 ký tự: `23456789ABCDEFGHJKMNPQRSTUVWXYZ` (bỏ 0 O 1 I L). Với `RRRR`: 31⁴ ≈ 923 nghìn ≈ 20 bit. Tăng lên 6 ký tự (≈ 30 bit) nếu §14.1 yêu cầu.
- Bí mật chỉ dùng làm mật khẩu cho PAKE (§4); **không bao giờ** gửi lên máy chủ ở dạng rõ.
- Tạo mã bằng CSPRNG (`crypto.getRandomValues` / `secrets`), không dùng `Math.random`.
- Mã **một lần**, hết hạn **10 phút** (chỉnh được 2–30), hủy ngay khi người gửi bấm Hủy hoặc đóng hộp thoại.
- Máy chủ khóa khe sau **3 lần PAKE sai** và khóa theo IP (rate-limit §7.4).
- Mã QR mã hóa: `https://office.3tcomputer.com/r/SSS-RRRR` (trang này không chứa tệp; nếu app đã cài thì mở app bằng liên kết sâu `vnoffice://receive?code=…`, chưa cài thì hiện hướng dẫn tải app). Bí mật nằm ở phần sau dấu `#` của URL để không gửi lên máy chủ.

---

## 4. Mật mã (quyết định kỹ thuật)

| Mục | Quyết định | Lý do |
|---|---|---|
| Bắt tay từ mã ngắn | **PAKE**: ưu tiên **CPace** (cân bằng, RFC đang chuẩn hóa) hoặc **SPAKE2** trên Ed25519; cài trên `@noble/curves` (MIT, JS thuần, đã kiểm toán) cho JS; Python dùng `spake2`/`cryptography` (MIT/Apache-2.0/BSD) | Kẻ nghe lén hoặc máy chủ **không thể** suy ra khóa từ mã ngắn; chỉ đoán được online, bị khóa sau 3 lần |
| Hàm băm/khóa dẫn xuất | HKDF-SHA256 tách khóa: `k_enc`, `k_auth`, `k_tag` | |
| Mã hóa tệp | **XChaCha20-Poly1305** (hoặc AES-256-GCM nếu WebCrypto của nền tảng không có XChaCha), khối 256 KiB – 1 MiB, nonce = (id phiên ‖ số thứ tự khối), thêm AAD = số khối + cờ cuối | Chống chèn/đảo/cắt khối |
| Xác nhận khóa | Hai bên trao đổi `MAC(k_auth, bản ghi bắt tay)`; sai → hủy phiên, báo "Mã không đúng" | Phát hiện kẻ chen giữa |
| Siêu dữ liệu | Tên tệp, kích thước, hash SHA-256 toàn tệp, kiểu MIME nằm **trong phần đã mã hóa** (khối 0) | Máy chủ không biết tên tệp |
| Xác minh cuối | Người nhận tính SHA-256 toàn tệp và so với khối 0 trước khi cho mở | Đảm bảo tệp không hỏng |
| Dấu vân tay để người dùng kiểm | Hiển thị 3 từ/emoji từ hash khóa phiên ở cả hai máy (tùy chọn "Xác nhận an toàn") | Cho môi trường nhạy cảm |

Cấm: tự chế thuật toán, dùng ECB/CBC không xác thực, dùng lại nonce, ghi mã/khóa vào log, gửi bí mật lên máy chủ.
Kiểm thử bắt buộc: test vector công khai của thuật toán + test chống cắt khối, đảo khối, nonce trùng, mã sai.

---

## 5. Giao thức (từng bước)

Ký hiệu: S = người gửi, R = người nhận, H = máy chủ tín hiệu (`3t-api`).

1. **Mở khe.** S → H `POST /api/v1/transfer/open {app, ver, platform, caps}` → H trả `slot`, `sid` (id phiên 128-bit), `ttl`, danh sách `ice` (STUN/TURN có chứng thực ngắn hạn), `relay_url`. S sinh `RRRR`, hiển thị mã `slot-RRRR`.
2. **Nhập mã.** R → H `POST /transfer/join {slot}` → H trả `sid`, `ice`. Nếu khe không tồn tại / hết hạn / đã dùng → lỗi chung "Mã không đúng hoặc đã hết hạn" (không phân biệt, chống dò).
3. **PAKE qua hộp thư.** S và R trao đổi thông điệp PAKE thông qua H (`POST/GET /transfer/{sid}/mailbox`, long-poll hoặc WebSocket). H chỉ chuyển byte, đếm số lần lỗi.
4. **Xác nhận khóa** (§4). Từ đây mọi thứ đều mã hóa.
5. **Trao đổi khả năng & ứng viên đường truyền** (mã hóa): mỗi bên gửi
   - địa chỉ LAN (IP:cổng TCP đang lắng nghe + token một lần),
   - ứng viên ICE cho WebRTC,
   - khả năng của nền tảng (`lan`, `webrtc`, `relay`, kích thước khối tối đa).
6. **Chọn đường** (§6) rồi **truyền khối**: S gửi khối 0 (siêu dữ liệu) → R thấy tên tệp và bấm Nhận → S gửi khối 1..N; R trả ACK theo cửa sổ (kích thước cửa sổ 8 khối); mất đường thì tiếp tục từ khối chưa ACK (§6.3).
7. **Kết thúc.** R báo `done` kèm hash đã xác minh; S báo xong; cả hai gọi `POST /transfer/{sid}/close`; H xóa khe và mọi byte còn lại ngay.

Mọi thông điệp có `ver` và `type`; bản cũ gặp thông điệp lạ phải bỏ qua và báo "Cần cập nhật app" thay vì lỗi mơ hồ.

---

## 6. Chọn đường truyền tự động

### 6.1 Ba đường
| Đường | Công nghệ | Khi nào dùng | Ưu / nhược |
|---|---|---|---|
| **A. LAN trực tiếp** | S lắng nghe TCP trên cổng ngẫu nhiên, quảng bá mDNS `_vnotransfer._tcp` kèm token băm theo `sid`; R thử kết nối tới địa chỉ LAN mà S đã gửi ở bước 5 | Hai máy cùng mạng | Nhanh nhất (hết băng thông LAN), không qua Internet |
| **B. P2P Internet** | WebRTC DataChannel (ICE + STUN), chạy trong WebView hoặc `aiortc` (Python) | Khác mạng | Nhanh, không qua máy chủ; ~10–20% mạng không nối được |
| **C. Chuyển tiếp 3T** | WebSocket/HTTPS tới `relay_url`, chỉ chuyển khối đã mã hóa; hoặc TURN (coturn) cho WebRTC | Hai đường trên thất bại | Luôn dùng được; chậm hơn; giới hạn dung lượng |

### 6.2 Máy trạng thái (chạy ở cả hai bên, quyết định giống nhau nhờ quy tắc cố định)
```
HANDSHAKE_OK
   ├─ thử A và B song song (thời hạn 4 s cho A, 8 s cho B)
   ├─ A nối được → dùng A
   ├─ else B nối được → dùng B
   └─ else (hết hạn) → dùng C   (giữ nguyên khóa phiên, không bắt nhập lại mã)
Trong khi truyền: nếu đường hiện tại đứt / tốc độ < ngưỡng 10 s liên tục
   → hạ xuống đường kế tiếp (A→B→C), gửi tiếp từ khối chưa ACK
Không bao giờ nâng cấp ngược giữa chừng (tránh nhảy qua lại).
```
Quy tắc ưu tiên: A > B > C. Nếu cả hai bên không có khả năng B (ví dụ WebView không hỗ trợ), bỏ B.

### 6.3 Tiếp tục khi đứt
- Người nhận ghi bản nhận dở vào `.part` + danh sách khối đã xác nhận.
- Kết nối lại trong cùng phiên (khóa còn hiệu lực, mã chưa hết hạn) → hỏi "Tiếp tục nhận?" hoặc tự tiếp tục nếu đã đồng ý.
- Quá hạn mã hoặc một bên thoát → hủy, xóa `.part` (người dùng được hỏi giữ hay xóa).

### 6.4 Máy chủ chuyển tiếp (đường C)
- Chỉ chuyển byte đã mã hóa; không có khóa. Lưu tạm trong RAM/đĩa **chỉ khi người nhận chưa kịp kết nối**, tối đa 10 phút, xóa sau khi người nhận ACK hoặc khi hết hạn.
- Giới hạn mặc định: **100 MB/tệp, 500 MB/ngày/IP** (cấu hình). Đường A và B **không có giới hạn** dung lượng của 3T (chỉ giới hạn bởi đĩa và thời hạn mã trong phần bắt tay).
- Khi tệp vượt giới hạn C và A/B không nối được: báo rõ "Không nối thẳng được hai máy này. Tệp lớn hơn 100 MB nên không thể gửi qua máy chủ. Hãy thử cùng mạng Wi-Fi hoặc chép bằng USB."

---

## 7. Máy chủ (`3t-api`, nhóm `transfer`)

### 7.1 Điểm cuối
| Phương thức | Đường dẫn | Mô tả |
|---|---|---|
| POST | `/api/v1/transfer/open` | mở khe, trả slot/sid/ice/relay_url |
| POST | `/api/v1/transfer/join` | vào khe bằng slot |
| GET/POST | `/api/v1/transfer/{sid}/mailbox` | hộp thư tín hiệu (long-poll hoặc WS) |
| WS | `/api/v1/transfer/{sid}/relay` | đường C, khung nhị phân đã mã hóa |
| POST | `/api/v1/transfer/{sid}/close` | đóng/hủy khe, xóa dữ liệu |
| GET | `/api/v1/transfer/health` | giám sát |

### 7.2 Dữ liệu lưu
Bảng khe `(slot, sid_hash, created, expires, state, fail_count, ip_hash)`; **không lưu** mã bí mật, khóa, tên tệp, nội dung. Dữ liệu chuyển tiếp lưu tạm có mã hóa và TTL.

### 7.3 Hạ tầng
- Dùng chung máy chủ và Cloudflare Tunnel hiện có (SPEC-3T-CLOUD §3, **không tạo tunnel mới**); STUN/TURN chạy `coturn` (BSD-3-Clause, cần xác minh khi cài) trên cổng 3478/5349; TURN dùng thông tin xác thực ngắn hạn (HMAC, 10 phút) cấp theo phiên. Cloudflare Tunnel **không** chuyển UDP tự do → cần cổng UDP công khai cho TURN trên `3tserver`/VPS (xem rủi ro §12).
- Mọi thứ qua HTTPS (TLS); WS dùng `wss`.

### 7.4 Chống lạm dụng
Rate-limit theo IP cho `open/join` (ví dụ 20/phút), tối đa 3 lần PAKE sai/khe, tối đa 5 khe mở đồng thời/IP, giới hạn băng thông đường C, chặn tệp khi máy chủ đầy. Không cho phép liệt kê khe. Nhật ký chỉ ghi: thời điểm, kết quả, kích thước, đường truyền, mã nền tảng — không ghi mã, tên tệp, địa chỉ IP rõ (băm có muối).

---

## 8. Chi tiết theo nền tảng

| Nền tảng | Vỏ ứng dụng | Đường A (LAN) | Đường B (P2P) | Đường C | Chia sẻ hệ thống / mở tệp |
|---|---|---|---|---|---|
| **Windows** | Python `main.py` + WebView2 | Python (`socket`, `zeroconf` LGPL → xem §14.3 hoặc tự cài mDNS tối thiểu) | WebRTC của WebView2 | có | Mở bằng app đã đăng ký đuôi; thông báo Windows |
| **macOS** | `ports/macos` + WKWebView | Python như Windows; quyền "Local Network" trong Info.plist | WebRTC của WKWebView hoặc `aiortc` | có | `NSSharingService`, kéo-thả vào Dock |
| **Linux** | Python + WebKitGTK/Qt WebEngine | Python như Windows (Avahi tùy chọn) | WebRTC của engine hoặc `aiortc` | có | `xdg-open`, portal chia sẻ |
| **iOS / iPadOS** | vỏ native + WKWebView (xem SPEC-MOBILE) | `Network.framework` (Bonjour) qua cầu nối Swift | WebRTC trong WKWebView **hạn chế** (xem rủi ro §12) → mặc định dùng C nếu B không nối được | có (đường chắc chắn nhất) | Share Sheet / Files / AirDrop-handoff; "Open in…"; Local Network permission |
| **Android** | vỏ native + Android WebView | `NsdManager` qua cầu nối Kotlin | WebRTC trong WebView | có | Intent `SEND`/`VIEW`, Storage Access Framework |

Điện thoại ở nền: iOS/Android có thể ngắt kết nối khi app xuống nền. Quy tắc: giữ màn hình sáng trong lúc truyền (wake-lock), hiển thị cảnh báo "Giữ ứng dụng ở phía trước đến khi xong"; nếu bị ngắt, tiếp tục từ khối chưa ACK (§6.3).

Người dùng điện thoại gửi/nhận cùng hệ thống với desktop: giao thức, mã, định dạng khối là **một**; mỗi nền tảng chỉ viết "bộ chuyển vận" (`transport-*`) và cầu nối OS.

---

## 9. Giao diện & lệnh (cho từng team)

### 9.1 Lệnh (đăng ký trong `platform/commands/`, dùng chung)
`common.transfer.send` (Gửi bằng mã…) · `common.transfer.receive` (Nhận bằng mã…) · `common.transfer.cancel` · `common.transfer.copyCode` · `common.transfer.openReceived`.
Vị trí ribbon: Tệp (Backstage) > Chia sẻ; tab Trợ giúp có mục "Gửi/Nhận tệp". Không thêm tab mới.

### 9.2 Hộp thoại
`TransferSendDialog`, `TransferReceiveDialog` trong `platform/dialogs/`, dựng bằng ui-kit; có trạng thái: rỗng, đang chờ, đang kết nối, đang truyền, hoàn tất, lỗi, hết hạn, đã hủy. Hộp thoại không khóa app (người dùng vẫn soạn tài liệu trong khi truyền), có thể thu nhỏ thành chip trên thanh trạng thái.

### 9.3 Hướng dẫn sử dụng (bắt buộc, AGENTS.md §10)
Mỗi team thêm bài Help tiếng Việt (và EN) đúng UI thực tế: tính năng làm gì, truy cập ở đâu, các bước Gửi/Nhận, ý nghĩa các trạng thái, xử lý lỗi, nói rõ tệp được mã hóa và máy chủ không đọc được. Không dùng tên thương hiệu độc quyền trong nội dung (test hiện có kiểm tra). Cập nhật số lệnh trong `tests/unit/help-coverage.test.js`.

---

## 10. Trạng thái lỗi (mỗi lỗi có chữ Việt rõ ràng, không im lặng)

| Tình huống | Thông báo gợi ý | Hành động |
|---|---|---|
| Không có mạng | "Không có kết nối mạng. Nếu hai máy cùng Wi-Fi, hãy thử lại; hoặc lưu tệp rồi chép bằng USB." | Thử lại / Hủy (đường A vẫn dùng được nếu cùng LAN dù không có Internet) |
| Mã sai / hết hạn / đã dùng | "Mã không đúng hoặc đã hết hạn." | Nhập lại / yêu cầu gửi lại |
| Khe bị khóa (3 lần sai) | "Mã này đã bị khóa vì nhập sai nhiều lần. Nhờ người gửi tạo mã mới." | |
| Người gửi hủy | "Người gửi đã hủy." | |
| Đứt giữa chừng | "Mất kết nối, đang thử lại…" → tiếp tục | Tiếp tục / Hủy |
| Quá giới hạn dung lượng đường C | xem §6.4 | |
| Sai hash cuối | "Tệp nhận về bị lỗi, đã xóa. Vui lòng gửi lại." | |
| Đĩa đầy / không ghi được | nêu thư mục và dung lượng cần | Chọn thư mục khác |
| Bản app quá cũ | "Cần cập nhật ứng dụng để nhận tệp này." | Mở cập nhật |
| Định dạng không hỗ trợ mở | "Đã lưu tại … (không mở được bằng 3T Office)." | Hiện trong thư mục |

---

## 11. Bảo mật & riêng tư (mô hình đe dọa tóm tắt)

| Mối đe dọa | Biện pháp |
|---|---|
| Máy chủ 3T bị xâm nhập / tò mò | Tệp và tên tệp mã hóa đầu-cuối; không có khóa trên máy chủ |
| Kẻ nghe lén mạng | PAKE + AEAD; không có gì dùng được từ bản ghi |
| Kẻ đoán mã | PAKE không cho đoán offline; 3 lần sai khóa khe; hết hạn 10 phút; rate-limit |
| Kẻ chen giữa (MITM) | Xác nhận khóa hai chiều; tùy chọn so khớp "dấu vân tay" |
| Gửi nhầm | Người nhận thấy tên/kích thước/tên máy trước và phải bấm Nhận; có Từ chối |
| Tệp độc hại | Tệp nhận về chỉ được lưu; mở bằng cùng đường mở tệp an toàn hiện có của app; không tự chạy macro/nội dung chủ động |
| Rò dữ liệu qua log/telemetry | Không ghi nội dung, tên tệp, mã; báo lỗi chỉ kỹ thuật |
| Lạm dụng làm kho lưu trữ/đường chuyển phát | Giới hạn dung lượng/TTL/rate; xóa sau khi nhận |

Tuân thủ AGENTS.md: không gửi nội dung tài liệu ra AI/cloud âm thầm — tính năng này chỉ chạy khi người dùng bấm Gửi và xác nhận; thêm bài Help nói rõ.

---

## 12. Rủi ro đã biết (từ tìm hiểu ngày 17/10, cần xác minh trên thiết bị thật)

1. **WebRTC trong WKWebView (iOS/iPadOS):** có báo cáo truyền tệp qua DataChannel trên Safari/iOS đôi lúc thất bại, trình duyệt không lộ ứng viên "host" nên thường cần TURN; kết nối dữ liệu có thể bị ngắt khi app xuống nền. → Trên iOS/iPadOS **đường C là đường bảo đảm**, B là cơ hội; không hứa B. Đo thực tế trước khi dựa vào nó.
2. **Cloudflare Tunnel không chuyển UDP:** STUN/TURN cần cổng UDP công khai. → Cần quyết định hạ tầng (§14.2); nếu chưa có, bỏ B ở giai đoạn đầu, giữ A (LAN) và C.
3. **PAKE JS:** chưa thấy thư viện CPace/SPAKE2 JS giữ hơn bản WASM nhỏ; dùng `@noble/curves` tự ghép theo spec phải có test vector và người kiểm tra mật mã trước phát hành (§14.4).
4. **Android WebView + WebRTC:** chưa có số liệu giới hạn; đo trên máy thật (Android 9–15).
5. **Quyền mạng cục bộ:** iOS 14+ và macOS 15+ yêu cầu quyền "Local Network"; nếu người dùng từ chối, đường A không dùng được → tự rơi về B/C và giải thích.
6. **Hai máy không cùng online:** phương án này yêu cầu người nhận có mặt trong 10 phút; không thay thế dịch vụ lưu trữ lâu dài.

---

## 13. Kế hoạch, chia việc cho team, nghiệm thu

### 13.1 Giai đoạn
| GĐ | Nội dung | Kết quả |
|---|---|---|
| 0 | Chốt thư viện PAKE & AEAD, đo thử WebRTC trên WKWebView/Android, quyết hạ tầng UDP | Báo cáo + ADR ngắn |
| 1 | Lõi `platform/transfer/` (mã, PAKE, AEAD, chia khối, máy trạng thái) + máy chủ `transfer/*` + **đường C** + hộp thoại Gửi/Nhận trên Windows | Gửi/nhận qua C giữa 2 app Windows |
| 2 | **Đường A (LAN)** trên Windows/macOS/Linux; tích hợp mở đúng app theo đuôi; Help VI/EN | Cùng mạng truyền thẳng, đo tốc độ |
| 3 | **Đường B (P2P)** + TURN; tự chuyển đường & tiếp tục khi đứt | Khác mạng nối thẳng, ép lỗi để thử chuyển đường |
| 4 | Mobile: iOS/iPadOS, Android (QR, share-sheet, wake-lock) | Gửi/nhận chéo mọi cặp nền tảng |
| 5 | Kiểm toán mật mã, thử tải, tài liệu phát hành | Duyệt phát hành |

### 13.2 Chủ sở hữu (AGENTS.md §5, mỗi team một nhánh + worktree riêng)
| Việc | Nhánh gợi ý | Chủ |
|---|---|---|
| Lõi + hộp thoại + lệnh + Help | `feat/transfer-core` | Platform |
| API máy chủ, coturn | `feat/transfer-server` (repo máy chủ) | Server |
| Dịch vụ LAN Python (Win/Linux) | `feat/transfer-lan` | Platform/Python |
| macOS | `mac/transfer` | Team macOS |
| iOS/iPadOS | `platform/mobile` → `mobile/transfer-ios` | Team Mobile |
| Android | `mobile/transfer-android` | Team Mobile |
Mã dùng chung sửa ở `main` trước; mã riêng nền tảng chỉ ở `platform/os_services/<nền-tảng>.py` và `ports/<nền-tảng>/` (SPEC-PLATFORMS-AND-BRANCHES).

### 13.3 Tiêu chí nghiệm thu (đo được, báo PASS/FAIL/NOT RUN/BLOCKED kèm số liệu)
1. Gửi/nhận `.docx`, `.xlsx`, `.pptx` 1 KB, 10 MB, 100 MB và 1 GB (A/B) — SHA-256 hai đầu **trùng nhau**; mở được trong đúng app.
2. Mọi cặp nền tảng gửi↔nhận (6×6) hoạt động qua ít nhất đường C; cặp cùng LAN đạt ≥ 70% băng thông đo bằng `iperf`.
3. Mã sai 3 lần → khe bị khóa; mã hết hạn → báo đúng; mã dùng lần hai → báo đúng.
4. Rút mạng giữa chừng → tự hạ xuống đường kế tiếp/ tiếp tục, không gửi lại từ đầu, hash cuối trùng.
5. Máy chủ **không** chứa tên tệp/nội dung/khóa (kiểm tra bằng cách dump CSDL và bộ nhớ chuyển tiếp trong test).
6. Test vector mật mã và test chống cắt/đảo khối đều PASS; kiểm toán độc lập không còn lỗi mức cao.
7. UI: bàn phím dùng được, đủ trạng thái, mọi lỗi §10 hiện đúng chữ; Help VI/EN có và qua `help-coverage`; i18n parity 0 thiếu.
8. `npm test` và các bộ test liên quan PASS; kiểm giao diện trên app desktop **qua CDP** (không SendKeys/AppleScript).

### 13.4 Giấy phép (yêu cầu của chủ dự án: không phụ thuộc có phí/độc quyền, không dùng AGPL)
Chỉ nhận thư viện MIT/BSD/Apache-2.0/ISC. Đề xuất: `@noble/curves`, `@noble/ciphers`, `@noble/hashes` (MIT); Python `cryptography` (Apache-2.0/BSD), `spake2` (MIT), `aiortc` (BSD-3); `coturn` (BSD-3, xác minh). `python-zeroconf` là **LGPL** → cần chủ dự án duyệt hoặc tự cài mDNS tối thiểu (§14.3). Mỗi thư viện mới phải ghi giấy phép vào báo cáo GĐ0 trước khi merge.

---

## 14. Điểm còn cần quyết định / xác minh khi làm (không chặn khởi động)

1. **Độ dài bí mật mã**: 4 ký tự (≈20 bit, tiện nhất, an toàn nhờ PAKE + khóa sau 3 lần) hay 6 ký tự (≈30 bit). Đề xuất bắt đầu 4, cho cấu hình lên 6 nếu kiểm toán yêu cầu.
2. **Hạ tầng UDP cho TURN**: máy chủ nào có IP công khai và mở được 3478/5349 (UDP/TCP). Nếu chưa, GĐ3 chỉ làm STUN + dựa vào C.
3. **mDNS**: dùng `python-zeroconf` (LGPL, cần duyệt) hay cài mDNS/UDP-broadcast tối thiểu tự viết (giấy phép sạch). Đề xuất tự viết nếu không duyệt.
4. **Kiểm toán mật mã** bởi người ngoài nhóm trước khi bật mặc định cho người dùng.
5. Giới hạn dung lượng/thời hạn của đường C (đề xuất 100 MB / 10 phút) — chỉnh được qua cấu hình máy chủ không cần phát hành lại app.
6. Có bật "Xác nhận an toàn" (dấu vân tay) mặc định cho tệp doanh nghiệp hay chỉ tùy chọn.

---

## 15. Việc đầu tiên cho mỗi team (để clone về làm được ngay)

1. `git clone` kho dùng chung, đọc: `AGENTS.md`, `docs/SPEC-PLATFORMS-AND-BRANCHES.md`, tệp này, và SPEC riêng của nền tảng (`docs/SPEC-MACOS-PORT.md`, `docs/SPEC-MOBILE.md`).
2. Tạo nhánh + worktree riêng theo bảng §13.2; không sửa vùng của team khác — tạo dependency/handoff.
3. Bắt đầu từ **GĐ0** (báo cáo ngắn: thư viện, đo WebRTC trên nền tảng của team, rủi ro).
4. Mọi PR kèm: kế hoạch (AGENTS.md §6), test chạy thật với PASS/FAIL/NOT RUN/BLOCKED, bài Help VI/EN, i18n parity, handoff chuẩn.
5. Giao diện chỉ kiểm qua CDP; không điều khiển hệ điều hành bằng SendKeys/AppleScript/cliclick.
