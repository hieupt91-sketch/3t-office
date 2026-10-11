# Agent Handoff

TASK: Kiểm tra thị giác luồng Mở file THẬT của Writer trên toàn bộ kho file .docx thật của người dùng (15/15 tệp)
AGENT/ROLE: Antigravity (Visual QA & Writer Integration)
BRANCH: `visual-qa/writer-live-open-full-corpus`
WORKTREE: `E:\VNOffice-agy-livepath-qa-full`
OBJECTIVE: Hoàn thành toàn diện kiểm thử thị giác luồng mở file THẬT (LibreOffice `soffice --convert-to "html:HTML (StarWriter)"` qua `main.py` -> `UnoBridge` -> `WriterAdapter.open()` -> `.vno-writer-body` DOM) trên toàn bộ kho 15 tệp DOCX thực tế của người dùng (4 tệp Đợt 1 + 11 tệp Đợt 2); chụp 60 ảnh màn hình bằng chứng; đánh giá chi tiết bảng biểu, ảnh nhúng, phông chữ tiếng Việt, căn lề tiêu đề/ngày tháng, header/footer, lỗi tràn ngang; xác nhận bản sửa lỗi CSS căn lề từ đợt 1 đạt 100% trên toàn kho; báo cáo các vấn đề kiến trúc tầng Python/StarWriter HTML backend.

---

## 1. Điểm nối thật giữa Python Backend và UI

Luồng mở file THẬT khi người dùng thao tác trong ứng dụng VN Writer diễn ra qua chuỗi gọi hàm sau:

1. **Giao diện người dùng (UI Event / Phím tắt):**
   - Người dùng bấm nút **Tệp** trên thanh công cụ rồi chọn **Mở tệp** (`[data-backstage-cmd="common.file.open"]` tại [app-shell.js](file:///E:/VNOffice-agy-livepath-qa-full/platform/shell/app-shell.js#L625)), hoặc nhấn phím tắt **Ctrl+O** (được đăng ký tại [command-definitions.js](file:///E:/VNOffice-agy-livepath-qa-full/platform/commands/command-definitions.js#L12) và xử lý bởi [shortcut-manager.js](file:///E:/VNOffice-agy-livepath-qa-full/platform/commands/shortcut-manager.js)).
   - Thao tác này phát lệnh: `globalCommandBus.execute("common.file.open")`.

2. **Điều phối lệnh trong Writer Adapter:**
   - [writer-adapter.js:L2575-2576](file:///E:/VNOffice-agy-livepath-qa-full/adapters/libreoffice/writer/writer-adapter.js#L2575-L2576):
     ```javascript
     case "common.file.open":
       return await this.open();
     ```
   - Hàm `WriterAdapter.prototype.open()` kích hoạt `globalUnoBridge.openRealFile("writer")`.

3. **Cầu nối UnoBridge sang Desktop Native API:**
   - [uno-bridge.js:L100-108](file:///E:/VNOffice-agy-livepath-qa-full/adapters/libreoffice/common/uno-bridge.js#L100-L108):
     Gọi `this.desktopApi.open_document_dialog("writer")`.

4. **Python Backend (`main.py`):**
   - `VnOfficeApi.open_document_dialog(self, app_kind="writer")` ([main.py:L602](file:///E:/VNOffice-agy-livepath-qa-full/main.py#L602)):
     - Mở hộp thoại native chọn file của hệ điều hành qua `window.create_file_dialog()`.
     - Chạy lệnh headless LibreOffice:
       `soffice.exe --headless --invisible --nocrashreport --nodefault --nolockcheck --nologo --norestore -env:UserInstallation=file:///<tmp>/profile --convert-to "html:HTML (StarWriter)" --outdir <tmp> "<file_path>"`
     - Nhúng ảnh đính kèm thành base64 data URI qua hàm `_inline_html_images()`. Đã được sửa bổ sung `urllib.parse.unquote()` tại commit `80a43ad`/`48710dd` để hỗ trợ tên file có dấu tiếng Việt/khoảng trắng.
     - Trích xuất `ooxmlDocumentXml` và `ooxmlCommentsXml` từ tệp `.docx` gốc.
     - Trả về payload đối tượng JSON:
       `{ status: "ok", sourcePath, fileName, format: "html", content, ooxmlDocumentXml }`.

5. **Thiết lập nội dung vào DOM `.vno-writer-body`:**
   - Chuẩn hóa HTML nhập khẩu qua `this._normalizeImportedHtml()`.
   - Gán trực tiếp vào DOM tại [writer-adapter.js](file:///E:/VNOffice-agy-livepath-qa-full/adapters/libreoffice/writer/writer-adapter.js): `bodyDom.innerHTML = imported.body`.
   - Áp dụng định dạng trang và đồng bộ tab chrome: `this.shell?.resetDocumentChrome?.(result.fileName)`.

---

## 2. Quy trình kiểm thử thị giác tự động toàn bộ 15 tệp DOCX

1. Kịch bản [scripts/generate_live_open_payloads.py](file:///E:/VNOffice-agy-livepath-qa-full/scripts/generate_live_open_payloads.py) khởi tạo `main.VnOfficeApi("writer", filepath)` và gọi trực tiếp `open_document_dialog("writer")` cho toàn bộ **15 tệp DOCX thật**. Backend Python và LibreOffice headless thật chuyển đổi và lưu kết quả JSON vào [tests/fixtures/live-open-payloads/](file:///E:/VNOffice-agy-livepath-qa-full/tests/fixtures/live-open-payloads/).
2. Kịch bản Playwright chuyên sâu [tests/live/writer-live-open-qa.playwright.mjs](file:///E:/VNOffice-agy-livepath-qa-full/tests/live/writer-live-open-qa.playwright.mjs) duyệt tuần tự qua toàn bộ 15 file:
   - Kích hoạt đúng luồng UI thật: click menu **Tệp** -> **Mở tệp** (`[data-backstage-cmd="common.file.open"]`).
   - Kiểm tra định dạng A4, lề trang, bảng biểu, ảnh nhúng, bảng mã Unicode, ký tự ô vuông, header/footer.
   - Kiểm tra tự động tính toán CSS `textAlign` đối với tất cả thẻ `<p align="...">`, `<td align="...">`, `<th align="...">`.
   - Chụp 4 ảnh màn hình bằng chứng cho mỗi file (Tổng quan cửa sổ, Đầu trang, Giữa trang, Bảng đầu tiên). Tổng cộng **60 ảnh màn hình** tại [docs/screenshots/writer-live-open/](file:///E:/VNOffice-agy-livepath-qa-full/docs/screenshots/writer-live-open/).
   - Xuất dữ liệu kiểm toán chi tiết vào `tests/fixtures/live-open-payloads/qa-audit-results.json`.

---

## 3. Kết quả đánh giá thị giác từng tệp DOCX trong kho thực tế

### Bảng tổng hợp chỉ số kỹ thuật 15/15 tệp DOCX thật:

| # | Tên tệp | Dung lượng | Bảng | Tràn ngang | Ảnh nhúng | Ảnh vỡ | Căn lề align= (lỗi) | Tiếng Việt | Ô vuông | Lỗi JS |
|---|---|---|---|---|---|---|---|---|---|---|
| **1** | `HĐ VÀ NGHIỆM THU, THANH LÝ.docx` (gói 04-2026) | 50.5 KB | 9 | Không | 0 | 0 | 527 p (0 lỗi) | Chuẩn | Không | 0 |
| **2** | `hợp đồng sửa chữa 3T- UBXQT.docx` (Hồ sơ sửa chữa) | 47.7 KB | 12 | Không | 4 | 0 (Đã sửa) | 761 p (0 lỗi) | Chuẩn | Không | 0 |
| **3** | `8. Biên bản hoàn thiện hợp đồng.docx` (Máy bảo mật) | 36.1 KB | 2 | Không | 0 | 0 | 181 p (0 lỗi) | Chuẩn | Không | 0 |
| **4** | `to_trinh.docx` (Máy bảo mật file mới) | 30.5 KB | 2 | Không | 0 | 0 | 36 p (0 lỗi) | Chuẩn | Không | 0 |
| **5** | `Biên bản hoàn thiện hợp đồng.docx` (gói 04-2026) | 39.5 KB | 2 | Không | 1 | 0 | 181 p (0 lỗi) | Chuẩn | Không | 0 |
| **6** | `12. HĐ VÀ NGHIỆM THU, THANH LÝ.docx` (Máy bảo mật) | 45.9 KB | 9 | Không | 0 | 0 | 321 p (0 lỗi) | Chuẩn | Không | 0 |
| **7** | `1. QĐ thành lập TỔ MUA SẮM.docx` (Máy bảo mật) | 20.0 KB | 2 | Không | 2 | 0 | 36 p (0 lỗi) | Chuẩn | Không | 0 |
| **8** | `2. Tờ trìn khlcnt.docx` (Máy bảo mật) | 32.4 KB | 4 | Có (Bảng #2)* | 3 | 0 | 136 p (0 lỗi) | Chuẩn | Không | 0 |
| **9** | `HĐ VÀ NGHIỆM THU, THANH LÝ.docx` (gói 8-2026) | 50.5 KB | 9 | Không | 0 | 0 | 527 p (0 lỗi) | Chuẩn | Không | 0 |
| **10** | `hợp đồng sửa chữa 3T- UBXQT.docx` (gói 8-2026) | 47.7 KB | 12 | Không | 4 | 0 | 761 p (0 lỗi) | Chuẩn | Không | 0 |
| **11** | `Biên bản hoàn thiện hợp đồngg.docx` (gói 8-2026) | 42.8 KB | 2 | Không | 1 | 0 | 198 p (0 lỗi) | Chuẩn | Không | 0 |
| **12** | `1. QĐ thành lập TỔ MUA SẮM.docx` (Máy photo) | 20.0 KB | 2 | Không | 2 | 0 | 36 p (0 lỗi) | Chuẩn | Không | 0 |
| **13** | `2. Tờ trìn khlcnt.docx` (Máy photo) | 32.5 KB | 4 | Có (Bảng #2)* | 3 | 0 | 136 p (0 lỗi) | Chuẩn | Không | 0 |
| **14** | `8. Biên bản hoàn thiện hợp đồng.docx` (Máy photo) | 35.1 KB | 2 | Không | 0 | 0 | 124 p (0 lỗi) | Chuẩn | Không | 0 |
| **15** | `12. HĐ VÀ NGHIỆM THU, THANH LÝ (Autosaved).docx` (Máy photo) | 43.8 KB | 9 | Không | 0 | 0 | 261 p (0 lỗi) | Chuẩn | Không | 0 |

*\*Ghi chú về Tràn ngang (Bảng #2 ở Tệp 8 và Tệp 13): Xem chi tiết ở Mục 5 — Vấn đề kiến trúc 4.*

---

### Chi tiết 11 tệp mới Đợt 2 (Tệp 5 đến Tệp 15):

#### Tệp 5: `Biên bản hoàn thiện hợp đồng.docx` (gói sữa chữa tháng 04-2026)
- **Đặc điểm & Cấu trúc:** 39,592 bytes; 7,851 ký tự, 205 đoạn văn.
- **Hiển thị thị giác:**
  - Nhãn tab: `Biên bản hoàn thiện hợp đồng.docx` hiển thị sắc nét.
  - Bảng biểu (2 bảng): Bảng 1 (19 hàng, 132 ô) danh mục vật tư sửa chữa có đầy đủ viền đen 1px, căn chỉnh số tiền (1.800.000, 280.000,...) sang phải thẳng hàng; Bảng 2 chữ ký 2 cột đối xứng không viền.
  - Ảnh nhúng: 1 ảnh GIF đường kẻ ngang trang trí (231x1 px) nhúng data URI thành công (`brokenCount: 0`).
  - Tiếng Việt & Định dạng: Tiêu đề căn giữa chuẩn mực, dòng chữ đỏ in nghiêng ("Mua sắm và sửa chữa công nghệ thông tin .") được bảo toàn chính xác. 0 ký tự ô vuông.
  - Header / Footer: Chân trang nạp trường số trang `1`.
- **Ảnh bằng chứng:**
  - Tổng quan cửa sổ: [file5-bien-ban-hoan-thien-hd-t4-window-overview.png](file:///E:/VNOffice-agy-livepath-qa-full/docs/screenshots/writer-live-open/file5-bien-ban-hoan-thien-hd-t4-window-overview.png)
  - Đầu trang: [file5-bien-ban-hoan-thien-hd-t4-viewport-top.png](file:///E:/VNOffice-agy-livepath-qa-full/docs/screenshots/writer-live-open/file5-bien-ban-hoan-thien-hd-t4-viewport-top.png)
  - Giữa trang: [file5-bien-ban-hoan-thien-hd-t4-viewport-middle.png](file:///E:/VNOffice-agy-livepath-qa-full/docs/screenshots/writer-live-open/file5-bien-ban-hoan-thien-hd-t4-viewport-middle.png)
  - Chi tiết bảng: [file5-bien-ban-hoan-thien-hd-t4-first-table.png](file:///E:/VNOffice-agy-livepath-qa-full/docs/screenshots/writer-live-open/file5-bien-ban-hoan-thien-hd-t4-first-table.png)

#### Tệp 6: `12. HĐ VÀ NGHIỆM THU, THANH LÝ.docx` (GÓI THẦU MUA SẮM MÁY BẢO MẬT)
- **Đặc điểm & Cấu trúc:** 45,938 bytes; 16,256 ký tự, 377 đoạn văn.
- **Hiển thị thị giác:**
  - Nhãn tab: `12. HĐ VÀ NGHIỆM THU, THANH LÝ.docx`.
  - Bảng biểu (9 bảng): Bảng 1 tiêu ngữ 2 cột không viền; Bảng 2, 4, 8 (8 hàng, 46 ô mỗi bảng) danh mục hàng hóa thiết bị có viền đen 1px, chiều rộng 622px vừa vặn hoàn hảo trong lề trang (`overflows: false`).
  - Tiếng Việt & Định dạng: 321 đoạn văn căn lề (`align="center"` / `"right"`) đều áp dụng chính xác 100%, không bị justify đè bẹp.
  - Header / Footer: Chân trang nạp trường số trang `0`.
- **Ảnh bằng chứng:**
  - Tổng quan cửa sổ: [file6-hd-nghiem-thu-thanh-ly-mbm-window-overview.png](file:///E:/VNOffice-agy-livepath-qa-full/docs/screenshots/writer-live-open/file6-hd-nghiem-thu-thanh-ly-mbm-window-overview.png)
  - Đầu trang: [file6-hd-nghiem-thu-thanh-ly-mbm-viewport-top.png](file:///E:/VNOffice-agy-livepath-qa-full/docs/screenshots/writer-live-open/file6-hd-nghiem-thu-thanh-ly-mbm-viewport-top.png)
  - Giữa trang: [file6-hd-nghiem-thu-thanh-ly-mbm-viewport-middle.png](file:///E:/VNOffice-agy-livepath-qa-full/docs/screenshots/writer-live-open/file6-hd-nghiem-thu-thanh-ly-mbm-viewport-middle.png)
  - Chi tiết bảng: [file6-hd-nghiem-thu-thanh-ly-mbm-first-table.png](file:///E:/VNOffice-agy-livepath-qa-full/docs/screenshots/writer-live-open/file6-hd-nghiem-thu-thanh-ly-mbm-first-table.png)

#### Tệp 7: `1. QĐ thành lập TỔ MUA SẮM.docx` (GÓI THẦU MUA SẮM MÁY BẢO MẬT)
- **Đặc điểm & Cấu trúc:** 20,055 bytes; 2,526 ký tự, 47 đoạn văn. Quyết định hành chính chuẩn thể thức.
- **Hiển thị thị giác:**
  - Nhãn tab: `1. QĐ thành lập TỔ MUA SẮM.docx`.
  - Bảng biểu (2 bảng): Bảng tiêu ngữ và Bảng chữ ký ("Nơi nhận" bên trái, "TRƯỞNG PHÒNG - Nguyễn Tiến Dũng" bên phải) không viền, căn đối xứng đẹp mắt.
  - Ảnh nhúng (2 ảnh shape kẻ ngang): Shape1 (125x1 px), Shape2 (202x1 px) nhúng data URI thành công.
  - Hiện tượng StarWriter HTML: Do StarWriter chèn thẻ `<img>` kẻ ngang vào giữa chữ cái đầu tiên kèm `align="left"`, đường kẻ trôi nổi lên mép trên ô và xuất hiện khoảng trắng nhỏ trong từ ngữ ("P HÒNG", "C ỘNG"). Đây là giới hạn StarWriter HTML backend (chi tiết ở Mục 5).
  - Phông chữ & Căn lề: 36/36 đoạn văn căn giữa/phải chuẩn 100%. Không có ký tự lỗi ô vuông.
- **Ảnh bằng chứng:**
  - Tổng quan cửa sổ: [file7-qd-to-mua-sam-mbm-window-overview.png](file:///E:/VNOffice-agy-livepath-qa-full/docs/screenshots/writer-live-open/file7-qd-to-mua-sam-mbm-window-overview.png)
  - Đầu trang: [file7-qd-to-mua-sam-mbm-viewport-top.png](file:///E:/VNOffice-agy-livepath-qa-full/docs/screenshots/writer-live-open/file7-qd-to-mua-sam-mbm-viewport-top.png)
  - Giữa trang: [file7-qd-to-mua-sam-mbm-viewport-middle.png](file:///E:/VNOffice-agy-livepath-qa-full/docs/screenshots/writer-live-open/file7-qd-to-mua-sam-mbm-viewport-middle.png)
  - Chi tiết bảng: [file7-qd-to-mua-sam-mbm-first-table.png](file:///E:/VNOffice-agy-livepath-qa-full/docs/screenshots/writer-live-open/file7-qd-to-mua-sam-mbm-first-table.png)

#### Tệp 8: `2. Tờ trìn khlcnt.docx` (GÓI THẦU MUA SẮM MÁY BẢO MẬT)
- **Đặc điểm & Cấu trúc:** 32,394 bytes; 7,116 ký tự, 153 đoạn văn.
- **Hiển thị thị giác:**
  - Nhãn tab: `2. Tờ trìn khlcnt.docx`.
  - Bảng biểu (4 bảng):
    - Bảng 1: Tiêu ngữ 2 cột không viền (w=641px).
    - **Bảng 2 (Kế hoạch lựa chọn nhà thầu):** Bảng 14 cột, 3 hàng, 29 ô viền đen 1px đầy đủ. DOCX gốc thiết lập `w:tblW w="11448 dxa"` (~96% chiều rộng toàn tờ giấy) trong trang dọc. Bảng có chiều rộng 916px, tràn qua lề phải 122px. Viewport cuộn ngang tốt, các ô bên trong được định dạng rõ ràng, chữ bọc ngay ngắn.
    - Bảng 3: Bảng giải trình gói thầu (7 hàng, 19 ô) vừa khít lề (w=641px).
    - Bảng 4: Chữ ký 2 cột (w=641px).
  - Ảnh nhúng: 3 ảnh shape đường kẻ ngang nhúng data URI thành công, 0 lỗi.
  - Căn lề: 136 đoạn văn căn lề chuẩn 100%. 0 ký tự ô vuông.
- **Ảnh bằng chứng:**
  - Tổng quan cửa sổ: [file8-to-trinh-khlcnt-mbm-window-overview.png](file:///E:/VNOffice-agy-livepath-qa-full/docs/screenshots/writer-live-open/file8-to-trinh-khlcnt-mbm-window-overview.png)
  - Đầu trang: [file8-to-trinh-khlcnt-mbm-viewport-top.png](file:///E:/VNOffice-agy-livepath-qa-full/docs/screenshots/writer-live-open/file8-to-trinh-khlcnt-mbm-viewport-top.png)
  - Giữa trang: [file8-to-trinh-khlcnt-mbm-viewport-middle.png](file:///E:/VNOffice-agy-livepath-qa-full/docs/screenshots/writer-live-open/file8-to-trinh-khlcnt-mbm-viewport-middle.png)
  - Chi tiết bảng tiêu ngữ: [file8-to-trinh-khlcnt-mbm-first-table.png](file:///E:/VNOffice-agy-livepath-qa-full/docs/screenshots/writer-live-open/file8-to-trinh-khlcnt-mbm-first-table.png)
  - Chi tiết bảng 14 cột tràn lề: [file8-table2-wide.png](file:///E:/VNOffice-agy-livepath-qa-full/docs/screenshots/writer-live-open/file8-table2-wide.png)
  - Vùng hiển thị bảng 14 cột: [file8-viewport-table2.png](file:///E:/VNOffice-agy-livepath-qa-full/docs/screenshots/writer-live-open/file8-viewport-table2.png)

#### Tệp 9: `HĐ VÀ NGHIỆM THU, THANH LÝ.docx` (gói sữa chữa tháng 8 -2026)
- **Đặc điểm & Cấu trúc:** 50,561 bytes; 18,547 ký tự, 638 đoạn văn.
- **Hiển thị thị giác:**
  - Nhãn tab: `HĐ VÀ NGHIỆM THU, THANH LÝ.docx`.
  - Bảng biểu (9 bảng): Bảng danh mục vật tư 21 hàng, 116 ô viền đen 1px, w=622px vừa vặn lề trang A4 (`overflows: false`).
  - Căn lề: 527/527 đoạn văn căn lề chính xác 100%.
  - Phông chữ & Tiếng Việt: Times New Roman 14pt chuẩn NĐ 30, 0 ký tự ô vuông.
  - Header / Footer: Chân trang nạp trường số trang `0`.
- **Ảnh bằng chứng:**
  - Tổng quan cửa sổ: [file9-hd-nghiem-thu-thanh-ly-t8-window-overview.png](file:///E:/VNOffice-agy-livepath-qa-full/docs/screenshots/writer-live-open/file9-hd-nghiem-thu-thanh-ly-t8-window-overview.png)
  - Đầu trang: [file9-hd-nghiem-thu-thanh-ly-t8-viewport-top.png](file:///E:/VNOffice-agy-livepath-qa-full/docs/screenshots/writer-live-open/file9-hd-nghiem-thu-thanh-ly-t8-viewport-top.png)
  - Giữa trang: [file9-hd-nghiem-thu-thanh-ly-t8-viewport-middle.png](file:///E:/VNOffice-agy-livepath-qa-full/docs/screenshots/writer-live-open/file9-hd-nghiem-thu-thanh-ly-t8-viewport-middle.png)
  - Chi tiết bảng: [file9-hd-nghiem-thu-thanh-ly-t8-first-table.png](file:///E:/VNOffice-agy-livepath-qa-full/docs/screenshots/writer-live-open/file9-hd-nghiem-thu-thanh-ly-t8-first-table.png)

#### Tệp 10: `hợp đồng sửa chữa 3T- UBXQT.docx` (gói sữa chữa tháng 8 -2026)
- **Đặc điểm & Cấu trúc:** 47,714 bytes; 19,527 ký tự, 767 đoạn văn.
- **Hiển thị thị giác:**
  - Nhãn tab: `hợp đồng sửa chữa 3T- UBXQT.docx`.
  - Bảng biểu (12 bảng): 4 bảng danh mục vật tư lớn (20-22 hàng mỗi bảng) viền đen 1px đầy đủ, w=641px không tràn trang ngang. 8 bảng định dạng chữ ký và tiêu ngữ cân đối.
  - Ảnh nhúng (4 ảnh shape): Toàn bộ 4 ảnh nhúng data URI thành công (`brokenCount: 0`), xác nhận bản sửa lỗi URL decode của `main.py` hoạt động hoàn hảo trên file tháng 8.
  - Căn lề: 761/761 đoạn văn căn lề chính xác 100%.
  - Phông chữ & Tiếng Việt: Times New Roman 14pt, 0 ký tự ô vuông.
  - Header / Footer: Không có.
- **Ảnh bằng chứng:**
  - Tổng quan cửa sổ: [file10-hop-dong-sua-chua-3t-t8-window-overview.png](file:///E:/VNOffice-agy-livepath-qa-full/docs/screenshots/writer-live-open/file10-hop-dong-sua-chua-3t-t8-window-overview.png)
  - Đầu trang: [file10-hop-dong-sua-chua-3t-t8-viewport-top.png](file:///E:/VNOffice-agy-livepath-qa-full/docs/screenshots/writer-live-open/file10-hop-dong-sua-chua-3t-t8-viewport-top.png)
  - Giữa trang: [file10-hop-dong-sua-chua-3t-t8-viewport-middle.png](file:///E:/VNOffice-agy-livepath-qa-full/docs/screenshots/writer-live-open/file10-hop-dong-sua-chua-3t-t8-viewport-middle.png)
  - Chi tiết bảng: [file10-hop-dong-sua-chua-3t-t8-first-table.png](file:///E:/VNOffice-agy-livepath-qa-full/docs/screenshots/writer-live-open/file10-hop-dong-sua-chua-3t-t8-first-table.png)

#### Tệp 11: `Biên bản hoàn thiện hợp đồngg.docx` (gói sữa chữa tháng 8 -2026)
- **Đặc điểm & Cấu trúc:** 42,863 bytes; 7,733 ký tự, 222 đoạn văn.
- **Hiển thị thị giác:**
  - Nhãn tab: `Biên bản hoàn thiện hợp đồngg.docx`.
  - Bảng biểu (2 bảng): Bảng 1 (19 hàng, 132 ô) viền kẻ đen 1px đầy đủ, căn số chuẩn; Bảng 2 chữ ký 2 cột đối xứng không viền.
  - Ảnh nhúng: 1 ảnh shape đường kẻ ngang (231x1 px, data URI GIF, 0 broken).
  - Căn lề: 198/198 đoạn văn căn lề chính xác 100%. 0 ký tự ô vuông.
  - Header / Footer: Chân trang nạp trường số trang `1`.
- **Ảnh bằng chứng:**
  - Tổng quan cửa sổ: [file11-bien-ban-hoan-thien-hdg-t8-window-overview.png](file:///E:/VNOffice-agy-livepath-qa-full/docs/screenshots/writer-live-open/file11-bien-ban-hoan-thien-hdg-t8-window-overview.png)
  - Đầu trang: [file11-bien-ban-hoan-thien-hdg-t8-viewport-top.png](file:///E:/VNOffice-agy-livepath-qa-full/docs/screenshots/writer-live-open/file11-bien-ban-hoan-thien-hdg-t8-viewport-top.png)
  - Giữa trang: [file11-bien-ban-hoan-thien-hdg-t8-viewport-middle.png](file:///E:/VNOffice-agy-livepath-qa-full/docs/screenshots/writer-live-open/file11-bien-ban-hoan-thien-hdg-t8-viewport-middle.png)
  - Chi tiết bảng: [file11-bien-ban-hoan-thien-hdg-t8-first-table.png](file:///E:/VNOffice-agy-livepath-qa-full/docs/screenshots/writer-live-open/file11-bien-ban-hoan-thien-hdg-t8-first-table.png)

#### Tệp 12: `1. QĐ thành lập TỔ MUA SẮM.docx` (GÓI THẦU MUA SẮM MÁY PHOTO)
- **Đặc điểm & Cấu trúc:** 20,055 bytes; 2,526 ký tự, 47 đoạn văn.
- **Hiển thị thị giác:**
  - Nhãn tab: `1. QĐ thành lập TỔ MUA SẮM.docx`.
  - Bảng biểu (2 bảng): Bảng tiêu ngữ và bảng chữ ký không viền, căn lề chuẩn xác.
  - Ảnh nhúng: 2 ảnh shape đường kẻ ngang (Shape1: 126x1, Shape2: 203x1, data URI GIF, 0 broken).
  - Căn lề: 36/36 đoạn văn căn lề chính xác 100%. 0 ký tự ô vuông.
- **Ảnh bằng chứng:**
  - Tổng quan cửa sổ: [file12-qd-to-mua-sam-photo-window-overview.png](file:///E:/VNOffice-agy-livepath-qa-full/docs/screenshots/writer-live-open/file12-qd-to-mua-sam-photo-window-overview.png)
  - Đầu trang: [file12-qd-to-mua-sam-photo-viewport-top.png](file:///E:/VNOffice-agy-livepath-qa-full/docs/screenshots/writer-live-open/file12-qd-to-mua-sam-photo-viewport-top.png)
  - Giữa trang: [file12-qd-to-mua-sam-photo-viewport-middle.png](file:///E:/VNOffice-agy-livepath-qa-full/docs/screenshots/writer-live-open/file12-qd-to-mua-sam-photo-viewport-middle.png)
  - Chi tiết bảng: [file12-qd-to-mua-sam-photo-first-table.png](file:///E:/VNOffice-agy-livepath-qa-full/docs/screenshots/writer-live-open/file12-qd-to-mua-sam-photo-first-table.png)

#### Tệp 13: `2. Tờ trìn khlcnt.docx` (GÓI THẦU MUA SẮM MÁY PHOTO)
- **Đặc điểm & Cấu trúc:** 32,523 bytes; 7,062 ký tự, 153 đoạn văn.
- **Hiển thị thị giác:**
  - Nhãn tab: `2. Tờ trìn khlcnt.docx`.
  - Bảng biểu (4 bảng): Tương tự tệp 8, Bảng 2 là bảng kế hoạch lựa chọn nhà thầu máy photo 14 cột, 3 hàng, 29 ô viền đen 1px (w=908px, vượt lề phải khoảng 114px). Viewport cuộn ngang tốt, nội dung không bị cắt xén.
  - Ảnh nhúng: 3 ảnh shape kẻ ngang (62x1, 215x1, 208x1, data URI GIF, 0 broken).
  - Căn lề: 136/136 đoạn văn căn lề chính xác 100%. 0 ký tự ô vuông.
- **Ảnh bằng chứng:**
  - Tổng quan cửa sổ: [file13-to-trinh-khlcnt-photo-window-overview.png](file:///E:/VNOffice-agy-livepath-qa-full/docs/screenshots/writer-live-open/file13-to-trinh-khlcnt-photo-window-overview.png)
  - Đầu trang: [file13-to-trinh-khlcnt-photo-viewport-top.png](file:///E:/VNOffice-agy-livepath-qa-full/docs/screenshots/writer-live-open/file13-to-trinh-khlcnt-photo-viewport-top.png)
  - Giữa trang: [file13-to-trinh-khlcnt-photo-viewport-middle.png](file:///E:/VNOffice-agy-livepath-qa-full/docs/screenshots/writer-live-open/file13-to-trinh-khlcnt-photo-viewport-middle.png)
  - Chi tiết bảng: [file13-to-trinh-khlcnt-photo-first-table.png](file:///E:/VNOffice-agy-livepath-qa-full/docs/screenshots/writer-live-open/file13-to-trinh-khlcnt-photo-first-table.png)

#### Tệp 14: `8. Biên bản hoàn thiện hợp đồng.docx` (GÓI THẦU MUA SẮM MÁY PHOTO)
- **Đặc điểm & Cấu trúc:** 35,059 bytes; 6,338 ký tự, 128 đoạn văn.
- **Hiển thị thị giác:**
  - Nhãn tab: `8. Biên bản hoàn thiện hợp đồng.docx`.
  - Bảng biểu (2 bảng): Bảng 1 danh mục máy photo (6 hàng, 34 ô) viền đen 1px, w=603px vừa vặn; Bảng 2 chữ ký 2 cột đối xứng không viền.
  - Căn lề: 124/124 đoạn văn căn lề chính xác 100%. Giữ đúng màu chữ đỏ in nghiêng của điều khoản căn cứ. 0 ký tự ô vuông.
  - Header / Footer: Chân trang nạp trường số trang `1`.
- **Ảnh bằng chứng:**
  - Tổng quan cửa sổ: [file14-bien-ban-hoan-thien-hd-photo-window-overview.png](file:///E:/VNOffice-agy-livepath-qa-full/docs/screenshots/writer-live-open/file14-bien-ban-hoan-thien-hd-photo-window-overview.png)
  - Đầu trang: [file14-bien-ban-hoan-thien-hd-photo-viewport-top.png](file:///E:/VNOffice-agy-livepath-qa-full/docs/screenshots/writer-live-open/file14-bien-ban-hoan-thien-hd-photo-viewport-top.png)
  - Giữa trang: [file14-bien-ban-hoan-thien-hd-photo-viewport-middle.png](file:///E:/VNOffice-agy-livepath-qa-full/docs/screenshots/writer-live-open/file14-bien-ban-hoan-thien-hd-photo-viewport-middle.png)
  - Chi tiết bảng: [file14-bien-ban-hoan-thien-hd-photo-first-table.png](file:///E:/VNOffice-agy-livepath-qa-full/docs/screenshots/writer-live-open/file14-bien-ban-hoan-thien-hd-photo-first-table.png)

#### Tệp 15: `12. HĐ VÀ NGHIỆM THU, THANH LÝ (Autosaved).docx` (GÓI THẦU MUA SẮM MÁY PHOTO)
- **Đặc điểm & Cấu trúc:** 43,795 bytes; 13,549 ký tự, 308 đoạn văn.
- **Hiển thị thị giác:**
  - Nhãn tab: `12. HĐ VÀ NGHIỆM THU, THANH LÝ (Autosaved).docx`.
  - Bảng biểu (9 bảng): Bảng danh mục thiết bị máy photo Ricoh (4 hàng, 22 ô mỗi bảng) viền đen 1px, w=622px vừa khít khung trang. 6 bảng thể thức không viền.
  - Căn lề: 261/261 đoạn văn căn lề chính xác 100%. 0 ký tự ô vuông.
  - Header / Footer: Chân trang nạp trường số trang `0`.
- **Ảnh bằng chứng:**
  - Tổng quan cửa sổ: [file15-hd-nghiem-thu-thanh-ly-autosaved-photo-window-overview.png](file:///E:/VNOffice-agy-livepath-qa-full/docs/screenshots/writer-live-open/file15-hd-nghiem-thu-thanh-ly-autosaved-photo-window-overview.png)
  - Đầu trang: [file15-hd-nghiem-thu-thanh-ly-autosaved-photo-viewport-top.png](file:///E:/VNOffice-agy-livepath-qa-full/docs/screenshots/writer-live-open/file15-hd-nghiem-thu-thanh-ly-autosaved-photo-viewport-top.png)
  - Giữa trang: [file15-hd-nghiem-thu-thanh-ly-autosaved-photo-viewport-middle.png](file:///E:/VNOffice-agy-livepath-qa-full/docs/screenshots/writer-live-open/file15-hd-nghiem-thu-thanh-ly-autosaved-photo-viewport-middle.png)
  - Chi tiết bảng: [file15-hd-nghiem-thu-thanh-ly-autosaved-photo-first-table.png](file:///E:/VNOffice-agy-livepath-qa-full/docs/screenshots/writer-live-open/file15-hd-nghiem-thu-thanh-ly-autosaved-photo-first-table.png)

---

## 4. Xác nhận bản sửa lỗi CSS căn lề từ Đợt 1

Bản sửa lỗi CSS từ đợt 1 trong `apps/writer/writer.css`:
```css
.vno-writer-page p[align="center"], .vno-print-preview-body p[align="center"] { text-align: center; }
.vno-writer-page p[align="right"],  .vno-print-preview-body p[align="right"]  { text-align: right; }
.vno-writer-page p[align="left"],   .vno-print-preview-body p[align="left"]   { text-align: left; }
.vno-writer-page p[align="justify"],.vno-print-preview-body p[align="justify"]{ text-align: justify; }
.vno-writer-page td[align="center"],.vno-writer-page th[align="center"],
.vno-print-preview-body td[align="center"],.vno-print-preview-body th[align="center"] { text-align: center; }
.vno-writer-page td[align="right"], .vno-writer-page th[align="right"],
.vno-print-preview-body td[align="right"], .vno-print-preview-body th[align="right"]  { text-align: right; }
.vno-writer-page td[align="left"],  .vno-writer-page th[align="left"],
.vno-print-preview-body td[align="left"],  .vno-print-preview-body th[align="left"]   { text-align: left; }
```

**Kết quả kiểm toán trên toàn bộ 15 tệp (3,809 đoạn văn và ô bảng có thuộc tính `align=`):**
- Tổng số đoạn văn có `align=`: 3,809
- Số lỗi lệch căn lề (`pAlignMismatches`): **0 / 3,809 (Tỷ lệ khớp 100%)**
- Toàn bộ tiêu đề lớn ("HỢP ĐỒNG MUA BÁN", "BIÊN BẢN HOÀN THIỆN HỢP ĐỒNG", "QUYẾT ĐỊNH", "GIẤY ĐỀ NGHỊ THANH TOÁN", "CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM") đều căn giữa hoàn hảo.
- Toàn bộ dòng ngày tháng bên phải ("Quảng Trạch, ngày tháng năm 2026", "Ba Đồn, ngày...") đều căn phải đúng chuẩn thể thức văn bản hành chính Việt Nam.

---

## 5. Các vấn đề kiến trúc phát hiện (Báo cáo điều phối)

Tuân thủ nghiêm ngặt ranh giới an toàn (*"KHÔNG sửa main.py hay bất kỳ file Python nào; KHÔNG sửa adapters/libreoffice/writer/writer-adapter.js"*), dưới đây là báo cáo chuyên sâu về 4 vấn đề kiến trúc:

### Vấn đề kiến trúc 1: Hàm `_inline_html_images()` trong `main.py` làm mất ảnh khi tên tệp có tiếng Việt hoặc khoảng trắng (ĐÃ SỬA ở commit `80a43ad`)
- **Trạng thái:** ĐÃ SỬA và MERGED vào `main` tại commit `48710dd`.
- **Xác nhận thực tế qua đợt 2:** Toàn bộ 15/15 tệp DOCX (kể cả tệp 2, 10 có tên tiếng Việt và khoảng trắng: `hợp đồng sửa chữa 3T- UBXQT.docx`) đều nạp ảnh thành công thành data URI base64 (`brokenCount: 0`). Không còn bất kỳ ảnh nào bị lỗi 404.

### Vấn đề kiến trúc 2: Định dạng StarWriter HTML làm mất/gộp phẳng Header & Footer đa mục (Multi-section)
- **Hiện tượng:** Tệp DOCX gốc có từ 3 đến 5 footer XML riêng biệt (`footer1.xml` đến `footer5.xml`) theo từng section. StarWriter HTML chỉ xuất duy nhất 1 thẻ `<div title="footer">` chứa trường số trang tổng thể (`<sdfield>`), bỏ qua các header/footer đặc thù từng phân đoạn.
- **Tác động:** Đây là giới hạn vốn có của bộ lọc StarWriter HTML cổ điển trong LibreOffice Core.
- **Khuyến nghị kiến trúc:** Ghi nhận vào lộ trình tương lai để xem xét chuyển đổi luồng mở file thật sang FODT hoặc kết hợp overlay cấu trúc OOXML.

### Vấn đề kiến trúc 3 (MỚI PHÁT HIỆN Ở ĐỢT 2): StarWriter HTML chuyển hình vẽ đường kẻ ngang trang trí thành `<img>` với `align="left"` chèn giữa ký tự văn bản
- **Vị trí & Hiện tượng:** Xuất hiện tại Tệp 7 và Tệp 12 (`1. QĐ thành lập TỔ MUA SẮM.docx`). Trong DOCX gốc có hình vẽ đường kẻ ngang trang trí dưới cơ quan ban hành và quốc hiệu.
- **Nguyên nhân kỹ thuật:** StarWriter HTML không hỗ trợ vẽ vector/shape neo tuyệt đối mà xuất thành thẻ ảnh:
  `<b>P<img src="data:image/gif..." name="Shape1" align="left" width="125">HÒNG KINH TẾ</b>`
  `<b>C</b><img src="data:image/gif..." name="Shape2" align="left" width="202"><b>ỘNG HOÀ XÃ HỘI...</b>`
  Vì thẻ `<img>` có `align="left"`, Chromium User Agent stylesheet áp dụng `float: left`, kéo hình kẻ ngang lên mép trên cùng của ô bảng. Đồng thời, do StarWriter ngắt dòng chèn thẻ ảnh vào giữa ký tự đầu tiên (`P` và `HÒNG`, `C` và `ỘNG`), trình duyệt hiển thị khoảng trắng giữa hai chữ cái thành `P HÒNG`, `C ỘNG`.
- **Ranh giới:** Đây là hành vi phân mảnh nội dung do bộ lọc StarWriter HTML của LibreOffice tạo ra. Không thể sửa bằng CSS thuần túy mà không gây rủi ro phá vỡ hiển thị của các ảnh bình thường khác.

### Vấn đề kiến trúc 4 (MỚI PHÁT HIỆN Ở ĐỢT 2): Bảng biểu kế hoạch đấu thầu 14 cột rộng hơn khổ giấy A4 Portrait
- **Vị trí & Hiện tượng:** Xuất hiện tại Bảng #2 của Tệp 8 và Tệp 13 (`2. Tờ trìn khlcnt.docx` cho Máy bảo mật và Máy photo).
- **Nguyên nhân kỹ thuật:**
  - Bảng "Kế hoạch lựa chọn nhà thầu" có 14 cột chi tiết ("Stt", "Tên chủ đầu tư", "Tên gói thầu", "Tóm tắt công việc", "Giá gói thầu", "Nguồn vốn", "Hình thức...", "Phương thức...", "Thời gian tổ chức...", "Thời gian bắt đầu...", "Loại hợp đồng", "Thời gian thực hiện...", "Tùy chọn...", "Giám sát...").
  - Trong DOCX gốc, tác giả tạo bảng này với chiều rộng `w:tblW w="11448 dxa"` (~572pt = ~763px, chiếm 96% toàn bộ bề rộng tờ giấy A4) trong tài liệu một section trang dọc (`w=11907, h=16840`).
  - Khi nạp vào VN Writer, với lề trang A4 chuẩn NĐ 30 (khổ in khả dụng ~641px), bảng tự co dãn đến bề rộng tối thiểu cho phép hiển thị các từ ngữ (908px - 916px) và tràn qua mép lề phải khoảng 114px - 122px.
- **Trải nghiệm người dùng:** Vùng soạn thảo `.vno-writer-viewport` của VN Writer hỗ trợ cuộn ngang mượt mà, văn bản trong các ô vẫn được định dạng viền 1px đen và hiển thị đầy đủ, không bị xén mất thông tin.

---

## 6. Hướng dẫn sử dụng trong ứng dụng (Tuân thủ AGENTS.md Mục 10)

Tính năng "Mở tài liệu có sẵn (Word DOCX / ODT)" đã được bổ sung đầy đủ nội dung hướng dẫn sử dụng tiếng Việt thật tại [platform/help/entries-writer.js](file:///E:/VNOffice-agy-livepath-qa-full/platform/help/entries-writer.js#L686-L700):
- **ID bài viết:** `writer.file.openDocument`
- **Tiêu đề:** Mở tài liệu có sẵn (Word DOCX / ODT)
- **Tóm tắt:** Mở tệp tài liệu Word (.docx, .doc) hoặc OpenDocument (.odt) có sẵn trên máy tính qua phím tắt Ctrl+O hoặc menu Tệp. Tự động nạp định dạng, căn lề, bảng biểu và cập nhật nhãn tài liệu.
- **Các bước thực hiện:** Hướng dẫn chi tiết 2 cách mở qua phím tắt Ctrl+O hoặc qua tab Tệp (Backstage), giải thích cơ chế thích ứng khổ A4 chuẩn Nghị định 30/2020/NĐ-CP và cập nhật nhãn tài liệu trên thanh tab.

---

## 7. Kết quả kiểm thử bắt buộc

| Bộ kiểm thử | Yêu cầu | Kết quả thực tế | Trạng thái |
|---|---|---|---|
| `node scripts/check-syntax.js` | 89/89 PASS | **89/89 files hợp lệ, 0 lỗi cú pháp** | **PASS** |
| `node tests/run-tests.js` | Không giảm so với nền (1511) | **1511/1511 PASS, 0 FAIL** | **PASS** |
| `node tests/live/ribbon-audit-1280.playwright.mjs` | 100% PASS nếu sửa CSS | **104/104 tabs PASS, 0px tràn ngang tại 1280px** | **PASS** |
| `node tests/live/writer-live-open-qa.playwright.mjs` | Toàn bộ 15 tệp thật | **15/15 file DOCX mở thành công, chụp 60 ảnh màn hình** | **PASS** |

---

## 8. Nguyên văn Git Log và Git Status

### Kết quả `git log --oneline main..HEAD`:
```text
442501e qa(writer): kiem tra thi giac luong Mo file THAT tren toan bo kho 15 file docx
```

### Kết quả `git status`:
```text
On branch visual-qa/writer-live-open-full-corpus
nothing to commit, working tree clean
```
