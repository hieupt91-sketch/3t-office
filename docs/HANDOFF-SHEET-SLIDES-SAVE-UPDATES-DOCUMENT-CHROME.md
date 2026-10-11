# HANDOFF: Sheet/Slides — cập nhật nhãn tab tài liệu sau khi Lưu thành công

## Bối cảnh

agy vừa sửa lỗi thật cho Writer: nhãn tên tệp trên tab đầu cửa sổ
không cập nhật sau khi Lưu thành công (chỉ được cập nhật ở Mở/Mới)
(`docs/HANDOFF-WRITER-SAVE-FLOW-UI-QA.md`). Kiểm tra chéo phát hiện
**Sheet và Slides có CÙNG LỖI** — `SheetAdapter.save()` và
`SlidesAdapter.save()` chưa từng gọi `resetDocumentChrome()` sau khi
lưu thành công, dù đã có sẵn cơ chế này (dùng cho Mở/Mới).

## Giải pháp

Áp dụng CHÍNH XÁC pattern đã dùng cho Writer (dòng ~7164
`writer-adapter.js`) sang `SheetAdapter.save()` và
`SlidesAdapter.save()`:
1. Tính `suggestedName` hợp lý (ưu tiên `sourceFileName` hiện có nếu
   khác placeholder demo, không thì lấy từ `shell.documentName`).
   **Lưu ý placeholder khác nhau theo app**: Writer dùng `"TaiLieu"`,
   Sheet dùng `"BangTinh"`, Slides dùng `"TrinhChieu"` — đã xác nhận
   đúng giá trị từng app trước khi viết điều kiện so sánh (không copy
   nhầm `"TaiLieu"` sang Sheet/Slides).
2. Sau khi `result.status === "ok"`, trích tên tệp thật từ
   `result.path`/`result.fileName`, cập nhật `this.sourceFileName` và
   gọi `this.shell?.resetDocumentChrome?.(savedFileName, null)` (tham
   số `null` giữ nguyên tab ribbon đang chọn, không ép về Home).

## Kiểm thử

- Viết `tests/live/sheet-slides-save-updates-document-tab.playwright.mjs`
  — gọi thẳng `globalUnoBridge.activeDocument.save()` (KHÔNG `await`
  trong `page.evaluate()`, vì `save()` nội bộ chờ người dùng đóng hộp
  thoại "Đã lưu" — await trực tiếp sẽ deadlock do không ai đóng được
  hộp thoại đang chờ), xử lý hộp thoại từ bên ngoài, xác nhận nhãn tab
  đổi đúng tên tệp vừa lưu cho cả Sheet và Slides — 6/6 PASS.
- `node scripts/check-syntax.js`: 89/89 PASS.
- `node tests/run-tests.js`: 1511/1511 PASS.
- `node tests/live/ribbon-audit-1280.playwright.mjs`: 100% PASS.
- `node tests/live/file-new-does-not-pollute-recent-files.playwright.mjs`:
  vẫn PASS (xác nhận `resetDocumentChrome()` dùng chung không bị ảnh
  hưởng, guard `recordRecent` vẫn hoạt động đúng cho cả 3 app vì các
  vị trí gọi tài liệu MỚI TRẮNG của Sheet/Slides đã có sẵn tham số
  `false` từ lần sửa trước).
