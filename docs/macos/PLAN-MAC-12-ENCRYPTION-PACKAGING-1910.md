# Plan gate — MAC-12 mã hóa và đóng gói macOS

## Objective

Xác minh đường mã hóa OOXML dùng chung trên macOS và bảo đảm runtime Python
được đưa vào gói thử nội bộ có đầy đủ `cryptography`, kể cả các backend native
mà thư viện cần. Không đổi định dạng tệp, thuật toán, UI hoặc ranh giới bảo mật.

## Current capability and reuse

- `requirements.txt` đã ghim `cryptography>=44.0.0,<51.0.0`.
- `platform/security/office_encryption.py` và
  `adapters/libreoffice/common/ooxml_encryption.py` đã triển khai Agile AES-256;
  macOS dùng lại nguyên mã này.
- Các nhánh thử macOS 0.9.11 có layout offline và validator, nhưng lịch sử không
  cùng nền với `vn-main`; không cherry-pick mù hoặc sửa các worktree cũ.
- `vn-main` hiện chưa chứa `ports/macos/`, nên chưa có gói macOS hiện hữu ngay
  trên nhánh chuẩn để sửa trực tiếp. Phần đóng gói trong task này chỉ bổ sung
  hợp đồng/validator dành riêng cho macOS; việc nhập launcher/runtime đầy đủ cần
  được tích hợp từ nhánh macOS tương ứng trước khi có thể dựng `.app` hoàn chỉnh.

## Files/modules

- `ports/macos/requirements-runtime.txt`: manifest dependency runtime của gói
  macOS, tham chiếu requirement gốc thay vì tạo phiên bản riêng.
- `ports/macos/scripts/validate-encryption-runtime.py`: kiểm import, phiên bản,
  backend OpenSSL và một vòng mã hóa/giải mã trong chính Python runtime của gói.
- `tests/macos/test_encryption_packaging.py`: kiểm hợp đồng manifest/validator.
- `docs/macos/HANDOFF-MAC-12-ENCRYPTION-PACKAGING-1910.md`: handoff và bằng
  chứng test/build/native.

## Dependencies

Không thêm dependency mới. Gói tiếp tục lấy dependency từ `requirements.txt`;
`cryptography` đã có sẵn. Không quyết giấy phép Qt, tài khoản Apple Developer,
ký hoặc notarize.

## Risks

- Chỉ import Python thành công chưa đủ: wheel có thể thiếu hoặc sai kiến trúc;
  validator phải chạy bằng chính interpreter trong artifact và thực hiện AES.
- Nếu quy trình copy site-packages chỉ lấy package Python mà bỏ `.dylib`/backend,
  mã hóa sẽ hỏng trên máy sạch; phải cài/copy theo dependency tree hoàn chỉnh.
- Không được ghi mật khẩu thử hay nội dung tài liệu thật vào repo/log.
- Vì launcher/layout mới chưa nằm trên `vn-main`, trạng thái build `.app` có thể
  là BLOCKED dù unit test và runtime hiện tại PASS.

## Test plan

1. Chạy đúng cổng MAC-12:
   `python -m pytest tests/test_ooxml_encryption.py tests/test_ooxml_encryption_main.py -q`.
2. Chạy test hợp đồng đóng gói macOS mới.
3. Chạy validator bằng Python hiện tại và, nếu có artifact macOS tương thích,
   bằng `Runtime/bin/python3` trong artifact.
4. Phân loại bài Office COM là BLOCKED trên macOS, không chạy giả lập.
5. Nếu runtime app/CDP sẵn sàng, thử quy trình native Tệp > Thông tin > Mã hóa
   bằng mật khẩu và chụp ảnh; nếu không, ghi BLOCKED với lý do cụ thể.

## Rollback

Toàn bộ thay đổi chỉ thêm file dưới `ports/macos/`, `tests/macos/` và
`docs/macos/`. Có thể revert commit MAC-12 mà không đụng mã hóa dùng chung,
định dạng tài liệu hoặc dữ liệu người dùng.
