# Q33 — Sửa lỗi giao diện ngày 20/10

## Kết quả theo hạng mục

1. **In/Xem trước khi in:** cố định hàng Hủy/In ở đáy hộp thoại; cột tùy chọn cuộn riêng và hộp thoại giới hạn theo viewport. CDP trước sửa: Writer hàng nút y=862–906 ở viewport 768; Sheet y=829–865; Slides y=1011–1047 — cả ba ngoài viewport. Sau sửa ở Writer 1366: hộp thoại y=24.9–745.0, hàng nút y=682.9–744.0; Sheet và Slides cũng có hàng nút trong hộp thoại. Tab-order đi tới nút In; Enter gửi submit; Esc đóng hộp thoại. 1280×720 tối và 1920×1080 được kiểm tra.
2. **Ngăn Writer:** trước sửa Styles và AI cùng mở, hình chữ nhật giao nhau (Styles x=1072–1358, AI x=1026–1366; overlap=true). Dùng coordinator panel chung; mở một ngăn sẽ đóng ngăn kia; Esc đóng ngăn. Dòng giới thiệu Trợ lý cũng được Việt hóa: “Privacy-first” thành “ưu tiên quyền riêng tư”. Visual review phát hiện thêm Styles pane ở giao diện tối có nền trắng, chữ sáng, tương phản 1.10:1. Sau đổi sang biến màu theme, tương phản 15.22:1; ngăn nằm trong viewport, scrollHeight=clientHeight ở 1366×768 và 1920×1080.
3. **Hộp thoại cỡ trang chiếu:** hint tối trước sửa có tương phản 2.20:1; sau dùng màu chữ phụ từ theme, đạt 11.23:1. Không hard-code màu.
4. **Nhãn tiếng Việt:** bỏ “(Portrait)” và “(Landscape)” ở lựa chọn hướng giấy; đổi “Ghi chú người thuyết trình” thành “Ghi chú thuyết trình”; placeholder ghi chú cũng dùng khóa i18n VI/EN và không còn “Presenter”. Giữ nguyên chuỗi EN cho các nhãn đã có. Không tìm thấy nhãn đúng nguyên văn “Giao diện (Theme)” trong UI/i18n nên không thêm hoặc đổi nội dung giả định.
5. **Huy hiệu mẫu Slides:** giữ nguyên. `platform/templates/template-registry.js` gán trực tiếp `badge: "Mẫu báo cáo"` cho `presentation_outline`; nguồn không cho thấy huy hiệu được suy ra từ nhóm. Mô tả hiện là “Slide 16:9 widescreen”, chưa đủ căn cứ để kết luận nhãn đúng hay nhầm.

## Giao diện đã xem

- **In:** Writer, Sheet và Slides ở 1366×768 và 1920×1080, sáng/tối; Writer thêm 1280×720 tối. Footer Hủy/In nhìn thấy, cột trái cuộn độc lập, không thấy nút bị che. Ảnh trước/sau nằm trong [assets/q33-ui/print](assets/q33-ui/print).
- **Ngăn Writer:** ảnh trước overlap và sau cho AI/Styles ở 1366×768, 1920×1080, sáng/tối. Đã xem dòng giới thiệu AI trước/sau tại hai kích thước; sau không còn cụm tiếng Anh. Ngăn không chồng nhau; sau sửa màu chữ/ng nền đọc rõ; nút đóng và danh sách kiểu vẫn trong khung. Ảnh ở [assets/q33-ui/panels](assets/q33-ui/panels).
- **Cỡ trang chiếu:** ảnh trước tối và ảnh sau ở 1366×768, 1920×1080, sáng/tối. Hộp thoại và nút Áp dụng nằm trong màn hình; hint đọc được. Ảnh ở [assets/q33-ui/slides-size](assets/q33-ui/slides-size).
- **Thiết lập trang Writer:** đã xem hộp thoại ở 1366×768 và 1920×1080, sáng/tối; các trường Dọc/Ngang thuần Việt, các nút Hủy bỏ/Áp dụng nằm trong hộp. Ảnh ở [assets/q33-ui/page-setup](assets/q33-ui/page-setup).
- **Ghi chú Slides:** đã xem panel và placeholder ở 1366×768, 1920×1080, sáng/tối. Chỉ còn một biểu tượng ghi chú; nhãn và placeholder thuần Việt; màu placeholder tối đạt 11.23:1 và panel nằm trong viewport. Ảnh ở [assets/q33-ui/notes](assets/q33-ui/notes).

## Kiểm thử

- `node tests/run-tests.js`: **PASS — 3789/3789**.
- `node scripts/audit-0610/i18n_parity.mjs`: **PASS — VI 3123, EN 3123, missingVI=0, missingEN=0**.
- `python scripts/audit-0610/verify_checklist_evidence.py --all --no-fix`: **PASS — 0 dòng bị hạ** trên cả ba checklist.
- `python -m pytest tests -q -k "print or preview or writer or sheet or slides"`: **PASS — 807 passed, 312 deselected**.
- Đã chạy ba generator checklist sau khi sửa `strings-vi.js`; chỉ checklist PowerPoint có line reference được cập nhật.

## Commit

- `2e57b1ad` footer hộp thoại In.
- `e944f44a` cơ chế panel loại trừ nhau.
- `9c1537b4` tương phản hộp thoại cỡ trang chiếu.
- `37ca1366` màu theme cho Ghi chú Slides và dùng khóa nhãn i18n.
- `82652663` nhãn hướng giấy/Ghi chú tiếng Việt và line reference checklist được sinh lại.
- `3a0f2eb9` màu theme cho Styles pane Writer.
- `589523af` dịch dòng giới thiệu bảo mật của Trợ lý.
- `ebdd5efa` i18n placeholder Ghi chú Slides.
- `e8e58bd2` dùng màu theme cho placeholder Ghi chú Slides.
- Bằng chứng ảnh và handoff Q33 được commit riêng sau các commit sửa.
