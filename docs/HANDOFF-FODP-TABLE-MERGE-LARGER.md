# Agent Handoff
TASK: Chứng minh bảng lớn hơn 2×2 qua vòng hộp soffice PPTX thật — đóng khoảng trống số 6 của `fix/fodp-save-table-arrow`
AGENT/ROLE: Grok (Integration / adapter + test)
BRANCH: `fix/fodp-table-merge-larger`
WORKTREE: `E:\VNOffice-grok-fodp-table-merge`
OBJECTIVE: Slide có bảng 3×4 dữ liệu thật (số + tiếng Việt có dấu) đi `serializeToFodp()` → soffice `--convert-to pptx` → soffice PPTX→FODP → `parseFodp()`, so từng ô. Nếu hop nén cột (`table:number-columns-repeated`) làm parser đếm thiếu — sửa adapter. Merged cells chỉ làm nếu canvas VN Slides có khái niệm merge.

---

## Plan gate

Thay đổi parse FODP bảng trên Slides adapter + unit + live test. Không đụng Core, Writer, Sheet, canvas logic, build system, không gửi nội dung tài liệu ra cloud. **Không merge vào main.**

- **Objective:** Vòng hop soffice PPTX giữ bảng >2×2 (3 hàng × 4 cột, đủ 12 ô) và không mất cột khi ODF nén ô/hàng hoặc soffice ghi ô trống tự đóng.
- **Current capability trước task:** Live `fodp-save-table-arrow-real-conversion.mjs` chỉ đo 2×2. Parser `_parseTableCells()` đếm mỗi thẻ `<table:table-cell>...</table:table-cell>` là 1 ô — bỏ ô tự đóng, không bung `number-columns-repeated` / `number-rows-repeated`.
- **Files/modules:** `adapters/libreoffice/slides/slides-adapter.js`; unit `tests/unit/slides-file-io.test.js`; live `tests/live/fodp-save-table-larger-real-conversion.mjs`.
- **Dependency:** `soffice.exe` tại `C:\Users\3T Computer\tools\libreoffice\program\soffice.exe` (chỉ live test).
- **Risk:** Đổi regex parse ô có thể ảnh hưởng bảng 2×2 đã PASS. Giữ live table-arrow + save-shapes làm hồi quy.
- **Test plan:** unit in-memory 3×4 + canned XML nén cột (<60s) + live soffice 3×4 + live table-arrow cũ + live save-shapes cũ.
- **Rollback:** revert branch; serializer vẫn ghi đủ ô; parser cũ đọc đúng bảng mọi ô có chữ và có thẻ đóng, nhưng mất cột khi ô trống tự đóng hoặc ODF nén.

---

## FINDINGS (đo trên hop soffice thật, không suy diễn)

### Canvas không có merge cells — không áp dụng

`apps/slides/slides-canvas.js` `insertTable()` chỉ tạo `rows`, `cols`, `cells[][]` (tối đa 12×12). Render: mỗi `td` một ô, không `colspan`/`rowspan`. `apps/slides/insert-dialogs.js` chỉ hỏi số hàng/cột. Grep `merge|colspan|rowspan|spanned` trong `apps/slides/**`: **không có**. Không bịa tính năng merge trên canvas. Phần merged cells **bỏ qua**.

Hop live 3×4 + bảng ô trống: `number-columns-spanned` / `number-rows-spanned` / `covered-table-cell` = **không xuất hiện**. Filter PPTX không tự tạo merge.

### Bảng 3×4 — XML sống sót, từng ô khớp

Slide đo: 1 bảng 3×4 (`Hạng mục` / `Tháng 1` / `Tháng 2` / `Tháng 3` / `Doanh thu` / `120` / `135` / `150` / `Chi phí` / `45` / `45` / `52`) + 1 bảng probe 2×4 có ô trống (`A` `B` `` `` / `C` `` `` `D`).

Sau FODP→PPTX→FODP, LibreOffice giữ `<table:table>` đủ 3 hàng × 4 cột, từng ô đúng chữ (kể cả dấu tiếng Việt và hai ô `45` liền nhau). PPTX hop **không** nén hai ô `45` bằng `table:number-columns-repeated` — ghi 12 thẻ ô riêng.

### Ô trống — soffice ghi tự đóng, parser cũ mất cột

Bảng probe 2×4 có 4 ô rỗng. Sau hop, FODP là:

```xml
<table:table-cell table:style-name="ce2"/>
```

**Không** dùng `table:number-columns-repeated`. Parser cũ yêu cầu `>(…)</table:table-cell>` → bỏ 4 ô tự đóng → hàng 0 còn 2 cột (`A`,`B`), hàng 1 còn 2 cột (`C`,`D`), `cols` sụt. Đây là lỗi adapter, không phải filter PPTX xóa ô.

### `number-columns-repeated` — không xuất hiện trên hop PPTX đo được

Cùng soffice, cùng filter `Impress MS PowerPoint 2007 XML`:

| Nguồn | `number-columns-repeated` trên ô | Ô tự đóng |
|---|---|---|
| 3×4 mọi ô có chữ (kể cả hai `45` liền) | không | không |
| 2×4 có ô trống liền nhau | không | **có (4 ô)** |
| Canned ODF (unit, kiểu file Impress/FODS) | có | có |

Filter PPTX trên hop này **mở** ô, không nén cột. Attribute nén vẫn là ODF hợp lệ (Sheet FODS đã bung; file FODP native có thể nén). Parser mới bung cả hai.

---

## IMPLEMENTATION SUMMARY

### Parse
`_parseTableCells()`:
- Bung `table:number-columns-repeated` trên ô và `table:number-rows-repeated` trên hàng (cùng hướng Sheet FODS).
- Nhận ô tự đóng `<table:table-cell …/>`.
- Fallback `office:value` / `office:string-value` khi không có `text:p`.
- `covered-table-cell` (nếu gặp) thành chuỗi rỗng để chỉ số cột không lệch — **không** thêm model merge lên canvas.

### Serialize
Không đổi. Vẫn ghi từng ô `office:value-type="string"`; cột dùng `table:table-column table:number-columns-repeated="${cols}"`.

### Không sửa
`apps/slides/slides-canvas.js` (không có merge). Writer / Sheet. LibreOffice Core. Không SendKeys, không thư viện trả phí.

---

## Kết quả hop soffice PPTX thật

Live: `node tests/live/fodp-save-table-larger-real-conversion.mjs` — **PASS, 19.7s**.

### Bảng 3×4 (`tbl3x4`)

| Thuộc tính | Trước hop (in-memory) | FODP sau hop | `parseFodp()` |
|---|---|---|---|
| `id` | `tbl3x4` | `draw:name="tbl3x4"` | `tbl3x4` |
| `type` | `table` | `<table:table>` + preview image | `table` |
| Hàng × cột | 3 × 4 | 3 `<table:table-row>` × 4 cell | `rows=3` `cols=4` |
| `cells[0]` | `Hạng mục`, `Tháng 1`, `Tháng 2`, `Tháng 3` | cùng chữ (span T3) | khớp |
| `cells[1]` | `Doanh thu`, `120`, `135`, `150` | cùng chữ | khớp |
| `cells[2]` | `Chi phí`, `45`, `45`, `52` | hai ô `45` **tách thẻ**, không nén | khớp |
| x,y,w,h | 76, 151, 680×160 | cm tương ứng | **76, 151, 680×160** |

### Bảng ô trống (`tbl-gap`)

| Thuộc tính | Trước hop | FODP sau hop | `parseFodp()` |
|---|---|---|---|
| Hàng × cột | 2 × 4 | 2 hàng, 4 ô/hàng (4 ô `ce2` tự đóng) | `rows=2` `cols=4` |
| `cells` | `[["A","B","",""],["C","","","D"]]` | A/B/C/D + 4 self-closing | khớp từng ô |
| x,y,w,h | 76, 340, 400×80 | cm tương ứng | **76, 340, 400×80** |

`number-columns-repeated` trên ô: **không**. `number-rows-repeated`: **không**. Spanned / covered: **không**. Self-closing empty: **4**.

---

## FILES CHANGED

- `adapters/libreoffice/slides/slides-adapter.js` — bung repeat / ô tự đóng / office:value
- `tests/unit/slides-file-io.test.js` — in-memory 3×4; canned XML nén cột + ô rỗng + `number-rows-repeated`
- `tests/live/fodp-save-table-larger-real-conversion.mjs` — hop soffice 3×4 + probe ô trống
- `docs/HANDOFF-FODP-TABLE-MERGE-LARGER.md`

## COMMANDS RUN

```
node --check adapters/libreoffice/slides/slides-adapter.js
node tests/run-tests.js
node tests/live/fodp-save-table-larger-real-conversion.mjs
node tests/live/fodp-save-table-arrow-real-conversion.mjs
node tests/live/fodp-save-shapes-real-conversion.mjs
```

## BUILD RESULT: OK (không đổi build system)

## TEST RESULTS

| Suite | Lệnh | Kết quả |
|---|---|---|
| Master unit/smoke | `node tests/run-tests.js` | **683/683 PASS, 12.3s** (< 60s). Thêm 2 test: serialize/parse 3×4; canned XML `number-columns-repeated` / ô tự đóng / `office:value` / `number-rows-repeated` |
| Live soffice bảng lớn | `node tests/live/fodp-save-table-larger-real-conversion.mjs` | **PASS, 19.7s** — 3×4 đủ 12 ô (Việt + số), geom 76,151,680×160; bảng ô trống 2×4, 4 self-closing, geom 76,340,400×80 |
| Live soffice table/arrow cũ | `node tests/live/fodp-save-table-arrow-real-conversion.mjs` | **PASS, 18.5s** — 2×2 đủ 4 ô; arrow `arr1` type=arrow, h 80→73 như trước |
| Live soffice save hop cũ | `node tests/live/fodp-save-shapes-real-conversion.mjs` | **PASS, 18.9s** — rect/ellipse/textbox/connector/image không hồi quy |

## KNOWN FAILURES / LIMITATIONS

1. **Hop PPTX đo được không phát `table:number-columns-repeated` trên ô.** Filter ghi ô rỗng thành thẻ tự đóng, không nén. Parser vẫn bung repeat vì ODF native / FODS-style có thể nén — chứng minh bằng unit canned XML, không phải live hop này.
2. **Merged cells không áp dụng.** Canvas VN Slides không có merge/colspan/rowspan. Không serialize `number-columns-spanned` / `number-rows-spanned`. Parser chỉ giữ chỗ `covered-table-cell` thành `""` nếu gặp file ngoài — không phải tính năng merge trên UI.
3. **Serializer không nén ô giống nhau.** Ghi đủ 12 thẻ cho 3×4. Đủ cho hop PPTX; không tối ưu kích thước FODP.
4. **Số trong bảng vẫn là chuỗi.** Serializer `office:value-type="string"`. Hop giữ `120` trong `text:p`, không đổi thành float trên XML đo được. Fallback `office:value` chỉ phòng file khác.
5. **Hộp thoại Lưu native** vẫn chỉ Desktop App. Live test gọi serializer + soffice trực tiếp, cùng pipeline `main.py`, không SendKeys.
6. **Không đo bảng >3×4, không đo 12×12 (trần canvas).** Cùng đường parse; unit 3×4 + live 3×4 + probe 2×4.

## RISKS

Thấp. Chỉ nới regex parse ô/hàng. Live 2×2 table+arrow 18.5s PASS; live shapes 18.9s PASS.

## DEPENDENCIES/BLOCKERS

Không. `soffice.exe` sẵn. Không cần Office GUI, không SendKeys, không thư viện trả phí.

## CORE PATCH ID (if any): N/A

## NEXT ACTION

**KHÔNG merge vào main.** Review trên `fix/fodp-table-merge-larger`. Follow-up chỉ khi product yêu cầu merge cells trên canvas (lúc đó mới serialize spanned + UI); hoặc nén ô khi serialize nếu cần FODP nhỏ hơn.
