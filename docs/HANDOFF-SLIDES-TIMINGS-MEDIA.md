# Handoff — VN Slides Rehearse Timings & Embed Media

## Bối cảnh

Task này ban đầu được giao cho Codex (worktree `E:\VNOffice-codex-slides-media`,
branch `feature/slides-timings-media`) nhưng Codex hit usage limit ("ERROR: You've
hit your usage limit... try again at 10:29 AM") ngay khi vừa nhận task, trước khi
viết bất kỳ dòng code nào (`git log`/`git status` xác nhận không có commit, không
có file uncommitted). Claude đã trực tiếp triển khai toàn bộ task này thay vì chờ.

## Kết quả — Rehearse Timings

- Command `slides.show.rehearseTimings` (icon `rehearseTimings` — đồng hồ thật,
  không dùng fallback) trên ribbon tab **Trình chiếu**.
- `SlidesCanvasController.startRehearseTimings()` gọi `startSlideShow(idx, {rehearsal:true})`
  — tái sử dụng nguyên vẹn overlay trình chiếu toàn màn hình thật đã có, thêm:
  - Đồng hồ HUD thật (`performance.now()`, cập nhật mỗi 250ms) hiển thị thời gian
    trang hiện tại + tổng thời gian.
  - Điều hướng trang (phím mũi tên/Space/click) ghi lại thời gian thật đã dừng ở
    từng trang vào mảng `rehearseTimings`.
  - Kết thúc (Esc/hết trang): `window.confirm()` hỏi lưu; nếu đồng ý, ghi
    `slide.rehearsedDuration` thật cho từng trang.
  - Slide Sorter (đã có từ trước) hiển thị nhãn "⏱ Ns" nếu slide có `rehearsedDuration`.
- **Giới hạn trung thực**: chỉ lưu mốc thời gian tham khảo, KHÔNG tự động auto-advance
  theo đúng nhịp đã lưu khi trình chiếu thật sau này (giống bước đầu PowerPoint
  trước khi bật "Use Timings").

## Kết quả — Embed Video/Audio

- Command `slides.media.insertVideo`/`insertAudio` (icon riêng biệt) trên ribbon
  tab **Chèn**, nhóm "Đa phương tiện".
- File picker thật (`<input type=file accept="video/*|audio/*">`), đọc file thật
  qua FileReader thành Data URL, chèn `<video controls>`/`<audio controls>` thật
  vào cả canvas soạn thảo VÀ chế độ trình chiếu toàn màn hình (phát được thật,
  trình duyệt xử lý native).
- **Mới bổ sung cho toàn bộ shape (không riêng media)**: nút xóa "×" thật trên đối
  tượng đang chọn (`deleteShape()`), và Undo/Redo thật cho insert/delete shape qua
  action `shape-add`/`shape-delete` trong stack Slides hiện có — trước đây
  `insertShape()`/`insertImage()` hoàn toàn KHÔNG ghi undo và KHÔNG có cách xóa,
  đây là gap thật đã tồn tại từ trước, nay tiện thể sửa luôn vì cùng code path.
- **Giới hạn trung thực**: cảnh báo console (không chặn) nếu tệp >10MB vì Data URL
  làm phình bộ nhớ/kích thước FODP; chưa hỗ trợ kéo-thả di chuyển/resize đối tượng
  trên canvas (giới hạn có sẵn từ trước cho shape/image, không phải hồi quy mới).

## 3 bug thật tìm thấy qua live-test bằng Playwright (không phải qua unit test mock)

Đúng theo tiêu chuẩn bắt buộc của dự án: sau khi 322/322 unit test PASS, đã tự mở
trình duyệt thật (`python -m http.server`, KHÔNG dùng `file://`) và thao tác chuột/
bàn phím thật. Việc này lộ ra **3 bug thật liên hoàn** hoàn toàn không thể phát hiện
qua unit test mock, vì mock DOM không mô phỏng đúng vòng đời nhiều app-instance:

1. **`h1/h2/h3` không nhận `focus()`** (đã sửa trước đó trong task TOC/Footnotes —
   không liên quan task này, ghi chú lại vì cùng lớp lỗi "trông như xong nhưng
   không hoạt động thật").
2. **`SlidesAdapter`/`SheetAdapter` chưa từng tự `bindHandler("common.edit.undo"/
   "common.edit.redo", ...)`** — chỉ `WriterAdapter.attach()` làm việc này. Vì
   `common.edit.undo`/`redo` dùng CHUNG 1 handler slot trong `CommandBus._handlers`
   cho toàn Suite, và Writer luôn là app khởi tạo đầu tiên, Ctrl+Z/Ctrl+Y **VĨNH VIỄN
   gọi nhầm `WriterAdapter.undo()`** dù người dùng đang ở Sheet hoặc Slides — hoàn
   toàn không hoạt động cho tính năng Undo/Redo vốn đã "xong" từ trước ở cả 2 app.
   **Đã sửa**: thêm `bindHandler()` tường minh trong `attach()` của cả
   `SlidesAdapter` và `SheetAdapter`, đúng pattern Writer đã dùng.
3. **`ShortcutManager.attach()` không idempotent** — mỗi app (`WriterApp`/`SheetApp`/
   `SlidesApp`) tự `new AppShell()` khi `init()`, và mỗi `AppShell` constructor gọi
   `globalShortcutManager.attach(window)` lại từ đầu, CỘNG DỒN thêm 1 cặp listener
   `keydown`/`keyup` trên `window` mỗi lần người dùng chuyển app. Hậu quả: **sau khi
   chuyển app dù chỉ 1 lần, MỌI phím tắt trong toàn bộ Suite (Ctrl+Z, Ctrl+S, Ctrl+B,
   F5...) bị thực thi lặp lại nhiều lần** cho mỗi lần bấm phím — ví dụ Ctrl+Z sau khi
   chuyển app 1 lần sẽ hoàn tác LUÔN 2 bước liên tiếp thay vì 1 bước. Đây là lỗi
   nghiêm trọng nhất, ảnh hưởng toàn bộ Suite chứ không riêng Slides.
   **Đã sửa**: thêm guard `this._attachedWindow` trong `ShortcutManager.attach()`
   để chỉ gắn listener đúng 1 lần duy nhất.

Cũng bổ sung `_syncUndoRedoState()` cho `SlidesCanvasController` (đồng bộ
`common.edit.undo`/`redo` enabled state với `undoStack`/`redoStack` thật) —
Slides trước đây hoàn toàn không quản lý state này (khác Writer/Sheet đã có).

## Kiểm thử

- `node tests/run-tests.js`: **322/322 PASS** (suite 29 mới: 8 test hành vi cho
  Rehearse Timings + Embed Media, không tautological).
- Live-test trình duyệt thật qua Playwright (`python -m http.server`, thao tác
  chuột/bàn phím thật, KHÔNG chỉ tin unit test):
  - Chèn video thật qua file picker → `<video>` thật xuất hiện trên canvas. PASS.
  - Xóa qua nút "×" thật → video biến mất. PASS.
  - Ctrl+Z thật → video khôi phục đúng (sau khi sửa 3 bug trên). PASS.
  - Bật Rehearse Timings qua ribbon thật → đồng hồ HUD thật đếm tăng dần quan sát
    được (`00:01` sau 800ms chờ thật). PASS.
  - Điều hướng phím mũi tên thật, Esc thật → dialog `window.confirm()` thật hiện
    đúng nội dung tổng thời gian, đồng ý lưu, overlay đóng đúng. PASS.

## Phạm vi đã sửa (ngoài phạm vi ban đầu, do cần thiết để fix bug thật)

- `adapters/libreoffice/slides/slides-adapter.js`
- `adapters/libreoffice/sheet/sheet-adapter.js` (chỉ thêm 2 dòng bindHandler common.edit.undo/redo)
- `platform/commands/shortcut-manager.js`
- `platform/commands/command-bus.js` (không đổi logic, chỉ dọn debug trace tạm thời trong lúc điều tra)

## Chưa merge vào main — chờ Claude review lần cuối trước khi merge (tự thực hiện).
