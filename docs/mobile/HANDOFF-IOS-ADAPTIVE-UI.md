# Handoff: iOS/iPadOS adaptive UI

## Kết quả

- iPhone dùng chrome compact: ribbon body đóng mặc định, thanh tab cuộn ngang, dock 5 tác vụ ở đáy và vùng tài liệu chiếm phần lớn màn hình.
- iPad giữ ribbon cảm ứng đầy đủ và có nút thu gọn sidebar nổi; bố cục phản ứng theo size class để dùng được khi đa nhiệm.
- Safe Area do UIKit quản lý ở cạnh trên; CSS quản lý cạnh bên/home indicator, tránh Dynamic Island và status bar.
- Khi bàn phím ảo xuất hiện, native bridge truyền phần che phủ và ẩn dock để không che vùng nhập liệu.
- Đích chạm tối thiểu 44 pt, có focus-visible cho bàn phím ngoài và hỗ trợ Reduce Motion.
- Writer mobile ẩn cả thước ngang/lọc dọc; Sheet tăng thanh công thức lên kích thước cảm ứng; Slides chuyển navigator thành drawer và ẩn sidebar phụ trên màn hình hẹp.

## Phạm vi

Chỉ thay `ports/ios/**`, `tests/test_ios_offline_shell.py` và tài liệu mobile/handoff. Không sửa `apps/**` hay `platform/**`, không thêm dependency và không dùng server.

## Bằng chứng

- Focused unittest: 7/7 PASS.
- JavaScript syntax (`node --check`): PASS.
- Xcode Debug iphonesimulator: PASS.
- Cài/chạy native iPhone 17 Pro portrait: PASS, ảnh `build/ios-mobile-ui/screenshots/iphone-portrait-final.png`.
- Cài/chạy native iPad Air 11-inch M3: PASS, ảnh `build/ios-mobile-ui/screenshots/ipad-regular-final.png`.
- Landscape: NOT RUN — `simctl io` của Xcode hiện tại không hỗ trợ đổi orientation; CSS có test tĩnh nhưng cần thao tác Simulator/thiết bị thật ở vòng sau.
- Split View iPad: NOT RUN — chưa có automation ổn định để thay kích thước scene.

## Rủi ro và dependency

- Adapter mobile đang chuyển tiếp command bằng selector DOM hiện hữu. Shared Platform nên cung cấp mobile command API ổn định để tránh phụ thuộc selector.
- Chưa test thiết bị thật, Dynamic Type cỡ rất lớn, Pencil, Stage Manager và bàn phím vật lý.
- Prototype hiện chưa có document picker và OOXML round-trip; không được coi là bản chỉnh sửa tài liệu production.

## QA vòng 2

- Thêm bộ chọn app chỉ dành cho Simulator (`VNO_IOS_TEST_APP`) để chạy riêng Writer, Sheet và Slides mà không đổi luồng Release.
- Đã xác nhận native: Writer, Sheet, Slides đều render trên iPhone 17 Pro và iPad Air 11-inch M3.
- Sửa AI button iPad bị xuống ba dòng thành nút icon 48 pt.
- Sửa Slides iPhone: filmstrip từng chiếm gần 75% chiều ngang; nay là drawer đóng mặc định, nút `Trang` ở dock có nhãn accessibility cụ thể để mở/đóng.
- Bàn phím ảo đã quan sát trực quan trên iPad: nội dung dịch đúng, không bị dock mobile che. Trên iPhone, kiểm tra mở bàn phím bằng automation bị BLOCKED do Computer Use không ánh xạ được tọa độ cửa sổ Simulator sau khi đổi device; bridge inset và trạng thái ẩn dock vẫn được kiểm tra tĩnh.
- Focused unittest sau vòng sửa: 8/8 PASS. Xcode Debug Simulator build: PASS.
- Ảnh chính: `build/ios-mobile-ui-qa2/screenshots/iphone-writer.png`, `iphone-sheet-v2.png`, `iphone-slides-drawer-closed.png`, `ipad-writer.png`, `ipad-sheet-final.png`, `ipad-slides-v2.png`.
