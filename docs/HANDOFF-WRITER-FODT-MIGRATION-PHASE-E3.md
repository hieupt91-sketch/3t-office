# Agent Handoff

TASK: Writer FODT Migration — Phase E.3 (WordArt native; Chart/Diagram chưa làm)
AGENT/ROLE: Grok (coding agent), worktree riêng, không đụng Sheet/Slides source.
BRANCH: `feature/writer-fodt-migration-phase-e3`
WORKTREE: `E:\VNOffice-grok-writer-fodt-phase-e3`
BASE: `main` @ `7f610ca` — đo thật `node tests/run-tests.js` **1230/1230 PASS** trước khi làm (không dùng số trong handoff cũ).
**KHÔNG merge tự động vào main** — cùng gate như Phase A/B/B.1/B.2/C/D/E.1/E.2, người phụ trách đọc lại trước.

## Bối cảnh

Phase E.2 (đã merge) hỗ trợ Watermark native. Phase E gốc mục 7 còn WordArt / shape nâng cao / chart / diagram. E.3 làm **WordArt trước** (dễ→khó). Chart và SmartArt/Diagram **không** làm trong lượt này — xem RANH GIỚI.

Đo engine trước khi viết serializer: `docs/HANDOFF-WRITER-FODT-PHASE-E3-FINDINGS.md` (commit `f06392e`, trước mọi thay đổi `writer-adapter.js`). Sau Word visual, FINDINGS được bổ sung: `fontwork-plain-text` Word không sơn.

Nguyên tắc: không đánh dấu "hỗ trợ" nếu không có fixture, VN round-trip idempotent, và phép đo LibreOffice thật + Word bằng mắt.

## RANH GIỚI (đọc trước)

| Loại | Trạng thái | Bằng chứng |
|---|---|---|
| **WordArt** | **XONG** | Unit 10/10, live soffice DOCX `w:drawing`+`prstTxWarp textFadeRight`, Word bằng mắt chữ KHAI GIANG navy |
| **Chart** | **KHÔNG làm** | Probe C1–C3 **đã** ra `word/charts/chart1.xml` native — khả thi, nhưng chưa serializer/parse/test/Word. Để E.4, không để code dở |
| **SmartArt/Diagram** | **KHÔNG làm** | Probe D1–D3 ra shape rời/`wpg:wgp`, **không** SmartArt `dgm:`. HTML 4 layout Writer không map 1-1. `data-vno-diagram` vẫn throw |
| Shape cơ bản 6 loại | Đã có Phase B.2 | Không làm lại |

## Nghiên cứu trước khi thiết kế

1. Writer DOM/model thật (không đoán):
   - WordArt: span inline `buildWriterWordArtHtml` — `data-vno-wordart` + 8 preset CSS, **trong bodyDom**, không overlay `this.shapes`.
   - Chart: `<div class="vno-writer-chart" data-vno-chart>` + SVG `data-chart-type` bar/line/pie/area.
   - Diagram: `<div class="vno-writer-diagram" data-vno-diagram data-diagram-type>` process/cycle/hierarchy/list.
2. Probe soffice LibreOffice **26.2.5**: xem FINDINGS.
   - Fontwork **phải** nằm trong `text:p` (sibling nuốt, cùng B.2).
   - `fontwork-plain-text` → VML `o:spt="136"` — Word Compatibility Mode **không vẽ**.
   - `fontwork-fade-right` → `mc:AlternateContent` + `w:drawing` + `prstTxWarp textFadeRight` — **Word vẽ**.
   - Chart nested `office:chart` as-char → `word/charts/chart1.xml` (`c:barChart`/`c:lineChart`/`c:pieChart`).
   - Diagram `draw:rect`+`line`/`connector`/`draw:g` → shape Word, không SmartArt.
3. Pattern serialize/parse Phase A–E.2: registry style deterministic, fail-closed `WRITER_FODT_UNSUPPORTED_CONTENT`, idempotence `serialize → parse → serialize`.

## Implementation summary (WordArt)

- Nới guard `data-vno-wordart|wordart-preset|wordart-text|wordart-style`.
- Serialize span WordArt trong `inlineXml` **trước** generic span (CSS `-webkit-*`/`background-clip` sẽ throw nếu đi `_fodtCssMap`).
- Emit `draw:custom-shape` `fontwork-fade-right` neo `as-char`, `draw:name="WordArt-<presetId>"`, fill `fillColor` hoặc `gradient.from`, `draw:stroke="none"`.
- Parse `draw:type` bắt đầu `fontwork-` → `buildWriterWordArtHtml(text, { presetId })`. Tên không khớp 8 mẫu → `navy-outline`. **Không** đẩy vào `this.shapes`. `right-arrow` vẫn B.2.
- Header/footer: `allowWordArt=false` → throw.
- `save()`/`exportPdf()`/`_contentForExport()` không đổi.

## FILES CHANGED

- `adapters/libreoffice/writer/writer-adapter.js` — WordArt serialize+parse (additive).
- `tests/unit/writer-fodt-phase-e3-wordart.test.js` — **mới**, 10 test.
- `tests/live/writer-fodt-phase-e3-wordart-real-conversion.mjs` — **mới**, soffice thật.
- `tests/scripts/probe-writer-fodt-phase-e3.mjs` — đo trước code (WordArt/Chart/Diagram).
- `tests/scripts/probe-e3-wordart-visible.mjs` / `probe-e3-fontwork-types.mjs` — đo loại Fontwork Word có sơn.
- `tests/scripts/word-verify-fodt-phase-e3-wordart.mjs` — Start-Process Word thụ động.
- `tests/run-tests.js` — suite 111g.
- `docs/PLAN-WRITER-FODT-MIGRATION.md` — 7c WordArt xong; Chart/Diagram → E.4.
- `docs/HANDOFF-WRITER-FODT-PHASE-E3-FINDINGS.md` — đo trước code + bổ sung Word visual.
- `docs/HANDOFF-WRITER-FODT-MIGRATION-PHASE-E3.md` — file này.

Không đụng Sheet/Slides, Core, build system, `save()`/`exportPdf()`/`_contentForExport()`.

Không thêm bài Help giả — FODT chưa phải đường Save mặc định (cùng cutover gate).

## COMMANDS RUN

```
node tests/run-tests.js
node tests/live/writer-fodt-phase-e3-wordart-real-conversion.mjs
node --check adapters/libreoffice/writer/writer-adapter.js
node tests/scripts/probe-writer-fodt-phase-e3.mjs
node tests/scripts/probe-e3-fontwork-types.mjs
node tests/scripts/word-verify-fodt-phase-e3-wordart.mjs
```

Cộng thêm: FODT serializer → soffice DOCX, `Start-Process` Microsoft Word thụ động (không SendKeys), chụp màn hình xác nhận bằng mắt, `Stop-Process WINWORD`. Ảnh/DOCX không nằm trong repo (`tmp-word-e3/` untracked).

## TEST RESULTS

- Baseline trước task: **1230/1230 PASS** @ `7f610ca`.
- `node tests/run-tests.js` sau WordArt: **1240/1240 PASS** (0 FAIL). +10 test Phase E.3 WordArt.
- Unit Phase A–E.2 giữ nguyên PASS (FODT không có WordArt không thêm Fontwork; arrow B.2 không thành WordArt).
- `node tests/live/writer-fodt-phase-e3-wordart-real-conversion.mjs`: **PASS**
  - `word/document.xml` có `mc:AlternateContent`, `w:drawing`, `a:prstTxWarp prst="textFadeRight"`, `w:t>KHAI_GIANG`, `w:rFonts ascii="Impact"`, `w:color w:val="1E3A8A"`, VML fallback `v:textpath string="KHAI_GIANG"` `fillcolor="#1e3a8a"`.
  - PDF `%PDF-`.
  - Idempotence VN `serialize → parse → serialize` trên FODT live.
- **Microsoft Word thật** (Start-Process thụ động, Compatibility Mode, Document Recovery pane từ các lần probe trước):
  - Cửa sổ `phase-e3-wordart [Compatibility Mode] - Word`.
  - Câu «Kính gửi Ban Giám đốc. Chữ nghệ thuật nằm giữa câu: trước … sau — phải hiện WordArt xanh đậm…»
  - Chữ **KHAI GIANG** xanh navy lớn, hai dòng, hiệu ứng fade-right (chữ nhỏ dần về phải), nằm trên trang — **không** phải chữ thường Times 12pt.

## KNOWN FAILURES / LIMITATIONS (ghi rõ)

1. **`fontwork-plain-text` không hiện trên Word.** Đo bằng mắt: VML-only spt 136. Serializer VN emit `fontwork-fade-right`. Parser vẫn đọc `fontwork-*` kể cả plain-text/wave.
2. **Hiệu ứng WordArt Word là fade-right**, không phải CSS gradient/`-webkit-text-stroke`/`text-shadow` của canvas Writer. Preset id khôi phục qua `draw:name="WordArt-<preset>"` trên đường VN; import Fontwork Word (`WordArt 2`) → preset mặc định `navy-outline`.
3. **`fontSize` CSS 48px** emit 36pt; LO canonicalize fitshape. Idempotence VN không so canonical LO.
4. Gradient ODF không emit — chỉ `gradient.from` làm fill solid.
5. WordArt trong header/footer, preset lạ, custom-shape không phải arrow/fontwork: throw `WRITER_FODT_UNSUPPORTED_CONTENT`.
6. Phase E.3 chưa nối Save/Open/Export mặc định (cùng cutover gate). Đường HTML vẫn mất CSS WordArt qua soffice (audit cũ).
7. **Chart: không làm.** Probe đã chứng minh ODF chart as-char → `word/charts/chart1.xml` native. Chưa serializer vì hết thời gian sau WordArt visual (đúng ưu tiên “làm xong một loại rồi dừng”).
8. **Diagram/SmartArt: không làm.** Không phải lười — probe không ra SmartArt Word; HTML diagram 4 kiểu sẽ mất nếu flatten thành 3 hộp `draw:rect`.
9. Word visual: Compatibility Mode + Document Recovery pane; fade-right làm «KHAI GIANG» tách hai dòng trên ảnh — XML vẫn một `w:t`.

## RISKS

Thấp — additive. Rủi ro: FODT ngoài VN (LO thêm `draw:equation`/`modifiers`, đổi `gr1`, đổi type). Parser nhận mọi `fontwork-*` theo `draw:type` prefix. Không claim parse mọi canonical LO.

## DEPENDENCIES/BLOCKERS

Không thư viện trả phí/ngoài. LibreOffice soffice bắt buộc cho live test.

## CORE PATCH ID: N/A

## NEXT ACTION

1. Người phụ trách đọc branch `feature/writer-fodt-migration-phase-e3` trước khi merge — **không tự merge**.
2. Phase E.4 (đề xuất): Chart native (`chart:chart` local-table as-char, pattern C1 đã đo) rồi mới Diagram nếu có ánh xạ fail-closed.
3. Khi cutover FODT thành default Save, bổ sung bài Help tiếng Việt cụ thể (Chèn > Chữ nghệ thuật, cảnh báo Word hiện fade-right chứ không phải CSS gradient canvas).

## Commits

- `f06392e` docs(writer): record Phase E.3 FODT WordArt/chart/diagram probe findings
- `3261c0f` feat(writer): FODT Phase E.3 WordArt via Fontwork fade-right
- (docs PLAN + handoff này) docs(writer): mark FODT Phase E.3 WordArt complete; Chart/Diagram → E.4
