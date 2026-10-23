# Agent Handoff — iOS/iPadOS offline deployment branch

Ngày: 23/10/2026  
Nhánh: `mobile/ios-offline-deploy`  
Mục tiêu: giao đội triển khai quyết định engine offline và bằng chứng shell iOS hiện có.

## Kết quả đã làm

- Thêm `DECISION-LIBREOFFICE-OFFLINE-IOS-2026-10.md`: phân tích LibreOffice desktop, LibreOfficeKit/WASM, server fallback và engine OOXML browser-safe.
- Chốt MVP không nhúng Python/UNO/`soffice` vào iOS; LibreOffice giữ vai trò desktop/server oracle cho fixture và fidelity comparison.
- Ghi rõ ma trận định dạng hiện tại: HTML/FODS/FODP có luồng offline; DOCX/XLSX/PPTX vẫn BLOCKED, không cho ghi đè giả.
- Ghi lộ trình I1–I4, cổng nghiệm thu, giới hạn dữ liệu, ownership nhánh và lệnh build/test cho đội.

## Bằng chứng chạy trong worktree này

| Hạng mục | Kết quả |
|---|---|
| Native Files tests | **PASS 7/7** — `python3 -m unittest discover -s tests/ios -v` |
| Offline shell tests | **PASS 8/8** — `python3 -m unittest tests.test_ios_offline_shell -v` |
| Staging | **PASS** — assets bundle không chứa `.py`, `.exe`, `.dll` |
| Info.plist | **PASS** — `plutil -lint` |
| Script syntax | **PASS** — `bash -n ports/ios/scripts/*.sh` |
| Xcode Simulator build | **PASS** — `build/ios-simulator-offline-deploy/DerivedData/.../3T Office.app`, log `** BUILD SUCCEEDED **` |
| iPhone 17 Pro Simulator | **PASS render sau cold start**, screenshot đã chụp; first paint ban đầu trắng khoảng 30 giây |
| iPad Air 11-inch (M3) Simulator | **PASS render sau cold start**, screenshot đã chụp; first paint ban đầu trắng khoảng 30 giây |
| Thiết bị iPhone/iPad thật | **NOT RUN** — chưa có thiết bị thật trong phiên này |
| DOCX/XLSX/PPTX round-trip | **BLOCKED** — chưa có mobile OOXML adapter/fixture |
| LibreOfficeKit/WASM | **NOT RUN** — chưa phải MVP, cần task R&D và audit riêng |

## Lỗi/rủi ro cần xử lý trước TestFlight

**MOB-UI-001 — cold start blank screen**  
Severity: HIGH · Type: UX/performance  
Repro: cài app mới trên hai Simulator → launch → chụp trong 3–5 giây.  
Actual: màn trắng; sau khoảng 30 giây UI mới hiện.  
Expected: splash/progress có trạng thái trong ≤2 giây, sau đó UI hoặc lỗi rõ ràng.  
Workaround: chờ cold start; không chấp nhận cho release.  
Regression risk: asset staging/WKWebView parse quá lớn hoặc first-paint blocking.

## Handoff cho đội tiếp theo

1. Tách asset staging thành manifest/lazy-load và thêm splash/progress để loại MOB-UI-001; đo P50/P95 cold start trên iPhone và iPad.
2. Tạo `mobile/ooxml-browser-zip` trước; không gọi Node API trong WKWebView.
3. Làm Sheet → Writer → Slides theo fixture và compatibility report; mỗi loại phải mở/sửa/lưu/đóng/mở lại offline.
4. Không nâng DOCX/XLSX/PPTX từ BLOCKED lên hỗ trợ nếu chưa có structural diff, `unzip -t`, kiểm ảnh/relationship/style và test mất quyền ghi.
5. Chạy lại trên ít nhất một iPhone và một iPad thật trước TestFlight; ghi model, OS, build, số liệu và ảnh bằng chứng.

## Rollback

Nhánh này chỉ thêm tài liệu/handoff trên `docs/mobile/**`; không thay đổi Windows/macOS và không thay đổi semantics định dạng dùng chung.
