# FIX-L12 — Kết quả rà soát Slides

## Mục tiêu

Đối chiếu các mục LỆCH và CHƯA ĐỐI CHIẾU trong ma trận Slides với PowerPoint; sửa lỗi thực tế trong phạm vi adapter, cập nhật ma trận và ghi rõ các giới hạn còn lại. Kế hoạch được commit trước khi đổi đường chọn tệp media.

## Kết quả chính

- **Transition Zoom:** PowerPoint COM chấp nhận `ppEffectBoxOut=3073` và `ppEffectBoxIn=3074`; các enum `ppEffectZoomIn`, `ZoomInSlightly`, `ZoomOut`, `ZoomOutSlightly`, `ZoomCenter`, `ZoomBottom` (3345–3350) đều bị từ chối. PPTX Slides ghi `<p:zoom dir="out"/>`, PowerPoint đọc lại thành `EntryEffect=3073` (BoxOut). Giữ nguyên trạng thái **LỆCH ĐÃ BIẾT** vì chưa có enum riêng cho nhãn Zoom của giao diện. Bằng chứng: [COM enum](evidence/fix-l12/transition-enum-com.json), [COM readback](evidence/fix-l12/office-compare-com-readback.json).
- **Sơ đồ:** CDP xác nhận chọn một nút sẽ chọn cả 7 thành viên và kéo di chuyển đồng bộ. PowerPoint COM xác nhận một group shape (`Type=6`, 7 GroupItems); PPTX không có `ppt/diagrams/data*.xml`. Hướng dẫn nói rõ sơ đồ lưu thành nhóm hình ODF, chưa có mô hình sơ đồ chuyên biệt. Đây không phải SmartArt gốc.
- **Theme, layout, WordArt, symbol:** CDP xác nhận layout Hai nội dung, theme `minimal-dark`, WordArt chỉnh sửa được và ký hiệu `™`. PowerPoint đọc layout 3, tên theme/màu/phông; shape chữ nghệ thuật là `Type=17` nhưng `PresetTextEffect=-2`, nên WordArt vẫn **LỆCH ĐÃ BIẾT**.
- **Header/footer:** COM xác nhận số trang, ngày và chân trang hiện đúng trên slide 3, các slide khác giữ trạng thái ẩn. Layout L9 và nhóm native L3 cũng đã được đọc lại bằng COM.
- **Video/audio:** Sửa adapter để gắn input tệp vào DOM, mở chooser qua CDP và dọn input sau khi chọn/hủy/lỗi. CDP lưu được cả video và audio; COM đọc cả hai là media shape (`Type=16`, loại 3 và 2). Ảnh chooser thành công nằm tại [video](evidence/fix-l10/insert/media-video.png) và [audio](evidence/fix-l10/insert/media-audio.png).
- **Ma trận:** generator tái tạo đủ 88 dòng: **57 KHỚP POWERPOINT, 20 CHƯA ĐỐI CHIẾU, 9 KHÁC CÓ CHỦ Ý, 2 LỆCH ĐÃ BIẾT**. Không đổi trạng thái chưa có đủ phép đo thành PASS.

## Kiểm tra

- `npm test`: **PASS**, 3108/3108.
- `LOCALAPPDATA=E:\\VNOffice-profiles\\codex-fl12-python python -m unittest discover -s tests`: **PASS**, 902 test; thời gian 588.664 giây. Các kiểm tra end-to-end updater đều hoàn tất.
- Desktop CDP với `VNO_APP_ROOT=E:\\VNOffice-codex-fl12`, `VNO_CDP_LOCALAPPDATA=E:\\VNOffice-profiles\\codex-fl12` và Node 20 `--experimental-websocket`: roundtrip **PASS 8/8**; FIX-L2 **PASS 20/20**; FIX-L3 **PASS** (13 thao tác); FIX-L10 media **PASS**; FIX-L12 office compare **PASS 10/10**.
- PowerPoint COM đọc lại PPTX, transition enum và các đối tượng native; bằng chứng nằm dưới [evidence/fix-l12](evidence/fix-l12/).
- Matrix generator và `py_compile`: **PASS**. `git diff --check` từ commit plan: **PASS**.
- Build riêng: **NOT RUN**; ticket yêu cầu kiểm thử npm/Python và các batch desktop, không yêu cầu build.

## Chưa hoàn tất

20 mục còn CHƯA ĐỐI CHIẾU: giãn dòng khác mức mặc định; trạng thái chạy trình chiếu/Presenter/hẹn giờ; kiểm tra chính tả; điều hướng/resolve nhận xét; và các chế độ xem, thước, lưới, đường hướng dẫn, zoom/vừa cửa sổ. Các phép CDP hiện có chứng minh trạng thái trong VN Slides, nhưng chưa có phép đo PowerPoint tương ứng đủ tin cậy. Lượt thử COM cần cửa sổ tương tác trả `WindowCount=0` và các thuộc tính ActiveWindow/ViewType/Zoom rỗng trong môi trường PowerPoint hiện tại (cửa sổ báo Product Activation Failed), nên không dùng kết quả đó để suy ra parity.

Để hoàn tất các dòng này cần phiên PowerPoint desktop có cửa sổ hoạt động, sau đó đo trực tiếp các trạng thái tạm thời bằng COM và thoát slideshow trong `finally`. Các nút tiện ích đã có bằng chứng và được ghi KHÁC CÓ CHỦ Ý; không gán nhãn đó cho 20 mục còn thiếu phép so sánh.

## Tệp và rủi ro

- Adapter media: `adapters/libreoffice/slides/slides-adapter.js`; CDP harness/evidence media: `tests/live/cdp/slides-fix-l10-media.desktop.mjs`, `docs/tickets-0710/evidence/fix-l10/insert/`.
- Đối chiếu FIX-L12: `tests/live/cdp/slides-fix-l12-office-compare.desktop.mjs`, `scripts/audit-0610/office_parallel/slides/fix-l12-*.ps1`, `docs/tickets-0710/evidence/fix-l12/`.
- Ma trận và Help tiếng Việt: `scripts/audit-0610/gen_slides_button_matrix.py`, `docs/SLIDES-BUTTON-MATRIX-1011.md`, `platform/help/entries-slides.js`.

Không thay file mẫu hay semantics lưu trữ. Không sửa LibreOffice Core. Rủi ro còn lại là 20 hàng chưa có phép so sánh COM; Zoom và WordArt được giữ là hai khoảng cách đã biết.
