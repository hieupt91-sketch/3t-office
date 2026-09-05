# Agent Handoff

TASK: Slides SmartArt import fidelity (mở PPTX thật có SmartArt DrawingML)
AGENT/ROLE: Grok / implementation & verification
BRANCH: `fix/slides-smartart-import-fidelity`
WORKTREE: `E:\VNOffice-grok-slides-smartart-import`
OBJECTIVE: Xác nhận khi mở file PPTX thật có SmartArt (không do VN Office tự tạo) thì VN Slides có đọc được sơ đồ hay bị mất/hiện sai; nếu mất dữ liệu sửa được trong adapter thì sửa, nếu là giới hạn LibreOffice thì ghi rõ kèm bằng chứng đo.

**Không merge vào `main`.** Không đụng Writer/Sheet. Không sửa `apps/slides/slides-canvas.js` (chỉ đọc).

---

## Plan gate

Thay đổi import FODP trên Slides adapter + test. Không đụng Core, Writer, Sheet, canvas, build system, không gửi nội dung tài liệu ra cloud.

- **Objective:** Đo PPTX SmartArt → soffice FODP → `parseFodp()`; gắn `diagramGroupId` nếu LibreOffice còn nhóm shape.
- **Current capability trước task:** `insertDiagram` tạo node/connector chung `diagramGroupId`. `parseFodp()` đọc `draw:rect|ellipse|custom-shape|connector` nhưng **không** đọc `draw:g`, không stamp `diagramGroupId`/`diagramLevel`.
- **Files/modules:** `adapters/libreoffice/slides/slides-adapter.js`; fixture PPTX `tests/fixtures/real-office-samples/sample-slides-smartart.pptx`; unit `tests/unit/slides-smartart-import.test.js`.
- **Dependency:** `soffice.exe` (chỉ probe/live). Unit suite không gọi soffice.
- **Risk:** regex `draw:g` lấy nhầm shape thường — đã giữ shape ngoài nhóm không có `diagramGroupId`.
- **Test plan:** unit canned FODP + zip PPTX (<60s); live soffice PPTX→FODP; regression `fodp-save-shapes-real-conversion.mjs` và 2 live FODP gần nhất.
- **Rollback:** revert branch; parser cũ vẫn đọc custom-shape trong nhóm như shape rời.

---

## FINDINGS (trước khi sửa — đo bằng đường import thật)

Đường mở Slides hiện tại:

```
common.file.open
  → SlidesAdapter.open()
    → globalUnoBridge.openRealFile("slides")
      → main.py open_document_dialog()
        → soffice --convert-to fodp   (không filter tường minh)
        → trả chuỗi FODP
      → SlidesAdapter.loadFromFodp() → parseFodp()
```

Kiểm chứng code trước khi giả định:

- `grep smartart|diagram|dgm` trong `slides-adapter.js`: chỉ `diagramRole: "connector"` khi parse `draw:connector`, và dispatch `slides.diagram.insert`. **Không** parse `draw:g`, **không** đọc `ppt/diagrams/*`.
- Canvas (chỉ đọc) `insertDiagram()` tạo:

```js
{ id, type: "rect", x, y, w, h, color, text,
  diagramGroupId, diagramRole: "node", diagramLevel }
{ type: "connector", sourceId, targetId, diagramGroupId, diagramRole: "connector" }
```

Fixture độc lập VN Office:

1. Pack tay OOXML SmartArt (`src/smartart-pptx/`: `data1.xml` + `layout1.xml` + `quickStyle1.xml` + `colors1.xml` + `drawing1.xml`) vào `sample-slides-smartart.pptx`. Có `p:graphicFrame` / `dgm:relIds` / URI `drawingml/2006/diagram`. Chữ node: `Tiếp nhận hồ sơ`, `Thẩm định`, `Phê duyệt`, `Lưu trữ`, `Bàn giao`. **Không** đi qua `serializeToFodp()`.
2. `soffice --convert-to fodp` (cùng helper `main.py`).

Kết quả đo (PPTX → FODP soffice, **trước** sửa parser):

| Tầng | SmartArt native | 5 nhãn tiếng Việt | Hình học hộp | `diagramGroupId` |
| --- | --- | --- | --- | --- |
| PPTX pack tay | `ppt/diagrams/*` + `dgm:relIds` còn | còn trong `data1.xml` và `drawing1.xml` | cached `dsp:sp` × 5 | n/a (OOXML diagram, không phải model VN) |
| FODP soffice | **Không** còn `dgm:` / `ppt/diagrams`. Thành `<draw:g draw:name="QuyTrinhHoSo">` + 6 `draw:custom-shape` (`ooxml-rect`). `draw:image` = 0 (không flatten ảnh tĩnh) | còn trong `<text:p>` | tọa độ tuyệt đối trên con, không relative | tên nhóm còn trên `draw:g` |
| `parseFodp()` **trước sửa** | 6 shape `type: "rect"` (kể cả 1 hình nền trong suốt ~864×384) | 5 nhãn đọc đúng | vị trí/màu đọc được | **null** — mất khái niệm nhóm |

Kết luận trước sửa:

- File PPTX thật **có** SmartArt DrawingML. soffice **không** giữ diagram OOXML khi ra FODP; flatten thành **nhóm shape ODF** (`draw:g`), không thành metafile/ảnh.
- VN Slides **đã hiện được** hộp + chữ (regex `custom-shape` bắt con bên trong `draw:g`). Người dùng **không** mất trắng sơ đồ.
- Mất khái niệm nhóm (`diagramGroupId`), có thêm 1 rect nền trống phủ gần cả sơ đồ (LibreOffice luôn thêm background shape — đo được), id random timestamp.
- Đây **không** phải giới hạn “SmartArt quá phức tạp nên mất hết”. Adapter có thể stamp group + bỏ nền.

Đo thêm (Apache POI `SmartArt.pptx`, placeholder rỗng): cùng pattern `draw:g` + 6 `custom-shape`, không `draw:connector`, không ảnh. Chữ chỉ xuất hiện sau khi bơm `<a:t>` vào data/drawing — xác nhận filter Impress lấy text từ diagram/fallback, không bịa.

---

## IMPLEMENTATION SUMMARY

Sửa được trong phạm vi adapter, **không** viết lại layout SmartArt:

1. `parseFodp()` gọi `_extractDrawGroups()` **trước** shape rời: mỗi `<draw:g>` → `diagramGroupId` từ `draw:name`/`draw:id`.
2. Con là node (`diagramRole: "node"`, `diagramLevel: 0`) hoặc connector (`diagramRole: "connector"`). Id sinh `QuyTrinhHoSo-node-N` khi XML không có `draw:name`.
3. Bỏ hình nền: shape không chữ, diện tích > 2.5× sibling lớn nhất trong nhóm (đúng background LO).
4. Origin nhóm: chỉ cộng `svg:x/y` / `translate()` khi con có tọa độ gần 0 (FODP soffice SmartArt đo được là tọa độ tuyệt đối — không cộng kép).
5. Shape ngoài `draw:g` không bịa `diagramGroupId`.

Không sửa Core LibreOffice. Không serialize SmartArt DrawingML khi Lưu (ngoài scope — serializer hiện ghi shape thường). Không merge `main`.

---

## FILES CHANGED

- `adapters/libreoffice/slides/slides-adapter.js` — parse `draw:g` → `diagramGroupId`; bỏ nền
- `tests/fixtures/real-office-samples/src/smartart-pptx/*` — data/layout/style/colors/drawing
- `tests/fixtures/real-office-samples/sample-slides-smartart.pptx` — pack OOXML, không phải VN serialize
- `tests/scripts/pack-slides-smartart-pptx.mjs` + `generate-real-office-fixtures.mjs` + README fixture
- `tests/scripts/probe-slides-smartart-import.mjs` — đo PPTX / FODP / parse
- `tests/unit/slides-smartart-import.test.js`
- `tests/live/slides-smartart-import-real-conversion.mjs`
- `tests/run-tests.js` — suite 70
- `docs/FEATURE-PARITY-ROADMAP.md`
- `docs/HANDOFF-SLIDES-SMARTART-IMPORT-FIDELITY.md`

Không đụng `apps/slides/slides-canvas.js`, `apps/writer/**`, `apps/sheet/**`, adapter Writer/Sheet, `main.py`.

---

## COMMANDS RUN

- `node tests/scripts/pack-slides-smartart-pptx.mjs`
- `node tests/scripts/probe-slides-smartart-import.mjs` — đo FODP `draw:g`, không ảnh; parse cũ 6 rect không group
- `node --check adapters/libreoffice/slides/slides-adapter.js`
- `node tests/run-tests.js`
- `node tests/live/slides-smartart-import-real-conversion.mjs`
- `node tests/live/fodp-save-shapes-real-conversion.mjs`
- `node tests/live/fodp-save-table-arrow-real-conversion.mjs`
- `node tests/live/fodp-save-title-body-animation-real-conversion.mjs`
- `git diff --check`

## BUILD RESULT

PASS — repo không có bước build; `node --check` Slides adapter PASS.

## TEST RESULTS

| Suite | Result | Ghi chú |
| --- | --- | --- |
| `node tests/run-tests.js` | **PASS** 756/756, 0 FAIL, **53.22s** (< 60s) | Gồm suite 70 SmartArt import |
| Suite 70 SmartArt import | **PASS** 6/6 | PPTX native; canned FODP 5 node; group tương đối; loadFromFodp; open(); không bịa group |
| `node tests/live/slides-smartart-import-real-conversion.mjs` | **PASS** | PPTX→FODP: `draw:g` QuyTrinhHoSo, 5 node, không ảnh; parse sau sửa có `diagramGroupId` |
| `node tests/live/fodp-save-shapes-real-conversion.mjs` | **PASS** | regression rect/ellipse/textbox/connector/image |
| `node tests/live/fodp-save-table-arrow-real-conversion.mjs` | **PASS** | regression bảng 2×2 + arrow |
| `node tests/live/fodp-save-title-body-animation-real-conversion.mjs` | **PASS** | regression title/body/body2 animation |

Không claim PASS cho test chưa chạy. Không disable test. Không SendKeys.

## TRẢ LỜI CÂU HỎI GỐC (trung thực)

**VN Slides có đọc được SmartArt thật từ PowerPoint không?**

Có, **một phần — đủ để xem và sửa chữ như shape**, không còn là đối tượng SmartArt PowerPoint:

| Mức | Trước task | Sau task |
| --- | --- | --- |
| Mất trắng / vô hình | Không — hộp+chữ đã hiện | Không |
| Text node | Đọc được nếu soffice còn `text:p` | Giữ |
| Vị trí / màu fill | Đọc được (custom-shape `ooxml-rect`) | Giữ |
| Nhóm `diagramGroupId` | Mất | Gắn từ `draw:name` của `draw:g` |
| Hình nền trống LO | Thành shape trong suốt phủ sơ đồ | Bỏ |
| Connector / hierarchy DrawingML | Không có trên FODP list layout (đo 0 `draw:connector`) | Không bịa |
| Sửa SmartArt như PowerPoint (thêm node, đổi layout) | Không — LO đã flatten | Không; ngoài phạm vi adapter |

## KNOWN FAILURES / LIMITATIONS

1. **LibreOffice không giữ `ppt/diagrams/*` khi PPTX→FODP.** Còn nhóm shape ODF. Muốn SmartArt sống sót khi Lưu lại PPTX phải serialize DrawingML — ngoài scope, và filter Impress cũng không round-trip diagram từ ODF.
2. **Không có `draw:connector` trên layout list đo được.** Process/cycle/org chart phức tạp hơn chưa đóng fixture riêng; không claim connector SmartArt import.
3. **`diagramLevel` import = 0.** FODP flatten không còn cây phân cấp.
4. **Canvas vẫn chưa chọn/xóa cả nhóm** (giới hạn `insertDiagram` cũ, không sửa canvas).
5. **Tọa độ phụ thuộc theme/slide size soffice.** Fixture 16:9; scale drawing để node không tràn 540px — đo được bottom node ≤ 428px.
6. **Màu fill theo theme PPTX** (`#18a303` accent1 của shell `sample-slides.pptx`), không phải pallete VN `insertDiagram`.

## RISKS

Thấp. Chỉ thêm nhánh `draw:g`; shape rời không đổi. Live save-shapes cũ không dùng `draw:g`.

## DEPENDENCIES/BLOCKERS

Không. `soffice.exe` sẵn. Không Office GUI, không SendKeys, không thư viện trả phí.

## CORE PATCH ID (if any): N/A

## NEXT ACTION

**KHÔNG merge vào `main`.** Review trên `fix/slides-smartart-import-fidelity`. Follow-up tùy chọn: fixture Process có mũi tên; chọn cả nhóm trên canvas (cần Slides owner).
