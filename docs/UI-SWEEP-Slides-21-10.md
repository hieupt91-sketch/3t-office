# Q39 — Quét hộp thoại, menu và panel VN Slides (21/10/2026)

## Phạm vi và cách kiểm tra

Đã đối chiếu `apps/slides/slides-ribbon.js`, `platform/ribbon/ribbon-host.js`, `platform/commands/command-definitions.js`, `docs/RIBBON-BACKLOG.md` và ba báo cáo `UI-REVIEW-20-10.md` đến `UI-REVIEW-22-10.md`. Sáu tab ngữ cảnh (Thiết kế biểu đồ, Phát lại, Thiết kế bảng, Bố cục bảng, Định dạng hình, Định dạng ảnh) chỉ hiện khi có đối tượng tương ứng; tài liệu trống của phiên không thể mở chúng. Các tab ribbon đã được xem trong các lượt trước nên không lặp lại.

Ứng dụng được mở qua `scripts/audit-0610/app_session_server.mjs slides` và thao tác bằng CDP mouse. Mỗi lượt dùng `VNO_CDP_LOCALAPPDATA` riêng. Đã chụp và xem 77 ảnh: 1366×768 sáng/tối; 1280×720 cho gallery Hình dài, hộp Bố cục và Thiết lập trình chiếu. Không có code giao diện được sửa trong Q39.

## Giao diện đã xem

Danh sách từng menu, gallery, hộp thoại và panel được liệt kê trong các bảng dưới đây; mỗi dòng có kết luận và liên kết ảnh đã mở để xem ở giao diện sáng/tối. Các màn hình đã xem gồm 22 control dropdown/gallery/launcher trên ribbon, 8 hộp/panel từ lệnh ribbon, 5 trang/menu Tệp cùng 1 thao tác Morph của backlog. Những mục chưa mở được hoặc đã có ảnh ở báo cáo trước được đánh dấu rõ, không tính là đạt.

## Danh mục control trên ribbon

Bảng dưới liệt kê các control dạng dropdown/gallery/dialog launcher nhìn thấy trên các tab ribbon đang bật, theo cấu hình Slides. Mỗi mục đã được mở bằng CDP, chụp và xem ở hai giao diện. Ảnh tối được lấy theo cùng index control tương ứng của tab.

| Tab | Lệnh/control | Loại UI | Kết luận | Ảnh sáng | Ảnh tối |
|---|---|---|---|---|---|
| Trang đầu | Phần (`slides.section.menu`) | Menu thả xuống | Đạt; các lệnh chưa dùng được hiển thị mờ, menu nằm trong cửa sổ | [ảnh](assets/q39-ui/q39-home-0-light-1366x768.png) | [ảnh](assets/q39-ui/q39-home-0-dark-1366x768.png) |
| Trang đầu | Khoảng cách ký tự (`slides.font.spacing`) | Menu thả xuống | Đạt; đủ 5 mức | [ảnh](assets/q39-ui/q39-home-1-light-1366x768.png) | [ảnh](assets/q39-ui/q39-home-1-dark-1366x768.png) |
| Trang đầu | Đổi chữ hoa/thường (`slides.text.changeCase`) | Menu thả xuống | Đạt; đủ 5 kiểu, nằm trong cửa sổ | [ảnh](assets/q39-ui/q39-home-2-light-1366x768.png) | [ảnh](assets/q39-ui/q39-home-2-dark-1366x768.png) |
| Trang đầu | Phông chữ… (`slides.font.dialog`, nút mở rộng nhóm) | Hộp thoại | **Lỗi trung bình:** nhãn và ô điều khiển chen/chồng, các thẻ đầu hộp trông như nút HTML mặc định; chữ xem trước khó đọc ở giao diện tối. Vượt phạm vi sửa nhỏ; chuyển chủ sở hữu Slides. | [ảnh](assets/q39-ui/q39-home-3-light-1366x768.png) | [ảnh](assets/q39-ui/q39-home-3-dark-1366x768.png) |
| Trang đầu | Căn lề văn bản (`slides.text.vAlign`) | Menu thả xuống | Đạt; đủ ba lựa chọn | [ảnh](assets/q39-ui/q39-home-4-light-1366x768.png) | [ảnh](assets/q39-ui/q39-home-4-dark-1366x768.png) |
| Trang đầu | Cột (`slides.text.columns`) | Menu thả xuống | Đạt; đủ một, hai, ba cột | [ảnh](assets/q39-ui/q39-home-5-light-1366x768.png) | [ảnh](assets/q39-ui/q39-home-5-dark-1366x768.png) |
| Trang đầu | Hướng văn bản (`slides.text.direction`) | Menu thả xuống | Đạt; đủ bốn hướng | [ảnh](assets/q39-ui/q39-home-6-light-1366x768.png) | [ảnh](assets/q39-ui/q39-home-6-dark-1366x768.png) |
| Trang đầu | Hình (`slides.shape.gallery`) | Thư viện hình | **Lỗi trung bình:** ở 1280×720, gallery cao 550 px và đè lên thanh trạng thái; hàng cuối nằm sát/che vùng thanh trạng thái. Tọa độ các mục còn trong viewport, nhưng gallery không chừa vùng thanh trạng thái. Cần sửa ở platform ribbon; không sửa trong Q39. | [1366](assets/q39-ui/q39-home-7-light-1366x768.png) · [1280](assets/q39-ui/q39-shapes-light-1280x720.png) | [1366](assets/q39-ui/q39-home-7-dark-1366x768.png) · [1280](assets/q39-ui/q39-shapes-dark-1280x720.png) |
| Trang đầu | Sắp xếp (`slides.drawing.arrange`) | Menu thả xuống | Đạt; đủ nhóm sắp xếp/căn chỉnh, menu không cắt | [ảnh](assets/q39-ui/q39-home-8-light-1366x768.png) | [ảnh](assets/q39-ui/q39-home-8-dark-1366x768.png) |
| Trang đầu | Chọn (`slides.edit.select`) | Menu thả xuống | Đạt; mục Ngăn chọn mở được panel riêng bên dưới | [ảnh](assets/q39-ui/q39-home-9-light-1366x768.png) | [ảnh](assets/q39-ui/q39-home-9-dark-1366x768.png) |
| Chèn | Hình (`slides.shape.galleryInsert`) | Thư viện hình | Đạt ở 1366×768; cùng gallery dài như tab Trang đầu, xem vấn đề vùng thanh trạng thái ở dòng Hình phía trên | [ảnh](assets/q39-ui/q39-insert-0-light-1366x768.png) | [ảnh](assets/q39-ui/q39-insert-0-dark-1366x768.png) |
| Thiết kế | Màu chủ đề (`slides.design.themeColors`) | Menu màu | Đạt; đủ 7 bảng màu | [ảnh](assets/q39-ui/q39-design-0-light-1366x768.png) | [ảnh](assets/q39-ui/q39-design-0-dark-1366x768.png) |
| Thiết kế | Phông chủ đề (`slides.design.themeFonts`) | Menu phông | Đạt; đủ 6 lựa chọn | [ảnh](assets/q39-ui/q39-design-1-light-1366x768.png) | [ảnh](assets/q39-ui/q39-design-1-dark-1366x768.png) |
| Chuyển tiếp | Hiệu ứng (`slides.transition.gallery`) | Gallery hiệu ứng | Đạt bố cục; Morph không báo tính năng đang phát triển, xem mục Backlog bên dưới | [ảnh](assets/q39-ui/q39-transitions-0-light-1366x768.png) | [ảnh](assets/q39-ui/q39-transitions-0-dark-1366x768.png) |
| Chuyển tiếp | Thời lượng (`slides.transition.duration`) | Menu thả xuống | Đạt; đủ 5 mức | [ảnh](assets/q39-ui/q39-transitions-1-light-1366x768.png) | [ảnh](assets/q39-ui/q39-transitions-1-dark-1366x768.png) |
| Chuyển tiếp | Chuyển trang | Menu thả xuống | Đạt; bật/tắt nhấp chuột hiển thị rõ | [ảnh](assets/q39-ui/q39-transitions-2-light-1366x768.png) | [ảnh](assets/q39-ui/q39-transitions-2-dark-1366x768.png) |
| Chuyển tiếp | Tự động sau | Menu thả xuống | Đạt; đủ các mốc và lựa chọn không tự chuyển | [ảnh](assets/q39-ui/q39-transitions-3-light-1366x768.png) | [ảnh](assets/q39-ui/q39-transitions-3-dark-1366x768.png) |
| Hoạt hình | Hiệu ứng (`slides.animation.gallery`) | Gallery hiệu ứng | Đạt; đủ hiệu ứng vào/nhấn mạnh/thoát, nội dung vừa khung | [ảnh](assets/q39-ui/q39-animations-0-light-1366x768.png) | [ảnh](assets/q39-ui/q39-animations-0-dark-1366x768.png) |
| Hoạt hình | Thêm hoạt ảnh (`slides.animation.add`) | Menu thả xuống | Đạt; danh sách vừa khung | [ảnh](assets/q39-ui/q39-animations-1-light-1366x768.png) | [ảnh](assets/q39-ui/q39-animations-1-dark-1366x768.png) |
| Hoạt hình | Bắt đầu (`slides.animation.start`) | Menu thả xuống | Đạt; ba lựa chọn dễ đọc | [ảnh](assets/q39-ui/q39-animations-2-light-1366x768.png) | [ảnh](assets/q39-ui/q39-animations-2-dark-1366x768.png) |
| Hoạt hình | Thời lượng (`slides.animation.durationMenu`) | Menu thả xuống | Đạt; đủ 5 mức | [ảnh](assets/q39-ui/q39-animations-3-light-1366x768.png) | [ảnh](assets/q39-ui/q39-animations-3-dark-1366x768.png) |
| Hoạt hình | Trễ (`slides.animation.delayMenu`) | Menu thả xuống | Đạt; đủ lựa chọn | [ảnh](assets/q39-ui/q39-animations-4-light-1366x768.png) | [ảnh](assets/q39-ui/q39-animations-4-dark-1366x768.png) |

## Hộp thoại và panel được mở trực tiếp

| Tab / lệnh | Loại | Kết luận | Ảnh |
|---|---|---|---|
| Trang đầu · Bố cục (`slides.layout.apply`) | Gallery hộp thoại | Đạt; 4 thẻ, lựa chọn mặc định rõ, nút Hủy/Áp dụng nhìn thấy ở 1366 và 1280. Tab chuyển focus tới Hủy; Esc đóng; Enter xác nhận bố cục mặc định và đóng hộp. 1280×720: hộp 560×494 px, không tràn. | [1366 sáng](assets/q39-ui/q39-layout-gallery-light-1366x768.png) · [1366 tối](assets/q39-ui/q39-layout-gallery-dark-1366x768.png) · [1280 sáng](assets/q39-ui/q39-layout-gallery-light-1280x720.png) · [1280 tối](assets/q39-ui/q39-layout-gallery-dark-1280x720.png) · [focus Tab](assets/q39-ui/q39-layout-gallery-tab-focus-light-1366x768.png) |
| Thiết kế · Thư viện Chủ đề (`slides.design.themeGallery`) | Gallery hộp thoại | Đạt; 6 thẻ, không tràn. | [sáng](assets/q39-ui/q39-theme-gallery-light-1366x768.png) · [tối](assets/q39-ui/q39-theme-gallery-dark-1366x768.png) |
| Thiết kế · Mẫu Slide Master (`slides.master.apply`) | Gallery/hộp thoại | Đạt; 6 thẻ, trường tên đơn vị và nút thao tác hiển thị. | [sáng](assets/q39-ui/q39-master-gallery-light-1366x768.png) · [tối](assets/q39-ui/q39-master-gallery-dark-1366x768.png) |
| Thiết kế · Định dạng nền (`slides.design.formatBackground`) | Hộp thoại | Đạt về bố cục; trường màu, chế độ nền, checkbox và nút hiển thị đủ. | [sáng](assets/q39-ui/q39-background-pane-light-1366x768.png) · [tối](assets/q39-ui/q39-background-pane-dark-1366x768.png) |
| Trình chiếu · Thiết lập (`slides.show.setupShow`) | Hộp thoại | Đạt; mặc định: lặp tắt, tự chuyển bật, không tắt thuyết minh; 4 điều khiển màu bút/laser hiển thị. Esc đóng. 1280×720: hộp 460×424 px, không tràn. | [1366 sáng](assets/q39-ui/q39-setup-show-light-1366x768.png) · [1280 sáng](assets/q39-ui/q39-setup-show-light-1280x720.png) · [1280 tối](assets/q39-ui/q39-setup-show-dark-1280x720.png) |
| Hoạt hình · Ngăn hoạt hình (`slides.animation.pane`) | Panel nổi | Đạt; panel có mô tả trạng thái slide trống và nút đóng, không che nội dung thao tác chính. | [sáng](assets/q39-ui/q39-animation-pane-light-1366x768.png) · [tối](assets/q39-ui/q39-animation-pane-dark-1366x768.png) |
| Chèn · Chữ nghệ thuật (`slides.insert.wordart`) | Hộp thoại | Đạt; trường nội dung mặc định và 8 mẫu chữ vừa khung, Hủy/Chèn rõ; chỉ mở và đóng, không chèn đối tượng. | [sáng](assets/q39-ui/q39-wordart-dialog-light-1366x768.png) · [tối](assets/q39-ui/q39-wordart-dialog-dark-1366x768.png) |
| Trang đầu · Chọn > Ngăn chọn (`slides.edit.selectionPane`) | Panel nổi | Đạt; thông báo trạng thái trống, hướng dẫn đổi thứ tự lớp rõ. | [sáng](assets/q39-ui/q39-selection-pane-light-1366x768.png) · [tối](assets/q39-ui/q39-selection-pane-dark-1366x768.png) |

Hộp `Cỡ trang chiếu` và hộp `Chèn biểu đồ` đã được xem trong `UI-REVIEW-20-10.md`; không mở lại để tránh lặp. Hộp Phông chữ được kiểm tra ở hai giao diện nhưng không đổi dữ liệu; các giá trị mặc định hiển thị nhưng trường Cỡ chữ bị chen với nhãn nên không thể kết luận nhập liệu hợp lý.

## Menu Tệp và mục điều hướng

| Mục | Kết quả | Ảnh |
|---|---|---|
| Tệp > Trang chủ / Mới / Tệp gần đây | Đạt; trang chủ và trạng thái danh sách gần đây rỗng nằm gọn trong khung | [sáng](assets/q39-ui/q39-file-light-1366x768.png) · [tối](assets/q39-ui/q39-file-dark-1366x768.png) |
| Tệp > Thông tin | Đạt; các khối bảo vệ, kiểm tra và thuộc tính hiển thị trong hai giao diện | [sáng](assets/q39-ui/q39-file-info-light-1366x768.png) · [tối](assets/q39-ui/q39-file-info-dark-1366x768.png) |
| Tệp > Tài khoản và bản quyền | Đạt; ô nhập mã, trạng thái dùng thử và đóng nhìn rõ | [sáng](assets/q39-ui/q39-file-account-light-1366x768.png) · [tối](assets/q39-ui/q39-file-account-dark-1366x768.png) |
| Tệp > Giới thiệu | **Cần quyết định:** hộp liệt kê giấy phép có dòng “LibreOffice (7.6+)”. Đây là tên sản phẩm bị quy tắc Q39 cấm trong hộp thoại; không tự xóa nội dung ghi nhận giấy phép. | [sáng](assets/q39-ui/q39-file-about-light-1366x768.png) · [tối](assets/q39-ui/q39-file-about-dark-1366x768.png) |
| Tệp > Tùy chọn | Lỗi dịch nhỏ đã biết từ UI-REVIEW-20-10: nhãn “Giao diện (Theme)” trộn Việt/Anh; Q39 không đổi i18n. | [sáng](assets/q39-ui/q39-file-options-light-1366x768.png) · [tối](assets/q39-ui/q39-file-options-dark-1366x768.png) |
| Tệp > In | Không lặp lại: lỗi nút cuối hộp bị ngoài viewport đã được ghi ở UI-REVIEW-20-10, chủ sở hữu `platform/print`. | [ảnh trước](assets/ui-review-20-10/slides/slides-print-preview.png) |

Không mở `Mở`, `Lưu`, `Lưu thành`, `Đóng` hoặc các thao tác xuất PDF vì chúng có thể gọi hộp thoại tệp hệ điều hành, ghi tài liệu, đóng phiên hoặc chạy luồng in/xuất. Chưa kiểm tra trang “Xuất và chuyển đổi” riêng. Những mục này được phân loại **NOT RUN**, không tính là đạt.

## Backlog và kiểm tra bàn phím

`docs/RIBBON-BACKLOG.md` đánh dấu hiệu ứng Morph chưa được triển khai hoàn chỉnh. Đã mở menu Chuyển tiếp và nhấp Morph bằng CDP. Menu đóng, không có toast/alert/trạng thái “Tính năng đang phát triển”; màn hình trở về trang chiếu như bình thường. Đây là **lỗi trung bình: thao tác có vẻ im lặng**. Ảnh: [Morph sau khi nhấp](assets/q39-ui/q39-morph-pending-notice-light-1366x768.png). Không sửa vì cần đối chiếu chủ sở hữu Slides về hành vi và điểm tích hợp pending notice.

Đã kiểm tra Tab/Esc/Enter trên hộp Bố cục (kết quả ở trên). Esc đóng các menu và gallery ribbon trong quá trình duyệt. Chưa thử nhập số âm/rỗng/quá lớn: các hộp số tương ứng như Cỡ trang chiếu đã được xem trước ở UI-REVIEW-20-10; hộp Phông chữ hiện không đủ rõ để nhập chính xác. Không chạy các lệnh chèn/lưu làm thay đổi tài liệu ngoài bước Enter xác nhận bố cục mặc định trên tài liệu trống.

## Chưa kiểm tra / giới hạn

- Sáu tab ngữ cảnh không thể hiện trên slide trống; các hộp/menu từ các tab này và trạng thái đối tượng được chọn: **NOT RUN**.
- Chưa mở các dialog từ lệnh ribbon khác: Bảng (chọn số hàng/cột), Sơ đồ, Đầu trang & Chân trang, Ngày & Giờ, Ký hiệu, Liên kết, Tác vụ và Soát lỗi. Chưa mở vì một số lệnh chèn/thay đổi tài liệu hoặc cần vùng chọn; các UI đó là **NOT RUN**. Chữ nghệ thuật, Thiết lập trình chiếu và hai panel đã nêu đã được mở. Biểu đồ và Cỡ trang chiếu đã được xem ở UI-REVIEW-20-10.
- Các trang/hộp Mở, Lưu thành, PDF, Mở gần đây riêng, Xuất và chuyển đổi, Đóng: **NOT RUN** vì mở picker hệ điều hành, ghi tệp, xuất hoặc đóng ứng dụng.
- Gallery nhóm thu gọn không xuất hiện ở 1366×768/1280×720; nó đã được kiểm tra ở Q36 tại 1024×600, không mở lại.
- Không chạy kiểm tra COM/Office; không dùng điều khiển OS.

## Kiểm thử và thay đổi

- `git merge main`: **PASS** — Already up to date.
- `npm test`: **PASS — 3789/3789**.
- `node scripts/audit-0610/i18n_parity.mjs`: **PASS — VI=3148, EN=3148, missingVI=0, missingEN=0** (20 key trùng/rỗng vẫn là danh sách nghi vấn hiện hữu của tool).
- `python scripts/audit-0610/verify_checklist_evidence.py --all --no-fix`: **PASS — 0 dòng bị hạ; 279/217/269 dòng** ở ba checklist.
- `python -m pytest tests -q -k "slides or dialog or ribbon"`: **PASS — 179 passed, 940 deselected, 115.70s**.
- Generator checklist: **không cần** — không sửa `command-definitions.js`/`strings-vi.js`, không đổi số dòng checklist.
- Source sửa: **không có**. Không tạo bài CDP fail/pass vì không sửa lỗi trong Q39.
- Ảnh: 77 ảnh đã chụp, lưu ở `docs/assets/q39-ui/`.

---

## Q40 — Sửa phản hồi và bố cục menu Slides, 21/10/2026

### Kết quả

- Morph trước sửa đóng menu nhưng không có dialog/toast; CDP xác nhận **0/8** phản hồi. Nay chọn Morph hiện thông báo VI/EN hướng dẫn chọn hiệu ứng khác và có Help tiếng Việt cụ thể; CDP **8/8 PASS** tại 1366×768 và 1280×720, sáng/tối.
- Gallery Hình cao **548px** ở 1280×720 và tràn xuống thanh trạng thái 14px. Nay giới hạn chiều cao theo vùng trên thanh trạng thái và cuộn trong gallery. Bài viewport gốc **4/4 PASS**.
- Hộp Phông chữ trước sửa có nhãn và control chồng nhau, tab giống nút HTML mặc định, preview khó đọc trong dark mode. CSS chuyển vào UI Kit dùng chung; sau sửa **4/4 PASS** ở 1366×768/1280×720, sáng/tối.
- Bài menu dài mở Bố cục, Chuyển tiếp, Hoạt hình và Hình tại 1280×720 cùng 1024×600, sáng/tối: **16/16 PASS**, menu không phủ status bar; gallery Hình cuộn khi cần.
- Slides ribbon runtime: **192 lệnh**, `SILENT_FALSE=0`, `NO_HANDLER=0`, `THREW=0`; thao tác cần chọn đối tượng báo điều kiện trên thanh trạng thái.

### Giao diện đã xem

Đã mở và xem ảnh trước/sau của từng dialog/menu trong ma trận sáng/tối, cùng hai kích thước desktop và kích thước 1024×600 cho gallery/menu dài. Ảnh nằm ở `assets/q40-ui/`.

| Màn hình | Ảnh đã xem | Kết luận |
|---|---|---|
| Gallery Hình, 1366×768 và 1280×720, sáng/tối | `q40-slides-gallery-*-before.png`, `q40-slides-gallery-*-after.png` | Sau sửa không che thanh trạng thái; có thanh cuộn khi nội dung dài. |
| Bố cục, Chuyển tiếp, Hoạt hình, Hình, 1280×720 và 1024×600, sáng/tối | `q40-slides-long-*-before.png`, `q40-slides-long-*-after.png` | Mỗi menu nằm trong viewport; ở 1024 canvas có thanh cuộn ngang để xem slide theo mức zoom. |
| Hộp Phông chữ, 1366×768 và 1280×720, sáng/tối | `q40-slides-font-dialog-*-before.png`, `q40-slides-font-dialog-*-after.png` | Label, control và nút có khoảng cách; preview đọc được trong dark mode. |
| Thông báo Morph, 1366×768 và 1280×720, sáng/tối | `q40-slides-morph-*-before.png`, `q40-slides-morph-*-after.png` | Dialog cân giữa, chữ/nút rõ; không còn im lặng. |
| Smoke Writer, Sheet, Slides, 1366×768, sáng/tối | `q40-smoke-*-1366x768-*.png` | Ba app khởi động và hiển thị ribbon, vùng làm việc, thanh trạng thái. |

### Kiểm thử và giới hạn

- Shared UI Kit thay đổi đã smoke cả ba app qua CDP: **6/6 PASS** (3 app × 2 theme).
- Sheet ribbon runtime: **216 lệnh**, `NO_HANDLER=0`, `THREW=0`; 37 phép thử không đổi snapshot được giữ ở báo cáo runtime vì phần lớn phụ thuộc đối tượng/trạng thái hoặc đang ở trạng thái đích. Sheet audit không phân loại toast/status nên không dùng `NO_VISIBLE_EFFECT` làm bằng chứng lệnh im lặng.
- `docs/RIBBON-BACKLOG.md` có các mục pending Morph, Cửa sổ mới và hai lệnh menu ngữ cảnh Sheet. Morph nay báo rõ chưa hỗ trợ; hai lệnh Cửa sổ mới có phản hồi giới hạn desktop/browser. Hai lệnh Sheet không có trong `command-definitions.js`/UI được audit nên chưa mở được qua ribbon. Ba audit runtime ghi nhận 0 `SILENT_FALSE` và 0 `NO_HANDLER` cho lệnh được chạy; các mục chưa thể mở không được tính là đã kiểm thử. Không xóa nút.
- `CODEX-COMMON-RULES.md` không có trong worktree; áp dụng quy tắc UI được cung cấp trong phiếu.
