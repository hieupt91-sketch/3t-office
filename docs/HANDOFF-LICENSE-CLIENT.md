# Agent Handoff — Lõi client bản quyền (giai đoạn L1: không giao diện, không khóa tính năng)

TASK: Phía ứng dụng của hệ thống bản quyền key vĩnh viễn (docs/SPEC-LICENSE-KEYS.md §5), phần lõi.
AGENT/ROLE: Claude (thay Codex hết hạn mức, 04/10/2026)
BRANCH: `feat/license-client-core-claude`

## Đã làm (đã tự chạy, 04/10/2026)
- `adapters/license/` (chỉ thư viện chuẩn, không phụ thuộc gói ngoài — giống `adapters/updater`):
  - `ed25519_verify.py`: kiểm chữ ký Ed25519 (RFC 8032).
  - `keys.py`: chuẩn hóa + kiểm checksum key `3TO-XXXXX-XXXXX-XXXXX-XXXXX`, `format_while_typing`.
  - `tokens.py`: kiểm token `payload.signature` với danh sách khóa công khai nhúng sẵn (`PUBLIC_KEYS_B64`, nguồn: docs/LICENSE-PUBLIC-KEYS.txt).
  - `device.py`: dấu vân tay máy (MachineGuid + tên máy, SHA-256), mã thiết bị `3TD-…` cho kích hoạt ngoại tuyến.
  - `manager.py`: `LicenseManager` — trạng thái (dùng thử 30 ngày / đã kích hoạt / ân hạn 30 ngày / cần kiểm tra lại), kích hoạt trực tuyến, làm mới, gỡ kích hoạt, nhận mã kích hoạt ngoại tuyến. Token lưu `license.json` trong thư mục dữ liệu người dùng (ghi nguyên tử).
- `main.py` (`VnOfficeApi`): `license_status`, `license_normalize_key`, `license_activate`, `license_refresh`, `license_deactivate`, `license_apply_activation_code`. Mọi lỗi trả `{ok:false,error,message}` tiếng Việt; không bao giờ làm hỏng ứng dụng.
- Quyết định giữ: giấy phép **không bao giờ tự tắt khi mất mạng** (quá hạn kiểm tra chỉ chuyển trạng thái `check_required` để nhắc).

## Kết quả kiểm thử (tự chạy)
- `python -m unittest tests.test_license_client`: 20/20 PASS (vectơ RFC 8032; đối chiếu 300 key ngẫu nhiên với `server/3t-api/license.py`; token do máy chủ ký được client xác minh; giả mạo bị từ chối; vòng đời dùng thử/ân hạn; ngoại tuyến gắn đúng mã thiết bị).
- `python -m unittest tests.test_license_client_e2e`: 3/3 PASS — client gọi HTTP thật tới `server/3t-api` chạy cục bộ (khóa thử): kích hoạt, hết chỗ máy kèm tên máy, gỡ kích hoạt, key không tồn tại, thu hồi + làm mới.

## CHƯA làm (giai đoạn L2, cần Codex/Claude)
1. Giao diện **Tệp ▸ Tài khoản và bản quyền** ở Doc/Sheet/Slide: trạng thái, ô nhập key tự định dạng (gọi `license_normalize_key`), nút kích hoạt/gỡ, kích hoạt ngoại tuyến (hiện `device_code`, ô dán mã kích hoạt), số máy. **Kèm Hướng dẫn sử dụng tiếng Việt (AGENTS.md mục 10) — bắt buộc.**
2. Làm mới nền theo `check_by` (gọi `license_refresh` sau khi khởi động, không chặn).
3. Banner hết dùng thử và khóa lưu/xuất Office — **chính sách chưa được chủ sở hữu chốt** (SPEC §6 mục 1); hiện CHỈ báo trạng thái, không khóa gì.
4. Phiên bản gửi lên máy chủ hiện là `APP_VERSION` (`0.9.0-pilot1`); khi phát hành nên dùng số phiên bản thật của bản cài.
5. macOS: `device.machine_id()` cần lấy IOPlatformUUID (qua `platform/os_services` khi tách).

## Cách chạy
`python -m unittest tests.test_license_client tests.test_license_client_e2e` (e2e cần fastapi, uvicorn, cryptography — phụ thuộc máy chủ/dev, không nằm trong bản cài).
