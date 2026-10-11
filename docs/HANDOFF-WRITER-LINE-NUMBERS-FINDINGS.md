# Writer Line Numbers — đo thật trước khi viết code

**KHÔNG phải implementation.** File này ghi sự thật đã đo: cơ chế phân trang/render của VN Writer (không phải canvas vẽ từng dòng), cấu trúc ODF `text:linenumbering-configuration` / OOXML `w:lnNumType`, và kết quả soffice → DOCX XML thật (unzip, không đoán). Agent tiếp theo đọc file này rồi làm serializer/UI, không đo lại từ đầu.

- AGENT: Grok
- BRANCH: `feature/writer-line-numbers`
- WORKTREE: `E:\VNOffice-grok-writer-line-numbers`
- BASE: `main` @ `5075423` — `node tests/run-tests.js` đo thật **1288/1288 PASS**
- SOFFICE: `C:\Users\3T Computer\tools\libreoffice\program\soffice.exe` — LibreOffice **26.2.5** (`version.ini` Vendor=The Document Foundation, buildid `cd7284b4cbbfeb507e630c1aac019f4157393acb`)
- Probe: `tests/scripts/probe-writer-line-numbers.mjs` (11 FODT tay, mỗi cái convert DOCX + canonical FODT)
- Nguồn GAP: `docs/HANDOFF-WRITER-RIBBON-PARITY-ROUND1.md` mục 1 (Line Numbers)
- **Chưa sửa** `writer-adapter.js` / ribbon / command-definitions.

---

## 0. Writer UI thật — phân trang / render (không đoán)

Không có file engine vẽ dòng. Toàn bộ nằm trong `adapters/libreoffice/writer/writer-adapter.js` + CSS `apps/writer/writer.css`. `apps/writer/writer-view-controller.js` **chỉ** zoom / ruler / web-layout / read-mode — không đếm dòng, không phân trang.

### 0.1 Canvas = một `contenteditable` kéo dài, không phải từng trang canvas

`.vno-writer-page`:

- Rộng 794px, `min-height` 1123px (một tờ A4), **không** `max-height`.
- `padding: 75px 56px 75px 113px` (lề NĐ 30: 20/15/20/30 mm).
- `line-height: 1.4`, `font-size: 14pt`.
- Zoom: `transform: scale(...)` trên `.vno-writer-page` (`WriterViewController._applyViewState`).

Khi nội dung dài hơn 1 trang, tờ giấy **kéo dài vô hạn** thành một khối. Live pagination **không** cắt đoạn văn thành hai trang.

### 0.2 Live pagination = đo **khối** (`offsetHeight`), không đo dòng visual

`_recomputeLivePagination()` (debounce 250ms, lắng `input`):

1. Xóa dải `[data-vno-auto-page-gap="true"]`.
2. Lặp `bodyDom.children`.
3. Ngắt trang thủ công (`page-break-before` / chữ “Phân tách trang”) → reset `currentHeight`, tăng `pageCount`.
4. Nếu `currentHeight + el.offsetHeight > availableHeightPx` → chèn `.vno-page-auto-gap` **trước cả khối**, đưa **cả khối** sang “trang” sau.
5. Dispatch `vno-pagination-updated`.

Giới hạn **đã ghi trong code** (không phải suy đoán): một khối đơn lẻ cao hơn 1 trang (bảng/ảnh lớn, đoạn wrap rất dài) **không** bị tách nhỏ hơn. Header/footer **không** lặp trên từng trang sống.

`paginateContent()` (Print Preview) cùng mô hình: đo `offsetHeight` từng child, fallback ước lượng `ceil(text.length / charsPerLine) * 26 + 10`. Cũng **không** tách visual line.

Dải gap bị loại khỏi Undo (`_stripAutoPageGaps`) và xuất file (`_stripSessionMarkup`) — dữ liệu suy ra, không phải nội dung.

### 0.3 “Đếm dòng” hiện có ≠ dòng visual Word

`apps/writer/word-count.js`: `lines = raw.split(/\n/).length` (hoặc override). Đó là **đoạn / ngắt dòng cứng**, không phải dòng sau wrap.

Không có `Range` / `getClientRects()` / overlay số dòng trong codebase.

### 0.4 `getClientRects()` — đo khả thi, kết luận không dùng để vẽ số

Có thể lấy visual line bằng `Range.selectNodeContents(textNode).getClientRects()`. Trên lý thuyết:

- Lề trái 113px đủ chỗ đặt số.
- Phải chạy lại mỗi `input`, zoom (`transform`), chèn gap, đổi font/cột.

**Vì sao không vẽ số trên canvas VN Writer (quyết định, có lý do đo được):**

1. **Sai so với Word/LO đúng chỗ tính năng tồn tại.** Văn bản hành chính/pháp lý trích dẫn theo số dòng. Writer **không tách đoạn qua ranh trang** — một `<p>` wrap 40 dòng nằm gần cuối trang vẫn là một khối; Word cắt giữa dòng visual. Số vẽ bằng `getClientRects()` + gap khối **không trùng** số Word/LO, đặc biệt Restart Each Page.
2. Phân trang sống là **block-level**. Restart Each Page trên canvas sẽ restart ở gap khối, không phải dòng đầu trang thật.
3. Cột CSS (`column-count`), bảng, ảnh, zoom `scale()`, gap 64px — overlay tuyệt đối lệch ngay khi bất kỳ cái nào đổi.
4. Hiệu năng: tài liệu pháp lý 50–200 trang → hàng nghìn rect mỗi lần gõ (debounce 250ms vẫn giật). Không có hạ tầng đo dòng sẵn để tái sử dụng.
5. **Engine thật tự tính số.** ODF/DOCX chỉ lưu cấu hình; Word/LibreOffice vẽ số khi mở/in. Đây là cách làm đúng định dạng.

Vẽ số sai trên canvas gây hiểu nhầm nghiêm trọng hơn là không vẽ. UI **phải** nói rõ: canvas VN Writer hiện trạng thái bật/tắt, **không** vẽ số ở lề; số thật hiện khi mở file bằng Word/LibreOffice (và khi in qua engine đó).

### 0.5 Pattern sẵn có để lưu cấu hình tài liệu

| Việc | API đã có | Ghi chú |
|---|---|---|
| Cấu hình trang/mục | `this.pageSetup` + `this.sectionPageSetups` | Geometry. Line numbers **không** thuộc khổ giấy. |
| Cấu hình cả tài liệu | `this.watermark`, `this.pageColor`, `this.columns` | Cùng lớp với line numbering LibreOffice (document-level). |
| Undo | `_createSnapshot` / `_restoreSnapshot` | Phải thêm field `lineNumbers`. |
| `office:styles` FODT | `_fodtNotesConfigurationXml()` | Chỉ emit khi có note. Line numbering **cùng** `office:styles`, phải gộp, không tạo hai khối. |
| Lệnh nhận args từ `<select>` | `createSelect` → `execute(commandId, val)` | Pattern `writer.para.spacingBefore`. |

LibreOffice UNO: `XLineNumberingProperties` trên **document**, không per-section. Word `w:lnNumType` nằm trong từng `w:sectPr`, nhưng soffice **copy cùng một** `lnNumType` sang mọi section (đo case 2 master-page).

---

## 1. DOCX / ODF chuẩn — đo soffice 26.2.5

### 1.1 ODF 1.3 `text:linenumbering-configuration`

Nằm trong `office:styles` (không phải automatic-styles). Import: `XMLLineNumberingImportContext` (family `TEXT_LINENUMBERINGCONFIG`). Export: `XMLLineNumberingExport`.

Thuộc tính engine đọc/ghi (đo từ source + probe):

| ODF | UNO | Mặc định import |
|---|---|---|
| `text:number-lines` | `IsOn` | **true nếu omit**; chỉ ghi `false` khi tắt |
| `text:increment` | `Interval` | nếu omit → LO default **5** |
| `text:restart-on-page` | `RestartAtEachPage` | false nếu omit |
| `text:offset` | `Distance` | 0 / auto |
| `text:number-position` | `NumberPosition` | left |
| `style:num-format` | `NumberingType` | `1` (Arabic) |
| `text:count-empty-lines` | `CountEmptyLines` | true nếu omit |
| `text:count-in-text-boxes` | `CountLinesInFrames` | false nếu omit |

**Không có** thuộc tính ODF “restart each section”. Word `w:restart="newSection"` khi import LO bị map `RestartAtEachPage = (nLnc == newPage)` → **newSection thành continuous**.

### 1.2 OOXML `w:lnNumType` trong `w:sectPr`

ECMA-376: `w:countBy`, `w:restart` (`continuous` \| `newPage` \| `newSection`), `w:distance` (twips), `w:start` (0-based).

LibreOffice export (`DocxAttributeOutput::SectionLineNumbering`):

- `countBy` = `GetCountBy()`
- `restart` = `IsRestartEachPage() ? "newPage" : "continuous"` — **không bao giờ ghi `newSection`**
- `distance` nếu có
- `start` nếu restart number > 0

### 1.3 Bảng đo thật (FODT tay → soffice DOCX `word/document.xml`)

| FODT input | DOCX `w:lnNumType` | Canonical FODT |
|---|---|---|
| không có linenumbering-configuration | **không có** `lnNumType` | LO **thêm** `text:number-lines="false"` `text:offset="0.499cm"` `text:increment="5"` `style:num-format="1"` `text:number-position="left"` |
| `number-lines="true" increment="1"` (không restart-on-page) | `w:countBy="1" w:restart="continuous" w:distance="65535"` | omit `number-lines` (nghĩa là on), `increment="1"`, `num-format="1"`, `number-position="left"` |
| thêm `restart-on-page="true"` | `w:restart="newPage"` `countBy="1"` `distance="65535"` | giữ `text:restart-on-page="true"` `increment="1"` |
| `increment="5"` | `w:countBy="5"` `restart="continuous"` | `increment="5"` |
| `number-lines="false" increment="1"` | **không có** `lnNumType` | giữ `number-lines="false"` `increment="1"` |
| omit `text:number-lines` (còn increment=1) | **ON**, `countBy="1"` `continuous` | giống case on |
| omit `text:increment` (còn number-lines=true) | `w:countBy="5"` — **default LO** | `increment="5"` |
| `text:offset="0.5cm"` | `w:distance="283"` (0.5cm → twips) | `text:offset="0.499cm"` |
| `count-empty-lines="false"` | `lnNumType` vẫn có (DOCX không có attr này) | giữ `text:count-empty-lines="false"` |
| 2 master-page + increment=1 | **cả 2** `w:sectPr` cùng `countBy="1" restart="continuous" distance="65535"` | một config document-level |
| `office:meta` `meta:user-defined name="vnd.vn-office.line-numbers-restart"` = `section` | DOCX vẫn `restart="continuous"` | **meta còn nguyên** `section` |

`w:distance="65535"` = auto (không ghi `text:offset`). 0.5cm = 283 twips (`0.5 / 2.54 × 1440 ≈ 283`).

### 1.4 Hệ quả bắt buộc cho serializer VN

- **Bắt buộc** ghi `text:increment="1"` khi bật — omit thì soffice ra `countBy="5"` (sai Word, sai trích dẫn pháp lý).
- Tắt: **omit** cả phần tử (giống file VN hiện tại). Parse: thiếu phần tử hoặc `number-lines="false"` → off. Canonical LO luôn thêm phần tử tắt + increment=5 — **idempotence VN không so file canonical LO**.
- Bật liên tục: `text:number-lines="true" text:increment="1" text:number-position="left" style:num-format="1"`. Không ghi `restart-on-page` (false). Không ghi `offset` → DOCX `distance="65535"` auto.
- Bật mỗi trang: thêm `text:restart-on-page="true"`.
- Parse: omit `number-lines` + có phần tử → **on** (đúng LO). `increment` thiếu → coi 5 khi đọc file LO; VN tự luôn ghi 1 khi user bật từ UI.
- `office:styles` gộp với `text:notes-configuration` nếu cả hai có.

### 1.5 Restart Each Section

ODF/LO **không** có mode này. soffice **không** xuất `w:restart="newSection"`.

Probe: `office:meta` `meta:user-defined meta:name="vnd.vn-office.line-numbers-restart"` **sống sót** canonical FODT. Dùng side-channel này để VN serialize→parse giữ mode `section`. DOCX qua soffice vẫn `continuous` — Help phải nói thật.

Không vá DOCX Writer trong đợt này (chưa có pipeline post-process Writer như Sheet/Slides).

---

## 2. Quyết định thiết kế (ghi rõ lý do)

**Phương án: lưu cấu hình + serialize ODF/DOCX chuẩn. Không vẽ số dòng trên canvas VN Writer.**

Lý do đo được:

1. Canvas không phải layout engine dòng; phân trang khối; `getClientRects()` ra số **sai** so với Word đúng use-case pháp lý.
2. File xuất đúng chuẩn thì Word/LibreOffice tự vẽ số — đó là hành vi engine thật.
3. Probe đã chứng minh FODT tay → `w:lnNumType` đúng `countBy` / `restart`.

| Lớp | Hành vi |
|---|---|
| Model | `this.lineNumbers = { enabled: false, countBy: 1, restart: "continuous" }` — **document-level** (khớp LO/ODF; watermark/pageColor). Không nhét vào `pageSetup` (geometry). `restart`: `"continuous"` \| `"page"` \| `"section"`. |
| FODT tắt | omit `text:linenumbering-configuration` |
| FODT bật liên tục | config + `increment="1"`, không `restart-on-page` |
| FODT bật mỗi trang | thêm `restart-on-page="true"` |
| FODT bật mỗi mục | XML ODF giống liên tục + `office:meta` user-defined `section` |
| Canvas | indicator rõ (ribbon select + badge/status): “Danh số dòng: Liên tục/Mỗi trang/Mỗi mục — số hiện khi mở bằng Word hoặc LibreOffice” |
| Undo | field `lineNumbers` trong snapshot |
| countBy UI đợt này | luôn 1 (đúng Word “Line Numbers” 4 mục). Model vẫn giữ `countBy` để parse file LO `increment≠1`. |

**Không** mặc định bật. Tài liệu cũ không có config → off.

---

## 3. Ánh xạ implementation (chưa làm code)

### 3.1 Command

Một lệnh nhận args (pattern spacing), không tách 4 id:

`writer.layout.lineNumbers` — `"none"` \| `"continuous"` \| `"restartPage"` \| `"restartSection"`

UNO map: `.uno:LineNumberingDialog` (`FN_LINE_NUMBERING_DLG` trong `swriter.sdi`). Dispatch vẫn đi `WriterAdapter`.

### 3.2 UI tối thiểu

Tab **Bố cục**, nhóm **Thiết lập trang**, **sau** dropdown Ngắt trang — đúng thứ tự Word: Margins · Orientation · Size · Columns · Breaks · **Line Numbers** · (Hyphenation vẫn GAP).

`type: "select"` compact (không `isLarge`) — hiện giá trị khi đóng, hạn chế tràn 1280px (cùng lý do spacing không lên Home).

Option:

- `none` — Không có
- `continuous` — Liên tục
- `restartPage` — Mỗi trang
- `restartSection` — Mỗi mục

`ariaLabel`: «Danh số dòng».

Badge/status trên canvas khi `enabled`: chữ rõ là **cấu hình xuất file**, không phải số đã vẽ ở lề.

### 3.3 FODT serialize / parse

`serializeToFodt`:

1. Build `office:styles` children: notes-configuration (nếu có note) + linenumbering-configuration (nếu enabled).
2. Enabled: `text:number-lines="true" text:increment="{countBy}" text:number-position="left" style:num-format="1"` + `text:restart-on-page="true"` khi `restart==="page"`.
3. `restart==="section"`: thêm `office:meta` trước styles, `xmlns:meta` trên `office:document`.

`parseFodt`:

1. Đọc `text:linenumbering-configuration` trong XML (cả office:styles).
2. `number-lines="false"` hoặc không có phần tử → `{ enabled: false, countBy: 1, restart: "continuous" }`.
3. On: `countBy` từ `text:increment` (mặc định 5 nếu thiếu — file LO); `restart` page nếu `restart-on-page="true"`, else continuous; nếu meta `section` thì `restart="section"`.

Idempotence VN = output VN, không so canonical LO.

### 3.4 Help / i18n (AGENTS.md §10)

- `strings-vi.js` / `strings-en.js` cho lệnh mới (test i18n duyệt mọi `WRITER_COMMANDS`).
- Bài help tiếng Việt: tab Bố cục / nhóm Thiết lập trang; 4 lựa chọn; **nói thẳng canvas không vẽ số ở lề trái**; số hiện khi File mở bằng Microsoft Word hoặc LibreOffice Writer; “Mỗi mục” chỉ chắc trên canvas VN + FODT VN, DOCX qua soffice thành Liên tục.

### 3.5 Ngoài scope

- Vẽ số visual trên canvas / Print Preview
- Hyphenation
- Suppress for Current Paragraph
- Dialog “Line Numbering Options” (count every N, from text, start at)
- Per-section config khác nhau (ODF không có; soffice copy cùng lnNumType)
- Vá `w:restart="newSection"` sau soffice
- Core/upstream patch
- Merge `main`

---

## 4. Kế hoạch test (sẽ chạy, chưa chạy ở bước findings)

- Unit: lệnh + ribbon Layout select; serialize FODT đúng config; tắt = omit; increment=1 bắt buộc; restart page; restart section + meta; parse omit-number-lines = on; parse number-lines=false = off; serialize→parse→serialize byte-identical; snapshot undo.
- Live soffice: FODT VN → DOCX unzip `word/document.xml` assert `w:lnNumType` `countBy` / `restart` (continuous / newPage). Tắt → không có lnNumType. (Không assert `newSection` — soffice không xuất.)
- `node tests/run-tests.js` 100% PASS.
- `node tests/live/ribbon-audit-1280.playwright.mjs` 100% PASS (cổng 8894 nếu 8893 bị đợt Sheet Ribbon chiếm).

Rollback: revert branch, không merge.


> **Correction 2026-09-14 (Claude):** every MYTIME page count in this document was measured with Word COM ComputeStatistics(wdStatisticPages), which is wrong in a hidden window (it reports 88 for a 44-page document). Word's PDF export of the original MYTIME has **44** pages; the edited-save output currently has **73** (43 section breaks lost). Use _word_oracle3.ps1 (PDF-based) going forward. See HANDOFF-WRITER-SAVE-SECTIONS*.md.
