# Execution Spec — VN Office Mobile iOS/iPadOS Phase 1–5

Mục tiêu: triển khai và xác nhận app VN Office mobile chạy offline trên iPhone/iPad, dùng OOXMLKit native và đạt workflow tương thích Word/Excel/PowerPoint trong phạm vi tính năng công bố.

## Quy tắc thực thi

- Không ghi PASS nếu chưa chạy lệnh hoặc thao tác trực quan tương ứng.
- Mỗi phase phải có artifact, log và kết luận PASS/FAIL/BLOCKED.
- Không dùng LibreOffice/Python/Node trong runtime mobile.
- LibreOffice chỉ được dùng ngoài app để đối chiếu trong parity test.
- Không sửa expected để làm test xanh.
- Không chuyển phase khi gate trước chưa đạt.
- Không phát hành TestFlight khi còn lỗi CRITICAL/BLOCKER ở Open, Edit, Save, Reopen hoặc Recovery.

## Trạng thái bắt đầu

- Nhánh: `claude/ooxml-offline-ios-library-fqqyj0`
- App: `ports/ios/VNOfficeMobile/`
- Engine: `ports/ios/OOXMLKit/`
- Toolchain: Xcode 26.3, iOS 15+
- OOXMLKit baseline: 121/121 release tests PASS.

## Phase 1 — App host và native lifecycle

### Việc phải làm

- [x] Xcode app target `VNOfficeMobile`.
- [x] Bundle ID và target iPhone/iPad.
- [x] WKWebView đóng gói renderer local.
- [x] Files open/save bridge.
- [x] OOXMLBridge được link trong app.
- [x] Custom URL scheme trả HTTP 200/MIME hợp lệ.
- [ ] Open DOCX/XLSX/PPTX qua Files → native bridge → UI.
- [ ] Save/Save As → Files → Close → Reopen.

### Lệnh kiểm

```sh
xcodebuild -project ports/ios/VNOfficeMobile/VNOfficeMobile.xcodeproj \
  -scheme VNOfficeMobile -destination 'platform=iOS Simulator,name=iPhone 17 Pro' \
  CODE_SIGNING_ALLOWED=NO build
xcodebuild -project ports/ios/VNOfficeMobile/VNOfficeMobile.xcodeproj \
  -scheme VNOfficeMobile -destination 'platform=iOS Simulator,name=iPad Pro 13-inch (M5)' \
  CODE_SIGNING_ALLOWED=NO build
```

### Gate

App cài và hiển thị UI trên iPhone/iPad; Open/Edit/Save/Reopen không dùng UNO/LibreOffice.

## Phase 2 — Mobile shell và UX

### Việc phải làm

- [ ] Mobile runtime marker được đặt trước khi renderer chạy.
- [ ] `connectDocumentServices()` không khởi động UNO trên iOS/iPadOS.
- [ ] Mobile command adapter không import trực tiếp `adapters/libreoffice`.
- [ ] Ribbon iPhone một vùng, iPad hai vùng.
- [ ] Touch target tối thiểu 44 pt.
- [ ] Tap, long press, swipe, pinch zoom, keyboard focus.
- [ ] Portrait/landscape.
- [ ] Undo/Redo, loading, saving, error và dirty state.
- [ ] Dark Mode, Dynamic Type, VoiceOver labels.

### Gate

Smoke test bằng thao tác touch trên iPhone và iPad: chuyển Doc/Sheet/Slide, mở tab, nhập text, undo/redo, đổi orientation; không chồng UI hoặc mất focus.

## Phase 3 — Writer/Sheet/Slides workflow

### Writer

- [ ] Vietnamese text, Unicode, emoji.
- [ ] Style, font, size, bold, italic, underline, color, highlight.
- [ ] Paragraph, list, table, image, hyperlink, find/replace.
- [ ] DOCX Save/Reopen giữ text, style, table và image.

### Sheet

- [ ] Cell/range/row/column selection.
- [ ] Text, number, date, percentage, currency.
- [ ] Formula bar, copy/paste, fill, merge, row/column insert/delete.
- [ ] Multiple sheet, rename, duplicate, delete.
- [ ] Formula engine incremental và error values.
- [ ] XLSX Save/Reopen giữ formula, style, merge và sheet.

### Slides

- [ ] Create/duplicate/delete/reorder slide.
- [ ] Layout/theme/placeholder.
- [ ] Text box, image, shape, resize, rotate, layer order.
- [ ] Notes, slideshow, PPTX Save/Reopen.

### Gate

Mỗi app hoàn thành chuỗi `Open → Edit → Undo → Redo → Save → Close → Reopen` trên Simulator; kết quả native bridge và UI khớp nhau.

## Phase 4 — Microsoft Office compatibility

### Corpus

- [ ] DOCX giả do Word thật tạo.
- [ ] XLSX giả do Excel thật tạo.
- [ ] PPTX giả do PowerPoint thật tạo.
- [ ] Có tiếng Việt, ảnh, bảng, chart, formula, styles, comments/notes.
- [ ] Không chứa dữ liệu khách hàng hoặc secret.

### Kiểm tra

```text
Office source → VN Office Open/Edit/Save → Office Open
→ kiểm Repair → kiểm nội dung/format → Office Save → VN Office Reopen
```

- [ ] Structural diff.
- [ ] Visual diff.
- [ ] Formula result diff.
- [ ] Font/position/size diff.
- [ ] Không có Repair.

### Gate

Không có lỗi mất dữ liệu hoặc hỏng file trong phạm vi tính năng công bố. Mọi khác biệt phải có bug ID, severity và workaround.

## Phase 5 — Hiệu năng, offline và recovery

- [ ] Cold/warm open benchmark.
- [ ] Save/export benchmark.
- [ ] Peak memory trên iPhone thật và iPad thật.
- [ ] File 1 MB, 10 MB và file lớn.
- [ ] Lazy load part/range/slide.
- [ ] Incremental formula recalculation.
- [ ] Airplane Mode test.
- [ ] Kill app khi đang sửa.
- [ ] Autosave và recovery.
- [ ] Atomic save và backup bản trước.
- [ ] Không có network request trong runtime.

### Mục tiêu đo ban đầu

| File | Cold open | Save | Kết quả |
|---|---:|---:|---|
| 1 MB | ≤ 1 s | ≤ 1 s | UI không treo |
| 10 MB | ≤ 3 s | ≤ 3 s | có progress nếu cần |
| lớn hơn | hiển thị dần | background save | cảnh báo rõ |

### Gate

Mở/sửa/lưu/khôi phục được khi offline; không mất dữ liệu sau kill/relaunch; benchmark có số liệu thật, tách riêng Simulator và thiết bị thật.

## Điều kiện xin phát hành

Chỉ báo “Phase 1–5 hoàn tất, đủ điều kiện phát hành” khi tất cả checklist trên đã có evidence. Khi đó mới:

1. Archive Release.
2. Ký bằng Apple Developer profile.
3. Export IPA.
4. Upload TestFlight internal.
5. Chạy lại smoke test trên iPhone/iPad thật.

Nếu còn mục chưa làm, trạng thái phải là `NOT RUN`, `FAIL` hoặc `BLOCKED`, không được gọi là hoàn tất.
