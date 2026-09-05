# Agent Handoff
TASK: `serializeToFodp()` / `parseFodp()` ghi và đọc lại `titleAnimation` / `bodyAnimation` / `body2Animation` — hết mất khi Lưu/Mở
AGENT/ROLE: Grok (Integration / adapter + test)
BRANCH: `fix/fodp-save-title-body-animation`
WORKTREE: `E:\VNOffice-grok-title-body-animation`
OBJECTIVE: Animation tiêu đề/nội dung slide (khác animation shape thường) đang chỉ sống trong phiên. Follow-up của `fix/fodp-save-transition-animation` (đã merge main). Gắn `draw:id` lên khung title/outline, serialize/parse cùng preset SMIL đã đo, chứng minh bằng round-trip in-memory và hop soffice PPTX thật. **Không merge vào main.**

---

## Plan gate

Thay đổi parse/serialize FODP trên Slides adapter + test round-trip. Không đụng Core, Writer, Sheet, canvas logic, build system, không gửi nội dung tài liệu ra cloud.

- **Objective:** `serializeToFodp()` ghi `slide.titleAnimation` / `bodyAnimation` / `body2Animation` ra XML ODF SMIL trỏ đúng khung placeholder; `parseFodp()` đọc lại (không gán field nếu file không có). Vòng serialize → soffice PPTX → FODP → parse đo sức chịu đựng thật.
- **Current capability trước task:** Canvas gán `slide.titleAnimation` / `bodyAnimation` / `body2Animation`. Adapter đã persist `slide.transition` + `shape.animation`. Khung `<draw:frame presentation:class="title|outline">` **không có** `draw:id`, nên SMIL không trỏ được.
- **Files/modules:** `adapters/libreoffice/slides/slides-adapter.js`; unit `tests/unit/slides-file-io.test.js`; live `tests/live/fodp-save-title-body-animation-real-conversion.mjs`.
- **Dependency:** `soffice.exe` tại `C:\Users\3T Computer\tools\libreoffice\program\soffice.exe` (chỉ live test).
- **Risk:** Gắn id lên placeholder có thể làm parser cũ coi khung title thành shape. Parse title/body vẫn theo `presentation:class`; `_extractShapeFrames` tiếp tục bỏ qua class layout. Live shapes + table/arrow + transition/animation cũ phải giữ.
- **Test plan:** unit in-memory + canned XML kiểu soffice (id remap / không id) + live soffice title/body/body2 + 3 live hop cũ.
- **Rollback:** revert branch; serializer cũ không ghi animation placeholder.

---

## FINDINGS (đo trên code thật + hop soffice, không suy diễn)

### Model canvas — xác nhận trước khi sửa adapter

Đọc `apps/slides/slides-canvas.js` (chỉ đọc). Field **có thật**, không bịa:

| Field | Nơi gán | Nơi đọc |
|---|---|---|
| `slide.titleAnimation = { type, duration, delay }` | `setObjectAnimation("title", cfg)` dòng 660–661; slide mẫu constructor 190, 201, 211; `resetToBlank` 4132 | `getObjectAnimation("title")`; slideshow CSS 3684–3688; `duplicateCurrentSlide` 2130 |
| `slide.bodyAnimation` | `setObjectAnimation("body", cfg)` 662–663; slide mẫu 191 | slideshow 3692–3696; duplicate 2131 |
| `slide.body2Animation` | `setObjectAnimation("body2", cfg)` 664–665 | slideshow 3700–3704; duplicate 2132 |

Cùng schema shape: `{ type: "none"\|"fadeIn"\|"flyIn"\|"zoomIn"\|"bounceIn"\|"slideLeft", duration, delay }`. Layout `two-content` mới có khung body2.

### Bug xác nhận trước khi sửa

Probe in-memory trên adapter **chưa sửa** (task trước đã ghi): serialize không phát `draw:id` trên title/outline; parse không gán `titleAnimation`/`bodyAnimation`. Baseline `node tests/run-tests.js` trước sửa: **714/714 PASS, ~16.8s**.

### XML ODF thật (LibreOffice) sau hop PPTX

Không bịa cấu trúc. FODP có id trên placeholder → soffice PPTX → FODP:

- LibreOffice **đổi** `draw:id="title-1"` thành `id1`/`id2`/…, **đổi** `draw:name="title"` thành `PlaceHolder 1`.
- **Giữ** `presentation:class="title"` / `"outline"` trên khung thật (`draw:layer="layout"`).
- `smil:targetElement` cập nhật theo id mới.
- PPTX unzip: `p:ph type="title"|"body"` + `presetID` + `delay` — cùng họ shape animation task trước (`10` fade, `2` fly-in, `23` zoom, `22` wipe, `26` bounce).
- `presentation:layout="two-content"|"title-only"` **bị filter PPTX nuốt**. Khung vẫn còn: title-only = 1 title; two-content = 1 title + 2 outline.

---

## IMPLEMENTATION SUMMARY

### Serialize
- Mỗi trang (không `blank`) cấp id duy nhất trong document: `title-1`, `body-1`, `body2-3`, … (`xml:id` + `draw:id`). `draw:name` = role `title`/`body`/`body2`.
- Id placeholder cấp **trước** shape, chung `used` set, tránh trùng `draw:id`.
- Animation placeholder dùng chung `_serializeEntranceAnimation()` với shape (`_mapVnAnimationToPreset` không đổi).
- Thứ tự main-sequence: title → body → body2 → shapes.
- `presentation:class="title"|"outline"` giữ nguyên — parser cũ vẫn lấy title/body theo class, không biến placeholder thành shape.

### Parse
- `_parsePageAnimations` chỉ đọc `smil:dur` **trong** `anim:par` đang xét (cửa sổ 2500 ký tự cũ lấy nhầm duration hiệu ứng kế bên khi title+body cùng trang).
- `_collectPlaceholderTargets` map `draw:id` / `xml:id` / `draw:name` → role. Class `title` → title; `outline` theo thứ tự → body, body2. Tên `PlaceHolder N` không phải role — dựa class + id sau remap.
- Không gán `titleAnimation` nếu XML không có preset cho khung đó (giống `slide.transition`).
- PPTX hop mất `presentation:layout`: nếu còn ≥2 outline → `two-content` (tách body/body2); title + 0 outline + 0 subtitle và không có attr layout → `title-only`. `blank` giữ nếu attr còn. File FODP thuần VN Office vẫn ghi `presentation:layout` nên unit layout không đổi nhánh.

### Không sửa
`apps/slides/slides-canvas.js` (chỉ đọc). Writer / Sheet. LibreOffice Core. Không SendKeys, không thư viện trả phí.

---

## Kết quả hop soffice PPTX thật

Live: `node tests/live/fodp-save-title-body-animation-real-conversion.mjs` — **PASS, 20.9s**.

Bốn slide: title-content fadeIn+flyIn+shape zoomIn; title-content zoomIn+fadeIn; two-content fadeIn+slideLeft+bounceIn; title-only flyIn.

| Thuộc tính | In-memory | PPTX (unzip `slideN.xml`) | FODP sau hop | `parseFodp()` |
|---|---|---|---|---|
| Slide 1 title | `fadeIn` 600ms delay 100 | `presetID="10"` `delay="100"` `ph=title` | `ooo-entrance-fade-in` `smil:begin="0.1s"` `target=id1` | **fadeIn 600 delay 100** |
| Slide 1 body | `flyIn` 700ms delay 300 | `presetID="2"` `delay="300"` `ph=body` | `ooo-entrance-fly-in` 0.3s `id2` | **flyIn 700 delay 300** |
| Slide 1 shape | `zoomIn` 500ms | `presetID="23"` | `ooo-entrance-zoom` `id3` | **zoomIn 500** (không hồi quy) |
| Slide 1 text | title/body | — | class title/outline | **giữ** |
| Slide 2 title | `zoomIn` 500ms | `presetID="23"` | `ooo-entrance-zoom` | **zoomIn 500** |
| Slide 2 body | `fadeIn` 800ms delay 200 | `presetID="10"` `delay="200"` | `ooo-entrance-fade-in` 0.2s | **fadeIn 800 delay 200** |
| Slide 3 title | `fadeIn` 500ms | `presetID="10"` | fade-in | **fadeIn 500** |
| Slide 3 body | `slideLeft` 1000ms | `presetID="22"` | `ooo-entrance-wipe` `from-left` | **slideLeft 1000** |
| Slide 3 body2 | `bounceIn` 800ms delay 200 | `presetID="26"` `delay="200"` `ph=body,body` | bounce `id8` | **bounceIn 800 delay 200** |
| Slide 3 text | 2 cột | 2 `p:ph type=body` | 2 outline | **body / body2 tách** (suy layout từ 2 outline) |
| Slide 4 title | `flyIn` 800ms delay 100 | `presetID="2"` `delay="100"` `ph=title` | fly-in 0.1s | **flyIn 800 delay 100** |
| Slide 4 layout | `title-only` | chỉ `ph=title` | 1 title, 0 outline | **title-only** (suy từ placeholder) |

`draw:name` role (`title`/`body`) **mất** sau hop (thành `PlaceHolder N`). Parse không phụ thuộc name đó — dựa `presentation:class` + id remap. FODP thuần VN Office (serialize→parse, không qua PPTX) **giữ** `draw:name` và `presentation:layout`.

---

## Coverage

| Loại | Mức | Ghi chú |
|---|---|---|
| `titleAnimation` fadeIn/zoomIn/flyIn + duration + delay | **Đầy đủ** | In-memory + hop soffice PPTX |
| `bodyAnimation` flyIn/fadeIn/slideLeft + duration + delay | **Đầy đủ** | `slideLeft` lần này **có** đo PPTX (wipe `from-left` giữ) |
| `body2Animation` bounceIn + delay | **Đầy đủ** | two-content, outline thứ 2 |
| Title-only `titleAnimation` | **Đầy đủ** | Không có body frame |
| Shape animation cùng slide | **Không hồi quy** | zoomIn trên slide 1 live |
| Placeholder không id (file cũ / Read Mode) | **Không đổi** | Canned + test parse title/body không class/id vẫn PASS |
| Layout `presentation:layout` qua PPTX | **Mất attr, suy lại từ khung** | FODP thuần giữ attr |

---

## FILES CHANGED

- `adapters/libreoffice/slides/slides-adapter.js` — id trên title/outline; serialize/parse placeholder animation; duration theo từng `anim:par`; suy two-content/title-only khi PPTX nuốt layout
- `tests/unit/slides-file-io.test.js` — 3 test: serialize XML, round-trip in-memory, canned soffice (id remap + không id + 2 outline không attr layout)
- `tests/live/fodp-save-title-body-animation-real-conversion.mjs` — hop soffice thật
- `docs/HANDOFF-FODP-SAVE-TITLE-BODY-ANIMATION.md`

## COMMANDS RUN

```
node --check adapters/libreoffice/slides/slides-adapter.js
node tests/run-tests.js
node tests/live/fodp-save-title-body-animation-real-conversion.mjs
node tests/live/fodp-save-shapes-real-conversion.mjs
node tests/live/fodp-save-table-arrow-real-conversion.mjs
node tests/live/fodp-save-transition-animation-real-conversion.mjs
```

## BUILD RESULT: OK (không đổi build system)

## TEST RESULTS

| Suite | Lệnh | Kết quả |
|---|---|---|
| Baseline trước sửa | `node tests/run-tests.js` | **714/714 PASS, 16.8s** |
| Master unit/smoke sau sửa | `node tests/run-tests.js` | **717/717 PASS, 16.9s** (< 60s). Thêm 3 test FODP title/body animation |
| Live soffice title/body/body2 | `node tests/live/fodp-save-title-body-animation-real-conversion.mjs` | **PASS, 20.9s** — fadeIn/flyIn/zoomIn/bounceIn/slideLeft + delay; text title/body/body2 giữ; shape zoomIn không hồi quy |
| Live soffice save hop cũ | `node tests/live/fodp-save-shapes-real-conversion.mjs` | **PASS** — rect/ellipse/textbox/connector/image không hồi quy |
| Live soffice table/arrow | `node tests/live/fodp-save-table-arrow-real-conversion.mjs` | **PASS** — bảng 2×2 + arrow không hồi quy |
| Live soffice trans/anim cũ | `node tests/live/fodp-save-transition-animation-real-conversion.mjs` | **PASS** — fade/slide/zoom + flyIn/fadeIn/zoomIn/bounceIn; flip vẫn mất sau PPTX như đã biết |
| 3 live hop cũ cộng lại | (chạy nối tiếp) | **PASS, 69.5s** |

## KNOWN FAILURES / LIMITATIONS

1. **`presentation:layout` không sống sót PPTX.** Filter Impress không ghi lại `two-content` / `title-only`. Parser suy từ số khung outline/title. FODP thuần giữ attr. Không bịa là attr còn sau hop.
2. **`draw:name` role (`title`/`body`) bị soffice đổi thành `PlaceHolder N`.** Parse dựa `presentation:class` + `draw:id` remap. File FODP không qua PPTX giữ name.
3. **Layout `blank` không có khung title/body** — nếu model vẫn có `titleAnimation` thì không serialize được (không có target). Canvas blank không hiện title.
4. **`body2Animation` chỉ gắn khi có khung outline thứ hai** (`two-content`). title-content không cấp `body2-N`.
5. **Hộp thoại Lưu native** vẫn chỉ Desktop App. Live test gọi serializer + soffice trực tiếp, cùng pipeline `main.py`, không SendKeys.
6. Transition `flip` vẫn mất qua PPTX (giới hạn task trước, xác nhận lại live cũ PASS cùng hành vi).

## RISKS

Thấp. Parse title/body vẫn theo `presentation:class`; test không id vẫn PASS. Gắn id không biến placeholder thành shape (đo in-memory + hop). Live shapes  + table/arrow + transition/animation cũ PASS.

Suy `two-content` khi ≥2 outline: file soffice lạ có hai outline không phải two-content sẽ bị gán layout đó. Serializer VN Office không phát title-content với 2 outline.

## DEPENDENCIES/BLOCKERS

Không. `soffice.exe` sẵn. Không cần Office GUI, không SendKeys, không thư viện trả phí.

## CORE PATCH ID (if any): N/A

## NEXT ACTION

**KHÔNG merge vào main.** Review trên `fix/fodp-save-title-body-animation`.

Follow-up tùy chọn (ngoài scope): persist `presentation:layout` qua PPTX nếu tìm được mapping OOXML placeholder chắc hơn suy từ số khung; không còn gap session-only cho title/body/body2 animation trên FODP/PPTX đã đo.
