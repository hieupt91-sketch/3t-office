# VN Office Mobile

Host app iOS/iPadOS tối thiểu để tích hợp và kiểm thử `OOXMLKit` offline.

- Deployment target: iOS 15+
- Thiết bị: iPhone và iPad (`TARGETED_DEVICE_FAMILY = 1,2`)
- Giao diện hiện tại: mở tệp cục bộ qua Files bằng `fileImporter`, không cần mạng.
- Package local: `../OOXMLKit` (DOCX/XLSX/PPTX).

## Build kiểm tra

```sh
xcodebuild -project VNOfficeMobile.xcodeproj \
  -scheme VNOfficeMobile \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  CODE_SIGNING_ALLOWED=NO build
```

Archive/TestFlight cần Apple Developer App ID, provisioning profile phân phối và quyền App Store Connect tương ứng. IPA chỉ được đưa lên TestFlight sau khi export bằng signing phân phối hợp lệ.
