# Đối chiếu Đổ bóng chữ (VN Slides) với PowerPoint 2016 — 17/10/2026

Kịch bản: đoạn "Xin chao the gioi", bôi chữ "the" rồi bấm nút Đổ bóng chữ (tab Trang đầu, nhóm Phông chữ). Kiểm giao diện qua CDP bằng lệnh thật (`tests/live/cdp/slides-text-shadow.desktop.mjs` 7/7 PASS), lưu thành PPTX, mở bằng PowerPoint 2016 qua COM chỉ-đọc (`scripts/audit-0610/ppt_font_readback.ps1`, đọc `TextFrame2…Font.Shadow`).

| Hạng mục | Kết quả |
|---|---|
| Bật bóng cho chữ đã chọn | Chỉ chữ được chọn được bọc `text-shadow`, phần còn lại của dòng không đổi. |
| Bấm lại để bỏ bóng; trạng thái nút | Bóng được gỡ; nút sáng khi con trỏ nằm trong chữ đang có bóng. |
| Ghi FODP | `fo:text-shadow="1pt 1pt"` trên đúng đoạn chữ. |
| Xuất PPTX | LibreOffice bỏ bóng chữ (ghi `<a:effectLst></a:effectLst>` rỗng); VN Office khôi phục bằng `_apply_slides_text_shadow` (`outerShdw` giống nút Đổ bóng của PowerPoint). |
| PowerPoint 2016 đọc tệp đã lưu | Đoạn "the": `Font.Shadow.Visible = -1`, mờ 3 pt; hai đoạn còn lại: 0. |
| Test đơn vị | `tests/test_slides_text_shadow_pptx.py` 7/7 PASS (chạy trong `npm test`); 99 bài Slides và 96 bài PPTX hiện có vẫn PASS. |

Hạn chế đã biết: bóng khôi phục khi xuất PPTX dựa vào việc đoạn chữ trong FODP và PPTX trùng nhau từng ký tự; đoạn có trường tự động hoặc chữ bị LibreOffice đổi dạng sẽ không được khôi phục bóng (chữ vẫn giữ nguyên). Bóng ở dạng mặc định (độ lệch 3 pt, mờ 3 pt, đen 43%), chưa có tùy chọn tinh chỉnh.