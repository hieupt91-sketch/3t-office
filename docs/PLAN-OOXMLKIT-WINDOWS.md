# Kế hoạch: dùng OOXMLKit làm lõi tài liệu cho Windows, thay dần LibreOffice (24/10/2026)

Trạng thái: **chủ đã chốt hướng (24/10/2026)** — làm theo ADR `docs/ios/ADR-OOXMLKIT-LOI-DUNG-CHUNG.md`, **Mức B**, thay theo lớp, có cổng đối chiếu (parity gate). Không gỡ LibreOffice của bản Windows cho đến khi từng lớp qua cổng.

## 1. Nguyên tắc
- Mức B: hiển thị bằng UI web trong WebView (đang có), OOXMLKit lo **đọc/ghi tệp**, engine công thức JS lo tính toán, PDF giữ cách hiện tại cho đến khi có giải pháp thay.
- **Không mất dữ liệu:** phần không sửa chép nguyên byte; phần sửa thao tác trên DOM, giữ phần tử lạ. Mọi lưu đều mở lại kiểm tra hợp lệ rồi mới thay tệp đích.
- **Chạy offline hoàn toàn**, không phụ thuộc mạng; `main.py` tự quản lý tiến trình engine.
- Thay dần: mỗi lớp có **tiêu chí vào/ra đo được** (mục 4). Chưa qua cổng thì LibreOffice vẫn là đường mặc định; OOXMLKit chạy song song hoặc sau cờ `VNO_OOXML_ENGINE`.
- Quy trình: plan gate (AGENTS §6); thay đổi tải trọng (mở/lưu) phải qua bộ LAN 27 xlsx + 8 docx + so sánh Word/Excel/PowerPoint COM trước khi gộp.

## 2. Hiện trạng ngắn
- Nguồn: thư viện Swift `ports/ios/OOXMLKit` (46 tệp Swift, mô-đun Zip/Package/Spreadsheet/Word/Presentation/Bridge; 111 bài kiểm Linux+macOS+iPhone/iPad), nhập từ nhánh `claude/ooxml-offline-ios-library-fqqyj0` @ e22ad834.
- Desktop hiện tại: JS dựng FODS/FODT/FODP → `soffice --convert-to` → `adapters/libreoffice/common/ooxml_zip_patch.py` (~14.000 dòng) vá lại gói OOXML. Mở: `soffice` chuyển OOXML → ODF/HTML cho UI.
- Windows: chưa có Swift trên máy; WSL Ubuntu 26.04 đã cài để chạy toolchain Linux (Swift 6.0.3) làm nền kiểm thử. Spike Windows trên CI trước đó bị chặn do xung đột modulemap `ucrt` (lỗi toolchain, không phải mã).

## 3. Kiến trúc đích (Windows)
```
VN App UI (JS, WebView2)  ⇄  main.py (Python, tự quản lý tiến trình)
                                 ├─ ooxml-engine  (OOXMLKit + OOXMLBridge, giao thức JSON qua stdio)  ← MỚI
                                 └─ soffice (LibreOffice)  ← thu hẹp dần: dàn trang, PDF, .doc/.xls/.ppt cũ
```
`OOXMLBridge` đã định nghĩa giao thức JSON giữa WebView và engine; trên Windows dùng cùng giao thức qua stdio, `main.py` làm cầu nối.

## 4. Giai đoạn và tiêu chí
| GĐ | Nội dung | Tiêu chí ra |
|---|---|---|
| W0 | Môi trường: WSL Ubuntu + Swift 6.0.3, chạy 111 bài kiểm trên Linux; kiểm kê điểm chạm LibreOffice | `swift test` xanh trên máy này; báo cáo kiểm kê |
| W1 | Khả thi trên Windows: dựng được OOXMLKit + `ooxml-engine.exe` (stdio JSON) bằng Swift for Windows; chạy bài kiểm | build + test chạy trên Windows thật, kích thước gói đo được; hoặc báo cáo BLOCKED có nguyên nhân + phương án (cổng sang Python) |
| W2 | **Cổng đối chiếu (parity gate)** chạy song song, không đụng đường mặc định: với tệp thật (28 xlsx LAN, 24 docx, pptx, tệp nhỏ tổng hợp) so OOXMLKit ↔ LibreOffice ↔ Office COM: mở, sửa tối thiểu, lưu, mở lại | bảng PASS/FAIL theo tệp; không sửa = byte-identical; có sửa = chỉ phần sửa đổi |
| W3 | **Lớp lưu** XLSX trước (rủi ro thấp, giá trị cao: giữ nguyên biểu đồ/pivot/ảnh): lưu bằng OOXMLKit khi tài liệu đến từ OOXML; LibreOffice chỉ dùng khi tạo mới | LAN 27/27 + so sánh COM; cờ + đường lui; thay cho một phần `ooxml_zip_patch.py` |
| W4 | Lớp lưu DOCX, PPTX tương tự (TOC, ghi chú, theo dõi thay đổi, hoạt hình, phông nhúng, đường nối đều vốn do `ooxml_zip_patch.py` vá — OOXMLKit giữ nguyên) | bộ Word/PowerPoint COM + CDP hiện có |
| W5 | Lớp mở: dựng mô hình cho UI từ OOXML (XLSX trước) không qua LibreOffice; công thức đệm từ engine JS | mở nhanh hơn, dữ liệu giống |
| W6 | Cắt dần: PDF qua WebView, định dạng cũ chỉ-nhập; quyết định bỏ LibreOffice cho OOXML | chỉ làm khi W2–W5 qua cổng; chủ duyệt |

## 5. Phân việc ban đầu
- **Codex (triển khai chính):** W1 (spike Windows, xem `E:\VNOffice-briefs\BRIEF-CODEX-W1-SWIFT-WINDOWS.md`).
- **Grok (kiểm tra độc lập):** W0 chạy bài kiểm Linux, rồi W2 khung đối chiếu (`BRIEF-GROK-W2-PARITY-HARNESS.md`).
- **opencode (mô hình miễn phí, chỉ đọc/tài liệu):** kiểm kê điểm chạm LibreOffice (`BRIEF-OPENCODE-W0-LIBREOFFICE-INVENTORY.md`); luôn xác minh lại bằng `git status/log` — mô hình miễn phí từng bịa báo cáo.
- **agy (Gemini 3.8 Flash còn hạn mức):** ánh xạ các hàm của `ooxml_zip_patch.py` sang năng lực OOXMLKit (`BRIEF-AGY-W0-PATCH-MAPPING.md`).
- **Claude (điều phối):** kiểm tra độc lập từng phiếu, gộp, chốt tiêu chí.

## 6. Rủi ro
| Rủi ro | Giảm thiểu |
|---|---|
| Swift for Windows lỗi toolchain (modulemap `ucrt`) | Thử toolchain/SDK mới; nếu BLOCKED: cổng logic sang Python trong `platform/ooxml/` kiểm bằng bài kiểm đối chiếu với OOXMLKit Linux |
| Gói cài đặt phình (runtime Swift ~ hàng chục MB) | Đo ở W1; dựng bản tĩnh nếu có thể |
| Hồi quy lưu/mở | Cờ + đường lui; LAN 27/27 và so sánh COM bắt buộc mỗi bước |
| Phụ thuộc dung lượng ổ khi dựng | Dọn tệp tạm; dựng trên C: nếu E: chật |
