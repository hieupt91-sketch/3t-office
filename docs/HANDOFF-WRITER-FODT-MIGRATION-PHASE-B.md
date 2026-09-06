# Agent Handoff

TASK: Writer FODT Migration — Phase B (bảng cơ bản + ảnh PNG nhúng)
AGENT/ROLE: Claude (orchestrator) — Codex hết quota (khóa đến 11/9) và Grok hết số dư trả phí ngay khi vừa bắt đầu Phase B; cả hai chưa viết dòng code nào (xác nhận: worktree HEAD trùng main, 0 commit). Người phụ trách yêu cầu Claude tiếp tục trực tiếp trong lúc chờ.
BRANCH: `feature/writer-fodt-migration-phase-b`
WORKTREE: `E:\VNOffice-claude-fodt-phase-b`
BASE: `main` @ `5867e5b` (Sheet native-export Phase 2a merged, 1130/1130 PASS)
**KHÔNG merge tự động vào main** — đây là sáng kiến kiến trúc lớn, cùng gate như Phase A: người phụ trách đọc lại trước khi merge.

## Bối cảnh

Phase A (đã merge) làm nền văn bản cơ bản (đoạn văn/tiêu đề/danh sách/định dạng ký tự) cho `serializeToFodt()`/`parseFodt()`. Phase B theo kế hoạch (`docs/PLAN-WRITER-FODT-MIGRATION.md`): bảng và ảnh cơ bản.

Nguyên tắc người phụ trách nhắc lại mạnh mẽ trước khi giao Phase B: "đừng vẽ cho có tính năng không dùng được... tài liệu chuyển sang Microsoft Office vẫn phải hiển thị đúng định dạng khi xuất file". Áp dụng nghiêm ngặt trong toàn bộ task này — xem mục Verification bên dưới.

## Nghiên cứu trước khi thiết kế (bắt buộc đọc trước khi viết code)

Trước khi viết bất kỳ ánh xạ nào, đã đọc trực tiếp 2 pattern **đã được xác nhận thật** trong chính codebase này (không đoán):

1. **`slides-adapter.js` `_binaryDataXml`/pattern `draw:frame`+`draw:image`+`office:binary-data`**: xác nhận `xlink:href=""` (rỗng) kèm `office:binary-data` chứa base64 là cách nhúng ảnh chuẩn ODF Flat XML, đã được đo thật qua soffice PPTX round-trip trong Slides. Tái sử dụng NGUYÊN VẸN cấu trúc XML này cho Writer (chỉ đổi `text:anchor-type="as-char"` phù hợp ngữ cảnh văn bản thay vì toạ độ tuyệt đối của Slides).
2. **`slides-adapter.js` `table:table`/`table:table-column table:number-columns-repeated`**: xác nhận đây là cú pháp ODF thật đã verify, tái sử dụng cho bảng Writer (dù Slides đặt bảng trong `draw:frame`, còn Writer đặt `table:table` trực tiếp làm flow content trong `office:text` — khác ngữ cảnh nhưng cú pháp bảng bên trong giống nhau).
3. **`writer-adapter.js` `insertTable()`/`_insertImageDialog()`**: đọc để biết CHÍNH XÁC hình dạng HTML thật Writer sinh ra (`<table style="..."><tbody><tr><td style="border:1px solid #94a3b8; padding:...">`, `<img src="data:...;base64,..." data-vno-wrap="inline" tabindex="0" style="max-width:100%; height:auto; ...">`) — không đoán markup, khớp đúng cái Phase B cần chấp nhận.

## Implementation summary

- `serializeToFodt()`/`parseFodt()` mở rộng thêm: `imageXml`/`imageHtml`, `tableXml`/`tableHtml`/`tableCellXml`, các helper `_fodtCellCssMap`, `_fodtNormalizeBorder`, `_fodtBase64ToBytes`, `_fodtPngDimensionsPx` (đọc IHDR thật, không đoán kích thước), `_fodtPxToCm`/`_fodtCmToPx`, `_fodtDataUrlParts`.
- Bảng: lưới đơn giản (số ô mỗi hàng phải bằng nhau — colspan/rowspan bị từ chối rõ ràng), viền/nền ô qua automatic `table-cell` style, căn lề ô tái dùng paragraph style registry sẵn có.
- Ảnh: chỉ PNG (kích thước đọc thật từ IHDR — vì `<img>` Writer luôn `max-width:100%;height:auto`, không có kích thước CSS đáng tin để dùng), nhúng `as-char` (ảnh trôi theo dòng văn bản).
- Guard `data-vno-*` gốc của Phase A được nới CHÍNH XÁC 1 trường hợp: `data-vno-wrap="inline"` trên `<img>` (giá trị khác vẫn bị từ chối).
- Chính sách fail-closed của Phase A giữ nguyên: mọi thứ ngoài phạm vi (colspan/rowspan, ảnh không phải PNG, nội dung khối trong ô bảng, cấu trúc FODT nhập vào lạ) throw `WRITER_FODT_UNSUPPORTED_CONTENT` rõ ràng — không mất dữ liệu âm thầm.

## FILES CHANGED

- `adapters/libreoffice/writer/writer-adapter.js` — mở rộng `serializeToFodt()`/`parseFodt()` (chỉ thêm, Phase A giữ nguyên hành vi).
- `tests/unit/writer-fodt-phase-a.test.js` — 2 test cũ cập nhật lại (bảng/ảnh PNG giờ hợp lệ nên không còn là ví dụ "ngoài phạm vi"; thay bằng colspan và ảnh JPEG để giữ đúng ý định gốc của test).
- `tests/unit/writer-fodt-phase-b.test.js` — **mới**, 8 test.
- `tests/live/writer-fodt-phase-b-real-conversion.mjs` — **mới**, real soffice.
- `tests/run-tests.js` — đăng ký suite 110.
- `docs/PLAN-WRITER-FODT-MIGRATION.md` — đánh dấu Phase B hoàn thành phần bảng/ảnh cơ bản, thêm Phase B.1 đề xuất cho phần còn lại (colspan/rowspan thật, JPEG/GIF/WEBP, Text Box/shape).
- `docs/HANDOFF-WRITER-FODT-MIGRATION-PHASE-B.md` — file này.

Không đụng Sheet/Slides source, Core, build system, `save()`/`exportPdf()`/`_contentForExport()` (Phase B vẫn hoàn toàn additive).

## COMMANDS RUN

```
node tests/run-tests.js
node tests/live/writer-fodt-phase-b-real-conversion.mjs
```

Cộng thêm (thủ công, không phải test tự động): tạo 1 DOCX thật bằng script tạm (đã xoá sau khi xong), mở bằng Microsoft Word thật qua `Start-Process` thụ động, chụp màn hình xác nhận bằng mắt — script tạm và file DOCX/ảnh chụp không nằm trong repo (chỉ dùng để verify thủ công, không phải test tự động lặp lại được).

## TEST RESULTS

- `node tests/run-tests.js`: **1138/1138 PASS** (1130 trước Phase B; +8 test Phase B, +2 test Phase A cập nhật lại đúng ý định gốc).
- `node tests/live/writer-fodt-phase-b-real-conversion.mjs`: **PASS** — xác nhận bằng byte trong DOCX thật:
  - Bảng: `<w:tbl>` native, ≥4 `<w:tc>` cell thật, nội dung đúng từng ô, tô nền `#FEF3C7` giữ nguyên là `w:shd` thật, căn phải giữ nguyên là `w:jc val="right"` thật.
  - Ảnh: bytes trong `word/media/imageN.png` **khớp byte-for-byte** với PNG gốc tôi tự sinh bằng zlib (không bị LibreOffice mã hóa lại/hỏng), và là `<w:drawing>` native (không bị làm phẳng thành văn bản).
  - Round-trip `serialize → parse → serialize` cho cả bảng lẫn ảnh: **idempotent chính xác**.
- **Mở bằng Microsoft Word thật, xác nhận bằng mắt qua ảnh chụp màn hình**: bảng hiện đúng viền, tô nền vàng nhạt cho hàng tiêu đề, cột số căn phải đúng; ảnh gradient (đỏ→xanh) hiện đúng ngay dưới đoạn "Ảnh minh họa:". Không có nội dung bị mất/lệch/hỏng.

## KNOWN FAILURES / LIMITATIONS (ghi rõ, không che giấu)

1. **Colspan/rowspan chưa hỗ trợ** — từ chối rõ ràng (`WRITER_FODT_UNSUPPORTED_CONTENT`), không mất dữ liệu âm thầm. Cần occupancy-grid thật để sinh đúng `table:number-columns-spanned`/`table:number-rows-spanned` + `table:covered-table-cell` theo chuẩn ODF — việc thật, để Phase B.1.
2. **Chỉ hỗ trợ ảnh PNG.** JPEG/GIF/WEBP bị từ chối rõ ràng thay vì đoán kích thước sai (điều đó sẽ làm ảnh hiển thị sai kích thước thật trong Word/PDF — vi phạm đúng nguyên tắc "phải hiển thị đúng"). Cần bộ đọc kích thước riêng từng định dạng ở Phase B.1.
3. **Nội dung khối (bảng lồng, danh sách trong ô) trong ô bảng chưa hỗ trợ** — thực tế Writer hiện tại (`insertTable()`) cũng không tạo ra cấu trúc này, nên đây không phải giới hạn thực tế cấp bách.
4. Chưa có Text Box/shape (đúng theo kế hoạch Phase B, để Phase B.1/C).

## RISKS

Thấp — hoàn toàn additive, không sửa pipeline HTML/Save/Export hiện có. Rủi ro chính là mở rộng tương lai (colspan/rowspan, format ảnh khác) cần thêm việc thật, không phải rủi ro của phần đã làm.

## DEPENDENCIES/BLOCKERS

Không. Không thư viện trả phí/ngoài — PNG được tạo và đọc bằng tay (chunk IHDR/IDAT/IEND, CRC32 tự viết theo đúng thuật toán chuẩn) trong cả code sản xuất lẫn test, không dùng thư viện ảnh nào.

## CORE PATCH ID: N/A

## NEXT ACTION

1. Người phụ trách đọc lại branch `feature/writer-fodt-migration-phase-b` trước khi merge — **không tự merge**.
2. Phase B.1 (đề xuất, chưa làm): colspan/rowspan thật, ảnh JPEG/GIF/WEBP, Text Box/shape cơ bản.
3. Khi Codex/Grok có quota trở lại, có thể tiếp tục Phase B.1 hoặc Phase C (page/header-footer/section geometry — hướng sửa tận gốc vấn đề mixed A4/envelope đã biết).
