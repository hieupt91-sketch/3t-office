# Bàn giao: VN Slides — Sửa lỗi thật "Khổ trang chiếu (Slide Size) bị ghi sai vĩnh viễn khi xuất PPTX/ODP"

## 1. Bối cảnh & lỗi thật đã đo được

Áp dụng đúng phương pháp người dùng yêu cầu ("kiểm tra bằng vòng chuyển đổi soffice THẬT, không phải tự round-trip của VN Office") trong lúc rà lại toàn bộ tính năng Slides, phát hiện một lỗi nghiêm trọng, âm thầm, ảnh hưởng MỌI bản trình chiếu xuất ra:

- `SlidesAdapter.serializeToFodp()` khai báo khổ trang qua `style:page-layout-properties` (`fo:page-width`/`fo:page-height`) — đây là cách ODF chuẩn, đúng.
- Nhưng khi lệnh `soffice --convert-to pptx` chạy trên file FODP này, **soffice bỏ qua hoàn toàn** thuộc tính này đối với presentation, và LUÔN tự ghi `<p:sldSz cx="10080625" cy="5670550">` (đúng 28cm × 15.75cm) vào `ppt/presentation.xml`, bất kể `canvas.slideSize` người dùng đã chọn là gì (16:9 mặc định 960×540px, 4:3, hay bất kỳ khổ tùy chỉnh nào khác).
- Xác nhận đây là giới hạn thật của chính soffice (không phải lỗi nội dung FODP của VN Office) bằng một file FODP điều khiển tối giản khai báo `20cm x 20cm`, chuyển đổi qua đúng pipeline thật — vẫn ra `28.002cm x 15.752cm`.
- Hậu quả thực tế: mọi file PPTX xuất ra từ VN Slides có `canvas.slideSize` khác 960×540px (bất kỳ khổ 4:3, A4 ngang, hay khổ tùy chỉnh nào người dùng chọn trong Thiết kế > Khổ trang chiếu) đều bị PowerPoint/soffice mở lại với khổ trang SAI, kéo theo toàn bộ hình khối bị lệch tỷ lệ so với thiết kế gốc.

## 2. Vị trí sửa đúng: hậu xử lý ZIP OOXML (không sửa được ở tầng ODF)

Vì đây là giới hạn của chính engine soffice khi CHUYỂN ĐỔI (không phải lỗi đọc/ghi FODP), không thể sửa bằng cách thay đổi nội dung FODP. Giải pháp đúng là tầng hậu xử lý ZIP `.pptx` NGAY SAU khi soffice xuất ra — đúng kiến trúc đã có sẵn 3 tiền lệ tương tự (logo Slide Master, `p14:sectionLst`, `p:showPr` Set Up Show), giờ bổ sung tiền lệ thứ 4: khổ trang chiếu.

### 2.1 `pptx-master-logo.js` (JS) / `ooxml_zip_patch.py` (Python) — hàm mới dùng chung

- `parseIntendedSlideSizeFromFodp(fodpXml)` / `parse_intended_slide_size_from_fodp()`: đọc `fo:page-width`/`fo:page-height` (cm) từ `style:page-layout-properties` trong FODP nguồn, quy đổi sang EMU (`round(cm * 360000)`). Trả về `null`/`None` nếu FODP không có khối này.
- `applyIntendedSlideSize(presentationXml, size)` / `apply_intended_slide_size()`: vá `<p:sldSz cx cy>` trong `ppt/presentation.xml`, GIỮ NGUYÊN mọi thuộc tính khác đã có trên thẻ (vd. `type="screen16x9"`). Không đổi gì nếu `size` là `null`.

### 2.2 `pptx-native-postprocess.js` (JS, chỉ dùng cho test tự động) / `ooxml_zip_patch.py`'s `postprocess_slides_pptx()` (Python, ĐƯỜNG DẪN SẢN XUẤT THẬT)

`postProcessSlidesPptx()`/`postprocess_slides_pptx()` giờ tính thêm `intendedSize` (từ FODP nguồn) và `realSize` (từ `presentation.xml` mà soffice vừa xuất), so sánh với dung sai >500 EMU (~0.0014cm, tránh vá giả do sai số làm tròn), và chỉ vá khi lệch thật. Việc này ĐỘC LẬP hoàn toàn với logic logo/sections/show đã có — một presentation không dùng bất kỳ tính năng native nào khác vẫn được sửa khổ trang.

### 2.3 `main.py` — gỡ bỏ cổng chặn khiến toàn bộ fix trở thành dead code

`_apply_native_export_postprocess()` trước đây có early-return: NẾU không có logo Master, không có sections, không có show-setup flags thì BỎ QUA hoàn toàn việc gọi `postprocess_slides_pptx()`. Đây là trường hợp PHỔ BIẾN NHẤT (đa số bản trình chiếu không dùng 3 tính năng đó) — nếu giữ nguyên cổng chặn này, fix khổ trang sẽ KHÔNG BAO GIỜ được thực thi trong thực tế. Đã gỡ bỏ cổng chặn, giờ LUÔN đọc bytes `out_path` và gọi `postprocess_slides_pptx()`, tin tưởng vào logic no-op nội bộ của chính hàm này (đã kiểm tra: không có gì cần vá → trả về bytes y hệt, không tạo I/O thừa).

## 3. Vì sao phải sửa cả JS lẫn Python

- **Python (`adapters/libreoffice/common/ooxml_zip_patch.py`)**: đường dẫn `File → Lưu` THẬT của người dùng, được `main.py` gọi trực tiếp.
- **JS (`pptx-native-postprocess.js` + `pptx-master-logo.js`)**: bản song sinh CHỈ dùng cho bộ test tự động JS (`tests/run-tests.js`, các live test `.mjs`) — không bao giờ được app desktop thật gọi tới. Quy ước này đã ghi rõ trong header file JS từ trước; hai bản phải luôn đồng bộ logic.

## 4. Thay đổi phụ: `serializeToFodp()` co giãn theo tỷ lệ đúng cho khổ trang tùy chỉnh

Trong lúc sửa, phát hiện thêm: các khối bố cục hardcode sẵn (title-only, hai-nội-dung, tiêu-đề+thân mặc định, notes, thanh nhấn/logo/footer trên Master, vị trí bình luận) đều được TÍNH TOÁN SẴN theo đúng khổ 28cm × 15.75cm cũ — nếu chỉ sửa khai báo `page-layout` mà không co giãn các khối này, khổ trang đúng nhưng nội dung bên trong vẫn lệch/tràn với khổ tùy chỉnh. Đã thêm `scaleX = pageWidthCm/28`, `scaleY = pageHeightCm/15.75` và hai hàm `cmX()/cmY()` áp dụng cho MỌI toạ độ cm hardcode trong các khối trên, giữ đúng tỷ lệ bố cục tương đối bất kể `canvas.slideSize` là gì.

## 5. Kết quả kiểm thử

- `node scripts/check-syntax.js`: PASS.
- `node tests/run-tests.js`: **1393/1393 PASS** (1386 nền + 7 test mới trong suite 127 "Slides native PPTX post-process (p:sldSz khổ trang chiếu thật)").
  - 3 test cũ được cập nhật đúng theo quy ước "sửa test, không sửa code" vì hành vi mới là ĐÚNG và CHỦ ĐÍCH: `slides-pptx-master-logo.test.js`, `slides-pptx-section-list.test.js`, `slides-pptx-show-properties.test.js` — trước đây khẳng định "không có logo/sections/show thì ZIP không đổi gì", giờ khẳng định thêm "ZIP CÓ đổi (vì khổ trang được sửa) nhưng master/slide/showPr liên quan vẫn giữ nguyên/không bị kích hoạt giả".
- `python -m unittest` (17 module trong `tests/`, chạy từ thư mục gốc dự án qua cú pháp `tests.<module>`): **81/81 PASS**, bao gồm `tests/test_slides_pptx_slide_size.py` (9 test mới: đọc FODP, vá `p:sldSz`, no-op khi không có page-layout, sửa đúng khổ 16:9 mặc định, sửa đúng khổ 4:3 tùy chỉnh, không tạo thay đổi giả khi khổ đã khớp).
- `node tests/live/ribbon-audit-1280.playwright.mjs`: **100% PASS** — 26/26 tab trên cả 3 app, 0px tràn ngang tại 1280px (đúng như dự kiến, fix này không đụng tới ribbon/UI).
- `node tests/live/slides-pptx-slide-size-native-export.mjs` (mới — vòng chuyển đổi soffice THẬT, không phải self-round-trip):
  1. Dựng FODP thật qua `SlidesAdapter.serializeToFodp()` với khổ tùy chỉnh 4:3 (720×540px → 19.05cm × 14.287cm).
  2. Chuyển đổi qua `soffice --convert-to pptx` THẬT → xác nhận PPTX xuất ra bị soffice ghi sai thành 28cm × 15.75cm (10080625 × 5670550 EMU) — probe này sẽ tự FAIL với thông báo rõ ràng nếu LibreOffice tương lai vá lại giới hạn này.
  3. Chạy `postProcessSlidesPptx()` (JS) — xác nhận `p:sldSz` được sửa đúng lại 19.05cm × 14.287cm (± dung sai 500 EMU).
  4. Chuyển PPTX đã vá NGƯỢC LẠI qua `soffice --convert-to fodp` THẬT — xác nhận khổ trang round-trip đúng (giải quyết đúng qua `style:master-page/@style:page-layout-name` để tránh nhầm với khối `page-layout` PM0/A4-mặc-định không dùng tới mà soffice luôn kèm thêm).
  5. Chuyển PPTX đã vá qua `soffice --convert-to pdf` THẬT — xác nhận file PDF không hỏng (>100 bytes).
  6. Gọi CLI Python thật (`ooxml_zip_patch.py --pptx --fodp --out`) — xác nhận bản song sinh Python cho kết quả `p:sldSz` giống hệt bản JS.

## 6. Phát hiện phụ trong lúc viết live test (không phải lỗi)

File FODP thật do soffice xuất ra (bước round-trip ngược PPTX→FODP) luôn chứa NHIỀU khối `<style:page-layout>` (vd. `PM0` = khổ A4 21cm×29.7cm mặc định không ai dùng tới, `PM1` = khổ thật đang được `style:master-page` tham chiếu qua `style:page-layout-name`). Test ban đầu dùng regex tìm khối `page-layout-properties` ĐẦU TIÊN trong file nên vô tình đọc nhầm khối `PM0` không liên quan — đã sửa lại test để giải quyết đúng qua tên layout mà master-page thực sự tham chiếu, không phải khối xuất hiện trước trong file.

---
Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NQAtxPSqMH9cVDTLUuckNw
