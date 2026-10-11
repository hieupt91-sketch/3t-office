# FIX-S8 — Kết quả kiểm chứng

Worktree: `E:\VNOffice-codex-fs8` (`fix/sheet-s8-codex`)
Profile desktop: `E:\VNOffice-profiles\codex-fs8`

## 1. Trình quản lý tên — PASS

Harness S7 cũ không bấm **Thêm mới** và gửi tổ hợp Ctrl+A sai cách, làm tham chiếu thành `B2B2`. Sửa thao tác harness để bấm **Thêm mới**, nhập `SampleNames` / `B2` bằng CDP, rồi bấm **Lưu** thật. UI cập nhật danh sách và FODS chứa `table:named-range`; XLSX mở bằng Excel COM chỉ đọc cho `Names.Count=1`, `SampleNames RefersTo==Sheet1!$B$2`. Không tái hiện lỗi trong luồng UI đúng; không cần sửa mã ứng dụng.

Bằng chứng: [Ảnh Name Manager](evidence/fix-s8-name-manager.png).

Kiểm tra mục này: CDP desktop PASS; Excel COM read-only PASS. Harness cú pháp JS PASS.

## 2. Xoay chữ và lề in — PASS

Chọn B2, mở **Định dạng ô > Căn chỉnh**, chọn 90° (Lên), áp dụng và lưu qua app. Grid giữ `textRotation=90`; Excel COM đọc `Orientation=-4171` (xlUpward). Thiết lập trang qua UI thành ngang và bốn lề 1,27 cm; Excel COM đọc `Orientation=2`, lề L/R/T/B đều 0,5 inch. Không phát hiện sai lệch để sửa.

Bằng chứng: [Ảnh xoay chữ](evidence/fix-s8-text-rotation.png), [ảnh lề trang](evidence/fix-s8-page-setup.png).

Kiểm tra mục này: thao tác CDP desktop PASS; Excel COM read-only PASS.
