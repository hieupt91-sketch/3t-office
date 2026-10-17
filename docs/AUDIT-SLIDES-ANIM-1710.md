# AUDIT — Hoạt ảnh Slides: nhóm Nhấn mạnh và Thoát (17/10)

Chuẩn: PowerPoint 2016 (COM `TimeLine.MainSequence.AddEffect`, `Effect.EffectType`, `Effect.Exit`, `Timing.Duration`, `Timing.TriggerType`). Script đo: `scripts/audit-0610/ppt_anim_probe.ps1`, đọc lại: `scripts/audit-0610/ppt_anim_readback.ps1`.

## Bảng hiệu ứng

| Nhóm | Hiệu ứng VN | PowerPoint (EffectType, Exit) | VN → PPTX (đã đọc lại bằng PowerPoint thật) | Kết luận |
|---|---|---|---|---|
| Vào | Mờ dần | 10, 0 | 10, 0 | ✅ giữ nguyên từ trước |
| Vào | Bay vào | 2, 0 | 2, 0 | ✅ giữ nguyên |
| Vào | Thu phóng vào | 23, 0 | 23, 0 | ✅ đọc lại đúng |
| Nhấn mạnh | Xoay tròn | 61, 0 | 61, 0 | ✅ |
| Nhấn mạnh | Phóng to / thu nhỏ | 59, 0 | 59, 0 | ✅ |
| Nhấn mạnh | Nhịp đập (Pulse) | không tìm thấy EffectType trong 86–112 (PowerPoint trả hiệu ứng đường chuyển động) | chưa làm | ❌ để sau |
| Thoát | Mờ dần ra | 10, −1 | 10, −1 | ✅ |
| Thoát | Bay ra | 2, −1 | 2, −1 | ✅ |
| Thoát | Thu nhỏ ra | 23, −1 | 23, −1 | ✅ |
| Thoát | Biến mất | 1, −1 | 1, −1 | ✅ |

## Cách làm

- Mô hình: nhóm suy ra từ `animation.type` (`apps/slides/slide-animation-classes.js`), tài liệu cũ không có trường mới nên mở/lưu như trước.
- Trình chiếu: Vào ẩn sẵn rồi hiện; Nhấn mạnh hiện sẵn và trở về nguyên trạng; Thoát hiện sẵn rồi ẩn (CSS keyframes trong `apps/slides/slides.css`).
- Lưu: FODP ghi `presentation:preset-class="entrance|emphasis|exit"`; sau khi soffice xuất PPTX, `_apply_slides_native_animation_timing` (`adapters/libreoffice/common/ooxml_zip_patch.py`) dựng lại `p:timing` đúng cấu trúc PowerPoint (mẫu đo từ PowerPoint 2016) cho trang có hiệu ứng Nhấn mạnh/Thoát. Trang chỉ có hiệu ứng Vào giữ đường cũ. Hiệu ứng nào chưa có mẫu thì để nguyên kết quả soffice.
- Mở lại: tệp PPTX do PowerPoint tạo (đủ 8 hiệu ứng trên) đọc đúng nhóm và kiểu vào VN.

## Kiểm chứng đã chạy

- `npm test`: 3612/3612 PASS (gồm `tests/unit/slide-animation-classes.test.js` 7 bài, `tests/test_slides_native_animation_timing.py` 7 bài).
- CDP desktop `tests/live/cdp/slides-animation-classes.desktop.mjs`: 15/15 PASS (chuột thật mở hộp thoại, 3 nhóm, xem thử, áp dụng, hoàn tác/làm lại, lưu PPTX).
- PowerPoint 2016 COM đọc PPTX lưu từ app: a1 fade vào (10,0), a2 xoay (61,0), a3 mờ ra (10,−1), a4 biến mất (1,−1).

## Giới hạn đã biết

- Mỗi đối tượng chỉ có một hiệu ứng (PowerPoint cho nhiều); muốn Vào rồi Thoát thì dùng hai đối tượng chồng nhau.
- Chưa có Tùy chọn hiệu ứng (hướng) và nút Xem trước trên ribbon (Xem thử nằm trong hộp thoại).
- Nhịp đập (Pulse) chưa làm.