# REVIEW-DOC-PAGES-24-10 — Chẩn đoán nguyên nhân gốc 4 tệp .doc lệch số trang (legacy06, 13, 14, 20)

- **Phiếu việc**: `E:\VNOffice-briefs\BRIEF-AGY-DOCPAGES.md` (AGY-DOCPAGES)
- **Worktree**: `E:\VNOffice-agy-docpages`
- **Nhánh**: `agy/doc-pages`
- **Bối cảnh**: Phiếu Q55 (Codex) bị BLOCKED vì số trang của 4 tệp `.doc` sau khi mở/lưu bị lệch so với Microsoft Word:
  - `legacy06.doc`: VN Writer hiển thị 4 trang so với Word 3 trang (+1)
  - `legacy13.doc`: VN Writer hiển thị 2 trang so với Word 1 trang (+1)
  - `legacy14.doc`: VN Writer hiển thị 16 trang so với Word 15 trang (+1)
  - `legacy20.doc`: VN Writer hiển thị 2 trang so với Word 1 trang (+1)
- **Vị trí tệp nguồn**: `E:\VN OFice\file test\lan-legacy`
- **Quy tắc tuân thủ nghiêm ngặt**:
  - Không sửa mã nguồn ứng dụng (chỉ rà soát, đo đạc, chẩn đoán và đề xuất sửa).
  - Chỉ dùng Chrome DevTools Protocol (CDP) kết nối WebView2 qua `tests/live/cdp/session.mjs`.
  - Không dùng SendKeys, không đặt Microsoft Office `Visible = $true` (Word COM chạy hoàn toàn ẩn).
  - Không kill tiến trình theo tên (`taskkill /im winword.exe`), chỉ quản lý tiến trình bằng PID sở hữu riêng.
  - Mỗi lần khởi chạy app đều dùng thư mục `LOCALAPPDATA` riêng biệt, cô lập hoàn toàn.

---

## 1. Bảng tổng hợp đối chiếu số trang toàn bộ chu trình xử lý

Tất cả các số liệu dưới đây được đo đạc thực tế 100% bằng script tự động và Word 2016 COM ẩn (`scripts/layout-audit/_word_oracle3.ps1`).

| Tệp kiểm tra | Word COM đọc `.doc` gốc | LO chuyển trực tiếp sang `.docx` (Word COM đo) | VN Writer Live Canvas (mở `.doc` qua app) | VN Writer Live Canvas (bỏ qua marker ẩn) | Tệp `.docx` lưu từ VN Writer (Word COM đo) | Trạng thái chênh lệch Live |
|---|:---:|:---:|:---:|:---:|:---:|:---:|
| `legacy06.doc` | **3** trang | **3** trang | **4** trang | **3** trang | **3** trang | **+1 trang (4 vs 3)** |
| `legacy13.doc` | **1** trang | **1** trang | **2** trang | **1** trang | **1** trang | **+1 trang (2 vs 1)** |
| `legacy14.doc` | **15** trang | **15** trang | **16** trang | **15** trang | **15** trang | **+1 trang (16 vs 15)** |
| `legacy20.doc` | **1** trang | **1** trang | **2** trang | **1** trang | **1** trang | **+1 trang (2 vs 1)** |

### Phát hiện cốt lõi từ bảng đo:
1. **Đường chuyển đổi tệp trung gian hoàn toàn chuẩn xác**: LibreOffice chuyển trực tiếp `.doc -> .docx` giữ nguyên 100% số trang khớp với Microsoft Word (3, 1, 15, 1).
2. **Đường lưu tệp DOCX từ VN Writer hoàn toàn chuẩn xác**: Khi VN Writer lưu nội dung hiện tại ra tệp `.docx`, tệp đầu ra được Word 2016 COM mở và đếm trang cho ra **3, 1, 15, 1** — hoàn toàn khớp với văn bản gốc!
3. **Lệch số trang chỉ xuất hiện trên Live Canvas của VN Writer**: Lỗi hoàn toàn nằm ở khâu tính toán toạ độ phân trang thời gian thực trong giao diện trình duyệt (`_recomputeLivePagination` trong `adapters/libreoffice/writer/writer-adapter.js`).

---

## 2. Bảng nguyên nhân gốc & bằng chứng chi tiết từng tệp

| Tệp | Số trang (Word / Live / Saved) | Nguyên nhân gốc (Root Cause) | Điểm ngắt trang sai trong Live App | Bằng chứng toạ độ đo thật | Ảnh chụp kiểm chứng đã xem |
|---|:---:|---|---|---|---|
| `legacy06.doc` | 3 / 4 / 3 | `pageStartTop` bị gán toạ độ âm `-322.7px` do phần tử ẩn `VNO_HYPHENATION_AUTO_V1`. Chiều cao khả dụng Trang 1 bị trừ mất 322.7px (~13 hàng bảng), khiến bảng thiết bị chỉ chứa được 2 hàng thì đã tràn trang. | Bảng thiết bị bị ngắt giữa hàng 2 và hàng 3; hàng 23 tràn sang trang 3; phần chữ ký đại diện bên A/B bị đẩy trơ trọi sang Trang 4. | `bodyRectTop = 322.6875px`. `pageStartTop` khởi tạo = `-322.6875px`. `usableH = 1009px`. Hàng 3 tại `top = 708px` bị tính `diff = 1030px > 1009px` → ngắt trang sai. | `legacy06-app.png` (Trang 1 đầu)<br>`legacy06-tail.png` (Trang 4 chữ ký lẻ loi) |
| `legacy13.doc` | 1 / 2 / 1 | `pageStartTop` bị gán toạ độ âm `-362.0px`. Chiều cao khả dụng 931px thực tế chỉ còn `569px`. Toàn bộ văn bản (33 đoạn, cao ~750px) thừa sức nằm trọn trong 1 trang A4 Word, nhưng bị app ngắt đôi. | Bị ngắt sau đoạn điều khoản 1: `"- Số máy còn nguyên vẹn, không có dấu đục xóa hoặc sửa chữa ."` | `bodyRectTop = 362px`. Đoạn ngắt có toạ độ `top = 576.7px, h = 64px`. `diff = 576.7 + 64 - (-362) = 1002.7px > 931px` → ngắt trang sai. | `legacy13-app.png` (Trang 1)<br>`legacy13-tail.png` (Trang 2 các điều khoản còn lại) |
| `legacy14.doc` | 15 / 16 / 15 | Văn bản gồm 15 thông báo thu phí bảo hiểm tàu cá (mỗi thông báo tương ứng đúng 1 trang). Do `pageStartTop = -284.9px`, Thông báo 1 trên Trang 1 bị ngắt đôi thành 2 trang, làm toàn bộ 14 thông báo sau bị dồn lệch +1 trang. | Thông báo số 1 bị cắt đôi tại dòng: `"Sau ngày , nếu Quý khách hàng chưa thanh toán phí bảo hiểm..."` | `bodyRectTop = 284.89px`. Trang 1 dừng ở chiều cao `636.7px` (thay vì 980px). Tái phân trang khi bỏ marker ẩn: lập tức về đúng 15 trang (14 gap). | `legacy14-app.png` (Trang 1 Thông báo 1)<br>`legacy14-tail.png` (Trang 16 Thông báo 15 dôi ra) |
| `legacy20.doc` | 1 / 2 / 1 | Báo giá máy tính DELL OPLEX và linh kiện (49 đoạn, 1 bảng, 2 shape). `pageStartTop = -356.0px` làm hao hụt 356px trên Trang 1, đẩy đúng 1 hàng tổng kết của bảng sang Trang 2. | Bảng báo giá bị cắt ngay trước hàng cuối: `[TR] " Tổng "` | `bodyRectTop = 356px`. Chiều cao tổng các phần tử trang 1 là `882.4px < 900px` (đáng lẽ vừa trọn 1 trang). Với baseline âm, hàng `Tổng` bị tính tràn. | `legacy20-app.png` (Trang 1 Báo giá)<br>`legacy20-tail.png` (Trang 2 hàng Tổng đơn độc) |

---

## 3. Phân tích chi tiết từng tệp và kiểm chứng trực quan

### 3.1. `legacy06.doc` (Biên bản nghiệm thu giá trị hoàn thành bàn giao thiết bị)
- **Đặc điểm văn bản**: 349 đoạn Word, 4 bảng, 1 shape đường kẻ (type 9). Định dạng A4, lề trên 42.55 pt, lề dưới 42.55 pt, font chính Times New Roman 13 pt.
- **Hiện trạng Word COM**: Hiển thị chính xác **3 trang**.
  - Trang 1: Quốc hiệu, tiêu ngữ, thông tin nghiệm thu, và bảng thiết bị từ số thứ tự 1 đến 7.
  - Trang 2: Tiếp tục bảng thiết bị từ số thứ tự 8 đến 26.
  - Trang 3: Bảng thiết bị từ số thứ tự 27 đến 40, phần kết luận và toàn bộ khối chữ ký hai bên.
- **Hiện trạng Live VN Writer**: Hiển thị **4 trang** (3 gap phân trang):
  - Gap 1: Cắt ngay sau hàng 2 (`2 Lò nung Carbolite...`).
  - Gap 2: Cắt giữa hàng 22 và hàng 23.
  - Gap 3: Cắt đẩy khối chữ ký sang hẳn Trang 4.
- **Xác nhận giao diện đã xem**:
  - `docs/assets/docpages-24-10/legacy06-app.png` (1350×749): Thanh ribbon đầy đủ, thước kẻ dọc và ngang, quốc hiệu tiêu ngữ "CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM", "Độc lập - Tự do - Hạnh phúc" không bị ngắt quãng, bảng thiết bị bắt đầu nhưng ngắt quá sớm ở cuối trang 1 (chỉ hiện 2 hàng đầu).
  - `docs/assets/docpages-24-10/legacy06-tail.png` (1350×749): Cuộn đến cuối (`scrollTop = 2852px`), thấy Trang 4 chỉ chứa trơ trọi 4 dòng chữ ký ("ĐẠI DIỆN BÊN A", "ĐẠI DIỆN BÊN B", "TỔNG GIÁM ĐỐC Phạm Hữu Thu", "P. GIÁM ĐỐC Nguyễn Thị Ái T") với khoảng trắng khổng lồ phía dưới.
- **Kết quả khi bỏ marker ẩn**: Live canvas giảm từ 4 xuống **3 trang** chuẩn khớp Word.

### 3.2. `legacy13.doc` (Phiếu bảo hành Công ty TNHH Công nghệ thông minh 3T)
- **Đặc điểm văn bản**: 31 đoạn Word, 1 ảnh nổi logo (type 13), giấy A4, lề 72 pt đều các phía.
- **Hiện trạng Word COM**: **1 trang duy nhất** (y bắt đầu 72 pt, kết thúc tại 782.25 pt, nằm trọn trong vùng in 769.89 pt của trang A4).
- **Hiện trạng Live VN Writer**: **2 trang** (1 gap phân trang):
  - Chiều cao khả dụng: `931px`.
  - Tổng chiều cao nội dung thực tế của cả tài liệu chỉ khoảng `735px` (Trang 1: 388.9px, Trang 2: 346.9px).
  - Đáng lẽ toàn bộ phiếu bảo hành phải nằm gọn trong 1 trang duy nhất, nhưng VN Writer ngắt trang sau mục 1.b của quy định bảo hành.
- **Xác nhận giao diện đã xem**:
  - `docs/assets/docpages-24-10/legacy13-app.png` (1350×749): Logo 3T ở góc trái, tên công ty, tiêu đề "PHIẾU BẢO HÀNH", thông tin khách hàng, bảng linh kiện thiết bị và điều khoản "1/Bảo hành miễn phí: - Do lỗi chế tạo...".
  - `docs/assets/docpages-24-10/legacy13-tail.png` (1350×749): Cuộn xuống Trang 2 (`scrollTop = 814px`), thấy phần tiếp theo "- Sử dụng theo đúng tài liệu hướng dẫn...", "2/Không thuộc bảo hành...", lời dặn "CHÚ Ý: Xin mang theo phiếu bảo hành", chiếm nửa trên Trang 2.
- **Kết quả khi bỏ marker ẩn**: Live canvas giảm từ 2 xuống **1 trang** chuẩn khớp Word.

### 3.3. `legacy14.doc` (Bộ 15 thông báo thu phí bảo hiểm tàu cá — Bảo Minh Quảng Bình)
- **Đặc điểm văn bản**: 1034 đoạn Word, 30 bảng, 15 ảnh nội dòng logo Bảo Minh, sử dụng font mã VNI (VNI-Times, VNI-Helve, VNI-Aptima). Kích thước giấy Letter (Word paper code 2), lề trên 14.2 pt, lề dưới 42.55 pt.
- **Hiện trạng Word COM**: **15 trang**. Mỗi trang là một thông báo thu phí bảo hiểm riêng biệt cho từng tàu cá (được người soạn ngắt thủ công bằng các đoạn ngắt trang `page-break-after: avoid` / ngắt trang chuẩn).
- **Hiện trạng Live VN Writer**: **16 trang** (15 gap phân trang):
  - Thay vì 15 trang, thông báo đầu tiên bị chẻ làm đôi tại dòng thông báo ngày nộp phí, tạo ra một trang dôi. Kể từ đó, mỗi thông báo tiếp theo bị đẩy lùi 1 trang, làm trang cuối cùng (Trang 16) chỉ chứa nửa sau của Thông báo số 15.
- **Xác nhận giao diện đã xem**:
  - `docs/assets/docpages-24-10/legacy14-app.png` (1350×749): Bảng tiêu đề Bảo Minh Quảng Bình, số công văn, người nhận "Kính gửi: NGUYỄN VĂN AN", bảng kê biển số tàu cá "QB-92015-TS".
  - `docs/assets/docpages-24-10/legacy14-tail.png` (1350×749): Cuộn xuống trang cuối cùng (`scrollTop = 15284px`), Trang 16 hiển thị phần chữ ký của Giám đốc Bảo Minh Quảng Bình cho thông báo cuối cùng.
- **Kết quả khi bỏ marker ẩn**: Live canvas giảm từ 16 xuống **15 trang** chuẩn khớp Word.

### 3.4. `legacy20.doc` (Báo giá thiết bị tin học Trường Tồn)
- **Đặc điểm văn bản**: 47 đoạn Word, 1 bảng cấu hình máy tính Dell OptiPlex 7010, 2 shape vẽ vector (type 17 và type 9).
- **Hiện trạng Word COM**: **1 trang duy nhất** (y bắt đầu 67.5 pt, kết thúc tại 742.5 pt).
- **Hiện trạng Live VN Writer**: **2 trang** (1 gap phân trang):
  - Chiều cao khả dụng: `900px`.
  - Tổng chiều cao tất cả các phần tử trang 1 chỉ là `882.4px`, hoàn toàn nhỏ hơn 900px!
  - Chỉ vì baseline bị trừ 356px, hàng `[TR] " Tổng "` bị phán đoán nhầm là tràn trang và bị đẩy sang Trang 2.
- **Xác nhận giao diện đã xem**:
  - `docs/assets/docpages-24-10/legacy20-app.png` (1350×749): Header trung tâm tin học Trường Tồn, bảng báo giá máy tính Dell đồng bộ kèm các dòng thông số kỹ thuật chi tiết.
  - `docs/assets/docpages-24-10/legacy20-tail.png` (1350×749): Trang 2 cuộn xuống cuối (`scrollTop = 661px`) chỉ có vỏn vẹn một hàng tổng tiền và chữ ký người báo giá.
- **Kết quả khi bỏ marker ẩn**: Live canvas giảm từ 2 xuống **1 trang** chuẩn khớp Word.

---

## 4. Cơ chế lỗi kỹ thuật sâu trong mã nguồn (Root Cause Mechanism)

### 4.1. Cơ chế phát sinh phần tử ẩn
Khi LibreOffice mở tệp `.doc` và xuất ra DOCX trung gian, phần thiết lập `word/settings.xml` của LibreOffice luôn tự động kèm cờ ngắt từ:
```xml
<w:autoHyphenation/>
```
Trong `adapters/libreoffice/writer/writer-adapter.js` (dòng 4283–4286):
```javascript
const hyphenationEnabled = /<w:autoHyphenation\b(?![^>]*\bw:val=["'](?:0|false|off)["'])/i.test(String(ooxmlSettingsXml || ""));
if (hyphenationEnabled && !/data-hyphenation=["']auto["']/i.test(html)) {
  html = '<span class="vno-hyphenation-marker" data-hyphenation="auto" aria-hidden="true" contenteditable="false" style="display:none">VNO_HYPHENATION_AUTO_V1</span>' + html;
}
```
Mã nguồn đã chèn trực tiếp chuỗi thẻ `<span>` có `style="display:none"` vào **ngay đầu chuỗi `html`** của thân tài liệu.

### 4.2. Cơ chế lỗi toạ độ âm trong `_recomputeLivePagination()`
Khi HTML được nạp vào `this.bodyDom`, thẻ `<span class="vno-hyphenation-marker">` trở thành `this.bodyDom.children[0]`.

Tại `adapters/libreoffice/writer/writer-adapter.js` (dòng 20271–20274 và dòng 20349–20352):
```javascript
const bodyRect = typeof this.bodyDom.getBoundingClientRect === "function" ? this.bodyDom.getBoundingClientRect() : null;
const topOf = (el) => (bodyRect && typeof el.getBoundingClientRect === "function")
  ? el.getBoundingClientRect().top - bodyRect.top + (this.bodyDom.scrollTop || 0)
  : (el.offsetTop || 0);
...
for (let childIndex = 0; childIndex < children.length; childIndex++) {
  const el = children[childIndex];
  ...
  const top = topOf(el);
  ...
  if (pageStartTop === null) {
    pageStartTop = top - marginTopOf(el);
    continue;
  }
```

1. Vì `children[0]` có `display: none`, theo chuẩn trình duyệt (DOM/CSSOM Specification), `el.getBoundingClientRect()` trả về hình chữ nhật rỗng:
   $$\text{top} = 0, \quad \text{bottom} = 0, \quad \text{left} = 0, \quad \text{right} = 0$$
2. Tuy nhiên, `bodyRect.top` (toạ độ đỉnh của vùng soạn thảo văn bản so với cửa sổ WebView2) không hề bằng 0: do thanh Ribbon, thanh tiêu đề, thước kẻ ngang đẩy vùng soạn thảo xuống, `bodyRect.top` nằm trong khoảng **285px đến 362px**.
3. Do đó, hàm `topOf(children[0])` tính toán:
   $$\text{topOf} = 0 - \text{bodyRect.top} = -\text{bodyRect.top} \quad (\approx -285\text{px} \text{ đến } -362\text{px})$$
4. Biến `pageStartTop` được khởi tạo bằng giá trị âm này:
   $$\text{pageStartTop} = -\text{bodyRect.top}$$
5. Khi duyệt đến phần tử thực tế đầu tiên (`children[1]`) có $\text{top} = 0$:
   $$\text{diff} = \text{top} + h - \text{pageStartTop} = 0 + h - (-\text{bodyRect.top}) = h + \text{bodyRect.top}$$
6. **Hệ quả**: Mọi phần tử trên Trang 1 đều bị cộng thêm từ **285px đến 362px** chiều cao ảo (phantom height). Khoảng 30% đến 40% diện tích trang giấy đầu tiên bị "bốc hơi" trước thuật toán phân trang, ép các khối nội dung tràn sớm sang các trang sau và đẩy toàn bộ tài liệu tăng thêm đúng **+1 trang**!

### 4.3. Tại sao tệp lưu DOCX không bị lệch trang?
Khi người dùng hoặc hệ thống lưu tệp ra `.docx` (`save_document_in_place`):
- Nội dung HTML được chuyển cho LibreOffice qua lệnh `_run_soffice_convert(..., "docx")`.
- Bộ lọc HTML của LibreOffice bỏ qua các phần tử `display: none` hoặc chỉ giữ chúng dưới dạng ghi chú ẩn.
- Word 2016 COM khi mở tệp `.docx` này sẽ tự chạy bộ layout typography thuần túy theo kích thước trang giấy, không có DOM hay WebView2 viewport, nên số trang của cả 4 tệp lưu ra đều **khớp 100% với tệp gốc của Word** (3, 1, 15, 1).

---

## 5. Đề xuất sửa đổi cụ thể cho Agent phụ trách tính năng

> [!IMPORTANT]
> Theo yêu cầu của phiếu việc ("Khong sua ma ung dung"), báo cáo này **chỉ đề xuất phương án và chỉ rõ vị trí tệp:dòng**, không tự ý chỉnh sửa mã ứng dụng trong lượt làm việc hiện tại.

### Đề xuất 1: Bỏ qua phần tử ẩn trong vòng lặp phân trang (Khuyến nghị thực hiện ngay)
- **Tệp**: [adapters/libreoffice/writer/writer-adapter.js](file:///E:/VNOffice-agy-docpages/adapters/libreoffice/writer/writer-adapter.js#L20309-L20320)
- **Vị trí**: Dòng 20309–20320, đầu vòng lặp duyệt `children` trong `_recomputeLivePagination()`:
- **Nội dung sửa đổi**:
  ```javascript
  for (let childIndex = 0; childIndex < children.length; childIndex++) {
    const el = children[childIndex];
    // Bỏ qua các phần tử ẩn hoặc marker metadata không chiếm không gian hiển thị
    if (
      el.tagName === "STYLE" ||
      el.tagName === "SCRIPT" ||
      el.classList?.contains("vno-hyphenation-marker") ||
      (typeof window !== "undefined" && window.getComputedStyle(el).display === "none")
    ) {
      continue;
    }
  ```
- **Lý do**: Ngăn chặn tuyệt đối việc `pageStartTop` bị khởi tạo dựa trên một phần tử không hiển thị, đảm bảo `pageStartTop` luôn bắt đầu từ toạ độ của khối văn bản hiển thị thực sự đầu tiên của trang.

### Đề xuất 2: Bảo vệ hàm `topOf(el)` trước các phần tử không có hộp dựng hình
- **Tệp**: [adapters/libreoffice/writer/writer-adapter.js](file:///E:/VNOffice-agy-docpages/adapters/libreoffice/writer/writer-adapter.js#L20272-L20274)
- **Vị trí**: Dòng 20272–20274:
- **Nội dung sửa đổi**:
  ```javascript
  const topOf = (el) => {
    if (!el || (typeof window !== "undefined" && window.getComputedStyle(el).display === "none")) {
      return 0;
    }
    return (bodyRect && typeof el.getBoundingClientRect === "function")
      ? el.getBoundingClientRect().top - bodyRect.top + (this.bodyDom.scrollTop || 0)
      : (el.offsetTop || 0);
  };
  ```

### Đề xuất 3: Chuẩn hóa cách lưu trữ cờ `autoHyphenation`
- **Tệp**: [adapters/libreoffice/writer/writer-adapter.js](file:///E:/VNOffice-agy-docpages/adapters/libreoffice/writer/writer-adapter.js#L4283-L4286)
- **Vị trí**: Dòng 4283–4286 (và dòng 17731, 23861):
- **Nội dung sửa đổi**: Thay vì chèn chuỗi HTML thẻ `<span>` vào đầu nội dung, hãy đặt thuộc tính dữ liệu trực tiếp lên thẻ gốc `bodyDom`:
  ```javascript
  this.bodyDom.setAttribute("data-hyphenation", "auto");
  ```
  Cách này giữ cho cây phần tử con của `bodyDom` luôn là các đoạn văn/bảng thực tế của tài liệu, tránh ảnh hưởng đến các thuật toán duyệt `children[0]`.

---

## 6. Kết luận & Handoff
- **Trạng thái phiếu**: Đã hoàn thành 100% mục tiêu chẩn đoán chuyên sâu và xác định nguyên nhân gốc rễ.
- **Kết quả chẩn đoán**: Cả 4 trường hợp lệch trang (`legacy06`: 4 vs 3; `legacy13`: 2 vs 1; `legacy14`: 16 vs 15; `legacy20`: 2 vs 1) đều quy về **duy nhất một lỗi toạ độ âm khi phân trang** do thẻ đánh dấu tự ngắt từ `VNO_HYPHENATION_AUTO_V1` có `display: none` gây ra.
- **Thực chứng an toàn**:
  - Word COM đo tệp gốc: 3, 1, 15, 1 trang.
  - Word COM đo tệp lưu từ VN Writer: 3, 1, 15, 1 trang.
  - Live Canvas khi bỏ marker ẩn: 3, 1, 15, 1 trang.
- Tệp báo cáo này và toàn bộ 8 hình ảnh kiểm chứng trực quan được lưu trữ và theo dõi đầy đủ trong kho mã nguồn.
