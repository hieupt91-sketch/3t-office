# Writer Paragraph Spacing Before/After — đo thật trước khi viết code

**KHÔNG phải implementation.** File này ghi sự thật đã đo: chỗ Writer UI lưu giãn dòng hiện tại, CSS mặc định trên canvas, pattern style-registry FODT, và kết quả soffice → DOCX `w:spacing` (unzip XML thật, không đoán). Agent tiếp theo đọc file này rồi làm serializer/UI, không đo lại từ đầu.

- AGENT: Grok
- BRANCH: `feature/writer-paragraph-spacing-before-after`
- WORKTREE: `E:\VNOffice-grok-writer-paragraph-spacing`
- BASE: `main` @ `5458c0f` — `node tests/run-tests.js` đo thật **1277/1277 PASS**
- SOFFICE: `C:\Users\3T Computer\tools\libreoffice\program\soffice.exe` — LibreOffice **26.2.5** (`version.ini` Vendor=The Document Foundation, buildid `cd7284b4cbbfeb507e630c1aac019f4157393acb`)
- Probe: `tests/scripts/probe-writer-paragraph-spacing.mjs` (8 FODT tay, mỗi cái convert DOCX + canonical FODT)
- Nguồn GAP: `docs/HANDOFF-WRITER-RIBBON-PARITY-ROUND1.md` mục 4 (Spacing Before/After Spinboxes)
- **Chưa sửa** `writer-adapter.js` / ribbon / command-definitions.

---

## 0. Writer UI thật (không đoán)

### 0.1 Giãn dòng hiện có = `line-height`, không phải khoảng trước/sau đoạn

Lệnh `writer.para.spacing1` / `spacing15` / `spacing2` gọi `WriterAdapter._setLineHeight("1.0"|"1.5"|"2.0")` — gán **`node.style.lineHeight`** trên `<p>` hoặc `<div>` chứa con trỏ.

Đây là **khoảng cách giữa các dòng trong một đoạn** (CSS `line-height`), **không** phải Spacing Before/After của Word (khoảng trống giữa các đoạn, đơn vị pt).

Ribbon: dropdown `writer.para.lineSpacing` (tab Home, nhóm Đoạn văn) và `writer.para.lineSpacingLayout` (tab Layout, nhóm Đoạn văn). Cả hai chỉ chứa 3 lệnh line-height.

### 0.2 Canvas đã có margin đoạn — nhưng chỉ trong stylesheet, không inline

`apps/writer/writer.css`:

```css
.vno-writer-page p {
  margin: 0 0 6pt 0;
  text-align: justify;
}
```

- Visual mặc định: **0pt trước, 6pt sau** (stylesheet).
- `serializeToFodt()` chỉ đọc **inline** `style="..."` trên thẻ. Stylesheet không đi vào FODT.
- Đoạn `<p>text</p>` không có inline margin → FODT **không** có `fo:margin-top`/`fo:margin-bottom`.

Heading (`h1`/`h2`/`h3`) cũng có margin stylesheet riêng (14pt/10pt/8pt trước). Cùng cơ chế: không serialize trừ khi thành inline.

### 0.3 Pattern sẵn có để ghi thuộc tính đoạn — tái sử dụng, không viết mới

| Việc | API đã có | Ghi chú |
|---|---|---|
| Áp CSS lên đoạn đang chọn | `_applyParagraphVisualStyle(styles, description)` + `_getSelectedParagraphBlocks()` | `writer.para.shading` / `writer.para.borders` đang dùng. **Dùng cái này**, không copy `_setLineHeight` (walker P/DIV thô hơn, không cover heading/list). |
| Lệnh nhận giá trị từ `<select>` | `createSelect` → `globalCommandBus.execute(commandId, val)` | Pattern `writer.para.borders` (`bottom`/`all`/`none`). |
| Registry style FODT deterministic | `styleName(paragraphStyles, "P", props)` keyed bằng `JSON.stringify` sort keys | `paragraphXml` hiện chỉ ghi `textAlign` / `masterPageName` / `breakBefore`. |
| Emit `style:paragraph-properties` | `paragraphStyleXml` join `fo:text-align` / `fo:break-before` | Thêm `fo:margin-top` / `fo:margin-bottom` vào **cùng** `paraProps[]`. |
| Page margin (tham khảo đơn vị, **không** nhầm với para spacing) | `_fodtPageBox` → `fo:margin-top` trên `style:page-layout-properties` | Khác family: page-layout vs paragraph. Đơn vị cm từ mm. |

### 0.4 Serializer hiện **throw** nếu `<p>` có `margin-top` / `margin-bottom`

`_fodtCssMap` mặc định chỉ cho: `font-weight`, `font-style`, `text-decoration`, `text-decoration-line`, `color`, `background-color`, `font-family`, `font-size`, `text-align`.

Thuộc tính khác → `WRITER_FODT_UNSUPPORTED_CONTENT` (`thuộc tính CSS 'margin-top'`).

Hệ quả: **phải** nới allow-list `margin-top`/`margin-bottom` (không nới shorthand `margin`, không nới `margin-left`/`margin-right` — indent là việc khác).

`paragraphXml` gọi `_fodtCssMap` **và** `_fodtInlineStyle` trên cùng `style` của `<p>`. Nếu chỉ nới allow ở một chỗ, chỗ kia vẫn throw. Cách sạch: thêm `margin-top`/`margin-bottom` vào allow-list mặc định; `_fodtInlineStyle` bỏ qua (không map sang text-properties).

Header/footer đã ignore `margin*` qua `_fodtCssIgnoreNames` (`canvasBoxCss`) — `margin: 0` trên header mặc định không vỡ. Spacing before/after **không** persist header/footer ở phiên này.

### 0.5 Gap line-height FODT (ngoài scope)

`line-height` trên `<p>` cũng **không** nằm allow-list → serialize throw nếu user đã bấm Giãn dòng 1.5/2.0. Đây là gap có sẵn, **không** sửa trong task này.

---

## 1. DOCX / ODF chuẩn — đo soffice 26.2.5

ECMA-376: `<w:spacing w:before="…" w:after="…"/>` trong `w:pPr`. Đơn vị **twips = twentieths of a point**. Công thức:

```
twips = pt × 20
```

ODF 1.3: `fo:margin-top` / `fo:margin-bottom` trên `style:paragraph-properties` (family `paragraph`). Không dùng `fo:margin` shorthand. LibreOffice canonical rewrite thêm `style:contextual-spacing="false"` — VN **không** emit thuộc tính này (không hỗ trợ “Don't add space between paragraphs of the same style”).

### 1.1 Bảng đo thật (FODT tay → soffice DOCX `word/document.xml`)

| FODT input | DOCX `w:spacing` đo được | Canonical FODT `P1` (LO rewrite, cm) |
|---|---|---|
| `fo:margin-top="12pt" fo:margin-bottom="6pt"` | `w:before="240" w:after="120"` | `0.423cm` / `0.212cm` |
| `fo:margin-top="0pt" fo:margin-bottom="8pt"` | `w:before="0" w:after="160"` | `0cm` / `0.282cm` |
| `fo:margin-top="18pt" fo:margin-bottom="0pt"` | `w:before="360" w:after="0"` | `0.635cm` / `0cm` |
| `fo:margin-top="0.423cm" fo:margin-bottom="0.211cm"` | `w:before="240" w:after="120"` | `0.423cm` / `0.212cm` |
| không style margin (plain `text:p`) | **không có** `<w:spacing>` | không có `P1` |
| hai đoạn P1=12/6 + P2=0/18+center | P1 `240/120`, P2 `0/360` | P2 giữ `fo:text-align="center"` |
| **chỉ** `fo:margin-top="12pt"` | `w:before="240" w:after="0"` | LO **thêm** `fo:margin-bottom="0cm"` |
| **chỉ** `fo:margin-bottom="8pt"` | `w:before="0" w:after="160"` | LO **thêm** `fo:margin-top="0cm"` |

`word/styles.xml` styleId=`Normal`: **không** có `w:spacing` (LO không gắn 8pt Word-Normal vào Normal khi convert FODT này).

Không có `w:beforeAutospacing` / `w:afterAutospacing` / `w:beforeLines` / `w:afterLines` trên các fixture đo.

### 1.2 Hệ quả cho serializer VN

- Emit **`pt`** (cùng convention `fo:font-size`), ví dụ `fo:margin-top="12pt"`. soffice hiểu pt và ra đúng twips nguyên (`12×20=240`).
- Idempotence VN = output VN (pt), **không** so canonical LO (cm + `style:contextual-spacing`). Giống quy ước E.4.
- Parse phải nhận `pt` / `px` / `cm` / `mm` / `in` (file LO/import). Quy đổi về pt:
  - `px`: `× 0.75` (đã dùng ở `_fodtNormalizeFontSize`)
  - `cm`: `× 72 / 2.54`
  - `mm`: `× 72 / 25.4`
  - `in`: `× 72`
  - Làm tròn như font-size: `` `${Number(points.toFixed(3))}pt` `` → `12pt`, `0pt`.
- **Vắng mặt** thuộc tính ≠ giá trị `0`. Plain paragraph không emit `fo:margin-*` → soffice không ghi `w:spacing`.
- **`0pt` tường minh** (user chọn 0 để đè CSS 6pt) **phải** emit `fo:margin-bottom="0pt"` và parse trả lại `margin-bottom:0pt`. Nếu omit 0 khi parse, stylesheet 6pt trỗi lại — sai.

Khi chỉ set một phía, VN chỉ emit phía đó. LO lúc convert DOCX có thể thêm phía kia = 0 — đó là rewrite của LO, không phải round-trip VN.

---

## 2. Quyết định mặc định (ghi rõ lý do)

**Không** mặc định Word Normal 0pt before / 8pt after trên mọi đoạn VN Writer.

Lý do đo được / ràng buộc thật:

1. Gắn 8pt after lên mọi `<p>` sẽ đổi layout mọi tài liệu hiện có và **phá** idempotence FODT Phase A–E (các fixture không có `fo:margin-bottom`).
2. Canvas đã có visual 6pt after (stylesheet hành chính VN), khác 8pt của Word — không được “sửa thầm” thành 8.
3. soffice đo: đoạn không margin → **không** `w:spacing`. 0/0 omit là hành vi engine, không phải thiếu sót.
4. Word 8pt after là default của **style Normal**, không phải default của file format.

**Quyết định:**

| Lớp | Before | After |
|---|---|---|
| Lưu trữ / FODT khi user chưa chọn | omit (không inline, không `fo:margin-*`) | omit |
| Canvas stylesheet (giữ nguyên, không đụng) | 0 | 6pt (`.vno-writer-page p`) |
| User chọn preset (kể cả 0) | inline `margin-top:Npt` | inline `margin-bottom:Npt` |

Preset UI: **0 / 6 / 8 / 12 / 18 pt**. 6 khớp visual canvas hiện tại; 8 khớp Word Normal; 12/18 nấc Word hay dùng.

---

## 3. Ánh xạ implementation (chưa làm code)

### 3.1 Lưu trữ DOM

- Ghi `marginTop` / `marginBottom` CSS **đơn vị `pt`** trên block đoạn (`p`/`h1`–`h6`/`li` qua `_applyParagraphVisualStyle`).
- Không dùng `px` cho giá trị user (tránh round-trip 12pt ↔ 16px).
- Không gộp shorthand `margin` (sẽ đụng `margin-left` của indent).

### 3.2 Command

Hai lệnh nhận args (giống `writer.para.borders`), không tách 10 id:

- `writer.para.spacingBefore` — args `"0"` \| `"6"` \| `"8"` \| `"12"` \| `"18"`
- `writer.para.spacingAfter` — cùng tập

`handleDispatch` + `bindHandler` (pattern shading/borders). UNO map:

- `writer.para.spacingBefore` → `.uno:ParSpaceBefore`
- `writer.para.spacingAfter` → `.uno:ParSpaceAfter`

(Ánh xạ tên UNO theo catalog LibreOffice paragraph spacing; dispatch thật vẫn đi `WriterAdapter`, không gọi Core.)

### 3.3 UI tối thiểu

Tab **Bố cục** nhóm Đoạn văn (đúng chỗ GAP Round 1 / đúng chỗ Word Layout spinbox). Hai `type: "select"` (pattern `writer.para.borders`, `createSelect` đã truyền args — **không** sửa `platform/ui-kit/components.js`).

- `ariaLabel`: «Khoảng trước đoạn» / «Khoảng sau đoạn»
- Option label tự mô tả khi select đóng: `Trước: 0 pt` … `Sau: 18 pt` (hai select giống nhau nếu chỉ ghi `0 pt` thì người dùng không phân biệt)
- `isLarge` không dùng — select compact, hạn chế tràn 1280px
- **Không** thêm control lên hàng 2 tab Home (đã kín; `ribbon-audit-1280` là yêu cầu cứng)

Dropdown Giãn dòng Home/Layout **giữ nguyên** 1.0/1.5/2.0 (line-height). Không trộn before/after vào menu đó.

### 3.4 FODT serialize / parse

`paragraphXml`:

1. `_fodtCssMap` đọc `margin-top` / `margin-bottom`.
2. Normalize → `props.marginTop` / `props.marginBottom` (string `Npt`, kể cả `0pt`).
3. `styleName(paragraphStyles, "P", props)` — registry cũ, thêm key, không registry riêng.

`paragraphStyleXml`: nếu có `marginTop` → `fo:margin-top="12pt"`; `marginBottom` tương tự. Ghép vào `paraProps` hiện có (sau `fo:text-align` / `fo:break-before` để thứ tự XML deterministic).

`parseFodt` family paragraph: đọc `fo:margin-top`/`fo:margin-bottom`, normalize pt, đưa vào `paragraphStyles`. `paragraphBlockHtml`: append `margin-top:12pt` / `margin-bottom:8pt` vào `style` theo thứ tự cố định: `text-align` rồi `margin-top` rồi `margin-bottom`.

Ô bảng (`tableCellXml`) **không** persist para spacing trong phase này (ô đang chỉ align). Không mở scope.

### 3.5 Help / i18n (bắt buộc theo AGENTS.md §10)

- `platform/i18n/strings-vi.js` + `strings-en.js`: label/tooltip hai lệnh (test `writer-i18n-shortcuts` duyệt **mọi** `WRITER_COMMANDS`).
- Bài help mới tiếng Việt, tab Bố cục / nhóm Đoạn văn, bước thật (select Trước/Sau, đơn vị pt, khác giãn dòng 1.0/1.5/2.0).
- `platform/help/entries-writer.js`.

### 3.6 Ngoài scope

- Persist `line-height` ra FODT
- `margin-left` / `margin-right` / indent
- `style:contextual-spacing` / Word “Don't add space between paragraphs of the same style”
- Spinbox nhập số tự do (preset 5 nấc; đủ cho in ấn cơ bản)
- Header/footer paragraph spacing
- Core/upstream patch
- Merge `main`

---

## 4. Kế hoạch test (sẽ chạy, chưa chạy ở bước findings)

- Unit: serialize FODT có `fo:margin-top`/`fo:margin-bottom` đúng pt; parse trả inline `pt`; serialize→parse→serialize **byte-identical**; đoạn không spacing không phát sinh `P*` margin; `0pt` tường minh được giữ; kết hợp `text-align`+spacing chung một `P*`.
- Live soffice: FODT VN → DOCX, unzip `word/document.xml`, assert `w:before`/`w:after` = `pt×20` (12→240, 6→120, 8→160, 18→360, 0→0).
- `node tests/run-tests.js` 100% PASS.
- `node tests/live/ribbon-audit-1280.playwright.mjs` 100% PASS (0px tràn ngang) sau khi thêm select Layout.

Rollback: revert branch, không merge.
