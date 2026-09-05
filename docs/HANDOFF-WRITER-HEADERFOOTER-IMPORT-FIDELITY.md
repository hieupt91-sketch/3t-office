# Agent Handoff

TASK: Writer Header/Footer import fidelity (mở DOCX thật có header/footer Word)
AGENT/ROLE: Grok / implementation & verification
BRANCH: `fix/writer-headerfooter-import-fidelity`
WORKTREE: `E:\VNOffice-grok-writer-headerfooter-import`
OBJECTIVE: Xác nhận khi mở file DOCX thật có Header/Footer (không do VN Office serialize) thì VN Writer có đọc được nội dung header (tên công ty) và footer (số trang tự động Trang X/Y, ngày) hay không; nếu mất thông tin, sửa trong phạm vi hợp lý hoặc ghi rõ giới hạn thật. Không merge vào `main`. Không đụng Sheet/Slides. Không sửa `main.py` trong worktree này.

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
      → _normalizeImportedHtml đã sẵn parse <div title="header|footer">
```

VN Writer **đã** có Header/Footer phiên (chèn được, lặp mỗi trang khi in/PDF). Đó là round-trip tự tạo (`_contentForExport` bọc `<div title="header">` / `<div title="footer">`). Câu hỏi chưa từng đo: mở DOCX thật có header/footer native của Word/LibreOffice.

Fixture độc lập VN Office:

1. Viết tay `tests/fixtures/real-office-samples/src/sample-writer-headerfooter.fodt` với ODF `<style:header>` / `<style:footer>` trên master-page: header `Công ty TNHH Sao Việt — Phòng Kế hoạch`, footer `Trang <text:page-number/> / <text:page-count/> · Ngày 05/09/2026`, thân trang `Nội dung thân trang công văn số 128/KH-ĐT`.
2. Convert bằng `soffice --convert-to docx:MS Word 2007 XML` (cùng helper các task trước). **Không** dùng `serializeToDocx` / save HTML của VN Office.
3. Giải nén ZIP thật — **không bia**.

Kết quả đo (`node tests/scripts/probe-writer-headerfooter-import.mjs`, LibreOffice 26.2.5.2):

| Tầng | Tên công ty header | Ngày footer | PAGE / NUMPAGES | Thân trang `128/KH-ĐT` |
| --- | --- | --- | --- | --- |
| DOCX `word/document.xml` | **không** (chỉ `w:headerReference` / `w:footerReference` trong `w:sectPr`) | **không** | `PAGE` trong sectPr pgNumType, không phải nội dung footer | còn |
| DOCX `word/header1.xml` | còn, trong `<w:hdr>` | **không** | **không** | **không** (đúng: part riêng) |
| DOCX `word/footer1.xml` | **không** | còn `05/09/2026` | còn native `w:instrText` `PAGE` + `NUMPAGES` + `w:fldChar` | **không** |
| HTML StarWriter từ DOCX (đúng `main.py`) | còn trong `<div title="header">` | còn trong `<div title="footer">` | thành `<sdfield type=PAGE>` / `DOCSTAT` + span nền `#c0c0c0` | còn (StarWriter ngắt dòng giữa từ) |
| HTML StarWriter từ FODT | như trên | như trên | như trên | còn |

HTML thật nhận được (rút gọn):

```html
<div title="header"><p ...><font size="2">Công ty TNHH Sao Việt —
	Phòng Kế hoạch</font></p></div>
...heading + body...
<div title="footer"><p align="center" ...>Trang <span style="background: #c0c0c0"><sdfield type=PAGE ...>1</sdfield></span>
	/ <span style="background: #c0c0c0"><sdfield type=DOCSTAT ...>1</sdfield></span>
	· Ngày 05/09/2026</p></div>
```

Kết luận trước sửa:

- **Khác Track Changes / Comments.** Filter `HTML (StarWriter)` **không** bỏ Header/Footer. Nó emit đúng `<div title="header">` / `<div title="footer">` — cùng marker `_contentForExport` và `_normalizeImportedHtml` đã dùng cho round-trip VN Writer.
- Adapter **đã** tách header/footer khỏi body trước khi sửa: đo `_normalizeImportedHtml` trên HTML soffice thật → `imported.header` có tên công ty, `imported.footer` có ngày/Trang, `imported.body` **không** lẫn header.
- Dữ liệu chữ **không** mất trên đường HTML. **Không** cần sidecar `word/header1.xml` / `word/footer1.xml` qua `main.py` cho trường hợp này.
- Lỗ hổng thật còn lại trên HTML: trường số trang thành `<sdfield>` (không phải HTML hợp lệ) bọc span xám. Regex Print Preview `/Trang\s+\d+(\s*\/\s*\d+)?/` **không** khớp khi có thẻ xen giữa `Trang` và `1`, nên số trang import sẽ kẹt `1 / 1` trên mọi trang preview.

## IMPLEMENTATION SUMMARY

Sửa được trong phạm vi adapter, **không** viết lại import Writer sang OOXML, **không** sửa `main.py`:

1. `WriterAdapter._normalizeImportedHeaderFooterHtml`: gỡ `<sdfield>…</sdfield>` giữ số hiển thị, gỡ span `background:#c0c0c0`. Footer thành `Trang 1 / 1 · Ngày 05/09/2026` (có thể còn xuống dòng StarWriter). Print Preview thay được `Trang 3 / 5`.
2. `_normalizeImportedHtml` gọi helper này sau khi tách `<div title="header|footer">` — hành vi tách vùng giữ nguyên.
3. Không overlay OOXML. Không bịa header khi HTML không có `title="header"`.

**Không sửa `main.py`.** Claude **không** cần thêm `_read_docx_header_xml` / `ooxmlHeaderXml` cho task này. Sidecar chỉ cần nếu một filter HTML sau này **bỏ** `title="header"` — hiện StarWriter không bỏ.

Không đổi đường convert HTML cho heading/bảng/ảnh. Không sửa Core LibreOffice. Không merge `main`. Không đụng Sheet/Slides.

## FILES CHANGED

- `adapters/libreoffice/writer/writer-adapter.js` — unwrap `<sdfield>` PAGE/NUMPAGES trên header/footer import
- `tests/fixtures/real-office-samples/src/sample-writer-headerfooter.fodt`
- `tests/fixtures/real-office-samples/sample-writer-headerfooter.docx`
- `tests/scripts/generate-real-office-fixtures.mjs` + README fixture
- `tests/scripts/probe-writer-headerfooter-import.mjs` — probe hiện trạng HTML vs OOXML parts
- `tests/unit/writer-headerfooter-import.test.js`
- `tests/live/writer-headerfooter-import.playwright.mjs`
- `tests/test_writer_headerfooter_import.py`
- `tests/run-tests.js`
- `docs/FEATURE-PARITY-ROADMAP.md`
- `docs/HANDOFF-WRITER-HEADERFOOTER-IMPORT-FIDELITY.md`

Không đụng `apps/sheet/**`, `apps/slides/**`, adapter Sheet/Slides, `main.py`.

## COMMANDS RUN

- `node tests/scripts/probe-writer-headerfooter-import.mjs` — đo HTML còn `title="header|footer"`; ZIP có `word/header1.xml` + `word/footer1.xml`
- `node --check adapters/libreoffice/writer/writer-adapter.js`
- `node tests/run-tests.js`
- `python -m unittest tests.test_writer_headerfooter_import -v`
- `node tests/live/writer-headerfooter-import.playwright.mjs`
- `git diff --check`

## BUILD RESULT

PASS — repo không có bước build; `node --check` Writer adapter PASS.

## TEST RESULTS

| Suite | Result | Ghi chú |
| --- | --- | --- |
| `node tests/run-tests.js` | **PASS** 766/766, 0 FAIL, **54.67s** (< 60s) | Gồm 5 test import Header/Footer |
| `python -m unittest tests.test_writer_headerfooter_import -v` | **PASS** 3/3 | ZIP `header1.xml`/`footer1.xml` + `open_document_dialog(initial_file)` soffice thật còn `title="header\|footer"`, không SendKeys |
| `python -m unittest tests.test_writer_comments_import tests.test_writer_trackchanges_import -v` | **PASS** 6/6 | Regression sidecar Comments + Track Changes |
| Playwright Edge `tests/live/writer-headerfooter-import.playwright.mjs` | **PASS** | File → Mở qua adapter; `.vno-writer-header` = `Công ty TNHH Sao Việt — Phòng Kế hoạch`; footer = `Trang 1 / 1 · Ngày 05/09/2026`; không còn `sdfield`; body còn `128/KH-ĐT`, không lẫn tên công ty |

Không claim PASS cho test chưa chạy. Không disable test.

## KNOWN FAILURES

Không có failure trong phạm vi đã chạy.

## RISKS / GIỚI HẠN CÒN LẠI

Đây **không** phải giới hạn flatten kiểu Track Changes. Header/Footer chữ **đọc được** từ file thật qua HTML StarWriter.

1. **Số trang là giá trị đã evaluate (thường `1 / 1`), không phải field OOXML sống.** Adapter giữ chữ `Trang 1 / 1` để Print Preview VN Writer thay theo số trang canvas. Xuất DOCX/PDF sau import **không** ghi lại `w:fldChar PAGE` native — cùng hạn chế save HTML hiện tại.
2. **Chỉ default header/footer.** Fixture một `style:header` / `style:footer` → một `header1.xml` / `footer1.xml` `w:type="default"`. First-page / even-odd (`header2.xml`, `title="header"` thứ hai) **chưa đo**. Regex adapter lấy **div đầu tiên**.
3. **Ảnh/logo trong header chưa có trong fixture.** Nếu StarWriter emit `<img src>` trong `div title="header"`, `main.py` `_inline_html_images` đã inline toàn bộ HTML trước khi adapter tách — có thể đã đủ, nhưng **chưa đo**.
4. **Header phức tạp** (bảng lồng, nested `</div>`) có thể cắt sớm vì regex non-greedy tới `</div>` đầu. Fixture là một đoạn văn.
5. **Print Preview chỉ thay pattern tiếng Việt `Trang N / M`.** Footer Word kiểu `Page 1 of 1` import được chữ nhưng không tự tăng số trang preview (hạn chế Print Preview sẵn có, không riêng import).
6. **Chỉ đo đường HTML StarWriter.** Mở `.odt`/`.fodt` trực tiếp: probe FODT→HTML cũng còn `title="header|footer"`. Browser suite không có desktop bridge vẫn nhận HTML string — **khác** Track Changes (cần sidecar). Desktop App và stub HTML đều đủ cho chữ header/footer.
7. Playwright không điều khiển hộp thoại native (SendKeys cấm). Live test chạy **cùng** soffice HTML convert như `main.py` và stub `openRealFile`. Python unittest gọi thật `open_document_dialog()` với `initial_file`.

## DEPENDENCIES/BLOCKERS

Không dependency mới, không thư viện trả phí. Không blocker. Không CORE PATCH.

**Claude / main.py:** không cần sửa cho Header/Footer chữ. Giữ `_read_docx_document_xml` / `_read_docx_comments_xml` như hiện tại (Track Changes / Comments). Chỉ cân nhắc đọc `word/header1.xml` nếu sau này một filter HTML **bỏ** `title="header"` hoặc cần field PAGE native thay vì số đã evaluate.

CORE PATCH ID (if any): Không có — không sửa LibreOffice Core.

## NEXT ACTION

- **Không merge vào `main`.** Review trên `fix/writer-headerfooter-import-fidelity`.
- Follow-up riêng (không làm trong task này): fixture header có logo/ảnh; first-page / even-odd; ghi native `word/header1.xml` khi save; field PAGE sống khi xuất DOCX.
