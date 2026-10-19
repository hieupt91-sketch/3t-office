# Plan gate — I2 luồng tệp native iOS/iPadOS offline

## Objective

Thêm cầu nối `UIDocumentPicker` cho vỏ iOS để người dùng chọn, đọc và lưu tài
liệu cục bộ mà không cần server. Chỉ công bố những định dạng giao diện hiện tại
có thể đọc/ghi trực tiếp khi không có LibreOffice.

## Current capability

- Vỏ Swift + WKWebView đã chạy asset đóng gói hoàn toàn offline.
- UI gọi hợp đồng `window.pywebview.api` của desktop để mở/lưu, nhưng iOS chưa có
  adapter tương ứng.
- Sheet và Slide có parser/serializer FODS/FODP trong JavaScript. Writer nhận và
  xuất HTML nội bộ. DOCX/XLSX/PPTX vẫn cần LibreOffice/lớp vá OOXML desktop.

## Files/modules

- `ports/ios/launcher/NativeDocumentService.swift`: picker, security-scoped URL,
  bookmark trong phiên, kiểm tra loại/kích thước/nội dung và ghi tệp nguyên tử.
- `ports/ios/launcher/MobileOfficeViewController.swift`: bridge promise giữa JS
  và native, capability trung thực và error state tiếng Việt.
- `ports/ios/launcher/Info.plist`, project Xcode: khai báo document types và nguồn.
- `ports/ios/Web/ios-file-help.*`: Hướng dẫn sử dụng tiếng Việt trong app.
- `tests/ios/**`: kiểm tra hợp đồng tĩnh và build/Simulator.

Không sửa `apps/**`, `platform/**`, `adapters/**`; nếu cần thay hợp đồng dùng
chung sẽ handoff về `main` trước.

## Dependencies

Chỉ dùng UIKit, WebKit và UniformTypeIdentifiers có sẵn trong iOS. Không thêm
package, server, Node runtime, cloud hoặc engine tài liệu.

## Security and document semantics

- Chỉ đọc URL do người dùng chọn; gọi `startAccessingSecurityScopedResource`,
  phối hợp truy cập bằng `NSFileCoordinator`, rồi dừng quyền ngay sau I/O.
- Giới hạn kích thước và xác thực extension + marker nội dung trước khi chuyển
  vào WebView. Không ghi đè khi định dạng không được hỗ trợ.
- Hỗ trợ thật: Writer `.html/.htm`, Sheet `.fods`, Slide `.fodp`.
- `.docx/.xlsx/.pptx` và định dạng Office khác: BLOCKED ở I2, chỉ hiện thông báo;
  không đổi tên hoặc giả chuyển đổi.

## Risks

- File provider có thể trả URL chậm, bị thu hồi quyền hoặc xung đột phiên bản.
- Payload chuỗi lớn qua WKScriptMessage bị giới hạn bộ nhớ.
- HTML là nội dung chủ động; phải chặn script và navigation mạng trước khi nạp.
- Việc dùng hợp đồng desktop giả lập cần test để không báo nhầm có LibreOffice.

## Test plan

1. Unit/static tests cho allowlist, capability, Help và không có network/server.
2. Build Xcode Simulator không ký.
3. Chạy native trên iPhone/iPad Simulator; mở picker và chụp UI/error state.
4. Kiểm tra round-trip fixture cho HTML/FODS/FODP ở mức byte/text mà bridge sở hữu.

## Rollback

Toàn bộ thay đổi nằm trong `ports/ios`, `tests/ios`, `docs/mobile` và template
handoff. Revert commit I2 không ảnh hưởng desktop hoặc mã shared.
