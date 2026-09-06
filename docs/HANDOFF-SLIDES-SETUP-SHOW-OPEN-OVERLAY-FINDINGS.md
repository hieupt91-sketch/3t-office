# Findings — Slides Set Up Show open overlay (đo trước khi viết code)

TASK: File → Mở PPTX có `showNarration="0"` / `p:penClr` phải gắn lại `vno:without-narration` / `vno:pointer-color` trên FODP trước `parseFodp`
AGENT/ROLE: Grok — Slides native-import overlay (không đụng Writer/Sheet source)
BRANCH: `feature/slides-setup-show-open-overlay`
WORKTREE: `E:\VNOffice-grok-slides-setup-show-open-overlay`
BASE: `main` @ `dd3836f` (Merge `feature/slides-setup-show-native-export`; **1267/1267 PASS** đo lại, không đoán từ handoff 3b)
**KHÔNG merge vào main.** File này commit **trước** implementation để agent khác tiếp tục không phải đo lại.

---

## Baseline đã xác nhận

- `git rev-parse HEAD` = `dd3836f65b8f3d18aec67288d99bd35626f9e1b3`
- Phase 3b có trên `main`: `adapters/libreoffice/slides/pptx-show-properties.js`, suite 115, `docs/HANDOFF-SLIDES-SETUP-SHOW-NATIVE-EXPORT.md`
- Overlay Sections 3a-open + Master-logo 2b-open đã có trên `main`: `overlayFodpSections` / `overlayFodpMasterLogo` / `overlay_slides_pptx_fodp` / `_apply_native_import_overlay` nhánh slides
- `node tests/run-tests.js` trên HEAD này: **1267/1267 PASS** (0 FAIL). Số 1267 trong handoff 3b khớp đo lại.

soffice: `C:\Users\3T Computer\tools\libreoffice\program\soffice.exe`

Script đo: `tests/scripts/probe-slides-setup-show-open-overlay.mjs` (FODP 3 trang + Set Up Show Phase 3b → soffice PPTX → Phase 3b patch `showNarration=0` / `p:penClr` → soffice PPTX→FODP). Temp: `%TEMP%\vno-probe-setup-show-open-Nes1gp`.

---

## Sự thật đo được

### 1. FODP nguồn (VN serialize) có Set Up Show

`serializeToFodp()` ghi đúng 3 cờ Phase 3b:

```xml
<presentation:settings presentation:endless="true" vno:without-narration="true" vno:pointer-color="#112233"/>
```

| Tín hiệu nguồn | Giá trị đo |
|---|---|
| `presentation:endless` | **true** |
| `vno:without-narration` | **true** |
| `vno:pointer-color` | `#112233` |
| bytes | 5482 |

### 2. soffice FODP→PPTX vẫn thiếu đúng hai slot (lặp lại 3b)

`ppt/presentation.xml` **784 byte**, compact, **không** `p:showPr`.

`ppt/presProps.xml` thật:

```xml
<p:presentationPr xmlns:a="…" xmlns:p="…" xmlns:r="…">
  <p:showPr loop="1" showNarration="1"></p:showPr>
</p:presentationPr>
```

| Tín hiệu | Giá trị đo |
|---|---|
| `@loop` | **true** (`"1"`) |
| `@showNarration` | **true** (`"1"`) — LO không đọc `vno:without-narration` |
| `p:penClr` | **không** |
| `ppt/presentation.xml` có `showPr` | **false** |

### 3. Phase 3b patch (đã merge) ghi đúng `showNarration=0` + `penClr`

PPTX sau patch **11702 byte**. `ppt/presProps.xml` thật:

```xml
<p:showPr loop="1" showNarration="0"><p:penClr><a:srgbClr val="112233"/></p:penClr></p:showPr>
```

| Tín hiệu | Giá trị đo |
|---|---|
| `@showNarration` | **false** (`"0"`) |
| `penRgb` | `112233` |
| `@loop` | **true** (giữ, không vá) |
| `vno:` trong `presProps.xml` | **false** |
| `showPr` trong `presentation.xml` | **false** |

PPTX gốc **trước** hop FODP vẫn còn hai cờ này — overlay phải đọc ZIP gốc (`ppt/presProps.xml`), không đọc FODP soffice.

### 4. soffice PPTX→FODP **không** map ngược `vno:*` — xác nhận lại bằng đo, không đoán

FODP sau convert: **120182 byte**. `office:document` có xmlns ODF/LO (**không** có `xmlns:vno`).

`presentation:settings` thật (cắt từ probe):

```xml
<presentation:settings presentation:endless="true" presentation:pause="P0D" presentation:mouse-visible="false"/>
```

| Tín hiệu | Giá trị đo |
|---|---|
| `vno:without-narration` | **false** |
| `vno:pointer-color` | **false** |
| `xmlns:vno` | **false** |
| chuỗi `112233` anywhere | **false** |
| `showNarration` / `penClr` text | **false** |
| `presentation:endless="true"` | **true** |
| `parseShowSettingsFromFodp().showWithoutNarration` | **false** |
| `parseShowSettingsFromFodp().pointerColor` | `""` |
| `parseFodp().slideShowSettings` | `{ loopUntilEsc: true, showWithoutNarration: false, pointerColor: "#DC2626" }` |
| `parseFodp().length` | 3 |

`_parsePresentationSettings` mặc định `pointerColor="#DC2626"` khi thiếu `vno:pointer-color`. Dialog Set Up Show sau File → Mở PPTX hiện **không thuyết minh = tắt**, màu bút = đỏ mặc định — dù PowerPoint vẫn thấy `showNarration=0` / `penClr=112233`.

Kết luận: `loRoundTripVno=false` là sự thật đo lại. `loRoundTripEndless=true` — **không** overlay `@loop`. Overlay đọc `ppt/presProps.xml` gốc là bắt buộc cho hai cờ `vno:*`.

---

## Chỗ chèn overlay (thiết kế, chưa viết code)

Pattern Sections 3a-open / Master-logo 2b-open (`_apply_native_import_overlay` + `overlayFodpSections` / `overlayFodpMasterLogo`):

```
File → Mở PPTX
  main.py open_document_dialog()
    1. soffice --convert-to fodp          ← mất vno:without-narration / vno:pointer-color
                                          (giữ presentation:endless)
    2. ★ overlay: đọc ppt/presProps.xml của PPTX GỐC
         (ooxml_zip_patch.read_zip_entry — không viết lại ZIP)
         parse p:showPr
         nếu không có p:showPr → no-op
         nếu showNarration không phải "0"/false hợp lệ → không gắn vno:without-narration
         nếu p:penClr / a:srgbClr không phải hex 6 chữ → không gắn vno:pointer-color
         gắn vno:without-narration="true" / vno:pointer-color="#rrggbb"
           lên <presentation:settings> (giữ endless / pause / mouse-visible LO đã viết)
         thêm xmlns:vno trên office:document nếu thiếu
         KHÔNG đụng presentation:endless (LO đã map @loop)
         (giữ overlay p14:sectionLst + VNOfficeMasterLogo trên cùng hook)
    3. payload.content = FODP đã overlay
       payload.ooxmlPresentationXml / ooxmlSlideMasterXml (đã có)
       payload.ooxmlPresPropsXml = presProps.xml gốc (belt-and-suspenders JS)
        │
        ▼
SlidesAdapter.loadFromFodp / parseFodp
  đã thấy vno:* → canvas.slideShowSettings.showWithoutNarration / pointerColor
```

Hợp đồng: `(bytes PPTX, FODP) → FODP`. Tái sử dụng ZIP twin Phase 1 (`readZipEntry` / `read_zip_entry`). Không viết ZIP riêng.

### Map ngược — quy tắc đo được

- Nguồn sự thật = `ppt/presProps.xml` của PPTX **gốc** (trước soffice convert). Không đoán từ FODP soffice (`pause` / `mouse-visible` không phải narration/pen).
- `vno:without-narration="true"` **chỉ** khi `@showNarration` parse thành `false` (`"0"` / `"false"`). `showNarration="1"` / thiếu attr = no-op cho cờ này (schema default = phát thuyết minh).
- `vno:pointer-color` = `"#"` + `a:srgbClr/@val` thường (`112233` → `#112233`). Chỉ hex 6 chữ. `schemeClr` / val lệch độ dài = no-op, không bịa `#DC2626`.
- Gắn lên thẻ `<presentation:settings>` **đã có** (probe: soffice luôn viết thẻ này khi PPTX có `p:showPr` + `@loop`). Giữ `presentation:endless` / `presentation:pause` / `presentation:mouse-visible`. Không overlay loop.
- Nếu FODP thiếu `<presentation:settings>` nhưng PPTX có `showNarration=0` hoặc `penClr` hợp lệ: **chèn** thẻ settings (không bịa endless).

### Giới hạn / lỗi bắt buộc ném

1. PPTX không có `p:showPr`: **no-op**, trả FODP soffice (bài không có Set Up Show cần khôi phục).
2. `showNarration` không phải `0`/`false` hợp lệ: **không** gắn `vno:without-narration` (không bịa).
3. `p:penClr` thiếu / `srgbClr/@val` không hex 6 chữ: **không** gắn `vno:pointer-color` (không bịa).
4. Overlay hỏng ZIP: **ném lỗi rõ**, không gán bừa. Production: `DocumentEngineError` (cùng chính sách Sections/Master-logo, khác Sheet 2a nuốt exception).
5. Thiếu `ppt/presProps.xml` trong ZIP hợp lệ: **no-op** (không có chỗ `showPr`) — khác thiếu `presentation.xml` (Sections bắt buộc).

### Ghi chú không làm ở overlay này

- **Không** overlay `@loop` / `presentation:endless` — đo `loRoundTripEndless=true`.
- Không vá kiosk / presenter / browse / `p:sldRg` (VN UI không lưu; 3b không xuất).
- Không đổi `_parsePresentationSettings` để đọc thuộc tính LO (`pause`, `mouse-visible`) làm nguồn — nguồn sự thật là PPTX gốc, giống Sections đọc `p14:sectionLst`.

---

## Files sẽ đụng (kế hoạch, chưa sửa implementation)

- `adapters/libreoffice/slides/pptx-show-properties.js` — XML thuần overlay FODP từ `p:showPr`
- `adapters/libreoffice/slides/pptx-native-postprocess.js` — `overlaySlidesPptxFodp` đọc ZIP twin, overlay show sau sections/logo
- `adapters/libreoffice/slides/slides-adapter.js` — overlay trước `parseFodp` (belt-and-suspenders)
- `adapters/libreoffice/common/ooxml_zip_patch.py` — twin Python
- `main.py` — `_apply_native_import_overlay` nhánh slides `.pptx` (cùng hook; thêm `ooxmlPresPropsXml`)
- `tests/*` — unit + live soffice + `open_document_dialog` mock
- `platform/help/entries-slides.js` — bước File → Mở PPTX (AGENTS.md §10)
- `docs/PLAN-SHEET-SLIDES-NATIVE-EXPORT-FIDELITY.md` + handoff overlay

Không đụng `apps/writer/**`, `apps/sheet/**`, `adapters/libreoffice/writer/**`, `adapters/libreoffice/sheet/**`. Không merge main.

---

## Commands đã chạy (đo)

```
node tests/run-tests.js
  → 1267/1267 PASS
node tests/scripts/probe-slides-setup-show-open-overlay.mjs
  → loRoundTripVno=false, loRoundTripEndless=true
  → patchedShowNarration=false, patchedPenRgb=112233, patchedLoop=true
  → roundHasVnoWithoutNarration=false, roundHasVnoPointerColor=false
  → parseFodp().slideShowSettings = { loopUntilEsc: true, showWithoutNarration: false, pointerColor: "#DC2626" }
```
