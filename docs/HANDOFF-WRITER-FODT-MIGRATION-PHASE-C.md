# Agent Handoff

TASK: Writer FODT Migration — Phase C (page-layout, header/footer, section geometry)
AGENT/ROLE: Grok (coding agent), worktree riêng, không đụng Sheet/Slides source.
BRANCH: `feature/writer-fodt-migration-phase-c`
WORKTREE: `E:\VNOffice-grok-writer-fodt-phase-c`
BASE: `main` @ `420c4a4` — đo thật `node tests/run-tests.js` **1187/1187 PASS** trước khi làm (không dùng số 1184 trong handoff B.2 cũ).
**KHÔNG merge tự động vào main** — cùng gate như Phase A/B/B.1/B.2, người phụ trách đọc lại trước.

## Bối cảnh

Phase B.2 (đã merge) hỗ trợ JPEG/GIF/WEBP + Text Box/shape. Phase C theo `docs/PLAN-WRITER-FODT-MIGRATION.md` mục 5: page size/margin/orientation, header/footer, và geometry riêng từng vùng qua ODF thật — thay CSS `@page` named mà HTML filter LibreOffice bỏ (audit `docs/HANDOFF-WRITER-REALEXPORT-AUDIT.md`).

Đo engine trước khi viết serializer: `docs/HANDOFF-WRITER-FODT-PHASE-C-FINDINGS.md` (commit `f7829b0`, trước mọi thay đổi `writer-adapter.js`).

Nguyên tắc: không đánh dấu "hỗ trợ" nếu không có fixture, VN round-trip idempotent, và phép đo LibreOffice thật.

## Nghiên cứu trước khi thiết kế

1. Writer lưu page ở `this.pageSetup` + `this.sectionPageSetups` (không có `writer-page-setup.js`). Header/footer là `headerDom`/`footerDom` — **một cặp cho cả tài liệu**, không theo section. Envelope giữ `orientation: "portrait"` dù w>h.
2. Probe soffice LibreOffice **26.2.5**: xem FINDINGS. Cơ chế đổi geometry **đúng** là paragraph style `style:master-page-name` + `fo:break-before="page"`. Attribute trên `text:p` bị LO nuốt. `text:section` không đổi `w:pgSz`/PDF MediaBox.
3. Pattern serialize/parse Phase A/B: registry style deterministic, fail-closed `WRITER_FODT_UNSUPPORTED_CONTENT`, idempotence `serialize → parse → serialize`.

## Implementation summary

- `_fodtPageLayoutXml` / `_fodtMasterPageXml` / `_fodtPageSetupFromLayoutProps`: cm từ mm, `style:print-orientation` lấy từ `pageSetup.orientation` (không suy từ width>height).
- `serializeToFodt()` luôn phát `pm1` + `Standard`. Header/footer (nếu có chữ) đi vào mọi master-page, dùng lại `paragraphXml`. `margin`/`padding` trên header/footer là canvas chrome, bỏ khi serialize.
- Nhiều mục: nới guard `data-vno-section-break` / `data-vno-section-id`. Mỗi mục một master (`Standard`, `section-N`). `text:p` đầu vùng sau ngắt mang paragraph style có `style:master-page-name` — **không** đặt attribute đó trên `text:p`.
- `parseFodt()` đọc `style:page-layout` + `office:master-styles`, khôi phục `pageSetup` / `sectionPageSetups` / header/footer. HF khác nhau giữa master → throw. Field `text:page-number` trong header → throw.
- `save()`/`exportPdf()`/`_contentForExport()` không đổi.

## FILES CHANGED

- `adapters/libreoffice/writer/writer-adapter.js` — page-layout / master-page / header-footer / section geometry (additive).
- `tests/unit/writer-fodt-phase-c.test.js` — **mới**, 11 test.
- `tests/live/writer-fodt-phase-c-real-conversion.mjs` — **mới**, soffice thật.
- `tests/scripts/probe-writer-fodt-phase-c.mjs` — đo trước code.
- `tests/scripts/word-verify-fodt-phase-c.mjs` — Start-Process Word thụ động.
- `tests/run-tests.js` — suite 111c.
- `docs/PLAN-WRITER-FODT-MIGRATION.md` — đánh dấu mục 5 hoàn thành.
- `docs/HANDOFF-WRITER-FODT-PHASE-C-FINDINGS.md` — đo trước code.
- `docs/HANDOFF-WRITER-FODT-MIGRATION-PHASE-C.md` — file này.

Không đụng Sheet/Slides, Core, build system, `save()`/`exportPdf()`/`_contentForExport()`.

## COMMANDS RUN

```
node tests/run-tests.js
node tests/live/writer-fodt-phase-c-real-conversion.mjs
node --check adapters/libreoffice/writer/writer-adapter.js
node tests/scripts/probe-writer-fodt-phase-c.mjs
node tests/scripts/word-verify-fodt-phase-c.mjs
```

Cộng thêm (thủ công): FODT → soffice DOCX, `Start-Process` Microsoft Word thụ động (không SendKeys), chụp cửa sổ Word xác nhận bằng mắt, `Stop-Process WINWORD`. Ảnh chụp/DOCX không nằm trong repo.

## TEST RESULTS

- Baseline trước task: **1187/1187 PASS** @ `420c4a4`.
- `node tests/run-tests.js` sau task: **1198/1198 PASS** (0 FAIL). +11 test Phase C.
- Unit Phase A/B/B.2 giữ nguyên PASS (FODT mới luôn có page-layout; parse khôi phục default A4 nên idempotence cũ vẫn đúng).
- `node tests/live/writer-fodt-phase-c-real-conversion.mjs`: **PASS**
  - A4: `w:pgSz w:w="11906" w:h="16838"`, `w:pgMar` left=1701 right=850, `w:headerReference`/`w:footerReference`, `word/header1.xml`=`HEADER_A4_VN`, footer tương ứng, PDF MediaBox A4.
  - Letter landscape: `w:pgSz w:orient="landscape"` ~15817×12246 twips (khổ Writer 216×279 mm, không phải 11×8.5 in tuyệt đối của probe tay 27.94cm).
  - Mixed A4+DL: **2** `w:sectPr`, sectPr[0] A4 11906×16838, sectPr[1] envelope 12472×6236, `w:br type=page`, PDF **hai** MediaBox (A4 + 623.59×311.81).
- **Microsoft Word thật**: mở `phase-c-mixed.docx` (Start-Process). Trang 1: khổ A4 dọc, header «Công ty TNHH Sao Việt — Đầu trang» hiện trên vùng đầu trang, thân «Trang A4 — công văn khổ dọc 210×297 mm…». Trang 2 (phong bì) đã đo bằng XML/PDF hai sectPr/MediaBox; cửa sổ Word có Document Recovery pane và process thoát trước khi chụp được trang 2 — không claim ảnh trang 2.

## KNOWN FAILURES / LIMITATIONS (ghi rõ)

1. **Đổi master-page phải là paragraph style, không phải attribute trên `text:p`.** Đo LO 26.2.5: attribute trên `text:p` bị bỏ, DOCX chỉ còn một `w:sectPr` A4.
2. **`text:section` không đổi geometry** khi convert DOCX/PDF (cùng A4 `pgSz`, một MediaBox) dù canonical FODT giữ section.
3. Writer **không** có header/footer theo section. FODT nhập vào với HF khác nhau trên các master → throw, không giả.
4. `continuous` / `evenPage` / `oddPage` round-trip thành `nextPage` (`fo:break-before="page"`). Master-page change ODF luôn ngắt trang.
5. Footer Writer là chữ tĩnh `"Trang 1 / 1"` (Print Preview thay số). Field ODF `text:page-number` chưa hỗ trợ — parse throw.
6. `w:pgMar w:top` khi có header **không** còn đúng 20mm — engine cộng khoảng header. Live test assert `pgSz` + left/right + header part, không bắt `w:top`.
7. Phase C chưa nối Save/Open/Export mặc định (cùng cutover gate). Không thêm bài Help giả cho luồng người dùng chưa có.
8. Page border / page color / watermark / columns / footnote vẫn ngoài phạm vi.

## RISKS

Thấp — additive. Rủi ro: FODT ngoài VN (LibreOffice canonicalize thêm `loext:`, `style:parent-style-name`, đổi tên `pm1`) — parser đọc `print-orientation` + width/height với dung sai 8mm; không claim parse mọi canonical LO.

## DEPENDENCIES/BLOCKERS

Không thư viện trả phí/ngoài. LibreOffice soffice bắt buộc cho live test.

## CORE PATCH ID: N/A

## NEXT ACTION

1. Người phụ trách đọc branch `feature/writer-fodt-migration-phase-c` trước khi merge — **không tự merge**.
2. Phase D (đề xuất): footnote/endnote `text:note`, TOC native, comment `office:annotation`.
3. Khi cutover FODT thành default Save, bổ sung bài Help tiếng Việt cụ thể (Tệp > Lưu/Xuất, khổ trang/đầu-chân trang, cảnh báo mixed geometry chỉ đúng trên đường FODT).
