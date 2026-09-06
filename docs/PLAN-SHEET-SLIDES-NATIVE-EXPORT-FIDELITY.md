# Plan: Sheet / Slides native export fidelity (hậu-kỳ OOXML)

Sáng kiến **lâu dài**. Không phải một task làm xong trong một phiên. Chạy song song với sáng kiến tương tự của Codex cho Writer — **cùng nguyên tắc, không dùng chung code**.

Nguyên tắc:

1. UI serialize ODF phẳng (FODS/FODP) như hiện tại.
2. LibreOffice `soffice --convert-to` tạo file Office thật (XLSX/PPTX = ZIP chứa XML).
3. VN Office **mở lại ZIP**, patch XML entry bằng cấu trúc **OOXML chuẩn** (không namespace `vno:`), đóng gói lại.
4. Chỉ patch khi OOXML thật sự có chỗ chuẩn. Nếu là giới hạn kiến trúc PowerPoint/Excel — ghi rõ, không làm giả.

Phase 1 đã merge `main`. Phase 2a **không merge vào `main`** cho đến khi người phụ trách review.

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
| Slide Sections `vno:section-*` | Còn | Mất qua PPTX | Cần nghiên cứu `p14:sectionLst` |
| Set Up Show `vno:pointer-color` / `vno:without-narration` | Còn | Mất; `presentation:endless` giữ | Một phần có thể không có trong file format |
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
| `main.py` | Gọi post-process sau convert, trước copyfile |
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

### 2b. Slide Master logo / footer bằng DrawingML chuẩn — độ phức tạp: trung bình-cao

**Không phải giới hạn kiến trúc PowerPoint.** Probe Phase 1:

- `ppt/slideMasters/slideMaster1.xml` tồn tại, có `p:spTree`.
- 5 shape, **toàn placeholder**: `title`, `body`, `dt`, `ftr`, `sldNum`.
- Logo text `"VN OFFICE • SANG TAO"` **không** có trong master sau hop.
- `vno:master-theme` mất (custom ns — đúng, không patch ns giả vào PPTX).

Chỗ chuẩn:

- Logo chữ: `p:sp` **không** có `p:ph` trên `slideMaster1.xml` (hình trang trí master, hiện trên mọi slide).
- Footer: có placeholder `ftr`, nhưng text footer PowerPoint thường đi qua `p:hf` / notes master — phải đo trước khi ghi vào `a:t` của placeholder.

Vì sao **không** làm trong Phase 1:

- Cần `p:cNvPr id` duy nhất (master đã dùng 1–5).
- Tọa độ EMU phụ thuộc cỡ slide (`p:sldSz`).
- Dễ đụng placeholder, làm hỏng layout.
- soffice phải mở lại được; PowerPoint phải hiện logo.

Điều kiện vào Phase 2: fixture PPTX tối thiểu (một `p:sp` text trên master) → soffice mở + PowerPoint (nếu có) hiện chữ. Không dùng `vno:`.

### 2c. Theme màu/font native — độ phức tạp: trung bình

`ppt/theme/theme1.xml` (`a:clrScheme`, `a:fontScheme`) là chỗ chuẩn. LO đã ghi theme. Có thể patch scheme cho `titleColor` / `accentColor` / `bgColor` nếu probe cho thấy scheme LO không khớp `masterTheme`. Đo trước, đừng đoán.

---

## Phase 3 — đề xuất (cao / cần nghiên cứu)

### 3a. Slide Sections qua PPTX — độ phức tạp: trung bình-cao; **không** kết luận “OOXML không có”

Audit trước ghi “không có tương đương OOXML”. Cần kiểm lại: PowerPoint 2010+ dùng extension

`p:extLst` / `p14:sectionLst` (`uri={521415D9-36F7-43E2-AB2F-B90AF26B5E84}`) trong `ppt/presentation.xml`.

Không nằm ISO strict. Excel/PowerPoint đọc được. LibreOffice có thể bỏ qua.

Trước khi patch: tạo PPTX tay có `p14:sectionLst`, cho soffice mở, xem có giữ không. Nếu LO xóa extension khi mở lại — file vẫn hợp lệ với PowerPoint. Nếu LO **hỏng file** — không patch.

Không nhét `vno:section-*` vào PPTX.

### 3b. Set Up Slide Show còn lại — độ phức tạp: thấp-trung bình, nhiều mục có thể **không sửa được**

| Cờ VN | Ứng viên OOXML | Khả năng |
|---|---|---|
| `presentation:endless` | Đã sống qua PPTX | Không làm |
| `vno:without-narration` | `p:showPr showNarration="0"`? | Đo schema `CT_ShowProperties` |
| `vno:pointer-color` | Thường là **cài UI runtime** PowerPoint, không có trong file | Nếu không có chỗ chuẩn: **ghi rõ không sửa**, giữ FODP |

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
| 2b | Master logo `p:sp` | Trung bình-cao | Trung bình | Probe DrawingML |
| 2c | `theme1.xml` scheme | Trung bình | Trung bình | Probe theme |
| 3a | `p14:sectionLst` | Trung bình-cao | Trung bình | LO có nuốt ext không |
| 3b | showPr / pointer | Thấp, có mục không làm được | Nhỏ | Schema + quyết định product |
| 3c | CF colorScale… | Cao | Lớn | UI trước |
| 4 | password hash, SmartArt, … | Cao | Lớn | Quyết định product |

## Risks

- Rewrite ZIP bằng `createZip` / `zipfile` mất extra field / compression gốc. Probe: soffice mở lại FODS+PDF **PASS**.
- Hai bản JS/Python có thể lệch — live test chạy **cả hai**.
- Patch sai schema → Excel Repair. Phase 1 chỉ thêm attribute trên element LO đã viết.
- Import XLSX overlay Phase 2a: File → Mở XLSX có `lockStructure` gắn lại `table:structure-protected` trước parseFods. Mật khẩu phiên vẫn không round-trip (không có hash OOXML).

## Test plan (mọi phase)

- Unit XML không cần soffice.
- Live: soffice convert → patch → soffice mở lại (FODS hoặc PDF) không lỗi.
- `node tests/run-tests.js` 100% PASS. Không disable test.
- Không thư viện trả phí.

## Rollback

Revert commit phase tương ứng. `main.py` chỉ gọi post-process khi `app_kind=="sheet"` và `target_format=="xlsx"`; tắt hook là file lại giống convert thuần LibreOffice.

## Decision log

- **Có** sửa `main.py`: đây là chỗ convert + ghi file. Ghi rõ trong handoff.
- **Không** patch Slide Master ở Phase 1: có chỗ chuẩn nhưng rủi ro DrawingML cao.
- **Không** core patch.
- **Không** merge `main`.
