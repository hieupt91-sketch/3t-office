# Plan: Sheet / Slides native export fidelity (hậu-kỳ OOXML)

Sáng kiến **lâu dài**. Không phải một task làm xong trong một phiên. Chạy song song với sáng kiến tương tự của Codex cho Writer — **cùng nguyên tắc, không dùng chung code**.

Nguyên tắc:

1. UI serialize ODF phẳng (FODS/FODP) như hiện tại.
2. LibreOffice `soffice --convert-to` tạo file Office thật (XLSX/PPTX = ZIP chứa XML).
3. VN Office **mở lại ZIP**, patch XML entry bằng cấu trúc **OOXML chuẩn** (không namespace `vno:`), đóng gói lại.
4. Chỉ patch khi OOXML thật sự có chỗ chuẩn. Nếu là giới hạn kiến trúc PowerPoint/Excel — ghi rõ, không làm giả.

Phase 1, 2a, 2b, 2b-open, 3a (`p14:sectionLst` lúc Lưu), 3a-open (overlay Sections lúc Mở) và Phase 3b Set Up Show (`p:showPr` trên `ppt/presProps.xml`) đã merge `main`. Overlay File → Mở Set Up Show (`vno:without-narration` / `vno:pointer-color`) nằm trên branch `feature/slides-setup-show-open-overlay` — **không merge vào `main`** cho đến khi người phụ trách review.

---

## Objective

Sau khi LibreOffice convert, file XLSX/PPTX người dùng nhận phải giữ những thuộc tính mà Excel/PowerPoint **đã hỗ trợ trong OOXML** nhưng filter convert của LibreOffice không sinh ra.

## Current capability (điểm xuất phát)

- `main` @ `9540533` (đã merge audit real-export). `node tests/run-tests.js` **1107/1107 PASS** trước Phase 1.
- FODS/FODP nội bộ đúng nhiều thuộc tính (Protect Sheet/Workbook, master theme, sections, charts, …).
- Hop soffice FODS→XLSX / FODP→PPTX **làm mất** một số thuộc tính — đo trong `docs/HANDOFF-SHEET-SLIDES-REALEXPORT-AUDIT.md`.

Giới hạn đã xác nhận (audit trước):

| Mục | File nội bộ | Sau hop MS Office | Ghi chú |
|---|---|---|---|
| Protect Workbook `table:structure-protected` | Còn | Mất khóa structure trên XLSX | **OOXML có** `<workbookProtection lockStructure>` |
| Slide Master logo / `vno:master-theme` | Còn | Mất qua PPTX; nền fill còn | Cần chỗ DrawingML chuẩn |
| Slide Sections `vno:section-*` | Còn | Mất qua PPTX (LO không sinh `p14:sectionLst`) | **Phase 3a vá** extension PowerPoint 2010 |
| Set Up Show `vno:pointer-color` / `vno:without-narration` | Còn | **Phase 3b vá** `p:showPr` trên `ppt/presProps.xml` (`showNarration=0` / `p:penClr`); `endless` LO đã giữ | Kiosk / start–end: VN UI chưa lưu |
| Color Scale / Data Bar / Icon Set CF | Chưa serialize | — | Chưa có UI |
| Transition `flip` | Có trong FODP | Mất qua PPTX | Đã ghi từ trước |
| Number format category=text | Style ODF | Mất `number:text-style` | Cùng fail trên `main` |
| SmartArt | Flatten `draw:g` | Shape thường | Không phải DrawingML SmartArt |

## Data flow (chỗ chèn hậu-kỳ)

```
VN Sheet / Slides UI
  → Adapter serialize FODS / FODP
  → UnoBridge.saveRealFile()          [JS, không thấy bytes XLSX/PPTX]
  → main.py save_document_dialog()
       write draft.fods | draft.fodp
       soffice --convert-to xlsx|pptx
       ★ POST-PROCESS ZIP/XML  ← chèn ở đây
       copyfile → đường dẫn người dùng chọn
```

Vì sao **Python `main.py`**, không phải SheetAdapter:

- Convert thật chạy trong process Python.
- `save_document_dialog` tự ghi file đích; JS không nhận bytes XLSX/PPTX.
- SheetAdapter chạy trong pywebview — **cấm** `import "node:fs"`.

Module JS (Node, cho test + cùng thuật toán) nằm cạnh adapter. Module Python là twin production. Cùng hợp đồng: `bytes + {entryName: xml} → bytes`.

```
tests/live  → convertWithSoffice → postProcessSheetXlsx() [JS]
                                   ooxml_zip_patch.py     [Python CLI]
            → soffice mở lại (FODS/PDF) để chứng minh file không hỏng
```

## Files / modules

| File | Vai trò |
|---|---|
| `adapters/libreoffice/common/ooxml-zip-patch.js` | ZIP đọc/ghi/patch, không dependency |
| `adapters/libreoffice/common/ooxml_zip_patch.py` | Twin Python; CLI `--xlsx/--fods/--out` |
| `adapters/libreoffice/sheet/xlsx-workbook-protection.js` | XML thuần, browser-safe |
| `adapters/libreoffice/sheet/xlsx-native-postprocess.js` | Node: patch XLSX sau soffice |
| `adapters/libreoffice/sheet/sheet-adapter.js` | `wantsNativeXlsxWorkbookProtection()`; serialize FODS giữ nguyên |
| `main.py` | Gọi post-process sau convert, trước copyfile (Sheet XLSX + Slides PPTX) |
| `adapters/libreoffice/slides/pptx-master-logo.js` | XML thuần: chèn `p:sp` không `p:ph` lên slide master |
| `adapters/libreoffice/slides/pptx-section-list.js` | XML thuần: chèn `p14:sectionLst` vào `ppt/presentation.xml` |
| `adapters/libreoffice/slides/pptx-show-properties.js` | XML thuần: vá `p:showPr` trên `ppt/presProps.xml` (không phải presentation.xml) |
| `adapters/libreoffice/slides/pptx-native-postprocess.js` | Node: patch PPTX sau soffice (logo + sections + showPr); overlay FODP lúc Mở |
| `tests/unit/slides-pptx-master-logo.test.js` | Suite 110 |
| `tests/unit/slides-pptx-masterlogo-open-overlay.test.js` | Suite 114 — overlay FODP từ `VNOfficeMasterLogo` |
| `tests/live/slides-pptx-master-logo-native-export.mjs` | soffice thật FODP→PPTX→patch→FODP/PDF |
| `tests/live/slides-pptx-masterlogo-native-open.mjs` | soffice thật Lưu PPTX logo → Mở FODP overlay |
| `tests/unit/slides-pptx-section-list.test.js` | Suite 112 |
| `tests/live/slides-pptx-sections-native-export.mjs` | soffice thật FODP sections → PPTX → patch → FODP/PDF |
| `tests/unit/slides-pptx-sections-open-overlay.test.js` | Suite 113 — overlay FODP từ `p14:sectionLst` |
| `tests/live/slides-pptx-sections-native-open.mjs` | soffice thật Lưu PPTX → Mở FODP overlay |
| `tests/unit/slides-pptx-show-properties.test.js` | Suite 115 |
| `tests/live/slides-pptx-setup-show-native-export.mjs` | soffice thật FODP Set Up Show → PPTX → patch `presProps.xml` |
| `tests/unit/slides-pptx-setup-show-open-overlay.test.js` | Suite 116 — overlay FODP từ `p:showPr` |
| `tests/live/slides-pptx-setup-show-native-open.mjs` | soffice thật Lưu PPTX Set Up Show → Mở FODP overlay |
| `tests/helpers/zip-package.mjs` | Re-export production ZIP patcher |
| `tests/unit/sheet-xlsx-native-postprocess.test.js` | Suite 107 |
| `tests/live/sheet-xlsx-workbook-protection-native-export.mjs` | soffice thật |

Không đụng Writer source. Không core patch.

---

## Phase 1 — Protect Workbook structure lock qua XLSX (task này)

**Giá trị cao, rủi ro thấp nhất.**

Probe soffice thật (Calc): `xl/workbook.xml` **đã có**

```xml
<workbookProtection lockWindows="false"/>
```

đúng chỗ schema ECMA-376 `CT_Workbook`:

`fileVersion → workbookPr → workbookProtection → bookViews → sheets → calcPr`

LibreOffice **không** ghi `lockStructure="1"`. Excel Protect Workbook (Structure) chính là thuộc tính đó — không phải custom namespace.

Việc làm: nếu FODS có `table:structure-protected="true"` (tức `grid.workbookProtection.enabled`), set `lockStructure="1"` trên element có sẵn; chỉ chèn element mới khi thiếu.

Không ghi password hash OOXML (`workbookAlgorithmName` / `hashValue` / `saltValue` / `spinCount`) — VN Office đang khóa giao diện, mật khẩu phiên plaintext. Hash Excel là Phase sau nếu product đổi quyết định bảo mật.

### Test Phase 1

- Unit: XML đúng chỗ schema; idempotent; no-op khi không khóa; ZIP giả.
- Live: FODS→XLSX (LO chưa khóa) → JS patch + Python patch → soffice XLSX→FODS và XLSX→PDF không lỗi.
- `node tests/run-tests.js` 100% PASS.

### Kết quả đo Phase 1 (xem handoff)

- File patched **hợp lệ** (soffice mở lại FODS + PDF).
- `lockStructure="1"` có trong `xl/workbook.xml`.
- LibreOffice XLSX→FODS **không** map ngược `lockStructure` → `table:structure-protected`. Import overlay = Phase 2.

---

## Phase 2 — đề xuất (trung bình / trung bình-cao)

Làm **từng mục**, mỗi mục một worktree/branch.

### 2a. Overlay Protect Workbook khi Mở XLSX — **HOÀN THÀNH** (thấp-trung bình)

LibreOffice convert XLSX→FODS **bỏ** `lockStructure`, nên File → Mở file vừa Lưu mất khóa trên canvas VN Sheet dù Excel vẫn thấy khóa.

Writer **có thật** pattern `ooxmlDocumentXml`: `main.py` đọc `word/document.xml` từ DOCX gốc, adapter overlay sau convert. Phase 2a làm tương tự cho Sheet, nhưng overlay **FODS** (không phải HTML):

1. soffice XLSX→FODS
2. Đọc `xl/workbook.xml` của XLSX **gốc** qua `ooxml_zip_patch.read_zip_entry` (không viết lại ZIP)
3. Nếu `lockStructure="1"|true`, chèn `table:structure-protected="true"` vào `<office:spreadsheet>` **trước** `SheetAdapter.parseFods()`
4. `loadFromFods` gán `grid.workbookProtection.enabled` → `_applyProtectionUi` → canvas khóa thật (nút Review, chặn thêm/xóa/đổi tên trang)

Hai twin: JS `overlayFodsStructureProtection` / `overlaySheetXlsxFods`; Python `overlay_fods_structure_protection` / `overlay_sheet_xlsx_fods`. `SheetAdapter.open()` còn overlay từ `ooxmlWorkbookXml` (belt-and-suspenders, giống Writer).

Kết quả đo: Lưu XLSX (Phase 1 `lockStructure=1`) → soffice XLSX→FODS **không** còn `structure-protected` → overlay → `SheetAdapter.workbookProtection.enabled === true` và `grid.isWorkbookProtected() === true`. Live soffice + `open_document_dialog` PASS.

Handoff: `docs/HANDOFF-SHEET-NATIVE-EXPORT-PHASE2A.md`.

### 2b. Slide Master logo bằng DrawingML chuẩn — **HOÀN THÀNH** (trung bình-cao)

**Không phải giới hạn kiến trúc PowerPoint.** Probe Phase 1 + lặp lại Phase 2b trên `main` @ `5867e5b`:

- `ppt/slideMasters/slideMaster1.xml` ~14 KB, `p:sldSz cx="10080625" cy="5670550"` (28cm × 15.75cm).
- 5 `p:sp`, **toàn placeholder**: `title` `id=2`, `body` `id=3`, `dt` `id=4`, `ftr` `id=5`, `sldNum` `id=6`. Group `id=1`.
- Logo text `"VN OFFICE • SANG TAO"` **không** có. `vno:master-theme` mất.

Chỗ chuẩn đã vá (hậu-kỳ, tái sử dụng `ooxml_zip_patch`):

- Chèn một `p:sp` **không** `p:ph`, `p:cNvPr id="7" name="VNOfficeMasterLogo"`, `p:nvSpPr/p:spPr/p:txBody` đúng ECMA-376 `CT_Shape`.
- Tọa độ EMU: dải trên, dưới `title.y` (probe title `y=226080`) — AABB không đè 5 placeholder.
- Nguồn chữ/màu/font: `vno:master-theme` trên FODP nguồn (fallback `draw:frame grMasterLogo`).
- Hook `main.py` `_apply_native_export_postprocess` khi `app_kind=="slides"` và `target_format=="pptx"`.

Kết quả đo (soffice thật):

- Convert thuần: logo **mất**. Sau JS + Python patch: `slideMaster1.xml` có chữ, không `p:ph`.
- soffice PPTX→FODP **giữ** chữ trên `<style:master-page>` (`loRoundTripLogoOnMasterPage=true`). File không hỏng (FODP + PDF).
- `parseFodp().masterTheme.logoText` vẫn `null` sau hop thuần — LO không phát `vno:master-theme` / `grMasterLogo`. Overlay File → Mở = mục 2b-open ngay dưới.
- PDF scrape không thấy chuỗi ASCII — không kết luận logo mất; FODP đã chứng minh soffice đọc shape.
- Footer `ftr` / `p:hf` **không** vá ở 2b.

Handoff: `docs/HANDOFF-SLIDES-MASTER-LOGO-PHASE2B.md`.

### 2b-open. Overlay Slide Master logo khi Mở PPTX — **HOÀN THÀNH** (thấp-trung bình)

LibreOffice convert PPTX→FODP **giữ** chữ logo trên `<style:master-page>` dưới dạng `draw:custom-shape draw:name="VNOfficeMasterLogo"` nhưng **bỏ** `vno:master-theme` / `grMasterLogo`, nên File → Mở file vừa Lưu mất ô logo trên canvas VN Slides dù PowerPoint/Impress vẫn thấy chữ trên master.

Sections 3a-open đã có pattern: đọc OOXML gốc sau soffice, overlay FODP trước `parseFodp()`. Overlay này làm tương tự cho logo:

1. soffice PPTX→FODP
2. Đọc `ppt/slideMasters/slideMaster*.xml` của PPTX **gốc** qua `ooxml_zip_patch.read_zip_entry` (không viết lại ZIP)
3. Tìm `p:sp` **chỉ** theo `name="VNOfficeMasterLogo"` (Phase 2b). 0 shape → no-op. >1 trên một master, hai master khác chữ/màu/font, shape mang `p:ph`, hoặc thiếu `a:t` → **ném**, không đoán `p:sp` khác.
4. Lấy `a:t` → `logoText`, `a:srgbClr` → `accentColor` (`B53818` → `#b53818`), `a:latin/@typeface` → `fontFamily` (`Times New Roman`)
5. Gắn `vno:master-theme` JSON lên `<style:master-page>` **trước** `SlidesAdapter.parseFodp()`
6. Thêm `xmlns:vno` trên `<office:document>` nếu thiếu

Hai twin: JS `overlayFodpMasterLogo` / `overlaySlidesPptxFodp`; Python `overlay_fodp_master_logo` / `overlay_slides_pptx_fodp` (cùng hook Sections). `SlidesAdapter.loadFromFodp(fodp, ooxmlPresentationXml, ooxmlSlideMasterXml)` overlay **trước** `parseFodp` (belt-and-suspenders).

Không đọc `draw:custom-shape` FODP soffice làm nguồn — nguồn sự thật là ZIP gốc, giống Sections đọc `p14:sectionLst`.

Kết quả đo: Lưu PPTX (Phase 2b `VNOfficeMasterLogo`) → soffice PPTX→FODP **không** còn `vno:master-theme` / `grMasterLogo` (`parseFodp().masterTheme=null`) → overlay → `logoText="VN OFFICE • SANG TAO"`, `accentColor="#b53818"`, `fontFamily="Times New Roman"` → `canvas.applySlideMaster` hiện lại ô logo. Live soffice + `open_document_dialog` PASS. Hai shape trùng tên / mang `p:ph` → File → Mở `status=error`.

Handoff: `docs/HANDOFF-SLIDES-MASTERLOGO-OPEN-OVERLAY.md`. Findings đo trước code: `docs/HANDOFF-SLIDES-MASTERLOGO-OPEN-OVERLAY-FINDINGS.md`.

### 2c. Theme màu/font native — độ phức tạp: trung bình

`ppt/theme/theme1.xml` (`a:clrScheme`, `a:fontScheme`) là chỗ chuẩn. LO đã ghi theme. Có thể patch scheme cho `titleColor` / `accentColor` / `bgColor` nếu probe cho thấy scheme LO không khớp `masterTheme`. Đo trước, đừng đoán.

---

## Phase 3 — đề xuất (cao / cần nghiên cứu)

### 3a. Slide Sections qua PPTX — **HOÀN THÀNH** (trung bình-cao)

**Không phải giới hạn kiến trúc PowerPoint.** Probe trên `main` @ `462ab51` (script `tests/scripts/probe-slides-sections-pptx.mjs`):

- FODP 6 `draw:page`, 2 phần (`vno:section-id` / `vno:section-name`) serialize đúng.
- Sau `soffice --convert-to pptx`: `ppt/presentation.xml` **877 byte**, `p:sldIdLst` = 256–261, **không** có `p:extLst`, **không** có `p14:sectionLst`, tên phần mất.
- LibreOffice **đã khai báo** `xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main"` trên `<p:presentation>` nhưng không dùng.

Chỗ chuẩn đã vá (hậu-kỳ, tái sử dụng `ooxml_zip_patch`):

- Chèn `p:extLst` / `p:ext uri="{521415D9-36F7-43E2-AB2F-B90AF26B5E84}"` / `p14:sectionLst`.
- Mỗi `p14:section` có `name` + GUID v5 ổn định từ `vno:section-id`; `p14:sldId/@id` = id **thật** trong `p:sldIdLst` (không đoán 256, 257, …).
- Hook `main.py` chạy khi FODP có logo **hoặc** có phần (bài chỉ có phần, không logo, vẫn vá).

Kết quả đo (soffice thật):

- Convert thuần: `p14:sectionLst` **không có**. Sau JS + Python patch: 2 phần, id 256–258 / 259–261, đúng tên.
- soffice PPTX→FODP và PPTX→PDF **không lỗi** (`sofficeReopenFodpOk=true`, `sofficeReopenPdfOk=true`). File không hỏng.
- soffice PPTX→FODP **không** map ngược `p14:sectionLst` → `vno:section-*` (`loRoundTripSectionInFodp=false`). Overlay import = mục ngay dưới (File → Mở).
- **Đây là tính năng OOXML/PowerPoint thật**, không phải giả định. LibreOffice filter **không sinh** extension khi FODP→PPTX, nhưng **chấp nhận** file đã vá khi mở lại.

Không nhét `vno:section-*` vào PPTX.

Handoff: `docs/HANDOFF-SLIDES-SECTIONS-NATIVE-EXPORT.md`.

### 3a-open. Overlay Slide Sections khi Mở PPTX — **HOÀN THÀNH** (thấp-trung bình)

LibreOffice convert PPTX→FODP **bỏ** `p14:sectionLst`, nên File → Mở file vừa Lưu mất thanh phần trên canvas VN Slides dù PowerPoint vẫn thấy phần.

Sheet Phase 2a đã có pattern: đọc OOXML gốc sau soffice, overlay FODS trước `parseFods()`. Overlay này làm tương tự cho Slides:

1. soffice PPTX→FODP
2. Đọc `ppt/presentation.xml` của PPTX **gốc** qua `ooxml_zip_patch.read_zip_entry` (không viết lại ZIP)
3. Parse `p:sldIdLst` + `p14:sectionLst`. Số `p:sldId` **phải** bằng số `draw:page` — lệch thì **ném**, không đoán. `p14:sldId` không có trong `p:sldIdLst` hoặc thuộc hai phần cũng ném.
4. Gắn `vno:section-id` / `vno:section-name` vào đúng `draw:page` theo **thứ tự** (probe: `draw:name` sau hop là tiêu đề trang, không dùng để map) **trước** `SlidesAdapter.parseFodp()`
5. Thêm `xmlns:vno` trên `<office:document>` nếu thiếu

Hai twin: JS `overlayFodpSections` / `overlaySlidesPptxFodp`; Python `overlay_fodp_sections` / `overlay_slides_pptx_fodp`. `SlidesAdapter.loadFromFodp(fodp, ooxmlPresentationXml)` overlay **trước** `parseFodp` (belt-and-suspenders).

`vno:section-id` = `p14:section/@id` (GUID PowerPoint). Xuất lại: nếu id đã là GUID `{…}` thì **tái sử dụng**, không hash UUID v5 lần hai.

Kết quả đo: Lưu PPTX (Phase 3a `p14:sectionLst`) → soffice PPTX→FODP **không** còn `vno:section-*` / tên phần / URI → overlay → `parseFodp().sections` = «Gioi thieu» (trang 1–3) + «Noi dung chinh» (trang 4–6), id GUID khớp. Live soffice + `open_document_dialog` PASS. Lệch 6 sldId vs 5 `draw:page` → File → Mở `status=error`, không gán bừa.

Handoff: `docs/HANDOFF-SLIDES-SECTIONS-OPEN-OVERLAY.md`. Findings đo trước code: `docs/HANDOFF-SLIDES-SECTIONS-OPEN-OVERLAY-FINDINGS.md`.

### 3b. Set Up Slide Show — **HOÀN THÀNH** (thấp-trung bình)

**Không phải giới hạn kiến trúc PowerPoint** cho narration/pen. Probe `tests/scripts/probe-slides-setup-show-pptx.mjs` trên `main` @ `77398d7`:

- Chỗ chuẩn là `ppt/presProps.xml` / `p:presentationPr` / `p:showPr` (ECMA-376 `CT_ShowProperties`). **`ppt/presentation.xml` không chứa showPr.**
- LibreOffice **đã ghi** `<p:showPr loop="1" showNarration="1"></p:showPr>` khi FODP có `presentation:endless`. Loop round-trip PPTX→FODP **PASS**.
- LibreOffice **luôn** `showNarration="1"` — không đọc `vno:without-narration`.
- LibreOffice **không** sinh `p:penClr` từ `vno:pointer-color` (cũng không từ `presentation:mouse-as-pen` ODF).
- VN UI hiện tại **chỉ** lưu 3 trường (`loopUntilEsc` / `showWithoutNarration` / `pointerColor`). Không kiosk, không start/end. Không bịa `p:kiosk` / `p:sldRg`.

Chỗ chuẩn đã vá (hậu-kỳ, tái sử dụng `ooxml_zip_patch`):

- `showNarration="0"` khi FODP có `vno:without-narration="true"`.
- `p:penClr/a:srgbClr` khi FODP có `vno:pointer-color`.
- Giữ `@loop` và `p:sldRg` LibreOffice đã viết. Không nhét `vno:*` vào PPTX.
- Hook `main.py` nới: bài chỉ Set Up Show (không logo, không phần) vẫn vá.

Kết quả đo (soffice thật):

- Convert thuần: `showNarration=true`, không `penClr`. Sau JS + Python patch: `showNarration=false`, `penRgb=112233`, `loop=true`.
- soffice PPTX→FODP và PPTX→PDF **không lỗi**. `presentation:endless` còn. `vno:*` **không** round-trip (`loRoundTripVno=false`). Overlay File → Mở = mục 3b-open ngay dưới.
- **Đây là tính năng OOXML/PowerPoint thật** (`showNarration` / `penClr`), không giả.

Giới hạn thật (không làm giả):

| Mục | Lý do |
|---|---|
| Loop | LO đã map `presentation:endless` → `@loop` |
| Kiosk / presenter / browse | VN UI không lưu; LO không map ODF đã thử thành `p:kiosk` |
| Slide start/end | VN không serialize `presentation:start-page`; LO **đã** map sang `p:sldRg` nếu ODF có |

Handoff: `docs/HANDOFF-SLIDES-SETUP-SHOW-NATIVE-EXPORT.md`. Findings đo trước code: `docs/HANDOFF-SLIDES-SETUP-SHOW-NATIVE-FINDINGS.md`.

### 3b-open. Overlay Set Up Show khi Mở PPTX — **HOÀN THÀNH** (thấp)

LibreOffice convert PPTX→FODP **giữ** `presentation:endless` (`loRoundTripEndless=true`) nhưng **bỏ** `vno:without-narration` / `vno:pointer-color` (`loRoundTripVno=false`), nên File → Mở file vừa Lưu mất hai cờ trên dialog Set Up Show dù PowerPoint vẫn thấy `showNarration=0` / `p:penClr`.

Sections 3a-open / Master-logo 2b-open đã có pattern: đọc OOXML gốc sau soffice, overlay FODP trước `parseFodp()`. Overlay này làm tương tự cho Set Up Show:

1. soffice PPTX→FODP
2. Đọc `ppt/presProps.xml` của PPTX **gốc** qua `ooxml_zip_patch.read_zip_entry` (không viết lại ZIP)
3. Parse `p:showPr`. Không có `showPr` → no-op. `showNarration` không phải `"0"`/`false` → không gắn `vno:without-narration`. `p:penClr` / `srgbClr/@val` không hex 6 chữ → không gắn `vno:pointer-color`. ZIP hỏng → **ném**.
4. Gắn `vno:without-narration="true"` / `vno:pointer-color="#rrggbb"` lên `<presentation:settings>` **trước** `SlidesAdapter.parseFodp()` (giữ `endless` / `pause` / `mouse-visible` LO đã viết)
5. Thêm `xmlns:vno` trên `<office:document>` nếu thiếu
6. **Không** overlay `@loop` / `presentation:endless`

Hai twin: JS `overlayFodpShowProperties` / `overlaySlidesPptxFodp`; Python `overlay_fodp_show_properties` / `overlay_slides_pptx_fodp` (cùng hook Sections/logo). `SlidesAdapter.loadFromFodp(..., ooxmlPresPropsXml)` overlay **trước** `parseFodp` (belt-and-suspenders).

Kết quả đo: Lưu PPTX (Phase 3b `showNarration=0` / `penClr=112233`) → soffice PPTX→FODP **không** còn `vno:*` (`parseFodp().slideShowSettings.showWithoutNarration=false`, `pointerColor="#DC2626"`) nhưng `endless` còn → overlay → `showWithoutNarration=true`, `pointerColor="#112233"`, `loopUntilEsc=true` → dialog Set Up Show hiện lại đúng. Live soffice + `open_document_dialog` PASS. ZIP hỏng → File → Mở `status=error`.

Handoff: `docs/HANDOFF-SLIDES-SETUP-SHOW-OPEN-OVERLAY.md`. Findings đo trước code: `docs/HANDOFF-SLIDES-SETUP-SHOW-OPEN-OVERLAY-FINDINGS.md`.

### 3c. Color Scale / Data Bar / Icon Set CF — độ phức tạp: cao

Blocked: **chưa có UI**. Thứ tự bắt buộc: UI Sheet → serialize ODF `calcext` → hop soffice → nếu LO không ra `cfRule type="colorScale|dataBar|iconSet"` thì post-process `xl/worksheets/sheetN.xml`. Nhiều file (styles, dxf). Không làm trước UI.

---

## Phase 4+ (tồn đọng, không cam kết lịch)

- Password hash thật cho `workbookProtection` (nếu product muốn khóa Excel bằng mật khẩu, không chỉ UI).
- Number format `category=text` / `number:text-style` mất qua XLSX.
- PivotChart `vno:chart-kind` mất (custom ns); chart thường + range còn.
- SmartArt DrawingML native (`dgm:`), không flatten `draw:g`.
- Transition `flip` mất qua PPTX.
- Writer: cùng tầng hậu-kỳ do Codex — không trộn branch.

---

## Complexity cheat-sheet

| Phase | Mục | Rủi ro | Effort | Phụ thuộc |
|---|---|---|---|---|
| 1 | XLSX `lockStructure` | Thấp | Nhỏ | Xong |
| 2a | Overlay lock khi Mở XLSX | Thấp | Nhỏ | **Xong** |
| 2b | Master logo `p:sp` | Trung bình-cao | Trung bình | **Xong** |
| 2b-open | Overlay logo khi Mở PPTX | Thấp-trung bình | Nhỏ | **Xong** |
| 2c | `theme1.xml` scheme | Trung bình | Trung bình | Probe theme |
| 3a | `p14:sectionLst` | Trung bình-cao | Trung bình | **Xong** (soffice mở lại PASS; không round-trip FODP) |
| 3a-open | Overlay section khi Mở PPTX | Thấp-trung bình | Nhỏ | **Xong** |
| 3b | showPr `showNarration` / `penClr` | Thấp | Nhỏ | **Xong** (soffice mở lại PASS; `vno:*` không round-trip FODP) |
| 3b-open | Overlay Set Up Show khi Mở PPTX | Thấp | Nhỏ | **Xong** |
| 3c | CF colorScale… | Cao | Lớn | UI trước |
| 4 | password hash, SmartArt, … | Cao | Lớn | Quyết định product |

## Risks

- Rewrite ZIP bằng `createZip` / `zipfile` mất extra field / compression gốc. Probe: soffice mở lại FODS+PDF **PASS**.
- Hai bản JS/Python có thể lệch — live test chạy **cả hai**.
- Patch sai schema → Excel Repair. Phase 1 chỉ thêm attribute trên element LO đã viết.
- Import XLSX overlay Phase 2a: File → Mở XLSX có `lockStructure` gắn lại `table:structure-protected` trước parseFods. Mật khẩu phiên vẫn không round-trip (không có hash OOXML).
- Phase 2b DrawingML: id/`p:sldSz`/EMU sai có thể làm PowerPoint Repair. Probe + unit bắt overlap placeholder; live soffice mở lại FODP+PDF PASS. PowerPoint desktop không có trên máy đo.
- Phase 3a `p14:sectionLst`: lệch `p:sldId/@id` so với thứ tự `draw:page` sẽ gán sai nhóm. Patch **ném** khi số id ≠ số trang, không đoán. soffice mở lại PASS; PowerPoint desktop chưa đo Repair.
- Overlay Mở PPTX (Sections): cùng quy tắc ném khi số `p:sldId` ≠ số `draw:page`, khi `p14:sldId` lạ, hoặc một id thuộc hai phần. File → Mở báo lỗi thay vì canvas sai nhóm. Probe fixture 6 trang: thứ tự `p:sldIdLst` khớp thứ tự `draw:page` sau soffice.
- Overlay Mở PPTX (logo): nhận diện **chỉ** `name="VNOfficeMasterLogo"`. Ném khi nhiều shape trùng tên, shape mang `p:ph`, thiếu `a:t`, hoặc hai master khác chữ/màu/font. Không đoán `p:sp` khác. Probe: soffice đổi shape thành `draw:custom-shape` cùng tên nhưng parser VN không đọc class đó.
- Phase 3b `p:showPr`: vá nhầm `@loop` sẽ phá round-trip endless đã PASS. Patch **không** đụng loop; chỉ `showNarration` + `penClr`. Hex không 6 chữ thì **ném**. PowerPoint desktop chưa đo Repair.
- Overlay Mở PPTX (Set Up Show): đọc `ppt/presProps.xml` gốc. Chỉ gắn `vno:without-narration` khi `@showNarration` là `"0"`/`false`; chỉ gắn `vno:pointer-color` khi hex 6 chữ. Không overlay loop. ZIP hỏng → File → Mở lỗi rõ. Probe: soffice PPTX→FODP giữ `presentation:endless`, bỏ `vno:*`.

## Test plan (mọi phase)

- Unit XML không cần soffice.
- Live: soffice convert → patch → soffice mở lại (FODS hoặc PDF) không lỗi.
- `node tests/run-tests.js` 100% PASS. Không disable test.
- Không thư viện trả phí.

## Rollback

Revert commit phase tương ứng. `main.py` gọi post-process khi Sheet XLSX (`lockStructure`) hoặc Slides PPTX (master logo / `p14:sectionLst` / `p:showPr`); overlay File → Mở khi Sheet XLSX hoặc Slides PPTX (sections / logo / Set Up Show). Tắt nhánh tương ứng là file lại giống convert thuần LibreOffice.

## Decision log

- **Có** sửa `main.py`: đây là chỗ convert + ghi file. Ghi rõ trong handoff.
- **Không** patch Slide Master ở Phase 1: có chỗ chuẩn nhưng rủi ro DrawingML cao. Phase 2b đã vá `p:sp` không `p:ph`.
- **Không** vá footer `ftr` / `p:hf` ở 2b — placeholder `ftr` vẫn trống sau hop.
- **Không** overlay import PPTX→FODP cho `masterTheme.logoText` **ở 2b**. Overlay đó là 2b-open, đã làm: đọc `p:sp name="VNOfficeMasterLogo"` từ ZIP gốc, gắn `vno:master-theme` trước `parseFodp`, ném khi không nhận diện được chính xác.
- **Không** overlay import PPTX→FODP cho `vno:section-*` **ở 3a** (canvas mất thanh phần). Overlay đó là 3a-open, đã làm: đọc `p14:sectionLst` gốc, gắn `vno:section-*` trước `parseFodp`, ném khi không map được chính xác.
- **Có** vá `p14:sectionLst`: đo thật LO không sinh extension; soffice mở file đã vá **không lỗi**. Tính năng PowerPoint 2010 thật, không giả.
- **Có** vá `p:showPr` trên `ppt/presProps.xml` (không phải `presentation.xml`): đo thật LO đã ghi element nhưng `showNarration` luôn `"1"` và không có `p:penClr`. Loop **không** vá. Kiosk/sldRg **không** vá vì VN UI chưa lưu.
- **Không** overlay import PPTX→FODP cho `vno:without-narration` / `vno:pointer-color` **ở 3b** (File → Mở mất cờ trên canvas). Overlay đó là 3b-open, đã làm: đọc `ppt/presProps.xml` gốc, gắn `vno:*` trước `parseFodp`, no-op khi thiếu `showPr` / giá trị lệch, ném khi ZIP hỏng. Không overlay loop.
- **Không** core patch.
- **Không** merge `main`.
