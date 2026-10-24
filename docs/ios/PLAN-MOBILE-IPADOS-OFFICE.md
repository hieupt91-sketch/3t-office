# Kế hoạch triển khai VN Office Mobile/iPadOS

## Mục tiêu phát hành

Xây dựng một ứng dụng iPhone/iPad chạy offline, dùng chung một bộ UI Writer/Sheet/Slides nhưng có adapter native riêng, mở/sửa/lưu DOCX/XLSX/PPTX và xuất PDF mà không phụ thuộc LibreOffice hoặc Python runtime.

## Nguyên tắc

1. Native Swift/OOXMLKit là đường chạy tài liệu mobile.
2. UI chỉ gọi command/service; không gọi trực tiếp Swift, WebKit hoặc LibreOffice.
3. Không đánh dấu PASS nếu chưa chạy Open → Edit → Save → Close → Reopen → Export.
4. Không phát hành nếu còn lỗi mất dữ liệu, hỏng OOXML, tính sai công thức hoặc app switcher không dùng được bằng touch.

## Kiến trúc đích

```text
SwiftUI shell
  └── WKWebView shared VN Office UI
        └── MobileDocumentBridge (JS protocol)
              └── OOXMLWebViewBridge (Swift)
                    └── OOXMLKit (DOCX/XLSX/PPTX)
```

LibreOffice/Python chỉ dùng cho desktop; không được trở thành dependency của iOS/iPadOS.

## Giai đoạn và đầu ra

### M0 — Khóa phạm vi và fixtures

- Chốt giao thức `open`, `info`, `read`, `mutate`, `exportBytes`, `save`.
- Chuẩn bị fixture DOCX/XLSX/PPTX có tiếng Việt, emoji, bảng, ảnh, công thức và slide objects.
- Định nghĩa ma trận iPhone dọc/ngang, iPad dọc/ngang và thiết bị thật.
- Đầu ra: fixture pack, schema giao thức, test IDs.

### M1 — Native document lifecycle

- Tích hợp `UIDocumentPickerViewController` cho Open/Import.
- Tích hợp Save/Save As vào Files/iCloud Drive/sandbox.
- Xử lý overwrite, cancel, file Unicode, file trùng tên, lỗi quyền ghi.
- Lưu handle tài liệu trong Swift; không đẩy toàn bộ tài liệu qua JS nếu không cần.
- Đầu ra: Open/Save/Reopen native test PASS cho cả ba định dạng.

### M2 — MobileDocumentBridge

- Tạo adapter JS mobile, không dùng `globalUnoBridge` trực tiếp.
- Map command chung sang OOXMLBridge.
- Có trạng thái `offline`, `dirty`, `saving`, `saved`, `error`.
- Hiển thị lỗi thật, không dùng thông báo “chỉ khả dụng trên Desktop”.
- Đầu ra: UI Writer gọi được native open/save bằng giao thức ổn định.

### M3 — Writer parity

- Nhập/chọn/định dạng văn bản.
- Bảng, ảnh, hyperlink, page break, header/footer nếu OOXMLKit hỗ trợ.
- Undo/Redo, Find/Replace, copy/paste.
- Save/Reopen giữ nội dung và định dạng.
- Đầu ra: Writer mobile workflow PASS trên iPhone/iPad.

### M4 — Sheet parity

- Cell/range/row/column selection và bàn phím số.
- Giá trị text/number/date/formula.
- SUM, AVERAGE, MIN, MAX, COUNT, IF, AND, OR, ROUND, SUMIF/SUMIFS, COUNTIF/COUNTIFS.
- Relative/absolute reference, fill, insert/delete, merge, freeze, sort/filter, nhiều sheet.
- Đầu ra: kết quả công thức đúng và XLSX mở lại không repair.

### M5 — Slides parity

- Slide CRUD, reorder, layout.
- Textbox, image, shape, resize, move, rotate, layer/order.
- Copy/paste, undo/redo, slideshow.
- Đầu ra: PPTX mở lại giữ font, ảnh, vị trí và thứ tự lớp.

### M6 — Mobile UX

- Touch target tối thiểu 44pt.
- App switcher Doc/Sheet/Slides mở bằng touch và bàn phím.
- Ribbon cuộn ngang không chồng; iPad có layout hai vùng.
- Bàn phím ảo tự co editor; portrait/landscape.
- Dark mode, Dynamic Type, VoiceOver labels.
- Đầu ra: visual QA PASS trên iPhone và iPad thật.

### M7 — Compatibility và phát hành

- Open → Edit → Save → Reopen bằng Microsoft Word/Excel/PowerPoint thật.
- Export PDF và kiểm tra font, ảnh, pagination.
- Stress test file lớn, cancel, thiếu bộ nhớ, offline hoàn toàn.
- Archive, TestFlight build, ký và kiểm tra entitlements.
- Đầu ra: release candidate có báo cáo QA và danh sách lỗi còn lại.

## Tiêu chí nghiệm thu bắt buộc

- Không còn FAIL/BLOCKED ở Open, Save, Reopen của cả Doc/Sheet/Slides.
- Không có lỗi mất dữ liệu hoặc OOXML repair.
- App switcher hoạt động bằng touch trên iPhone và iPad.
- Native tests và UI smoke tests có số liệu thật.
- Mọi tính năng mới có hướng dẫn tiếng Việt trong app.
- Có báo cáo riêng cho Simulator và thiết bị thật.

## Rủi ro và cách xử lý

| Rủi ro | Cách xử lý |
|---|---|
| OOXMLKit chưa tạo được tài liệu mới | Bổ sung template DOCX/XLSX/PPTX tối thiểu trước khi làm UI mới |
| UI hiện dùng FODF/LibreOffice payload | Không giả lập; viết MobileDocumentBridge và chuyển từng workflow |
| File lớn làm tốn RAM | Chunk/base64 theo handle, đo bộ nhớ trên thiết bị thật |
| Khác biệt Word/Excel/PowerPoint | Mở lại bằng Office thật, ghi lỗi tương thích theo fixture |
| Touch hit-test sai | CUA test theo tọa độ + accessibility/VoiceOver, sửa z-index và hit area |

## Trình tự thực hiện ngay

1. M0: fixture + schema bridge.
2. M1: document picker và native Save/Save As.
3. M2: nối Writer UI với bridge, bỏ lỗi Desktop-only.
4. Chạy lại Writer workflow đầy đủ.
5. M4/M5: nối Sheet và Slides lần lượt.
6. M6/M7: visual QA, thiết bị thật, TestFlight.

Không chuyển sang giai đoạn sau nếu tiêu chí nghiệm thu của giai đoạn trước chưa đạt.
