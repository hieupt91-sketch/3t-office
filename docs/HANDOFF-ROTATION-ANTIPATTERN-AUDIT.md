# HANDOFF: Rà soát toàn diện lỗi "đọc svg:x/svg:y bỏ qua draw:transform"

## Kết luận

**KHÔNG tìm thấy bug mới.** Lỗi "đọc svg:x/svg:y bỏ qua draw:transform" đã được sửa đầy đủ trong 4 chỗ trước đó. Mọi chỗ đọc `svg:x`/`svg:y` còn lại đều an toàn — đã xác nhận qua probe soffice thật.

---

## Danh sách các chỗ đã kiểm tra

### A. 4 chỗ ĐÃ SỬA TRƯỚC ĐÓ (không đụng vào)

| # | File | Hàm | Dòng | Trạng thái |
|---|------|------|------|------------|
| 1 | `slides-adapter.js` | `_parseFrameShape()` | ~1912 | ✅ Đã dùng `_parseDrawTranslate(attrs)` |
| 2 | `slides-adapter.js` | `_parseDrawShape()` | ~1808 | ✅ Đã dùng `_parseDrawTranslate(attrs)` |
| 3 | `writer-adapter.js` | `_fodtShapeFromNode()` | ~5377 | ✅ Đã dùng `_fodtParseDrawTranslate(node.attrs)` |
| 4 | `writer-adapter.js` | `_fodtTextBoxFromFrame()` | ~5650 | ✅ Đã dùng `_fodtParseDrawTranslate(node.attrs)` |

### B. Các chỗ đọc svg:x/svg:y CHƯA SỬA — XÁC NHẬN AN TOÀN

| # | File | Vị trí | Loại đọc | Kết luận | Lý do |
|---|------|--------|----------|----------|-------|
| 5 | `writer-adapter.js` | `_fodtParseDrawTranslate()` dòng 5370-5371 | Fallback: `attrs["svg:x"]` khi KHÔNG có `draw:transform` | ✅ AN TOÀN | Đây là nhánh fallback đúng — chỉ đọc svg:x khi chắc chắn không có transform. Nếu có transform, nhánh translate() ở trên sẽ khớp. |
| 6 | `writer-adapter.js` | `_fodtShapeFromNode()` dòng 5391-5394 | `node.attrs["svg:x1/y1/x2/y2"]` cho `draw:line` | ✅ AN TOÀN | **Xác nhận qua probe**: soffice KHÔNG BAO GIỜ ghi `draw:transform` cho `draw:line`. Khi line bị xoay, soffice tính toán trực tiếp `svg:x2/y2` tuyệt đối (đã rotate sẵn). Probe: DOCX có line xoay 30° → FODT chỉ có `<draw:line svg:x2="5.828cm" svg:y2="6.572cm">`, không có draw:transform. |
| 7 | `slides-adapter.js` | `_parseConnectorShape()` dòng 1830-1837 | `get("svg:x1/y1/x2/y2")` + fallback `get("svg:x/svg:y")` | ✅ AN TOÀN | **Xác nhận qua probe**: soffice KHÔNG BAO GIỜ ghi `draw:transform` cho `draw:connector`. Khi connector bị xoay, soffice tính toán trực tiếp `svg:x1/y1/x2/y2` tuyệt đối. Probe: PPTX có connector xoay 30° → FODP chỉ có `<draw:connector svg:x1="4.724cm" svg:y1="1.066cm" svg:x2="9.163cm" svg:y2="10.044cm">`, không có draw:transform. Fallback `svg:x/svg:y` trả về `undefined` → dùng `Math.min(x1,x2)` — đúng. |
| 8 | `slides-adapter.js` | `_parseDrawTranslate()` dòng 2057-2058 | Fallback: `this._attr(attrs, "svg:x")` khi KHÔNG có `draw:transform` | ✅ AN TOÀN | Giống #5 — nhánh fallback đúng của helper đã fix. |

### C. Các chỗ GHI/SERIALIZE (không phải đọc — loại trừ)

| # | File | Dòng | Loại |
|---|------|------|------|
| 9 | `slides-adapter.js` | 1474 | Serialize `_serializeGeom()` — template string tạo XML |
| 10 | `slides-adapter.js` | 1599 | Serialize connector — template string |
| 11 | `slides-adapter.js` | 2217 | Serialize annotation — template string |
| 12 | `slides-adapter.js` | 2295-2407 | Serialize master/layout templates — template string |
| 13 | `writer-adapter.js` | 4889 | Serialize watermark — template string |
| 14 | `writer-adapter.js` | 6282, 6287 | Serialize FODT shape geometry — template string |
| 15 | `sheet-adapter.js` | 1106 | Serialize chart frame — template string |

---

## Probe soffice thật đã thực hiện

### Probe 1: `draw:line` trong Writer (DOCX xoay)
- **Input**: DOCX có `draw:line` xoay 30° (`rot="1800000"` trong OOXML)
- **Output FODT**: `<draw:line text:anchor-type="as-char" ... svg:x2="5.828cm" svg:y2="6.572cm">`
- **Kết luận**: KHÔNG có `draw:transform`. KHÔNG có `svg:x1/y1` (mặc định 0,0). `svg:x2/y2` là tọa độ tuyệt đối đã tính sẵn.

### Probe 2: `draw:connector` trong Slides (PPTX xoay)
- **Input**: PPTX có `draw:connector` xoay 30° (`rot="1800000"`)
- **Output FODP**: `<draw:connector ... svg:x1="4.724cm" svg:y1="1.066cm" svg:x2="9.163cm" svg:y2="10.044cm" svg:d="M4724 1066l4439 8978">`
- **Kết luận**: KHÔNG có `draw:transform`. KHÔNG có `svg:x/svg:y` (fallback về `Math.min(x1,x2)`). `svg:x1/y1/x2/y2` là tọa độ tuyệt đối đã tính sẵn.

### Probe 3: `draw:connector` baseline (không xoay)
- **Input**: PPTX có `draw:connector` không xoay
- **Output FODP**: `<draw:connector ... svg:x1="2.777cm" svg:y1="8.333cm" svg:x2="13.888cm" svg:y2="11.111cm">`
- **Kết luận**: Giống nhau — connector luôn dùng `svg:x1/y1/x2/y2` tuyệt đối, không phụ thuộc transform.

---

## Tại sao connector/line KHÔNG BAO GIỜ có draw:transform

**Connector** (đường nối 2 hình): Trong OOXML, connector định nghĩa bởi `cxnSp/spPr/a:xfrm/a:off + a:ext` (bounding box) + `cxnSp/nvCxnSpPr/a:stCxn/a:endCxn` (nối 2 hình). Khi convert sang ODF, soffice tính toán `svg:x1/y1/x2/y2` là tọa độ tuyệt đối của 2 đầu đường nối dựa trên vị trí thật của 2 hình được nối — KHÔNG cần `draw:transform` vì toạ độ đã là最终 kết quả.

**Line** (`draw:line`): Trong ODF, `draw:line` dùng `svg:x1/y1/x2/y2` để định nghĩa 2 đầu đường thẳng. Khi có thể xoay, soffice tính toán trực tiếp toạ độ 2 đầu đã xoay rồi ghi vào `svg:x2/y2` — KHÔNG cần `draw:transform`.

Ngược lại, **hình chữ nhật/ảnh/văn bản/bảng** (frame/rect/ellipse/custom-shape) khi bị xoay, soffice BẮT BUỘC phải dùng `draw:transform="rotate(...) translate(...)"` vì ODF không có cách nào khác thể hiện xoay trên các hình này ngoài transform.

---

## Kiểm thử bắt buộc

| Test | Kết quả |
|------|---------|
| `node scripts/check-syntax.js` | 89/89 PASS |
| `node tests/run-tests.js` | 1488/1488 PASS |
| `node tests/live/ribbon-audit-1280.playwright.mjs` | 100% PASS |

---

## File mới thêm vào

| File | Mục đích |
|------|----------|
| `tests/live/probe-rotation-draw-line-connector.mjs` | Probe soffice thật xác nhận draw:line và draw:connector không có draw:transform khi xoay |

---

## Kết luận chung

Lỗi "đọc svg:x/svg:y bỏ qua draw:transform" là lỗi_cls ™ffects **hình có thể xoay** (rect, ellipse, custom-shape, frame/ảnh, text-box, chart, table, wordart) — nơi soffice ghi vị trí qua `draw:transform="rotate(...) translate(...)"` thay vì `svg:x/svg:y`.

Nó KHÔNG ảnh hưởng đến **đường thẳng/đường nối** (draw:line, draw:connector) — nơi soffice luôn tính toán `svg:x1/y1/x2/y2` tuyệt đối, không dùng `draw:transform`.

4 fix trước đó đã bao phủ toàn bộ lớp bị ảnh hưởng. Không cần thêm fix nào.
