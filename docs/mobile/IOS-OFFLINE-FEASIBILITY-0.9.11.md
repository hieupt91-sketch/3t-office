# Khả thi offline trên iPhone và iPad — mốc 0.9.11

## Kết luận

Một ứng dụng universal iOS có thể chạy offline trên cả iPhone và iPad. Có thể tái
dùng phần lớn logic JavaScript, nhưng không thể đóng gói nguyên engine desktop.
Phạm vi an toàn ban đầu là tài liệu cơ bản; tệp Office phức tạp phải mở read-only
hoặc yêu cầu tạo bản sao, không được ghi đè khi chưa chứng minh round-trip.

## Ma trận tái sử dụng

| Thành phần | iOS offline | Việc cần làm |
|---|---:|---|
| Command bus, i18n, Help, công thức Sheet, undo/redo | Cao | Chạy test trên JavaScriptCore/WebKit |
| Writer editor, Sheet grid, Slide canvas | Trung bình–cao | Bố cục cảm ứng, IME, selection, memory |
| FODT/FODS/FODP parse/serialize JS | Cao | Tách khỏi bridge desktop, thêm contract test |
| `window.pywebview.api` | Không | Adapter Swift message bridge cùng capability contract |
| Python/LibreOffice/UNO | Không | Không đưa vào target iOS |
| DOCX/XLSX/PPTX import/export | Thấp ban đầu | ZIP/XML offline theo allowlist + bảo toàn phần chưa hiểu |
| Files/iCloud/SMB provider | Có | `UIDocumentPicker`/security-scoped URL, coordinated access |
| AutoRecover | Có | Autosave cục bộ nguyên tử theo scene/document |
| PDF/in | Có giới hạn | Print/PDF native cho nội dung app render được |
| License | Có | Keychain + API khi online; cache quyền dùng offline có hạn |

## Kiến trúc đề xuất

```text
Swift app universal (iPhone + iPad)
  ├─ DocumentGroup / Files / Share / Scene lifecycle
  ├─ WKWebView phục vụ asset đóng gói, không cần web server
  ├─ MobileBridge (message contract, capability flags)
  ├─ OfflineDocumentStore (atomic autosave + recovery)
  └─ OOXML Mobile Adapter
       ├─ ZIP entry preservation
       ├─ parser/writer cho feature được hỗ trợ
       └─ compatibility report trước khi cho Save

Shared web UI
  ├─ apps/writer, apps/sheet, apps/slides
  ├─ platform command/i18n/help
  └─ FODT/FODS/FODP models
```

Không dùng `scripts/serve.js`; asset phải nằm trong bundle và được WKWebView tải
cục bộ. Không cần Internet để tạo, mở, sửa hoặc autosave các tính năng đã hỗ trợ.

## Hai bố cục, một codebase

- iPad: workspace nhiều cột, toolbar ngữ cảnh, sidebar/inspector, hỗ trợ bàn phím
  và trackpad.
- iPhone: một workspace, toolbar dưới/ngăn kéo, formula bar trên bàn phím, panel
  toàn màn hình.
- Cùng document model và command ID; chỉ view/layout khác theo size class.

## Chiến lược định dạng an toàn

1. Tệp mới: chỉ sinh tập OOXML cơ bản đã có test.
2. Tệp đã mở nhưng không chỉnh: xuất lại nguyên bytes.
3. Tệp chỉnh cơ bản: patch tối thiểu các part hiểu rõ, giữ nguyên ảnh,
   relationship, styles và part chưa hiểu.
4. Nếu feature không thể bảo toàn: read-only hoặc Save a Copy với cảnh báo cụ thể.
5. Tuyệt đối không dùng serializer XML toàn cây cho sheet/styles nếu làm mất ảnh
   hoặc namespace, tương tự nguyên tắc desktop 0.9.11.

## Mốc triển khai có thể chạy cùng macOS

- I0: inventory + document payload contract + capability API.
- I1: Swift/WKWebView offline shell trên iPhone/iPad Simulator, mở UI không mạng.
- I2: tài liệu mới và autosave nội bộ cho Doc/Sheet/Slide cơ bản.
- I3: import/export OOXML cơ bản theo thứ tự Sheet → Doc → Slide.
- I4: thiết bị thật, IME tiếng Việt, Files/iCloud, memory/background.
- I5: TestFlight nội bộ; ký App Store/IAP là luồng riêng.

## Bằng chứng môi trường hiện có

- Xcode 26.3 đầy đủ.
- iOS 26.3 Simulator runtime đã cài.
- Có device type cho iPhone và nhiều cỡ iPad.
- Chưa có bằng chứng thiết bị iPhone/iPad thật hoặc tài khoản signing phù hợp.

## Quyết định còn cần

1. Duyệt Swift + WKWebView làm vỏ iOS production.
2. Chốt minimum iOS/iPadOS sau khi đo thiết bị khách hàng; probe ban đầu có thể
   dùng runtime hiện có nhưng không được biến thành minimum deployment mặc định.
3. Chọn mức tương thích MVP: khuyến nghị Sheet cơ bản trước, rồi Doc, rồi Slide.
4. Duyệt dependency ZIP/XML sau audit license; chưa chọn trong tài liệu này.
