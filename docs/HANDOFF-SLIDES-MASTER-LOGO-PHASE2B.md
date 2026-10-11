# Agent Handoff

TASK: Phase 2b — Native export post-process: Slide Master logo `p:sp` (không `p:ph`) trên PPTX thật
AGENT/ROLE: Grok — Slides native-export fidelity (không đụng Writer/Sheet source)
BRANCH: `feature/slides-master-logo-phase2b`
WORKTREE: `E:\VNOffice-grok-slides-master-logo-phase2b`
BASE: `main` @ `5867e5b` (Merge `feature/sheet-native-export-phase2a`; **1130/1130 PASS** trước task)
**KHÔNG merge vào main.** Không đụng Writer/Sheet source. Claude đang làm FODT Phase B trên worktree `E:\VNOffice-claude-fodt-phase-b` — cùng `5867e5b`, không dùng chung working tree.

---

## Bối cảnh

Handoff Phase 1 (`docs/HANDOFF-SHEET-SLIDES-NATIVE-EXPORT-PHASE1.md`) đo rồi **hoãn** Slide Master logo: `ppt/slideMasters/slideMaster1.xml` ~14 KB, 5 `p:sp` toàn placeholder (`title|body|dt|ftr|sldNum`), logo `"VN OFFICE • SANG TAO"` mất, `vno:master-theme` mất. PowerPoint **có** chỗ chuẩn — `p:sp` không `p:ph` trên master — không phải giới hạn kiến trúc.

Đây là Phase 2b của `docs/PLAN-SHEET-SLIDES-NATIVE-EXPORT-FIDELITY.md`. Tái sử dụng ZIP `ooxml_zip_patch` (JS + Python twin) đã có từ Phase 1. Không viết ZIP riêng. Không custom namespace.

---

## Probe soffice thật (trước khi viết patch)

Lặp lại đúng fixture Phase 1 trên `main` hiện tại. `serializeToFodp()` đã ghi:

```xml
<style:master-page ... vno:master-theme="{...logoText: VN OFFICE • SANG TAO...}">
  <draw:frame draw:style-name="grMasterLogo" svg:x="0.6cm" svg:y="0.4cm" ...>
    <draw:text-box><text:p>VN OFFICE • SANG TAO</text:p></draw:text-box>
  </draw:frame>
</style:master-page>
```

Sau `soffice --convert-to pptx`:

| Mục | Giá trị đo |
|---|---|
| `p:sldSz` | `cx="10080625" cy="5670550"` (28cm × 15.75cm = FODP `PM1`) |
| `cNvPr id` | 1 = group, 2–6 = placeholders |
| `p:ph` | `title` y=226080, `body` y=1326600, `dt`/`ftr`/`sldNum` y=5165280 |
| Logo text | **không** có |
| `vno:master-theme` | **không** có |
| `showMasterSp` trên layout | không set (mặc định hiện master graphics) |

FODP logo `y=0.4cm` (144000 EMU) **đè** title placeholder (`y=226080`). Patch **không** copy tọa độ FODP — đặt dải trên, `y+cy < title.y`.

---

## Kiến trúc — chỗ chèn hậu-kỳ

```
VN Slides UI
  canvas.masterTheme.logoText
        │
        ▼
SlidesAdapter.serializeToFodp()
  style:master-page + vno:master-theme + draw:frame grMasterLogo
        │
        ▼
UnoBridge.saveRealFile(fodp, "pptx")     ← JS không bao giờ thấy bytes PPTX
        │
        ▼
main.py save_document_dialog()
  1. write draft.fodp
  2. _run_soffice_convert(fodp → pptx)
  3. ★ _apply_native_export_postprocess()
        đọc FODP → nếu có logoText
        mở PPTX ZIP (ooxml_zip_patch)
        sửa ppt/slideMasters/slideMaster*.xml
        ghi ZIP lại
  4. shutil.copyfile → đường dẫn người dùng
```

Xác nhận: Save FODP→PPTX **đi qua** `main.py` giống Sheet (`save_document_dialog` → soffice → post-process → copyfile). Open PPTX→FODP cũng qua `open_document_dialog` / `_run_soffice_convert`. Phase 2b **chỉ** hook Save. Không overlay khi Mở.

### Vì sao phải sửa `main.py`

Convert FODP→PPTX **chỉ** chạy trong Python. `save_document_dialog` tự ghi file đích. SlidesAdapter chạy trong pywebview — không được `import "node:fs"`, và không nhận bytes sau convert.

Hook hẹp: chỉ `app_kind=="slides"` và `target_format=="pptx"` và nguồn `.fodp` có logo. Writer/Sheet/PDF/ODP không vào nhánh này. Nhánh Sheet XLSX Phase 1 giữ nguyên.

### Hai twin cùng hợp đồng

| | Production | Test / tham chiếu |
|---|---|---|
| Ngôn ngữ | Python `zipfile` stdlib | Node `zlib` |
| Module ZIP | `adapters/libreoffice/common/ooxml_zip_patch.py` | `adapters/libreoffice/common/ooxml-zip-patch.js` |
| XML transform | cùng file Python | `pptx-master-logo.js` (browser-safe) |
| Glue | `main.py` `_apply_native_export_postprocess` | `pptx-native-postprocess.js` |
| CLI | `--pptx --fodp --out` | Node test gọi cùng CLI |

Hợp đồng: `(bytes ZIP, { "ppt/slideMasters/slideMaster1.xml": xmlMoi }) → bytes ZIP`.

`p:sp` chèn (ECMA-376 `CT_Shape`):

```xml
<p:sp>
  <p:nvSpPr>
    <p:cNvPr id="7" name="VNOfficeMasterLogo"/>
    <p:cNvSpPr><a:spLocks noGrp="1"/></p:cNvSpPr>
    <p:nvPr/>   <!-- không p:ph -->
  </p:nvSpPr>
  <p:spPr>
    <a:xfrm><a:off .../><a:ext .../></a:xfrm>
    <a:prstGeom prst="rect"><a:avLst/></a:prstGeom>
    <a:noFill/>
  </p:spPr>
  <p:txBody>
    <a:bodyPr .../><a:lstStyle/>
    <a:p><a:r><a:rPr .../><a:t>VN OFFICE • SANG TAO</a:t></a:r></a:p>
  </p:txBody>
</p:sp>
```

Không namespace `vno:`.

---

## Việc đã làm

1. Probe lại `slideMaster1.xml` trước khi thiết kế (script `tests/scripts/probe-slides-master-logo-pptx.mjs`).
2. XML thuần `applyMasterLogoShape`: id = max `cNvPr` + 1; AABB không đè placeholder; idempotent theo `name="VNOfficeMasterLogo"`; no-op khi FODP không có logo.
3. `postProcessSlidesPptx` / `postprocess_slides_pptx` đọc `ppt/presentation.xml` (`p:sldSz`) + mọi `slideMaster*.xml`, vá qua ZIP Phase 1.
4. `main.py` hook sau soffice, trước `copyfile`, nhánh slides PPTX.
5. Help tiếng Việt: bước File → Lưu PPTX trên bài «Chủ đề, mẫu chủ đạo và cỡ trang chiếu».
6. Unit suite 110 + live soffice (JS + Python CLI) + Python `save_document_dialog` mock.

Không sửa serialize/parse FODP (đã đúng). Không core patch. Không vá footer.

---

## FINDINGS

1. LibreOffice **không** sinh `p:sp` thường từ `draw:frame` trên master-page khi FODP→PPTX. Chỉ placeholder.
2. Chèn `p:sp` không `p:ph` là đủ: soffice **mở lại được** và PPTX→FODP **giữ chữ trên `<style:master-page>`**.
3. `parseFodp()` vẫn không gán `masterTheme.logoText` sau hop — LO không phát `vno:master-theme` / `grMasterLogo`. Đó là overlay import (kiểu Phase 2a), không làm ở 2b.
4. PDF scrape không thấy chuỗi ASCII; không dùng PDF làm bằng chứng âm. FODP là bằng chứng dương.
5. PowerPoint desktop **không có** trên máy đo. File hợp lệ với soffice; chưa verify Excel/PowerPoint Repair.

---

## FILES CHANGED

- `adapters/libreoffice/slides/pptx-master-logo.js` — **mới**. XML thuần, browser-safe.
- `adapters/libreoffice/slides/pptx-native-postprocess.js` — **mới**. Node glue. **Không** import từ SlidesAdapter.
- `adapters/libreoffice/slides/slides-adapter.js` — comment tại `_serializeMasterPageXml` (serialize không đổi).
- `adapters/libreoffice/common/ooxml_zip_patch.py` — twin Python + CLI `--pptx/--fodp`. ZIP không viết lại.
- `main.py` — nhánh slides PPTX trong `_apply_native_export_postprocess`.
- `platform/help/entries-slides.js` — bước Lưu PPTX (AGENTS.md §10).
- `tests/unit/slides-pptx-master-logo.test.js` — **mới**. Suite 110 (8 test).
- `tests/run-tests.js` — đăng ký suite 110.
- `tests/live/slides-pptx-master-logo-native-export.mjs` — **mới**.
- `tests/test_slides_pptx_master_logo.py` — **mới**. Gồm `save_document_dialog` mock.
- `tests/scripts/probe-slides-master-logo-pptx.mjs` — **mới**. Probe, không nằm unit suite.
- `docs/PLAN-SHEET-SLIDES-NATIVE-EXPORT-FIDELITY.md` — Phase 2b hoàn thành.
- `docs/HANDOFF-SLIDES-MASTER-LOGO-PHASE2B.md` — **mới**.

Không đụng `apps/writer/**`, `apps/sheet/**`, `adapters/libreoffice/writer/**`, `adapters/libreoffice/sheet/**` (trừ comment ZIP chung), Core, build system.

`platform/help` và `main.py` ngoài `adapters/libreoffice/slides/*` — bắt buộc vì hook production + hướng dẫn tiếng Việt, giống Phase 1/2a.

---

## COMMANDS RUN

```
python -m py_compile adapters/libreoffice/common/ooxml_zip_patch.py
python -m py_compile main.py
python -m py_compile tests/test_slides_pptx_master_logo.py
node tests/run-tests.js
node tests/live/slides-pptx-master-logo-native-export.mjs
python -m unittest tests.test_slides_pptx_master_logo tests.test_desktop_launch -v
node tests/scripts/probe-slides-master-logo-pptx.mjs
```

---

## BUILD RESULT

Không đụng build system. `python -m py_compile` PASS. `node --check` (suite 7) quét 2 file JS mới PASS.

---

## TEST RESULTS

- Suite 110 (chạy riêng): **8/8 PASS**
- `node tests/run-tests.js`: **1140/1140 PASS** (trước task 1130/1130; +8 suite 110; +2 `node --check` cho 2 file JS mới).
- `python -m unittest tests.test_slides_pptx_master_logo tests.test_desktop_launch -v`: **8/8 PASS**
- Live soffice `slides-pptx-master-logo-native-export.mjs`: **PASS**

```json
{
  "loHadLogo": false,
  "jsHadLogo": true,
  "pythonHadLogo": true,
  "logoHadPh": false,
  "sofficeReopenFodpOk": true,
  "sofficeReopenPdfOk": true,
  "loRoundTripLogoInFodp": true,
  "loRoundTripLogoOnMasterPage": true,
  "adapterMasterThemeLogo": null,
  "loRoundTripLogoInPdf": false,
  "pptxBytes": 8193
}
```

Bằng chứng bắt buộc: FODP có master-theme → soffice PPTX **mất** logo → JS/Python patch → unzip `slideMaster1.xml` có `VNOfficeMasterLogo` không `p:ph` id=7 → soffice PPTX→FODP **còn chữ trên master-page**.

---

## KNOWN FAILURES / LIMITATIONS

1. **File → Mở PPTX trong VN Slides không khôi phục `canvas.masterTheme.logoText`.** soffice PPTX→FODP giữ chữ trên master-page nhưng không phát `vno:master-theme` / `grMasterLogo`, nên `parseFodp()` trả `masterTheme.logoText = null`. Logo **có** trong file Office (PowerPoint/Impress master). Overlay import = việc sau, cùng kiểu Phase 2a.
2. **Footer** (`footerText` / placeholder `ftr`) không vá. Probe: `ftr` vẫn `<footer>`. Cần `p:hf` / notes master — không đoán.
3. **PDF scrape** không thấy chuỗi logo. Không chứng minh logo mất trên trang PDF; chỉ FODP là bằng chứng dương rằng soffice đọc shape.
4. **PowerPoint desktop** không có trên máy. Chưa đo Repair / hiển thị trên PowerPoint thật. Schema đúng ECMA-376; soffice chấp nhận file.
5. **Tọa độ** phụ thuộc `p:sldSz` + placeholder probe 16:9 28×15.75cm. Cỡ khác: thuật toán AABB vẫn tránh đè; chưa live-test 4:3.
6. **Accent bar** FODP (`grMasterAccent` 0.25cm) không chèn thêm `p:sp`. Chỉ logo chữ.
7. Rewrite ZIP bỏ extra field/compression gốc. soffice mở lại PASS trên fixture nhỏ.

---

## RISKS

Trung bình-thấp sau probe: chèn một shape DrawingML đúng slot `spTree`, id không trùng, không đè placeholder. Rủi ro lệch JS/Python được live test bắt. Rủi ro PowerPoint Repair chưa đo. Rủi ro `main.py` fail patch: `DocumentEngineError` (giống Phase 1) — File → Lưu PPTX báo lỗi thay vì ghi file thiếu logo.

---

## DEPENDENCIES/BLOCKERS

Không. `soffice.exe` sẵn (`C:\Users\3T Computer\tools\libreoffice\program\soffice.exe`). `python` chạy được CLI `--pptx`. Không merge main. Không thư viện trả phí.

Claude FODT Phase B song song trên worktree khác, cùng base `5867e5b` — không đụng file này.

---

## CORE PATCH ID (if any): N/A

Không sửa LibreOffice Core. Filter convert thiếu decorative master shape; OOXML đã hỗ trợ `p:sp` không `p:ph`.

---

## NEXT ACTION

1. Review branch `feature/slides-master-logo-phase2b` trên worktree `E:\VNOffice-grok-slides-master-logo-phase2b`. **Không tự merge.**
2. Nếu muốn File → Mở PPTX hiện lại logo trên canvas VN Slides: overlay FODP (đọc `a:t` từ `VNOfficeMasterLogo` hoặc text trên master-page) trước `parseFodp` — phase riêng, cần phép sửa `open_document_dialog`.
3. Footer native / theme1.xml scheme = PLAN 2c / đo `p:hf` trước khi vá `ftr`.
4. Nếu có PowerPoint: mở `js-patched.pptx` từ live test, xác nhận logo góc trên mọi slide, không Repair.

Rollback: revert commit; hoặc xóa nhánh `app_kind == "slides"` trong `_apply_native_export_postprocess` — File → Lưu PPTX lại đúng convert thuần LibreOffice.
