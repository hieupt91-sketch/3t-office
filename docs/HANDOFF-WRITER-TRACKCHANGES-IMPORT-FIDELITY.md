# Agent Handoff

TASK: Writer Track Changes import fidelity (mở DOCX thật có markup revision)
AGENT/ROLE: Grok / implementation & verification
BRANCH: `fix/writer-trackchanges-import-fidelity`
WORKTREE: `E:\VNOffice-grok-writer-trackchanges-import`
OBJECTIVE: Xác nhận khi mở file DOCX thật có Track Changes (không do VN Office serialize) thì VN Writer có đọc được insertion/deletion + tên người sửa hay không; nếu mất thông tin, sửa trong phạm vi hợp lý hoặc ghi rõ giới hạn thật.

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

Fixture độc lập VN Office:

1. Viết tay `tests/fixtures/real-office-samples/src/sample-writer-trackchanges.fodt` với ODF `<text:tracked-changes>`, insertion `theo yêu cầu khẩn`, deletion `bản nháp nội bộ`, author `Nguyen Van An`.
2. Convert bằng `soffice --convert-to docx:MS Word 2007 XML` (cùng helper các task trước). **Không** dùng `serializeToDocx` / save HTML của VN Office.

Kết quả đo:

| Tầng | Insertion `theo yêu cầu khẩn` | Deletion `bản nháp nội bộ` | Author `Nguyen Van An` |
| --- | --- | --- | --- |
| DOCX `word/document.xml` | `w:ins` còn | `w:del` / `w:delText` còn | `w:author` còn |
| HTML StarWriter từ DOCX (đúng `main.py`) | chữ thường, **không** `<ins>` | chữ thường (có trong HTML, **không** `<del>`, không gạch ngang) | **mất** |
| HTML StarWriter từ FODT | như trên | như trên | **mất** |
| FODT round-trip từ DOCX (thử thêm) | `text:change-start` còn | `text:change` + `text:deletion` còn | còn |

Kết luận trước sửa:

- VN Writer **không** đọc được Track Changes từ file thật nếu chỉ đi HTML.
- Đây **không** phải thiếu vài dòng parse HTML: filter `HTML (StarWriter)` đã flatten markup **trước khi** tới adapter. Không còn class/CSS/`<ins>`/`<del>` để map.
- Deletion **không** bị xóa khỏi HTML (không phải accepted view); cả chữ chèn lẫn chữ xóa bị dồn thành một đoạn văn bản thường, nên người dùng không phân biệt được chỗ đã sửa.
- DOCX soffice **có** native `w:ins`/`w:del` — file fixture là Track Changes thật, không phải giả.

## IMPLEMENTATION SUMMARY

Sửa được trong phạm vi hợp lý mà **không** viết lại toàn bộ import Writer sang OOXML/FODT:

1. `main.py` (chỉ nhánh Writer): khi nguồn là `.docx`, đọc `word/document.xml` bằng `zipfile` stdlib và gửi kèm `ooxmlDocumentXml`. Sheet/Slides không đổi.
2. `WriterAdapter._normalizeImportedHtml`: overlay `w:ins`/`w:del` lên HTML flatten (khớp chuỗi, whitespace-flexible vì StarWriter ngắt dòng giữa từ), bọc `<ins data-vno-change="insert">` / `<del data-vno-change="delete">` tái sử dụng CSS phiên Track Changes (`#166534` gạch chân / `#b91c1c` gạch ngang). Giữ `data-vno-author`, `data-vno-date`, `title` tooltip.
3. HTML `<ins>`/`<del>` sẵn có (nếu filter khác emit) cũng được nâng lên marker VN.

Không đổi đường convert HTML cho heading/bảng/ảnh. Không sửa Core LibreOffice. Không merge `main`.

## FILES CHANGED

- `adapters/libreoffice/writer/writer-adapter.js` — overlay OOXML + upgrade `<ins>`/`<del>`
- `main.py` — `_read_docx_document_xml`, Writer open trả `ooxmlDocumentXml`
- `tests/helpers/zip-package.mjs` — `readZipEntry` (không thư viện trả phí)
- `tests/fixtures/real-office-samples/src/sample-writer-trackchanges.fodt`
- `tests/fixtures/real-office-samples/sample-writer-trackchanges.docx`
- `tests/scripts/generate-real-office-fixtures.mjs` + README fixture
- `tests/scripts/probe-writer-trackchanges-import.mjs` — probe hiện trạng HTML vs OOXML
- `tests/unit/writer-trackchanges-import.test.js`
- `tests/live/writer-trackchanges-import.playwright.mjs`
- `tests/test_writer_trackchanges_import.py`
- `tests/run-tests.js`
- `docs/FEATURE-PARITY-ROADMAP.md`
- `docs/HANDOFF-WRITER-TRACKCHANGES-IMPORT-FIDELITY.md`

Không đụng `apps/sheet/**`, `apps/slides/**`, adapter Sheet/Slides.

## COMMANDS RUN

- `node tests/scripts/probe-writer-trackchanges-import.mjs` — đo HTML flatten vs OOXML còn revision
- `node --check adapters/libreoffice/writer/writer-adapter.js`
- `node tests/run-tests.js`
- `python -m unittest tests.test_writer_trackchanges_import -v`
- `node tests/live/writer-trackchanges-import.playwright.mjs`
- `git diff --check`

## BUILD RESULT

PASS — repo không có bước build; `node --check` Writer adapter PASS.

## TEST RESULTS

| Suite | Result | Ghi chú |
| --- | --- | --- |
| `node tests/run-tests.js` | **PASS** 723/723, 0 FAIL, **17.40s** (< 60s) | Gồm 6 test import Track Changes |
| `python -m unittest tests.test_writer_trackchanges_import -v` | **PASS** 3/3 | Helper zip + `open_document_dialog(initial_file)` soffice thật, không SendKeys |
| Playwright Edge `tests/live/writer-trackchanges-import.playwright.mjs` | **PASS** | File → Mở qua adapter; CSS thật: ins `rgb(22, 101, 52)` underline, del `rgb(185, 28, 28)` line-through; chữ `theo yêu cầu khẩn` / `bản nháp nội bộ`; author `Nguyen Van An` trên `data-vno-author` + `title` |

Không claim PASS cho test chưa chạy. Không disable test.

## KNOWN FAILURES

Không có failure trong phạm vi đã chạy.

## RISKS / GIỚI HẠN CÒN LẠI

Đây **vẫn là giới hạn thật của đường HTML**, được làm việc quanh bằng sidecar OOXML — không phải filter StarWriter đã emit markup.

1. **Khớp chuỗi, không phải renderer OOXML đầy đủ.** Revision nằm trong run có `<b>`/`<i>` xen HTML, hoặc cùng một cụm chữ xuất hiện nhiều lần, có thể bọc sai/sót. Không cover `w:moveFrom`/`w:moveTo`, format-change.
2. **Chỉ DOCX.** Mở `.odt`/`.fodt` trực tiếp vẫn chỉ có HTML flatten (không có `word/document.xml`). FODT convert từ DOCX **có** `text:tracked-changes` — follow-up riêng nếu cần ODF-only.
3. **Browser suite không có desktop bridge** không nhận `ooxmlDocumentXml` → vẫn mất markup. Desktop App (pywebview + `main.py`) mới đủ đường thật.
4. **Xuất DOCX/PDF vẫn accepted view sạch** (giữ chữ mới, bỏ chữ xóa) — đúng thiết kế phiên Track Changes hiện tại; import hiển thị markup, save vẫn không ghi native revision OOXML.
5. Playwright không điều khiển hộp thoại native (SendKeys cấm). Live test chạy **cùng** soffice HTML convert như `main.py` và stub `openRealFile` kèm `ooxmlDocumentXml` giống payload desktop. Python unittest gọi thật `open_document_dialog()` với `initial_file`.

## DEPENDENCIES/BLOCKERS

Không dependency mới, không thư viện trả phí. Không blocker. Không CORE PATCH.

CORE PATCH ID (if any): Không có — không sửa LibreOffice Core.

## NEXT ACTION

- **Không merge vào `main`.** Review trên `fix/writer-trackchanges-import-fidelity`.
- Follow-up riêng (không làm trong task này): import Track Changes từ ODT/FODT; renderer OOXML đầy đủ thay vì overlay chuỗi; ghi native `w:ins`/`w:del` khi save (hiện save vẫn accepted view).
