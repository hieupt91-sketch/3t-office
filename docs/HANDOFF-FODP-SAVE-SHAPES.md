# Agent Handoff
TASK: `serializeToFodp()` ghi `slide.shapes` ra FODP — hết mất shape khi Lưu
AGENT/ROLE: Grok (Integration / adapter + test)
BRANCH: `fix/fodp-save-shapes`
WORKTREE: `E:\VNOffice-grok-fodp-shapes-save`
OBJECTIVE: Người dùng mở PPTX thật có shape (đã đọc đúng nhờ `fix/real-office-file-import-fidelity`), sửa/xem trong VN Office, bấm Lưu — shape không còn bị xóa sạch vì serializer không biết ghi XML.

---

## Plan gate

Thay đổi export FODP trên Slides adapter + test round-trip. Không đụng Core, Writer, Sheet, canvas logic, build system, không gửi nội dung tài liệu ra cloud.

- **Objective:** `serializeToFodp()` lặp `slide.shapes[]` và sinh ODF; `parseFodp()` đọc lại đủ để vòng Lưu→Mở (kể cả hop soffice PPTX) giữ shape/vị trí/màu/text.
- **Current capability trước task:** `parseFodp()` đã đọc `draw:rect|ellipse|custom-shape` vào `slide.shapes`. `serializeToFodp()` chỉ ghi title/body/layout/notes — **không bao giờ ghi shapes** (Known Failure #3 trong `docs/HANDOFF-REAL-OFFICE-FILE-IMPORT-FIDELITY.md`).
- **Files/modules:** `adapters/libreoffice/slides/slides-adapter.js`; unit `tests/unit/slides-file-io.test.js`; live `tests/live/fodp-save-shapes-real-conversion.mjs`.
- **Dependency:** `soffice.exe` tại `C:\Users\3T Computer\tools\libreoffice\program\soffice.exe` (chỉ live test).
- **Risk:** thêm `presentation:class` cho khung title/outline có thể đổi nhánh parse; đã giữ fallback cũ (frame không class) và tách `two-content` outline thành `body`/`body2`. Unit layouts/notes/import vẫn PASS.
- **Test plan:** unit in-memory + canned soffice XML (<60s) + live soffice FODP→PPTX→FODP + live Playwright import cũ.
- **Rollback:** revert branch; serializer cũ không ghi shapes.

---

## FINDINGS

`serializeToFodp()` (code VN Office tự viết, không phải giới hạn LibreOffice) chỉ emit `draw:frame` title/body theo `layoutType` và `presentation:notes`. Không có vòng lặp `slide.shapes`.

Loại shape trên canvas (`apps/slides/slides-canvas.js`, chỉ đọc, không sửa):

| type | Nguồn trên canvas |
|---|---|
| `rect` | `insertShape("rect")`, node SmartArt |
| `ellipse` | `insertShape("ellipse")` |
| `arrow` | `insertShape("arrow")` |
| `textbox` | `insertShape("textbox")` |
| `image` | `insertImage(dataUrl)` — `src` là data URL base64 |
| `video` / `audio` | `insertMedia` — data URL |
| `table` | `insertTable` — `cells[][]` |
| `connector` | SmartArt — `sourceId`/`targetId`, `x1,y1,x2,y2` |

Đơn vị: canvas dùng px; FODP hiện có dùng cm (`svg:x="2cm"`). Đổi qua hằng số đã có `37.795275591 px/cm`.

Probe soffice (FODP → PPTX → FODP) trước khi sửa parse:

- `draw:rect` / `draw:ellipse` / text-box → `draw:custom-shape` (`ooxml-rect` / `ooxml-ellipse`)
- `draw:name` **giữ** (id gốc); `draw:id` bị LO đổi thành `id1`/`id2` nhưng `draw:start-shape`/`draw:end-shape` được cập nhật theo id mới
- ảnh giữ `<office:binary-data>` (base64 có thể xuống dòng)
- màu fill nằm trong `style:graphic-properties draw:fill-color`

---

## IMPLEMENTATION SUMMARY

### Serialize
Mỗi shape có `draw:id` (XML ID hợp lệ) + `draw:name` (id gốc canvas). Connector `draw:start-shape`/`draw:end-shape` trỏ id đã sanitize.

| type | XML ghi ra |
|---|---|
| `rect` | `<draw:rect svg:x/y/width/height draw:fill-color>` + `<text:p>` |
| `ellipse` | `<draw:ellipse>` + `<text:p>` |
| `arrow` | `<draw:custom-shape>` + `draw:enhanced-geometry draw:type="arrow"` |
| `textbox` / `text` | `<draw:frame>` + `<draw:text-box><text:p>` |
| `image` | `<draw:frame>` + `<draw:image draw:mime-type>` + `<office:binary-data>` |
| `video` / `audio` | `<draw:frame>` + `<draw:plugin draw:mime-type>` + `<office:binary-data>` |
| `table` | `<draw:frame>` + `<table:table>` / `table-row` / `table-cell` |
| `connector` | `<draw:connector draw:type="line" svg:x1/y1/x2/y2 draw:start-shape draw:end-shape>` |

Thêm `office:automatic-styles` (fill/stroke), `office:master-styles` (Standard), `presentation:class="title|outline"` trên khung layout để soffice không biến title thành custom-shape.

### Parse (khớp serializer + FODP soffice)
- Giữ `draw:id` / `draw:name` (ưu tiên name — sống sót hop PPTX)
- `draw:connector` / `draw:line`; remap `start-shape` `id1` → name `node-a`
- `draw:frame` không phải placeholder (`title|subtitle|outline|notes|...`): image / plugin / table / text-box có id
- Graphic style trả `{ fill, stroke }` thay vì chuỗi — `draw:fill="none"` → `transparent`

### Không sửa
`apps/slides/slides-canvas.js` (chỉ đọc cấu trúc). Writer / Sheet. LibreOffice Core.

---

## Shape coverage

| Loại | Mức | Ghi chú |
|---|---|---|
| `rect` (kể cả diagram node) | **Đầy đủ** | In-memory + soffice PPTX hop: type/text/màu/vị trí/id |
| `ellipse` | **Đầy đủ** | Như trên; soffice thành `ooxml-ellipse`, parse lại `ellipse` |
| `textbox` | **Đầy đủ ghi / parse in-memory** | Sau soffice PPTX thành `custom-shape` `ooxml-rect` → parse `type: "rect"`, **text/id/vị trí vẫn đúng** |
| `connector` | **Đầy đủ** | `sourceId`/`targetId` khớp 2 node sau hop (remap id) |
| `image` | **Đầy đủ** | base64 trong `office:binary-data`; parse bỏ whitespace LO chèn |
| `arrow` | **Đầy đủ in-memory** | Không đưa vào live soffice (không phải case mất dữ liệu chính) |
| `table` | **Đầy đủ in-memory** | `table:table` trong frame; chưa chứng minh hop PPTX |
| `video` / `audio` | **Rút gọn** | Ghi/đọc `draw:plugin` + binary-data trong FODP VN Office. **Không** round-trip soffice PPTX: file media lớn, filter Impress PPTX thường tách/gãy embed — không bịa là giữ được. Canvas vẫn lưu data URL khi chưa Save-qua-PPTX. |
| `animation` trên shape | **Chưa làm** | Ngoài scope mất geometry khi Lưu; notes/animation slide-level đã có từ task cũ |
| `diagramGroupId` / `diagramLevel` | **Rút gọn** | Attribute tùy biến không sống sót PPTX. Node giữ id gốc trong `draw:name` (`diagram-…-node-N`) |

---

## FILES CHANGED

- `adapters/libreoffice/slides/slides-adapter.js` — serialize shapes + parse connector/frame/id
- `tests/unit/slides-file-io.test.js` — 4 test serialize/parse (in-memory + canned soffice XML)
- `tests/live/fodp-save-shapes-real-conversion.mjs` — hop soffice thật
- `docs/HANDOFF-FODP-SAVE-SHAPES.md`

## COMMANDS RUN

```
node --check adapters/libreoffice/slides/slides-adapter.js
node tests/run-tests.js
node tests/live/fodp-save-shapes-real-conversion.mjs
node tests/live/real-office-file-import-fidelity.playwright.mjs
```

## BUILD RESULT: OK (không đổi build system)

## TEST RESULTS

| Suite | Lệnh | Kết quả |
|---|---|---|
| Master unit/smoke | `node tests/run-tests.js` | **662/662 PASS, 12.4s** (< 60s) |
| Live soffice save hop | `node tests/live/fodp-save-shapes-real-conversion.mjs` | **PASS, ~19.5s** — title + rect `Nút A` `#2563eb` + ellipse `Nút B` `#0f766e` + textbox text + connector `node-a`→`node-b` + image PNG base64 |
| Live Playwright import cũ | `node tests/live/real-office-file-import-fidelity.playwright.mjs` | **16/16 PASS, ~32s** — không hồi quy parse PPTX thật |

Live save hop (in-memory → serialize → PPTX → FODP → parse):  
`slide.title="Slide có hình khối"`  
`shapes=rect:node-a:Nút A | ellipse:node-b:Nút B | rect:tb1:Hộp văn bản | connector:conn-1: | image:img1:`

## KNOWN FAILURES / LIMITATIONS

1. **Text box sau hop PPTX đổi `type` thành `rect`.** Serializer vẫn ghi `<draw:frame><draw:text-box>`. LibreOffice PPTX không giữ phân biệt text-box vs rectangle. Nội dung/id/vị trí không mất.
2. **Video/audio không được chứng minh qua PPTX.** Chỉ FODP thuần VN Office. File lớn + filter Impress.
3. **Bảng / arrow** chỉ unit in-memory. Live hop tập trung rect/ellipse/textbox/connector/image — đúng lỗi mất dữ liệu đã ghi ở task trước.
4. **Hộp thoại Lưu native** vẫn chỉ Desktop App (pywebview). Live save test gọi serializer + soffice trực tiếp, cùng pipeline `main.py` (`draft.fodp` → pptx), không SendKeys.
5. **`diagramGroupId` không round-trip PPTX.** Connector vẫn nối đúng 2 node theo id.

## RISKS

Thấp. Parse FODP mở rộng thêm connector/frame; nhánh `presentation:class` title/outline giữ nguyên hành vi import PPTX thật (live 16/16).

## DEPENDENCIES/BLOCKERS

Không. `soffice.exe` sẵn. Không cần Office GUI, không SendKeys, không thư viện trả phí.

## CORE PATCH ID (if any): N/A

## NEXT ACTION

**KHÔNG merge vào main.** Review trên `fix/fodp-save-shapes`. Follow-up tùy chọn: hop soffice cho table/arrow; embed media PPTX nếu product yêu cầu video/audio sống sót Save-as-PPTX.
