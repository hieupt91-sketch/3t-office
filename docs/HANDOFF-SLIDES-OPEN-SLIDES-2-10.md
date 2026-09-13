# Handoff: Slides chiều MỞ — rà soát slide 2..10 (`file test/sample-3.pptx`) so với PowerPoint 2016

- Nhánh: `fix/slides-open-slides-2-10` (agy rà soát, Claude đo lại DOM), gộp vào main 1007c97.
- Chuẩn so: ảnh PowerPoint 2016 xuất trực tiếp (`_ppt_export_all.ps1`), app chụp bằng `_capture_vnslides.py` (PrintWindow).

## Cơ chế crop ảnh (đã đúng)
PPTX → soffice FODP (mang `fo:clip` cm) → `overlay_slides_pptx_fodp` gắn `vno:src-rect="l,t,r,b"` (%) theo `draw:name`
trong đúng `draw:page` (thứ tự `sldIdLst`) → `slides-adapter.js` đọc `cropPct` → `slides-canvas.js`
`_computeImageCropStyles` (ưu tiên `cropPct`, fallback `fo:clip` + DPI ảnh).
Đo DOM slide 6, ảnh "Google Shape;93" (srcRect l=0 t=2.78 r=22.4 b=0): img 401×266 trong box 311×259, top −7px →
vùng nhìn x 0–77.6 %, y 2.6–100 % = đúng srcRect gốc. Ảnh gốc 2500×1667 (khớp media PPTX).

## Bảng 9 slide
| Slide | Nội dung | Kết quả |
|---|---|---|
| 2 | 3 ảnh + hộp chữ "Lorem ipsum" | KHỚP |
| 3 | nền hồng, 3 dải highlight vàng | KHỚP |
| 4 | "Long Beach" highlight + ảnh chòi cứu hộ | KHỚP |
| 5 | ảnh nền ván lướt sóng + hộp "Malibu sunset" | KHỚP |
| 6 | 3 ảnh (trời sao / người trên biển / cô gái sa mạc) | KHỚP (±1 %) |
| 7 | 3 cột ảnh + dải "Pacific Coast Highway" | KHỚP |
| 8 | 3 cột ảnh (sóng / giày / cầu Cổng Vàng) | KHỚP |
| 9 | 2 ảnh lớn | KHỚP |
| 10 | 3 ảnh + hộp chữ nền trắng đè ảnh | KHỚP |

## Test thêm
`tests/test_slides_pptx_image_crop_open.py`: overlay 3 trang, mỗi trang 1 ảnh srcRect khác nhau → mỗi `draw:page`
nhận đúng `vno:src-rect` của mình.
