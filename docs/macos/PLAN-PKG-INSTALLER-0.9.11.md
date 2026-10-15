# Plan gate — macOS PKG installer 0.9.11

## Objective

Tạo bộ cài `.pkg` mở bằng macOS Installer, cài toàn bộ `3T Office` vào
`/Applications/3T Office`, tương đương luồng bộ cài trên Windows hơn cách kéo-thả
DMG. Hỗ trợ ký Developer ID và notarization mà không lưu credential trong kho mã.

## Current capability and reuse

- Tái sử dụng artifact offline Apple Silicon do `build-offline-pilot.sh` tạo.
- Tái sử dụng ba launcher, Python/PySide6/QtWebEngine, version tree và LibreOffice.
- Dùng `pkgbuild`, `productbuild`, `pkgutil`, `codesign` và `notarytool` có sẵn;
  không thêm dependency, daemon hay web server.

## Files/modules

- `ports/macos/release/hardened-runtime.entitlements`: quyền cho runtime nhúng.
- `ports/macos/release/Distribution.xml`: giao diện và điều kiện bộ cài.
- `ports/macos/scripts/sign-offline-layout.sh`: ký Mach-O/bundle từ trong ra ngoài.
- `ports/macos/scripts/build-release-pkg.sh`: tạo component package và product archive.
- `ports/macos/scripts/notarize-release-pkg.sh`: submit và staple bằng Keychain profile.
- `ports/macos/scripts/validate-release-pkg.py`: expand PKG và kiểm payload/metadata.
- `tests/macos/test_validate_release_pkg.py`: unit test invariant payload.

## Dependencies and boundary

Chỉ thay đổi vùng macOS. Input là layout offline đã qua validator. Ký app cần
Developer ID Application; ký installer cần Developer ID Installer; notarization
cần profile đã lưu bằng `notarytool store-credentials`. Không truyền hoặc commit secret.

## Risks

- Ký thiếu binary lồng nhau khiến Gatekeeper/notarization từ chối.
- Cài vào `/Applications` cần quyền quản trị tùy cấu hình máy.
- Nâng cấp phải thay atomically cây `/Applications/3T Office` mà không chạm dữ
  liệu trong Application Support.
- Artifact chỉ có runtime arm64; Intel không được hỗ trợ.
- Notice/source offer hiện là staging; phát hành công khai cần rà soát pháp lý.

## Test plan

1. Shell syntax, Python compile và unit test validator.
2. Dựng PKG unsigned từ artifact pilot; `pkgutil --expand-full` và kiểm payload.
3. Kiểm identifier, version, install location, ba app/runtime/LibreOffice/version tree.
4. Cài thử vào volume tạm bằng `installer -pkg ... -target` nếu môi trường cho phép;
   nếu cần quyền hệ thống thì ghi BLOCKED, không claim PASS.
5. Khi có identities/profile: verify application signature, installer signature,
   notarize, staple, `spctl --assess --type install` và thử máy sạch.

## Rollback

Revert commit; artifact output có thể xóa. Bộ cài không chứa uninstall script và
không sửa dữ liệu người dùng trong quá trình build/test.
