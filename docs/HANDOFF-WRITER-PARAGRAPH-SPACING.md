# Agent Handoff

TASK: Writer Paragraph Spacing Before/After (GAP Ribbon Parity Round 1 mục 4)
AGENT/ROLE: Grok (coding agent), worktree riêng, không đụng Sheet/Slides source, không merge main.
BRANCH: `feature/writer-paragraph-spacing-before-after`
WORKTREE: `E:\VNOffice-grok-writer-paragraph-spacing`
BASE: `main` @ `5458c0f` — đo thật `node tests/run-tests.js` **1277/1277 PASS** trước khi làm.
**KHÔNG merge tự động vào main** — người phụ trách đọc lại trước.

## Bối cảnh

VN Writer đã có Giãn dòng 1.0/1.5/2.0 (`line-height`) nhưng chưa có Spacing Before/After theo pt — tính năng căn/định dạng đoạn cơ bản của Word, ảnh hưởng in ấn. GAP ghi trong `docs/HANDOFF-WRITER-RIBBON-PARITY-ROUND1.md` mục 4.

Đo engine trước khi viết code: `docs/HANDOFF-WRITER-PARAGRAPH-SPACING-FINDINGS.md` (commit `3f67568`, trước mọi thay đổi adapter/UI).

## Quyết định mặc định

**Không** gắn Word Normal 0pt before / 8pt after lên mọi đoạn.

- Lưu trữ/FODT khi user chưa chọn: omit (không `fo:margin-*` → soffice không ghi `w:spacing`).
- Canvas stylesheet giữ `.vno-writer-page p { margin: 0 0 6pt 0 }` (visual sẵn có).
- User chọn preset (kể cả 0 pt) → inline `margin-top`/`margin-bottom` bằng **pt**, persist FODT.
- Lý do: 8pt after trên mọi `<p>` đổi layout toàn bộ tài liệu cũ và phá idempotence Phase A–E. soffice đo: đoạn không margin thì không có `<w:spacing>`.

Preset UI: **0 / 6 / 8 / 12 / 18 pt** (6 khớp visual canvas; 8 khớp Word Normal).

## Implementation summary

### Lưu trữ + lệnh

- CSS inline `margin-top` / `margin-bottom` đơn vị `pt` trên block đoạn.
- Áp dụng qua `_applyParagraphVisualStyle` (pattern shading/borders), không copy `_setLineHeight`.
- `writer.para.spacingBefore` / `writer.para.spacingAfter` nhận args `"0"|"6"|"8"|"12"|"18"` (pattern `writer.para.borders`).
- UNO: `.uno:ParSpaceBefore` / `.uno:ParSpaceAfter` (dispatch vẫn đi WriterAdapter).

### UI

- Tab **Bố cục**, nhóm Đoạn văn: hai `type: "select"` compact (pattern viền đoạn). Nhãn option `Trước: N pt` / `Sau: N pt`.
- **Không** thêm control lên hàng 2 tab Home (tránh tràn 1280px).
- Menu Giãn dòng 1.0/1.5/2.0 giữ nguyên (line-height, khác thuộc tính).

### FODT

- Registry `paragraphStyles` cũ: thêm key `marginTop` / `marginBottom`.
- Emit `fo:margin-top` / `fo:margin-bottom` trên `style:paragraph-properties` (cùng `paraProps` với `fo:text-align`).
- `_fodtCssMap` nới `margin-top`/`margin-bottom`; **không** nới shorthand `margin` hay `margin-left`/`right`.
- Parse nhận pt/px/cm/mm/in → pt. Idempotence VN = output pt, không so canonical LO (cm).
- `0pt` tường minh được emit và parse lại (đè CSS 6pt).

### Help

Bài `writer.para.spacingBeforeAfter` tiếng Việt: tab Bố cục / nhóm Đoạn văn, phân biệt rõ với Giãn dòng.

## FILES CHANGED

- `platform/commands/command-definitions.js` — 2 lệnh mới.
- `platform/i18n/strings-vi.js` / `strings-en.js` — label/tooltip.
- `adapters/libreoffice/common/command-dispatch-mapper.js` — UNO map.
- `apps/writer/writer-ribbon.js` — hai select trên Layout.
- `platform/help/entries-writer.js` — bài hướng dẫn.
- `adapters/libreoffice/writer/writer-adapter.js` — apply + serialize/parse.
- `tests/unit/writer-paragraph-spacing.test.js` — mới, 11 test.
- `tests/live/writer-paragraph-spacing-real-conversion.mjs` — soffice DOCX twips.
- `tests/scripts/probe-writer-paragraph-spacing.mjs` — đo trước code.
- `tests/run-tests.js` — suite 117.
- `docs/HANDOFF-WRITER-PARAGRAPH-SPACING-FINDINGS.md` — đo trước code.
- `docs/HANDOFF-WRITER-PARAGRAPH-SPACING.md` — file này.

Không đụng Sheet/Slides, Core, build system, `save()`/`exportPdf()` đường HTML.

## COMMANDS RUN

```
node tests/run-tests.js
node tests/live/writer-paragraph-spacing-real-conversion.mjs
node tests/live/ribbon-audit-1280.playwright.mjs
node tests/scripts/probe-writer-paragraph-spacing.mjs
```

(Audit 1280 chạy cổng 8894 vì 8893 đang bị đợt Ribbon song song chiếm; file audit không đổi.)

## TEST RESULTS

- Baseline trước task: **1277/1277 PASS** @ `5458c0f`.
- Sau task: `node tests/run-tests.js` **1288/1288 PASS** (100%). 11 test mới, 0 fail. Không disable / nuốt exception.
- Live soffice LibreOffice 26.2.5: FODT VN → DOCX, unzip `word/document.xml`:
  - 12pt/6pt → `w:before="240"` `w:after="120"`
  - 0pt/8pt → `0` / `160`
  - 18pt/0pt → `360` / `0`
  - đoạn không spacing → không có `<w:spacing>`
  - serialize → parse → serialize byte-identical trước convert.
- `node tests/live/ribbon-audit-1280.playwright.mjs`: **104/104 PASS**, 0px tràn ngang VI+EN, 1280×800 và 1280×720. Tab Layout Writer sum 1005px (VI) / 1092px (EN).

## SOFFICE / XML THẬT (không đoán)

Công thức đo được: **twips = pt × 20**. Probe 8 FODT tay trước code + live test sau serializer, cùng kết quả.

Canonical LO rewrite pt → cm (`12pt` → `0.423cm`) và có thể thêm phía kia = 0cm khi chỉ set một phía. Idempotence VN không so file canonical LO.

## Rủi ro / giới hạn còn lại

- `line-height` (Giãn dòng 1.0/1.5/2.0) **vẫn chưa** persist FODT — gap có sẵn, ngoài scope.
- Spacing trên `li`/header/footer không persist.
- Không có spinbox nhập số tự do (5 nấc preset).
- Không emit `style:contextual-spacing` (Word “Don't add space between paragraphs of the same style”).
- Select Layout hiện 0 pt khi đoạn chưa có inline — canvas stylesheet vẫn 6pt after cho đến khi user chọn.

## Rollback

Không merge. Xóa worktree / không lấy branch. Không đụng main.

## Handoff cho người phụ trách

1. Đọc FINDINGS rồi file này.
2. Soát UI tab Bố cục: hai hộp Trước/Sau, không tràn Home.
3. Quyết định merge `feature/writer-paragraph-spacing-before-after` khi sẵn sàng.
4. GAP Round 1 còn: Line Numbers, Hyphenation, Selection Pane, Multilevel List.
