# HANDOFF: VN Slides — Serialize góc xoay hình (shape.rotation → FODP)

## Bối cảnh

VN Slides đã có đọc/hiển thị góc xoay từ file PPTX thật (`HANDOFF-SLIDES-SHAPE-ROTATION-DISPLAY.md`) và tay cầm xoay tương tác trên canvas (`HANDOFF-SLIDES-SHAPE-ROTATION-HANDLE.md`). Mảnh ghép cuối cùng là: khi người dùng xoay hình rồi bấm Lưu (Ctrl+S), giá trị `shape.rotation` phải được ghi vào file FODP qua `draw:transform="rotate(...) translate(...)"` đúng chuẩn ODF.

## Thay đổi

### 1. `adapters/libreoffice/slides/slides-adapter.js` — `_shapeGeomAttrs()` (dòng ~1464)

**TRƯỚC:** Hàm luôn ghi `svg:x/svg:y/svg:width/svg:height` cho mọi hình.

**SAU:** Khi `shape.rotation` có giá trị khác 0/undefined, hàm ghi `draw:transform="rotate (<radianOdf>) translate (<xCm> <yCm>)"` thay vì `svg:x/svg:y`. `svg:width/svg:height` vẫn được giữ nguyên (xác nhận qua soffice thật).

Công thức đảo dấu: `radianOdf = -(shape.rotation * Math.PI / 180)` — đảo chính xác phép parse có sẵn trong `_parseDrawTranslate()`.

### 2. `tests/unit/slides-shape-rotation-serialize.test.js` (MỚI)

8 test case kiểm tra trực tiếp `_shapeGeomAttrs()` qua `serializeToFodp()`:
- Shape xoay 30°: emit `draw:transform` chứa `rotate` + `translate`, KHÔNG có `svg:x/svg:y`.
- Giá trị radian chính xác cho 30° và 45°.
- Shape xoay vẫn giữ `svg:width/svg:height`.
- Shape không xoay (rotation=0/undefined): vẫn dùng `svg:x/svg:y`, KHÔNG có `draw:transform`.

### 3. `tests/live/slides-shape-rotation-serialize-real-conversion.mjs` (MỚI)

Vòng tròn khép kín qua soffice thật:
1. `serializeToFodp()` với shape có `rotation=30`.
2. soffice convert FODP → PPTX.
3. soffice convert PPTX → FODP.
4. `parseFodp()` trên FODP vòng-2: `shape.rotation` đọc lại được ~30° (30.00000000000001 — sai số chấp nhận).

### 4. `tests/run-tests.js`

Đăng ký suite 134: Unit Tests — VN Slides Serialize Góc Xoay Hình.

## Kết quả kiểm thử

| Kiểm thử | Kết quả |
|---|---|
| `node scripts/check-syntax.js` | **89/89 PASS** |
| `node tests/run-tests.js` | **1474/1474 PASS** (tăng từ 1466 → 1474, thêm 8 test mới) |
| `node tests/live/ribbon-audit-1280.playwright.mjs` | **104/104 PASS (100%)** |
| `node tests/live/slides-smartart-import-real-conversion.mjs` | **PASS** |
| `node tests/live/slides-shape-rotation-handle.playwright.mjs` | **100% PASS** |
| `node tests/live/slides-shape-rotation-serialize-real-conversion.mjs` | **PASS** — rotation ~30° sống sót qua vòng round-trip soffice thật |

## Vòng tròn khép kín qua soffice thật

Đây là kiểm chứng DUY NHẤT đáng tin cậy rằng công thức đảo dấu đúng:

```
shape.rotation = 30 (CSS/PowerPoint: xuôi kim đồng hồ)
  → radianOdf = -(30 * π/180) = -0.5235987755982988
  → FODP: draw:transform="rotate (-0.5235987755982988) translate (2.646cm 1.326cm)"
  → soffice FODP→PPTX: OOXML rot="1800000" (30°)
  → soffice PPTX→FODP: draw:transform="rotate (-0.523598...) translate (...)"
  → parseFodp(): shape.rotation = 30.00000000000001
```

## Ranh giới an toàn

- CHỈ sửa `_shapeGeomAttrs()` — KHÔNG đụng `_parseDrawTranslate()`.
- KHÔNG đụng UI/canvas/CSS.
- KHÔNG merge/push.

## Next Steps

- Commit trên nhánh `feat/slides-shape-rotation-serialize`.
- Không merge/push.
