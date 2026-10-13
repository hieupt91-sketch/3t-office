# Kế hoạch M7 — Xcode development bundles macOS 0.9.11

## Objective

Tạo vỏ Xcode dùng chung, build thành `Doc.app`, `Sheet.app`, `Slide.app` không ký cho
kiểm thử phát triển. Mỗi vỏ khai báo document types riêng và khởi chạy mã
`~/Library/Application Support/VNOffice/current/app/main.py` bằng runtime Python ngoại tuyến.

Không coi artifact này là release-ready: không signing secret, notarization, Qt/PySide6 hay
LibreOffice runtime được bundle trong task này.

## Current capability

- Xcode 26.3 có tại `/Applications/Xcode.app`; `xcode-select` toàn máy đang trỏ CLT.
- Source có `main.py`, macOS version-tree/update helper và SVG icon riêng của Doc/Sheet/Slide.
- Python hệ thống là 3.9.6; chưa có `pywebview`/`PySide6`. Quyết định giấy phép
  Qt LGPL và Apple Developer signing vẫn thuộc người phụ trách.
- Chưa có Xcode project hay `.icns` macOS trong repo.

## Files/modules

- `ports/macos/VNOfficeLauncher.xcodeproj/project.pbxproj`: một native launcher target dùng chung.
- `ports/macos/launcher/AppDelegate.swift`: tìm runtime/version tree và launch bằng argv, không shell.
- `ports/macos/launcher/{Doc,Sheet,Slide}-Info.plist`: identity và document types riêng.
- `ports/macos/scripts/build-development.sh`: gọi `xcodebuild` ba lần với
  `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer`, không đổi global selector.
- `ports/macos/scripts/validate-development-bundles.py`: kiểm bundle/plist/executable và cấm secret/signing.
- `docs/macos/HANDOFF-M7-XCODE-PACKAGING-0.9.11.md`: handoff.

## Dependencies and boundary

Chỉ dùng AppKit/Foundation của macOS và công cụ Xcode có sẵn; không tải mạng,
không thêm package/dependency. Toàn bộ thay đổi nằm trong `ports/macos/**` và
`docs/macos/**`; không sửa app UI, shared document code, updater hay OOXML.

## Risks

- Bundle build được nhưng không chạy editor nếu chưa có runtime Python +
  pywebview/PySide6 + LibreOffice tương thích. Launcher phải báo lỗi rõ, không fallback mạng.
- App chưa ký có thể bị Gatekeeper cảnh báo. Chỉ dùng cho development.
- SVG có thể không chuyển `.icns` ổn định bằng tool có sẵn; chỉ thêm icon
  khi pipeline local tạo và validate được, không thay branding.
- Tên/UTI sai làm Launch Services nhận nhầm app. Validator kiểm bundle ID, app kind và
  extension theo ma trận cố định.

## Test plan

1. `xcodebuild -project ... -scheme VNOfficeLauncher ... CODE_SIGNING_ALLOWED=NO` cho ba plist.
2. Validator kiểm ba `.app`, executable, `CFBundleIdentifier`, `VNOfficeAppKind`, extensions.
3. Chạy executable với `VNO_LAUNCHER_PRINT_COMMAND=1` và runtime/version-root fixture có
   khoảng trắng để xác minh argv, không launch editor.
4. `plutil -lint` ba plist; `git diff --check`.
5. Launch editor thật: BLOCKED nếu runtime PySide6/QtWebEngine/LibreOffice chưa có.

## Rollback

Revert một commit. Không có migration, không thay source chung hay dữ liệu người dùng;
artifact development nằm ngoài Git trong `build/macos-development/`.
