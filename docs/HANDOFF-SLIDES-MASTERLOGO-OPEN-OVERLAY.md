# Agent Handoff

TASK: Overlay `VNOfficeMasterLogo` khi File → Mở PPTX (khôi phục ô logo trên canvas VN Slides)
AGENT/ROLE: Grok — Slides native-import overlay (không đụng Writer/Sheet source)
BRANCH: `feature/slides-masterlogo-open-overlay`
WORKTREE: `E:\VNOffice-grok-slides-masterlogo-open-overlay`
BASE: `main` @ `1602f3a` (Merge `feature/writer-fodt-migration-phase-e4`; **1250/1250 PASS** đo lại trước task, không đoán 1140 từ handoff 2b)
**KHÔNG merge vào main.** Không đụng Writer/Sheet source.

---

## Bối cảnh

Handoff Phase 2b (`docs/HANDOFF-SLIDES-MASTER-LOGO-PHASE2B.md`) tự ghi: soffice PPTX→FODP **giữ** chữ trên master-page nhưng `parseFodp().masterTheme.logoText = null` (`adapterMasterThemeLogo=null`). File → Mở PPTX trong VN Slides mất ô logo trên canvas dù PowerPoint/Impress vẫn thấy chữ trên master. Overlay kiểu Sections 3a-open — **chưa làm ở 2b**.

Đây là overlay đó. Findings đo **trước code**: `docs/HANDOFF-SLIDES-MASTERLOGO-OPEN-OVERLAY-FINDINGS.md` (commit `f06251c`).

---

## Kiến trúc — chỗ chèn overlay

```
File → Mở PPTX
  main.py open_document_dialog()
    1. soffice --convert-to fodp          ← mất vno:master-theme / grMasterLogo
    2. ★ _apply_native_import_overlay()
         đọc ppt/slideMasters/slideMaster*.xml của PPTX GỐC
         (ooxml_zip_patch.read_zip_entry — không viết lại ZIP)
         tìm p:sp name="VNOfficeMasterLogo"
         nếu 0 shape tên đó → no-op
         nếu >1 / mang p:ph / thiếu a:t / hai master khác chữ → NÉM
         lấy a:t / a:srgbClr / a:latin typeface
         gắn vno:master-theme vào style:master-page
         thêm xmlns:vno trên office:document nếu thiếu
         (giữ overlay p14:sectionLst trên cùng hook)
    3. payload.content = FODP đã overlay
       payload.ooxmlPresentationXml = presentation.xml gốc
       payload.ooxmlSlideMasterXml = slideMaster1.xml gốc
        │
        ▼
SlidesAdapter.open()
  loadFromFodp(content, ooxmlPresentationXml, ooxmlSlideMasterXml)  ← idempotent
  parseFodp đọc vno:master-theme
    canvas.applySlideMaster → ô logo hiện lại
```

### Vì sao phải sửa `main.py`

Convert PPTX→FODP **chỉ** chạy trong Python. `open_document_dialog` trả `content` cho JS. Overlay FODP **trong Python trước khi rời process** là đường production; JS overlay từ `ooxmlSlideMasterXml` là belt-and-suspenders + test stub `openRealFile`.

Hook hẹp: chỉ `app_kind=="slides"` và nguồn `.pptx`. ODP/FODP/Writer/Sheet không vào. **Cùng chính sách Sections 3a-open**: logo không nhận diện được **fail File → Mở** (`DocumentEngineError`) — không đoán `p:sp` khác.

### Hai twin cùng hợp đồng

| | Production | Test / tham chiếu |
|---|---|---|
| ZIP đọc | Python `ooxml_zip_patch.read_zip_entry` | JS `readZipEntry` (module Phase 1, **không viết lại**) |
| XML overlay | `overlay_fodp_master_logo` | `overlayFodpMasterLogo` |
| Glue | `main.py` `_apply_native_import_overlay` | `overlaySlidesPptxFodp` (logo sau sections) |
| CLI | `--pptx --overlay-fodp --out` | Node test gọi cùng CLI |

Hợp đồng: `(bytes PPTX, FODP) → FODP` với `vno:master-theme` trên `style:master-page` khi ZIP gốc có `p:sp name="VNOfficeMasterLogo"`.

Nhận diện **chỉ** bằng tên shape Phase 2b. Probe: soffice đổi `p:sp` thành `draw:custom-shape draw:name="VNOfficeMasterLogo"` — parser VN không đọc class đó; không dùng FODP soffice làm nguồn.

`logoText` = `a:t`. `accentColor` = `#` + `srgbClr/@val` thường. `fontFamily` = `a:latin/@typeface` (face đầu, không khôi phục chuỗi CSS `'Times New Roman', serif`).

---

## Việc đã làm

1. Probe soffice PPTX (đã vá 2b) → FODP: **không** còn `vno:master-theme` / `grMasterLogo` / `xmlns:vno`; chữ còn trên `draw:custom-shape`; `parseFodp().masterTheme=null`. Commit findings trước implementation.
2. XML thuần `overlayFodpMasterLogo` / `applyFodpMasterThemeAttrs`: stamp JSON; no-op khi PPTX không có tên shape; ném khi trùng tên / `p:ph` / thiếu `a:t` / hai master khác chữ / FODP thiếu `style:master-page`; không đoán `p:sp` khác.
3. `overlaySlidesPptxFodp` / `overlay_slides_pptx_fodp` đọc ZIP qua module Phase 1 (sections rồi logo).
4. `main.py` hook sau soffice, trước return payload; gửi `ooxmlSlideMasterXml`.
5. `SlidesAdapter.loadFromFodp(fodp, ooxmlPresentationXml, ooxmlSlideMasterXml)` overlay **trước** `parseFodp`; `open()` dùng payload.
6. Help tiếng Việt: bước File → Mở PPTX khôi phục ô logo.
7. Unit suite 114 (9 test) + live soffice + Python `open_document_dialog` (mock + soffice thật). Hai shape trùng tên → `status=error`.

Không sửa serialize FODP (đã đúng). Không core patch. Không đụng Writer/Sheet source. Không viết ZIP riêng.

---

## FILES CHANGED

- `adapters/libreoffice/slides/pptx-master-logo.js` — overlay FODP từ `p:sp` tên `VNOfficeMasterLogo`.
- `adapters/libreoffice/slides/pptx-native-postprocess.js` — `overlaySlidesPptxFodp` đọc ZIP Phase 1, overlay logo sau sections.
- `adapters/libreoffice/slides/slides-adapter.js` — overlay trước parseFodp; `open()` nhận `ooxmlSlideMasterXml`.
- `adapters/libreoffice/common/ooxml_zip_patch.py` — twin Python.
- `main.py` — `_apply_native_import_overlay` nhánh slides `.pptx` + `ooxmlSlideMasterXml`.
- `platform/help/entries-slides.js` — bước Mở lại PPTX (AGENTS.md §10).
- `tests/unit/slides-pptx-masterlogo-open-overlay.test.js` — **mới**. Suite 114 (9 test).
- `tests/run-tests.js` — đăng ký suite 114.
- `tests/live/slides-pptx-masterlogo-native-open.mjs` — **mới**.
- `tests/test_slides_pptx_masterlogo_open.py` — **mới**.
- `tests/scripts/probe-slides-masterlogo-open-overlay.mjs` — probe, không nằm unit suite.
- `docs/PLAN-SHEET-SLIDES-NATIVE-EXPORT-FIDELITY.md` — 2b-open hoàn thành.
- `docs/HANDOFF-SLIDES-MASTERLOGO-OPEN-OVERLAY-FINDINGS.md` — đo trước code.
- `docs/HANDOFF-SLIDES-MASTERLOGO-OPEN-OVERLAY.md` — tài liệu này.

Không đụng `apps/writer/**`, `apps/sheet/**`, `adapters/libreoffice/writer/**`, `adapters/libreoffice/sheet/**`. Không viết ZIP riêng.

`platform/help` và `main.py` ngoài `adapters/libreoffice/slides/*` — bắt buộc vì hook production + hướng dẫn tiếng Việt, giống Phase 2a/3a-open.

---

## COMMANDS RUN

```
node tests/run-tests.js
node tests/scripts/probe-slides-masterlogo-open-overlay.mjs
python -m py_compile adapters/libreoffice/common/ooxml_zip_patch.py
python -m py_compile main.py
python -m py_compile tests/test_slides_pptx_masterlogo_open.py
node tests/live/slides-pptx-masterlogo-native-open.mjs
python -m unittest tests.test_slides_pptx_masterlogo_open tests.test_slides_pptx_master_logo tests.test_slides_pptx_sections_open tests.test_desktop_launch -v
```

---

## BUILD RESULT

Không đụng build system. `python -m py_compile` PASS. `node --check` (suite 7) quét `pptx-master-logo.js` / `pptx-native-postprocess.js` / `slides-adapter.js` PASS.

---

## TEST RESULTS

- Trước task (`main` @ `1602f3a`): **1250/1250 PASS**.
- Suite 114 (chạy riêng): **9/9 PASS**.
- `node tests/run-tests.js`: **1259/1259 PASS** (1250 + 9 suite 114).
- `python -m unittest tests.test_slides_pptx_masterlogo_open tests.test_slides_pptx_master_logo tests.test_slides_pptx_sections_open tests.test_desktop_launch -v`: **24/24 PASS** (gồm soffice thật Lưu→Mở qua `open_document_dialog`).
- Live soffice `slides-pptx-masterlogo-native-open.mjs`: **PASS**.

```json
{
  "loExportHadLogoShape": false,
  "phase2bHadLogoShape": true,
  "loReopenHadVnoMasterTheme": false,
  "jsOverlayHadVnoMasterTheme": true,
  "pythonOverlayHadVnoMasterTheme": true,
  "jsLogo": {
    "logoText": "VN OFFICE • SANG TAO",
    "accentColor": "#b53818",
    "fontFamily": "Times New Roman"
  },
  "adapterMasterThemeLogo": "VN OFFICE • SANG TAO",
  "adapterMasterThemeAccent": "#b53818",
  "adapterMasterThemeFont": "Times New Roman",
  "canvasLogo": "VN OFFICE • SANG TAO",
  "pptxBytes": 8197
}
```

Bằng chứng bắt buộc: FODP có `vno:master-theme` → soffice PPTX (Phase 2b có `VNOfficeMasterLogo`) → soffice PPTX→FODP **mất** `vno:master-theme` / `grMasterLogo` (`parseFodp().masterTheme=null`) → overlay → `logoText="VN OFFICE • SANG TAO"`, `accentColor="#b53818"`, `fontFamily="Times New Roman"` → `loadFromFodp` gọi `applySlideMaster`. JS = Python trên FODP soffice thật. `open_document_dialog` mock + soffice thật PASS. Hai shape trùng tên → `status=error`, không đoán.

---

## FINDINGS

**Đây là giới hạn filter LibreOffice, không phải giả định.** Đo lại trên HEAD hiện tại:

1. soffice PPTX→FODP **không** giữ `vno:master-theme`, `grMasterLogo`, `xmlns:vno`. Chữ logo **còn** trên `<style:master-page>` dưới `draw:custom-shape draw:name="VNOfficeMasterLogo"`. `parseFodp().masterTheme` = `null` vì parser chỉ đọc `vno:master-theme` hoặc class `grMasterLogo`.
2. Phase 2b ZIP gốc còn đúng một `p:sp name="VNOfficeMasterLogo"` không `p:ph`, `a:t="VN OFFICE • SANG TAO"`, `srgbClr=B53818`, `latin typeface="Times New Roman"`. Overlay đọc ZIP gốc, không đoán FODP soffice.
3. Chèn `vno:master-theme` trên thẻ mở `style:master-page` + `xmlns:vno` là đủ để canvas VN Slides hiện lại ô logo. Không nhét `vno:` vào PPTX.

Khi **không thể nhận diện chính xác** (nhiều `VNOfficeMasterLogo`, shape tên đó mang `p:ph`, thiếu `a:t`, hai master khác chữ/màu/font, FODP thiếu `style:master-page`): **ném lỗi rõ**, không đoán `p:sp` khác. File → Mở trả `status=error`. PPTX không có tên shape đó: **no-op**.

---

## KNOWN FAILURES / LIMITATIONS

1. **LibreOffice không map ngược** `vno:master-theme` khi PPTX→FODP. Đã vá overlay. Impress vẫn thấy chữ trên master (custom-shape); canvas VN cần overlay.
2. `fontFamily` sau Mở là face OOXML (`Times New Roman`), không còn chuỗi CSS `'Times New Roman', serif`.
3. `loext:theme` accent sau hop **không** phải `#b53818` (probe accent1 `#18a303`). Không lấy màu từ theme LO — PLAN 2c.
4. File `.odp` / `.fodp` / `.ppt` không đi overlay — chỉ `.pptx`.
5. Footer `ftr` / `p:hf` không vá.
6. PowerPoint desktop không có trên máy. Chưa đo Repair trên PowerPoint thật (đã đo ở 2b phía Lưu).
7. Overlay hỏng ZIP / nhiều shape trùng tên: File → Mở **lỗi** (không nuốt như Sheet lockStructure) — không mở canvas với logo đoán.

---

## RISKS

Thấp-trung bình sau probe: chỉ thêm attribute ODF trên `style:master-page` khi OOXML gốc đã có shape tên `VNOfficeMasterLogo`. Rủi ro lệch JS/Python được live test bắt (cùng FODP soffice). Rủi ro nhận diện sai bị chặn bằng ném khi trùng tên / `p:ph`. Rủi ro `main.py` overlay fail: `DocumentEngineError` — File → Mở báo lỗi thay vì hiện bài thiếu logo.

---

## DEPENDENCIES/BLOCKERS

Không. `soffice.exe` sẵn. Không merge main. Không thư viện trả phí.

---

## CORE PATCH ID (if any): N/A

Không sửa LibreOffice Core. Filter convert PPTX→FODP thiếu `vno:master-theme` / `grMasterLogo`; overlay VN đọc OOXML gốc.

---

## NEXT ACTION

1. Review branch `feature/slides-masterlogo-open-overlay` trên worktree `E:\VNOffice-grok-slides-masterlogo-open-overlay`. **Không tự merge.**
2. PLAN 2c theme scheme / 3b Set Up Show: đo schema trước, đừng đoán.
3. Footer native `p:hf` — chưa làm.

Rollback: revert commit; hoặc xóa nhánh overlay logo trong `overlay_slides_pptx_fodp` / `overlayFodpMasterLogo` — File → Mở PPTX vẫn overlay Sections, logo canvas lại mất như trước 2b-open.
