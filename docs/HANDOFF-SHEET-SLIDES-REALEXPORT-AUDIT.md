# Agent Handoff

TASK: Rà soát real-export fidelity VN Sheet (FODS) và VN Slides (FODP) — canvas đúng không có nghĩa file xuất thật đúng
AGENT/ROLE: Grok — Sheet/Slides adapter serialize + live soffice tests
BRANCH: `fix/sheet-slides-realexport-audit`
WORKTREE: `E:\VNOffice-grok-sheet-slides-realexport-audit`
BASE: `main` @ `800ae63` (Writer page/column break PASS 1103/1103)
**KHÔNG merge vào main.** Không đụng Writer source.

## Bối cảnh

Claude vừa chứng minh trên Writer: marker `<div style="page-break-before">` hiện đúng trên canvas nhưng LibreOffice HTML-import chỉ tôn trọng `page-break-before` trên `<p>`. Sheet/Slides serialize thẳng FODS/FODP, nhưng nguyên tắc giống: thuộc tính/canvas có thể đúng trong phiên mà file xuất (hoặc hop soffice FODS↔XLSX / FODP↔PPTX) mất dữ liệu.

## Phát hiện + sửa trong phiên này

Lỗi canvas-đúng / file-sai rõ nhất trên Sheet:

| Tính năng | Canvas | `serializeToFods()` trước audit | Sau sửa |
|---|---|---|---|
| Charts (kể cả PivotChart) | SVG overlay | **Không ghi** `<chart:chart>` — Lưu mất biểu đồ | Ghi ODF chart object + series range; parse đọc lại |
| Page Breaks | viền đứt nét | Luôn `fo:break-before="auto"` | `fo:break-before="page"` trên row/col style |
| Sparklines | vẽ trong ô | Ô sparkline rỗng bị bỏ; không có `calcext:sparkline` | Ghi `calcext:sparkline-groups` |
| Protect Sheet | khóa UI | Không ghi `table:protected` | `table:protected="true"` |
| Protect Workbook | khóa cấu trúc UI | Không ghi | `table:structure-protected="true"` (mất qua hop XLSX — giới hạn LO) |
| Outline/Group | collapse hàng | Không ghi | `table:table-row-group` / `table:table-column-group` |

Slides: Animation/Transition/Media/Comments đã có live test. Lỗ mới:

| Tính năng | Trước | Sau |
|---|---|---|
| Slide Master | Canvas `masterTheme`; FODP master-page rỗng `Standard` | Ghi fill `dp1`, logo/footer trên `style:master-page`, `vno:master-theme` |
| Slide Sections | `vno:section-*` trên `draw:page` (đã có) | Đo hop PPTX: **mất** (không có tương đương OOXML) |
| Set Up Slide Show | `presentation:endless` + `vno:*` (đã có, chỉ unit) | Live soffice: `endless` **giữ**; `vno:pointer-color` **mất** qua PPTX |

## Kết quả từng tính năng (đo thật)

### Sheet

| Tính năng | Test live đã có trước? | Đo trong phiên này | Kết quả |
|---|---|---|---|
| Conditional Formatting | Unit soffice `sheet-cf-validation-fods-roundtrip.test.js` (suite 64), **không** có `tests/live/*` | `tests/live/sheet-fods-cf-validation-real-conversion.mjs` — parse XML `calcext:condition` + parseFods | **PASS** range/type/màu/value còn sau FODS→XLSX→FODS |
| Data Validation | Cùng unit trên | Cùng live file | **PASS** list `Đạt|Không đạt|Đang xử lý` + numberRange 0–10, range B2:B4 không bị co |
| Merged Cells | `sheet-fods-merge-cells-real-conversion.mjs` | Chạy lại | **PASS** spanned 3×2 / 1×3 |
| Named Ranges | `sheet-fods-named-ranges-real-conversion.mjs` | Chạy lại | **PASS** workbook + sheet-scoped |
| Charts + PivotChart | Import-only; unit cũ **cấm** serialize chart | **Sửa serialize.** `sheet-fods-charts-real-conversion.mjs` unzip `xl/charts/chart1.xml` (`c:barChart`, cache 120/200, title) | **PASS** native Excel chart, không phải ảnh |
| Sparklines | Không | `sheet-fods-pagebreak-sparkline-protect-real-conversion.mjs` | **PASS** `calcext:sparkline` còn sau hop |
| Outline/Group | Không | Cùng file | **PASS** `table:table-row-group` còn sau hop XLSX |
| Protect Sheet | Không (chỉ UI) | Cùng file | **PASS** `table:protected="true"` còn |
| Protect Workbook | Không (chỉ UI) | Cùng file | Serialize có; **LOTT** `table:structure-protected` qua hop XLSX (ghi NOTE). FODS nội bộ còn |
| Comments | `sheet-fods-comments-real-conversion.mjs` | Chạy lại | **PASS** annotation populated + empty cell |
| Print Area | `sheet-fods-printarea-real-conversion.mjs` | Chạy lại | **PASS** `table:print-ranges` A1:F20 |
| Page Breaks | Không (chỉ canvas CSS) | Live file trên | **PASS** `fo:break-before="page"` còn |
| Custom Number Format | `sheet-fods-number-format-real-conversion.mjs` | Chạy lại | **8/9 PASS.** A8 custom `#,##0.00 "đ"` còn. **A7 category=text** (`"00123"`) mất `number:text-style` sau hop XLSX — **cùng FAIL trên `main`**, không phải regression của branch này |
| Page Setup | `sheet-page-setup-real-pdf.mjs` | Không chạy lại (đã PASS trên main; không đụng) | Đã có từ trước |

### Slides

| Tính năng | Test live đã có trước? | Đo trong phiên này | Kết quả |
|---|---|---|---|
| Animations (shape) | `fodp-save-transition-animation-real-conversion.mjs` | Chạy lại | **PASS** flyIn/fadeIn/zoomIn/bounceIn |
| Animations title/body | `fodp-save-title-body-animation-real-conversion.mjs` | Không chạy lại (đã có; không đụng serializer effect) | Đã có |
| Animation Pane order/start | Chỉ unit FODP | `fodp-save-animation-pane-order-real-conversion.mjs` | **PASS** flyIn→fadeIn→zoomIn + node-type; `presentation:endless` còn |
| Transitions | Cùng file transition | Chạy lại | **PASS** fade/slide/zoom; **flip mất** qua PPTX (đã ghi sẵn, không assert) |
| Master Slide | Không serialize | **Sửa.** `fodp-save-master-sections-slideshow-real-conversion.mjs` | FODP nội bộ **PASS**. PPTX hop: `vno:master-theme` **mất**, logo text **mất**, fill `#fffdfa` trên dp1 **còn** |
| Slide Sections | Unit FODP `vno:section-*` | Cùng live file | FODP nội bộ **PASS**. PPTX hop: `vno:section-*` **mất** (không có OOXML section) |
| SmartArt/Diagram | `slides-smartart-import-real-conversion.mjs` (import) | Không viết serialize mới — diagram flatten `draw:g` khi import; Lưu ra shape thường | Giới hạn đã biết, không core patch |
| Charts | Probe script, unit FODP, **không** live assert | `fodp-save-charts-real-conversion.mjs` unzip `ppt/charts/chart1.xml` | **PASS** native `c:barChart`, data 120/185/143 |
| Media | `fodp-save-media-pptx-real-conversion.mjs` | Không chạy lại | Đã có |
| Comments | `fodp-save-slides-comments-real-conversion.mjs` | Không chạy lại | Đã có |
| Slide Show Settings | Unit FODP | Live file master/sections | `presentation:endless` **PASS** qua PPTX; `vno:without-narration` / `vno:pointer-color` **mất** (custom ns) |

## FILES CHANGED

- `adapters/libreoffice/sheet/sheet-adapter.js` — serialize/parse charts, page-break, sparkline, protect, outline
- `adapters/libreoffice/slides/slides-adapter.js` — serialize/parse Slide Master (`style:master-page` + `vno:master-theme`); loadFromFodp gọi `applySlideMaster`
- `tests/unit/sheet-realexport-fods.test.js` — round-trip nội bộ (suite 106)
- `tests/unit/sheet-charts-import.test.js` — đảo assertion: Lưu **phải** ghi `chart:chart`
- `tests/unit/slides-file-io.test.js` — master theme FODP round-trip
- `tests/run-tests.js` — đăng ký suite 106
- `tests/live/sheet-fods-charts-real-conversion.mjs`
- `tests/live/sheet-fods-cf-validation-real-conversion.mjs`
- `tests/live/sheet-fods-pagebreak-sparkline-protect-real-conversion.mjs`
- `tests/live/fodp-save-charts-real-conversion.mjs`
- `tests/live/fodp-save-animation-pane-order-real-conversion.mjs`
- `tests/live/fodp-save-master-sections-slideshow-real-conversion.mjs`
- `docs/HANDOFF-SHEET-SLIDES-REALEXPORT-AUDIT.md`

Không đụng `apps/writer/**`, Core, build system. Không thư viện trả phí.

## COMMANDS RUN

```
node tests/run-tests.js
node tests/live/sheet-fods-charts-real-conversion.mjs
node tests/live/sheet-fods-cf-validation-real-conversion.mjs
node tests/live/sheet-fods-pagebreak-sparkline-protect-real-conversion.mjs
node tests/live/sheet-fods-named-ranges-real-conversion.mjs
node tests/live/sheet-fods-merge-cells-real-conversion.mjs
node tests/live/sheet-fods-comments-real-conversion.mjs
node tests/live/sheet-fods-printarea-real-conversion.mjs
node tests/live/sheet-fods-number-format-real-conversion.mjs
node tests/live/fodp-save-charts-real-conversion.mjs
node tests/live/fodp-save-animation-pane-order-real-conversion.mjs
node tests/live/fodp-save-master-sections-slideshow-real-conversion.mjs
node tests/live/fodp-save-transition-animation-real-conversion.mjs
```

## TEST RESULTS

- `node tests/run-tests.js`: **1107/1107 PASS** (trước task 1103/1103; +3 suite 106 + 1 master theme trong slides-file-io). Live soffice **không** nhét vào run-tests.js.
- Live soffice mới: charts Sheet **PASS** (native `xl/charts/chart1.xml`); CF/validation **PASS**; page-break/sparkline/protect-sheet/outline **PASS**; Slides charts **PASS** (`ppt/charts/chart1.xml`); animation pane order **PASS**; master/sections/slideshow đo xong (endless giữ, vno:* mất).
- Live soffice cũ chạy lại: named ranges, merge, comments, print area, transitions: **PASS**. Number format: A7 text style FAIL (giống `main`).

## KNOWN FAILURES / LIMITATIONS

1. **Protect Workbook** `table:structure-protected` bị LibreOffice bỏ khi FODS→XLSX. FODS thuần và parse nội bộ còn. Không core patch — Excel workbook-structure lock khác ODF flag.
2. **Slide Master** qua PPTX: mất `vno:master-theme` và logo text trên master-page; **giữ** `draw:fill-color` nền. FODP round-trip nội bộ đủ theme. PPTX không có chỗ chuẩn cho logo chữ VN.
3. **Slide Sections** `vno:section-*` mất qua PPTX (PowerPoint không có slide sections kiểu ODF custom attr). Còn khi Lưu FODP/ODP.
4. **Set Up Show** cờ `vno:without-narration` / `vno:pointer-color` mất qua PPTX; `presentation:endless` giữ.
5. **Transition flip** vẫn mất qua PPTX (đã ghi trong test cũ, không assert).
6. **Color scale / data bar / icon set CF** vẫn không serialize (UI chưa tạo).
7. **SmartArt** chỉ import `draw:g`; Lưu ra shape thường, không phải DrawingML SmartArt.
8. Mật khẩu Protect không ghi hash ODF (khóa giao diện, không phải bảo mật — đúng copy UI hiện có).
9. PivotChart sau hop XLSX thành chart thường trỏ cùng range (mất `vno:chart-kind` vì custom ns); dữ liệu/type còn.
10. **Number format Text (A7)** mất style sau FODS→XLSX trên cả `main` lẫn branch này. Giá trị chuỗi còn; `style.numberFormat.category="text"` không còn vì LO không giữ `number:text-style`. Không sửa trong phiên này vì không phải regression.

## RISKS

Thấp sau khi đo soffice. Chart serialize bám fixture ODF 1.3 đã import được (`sample-sheet-charts.fods`). Regex `table:table-row` siết `(?=[\s>/])` để không nuốt `table:table-row-group`.

## DEPENDENCIES/BLOCKERS

Không. `soffice.exe` sẵn. Không merge main.

## CORE PATCH ID (if any): N/A

## NEXT ACTION

Review trên branch `fix/sheet-slides-realexport-audit`. Sẵn sàng merge khi người phụ trách cho phép — **không tự merge**. Task tiếp: nếu cần Master logo sống qua PPTX thì phải đưa object vào slide master OOXML qua filter Impress (có thể vượt Adapter).
