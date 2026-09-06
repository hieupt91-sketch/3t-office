# Findings — Slides Sections open overlay (đo trước khi viết code)

TASK: File → Mở PPTX có `p14:sectionLst` phải gắn lại `vno:section-*` trên FODP trước `parseFodp`
AGENT/ROLE: Grok — Slides native-import overlay (không đụng Writer/Sheet source)
BRANCH: `feature/slides-sections-open-overlay`
WORKTREE: `E:\VNOffice-grok-slides-sections-open-overlay`
BASE: `main` @ `1baa979` (đã merge Phase 3a `2b5f893`; **1160/1160 PASS** đo lại, không đoán từ handoff 3a ghi 1157)
**KHÔNG merge vào main.** File này commit **trước** implementation để agent khác tiếp tục không phải đo lại.

---

## Baseline đã xác nhận

- `git rev-parse HEAD` = `1baa9798f3ab085061d6d30b5cd31956c761ed81`
- Phase 3a có trên `main`: `adapters/libreoffice/slides/pptx-section-list.js`, suite 112, `docs/HANDOFF-SLIDES-SECTIONS-NATIVE-EXPORT.md`
- `node tests/run-tests.js` trên HEAD này: **1160/1160 PASS** (0 FAIL). Số 1157 trong handoff 3a đã lỗi thời (sau đó còn merge UI polish).

soffice: `C:\Users\3T Computer\tools\libreoffice\program\soffice.exe`

Script đo: `tests/scripts/probe-slides-sections-open-overlay.mjs` (FODP 6 trang 2 phần → soffice PPTX → Phase 3a patch `p14:sectionLst` → soffice PPTX→FODP). Temp: `%TEMP%\vno-probe-sections-open-c8bpeP`.

---

## Sự thật đo được

### 1. FODP nguồn (VN serialize) có phần

6 `<draw:page>` với `vno:section-id` / `vno:section-name` (`section-intro` / `Gioi thieu` × 3, `section-body` / `Noi dung chinh` × 3).

### 2. soffice FODP→PPTX vẫn không sinh section (lặp lại 3a)

`ppt/presentation.xml` compact, **877-ish byte**, `xmlns:p14` đã khai báo nhưng **không** dùng:

```xml
<p:sldIdLst>
  <p:sldId id="256" r:id="rId3"/>
  <p:sldId id="257" r:id="rId4"/>
  <p:sldId id="258" r:id="rId5"/>
  <p:sldId id="259" r:id="rId6"/>
  <p:sldId id="260" r:id="rId7"/>
  <p:sldId id="261" r:id="rId8"/>
</p:sldIdLst>
<p:sldSz cx="10080625" cy="5670550"/>
<p:notesSz .../>
```

- `p:extLst` / `p14:sectionLst`: **không có**
- Tên phần: **không có**

### 3. Phase 3a patch (đã merge) ghi đúng extension

```xml
<p:extLst>
  <p:ext uri="{521415D9-36F7-43E2-AB2F-B90AF26B5E84}">
    <p14:sectionLst xmlns:p14="http://schemas.microsoft.com/office/powerpoint/2010/main">
      <p14:section name="Gioi thieu" id="{46F0EDB7-4BE2-524B-B628-BA0B9146A544}">
        <p14:sldIdLst><p14:sldId id="256"/><p14:sldId id="257"/><p14:sldId id="258"/></p14:sldIdLst>
      </p14:section>
      <p14:section name="Noi dung chinh" id="{8369A921-743A-5C86-8DCE-7FC020A29E6B}">
        <p14:sldIdLst><p14:sldId id="259"/><p14:sldId id="260"/><p14:sldId id="261"/></p14:sldIdLst>
      </p14:section>
    </p14:sectionLst>
  </p:ext>
</p:extLst>
```

`p:sldIdLst` sau patch **không đổi** (vẫn 256–261). GUID = UUID v5 (`NAMESPACE_URL` + `urn:vn-office:slides:section:{id}`) — khớp Phase 3a.

### 4. soffice PPTX→FODP **không** map ngược section — xác nhận lại bằng đo, không đoán

FODP sau convert: **124549 byte**. `office:document` có rất nhiều xmlns ODF/LO (**không** có `xmlns:vno`).

Sáu thẻ mở `draw:page` **thật** (thứ tự = thứ tự `p:sldIdLst`):

```xml
<draw:page draw:name="Mo dau 1" draw:style-name="dp3" draw:master-page-name="Default" presentation:presentation-page-layout-name="AL1T0">
<draw:page draw:name="Mo dau 2" draw:style-name="dp3" draw:master-page-name="Default_20_1">
<draw:page draw:name="Mo dau 3" draw:style-name="dp3" draw:master-page-name="Default_20_1">
<draw:page draw:name="Noi dung 1" draw:style-name="dp3" draw:master-page-name="Default_20_1">
<draw:page draw:name="Noi dung 2" draw:style-name="dp3" draw:master-page-name="Default_20_1">
<draw:page draw:name="Noi dung 3" draw:style-name="dp3" draw:master-page-name="Default_20_1">
```

| Tín hiệu | Giá trị đo |
|---|---|
| `vno:section-id` | **false** |
| `vno:section-name` | **false** |
| `xmlns:vno` | **false** |
| chuỗi `Gioi thieu` | **false** |
| chuỗi `Noi dung chinh` | **false** |
| `sectionLst` / URI `{521415D9-…}` / p14 ns | **false** |
| `parseFodp().length` | 6 |
| `slide.sectionId` | `[null, null, null, null, null, null]` |
| `parsed.sections` | `[]` |
| số `p:sldId` == số `draw:page` | **true** (6 = 6) |

`draw:name` sau hop là **tiêu đề trang** (`Mo dau 1` …), không còn `page1`. Overlay **không** được map theo tên trang — chỉ theo **thứ tự**.

Kết luận: `loRoundTripSectionInFodp=false` là sự thật đo lại. File → Mở PPTX trên canvas VN Slides mất thanh phần dù ZIP gốc còn `p14:sectionLst`. Overlay đọc ZIP gốc là bắt buộc.

---

## Chỗ chèn overlay (thiết kế, chưa viết code)

Pattern Sheet Phase 2a (`_apply_native_import_overlay` + `overlaySheetXlsxFods`):

```
File → Mở PPTX
  main.py open_document_dialog()
    1. soffice --convert-to fodp          ← mất vno:section-*
    2. ★ overlay: đọc ppt/presentation.xml của PPTX GỐC
         (ooxml_zip_patch.read_zip_entry — không viết lại ZIP)
         parse p:sldIdLst + p14:sectionLst
         nếu số sldId ≠ số draw:page → NÉM, không đoán
         nếu p14:sldId không có trong p:sldIdLst → NÉM, không đoán
         gắn vno:section-id / vno:section-name vào đúng draw:page (theo index)
         thêm xmlns:vno trên office:document nếu thiếu
    3. payload.content = FODP đã overlay
       (tuỳ chọn) payload.ooxmlPresentationXml = presentation.xml gốc
        │
        ▼
SlidesAdapter.loadFromFodp / parseFodp
  đã thấy vno:section-* → canvas.sections + slide.sectionId
```

Hợp đồng: `(bytes PPTX, FODP) → FODP`. Tái sử dụng ZIP twin Phase 1 (`readZipEntry` / `read_zip_entry`). Không viết ZIP riêng.

### Map ngược — quy tắc đo được

Index `i` trong `p:sldIdLst` ↔ `draw:page` thứ `i` (0-based) sau soffice PPTX→FODP. Fixture 6 trang: id 256 → «Mo dau 1», …, 261 → «Noi dung 3». Khớp số lượng trên fixture này.

`vno:section-id` = `p14:section/@id` (GUID PowerPoint, gồm ngoặc nhọn). Không bịa id VN cũ `section-intro` — PPTX không còn chuỗi đó.
`vno:section-name` = `p14:section/@name`.

### Giới hạn / lỗi bắt buộc ném

1. PPTX không có `p14:sectionLst` (URI `{521415D9-36F7-43E2-AB2F-B90AF26B5E84}`): **no-op**, trả FODP soffice (bài không có phần).
2. Có `sectionLst` nhưng `len(p:sldIdLst) ≠ len(draw:page)`: **ném**, không gán bừa. File PPTX sửa tay / filter lệch trang.
3. `p14:sldId/@id` không có trong `p:sldIdLst`: **ném**.
4. Cùng một `sldId` thuộc hai `p14:section`: **ném**.
5. Trang không thuộc phần nào: **không** bịa Default Section lúc mở (Default Section chỉ là quy tắc **xuất** Phase 3a). Để trống `vno:section-*`.
6. Overlay hỏng ZIP / thiếu `ppt/presentation.xml`: không gán bừa. Production: báo lỗi rõ (khác Sheet 2a nuốt exception cho lockStructure — lệch số trang là hỏng map, không được mở canvas sai nhóm).

### Ghi chú round-trip id

Mở PPTX rồi Lưu lại: `vno:section-id` sẽ là GUID. Phase 3a export hiện hash UUID v5 từ id đó → GUID đổi lần hai. Overlay này nên kèm: nếu `vno:section-id` đã là GUID `{…}` thì **tái sử dụng** làm `p14:section/@id` khi xuất, không hash lại. Đó là sửa nhỏ trên module XML đã có, không viết ZIP mới.

---

## Files sẽ đụng (kế hoạch, chưa sửa implementation)

- `adapters/libreoffice/slides/pptx-section-list.js` — XML thuần overlay FODP
- `adapters/libreoffice/slides/pptx-native-postprocess.js` — `overlaySlidesPptxFodp` đọc ZIP twin
- `adapters/libreoffice/slides/slides-adapter.js` — overlay trước `parseFodp` (belt-and-suspenders)
- `adapters/libreoffice/common/ooxml_zip_patch.py` — twin Python + CLI `--overlay-fodp`
- `main.py` — `_apply_native_import_overlay` nhánh slides `.pptx`
- `tests/*` — unit + live soffice + `open_document_dialog` mock
- `platform/help/entries-slides.js` — bước File → Mở PPTX (AGENTS.md §10)
- `docs/PLAN-SHEET-SLIDES-NATIVE-EXPORT-FIDELITY.md` + handoff overlay

Không đụng `apps/writer/**`, `apps/sheet/**`, `adapters/libreoffice/writer/**`, `adapters/libreoffice/sheet/**`. Không merge main.

---

## Commands đã chạy (đo)

```
node tests/run-tests.js
  → 1160/1160 PASS
node tests/scripts/probe-slides-sections-open-overlay.mjs
  → loRoundTripSectionInFodp=false, sldIdCountEqualsDrawPageCount=true
```
