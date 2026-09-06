# Agent Handoff

TASK: Overlay `p14:sectionLst` khi File → Mở PPTX (khôi phục thanh phần trên canvas VN Slides)
AGENT/ROLE: Grok — Slides native-import overlay (không đụng Writer/Sheet source)
BRANCH: `feature/slides-sections-open-overlay`
WORKTREE: `E:\VNOffice-grok-slides-sections-open-overlay`
BASE: `main` @ `1baa979` (đã merge Phase 3a `2b5f893`; **1160/1160 PASS** đo lại trước task, không đoán 1157 từ handoff 3a)
**KHÔNG merge vào main.** Không đụng Writer/Sheet source.

---

## Bối cảnh

Handoff Phase 3a (`docs/HANDOFF-SLIDES-SECTIONS-NATIVE-EXPORT.md`) tự ghi: soffice PPTX→FODP **không** map ngược `p14:sectionLst` → `vno:section-*` (`loRoundTripSectionInFodp=false`). File → Mở PPTX trong VN Slides mất thanh phần trên canvas dù PowerPoint vẫn thấy phần. Overlay kiểu Sheet Phase 2a — **chưa làm ở 3a**.

Đây là overlay đó. Findings đo **trước code**: `docs/HANDOFF-SLIDES-SECTIONS-OPEN-OVERLAY-FINDINGS.md` (commit `a0a0619`).

---

## Kiến trúc — chỗ chèn overlay

```
File → Mở PPTX
  main.py open_document_dialog()
    1. soffice --convert-to fodp          ← LibreOffice bỏ p14:sectionLst
    2. ★ _apply_native_import_overlay()
         đọc ppt/presentation.xml của PPTX GỐC
         (ooxml_zip_patch.read_zip_entry — không viết lại ZIP)
         parse p:sldIdLst + p14:sectionLst
         nếu số sldId ≠ số draw:page → NÉM
         nếu p14:sldId không có trong p:sldIdLst / thuộc hai phần → NÉM
         gắn vno:section-id / vno:section-name vào đúng draw:page (theo index)
         thêm xmlns:vno trên office:document nếu thiếu
    3. payload.content = FODP đã overlay
       payload.ooxmlPresentationXml = presentation.xml gốc
        │
        ▼
SlidesAdapter.open()
  loadFromFodp(content, ooxmlPresentationXml)  ← idempotent
  parseFodp đọc vno:section-*
    canvas.sections + slide.sectionId
```

### Vì sao phải sửa `main.py`

Convert PPTX→FODP **chỉ** chạy trong Python. `open_document_dialog` trả `content` cho JS. Overlay FODP **trong Python trước khi rời process** là đường production; JS overlay từ `ooxmlPresentationXml` là belt-and-suspenders + test stub `openRealFile`.

Hook hẹp: chỉ `app_kind=="slides"` và nguồn `.pptx`. ODP/FODP/Writer/Sheet không vào. **Khác Sheet 2a**: lệch map **fail File → Mở** (`DocumentEngineError`) — không gán bừa nhóm vào sai trang.

### Hai twin cùng hợp đồng

| | Production | Test / tham chiếu |
|---|---|---|
| ZIP đọc | Python `ooxml_zip_patch.read_zip_entry` | JS `readZipEntry` (module Phase 1, **không viết lại**) |
| XML overlay | `overlay_fodp_sections` | `overlayFodpSections` |
| Glue | `main.py` `_apply_native_import_overlay` | `overlaySlidesPptxFodp` |
| CLI | `--pptx --overlay-fodp --out` | Node test gọi cùng CLI |

Hợp đồng: `(bytes PPTX, FODP) → FODP` với `vno:section-id` / `vno:section-name` trên đúng `draw:page` khi ZIP gốc có `p14:sectionLst`.

Map: index `i` trong `p:sldIdLst` ↔ `draw:page` thứ `i`. Probe: 256→«Mo dau 1» … 261→«Noi dung 3». `draw:name` sau hop là **tiêu đề**, không dùng để map.

`vno:section-id` = `p14:section/@id` (GUID). Xuất lại: nếu id đã là GUID `{…}` thì tái sử dụng, không hash UUID v5 lần hai.

---

## Việc đã làm

1. Probe soffice PPTX (đã vá 3a) → FODP: **không** còn `vno:section-*`, tên phần, URI; 6 `p:sldId` = 6 `draw:page`. Commit findings trước implementation.
2. XML thuần `overlayFodpSections` / `applyFodpSectionAttrs`: stamp theo thứ tự; no-op khi PPTX không có `sectionLst`; ném khi lệch số / sldId lạ / trùng hai phần; không bịa Default Section lúc mở.
3. `overlaySlidesPptxFodp` / `overlay_slides_pptx_fodp` đọc ZIP qua module Phase 1.
4. `main.py` hook sau soffice, trước return payload; gửi `ooxmlPresentationXml`.
5. `SlidesAdapter.loadFromFodp(fodp, ooxmlPresentationXml)` overlay **trước** `parseFodp`; `open()` dùng payload.
6. Help tiếng Việt: bước File → Mở PPTX khôi phục thanh phần.
7. Unit suite 113 (10 test) + live soffice + Python `open_document_dialog` (mock + soffice thật). Lệch 6 vs 5 trang → `status=error`.

Không sửa serialize FODP (đã đúng). Không core patch. Không đụng Writer/Sheet source.

---

## FILES CHANGED

- `adapters/libreoffice/slides/pptx-section-list.js` — overlay FODP từ `p14:sectionLst`; tái sử dụng GUID khi xuất.
- `adapters/libreoffice/slides/pptx-native-postprocess.js` — `overlaySlidesPptxFodp` (Node, đọc ZIP Phase 1).
- `adapters/libreoffice/slides/slides-adapter.js` — overlay trước parseFodp; `open()` nhận `ooxmlPresentationXml`.
- `adapters/libreoffice/common/ooxml_zip_patch.py` — twin Python + CLI `--overlay-fodp`.
- `main.py` — `_apply_native_import_overlay` nhánh slides `.pptx` + `ooxmlPresentationXml`.
- `platform/help/entries-slides.js` — bước Mở lại PPTX (AGENTS.md §10).
- `tests/unit/slides-pptx-sections-open-overlay.test.js` — **mới**. Suite 113 (10 test).
- `tests/run-tests.js` — đăng ký suite 113.
- `tests/live/slides-pptx-sections-native-open.mjs` — **mới**.
- `tests/test_slides_pptx_sections_open.py` — **mới**.
- `tests/scripts/probe-slides-sections-open-overlay.mjs` — probe, không nằm unit suite.
- `docs/PLAN-SHEET-SLIDES-NATIVE-EXPORT-FIDELITY.md` — 3a-open hoàn thành.
- `docs/HANDOFF-SLIDES-SECTIONS-OPEN-OVERLAY-FINDINGS.md` — đo trước code.
- `docs/HANDOFF-SLIDES-SECTIONS-OPEN-OVERLAY.md` — tài liệu này.

Không đụng `apps/writer/**`, `apps/sheet/**`, `adapters/libreoffice/writer/**`, `adapters/libreoffice/sheet/**`. Không viết ZIP riêng.

`platform/help` và `main.py` ngoài `adapters/libreoffice/slides/*` — bắt buộc vì hook production + hướng dẫn tiếng Việt, giống Phase 2a/3a.

---

## COMMANDS RUN

```
node tests/run-tests.js
node tests/scripts/probe-slides-sections-open-overlay.mjs
python -m py_compile adapters/libreoffice/common/ooxml_zip_patch.py
python -m py_compile main.py
python -m py_compile tests/test_slides_pptx_sections_open.py
node tests/live/slides-pptx-sections-native-open.mjs
python -m unittest tests.test_slides_pptx_sections_open tests.test_slides_pptx_sections tests.test_desktop_launch -v
```

---

## BUILD RESULT

Không đụng build system. `python -m py_compile` PASS. `node --check` (suite 7) quét `pptx-section-list.js` / `pptx-native-postprocess.js` / `slides-adapter.js` PASS.

---

## TEST RESULTS

- Trước task (`main` @ `1baa979`): **1160/1160 PASS**.
- Suite 113 (chạy riêng): **10/10 PASS**.
- `node tests/run-tests.js`: **1170/1170 PASS** (1160 + 10 suite 113).
- `python -m unittest tests.test_slides_pptx_sections_open tests.test_slides_pptx_sections tests.test_desktop_launch -v`: **16/16 PASS** (gồm soffice thật Lưu→Mở qua `open_document_dialog`).
- Live soffice `slides-pptx-sections-native-open.mjs`: **PASS**.

```json
{
  "loExportHadSectionLst": false,
  "phase3aSectionLst": true,
  "loSlideIds": ["256", "257", "258", "259", "260", "261"],
  "loReopenHadVnoSection": false,
  "jsOverlayHadVnoSection": true,
  "pythonOverlayHadVnoSection": true,
  "jsPages": [
    { "id": "{46F0EDB7-4BE2-524B-B628-BA0B9146A544}", "name": "Gioi thieu" },
    { "id": "{46F0EDB7-4BE2-524B-B628-BA0B9146A544}", "name": "Gioi thieu" },
    { "id": "{46F0EDB7-4BE2-524B-B628-BA0B9146A544}", "name": "Gioi thieu" },
    { "id": "{8369A921-743A-5C86-8DCE-7FC020A29E6B}", "name": "Noi dung chinh" },
    { "id": "{8369A921-743A-5C86-8DCE-7FC020A29E6B}", "name": "Noi dung chinh" },
    { "id": "{8369A921-743A-5C86-8DCE-7FC020A29E6B}", "name": "Noi dung chinh" }
  ],
  "adapterSectionNames": ["Gioi thieu", "Noi dung chinh"]
}
```

Bằng chứng bắt buộc: FODP 2 phần × 3 trang → soffice PPTX (Phase 3a có `p14:sectionLst`) → soffice PPTX→FODP **mất** `vno:section-*` → overlay → `draw:page` 1–3 = «Gioi thieu» GUID `{46F0EDB7-…}`, 4–6 = «Noi dung chinh» GUID `{8369A921-…}` → `parseFodp().sections` đúng tên. JS = Python trên FODP soffice thật. `open_document_dialog` mock + soffice thật PASS. 6 sldId vs 5 `draw:page` → `status=error`, không gán bừa.

---

## FINDINGS

**Đây là giới hạn filter LibreOffice, không phải giả định.** Đo lại trên HEAD hiện tại:

1. soffice PPTX→FODP **không** giữ `vno:section-*`, tên phần, URI `{521415D9-…}`, `xmlns:vno`. `parseFodp` ra 6 slide, `sectionId` toàn `null`, `sections=[]`.
2. Số `p:sldIdLst` **khớp** số `draw:page` trên fixture 6 trang (256–261 ↔ thứ tự tiêu đề «Mo dau 1»…«Noi dung 3»). Overlay map theo **thứ tự**, không theo `draw:name` (sau hop `draw:name` = tiêu đề).
3. Chèn `vno:section-id`/`vno:section-name` trên thẻ mở `draw:page` + `xmlns:vno` là đủ để canvas VN Slides hiện lại thanh phần. Không nhét `vno:` vào PPTX.

Khi **không thể map chính xác** (PPTX sửa tay, số trang lệch, `p14:sldId` không có trong `p:sldIdLst`, một id thuộc hai phần, `sectionLst` không đọc được): **ném lỗi rõ**, không gán bừa. File → Mở trả `status=error`.

---

## KNOWN FAILURES / LIMITATIONS

1. **LibreOffice không map ngược** `p14:sectionLst` khi PPTX→FODP. Đã vá overlay. Impress UI vẫn có thể không hiện Section — filter bỏ qua extension; file không hỏng.
2. `vno:section-id` sau Mở là GUID PowerPoint, không còn id VN (`section-intro`). Tên phần giữ nguyên. Xuất lại tái sử dụng GUID đó.
3. File `.odp` / `.fodp` / `.ppt` không đi overlay — chỉ `.pptx`.
4. Trang không thuộc phần nào: **không** bịa Default Section lúc mở (Default Section chỉ là quy tắc xuất 3a).
5. PowerPoint desktop không có trên máy. Chưa đo Section pane trên PowerPoint thật (đã đo ở 3a phía Lưu).
6. Overlay hỏng ZIP / thiếu `ppt/presentation.xml`: File → Mở **lỗi** (không nuốt như Sheet lockStructure) — không mở canvas sai nhóm.

---

## RISKS

Thấp-trung bình sau probe: chỉ thêm attribute ODF trên `draw:page` khi OOXML gốc đã có `sectionLst`. Rủi ro lệch JS/Python được live test bắt (cùng FODP soffice). Rủi ro map sai bị chặn bằng ném khi lệch số. Rủi ro `main.py` overlay fail: `DocumentEngineError` — File → Mở báo lỗi thay vì hiện bài thiếu phần.

---

## DEPENDENCIES/BLOCKERS

Không. `soffice.exe` sẵn. Không merge main. Không thư viện trả phí.

---

## CORE PATCH ID (if any): N/A

Không sửa LibreOffice Core. Filter convert PPTX→FODP thiếu `p14:sectionLst`; overlay VN đọc OOXML gốc.

---

## NEXT ACTION

1. Review branch `feature/slides-sections-open-overlay` trên worktree `E:\VNOffice-grok-slides-sections-open-overlay`. **Không tự merge.**
2. PLAN 3b Set Up Show / 2c theme scheme: đo schema trước, đừng đoán.
3. Overlay import master logo `vno:master-theme` (ghi ở 2b) — chưa làm.

Rollback: revert commit; hoặc xóa nhánh `app_kind == "slides"` trong `_apply_native_import_overlay` — File → Mở PPTX lại đúng convert thuần LibreOffice (mất thanh phần trên canvas).
