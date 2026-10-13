# Plan gate — macOS 0.9.11 offline pilot packaging

## Objective

Tạo một layout thử nội bộ chạy ngoại tuyến gồm `Doc.app`, `Sheet.app`,
`Slide.app`, Python/PySide6/QtWebEngine, mã ứng dụng theo cây phiên bản và
LibreOffice. Gói này chỉ nhắm Apple Silicon (`arm64`), chưa ký, chưa notarize và
chưa tạo DMG.

## Current capability and reuse

- Tái sử dụng Xcode launcher và `build-development.sh` trong `ports/macos`.
- Tái sử dụng Python 3.12 standalone, site-packages của venv đã kiểm thử và
  LibreOffice.app đã cài trên máy build; không tải dependency.
- Tái sử dụng hợp đồng cập nhật `app-<version>/app` + symlink `current`.
- Không dùng `scripts/serve.js`; `main.py` tự phục vụ UI trong tiến trình.

## Files/modules

- `ports/macos/launcher/AppDelegate.swift`: bootstrap mã seed vào Application
  Support và khai báo LibreOffice nhúng cho tiến trình con.
- `ports/macos/scripts/build-development.sh`: chuẩn hóa output path tương đối.
- `ports/macos/scripts/build-offline-pilot.sh`: dựng layout arm64.
- `ports/macos/scripts/validate-offline-pilot.py`: kiểm cấu trúc, kiến trúc,
  runtime imports, symlink và tài liệu pháp lý.
- `ports/macos/legal/*`: notice/source-offer dành riêng cho artifact macOS.

## Dependencies

Xcode đầy đủ, Python standalone arm64, venv có PySide6/QtWebEngine + pywebview,
và LibreOffice.app arm64/universal đã có sẵn. Không thêm dependency.

## Risks

- Artifact lớn do QtWebEngine và LibreOffice.
- Python/site-packages có thể chứa đường dẫn tuyệt đối hoặc binary sai kiến trúc.
- Ba launcher có thể cùng bootstrap lần đầu; bootstrap phải idempotent.
- Chưa có chứng thư nên Gatekeeper có thể cảnh báo.
- Notice hiện có của repo chưa đủ để coi là legal-release-ready cho Qt/Chromium;
  artifact phải ghi rõ trạng thái pilot và source offer.
- Intel không được hỗ trợ nếu bất kỳ runtime bắt buộc nào chỉ có `arm64`.

## Test plan

1. Build ba `.app` bằng Xcode, không ký.
2. Validator kiểm bundle IDs, executable, runtime imports, LibreOffice, version
   tree/current, symlink không thoát root và kiến trúc arm64.
3. Launcher smoke bằng `VNO_LAUNCHER_PRINT_COMMAND=1` cho cả ba app.
4. Chạy unit test macOS launcher/packaging liên quan nếu có.
5. Chạy trực quan app từ artifact ở task tích hợp; không dùng web server test.

## Rollback

Toàn bộ thay đổi nằm trong branch/worktree riêng. Có thể bỏ commit hoặc xóa
artifact staging; không chạm mã dùng chung, dữ liệu người dùng hay remote.
