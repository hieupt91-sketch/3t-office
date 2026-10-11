# HANDOFF — Writer Interactive Ruler

## Mục tiêu

Biến thước của Doc từ HTML tĩnh thành điều khiển tương tác theo lề trang và đoạn đang chọn, tái dùng Command Bus, `setPageSetup`, `_applyParagraphVisualStyle` và snapshot/undo hiện có.

## Plan gate

- Current capability: trước thay đổi chỉ có thước tĩnh và đồng bộ vị trí thước dọc.
- Modules: Writer UI/controller, Writer Adapter API, Command Bus definitions/focus policy, Help, unit/CDP tests.
- Dependency: không thêm dependency; không sửa LibreOffice Core/build/file-format semantics.
- Risk: quy đổi tọa độ theo zoom; mất selection khi kéo; lề/thụt lề vượt giới hạn; round-trip DOCX.
- Test plan: unit toán học/DOM source; desktop CDP kéo thật, undo, save/XML/reopen; full regression gate.
- Rollback: revert commit Pha 1; dữ liệu lưu là CSS chuẩn đã được pipeline LibreOffice hiện hữu chuyển đổi.

## Trạng thái các pha

- PHA 1 — ĐÃ LÀM: vạch/số cm từ lề trái; vùng lề xám/vùng chữ trắng; tooltip thật; kéo lề trái/phải; kéo thụt dòng đầu/treo/trái/phải; đường dóng; giới hạn tối thiểu 10 mm; Alt 0,1 mm; bàn phím 1/5 mm; role slider/ARIA tiếng Việt; Ctrl+Z một snapshot; nhiều đoạn bôi chọn; Help tiếng Việt; lưu/mở DOCX.
- PHA 2 — CHƯA LÀM: thước dọc vẫn chỉ hiển thị/đồng bộ cuộn và zoom, chưa kéo lề trên/dưới và chưa có số cm.
- PHA 3 — CHƯA LÀM: chưa thêm/di chuyển/xóa tab stop và chưa xuất `w:tabs`.

## Luồng kiến trúc

`WriterRulerController → Command Bus → WriterAdapter → setPageSetup/_applyParagraphVisualStyle → LibreOffice conversion`

UI không gọi implementation LibreOffice. Mỗi thao tác thả chuột chỉ gọi một command và ghi một snapshot.

## File chính

- `apps/writer/writer-ruler-controller.js`: quy đổi mm/px, render, selection sync, drag, keyboard và guide.
- `apps/writer/writer-app.js`, `apps/writer/writer.css`: DOM/accessibility và giao diện thước.
- `adapters/libreoffice/writer/writer-adapter.js`: API trạng thái/áp dụng thụt lề và lề trang.
- `platform/help/entries-writer.js`: bài “Dùng thước để đặt lề và thụt lề”.
- `tests/unit/writer-interactive-ruler.test.js`: suite 234.
- `tests/live/cdp/ruler.desktop.mjs`: bài desktop kéo thật và round-trip DOCX.

## Kết quả kiểm thử thật

- PASS — syntax check ba source JS thay đổi chính.
- PASS 5/5 — unit hẹp `runWriterInteractiveRulerTests`.
- PASS 11/11 — `node --experimental-websocket tests/live/cdp/ruler.desktop.mjs`; log: `E:\VNOffice-profiles\codex-ruler\ruler-desktop.log`.
- PASS — XML có `w:ind` left/right/firstLine/hanging và `w:pgMar`; mở lại phản ánh đúng trên thước.
- NOT RUN — `node tests/run-tests.js` full gate.
- NOT RUN — `run-desktop-regression.mjs` 27 case; cross-app-paste 7/7; ctx-menu 14/14; keep-focus 60/60; Python Writer suites.

## Việc tiếp theo

1. Chạy full gate đúng một lần trước khi đổi trạng thái Pha 1 từ WIP sang hoàn tất phát hành.
2. Nếu gate sạch, làm Pha 2 trong commit riêng; sau đó mới cân nhắc Pha 3.
3. Template `/09-templates/AGENT-HANDOFF.md` không tồn tại trong worktree tại thời điểm bàn giao; tài liệu này dùng đủ các mục objective/capability/files/dependency/risk/test/rollback/status.
