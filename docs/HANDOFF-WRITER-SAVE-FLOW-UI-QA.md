# Bàn giao: Kiểm tra thị giác & UI/UX luồng Lưu file thật của VN Writer

## 1. Bối cảnh & Nhiệm vụ

- Nhiệm vụ: Kiểm tra thị giác thao tác Lưu file THẬT qua giao diện người dùng VN Writer (Quick Access toolbar, phím tắt Ctrl+S, Backstage Menu Lưu) từ góc độ UI/UX.
- Bối cảnh song song: Nhánh `test/writer-save-roundtrip-fidelity` đang kiểm tra round-trip tầng Python/backend. Nhiệm vụ này tập trung 100% vào tầng UI/UX của thao tác Lưu, phản hồi giao diện khi không có desktop engine và khi lưu thành công, cũng như khả năng bảo lưu định dạng đoạn văn bản vừa hoàn thành (`writer.para.spacingBefore`/`spacingAfter`).

---

## 2. Các hạng mục đã kiểm tra & kết quả thực nghiệm

### 2.1. Thao tác nhập văn bản tiếng Việt & Chèn bảng
- Đã kiểm tra trực tiếp qua Playwright trên trình duyệt Edge:
  - Soạn thảo và thêm các đoạn văn bản hành chính tiếng Việt mẫu có cấu trúc chuẩn (Điều 1, Điều 2...).
  - Thao tác chèn bảng thông qua ribbon tab **Chèn** (`#vno-ribbon-tab-insert` -> nút `writer.table.insert`): Bảng được chèn trực tiếp vào vùng soạn thảo `.vno-writer-body`, số lượng bảng tăng và hiển thị chuẩn xác.

### 2.2. Kiểm tra tính năng "Khoảng cách trước/sau đoạn" (tab Bố cục)
- Trên tab **Bố cục** (`#vno-ribbon-tab-layout`), nhóm **Đoạn văn**:
  - Đã kiểm tra 2 dropdown select: `writer.para.spacingBefore` và `writer.para.spacingAfter` (mỗi select gồm các mức: 0 pt, 6 pt, 8 pt, 12 pt, 18 pt).
  - Chọn đoạn 1, áp dụng khoảng cách trước 12 pt: đoạn nhận style `margin-top: 12pt`.
  - Chọn đoạn 2, áp dụng khoảng cách sau 18 pt: đoạn nhận style `margin-bottom: 18pt`.
  - Chọn đoạn 3, áp dụng kết hợp khoảng trước 6 pt và khoảng sau 8 pt: nhận đầy đủ cả 2 style inline.
  - Khi xuất nội dung qua `_contentForExport()` gửi sang engine lưu, toàn bộ các thuộc tính CSS `margin-top` và `margin-bottom` này được giữ nguyên vẹn trong HTML payload.

### 2.3. Phản hồi UI khi API Lưu KHÔNG khả dụng (Môi trường Web/Playwright không có Desktop bridge)
- Đã kích hoạt lệnh Lưu qua cả 3 đường:
  1. Nút Lưu trên thanh công cụ truy cập nhanh: `.vno-quick-btn[data-cmd="common.file.save"]`.
  2. Phím tắt bàn phím: `Ctrl+S`.
  3. Nút Lưu trong menu Tệp (Backstage): tab Tệp -> `button[data-backstage-cmd="common.file.save"]`.
- Kết quả phản hồi UI:
  - **Không bị treo hoặc im lặng**: Ứng dụng ngay lập tức hiển thị hộp thoại cảnh báo tiêu chuẩn `.vno-dialog-box` với tiêu đề `"Không thể lưu"` và thông điệp rõ ràng, thân thiện: *"Chức năng Lưu tệp thật chỉ khả dụng trong VN Office Desktop App (đã cài LibreOffice)."*.
  - **Khả năng tương tác bàn phím chuẩn Accessibility**: Người dùng có thể nhấn phím `Enter`, phím `Escape` hoặc nhấp chuột vào nút `Đồng ý` (`.vno-dialog-ok-btn`) để đóng hộp thoại lập tức và tiếp tục làm việc.
  - Menu Backstage tự động đóng lại khi nhấn nút Lưu trước khi hiển thị hộp thoại, không bị che khuất hay kẹt trạng thái mở.
  - Phím tắt `Ctrl+S` và nút Backstage hoạt động đồng nhất 100% (cùng gọi chung handler `common.file.save`).

### 2.4. Phản hồi UI khi API Lưu THÀNH CÔNG (Simulated Desktop Engine)
- Giả lập `globalUnoBridge.saveRealFile` trả về `{ status: "ok", message: "Đã lưu tại C:/TaiLieu/Quyết định số 26 ban hành quy chế.docx", path: "C:/TaiLieu/Quyết định số 26 ban hành quy chế.docx" }`:
  - Lệnh gửi sang `UnoBridge` nhận đúng: `appKind = "writer"`, `targetFormat = "docx"`, suggested name kế thừa tên tài liệu hiện có.
  - Payload xuất `content` bảo lưu trọn vẹn văn bản tiếng Việt, bảng biểu vừa chèn, và các thông số `spacingBefore`/`spacingAfter`.
  - Hộp thoại thành công hiển thị rõ ràng với tiêu đề `"Đã lưu"` và đường dẫn tệp đã ghi ra đĩa.
  - Cờ trạng thái chỉnh sửa `this.isDirty` được thiết lập lại về `false`.

---

## 3. Các cải tiến UI/UX đã thực hiện

Trong quá trình kiểm tra thực tế, phát hiện 2 điểm thiếu sót UI/UX thuần túy và đã sửa an toàn:

1. **Cập nhật nhãn tên tệp trên thanh tab cửa sổ sau khi Lưu thành công**:
   - *Hiện trạng cũ*: Sau khi Lưu (kể cả chọn nơi lưu và tên tệp mới), thanh tab tiêu đề trên đỉnh cửa sổ (`.vno-doc-tab span`) vẫn giữ nguyên tên demo cũ hoặc tên mặc định (`Quyết định ban hành tiêu chuẩn 01.docx`). Thuộc tính `this.sourceFileName` cũng không được cập nhật, khiến các lần Lưu sau tiếp tục gợi ý tên cũ.
   - *Đã sửa* (`adapters/libreoffice/writer/writer-adapter.js`): Khi `save()` nhận được `result.path` hoặc `result.fileName`, tự động trích xuất tên tệp mới, cập nhật `this.sourceFileName` và gọi `this.shell?.resetDocumentChrome?.(savedFileName, null)`.
2. **Bảo toàn tab Ribbon đang chọn khi cập nhật Chrome tài liệu**:
   - *Hiện trạng cũ*: `AppShell.resetDocumentChrome(name, homeTabId = "home")` luôn ép Ribbon chuyển về tab "home", gây khó chịu nếu người dùng đang ở tab "Bố cục" hoặc "Chèn" rồi bấm Ctrl+S.
   - *Đã sửa* (`platform/shell/app-shell.js`): Hỗ trợ `homeTabId = null` để chỉ cập nhật nhãn tài liệu và đồng bộ vào `RecentFilesManager` mà không can thiệp vào tab Ribbon đang mở.
3. **Bổ sung Hướng dẫn sử dụng tiếng Việt trong app (Tuân thủ AGENTS.md Mục 10)**:
   - Thêm bài hướng dẫn `writer.file.saveDocument` vào `platform/help/entries-writer.js`: Hướng dẫn chi tiết cách Lưu tài liệu và Lưu bản sao (Ctrl+S, nút đĩa mềm Quick Access, Backstage menu), các bước thao tác và lưu ý về môi trường Desktop / Web.

---

## 4. Test Playwright mới

- Tạo mới tệp kiểm thử tự động trực quan: `tests/live/writer-save-flow-ui-qa.playwright.mjs`.
- Kịch bản kiểm thử bao phủ toàn bộ 6 bước:
  1. Khởi động Writer, đo đạc nhãn tab ban đầu.
  2. Soạn thảo 3 đoạn văn bản tiếng Việt.
  3. Tương tác select `writer.para.spacingBefore` (12pt, 6pt) và `writer.para.spacingAfter` (18pt, 8pt), xác minh CSS inline.
  4. Chèn bảng qua tab Chèn trên ribbon, xác minh DOM body nhận bảng mới.
  5. Thử nghiệm luồng Lưu khi không có desktop bridge (Quick Access, Ctrl+S, Backstage) -> xác nhận hộp thoại lỗi thân thiện, đóng mở bằng Esc/Enter.
  6. Thử nghiệm luồng Lưu khi có desktop bridge -> xác nhận payload UnoBridge, hộp thoại thành công, cờ `isDirty = false`, cập nhật nhãn tab tệp.
- Kết quả: **100% PASS** trên Microsoft Edge Headless.

---

## 5. Bảng tổng hợp kết quả kiểm thử bắt buộc

| Bộ kiểm thử | Lệnh chạy | Kết quả | Ghi chú |
|---|---|---|---|
| **Cú pháp toàn dự án** | `node scripts/check-syntax.js` | **89/89 PASS** | 0 lỗi cú pháp |
| **Unit & Integration Suite** | `node tests/run-tests.js` | **1511/1511 PASS** | Không giảm so với ban đầu (1511) |
| **Ribbon Audit 1280px** | `node tests/live/ribbon-audit-1280.playwright.mjs` | **100% PASS** | 104/104 lượt kiểm tra (26 tabs x 2 độ phân giải x 2 ngôn ngữ) |
| **Writer Save Flow UI QA (Mới)** | `node tests/live/writer-save-flow-ui-qa.playwright.mjs` | **100% PASS** | Kiểm tra toàn diện luồng Lưu qua UI |

---

## 6. Ghi chú cho nhiệm vụ song song (Round-trip tầng Python)

- Về tầng UI/UX: Giao diện người dùng VN Writer phát lệnh `common.file.save` (ánh xạ Uno `.uno:Save`) và truyền nội dung HTML đầy đủ qua `saveRealFile(content, "writer", "docx", suggestedName)`.
- Backend Python `save_document_dialog()` trong `main.py` nhận payload HTML từ `_contentForExport()`. Khi chuyển đổi qua `soffice`, các thuộc tính CSS như `margin-top`, `margin-bottom` và các bảng biểu HTML cần được bộ lọc import HTML của LibreOffice chuyển đổi thành `w:spacing` (`w:before`, `w:after`) và `w:tbl` tương ứng trong DOCX. Nhánh kiểm thử song song có thể yên tâm rằng tầng UI đã đóng gói và truyền đúng các thuộc tính này trong payload.
