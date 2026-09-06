# Agent Handoff

TASK: Phase 2a — Overlay Protect Workbook `lockStructure` khi Mở XLSX
AGENT/ROLE: Grok — Sheet native-export/import fidelity (không đụng Writer/Slides source)
BRANCH: `feature/sheet-native-export-phase2a`
WORKTREE: `E:\VNOffice-grok-sheet-native-export-phase2a`
BASE: `main` @ `a4504e5` (Merge `feature/sheet-slides-native-export-phase1`; **1122/1122 PASS** trước task theo người phụ trách)
**KHÔNG merge vào main.** Không đụng Writer source. Codex đang làm FODT Phase B trên worktree khác.

---

## Bối cảnh

Handoff Phase 1 ghi rõ: LibreOffice **không map ngược** `lockStructure` → `table:structure-protected` khi XLSX→FODS. Người dùng Lưu XLSX (Phase 1 gắn `lockStructure="1"`) rồi File → Mở lại trong VN Sheet thấy **mất khóa trên canvas** dù Excel vẫn khóa cấu trúc.

Đây là Phase 2a của `docs/PLAN-SHEET-SLIDES-NATIVE-EXPORT-FIDELITY.md`. Writer **có thật** pattern `ooxmlDocumentXml` (đã kiểm tra `main.py` + `writer-adapter.js`) — đọc XML từ ZIP gốc sau soffice convert, overlay trước khi UI parse.

---

## Kiến trúc — chỗ chèn overlay (bắt buộc đọc)

```
File → Mở XLSX
  main.py open_document_dialog()
    1. soffice --convert-to fods          ← LibreOffice bỏ lockStructure
    2. ★ _apply_native_import_overlay()
         đọc xl/workbook.xml của XLSX GỐC
         (ooxml_zip_patch.read_zip_entry — không viết lại ZIP)
         nếu lockStructure=1|true
           chèn table:structure-protected="true" vào FODS
    3. payload.content = FODS đã overlay
       payload.ooxmlWorkbookXml = workbook.xml gốc  (pattern Writer)
        │
        ▼
SheetAdapter.open()
  overlayFodsStructureProtection(content, ooxmlWorkbookXml)  ← idempotent
  loadFromFods → parseFods
    _attachImportedProtection đọc table:structure-protected
    grid.workbookProtection.enabled = true
    _applyProtectionUi()  ← nút Review + chặn thêm/xóa/đổi tên trang
```

### Vì sao phải sửa `main.py`

Convert XLSX→FODS **chỉ** chạy trong Python. `open_document_dialog` trả `content` cho JS. Nếu overlay chỉ ở JS mà Python quên gửi `ooxmlWorkbookXml`, File → Mở Desktop vẫn mất khóa. Overlay FODS **trong Python trước khi rời process** là đường production; JS overlay là belt-and-suspenders + test stub `openRealFile`.

Hook hẹp: chỉ `app_kind=="sheet"` và nguồn `.xlsx`. ODS/CSV/XLS/Writer/Slides không vào nhánh này. Lỗi overlay **không** fail File → Mở (trả FODS gốc).

### Hai twin cùng hợp đồng

| | Production | Test / tham chiếu |
|---|---|---|
| ZIP đọc | Python `ooxml_zip_patch.read_zip_entry` | JS `readZipEntry` (module Phase 1, **không viết lại**) |
| XML overlay | `overlay_fods_structure_protection` | `overlayFodsStructureProtection` |
| Glue | `main.py` `_apply_native_import_overlay` | `overlaySheetXlsxFods` |
| CLI | `--xlsx --overlay-fods --out` | Node test gọi cùng CLI |

Hợp đồng: `(bytes XLSX, FODS) → FODS` với `table:structure-protected="true"` khi `xl/workbook.xml` có `lockStructure="1"|true`.

---

## Việc đã làm

1. XML thuần `applyFodsStructureProtection` / `overlayFodsStructureProtection`: chèn hoặc nâng `table:structure-protected="true"` trên `<office:spreadsheet>`; no-op khi XLSX không khóa; idempotent khi FODS đã khóa.
2. `overlaySheetXlsxFods` / `overlay_sheet_xlsx_fods` đọc ZIP qua module Phase 1.
3. `main.py` hook sau soffice, trước return payload; gửi `ooxmlWorkbookXml`.
4. `SheetAdapter.loadFromFods(fods, ooxmlWorkbookXml)` overlay **trước** `parseFods`; `open()` dùng payload; getter `workbookProtection` phản ánh grid.
5. Help tiếng Việt: bước File → Mở XLSX khôi phục khóa cấu trúc (tab Xem xét > Bảo vệ).
6. Unit + live soffice + Python `open_document_dialog` (mock + soffice thật).

Không sửa `slides-adapter.js`. Không core patch. Không password hash OOXML.

---

## FILES CHANGED

- `adapters/libreoffice/sheet/xlsx-workbook-protection.js` — overlay FODS từ `lockStructure`.
- `adapters/libreoffice/sheet/xlsx-native-postprocess.js` — `overlaySheetXlsxFods` (Node, đọc ZIP Phase 1).
- `adapters/libreoffice/common/ooxml_zip_patch.py` — twin Python + CLI `--overlay-fods`; `read_zip_entry` public.
- `adapters/libreoffice/sheet/sheet-adapter.js` — overlay trước parseFods; getter `workbookProtection`.
- `main.py` — `_apply_native_import_overlay` + `ooxmlWorkbookXml` trên nhánh Mở XLSX.
- `platform/help/entries-sheet.js` — bước Mở lại XLSX (AGENTS.md §10).
- `tests/unit/sheet-xlsx-native-open-overlay.test.js` — **mới**. Suite 109.
- `tests/run-tests.js` — đăng ký suite 109.
- `tests/live/sheet-xlsx-workbook-protection-native-open.mjs` — **mới**.
- `tests/test_sheet_xlsx_native_open.py` — **mới**.
- `docs/PLAN-SHEET-SLIDES-NATIVE-EXPORT-FIDELITY.md` — Phase 2a hoàn thành.
- `docs/HANDOFF-SHEET-NATIVE-EXPORT-PHASE2A.md` — **mới**.

Không đụng `apps/writer/**`, `adapters/libreoffice/writer/**`, Slides, Core, build system.

`platform/help` ngoài scope adapters — sửa vì bắt buộc hướng dẫn tiếng Việt cho hành vi Mở XLSX mới.

---

## COMMANDS RUN

```
python -m py_compile adapters/libreoffice/common/ooxml_zip_patch.py
python -m py_compile main.py
python -m py_compile tests/test_sheet_xlsx_native_open.py
node tests/run-tests.js
node tests/live/sheet-xlsx-workbook-protection-native-open.mjs
python -m unittest tests.test_sheet_xlsx_native_open tests.test_desktop_launch -v
```

---

## TEST RESULTS

- Overlay unit (suite 109, chạy riêng): **8/8 PASS**
- `node tests/run-tests.js`: **1130/1130 PASS** (trước task 1122/1122; +8 suite 109).
- `python -m unittest tests.test_sheet_xlsx_native_open tests.test_desktop_launch -v`: **10/10 PASS** (gồm soffice thật Lưu→Mở qua `open_document_dialog`)
- Live soffice `sheet-xlsx-workbook-protection-native-open.mjs`: **PASS**

```json
{
  "loExportHadLockStructure": false,
  "phase1LockStructure": true,
  "loReopenHadStructureProtected": false,
  "jsOverlayStructureProtected": true,
  "pythonOverlayStructureProtected": true,
  "adapterWorkbookProtectionEnabled": true,
  "uiIsWorkbookProtected": true,
  "xlsxBytes": 5441
}
```

- `node tests/run-tests.js`: **1130/1130 PASS**.

Bằng chứng bắt buộc: Lưu workbook Protect Workbook → XLSX (Phase 1) → soffice XLSX→FODS **mất** `structure-protected` → overlay Phase 2a → `SheetAdapter.workbookProtection.enabled === true` và `grid.addSheet() === false`.

---

## KNOWN FAILURES / LIMITATIONS

1. Mật khẩu Protect Workbook phiên **không** round-trip qua XLSX (Phase 1 không ghi hash OOXML). Mở lại: khóa cấu trúc bật, mật khẩu trống — Bỏ bảo vệ không hỏi mật khẩu. Đúng quyết định Phase 1.
2. File `.xls` (OLE) / `.ods` / `.csv` không đi overlay — chỉ `.xlsx`.
3. Overlay hỏng ZIP/thiếu `xl/workbook.xml`: File → Mở vẫn nạp FODS soffice, không khóa. Không fail open.
4. Phase 2b Slide Master logo, 2c theme, Phase 3 sections — không đụng.

---

## RISKS

Thấp: chỉ thêm một attribute ODF trên `<office:spreadsheet>` khi OOXML gốc đã khóa. Rủi ro lệch JS/Python được live test bắt (cùng FODS). Rủi ro `main.py` overlay fail: nuốt exception, open không gãy.

---

## DEPENDENCIES/BLOCKERS

Không. `soffice.exe` sẵn. Không merge main. Không thư viện trả phí.

---

## CORE PATCH ID (if any): N/A

Không sửa LibreOffice Core. Filter convert XLSX→FODS thiếu `lockStructure`; overlay VN đọc OOXML gốc.

---

## NEXT ACTION

1. Review branch `feature/sheet-native-export-phase2a` trên worktree `E:\VNOffice-grok-sheet-native-export-phase2a`. **Không tự merge.**
2. Phase 2b: master logo DrawingML — chỉ khi có fixture `p:sp` trên master mà soffice + (nếu có) PowerPoint chấp nhận.
3. Giữ nguyên tắc với Codex/Writer: overlay/hậu-kỳ OOXML chuẩn, không custom ns, không dùng chung file.

Rollback: revert commit; hoặc xóa `_apply_native_import_overlay` trong `open_document_dialog` — File → Mở lại đúng convert thuần LibreOffice (mất khóa trên canvas).
