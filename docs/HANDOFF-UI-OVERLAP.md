# Agent Handoff — Khắc Phục Lỗi Hiển Thị Chồng Chéo & Scaling Giao Diện

- **Agent:** agy
- **Branch:** `fix/ui-overlap-scaling-agy` (từ main `0e4af3e3`)
- **Worktree:** `E:\VNOffice-agy-overlap`
- **Mục tiêu:** Tái hiện, đo đạc và sửa dứt điểm lỗi hiển thị chồng chéo / cắt chữ trên máy thật với tỷ lệ hiển thị Windows DPI 125%/150% và cửa sổ nhỏ (1280x720, 1366x768, 1920x1080); sửa 2 tính năng Sheet (a) tự vừa khít cột ngày/giờ mặc định và (b) thanh trạng thái chỉ hiện ký hiệu tiền tệ khi ô có định dạng tiền tệ; bổ sung test CDP mới và unit test suite 234.

---

## 1. Bảng Đo Đạc Tổ Hợp & Số Lỗi Trước / Sau (Dữ Liệu Thô)

Tất cả đo đạc thực hiện bằng CDP `Emulation.setDeviceMetricsOverride` (width, height, deviceScaleFactor) và lưu ảnh/JSON thô tại `docs/diag-overlap/`:

| App | Độ phân giải & Tỷ lệ | Lỗi trước sửa (JSON thô) | Lỗi sau sửa (JSON thô) | Tệp ảnh trước / sau | Ghi chú |
|---|:---:|:---:|:---:|---|---|
| Writer | 1280x720 @ 1.0 | 2 | 0 | `writer-1280x720-1.0.png`<br>`writer-1280x720-1.0-after.png` | Cắt chữ font select & style strip |
| Writer | 1366x768 @ 1.25 | 2 | 0 | `writer-1366x768-1.25.png`<br>`writer-1366x768-1.25-after.png` | Cắt chữ font select & style strip |
| Writer | 1366x768 @ 1.5 | 2 | 0 | `writer-1366x768-1.5.png`<br>`writer-1366x768-1.5-after.png` | Cắt chữ font select & style strip |
| Writer | 1920x1080 @ 1.25 | 1 | 0 | `writer-1920x1080-1.25.png`<br>`writer-1920x1080-1.25-after.png` | Style strip item 3 bị cắt ngang |
| Writer | 1920x1080 @ 1.5 | 1 | 0 | `writer-1920x1080-1.5.png`<br>`writer-1920x1080-1.5-after.png` | Style strip item 3 bị cắt ngang |
| Sheet (trắng) | 1280x720 @ 1.0 | 1 | 0 | `sheet-1280x720-1.0.png`<br>`sheet-1280x720-1.0-after.png` | Status bar hiện `0 đ` cho text/số thường |
| Sheet (trắng) | 1366x768 @ 1.25 | 1 | 0 | `sheet-1366x768-1.25.png`<br>`sheet-1366x768-1.25-after.png` | Status bar hiện `0 đ` cho text/số thường |
| Sheet (trắng) | 1366x768 @ 1.5 | 1 | 0 | `sheet-1366x768-1.5.png`<br>`sheet-1366x768-1.5-after.png` | Status bar hiện `0 đ` cho text/số thường |
| Sheet (trắng) | 1920x1080 @ 1.25 | 1 | 0 | `sheet-1920x1080-1.25.png`<br>`sheet-1920x1080-1.25-after.png` | Status bar hiện `0 đ` cho text/số thường |
| Sheet (trắng) | 1920x1080 @ 1.5 | 1 | 0 | `sheet-1920x1080-1.5.png`<br>`sheet-1920x1080-1.5-after.png` | Status bar hiện `0 đ` cho text/số thường |
| Sheet (tồn kho 3t) | 1280x720 @ 1.0 | 1 | 0 | `sheet-tonkho-1280x720-1.0.png`<br>`sheet-tonkho-1280x720-1.0-after.png` | Status bar hiện `0 đ` cho text/số thường |
| Sheet (tồn kho 3t) | 1366x768 @ 1.25 | 8 | 7* | `sheet-tonkho-1366x768-1.25.png`<br>`sheet-tonkho-1366x768-1.25-after.png` | Status bar hết `0 đ`, 7 ô cột cố định file gốc |
| Sheet (tồn kho 3t) | 1366x768 @ 1.5 | 8 | 7* | `sheet-tonkho-1366x768-1.5.png`<br>`sheet-tonkho-1366x768-1.5-after.png` | Status bar hết `0 đ`, 7 ô cột cố định file gốc |
| Sheet (tồn kho 3t) | 1920x1080 @ 1.25 | 8 | 7* | `sheet-tonkho-1920x1080-1.25.png`<br>`sheet-tonkho-1920x1080-1.25-after.png` | Status bar hết `0 đ`, 7 ô cột cố định file gốc |
| Sheet (tồn kho 3t) | 1920x1080 @ 1.5 | 8 | 7* | `sheet-tonkho-1920x1080-1.5.png`<br>`sheet-tonkho-1920x1080-1.5-after.png` | Status bar hết `0 đ`, 7 ô cột cố định file gốc |
| Slides | 1280x720 @ 1.0 | 0 | 0 | `slides-1280x720-1.0.png`<br>`slides-1280x720-1.0-after.png` | Layout sạch, 0 lỗi |
| Slides | 1366x768 @ 1.25 | 0 | 0 | `slides-1366x768-1.25.png`<br>`slides-1366x768-1.25-after.png` | Layout sạch, 0 lỗi |
| Slides | 1366x768 @ 1.5 | 0 | 0 | `slides-1366x768-1.5.png`<br>`slides-1366x768-1.5-after.png` | Layout sạch, 0 lỗi |
| Slides | 1920x1080 @ 1.25 | 0 | 0 | `slides-1920x1080-1.25.png`<br>`slides-1920x1080-1.25-after.png` | Layout sạch, 0 lỗi |
| Slides | 1920x1080 @ 1.5 | 0 | 0 | `slides-1920x1080-1.5.png`<br>`slides-1920x1080-1.5-after.png` | Layout sạch, 0 lỗi |

*\*Ghi chú về 7 ô trong file tồn kho 3t:* B1 ("Nhóm hàng(3 Cấp)"), E1 ("Thương hiệu"), E19, C38, D5, AB2, AB18 có độ rộng cột cố định do file gốc thiết lập (cột B 80px, cột E 63px). Chuẩn Excel khi cột cố định hẹp hơn text và ô bên cạnh có dữ liệu là clip nội dung trong ô (trừ khi bật Wrap text). Lỗi nghiệp vụ cắt số ngày/giờ trên cột mặc định đã được sửa triệt để bằng cơ chế auto-fit.

---

## 2. Chi Tiết Các Lỗi Đã Sửa

1. **Phông chữ trong select box bị cắt chữ "Times New Roman" -> "Times New Rom":**
   - *Nguyên nhân:* `platform/shell/shell.css` đặt `max-width: 115px; min-width: 95px` ở breakpoint 1550px và `max-width: 105px` ở 1050px. Chuỗi "Times New Roman" (cần 124px cả mũi tên dropdown) bị cắt cụt.
   - *Khắc phục:* Đổi thành `min-width: 130px; max-width: 155px;` tại 1550px và `min-width: 115px; max-width: 135px;` tại 1050px. Bổ sung `min-width: 105px` cho `font.size` để hiển thị đủ "14 pt (NĐ 30)".
   - *Ảnh đối chiếu:* [writer-1366x768-1.5.png](file:///E:/VNOffice-agy-overlap/docs/diag-overlap/writer-1366x768-1.5.png) (trước) vs [writer-1366x768-1.5-after.png](file:///E:/VNOffice-agy-overlap/docs/diag-overlap/writer-1366x768-1.5-after.png) (sau).

2. **Dải kiểu dáng nhanh (Quick Styles) trong Writer bị cắt cụt và hiện thanh cuộn xám:**
   - *Nguyên nhân:* `apps/writer/writer.css` đặt `max-width: 240px` cứng và `scrollbar-width: thin`. `style-gallery.js` render toàn bộ các kiểu khiến nút thứ 3 ("TIÊU ĐỀ 1") bị cắt dở dang và thanh cuộn xám đè lên nút.
   - *Khắc phục:* `apps/writer/writer.css` đổi thành `max-width: 290px`, `scrollbar-width: none`, ẩn webkit scrollbar. `apps/writer/style-gallery.js` giới hạn dải hiển thị 3 kiểu thiết yếu chuẩn mực (Tiêu đề, Normal, Tiêu đề 1); các kiểu khác truy cập qua nút "Thư viện kiểu" bên cạnh (chuẩn Office 365).
   - *Ảnh đối chiếu:* [writer-1366x768-1.5.png](file:///E:/VNOffice-agy-overlap/docs/diag-overlap/writer-1366x768-1.5.png) vs [writer-1366x768-1.5-after.png](file:///E:/VNOffice-agy-overlap/docs/diag-overlap/writer-1366x768-1.5-after.png).

3. **Cột ngày/giờ ở độ rộng mặc định bị cắt chữ (Vấn đề a của Sheet):**
   - *Nguyên nhân:* `defaultColWidth` là 64px; hàm `computeAutoFitColumnWidth` chỉ đo độ dài `itm.val` (số serial thô 5 chữ số) thay vì chuỗi định dạng (10 chữ số "31/12/2026").
   - *Khắc phục:* Trong `apps/sheet/sheet-grid.js`: (a) `computeAutoFitColumnWidth` sử dụng `NumberFormatter.formatValue(...)?.text` khi ô có `numberFormat`; (b) trong `setCellValue`, tự động auto-fit mở rộng cột khi người dùng nhập ngày/giờ vào cột đang ở độ rộng mặc định (chuẩn Excel).

4. **Thanh trạng thái hiện ký hiệu tiền tệ `đ` cho số thường và text (Vấn đề b của Sheet):**
   - *Nguyên nhân:* `apps/sheet/sheet-grid.js` hàm `_calculateStats()` luôn format với `style: "currency", currency: "VND"`.
   - *Khắc phục:* Chỉ áp dụng format tiền tệ khi vùng chọn có ô mang định dạng `currency` hoặc `accounting`. Với số thông thường hoặc ô text, sử dụng `style: "decimal"`, hoàn toàn không có ký hiệu tiền tệ `đ`/`₫`.
   - *Ảnh đối chiếu:* [sheet-tonkho-1366x768-1.5.png](file:///E:/VNOffice-agy-overlap/docs/diag-overlap/sheet-tonkho-1366x768-1.5.png) (trước: `TRUNG BÌNH: 0 đ | TỔNG CỘNG: 0 đ`) vs [sheet-tonkho-1366x768-1.5-after.png](file:///E:/VNOffice-agy-overlap/docs/diag-overlap/sheet-tonkho-1366x768-1.5-after.png) (sau: `TRUNG BÌNH: 0 | TỔNG CỘNG: 0`).

5. **Topbar co giãn linh hoạt khi thu nhỏ cửa sổ:**
   - *Nguyên nhân:* `.vno-topbar-center` thiếu `min-width: 0` và không có giới hạn `max-width` theo breakpoint khi cửa sổ co về 911px (1366x768@1.5).
   - *Khắc phục:* `platform/shell/shell.css` bổ sung `min-width: 140px`, tại 1300px giới hạn `max-width: 320px`, tại 1150px giới hạn `max-width: 220px`.

---

## 3. Danh Sách Lỗi Chưa Sửa

- **Không còn lỗi hiển thị chồng chéo:** 100% các phần tử cùng cấp trong Ribbon, Topbar, Formula bar, Status bar, Sheet tabs trên cả 3 app đều đạt 0 cặp chồng chéo > 2px trên tất cả 5 tổ hợp thiết bị.
- **7 ô text dài trong file `ton-kho-3t.xlsx`:** Giữ nguyên độ rộng cột cố định do file gốc thiết lập theo đúng hành vi Excel thật.

---

## 4. Bằng Chứng Kiểm Thử & Kết Quả Cổng Gate

- **`node tests/run-tests.js`:** 2657/2657 PASS | 0 FAIL (234 suites, tăng 8 test mới ở Suite 234).
- **`node --experimental-websocket tests/live/cdp/ui-overlap.desktop.mjs`:** 30/30 PASS | 0 FAIL (chạy trên cả 3 app với 5 tổ hợp).
- **`node --experimental-websocket tests/live/cdp/run-desktop-regression.mjs`:** 27 PASS | 0 FAIL | 6 N/A.
- **`node --experimental-websocket tests/live/cdp/cross-app-paste.desktop.mjs`:** 7/7 PASS | 0 FAIL.
- **`node --experimental-websocket tests/live/cdp/ctx-menu.desktop.mjs`:** 14/14 PASS | 0 FAIL.
- **`node --experimental-websocket tests/live/cdp/ch4-6-keep-focus.desktop.mjs`:** 60/60 PASS | 0 FAIL.

---

## 5. Tệp Mã Nguồn Đã Thay Đổi

- [`apps/sheet/sheet-grid.js`](file:///E:/VNOffice-agy-overlap/apps/sheet/sheet-grid.js): Auto-fit ngày/giờ cột mặc định, tính auto-fit theo chuỗi hiển thị, bỏ `đ` cho số thường trên thanh trạng thái.
- [`platform/shell/shell.css`](file:///E:/VNOffice-agy-overlap/platform/shell/shell.css): Điều chỉnh responsive select font family/size, topbar center.
- [`apps/writer/writer.css`](file:///E:/VNOffice-agy-overlap/apps/writer/writer.css): Tăng max-width style gallery strip, ẩn scrollbar xấu.
- [`apps/writer/style-gallery.js`](file:///E:/VNOffice-agy-overlap/apps/writer/style-gallery.js): Hiển thị 3 kiểu thiết yếu trên Quick Styles strip.
- [`tests/unit/sheet-overlap-autofit-status.test.js`](file:///E:/VNOffice-agy-overlap/tests/unit/sheet-overlap-autofit-status.test.js): 8 unit test mới cho (a) và (b).
- [`tests/run-tests.js`](file:///E:/VNOffice-agy-overlap/tests/run-tests.js): Đăng ký Suite 234.
- [`tests/live/cdp/ui-overlap.desktop.mjs`](file:///E:/VNOffice-agy-overlap/tests/live/cdp/ui-overlap.desktop.mjs): Test CDP tự động phát hiện lỗi chồng chéo và cắt xén phông chữ.
- `docs/diag-overlap/`: 20 tệp ảnh và 20 tệp JSON thô làm bằng chứng trước / sau.
