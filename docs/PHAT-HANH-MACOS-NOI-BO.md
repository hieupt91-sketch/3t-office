# Quy trình phát hành bản cài đặt macOS nội bộ cho 3T Office

Tài liệu này hướng dẫn chi tiết quy trình chuẩn bị, phát hành và kiểm thử bản cài đặt macOS (.pkg) phục vụ sử dụng nội bộ trong hệ thống 3T Office, đảm bảo tính toàn vẹn dữ liệu và an toàn triển khai.

---

## 1. Quy ước đặt tên tệp bộ cài

Bộ cài đặt cho macOS tuân thủ định dạng chuẩn hóa:

```text
3T-Office-<phiên-bản>-<kiến-trúc>[-unsigned][-final][-vN].pkg
```

(Đồng thời hỗ trợ định dạng phụ `VNOffice-macOS-<phiên-bản>-<kiến-trúc>.dmg` nếu có).

Trong đó:
- `<phiên-bản>`: Phiên bản bản phát hành (ví dụ: `0.9.11`, `0.9.12`).
- `<kiến-trúc>`:
  - `arm64`: Bộ cài tối ưu cho vi xử lý Apple Silicon (M1/M2/M3/M4) — kiến trúc mục tiêu chính của bản nội bộ.
  - `universal`: Bộ cài Universal nhị phân hỗ trợ cả Apple Silicon và Intel.
  - `x64`: Bộ cài riêng cho Intel x86_64.
- Hậu tố tùy chọn:
  - `-unsigned`: Bản đóng gói nội bộ chưa ký điện tử (notarize).
  - `-final`: Bản đóng gói chốt đợt kiểm thử.
  - `-vN`: Số thứ tự lần đóng gói (ví dụ: `-v2`).
- Đuôi tệp hợp lệ: `.pkg` là chính, `.dmg` là phụ (hoặc `.zip`).
- Tệp mẫu thực tế của team Mac:
  ```text
  3T-Office-0.9.11-arm64-unsigned-final-v2.pkg
  ```

> **Lưu ý bảo mật:** Tên tệp chỉ chứa ký tự chữ cái tiếng Anh, chữ số, dấu gạch nối `-`, dấu gạch dưới `_` và dấu chấm `.`. Tuyệt đối không chứa khoảng trắng, dấu tiếng Việt hoặc ký tự dẫn hướng đường dẫn (`..`, `/`, `\`).

---

## 2. Việc của Team macOS

Team macOS thực hiện đóng gói và kiểm thử trực tiếp trên máy Mac thật (theo lộ trình MAC-8 trong `docs/THONG-TIN-TEAM-MAC-1710.md`):

1. **Đóng gói ứng dụng:**
   - Biên dịch và đóng gói bộ ứng dụng thành gói cài đặt `.pkg` kiến trúc `arm64` (Apple Silicon), trạng thái chưa ký (unsigned).
   - Tên tệp chuẩn: `3T-Office-0.9.11-arm64-unsigned-final-v2.pkg`.
2. **Kiểm tra và tính mã băm toàn vẹn:**
   - Mở Terminal trên macOS và chạy lệnh tính mã băm SHA-256:
     ```bash
     shasum -a 256 3T-Office-0.9.11-arm64-unsigned-final-v2.pkg
     ```
   - Mã băm SHA-256 chờ khớp của bản build mẫu:
     ```text
     01b7b04eca310869fc09b51c39afc1e06818c01a41476c4bd2346309a32fc978
     ```
3. **Bàn giao cho người phụ trách phát hành:**
   - Chuyển tệp `.pkg` và chuỗi mã băm SHA-256 sang máy làm việc của người phụ trách phát hành qua kênh lưu trữ nội bộ an toàn.

---

## 3. Việc của Người phụ trách phát hành

Sau khi nhận tệp bộ cài và mã băm từ Team macOS:

### Bước 3.1. Chạy thử nghiệm ở chế độ an toàn (-WhatIf)
Chạy script phát hành với cờ `-WhatIf` để kiểm tra thông tin phiên bản, kiến trúc, mã băm cục bộ mà không tác động tới máy chủ:
```powershell
powershell -File scripts\release\publish-macos-web.ps1 -Installer E:\VNOffice-dist\3T-Office-0.9.11-arm64-unsigned-final-v2.pkg -WhatIf
```
Xác nhận:
- Phiên bản trích xuất: `0.9.11`.
- Kiến trúc: `Apple Silicon (arm64)`.
- Định dạng: `.pkg`.
- Mã băm SHA-256 tính được trùng khớp tuyệt đối với mã băm Team Mac cung cấp (`01b7b04e...`).

### Bước 3.2. Đẩy bộ cài lên máy chủ và cập nhật dữ liệu web
Chạy lệnh phát hành chính thức:
```powershell
powershell -File scripts\release\publish-macos-web.ps1 -Installer E:\VNOffice-dist\3T-Office-0.9.11-arm64-unsigned-final-v2.pkg
```
Script sẽ thực hiện:
- Kiểm tra tính hợp lệ của tệp và tên tệp.
- Gọi `upload-installer-to-vps.ps1` để chuyển tệp tạm `.part` lên `/srv/3t-office-cloud/app/downloads/`.
- Kiểm tra mã băm SHA-256 trên máy chủ từ xa trước khi đổi tên công bố chính thức.
- Cập nhật tệp dữ liệu `server/3t-web/data/release-macos.json` với phiên bản, tên tệp `.pkg`, dung lượng, mã băm và ghi chú cài đặt.

### Bước 3.3. Triển khai giao diện web lên máy chủ (VPS)
Thực hiện triển khai trang web cập nhật (theo quy trình đóng gói tar -> scp -> giải nén tại chỗ):
```powershell
powershell -File scripts\release\deploy-web-to-vps.ps1
```
Nếu có cập nhật regex tên tệp tải về trên máy chủ API, khởi động lại dịch vụ API:
```bash
docker compose restart api
```

---

## 4. Hướng dẫn cài đặt cho người dùng macOS

Dành cho người dùng nội bộ khi tải bản cài đặt `.pkg` từ trang web:

1. **Tải về:**
   - Truy cập trang chủ hoặc trang Tải về trên website nội bộ 3T Office.
   - Nhấp nút **Tải bản cài đặt macOS** để lưu tệp `.pkg`.
2. **Kiểm tra mã băm toàn vẹn (tùy chọn):**
   - Mở **Terminal** và chạy:
     ```bash
     shasum -a 256 ~/Downloads/3T-Office-0.9.11-arm64-unsigned-final-v2.pkg
     ```
   - Nhấp nút **Sao chép mã** trên website và đối chiếu kết quả băm SHA-256.
3. **Cài đặt vào máy (bản dùng thử chưa ký):**
   - Vì bản dùng thử nội bộ chưa ký chứng chỉ Apple Developer, macOS Gatekeeper sẽ chặn mở trực tiếp bằng nhấp đúp chuột.
   - **Cách 1:** Nhấp chuột phải (hoặc giữ phím `Control` + nhấp) vào tệp `.pkg` > chọn **Mở** (Open) > bấm xác nhận **Mở** (Open) ở hộp thoại cảnh báo.
   - **Cách 2:** Nếu macOS chặn không cho mở, vào **System Settings > Privacy & Security** (Cài đặt hệ thống > Quyền riêng tư & Bảo mật), cuộn xuống mục Bảo mật và bấm **Open Anyway** (Vẫn mở).
   - Làm theo các bước hướng dẫn trên màn hình của trình cài đặt macOS Installer để hoàn tất cài đặt ứng dụng vào thư mục `/Applications`.

---

## 5. Danh sách kiểm tra sau triển khai (Post-Deployment Checklist)

Sau khi hoàn tất đưa bộ cài và giao diện web lên máy chủ sản xuất, người phụ trách cần chạy kiểm tra các điểm sau:

1. **Kiểm tra yêu cầu HEAD:**
   ```bash
   curl -I https://office.3tcomputer.com/downloads/3T-Office-0.9.11-arm64-unsigned-final-v2.pkg
   ```
   *Yêu cầu:* Trả về mã HTTP `200 OK`, có tiêu đề `Accept-Ranges: bytes`, `Content-Length` đúng dung lượng thực tế, `Content-Disposition: attachment`.
2. **Kiểm tra khả năng tải từng phần (HTTP Range):**
   ```bash
   curl -r 0-1023 -I https://office.3tcomputer.com/downloads/3T-Office-0.9.11-arm64-unsigned-final-v2.pkg
   ```
   *Yêu cầu:* Trả về mã HTTP `206 Partial Content`, tiêu đề `Content-Range: bytes 0-1023/...`.
3. **Kiểm tra tải toàn vẹn qua Cloudflare / mạng:**
   - Tải tệp hoàn chỉnh về máy và kiểm tra lại mã băm SHA-256:
     ```bash
     shasum -a 256 3T-Office-0.9.11-arm64-unsigned-final-v2.pkg
     ```
   *Yêu cầu:* Khớp 100% với mã `01b7b04eca310869fc09b51c39afc1e06818c01a41476c4bd2346309a32fc978` công bố trên website.
4. **Kiểm tra hiển thị trên trình duyệt:**
   - Mở `https://office.3tcomputer.com/` và `https://office.3tcomputer.com/tai-ve.html`.
   - Xác nhận thẻ macOS hiển thị đầy đủ thông tin: tên tệp `.pkg`, kiến trúc Apple Silicon (arm64), nút tải hoạt động, nút sao chép mã băm SHA-256 hoạt động chuẩn xác, hướng dẫn bàn phím và trợ năng đầy đủ.
