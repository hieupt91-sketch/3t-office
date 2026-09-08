# HANDOFF: Writer Floating Image (sd-abs-pos) Import Overlap Fix

## Tóm tắt

Sửa lỗi ảnh floating (ảnh nổi "Behind Text"/"In Front of Text" từ Word) đè lên nội dung khác khi mở file Word nhiều trang trong VN Writer.

## Nguyên nhân gốc

LibreOffice StarWriter HTML export chuyển ảnh floating thành:
```html
<span class="sd-abs-pos" style="position: absolute; top: 7.41cm; left: 3.39cm; width: 528px">
  <img src="..." name="Picture 1" width="528" height="492"/>
</span>
```

Giá trị `top`/`left` được tính **tương đối theo TỪNG TRANG GỐC** của file Word. Nhưng VN Writer chỉ tạo **MỘT** container `.vno-writer-page` cho toàn bộ nội dung, nên tất cả toạ độ `position: absolute` bị tính từ cùng 1 gốc → ảnh từ trang 2/3/4... bị "rơi" vào nội dung trang khác và đè chồng.

## Phương án sửa

Chuyển `sd-abs-pos` từ `position: absolute` sang `display: inline-block; position: static` trong bước `_normalizeImportedHtml()`. Thứ tự DOM giữ nguyên (soffice HTML không giữ marker trang gốc, nên DOM order là fallback hợp lệ — brief đã duyệt).

## Files đã sửa

### 1. `adapters/libreoffice/writer/writer-adapter.js`

**Thêm method mới** `_convertFloatingImagesToInline(html)` (sau `_normalizeImportedHeaderFooterHtml`):
- Regex match `<span class="sd-abs-pos" style="...">...</span>`
- Loại bỏ `position: absolute`, `top: Xcm`, `left: Ycm` khỏi inline style
- Thêm `display: inline-block; position: static`
- Giữ nguyên width và các style khác (border, background...)

**Gọi method trong `_normalizeImportedHtml()`** (dòng ~1716):
```js
html = this._convertFloatingImagesToInline(html);
```

### 2. `tests/unit/writer-floating-image-import.test.js` (FILE MỚI)

10 test cases:
1. Snapshot HTML còn `sd-abs-pos` với `position:absolute`
2. Sau normalize: không còn `position:absolute`
3. Sau normalize: converted thành `display:inline-block`
4. Sau normalize: toạ độ `top`/`left` bị loại bỏ
5. Sau normalize: `width` được giữ nguyên
6. Sau normalize: `<img>` tags vẫn đầy đủ
7. Sau normalize: nội dung văn bản/bảng không bị ảnh hưởng
8. HTML không có `sd-abs-pos`: giữ nguyên (không hồi quy)
9. `sd-abs-pos` với style attributes khác: không bị mất
10. Nhiều `sd-abs-pos` liên tiếp: tất cả được convert

### 3. `tests/run-tests.js`

- Import `runWriterFloatingImageImportTests`
- Thêm suite #138

## Kết quả kiểm thử

### Automated
- **1532/1532 PASS | 0 FAIL** (tăng từ 1522, thêm 10 test mới)
- **91/91 files PASS** syntax check (`node scripts/check-syntax.js`)

### Visual — Claude tự xác minh bằng file thật + ảnh chụp màn hình thật (bắt buộc trước khi merge)

opencode báo "LibreOffice/file test không có trong môi trường" — SAI, chỉ
là do mỗi worktree là thư mục riêng trên đĩa nên `file test/` (bị
.gitignore, không phải file tracked) không tồn tại VẬT LÝ trong worktree
này, và lệnh dò LibreOffice của opencode kiểm tra sai đường dẫn. Máy này
CÓ LibreOffice thật tại `C:\Users\3T Computer\tools\libreoffice\program\
soffice.exe` (đã tự xác nhận qua `vnmain.SOFFICE_PATH`), và `file test/`
tồn tại thật trong worktree chính `E:\VN OFice\file test\` — dùng đường
dẫn tuyệt đối trỏ sang đó vẫn hoạt động bình thường từ bất kỳ worktree
nào (chỉ là đường dẫn file, không cần nằm trong thư mục worktree).

Claude đã tự chạy `python main.py` thật (dùng
`parse_launch_args([DOCX_PATH])` với đường dẫn tuyệt đối tới file MYTIME
thật) trong CHÍNH worktree này (code đã sửa), chụp màn hình thật qua
`System.Drawing.Graphics.CopyFromScreen` tại 5 vị trí khác nhau trong tài
liệu (đầu trang, mục lục, giữa tài liệu ~trang 2-3, và cuối tài liệu
~trang 44):

- **Lỗi gốc (ảnh đè lên bảng dữ liệu) — XÁC NHẬN ĐÃ HẾT** ở cả 5 vị trí
  kiểm tra: không còn hiện tượng nội dung chồng lấn/đè lên nhau, văn bản
  và bảng đều hiển thị tuần tự đúng luồng đọc.
- **Tác dụng phụ mới phát hiện (cần lưu ý, KHÔNG chặn merge nhưng phải
  ghi nhận trung thực):** tài liệu này có watermark nền "MyTime" (chữ mờ
  chéo trang) — watermark đó CŨNG dùng `class="sd-abs-pos"` giống ảnh nổi
  thường. Sau khi sửa (bỏ `position: absolute`), watermark không còn nằm
  "phía sau văn bản" như thiết kế gốc nữa mà hiện ra như MỘT KHỐI LỚN
  chiếm nguyên một khoảng trong luồng nội dung — tạo cảm giác nhiều
  "trang trống chỉ có watermark" xen giữa nội dung thật. Đây là đánh đổi
  thẩm mỹ (KHÔNG phải mất dữ liệu, KHÔNG che khuất nội dung thật, văn bản
  vẫn đọc được đầy đủ đúng thứ tự) — nhưng khác với hành vi watermark
  chuẩn (mờ, nằm nền, không chiếm không gian riêng).
  - **Đề xuất cho task sau (không bắt buộc làm ngay)**: phân biệt 2
    trường hợp của `sd-abs-pos` — ảnh nội dung thật (cần sửa như đã làm)
    và watermark trang trí (nên giữ dạng nền, có thể dùng
    `background-image` CSS trên chính trang thay vì phần tử nổi trong
    luồng). Dấu hiệu nhận biết watermark: thường có opacity thấp hoặc
    kích thước lớn gần bằng khổ trang, tên ảnh có thể trùng lặp nhiều lần
    ở nhiều vị trí `top` khác nhau (đã thấy trong log gốc: cùng 1 ảnh với
    `top: 7.41cm` xuất hiện nhiều lần — dấu hiệu watermark lặp lại theo
    từng trang).
- Đã dọn sạch mọi file test/ảnh chụp tạm, không có gì lọt vào git.

### Kết luận

Lỗi nghiêm trọng nhất (nội dung đè chồng, không đọc được) đã được xác
nhận sửa dứt điểm bằng bằng chứng ảnh chụp thật. Tác dụng phụ watermark
là vấn đề thẩm mỹ nhỏ hơn nhiều, không gây mất dữ liệu, an toàn để merge
— ghi nhận làm việc tiếp theo nếu cần hoàn thiện.

## Ranh giới an toàn

- KHÔNG đụng `paginateContent()` (Print Preview)
- KHÔNG sửa `scripts/serve.js`
- KHÔNG commit file trong `file test/` hay ảnh chụp màn hình
- Commit trên nhánh hiện tại, KHÔNG merge vào main, KHÔNG push

## Handoff cho agent tiếp theo

- **Branch:** nhánh hiện tại của worktree
- **Cần làm tiếp:** Test visual thủ công với file thật khi có LibreOffice + file test
- **Lưu ý:** Nếu cần chính xác pixel-perfect vị trí ảnh theo trang gốc, cần giải pháp phức tạp hơn (xác định trang gốc từ HTML structure của soffice) — hiện tại dùng DOM order làm fallback, chấp nhận không tuyệt đối pixel-perfect nhưng KHÔNG đè chồng
