# Agent Handoff

TASK: Writer Tables import fidelity (mở DOCX thật có bảng Word merge/border/shading)
AGENT/ROLE: Grok / investigation & verification
BRANCH: `fix/writer-tables-import-fidelity`
WORKTREE: `E:\VNOffice-grok-writer-tables-import`
OBJECTIVE: Xác nhận khi mở file DOCX thật có bảng phức tạp (ô gộp ngang/dọc, viền màu từng cạnh, tô màu nền) — không do VN Office serialize — thì VN Writer có đọc đúng trên canvas hay bị mất định dạng; nếu mất dữ liệu thật có thể sửa trong adapter thì sửa, nếu là giới hạn thật thì ghi rõ kèm bằng chứng đo.

## FINDINGS (trước khi kết luận — đo bằng đường import thật)

Đường mở Writer hiện tại:

```
common.file.open
  → WriterAdapter.open()
    → globalUnoBridge.openRealFile("writer")
      → main.py open_document_dialog()
        → soffice --convert-to html:HTML (StarWriter)
        → trả chuỗi HTML
      → writer-adapter._normalizeImportedHtml() extract <body>
      → gắn HTML vào .vno-writer-body
```

VN Writer **đã** có Insert Table phiên (`insertTable` 3×4, viền đồng nhất `#94a3b8`, **không** merge/shading). Round 1 import (`sample-writer.docx`) chỉ đo bảng 3×3 viền đen đều. Câu hỏi chưa từng đo: mở DOCX thật có `w:gridSpan` / `w:vMerge` / `w:tcBorders` màu khác từng cạnh / `w:shd`.

Fixture độc lập VN Office:

1. Viết tay `tests/fixtures/real-office-samples/src/sample-writer-tables.fodt`:
   - `table:number-columns-spanned="2"` — tiêu đề **Phân bổ ngân sách năm 2026**
   - `table:number-rows-spanned="2"` — **Nhóm dự án thủy lợi**
   - `table:covered-table-cell` cho ô bị che
   - Tô nền: `#fef3c7` / `#dbeafe` / `#dcfce7` / `#fecaca`
   - Viền từng cạnh: trái dày `#b45309`, trên `#1d4ed8`, phải `#b91c1c`, dưới `#6d28d9`, trái `#15803d`
2. Convert bằng `soffice --convert-to docx:MS Word 2007 XML` (cùng helper các task trước). **Không** dùng HTML save của VN Office.
3. Giải nén ZIP thật — **không bịa**.

Kết quả đo (`node tests/scripts/probe-writer-tables-import.mjs`, LibreOffice 26.2.5.2):

| Tầng | Merge ngang | Merge dọc | Viền màu từng cạnh | Tô nền |
| --- | --- | --- | --- | --- |
| FODT viết tay | `number-columns-spanned=2` | `number-rows-spanned=2` | `fo:border-top/left/right/bottom` 5 màu | 4 `fo:background-color` |
| DOCX `word/document.xml` | `w:gridSpan w:val="2"` | `w:vMerge restart` + `continue` | `w:tcBorders` `w:color` 1D4ED8 / B45309 / 15803D / B91C1C / 6D28D9 | `w:shd w:fill` FEF3C7 / DBEAFE / DCFCE7 / FECACA |
| HTML StarWriter từ DOCX (đúng `main.py`) | `colspan="2"` | `rowspan="2"` | inline `border-top/left/right/bottom` cùng hex | `bgcolor` + `style="background: #…"` |
| HTML StarWriter từ FODT | như trên | như trên | như trên | như trên |
| `_normalizeImportedHtml` (extract `<body>`) | còn | còn | còn (inline trên td/th) | còn |
| Canvas Playwright sau `adapter.open()` | `rowSpan=2` / `colSpan=2` | như trái | computed RGB khớp 4 cạnh ô `980.000.000` | computed RGB khớp 4 ô |

HTML thật nhận được (rút gọn, đo từ DOCX):

```html
<table width="100%" cellpadding="5" cellspacing="0">
  <tr>
    <th rowspan="2" bgcolor="#fef3c7"
        style="background: #fef3c7; border-left: 2.25pt solid #b45309; …">
      Nhóm dự án thủy lợi</th>
    <th colspan="2" bgcolor="#dbeafe"
        style="background: #dbeafe; border-top: 1.50pt solid #1d4ed8; …">
      Phân bổ ngân sách năm 2026</th>
  </tr>
  …
  <td style="border-top: 1.50pt solid #1d4ed8; border-bottom: 1.50pt solid #6d28d9;
             border-left: 1.50pt solid #15803d; border-right: 1.50pt solid #b91c1c;">
    980.000.000</td>
</table>
```

Kết luận đo:

- **Khác Track Changes / Comments. Giống Header/Footer / Footnotes.** Filter `HTML (StarWriter)` **không** flatten bảng phức tạp. Nó emit `<table>` chuẩn với `rowspan`/`colspan` và **inline** border/background trên từng ô.
- Chữ trong ô **không** mất. Merge HTML đúng (10 ô DOM, không nhân `w:vMerge continue`).
- `.vno-writer-page td { border: 1px solid #94a3b8 }` **không** đè viền màu: inline per-edge thắng cascade (đo computed style, ô `980.000.000` bốn cạnh bốn màu, **không** ra `rgb(148, 163, 184)`).
- **Không** cần sidecar `word/document.xml` qua `main.py` cho bảng. Sidecar chỉ cần nếu một filter HTML sau này **bỏ** inline style / merge — hiện StarWriter không bỏ.
- Adapter **không** có nhánh parse `<table>` riêng trước task này; extract `<body>` đã đủ vì style nằm inline trong body, không nằm class ở `<head>`.

## IMPLEMENTATION SUMMARY

Không viết lại import Writer sang OOXML. Không sửa `main.py`. Không sửa Core.

1. Khóa hiện trạng bằng fixture + probe + unit/live/python tests (trước/sau giống nhau vì không có regress).
2. Ghi chú trong `WriterAdapter._normalizeImportedHtml`: bảng phức tạp được StarWriter giữ bằng inline style; không flatten; không cần sidecar.
3. Không đổi `insertTable()` phiên (vẫn lưới cơ bản) — không giả merge/shading UI.

**Không sửa `main.py`.** Không thêm `ooxmlTableXml`.

Không đụng `apps/sheet/**`, `apps/slides/**`, adapter Sheet/Slides. Không merge `main`.

## FILES CHANGED

- `adapters/libreoffice/writer/writer-adapter.js` — docstring `_normalizeImportedHtml` (bảng StarWriter giữ inline)
- `tests/fixtures/real-office-samples/src/sample-writer-tables.fodt`
- `tests/fixtures/real-office-samples/sample-writer-tables.docx`
- `tests/scripts/generate-real-office-fixtures.mjs` + README fixture
- `tests/scripts/probe-writer-tables-import.mjs` — probe HTML vs OOXML
- `tests/unit/writer-tables-import.test.js`
- `tests/live/writer-tables-import.playwright.mjs`
- `tests/test_writer_tables_import.py`
- `tests/run-tests.js` — suite 77
- `docs/FEATURE-PARITY-ROADMAP.md`
- `docs/HANDOFF-WRITER-TABLES-IMPORT-FIDELITY.md`

Không đụng Sheet/Slides.

## COMMANDS RUN

- `node tests/scripts/probe-writer-tables-import.mjs` — đo FODT → DOCX → HTML StarWriter
- `node --check adapters/libreoffice/writer/writer-adapter.js`
- `node tests/run-tests.js`
- `python -m unittest tests.test_writer_tables_import tests.test_writer_footnotes_import tests.test_writer_headerfooter_import -v`
- `node tests/live/writer-tables-import.playwright.mjs`
- `git diff --check`

## BUILD RESULT

PASS — repo không có bước build; `node --check` Writer adapter PASS.

## TEST RESULTS

| Suite | Result | Ghi chú |
| --- | --- | --- |
| `node tests/run-tests.js` | **PASS** 810/810, 0 FAIL, **51.45s** (< 60s) | Gồm 4 test import Tables |
| `python -m unittest tests.test_writer_tables_import -v` | **PASS** 3/3 | ZIP native `w:tbl` + `open_document_dialog(initial_file)` soffice thật, không SendKeys |
| `python -m unittest` footnotes + headerfooter | **PASS** 6/6 | Regression |
| Playwright Edge `tests/live/writer-tables-import.playwright.mjs` | **PASS** | File → Mở qua adapter; `rowSpan=2` / `colSpan=2`; nền `#fef3c7` `#dbeafe` `#dcfce7` `#fecaca`; viền ô 980.000.000 bốn màu `#1d4ed8` `#15803d` `#b91c1c` `#6d28d9`; không bị `#94a3b8` đè |

Không claim PASS cho test chưa chạy. Không disable test.

## KNOWN FAILURES

Không có failure trong phạm vi đã chạy.

## RISKS / GIỚI HẠN CÒN LẠI

Đây **không** phải mất dữ liệu trên đường HTML hiện tại. Giới hạn thật còn lại:

1. **Mô hình HTML `<table>` ≠ Word table đầy đủ.** Không diễn tả: diagonal border (`w:tl2br` / `w:tr2bl`), theme table style / `tblLook` banded rows nếu không được LO materialize thành `w:shd` từng ô, text wrap quanh bảng floating, table style identity (Table Grid vs List Table 3). Fixture này không có diagonal — không đo.
2. **`border-collapse: collapse` trên `.vno-writer-page table`.** Hai ô kề chia một cạnh; browser chọn viền thắng (thường cạnh dày hơn). Word vẽ độc lập từng `w:tcBorders`. Với fixture, cạnh 1.50pt thắng 1px nên bốn màu ô `980.000.000` vẫn hiện đúng — bảng dày đặc màu khác nhau từng cạnh chung có thể trông khác Word.
3. **`<head>` CSS bị bỏ khi extract `<body>`.** LibreOffice 26.2 **inline** border/shading trên `td`/`th` nên không mất. Head chỉ còn `td p` / `th p` (font). Nếu một bản LO sau chuyển cell chrome sang class-only, tô/viền sẽ biến mất trừ khi adapter inline stylesheet. Test snapshot khóa hành vi inline hiện tại.
4. **Độ rộng cột.** StarWriter emit `col width="93*"` (cú pháp Netscape). Browser có thể bỏ qua — độ rộng cột không cam kết khớp mm với Word.
5. **Độ dày viền bị làm tròn px.** `2.25pt` → computed `3px`; `1.50pt` → `2px`. Đúng CSS, không phải mất màu.
6. **Chèn bảng phiên vẫn cơ bản.** `insertTable()` không có UI merge/shading/per-edge. Import đọc được; người dùng chưa tạo lại được trong phiên.
7. **Chỉ đo DOCX qua HTML.** Mở `.odt`/`.fodt` trực tiếp vẫn đi cùng filter HTML — probe FODT→HTML cũng giữ merge/border/shading.
8. **Xuất DOCX vẫn HTML→LibreOffice**, không ghi lại native `w:tbl` giống file nguồn. Không giả vờ round-trip OOXML.
9. Playwright không điều khiển hộp thoại native (SendKeys cấm). Live test chạy **cùng** soffice HTML convert như `main.py` và stub `openRealFile`. Python unittest gọi thật `open_document_dialog()` với `initial_file`.

## DEPENDENCIES/BLOCKERS

Không dependency mới, không thư viện trả phí. Không blocker. Không CORE PATCH.

CORE PATCH ID (if any): Không có — không sửa LibreOffice Core.

## NEXT ACTION

- **Không merge vào `main`.** Review trên `fix/writer-tables-import-fidelity`.
- Follow-up riêng (không làm trong task này): UI merge/shading cho bảng phiên; inline class-based table CSS nếu LO đổi export; diagonal borders; round-trip native `w:tbl` khi save.
