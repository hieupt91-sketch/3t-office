# Bàn giao M7 — build Xcode launcher macOS trên `vn-main`

- Nhánh `mac/xcode-build-2010`, tái sử dụng project launcher từ commit `7ed054e8` và sửa script để mọi output tương đối được neo vào gốc repo.
- Xcode 26.3 Release build **PASS** cho `Doc.app`, `Sheet.app`, `Slide.app`; validator **PASS 3/3**.
- Cả ba executable là universal `x86_64 + arm64`; bundle ID/app kind lần lượt là `vn.office.doc/writer`, `vn.office.sheet/sheet`, `vn.office.slide/slides`.
- Probe `VNO_LAUNCHER_PRINT_COMMAND=1` **PASS 3/3**, tạo đúng lệnh `<runtime>/python3 <version-root>/app/main.py --app=<kind>`.
- Đây là bundle phát triển chưa ký. Chạy đầy đủ UI **BLOCKED** vì chưa nhúng runtime Python + `cryptography` + pywebview/Qt + LibreOffice; ký/notarize cần quyết định Apple Developer và giấy phép Qt.
