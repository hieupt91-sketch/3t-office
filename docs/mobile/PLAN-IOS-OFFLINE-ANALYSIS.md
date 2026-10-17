# Plan gate — phân tích 3T Office offline trên iPhone và iPad

## Objective

Trong khi hoàn thiện macOS, xác định một kiến trúc iOS/iPadOS chạy offline, dùng
chung tối đa mã Doc/Sheet/Slide nhưng không đưa Python hoặc LibreOffice desktop
vào ứng dụng. Kết quả phải phân biệt rõ tính năng có thể tái dùng, tính năng cần
adapter mới và tính năng chưa thể cam kết giữ nguyên định dạng.

## Current capability

- 153 mô-đun JavaScript trong `apps/`, `platform/`, `adapters/`: phần lớn UI,
  command bus, công thức, định dạng, hoàn tác, i18n và Help có thể chạy trong
  WKWebView.
- UI hiện tối ưu cho desktop/ribbon, chuột và bàn phím vật lý.
- Mở/lưu Office hiện đi qua `window.pywebview.api`, Python, LibreOffice và lớp vá
  OOXML. Chuỗi này không chạy trên iOS.
- Writer/Sheet/Slides đã có mô hình trung gian FODT/FODS/FODP ở JavaScript, nhưng
  chuyển đổi DOCX/XLSX/PPTX ↔ mô hình trung gian vẫn phụ thuộc desktop engine.

## Scope/files

Giai đoạn phân tích chỉ được tạo tài liệu và probe cô lập trong `docs/mobile/`,
`ports/ios/` và `tests/ios/`. Không sửa `apps/**`, `platform/**` hoặc
`adapters/**` trên nhánh mobile; mọi điểm mở rộng dùng chung phải đề xuất về
`main` trước.

## Dependencies and decision gates

- Đề xuất vỏ Swift + WKWebView để tích hợp Files, autosave, share sheet và vòng
  đời scene của iPhone/iPad. Đây là lựa chọn framework UI và phải được người phụ
  trách duyệt trước khi thành mã production.
- Đọc/ghi ZIP/XML OOXML offline cần chọn implementation Swift hoặc thư viện mã
  nguồn mở. Không thêm dependency trước khi audit license, kích thước và khả năng
  bảo toàn ZIP entry.
- Không gửi tài liệu lên server trong luồng offline. Mọi fallback cloud tương lai
  là security-boundary riêng và cần xin phép rõ ràng.

## Risks

- WKWebView khác Chromium ở `contenteditable`, Selection, clipboard và IME tiếng
  Việt; phải đo bằng Simulator và thiết bị thật.
- Tự ghi OOXML dễ làm mất ảnh, relationship, style hoặc feature chưa hiểu.
- iPhone cần bố cục hẹp; không thể thu nhỏ nguyên ribbon desktop.
- Background suspension yêu cầu autosave nguyên tử và phục hồi scene.

## Test plan

1. Static capability/bridge inventory.
2. WKWebView shell probe trên iPhone và iPad Simulator: boot offline, chuyển app,
   nhập tiếng Việt composition, rotate/resize, background/restore.
3. Contract tests cho adapter Files và document payload, không dùng mạng.
4. Fixture round-trip theo ba mức: không chỉnh sửa phải byte-preserving khi có
   thể; chỉnh sửa cơ bản không làm mất phần chưa hiểu; tệp phức tạp phải cảnh báo
   và không ghi đè.
5. Thiết bị thật: iPhone màn hình nhỏ và iPad có bàn phím/bút.

## Rollback

Nhánh phân tích tách khỏi `main`, `platform/macos`; xóa/revert `ports/ios` và
`tests/ios` không ảnh hưởng desktop. Không đổi định dạng tài liệu trong giai đoạn
probe.
