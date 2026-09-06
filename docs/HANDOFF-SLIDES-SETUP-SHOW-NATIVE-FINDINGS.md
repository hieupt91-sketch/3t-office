# Findings — Slides Set Up Show native export (đo trước khi viết code)

TASK: Phase 3b — đo chỗ OOXML thật của Set Up Slide Show, rồi mới quyết có hậu-kỳ hay ghi giới hạn
AGENT/ROLE: Grok — Slides native-export fidelity (không đụng Writer/Sheet source)
BRANCH: `feature/slides-setup-show-native-export`
WORKTREE: `E:\VNOffice-grok-slides-setup-show-native`
BASE: `main` @ `77398d7` (Merge `feature/slides-masterlogo-open-overlay`)
**KHÔNG merge vào main.** File này commit **trước** implementation để agent khác tiếp tục không phải đo lại.

---

## Baseline đã xác nhận (không đoán)

- `git rev-parse HEAD` = `77398d7f01999316cc3009f1860b79a41ad5c92c`
- `node tests/run-tests.js` trên HEAD này: **1258/1259 PASS, 1 FAIL**.
- FAIL **sẵn trên `main`**, không liên quan Slides: suite 64 `Sheet FODS save: LibreOffice giữ CF và validation qua FODS -> XLSX -> FODS` — `soffice --convert-to xlsx:Calc MS Excel 2007 XML failed`. Ngoài phạm vi task (Sheet). Không sửa.
- Handoff cũ ghi “1259+” là kỳ vọng; số đo thật trên commit này là **1258 PASS + 1 FAIL Sheet**.

soffice: `C:\Users\3T Computer\tools\libreoffice\program\soffice.exe`

Script đo: `tests/scripts/probe-slides-setup-show-pptx.mjs` (FODP VN serialize + FODP ODF viết tay → soffice PPTX → dump ZIP XML → soffice PPTX→FODP). Temp: `%TEMP%\vno-probe-setup-show-03eoxh`.

---

## 1. VN Slides đang lưu gì — đọc code, không đoán UI

Nguồn: `apps/slides/slides-canvas.js` (`slideShowSettings`, `getSlideShowSettings`, `applySlideShowSettings`, `showSetupShowDialog`) và `adapters/libreoffice/slides/slides-adapter.js` (`_serializePresentationSettings` / `_parsePresentationSettings`).

Dialog Set Up Show hiện tại **chỉ** có 3 trường:

| Canvas | FODP serialize | Ghi chú |
|---|---|---|
| `loopUntilEsc` | `presentation:endless="true"` trên `<presentation:settings>` | ODF chuẩn |
| `showWithoutNarration` | `vno:without-narration="true"` trên cùng thẻ | custom ns `urn:vn-office:slides:1.0` |
| `pointerColor` (mặc định `#DC2626`) | `vno:pointer-color="#…"` **chỉ khi khác mặc định** | custom ns |

Snippet serialize thật (fixture 3 trang, loop + không thuyết minh + `#112233`):

```xml
<presentation:settings presentation:endless="true" vno:without-narration="true" vno:pointer-color="#112233"/>
```

**Không có** trong model / dialog / FODP VN:

- loại trình chiếu người thuyết trình / kiosk / browse
- slide bắt đầu / kết thúc
- phần tử ODF `<presentation:show>` (custom show)
- `presentation:start-page` / `presentation:full-screen` / `presentation:mouse-as-pen`

Presenter View trên ribbon (`slides.show.presenterMode`) là **chế độ chiếu runtime**, không ghi vào `slideShowSettings`.

Phạm vi task không đụng `apps/slides/**` — không bịa kiosk/sldRg nếu UI chưa lưu.

---

## 2. Chỗ OOXML chuẩn — đo file ZIP, không đoán đường dẫn

Prompt ghi `p:showPr` trong `ppt/presentation.xml`. **Đo thật: sai chỗ.**

ECMA-376 `CT_ShowProperties` parent là `presentationPr` (`ppt/presProps.xml`), không phải `p:presentation`.

LibreOffice **luôn** ghi `ppt/presProps.xml` (mọi case probe). `ppt/presentation.xml` (784 byte, compact) **không bao giờ** chứa `p:showPr` / `loop` / `penClr` / `kiosk` / `sldRg`.

`ppt/presentation.xml` sau hop (3 slide):

```xml
<p:sldMasterIdLst>…</p:sldMasterIdLst>
<p:sldIdLst>
  <p:sldId id="256" r:id="rId3"/>
  <p:sldId id="257" r:id="rId4"/>
  <p:sldId id="258" r:id="rId5"/>
</p:sldIdLst>
<p:sldSz cx="10080625" cy="5670550"/>
<p:notesSz cx="7559675" cy="10691813"/>
```

`ppt/presProps.xml` — element **đã có**, thiếu đúng những cờ VN cần:

```xml
<p:presentationPr xmlns:a="…" xmlns:p="…" xmlns:r="…">
  <p:showPr loop="1" showNarration="1"></p:showPr>
</p:presentationPr>
```

`[Content_Types].xml` và `ppt/_rels/presentation.xml.rels` đã khai báo `presProps` (`rId6`). Không cần tạo entry ZIP mới.

Schema `CT_ShowProperties` (đối chiếu spec, khớp file đo):

| Ô chuẩn | Ý nghĩa PowerPoint |
|---|---|
| `@loop` | Lặp đến Esc |
| `@showNarration` | Phát thuyết minh |
| `@showAnimation` / `@useTimings` | LO không ghi (default schema) |
| `p:present` / `p:browse` / `p:kiosk` | Loại chiếu |
| `p:sldAll` / `p:sldRg` / `p:custShow` | Phạm vi slide |
| `p:penClr` / `a:srgbClr` | Màu bút chiếu |

PLAN cũ nghi `vno:pointer-color` “thường là cài UI runtime, không có trong file”. **Đo schema: có chỗ chuẩn `p:penClr`.** Không phải giới hạn kiến trúc PowerPoint.

---

## 3. LibreOffice map gì / bỏ gì (soffice FODP→PPTX thật)

| Nguồn FODP | `ppt/presProps.xml` đo được | PPTX→FODP |
|---|---|---|
| `presentation:endless="true"` | `@loop="1"` | `presentation:endless="true"` **giữ** |
| không endless | **không** có `@loop` | không endless |
| `vno:without-narration="true"` | **bỏ**; LO vẫn `@showNarration="1"` | `vno:*` mất |
| `vno:pointer-color="#112233"` / `#00AA55` | **không** `p:penClr`, không hex | `vno:*` mất |
| không `presentation:settings` (default VN) | `<p:showPr showNarration="1"></p:showPr>` | `<presentation:settings presentation:mouse-visible="false"/>` |
| `presentation:start-page="page2"` (ODF viết tay, 3 trang) | `<p:sldRg st="2" end="3"/>` | `presentation:start-page="Noi dung"` (tên `draw:name`) |
| `presentation:start-page="page3"` | `<p:sldRg st="3" end="3"/>` | `start-page="Ket luan"` |
| `<presentation:show …>` + `presentation:show="CustomKiosk"` | **không** `p:custShow`; chỉ `sldRg` từ start-page | custom show mất |
| `presentation:mouse-as-pen="true"` | **không** `p:penClr` | `mouse-visible="false"` (mất mouse-as-pen) |
| `presentation:full-screen` + `transition-on-click="false"` + endless | chỉ `loop="1" showNarration="1"` — **không** `p:kiosk` / `p:present` / `p:browse` | chỉ endless |

Kết luận filter:

1. **Loop đã đủ.** Không vá `@loop` — LO đã map `presentation:endless`. Vá nhầm có thể phá round-trip đã PASS.
2. **`showNarration` luôn `"1"`.** Filter không đọc `vno:without-narration`. Không có thuộc tính ODF chuẩn tương đương mà LO map sang `"0"`. Được phép hậu-kỳ: set `@showNarration="0"` khi FODP có `vno:without-narration="true"`.
3. **`p:penClr` không bao giờ sinh.** Kể cả `presentation:mouse-as-pen` ODF chuẩn. Màu bút VN chỉ có `vno:pointer-color`. Được phép hậu-kỳ: chèn `p:penClr/a:srgbClr` khi FODP có màu.
4. **`p:kiosk` / `p:present` / `p:browse`:** LO không sinh từ ODF đã thử. VN UI **không lưu** loại chiếu → **không vá**, không bịa. Giới hạn UI hiện tại, không phải “OOXML không có chỗ”.
5. **`p:sldRg`:** LO **đã** map nếu FODP có `presentation:start-page`. VN serialize **không** ghi start-page. Không bịa range. Muốn start/end thì task UI + serialize ODF riêng (`apps/slides` ngoài scope).
6. **Không nhét `vno:*` vào PPTX.**

Pattern giống Phase 1 (`workbookProtection` đã có, thiếu `lockStructure`) — **không** giống Phase 3a (thiếu hẳn `p:extLst`). Element `p:showPr` đã có trong `presProps.xml`; thiếu attribute/child.

---

## 4. Quyết định thiết kế (sau đo, chưa code)

Hậu-kỳ **có chỗ chuẩn**, không làm giả:

```
serialize FODP (không đổi model)
  → soffice FODP→PPTX
  → mở ZIP (ooxml_zip_patch twin có sẵn)
  → sửa ppt/presProps.xml p:showPr
       showWithoutNarration → showNarration="0"
       pointerColor        → p:penClr/a:srgbClr val="RRGGBB"
       giữ @loop / p:sldRg / children LO đã viết
  → đóng ZIP
```

Không sửa `ppt/presentation.xml` cho showPr.

Gate `main.py` hiện `return` sớm khi FODP không có logo và không có section — bài **chỉ** Set Up Show sẽ không bao giờ vá. Phải nới: logo **hoặc** section **hoặc** `vno:without-narration` **hoặc** `vno:pointer-color`.

No-op khi FODP không có hai cờ `vno:*` (loop-only đã đủ nhờ LO).

File → Mở overlay `showNarration`/`penClr` → `vno:*` **không** làm ở phase này (cùng lỗ 3a trước overlay). Ghi next-action.

---

## 5. Giới hạn thật (không làm giả)

| Mục | Có chỗ OOXML? | Làm ở 3b? | Lý do đo |
|---|---|---|---|
| Loop | Có, LO đã ghi `@loop` | Không | Đã sống qua PPTX |
| Không thuyết minh | Có `@showNarration` | **Có** | LO luôn `"1"` |
| Màu bút | Có `p:penClr` | **Có** | LO không sinh |
| Kiosk / presenter / browse | Có `p:kiosk`/`present`/`browse` | **Không** | VN không lưu; LO không map ODF đã thử |
| Slide start/end | Có `p:sldRg`; LO map `presentation:start-page` | **Không** | VN không serialize start-page |
| Custom show | Có `p:custShow` | **Không** | VN không có `<presentation:show>`; LO không map |

---

## NEXT ACTION

1. Commit file này **trước** implementation (quy tắc bắt buộc).
2. Module XML thuần `pptx-show-properties.js` + twin Python trong `ooxml_zip_patch.py`. Tái sử dụng ZIP twin. Không viết ZIP riêng.
3. Móc `pptx-native-postprocess.js` / `postprocess_slides_pptx` / `main.py`.
4. Unit XML + live soffice byte-level `ppt/presProps.xml`.
5. Cập nhật PLAN + handoff export. Không merge `main`.
