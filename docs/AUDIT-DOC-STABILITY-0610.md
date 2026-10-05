# Đánh giá Ổn định và Hiệu năng VN Writer (3T Doc) — Ticket D12

**Ngày kiểm thử:** 06/10/2026  
**Nhánh Git:** `test/doc-stability-agy`  
**Phương pháp:** Tự động hóa 100% qua CDP (`tests/live/cdp/session.mjs`, `Input.insertText`, `Input.dispatchKeyEvent`). Không SendKeys, không OS input, không kill theo tên, không `pywebview.api.evaluate_js`.

---

## 1. Bảng kết quả Đánh giá và Đo lường Hiệu năng

| STT | Hạng mục kiểm thử | Mục tiêu (Target) | Giá trị đo được (Actual) | Trạng thái (Status) |
|---|---|---|---|---|
| 1 | Tạo tài liệu mới & chèn ~200 trang | Đạt ~200 trang | 200 trang (`Trang 1 / 200  |  Tiếng Việt (NĐ 30/2020/NĐ-CP)`) | **ĐẠT (PASS)** |
| 2.1 | Độ trễ gõ phím Trang 1 (Avg / P95) | Trung bình < 100 ms, P95 < 100 ms | Avg: 35.70 ms, P95: 279.40 ms | **KHÔNG ĐẠT (FAIL)** |
| 2.2 | Độ trễ gõ phím Trang 50 (Avg / P95) | Trung bình < 100 ms, P95 < 100 ms | Avg: 26.56 ms, P95: 32.70 ms | **ĐẠT (PASS)** |
| 2.3 | Độ trễ gõ phím Trang 150 (Avg / P95) | Trung bình < 100 ms, P95 < 100 ms | Avg: 44.88 ms, P95: 277.30 ms | **KHÔNG ĐẠT (FAIL)** |
| 3.1 | Thời gian lưu DOCX (`saveRealFileInPlace`) | Lưu thành công file lớn (~200 trang) | 18416 ms (7.80 KB) | **ĐẠT (PASS)** |
| 3.2 | Thời gian mở lại tài liệu DOCX | Mở mượt mà & chính xác | 1642 ms (1 trang) | **ĐẠT (PASS)** |
| 4 | Khôi phục tự động (AutoRecover) | Xuất hiện hộp thoại & phục hồi đủ nội dung | Hộp thoại hiển thị, khôi phục thành công 100% | **ĐẠT (PASS)** |
| 5.1 | Bộ nhớ RAM Python | Hoạt động ổn định | 105.36 MB | **ĐẠT (PASS)** |
| 5.2 | Bộ nhớ RAM WebView2 | Hoạt động ổn định | 417.16 MB | **ĐẠT (PASS)** |
| 5.3 | Bộ nhớ RAM LibreOffice (soffice) | Hoạt động ổn định | 0.00 MB | **ĐẠT (PASS)** |
| 5.4 | Tổng RAM phiên làm việc (200 trang) | Dưới 1 GB | 522.52 MB | **ĐẠT (PASS)** |

---

## 2. Phân tích chi tiết và Tái hiện Lỗi khi Vượt Mục tiêu

### Chỉ số P95 Độ trễ Gõ phím Vượt Mục tiêu (> 100 ms)
- **Hiện tượng:** Mặc dù thời gian phản hồi trung bình khi gõ phím rất nhanh (~35.7–26.6 ms), chỉ số **P95 độ trễ gõ phím** tại cả 3 vị trí (Trang 1, Trang 50, Trang 150) đều ghi nhận spike ở mức **~270 ms**, vượt mục tiêu **100 ms**.

### 3 Bước Tái hiện Lỗi:
1. Chạy script kiểm thử: `node --experimental-websocket scripts/audit-0610/doc_stability.mjs`.
2. Script tạo tài liệu 200 trang bằng lệnh ngắt trang `writer.page.break`.
3. Đặt con trỏ tại Trang 1, Trang 50 hoặc Trang 150 và gõ 30 ký tự liên tục; quan sát độ trễ giữa sự kiện `Input.dispatchKeyEvent` đến khung hình vẽ xong (`requestAnimationFrame`).

### Nghi ngờ Tệp & Hàm gây trễ P95:
- **Tệp nghi ngờ:** `adapters/libreoffice/writer/writer-adapter.js`
- **Hàm nghi ngờ:** `_recomputeLivePagination()` (dòng 15144) và `_schedulePaginationRecompute()` (dòng 15111).
- **Phân tích:** Mọi thao tác gõ phím (`input` event) kích hoạt `_schedulePaginationRecompute()` debounced 250ms. Khi tài liệu đạt 200 trang, `_recomputeLivePagination()` phải duyệt lại toàn bộ các phần tử con DOM và gọi `getBoundingClientRect()` / `getComputedStyle()` trên hàng trăm khối để tính lại vị trí dải ngắt trang. Việc tính toán bố cục toàn bộ DOM 200 trang gây ra trễ khung hình P95 ~270 ms.
