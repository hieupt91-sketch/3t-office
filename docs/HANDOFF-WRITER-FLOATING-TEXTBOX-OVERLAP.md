# HANDOFF: Writer Floating Text Box/Frame Import Overlap Fix

## Tóm tắt

Mở rộng fix ảnh nổi (`sd-abs-pos`) để xử lý CẢ text box nổi và frame nổi (`id="textboxN"`, `id="FrameN"`, bất kỳ `id` nào khác) — tất cả span có `position: absolute` trong HTML soffice đều được chuyển sang `position: static`. **Phân biệt block vs inline-block**: span chứa nội dung dạng khối (text box/frame với `<p>`, `<h1>`-`<h6>`, `<div>`) dùng `display:block` để xếp dọc; span chỉ chứa ảnh thuần dùng `display:inline-block` để xếp ngang gọn trong dòng.

## Bối cảnh

Fix trước (xem `HANDOFF-WRITER-FLOATING-IMAGE-OVERLAP.md`) chỉ xử lý `<span class="sd-abs-pos">` (11 lần trong file Aquara). Nhưng soffice xuất **RẤT NHIỀU** text box nổi khác của Word dưới dạng:
```html
<span id="textbox20" dir="ltr" style="position: absolute; top: 3.55cm; ...">
  <p class="western">CÂU CHUYỆN THƯƠNG HIỆU</p>
</span>
<span id="Frame159" dir="ltr" style="position: absolute; top: 7.15cm; ...">
  <p class="western">BỘ ĐIỀU KHIỂN RÈM CUỐN</p>
</span>
```
Đếm được: `position: absolute` xuất hiện **148 lần** trong HTML Aquara, nhưng `sd-abs-pos` chỉ 11 lần — **137 phần tử** hoàn toàn KHÔNG được fix, gây đè chồng y hệt lỗi ảnh đã sửa.

### Lỗi block vs inline-block

Ban đầu tất cả span nổi đều bị ép thành `display:inline-block`. Điều này khiến các text box tiêu đề (CÂU CHUYỆN THƯƠNG HIỆU, THIẾT KẾ ĐẸP VÀ CHU ĐÁO, DỄ DÀNG CÀI ĐẶT, HỆ SINH THÁI NHÀ THÔNG MINH TOÀN DIỆN) bị **dồn ngang** vào cùng 1-2 dòng thay vì xếp dọc theo đúng thứ tự đọc như Word thật.

## Phương án sửa

### Tổng quát hoá `_convertFloatingImagesToInline()`

**Trước:** Match MỌI `<span` có `position: absolute`, tất cả đều chuyển thành `display:inline-block`.

**Sau:** Match MỌI `<span` có `position: absolute`, nhưng **phân biệt nội dung bên trong**:
- Nếu inner content chứa thẻ khối (`<p>`, `<h1>`-`<h6>`, `<div>`, `<ul>`, `<ol>`, `<table>`, `<blockquote>`) → `display:block`
- Nếu inner content chỉ chứa ảnh hoặc nội dung inline → `display:inline-block`

### Xử lý span lồng nhau

Dùng **tag counting**: đếm depth `<span>` mở ra + `</span>` đóng lại để tìm đúng closing tag.

**Cách làm:**
1. Duyệt từng `<span>` trong HTML
2. Nếu `style` chứa `position: absolute` → bắt đầu đếm
3. Đếm depth: mỗi `<span>` mở thêm +1, mỗi `</span>` giảm -1
4. Khi depth = 0 → tìm thấy closing tag đúng
5. Kiểm tra inner content: regex `/<(?:p|h[1-6]|div|ul|ol|table|blockquote)\b/i`
6. Xử lý style: bỏ `position: absolute`, `top`, `left`, thêm `display:block|inline-block; position: static`

## Files đã sửa

### 1. `adapters/libreoffice/writer/writer-adapter.js` (dòng ~1801)

Thay đổi trong `_convertFloatingImagesToInline(html)`:
- **Trước:** `style = "display:inline-block; position:static; ${style}".trim();`
- **Sau:** Kiểm tra inner content → `hasBlockContent ? "block" : "inline-block"`

### 2. `tests/unit/writer-floating-image-import.test.js`

Cập nhật test:
- Test #12: Textbox → `display:block` (thay vì `inline-block`)
- Test #20: Mixed types — sd-abs-pos (img) → `inline-block`, textbox+frame (p) → `block`

## Kết quả kiểm thử

### Automated
- **20/20 PASS | 0 FAIL** — writer-floating-image-import.test.js
- **91/91 files PASS** syntax check (`node scripts/check-syntax.js`)
- Tổng suite: 1563+ PASS (toàn bộ test suite)

### Visual — Cần test thủ công

File `file test/aquara  final (1) (2).docx` **KHÔNG có trong worktree này** (bị gitignore). Cần:
1. Mở file Aquara qua `python main.py` thật
2. Kiểm tra: 4 tiêu đề "CÂU CHUYỆN THƯƠNG HIỆU", "THIẾT KẾ ĐẸP VÀ CHU ĐÁO", "DỄ DÀNG CÀI ĐẶT", "HỆ SINH THÁI NHÀ THÔNG MINH TOÀN DIỆN" xếp **DỌC** theo đúng thứ tự đọc, mỗi tiêu đề xuống dòng riêng, không dồn chữ
3. Chụp màn hình xác nhận khớp với Word thật

## Kỹ thuật chi tiết — Tag counting + Block/Inline-block detection

```js
// Nguyên lý tìm closing tag đúng:
let depth = 1;
while (depth > 0 && searchFrom < src.length) {
  const nextOpen = spanOpenRe.exec(src);  // <span...>
  const nextClose = src.indexOf("</span>", searchFrom);
  if (nextClose === -1) break;
  if (nextOpen && nextOpen.index < nextClose) {
    depth += 1;  // span lồng nhau
    searchFrom = nextOpen.index + nextOpen[0].length;
  } else {
    depth -= 1;  // đóng span
    if (depth === 0) {
      // Phân biệt block vs inline-block dựa trên inner content
      const hasBlockContent = /<(?:p|h[1-6]|div|ul|ol|table|blockquote)\b/i.test(inner);
      const displayValue = hasBlockContent ? "block" : "inline-block";
      style = `display:${displayValue}; position:static; ${style}`.trim();
    }
    searchFrom = nextClose + "</span>".length;
  }
}
```

## Ranh giới an toàn

- KHÔNG commit file trong `file test/` hay ảnh chụp màn hình
- KHÔNG đụng `paginateContent()` (Print Preview)
- KHÔNG sửa `scripts/serve.js`
- Commit trên nhánh hiện tại, KHÔNG merge vào main, KHÔNG push

## Handoff cho agent tiếp theo

- **Branch:** nhánh hiện tại của worktree
- **Cần làm tiếp:** Test visual thủ công với file Aquara khi có LibreOffice + file test
- **Lưu ý:** Nếu file Aquara có watermark dùng `position: absolute` (giống lỗi trước), watermark cũng sẽ bị convert — đây là đánh đổi đã ghi nhận trong fix trước (HANDOFF-WRITER-FLOATING-IMAGE-OVERLAP.md)
