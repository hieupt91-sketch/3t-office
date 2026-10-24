# Roadmap mobile — VN Office iOS/iPadOS đạt workflow Microsoft Office

Cập nhật: 24/10/2026

## Mục tiêu

Xây VN Writer, VN Sheet và VN Slides chạy offline trên iPhone và iPad, dùng OOXMLKit làm lõi đọc/sửa/ghi, có UI cảm ứng riêng cho mobile và mở/lưu tài liệu tương thích với Word, Excel và PowerPoint.

Mục tiêu là đạt **workflow và kết quả người dùng cần**, không sao chép mã, thương hiệu, icon hay giao diện độc quyền của Microsoft.

## Trạng thái hiện tại

- OOXMLKit Swift thuần/Foundation: đọc/sửa/ghi DOCX/XLSX/PPTX offline.
- Bridge JSON và native file pipeline đã có trên nhánh mobile.
- Test package hiện tại: 121/121 PASS trên macOS toolchain.
- Simulator iPhone/iPad đã PASS bộ test package.
- Chưa có app host iOS/iPadOS hoàn chỉnh để TestFlight.
- Chưa kiểm đủ trên iPhone/iPad thật, chưa đo memory/time thật.
- OOXMLKit chưa thay toàn bộ formula engine, renderer, print/PDF và UI editor.

## Kiến trúc mobile

```text
SwiftUI/UIKit shell
  ├── document picker + security-scoped bookmark
  ├── VN Writer / VN Sheet / VN Slides mobile UI
  └── WKWebView hoặc native editor surface
          ↓
Mobile Command API + Undo/Redo + Autosave/Recovery
          ↓
OOXMLBridge
          ↓
OOXMLKit (ZIP/OPC/XML/DOCX/XLSX/PPTX)
```

Không chạy LibreOffice, Python, Node hoặc server trong runtime mobile. LibreOffice chỉ dùng trên máy phát triển để tham khảo/đối chiếu nếu cần.

## Các giai đoạn bắt buộc

### M0 — App host chạy được

- Tạo Xcode app target cho iPhone/iPad.
- Tích hợp local package OOXMLKit.
- Có bundle ID, signing, Debug/Release scheme.
- Mở file qua Files/iCloud provider và security-scoped URL.
- Lưu file mới, Save As, Share/Open In.
- Hiển thị trạng thái loading, saving, failed và recovery.

**Gate:** app mở và lưu một DOCX, XLSX, PPTX offline trên simulator; không mất file khi kill app.

### M1 — Mobile shell và UX

- Tab Doc/Sheet/Slide.
- Thanh công cụ gọn cho iPhone.
- Ribbon/panel hai tầng cho iPad.
- Touch target tối thiểu 44 pt.
- Dynamic Type, Dark Mode, VoiceOver.
- Undo/Redo luôn nhìn thấy.
- Context menu, selection handles, pinch zoom, scroll và keyboard accessory.
- Chế độ portrait/landscape.

**Gate:** người dùng mới có thể mở, sửa, lưu và tìm tính năng mà không cần hướng dẫn ngoài app.

### M2 — VN Writer mobile

- Nhập tiếng Việt, Unicode và emoji.
- Chọn chữ bằng touch/keyboard.
- Bold, italic, underline, màu, highlight, font size.
- Paragraph alignment, spacing, bullets, numbering, styles.
- Table cơ bản, ảnh, hyperlink.
- Header/footer, page break và page preview.
- Find/Replace.
- Copy/paste rich text.

**Gate:** Save → đóng app → mở lại giữ nội dung, style, ảnh và bảng.

### M3 — VN Sheet mobile

- Grid cuộn mượt, selection range và multi-cell selection.
- Formula bar và keyboard số.
- Nhập text, số, ngày, giờ, %, tiền tệ.
- Fill handle, copy/paste, insert/delete row/column.
- Freeze panes, hide/unhide, merge/unmerge.
- Sort/filter.
- Multiple sheet, rename/duplicate/delete.
- Formula engine incremental.
- Error display và dependency invalidation.

**Gate:** workbook chứa công thức, merged cells, styles và nhiều sheet mở/sửa/lưu không sai dữ liệu so với Excel.

### M4 — VN Slides mobile

- Slide navigator dạng thumbnail.
- Tạo, duplicate, delete, reorder slide.
- Layout/theme/placeholder.
- Text box, image, shape, table.
- Align, resize, rotate, layer order.
- Speaker notes.
- Presentation mode.

**Gate:** Save → Reopen giữ thứ tự slide, theme, font, object position, image và notes.

### M5 — File compatibility

Chuẩn bị corpus nội dung giả do Word/Excel/PowerPoint thật tạo:

- DOCX: styles, table, header/footer, image, comments, tracked changes.
- XLSX: formula, chart, named range, hidden sheet, conditional formatting, validation.
- PPTX: master, layout, theme, chart, notes, images, nhiều slide.

Mỗi file chạy:

```text
Open → Edit → Undo → Redo → Save → Close → Reopen
→ mở bằng Office thật → kiểm tra Repair → lưu lại → kiểm tra lần hai
```

**Gate:** không có Repair; không mất text, ảnh, style, formula, chart, slide hoặc metadata trong phạm vi hỗ trợ.

### M6 — Hiệu năng và bộ nhớ

- Lazy load part không cần thiết.
- Chỉ tải sheet/range/slide đang nhìn thấy.
- Giữ byte nén của part không sửa.
- Background parse và cancellation.
- Incremental formula recalculation.
- Test file 1 MB, 10 MB và file lớn.
- Đo cold open, warm open, save, export và peak memory trên iPhone/iPad thật.

Mục tiêu ban đầu để đo:

| File | Cold open | Save | Trạng thái UI |
|---|---:|---:|---|
| 1 MB | ≤ 1 giây | ≤ 1 giây | không treo |
| 10 MB | ≤ 3 giây | ≤ 3 giây | có progress nếu cần |
| lớn hơn | hiện nội dung trước | background save | cảnh báo rõ |

Không ghi PASS nếu chỉ đo simulator.

### M7 — Ổn định offline

- Bật Airplane Mode khi test.
- Không gọi API mạng trong luồng mở/sửa/lưu.
- Autosave cục bộ.
- Recovery sau kill/crash.
- Atomic replacement và backup bản trước.
- File đang mở vẫn dùng được khi mất mạng.
- Không gửi nội dung tài liệu ra cloud.

**Gate:** mở, sửa, lưu, đóng và khôi phục tài liệu hoàn toàn khi không có mạng.

### M8 — TestFlight release

- App target Release.
- App icon, launch screen, privacy manifest.
- Signing và provisioning.
- Archive `.xcarchive` và export `.ipa`.
- TestFlight internal group.
- Test trên ít nhất một iPhone và một iPad thật.
- Crash log, performance log và feedback form.

## Bộ test mobile bắt buộc

| Nhóm | Mouse | Touch | Keyboard | Save/Reopen | Office check |
|---|---|---|---|---|---|
| Writer text/style | — | PASS/FAIL | PASS/FAIL | bắt buộc | DOCX |
| Sheet formula/range | — | PASS/FAIL | PASS/FAIL | bắt buộc | XLSX |
| Slides object/layout | — | PASS/FAIL | PASS/FAIL | bắt buộc | PPTX |
| File picker/share | — | bắt buộc | — | bắt buộc | — |
| Recovery/offline | — | bắt buộc | — | bắt buộc | — |

## Thứ tự giao team

1. Mobile app host + signing.
2. File picker, save, autosave và recovery.
3. Mobile shell và UI Writer/Sheet/Slides.
4. Formula engine và Sheet grid.
5. Writer/Slides editing.
6. Office corpus và compatibility harness.
7. Performance trên thiết bị thật.
8. TestFlight nội bộ.

Không chuyển sang bước TestFlight trước khi M0, M1, M5 và M7 đạt gate.
