# VN Office pilot error report receiver

Receiver nhỏ dùng Python standard library (`http.server`, `ThreadingHTTPServer`); không cần pip package, database hoặc dịch vụ SaaS. Chỉ mở cổng qua reverse proxy HTTPS. Dịch vụ mặc định bind vào `127.0.0.1:8765`.

## Cấu hình bí mật ngoài repository

Tạo file `/etc/vnoffice-error-report-server.json` trên VPS và giới hạn quyền đọc cho tài khoản dịch vụ:

```json
{
  "token": "THAY_BANG_CHUOI_NGAU_NHIEN_DAI",
  "view_user": "pilot-admin",
  "view_password": "THAY_BANG_MAT_KHAU_NGAU_NHIEN"
}
```

Sinh giá trị bí mật trên máy chủ bằng `openssl rand -hex 32`; không đưa giá trị thật vào source, log, issue hoặc commit. Có thể thay file cấu hình bằng các biến `VNO_REPORT_SERVER_TOKEN`, `VNO_REPORT_VIEW_USER`, `VNO_REPORT_VIEW_PASSWORD`; đường dẫn file có thể đặt qua `VNO_REPORT_SERVER_CONFIG`. Token Bearer xác thực POST và cũng xem được trang tổng hợp; tài khoản Basic riêng bảo vệ trang xem trong trình duyệt.

## Chạy thử

```sh
VNO_REPORT_SERVER_CONFIG=/etc/vnoffice-error-report-server.json \
VNO_REPORT_DATA_DIR=/var/lib/vnoffice-error-report-server \
python3 server.py --host 127.0.0.1 --port 8765
```

Client cấu hình endpoint đầy đủ, ví dụ `https://reports.example.com/api/v1/reports`, cùng token Bearer trong `vnoffice-config.json` đặt cạnh `main.py` hoặc biến môi trường `VNOFFICE_REPORT_ENDPOINT` / `VNOFFICE_REPORT_TOKEN`. File client có token không được commit. Không bật gửi tự động trên máy thử cho đến khi xác minh HTTPS, token và chính sách lưu dữ liệu.

## systemd trên Linux VPS

Đặt mã receiver tại `/opt/vnoffice/error-report-server/`, tạo user và thư mục dữ liệu riêng, rồi cài `/etc/systemd/system/vnoffice-error-report-server.service`:

```ini
[Unit]
Description=VN Office pilot error report receiver
After=network.target

[Service]
Type=simple
User=vno-report
Group=vno-report
WorkingDirectory=/opt/vnoffice/error-report-server
Environment=VNO_REPORT_SERVER_CONFIG=/etc/vnoffice-error-report-server.json
Environment=VNO_REPORT_DATA_DIR=/var/lib/vnoffice-error-report-server
ExecStart=/usr/bin/python3 /opt/vnoffice/error-report-server/server.py --host 127.0.0.1 --port 8765
Restart=on-failure
RestartSec=3
UMask=0077
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=/var/lib/vnoffice-error-report-server

[Install]
WantedBy=multi-user.target
```

Tạo thư mục với owner `vno-report`, đặt quyền `0600` cho file cấu hình bí mật, sau đó chạy `systemctl daemon-reload` và `systemctl enable --now vnoffice-error-report-server`. Xem tình trạng bằng `systemctl status` và log vận hành bằng `journalctl -u vnoffice-error-report-server`.

## Nginx HTTPS reverse proxy

Cài chứng chỉ TLS hợp lệ trước khi công khai hostname. Thêm vào virtual host HTTPS của `reports.example.com`:

```nginx
server {
    listen 443 ssl;
    server_name reports.example.com;

    ssl_certificate     /etc/letsencrypt/live/reports.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/reports.example.com/privkey.pem;
    client_max_body_size 6m;
    access_log off;

    location / {
        proxy_pass http://127.0.0.1:8765;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 10s;
    }
}
```

Chỉ dùng HTTPS từ máy pilot tới proxy. Không bind Python server ra `0.0.0.0`; firewall chỉ mở 443. Trang `/` yêu cầu Basic Auth viewer hoặc Bearer token. API chỉ nhận `POST /api/v1/reports` và multipart riêng `POST /api/v1/reports/{event_id}/attachment`; yêu cầu sai token nhận 401, body vượt giới hạn nhận 413. Attachment chỉ được chấp nhận sau report `UserFeedback` tương ứng và được lưu thành file riêng không dùng tên gốc.

## Dữ liệu và vận hành

- Báo cáo JSONL ghi thành `errors-YYYY-MM-DD.jsonl`; tệp đính kèm nằm riêng trong `attachments/`. `--data-dir` mặc định là `./report-data`.
- Bảng `/` gom nhóm theo loại lỗi và khung ngăn xếp đầu tiên đã lọc, đếm số lần và hiện lần đầu/cuối, phiên bản app và app. Không ghi địa chỉ IP vào JSONL hay access log của Python receiver.
- Attachment có thể chứa tài liệu người dùng đã chủ động chọn. Giới hạn mặc định 5 MiB; bảo vệ thư mục dữ liệu khỏi người dùng khác, sao lưu mã hóa nếu cần, đặt thời hạn xóa dữ liệu và xóa attachment theo chính sách pilot.
- Không phục vụ trang này qua HTTP công khai. Không đưa token vào URL, lệnh shell đã lưu, ảnh chụp màn hình hay tài liệu hướng dẫn.
