# Handoff — I2 luồng tệp native iOS/iPadOS offline

Ngày: 19/10/2026
Nhánh: `mobile/ios-native-files`
Base: `7d73f11`

## Kết quả

Đã nối lệnh Mở/Lưu hiện hữu của Doc, Sheet, Slide với
`UIDocumentPickerViewController` qua bridge promise của WKWebView. Luồng không
dùng Node, server, cloud, Python hoặc LibreOffice.

| Ứng dụng | Mở offline | Lưu/Lưu bản sao offline | OOXML |
|---|---|---|---|
| Doc | `.html`, `.htm` UTF-8 không có active content bị chặn | `.html` | DOCX: BLOCKED |
| Sheet | `.fods` hợp lệ | `.fods` | XLSX: BLOCKED |
| Slide | `.fodp` hợp lệ | `.fodp` | PPTX: BLOCKED |

Không có đường đổi tên HTML/FODS/FODP thành DOCX/XLSX/PPTX. Picker chỉ cho chọn
định dạng app thực sự đọc được; bridge vẫn công bố `officeEngine=false` và
`ooxmlRoundTrip=false`.

## Bảo vệ dữ liệu

- Chỉ đọc URL người dùng chọn, dùng security-scoped access và
  `NSFileCoordinator`.
- Ghi tệp nguyên tử; Lưu bản sao qua export picker của iOS.
- Token đường dẫn chỉ sống trong phiên và không lộ đường dẫn provider cho JS.
- Giới hạn 24 MB; xác thực extension và marker XML trước khi nạp/ghi.
- HTML có script/iframe/object/javascript/event handler bị từ chối.
- Không gửi nội dung tài liệu ra mạng.

## Hướng dẫn trong app

Nút cảm ứng **Tệp iOS** mở panel tiếng Việt, chỉ rõ cách dùng **Tệp → Mở**,
**Tệp → Lưu bản sao**, ba định dạng offline và trạng thái chưa hỗ trợ OOXML.

## Bằng chứng kiểm thử

- `python3 -m unittest discover -s tests/ios -v`: PASS 7/7.
- `plutil -lint ports/ios/launcher/Info.plist`: PASS.
- `bash -n ports/ios/scripts/*.sh`: PASS.
- Xcode `iphonesimulator` Debug build: PASS.
- iPad Air 11-inch (M3), iOS 26.3 Simulator:
  - app native boot/render: PASS;
  - panel Hướng dẫn tệp: PASS trực quan;
  - **Tệp → Mở** hiện Files `UIDocumentPicker`: PASS trực quan;
  - Hủy picker trở lại tài liệu, không báo lỗi: PASS trực quan.
- Chọn fixture từ Files và hoàn tất export picker: NOT RUN; Simulator hiện
  không có fixture tương ứng trong Files provider.
- Thiết bị thật: NOT RUN.

## Files changed

- `ports/ios/launcher/NativeDocumentService.swift`
- `ports/ios/launcher/MobileOfficeViewController.swift`
- `ports/ios/launcher/Info.plist`
- `ports/ios/VNOfficeIOS.xcodeproj/project.pbxproj`
- `ports/ios/Web/mobile-shell.css`
- `tests/ios/test_ios_native_files.py`
- `docs/mobile/PLAN-IOS-NATIVE-FILES-I2.md`
- `docs/mobile/HANDOFF-IOS-NATIVE-FILES-I2.md`
- `09-templates/AGENT-HANDOFF.md`

## Rủi ro và việc tiếp theo

1. Test thiết bị thật với Files cục bộ, iCloud Drive và SMB; kiểm tra xung đột
   provider khi lưu tại chỗ.
2. Thêm UI test fixture để hoàn tất round-trip HTML/FODS/FODP tự động.
3. Muốn DOCX/XLSX/PPTX offline phải có adapter OOXML riêng đã audit license và
   bộ fidelity; không mở rộng bridge I2 để giả hỗ trợ.
4. Khi tích hợp UI của agy, giải quyết xung đột trong
   `MobileOfficeViewController.swift`/`mobile-shell.css` bằng review thủ công,
   không merge mù.
