# Agent Handoff

TASK: Writer FODT Migration — Phase B.2 (JPEG/GIF/WEBP + Text Box/shape cơ bản)
AGENT/ROLE: Grok (coding agent), worktree riêng, không đụng Sheet/Slides source.
BRANCH: `feature/writer-fodt-migration-phase-b2`
WORKTREE: `E:\VNOffice-grok-writer-fodt-phase-b2`
BASE: `main` @ `4b5a297` — đo thật `node tests/run-tests.js` **1170/1170 PASS** trước khi làm (không dùng số 1151 trong handoff B.1 cũ).
**KHÔNG merge tự động vào main** — cùng gate như Phase A/B/B.1, người phụ trách đọc lại trước.

## Bối cảnh

Phase B/B.1 (đã merge) hỗ trợ bảng + PNG + colspan/rowspan. Phase B.2 theo `docs/PLAN-WRITER-FODT-MIGRATION.md` mục 4c: JPEG/GIF/WEBP (đọc kích thước thật) và Text Box/shape cơ bản. Đo engine trước khi viết serializer: `docs/HANDOFF-WRITER-FODT-PHASE-B2-FINDINGS.md` (commit `2ccf7de`, trước mọi thay đổi `writer-adapter.js`).

Nguyên tắc: không đánh dấu "hỗ trợ" nếu không có fixture, VN round-trip idempotent, và phép đo LibreOffice thật.

## Nghiên cứu trước khi thiết kế

1. Pattern Phase B `draw:frame text:anchor-type="as-char"` + `draw:image` + `office:binary-data` (copy từ Slides) — giữ nguyên cho ảnh, chỉ đổi mime-type.
2. `_fodtPngDimensionsPx` / `_fodtBase64ToBytes` — dispatcher mime mới, không đoán CSS.
3. Writer UI thật: `SHAPE_TYPES` trong `writer-illustrations.js` + `insertShape`/`insertTextBox` lưu `this.shapes[]` overlay, không nằm trong `bodyDom`. `_insertImageDialog()` `accept="image/*"` nên JPEG/GIF/WEBP/BMP đều có thể vào HTML.
4. Probe soffice LibreOffice **26.2.5**: xem FINDINGS.

## Implementation summary

- `_fodtImageDimensionsPx(mime, base64)`: PNG IHDR / JPEG SOF0+SOF2 / GIF bytes 6–9 / WEBP VP8|VP8L|VP8X (công thức riêng từng biến thể). Mime khác → `WRITER_FODT_UNSUPPORTED_CONTENT`.
- `imageXml`/`imageHtml`: `draw:mime-type` và data URI giữ mime thật (`image/jpeg|gif|webp|png`).
- Shape: serialize `this.shapes` thành primitive ODF **bên trong `text:p` đầu tiên** (đo: sibling `office:text` bị LO nuốt), neo `paragraph` + `svg:x/y`. Parse tách drawing ra `this.shapes`, không nhét overlay vào HTML.
- Mapping UI → ODF (đã convert soffice + Word):
  - rectangle → `draw:rect` → Word `prst=rect`
  - round-rect → `draw:rect` + `draw:corner-radius` → `roundRect`
  - circle → `draw:ellipse` (parser cũng nhận `draw:circle` vì LO canonicalize w=h) → `ellipse`
  - line → `draw:line` x1/y1/x2/y2 → `line`
  - arrow → `draw:custom-shape` `draw:type="right-arrow"` (path Slides đã đo) → `rightArrow`
  - textbox → `draw:frame` + `draw:text-box` → txbx native
- BMP/TIFF: từ chối rõ. Test Phase A/B dùng JPEG làm "ngoài phạm vi" đổi sang BMP (cùng pattern B.1 đổi colspan).

## FILES CHANGED

- `adapters/libreoffice/writer/writer-adapter.js` — image dispatcher + shape serialize/parse (additive; `save()`/`exportPdf()` không đổi).
- `tests/helpers/tiny-images.mjs` — **mới**, đọc fixture đã đo.
- `tests/fixtures/writer-fodt-phase-b2/` — JPEG 16×10 SOF0, GIF89a 12×8, BMP 8×6, WEBP VP8/VP8L/VP8X (bytes probe).
- `tests/unit/writer-fodt-phase-b2.test.js` — **mới**, 14 test.
- `tests/unit/writer-fodt-phase-a.test.js` / `tests/unit/writer-fodt-phase-b.test.js` — ví dụ reject đổi JPEG → BMP.
- `tests/live/writer-fodt-phase-b2-real-conversion.mjs` — **mới**, soffice thật.
- `tests/run-tests.js` — suite 111b.
- `tests/scripts/probe-writer-fodt-phase-b2.mjs` + `probe-writer-fodt-phase-b2-shapes-in-para.mjs` + `word-verify-fodt-phase-b2.mjs`
- `docs/PLAN-WRITER-FODT-MIGRATION.md` — đánh dấu 4c hoàn thành.
- `docs/HANDOFF-WRITER-FODT-PHASE-B2-FINDINGS.md` — đo trước code.
- `docs/HANDOFF-WRITER-FODT-MIGRATION-PHASE-B2.md` — file này.

Không đụng Sheet/Slides, Core, build system, `save()`/`exportPdf()`/`_contentForExport()`.

## COMMANDS RUN

```
node tests/run-tests.js
node tests/live/writer-fodt-phase-b2-real-conversion.mjs
node --check adapters/libreoffice/writer/writer-adapter.js
```

Cộng thêm (thủ công): FODT → soffice DOCX, `Start-Process` Microsoft Word thụ động (không SendKeys), chụp màn hình xác nhận bằng mắt, `Stop-Process WINWORD`, xóa thư mục tạm. Ảnh chụp/DOCX không nằm trong repo.

## TEST RESULTS

- Baseline trước task: **1170/1170 PASS** @ `4b5a297`.
- `node tests/run-tests.js` sau task: **1184/1184 PASS** (0 FAIL). +14 test Phase B.2.
- Unit Phase A/B giữ nguyên PASS (ví dụ reject cập nhật BMP).
- `node tests/live/writer-fodt-phase-b2-real-conversion.mjs`: **PASS**
  - JPEG: `word/media/imageN.jpeg` **Buffer.equals** 633 bytes gốc, `<w:drawing>`.
  - GIF: `word/media/imageN.gif` **Buffer.equals** 865 bytes gốc, `<w:drawing>`.
  - WEBP VP8/VP8L/VP8X: DOCX media là **PNG**, `Buffer.equals(webp gốc) === false` — LibreOffice 26.2.5 raster hóa; FODT VN vẫn `image/webp` và serialize→parse→serialize idempotent.
  - Shape: ≥6 `w:drawing`, `prstGeom` gồm `rect`, `roundRect`, `ellipse`, `line`, `rightArrow`, txbx chứa `HOP_VAN_BAN`. PDF `%PDF-`.
- **Microsoft Word thật**: JPEG đỏ 16×10 và GIF xanh 12×8 hiện đúng (đúng pixel, nên rất nhỏ); 6 shape + hộp «Hộp văn bản VN Writer» hiện native, không bị flatten thành chữ.

## KNOWN FAILURES / LIMITATIONS (ghi rõ)

1. **WEBP không byte-exact qua DOCX.** Engine mở FODT `image/webp` được nhưng filter DOCX/FODT canonicalize thành PNG. Không được claim `Buffer.equals` với bytes WEBP. VN FODT giữ webp.
2. JPEG SOF2 không có file GDI+ trên máy này; reader SOF2 được unit-test bằng header ghép, live soffice dùng SOF0.
3. Drawing đặt cùng cấp `text:p` trong `office:text` bị LO nuốt — serializer luôn nhét vào trong `text:p`.
4. Overlay `this.shapes` dùng tọa độ paragraph-relative; không phải page-absolute hoàn hảo so với canvas Writer, nhưng là primitive ODF thật đã ra Word shape.
5. Phase B.2 chưa nối Save/Open/Export mặc định (cùng cutover gate Phase A/B). Không thêm bài Help giả cho luồng người dùng chưa có.
6. Diagram/chart/WordArt vẫn ngoài phạm vi (HTML khác, không phải `this.shapes` 6 loại UI).

## RISKS

Thấp — additive. Rủi ro: parse FODT ngoài VN (LibreOffice canonicalize `draw:ellipse` w=h thành `draw:circle`, thêm `draw:equation` trên arrow) — parser nhận `draw:circle` và chỉ hỗ trợ `right-arrow`; custom-shape khác fail-closed.

## DEPENDENCIES/BLOCKERS

Không thư viện trả phí/ngoài. JPEG/GIF fixture là file GDI+ đã đo; WEBP tự dựng RIFF; PNG IHDR giữ nguyên Phase B.

## CORE PATCH ID: N/A

## NEXT ACTION

1. Người phụ trách đọc branch `feature/writer-fodt-migration-phase-b2` trước khi merge — **không tự merge**.
2. Phase C (đề xuất): page/header-footer/section geometry qua `style:page-layout` / `style:master-page`.
3. Khi cutover FODT thành default Save, bổ sung bài Help tiếng Việt cụ thể (Tệp > Lưu/Xuất, phạm vi ảnh/shape, cảnh báo WEBP→PNG khi mở bằng Word).
