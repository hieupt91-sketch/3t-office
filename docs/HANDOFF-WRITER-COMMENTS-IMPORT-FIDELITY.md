# Agent Handoff

TASK: Writer Comments import fidelity (mở DOCX thật có ghi chú Word)
AGENT/ROLE: Grok / implementation & verification
BRANCH: `fix/writer-comments-import-fidelity`
WORKTREE: `E:\VNOffice-grok-writer-comments-import`
OBJECTIVE: Xác nhận khi mở file DOCX thật có Comments (không do VN Office serialize) thì VN Writer có đọc được neo, nội dung ghi chú, tên người comment hay không; nếu mất thông tin, sửa trong phạm vi hợp lý hoặc ghi rõ giới hạn thật.

## FINDINGS (trước khi sửa — đo bằng đường import thật)

Đường mở Writer hiện tại:

```
common.file.open
  → WriterAdapter.open()
    → globalUnoBridge.openRealFile("writer")
      → main.py open_document_dialog()
        → soffice --convert-to html:HTML (StarWriter)
        → trả chuỗi HTML
      → writer-adapter gắn HTML vào .vno-writer-body
```

Comments phiên làm việc (bôi đen → `<mark data-comment-id>` + panel) **đã hoạt động**. Câu hỏi chưa từng đo: mở DOCX thật có Comments của Word/LibreOffice thì có còn không.

Fixture độc lập VN Office:

1. Viết tay `tests/fixtures/real-office-samples/src/sample-writer-comments.fodt` với ODF `<office:annotation>` / `<office:annotation-end>`, neo `dự toán năm 2026` (author `Tran Thi Hoa`, body `Cần đối chiếu số liệu quý II trước khi trình.`) và neo `Lê Văn Cường` (author `Pham Minh Duc`, body `Xác nhận chữ ký người soạn.`).
2. Convert bằng `soffice --convert-to docx:MS Word 2007 XML` (cùng helper các task trước). **Không** dùng `serializeToDocx` / save HTML của VN Office.

Kết quả đo (`node tests/scripts/probe-writer-comments-import.mjs`):

| Tầng | Neo `dự toán năm 2026` / `Lê Văn Cường` | Body ghi chú | Author `Tran Thi Hoa` / `Pham Minh Duc` |
| --- | --- | --- | --- |
| DOCX `word/document.xml` | `w:commentRangeStart` / `End` / `w:commentReference` còn, đúng chữ | **không** (nằm file khác) | **không** |
| DOCX `word/comments.xml` | id khớp range | còn đủ 2 body | còn đủ 2 tên |
| HTML StarWriter từ DOCX (đúng `main.py`) | chữ thường, **không** `<mark>`, **không** `<a>` | còn trong `<!-- ... -->` (browser không hiện) | **mất** |
| HTML StarWriter từ FODT | như trên | như trên | **mất** |

Kết luận trước sửa:

- VN Writer **không** đọc được Comments từ file thật nếu chỉ đi HTML.
- Đây **không** phải thiếu vài dòng parse HTML: filter `HTML (StarWriter)` đã flatten range/author **trước khi** tới adapter. Không còn class/CSS/`<mark>`/`data-comment-id` để map.
- Body comment **không** biến mất khỏi file HTML — bị nhét vào HTML comment ngay sau chữ neo, nên `innerHTML` không hiện và adapter cũng không hydrate panel.
- Author **mất hoàn toàn** khỏi HTML. Không thể phục hồi tên người comment nếu không đọc `word/comments.xml`.
- DOCX soffice **có** native comments — file fixture là Comments thật, không phải giả.
- Trùng chữ với heading (`Công văn thẩm định dự toán năm 2026` cũng chứa `dự toán năm 2026`) nên overlay không được bọc nhầm heading.

`adapter.open()` còn **xóa** `this.comments = []` khi mở file khác, nên dù HTML có leftover cũng không vào panel.

## IMPLEMENTATION SUMMARY

Sửa được trong phạm vi hợp lý mà **không** viết lại toàn bộ import Writer sang OOXML/FODT — cùng pattern Track Changes:

1. `main.py` (chỉ nhánh Writer): khi nguồn là `.docx`, đọc `word/document.xml` (đã có) **và** `word/comments.xml` bằng `zipfile` stdlib; gửi kèm `ooxmlDocumentXml` + `ooxmlCommentsXml`. Sheet/Slides không đổi.
2. `WriterAdapter._normalizeImportedHtml`: overlay comment lên HTML flatten.
   - Lấy body/author/date từ `w:comment`.
   - Lấy neo + prefix/suffix từ `w:commentRangeStart`…`w:commentRangeEnd`.
   - Ưu tiên locator StarWriter: chữ neo ngay trước `<!-- body -->` (tránh bọc heading trùng chữ).
   - Fallback: prefix + neo, rồi occurrence duy nhất.
   - Bọc `<mark class="vno-comment-anchor" data-comment-id>` tái sử dụng CSS Comments phiên (nền `#fff2a8`, gạch dưới `#eab308`).
   - Gắn `data-vno-comment-author` + `title`.
3. `adapter.open()` hydrate `this.comments` từ overlay rồi `_renderCommentsPanel()` — panel đọc được nội dung, tên người, neo. Click neo ↔ card giữ hành vi cũ.
4. Panel hiện `author` khi có (comment phiên không có author thì UI như trước).

Không đổi đường convert HTML cho heading/bảng/ảnh. Không sửa Core LibreOffice. Không merge `main`. Xuất DOCX vẫn strip `<mark data-comment-id>` — **không** giả vờ đã ghi `word/comments.xml`.

## FILES CHANGED

- `adapters/libreoffice/writer/writer-adapter.js` — overlay OOXML comments + hydrate panel + hiện author
- `main.py` — `_read_docx_zip_entry`, `_read_docx_comments_xml`, Writer open trả `ooxmlCommentsXml`
- `apps/writer/writer.css` — `.vno-comment-author` / `.vno-comment-info` (Writer comments panel)
- `tests/helpers/zip-package.mjs` — không đổi (tái sử dụng `readZipEntry`)
- `tests/fixtures/real-office-samples/src/sample-writer-comments.fodt`
- `tests/fixtures/real-office-samples/sample-writer-comments.docx`
- `tests/scripts/generate-real-office-fixtures.mjs` + README fixture
- `tests/scripts/probe-writer-comments-import.mjs` — probe hiện trạng HTML vs OOXML
- `tests/unit/writer-comments-import.test.js`
- `tests/live/writer-comments-import.playwright.mjs`
- `tests/test_writer_comments_import.py`
- `tests/run-tests.js`
- `docs/FEATURE-PARITY-ROADMAP.md`
- `docs/HANDOFF-WRITER-COMMENTS-IMPORT-FIDELITY.md`

Không đụng `apps/sheet/**`, `apps/slides/**`, adapter Sheet/Slides.

## COMMANDS RUN

- `node tests/scripts/probe-writer-comments-import.mjs` — đo HTML flatten vs OOXML còn comments
- `node --check adapters/libreoffice/writer/writer-adapter.js`
- `node tests/run-tests.js`
- `python -m unittest tests.test_writer_comments_import tests.test_writer_trackchanges_import -v`
- `node tests/live/writer-comments-import.playwright.mjs`
- `git diff --check`

## BUILD RESULT

PASS — repo không có bước build; `node --check` Writer adapter PASS.

## TEST RESULTS

| Suite | Result | Ghi chú |
| --- | --- | --- |
| `node tests/run-tests.js` | **PASS** 730/730, 0 FAIL, **44.13s** (< 60s) | Gồm 5 test import Comments |
| `python -m unittest tests.test_writer_comments_import -v` | **PASS** 3/3 | Helper zip + `open_document_dialog(initial_file)` soffice thật, không SendKeys |
| `python -m unittest tests.test_writer_trackchanges_import -v` | **PASS** 3/3 | Regression sidecar Track Changes |
| Playwright Edge `tests/live/writer-comments-import.playwright.mjs` | **PASS** | File → Mở qua adapter; 2 mark neo đúng chữ; panel hiện 2 body + `Tran Thi Hoa` / `Pham Minh Duc`; nền `rgb(255, 242, 168)`; click neo mở đúng card; không bọc heading |

Không claim PASS cho test chưa chạy. Không disable test.

## KNOWN FAILURES

Không có failure trong phạm vi đã chạy.

## RISKS / GIỚI HẠN CÒN LẠI

Đây **vẫn là giới hạn thật của đường HTML**, được làm việc quanh bằng sidecar OOXML — không phải filter StarWriter đã emit markup Comments.

1. **Khớp chuỗi, không phải renderer OOXML đầy đủ.** Comment nằm trong run có `<b>`/`<i>` xen HTML, hoặc cùng một cụm chữ xuất hiện nhiều lần mà không có HTML-comment locator / prefix đủ độc, có thể bọc sai/sót. Nested comments, comment trên ảnh/shape, reply thread (`w:comment` + `w15:commentEx`) chưa cover.
2. **Chỉ DOCX.** Mở `.odt`/`.fodt` trực tiếp vẫn chỉ có HTML flatten (không có `word/comments.xml`). FODT nguồn **có** `office:annotation` — follow-up riêng nếu cần ODF-only.
3. **Browser suite không có desktop bridge** không nhận `ooxmlCommentsXml` → vẫn mất comments. Desktop App (pywebview + `main.py`) mới đủ đường thật.
4. **Xuất DOCX/PDF vẫn strip comment markup** — đúng thiết kế phiên Comments hiện tại; import hiển thị ghi chú, save vẫn **không** ghi native `word/comments.xml`. Không giả vờ đã lưu.
5. Playwright không điều khiển hộp thoại native (SendKeys cấm). Live test chạy **cùng** soffice HTML convert như `main.py` và stub `openRealFile` kèm `ooxmlDocumentXml` + `ooxmlCommentsXml` giống payload desktop. Python unittest gọi thật `open_document_dialog()` với `initial_file`.

## DEPENDENCIES/BLOCKERS

Không dependency mới, không thư viện trả phí. Không blocker. Không CORE PATCH.

CORE PATCH ID (if any): Không có — không sửa LibreOffice Core.

## NEXT ACTION

- **Không merge vào `main`.** Review trên `fix/writer-comments-import-fidelity`.
- Follow-up riêng (không làm trong task này): import Comments từ ODT/FODT; renderer OOXML đầy đủ thay vì overlay chuỗi; ghi native `word/comments.xml` khi save (hiện save vẫn strip).
