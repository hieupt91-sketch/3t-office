# Handoff Hạng mục CH-4: Dán chéo giữa Doc, Sheet và Slide

- **Hạng mục**: CH-4 — Bàn phím & Clipboard (Dán chéo giữa 3T Doc, 3T Sheet và 3T Slide)
- **Agent**: agy (gemini-3.8-flash-high)
- **Nhánh**: `feat/ch4-cross-app-paste-agy`
- **Worktree**: `E:\VNOffice-agy-crosspaste`
- **Mục tiêu**: Thực hiện cơ chế sao chép và dán chéo (cross-app clipboard interop) qua clipboard chuẩn của hệ điều hành giữa 3 ứng dụng Doc, Sheet và Slide; đo lường và nghiệm thu thực tế 100% trên phiên desktop thật qua WebView2 CDP.

---

## 1. Kết quả kiểm thử máy trạm thật (Desktop Real Sessions via CDP)

Kịch bản kiểm thử: `node --experimental-websocket tests/live/cdp/cross-app-paste.desktop.mjs`
- Khởi động 3 phiên app desktop độc lập: `python -s main.py --app=sheet`, `writer`, `slides` với cổng debug riêng biệt (9381, 9382, 9383) và thư mục `LOCALAPPDATA` riêng (`E:\VNOffice-profiles\agy-crosspaste-1, 2, 3`).
- Điều khiển 100% qua WebView2 CDP (`Runtime.evaluate`, `Input.dispatchKeyEvent`, `Input.dispatchMouseEvent`).
- CẤM TUYỆT ĐỐI SendKeys, SendInput, keybd_event, mouse_event, pyautogui.
- Đo lường trực tiếp từ DOM và Model sau khi dán. CẤM gán cứng, CẤM dữ liệu giả.

### BẢNG ĐO THỰC TẾ 7 TIÊU CHÍ CH-4

```
========================================================================================
            KẾT QUẢ KIỂM THỬ DESKTOP CDP THẬT: CH-4 DÁN CHÉO (3T OFFICE)
========================================================================================
STT | Tiêu chí đánh giá                            | Trạng thái | Giá trị đo được thực tế
----------------------------------------------------------------------------------------
1   | Sheet sang Doc: Bảng 3x3, đậm tiêu đề, số, ngày | [PASS]     | Bảng 3x3 (thẻ <table>), tiêu đề đậm: true, có '1,250' & '31/12/2026'
2   | Doc sang Sheet: Bảng 2x3 vào B2:D3, số thành số, SUM | [PASS]     | B2:D2=[Q1,Q2,Q3], B3:D3=[100,200,300], type=number, SUM(B3:D3)=600
3   | Doc sang Slide: Chữ vào hộp chữ, giữ đậm & nghiêng | [PASS]     | Nội dung: 'Đoạn văn chứa chữ in đậm và chữ in nghiêng chuẩn phong cách...', bold=true, italic=true, không sinh shape rác (shapesCount=0)
4   | Slide sang Doc: Nhận đúng đoạn văn, giữ in đậm | [PASS]     | Nội dung: 'Kế hoạch Chiến lược 2027', in đậm: true
5   | Sheet sang Slide: Tạo Table Shape 2x2 trên canvas | [PASS]     | Tạo Table Shape 2x2, ô=[<b>Hạng mục</b>,<b>Tỷ trọng</b>; Phần cứng,<b>0.6</b>] (Lý do chọn: Bảng biểu trực quan chuẩn phong cách thuyết trình)
6   | Dán chỉ chữ (Ctrl+Shift+V / Plain) trên cả 3 app | [PASS]     | Doc sạch thẻ (true), Sheet không mang style (true), Slide sạch style (true)
7   | Hoàn tác đúng 1 bước (Ctrl+Z) sau khi dán    | [PASS]     | Ctrl+Z hoàn tác đúng 1 bước: dán văn bản rút lại ('Hạng mục\tTỷ trọng\r\nPhần cứng\t0.6' -> rỗng), dán Table Shape rút lại (1 -> 0 shape)
========================================================================================
TỔNG KẾT: 7/7 TIÊU CHÍ ĐẠT CHUẨN (HOÀN TẤT XUẤT SẮC)
========================================================================================
```

---

## 2. Chi tiết giải pháp kỹ thuật

### A. Tầng Shared Platform & Cầu nối Clipboard hệ điều hành
- **Cầu nối Win32 Clipboard trong `main.py`**:
  - Bổ sung `_write_windows_clipboard_data(text, html)` đối xứng với `_read_windows_clipboard_data()`: sử dụng Win32 API (`OpenClipboard`, `EmptyClipboard`, `SetClipboardData`, `CloseClipboard`) để ghi đồng thời `CF_UNICODETEXT` (13) và `HTML Format` (với các headers chuẩn `StartHTML`, `EndHTML`, `StartFragment`, `EndFragment`).
  - Phơi qua `VnOfficeApi.write_clipboard_data` cho WebView2. Nhờ đó, thao tác sao chép luôn được đồng bộ trực tiếp vào clipboard của Windows bất kể cửa sổ nào đang active/focus, đảm bảo liên lạc thông suốt 100% giữa các tiến trình app desktop độc lập và các phần mềm bên ngoài.
- **Module chung `platform/clipboard/office-clipboard.js`**:
  - `serializeWriterSelectionToClipboard`: Khi người dùng bôi chọn một bảng (hoặc các hàng/cột), tự động đóng gói fragment thành cấu trúc HTML `<table>` hoàn chỉnh và trích xuất dữ liệu `text/plain` dạng tab-separated (TSV) theo chuẩn Office.
  - `serializeSheetRangeToClipboard`: Chuyển đổi vùng ô đã chọn thành bảng HTML với đầy đủ màu sắc, in đậm/nghiêng, kẻ viền và định dạng dữ liệu (số, ngày, phần trăm).

### B. VN LibreOffice Adapters
- **Writer Adapter (`adapters/libreoffice/writer/writer-adapter.js`)**:
  - `_sanitizeClipboardHtml`: Cho phép bảo toàn các thuộc tính và kiểu dáng bố cục bảng (`border`, `cellpadding`, `cellspacing`, `width`, `height`, `colspan`, `rowspan`, `padding`) khi dán HTML từ Sheet hoặc Word.
  - Tích hợp `globalUnoBridge.writeClipboardData` khi copy để đảm bảo dữ liệu ghi vào clipboard hệ điều hành.
- **Sheet Adapter (`adapters/libreoffice/sheet/sheet-adapter.js`)**:
  - Khi copy: gọi `_captureSelectedClipboard` rồi đồng bộ qua `writeClipboardData` và `navigator.clipboard`.
  - Khi paste: phân tích dữ liệu qua `parseOfficeHtmlTable` và `parseOfficeTsv`. Tự động nhận diện kiểu số (number), ngày tháng (date), phần trăm (percentage) để các công thức (ví dụ hàm `SUM`) hoạt động chính xác.
  - Sửa lỗi logic `isInternal` trong paste handler để khi thực hiện cắt ô (Ctrl+X) rồi dán (Ctrl+V) trong Sheet, ô nguồn được xóa chuẩn xác thành rỗng.
- **Slides Adapter (`adapters/libreoffice/slides/slides-adapter.js`)**:
  - Dán thông minh (Smart Paste):
    - Nếu con trỏ đang ở trong hộp chữ (`isContentEditable` / textbox): dán văn bản giữ định dạng in đậm, in nghiêng; không tạo thêm shape thừa.
    - Nếu con trỏ ở trên canvas trang chiếu: khi clipboard chứa bảng HTML hoặc dữ liệu dạng bảng TSV (từ Sheet hoặc Doc), hệ thống tự động tạo đối tượng Bảng trực quan (`Table Shape`) với đúng số hàng, số cột và dữ liệu ô.
    - *Lý do chọn tạo Table Shape trên canvas*: Người dùng trình chiếu khi sao chép bảng số liệu từ bảng tính sang slide thường mong muốn một bảng biểu đồ họa trực quan để thuyết trình; còn khi muốn dán văn bản đơn thuần, người dùng chỉ cần click vào hộp chữ rồi dán (sẽ tạo text tab-separated dễ đọc).
  - Hoàn tác một bước (1-step Undo): Dán Table Shape push đúng 1 action `{ type: "shape-add", ... }` vào `canvas.undoStack`. Nhấn Ctrl+Z đúng 1 lần sẽ xóa bảng vừa dán sạch sẽ và khôi phục trạng thái cũ.

---

## 3. Cổng kiểm thử (Test Gate)

### A. Kiểm thử đơn vị Suite 223 (`node tests/unit/cross-app-paste.test.js`)
```
  [PASS] CH-4 Tiêu chí 1: Sheet sang Doc — Bảng 3x3, giữ đậm tiêu đề, số 1,250 và ngày 31/12/2026
  [PASS] CH-4 Tiêu chí 2: Doc sang Sheet — Bảng 2x3 vào B2:D3, số nhận diện kiểu number, tính SUM
  [PASS] CH-4 Tiêu chí 3: Doc sang Slide — Giữ nguyên in đậm và in nghiêng trong hộp chữ
  [PASS] CH-4 Tiêu chí 4: Slide sang Doc — Copy từ hộp chữ sang Doc giữ đúng chữ và in đậm
  [PASS] CH-4 Tiêu chí 5: Sheet sang Slide — Bảng tính thành Table Shape trên canvas và TSV trong hộp chữ
  [PASS] CH-4 Tiêu chí 6: Dán chỉ chữ (Paste Plain) trên cả 3 app — Bỏ toàn bộ định dạng
  [PASS] CH-4 Tiêu chí 7: Hoàn tác đúng 1 bước (Ctrl+Z) sau khi dán
```
Kết quả: 7/7 PASS.

### B. Toàn bộ bộ test tổng thể (`node tests/run-tests.js`)
- Đã đăng ký Suite 223: `Unit Tests — Cross-App Paste (Doc, Sheet, Slide Interoperability)` tiếp nối Suite 222.
- Tổng số bài kiểm tra: 2497 bài kiểm tra (bao gồm toàn bộ các suite của main và các nhánh gộp).

### C. Hồi quy máy trạm (`node --experimental-websocket tests/live/cdp/run-desktop-regression.mjs`)
- `3T Sheet Ctrl+C/X/V`: **PASS** (`{"a1":"Clipboard","b1":"","c1":"Clipboard"}`).
- `3T Slide Ctrl+C/X/V`: **PASS** (`{"clipboardHasMarker":true,"caretReady":true,"afterCutLength":1,"afterPasteLength":64}`).
- `3T Doc Ctrl+C/X/V`: **PASS** (`{"copyKeptSelection":true,"cutLength":7,"pasteLength":40}`).
- Lỗi giờ `13:45` trong Sheet Type Detection là lỗi đã biết trên nhánh `main` từ trước, không phát sinh thêm FAIL mới.

---

## 4. Hướng dẫn sử dụng tiếng Việt trong ứng dụng

Nội dung trợ giúp chuẩn đã được tích hợp trong `platform/help/entries-retro-platform.js` với ID `common.platform.crossAppPasteHelp`:
- **Tiêu đề**: Dán giữa Doc, Sheet và Slide
- **Tóm tắt**: Sao chép và dán chéo nội dung linh hoạt giữa Doc, Sheet và Slide: tự động nhận diện bảng biểu, chuyển đổi số liệu, giữ định dạng phông chữ hoặc dán văn bản thuần.
- **Vị trí Ribbon**: Tab `Trang đầu` (home), nhóm `Bảng nhớ tạm`.
- **Nội dung các bước**:
  1. *Sao chép dữ liệu từ ứng dụng gốc*: Chọn đoạn văn bản trong Doc, vùng ô dữ liệu trong Sheet (ví dụ bảng tính A1:C3), hoặc hộp văn bản trong Slide, sau đó nhấn phím tắt Ctrl+C (hoặc nút Sao chép trên tab Trang đầu).
  2. *Dán từ Sheet sang Doc*: Chuyển sang Doc, đặt con trỏ tại vị trí muốn chèn rồi nhấn Ctrl+V. Dữ liệu bảng tính từ Sheet sẽ tự động chuyển hóa thành một bảng biểu hoàn chỉnh trong Doc, giữ nguyên kiểu chữ đậm ở hàng tiêu đề và các giá trị số, ngày tháng hiển thị chuẩn xác.
  3. *Dán từ Doc sang Sheet*: Chọn bảng biểu trong Doc, nhấn Ctrl+C, chuyển sang Sheet và chọn ô bắt đầu (ví dụ B2) rồi nhấn Ctrl+V. Dữ liệu tự động điền vào các ô tương ứng; các giá trị số tự động nhận diện thành kiểu số để tính toán công thức (như hàm SUM), chữ và định dạng đậm được giữ nguyên vẹn.
  4. *Dán giữa Doc và Slide*: Khi sao chép đoạn văn từ Doc sang hộp chữ trong Slide (hoặc từ Slide sang Doc), phím tắt Ctrl+V sẽ dán văn bản trực tiếp vào hộp chữ đang soạn thảo, giữ nguyên định dạng in đậm và in nghiêng. Nếu dán trực tiếp ngoài trang trình chiếu Slide, bảng tính từ Sheet sẽ tạo thành bảng đối tượng chuẩn trên slide, hoặc văn bản phân tách bằng tab dễ đọc.
  5. *Dán chỉ giữ văn bản thuần*: Nhấn Ctrl+Shift+V (hoặc chọn lệnh Dán văn bản thuần trong nhóm Bảng nhớ tạm) trên bất kỳ ứng dụng nào để dán chữ sạch không mang theo màu nền, kẻ viền hay kiểu chữ cũ.
  6. *Hoàn tác một bước*: Trong mọi thao tác dán chéo, bạn chỉ cần nhấn Ctrl+Z đúng 1 lần để hoàn tác toàn bộ dữ liệu vừa dán mà không để lại nội dung thừa.
- Tuân thủ quy định: sử dụng tên ngắn gọn (Doc, Sheet, Slide), không nhắc tên sản phẩm của hãng khác.
