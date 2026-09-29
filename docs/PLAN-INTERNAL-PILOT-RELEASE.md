# Kế hoạch phát hành thử nội bộ (pilot) + tự động báo lỗi

Ngày: 29/09/2026 · Người phụ trách duyệt: đã duyệt triển khai ("ok vậy bạn cho làm đi … buil bản luôn cho họ dùng để bắt được nhiều lỗi")

## Objective
Đưa VN Writer / VN Sheet (Slides kèm theo nhưng chưa ưu tiên) cho 3–5 nhân viên dùng thật trên máy của họ, chạy OFFLINE, và tự thu thập lỗi phát sinh khi dùng để sửa theo dữ liệu thực tế.

## Current capability
- App chạy bằng `python main.py` (pywebview 6.2.1, BSD) + LibreOffice portable; `find_soffice()` đã tự tìm `tools/libreoffice/program/soffice.exe` cạnh `main.py`.
- `--app=writer|sheet|slides` + đường dẫn tệp đã có (HANDOFF-DESKTOP-THREE-APP-LAUNCH).
- Chưa có bước build/đóng gói, chưa có cơ chế báo lỗi, chưa có số phiên bản ứng dụng.

## Phần A — Báo lỗi (Codex, nhánh `feature/pilot-error-reporting-codex`)
Ranh giới dữ liệu (security boundary — bắt buộc):
- CHỈ gửi dữ liệu kỹ thuật: loại lỗi, thông điệp lỗi đã lọc, stack trace (đường dẫn tệp người dùng bị thay bằng `<path>`), phiên bản app, app (writer/sheet/slides), thao tác (vd. `open.xlsx`, `save.doc`), đuôi tệp + kích thước làm tròn, thời gian thao tác, Windows version, id cài đặt ngẫu nhiên (không gắn danh tính).
- KHÔNG BAO GIỜ gửi: nội dung tài liệu, tên tệp, đường dẫn đầy đủ, nội dung ô/đoạn văn, tên sheet, công thức, clipboard, tên người dùng Windows.
- Đồng ý (consent): hỏi 1 lần lần đầu mở app, có thể bật/tắt lại trong Trợ giúp. Không đồng ý → chỉ ghi log cục bộ.
- Đính kèm tệp: CHỈ trong hộp thoại "Báo lỗi" do người dùng tự mở và tự tick ô "Đính kèm tệp đang mở", có cảnh báo rõ nội dung sẽ được gửi.
- Offline-first: mọi báo cáo ghi vào hàng đợi cục bộ (`%APPDATA%\VNOffice\reports\queue\*.json`, giới hạn số lượng/dung lượng); gửi nền khi có mạng, timeout ngắn, không bao giờ chặn UI hay làm app lỗi theo.
- Máy chủ nhận: `tools/error-report-server/` — Python chuẩn (`http.server`), ghi JSONL theo ngày, trang xem/gom nhóm lỗi đơn giản, token bí mật cấu hình ngoài repo. Không dùng Sentry/GlitchTip (giấy phép + phụ thuộc). Endpoint + token client đọc từ tệp cấu hình cạnh app (`vnoffice-config.json`), không commit secret.
- Thu lỗi: JS `window.onerror`/`unhandledrejection` + lỗi bắt được ở lệnh mở/lưu/xuất; Python `sys.excepthook`, `threading.excepthook`, lỗi API pywebview, soffice timeout/exit ≠ 0, lưu thất bại, hậu kiểm lưu (tệp rỗng/không mở lại được).
- UI: hộp thoại đồng ý, mục "Báo lỗi / Góp ý" trong tab/menu Trợ giúp, nội dung Hướng dẫn tiếng Việt (AGENTS §10).

## Phần B — Đóng gói (Claude, nhánh `feature/pilot-packaging-claude`)
- Không thêm dependency build mới: bản portable gồm Python 3.12 (PSF) + pywebview và phụ thuộc runtime của nó + mã app + LibreOffice portable (MPL, kèm license notices).
- `scripts/build-pilot.ps1` tạo `_dist/VNOffice-<version>/` và `.zip`; `install-pilot.ps1` chép vào `%LOCALAPPDATA%\VNOffice`, tạo shortcut VN Writer / VN Sheet / VN Slides (Start Menu + Desktop), gỡ cài đặt được.
- Launcher chạy `pythonw.exe` (không cửa sổ console). Số phiên bản `APP_VERSION` trong `main.py`.
- Không commit tệp build, tài liệu thật, secret.

## Risk
- Rò rỉ nội dung tài liệu qua stack/thông điệp lỗi → bộ lọc + unit test với dữ liệu mẫu chứa tên tệp/đường dẫn/tiếng Việt.
- Báo lỗi làm app chậm/treo khi mất mạng → gửi nền, timeout, test ngắt mạng.
- Bản đóng gói thiếu phụ thuộc (WebView2 runtime, VC++ runtime) → smoke test trên thư mục cài sạch, ghi rõ yêu cầu hệ thống.
- Người dùng mất dữ liệu khi pilot → hướng dẫn giữ bản gốc; lưu hiện đã ghi nguyên tử (atomic replace).

## Test plan
- `node tests/run-tests.js`, `python -m unittest discover -s tests` PASS.
- Unit test bộ lọc dữ liệu nhạy cảm, hàng đợi offline, giới hạn dung lượng, consent tắt → không gửi.
- Test máy chủ nhận: token sai → 401, payload quá lớn → 413, ghi JSONL đúng.
- Smoke bản đóng gói: cài vào thư mục sạch, mở/lưu docx/xlsx/doc/xls, không mạng vẫn chạy, báo lỗi vào hàng đợi rồi gửi khi có máy chủ.

## Rollback
- Cờ cấu hình tắt báo lỗi hoàn toàn (`errorReporting.enabled=false`). Gỡ cài đặt bằng `install-pilot.ps1 -Uninstall`. Bản pilot không ghi đè cài đặt Office của máy.
