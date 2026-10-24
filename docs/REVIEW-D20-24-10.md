# Báo cáo điều tra hồi quy số trang d20.docx (Word gốc = 3 trang, lưu ra 4 trang)

- **Mã phiếu**: AGY-D20
- **Ngày thực hiện**: 24/10/2026
- **Tệp kiểm thử**: `E:\VN OFice\file test\landocx\d20.docx` (Word 2016 COM gốc: **3 trang**)
- **Worktree thực hiện**: `E:\VNOffice-agy-D20`
- **Lệnh kiểm thử**: `python scripts/layout-audit/batch_document_audit.py docx E:\VNOffice-agy-D20 "E:\VN OFice\file test\landocx" <outdir> d20.docx`

---

## 1. Tóm tắt kết luận (Executive Summary)

1. **Khẳng định tính ổn định & Loại trừ biến thiên môi trường**:
   - Hiện tượng `d20.docx` lưu ra **4 trang** (FAIL) trên HEAD `main` (`d4f79ce9`) là **ổn định 100%** qua cả 6 lượt đo độc lập (3 lượt với `LOCALAPPDATA` sạch và 3 lượt với `LOCALAPPDATA` ấm/cache WebView2).
   - Trên mốc `cc035e3f` (~13:55 24/10), kết quả cũng **ổn định 100% đạt 3 trang** (PASS) qua 6 lượt đo độc lập (3 sạch, 3 ấm).
   - Số trang đo bởi Word COM oracle (`_word_oracle3.ps1`) cho tệp gốc luôn luôn là **3 trang**.
   - Không có ảnh hưởng từ tiến trình Word chạy ngầm (Word COM chạy cô lập theo PID và dọn sạch sau kiểm tra), không phụ thuộc font hệ thống, không phụ thuộc cache profile hay soffice.

2. **Commit gây ra hồi quy**:
   - Qua quy trình Git bisect và kiểm chứng từng mốc, commit chính xác gây ra lỗi là:
     - **Commit SHA**: `069bdb6cea8142d1f4528606380833f2abd0e6a9`
     - **Tác giả / Tiêu đề**: `fix(writer): repair imported Vietnamese word spacing`
     - **Thuộc nhánh**: `codex/queue-19-10` (nhánh con Q55/Q56), sau đó được gộp vào `main` trong commit merge `c789cdd9` (Merge commit `3397d16bba78a7c054296353e55bd44135cf34be`).
   - Mốc ngay trước commit lỗi: `02dab6f0` (parent của `069bdb6c`) cho kết quả **3/3 lượt PASS** (Word=3, saved=3).
   - Ngay tại commit `069bdb6c`, kết quả lập tức chuyển thành **3/3 lượt FAIL** (Word=3, saved=4).

---

## 2. Bảng số liệu kiểm thử thực tế (Real Benchmark Parity Table)

Mọi dữ liệu dưới đây đều được chạy thực tế trong phiên làm việc, không qua trung gian:

| Mốc Commit | Trạng thái Profile | Lần chạy | Word gốc | Lưu ra (saved) | Trạng thái | Thời gian | Ghi chú |
|:---|:---|:---:|:---:|:---:|:---:|:---:|:---|
| **d4f79ce9** (HEAD main) | Clean LOCALAPPDATA | 1 | 3 | 4 | **FAIL** | 46.8s | Khởi động sạch mkdtemp |
| **d4f79ce9** (HEAD main) | Clean LOCALAPPDATA | 2 | 3 | 4 | **FAIL** | 43.6s | Khởi động sạch mkdtemp |
| **d4f79ce9** (HEAD main) | Clean LOCALAPPDATA | 3 | 3 | 4 | **FAIL** | 43.1s | Khởi động sạch mkdtemp |
| **d4f79ce9** (HEAD main) | Warm LOCALAPPDATA | 1 | 3 | 4 | **FAIL** | 49.8s | Lượt đầu tạo thư mục ấm |
| **d4f79ce9** (HEAD main) | Warm LOCALAPPDATA | 2 | 3 | 4 | **FAIL** | 31.3s | Tái sử dụng cache ấm (nhanh hơn) |
| **d4f79ce9** (HEAD main) | Warm LOCALAPPDATA | 3 | 3 | 4 | **FAIL** | 31.7s | Tái sử dụng cache ấm |
| **cc035e3f** (~13:55 24/10) | Clean LOCALAPPDATA | 1 | 3 | 3 | **PASS** | 46.2s | Khởi động sạch |
| **cc035e3f** (~13:55 24/10) | Clean LOCALAPPDATA | 2 | 3 | 3 | **PASS** | 42.6s | Khởi động sạch |
| **cc035e3f** (~13:55 24/10) | Clean LOCALAPPDATA | 3 | 3 | 3 | **PASS** | 47.3s | Khởi động sạch |
| **cc035e3f** (~13:55 24/10) | Warm LOCALAPPDATA | 1 | 3 | 3 | **PASS** | 38.5s | Lượt đầu tạo ấm |
| **cc035e3f** (~13:55 24/10) | Warm LOCALAPPDATA | 2 | 3 | 3 | **PASS** | 34.2s | Tái sử dụng cache ấm |
| **cc035e3f** (~13:55 24/10) | Warm LOCALAPPDATA | 3 | 3 | 3 | **PASS** | 33.4s | Tái sử dụng cache ấm |
| **c522e44b** (main trước gộp Q56) | Clean LOCALAPPDATA | 1 | 3 | 3 | **PASS** | 50.1s | Chưa gộp Q56 |
| **c789cdd9** (main gộp Q56) | Clean LOCALAPPDATA | 1 | 3 | 4 | **FAIL** | 50.2s | Ngay sau khi gộp Q56 vào main |
| **02dab6f0** (parent của `069bdb6c`) | Clean LOCALAPPDATA | 1 | 3 | 3 | **PASS** | 45.8s | Trước khi áp dụng sửa spacing |
| **02dab6f0** (parent của `069bdb6c`) | Clean LOCALAPPDATA | 2 | 3 | 3 | **PASS** | 49.6s | Kiểm chứng lặp lại sạch |
| **02dab6f0** (parent của `069bdb6c`) | Warm LOCALAPPDATA | 3 | 3 | 3 | **PASS** | 33.0s | Kiểm chứng lặp lại ấm |
| **069bdb6c** (fix word spacing) | Clean LOCALAPPDATA | 1 | 3 | 4 | **FAIL** | 45.8s | Lập tức hồi quy sang 4 trang |
| **069bdb6c** (fix word spacing) | Clean LOCALAPPDATA | 2 | 3 | 4 | **FAIL** | 48.8s | Kiểm chứng lặp lại sạch |
| **069bdb6c** (fix word spacing) | Warm LOCALAPPDATA | 3 | 3 | 4 | **FAIL** | 34.4s | Kiểm chứng lặp lại ấm |

---

## 3. Phân tích nguyên nhân gốc rễ (Root Cause Analysis)

### 3.1. Cơ chế của Commit `069bdb6c`
Commit `069bdb6c` thêm hàm `_repairImportedTextWhitespaceFromOoxml` vào `adapters/libreoffice/writer/writer-adapter.js` (dòng 8404–8480) và gọi hàm này ngay sau khi gán HTML nhập khẩu vào `this.bodyDom` (dòng 18858).

Mục đích ban đầu của hàm: Sửa lỗi LibreOffice HTML import làm tách các ký tự tiếng Việt hoặc chèn khoảng trắng vô lý quanh các đối tượng hình nổi (floating image).

### 3.2. Lỗ hổng kỹ thuật trong thuật toán của hàm
1. **Trích xuất nguồn OOXML thiếu thẻ `<w:tab/>`**:
   - Tại dòng 8406–8410:
     ```javascript
     const sourceParagraphs = [...String(documentXml).matchAll(/<w:p\b[^>]*>([\s\S]*?)<\/w:p>/gi)].map((paragraph) =>
       [...paragraph[1].matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/gi)]
         .map((text) => this._decodeXmlEntities(text[1]))
         .join("")
     ).filter(Boolean);
     ```
   - Biểu thức chính quy **chỉ lấy nội dung bên trong `<w:t>`**, hoàn toàn bỏ qua các thẻ điểm dừng tab `<w:tab/>` (và các ngắt dòng `<w:br/>`).
   - Trong `d20.docx`, rất nhiều đoạn văn bản trong bảng và tiêu đề sử dụng phím Tab (`<w:tab/>`) để tạo các cột canh chỉnh, ví dụ:
     - Đoạn tiêu đề tàu: `Actual ship value<w:tab/>Whereof<w:tab/>Hull<w:tab/>Machinery<w:tab/>Equipment`
     - Đoạn giá trị thực tế: `Giátrịthựctế của tàu (*): 1.500.000. 000 đồng<w:tab/>Trong đó (*):<w:tab/>Vỏ (%):50<w:tab/>Máy móc (%):40<w:tab/>Trangthiếtbị (%):10`
     - Đoạn checkbox: `FORMCHECKBOX<w:tab/>Cóvay<w:tab/>FORMCHECKBOX<w:tab/>Khôngvay`
   - Khi `_repairImportedTextWhitespaceFromOoxml` trích xuất `sourceParagraphs`, chuỗi nguồn bị mất toàn bộ tab và khoảng cách giữa các từ, biến thành:
     `Actual ship valueWhereofHullMachineryEquipment`, `CóvayKhôngvay`, ...

2. **So khớp xóa nhầm toàn bộ ký tự `\t` trong DOM**:
   - Trong DOM (được LibreOffice import ra HTML), các thẻ `<w:tab/>` được chuyển thành ký tự tab thật `\t`.
   - Hàm chuẩn hóa chuỗi không có khoảng trắng:
     `const compactActual = actualText.replace(/\s/gu, "");`
     Vì `\s` bao gồm cả `\t`, `compactActual` khớp hoàn toàn với `source.replace(/\s/gu, "")`.
   - Tạo chữ ký `targetSignature`: vì chuỗi trích xuất từ XML không có tab giữa `value` và `Whereof`, vị trí ranh giới giữa hai từ này nhận giá trị `"0"` (không được có khoảng trắng).
   - Đoạn quét xóa tại dòng 8462–8475:
     ```javascript
     if (targetSignature[boundary] !== "0") continue;
     ...
     if (localStart >= localEnd || !/^\s+$/u.test(segment.value.slice(localStart, localEnd))) continue;
     ```
     Vì ký tự `\t` nằm trong tập `/^\s+$/u`, thuật toán coi toàn bộ các dấu Tab `\t` là **"khoảng trắng rác do LibreOffice tạo ra"** và **cắt bỏ hoàn toàn các ký tự `\t`** khỏi text node của DOM!

3. **Hậu quả dây chuyền tại tầng khôi phục định dạng OOXML (`ooxml_zip_patch.py`)**:
   - Khi tài liệu được lưu ra DOCX, `adapters/libreoffice/common/ooxml_zip_patch.py` thực hiện so khớp LCS giữa các đoạn văn chuyển đổi và đoạn văn nguồn để khôi phục thuộc tính đoạn Word gốc (`_restore_writer_matched_formatting`).
   - Trước đây (tại W35c, xem ghi chú dòng 20044–20045 của `ooxml_zip_patch.py`), hệ thống đã xử lý riêng cho `d20.docx`:
     ```python
     def _paragraph_plain_text(paragraph_xml: str) -> str:
         # W35c: <w:tab/> = khoảng trắng (d20 "Actual ship value<tab>Whereof…": LibreOffice xuất tab thành dấu cách nên
         # khoá chữ nguồn/bản chuyển đổi lệch → đoạn không được ghép, giữ spacing 283 của LibreOffice)
         parts = re.findall(r"<w:t\b[^>]*>([\s\S]*?)</w:t\s*>|(<w:tab\b[^>]*/>)", paragraph_xml, re.IGNORECASE)
         text = "".join(part[0] if part[0] else " " for part in parts)
         text = re.sub(r"<[^>]+>", "", text)
         return re.sub(r"\s+", " ", text).strip()
     ```
   - Trong tệp gốc, `_paragraph_plain_text` thay `<w:tab/>` bằng `" "` nên chuỗi khóa là:
     `"Actual ship value Whereof Hull Machinery Equipment"`.
   - Nhưng sau khi `_repairImportedTextWhitespaceFromOoxml` xóa mất `\t` trong DOM, LibreOffice xuất ra HTML và chuyển sang DOCX với chuỗi chữ dính liền:
     `"Actual ship valueWhereofHullMachineryEquipment"`.
   - Kết quả: **Hai chuỗi khóa không còn khớp nhau!**
   - Thuật toán LCS không thể ghép cặp các đoạn này với đoạn nguồn tương ứng.
   - Do không ghép cặp được, các đoạn văn này **không được khôi phục `pPr` gốc của Word** (về khoảng cách `w:spacing`, `w:tabs`, lề).
   - Thay vào đó, chúng bị giữ lại giá trị khoảng cách mặc định của LibreOffice: `w:spacing w:after="283"` (tương đương 14.15 pt khoảng cách dưới mỗi đoạn).
   - Hơn 5 đoạn văn và hàng bảng trong `d20.docx` bị phình thêm khoảng cách 283 dxl, đẩy dồn toàn bộ layout của trang 3 tràn sang trang 4.

---

## 4. Đề xuất sửa đổi cụ thể (File & Line Proposals)

Tuân thủ nghiêm ngặt quy định: Không sửa mã ứng dụng trong phiếu việc AGY-D20. Dưới đây là phương án sửa cụ thể từng dòng cho agent phụ trách code tiếp theo:

### 4.1. Tệp `adapters/libreoffice/writer/writer-adapter.js`

1. **Dòng 8406–8410: Trích xuất cả thẻ `<w:tab/>` và `<w:br/>` từ OOXML gốc**
   - *Hiện tại*:
     ```javascript
     const sourceParagraphs = [...String(documentXml).matchAll(/<w:p\b[^>]*>([\s\S]*?)<\/w:p>/gi)].map((paragraph) =>
       [...paragraph[1].matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/gi)]
         .map((text) => this._decodeXmlEntities(text[1]))
         .join("")
     ).filter(Boolean);
     ```
   - *Đề xuất sửa*:
     Bóc tách cả thẻ `<w:tab\b[^>]*\/?>` thành ký tự `\t` (hoặc khoảng cách) để chuỗi nguồn phản ánh đúng cấu trúc văn bản có phân tách tab:
     ```javascript
     const sourceParagraphs = [...String(documentXml).matchAll(/<w:p\b[^>]*>([\s\S]*?)<\/w:p>/gi)].map((paragraph) =>
       [...paragraph[1].matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>|<w:tab\b[^>]*\/?>/gi)]
         .map((match) => (match[1] !== undefined ? this._decodeXmlEntities(match[1]) : "\t"))
         .join("")
     ).filter(Boolean);
     ```

2. **Dòng 8470: Không bao giờ xóa ký tự tab `\t`**
   - *Hiện tại*:
     ```javascript
     if (localStart >= localEnd || !/^\s+$/u.test(segment.value.slice(localStart, localEnd))) continue;
     ```
   - *Đề xuất sửa*:
     Thêm điều kiện kiểm tra không chứa `\t`. Khoảng trắng do tabstop là cố ý trong bố cục, không phải khoảng cách rác sinh ra do phân mảnh từ tiếng Việt:
     ```javascript
     const slice = segment.value.slice(localStart, localEnd);
     if (localStart >= localEnd || !/^\s+$/u.test(slice) || slice.includes("\t")) continue;
     ```

3. **Bổ sung Unit Test vào `tests/unit/writer-floating-image-import.test.js`**
   - Thêm test case cho trường hợp đoạn văn có `<w:tab/>` nằm xen kẽ giữa các run chữ (như `d20.docx`):
     ```javascript
     test("Imported spacing repair preserves tabs from OOXML", () => {
       const textNode = (value) => ({ nodeType: 3, nodeValue: value });
       const paragraph = (values) => ({
         nodeType: 1,
         childNodes: values.map(textNode),
         get textContent() { return this.childNodes.map(c => c.nodeValue).join(""); }
       });
       const tabPara = paragraph(["Actual ship value\tWhereof\tHull"]);
       const xml = '<w:document><w:body><w:p><w:r><w:t>Actual ship value</w:t><w:tab/><w:t>Whereof</w:t><w:tab/><w:t>Hull</w:t></w:r></w:p></w:body></w:document>';
       const adapter = new WriterAdapter(null);
       adapter._repairImportedTextWhitespaceFromOoxml({ querySelectorAll: () => [tabPara] }, xml);
       check(tabPara.textContent === "Actual ship value\tWhereof\tHull", `Tab was stripped: ${JSON.stringify(tabPara.textContent)}`);
     });
     ```
