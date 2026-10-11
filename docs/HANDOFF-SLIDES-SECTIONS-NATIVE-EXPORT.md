# Agent Handoff

TASK: Phase 3a / p14 — Native export post-process: Slide Sections `p14:sectionLst` trên PPTX thật
AGENT/ROLE: Grok — Slides native-export fidelity (không đụng Writer/Sheet source)
BRANCH: `feature/slides-sections-p14-native-export`
WORKTREE: `E:\VNOffice-grok-slides-sections-p14`
BASE: `main` @ `462ab51` (Merge `feature/writer-fodt-migration-phase-b`; Phase 1/2a/2b đã merge; **1148/1148 PASS** trước task)
**KHÔNG merge vào main.** Không đụng Writer/Sheet source. Codex đang làm Writer trên worktree `E:\VNOffice-codex-writer-editing-group` — không dùng chung working tree.

---

## Bối cảnh

Handoff Phase 1 (`docs/HANDOFF-SHEET-SLIDES-NATIVE-EXPORT-PHASE1.md`) tự ghi: *“Slide Sections / Set Up Show `vno:*` / CF colorScale — không đụng. PLAN Phase 3; sections cần đo `p14:sectionLst` trước khi kết luận ‘không có OOXML’.”*

Đây là lúc đo đúng điều đó. `p14:sectionLst` là **extension Microsoft PowerPoint thật** (namespace `http://schemas.microsoft.com/office/powerpoint/2010/main`, URI `{521415D9-36F7-43E2-AB2F-B90AF26B5E84}` trong `p:extLst` của `ppt/presentation.xml`) — tính năng Section từ PowerPoint 2010, không phải custom VN Office.

Roadmap: `docs/PLAN-SHEET-SLIDES-NATIVE-EXPORT-FIDELITY.md`. Tái sử dụng ZIP twin JS+Python từ Phase 1. Không viết ZIP riêng. Không custom namespace trong PPTX.

---

## Probe soffice thật (trước khi viết patch)

Script `tests/scripts/probe-slides-sections-pptx.mjs`. Fixture: 6 `draw:page`, 2 phần × 3 trang (`vno:section-id` / `vno:section-name` trên FODP).

`serializeToFodp()` đã ghi đúng. Sau `soffice --convert-to pptx` (`Impress MS PowerPoint 2007 XML`):

| Mục | Giá trị đo |
|---|---|
| `ppt/presentation.xml` | 877 byte, compact |
| `p:sldIdLst` | `256 rId3` … `261 rId8` (6 slide, đúng thứ tự trang) |
| `p:sldSz` | `cx="10080625" cy="5670550"` |
| `xmlns:p14` | **đã có** trên `<p:presentation>` (LO khai báo, không dùng) |
| `p:extLst` | **không có** |
| `p14:sectionLst` | **không có** |
| Tên phần `Gioi thieu` / `Noi dung chinh` | **không có** |
| `vno:section-*` | **không có** |

Kết luận đo: LibreOffice **không sinh** extension Section khi FODP→PPTX. Không phải “OOXML không có chỗ”. PowerPoint có chỗ chuẩn. Được phép hậu-kỳ.

---

## Kiến trúc — chỗ chèn hậu-kỳ

```
VN Slides UI
  canvas.sections[] + slide.sectionId
        │
        ▼
SlidesAdapter.serializeToFodp()
  draw:page vno:section-id / vno:section-name
        │
        ▼
UnoBridge.saveRealFile(fodp, "pptx")     ← JS không bao giờ thấy bytes PPTX
        │
        ▼
main.py save_document_dialog()
  1. write draft.fodp
  2. _run_soffice_convert(fodp → pptx)
  3. ★ _apply_native_export_postprocess()
        đọc FODP → nếu có logo HOẶC có phần
        mở PPTX ZIP (ooxml_zip_patch)
        sửa ppt/presentation.xml (p14:sectionLst)
        (và slideMaster*.xml nếu có logo — Phase 2b, không đổi)
        ghi ZIP lại
  4. shutil.copyfile → đường dẫn người dùng
```

Hook hẹp: `app_kind=="slides"` + `target_format=="pptx"` + nguồn `.fodp` có logo **hoặc** `vno:section-id`. Writer/Sheet/PDF/ODP không vào. Nhánh Sheet XLSX Phase 1 giữ nguyên.

Phase 2b trước đây `return` sớm khi FODP không có logo — **đã nới**: bài chỉ có phần, không logo, vẫn vá `sectionLst`.

### Hai twin cùng hợp đồng

| | Production | Test / tham chiếu |
|---|---|---|
| Ngôn ngữ | Python `zipfile` stdlib | Node `zlib` |
| Module ZIP | `adapters/libreoffice/common/ooxml_zip_patch.py` | `adapters/libreoffice/common/ooxml-zip-patch.js` |
| XML transform | cùng file Python | `pptx-section-list.js` (browser-safe) |
| Glue | `main.py` `_apply_native_export_postprocess` | `pptx-native-postprocess.js` |
| CLI | `--pptx --fodp --out` | Node test gọi cùng CLI |

Hợp đồng ZIP không đổi: `(bytes ZIP, { "ppt/presentation.xml": xmlMoi }) → bytes ZIP`.

XML chèn (MS-PPTX `sectionLst`, không ISO-strict, PowerPoint đọc được):

```xml
<p:extLst>
  <p:ext uri="{521415D9-36F7-43E2-AB2F-B90AF26B5E84}">
    <p14:sectionLst xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main">
      <p14:section name="Gioi thieu" id="{46F0EDB7-4BE2-524B-B628-BA0B9146A544}">
        <p14:sldIdLst>
          <p14:sldId id="256"/><p14:sldId id="257"/><p14:sldId id="258"/>
        </p14:sldIdLst>
      </p14:section>
      <p14:section name="Noi dung chinh" id="{8369A921-743A-5C86-8DCE-7FC020A29E6B}">
        <p14:sldIdLst>
          <p14:sldId id="259"/><p14:sldId id="260"/><p14:sldId id="261"/>
        </p14:sldIdLst>
      </p14:section>
    </p14:sectionLst>
  </p:ext>
</p:extLst>
```

`p14:sldId/@id` lấy từ `p:sldIdLst` **đã có trong ZIP soffice**, theo thứ tự `draw:page`. Số id ≠ số trang → ném, không đoán. GUID = UUID v5 (`NAMESPACE_URL` + `urn:vn-office:slides:section:{id}`), JS SHA-1 khớp Python `uuid.uuid5`. Không namespace `vno:`.

---

## Việc đã làm

1. Probe FODP sections → soffice PPTX → dump `presentation.xml` (không có `p14:sectionLst`).
2. XML thuần `applySectionList` / `applySectionListFromFodp`: đọc id thật, idempotent, Default Section cho trang chưa nhóm khi bài đã có phần, ném khi lệch số trang.
3. `postProcessSlidesPptx` / `postprocess_slides_pptx` áp dụng logo (2b) **và** sections trên cùng một lần `patchOoxmlZip`. Tái sử dụng ZIP Phase 1.
4. `main.py` hook sau soffice, trước `copyfile`, chạy khi có logo **hoặc** phần.
5. Help tiếng Việt: bước File → Lưu PPTX trên bài «Phần (Sections)».
6. Unit suite 112 + live soffice (JS + Python CLI) + Python `save_document_dialog` mock (bài chỉ có phần, không logo).

Không sửa serialize/parse FODP (đã đúng). Không core patch. Không vá Set Up Show / colorScale.

---

## FINDINGS

**Đây là tính năng THẬT, không phải giả định.**

1. LibreOffice **không** sinh `p:extLst` / `p14:sectionLst` từ `vno:section-*` khi FODP→PPTX. Filter convert thiếu, OOXML/PowerPoint đã hỗ trợ từ 2010.
2. Chèn `p14:sectionLst` đúng URI + đúng `p:sldId/@id` là đủ: soffice **mở lại được** (PPTX→FODP và PPTX→PDF không lỗi). File không hỏng.
3. soffice PPTX→FODP **không** map ngược `p14:sectionLst` → `vno:section-*` (`loRoundTripSectionInFodp=false`). `parseFodp()` sau hop không còn thanh phần trên canvas VN Slides. Đó là overlay import (kiểu Phase 2a), không làm ở 3a.
4. LibreOffice **không lỗi** khi mở file đã vá. **Không** phải giới hạn “soffice hỏng file nếu có p14:sectionLst”. Giới hạn thật còn lại: filter Impress **bỏ qua** extension khi đọc (không hiện Section UI trong Impress / không round-trip FODP). File vẫn hợp lệ với PowerPoint.
5. PowerPoint desktop **không có** trên máy đo. Schema đúng MS-PPTX; soffice chấp nhận file. Chưa verify Repair trên PowerPoint thật.

---

## FILES CHANGED

- `adapters/libreoffice/slides/pptx-section-list.js` — **mới**. XML thuần, browser-safe.
- `adapters/libreoffice/slides/pptx-native-postprocess.js` — logo + sections, một lần ZIP.
- `adapters/libreoffice/slides/slides-adapter.js` — comment tại `vno:section-*` (serialize không đổi).
- `adapters/libreoffice/common/ooxml_zip_patch.py` — twin Python `apply_section_list*`; CLI `--pptx --fodp` tự vá sections.
- `main.py` — nhánh slides PPTX chạy khi logo **hoặc** sections.
- `platform/help/entries-slides.js` — bước Lưu PPTX (AGENTS.md §10).
- `tests/unit/slides-pptx-section-list.test.js` — **mới**. Suite 112 (8 test).
- `tests/run-tests.js` — đăng ký suite 112.
- `tests/live/slides-pptx-sections-native-export.mjs` — **mới**.
- `tests/test_slides_pptx_sections.py` — **mới**. Gồm `save_document_dialog` mock không logo.
- `tests/scripts/probe-slides-sections-pptx.mjs` — **mới**. Probe, không nằm unit suite.
- `docs/PLAN-SHEET-SLIDES-NATIVE-EXPORT-FIDELITY.md` — Phase 3a hoàn thành.
- `docs/HANDOFF-SLIDES-SECTIONS-NATIVE-EXPORT.md` — tài liệu này.

Không đụng `apps/writer/**`, `apps/sheet/**`, `adapters/libreoffice/writer/**`, `adapters/libreoffice/sheet/**` (trừ twin ZIP chung), Core, build system.

`platform/help` và `main.py` ngoài `adapters/libreoffice/slides/*` — bắt buộc vì hook production + hướng dẫn tiếng Việt, giống Phase 1/2b.

---

## COMMANDS RUN

```
python -m py_compile adapters/libreoffice/common/ooxml_zip_patch.py
python -m py_compile main.py
python -m py_compile tests/test_slides_pptx_sections.py
node tests/run-tests.js
node tests/live/slides-pptx-sections-native-export.mjs
python -m unittest tests.test_slides_pptx_sections tests.test_slides_pptx_master_logo tests.test_desktop_launch -v
node tests/scripts/probe-slides-sections-pptx.mjs
```

---

## BUILD RESULT

Không đụng build system. `python -m py_compile` PASS. `node --check` (suite 7) quét `pptx-section-list.js` PASS.

---

## TEST RESULTS

- Trước task (`main` @ `462ab51`): **1148/1148 PASS**.
- Suite 112 (chạy riêng): **8/8 PASS**.
- `node tests/run-tests.js`: **1157/1157 PASS** (1148 + 8 suite 112 + 1 `node --check` cho file JS mới).
- `python -m unittest tests.test_slides_pptx_sections tests.test_slides_pptx_master_logo tests.test_desktop_launch -v`: **12/12 PASS**.
- Live soffice `slides-pptx-sections-native-export.mjs`: **PASS**.

```json
{
  "loHadSectionLst": false,
  "loSlideIds": ["256", "257", "258", "259", "260", "261"],
  "jsHadSectionLst": true,
  "jsSections": [
    { "name": "Gioi thieu", "slideIds": ["256", "257", "258"] },
    { "name": "Noi dung chinh", "slideIds": ["259", "260", "261"] }
  ],
  "pythonHadSectionLst": true,
  "pythonSections": [
    { "name": "Gioi thieu", "slideIds": ["256", "257", "258"] },
    { "name": "Noi dung chinh", "slideIds": ["259", "260", "261"] }
  ],
  "sofficeReopenFodpOk": true,
  "sofficeReopenPdfOk": true,
  "loRoundTripSectionInFodp": false,
  "reopenError": null,
  "pptxBytes": 15677
}
```

Bằng chứng bắt buộc: FODP có 2 phần × 3 trang → soffice PPTX **không** có `p14:sectionLst` → JS/Python patch → unzip `ppt/presentation.xml` có `p14:sectionLst`, id **thật** 256–258 / 259–261 → soffice PPTX→FODP và PPTX→PDF **không lỗi**.

---

## KNOWN FAILURES / LIMITATIONS

1. **LibreOffice không sinh `p14:sectionLst` khi FODP→PPTX.** Đây là lỗ hổng filter convert, đã vá hậu-kỳ. Không phải “PowerPoint không có chỗ”.
2. **LibreOffice không map ngược** `p14:sectionLst` → `vno:section-*` khi PPTX→FODP (`loRoundTripSectionInFodp=false`). File → Mở PPTX trong VN Slides **mất thanh phần trên canvas** dù PowerPoint vẫn thấy phần. Overlay import = phase sau (cần phép sửa `open_document_dialog`). **Không** giả bằng nhét `vno:` vào PPTX.
3. **Impress UI** có thể không hiện Section khi mở PPTX đã vá (filter bỏ qua extension). soffice convert vẫn thành công — file không hỏng.
4. **PowerPoint desktop** không có trên máy. Chưa đo Repair / hiển thị Section pane trên PowerPoint thật.
5. Trang chưa nhóm, khi bài đã có ít nhất một phần, được gói vào `Default Section` (tên PowerPoint-native) vì `sectionLst` yêu cầu mọi slide thuộc một phần.
6. Rewrite ZIP bỏ extra field/compression gốc. soffice mở lại PASS trên fixture 6 slide.

**Không** phải giới hạn “không thể hợp tác với `p14:sectionLst`”. soffice **không lỗi** khi mở file đã vá.

---

## RISKS

Trung bình-thấp sau probe: chèn một `p:ext` đúng URI vào cuối `CT_Presentation` (`extLst` sau `notesSz`). Rủi ro gán sai slide id được chặn bằng so khớp số trang. Rủi ro lệch JS/Python được live test bắt (GUID v5 + XML parse). Rủi ro PowerPoint Repair chưa đo. Rủi ro `main.py` fail patch: `DocumentEngineError` — File → Lưu PPTX báo lỗi thay vì ghi file thiếu phần.

---

## DEPENDENCIES/BLOCKERS

Không. `soffice.exe` sẵn (`C:\Users\3T Computer\tools\libreoffice\program\soffice.exe`). `python` chạy được CLI `--pptx`. Không merge main. Không thư viện trả phí.

Codex Writer song song trên worktree khác — không đụng file này.

---

## CORE PATCH ID (if any): N/A

Không sửa LibreOffice Core. Filter convert thiếu `p14:sectionLst`; PowerPoint 2010+ đã hỗ trợ extension này.

---

## NEXT ACTION

1. Review branch `feature/slides-sections-p14-native-export` trên worktree `E:\VNOffice-grok-slides-sections-p14`. **Không tự merge.**
2. Nếu muốn File → Mở PPTX hiện lại thanh phần trên canvas VN Slides: overlay FODP (đọc `p14:sectionLst` từ PPTX gốc, gắn `vno:section-*` trước `parseFodp`) — phase riêng, cần phép sửa `open_document_dialog`.
3. PLAN 3b Set Up Show / 2c theme scheme: đo schema trước, đừng đoán.
4. Nếu có PowerPoint: mở `js-patched.pptx` từ live test, xác nhận Section pane = «Gioi thieu» (trang 1–3) + «Noi dung chinh» (trang 4–6), không Repair.

Rollback: revert commit; hoặc xóa nhánh `app_kind == "slides"` trong `_apply_native_export_postprocess` — File → Lưu PPTX lại đúng convert thuần LibreOffice (mất cả logo 2b lẫn sections 3a). Muốn tắt riêng sections: `fodp_has_sections` no-op trong Python twin.
