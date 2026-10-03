# HANDOFF-SLIDE-CLIPBOARD.md

## Tóm tắt
Sửa lỗi clipboard (Ctrl+C/X/V) không hoạt động trong text box của VN Slides. Trước khi sửa: Copy thành công nhưng Cut không xóa text được chọn, Paste không dán được text. Sau khi sửa: hành vi ngang hàng với VN Writer.

## Nguyên nhân gốc rễ (Root Cause)
**Đây là bug ở app Slides (a)**, không phải harness bug.

VN Slides thiếu attribute `data-vno-native-clipboard="true"` trên các element contentEditable (title, body, body2, shape text, table cells, WordArt, diagram nodes). Do đó `ShortcutManager._handleKeyDown()` (platform/commands/shortcut-manager.js:159) không nhận diện được đây là vùng cho phép native clipboard, nên nó chặn `Ctrl+X/C/V` và gọi `SlidesAdapter` handler dùng `document.execCommand("cut/copy/paste")` — API deprecated không tin cậy trên WebView2.

VN Writer đã có attribute này trên header/body/footer (writer-app.js:78,88,97) nên clipboard hoạt động đúng.

## Bằng chứng trước/sau

### Trước (FAIL - desktop regression trên main):
```
FAIL 3T Slide Ctrl+C/X/V 
detail: {"clipboardHasMarker":true,"caretReady":true,"afterCutLength":1,"afterPasteLength":1}
```
- `clipboardHasMarker: true` → Copy OK
- `afterCutLength: 1` → Cut **không xóa** text được chọn (vẫn còn marker)
- `afterPasteLength: 1` → Paste **không dán** được text từ clipboard

### Sau (PASS - sau khi fix):
```
PASS 3T Slide Ctrl+C/X/V
detail: {"clipboardHasMarker":true,"caretReady":true,"afterCutLength":1,"afterPasteLength":64}
```
- `clipboardHasMarker: true` → Copy OK
- `afterCutLength: 1` → Cut xóa text (chỉ còn placeholder newline)
- `afterPasteLength: 64` → Paste thành công, text "CDPSlideClipboard" xuất hiện lại

## Các file đã sửa

### 1. apps/slides/slides-canvas.js
Thêm `data-vno-native-clipboard="true"` cho:
- **titleEl** (dòng ~427): placeholder "Bấm để thêm tiêu đề"
- **bodyEl** (dòng ~439): placeholder "Bấm để thêm văn bản"  
- **body2El** (dòng ~449): placeholder "Bấm để thêm văn bản" (cột 2)
- **Shape textbox textEl** (trong `startEditing`, 3 chỗ): khi user double-click để edit
- **Table cells** (dòng ~4103): `td.dataset.vnoNativeClipboard = "true"`
- **WordArt textEl** (trong `startEditing`): khi user edit WordArt
- **Diagram node textEl** (trong `startEditing`): khi user edit diagram node

### 2. tests/unit/slides-clipboard.test.js (MỚI)
6 unit tests mới:
1. Title/Body/Body2 có attribute `data-vno-native-clipboard`
2. Shape textbox text element nhận attribute khi bắt đầu edit
3. Table cells có attribute
4. WordArt text element nhận attribute khi bắt đầu edit
5. Diagram node text element nhận attribute khi bắt đầu edit
6. SlidesAdapter xử lý đúng 4 lệnh: cut/copy/paste/pastePlain

Đã đăng ký trong `tests/run-tests.js` suite "89b. Behavioral Tests — VN Slides Clipboard". Tổng test tăng từ **2304 → 2310**.

## Kết quả kiểm thử

### Unit tests (node tests/run-tests.js):
```
KẾT QUẢ KIỂM THỬ: 2310/2310 PASS | 0 FAIL
```

### Desktop regression (node --experimental-websocket tests/live/cdp/run-desktop-regression.mjs slides):
```
TOTAL: 8 PASS, 0 FAIL, 0 BLOCKED, 3 N/A
```
- **3T Slide Ctrl+C/X/V: PASS** (trước là FAIL)

### Desktop regression full (writer/sheet/slides):
Tất cả 3 app đều PASS clipboard test. Chỉ có 3 test N/A do tính năng chỉ dành cho app khác.

## Hành vi mong đợi (parity với VN Writer)
| Phím tắt | Hành vi |
|----------|---------|
| Ctrl+C | Copy vùng chọn vào clipboard, giữ selection |
| Ctrl+X | Cut: xóa vùng chọn, đưa vào clipboard |
| Ctrl+V | Paste: chèn nội dung clipboard tại caret (plain + formatted) |
| Ctrl+Shift+V | Paste plain text only |
| Mỗi thao tác | Một bước Undo (Ctrl+Z hoàn tác đúng 1 lần) |

## Lưu ý triển khai
- Không thay đổi logic `SlidesAdapter.handleDispatch()` — vẫn dùng `document.execCommand()` nhưng giờ không được gọi nữa vì `ShortcutManager` để native browser handle.
- Attribute `data-vno-native-clipboard` được check ở `shortcut-manager.js:159` — nếu có và `isContentEditable=true` thì `return;` (bỏ qua handler, để browser tự lo).
- Fix này tuân thủ nguyên tắc: **UI không gọi LibreOffice implementation trực tiếp**, để trình duyệt xử lý clipboard event chuẩn.

## Rủi ro / Follow-up
- Cần test thủ công trên bản đóng gói (packaged app) với WebView2 thật để xác nhận không regression.
- Nếu sau này thêm text-editable element mới trong Slides, nhớ thêm `dataset.vnoNativeClipboard = "true"`.
- Các app khác (Writer, Sheet) đã có attribute này — không cần sửa.