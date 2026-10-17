# PLAN — Mật khẩu mở tệp (Excel/Word/PowerPoint 2016) — 17/10

**Mục tiêu**: Tệp > Thông tin > Bảo vệ > "Mã hóa bằng mật khẩu" cho Sheet/Writer/Slides; mở tệp có mật khẩu do Office thật tạo; lưu lại vẫn mã hóa.

**Hiện trạng (đã làm, PASS)**: `platform/security/office_encryption.py` — Agile 4.4 (AES-256-CBC, SHA-512, spin 100000, HMAC toàn vẹn), vỏ CFB có DIFAT (>7 MB), đọc thêm Standard 3/4.2. Thuần Python stdlib + AES nội bộ, không thêm phụ thuộc.
Kiểm: 8 unit test (`tests/test_office_encryption.py`) gồm 3 tệp do Excel/Word/PowerPoint 2016 thật mã hóa (giải được), sai mật khẩu, bị sửa dữ liệu, tệp 9 MB; Excel thật mở tệp do VN mã hóa (lan16 16 MB, 14 sheet) = giống bản gốc.

**Thiết kế tích hợp (cần chủ dự án duyệt — ranh giới bảo mật)**
1. Lưu: mã hóa là bước CUỐI của pipeline lưu (sau postprocess), chỉ khi tài liệu có cờ mật khẩu. Mật khẩu chỉ giữ trong bộ nhớ phiên của tài liệu; KHÔNG ghi đĩa, KHÔNG log, KHÔNG gửi đi đâu.
2. Mở: phát hiện vỏ CFB (`is_encrypted_package`) → hộp thoại nhập mật khẩu (sai: báo lỗi, cho thử lại, hủy được) → giải mã ra thư mục tạm của phiên, xóa khi đóng.
3. UI: Tệp > Thông tin > "Bảo vệ …" (đặt/đổi/xóa mật khẩu), Help VI + i18n VI/EN, theo đúng Office.
4. Giới hạn: mật khẩu mất = không khôi phục được (cảnh báo trong hộp thoại). .xls/.doc cũ (RC4) không nằm trong phạm vi.

**Rủi ro**: giải mã ra tệp tạm trên đĩa (xóa khi đóng/thoát bất thường dọn lần mở sau); quên mật khẩu. **Rollback**: thư viện độc lập, tích hợp sau cờ; gỡ = bỏ cờ.
**Test**: unit Python; mở/lưu 3 app qua CDP; Office thật mở tệp do VN lưu (3 loại) + VN mở tệp do Office tạo; gate đầy đủ trước khi merge.