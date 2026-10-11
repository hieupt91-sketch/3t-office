# Agent Handoff

TASK: Overlay `p:showPr` khi File → Mở PPTX (khôi phục dialog Set Up Show trên canvas VN Slides)
AGENT/ROLE: Grok — Slides native-import overlay (không đụng Writer/Sheet source)
BRANCH: `feature/slides-setup-show-open-overlay`
WORKTREE: `E:\VNOffice-grok-slides-setup-show-open-overlay`
BASE: `main` @ `dd3836f` (Merge `feature/slides-setup-show-native-export`; **1267/1267 PASS** đo lại trước task, không đoán từ handoff 3b)
**KHÔNG merge vào main.** Không đụng Writer/Sheet source.

---

## Bối cảnh

Handoff Phase 3b (`docs/HANDOFF-SLIDES-SETUP-SHOW-NATIVE-EXPORT.md`) tự ghi: soffice PPTX→FODP **không** map ngược `showNarration="0"` / `p:penClr` → `vno:*` (`loRoundTripVno=false`). File → Mở PPTX trong VN Slides mất cờ trên dialog Set Up Show dù PowerPoint vẫn thấy. Overlay kiểu Sections 3a-open / Master-logo 2b-open — **chưa làm ở 3b**. Loop **không** mất (`loRoundTripEndless=true`).

Đây là overlay đó. Findings đo **trước code**: `docs/HANDOFF-SLIDES-SETUP-SHOW-OPEN-OVERLAY-FINDINGS.md` (commit `996bcc5`).

---

## Kiến trúc — chỗ chèn overlay

```
File → Mở PPTX
  main.py open_document_dialog()
    1. soffice --convert-to fodp          ← mất vno:without-narration / vno:pointer-color
                                          (giữ presentation:endless)
    2. ★ _apply_native_import_overlay()
         đọc ppt/presProps.xml của PPTX GỐC
         (ooxml_zip_patch.read_zip_entry — không viết lại ZIP)
         parse p:showPr
         nếu không có p:showPr → no-op
         nếu showNarration không phải "0"/false → không gắn vno:without-narration
         nếu p:penClr / a:srgbClr không hex 6 chữ → không gắn vno:pointer-color
         gắn vno:without-narration / vno:pointer-color vào presentation:settings
         (giữ endless / pause / mouse-visible LO đã viết)
         thêm xmlns:vno trên office:document nếu thiếu
         KHÔNG đụng presentation:endless
         (giữ overlay p14:sectionLst + VNOfficeMasterLogo trên cùng hook)
    3. payload.content = FODP đã overlay
       payload.ooxmlPresentationXml = presentation.xml gốc
       payload.ooxmlSlideMasterXml = slideMaster1.xml gốc
       payload.ooxmlPresPropsXml = presProps.xml gốc
        │
        ▼
SlidesAdapter.open()
  loadFromFodp(content, ooxmlPresentationXml, ooxmlSlideMasterXml, ooxmlPresPropsXml)  ← idempotent
  parseFodp đọc vno:*
    canvas.applySlideShowSettings → dialog Set Up Show hiện lại đúng
```

### Vì sao phải sửa `main.py`

Convert PPTX→FODP **chỉ** chạy trong Python. `open_document_dialog` trả `content` cho JS. Overlay FODP **trong Python trước khi rời process** là đường production; JS overlay từ `ooxmlPresPropsXml` là belt-and-suspenders + test stub `openRealFile`.

Hook hẹp: chỉ `app_kind=="slides"` và nguồn `.pptx`. ODP/FODP/Writer/Sheet không vào. **Cùng chính sách Sections/Master-logo**: ZIP hỏng **fail File → Mở** (`DocumentEngineError`) — không bịa cờ.

### Hai twin cùng hợp đồng

| | Production | Test / tham chiếu |
|---|---|---|
| ZIP đọc | Python `ooxml_zip_patch.read_zip_entry` | JS `readZipEntry` (module Phase 1, **không viết lại**) |
| XML overlay | `overlay_fodp_show_properties` | `overlayFodpShowProperties` |
| Glue | `main.py` `_apply_native_import_overlay` | `overlaySlidesPptxFodp` (show sau sections/logo) |
| CLI | `--pptx --overlay-fodp --out` | Node test gọi cùng CLI |

Hợp đồng: `(bytes PPTX, FODP) → FODP` với `vno:without-narration` / `vno:pointer-color` trên `<presentation:settings>` khi ZIP gốc có `p:showPr` hợp lệ.

`showWithoutNarration` **chỉ** khi `@showNarration` là `"0"` hoặc `"false"`. `pointerColor` = `"#"` + `srgbClr/@val` thường (`112233` → `#112233`). Không overlay `@loop`.

---

## Việc đã làm

1. Probe soffice PPTX (đã vá 3b) → FODP: **không** còn `vno:without-narration` / `vno:pointer-color` / `xmlns:vno`; `presentation:endless` còn; `parseFodp().slideShowSettings` = `{ loopUntilEsc: true, showWithoutNarration: false, pointerColor: "#DC2626" }`. Commit findings trước implementation.
2. XML thuần `overlayFodpShowProperties` / `applyFodpShowSettingsAttrs`: stamp theo `p:showPr`; no-op khi PPTX không có `showPr` / giá trị lệch; ném khi ZIP hỏng hoặc FODP thiếu `office:presentation` lúc cần gắn; không đụng loop.
3. `overlaySlidesPptxFodp` / `overlay_slides_pptx_fodp` đọc ZIP qua module Phase 1 (sections, logo, rồi show).
4. `main.py` hook sau soffice, trước return payload; gửi `ooxmlPresPropsXml`.
5. `SlidesAdapter.loadFromFodp(..., ooxmlPresPropsXml)` overlay **trước** `parseFodp`; `open()` dùng payload.
6. Help tiếng Việt: bước File → Mở PPTX khôi phục dialog Set Up Show.
7. Unit suite 116 (10 test) + live soffice + Python `open_document_dialog` (mock + soffice thật). ZIP hỏng → `status=error`.

Không sửa serialize FODP (đã đúng). Không core patch. Không đụng Writer/Sheet source. Không viết ZIP riêng. Không overlay `@loop`.

---

## FILES CHANGED

- `adapters/libreoffice/slides/pptx-show-properties.js` — overlay FODP từ `p:showPr` trên `ppt/presProps.xml`.
- `adapters/libreoffice/slides/pptx-native-postprocess.js` — `overlaySlidesPptxFodp` đọc ZIP Phase 1, overlay show sau sections/logo.
- `adapters/libreoffice/slides/slides-adapter.js` — overlay trước parseFodp; `open()` nhận `ooxmlPresPropsXml`.
- `adapters/libreoffice/common/ooxml_zip_patch.py` — twin Python.
- `main.py` — `_apply_native_import_overlay` nhánh slides `.pptx` + `ooxmlPresPropsXml`.
- `platform/help/entries-slides.js` — bước Mở lại PPTX (AGENTS.md §10).
- `tests/unit/slides-pptx-setup-show-open-overlay.test.js` — **mới**. Suite 116 (10 test).
- `tests/run-tests.js` — đăng ký suite 116.
- `tests/live/slides-pptx-setup-show-native-open.mjs` — **mới**.
- `tests/test_slides_pptx_setup_show_open.py` — **mới**.
- `tests/scripts/probe-slides-setup-show-open-overlay.mjs` — probe, không nằm unit suite.
- `docs/PLAN-SHEET-SLIDES-NATIVE-EXPORT-FIDELITY.md` — 3b-open hoàn thành.
- `docs/HANDOFF-SLIDES-SETUP-SHOW-OPEN-OVERLAY-FINDINGS.md` — đo trước code.
- `docs/HANDOFF-SLIDES-SETUP-SHOW-OPEN-OVERLAY.md` — tài liệu này.

Không đụng `apps/writer/**`, `apps/sheet/**`, `adapters/libreoffice/writer/**`, `adapters/libreoffice/sheet/**`. Không viết ZIP riêng.

`platform/help` và `main.py` ngoài `adapters/libreoffice/slides/*` — bắt buộc vì hook production + hướng dẫn tiếng Việt, giống Phase 2a/3a-open.

---

## COMMANDS RUN

```
node tests/run-tests.js
node tests/scripts/probe-slides-setup-show-open-overlay.mjs
python -m py_compile adapters/libreoffice/common/ooxml_zip_patch.py
python -m py_compile main.py
python -m py_compile tests/test_slides_pptx_setup_show_open.py
node tests/live/slides-pptx-setup-show-native-open.mjs
python -m unittest tests.test_slides_pptx_setup_show_open tests.test_slides_pptx_show_properties tests.test_slides_pptx_sections_open tests.test_slides_pptx_masterlogo_open -v
```

---

## BUILD RESULT

Không đụng build system. `python -m py_compile` PASS. `node --check` (suite 7) quét `pptx-show-properties.js` / `pptx-native-postprocess.js` / `slides-adapter.js` PASS.

---

## TEST RESULTS

- Trước task (`main` @ `dd3836f`): **1267/1267 PASS**.
- Suite 116 (chạy riêng): **10/10 PASS**.
- `node tests/run-tests.js`: **1277/1277 PASS** (1267 + 10 suite 116).
- `python -m unittest tests.test_slides_pptx_setup_show_open tests.test_slides_pptx_show_properties tests.test_slides_pptx_sections_open tests.test_slides_pptx_masterlogo_open -v`: **28/28 PASS** (gồm soffice thật Lưu→Mở qua `open_document_dialog`).
- Live soffice `slides-pptx-setup-show-native-open.mjs`: **PASS**.

```json
{
  "loExportShowNarration": true,
  "loExportPenRgb": "",
  "phase3bShowNarration": false,
  "phase3bPenRgb": "112233",
  "loReopenHadVno": false,
  "loReopenEndless": true,
  "jsOverlayHadVno": true,
  "pythonOverlayHadVno": true,
  "jsSettings": {
    "loopUntilEsc": true,
    "showWithoutNarration": true,
    "pointerColor": "#112233"
  },
  "adapterWithoutNarration": true,
  "adapterPointerColor": "#112233",
  "adapterLoop": true,
  "pptxBytes": 11703
}
```

Bằng chứng bắt buộc: FODP có `vno:without-narration` + `vno:pointer-color="#112233"` + `presentation:endless` → soffice PPTX (Phase 3b có `showNarration=0` / `penClr val="112233"`) → soffice PPTX→FODP **mất** `vno:*` (`parseFodp` mặc định `pointerColor="#DC2626"`) nhưng **giữ** endless → overlay → `showWithoutNarration=true`, `pointerColor="#112233"`, `loopUntilEsc=true` → `loadFromFodp` gọi `applySlideShowSettings`. JS = Python trên FODP soffice thật. `open_document_dialog` mock + soffice thật PASS. ZIP hỏng → `status=error`, không bịa.

---

## FINDINGS

**Đây là giới hạn filter LibreOffice, không phải giả định.** Đo lại trên HEAD hiện tại:

1. soffice PPTX→FODP **không** giữ `vno:without-narration`, `vno:pointer-color`, `xmlns:vno`. `presentation:endless="true"` **còn**. `parseFodp().slideShowSettings` = `{ loopUntilEsc: true, showWithoutNarration: false, pointerColor: "#DC2626" }` vì parser chỉ đọc hai attr `vno:*` (màu mặc định khi thiếu).
2. Phase 3b ZIP gốc còn `ppt/presProps.xml` / `<p:showPr loop="1" showNarration="0"><p:penClr><a:srgbClr val="112233"/></p:penClr></p:showPr>`. Overlay đọc ZIP gốc, không đoán FODP soffice (`pause` / `mouse-visible`).
3. Chèn `vno:without-narration` / `vno:pointer-color` trên thẻ `<presentation:settings>` + `xmlns:vno` là đủ để dialog Set Up Show hiện lại. Không nhét `vno:` vào PPTX. **Không** overlay loop.

Khi **không có** `p:showPr` hoặc giá trị không hợp lệ: **no-op**, không bịa. ZIP hỏng: **ném lỗi rõ**. File → Mở trả `status=error`.

---

## KNOWN FAILURES / LIMITATIONS

1. **LibreOffice không map ngược** `showNarration=0` / `p:penClr` khi PPTX→FODP. Đã vá overlay. Loop không mất (filter đã map `presentation:endless`).
2. File `.odp` / `.fodp` / `.ppt` không đi overlay — chỉ `.pptx`.
3. Kiosk / presenter / browse / slide start–end không vá (VN UI không lưu; 3b không xuất).
4. Pen/laser runtime vẫn chưa vẽ trên F5 — chỉ khôi phục màu đã lưu vào dialog.
5. PowerPoint desktop không có trên máy. Chưa đo Repair trên PowerPoint thật (đã đo ở 3b phía Lưu).
6. Overlay hỏng ZIP: File → Mở **lỗi** (không nuốt như Sheet lockStructure) — không mở canvas với cờ đoán.

---

## RISKS

Thấp sau probe: chỉ thêm attribute ODF trên `presentation:settings` khi OOXML gốc đã có `p:showPr` hợp lệ. Không đụng `@loop`. Rủi ro lệch JS/Python được live test bắt (cùng FODP soffice). Rủi ro `main.py` overlay fail: `DocumentEngineError` — File → Mở báo lỗi thay vì hiện bài thiếu cờ.

---

## DEPENDENCIES/BLOCKERS

Không. `soffice.exe` sẵn. Không merge main. Không thư viện trả phí.

---

## CORE PATCH ID (if any): N/A

Không sửa LibreOffice Core. Filter convert PPTX→FODP thiếu `vno:without-narration` / `vno:pointer-color`; overlay VN đọc OOXML gốc.

---

## NEXT ACTION

1. Review branch `feature/slides-setup-show-open-overlay` trên worktree `E:\VNOffice-grok-slides-setup-show-open-overlay`. **Không tự merge.**
2. PLAN 2c theme scheme / kiosk / start–end: đo schema trước, đừng đoán. Kiosk/start–end cần UI (`apps/slides`, ngoài scope).

Rollback: revert commit; hoặc xóa nhánh overlay show trong `overlay_slides_pptx_fodp` / `overlayFodpShowProperties` — File → Mở PPTX vẫn overlay Sections/logo, dialog Set Up Show lại mất hai cờ `vno:*` như trước 3b-open (loop vẫn còn).
