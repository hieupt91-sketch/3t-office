# FIX-L14 — Kết quả đối chiếu Slides với PowerPoint

## Phạm vi và kết quả

Đã đối chiếu 20 nút còn chờ từ matrix, đo lại Zoom/WordArt, lưu bằng chứng COM và desktop CDP. Matrix được tái sinh bằng `scripts/audit-0610/gen_slides_button_matrix.py`: **64 KHỚP POWERPOINT, 13 CHƯA ĐỐI CHIẾU, 9 KHÁC CÓ CHỦ Ý, 2 LỆCH ĐÃ BIẾT** (88 dòng).

7 trong 20 nút được xác nhận bằng trạng thái tương ứng ở cả app và PowerPoint:

- Giãn dòng: CDP đặt 1.5; PowerPoint COM đọc `LineRuleWithin=-1`, `SpaceWithin=1.5` từ PPTX app xuất.
- Bình thường và Bộ sắp xếp: `ViewType=9` và `ViewType=7`.
- Phóng to/Thu nhỏ/100%: COM đọc 55→65, 65→55 và 100; CDP đọc 100%→110%, 110%→100% và 100%.
- Vừa cửa sổ: app đo zoom 70% theo viewport; PowerPoint COM bật `View.ZoomToFit=true`.

13 nút vẫn CHƯA ĐỐI CHIẾU: Từ đầu, Từ trang này, Presenter, Tập dượt thời gian, Nhận xét trước/sau/đã xử lý, Kiểm tra chính tả, bật/tắt kiểm tra chính tả, Chế độ đọc, Thước, Đường lưới và Đường hướng dẫn. Lý do cụ thể có trong từng hàng matrix và `evidence/fix-l14/com-audit.json`; không nâng thành KHỚP dựa trên model/CDP một phía.

## Zoom transition và WordArt

- PPTX VN Slides chứa `<p:zoom dir="out"/>`; PowerPoint COM đọc `SlideShowTransition.EntryEffect=3073` (`ppEffectBoxOut`). Các enum Zoom 3345–3350 vẫn bị PowerPoint từ chối theo bằng chứng FIX-L12. Phiên PowerPoint báo `Product Activation Failed`, nên không lấy được nhãn UI/mẫu native Zoom khác. Giữ **LỆCH ĐÃ BIẾT**.
- WordArt app đọc bằng COM là `Shape.Type=17`, `TextEffect.Text` có chữ và `PresetTextEffect=-2`. Thử ODF Fontwork tái sử dụng LibreOffice tạo `a:prstTxWarp prst="textFadeRight"`, nhưng COM vẫn đọc Type=17/Preset=-2; bỏ dấu `txBox` thì Type=1. COM `Shapes.AddTextEffect` trong phiên này cũng không tạo được WordArt native/warp. Không đổi serializer khi phép đo không chỉ ra cách xuất đạt Shape.Type/TextEffect parity; giữ **LỆCH ĐÃ BIẾT**. Bằng chứng: [so sánh PPTX/COM](evidence/fix-l14/pptx-native-com-comparison.json), [Fontwork probe](evidence/fix-l14/fontwork-reuse-probe.json), [AddTextEffect](evidence/fix-l14/addtext-effect-enum-probe.json).

## An toàn PowerPoint

COM gắn đúng cửa sổ PowerPoint PID 12760/HWND 64291812. Mọi thao tác thử chỉ mở bản sao trong `E:\VNOffice-profiles\codex-fl14` và gọi `Presentation.Close()` cho chính bản audit. Sau từng lượt, presentation count trở về 0; process/cửa sổ PowerPoint chủ sở hữu vẫn chạy. Không gọi `Application.Quit`, `Stop-Process`, SendKeys, hoặc đóng presentation/slideshow nào của chủ sở hữu. PowerPoint COM `SlideShowSettings.Run()` trong lượt audit trả object không có `View`, `SlideShowWindows.Count=0`; do đó lượt này không kết thúc slideshow chủ sở hữu.

## Kiểm tra và thay đổi

- Plan gate: [PLAN-SLIDES-L14.md](../PLAN-SLIDES-L14.md), commit trước khi audit.
- COM audit: [script](../../scripts/audit-0610/office_parallel/slides/fix-l14-com-audit.ps1), bản sao fixture trong profile riêng.
- Giãn dòng: [CDP readback](evidence/fix-l14/lineSpacing-cdp-readback.json), [PowerPoint COM](evidence/fix-l14/lineSpacing-com-readback.json), [ảnh](evidence/fix-l14/lineSpacing.png).
- Ma trận: generator PASS, 88 dòng; 64/13/9/2.
- npm/Python/CDP regression suites: sẽ ghi trạng thái sau lượt kiểm tra cuối.
- Build: NOT RUN; không sửa mã app/build system.
- Không sửa LibreOffice Core, không thay semantics PPTX, không sửa fixture/expected để làm xanh.

## Còn lại

13 hàng và 2 lệch đã biết được giữ đúng trạng thái. Khả năng đọc COM vẫn bị giới hạn bởi phiên Office không kích hoạt và interface PowerPoint COM không phơi bày một số trạng thái view/comment. Cần mẫu native Zoom/WordArt được tạo trong PowerPoint đã kích hoạt để giải quyết hai lệch còn lại.
