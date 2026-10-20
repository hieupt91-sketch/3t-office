# Q35 — Rà soát giao diện phần 2 (21/10/2026)

## Phạm vi và môi trường

Đã chạy CDP lần lượt từng app; mỗi phiên có VNO_CDP_LOCALAPPDATA riêng. git merge main báo Already up to date. Ảnh PNG gốc được lưu trong docs/assets/q35-ui/ và từng ảnh bên dưới đã được mở xem.

## Giao diện đã xem

| App | Màn hình | Kích thước / giao diện | Kết luận | Ảnh |
|---|---|---|---|---|
| Writer | Tài liệu trống; ribbon, vùng soạn thảo, thanh trạng thái | 1366×768 sáng | Đạt; thanh trạng thái và vùng soạn thảo nằm trong khung | [ảnh](assets/q35-ui/writer/workspace-light-1366x768.png) |
| Writer | Tài liệu trống; ribbon, vùng soạn thảo, thanh trạng thái | 1366×768 tối | Đạt | [ảnh](assets/q35-ui/writer/workspace-dark-1366x768.png) |
| Writer | Tài liệu trống; ribbon thu hẹp | 1280×720 tối | Đạt; không phát hiện cắt khung đáng kể | [ảnh](assets/q35-ui/writer/workspace-dark-1280x720.png) |
| Writer | Tài liệu trống; ribbon thu hẹp | 1024×600 tối | Lỗi trung bình: các lệnh sát mép phải bị cắt/khó truy cập | [ảnh](assets/q35-ui/writer/workspace-dark-1024x600.png) |
| Sheet | Lưới trống, thanh công thức, tab trang tính và thanh trạng thái | 1366×768 sáng | Đạt | [ảnh](assets/q35-ui/sheet/workspace-light-1366x768.png) |
| Sheet | Lưới trống, thanh công thức, tab trang tính và thanh trạng thái | 1366×768 tối | Đạt | [ảnh](assets/q35-ui/sheet/workspace-dark-1366x768.png) |
| Sheet | Lưới trống; ribbon thu hẹp | 1280×720 tối | Đạt | [ảnh](assets/q35-ui/sheet/workspace-dark-1280x720.png) |
| Sheet | Lưới trống; ribbon thu hẹp | 1024×600 tối | Đạt; các nhóm lệnh vẫn nằm trong khung | [ảnh](assets/q35-ui/sheet/workspace-dark-1024x600.png) |
| Slides | Slide trống, khung slide và thanh trạng thái | 1366×768 sáng | Đạt | [ảnh](assets/q35-ui/slides/workspace-light-1366x768.png) |
| Slides | Slide trống, khung slide và thanh trạng thái | 1366×768 tối | Đạt | [ảnh](assets/q35-ui/slides/workspace-dark-1366x768.png) |
| Slides | Slide trống; ribbon thu hẹp | 1280×720 tối | Đạt | [ảnh](assets/q35-ui/slides/workspace-dark-1280x720.png) |
| Slides | Slide trống; ribbon thu hẹp | 1024×600 tối | Lỗi trung bình: ribbon bị ép/cắt một phần nhóm lệnh ở hai mép | [ảnh](assets/q35-ui/slides/workspace-dark-1024x600.png) |
| Writer | Tệp > Trang chủ: mẫu và danh sách gần đây rỗng | 1366×768 tối | Đạt; trạng thái chưa có tài liệu gần đây và nút tạo mới hiển thị | [ảnh](assets/q35-ui/writer/file-home-dark-1366x768.png) |
| Sheet | Tệp > Trang chủ: mẫu và danh sách gần đây rỗng | 1366×768 tối | Đạt | [ảnh](assets/q35-ui/sheet/file-home-dark-1366x768.png) |
| Slides | Tệp > Trang chủ: mẫu và danh sách gần đây rỗng | 1366×768 tối | Đạt | [ảnh](assets/q35-ui/slides/file-home-dark-1366x768.png) |
| Writer | Trợ giúp mở bằng F1, danh sách bài và nội dung bài | 1366×768 sáng | Lỗi trung bình: danh sách, bài chi tiết và khu vực cuối ngăn chồng vùng cuộn; nội dung bị cắt | [ảnh](assets/q35-ui/writer/help-f1-1366x768.png) |
| Writer | Tab Trợ giúp và ngăn tra cứu | 1366×768 sáng | Lỗi trung bình: cùng lỗi tràn/chồng nội dung của ngăn Trợ giúp | [ảnh](assets/q35-ui/writer/help-tab-1366x768.png) |
| Writer | Trợ giúp F1 ở giao diện tối | 1366×768 tối | Lỗi trung bình: thanh cuộn lồng nhau và nút cuối ngăn đè/cắt nội dung | [ảnh](assets/q35-ui/writer/help-dark-1366x768.png) |
| Writer | Trợ giúp F1 ở cửa sổ thấp | 1280×720 tối | Lỗi trung bình: phần nội dung bài và khu vực cuối ngăn tiếp tục bị cắt | [ảnh](assets/q35-ui/writer/help-dark-1280x720.png) |
| Writer | Xác nhận khi đóng tài liệu có chỉnh sửa | 1366×768 sáng | Đạt; đủ Hủy/Không lưu/Lưu; focus ban đầu trên Lưu nhìn thấy, hộp nằm trong màn hình | [ảnh](assets/q35-ui/writer/close-confirm-1366x768.png) |
| Writer | Tệp > Lưu thành (F12) | 1366×768 sáng | Bị chặn: app dev hiện “Chức năng Lưu tệp thật chỉ khả dụng trong 3T Office bản cài trên máy”; không mở được lưu tệp thật trong phiên này | [ảnh](assets/q35-ui/writer/save-as-f12-1366x768.png) |
| Writer | Hộp đặt mật khẩu | 1366×768 sáng | Đạt; hai ô và nút nằm gọn; không thấy tràn/cắt | [ảnh](assets/q35-ui/writer/password-set-dialog-1366x768.png) |
| Writer | Báo lỗi hai mật khẩu không khớp | 1366×768 sáng | Đạt; thông báo và focus viền xanh nhìn thấy | [ảnh](assets/q35-ui/writer/password-mismatch-1366x768.png) |
| Writer | Sau khi đặt mật khẩu khớp | 1366×768 sáng | Đạt; hộp đóng, trở về tài liệu | [ảnh](assets/q35-ui/writer/password-set-success-1366x768.png) |
| Writer | Khôi phục tự động (fixture CDP) | 1366×768 sáng | Đạt về bố cục; các lựa chọn Khôi phục/Bỏ/Để sau hiển thị. Đây là bản ghi thử được chèn trong phiên, không phải khôi phục sau sự cố thật | [ảnh](assets/q35-ui/writer/autorecover-dialog-1366x768.png) |
| Writer | Khôi phục tự động sau “Để sau” | 1366×768 sáng | Đạt; hộp vẫn mở để người dùng quay lại xử lý | [ảnh](assets/q35-ui/writer/autorecover-later-1366x768.png) |

## Phát hiện và phạm vi chưa kiểm tra

- Ưu tiên trung bình, còn lại: ngăn Trợ giúp Writer có nhiều vùng cuộn lồng nhau; danh sách, bài viết và các nút cuối ngăn chồng/cắt nhau ở cả sáng/tối và 1280×720. Cần chủ sở hữu UI xem xét riêng; không sửa vì đây không phải chỉnh nhỏ dưới 30 dòng.
- Ưu tiên trung bình, còn lại: ở 1024×600, ribbon Writer và Slides cắt một phần lệnh sát mép; Sheet vẫn vừa khung. Cần đánh giá bố cục responsive riêng.
- Mật khẩu: document-password.desktop.mjs chạy 9/9 bước PASS: hộp hai ô, không khớp, khớp, lưu DOCX được mã hóa vào profile Q35 riêng, mở thiếu mật khẩu, sai mật khẩu, đúng mật khẩu. Sai/thiếu/đúng mật khẩu được kiểm bằng API tài liệu; chưa có ảnh hộp nhập mật khẩu khi mở lại.
- Đã gõ bản nháp thử để mở xác nhận đóng và chụp hộp. Chưa kiểm từng lựa chọn Hủy/Không lưu/Lưu, chuỗi Tab/Esc/Enter hoặc xác nhận đóng bằng phím.
- Lưu thành thật bị giới hạn bởi thông báo app dev nêu trên; chưa gọi hộp thoại OS. Không có bằng chứng CDP của lưu thành trong bản đóng gói.
- NOT RUN: mở file hỏng/không hỗ trợ/quá lớn và tiến độ nạp; tooltip ba nút mỗi tab; toast tạm thời; trạng thái disabled/hover; khôi phục từ lần chạy trước thật; các hộp thoại tương ứng ở Sheet/Slides. Các menu Writer được dựng bằng fixture HTML; menu Sheet bằng model fixture. Không kết luận đạt cho hạng mục NOT RUN.
- Không sửa mã nguồn; không phát hiện lỗi nhỏ đủ điều kiện sửa trong giới hạn phiếu.

## Kiểm thử và trạng thái

- git merge main: PASS — Already up to date.
- node tests/run-tests.js: PASS — 3789/3789.
- node scripts/audit-0610/i18n_parity.mjs: PASS — VI 3148, EN 3148, missingVI=0, missingEN=0; 20 khóa giống/để trống được tool liệt kê là nghi vấn hiện hữu.
- python scripts/audit-0610/verify_checklist_evidence.py --all --no-fix: PASS — 0 dòng bị hạ ở 3 checklist (279/217/269 dòng).
- python -m pytest tests -q -k "writer or sheet or slides or print or dialog": PASS — 816 passed, 303 deselected in 576.44s.
- Không đổi command definitions/strings; không chạy generator checklist.
- Sửa UI: không có; do đó không có bài CDP pre-fix/post-fix.

## Bổ sung menu ngữ cảnh, cập nhật và bàn phím (CDP)

| App | Màn hình | Kích thước / giao diện | Kết luận | Ảnh |
|---|---|---|---|---|
| Writer | Menu chuột phải văn bản và thanh định dạng nổi | 1366×768 sáng | **Lỗi trung bình:** thanh định dạng nổi chồng lên phần menu; các mục vẫn đọc được nhưng vùng chọn bị che | [ảnh](assets/q35-ui/writer/context-text-1366x768.png) |
| Writer | Menu chuột phải ô bảng | 1366×768 sáng | **Lỗi trung bình:** thanh định dạng nổi che một phần đầu menu; fixture HTML trong phiên CDP | [ảnh](assets/q35-ui/writer/context-table-1366x768.png) |
| Writer | Menu chuột phải ảnh | 1366×768 sáng | **Lỗi trung bình:** thanh định dạng nổi chồng lên menu; fixture HTML trong phiên CDP | [ảnh](assets/q35-ui/writer/context-image-1366x768.png) |
| Sheet | Menu chuột phải ô | 1366×768 sáng | Đạt; menu nằm trong khung, mục cuối hiển thị | [ảnh](assets/q35-ui/sheet/context-cell-1366x768.png) |
| Sheet | Menu chuột phải hình dạng | 1366×768 sáng | Đạt; menu dài nhưng không bị cắt | [ảnh](assets/q35-ui/sheet/context-shape-1366x768.png) |
| Sheet | Menu chuột phải ảnh | 1366×768 sáng | Đạt | [ảnh](assets/q35-ui/sheet/context-image-1366x768.png) |
| Sheet | Menu chuột phải hộp văn bản | 1366×768 sáng | Đạt | [ảnh](assets/q35-ui/sheet/context-textbox-1366x768.png) |
| Slides | Menu chuột phải hình thu nhỏ trang chiếu | 1366×768 sáng | Đạt; đủ mục và nằm trong cửa sổ; phủ nhẹ vùng trạng thái bên dưới nhưng không cắt mục cuối | [ảnh](assets/q35-ui/slides/context-slide-1366x768.png) |
| Writer | Trạng thái nguồn cập nhật chưa cấu hình sau kiểm tra thật | 1366×768 sáng | Đạt về hiển thị; trạng thái và nút kiểm tra đọc được. Kết quả thật: nguồn chưa cấu hình | [ảnh](assets/q35-ui/writer/update-real-result-1366x768.png) |
| Writer | Cập nhật “đang ở phiên bản mới nhất” | 1366×768 sáng | Đạt; trạng thái fixture qua sự kiện CDP, không phải phản hồi máy chủ | [ảnh](assets/q35-ui/writer/update-none-fixture-1366x768.png) |
| Writer | Có bản cập nhật và thanh thông báo | 1366×768 sáng | Đạt; fixture CDP; thanh thông báo và ba nút không che nút ribbon | [ảnh](assets/q35-ui/writer/update-ready-fixture-1366x768.png) |
| Writer | Xác nhận đóng, Tab chuyển focus từ Lưu tới nút đóng | 1366×768 sáng | Đạt; viền focus nhìn thấy | [ảnh](assets/q35-ui/writer/close-tab-focus-1366x768.png) |
| Writer | Xác nhận đóng sau phím Esc | 1366×768 sáng | Đạt; hộp đóng, tài liệu còn mở | [ảnh](assets/q35-ui/writer/close-escape-1366x768.png) |
| Writer | Xác nhận đóng sau Enter trên Lưu mặc định | 1366×768 sáng | Hộp đóng và tài liệu vẫn mở; lưu tệp không được xác minh trong app dev | [ảnh](assets/q35-ui/writer/close-enter-1366x768.png) |

Kiểm tra cập nhật thật chỉ trả về “Nguồn cập nhật chưa được cấu hình trên máy này.” Trạng thái mới nhất và có bản cập nhật được dựng bằng sự kiện fixture để xem bố cục; không kết luận máy chủ cập nhật đã phát hành bản mới. Toast tạm thời chưa được kích hoạt; ảnh có thanh thông báo cập nhật không được tính là toast.

## Tóm tắt

40 ảnh CDP đã chụp và xem. Lỗi còn lại: ưu tiên trung bình 3 nhóm — ngăn Trợ giúp Writer; ribbon hẹp Writer/Slides; thanh định dạng nổi chồng menu ngữ cảnh Writer. Không có lỗi cao/thấp đã sửa. Các mục NOT RUN và giới hạn app dev được liệt kê phía trên.
