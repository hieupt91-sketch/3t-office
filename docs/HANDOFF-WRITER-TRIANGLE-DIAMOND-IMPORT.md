# HANDOFF: VN Writer — Mở khóa đọc hình Tam giác/Hình thoi từ file DOCX thật

## 1. Bối cảnh

- **Renderer đã có**: Agy đã hoàn thành renderer SVG cho `triangle` và `diamond` trong `apps/writer/writer-illustrations.js` (SHAPE_TYPES + renderShapeSvg), đã merge vào `main` (xem `docs/HANDOFF-WRITER-TRIANGLE-DIAMOND-SHAPES.md`).
- **Vấn đề còn lại**: Khi người dùng mở file DOCX thật (Word thật) có hình tam giác hoặc hình thoi, soffice ghi chúng thành `<draw:custom-shape draw:type="ooxml-triangle">` / `"ooxml-diamond"`. Hàm `_fodtShapeFromNode()` trong `adapters/libreoffice/writer/writer-adapter.js` dùng `OOXML_SHAPE_TYPE_MAP` để ánh xạ `draw:type` sang VN Writer type — nhưng map chỉ có 3 entries (`rect`, `roundRect`, `ellipse`). Hai entries `triangle` và `diamond` chưa được thêm, nên `parseFodt()` ném lỗi, khiến file DOCX không mở được.
- **Nhiệm vụ**: Thêm 2 entries vào `OOXML_SHAPE_TYPE_MAP` để `parseFodt()` chấp nhận và ánh xạ đúng 2 loại hình này.

## 2. Thay đổi thực hiện

### 2.1. `adapters/libreoffice/writer/writer-adapter.js` (dòng ~5411)

Bổ sung 2 entries vào `OOXML_SHAPE_TYPE_MAP`:

```javascript
const OOXML_SHAPE_TYPE_MAP = {
  "ooxml-rect": "rectangle",
  "ooxml-roundrect": "round-rect",
  "ooxml-ellipse": "circle",
  "ooxml-triangle": "triangle",    // MỚI
  "ooxml-diamond": "diamond"       // MỚI
};
```

Cập nhật comment giải thích (mở rộng từ "3 kiểu" thành "5 kiểu").

Cập nhật thông báo lỗi để liệt kê đầy đủ các kiểu đã hỗ trợ.

**Lưu ý**: `type` từ soffice được `.toLowerCase()` trước khi tra bảng, nên viết hoa/thường trong map không quan trọng miễn khớp sau khi hạ chữ thường.

### 2.2. `tests/unit/writer-fodt-phase-b2.test.js`

- Thêm test mới: `"Writer FODT Phase B.2 chấp nhận \"ooxml-triangle\" -> \"triangle\" và \"ooxml-diamond\" -> \"diamond\""` — kiểm tra 2 chiều parse từ FODT fixture XML.
- Sửa test hiện có: `"vẫn từ chối hình dạng KHÔNG có renderer"` — đổi ví dụ từ `ooxml-triangle` (giờ được chấp nhận) sang `ooxml-pentagon` (thật sự chưa có renderer, xác nhận qua `SHAPE_TYPES`).

### 2.3. `tests/live/writer-fodt-common-shape-types-real-conversion.mjs`

Thêm 2 lệnh gọi `checkShape()` mới:
- `checkShape("triangle", "Hinh tam giac", "triangle")`
- `checkShape("diamond", "Hinh thoi", "diamond")`

Test này tạo file DOCX thật → convert qua soffice thật sang FODT → gọi `parseFodt()` → xác nhận `adapter.shapes[0].type` đúng kỳ vọng.

## 3. Kết quả kiểm thử

| Kiểm thử | Kết quả |
|---|---|
| `node scripts/check-syntax.js` | **89/89 PASS** (0 lỗi cú pháp) |
| `node tests/run-tests.js` | **1480/1480 PASS** (tăng 1 so với baseline 1479) |
| `node tests/live/ribbon-audit-1280.playwright.mjs` | **100% PASS** (104/104, 0px tràn) |

## 4. Ranh giới an toàn

- CHỈ sửa `writer-adapter.js` (thêm 2 entries vào map + cập nhật comment/error message).
- KHÔNG đụng `apps/writer/writer-illustrations.js` (renderer đã xong).
- KHÔNG đụng Sheet/Slides.
- Commit trên nhánh `feat/writer-triangle-diamond-import`, KHÔNG merge/push.

## 5. Thứ tự quyết định đã tuân thủ

1. Tìm implementation hiện hữu: `OOXML_SHAPE_TYPE_MAP` đã có → Reuse.
2. Không cần VN Adapter abstraction — chỉ thêm entries vào map.
3. Không cần module mới.

## 6. Việc chưa làm

- Các preset geometry OOXML khác (pentagon, star5, hexagon...) vẫn chưa mở được — cần thêm renderer mới vào `writer-illustrations.js` TRƯỚC KHI có thể chấp nhận parse.
- Vị trí hình xoay trong Writer — ghi nhận riêng.
