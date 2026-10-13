3T Office macOS 0.9.11 Pilot nội bộ
===================================

- Chỉ hỗ trợ Mac Apple Silicon (arm64). Intel: NOT SUPPORTED.
- Artifact chưa ký và chưa notarize; chỉ dùng trong nhóm thử nội bộ tin cậy.
- Giữ Doc.app, Sheet.app, Slide.app, Runtime, LibreOffice.app và Versions trong
  cùng một thư mục. Không tách riêng từng .app.
- Lần mở đầu tiên, launcher chép seed `Versions/app-0.9.11` vào
  `~/Library/Application Support/VNOffice` rồi chạy từ con trỏ `current`.
- Ứng dụng chạy UI bằng Python/Qt nhúng và tự khởi động server tĩnh nội bộ;
  không cần Node.js hay kết nối Internet để soạn thảo.
- Sao lưu tài liệu quan trọng và dùng bản sao trong giai đoạn pilot.

Trước khi phát hành rộng phải ký Developer ID, notarize, thử máy sạch và hoàn
tất rà soát license/notice từ chính artifact cuối.
