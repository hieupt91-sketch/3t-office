# VN Office Mobile

Host app iOS/iPadOS tích hợp giao diện dùng chung VN Writer/Sheet/Slides và `OOXMLKit` offline.

- Deployment target: iOS 15+
- Thiết bị: iPhone và iPad (`TARGETED_DEVICE_FAMILY = 1,2`)
- Giao diện: đóng gói nguyên renderer web dùng chung (`index.html`, `apps/`, `platform/`, `adapters/`, `branding/`) trong WKWebView; có lớp CSS cảm ứng riêng cho iPhone/iPad.
- Native bridge: `OOXMLWebViewBridge` được đăng ký trong WKWebView; dữ liệu OOXML vẫn nằm trong tiến trình app, không cần mạng.
- Package local: `../OOXMLKit` (DOCX/XLSX/PPTX).

## Build kiểm tra

```sh
xcodebuild -project VNOfficeMobile.xcodeproj \
  -scheme VNOfficeMobile \
  -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  CODE_SIGNING_ALLOWED=NO build
```

Archive/TestFlight cần Apple Developer App ID, provisioning profile phân phối và quyền App Store Connect tương ứng. IPA chỉ được đưa lên TestFlight sau khi export bằng signing phân phối hợp lệ.
