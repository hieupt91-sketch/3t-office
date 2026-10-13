# Kế hoạch M6 — Python update applier macOS 0.9.11

## Objective

Áp dụng bản cập nhật mã ứng dụng ngoài gói `.app` đã ký theo chuỗi an toàn:

`current` → sao chép vào `app-<version>.staging` → áp replacements/removals → kiểm hash toàn manifest → promote nguyên tử thành `app-<version>` → đổi symlink `current` nguyên tử → health check → giữ bản mới hoặc rollback về bản cũ.

## Current capability

- `adapters/updater/updater.py` xác minh chữ ký, đọc **mọi nguồn**, chọn phiên bản mới nhất và tải blob theo nội dung. Hành vi này phải giữ nguyên.
- `adapters/updater/apply-helper.ps1` áp dụng trực tiếp vào layout Windows và không chạy trên macOS.
- Nhánh tại `5def067` chưa có `platform/os_services/macos.py` hay thư mục `ports/macos/`.
- Spec macOS yêu cầu không sửa `.app` đã ký; mã cập nhật nằm trong thư mục dữ liệu người dùng dạng `app-<version>` với con trỏ `current`.

## Files/modules

- `ports/macos/apply_helper.py`: helper Python thuần và CLI; không thêm dependency.
- `ports/macos/__init__.py`: package marker.
- `tests/macos/test_update_applier.py`: fixture tạm và test focused.
- `docs/macos/HANDOFF-M6-UPDATE-APPLIER-0.9.11.md`: handoff chuẩn.

Không sửa `adapters/updater/updater.py`, `apply-helper.ps1`, `ooxml_zip_patch.py`, document model hay file format semantics.

## Dependencies and architecture decision

Tái sử dụng `validate_package_path`, `version_key` và `sha256_file` từ updater hiện có. Helper đặt trong `ports/macos/` vì layout `app-<version>/current` là riêng macOS và quy tắc nhánh yêu cầu mã riêng hệ điều hành nằm ở `ports/<platform>/`. Việc chuyển thành helper dùng chung cho Windows chỉ nên thực hiện trên `main` trong task riêng sau khi có hợp đồng `UpdateApplier` hoàn chỉnh.

## Risks and mitigations

- **Path traversal/symlink escape:** mọi đường dẫn manifest/removal đi qua validator hiện có; từ chối symlink trong version tree, blob, staging và target.
- **Gói hỏng hoặc tải thiếu:** xác minh size/SHA-256 từng blob trước khi đọc; xác minh lại toàn file manifest trước promote.
- **Mất điện giữa các bước:** staging và symlink tạm có tên cố định/riêng; `os.replace` dùng cho promote/con trỏ. Bản cũ không bị sửa.
- **Health check thất bại:** đổi `current` về bản cũ bằng symlink tạm + `os.replace`, ghi rollback report không chứa nội dung tài liệu.
- **Tên có dấu/khoảng trắng/NFD:** chỉ dùng `pathlib`, subprocess argv list; test bằng đường dẫn Unicode và khoảng trắng.
- **Phiên bản mới đã tồn tại:** từ chối thay đè để không phá bản đang dùng; cleanup chỉ nhắm đúng staging của phiên bản đã validate.

## Test plan

- Success: tạo staging, áp replacement/removal, verify manifest, promote và `current` trỏ bản mới.
- Refuse: blob hash/size sai, path traversal, symlink escape, target version đã tồn tại.
- Rollback: health check false/exception, `current` trở về bản cũ, rollback report hợp lệ.
- Unicode/spaces: app root, updates dir và file path có dấu/khoảng trắng.
- Atomicity fixture: bản cũ không đổi trong success lẫn failure; không để `app-<version>.staging` sau kết thúc.
- Chạy `python -m unittest tests.macos.test_update_applier -v`; full suite do integrator chạy theo phân công.

## Rollback

Revert commit task. Helper chưa được nối vào updater Windows hay `main.py`, nên rollback không cần migration và không ảnh hưởng nguồn cập nhật hiện có.
