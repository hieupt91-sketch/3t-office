# Agent Handoff

TASK: Writer FODT Migration — Phase B.1 (colspan/rowspan thật qua occupancy grid ODF)
AGENT/ROLE: Claude (orchestrator), tiếp tục trực tiếp cùng lúc Grok làm Slides Sections p14 và agy làm UI polish trên các worktree khác.
BRANCH: `feature/writer-fodt-migration-phase-b1`
WORKTREE: `E:\VNOffice-claude-fodt-phase-b1`
BASE: `main` @ `462ab51` (Phase B đã merge, 1148/1148 PASS)
**KHÔNG merge tự động vào main** — cùng gate như Phase A/B, người phụ trách đọc lại trước.

## Bối cảnh

Phase B (vừa merge) ghi rõ colspan/rowspan là "chưa hỗ trợ" vì cần occupancy grid thật theo chuẩn ODF. Đây là task đó.

## Implementation summary

- `tableXml()` trong `serializeToFodt()`: xây lưới `[hàng][cột]` đầy đủ (kích thước lấy từ tổng colspan của hàng đầu tiên), duyệt từng ô HTML thật, gán ô gốc + đánh dấu mọi vị trí bị "covered" bởi colspan (cùng hàng) và rowspan (hàng sau) — dùng đúng thuật toán occupancy chuẩn, không đoán/không giả định.
- `tableCellXml()` nhận thêm `spanAttrs` để chèn `table:number-columns-spanned`/`table:number-rows-spanned` vào ô gốc.
- `tableHtml()` (parse ngược): lọc bỏ `table:covered-table-cell` (HTML không cần placeholder), đọc `table:number-columns/rows-spanned` thành `colspan`/`rowspan` HTML.
- Từ chối rõ ràng: span không phải số nguyên dương, vượt biên bảng, chồng lấn, hàng thiếu/thừa ô so với lưới.

## Verification (đo thật, không chỉ tin bản thân)

- Unit mới trong `tests/unit/writer-fodt-phase-b.test.js`: colspan riêng, rowspan riêng, lưới 3×3 phối hợp cả hai (đếm tay số `table:covered-table-cell` đúng từng hàng), idempotence, 3 ca từ chối hợp lệ.
- 2 test Phase A/B cũ dùng colspan làm ví dụ "ngoài phạm vi" nay đã SAI (colspan hợp lệ rồi) — sửa lại đúng ý định gốc bằng ví dụ khác (bảng lồng bảng).
- Real soffice (`tests/live/writer-fodt-phase-b-real-conversion.mjs`, mở rộng thêm bảng colspan/rowspan): xác nhận bằng byte DOCX thật `<w:gridSpan w:val="2">` và `<w:vMerge w:val="restart"/"continue">`. **Tự sửa 1 giả định sai của chính mình khi viết test**: ban đầu đoán `w:vMerge` continue không có `w:val`, đo thật thì LibreOffice ghi tường minh `w:val="continue"` — sửa lại assertion theo đúng cái đo được, không giữ giả định.
- **Mở DOCX thật bằng Microsoft Word thật**, chụp màn hình xác nhận bằng mắt: bảng có hàng tiêu đề gộp 3 cột (nền xanh, căn giữa) và cột gộp dọc 2 hàng đúng hình dạng thật.
- `node tests/run-tests.js`: **1151/1151 PASS**.

## FILES CHANGED

- `adapters/libreoffice/writer/writer-adapter.js`
- `tests/unit/writer-fodt-phase-a.test.js` (2 test cập nhật)
- `tests/unit/writer-fodt-phase-b.test.js` (5 test mới/thay thế)
- `tests/live/writer-fodt-phase-b-real-conversion.mjs` (mở rộng)
- `docs/PLAN-WRITER-FODT-MIGRATION.md`
- `docs/HANDOFF-WRITER-FODT-MIGRATION-PHASE-B1.md` — file này

Không đụng Sheet/Slides, Core, build system, save()/exportPdf().

## KNOWN LIMITATIONS

Nội dung khối lồng trong ô bảng (bảng lồng bảng, danh sách lồng) vẫn chưa hỗ trợ — không phải giới hạn cấp bách vì `insertTable()` hiện tại của Writer cũng không tạo ra cấu trúc này.

## NEXT ACTION

Người phụ trách đọc lại trước khi merge. Phase B.2 (Text Box/shape/JPEG) là bước tiếp theo hợp lý.
