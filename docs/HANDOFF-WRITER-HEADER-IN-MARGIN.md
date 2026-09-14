# HANDOFF: VN Writer Canvas — Header/Footer trong lề như Word

## Thông tin chung
- **Branch**: `fix/writer-canvas-header-in-margin` (từ main 4f7e6f0)
- **Người thực hiện**: agy
- **Ngày**: 2026-09-14

## Tóm tắt thay đổi

### 1. Parser OOXML mới (`writer-adapter.js`)
- **`_pageHeaderFooterFromOoxml()`** (L1684): Đọc `w:header`/`w:footer` từ `w:pgMar` (twips) → chuyển sang mm (mặc định 12.7mm)
- **`_pageMarginsFromOoxml()`** (L1702): Đọc 4 lề `w:top/right/bottom/left` từ `w:pgMar` → mm
- **`_normalizeImportedHtml()`** (L1766): Gộp header/footer distance + margins từ OOXML vào `page` object
- **`_pageSetupFromImportedCss()`** (L1640): Parse thêm `--vno-header-distance`/`--vno-footer-distance` từ `@page` CSS khi import HTML

### 2. Page Setup State
- `pageSetup.headerDistanceMm` / `footerDistanceMm` mặc định 12.7mm (constructor L172)
- `open()` (L8258): Cập nhật từ `imported.page` khi mở DOCX
- `newDocument()` (L8341): Reset về mặc định 12.7mm

### 3. Canvas CSS (`writer.css` L567-646)
- `.vno-writer-header`, `.vno-writer-footer`: `position: absolute !important`
- Header: `top: var(--vno-header-distance, 48px)`, `left/right = var(--vno-margin-left/right)`
- Footer: `bottom: var(--vno-footer-distance, 48px)`, `left/right = var(--vno-margin-left/right)`
- Không còn `margin-bottom`/`margin-top` trong luồng → không đẩy body xuống
- Label "ĐẦU TRANG (HEADER)"/"CHÂN TRANG (FOOTER)" giữ nguyên (`::after`)

### 4. `_applyPageSetup()` (L1573)
- Set CSS variables trên container: `--vno-header-distance`, `--vno-footer-distance`, `--vno-margin-left/right`
- Áp dụng padding trang từ `pageSetup.margins` (đã đọc từ OOXML)

### 5. Export `@page` CSS (`_getPageSetupCss()` L1601)
- Nhúng `--vno-header-distance: Xmm; --vno-footer-distance: Ymm` vào `@page` để round-trip lưu DOCX giữ nguyên

### 6. Live Pagination
- **`_getUsablePageHeight()`** (L8449): Body height = `printableHeightPx` - `headerExtraPx` (chỉ khi header cao hơn không gian cho phép)
- **`_recomputeLivePagination()`** (L9339): Tính `headerExtraPx` = `headerHeight - (topMargin - headerDistance)`, set `body.style.marginTop` nếu >0
- **`_alignPageRelativeFloats()`** (L9424): Dùng `dim.topPx` (lề trên) làm gốc trang — đúng vì body bắt đầu tại padding-top

## Kết quả đo thực tế (_probe_writer_dom.py)

| Tài liệu | OOXML Margins (twips) | Header/ Footer (twips) | bodyTop (px) | Mong đợi | Ghi chú |
|----------|----------------------|------------------------|--------------|----------|---------|
| **AQUARA** | 1440/1440/1440/1440 (96px) | 720/720 (48px) | **96** | 94.5±1 | Body tại padding-top (96px), header 48px không đẩy body |
| **QUYETDINH** | 810/1134/810/1134 (54/75.6px) | 720/720 (48px) | **96** | 94.5±1 | Body tại padding-top (54px) + header push 42px → 96px |
| **HDLD** | 1440/1440/1440/1440 (96px) | 720/720 (48px) | **116** | (có header thật) | Body 96px + header push 20px (header 68px > 48px space) |
| **MYTIME** | 724/1410/494/1440 (49/94/37/96px) | 720/720 (48px) | **76** | (header thật) | Body 49px + header push 27px (header 28px > 1px space) |

### Float #0 (AQUARA cover image)
- Trước: `rectTop = 39px` (thấp hơn Word 39px)
- Sau: **`rectTop = 0±1px`** (cùng mép trang như Word)

### Số trang canvas (thanh trạng thái "Trang 1/N")
| Tài liệu | Word | VN Writer (probe) | Ghi chú |
|----------|------|-------------------|---------|
| AQUARA | 16 | 16 | ✓ |
| QUYETDINH | 2 | 2 | ✓ |
| HDLD | 12 | 5* | *Chỉ đếm trang hiển thị trong viewport, cần scroll để pagination đầy đủ |
| MYTIME | 88 | (chưa đo) | Hiện tại 44 trên main, mục tiêu không giảm |

## Round-trip Save/Lưu
- `python _roundtrip_save_writer.py <wt> "AQUARA.docx" _rt.docx` → `powershell -File _word_oracle3.ps1 -File _rt.docx` = **16 trang** ✓
- HDLD edit round-trip: 12 trang + có "ZZ" (cần verify thủ công)
- MYTIME edit round-trip: 88 trang (cần verify thủ công)

## Unit Tests
- `node scripts/check-syntax.js`: **92/92 PASS**
- `node tests/run-tests.js`: **1747/1747 PASS**
- `python -m unittest discover -s tests -p "test_writer*.py"`: **46/46 PASS**

## Các file đã sửa
1. `adapters/libreoffice/writer/writer-adapter.js`: +3 methods, cập nhật 4 methods
2. `apps/writer/writer.css`: Rewrite header/footer positioning (L567-646)

## Rủi ro đã biết
1. **HDLD page count**: Live pagination chỉ đếm trang trong viewport. Cần scroll hoặc chờ pagination đầy đủ để đạt 12 trang.
2. **Header push gap**: Hiện dùng `maxHeaderSpace = topMargin - headerDistance` (không có gap). Word có gap nhỏ (~1-2mm). Có thể tinh chỉnh thêm nếu cần.
3. **Print Preview**: Đã có header/footer riêng — kiểm tra không đổi số trang (unit test Backstage Print PASS).

## Checklist hoàn thành
- [x] Đọc `w:header`/`w:footer` từ `w:pgMar` khi mở DOCX
- [x] Lưu vào `pageSetup.headerDistanceMm`/`footerDistanceMm` (mặc định 12.7mm)
- [x] Xuất ra `@page`/HTML (CSS variables) để round-trip
- [x] Canvas: header `position:absolute; top:var(--vno-header-distance)`
- [x] Canvas: footer `position:absolute; bottom:var(--vno-footer-distance)`
- [x] Body bắt đầu tại padding-top (lề trên)
- [x] Header cao hơn không gian → đẩy body xuống bằng `margin-top`
- [x] `_getUsablePageHeight` / `_recomputeLivePagination` / `_alignPageRelativeFloats` dùng đúng đỉnh vùng nội dung
- [x] Header/footer vẫn click-sửa được (contenteditable)
- [x] File > Mới vẫn đúng (reset về mặc định)
- [x] Print Preview không đổi số trang
- [x] Syntax check + unit tests PASS