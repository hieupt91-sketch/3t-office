# Agent Handoff
TASK: `serializeToFodp()` / `parseFodp()` ghi và đọc lại transition slide + animation shape — hết mất khi Lưu/Mở
AGENT/ROLE: Grok (Integration / adapter + test)
BRANCH: `fix/fodp-save-transition-animation`
WORKTREE: `E:\VNOffice-grok-fodp-transition-animation`
OBJECTIVE: Transition (chuyển slide) và animation (hiệu ứng đối tượng) đang chỉ sống trong phiên làm việc. Sau Lưu FODP/PPTX rồi Mở lại bị mất vì adapter không serialize/parse. Sửa trên adapter, chứng minh bằng round-trip in-memory và hop soffice PPTX thật.

---

## Plan gate

Thay đổi parse/serialize FODP trên Slides adapter + test round-trip. Không đụng Core, Writer, Sheet, canvas logic, build system, không gửi nội dung tài liệu ra cloud. **Không merge vào main.**

- **Objective:** `serializeToFodp()` ghi `slide.transition` và `shape.animation` ra XML ODF SMIL chuẩn; `parseFodp()` đọc lại (fallback `none` chỉ khi file thật sự không có). Vòng serialize → soffice PPTX → FODP → parse đo sức chịu đựng thật của định dạng.
- **Current capability trước task:** Canvas gán `slide.transition` và `shape.animation` trong bộ nhớ. `serializeToFodp()` không ghi field nào. `parseFodp()` hard-code `animation: { type: "none", duration: 500, delay: 0 }` trên mọi shape.
- **Files/modules:** `adapters/libreoffice/slides/slides-adapter.js`; unit `tests/unit/slides-file-io.test.js`; live `tests/live/fodp-save-transition-animation-real-conversion.mjs`.
- **Dependency:** `soffice.exe` tại `C:\Users\3T Computer\tools\libreoffice\program\soffice.exe` (chỉ live test).
- **Risk:** Thêm `xmlns:smil` / `xmlns:anim`, per-page `drawing-page` style, `xml:id` trên `draw:page`. Parse shape/title/notes không đổi nhánh. Live shapes + table/arrow cũ phải giữ.
- **Test plan:** unit in-memory + canned XML kiểu soffice (<60s) + live soffice transition/animation + live save-shapes cũ + live table/arrow cũ.
- **Rollback:** revert branch; serializer cũ không ghi transition/animation.

---

## FINDINGS (đo trên code thật + hop soffice, không suy diễn)

### Bug xác nhận trước khi sửa

Probe in-memory trên adapter **chưa sửa**:

| Kiểm tra | Kết quả |
|---|---|
| `serializeToFodp()` có `smil:type` / `anim:par` / `preset-id` / chữ `transition` | **false** |
| `parseFodp()` → `slide.transition` | **undefined** |
| `parseFodp()` → `shape.animation` | **hard-code `{ type: "none", duration: 500, delay: 0 }`** (shape text `Bay vào` vẫn còn) |

Canvas (`apps/slides/slides-canvas.js`, chỉ đọc): `setTransition()` gán `slide.transition = { type, duration }`; `setObjectAnimation()` gán `shape.animation = { type, duration, delay }`. Dialog hỗ trợ transition `fade|slide|zoom|flip` và animation `none|fadeIn|flyIn|zoomIn|bounceIn|slideLeft`.

### XML ODF thật (LibreOffice)

Không bịa cấu trúc. Đưa FODP SMIL vào soffice, đọc XML sau FODP→FODP và FODP→PPTX→FODP.

Transition nằm ở `style:drawing-page-properties` (`smil:type` / `smil:subtype`) **và** `anim:transitionFilter` trên trang. Duration **chỉ sống sót PPTX** khi ghi trên `anim:transitionFilter` (ghi riêng trên style thì soffice mặc định 2s).

Animation là SMIL trong `draw:page`:

```xml
<anim:par presentation:node-type="timing-root">
  <anim:par smil:begin="idPage1.begin">
    <anim:transitionFilter smil:dur="0.5s" smil:type="fade" smil:subtype="crossfade"/>
  </anim:par>
  <anim:seq presentation:node-type="main-sequence">
    <anim:par smil:begin="indefinite">
      <anim:par smil:begin="0.2s" smil:fill="hold" presentation:node-type="on-click"
                presentation:preset-class="entrance"
                presentation:preset-id="ooo-entrance-fly-in"
                presentation:preset-sub-type="from-bottom">
        ...
      </anim:par>
    </anim:par>
  </anim:seq>
</anim:par>
```

`smil:targetElement` trỏ `draw:id`. Sau hop PPTX, LibreOffice đổi `draw:id` thành `id2` nhưng **giữ `draw:name`** (id canvas) và cập nhật `targetElement` theo id mới.

---

## IMPLEMENTATION SUMMARY

### Serialize
- Mỗi slide có transition khác `none` nhận `style:style` family `drawing-page` riêng (`dp2`, `dp3`, …). `dp1` vẫn là trang không transition (master + slide thường).
- Ghi cả thuộc tính SMIL trên drawing-page **và** `anim:transitionFilter` (duration).
- Animation shape: `presentation:preset-id` chuẩn Impress + `anim:animate` mang `smil:dur` (kể cả bounce/wipe — nếu chỉ `anim:set` 0.001s thì duration mất).
- Delay: `smil:begin="0.2s"` trên `anim:par` hiệu ứng.

| VN | XML ghi ra (đã đo PPTX-safe) |
|---|---|
| transition `fade` | `smil:type="fade"` `smil:subtype="crossfade"` |
| transition `slide` | `smil:type="pushWipe"` `smil:subtype="fromLeft"` |
| transition `zoom` | `smil:type="irisWipe"` `smil:subtype="rectangle"` — **không** ghi `smil:type="zoom"` (PPTX ra `<p:transition>` rỗng, mất hẳn) |
| transition `flip` | `smil:type="fadeOverColor"` (ODF hợp lệ; **PPTX filter loại**) |
| animation `fadeIn` | `ooo-entrance-fade-in` |
| animation `flyIn` | `ooo-entrance-fly-in` + `from-bottom` |
| animation `zoomIn` | `ooo-entrance-zoom` |
| animation `bounceIn` | `ooo-entrance-bounce` |
| animation `slideLeft` | `ooo-entrance-wipe` + `from-left` |

### Parse
- Đọc drawing-page style + `anim:transitionFilter` → `slide.transition`.
- Đọc `presentation:preset-id` + `smil:targetElement`, map qua `draw:id`/`draw:name` → `shape.animation`.
- `pushWipe` / `barWipe` / `slideWipe` → VN `slide`. `irisWipe` / `zoom` → VN `zoom`. `fadeOverColor` → VN `flip`.
- Fallback `animation: none` **chỉ khi XML không có preset** cho shape đó. Không gán `slide.transition` nếu file không có.

### Không sửa
`apps/slides/slides-canvas.js` (chỉ đọc). Writer / Sheet. LibreOffice Core. Không SendKeys, không thư viện trả phí.

---

## Kết quả hop soffice PPTX thật

Live: `node tests/live/fodp-save-transition-animation-real-conversion.mjs` — **PASS, 21.1s**.

Bốn slide: Fade+Fly In, Trượt+Fade In, Zoom+Zoom In, Flip+Bounce.

| Thuộc tính | In-memory | PPTX (unzip `slideN.xml`) | FODP sau hop | `parseFodp()` |
|---|---|---|---|---|
| Slide 1 transition | `fade` 500ms | `<p:fade/>` | `smil:type="fade"` `smil:dur="0.5s"` | **fade 500** |
| Slide 1 shape | `flyIn` 800ms delay 200 | `presetID="2"` `delay="200"` | `ooo-entrance-fly-in` `smil:begin="0.2s"` `smil:dur="0.8s"` | **flyIn 800 delay 200** |
| Slide 2 transition | `slide` 500ms | `<p:push dir="r"/>` | `pushWipe` `fromRight` 0.5s | **slide 500** (hướng L→R đổi; type giữ) |
| Slide 2 shape | `fadeIn` 500ms | `presetID="10"` | `ooo-entrance-fade-in` 0.5s | **fadeIn 500** |
| Slide 3 transition | `zoom` 800ms | `<p:zoom dir="out"/>` `p14:dur="800"` | `smil:type="zoom"` `smil:dur="0.8s"` | **zoom 800** |
| Slide 3 shape | `zoomIn` 500ms | `presetID="23"` | `ooo-entrance-zoom` | **zoomIn 500** |
| Slide 4 transition | `flip` 1000ms | **NONE** | không có `smil:type` | **mất** |
| Slide 4 shape | `bounceIn` 500ms | `presetID="26"` | `ooo-entrance-bounce` | **bounceIn 500** |

`flip` mất là **giới hạn filter Impress PPTX** (không map `fadeOverColor` sang `p:transition`), không phải lỗi adapter. FODP thuần VN Office (serialize→parse, không qua PPTX) **giữ flip**.

---

## Coverage

| Loại | Mức | Ghi chú |
|---|---|---|
| Transition `fade` + duration | **Đầy đủ** | In-memory + hop soffice PPTX |
| Transition `slide` + duration | **Đầy đủ type/duration** | Hướng `fromLeft` → `fromRight` sau PPTX. Canvas không có field hướng |
| Transition `zoom` + duration | **Đầy đủ** | Serialize `irisWipe` (PPTX-safe, cùng pattern `right-arrow`) |
| Transition `flip` | **Đầy đủ FODP thuần / mất qua PPTX** | Giới hạn định dạng, không bịa là giữ được |
| Animation `flyIn` duration + delay | **Đầy đủ** | delay 200ms sống trên `p:cond delay="200"` |
| Animation `fadeIn` / `zoomIn` / `bounceIn` | **Đầy đủ type + duration** | Hop PPTX giữ preset-id |
| Animation `slideLeft` | **Đầy đủ in-memory** | Preset `ooo-entrance-wipe` cùng họ; live hop đo 4 preset trên, không đưa wipe vào 4 slide live |
| `titleAnimation` / `bodyAnimation` | **Chưa làm** | Cùng pattern session-only; ngoài scope shape + slide.transition |
| Shape geometry (rect/…) | Không đổi | Regression live shapes + table/arrow PASS |

---

## FILES CHANGED

- `adapters/libreoffice/slides/slides-adapter.js` — serialize/parse SMIL transition + animation
- `tests/unit/slides-file-io.test.js` — 3 test: serialize XML, round-trip in-memory, canned XML soffice
- `tests/live/fodp-save-transition-animation-real-conversion.mjs` — hop soffice thật
- `docs/HANDOFF-FODP-SAVE-TRANSITION-ANIMATION.md`

## COMMANDS RUN

```
node --check adapters/libreoffice/slides/slides-adapter.js
node tests/run-tests.js
node tests/live/fodp-save-transition-animation-real-conversion.mjs
node tests/live/fodp-save-shapes-real-conversion.mjs
node tests/live/fodp-save-table-arrow-real-conversion.mjs
```

## BUILD RESULT: OK (không đổi build system)

## TEST RESULTS

| Suite | Lệnh | Kết quả |
|---|---|---|
| Master unit/smoke | `node tests/run-tests.js` | **714/714 PASS, 17.4s** (< 60s). Thêm 3 test FODP transition/animation |
| Live soffice trans/anim | `node tests/live/fodp-save-transition-animation-real-conversion.mjs` | **PASS, 21.1s** — fade/slide/zoom + flyIn/fadeIn/zoomIn/bounceIn; flip mất sau PPTX |
| Live soffice save hop cũ | `node tests/live/fodp-save-shapes-real-conversion.mjs` | **PASS, 25.0s** — rect/ellipse/textbox/connector/image không hồi quy |
| Live soffice table/arrow | `node tests/live/fodp-save-table-arrow-real-conversion.mjs` | **PASS, 20.9s** — bảng 2×2 + arrow không hồi quy |

## KNOWN FAILURES / LIMITATIONS

1. **Transition `flip` không sống sót PPTX.** Filter Impress không ghi `<p:transition>` cho `fadeOverColor`. FODP thuần giữ. Không map gian sang fade để “giữ cho có”.
2. **`smil:type="zoom"` trực tiếp bị PPTX nuốt** (`<p:transition spd="med" p14:dur="800"></p:transition>` không có child). Serializer ghi `irisWipe`/`rectangle`. File FODP cũ (nếu có) ghi `zoom` trần sẽ mất khi Save-as-PPTX — không backfill.
3. **Hướng pushWipe `fromLeft` → `fromRight` sau hop PPTX.** Type VN vẫn `slide`. Canvas không lưu hướng.
4. **`titleAnimation` / `bodyAnimation` / `body2Animation`** vẫn chỉ trong phiên — chưa gắn `draw:id` lên khung title/outline. Scope task là `slide.transition` + `shape.animation`.
5. **Animation `slideLeft` không đưa vào live hop 4-slide** (đủ chỗ cho fly/fade/zoom/bounce). Unit in-memory ghi/đọc `ooo-entrance-wipe`. Không bịa là đã đo PPTX cho wipe.
6. **Hộp thoại Lưu native** vẫn chỉ Desktop App. Live test gọi serializer + soffice trực tiếp, cùng pipeline `main.py`, không SendKeys.
7. Bounce/wipe serialize thêm `anim:animate` opacity để **duration** sống sót; preset-id mới là type Impress/PowerPoint dùng khi mở file. Không claim path bounce pixel-identical với CSS canvas.

## RISKS

Thấp. Parse chỉ thêm đọc style drawing-page và khối `anim:par` đã có sẵn trong FODP soffice. Live shapes 25.0s PASS; table/arrow 20.9s PASS.

## DEPENDENCIES/BLOCKERS

Không. `soffice.exe` sẵn. Không cần Office GUI, không SendKeys, không thư viện trả phí.

## CORE PATCH ID (if any): N/A

## NEXT ACTION

**KHÔNG merge vào main.** Review trên `fix/fodp-save-transition-animation`. Follow-up tùy chọn: persist `titleAnimation`/`bodyAnimation`; live hop cho `slideLeft`; không có cách PPTX-safe cho `flip` trên filter hiện tại.
