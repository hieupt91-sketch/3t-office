# Agent Handoff

TASK: Writer FODT Migration Phase 0 / Phase A — thiết kế dài hạn và nền tảng văn bản cơ bản  
AGENT/ROLE: Codex / Writer + LibreOffice Integration  
BRANCH: `feature/writer-fodt-migration-phase0`  
WORKTREE: `E:\VNOffice-codex-writer-fodt-migration`  
OBJECTIVE: Thêm đường `bodyDom HTML subset <-> FODT` song song, có round-trip deterministic và conversion DOCX/PDF thật; không thay pipeline HTML hiện hành.  

## FINDINGS

- Writer hiện vẫn đi `_contentForExport()` -> HTML -> LibreOffice HTML import filter. Audit trước đã chứng minh filter này không sinh đầy đủ nhiều cấu trúc native.
- Sheet/Slides là mẫu kiến trúc đúng trong repo: serializer Flat ODF gom automatic style, cấp style name deterministic, dựng `office:body` theo app; parser đọc ngược model; live test đo package Office thật sau soffice.
- ODF 1.3 single-file text document dùng `office:document`, MIME `application/vnd.oasis.opendocument.text`, `office:body/office:text`; paragraph/heading/list/span có cấu trúc native. `text:note` cũng là đường native đã xác nhận cho Phase D. Tham chiếu: [OASIS OpenDocument 1.3 Part 3](https://docs.oasis-open.org/office/OpenDocument/v1.3/os/part3-schema/OpenDocument-v1.3-os-part3-schema.html) và [Relax NG schema chính thức](https://docs.oasis-open.org/office/OpenDocument/v1.3/os/schemas/OpenDocument-v1.3-schema-rng.html).
- Repo không có/không cần DOM parsing dependency. Phase A dùng parser giới hạn, thống nhất Node/browser, và fail-closed thay vì đoán rồi làm mất dữ liệu.
- Cơ chế Help F1/tab Trợ giúp đã tồn tại. Phase A chưa nối UI hoặc thay hành vi Save/Open nên không thêm bài hướng dẫn giả về một luồng người dùng chưa truy cập được; plan yêu cầu cập nhật bài hướng dẫn cụ thể khi pilot/cutover được nối vào UI.

## IMPLEMENTATION SUMMARY

- Thêm `serializeToFodt()` trên `WriterAdapter`:
  - `p`, `h1`…`h6` -> `text:p`/`text:h`.
  - bold/italic/underline/color/highlight/font family/font size -> automatic `style:style` family text + `text:span`.
  - left/center/right/justify -> automatic paragraph style.
  - `ul`/`ol`/nested list cơ bản -> `text:list` với bullet/number style.
  - khoảng trắng lặp, tab, line break -> `text:s`, `text:tab`, `text:line-break`.
- Thêm `parseFodt()` đọc đúng tập con trên, trả canonical Writer HTML và nạp `bodyDom` chỉ sau khi parse thành công.
- Style registry và chuẩn hóa CSS giúp `serialize -> parse -> serialize` giống hệt byte string trong tập con Phase A.
- Nội dung ngoài scope throw lỗi có code `WRITER_FODT_UNSUPPORTED_CONTENT`: `data-vno-*`, table, image, note, link/bookmark, drawing và element/attribute/CSS chưa biết. Không silently drop.
- `save()`, `saveAs()`, `open()`, `exportPdf()`, `_contentForExport()` và UNO bridge không đổi; FODT chưa phải default.
- Plan migration Phase A–E, rollback và cutover gate nằm tại `docs/PLAN-WRITER-FODT-MIGRATION.md`.

Commits:

- `07179ad docs(writer): plan phased FODT migration`
- `196681f feat(writer): add Phase A FODT serialize and parse`
- `a3a16ed test(writer): verify FODT with real LibreOffice`

## FILES CHANGED

- `adapters/libreoffice/writer/writer-adapter.js`
- `tests/unit/writer-fodt-phase-a.test.js`
- `tests/live/writer-fodt-phase-a-real-conversion.mjs`
- `tests/run-tests.js`
- `docs/PLAN-WRITER-FODT-MIGRATION.md`
- `docs/HANDOFF-WRITER-FODT-MIGRATION-PHASE0.md`

Không sửa Sheet/Slides source, app UI, platform, build system, LibreOffice Core hoặc upstream.

## COMMANDS RUN

- `node --check adapters/libreoffice/writer/writer-adapter.js`
- Direct runner `runWriterFodtPhaseATests()`
- `node tests/live/writer-fodt-phase-a-real-conversion.mjs`
- `node tests/run-tests.js`
- `git diff --check`

## BUILD RESULT

Không có build riêng. Syntax check trong full suite: **PASS**; `node --check` hẹp: **PASS**.

## TEST RESULTS

- Unit Phase A: **PASS 4/4**.
- Live real conversion: **PASS**.
  - Ghi output serializer thành file `.fodt` thật.
  - `convertWithSoffice()` chuyển FODT -> DOCX và FODT -> PDF thật.
  - DOCX package xác nhận đủ text; `w:jc`, `w:b`, `w:i`, `w:u`, `w:color`, `w:shd`, `w:rFonts`, `w:sz`, heading style và native numbering.
  - PDF xác nhận header `%PDF-`, page object, rendered text operators và RGB operators đúng cho foreground `#123456`/highlight `#ffeeaa`.
  - Exact VN round-trip FODT -> HTML -> FODT: **PASS**.
- Full `node tests/run-tests.js`: **PASS 1111/1111, 0 FAIL**. Baseline được giao là 1107; 4 assertion mới nâng tổng lên 1111.
- Pipeline HTML hiện hành: full regression **PASS**; các method Save/Export không bị sửa.

## KNOWN FAILURES

Không có failure trong scope test đã chạy. Các capability sau **chưa hỗ trợ Phase A**, cố ý báo lỗi thay vì làm mất dữ liệu: table, image, Text Box, shape, hyperlink/bookmark, header/footer, section/page setup, footnote/endnote, TOC, citation/comment, WordArt/chart/diagram, watermark/page border và Track Changes.

## RISKS

- Parser là supported-subset parser, chưa phải general-purpose ODF importer. FODT do LibreOffice/nguồn ngoài tạo có named/default style, list style khác hoặc block nâng cao sẽ bị từ chối cho đến Phase tương ứng.
- Inline CSS shorthand, relative font size và attribute HTML legacy ngoài danh sách Phase A bị từ chối.
- Exact idempotence hiện được bảo đảm cho FODT do VN serializer Phase A sinh ra; không claim byte-idempotence sau khi LibreOffice canonicalize XML.
- Live PDF assertion đo cấu trúc render/text/color operators, không phải pixel golden. Nếu về sau đổi font/render engine, nên bổ sung raster golden có tolerance.

## DEPENDENCIES/BLOCKERS

- Live acceptance cần LibreOffice `soffice.exe`; helper hiện có tự tìm executable hoặc đọc `VNOFFICE_SOFFICE_PATH`.
- Phase B cần thiết kế binary image embedding và table model mapping trước khi nới supported subset.
- Cutover cần parity matrix gần đầy đủ và phê duyệt riêng của người phụ trách. Phase A không đủ điều kiện cutover.

## CORE PATCH ID (if any)

Không có. Không sửa Core/upstream.

## NEXT ACTION

1. Người phụ trách review kỹ plan, API contract và chính sách fail-closed; **không merge branch này tự động**.
2. Nếu được duyệt, mở task Phase B riêng cho `table:table` trước, với fixture table merge/border/shading và real DOCX/PDF round-trip.
3. Sau table mới thiết kế image embedding/draw frame; không gộp table+image nếu review surface quá lớn.
4. Duy trì HTML pipeline làm default qua các Phase; chỉ lập cutover task sau parity audit và UX warning/fallback được duyệt.

