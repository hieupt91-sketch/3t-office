# Plan — bản quyền dùng chung Windows/macOS cho 0.9.11

## Objective

Xác minh ứng dụng macOS dùng đúng máy chủ, product, key và khóa ký hiện có của Windows; giữ nguyên giới hạn thiết bị dùng chung và toàn bộ vòng đời online/offline/refresh/deactivate.

## Current capability

- Client đã gửi `platform=macos` khi chạy trên macOS.
- Máy chủ chấp nhận và lưu platform lúc kích hoạt online.
- Key, product `3t-office`, chữ ký Ed25519 và bộ đếm seat đã dùng chung.
- Lỗi hiện tại: `/validate` phát token mới với platform mặc định `windows`; kích hoạt ngoại tuyến không nhận/lưu platform.

## Files/modules

- `server/3t-api/app.py`: bảo toàn platform khi refresh; nhận/lưu platform cho kích hoạt ngoại tuyến, mặc định Windows để tương thích client cũ.
- `tests/test_license_client_e2e.py`: HTTP E2E thật trên localhost cho Windows + macOS, seat dùng chung, offline cache, refresh, deactivate và offline activation.
- `docs/SPEC-LICENSE-KEYS.md`: cập nhật hợp đồng platform đa nền tảng.

## Dependencies

Không thêm dependency. Test dùng FastAPI/Uvicorn/cryptography đã là dependency dev/server hiện hữu.

## Risk

- Đây là đường security/license: không được gọi production hoặc dùng key/secret thật.
- Phải giữ tương thích client Windows cũ không gửi platform.
- Chưa enforce trường `platforms` của gói/key trong đợt này vì sẽ thay đổi quyền sử dụng key hiện hành; cần một quyết định rollout riêng.

## Test plan

- Unit hiện có của license client/server.
- HTTP E2E cục bộ với khóa ký và SQLite tạm: Windows + macOS cùng key, giới hạn seat, token macOS giữ platform qua refresh, chạy ngoại tuyến từ token cache, deactivate trả seat, offline activation macOS.
- Full Python suite nếu thời gian cho phép.

## Rollback

Revert commit của task; schema không đổi và các trường request mới đều có mặc định `windows`.
