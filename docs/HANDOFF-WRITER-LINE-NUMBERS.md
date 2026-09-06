# Agent Handoff

TASK: Writer Line Numbers (GAP Ribbon Parity Round 1 mục 1)
AGENT/ROLE: Grok (coding agent), worktree riêng, không đụng Sheet/Slides source, không merge main.
BRANCH: `feature/writer-line-numbers`
WORKTREE: `E:\VNOffice-grok-writer-line-numbers`
BASE: `main` @ `5075423` — đo thật `node tests/run-tests.js` **1288/1288 PASS** trước khi làm.
**KHÔNG merge tự động vào main** — người phụ trách đọc lại trước.

## Bối cảnh

VN Writer chưa có Line Numbers (danh số dòng lề trái) — tính năng Word dùng cho văn bản hành chính/pháp lý Việt Nam (trích dẫn theo số dòng). GAP ghi trong `docs/HANDOFF-WRITER-RIBBON-PARITY-ROUND1.md` mục 1.

Đo engine + ODF/DOCX trước khi viết code: `docs/HANDOFF-WRITER-LINE-NUMBERS-FINDINGS.md` (commit `c6d02ab`, trước mọi thay đổi adapter/UI).

## Quyết định mặc định

**Không vẽ số dòng trên canvas VN Writer.** Lưu cấu hình + serialize ODF chuẩn; Word/LibreOffice tự vẽ số khi mở file.

Lý do đo được (FINDINGS):

- Canvas là `contenteditable` một tờ A4 kéo dài. Live pagination đo **khối** `offsetHeight`, không tách visual line qua ranh trang.
- `getClientRects()` ra số **sai** so với Word đúng chỗ tính năng tồn tại (trích dẫn pháp lý).
- Probe soffice 26.2.5: FODT `text:linenumbering-configuration` → DOCX `<w:lnNumType>` đúng `countBy` / `restart`.

UI **nói thẳng**: badge lề trái + Help — số hiện khi mở bằng Word/LibreOffice; canvas chỉ hiện trạng thái bật.

## Implementation summary

### Lưu trữ + lệnh

- `this.lineNumbers = { enabled, countBy, restart }` document-level (khớp UNO `XLineNumberingProperties` / ODF; cùng lớp watermark/pageColor).
- `restart`: `"continuous"` | `"page"` | `"section"`. `countBy` mặc định 1 (UI đợt này không đổi N).
- `writer.layout.lineNumbers` nhận `"none"` | `"continuous"` | `"restartPage"` | `"restartSection"`.
- UNO: `.uno:LineNumberingDialog`. Undo/redo qua snapshot field `lineNumbers`.

### UI

- Tab **Bố cục**, nhóm Thiết lập trang, **sau** dropdown Ngắt trang (thứ tự Word: Margins · Orientation · Size · Columns · Breaks · Line Numbers).
- `type: "select"` compact (không `isLarge`) để giữ 0px tràn 1280px.
- Badge `.vno-line-numbers-indicator` trên `.vno-writer-page` khi bật — không nằm trong `bodyDom`, không vào FODT.

### FODT

- Tắt: omit `text:linenumbering-configuration` (không so canonical LO, LO luôn thêm `number-lines="false" increment="5"`).
- Bật: `office:styles` gộp với notes-configuration nếu có. **Bắt buộc** `text:increment="1"` — omit thì soffice ra `w:countBy="5"`.
- Liên tục: không `restart-on-page`. Mỗi trang: `text:restart-on-page="true"`.
- Mỗi mục: XML giống liên tục + `office:meta` `meta:user-defined name="vnd.vn-office.line-numbers-restart"=section` (probe: soffice canonical **giữ** meta; DOCX vẫn `restart="continuous"`).
- Parse: omit `number-lines` = on; `false` = off; thiếu increment khi on = 5 (default LO).

### Help

Bài `writer.layout.lineNumbers` tiếng Việt: vị trí ribbon, 4 lựa chọn, canvas không vẽ số, giới hạn «Mỗi mục» trên DOCX soffice.

## FILES CHANGED

- `platform/commands/command-definitions.js` — lệnh mới.
- `platform/i18n/strings-vi.js` / `strings-en.js` — label/tooltip.
- `adapters/libreoffice/common/command-dispatch-mapper.js` — UNO map.
- `apps/writer/writer-ribbon.js` — select Layout Page Setup.
- `platform/ui-kit/icons.js` — `lineNumbers`.
- `platform/help/entries-writer.js` — bài hướng dẫn.
- `adapters/libreoffice/writer/writer-adapter.js` — model, lệnh, serialize/parse, undo, badge.
- `apps/writer/writer.css` — badge lề trái.
- `tests/unit/writer-line-numbers.test.js` — mới, 12 test.
- `tests/live/writer-line-numbers-real-conversion.mjs` — soffice DOCX XML.
- `tests/scripts/probe-writer-line-numbers.mjs` — đo trước code.
- `tests/run-tests.js` — suite 118.
- `docs/HANDOFF-WRITER-LINE-NUMBERS-FINDINGS.md` — đo trước code.
- `docs/HANDOFF-WRITER-LINE-NUMBERS.md` — file này.

Không đụng Sheet/Slides, Core, build system, `save()`/`exportPdf()` đường HTML.

## COMMANDS RUN

```
node tests/run-tests.js
node tests/live/writer-line-numbers-real-conversion.mjs
node tests/live/ribbon-audit-1280.playwright.mjs
node tests/scripts/probe-writer-line-numbers.mjs
```

(Audit 1280 chạy cổng 8893; không bị chiếm.)

## TEST RESULTS

- Baseline trước task: **1288/1288 PASS** @ `5075423`.
- Sau task: `node tests/run-tests.js` **1300/1300 PASS** (100%). 12 test mới, 0 fail. Không disable / nuốt exception.
- Live soffice LibreOffice 26.2.5: FODT VN → DOCX, unzip `word/document.xml`:
  - tắt → không có `<w:lnNumType>`
  - Liên tục → `w:countBy="1" w:restart="continuous" w:distance="65535"`
  - Mỗi trang → `w:countBy="1" w:restart="newPage" w:distance="65535"`
  - Mỗi mục → `w:restart="continuous"` (soffice không xuất `newSection`)
  - serialize → parse → serialize byte-identical trước convert.
- `node tests/live/ribbon-audit-1280.playwright.mjs`: **104/104 PASS**, 0px tràn ngang VI+EN, 1280×800 và 1280×720. Tab Layout Writer sum 1005px (VI) / 1028–1092px (EN).

## SOFFICE / XML THẬT (không đoán)

Probe 11 FODT tay + live test serializer cùng kết quả. `w:distance="65535"` = auto khi không ghi `text:offset`. 0.5cm → 283 twips. Canonical LO omit `text:number-lines` khi on; thêm config tắt + `increment="5"` khi file không có config. Idempotence VN không so canonical LO.

## Rủi ro / giới hạn còn lại

- Canvas / Print Preview **không** vẽ số dòng visual.
- Restart Each Section không có trong ODF/LO; DOCX qua soffice thành continuous. VN giữ mode qua `office:meta`.
- Không có per-section config khác nhau (soffice copy cùng `lnNumType` mọi `sectPr`).
- Không có dialog count-every-N / Suppress for Current Paragraph / Hyphenation.
- Không vá DOCX `w:restart="newSection"` (Writer chưa có pipeline post-process như Sheet/Slides).

## Rollback

Không merge. Xóa worktree / không lấy branch. Không đụng main.

## Handoff cho người phụ trách

1. Đọc FINDINGS rồi file này.
2. Soát UI tab Bố cục: select Danh số dòng sau Ngắt trang; badge khi bật; Help F1.
3. Mở FODT đã bật bằng Word/LibreOffice thật để thấy số ở lề trái.
4. Quyết định merge `feature/writer-line-numbers` khi sẵn sàng.
5. GAP Round 1 còn: Hyphenation, Selection Pane, Multilevel List.
