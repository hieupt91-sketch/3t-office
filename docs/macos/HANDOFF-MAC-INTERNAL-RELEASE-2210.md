# Handoff macOS internal release — 2026-10-22

## Base and scope

- Base dùng chung: `origin/vn-main` tại `d9d1f00a`.
- Branch tích hợp: `mac/internal-release-2210`.
- Phần riêng macOS: Xcode launcher Doc/Sheet/Slide, UTI `.xltx/.xlt`, payload Debug cho Product → Run, validator và test macOS.
- Không đưa runtime, mã ký hay artifact build vào Git.

## Evidence

- Xcode 26.3 Release build ba app universal arm64 + x86_64: **PASS**.
- `validate-development-bundles.py`: **PASS 3/3**.
- Python 3.12 `tests.macos.test_sheet_file_types`: **PASS 7/7**.
- Debug payload với pilot runtime ARM64: **PASS** validator; app Doc khởi động và HTTP nội bộ trả trang tại `127.0.0.1:8080`.
- `npm test`: **3755/3774 PASS, 19 FAIL**; các lỗi còn lại là baseline/môi trường Windows-LibreOffice/Python twin, chưa claim full suite xanh.
- `pytest`: **NOT RUN** trên Python 3.12 vì máy chưa cài pytest.
- Bản app nội bộ đã ký cục bộ bằng Apple Development identity; **notarization: NOT RUN**.

## Known blockers

- Runtime pilot cần được đóng gói chính thức (Python/pywebview/Qt/LibreOffice) cho bản phát hành.
- UI native CDP vẫn cần Qt/WebEngine; bản chạy hiện tại có thể khởi động nhưng chưa đạt native CDP gate.
- Cần rà lại 19 lỗi npm sau khi team Windows chốt baseline mới.

## Next action

1. Giữ branch này làm ứng viên internal release.
2. Chạy bộ kiểm native trên runtime đóng gói, sau đó mới quyết định merge vào `platform/macos`.
3. Signing/notarization/DMG chỉ làm sau khi xác nhận identity/provisioning và quyết định phát hành.
