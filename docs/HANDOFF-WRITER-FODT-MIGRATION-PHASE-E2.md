# Agent Handoff

TASK: Writer FODT Migration — Phase E.2 (Watermark native, một phần của Phase E)
AGENT/ROLE: Grok (coding agent), worktree riêng, không đụng Sheet/Slides source.
BRANCH: `feature/writer-fodt-migration-phase-e2`
WORKTREE: `E:\VNOffice-grok-writer-fodt-phase-e2`
BASE: `main` @ `fbf56d7` — đo thật `node tests/run-tests.js` **1220/1220 PASS** trước khi làm (không dùng số trong handoff cũ).
**KHÔNG merge tự động vào main** — cùng gate như Phase A/B/B.1/B.2/C/D/E.1, người phụ trách đọc lại trước.

## Bối cảnh

Phase E.1 (đã merge) hỗ trợ Track Changes native. Phase E gốc trong `docs/PLAN-WRITER-FODT-MIGRATION.md` mục 7 gồm WordArt/shape/chart/diagram/watermark. E.2 tách riêng **chỉ Watermark**. WordArt/shape/chart/diagram để E.3.

Đo engine trước khi viết serializer: `docs/HANDOFF-WRITER-FODT-PHASE-E2-FINDINGS.md` (commit `638e1c2`, trước mọi thay đổi `writer-adapter.js`).

Nguyên tắc: không đánh dấu "hỗ trợ" nếu không có fixture, VN round-trip idempotent, và phép đo LibreOffice thật.

## Nghiên cứu trước khi thiết kế

1. Writer DOM/model thật (không đoán):
   - `this.watermark = { text, color, opacity, angle, fontSize }` — **chỉ chữ**, không ảnh. Một watermark cho cả tài liệu.
   - Canvas: overlay `.vno-page-watermark` CSS `rotate(-${angle}deg)`, **không** nằm `bodyDom`/`headerDom`.
   - `_contentForExport()` nhúng `position:fixed` — audit HTML filter flatten, không có VML/`behindDoc`.
2. Probe soffice LibreOffice **26.2.5**: xem FINDINGS.
   - `style:background-image` trên page-layout → DOCX `w:background` (nền trang), **không** header watermark. Không dùng.
   - `draw:frame` + `draw:text-box` trong `style:header` → `word/header1.xml` có `mc:AlternateContent` + `wp:anchor behindDoc="1"` + VML `v:shape` xoay. **Hướng chọn.**
   - `svg:transform="rotate(-45)"` → Word `rotation:58` (sai). Chỉ `draw:transform`.
   - Góc Writer 45 → ODF `rotate (0.785398163397448)` → Word VML `rotation:315`.
   - Reverse Word `PowerPlusWaterMarkObject` + `v:textpath` → FODT `draw:custom-shape` Fontwork. Parser đọc; serializer VN không giả id gallery (Fontwork nuốt `fontSize` thành 1pt).
3. Pattern serialize/parse Phase A–E.1: registry style deterministic, fail-closed `WRITER_FODT_UNSUPPORTED_CONTENT`, idempotence `serialize → parse → serialize`. Tái dùng `_fodtMasterPageXml` Phase C.

## Implementation summary

- Serialize: `draw:frame draw:name="Watermark"` + `draw:text-box` trong `style:header` mọi master-page. Graphic `grWm` wrap run-through / `style:run-through="background"` / căn giữa trang / `draw:opacity`. Text style bold + `fo:color` + `fo:font-size`. `draw:transform="rotate (radians)"` khi `angle !== 0`; radians = `angle * π/180` (`toFixed(15)`).
- Sống chung header user (frame trước, đoạn header sau).
- Parse: tách watermark khỏi header trước khi dựng `headerDom`. Nhận text-box `Watermark` và Fontwork `PowerPlusWaterMark*` / `WordPictureWatermark*`. Fontwork `1pt` → `fontSize` 72 mặc định.
- `style:background-image`, `draw:` lạ trong header, watermark khác nhau giữa master → throw, không sửa `bodyDom`.
- `save()`/`exportPdf()`/`_contentForExport()` không đổi.

## FILES CHANGED

- `adapters/libreoffice/writer/writer-adapter.js` — Watermark serialize+parse (additive). `_applyWatermark` phòng thủ khi `dataset`/appendChild không có (unit editor giả).
- `tests/unit/writer-fodt-phase-e2.test.js` — **mới**, 10 test.
- `tests/live/writer-fodt-phase-e2-real-conversion.mjs` — **mới**, soffice thật.
- `tests/scripts/probe-writer-fodt-phase-e2.mjs` — đo trước code.
- `tests/scripts/word-verify-fodt-phase-e2.mjs` — Start-Process Word thụ động.
- `tests/run-tests.js` — suite 111f.
- `docs/PLAN-WRITER-FODT-MIGRATION.md` — đánh dấu mục 7b Watermark hoàn thành; 7c WordArt/shape/chart/diagram để E.3.
- `docs/HANDOFF-WRITER-FODT-PHASE-E2-FINDINGS.md` — đo trước code.
- `docs/HANDOFF-WRITER-FODT-MIGRATION-PHASE-E2.md` — file này.

Không đụng Sheet/Slides, Core, build system, `save()`/`exportPdf()`/`_contentForExport()`.

Không thêm bài Help giả — FODT chưa phải đường Save mặc định (cùng cutover gate Phase E.1).

## COMMANDS RUN

```
node tests/run-tests.js
node tests/live/writer-fodt-phase-e2-real-conversion.mjs
node --check adapters/libreoffice/writer/writer-adapter.js
node tests/scripts/probe-writer-fodt-phase-e2.mjs
node tests/scripts/word-verify-fodt-phase-e2.mjs
```

Cộng thêm: FODT serializer → soffice DOCX, `Start-Process` Microsoft Word thụ động (không SendKeys), chụp màn hình xác nhận bằng mắt, `Stop-Process WINWORD`. Ảnh/DOCX không nằm trong repo (`tmp-word-e2/` untracked).

## TEST RESULTS

- Baseline trước task: **1220/1220 PASS** @ `fbf56d7`.
- `node tests/run-tests.js` sau task: **1230/1230 PASS** (0 FAIL). +10 test Phase E.2.
- Unit Phase A–E.1 giữ nguyên PASS (FODT không có watermark không thêm `grWm` / `style:header`).
- `node tests/live/writer-fodt-phase-e2-real-conversion.mjs`: **PASS**
  - `word/header1.xml` có `mc:AlternateContent`, `w:pict`/`v:shape`, `behindDoc="1"`, `rotation:315`, chữ `DỰ THẢO`, header user `HEADER_USER_TEXT Cong ty TNHH Sao Viet`.
  - `word/document.xml` có `w:headerReference`, **không** `w:background`.
  - `w:color w:val="DC2626"`, `w:sz w:val="144"` (72pt).
  - `wp:positionH/V relativeFrom="page" align=center`.
  - Idempotence VN `serialize → parse → serialize` trên FODT live.
- **Microsoft Word thật** (Start-Process thụ động, Compatibility Mode, Document Recovery pane từ các lần probe trước):
  - Cửa sổ `phase-e2-watermark [Compatibility Mode] - Word`.
  - Header «Công ty TNHH Sao Việt — Đầu trang» trên vùng đầu trang.
  - Thân «Kính gửi Ban Giám đốc…» đọc được bình thường.
  - Hình mờ **DỰ THẢO** màu đỏ nhạt, chữ lớn, xoay chéo (~315° / −45° CSS), nằm sau nội dung (không che chữ). Phần «ẢO» hiện rõ góc dưới trang vì hộp 16×6 cm xoay 45° kéo bounding box ra mép — XML căn giữa trang, không phải paragraph thường.

## KNOWN FAILURES / LIMITATIONS (ghi rõ)

1. **`style:background-image` không phải watermark Word.** Đo: ra `w:background` + `displayBackgroundShape`. Writer không có watermark ảnh → parse throw.
2. **Không giả `PowerPlusWaterMarkObject`.** Text-box LO đặt `v:shape id="shape_0"`. Word Design → Watermark gallery có thể không nhận preset; XML/visual vẫn là shape header xoay behind text. Fontwork thì ra gallery name nhưng mất `fontSize` Writer.
3. **`svg:transform` sai góc** (rotation:58). Chỉ `draw:transform`.
4. LO canonicalize thêm `translate` sau `rotate`, đổi tên style. Idempotence VN là serialize→parse→serialize output VN, không so canonical LO.
5. Fontwork import: `fo:font-size="1pt"` (fitshape) → parser gán `fontSize` 72 mặc định, không bịa cỡ.
6. Nhiều watermark khác nhau theo trang/section, watermark ảnh, `draw:` không phải watermark trong header: throw `WRITER_FODT_UNSUPPORTED_CONTENT`.
7. Phase E.2 chưa nối Save/Open/Export mặc định (cùng cutover gate). Đường HTML vẫn CSS `position:fixed`.
8. WordArt / shape nâng cao / chart / diagram: **không** làm — để Phase E.3.
9. Word visual: Compatibility Mode + Document Recovery pane; không claim gallery Design → Watermark đã liệt kê preset.

## RISKS

Thấp — additive. Rủi ro: FODT ngoài VN (LO thêm translate, đổi `grWm`→`gr1`, Fontwork thay text-box). Parser nhận cả hai dạng trong header theo `draw:name`. Không claim parse mọi canonical LO.

## DEPENDENCIES/BLOCKERS

Không thư viện trả phí/ngoài. LibreOffice soffice bắt buộc cho live test.

## CORE PATCH ID: N/A

## NEXT ACTION

1. Người phụ trách đọc branch `feature/writer-fodt-migration-phase-e2` trước khi merge — **không tự merge**.
2. Phase E.3 (đề xuất): WordArt / shape nâng cao / chart / diagram qua FODT, sau probe DOCX fidelity.
3. Khi cutover FODT thành default Save, bổ sung bài Help tiếng Việt cụ thể (Bố cục > Hình mờ, cảnh báo đường HTML cũ không ghi watermark header native).
