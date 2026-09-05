# Agent Handoff
TASK: Chứng minh `table` và `arrow` qua vòng hộp soffice PPTX thật — đóng khoảng trống còn lại của `fix/fodp-save-shapes`
AGENT/ROLE: Grok (Integration / adapter + test)
BRANCH: `fix/fodp-save-table-arrow`
WORKTREE: `E:\VNOffice-grok-fodp-table-arrow`
OBJECTIVE: Hai loại shape chỉ mới “đầy đủ in-memory” sau task trước phải được đo trên hop FODP → PPTX → FODP thật. Giữ được thì giữ; mất thì sửa trong adapter nếu được, không thì ghi rõ giới hạn filter LibreOffice.

---

## Plan gate

Thay đổi parse/serialize FODP trên Slides adapter + test round-trip. Không đụng Core, Writer, Sheet, canvas logic, build system, không gửi nội dung tài liệu ra cloud. **Không merge vào main.**

- **Objective:** Vòng `serializeToFodp()` → soffice `--convert-to pptx` → soffice PPTX→FODP → `parseFodp()` giữ bảng (số hàng/cột + từng ô `cells[][]`) và mũi tên (type/hướng).
- **Current capability trước task:** Unit in-memory đã ghi/đọc `table:table` và `draw:type="arrow"`. Live hop `tests/live/fodp-save-shapes-real-conversion.mjs` **không** đưa table/arrow vào (ghi rõ trong `docs/HANDOFF-FODP-SAVE-SHAPES.md` mục Shape coverage).
- **Files/modules:** `adapters/libreoffice/slides/slides-adapter.js`; unit `tests/unit/slides-file-io.test.js`; live `tests/live/fodp-save-table-arrow-real-conversion.mjs`.
- **Dependency:** `soffice.exe` tại `C:\Users\3T Computer\tools\libreoffice\program\soffice.exe` (chỉ live test).
- **Risk:** Đổi thứ tự parse frame (table trước image) có thể ảnh hưởng frame ảnh thuần. Frame ảnh không chứa `<table:table>` vẫn đi nhánh image — unit import fidelity + live Playwright 16/16 giữ.
- **Test plan:** unit in-memory + canned XML kiểu soffice (<60s) + live soffice table/arrow + live save-shapes cũ + live Playwright import cũ.
- **Rollback:** revert branch; serializer cũ vẫn ghi table/arrow nhưng parse nhầm bảng thành image sau hop, và `draw:type="arrow"` bị filter PPTX đổi thành rect.

---

## FINDINGS (đo trên hop soffice thật, không suy diễn)

Slide đo: 1 `table` 2×2 (`Sản phẩm` / `Số lượng` / `VN Writer` / `120`) + 1 `arrow` (`Mũi tên phải`, `#dc2626`, 200×80 px).

### Bảng — XML sống sót, parser nhận nhầm

Sau FODP→PPTX→FODP, LibreOffice **giữ** `<table:table>` đủ 2 hàng × 2 cột, từng ô đúng chữ. PPTX có `<a:tbl>` với 4 ô đó. Đồng thời hop **chèn thêm** sibling `<draw:image>` (preview WMF) trong cùng `draw:frame`:

```xml
<draw:frame draw:name="tbl1" ...>
  <table:table>…4 ô…</table:table>
  <draw:image><office:binary-data>…WMF…</office:binary-data></draw:image>
</draw:frame>
```

`_parseFrameShape()` kiểm tra `draw:image` **trước** `table:table` → shape bị đọc thành `type: "image"`, `cells` mất. Đây là lỗi adapter, không phải filter PPTX xóa bảng.

### Mũi tên — filter PPTX không map `draw:type="arrow"`

Probe 4 `draw:type` trên cùng soffice (FODP→PPTX→FODP):

| Ghi ra | PPTX `prst` | FODP sau hop | Chiều cao (gốc 2cm) |
|---|---|---|---|
| `arrow` (serializer cũ) | `rect` | `ooxml-rect` | 0.961cm (sụp) |
| `blocked-arrow` | `rect` | `ooxml-rect` | 0.961cm |
| `right-arrow` | `rightArrow` | `ooxml-rightArrow` | 1.923cm |
| `ooxml-rightArrow` | `rightArrow` | `ooxml-rightArrow` | 1.672cm |

`draw:type="arrow"` (ODF cổ) **không** được Impress PPTX filter map sang preset mũi tên — thành hình chữ nhật, text còn, hình học mũi tên mất. Đây là giới hạn filter. Workaround hợp lệ trong adapter: ghi `draw:type="right-arrow"` (ODF chuẩn mà filter map sang `prst=rightArrow`).

---

## IMPLEMENTATION SUMMARY

### Parse
Trong `_parseFrameShape()`, nhận `table:table` **trước** `draw:image` / `draw:plugin`. Frame bảng sau hop PPTX không còn bị nuốt thành image.

### Serialize
`type === "arrow"` ghi `draw:enhanced-geometry draw:type="right-arrow"` (cùng path 21600). Parser vốn đã `/arrow/i.test(geomType)` nên `right-arrow` và `ooxml-rightArrow` đều ra `type: "arrow"`.

### Không sửa
`apps/slides/slides-canvas.js`. Writer / Sheet. LibreOffice Core. Không SendKeys, không thư viện trả phí.

---

## Kết quả hop soffice PPTX thật

Live: `node tests/live/fodp-save-table-arrow-real-conversion.mjs` — **PASS, 19.2s**.

| Thuộc tính | Trước hop (in-memory) | PPTX (unzip `slide1.xml`) | FODP sau hop | `parseFodp()` |
|---|---|---|---|---|
| Bảng `id` | `tbl1` | `name="tbl1"` | `draw:name="tbl1"` | `tbl1` |
| Bảng `type` | `table` | `<a:tbl>` trong `graphicFrame` | `<table:table>` + preview image | `table` (sau fix; trước fix: `image`) |
| Hàng × cột | 2 × 2 | 2 × 2 | 2 `<table:table-row>` × 2 cell | `rows=2` `cols=2` |
| `cells[0][0]` | `Sản phẩm` | `Sản phẩm` | `Sản phẩm` | `Sản phẩm` |
| `cells[0][1]` | `Số lượng` | `Số lượng` | `Số lượng` | `Số lượng` |
| `cells[1][0]` | `VN Writer` | `VN Writer` | `VN Writer` | `VN Writer` |
| `cells[1][1]` | `120` | `120` | `120` | `120` |
| Bảng x,y,w,h | 76, 151, 454×114 | tương ứng EMU | 2.011cm, 3.995cm, 12.011×3.015cm | **76, 151, 454×114** (khớp) |
| Arrow `id` | `arr1` | `name="arr1"` | `draw:name="arr1"` | `arr1` |
| Arrow geometry type | serialize `right-arrow` | `prst="rightArrow"` | `draw:type="ooxml-rightArrow"` | `type: "arrow"` |
| Arrow text | `Mũi tên phải` | `Mũi tên phải` | `Mũi tên phải` | `Mũi tên phải` |
| Arrow color | `#dc2626` | fill giữ | style fill `#dc2626` | `#dc2626` |
| Arrow x,y,w,h | 568, 189, 200×80 | cx khớp, cy hơi thấp | 15.028cm, 5.001cm, 5.291×**1.923**cm | 568, 189, 200×**73** |

Hướng mũi tên: **phải → phải**. soffice không đổi sang custom-shape khác sau khi serialize `right-arrow`.

---

## Shape coverage (cập nhật từ task trước)

| Loại | Mức | Ghi chú |
|---|---|---|
| `rect` / `ellipse` / `textbox` / `connector` / `image` | **Đầy đủ** (task trước) | Live `fodp-save-shapes-real-conversion.mjs` vẫn PASS sau thay đổi này |
| `table` | **Đầy đủ** | In-memory + hop soffice PPTX: 2×2, đủ 4 ô, vị trí/kích thước khớp. Parser không còn nhận nhầm preview image |
| `arrow` | **Đầy đủ type/hướng/text/id/màu/x/y/width** | Serialize `right-arrow` → PPTX `rightArrow` → parse `arrow`. Chiều cao **80→73 px** (~9%, ~7px) do soffice fit — không bịa là giữ nguyên height |
| `video` / `audio` | **Rút gọn** | Không đụng trong task này (giới hạn đã ghi ở handoff shapes) |

---

## FILES CHANGED

- `adapters/libreoffice/slides/slides-adapter.js` — table trước image; arrow ghi `right-arrow`
- `tests/unit/slides-file-io.test.js` — siết cells 2×2; canned XML soffice (table+image preview + `ooxml-rightArrow`)
- `tests/live/fodp-save-table-arrow-real-conversion.mjs` — hop soffice thật
- `docs/HANDOFF-FODP-SAVE-TABLE-ARROW.md`

## COMMANDS RUN

```
node --check adapters/libreoffice/slides/slides-adapter.js
node tests/run-tests.js
node tests/live/fodp-save-table-arrow-real-conversion.mjs
node tests/live/fodp-save-shapes-real-conversion.mjs
node tests/live/real-office-file-import-fidelity.playwright.mjs
```

## BUILD RESULT: OK (không đổi build system)

## TEST RESULTS

| Suite | Lệnh | Kết quả |
|---|---|---|
| Master unit/smoke | `node tests/run-tests.js` | **664/664 PASS, 12.3s** (< 60s). Thêm 1 test canned XML soffice (table + image preview + `ooxml-rightArrow`); siết assertion cells 2×2 trong test in-memory sẵn có |
| Live soffice table/arrow | `node tests/live/fodp-save-table-arrow-real-conversion.mjs` | **PASS, 19.2s** — bảng 2×2 đủ 4 ô, geom 76,151,454×114; arrow `arr1` type=arrow, `ooxml-rightArrow`, text/màu/x/y/width giữ, h 80→73 |
| Live soffice save hop cũ | `node tests/live/fodp-save-shapes-real-conversion.mjs` | **PASS, 22.0s** — rect/ellipse/textbox/connector/image không hồi quy |
| Live Playwright import cũ | `node tests/live/real-office-file-import-fidelity.playwright.mjs` | **16/16 PASS, 31.8s** — không hồi quy parse PPTX thật |

## KNOWN FAILURES / LIMITATIONS

1. **`draw:type="arrow"` cổ không sống sót PPTX.** Filter Impress map thành `prst=rect`. Serializer mới ghi `right-arrow`. File FODP cũ (nếu có) vẫn mất mũi tên khi Save-as-PPTX — không backfill.
2. **Chiều cao arrow sau hop PPTX giảm ~7px (80→73).** Width/x/y/type/text/màu giữ. Không chỉnh Core để ép height.
3. **Preview `draw:image` trong frame bảng bị bỏ** khi parse (đúng: đó không phải ảnh người dùng). Ảnh thật (frame chỉ có `draw:image`) không đổi.
4. **Canvas không có trường hướng mũi tên** (`insertShape("arrow")` luôn phải). Task này không thêm left/up/down.
5. **Hộp thoại Lưu native** vẫn chỉ Desktop App. Live test gọi serializer + soffice trực tiếp, cùng pipeline `main.py`, không SendKeys.
6. **Không chứng minh bảng >2×2 trên hop live.** Cùng XML `table:table-row`/`table:table-cell`; unit 2×2 + live 2×2. Bảng merge/`number-columns-repeated` không xuất hiện trên hop đo được.

## RISKS

Thấp. Chỉ đổi thứ tự nhánh parse frame và tên preset arrow. Live shapes cũ 22.0s PASS; Playwright import 16/16 PASS.

## DEPENDENCIES/BLOCKERS

Không. `soffice.exe` sẵn. Không cần Office GUI, không SendKeys, không thư viện trả phí.

## CORE PATCH ID (if any): N/A

## NEXT ACTION

**KHÔNG merge vào main.** Review trên `fix/fodp-save-table-arrow`. Follow-up tùy chọn: bảng merge/cell-repeat; arrow left/up/down nếu canvas có hướng; height arrow 80→73 nếu product yêu cầu pixel-exact.
