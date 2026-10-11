# Agent Handoff

TASK: Phase 1 — Native export post-process: Protect Workbook `lockStructure` trên XLSX thật
AGENT/ROLE: Grok — Sheet/Slides native-export fidelity (không đụng Writer)
BRANCH: `feature/sheet-slides-native-export-phase1`
WORKTREE: `E:\VNOffice-grok-sheet-slides-native-export-p1`
BASE: `main` @ `9540533` (Merge `fix/writer-realexport-audit`; audit Sheet/Slides real-export đã merge; **1107/1107 PASS** trước task)
**KHÔNG merge vào main.** Không đụng Writer source. Codex đang làm sáng kiến song song cho Writer — cùng nguyên tắc, không dùng code.

---

## Bối cảnh

Task trước (`docs/HANDOFF-SHEET-SLIDES-REALEXPORT-AUDIT.md`) đo: `table:structure-protected` serialize đúng FODS nhưng **mất khóa structure** khi hop FODS→XLSX. Người phụ trách quyết định xây **tầng hậu-kỳ**: sau soffice convert, mở ZIP OOXML, patch XML chuẩn, đóng gói lại.

Đây là **Phase 1 của sáng kiến lâu dài**. Roadmap: `docs/PLAN-SHEET-SLIDES-NATIVE-EXPORT-FIDELITY.md`.

Chọn 1 mục giá trị cao / rủi ro thấp: **Protect Workbook structure lock**. Mục 2 (Slide Master logo) được **đo thật rồi hoãn** — có chỗ OOXML chuẩn nhưng DrawingML phức tạp; không làm giả bằng `vno:`.

---

## Kiến trúc — chỗ chèn hậu-kỳ (bắt buộc đọc)

```
VN Sheet UI
  grid.workbookProtection.enabled
        │
        ▼
SheetAdapter.serializeToFods()
  <office:spreadsheet table:structure-protected="true">
        │
        ▼
UnoBridge.saveRealFile(fods, "xlsx")     ← JS không bao giờ thấy bytes XLSX
        │
        ▼
main.py save_document_dialog()
  1. write draft.fods
  2. _run_soffice_convert(fods → xlsx)
  3. ★ _apply_native_export_postprocess()
        đọc FODS → nếu structure-protected
        mở XLSX ZIP
        sửa xl/workbook.xml
        ghi ZIP lại
  4. shutil.copyfile → đường dẫn người dùng
```

### Vì sao phải sửa `main.py`

Convert FODS→XLSX **chỉ** chạy trong Python. `save_document_dialog` tự ghi file đích. SheetAdapter chạy trong pywebview — không được `import "node:fs"`, và không nhận bytes sau convert.

Không sửa `main.py` thì File → Lưu trên Desktop App **không** bao giờ gắn `lockStructure`. JS module chỉ phục vụ test + cùng thuật toán.

Hook hẹp: chỉ `app_kind=="sheet"` và `target_format=="xlsx"` và nguồn `.fods` có `table:structure-protected="true"`. Writer/Slides/PDF/ODS không đi vào nhánh này.

### Hai twin cùng hợp đồng

| | Production | Test / tham chiếu |
|---|---|---|
| Ngôn ngữ | Python `zipfile` stdlib | Node `zlib` (logic cũ `zip-package.mjs`) |
| Module ZIP | `adapters/libreoffice/common/ooxml_zip_patch.py` | `adapters/libreoffice/common/ooxml-zip-patch.js` |
| XML transform | cùng file Python | `xlsx-workbook-protection.js` (browser-safe) |
| Glue | `main.py` `_apply_native_export_postprocess` | `xlsx-native-postprocess.js` |

Hợp đồng: `(bytes ZIP, { "xl/workbook.xml": xmlMoi }) → bytes ZIP`.

`tests/helpers/zip-package.mjs` giờ **re-export** production JS (các live test cũ không đổi import).

---

## Probe soffice thật (trước khi viết patch)

LibreOffice Calc **đã viết** element, thiếu đúng một attribute:

```xml
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" ...>
  <fileVersion appName="Calc" lowestEdited="4"/>
  <workbookPr backupFile="false" showObjects="all" date1904="false"/>
  <workbookProtection lockWindows="false"/>
  <bookViews>...</bookViews>
  <sheets><sheet name="BaoCao" sheetId="1" .../></sheets>
  <calcPr .../>
</workbook>
```

Đúng schema ECMA-376 `CT_Workbook`:

`fileVersion → workbookPr → workbookProtection → bookViews → sheets`

Excel Protect Workbook (Structure) = `lockStructure="1"` trên **cùng** element. LibreOffice chỉ không map `table:structure-protected` → attribute này.

Phase 1 **không chèn element thứ hai** (maxOccurs=1). Chỉ thêm/sửa `lockStructure="1"`, giữ `lockWindows="false"`.

### Slide Master (đo, không patch)

`ppt/slideMasters/slideMaster1.xml` ~14 KB, 5 `p:sp`, toàn placeholder `title | body | dt | ftr | sldNum`. Logo `"VN OFFICE • SANG TAO"` **không** có. `vno:master-theme` mất.

PowerPoint **có** chỗ chuẩn: `p:sp` không `p:ph` trên master. Không phải giới hạn kiến trúc. Hoãn vì id/EMU/placeholder — xem PLAN Phase 2b. **Không** nhét namespace `vno:` vào PPTX.

---

## Việc đã làm

1. Module ZIP dùng chung (JS + Python), không thư viện ngoài.
2. XML thuần `applyWorkbookProtectionLockStructure`:
   - element có sẵn → set `lockStructure="1"`;
   - thiếu element → chèn trước `bookViews` hoặc `sheets`.
3. `postProcessSheetXlsx` / `postprocess_sheet_xlsx` chỉ chạy khi `workbookProtection.enabled` / FODS có `table:structure-protected`.
4. `SheetAdapter.wantsNativeXlsxWorkbookProtection()` — tín hiệu grid-model; serialize FODS không đổi.
5. `main.py` hook sau soffice, trước `copyfile`.
6. Help tiếng Việt: bỏ câu sai “không ghi vào FODS”; mô tả Lưu XLSX gắn `workbookProtection`.
7. Unit suite 107 + live soffice (JS patch + Python CLI + mở lại FODS/PDF).
8. PLAN dài hạn Phase 2/3/4.

Không sửa `slides-adapter.js` (không có patch Phase 1). Không core patch. Không password hash OOXML.

---

## FILES CHANGED

- `adapters/libreoffice/common/ooxml-zip-patch.js` — **mới**. ZIP + `replaceZipEntries` / `patchOoxmlZip`. Node-only.
- `adapters/libreoffice/common/ooxml_zip_patch.py` — **mới**. Twin Python + CLI.
- `adapters/libreoffice/sheet/xlsx-workbook-protection.js` — **mới**. XML thuần, SheetAdapter được import.
- `adapters/libreoffice/sheet/xlsx-native-postprocess.js` — **mới**. Node glue. **Không** import từ SheetAdapter (tránh `node:fs` trong pywebview).
- `adapters/libreoffice/sheet/sheet-adapter.js` — `wantsNativeXlsxWorkbookProtection()` + comment tại `structure-protected`.
- `main.py` — `importlib` load Python module; `_apply_native_export_postprocess` sau convert.
- `tests/helpers/zip-package.mjs` — re-export production ZIP (API cũ giữ).
- `tests/unit/sheet-xlsx-native-postprocess.test.js` — **mới**. Suite 107 (8 test).
- `tests/run-tests.js` — đăng ký suite 107.
- `tests/live/sheet-xlsx-workbook-protection-native-export.mjs` — **mới**.
- `tests/live/sheet-fods-pagebreak-sparkline-protect-real-conversion.mjs` — NOTE trỏ sang live native.
- `platform/help/entries-sheet.js` — bước Lưu FODS/XLSX (AGENTS.md §10).
- `docs/PLAN-SHEET-SLIDES-NATIVE-EXPORT-FIDELITY.md` — **mới**.
- `docs/HANDOFF-SHEET-SLIDES-NATIVE-EXPORT-PHASE1.md` — **mới**.

Không đụng `apps/writer/**`, `adapters/libreoffice/writer/**`, Core, build system.

`platform/help` ngoài scope adapters — sửa vì bắt buộc hướng dẫn tiếng Việt cho hành vi Lưu XLSX mới, và câu “không ghi vào FODS” đã sai từ audit serialize trước.

---

## COMMANDS RUN

```
python -m py_compile adapters/libreoffice/common/ooxml_zip_patch.py
python -m py_compile main.py
node tests/run-tests.js
node tests/live/sheet-xlsx-workbook-protection-native-export.mjs
```

---

## TEST RESULTS

- `node tests/run-tests.js`: **1118/1118 PASS** (trước task 1107/1107; +8 suite 107; +3 `node --check` cho 3 file JS mới).
- Live soffice `sheet-xlsx-workbook-protection-native-export.mjs`: **PASS**

```json
{
  "loHadProtectionElement": true,
  "loHadLockStructure": false,
  "jsLockStructure": true,
  "pythonLockStructure": true,
  "sofficeReopenFodsOk": true,
  "sofficeReopenPdfOk": true,
  "loRoundTripStructureProtected": false,
  "xlsxBytes": 5441
}
```

- File patched **hợp lệ**: soffice convert XLSX→FODS và XLSX→PDF không lỗi, nội dung còn.
- `lockStructure="1"` đúng chỗ: sau `workbookPr`, trước `bookViews`; một element duy nhất.
- Python CLI cùng kết quả XML lock.

Live cũ `sheet-fods-pagebreak-sparkline-protect-real-conversion.mjs` **cố ý không** gọi post-process — vẫn đo hành vi convert thuần LibreOffice.

---

## KNOWN FAILURES / LIMITATIONS

1. **LibreOffice không map ngược** `lockStructure` → `table:structure-protected` khi XLSX→FODS (`loRoundTripStructureProtected=false`). Excel/PowerQuery vẫn thấy khóa structure trên XLSX. File → Mở XLSX trong VN Sheet có thể **mất khóa trên canvas**. Phase 2a: overlay `xl/workbook.xml` khi open (pattern Writer `ooxmlDocumentXml`).
2. **Slide Master logo không làm ở Phase 1.** Có chỗ chuẩn (`p:sp` trên master), không phải giới hạn PowerPoint. Probe: logo mất, chỉ placeholder. Xem PLAN Phase 2b. **Không** vá bằng `vno:master-theme` trong PPTX.
3. **Slide Sections / Set Up Show `vno:*` / CF colorScale** — không đụng. PLAN Phase 3; sections cần đo `p14:sectionLst` trước khi kết luận “không có OOXML”.
4. **Mật khẩu Protect Workbook** không ghi hash OOXML. Khóa giao diện phiên, giống FODS hiện tại.
5. **Rewrite ZIP** bỏ extra field/compression gốc. soffice mở lại PASS trên fixture nhỏ.

---

## RISKS

Thấp với Phase 1: chỉ thêm attribute trên element LibreOffice đã sinh, đúng slot schema. Rủi ro lệch JS/Python được live test bắt. Rủi ro `main.py` import module: `importlib.util.spec_from_file_location`, không biến `adapters/` thành package.

---

## DEPENDENCIES/BLOCKERS

Không. `soffice.exe` sẵn (`C:\Users\3T Computer\tools\libreoffice\program\soffice.exe`). `python` chạy được CLI patcher. Không merge main. Không thư viện trả phí.

Phase 2a cần người phụ trách cho phép sửa tiếp `open_document_dialog` trong `main.py`.

---

## CORE PATCH ID (if any): N/A

Không sửa LibreOffice Core. Filter convert thiếu `lockStructure`; OOXML đã hỗ trợ.

---

## NEXT ACTION

1. Review branch `feature/sheet-slides-native-export-phase1` trên worktree `E:\VNOffice-grok-sheet-slides-native-export-p1`. **Không tự merge.**
2. Phase 2a (nên làm sớm): overlay `workbookProtection` khi Mở XLSX — nếu không, người dùng Lưu rồi Mở lại trong VN Sheet thấy workbook không khóa dù Excel khóa.
3. Phase 2b: master logo DrawingML — chỉ khi có fixture `p:sp` trên master mà soffice + (nếu có) PowerPoint chấp nhận.
4. Giữ nguyên tắc với Codex/Writer: hậu-kỳ OOXML chuẩn, không custom ns, không dùng chung file.

Rollback: revert commit; hoặc xóa lời gọi `_apply_native_export_postprocess` trong `save_document_dialog` — File → Lưu lại đúng convert thuần LO.
