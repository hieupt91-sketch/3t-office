# PLAN — Hoạt ảnh Slides: nhóm Nhấn mạnh và Thoát (17/10)

**Mục tiêu**: thêm hiệu ứng Nhấn mạnh (Xoay tròn, Phóng to/thu nhỏ) và Thoát (Mờ dần ra, Bay ra, Thu nhỏ ra, Biến mất) giống PowerPoint 2016; phát đúng khi trình chiếu; lưu/mở PPTX đúng nhóm.
**Hiện trạng**: chỉ có nhóm Vào (5 kiểu); ghi FODP `preset-class="entrance"`; soffice ghi PPTX nhưng PowerPoint đọc nhóm mới thành hiệu ứng tùy chỉnh (EffectType 0).
**Tệp**: `apps/slides/slide-animation-classes.js` (mới, bảng + CSS phát), `slides-canvas.js` (hộp thoại 3 nhóm, phát, hoàn tác), `slides.css` (keyframes), `adapters/libreoffice/slides/slides-adapter.js` (ghi/đọc preset-class), `adapters/libreoffice/common/ooxml_zip_patch.py` (dựng lại p:timing mẫu PowerPoint), i18n VI/EN, Help.
**Phụ thuộc**: không thêm thư viện. Mẫu XML đo từ PowerPoint 2016 thật (`ppt_anim_probe.ps1`, `ppt_anim_readback.ps1`).
**Rủi ro**: làm hỏng hiệu ứng Vào đang chạy tốt → chỉ dựng lại trang có Nhấn mạnh/Thoát, hiệu ứng chưa có mẫu thì giữ nguyên kết quả soffice. Một đối tượng chỉ một hiệu ứng.
**Kiểm thử**: unit 7 + Python 7 + CDP 15 + PowerPoint COM đọc lại + npm test đầy đủ + mở lại tệp PowerPoint thật.
**Hoàn nguyên**: bỏ lời gọi `_apply_slides_native_animation_timing` và các kiểu mới; tài liệu cũ không bị đổi định dạng.