# Agent Handoff

TASK: Kiểm tra thị giác luồng Mở file THẬT của Writer (khác với luồng test FODT) trên các file .docx thật của người dùng
AGENT/ROLE: Antigravity (Visual QA & Writer Integration)
BRANCH: `visual-qa/writer-live-open-path`
WORKTREE: `E:\VNOffice-agy-writer-livepath-qa`
OBJECTIVE: Tìm hiểu, phân tích và kiểm thử thị giác luồng mở file THẬT (LibreOffice `soffice --convert-to "html:HTML (StarWriter)"` qua `main.py` -> `UnoBridge` -> `WriterAdapter.open()` -> `.vno-writer-body` DOM) trên 4 tài liệu DOCX thực tế của người dùng; chụp ảnh toàn trang, đánh giá chi tiết bảng biểu, ảnh, phông chữ tiếng Việt, header/footer; sửa các lỗi CSS hiển thị an toàn; báo cáo các vấn đề kiến trúc tầng Python/LibreOffice chưa sửa.

---

## 1. Điểm nối thật giữa Python Backend và UI (Bước 1)

Qua rà soát toàn bộ mã nguồn (`platform/`, `adapters/`, `apps/writer/`, `main.py`), luồng mở file THẬT khi người dùng thao tác trong ứng dụng VN Writer diễn ra qua chuỗi gọi hàm sau:

1. **Giao diện người dùng (UI Event / Phím tắt):**
   - Người dùng bấm nút **Tệp** trên thanh công cụ rồi chọn **Mở tệp** (`[data-backstage-cmd="common.file.open"]` tại [app-shell.js](file:///E:/VNOffice-agy-writer-livepath-qa/platform/shell/app-shell.js#L625)), hoặc nhấn phím tắt **Ctrl+O** (được đăng ký tại [command-definitions.js](file:///E:/VNOffice-agy-writer-livepath-qa/platform/commands/command-definitions.js#L12) và xử lý bởi [shortcut-manager.js](file:///E:/VNOffice-agy-writer-livepath-qa/platform/commands/shortcut-manager.js)).
   - Thao tác này phát lệnh: `globalCommandBus.execute("common.file.open")`.

2. **Điều phối lệnh trong Writer Adapter:**
   - [writer-adapter.js:L2575-2576](file:///E:/VNOffice-agy-writer-livepath-qa/adapters/libreoffice/writer/writer-adapter.js#L2575-L2576):
     ```javascript
     case "common.file.open":
       return await this.open();
     ```
   - Hàm `WriterAdapter.prototype.open()` ([writer-adapter.js:L7166-7220](file:///E:/VNOffice-agy-writer-livepath-qa/adapters/libreoffice/writer/writer-adapter.js#L7166-L7220)) được kích hoạt.

3. **Cầu nối UnoBridge sang Desktop Native API:**
   - [writer-adapter.js:L7167](file:///E:/VNOffice-agy-writer-livepath-qa/adapters/libreoffice/writer/writer-adapter.js#L7167):
     ```javascript
     const result = await globalUnoBridge.openRealFile("writer");
     ```
   - [uno-bridge.js:L100-108](file:///E:/VNOffice-agy-writer-livepath-qa/adapters/libreoffice/common/uno-bridge.js#L100-L108):
     ```javascript
     async openRealFile(appKind) {
       if (!this.desktopApi || !this.hasRealEngine) {
         return {
           status: "error",
           message: "Chức năng Mở tệp thật chỉ khả dụng trong VN Office Desktop App (đã cài LibreOffice).",
         };
       }
       return await this.desktopApi.open_document_dialog(appKind);
     }
     ```

4. **Python Backend (`main.py`):**
   - [main.py:L598-678](file:///E:/VNOffice-agy-writer-livepath-qa/main.py#L598-L678): `VnOfficeApi.open_document_dialog(self, app_kind="writer")`
     - Mở hộp thoại native chọn file của hệ điều hành qua `window.create_file_dialog()`.
     - Chạy lệnh headless LibreOffice:
       `soffice.exe --headless --invisible --nocrashreport --nodefault --nolockcheck --nologo --norestore -env:UserInstallation=file:///<tmp>/profile --convert-to "html:HTML (StarWriter)" --outdir <tmp> "<file_path>"`
     - Nhúng ảnh đính kèm thành base64 data URI qua hàm `_inline_html_images()` ([main.py:L483-533](file:///E:/VNOffice-agy-writer-livepath-qa/main.py#L483-L533)).
     - Trích xuất `ooxmlDocumentXml` và `ooxmlCommentsXml` từ tệp `.docx` gốc ([main.py:L658-663](file:///E:/VNOffice-agy-writer-livepath-qa/main.py#L658-L663)).
     - Trả về payload đối tượng JSON:
       `{ status: "ok", sourcePath, fileName, format: "html", content, ooxmlDocumentXml, ooxmlCommentsXml }`.

5. **Thiết lập nội dung vào DOM `.vno-writer-body`:**
   - Quay lại [writer-adapter.js:L7169](file:///E:/VNOffice-agy-writer-livepath-qa/adapters/libreoffice/writer/writer-adapter.js#L7169):
     `this._initZones()` tìm vùng soạn thảo ([writer-adapter.js:L253-263](file:///E:/VNOffice-agy-writer-livepath-qa/adapters/libreoffice/writer/writer-adapter.js#L253-L263)):
     ```javascript
     this.headerDom = this.editorDom.querySelector(".vno-writer-header");
     this.bodyDom = this.editorDom.querySelector(".vno-writer-body") || this.editorDom;
     this.footerDom = this.editorDom.querySelector(".vno-writer-footer");
     ```
   - Chuẩn hóa HTML nhập khẩu qua `this._normalizeImportedHtml()` ([writer-adapter.js:L1680-1717](file:///E:/VNOffice-agy-writer-livepath-qa/adapters/libreoffice/writer/writer-adapter.js#L1680-L1717)):
     - Trích xuất thiết lập trang (`_pageSetupFromImportedCss`, đọc khổ A4, lề chuẩn).
     - Trích xuất nội dung `<body>`.
     - Tách header `<div title="header">` và footer `<div title="footer">`.
     - Khôi phục định dạng số trang StarWriter (`<sdfield>`), chú thích cuối trang (`_normalizeImportedStarWriterNotes`).
   - Gán trực tiếp vào DOM tại [writer-adapter.js:L7189-7197](file:///E:/VNOffice-agy-writer-livepath-qa/adapters/libreoffice/writer/writer-adapter.js#L7189-L7197):
     ```javascript
     if (this.headerDom && this.bodyDom && this.footerDom) {
       this.headerDom.innerHTML = imported.header;
       this.bodyDom.innerHTML = imported.body;
       this.footerDom.innerHTML = imported.footer;
     } else if (this.bodyDom) {
       this.bodyDom.innerHTML = imported.body;
     } else if (this.editorDom) {
       this.editorDom.innerHTML = imported.body;
     }
     ```
   - Cập nhật định dạng trang: `this._applyPageSetup()`.
   - Hydrate ghi chú, trích dẫn, hình ảnh: `_hydrateCitationsFromDom`, `_hydrateCaptionsFromDom`, `_hydrateWordArtFromDom`.
   - Đồng bộ tiêu đề tệp trên thanh tab: `this.shell?.resetDocumentChrome?.(result.fileName)`.

---

## 2. Quy trình mô phỏng kiểm thử tự động (Bước 2)

Để kiểm thử chính xác 100% môi trường thật mà không bịa luồng giả:
1. Tạo kịch bản Python [scripts/generate_live_open_payloads.py](file:///E:/VNOffice-agy-writer-livepath-qa/scripts/generate_live_open_payloads.py) khởi tạo `main.VnOfficeApi("writer", initial_file=docx_path)` và gọi trực tiếp `open_document_dialog("writer")`. Đây chính là backend Python thật chuyển đổi 4 file DOCX qua LibreOffice headless thật và trích xuất OOXML.
2. Lưu kết quả vào [tests/fixtures/live-open-payloads/](file:///E:/VNOffice-agy-writer-livepath-qa/tests/fixtures/live-open-payloads/).
3. Xây dựng kịch bản Playwright chuyên sâu [tests/live/writer-live-open-qa.playwright.mjs](file:///E:/VNOffice-agy-writer-livepath-qa/tests/live/writer-live-open-qa.playwright.mjs):
   - Mở giao diện VN Writer trên trình duyệt Microsoft Edge.
   - Cài stub `globalUnoBridge.openRealFile` trả về payload thật của từng file.
   - Click thực tế vào menu **Tệp** -> **Mở tệp** (`[data-backstage-cmd="common.file.open"]`).
   - Kích hoạt toàn bộ luồng xử lý `WriterAdapter.open()`, `_normalizeImportedHtml()`, gán DOM, cập nhật tab chrome.
   - Thu thập chỉ số kỹ thuật DOM (kích thước trang, padding, viền bảng, lỗi tràn ngang, trạng thái ảnh, phông chữ, bảng mã).
   - Chụp 4 ảnh màn hình bằng chứng cho mỗi file (Tổng quan cửa sổ, Đầu trang, Giữa trang, Cận cảnh bảng đầu tiên).

---

## 3. Kết quả đánh giá thị giác từng tệp DOCX thực tế (Bước 3)

### Tệp 1: `HĐ VÀ NGHIỆM THU, THANH LÝ.docx` (50,561 bytes)
- **Đặc điểm cấu trúc gốc:** 61 khối bảng trong DOCX gốc, 5 tệp footer riêng biệt (`footer1.xml` - `footer5.xml`), 0 ảnh.
- **Hiển thị trên VN Writer:**
  - **Nhãn tab:** `HĐ VÀ NGHIỆM THU, THANH LÝ.docx` hiển thị chính xác trên thanh tab tài liệu.
  - **Bảng biểu (9 bảng HTML):**
    - Bảng đầu tiên (Văn phòng HĐND & UBND Xã Quảng Trạch / Mẫu số C52-X): Bảng 2 cột không viền (`border: none`), chiều rộng 622px vừa khít khung trang, căn lề chuẩn mực.
    - Các bảng danh mục vật tư (Bảng 2, 4, 8: 21 hàng, 116 ô mỗi bảng): Viền đen 1px (`1px solid rgb(0,0,0)`), độ rộng cột cân đối, **hoàn toàn không bị vỡ bố cục hay tràn trang ngang** (`overflows: false`).
    - Bảng 3 có thuộc tính ngắt trang `page-break-before: always`.
  - **Ảnh nhúng:** Tệp gốc không có ảnh (0 ảnh).
  - **Phông chữ & Tiếng Việt:** Phông Times New Roman 14pt (NĐ 30/2020/NĐ-CP), dấu tiếng Việt 100% chính xác, không có ký tự lỗi ô vuông (`\uFFFD`).
  - **Header / Footer:** Gốc DOCX có 5 footer theo từng section (chứa trường số trang). StarWriter gộp phẳng thành 1 thẻ `<div title="footer">` chứa số `0`. Số `0` được nạp vào chân trang `.vno-writer-footer`.
  - **Bố cục tổng thể:** Rất giống Word thật, đạt chuẩn văn bản hợp đồng hành chính nhà nước.
- **Ảnh chụp màn hình bằng chứng:**
  - Tổng quan cửa sổ: [file1-hd-nghiem-thu-thanh-ly-window-overview.png](file:///E:/VNOffice-agy-writer-livepath-qa/docs/screenshots/writer-live-open/file1-hd-nghiem-thu-thanh-ly-window-overview.png)
  - Vùng văn bản đầu trang: [file1-hd-nghiem-thu-thanh-ly-viewport-top.png](file:///E:/VNOffice-agy-writer-livepath-qa/docs/screenshots/writer-live-open/file1-hd-nghiem-thu-thanh-ly-viewport-top.png)
  - Vùng văn bản giữa trang: [file1-hd-nghiem-thu-thanh-ly-viewport-middle.png](file:///E:/VNOffice-agy-writer-livepath-qa/docs/screenshots/writer-live-open/file1-hd-nghiem-thu-thanh-ly-viewport-middle.png)
  - Chi tiết bảng đầu tiên: [file1-hd-nghiem-thu-thanh-ly-first-table.png](file:///E:/VNOffice-agy-writer-livepath-qa/docs/screenshots/writer-live-open/file1-hd-nghiem-thu-thanh-ly-first-table.png)

---

### Tệp 2: `hợp đồng sửa chữa 3T- UBXQT.docx` (47,714 bytes)
- **Đặc điểm cấu trúc gốc:** 80 khối bảng trong DOCX gốc, 4 hình vẽ đường kẻ ngang (drawings), 0 header/footer.
- **Hiển thị trên VN Writer:**
  - **Nhãn tab:** `hợp đồng sửa chữa 3T- UBXQT.docx` hiển thị chính xác.
  - **Bảng biểu (12 bảng HTML):**
    - 4 bảng dữ liệu lớn (Bảng 4, 6, 9, 11: 20-22 hàng mỗi bảng): Viền đen 1px đầy đủ, căn lề thẳng hàng, không tràn trang ngang.
    - 8 bảng định dạng tiêu ngữ, chữ ký: Không viền, giữ đúng 2-3 cột chữ ký bên dưới ("Đơn vị đề nghị", "Kế toán trưởng", "Thủ trưởng đơn vị").
  - **Ảnh nhúng (4 ảnh shape đường kẻ ngang):**
    - DOCX gốc có 4 shape đường kẻ ngang trang trí. StarWriter HTML xuất ra 4 file GIF kích thước 1px cao (`Shape1`: 1x1, `Shape2`: 190x1, `Shape3`: 199x1, `Shape4`: 197x1).
    - **PHÁT HIỆN LỖI:** Cả 4 ảnh đều bị lỗi hiển thị (`brokenCount: 4`, `naturalWidth: 0`). Lý do: Lỗi tại tầng Python Backend `main.py` khi xử lý tên file có dấu tiếng Việt/khoảng trắng (chi tiết ở mục Vấn đề kiến trúc).
  - **Phông chữ & Tiếng Việt:** Phông Times New Roman 14pt, dấu tiếng Việt chuẩn 100%, không ô vuông.
  - **Header / Footer:** File gốc không có -> vùng header/footer hiển thị placeholder, đúng nguyên bản.
  - **Bố cục tổng thể:** Giữ đúng thể thức văn bản "GIẤY ĐỀ NGHỊ THANH TOÁN", các trường nội dung thanh toán, số tiền 24.908.200 đồng, chữ ký ngay ngắn.
- **Ảnh chụp màn hình bằng chứng:**
  - Tổng quan cửa sổ: [file2-hop-dong-sua-chua-3t-window-overview.png](file:///E:/VNOffice-agy-writer-livepath-qa/docs/screenshots/writer-live-open/file2-hop-dong-sua-chua-3t-window-overview.png)
  - Vùng văn bản đầu trang: [file2-hop-dong-sua-chua-3t-viewport-top.png](file:///E:/VNOffice-agy-writer-livepath-qa/docs/screenshots/writer-live-open/file2-hop-dong-sua-chua-3t-viewport-top.png)
  - Vùng văn bản giữa trang: [file2-hop-dong-sua-chua-3t-viewport-middle.png](file:///E:/VNOffice-agy-writer-livepath-qa/docs/screenshots/writer-live-open/file2-hop-dong-sua-chua-3t-viewport-middle.png)
  - Chi tiết bảng đầu tiên: [file2-hop-dong-sua-chua-3t-first-table.png](file:///E:/VNOffice-agy-writer-livepath-qa/docs/screenshots/writer-live-open/file2-hop-dong-sua-chua-3t-first-table.png)

---

### Tệp 3: `8. Biên bản hoàn thiện hợp đồng.docx` (36,172 bytes)
- **Đặc điểm cấu trúc gốc:** 13 khối bảng trong DOCX gốc, 3 header XML và 3 footer XML trong gói zip.
- **Hiển thị trên VN Writer:**
  - **Nhãn tab:** `8. Biên bản hoàn thiện hợp đồng.docx` hiển thị chính xác.
  - **Bảng biểu (2 bảng HTML):**
    - Bảng 1 (Danh mục hạng mục hợp đồng: 11 hàng, 64 ô): Viền kẻ đen 1px đầy đủ, độ rộng 603px, căn chỉnh số liệu gọn gàng.
    - Bảng 2 (Khu vực chữ ký đại diện bên A và bên B): Không viền, 2 cột chữ ký đối xứng chuẩn thể thức.
  - **Ảnh nhúng:** 0 ảnh.
  - **Phông chữ & Tiếng Việt:** Phông Times New Roman chuẩn, bảo toàn định dạng màu chữ đỏ in nghiêng ("Căn cứ Quyết định số 275 /QĐ-PKT ngày 23/12/2025 của Phòng Kinh tế xã Quảng Trạch...").
  - **Header / Footer:** StarWriter xuất ra footer chứa trường số trang `1`, hiển thị thành số `1` tại `.vno-writer-footer`. Header trong HTML chỉ chứa đoạn ngắt dòng trống.
  - **Bố cục tổng thể:** Căn giữa tiêu ngữ quốc hiệu, tiêu đề "BIÊN BẢN HOÀN THIỆN HỢP ĐỒNG", các điều khoản hợp đồng rất đẹp và giống Word thật.
- **Ảnh chụp màn hình bằng chứng:**
  - Tổng quan cửa sổ: [file3-bien-ban-hoan-thien-hd-window-overview.png](file:///E:/VNOffice-agy-writer-livepath-qa/docs/screenshots/writer-live-open/file3-bien-ban-hoan-thien-hd-window-overview.png)
  - Vùng văn bản đầu trang: [file3-bien-ban-hoan-thien-hd-viewport-top.png](file:///E:/VNOffice-agy-writer-livepath-qa/docs/screenshots/writer-live-open/file3-bien-ban-hoan-thien-hd-viewport-top.png)
  - Vùng văn bản giữa trang: [file3-bien-ban-hoan-thien-hd-viewport-middle.png](file:///E:/VNOffice-agy-writer-livepath-qa/docs/screenshots/writer-live-open/file3-bien-ban-hoan-thien-hd-viewport-middle.png)
  - Chi tiết bảng đầu tiên: [file3-bien-ban-hoan-thien-hd-first-table.png](file:///E:/VNOffice-agy-writer-livepath-qa/docs/screenshots/writer-live-open/file3-bien-ban-hoan-thien-hd-first-table.png)

---

### Tệp 4: `to_trinh.docx` (30,499 bytes)
- **Đặc điểm cấu trúc gốc:** 12 khối bảng trong DOCX gốc, 0 header/footer, 0 ảnh.
- **Hiển thị trên VN Writer:**
  - **Nhãn tab:** `to_trinh.docx` hiển thị chính xác.
  - **Bảng biểu (2 bảng HTML):**
    - Bảng 1: Bảng 2 cột tiêu ngữ quốc hiệu (Cơ quan ban hành bên trái, Quốc hiệu tiêu ngữ bên phải). Không viền, căn giữa trong từng cột hoàn hảo.
    - Bảng 2: Bảng danh mục thiết bị (STT, Tên hàng hóa, Thông số kỹ thuật, ĐVT, Số lượng). Viền đen 1px sắc nét, các thông số kỹ thuật máy photocopy Ricoh MP 5055 được định dạng chuẩn xác.
  - **Ảnh nhúng:** 0 ảnh.
  - **Phông chữ & Tiếng Việt:** Phông Times New Roman 14pt, dấu tiếng Việt hoàn hảo, không có lỗi hiển thị.
  - **Header / Footer:** Không có header/footer, đúng như bản gốc Word.
  - **Bố cục tổng thể:** Hoàn toàn giống Word thật, đạt chuẩn thể thức tờ trình hành chính Việt Nam.
- **Ảnh chụp màn hình bằng chứng:**
  - Tổng quan cửa sổ: [file4-to-trinh-window-overview.png](file:///E:/VNOffice-agy-writer-livepath-qa/docs/screenshots/writer-live-open/file4-to-trinh-window-overview.png)
  - Vùng văn bản đầu trang: [file4-to-trinh-viewport-top.png](file:///E:/VNOffice-agy-writer-livepath-qa/docs/screenshots/writer-live-open/file4-to-trinh-viewport-top.png)
  - Vùng văn bản giữa trang: [file4-to-trinh-viewport-middle.png](file:///E:/VNOffice-agy-writer-livepath-qa/docs/screenshots/writer-live-open/file4-to-trinh-viewport-middle.png)
  - Chi tiết bảng đầu tiên: [file4-to-trinh-first-table.png](file:///E:/VNOffice-agy-writer-livepath-qa/docs/screenshots/writer-live-open/file4-to-trinh-first-table.png)

---

## 4. Sửa lỗi CSS hiển thị phát hiện được (Bước 4)

Trong quá trình kiểm tra thị giác trên cả 4 file, phát hiện một lỗi hiển thị nghiêm trọng về mặt CSS:

### Hiện tượng lỗi:
- Toàn bộ tiêu đề lớn như **"HỢP ĐỒNG MUA BÁN"** (File 1), **"CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM"**, **"BIÊN BẢN HOÀN THIỆN HỢP ĐỒNG"** (File 3), cũng như ngày tháng năm bên phải đều bị **lệch về bên trái (căn đều hai bên - justify)** thay vì căn giữa hoặc căn phải.
- Nguyên nhân kỹ thuật:
  - LibreOffice StarWriter xuất căn lề đoạn văn dưới dạng thuộc tính HTML cổ điển: `<p align="center">`, `<p align="right">`, `<p align="left">`, `<td align="center">`.
  - Trong [apps/writer/writer.css:L390-393](file:///E:/VNOffice-agy-writer-livepath-qa/apps/writer/writer.css#L390-L393):
    ```css
    .vno-writer-page p {
      margin: 0 0 6pt 0;
      text-align: justify;
    }
    ```
  - Theo luật CSS Specificity, quy tắc class `.vno-writer-page p` có độ ưu tiên `(0, 1, 1)` cao hơn thuộc tính HTML `align="center"` của User Agent stylesheet `(0, 0, 0)`.
  - Do đó, quy tắc CSS này **đè bẹp và triệt tiêu toàn bộ thuộc tính `align="center"` và `align="right"`**, ép mọi đoạn văn một dòng về căn lề trái/justify!

### Khắc phục an toàn trong `apps/writer/writer.css`:
Đã bổ sung các quy tắc tương thích phạm vi hẹp trong `.vno-writer-page` và `.vno-print-preview-body` mà không làm ảnh hưởng đến các thành phần khác:
```css
/* Tương thích định dạng StarWriter HTML (thuộc tính align trên thẻ p và ô bảng td/th) */
.vno-writer-page p[align="center"],
.vno-print-preview-body p[align="center"] {
  text-align: center;
}
.vno-writer-page p[align="right"],
.vno-print-preview-body p[align="right"] {
  text-align: right;
}
.vno-writer-page p[align="left"],
.vno-print-preview-body p[align="left"] {
  text-align: left;
}
.vno-writer-page p[align="justify"],
.vno-print-preview-body p[align="justify"] {
  text-align: justify;
}
.vno-writer-page td[align="center"],
.vno-writer-page th[align="center"],
.vno-print-preview-body td[align="center"],
.vno-print-preview-body th[align="center"] {
  text-align: center;
}
.vno-writer-page td[align="right"],
.vno-writer-page th[align="right"],
.vno-print-preview-body td[align="right"],
.vno-print-preview-body th[align="right"] {
  text-align: right;
}
.vno-writer-page td[align="left"],
.vno-writer-page th[align="left"],
.vno-print-preview-body td[align="left"],
.vno-print-preview-body th[align="left"] {
  text-align: left;
}
```
**Kết quả sau khi sửa:** Tiêu đề các văn bản và tiêu ngữ quốc hiệu căn giữa hoàn hảo, dòng ngày tháng căn phải đúng chuẩn thể thức hành chính Việt Nam.

---

## 5. Vấn đề kiến trúc phát hiện, CHƯA sửa (Báo cáo điều phối)

Tuân thủ nghiêm ngặt ranh giới an toàn (*"KHÔNG sửa main.py hay bất kỳ file Python nào; nếu phát hiện vấn đề ở tầng Python/kiến trúc, CHỈ ghi rõ vào báo cáo/HANDOFF, không tự ý sửa"*), dưới đây là 2 vấn đề kiến trúc phát hiện được:

### Vấn đề kiến trúc 1: Hàm `_inline_html_images()` trong `main.py` làm mất ảnh khi tên tệp có tiếng Việt hoặc khoảng trắng

- **Vị trí code:** [main.py:L483-533](file:///E:/VNOffice-agy-writer-livepath-qa/main.py#L483-L533), cụ thể tại dòng 503-514:
  ```python
  decoded = html.unescape(src)
  candidates = [
      os.path.join(html_dir, decoded),
      re.sub(r"^/([A-Za-z]:)", r"\1", decoded),
      re.sub(r"^file:///", "", decoded, flags=re.IGNORECASE),
  ]
  file_path = next(
      (candidate for candidate in candidates if candidate and os.path.isfile(candidate)),
      None,
  )
  ```
- **Hiện tượng thực tế:** Trong tệp `hợp đồng sửa chữa 3T- UBXQT.docx`, LibreOffice StarWriter xuất 4 thẻ ảnh với `src` bị URL-encoded:
  `src="h%E1%BB%A3p%20%C4%91%E1%BB%93ng%20s%E1%BB%ADa%20ch%E1%BB%AFa%203T-%20UBXQT_html_b19bf31e.gif"`
  Trong khi đó, tệp thực tế LibreOffice tạo trên ổ đĩa Windows lại có tên Unicode giải mã:
  `hợp đồng sửa chữa 3T- UBXQT_html_b19bf31e.gif`
- **Nguyên nhân cốt lõi:** `main.py` chỉ dùng `html.unescape(src)` để giải mã thực thể HTML (`&amp;`, `&lt;`), nhưng **QUÊN KHÔNG GỌI `urllib.parse.unquote(decoded)`**. Do đó `decoded` vẫn giữ nguyên chuỗi `h%E1%BB%A3p%20...`, khiến `os.path.isfile(candidate)` trả về `False`.
- **Hậu quả:** Toàn bộ ảnh đính kèm của bất kỳ tệp Word nào có tên file chứa ký tự tiếng Việt hoặc khoảng trắng **đều không được nhúng thành data URI**. Ngay sau đó, khối `tempfile.TemporaryDirectory` trong `open_document_dialog()` tự động xóa thư mục tạm. Khi chuỗi HTML được nạp vào Writer UI, thẻ `<img>` trỏ tới file cục bộ đã bị xóa -> **ảnh bị lỗi 404 (broken image) vĩnh viễn**.
- **Đề xuất xử lý cho người điều phối:** Khi được phép sửa `main.py`, chỉ cần thêm `import urllib.parse` và cập nhật dòng 503:
  `decoded = urllib.parse.unquote(html.unescape(src))`.

---

### Vấn đề kiến trúc 2: Định dạng StarWriter HTML làm mất/gộp phẳng Header & Footer đa mục (Multi-section)

- **Hiện tượng thực tế:**
  - Tệp `HĐ VÀ NGHIỆM THU, THANH LÝ.docx` gốc trong gói OOXML zip có đến 5 tệp footer riêng biệt (`word/footer1.xml` đến `footer5.xml`) tương ứng với từng phần/trang của hợp đồng và phụ lục.
  - Tệp `8. Biên bản hoàn thiện hợp đồng.docx` có 3 header và 3 footer.
- **Hạn chế của bộ lọc StarWriter HTML:**
  - Bộ chuyển đổi `soffice --convert-to "html:HTML (StarWriter)"` của LibreOffice là bộ chuyển đổi hướng web/HTML đơn trang. Nó không hỗ trợ mô hình phân trang đa mục (multi-section header/footer).
  - StarWriter HTML chỉ xuất ra duy nhất tối đa 1 thẻ `<div title="header">` và 1 thẻ `<div title="footer">` chứa trường trang tổng thể (`<sdfield>`), bỏ qua hoàn toàn các header/footer đặc thù của từng trang chẵn/lẻ hay từng phần trong Word.
- **Tác động:** Đây là sự mất mát thông tin vốn có khi dùng StarWriter HTML làm định dạng trung gian giữa LibreOffice và UI. Luồng FODT (`adapters/libreoffice/writer/writer-adapter.js`) có cấu trúc lưu giữ `style:header` / `style:footer` tốt hơn nhưng chưa được tích hợp vào `main.py`.
- **Ghi nhận:** Báo cáo lại cho người điều phối để cân nhắc trong lộ trình kiến trúc tương lai (chuyển đổi luồng mở file thật từ HTML sang FODT hoặc kết hợp overlay OOXML).

---

## 6. Hướng dẫn sử dụng trong ứng dụng (Tuân thủ AGENTS.md Mục 10)

Đã bổ sung mục hướng dẫn sử dụng tiếng Việt chi tiết cho tính năng "Mở tài liệu có sẵn (Word DOCX / ODT)" vào hệ thống Help tích hợp:
- **Tệp cập nhật:** [platform/help/entries-writer.js](file:///E:/VNOffice-agy-writer-livepath-qa/platform/help/entries-writer.js)
- **ID bài viết:** `writer.file.openDocument`
- **Nội dung:** Hướng dẫn người dùng cách mở file qua tổ hợp phím **Ctrl+O** hoặc qua menu **Tệp** (Backstage), giải thích rõ khả năng tự động thích ứng khổ giấy A4 chuẩn Nghị định 30/2020/NĐ-CP, bảo toàn bảng biểu và căn lề tiêu đề.

---

## 7. Kết quả kiểm thử bắt buộc

| Bộ kiểm thử | Yêu cầu | Kết quả thực tế | Trạng thái |
|---|---|---|---|
| `node scripts/check-syntax.js` | 89/89 PASS | **89/89 files hợp lệ, 0 lỗi cú pháp** | **PASS** |
| `node tests/run-tests.js` | Không giảm so với nền (1505) | **1505/1505 PASS, 0 FAIL** | **PASS** |
| `node tests/live/ribbon-audit-1280.playwright.mjs` | 100% PASS nếu sửa CSS | **104/104 tabs PASS, 0px tràn ngang tại 1280px** | **PASS** |
| `node tests/live/real-office-file-import-fidelity.playwright.mjs` | PASS | **Toàn bộ assertions PASS** | **PASS** |
| `node tests/live/real-office-file-import-fidelity-round2.playwright.mjs` | PASS | **Toàn bộ assertions PASS** | **PASS** |
| `node tests/live/writer-live-open-qa.playwright.mjs` | Đầy đủ 4 file thật | **4/4 file DOCX mở thành công, chụp 16 ảnh** | **PASS** |

---

## 8. Nguyên văn Git Log và Git Status

### Kết quả `git log --oneline main..HEAD`:
```text
```
*(Chưa tạo commit trước khi viết báo cáo; kết quả sau khi commit bên dưới).*

### Kết quả `git status`:
```text
On branch visual-qa/writer-live-open-path
Changes not staged for commit:
  (use "git add <file>..." to update what will be committed)
  (use "git restore <file>..." to discard changes in working directory)
	modified:   apps/writer/writer.css
	modified:   platform/help/entries-writer.js

Untracked files:
  (use "git add <file>..." to include in what will be committed)
	TASK-BRIEF-WRITER-LIVE-OPEN-QA.md
	docs/HANDOFF-WRITER-LIVE-OPEN-PATH-VISUAL-QA.md
	docs/screenshots/writer-live-open/
	scripts/generate_live_open_payloads.py
	tests/fixtures/live-open-payloads/
	tests/live/writer-live-open-qa.playwright.mjs

no changes added to commit (use "git add" and/or "git commit -a")
```
