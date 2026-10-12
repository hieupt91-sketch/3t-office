# FIX-L13 — Kết quả rà soát Slides với PowerPoint

## Kết quả

Đã lập plan và commit plan trước các thao tác lưu trữ (`abfa4193`). Đã chạy desktop CDP qua `main.py` với `VNO_APP_ROOT=E:\VNOffice-codex-fl13` và `VNO_CDP_LOCALAPPDATA=E:\VNOffice-profiles\codex-fl13`. Các phép thử CDP dùng sự kiện chuột/phím của WebView2, không dùng OS input.

- Chạy lại các hành vi chưa có bằng chứng phiên gần nhất: slideshow từ đầu/trang hiện tại, Presenter, tập dượt, điều hướng/xử lý nhận xét, kiểm tra chính tả, các chế độ xem, thước/lưới/đường hướng dẫn/zoom, Help/About và Macro. JSON, ảnh và tệp thử ở [evidence/fix-l13](evidence/fix-l13/).
- VN Slides xác nhận: F5 bắt đầu trang 1; Shift+F5 bắt đầu trang 2; Presenter hiện overlay; Tập dượt bắt đầu; nhận xét trước/sau đổi mục đang chọn; Đã xử lý lưu trạng thái trong model; kiểm tra chính tả hoàn tất và Esc đóng dialog; các view/view helpers thay đổi state như được ghi trong CDP JSON.
- Ghi Macro bật indicator, ghi thao tác Phóng to, tắt indicator và macro xuất hiện trong Quản lý Macro. Đây là macro cục bộ VN Office, không phải dự án VBA trong PPTX.
- Nút Cửa sổ mới trả `false`, số page WebView vẫn là 1 và deck hiện tại giữ nguyên. Ma trận ghi đây là khác biệt tiện ích desktop đã biết; bằng chứng không cho thấy có cửa sổ thứ hai.
- Tệp PPTX đã lưu qua VN Slides chứa `<p:zoom dir="out"/>` và shape chữ nghệ thuật có `<a:bodyPr>` / `<a:prstTxWarp prst="textNoShape">`; chi tiết ở [pptx-native-readback.json](evidence/fix-l13/pptx-native-readback.json). Đây là đọc XML của tệp, chưa xác nhận `Shape.TextEffect/Type` bằng PowerPoint COM. Tài liệu Open XML mô tả `p:zoom` là phần tử chuyển tiếp Zoom ([Microsoft Open XML SDK](https://learn.microsoft.com/en-us/dotnet/api/documentformat.openxml.presentation.zoomtransition?view=openxml-3.0.1)); COM readback trước đó vẫn ghi `EntryEffect=ppEffectBoxOut=3073`. Không đủ cơ sở đổi trạng thái hai dòng này.
- SmartArt tiếp tục là nhóm shape có thể chọn/chỉnh sửa; đường ODF của LibreOffice không tạo bộ DrawingML diagram parts/relationships. Lý do và phép đo COM trước đã có trong evidence FIX-L12; không thêm đường xuất riêng ngoài LibreOffice.

## PowerPoint COM

Đã thử mở PowerPoint hiển thị (`Visible=msoTrue`) và gọi `Presentations.Open(path, ReadOnly=true, Untitled=false, WithWindow=true)`. Office báo `PowerPoint (Product Activation Failed)`; lời gọi mở tệp trả `RPC_E_CALL_REJECTED (0x80010001)`. Lượt retry vẫn không trả COM window. Chỉ dừng các PID POWERPNT do chính probe này tạo. Không dùng SendKeys. Chi tiết ở [office-com-window-check.json](evidence/fix-l13/office-com-window-check.json).

Do không có `ActiveWindow`, `ViewType` hoặc `View.Zoom` khả dụng, **20 dòng CHƯA ĐỐI CHIẾU vẫn giữ nguyên**. Hai dòng **LỆCH ĐÃ BIẾT** Zoom và WordArt cũng vẫn giữ nguyên. Ma trận có 88 dòng: 57 KHỚP POWERPOINT, 20 CHƯA ĐỐI CHIẾU, 9 KHÁC CÓ CHỦ Ý, 2 LỆCH ĐÃ BIẾT. Không dùng kết quả CDP một phía để tuyên bố parity Office.

## Kiểm tra

- `npm test`: **PASS 3109/3109**.
- `LOCALAPPDATA=E:\VNOffice-profiles\codex-fl13 python -m unittest discover -s tests`: **PASS 907**, 561.604 giây. Có `ResourceWarning` về file handle chưa đóng; không có test fail.
- `python -m unittest tests.test_slides_pptx_wordart`: **PASS 2/2**.
- `claude-slides-roundtrip.desktop.mjs`: **PASS 8/8**.
- `slides-fix-l2.desktop.mjs`: **PASS 20/20**.
- `slides-fix-l3.desktop.mjs`: **PASS 13 thao tác**.
- FIX-L13 desktop CDP: slideshow, comments, spellcheck, view/help và macro scripts kết thúc thành công, lưu JSON/ảnh dưới evidence.
- Matrix generator: **PASS**, 88 dòng; 57 KHỚP, 20 CHƯA ĐỐI CHIẾU, 9 KHÁC CÓ CHỦ Ý, 2 LỆCH ĐÃ BIẾT.
- Encoding scan: **PASS** (17 tệp text UTF-8, không BOM/không phát sinh dấu mojibake); `py_compile`: **PASS**; `node --check` năm harness: **PASS**; `git diff --check`: **PASS**.
- Build: **NOT RUN**; không có thay đổi mã ứng dụng hay build system.

## Chưa hoàn tất và điều kiện tiếp tục

Phần đối chiếu PowerPoint thật chưa hoàn tất vì Office trên máy này không cho COM mở presentation khi cửa sổ hiển thị thông báo kích hoạt. Khi có phiên PowerPoint desktop đã kích hoạt, chạy lại phép COM với `Presentations.Open(..., true, false, true)`, xác minh `ActiveWindow/ViewType/View.Zoom`, đọc `Presentation.Comments`, và dùng tệp mẫu Zoom/WordArt tự lưu từ giao diện Office. Sau đó cập nhật generator/ma trận và chỉ đổi trạng thái theo readback thật.

Không đổi file-format semantics, không sửa LibreOffice Core, không sửa fixture/expected để làm xanh. Hướng dẫn tiếng Việt cho view, Help, Macro, nhận xét, chính tả và trình chiếu đã hiện có trong `platform/help/entries-slides.js`; ticket không thêm feature UI mới.
