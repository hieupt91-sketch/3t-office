# HANDOFF — Ảnh neo tại ô đóng băng không bị cuộn trôi mất

## Phạm vi
Sửa lỗi `renderImages()` trong `apps/sheet/sheet-grid.js`: ảnh neo tại ô đóng băng (Freeze Panes) bị cuộn trôi mất khỏi màn hình.

## Nguyên nhân
`renderImages()` dùng `position: absolute` cho mọi ảnh, kể cả ảnh trong vùng đóng băng. Trong khi đó, ô lưới đóng băng dùng `position: sticky` qua `_applyFreezeVisuals()`. Kết quả: ảnh cuộn cùng nội dung bảng tính, không giữ cố định như ô đóng băng.

## Giải pháp
Thay vì `position: sticky` (không hoạt động trong `imageLayer` có `position: absolute`), dùng JavaScript scroll-based transform:

1. **`renderImages()`**: Với mỗi ảnh, kiểm tra `image.anchor` có nằm trong vùng đóng băng không. Nếu có, gắn `data-frozen="true"` và tính `top`/`left` bằng công thức tích lũy giống `_applyFreezeVisuals()` (24px offset header cột + tổng dồn `getRowHeight()`, 44px offset header hàng + tổng dồn `getColumnWidth()`).

2. **`_updateFrozenImages()`**: Phương thức mới, gọi từ `_onViewportScroll()`. Duyệt tất cả `[data-frozen="true"]`, áp `transform: translate(scrollLeft, scrollTop)` để counteract scroll.

3. **Z-index**: Ảnh đóng băng có `z-index: 10`, ảnh thường có `z-index: 7`. Cả hai thấp hơn ô đóng băng (`z-index: 18-19`), đảm bảo ô đóng băng luôn ở trên.

## Offsets đã thống nhất
- Header cột height: **24px** (trước đây `renderImages` dùng 28px — đã sửa)
- Header hàng width: **44px** (trước đây `renderImages` dùng 46px — đã sửa)
- Khớp chính xác với `_applyFreezeVisuals()`

## Files thay đổi
- `apps/sheet/sheet-grid.js`: `renderImages()` (~dòng 4424), `_updateFrozenImages()` (mới), `_onViewportScroll()` (~dòng 2795), `_setFreezePanes()` (~dòng 6508)
- `tests/live/sheet-image-freeze-scroll.playwright.mjs`: Test mới

## Test results
- `node scripts/check-syntax.js`: **89/89 PASS**
- `node tests/run-tests.js`: **1497/1497 PASS**
- `node tests/live/ribbon-audit-1280.playwright.mjs`: **100% PASS**
- `node tests/live/sheet-image-drag.playwright.mjs`: **PASS** (không thoái lui kéo-thả)
- `node tests/live/sheet-freeze-panes.playwright.mjs`: **PASS** (không thoái lui Freeze Panes)
- `node tests/live/sheet-image-freeze-scroll.playwright.mjs`: **PASS** (test mới)

## Ranh giới an toàn
- KHÔNG đụng `_applyFreezeVisuals()` (logic ô lưới đã đúng)
- KHÔNG đụng `_attachImageDrag` / `_getAnchorFromPixel` (kéo-thả ảnh đã đúng)
- KHÔNG đụng Writer/Slides
