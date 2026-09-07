# Bàn giao: Nhãn tên tệp trên tab không cập nhật sau khi Mở tệp thật (cả 3 app)

## 1. Bối cảnh & lỗi thật

Người dùng yêu cầu kiểm thử trực tiếp: mở một file Excel thật (`Sữa chữa UB quảng trạch.xlsx`) trong VN Office Desktop App qua đối số dòng lệnh (`python main.py "<file>"`) để so sánh với Excel thật. Quan sát ban đầu (chụp màn hình cửa sổ thật) cho thấy dữ liệu hiển thị KHÔNG khớp tên tệp đã mở — tab đầu cửa sổ vẫn ghi "Dự toán kinh phí VN Office 2026.xlsx" (tài liệu demo mặc định), khiến ban đầu nghi ngờ toàn bộ tính năng mở-tệp-qua-dòng-lệnh bị hỏng hoàn toàn.

## 2. Chẩn đoán thật (không đoán mò)

Thêm log tạm thời (`print(..., flush=True)`) vào `VnOfficeApi.open_document_dialog()` trong `main.py`, chạy Desktop App thật với `-RedirectStandardOutput`/`-RedirectStandardError` để bắt log không cần can thiệp cửa sổ:

```
[DEBUG] open_document_dialog CALLED app_kind='sheet' ...
[DEBUG] open_document_dialog SUCCESS fileName='Sữa chữa UB quảng trạch.xlsx' contentLen=892629
```

**Xác nhận: backend Python hoạt động ĐÚNG 100%** — soffice chuyển đổi thành công, trả về `content` FODS đầy đủ (892KB). Xem lại kỹ ảnh chụp màn hình ban đầu: DỮ LIỆU trong ô lưới thực ra ĐÃ đúng (số liệu, tên công ty, các tab sheet đều khớp file thật) — CHỈ CÓ nhãn tên tệp trên tab đầu cửa sổ là sai/cũ. Kết luận ban đầu "mở tệp hoàn toàn không hoạt động" là SAI — phạm vi lỗi hẹp hơn nhiều.

**Nguyên nhân gốc**: `AppShell.resetDocumentChrome(name)` (cập nhật `this.documentName` + text tab + đưa ribbon về tab Home) đã tồn tại sẵn trong `platform/shell/app-shell.js`, nhưng CHỈ được gọi ở 3 nơi — mỗi adapter khi xử lý **File → Mới** hoặc **File → Đóng** (`sheet-adapter.js`, `writer-adapter.js`, `slides-adapter.js`, mỗi nơi 1 dòng `this.shell?.resetDocumentChrome?.("...")`). **KHÔNG nơi nào trong cả 3 `open()` (File → Mở) gọi hàm này** — sau khi `result.status === "ok"`, cả 3 adapter chỉ cập nhật `this.sourceFileName` (biến nội bộ dùng khi Lưu lại) mà quên đồng bộ ngược ra UI chrome.

## 3. Giải pháp

Thêm đúng 1 dòng `this.shell?.resetDocumentChrome?.(result.fileName || "<tên mặc định theo app>");` vào cuối nhánh thành công của `open()` trong cả 3 adapter — tái sử dụng NGUYÊN VẸN hàm đã có sẵn, không tạo cơ chế mới.

## 4. Phát hiện phụ (không sửa trong đợt này, ghi nhận để theo dõi)

- Cả 3 `open()` KHÔNG gọi `RecentFilesManager.recordFile(...)` sau khi mở tệp thật — "Tệp gần đây" trên Backstage sẽ không ghi nhận file vừa mở qua File → Mở thật (chỉ ghi nhận khi tạo tài liệu mới). Cần một đợt sửa riêng nếu ưu tiên.
- Trạng thái thanh trạng thái Sheet hiển thị `TỔNG CỘNG: 226.479.494.916.838.460 đ` khi mở file test thật — con số bất thường lớn, cần đối chiếu với Excel thật để xác định đây là dữ liệu gốc của file hay lỗi tính tổng của VN Sheet (CHƯA điều tra trong đợt này).

## 5. Kết quả kiểm thử

- `node scripts/check-syntax.js`: 89/89 PASS.
- `node tests/run-tests.js`: 1419/1419 PASS.
- `node tests/live/ribbon-audit-1280.playwright.mjs`: 100% PASS, 26/26 tab.
- `node tests/live/file-open-updates-document-tab.playwright.mjs` (mới): giả lập `openRealFile()` trả về thành công cho cả 3 app, xác nhận tab cập nhật đúng tên tệp mới, không giữ nguyên tên demo cũ — PASS cả 3/3.
- Xác nhận qua Desktop App thật (log Python + ảnh chụp màn hình thật): dữ liệu tệp XLSX thật nạp đúng 100%, tab trước khi sửa hiển thị sai tên — sau khi áp fix cần xác nhận lại trực quan bằng ảnh chụp Desktop App thật.

---
Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01NQAtxPSqMH9cVDTLUuckNw
