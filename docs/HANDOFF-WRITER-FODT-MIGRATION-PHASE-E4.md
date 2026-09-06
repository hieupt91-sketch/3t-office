# Agent Handoff

TASK: Writer FODT Migration — Phase E.4 (Chart native; Diagram/SmartArt không làm)
AGENT/ROLE: Grok (coding agent), worktree riêng, không đụng Sheet/Slides source.
BRANCH: `feature/writer-fodt-migration-phase-e4`
WORKTREE: `E:\VNOffice-grok-writer-fodt-phase-e4`
BASE: `main` @ `6012075` — đo thật `node tests/run-tests.js` **1240/1240 PASS** trước khi làm (không dùng số trong handoff cũ).
**KHÔNG merge tự động vào main** — cùng gate như Phase A–E.3, người phụ trách đọc lại trước.

## Bối cảnh

Phase E.3 (đã merge) hỗ trợ WordArt native. Probe C1–C3 E.3 đã ra `word/charts/chart1.xml` nhưng **không đo cache số**. E.4 đo lại rồi mới serialize Chart. Diagram/SmartArt **không** làm — xem RANH GIỚI.

Đo engine trước khi viết serializer: `docs/HANDOFF-WRITER-FODT-PHASE-E4-FINDINGS.md` (commit `054e3ea`, trước mọi thay đổi `writer-adapter.js`).

Nguyên tắc: không đánh dấu "hỗ trợ" nếu không có fixture, VN round-trip idempotent, và phép đo LibreOffice thật + Word bằng mắt.

## RANH GIỚI (đọc trước)

| Loại | Trạng thái | Bằng chứng |
|---|---|---|
| **Chart** | **XONG** | Unit 10/10, live soffice DOCX `word/charts/chart1.xml` đúng loại + cat/val thật, Word bằng mắt 4 loại |
| **SmartArt/Diagram** | **KHÔNG làm** | Probe E.3 D1–D3 ra shape rời/`wpg:wgp`, **không** SmartArt `dgm:`. HTML 4 layout Writer không map 1-1. `data-vno-diagram` vẫn throw |
| WordArt | Đã có Phase E.3 | Không làm lại |

## Nghiên cứu trước khi thiết kế

1. Writer DOM/model thật (không đoán):
   - Chart: `<div class="vno-writer-chart" data-vno-chart>` + SVG `data-chart-type` bar/line/pie/area.
   - **Không** `data-vno-chart-labels` / JSON. Nguồn số: `<title>Nhãn: số</title>` do `generateChartSvg` ghi. SVG rỗng → throw, không bịa từ path.
2. Probe soffice LibreOffice **26.2.5**: xem FINDINGS.
   - Frame **phải** nằm trong `text:p` as-char (sibling nuốt, cùng B.2/E.3).
   - Local-table thiếu header-columns → `c:barChart` đúng loại nhưng **mất dữ liệu** (`NaN`).
   - Local-table đủ cột → cat `Q1–Q4`, val `120/190/300/250` trong `word/charts/chart1.xml`.
   - `pie` UI → ODF `chart:circle` → DOCX `c:pieChart`. `area` → `c:areaChart`.
3. Pattern serialize/parse Phase A–E.3: registry style deterministic, fail-closed `WRITER_FODT_UNSUPPORTED_CONTENT`, idempotence `serialize → parse → serialize`.

## Implementation summary (Chart)

- Nới guard `data-vno-chart`.
- Serialize khối chart trong `blockXml` (và `inlineXml` nếu nằm trong `p`) **không** đi `_fodtCssMap` chrome.
- Emit `draw:frame` as-char + nested `office:document` chart, `chart:class` bar/line/circle/area, một `chart:series`, `local-table` có `table:table-header-columns` + `table:table-columns`.
- Graphic `draw:ole-draw-aspect="1"`. `xmlns:chart` trên root khi có chart.
- Parse `draw:object`/`chart:chart` (bỏ `draw:image` preview LO) → `generateChartHtml` rồi cắt `<p><br></p>` đuôi. `text:p` chỉ chứa frame chart → emit div khối, không bọc `<p>`.
- Header/footer, SVG rỗng, 2 series, `chart:stock`: throw `WRITER_FODT_UNSUPPORTED_CONTENT`.
- `save()`/`exportPdf()`/`_contentForExport()` không đổi.

## FILES CHANGED

- `adapters/libreoffice/writer/writer-adapter.js` — Chart serialize+parse (additive).
- `tests/unit/writer-fodt-phase-e4-chart.test.js` — **mới**, 10 test.
- `tests/live/writer-fodt-phase-e4-chart-real-conversion.mjs` — **mới**, soffice thật.
- `tests/scripts/probe-writer-fodt-phase-e4.mjs` / `probe-writer-fodt-phase-e4-data.mjs` / `probe-writer-fodt-phase-e4-types.mjs` — đo trước code.
- `tests/scripts/word-verify-fodt-phase-e4-chart.mjs` — Start-Process Word thụ động.
- `tests/run-tests.js` — suite 111h.
- `docs/PLAN-WRITER-FODT-MIGRATION.md` — 7d Chart xong; Diagram vẫn để lại.
- `docs/HANDOFF-WRITER-FODT-PHASE-E4-FINDINGS.md` — đo trước code.
- `docs/HANDOFF-WRITER-FODT-MIGRATION-PHASE-E4.md` — file này.

Không đụng Sheet/Slides, Core, build system, `save()`/`exportPdf()`/`_contentForExport()`, `apps/writer/writer-illustrations.js`.

Không thêm bài Help giả — FODT chưa phải đường Save mặc định (cùng cutover gate).

## COMMANDS RUN

```
node tests/run-tests.js
node tests/live/writer-fodt-phase-e4-chart-real-conversion.mjs
node --check adapters/libreoffice/writer/writer-adapter.js
node tests/scripts/probe-writer-fodt-phase-e4.mjs
node tests/scripts/probe-writer-fodt-phase-e4-data.mjs
node tests/scripts/probe-writer-fodt-phase-e4-types.mjs
node tests/scripts/word-verify-fodt-phase-e4-chart.mjs
```

Cộng thêm: FODT serializer → soffice DOCX, `Start-Process` Microsoft Word thụ động (không SendKeys), chụp màn hình xác nhận bằng mắt, `Stop-Process WINWORD`. Ảnh/DOCX không nằm trong repo (`tmp-word-e4/` untracked).

## TEST RESULTS

- Baseline trước task: **1240/1240 PASS** @ `6012075`.
- `node tests/run-tests.js` sau Chart: **1250/1250 PASS** (0 FAIL). +10 test Phase E.4 Chart.
- Unit Phase A–E.3 giữ nguyên PASS (FODT không có chart không thêm `xmlns:chart`; diagram vẫn throw).
- `node tests/live/writer-fodt-phase-e4-chart-real-conversion.mjs`: **PASS**
  - `word/charts/chart1.xml` từng loại: `c:barChart` / `c:lineChart` / `c:pieChart` / `c:areaChart`.
  - cat `Q1 Q2 Q3 Q4`, val `120 190 300 250`, 1 `c:ser`, title ASCII đúng.
  - PDF `%PDF-`.
  - Idempotence VN `serialize → parse → serialize` trên FODT live từng loại.
- **Microsoft Word thật** (Start-Process thụ động, Compatibility Mode, Document Recovery pane từ các lần probe trước):
  - Cột: 4 thanh tỉ lệ 120<190<300>250, tiêu đề «Doanh thu Q1-Q4».
  - Đường: polyline lên rồi hơi xuống, tiêu đề `CHART_LINE_Q`.
  - Tròn: pie 4 lát + legend Q1–Q4, tiêu đề `CHART_PIE_Q` (lát **đen** — style LO `dPt` fill `#000000`, XML vẫn có số).
  - Miền: area fill cùng hình đường, tiêu đề `CHART_AREA_Q`.
  - Không lỗi khi mở.

## KNOWN FAILURES / LIMITATIONS (ghi rõ)

1. **Writer không lưu JSON labels/values.** Serializer đọc `<title>Nhãn: số</title>` do chính `generateChartSvg` ghi. SVG rỗng / title lệch dạng → throw, không đoán toạ độ.
2. **Local-table thiếu cột mất dữ liệu.** E.3 C1–C3 không đo cache số. Serializer VN **bắt buộc** `table:table-header-columns` + `table:table-columns`.
3. **Màu canvas SVG không map** sang ODF chart style. LO tô series mặc định (cột/đường/miền xanh `#99CCFF`; pie lát đen trên Word). Không claim màu Writer.
4. **Trục category Word có thể ẩn nhãn** (`tickLblPos=none` từ LO). Dữ liệu vẫn nằm `c:numCache`/`c:strCache` và hình chart.
5. Chart trong header/footer, 2 series, class stock/radar, SVG không có title-điểm: throw `WRITER_FODT_UNSUPPORTED_CONTENT`.
6. Phase E.4 chưa nối Save/Open/Export mặc định (cùng cutover gate).
7. **Diagram/SmartArt: không làm.** Probe không ra SmartArt Word; HTML 4 kiểu sẽ mất nếu flatten `draw:rect`.
8. Word visual: Compatibility Mode + Document Recovery pane (file probe cũ).

## RISKS

Thấp — additive. Rủi ro: FODT ngoài VN (LO thêm `chN`, `chart:data-point chart:repeated`, `draw:image` preview). Parser bỏ preview, nhận một series + local-table. Không claim parse mọi canonical LO.

## DEPENDENCIES/BLOCKERS

Không thư viện trả phí/ngoài. LibreOffice soffice bắt buộc cho live test.

## CORE PATCH ID: N/A

## NEXT ACTION

1. Người phụ trách đọc branch `feature/writer-fodt-migration-phase-e4` trước khi merge — **không tự merge**.
2. Diagram/SmartArt: chỉ khi có ánh xạ fail-closed 1-1 (hiện không có). Không giả SmartArt Word từ nhóm shape.
3. Khi cutover FODT thành default Save, bổ sung bài Help tiếng Việt cụ thể (Chèn > Biểu đồ, cảnh báo màu/trục Word là style LO chứ không phải SVG canvas).

## Commits

- `054e3ea` docs(writer): record Phase E.4 FODT chart probe findings
- `944f8de` feat(writer): FODT Phase E.4 Chart via office:chart local-table
- (docs PLAN + handoff này) docs(writer): mark FODT Phase E.4 Chart complete; Diagram still deferred
