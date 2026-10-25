# Kế hoạch M7 — build launcher macOS bằng Xcode trên `vn-main`

## Mục tiêu

Đưa project launcher Xcode đã có ở nhánh macOS 0.9.11 lên nền `vn-main`, tạo ba bundle phát triển Doc/Sheet/Slide chạy trên Intel và Apple Silicon để kiểm tra nội bộ. Chưa ký, notarize hoặc phát hành.

## Khả năng hiện có

- `vn-main` chưa chứa project Xcode hay `ports/macos/`.
- Commit `7ed054e8` đã có launcher Swift, ba Info.plist và script build universal; tái sử dụng thay vì viết lại.
- Máy có Xcode 26.3 tại `/Applications/Xcode.app`; `xcode-select` toàn hệ thống đang trỏ Command Line Tools nên lệnh build dùng `DEVELOPER_DIR` cục bộ.

## Tệp và mô-đun

- `ports/macos/VNOfficeLauncher.xcodeproj/`
- `ports/macos/launcher/`
- `ports/macos/scripts/build-development.sh`
- `ports/macos/scripts/validate-development-bundles.py`

## Phụ thuộc

AppKit/Swift chuẩn của Xcode; không thêm thư viện ngoài. Runtime Python, Qt/pywebview và LibreOffice chưa được nhúng ở bước build launcher này.

## Rủi ro

- Bundle unsigned chỉ dùng nội bộ, Gatekeeper có thể cảnh báo khi chuyển máy.
- Launcher build thành công nhưng chưa chạy toàn bộ ứng dụng nếu thiếu runtime offline và `app-current`.
- Đường dẫn output tương đối phải được chuẩn hóa trước khi truyền cho Xcode, nếu không sản phẩm được tạo dưới thư mục project và bước sao chép thất bại.

## Kế hoạch kiểm thử

1. `xcodebuild -list` nhận project/scheme.
2. Build Release không ký cho Doc, Sheet và Slide.
3. Kiểm tra bundle ID, app kind, executable và icon bằng script validator.
4. Dùng `lipo -info` xác nhận `arm64` và `x86_64`.
5. Chạy launcher ở chế độ `VNO_LAUNCHER_PRINT_COMMAND=1` để kiểm đường dẫn/lệnh mà không cần runtime.

## Hoàn tác

Không gộp branch `mac/xcode-build-2010`; xóa riêng output `build/macos-xcode-2010` nếu cần. Không sửa nhánh `vn-main`, `main` hay `platform/macos`.
