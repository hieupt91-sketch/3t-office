# 3T Office 0.9.11 — macOS ARM64 QA

## Trạng thái

- Nhánh: `platform/macos`
- Gói: `3T-Office-0.9.11-arm64-unsigned-final-v2.pkg`
- Kiến trúc: Apple Silicon (`arm64`)
- Kiểm tra cấu trúc PKG: PASS
- Ký ứng dụng/installer và notarization: BLOCKED — máy build hiện chưa có Developer ID hợp lệ; chỉ dùng QA nội bộ.
- SHA-256: `01b7b04eca310869fc09b51c39afc1e06818c01a41476c4bd2346309a32fc978`

## Clone và build lại

```bash
git clone -b platform/macos https://github.com/hieupt91-sketch/3t-office.git
cd 3t-office
env VNO_PYTHON_ROOT='/Applications/3T Office/Runtime' \
  VNO_SITE_PACKAGES='/Applications/3T Office/Runtime/lib/python3.12/site-packages' \
  VNO_LIBREOFFICE_APP='/Applications/3T Office/LibreOffice.app' \
  ports/macos/scripts/build-offline-pilot.sh build/macos-offline-pilot-release
ports/macos/scripts/build-release-pkg.sh build/macos-offline-pilot-release build/3T-Office-0.9.11-arm64-unsigned-final.pkg
python3 ports/macos/scripts/validate-release-pkg.py build/3T-Office-0.9.11-arm64-unsigned-final.pkg
```

Không đưa gói unsigned này lên phát hành công khai. Team cần ký Developer ID Application + Developer ID Installer, notarize rồi staple trước khi đưa lên web.
