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
- NOT RUN: cập nhật (đang kiểm tra/có bản mới/không có/lỗi mạng); mở file hỏng/không hỗ trợ/quá lớn và tiến độ nạp; menu chuột phải văn bản/bảng/ảnh/ô/slide/hình; tooltip ba nút mỗi tab; toast; kiểm tra disabled/hover; khôi phục từ lần chạy trước thật; các hộp thoại tương ứng ở Sheet/Slides. Không có ảnh nên không kết luận đạt.
- Không sửa mã nguồn; không phát hiện lỗi nhỏ đủ điều kiện sửa trong giới hạn phiếu.

## Kiểm thử và trạng thái

- git merge main: PASS — Already up to date.
- node tests/run-tests.js: PASS — 3789/3789.
- node scripts/audit-0610/i18n_parity.mjs: PASS — VI 3148, EN 3148, missingVI=0, missingEN=0; 20 khóa giống/để trống được tool liệt kê là nghi vấn hiện hữu.
- python scripts/audit-0610/verify_checklist_evidence.py --all --no-fix: PASS — 0 dòng bị hạ ở 3 checklist (279/217/269 dòng).
- python -m pytest tests -q -k "writer or sheet or slides or print or dialog": PASS — 816 passed, 303 deselected in 576.44s.
- Không đổi command definitions/strings; không chạy generator checklist.
- Sửa UI: không có; do đó không có bài CDP pre-fix/post-fix.

## Tóm tắt

26 ảnh CDP đã chụp và xem. Lỗi còn lại: ưu tiên trung bình 2 nhóm (ngăn Trợ giúp Writer; ribbon hẹp Writer/Slides); không có lỗi mức cao/thấp đã sửa. Các hạng mục NOT RUN và giới hạn app dev được ghi riêng phía trên.
