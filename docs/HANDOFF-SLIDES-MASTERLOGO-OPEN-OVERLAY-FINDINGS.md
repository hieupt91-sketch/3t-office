# Findings — Slides Master Logo open overlay (đo trước khi viết code)

TASK: File → Mở PPTX có `p:sp name="VNOfficeMasterLogo"` phải gắn lại `vno:master-theme` (logoText / accentColor / fontFamily) trên FODP trước `parseFodp`
AGENT/ROLE: Grok — Slides native-import overlay (không đụng Writer/Sheet source)
BRANCH: `feature/slides-masterlogo-open-overlay`
WORKTREE: `E:\VNOffice-grok-slides-masterlogo-open-overlay`
BASE: `main` @ `1602f3a` (Merge `feature/writer-fodt-migration-phase-e4`; **1250/1250 PASS** đo lại, không đoán từ handoff 2b ghi 1140 hay 3a-open ghi 1170)
**KHÔNG merge vào main.** File này commit **trước** implementation để agent khác tiếp tục không phải đo lại.

---

## Baseline đã xác nhận

- `git rev-parse HEAD` = `1602f3a90154145045e86f248a6df5a559d5a678`
- Phase 2b có trên `main`: `adapters/libreoffice/slides/pptx-master-logo.js`, suite 110, `docs/HANDOFF-SLIDES-MASTER-LOGO-PHASE2B.md`
- Phase 3a-open overlay Sections có trên `main`: `overlayFodpSections` / `overlay_slides_pptx_fodp` / `_apply_native_import_overlay` nhánh slides
- `node tests/run-tests.js` trên HEAD này: **1250/1250 PASS** (0 FAIL). Số 1140 trong handoff 2b và 1170 trong 3a-open đã lỗi thời (sau đó còn merge FODT Phase B–E.4, UI polish, …).

soffice: `C:\Users\3T Computer\tools\libreoffice\program\soffice.exe`

Script đo: `tests/scripts/probe-slides-masterlogo-open-overlay.mjs` (FODP 1 trang + `vno:master-theme` logo Phase 2b → soffice PPTX → Phase 2b patch `VNOfficeMasterLogo` → soffice PPTX→FODP). Temp: `%TEMP%\vno-probe-masterlogo-open-Ja0YOR`.

---

## Sự thật đo được

### 1. FODP nguồn (VN serialize) có logo

`serializeToFodp()` ghi `vno:master-theme` JSON + `draw:frame grMasterLogo`:

| Tín hiệu nguồn | Giá trị đo |
|---|---|
| `vno:master-theme` | **true** |
| `grMasterLogo` | **true** |
| `logoText` | `VN OFFICE • SANG TAO` |
| `accentColor` | `#b53818` |
| `fontFamily` | `'Times New Roman', serif` |
| bytes | 4790 |

### 2. soffice FODP→PPTX vẫn không sinh logo shape (lặp lại 2b)

`ppt/slideMasters/slideMaster1.xml` **14282 byte**, 5 `p:sp`, 5 `p:ph`:

| Tín hiệu | Giá trị đo |
|---|---|
| `VNOfficeMasterLogo` | **false** |
| chuỗi logo | **false** |
| `masterHasLogoShape` | **false** |

### 3. Phase 2b patch (đã merge) ghi đúng `p:sp` không `p:ph`

`slideMaster1.xml` sau patch **14948 byte**, PPTX **8194 byte**. Đúng **một** `p:sp`:

```xml
<p:cNvPr id="7" name="VNOfficeMasterLogo"/>
<p:nvPr/>   <!-- không p:ph -->
<a:t>VN OFFICE • SANG TAO</a:t>
<a:srgbClr val="B53818"/>
<a:latin typeface="Times New Roman"/>
```

| Tín hiệu | Giá trị đo |
|---|---|
| `named VNOfficeMasterLogo p:sp` | **1** |
| named có `p:ph` | **false** |
| `a:t` | `VN OFFICE • SANG TAO` |
| `srgbClr` | `B53818` |
| `latin typeface` | `Times New Roman` |
| zip slideMaster | chỉ `ppt/slideMasters/slideMaster1.xml` (+ `_rels`) |

PPTX gốc **trước** hop FODP vẫn còn shape tên này — overlay phải đọc ZIP gốc, không đọc FODP soffice.

### 4. soffice PPTX→FODP **không** map ngược `vno:master-theme` — xác nhận lại bằng đo, không đoán

FODP sau convert: **91348 byte**. `office:document` có xmlns ODF/LO (**không** có `xmlns:vno`).

`style:master-page` thật (cắt từ probe):

```xml
<style:master-page style:name="Default" style:page-layout-name="PM1" draw:style-name="dp1">
   <loext:theme loext:name="Office">…accent1 #18a303…</loext:theme>
   <draw:custom-shape draw:name="VNOfficeMasterLogo" draw:style-name="gr3" … svg:x="0.6cm" svg:y="0.1cm">
    <text:p …><text:span …>VN OFFICE • SANG TAO</text:span></text:p>
    <draw:enhanced-geometry draw:type="ooxml-rect" …/>
   </draw:custom-shape>
   <draw:frame draw:name="PlaceHolder 1" … presentation:class="title" presentation:placeholder="true">
```

| Tín hiệu | Giá trị đo |
|---|---|
| `vno:master-theme` | **false** |
| `grMasterLogo` | **false** |
| `xmlns:vno` | **false** |
| chuỗi logo anywhere | **true** |
| chuỗi logo trên `<style:master-page>` | **true** |
| `parseMasterLogoFromFodp().logoText` | `""` |
| `parseFodp().masterTheme` | **null** |
| `parseFodp().length` | 1 |
| `slide0.title` | `Mo dau` |

`parseMasterTheme` / `parseMasterLogoFromFodp` chỉ đọc `vno:master-theme` hoặc `draw:frame` class `grMasterLogo`. LibreOffice đổi `p:sp` thành `draw:custom-shape draw:name="VNOfficeMasterLogo"` — **không** phải `grMasterLogo`, nên parser VN trả `null` dù chữ còn trên master-page.

`loext:theme` accent **không** phải `#b53818` (accent1 đo `#18a303`). Không lấy màu/font từ theme LO — chỉ từ `p:sp` tên `VNOfficeMasterLogo` của ZIP gốc.

Kết luận: `adapterMasterThemeLogo=null` là sự thật đo lại. File → Mở PPTX trên canvas VN Slides mất ô logo dù ZIP gốc còn `VNOfficeMasterLogo`. Overlay đọc ZIP gốc là bắt buộc.

---

## Chỗ chèn overlay (thiết kế, chưa viết code)

Pattern Sections 3a-open (`_apply_native_import_overlay` + `overlayFodpSections` / `applyFodpSectionAttrs`):

```
File → Mở PPTX
  main.py open_document_dialog()
    1. soffice --convert-to fodp          ← mất vno:master-theme / grMasterLogo
    2. ★ overlay: đọc ppt/slideMasters/slideMaster*.xml của PPTX GỐC
         (ooxml_zip_patch.read_zip_entry — không viết lại ZIP)
         tìm p:sp name="VNOfficeMasterLogo" (Phase 2b applyMasterLogoShape)
         nếu 0 shape tên đó → no-op (bài không có logo VN)
         nếu >1 shape tên đó trên một master, hoặc hai master khác chữ/màu/font → NÉM, không đoán
         nếu shape tên đó có p:ph / thiếu a:t → NÉM, không đoán
         lấy a:t → logoText, a:srgbClr → accentColor (# + hex), a:latin typeface → fontFamily
         gắn vno:master-theme (merge JSON nếu đã có) vào style:master-page
         thêm xmlns:vno trên office:document nếu thiếu
         (giữ overlay p14:sectionLst hiện có — cùng hook)
    3. payload.content = FODP đã overlay
       payload.ooxmlPresentationXml = presentation.xml gốc (đã có, Sections)
       payload.ooxmlSlideMasterXml = slideMaster1.xml gốc (belt-and-suspenders JS)
        │
        ▼
SlidesAdapter.loadFromFodp / parseFodp
  đã thấy vno:master-theme → canvas.masterTheme.logoText / accentColor / fontFamily
```

Hợp đồng: `(bytes PPTX, FODP) → FODP`. Tái sử dụng ZIP twin Phase 1 (`readZipEntry` / `read_zip_entry`). Không viết ZIP riêng.

### Map ngược — quy tắc đo được

- Nhận diện **chỉ** bằng `p:cNvPr name="VNOfficeMasterLogo"`. Không đoán từ vị trí, từ `draw:custom-shape` FODP, hay từ `p:sp` khác trên master.
- `logoText` = text `a:t` trong shape đó (`VN OFFICE • SANG TAO`).
- `accentColor` = `#` + `a:srgbClr/@val` (`B53818` → `#b53818`).
- `fontFamily` = `a:latin/@typeface` (`Times New Roman`). PPTX Phase 2b chỉ ghi face đầu — không khôi phục chuỗi CSS `'Times New Roman', serif`.
- Gắn lên **mọi** `style:master-page` (fixture 1 master `Default`; Phase 2b vá mọi `slideMaster*.xml` cùng logo).

Không map theo `draw:name` FODP. Chữ trên `draw:custom-shape` là bằng chứng soffice đọc shape, **không** phải nguồn overlay.

### Giới hạn / lỗi bắt buộc ném

1. PPTX không có `p:sp name="VNOfficeMasterLogo"`: **no-op**, trả FODP soffice (bài không có logo VN). Không đoán `p:sp` khác.
2. Nhiều hơn một `VNOfficeMasterLogo` trên cùng `slideMaster*.xml`: **ném**.
3. Hai (hay hơn) slide master có logo tên đó nhưng khác `logoText` / `accentColor` / `fontFamily`: **ném**.
4. Shape tên `VNOfficeMasterLogo` mang `p:ph`: **ném** (không phải decorative logo Phase 2b).
5. Shape tên đó không có `a:t` (hoặc text rỗng sau normalize): **ném**.
6. Có logo xác định được nhưng FODP không có `<style:master-page>`: **ném**.
7. Overlay hỏng ZIP khi **đã thấy** logo cần gắn: không gán bừa. Production: báo lỗi rõ (cùng chính sách Sections 3a-open, khác Sheet 2a nuốt exception).

### Ghi chú không làm ở overlay này

- Không vá `loext:theme` / `theme1.xml` (PLAN 2c).
- Không khôi phục `footerText` / placeholder `ftr`.
- Không đổi `parseFodp` để đọc `draw:custom-shape` — nguồn sự thật là PPTX gốc, giống Sections đọc `p14:sectionLst` chứ không đoán FODP soffice.

---

## Files sẽ đụng (kế hoạch, chưa sửa implementation)

- `adapters/libreoffice/slides/pptx-master-logo.js` — XML thuần overlay FODP từ `p:sp` tên `VNOfficeMasterLogo`
- `adapters/libreoffice/slides/pptx-native-postprocess.js` — `overlaySlidesPptxFodp` đọc ZIP twin, overlay logo sau sections
- `adapters/libreoffice/slides/slides-adapter.js` — overlay trước `parseFodp` (belt-and-suspenders)
- `adapters/libreoffice/common/ooxml_zip_patch.py` — twin Python
- `main.py` — `_apply_native_import_overlay` nhánh slides `.pptx` (cùng hook; thêm `ooxmlSlideMasterXml`)
- `tests/*` — unit + live soffice + `open_document_dialog` mock
- `platform/help/entries-slides.js` — bước File → Mở PPTX (AGENTS.md §10)
- `docs/PLAN-SHEET-SLIDES-NATIVE-EXPORT-FIDELITY.md` + handoff overlay

Không đụng `apps/writer/**`, `apps/sheet/**`, `adapters/libreoffice/writer/**`, `adapters/libreoffice/sheet/**`. Không merge main.

---

## Commands đã chạy (đo)

```
node tests/run-tests.js
  → 1250/1250 PASS
node tests/scripts/probe-slides-masterlogo-open-overlay.mjs
  → loReopenHasVnoMasterTheme=false, grMasterLogo=false, adapterMasterThemeLogo=null
  → phase2bHadLogoShape=true, namedLogoCount=1, a:t="VN OFFICE • SANG TAO", srgbClr=B53818, typeface="Times New Roman"
```
