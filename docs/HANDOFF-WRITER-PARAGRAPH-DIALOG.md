# Handoff — Hộp thoại Đoạn văn (3T Doc)

- **Nhánh:** `feat/writer-paragraph-dialog-claude` (Claude làm thay Codex hết hạn mức).
- **Mục tiêu:** bật mục "Đoạn văn…" đang mờ ở menu chuột phải bằng hộp thoại thật, giống Word: căn lề, thụt lề, đặc biệt (dòng đầu/treo), cách đoạn trước/sau, giãn dòng, có khung xem trước.
- **Truy cập:** chuột phải trong đoạn ▸ Đoạn văn…; nút mũi tên nhỏ ở góc nhóm Đoạn văn (tab Trang đầu và tab Bố cục). Lệnh `writer.format.paragraphDialog`.

## Thiết kế (tái dùng, không viết lại)
- `apps/writer/paragraph-dialog.js`: giao diện + hàm thuần `normalizeParagraphDialogValues` (cm → mm, kẹp giới hạn, kiểm tra thụt treo ≤ thụt trái và tổng thụt ≤ bề rộng trang, lỗi tiếng Việt).
- `adapters/libreoffice/writer/writer-adapter.js`: `getParagraphDialogState`, `applyParagraphDialogValues`, `openParagraphDialog`. Áp dụng qua `_applyParagraphVisualStyle` có sẵn nên **một lần Áp dụng = một bước Hoàn tác**; khối đoạn lấy bằng `_getRulerParagraphBlocks` (cùng bộ chọn với thước kẻ).
- Ribbon: `launcherCommandId` trên hai nhóm Đoạn văn (cơ chế `ribbon-host.js` có sẵn). Hướng dẫn: `platform/help/entries-gaps-0410.js` (`writer.format.paragraphDialog`). Chuỗi vi/en: `platform/i18n`.

## Kiểm chứng (đã chạy)
- `node tests/run-tests.js`: 2762/2762 PASS (thêm suite 244; cập nhật số lệnh Writer 162 → 163 trong `help-coverage.test.js`).
- `tests/live/cdp/writer-paragraph-dialog.desktop.mjs` (app desktop thật, CDP): 11/11 PASS — mở hộp thoại, lỗi thụt treo, áp dụng đủ 7 thuộc tính, mở lại đúng giá trị, Esc, Ctrl+Z một lần, nút góc nhóm.

## Chưa làm / ghi chú
- Chưa có tab "Ngắt dòng và ngắt trang", mức đề mục, tab stop (xem `docs/RIBBON-BACKLOG.md`).
- Giãn dòng "Ít nhất" của Word chưa có (CSS không có tương đương trực tiếp).
- Rollback: gỡ `launcherCommandId` và đặt lại mục menu `disabled: true` trong `writer-app.js`.
