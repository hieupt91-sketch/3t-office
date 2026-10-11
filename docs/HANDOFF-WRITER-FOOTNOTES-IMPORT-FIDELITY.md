# Agent Handoff

TASK: Writer Footnotes/Endnotes import fidelity (mở DOCX thật có footnote/endnote Word)
AGENT/ROLE: Grok / implementation & verification
BRANCH: `fix/writer-footnotes-import-fidelity`
WORKTREE: `E:\VNOffice-grok-writer-footnotes-import`
OBJECTIVE: Xác nhận khi mở file DOCX thật có Footnotes/Endnotes (không do VN Office serialize) thì VN Writer có đọc được số mũ và nội dung chú thích hay không; nếu mất thông tin, sửa trong phạm vi hợp lý hoặc ghi rõ giới hạn thật. Không merge vào `main`. Không đụng Sheet/Slides. Không tự ý sửa `main.py`.

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
      → _normalizeImportedHtml đã sẵn parse header/footer + overlay Track Changes/Comments
```

VN Writer **đã** có Footnotes/Endnotes phiên (chèn số mũ, tự đánh số, sửa/xóa, Print Preview). Đó là round-trip tự tạo (`<sup data-vno-footnote-ref>` + `[data-vno-footnotes=true]`). Câu hỏi chưa từng đo: mở DOCX thật có `word/footnotes.xml` + `word/endnotes.xml` của Word/LibreOffice.

Fixture độc lập VN Office:

1. Viết tay `tests/fixtures/real-office-samples/src/sample-writer-footnotes.fodt` với ODF `<text:note text:note-class="footnote|endnote">` + `<text:note-citation>` + `<text:note-body>`: 2 footnote (NĐ 15/2021, Thông tư 10/2021) và 1 endnote (phụ lục kỹ thuật Đăk Bla).
2. Convert bằng `soffice --convert-to docx:MS Word 2007 XML` (cùng helper các task trước). **Không** dùng `serializeToDocx` / save HTML của VN Office.
3. Giải nén ZIP thật — **không bia**.

Kết quả đo (`node tests/scripts/probe-writer-footnotes-import.mjs`, LibreOffice 26.2.5.2):

| Tầng | Neo `NĐ-CP` / `TT-BXD` / `phụ lục kỹ thuật` | Body footnote 1+2 | Body endnote | Thân trang `kênh chính` |
| --- | --- | --- | --- | --- |
| DOCX `word/document.xml` | `w:footnoteReference` id=2,3 + `w:endnoteReference` id=2 | **không** (part riêng) | **không** | còn |
| DOCX `word/footnotes.xml` | `w:footnoteRef` trong từng `w:footnote` | còn đủ 2 body | **không** | **không** |
| DOCX `word/endnotes.xml` | `w:endnoteRef` | **không** | còn | **không** |
| HTML StarWriter từ DOCX (đúng `main.py`) | `<a class="sdfootnoteanc"><sup>1</sup></a>` / `sdendnoteanc` `<sup>i</sup>` | còn trong `<div id="sdfootnoteN">` | còn trong `<div id="sdendnote1">` | còn (StarWriter ngắt dòng giữa từ) |
| HTML StarWriter từ FODT | như trên | như trên | như trên | còn |

HTML thật nhận được (rút gọn):

```html
<p ...>Căn cứ Nghị định 15/2021/NĐ-CP<a class="sdfootnoteanc" name="sdfootnote1anc" href="#sdfootnote1sym"><sup>1</sup></a>
về quản lý đầu tư xây dựng, đơn vị đề xuất phương án kênh chính.</p>
...
<a class="sdendnoteanc" name="sdendnote1anc" href="#sdendnote1sym"><sup>i</sup></a>
...
<div id="sdfootnote1"><p class="sdfootnote-western">...<a class="sdfootnotesym">1</a> Nghị định này có hiệu lực...</p></div>
<div id="sdendnote1"><p class="sdendnote-western">...<a class="sdendnotesym">i</a> Phụ lục kỹ thuật gồm...</p></div>
```

Kết luận trước sửa:

- **Khác Track Changes / Comments. Giống Header/Footer.** Filter `HTML (StarWriter)` **không** bỏ Footnotes/Endnotes. Nó emit `a.sdfootnoteanc` / `a.sdendnoteanc` + `div#sdfootnoteN` / `#sdendnoteN`.
- Dữ liệu chữ **không** mất trên đường HTML. **Không** cần sidecar `word/footnotes.xml` / `word/endnotes.xml` qua `main.py`.
- Lỗ hổng thật còn lại trên adapter: HTML StarWriter **không** phải markup VN Writer (`data-vno-footnote-ref`). Trước khi sửa, File → Mở sẽ hiện số mũ là `<a><sup>` thường và dồn body note thành đoạn văn cuối trang — không vào container chú thích, không đánh số lại, không nhảy click, Print Preview không gắn chân trang.
- StarWriter ngắt dòng giữa âm tiết (`thay` / `thế`) nên so khớp chuỗi tuyệt đối trên HTML thô **fail**; adapter collapse whitespace khi lấy body.

## IMPLEMENTATION SUMMARY

Sửa được trong phạm vi adapter, **không** viết lại import Writer sang OOXML, **không** sửa `main.py`:

1. `WriterAdapter._normalizeImportedStarWriterNotes`: đọc `a.sdfootnoteanc` / `a.sdendnoteanc` + `div#sdfootnoteN` / `#sdendnoteN`, đổi thành `<sup data-vno-footnote-ref="fn-import-N">` / `data-vno-endnote-ref="en-import-N"` và container `[data-vno-footnotes=true]` / `[data-vno-endnotes=true]` (cùng class phiên `insertFootnote` / `insertEndnote`).
2. `_normalizeImportedHtml` gọi helper này sau khi tách header/footer — hành vi overlay Track Changes/Comments không đổi.
3. Không overlay OOXML. Không bịa note khi HTML không có marker StarWriter. Không đụng markup VN đã có (`data-vno-footnotes="true"` thì không append container thứ hai).

**Không sửa `main.py`.** Claude **không** cần thêm `_read_docx_footnotes_xml` / `ooxmlFootnotesXml` cho task này. Sidecar chỉ cần nếu một filter HTML sau này **bỏ** `sdfootnoteanc` — hiện StarWriter không bỏ.

Không đổi đường convert HTML cho heading/bảng/ảnh. Không sửa Core LibreOffice. Không merge `main`. Không đụng Sheet/Slides.

## FILES CHANGED

- `adapters/libreoffice/writer/writer-adapter.js` — map StarWriter sdfootnote/sdendnote → markup VN Writer
- `tests/fixtures/real-office-samples/src/sample-writer-footnotes.fodt`
- `tests/fixtures/real-office-samples/sample-writer-footnotes.docx`
- `tests/scripts/generate-real-office-fixtures.mjs` + README fixture
- `tests/scripts/probe-writer-footnotes-import.mjs` — probe hiện trạng HTML vs OOXML parts
- `tests/unit/writer-footnotes-import.test.js`
- `tests/live/writer-footnotes-import.playwright.mjs`
- `tests/test_writer_footnotes_import.py`
- `tests/run-tests.js`
- `docs/FEATURE-PARITY-ROADMAP.md`
- `docs/HANDOFF-WRITER-FOOTNOTES-IMPORT-FIDELITY.md`

Không đụng `apps/sheet/**`, `apps/slides/**`, adapter Sheet/Slides, `main.py`.

## COMMANDS RUN

- `node tests/scripts/probe-writer-footnotes-import.mjs` — đo HTML còn `sdfootnoteanc`/`sdendnoteanc`; ZIP có `word/footnotes.xml` + `word/endnotes.xml`
- `node --check adapters/libreoffice/writer/writer-adapter.js`
- `node tests/run-tests.js`
- `python -m unittest tests.test_writer_footnotes_import -v`
- `node tests/live/writer-footnotes-import.playwright.mjs`
- `git diff --check`

## BUILD RESULT

PASS — repo không có bước build; `node --check` Writer adapter PASS.

## TEST RESULTS

| Suite | Result | Ghi chú |
| --- | --- | --- |
| `node tests/run-tests.js` | **783/788 PASS, 5 FAIL, 52.80s** (< 60s) | **5/5 test import Footnotes/Endnotes PASS.** 5 FAIL là suite Slides có sẵn trên `main` (xem KNOWN FAILURES), không phải regression của task này. |
| `python -m unittest tests.test_writer_footnotes_import -v` | **PASS** 3/3 | ZIP `footnotes.xml`/`endnotes.xml` + `open_document_dialog(initial_file)` soffice thật còn `sdfootnoteanc`, không SendKeys, không sidecar |
| Playwright Edge `tests/live/writer-footnotes-import.playwright.mjs` | **PASS** | File → Mở qua adapter; 2 footnote (1, 2) + 1 endnote (i); body còn `kênh chính`; không còn StarWriter |

Không claim PASS cho test chưa chạy. Không disable test. Không claim 788/788 vì 5 FAIL Slides chưa được sửa (ngoài phạm vi).

## KNOWN FAILURES

Không có failure trong phạm vi Writer footnotes import (unit 5/5, python 3/3, Playwright PASS).

`node tests/run-tests.js` còn **5 FAIL sẵn trên `main`**, ngoài phạm vi (cấm đụng Sheet/Slides). Lỗi giống nhau: `Cannot access 't' before initialization`.

Nguyên nhân (đọc code, không sửa): `apps/slides/slides-canvas.js` `startSlideShow` → `renderShow` gọi i18n `t(...)` ở footer slideshow rồi khai báo `const t = transition;` trong cùng function — TDZ shadow import `t`. Tái hiện khi chạy riêng `slides-animations-notes`, `slides-timings-media`, `slides-diagrams`, `slides-dialogs-a11y` (không load `writer-adapter.js`).

| Test | Suite |
| --- | --- |
| SlideShow F5: Khán giả không nhìn thấy Speaker Notes… | 14. slides-animations-notes |
| Rehearse Timings: đồng hồ thật ghi thời gian dương… | 29. slides-timings-media |
| Rehearse Timings: nhãn thời gian hiển thị thật trong Slide Sorter… | 29. slides-timings-media |
| SmartArt hiển thị node, text và connector trong Slide Show… | 37. slides-diagrams |
| Rehearse Timings: role='dialog', aria-label tập dượt… | 56. slides-dialogs-a11y |

Handoff Slides owner: đổi `const t = transition` thành tên khác (`transitionCfg`). **Không sửa trong worktree này.**

## RISKS / GIỚI HẠN CÒN LẠI

Đây **không** phải giới hạn flatten kiểu Track Changes. Footnote/Endnote chữ **đọc được** từ file thật qua HTML StarWriter.

1. **Chỉ default notes.** Fixture 2 footnote + 1 endnote plain text. Note trong bảng, text box, comment, hoặc có ảnh/bảng lồng **chưa đo**. Regex `</div>` non-greedy có thể cắt sớm nếu body note chứa `</div>`.
2. **Số mũ là giá trị StarWriter đã evaluate** (`1`, `2`, `i`), không phải field OOXML sống. Adapter giữ label đó rồi `renumberFootnotes` phiên sẽ đánh lại 1..n khi user sửa.
3. **Chỉ đo đường HTML StarWriter.** Mở `.odt`/`.fodt` trực tiếp: probe FODT→HTML cũng còn `sdfootnoteanc`. Browser suite không có desktop bridge vẫn nhận HTML string — **khác** Track Changes (cần sidecar). Desktop App và stub HTML đều đủ cho chữ note.
4. **Xuất DOCX/PDF vẫn HTML→LibreOffice**, không ghi native `word/footnotes.xml`. Import hiển thị chú thích; save **không** giả vờ đã ghi part OOXML. Cùng hạn chế save HTML hiện tại (đã ghi trên roadmap phiên).
5. **Không cover** custom mark, restart numbering mỗi trang, separator/continuationSeparator (id 0/1 trong OOXML — StarWriter không emit ra HTML).
6. Playwright không điều khiển hộp thoại native (SendKeys cấm). Live test chạy **cùng** soffice HTML convert như `main.py` và stub `openRealFile`. Python unittest gọi thật `open_document_dialog()` với `initial_file`.

## DEPENDENCIES/BLOCKERS

Không dependency mới, không thư viện trả phí. Không blocker. Không CORE PATCH.

**Claude / main.py:** không cần sửa cho Footnotes/Endnotes chữ. Giữ `_read_docx_document_xml` / `_read_docx_comments_xml` như hiện tại (Track Changes / Comments). Chỉ cân nhắc đọc `word/footnotes.xml` nếu sau này một filter HTML **bỏ** `sdfootnoteanc` hoặc cần custom mark / numbering restart native.

CORE PATCH ID (if any): Không có — không sửa LibreOffice Core.

## NEXT ACTION

- **Không merge vào `main`.** Review trên `fix/writer-footnotes-import-fidelity`.
- Follow-up riêng (không làm trong task này): fixture note có ảnh/bảng; numbering restart mỗi trang; ghi native `word/footnotes.xml` khi save.


> **Correction 2026-09-14 (Claude):** every MYTIME page count in this document was measured with Word COM ComputeStatistics(wdStatisticPages), which is wrong in a hidden window (it reports 88 for a 44-page document). Word's PDF export of the original MYTIME has **44** pages; the edited-save output currently has **73** (43 section breaks lost). Use _word_oracle3.ps1 (PDF-based) going forward. See HANDOFF-WRITER-SAVE-SECTIONS*.md.
