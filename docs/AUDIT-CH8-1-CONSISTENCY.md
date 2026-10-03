# BÁO CÁO NGHIỆM THU ĐỒNG BỘ GIAO DIỆN CHUNG CH-8.1 (AUDIT REPORT)
**Dự án**: VN Office (Bộ ứng dụng văn phòng Doc, Sheet, Slide)  
**Hạng mục**: CH-8.1 — ĐỒNG BỘ GIAO DIỆN CHUNG CỦA DOC, SHEET, SLIDE  
**Chi nhánh**: `feat/ch8-1-ui-consistency-agy`  
**Thời gian thực hiện**: 02/10/2026  
**Người thực hiện**: agy  

---

## 1. MỤC TIÊU VÀ PHẠM VI CÔNG VIỆC
Phát triển và chuẩn hóa giao diện dùng chung giữa 3 ứng dụng **Doc**, **Sheet** và **Slide** theo tiêu chí CH-8.1 trong `docs/SPEC-HANG-MUC-CHUNG.md`, đảm bảo người dùng có trải nghiệm nhất quán, trực quan, chuyên nghiệp như bộ ứng dụng Microsoft Office:
1. **Menu Tệp / Backstage (tab Tệp)**: Đầy đủ 12 nút theo thứ tự chuẩn, tên tiếng Việt chuẩn hóa kèm phím tắt rõ ràng (Mới Ctrl+N, Mở Ctrl+O, Lưu Ctrl+S, Lưu thành F12, In Ctrl+P, Xuất PDF, Tệp gần đây, Đóng Ctrl+W, Giới thiệu, Tùy chọn).
2. **Quản lý Tệp gần đây (Recent Files)**: Giao diện trực quan hiển thị tên tệp, định dạng, đường dẫn rút gọn (`formatShortPath`), thời gian sửa đổi; hỗ trợ bấm để mở lại, nút gỡ từng tệp và nút xóa sạch lịch sử.
3. **Thanh trạng thái (Status Bar)**: Cố định ở đáy cửa sổ (bottom: 0px); cụm nút chế độ xem chuyên biệt cho từng ứng dụng; cụm điều khiển thu phóng gồm nút `-`, slider range 50%-200%, nút `+` và nút hiển thị phần trăm (nhấp để đặt lại 100%).
4. **Hệ thống Thu phóng (Zoom System)**: Đồng bộ giới hạn 50% - 200% và bước nhảy 10% trên cả 3 app; hỗ trợ kéo slider, phím tắt `Ctrl+0` đặt lại 100%, và `Ctrl + lăn chuột` (MouseWheel).
5. **Thanh Ribbon & Quick Access Toolbar (QAT)**: QAT gồm 4 nút chuẩn (Lưu Ctrl+S, Hoàn tác Ctrl+Z, Làm lại Ctrl+Y, In Ctrl+P); tên các tab chung đồng nhất (Tệp, Trang đầu, Chèn, Chế độ xem, Trợ giúp); hỗ trợ phím tắt `Ctrl+F1` và nhấp đúp tab để thu gọn / mở rộng.
6. **Hướng dẫn sử dụng tiếng Việt (platform/help)**: Bổ sung 3 bài viết hướng dẫn chi tiết tiếng Việt cho đúng UI thực tế; tuân thủ nghiêm ngặt bộ quét từ ngữ cấm hiển thị (`user-visible-source-scanner.js`).

---

## 2. BẢNG KẾT QUẢ ĐO THẬT CDP DESKTOP TRÊN CẢ 3 ỨNG DỤNG
*Đo kiểm độc lập qua Chrome DevTools Protocol (`Runtime.evaluate`, `Input.dispatchKeyEvent`, `Input.dispatchMouseEvent`) trên quy trình desktop thật (`python -s main.py --app=...`) qua script `tests/live/cdp/ch8-1-consistency.desktop.mjs`.*

| STT | Hạng mục kiểm tra | Doc (Writer) | Sheet (Sheet) | Slide (Slides) | Kết luận |
|:---:|:---|:---|:---|:---|:---:|
| 1 | **1. Backstage: Nút Quay lại** | `[PASS]` "Quay lại" | `[PASS]` "Quay lại" | `[PASS]` "Quay lại" | **PASS** |
| 2 | **2. Backstage: Nút Trang chủ** | `[PASS]` "Trang chủ" | `[PASS]` "Trang chủ" | `[PASS]` "Trang chủ" | **PASS** |
| 3 | **3. Backstage: Nút Mới** | `[PASS]` "Mới (Ctrl+N)" | `[PASS]` "Mới (Ctrl+N)" | `[PASS]` "Mới (Ctrl+N)" | **PASS** |
| 4 | **4. Backstage: Nút Mở** | `[PASS]` "Mở (Ctrl+O)" | `[PASS]` "Mở (Ctrl+O)" | `[PASS]` "Mở (Ctrl+O)" | **PASS** |
| 5 | **5. Backstage: Nút Lưu** | `[PASS]` "Lưu (Ctrl+S)" | `[PASS]` "Lưu (Ctrl+S)" | `[PASS]` "Lưu (Ctrl+S)" | **PASS** |
| 6 | **6. Backstage: Nút Lưu thành** | `[PASS]` "Lưu thành (F12)" | `[PASS]` "Lưu thành (F12)" | `[PASS]` "Lưu thành (F12)" | **PASS** |
| 7 | **7. Backstage: Nút In** | `[PASS]` "In (Ctrl+P)" | `[PASS]` "In (Ctrl+P)" | `[PASS]` "In (Ctrl+P)" | **PASS** |
| 8 | **8. Backstage: Nút Xuất PDF** | `[PASS]` "Xuất PDF" | `[PASS]` "Xuất PDF" | `[PASS]` "Xuất PDF" | **PASS** |
| 9 | **9. Backstage: Nút Tệp gần đây** | `[PASS]` "Tệp gần đây" | `[PASS]` "Tệp gần đây" | `[PASS]` "Tệp gần đây" | **PASS** |
| 10 | **10. Backstage: Nút Đóng** | `[PASS]` "Đóng (Ctrl+W)" | `[PASS]` "Đóng (Ctrl+W)" | `[PASS]` "Đóng (Ctrl+W)" | **PASS** |
| 11 | **11. Backstage: Nút Giới thiệu** | `[PASS]` "Giới thiệu" | `[PASS]` "Giới thiệu" | `[PASS]` "Giới thiệu" | **PASS** |
| 12 | **12. Backstage: Nút Tùy chọn** | `[PASS]` "Tùy chọn" | `[PASS]` "Tùy chọn" | `[PASS]` "Tùy chọn" | **PASS** |
| 13 | **13. Backstage: Thứ tự 12 nút** | `[PASS]` 12 nút đúng thứ tự | `[PASS]` 12 nút đúng thứ tự | `[PASS]` 12 nút đúng thứ tự | **PASS** |
| 14 | **14. Tệp gần đây: Cấu trúc hiển thị** | `[PASS]` Tên, path rút gọn, format, remove | `[PASS]` Tên, path rút gọn, format, remove | `[PASS]` Tên, path rút gọn, format, remove | **PASS** |
| 15 | **15. Tệp gần đây: Chuyển tab Recent** | `[PASS]` Hiện view tệp gần đây | `[PASS]` Hiện view tệp gần đây | `[PASS]` Hiện view tệp gần đây | **PASS** |
| 16 | **16. Tệp gần đây: Mở lại được** | `[PASS]` data-recent-path đầy đủ | `[PASS]` data-recent-path đầy đủ | `[PASS]` data-recent-path đầy đủ | **PASS** |
| 17 | **17. Thanh trạng thái: Vị trí đáy** | `[PASS]` Cố định đáy (0px) | `[PASS]` Cố định đáy (0px) | `[PASS]` Cố định đáy (0px) | **PASS** |
| 18 | **18. Thanh trạng thái: Cụm Chế độ xem** | `[PASS]` 3 chế độ (In, Đọc, Web) | `[PASS]` 3 chế độ (Thường, Trang, Ngắt) | `[PASS]` 4 chế độ (Thường, Sắp xếp, Đọc, Chiếu) | **PASS** |
| 19 | **19. Thanh trạng thái: Slider 50%-200%** | `[PASS]` min=50, max=200 | `[PASS]` min=50, max=200 | `[PASS]` min=50, max=200 | **PASS** |
| 20 | **20. Thanh trạng thái: Cặp nút +/-** | `[PASS]` Có đủ #vno-zoom-out & in | `[PASS]` Có đủ #vno-zoom-out & in | `[PASS]` Có đủ #vno-zoom-out & in | **PASS** |
| 21 | **21. Thanh trạng thái: Nút % đặt lại** | `[PASS]` `<button>` đặt lại 100% | `[PASS]` `<button>` đặt lại 100% | `[PASS]` `<button>` đặt lại 100% | **PASS** |
| 22 | **22. Thu phóng: Nút +/- nhịp 10%** | `[PASS]` Bấm (+) 110%, (-) 100% | `[PASS]` Bấm (+) 110%, (-) 100% | `[PASS]` Bấm (+) 110%, (-) 100% | **PASS** |
| 23 | **23. Thu phóng: Kéo thanh trượt** | `[PASS]` Đặt 130 -> hiển thị 130% | `[PASS]` Đặt 130 -> hiển thị 130% | `[PASS]` Đặt 130 -> hiển thị 130% | **PASS** |
| 24 | **24. Thu phóng: Ctrl + lăn chuột** | `[PASS]` Lăn chuột Ctrl: 130% -> 140% | `[PASS]` Lăn chuột Ctrl: 130% -> 140% | `[PASS]` Lăn chuột Ctrl: 130% -> 140% | **PASS** |
| 25 | **25. Thu phóng: Phím tắt Ctrl+0** | `[PASS]` Đặt lại chính xác 100% | `[PASS]` Đặt lại chính xác 100% | `[PASS]` Đặt lại chính xác 100% | **PASS** |
| 26 | **26. Ribbon: Quick Access Toolbar** | `[PASS]` 4 nút: Lưu, Undo, Redo, In | `[PASS]` 4 nút: Lưu, Undo, Redo, In | `[PASS]` 4 nút: Lưu, Undo, Redo, In | **PASS** |
| 27 | **27. Ribbon: Thu gọn Ctrl+F1** | `[PASS]` Thu gọn 0px, mở lại 98px | `[PASS]` Thu gọn 0px, mở lại 98px | `[PASS]` Thu gọn 0px, mở lại 98px | **PASS** |

**Tổng kết đo kiểm**: **27 / 27 HẠNG MỤC PASS 100% TRÊN CẢ 3 ỨNG DỤNG** (81/81 phép đo thành công, 0 FAIL).

---

## 3. CHI TIẾT GIẢI PHÁP KỸ THUẬT VÀ TẬP TIN ĐÃ CHỈNH SỬA

### 3.1. Tầng dùng chung (Platform Layer)
- `platform/recent/recent-manager.js`:
  + Bổ sung hàm `formatShortPath(filePath, maxLength = 45)`: rút gọn đường dẫn dài giữ lại ổ đĩa/gốc và thư mục/tên tệp cuối (ví dụ: `C:/.../Reports/BaoCao.docx`).
  + Bổ sung helper `_getStorage()` hỗ trợ truy cập `localStorage` linh hoạt và an toàn trên cả trình duyệt WebView2 và môi trường kiểm thử Node.js.
- `platform/shell/app-shell.js`:
  + Chuẩn hóa menu Tệp (Backstage View) với cấu trúc 12 nút cố định, hỗ trợ chuyển đổi giữa tab Trang chủ và tab Tệp gần đây (`#vno-backstage-recent-view`).
  + Gắn kết nối sự kiện mở lại tệp gần đây qua `globalUnoBridge.openFileInNewWindow(filePath, app)`.
  + Tích hợp cụm nút Chế độ xem `.vno-statusbar-view-modes` vào thanh trạng thái:
    * **Doc**: Bố cục in (`writer.view.printLayout`), Chế độ đọc (`writer.view.readMode`), Bố cục web (`writer.view.webLayout`).
    * **Sheet**: Bình thường (`sheet.view.normal`), Bố cục trang (`sheet.view.pageLayout`), Xem trước ngắt trang (`sheet.view.pageBreakPreview`).
    * **Slide**: Thông thường (`slides.view.normal`), Bộ sắp xếp trang chiếu (`slides.view.slideSorter`), Chế độ xem đọc (`slides.view.reading`), Trình chiếu (`slides.slideshow.fromBeginning`).
  + Nâng cấp nhãn phần trăm `#vno-zoom-text` thành `<button type="button">`, cho phép bấm chuột để đặt lại nhanh tỷ lệ 100%.
  + Thêm bộ lắng nghe sự kiện lăn chuột `wheel` kèm phím `Ctrl` trên `this.rootEl` để thu phóng tài liệu mượt mà ở bất cứ vị trí nào trong ứng dụng.
- `platform/shell/shell.css`:
  + Bổ sung styling cho `.vno-statusbar-view-modes`, `.vno-statusbar-btn`, `.vno-statusbar-btn.is-active`, `.vno-zoom-slider .vno-zoom-percent-btn`.
  + Tối ưu tỷ lệ tương phản màu WCAG AA 4.5:1 trên nền thanh trạng thái màu thương hiệu (`#0f4c81`, `#0f6d38`, `#b53818`).
- `platform/commands/shortcut-manager.js`:
  + Đăng ký sẵn phím tắt `Ctrl+F1` (`common.view.ribbonToggle`) và `Alt+F` (`common.file.backstage`) trong common scope ngay tại constructor.
- `platform/i18n/strings-vi.js`, `strings-en.js`, `strings.vi.json`:
  + Đồng bộ hóa các chuỗi nhãn và phím tắt backstage tiếng Việt:
    `new: "Mới (Ctrl+N)"`, `open: "Mở (Ctrl+O)"`, `save: "Lưu (Ctrl+S)"`, `saveAs: "Lưu thành (F12)"`, `print: "In (Ctrl+P)"`, `exportPdf: "Xuất PDF"`, `recent: "Tệp gần đây"`, `close: "Đóng (Ctrl+W)"`, `options: "Tùy chọn"`.
- `platform/help/entries-consistency.js`:
  + Cập nhật và bổ sung 3 bài hướng dẫn sử dụng tiếng Việt chi tiết:
    1. *Menu Tệp và Quản lý tệp gần đây* (`common.help.backstageRecent`)
    2. *Thanh trạng thái và Chế độ xem tài liệu* (`common.help.statusbarViewModes`)
    3. *Thu gọn thanh Ribbon và Thanh truy cập nhanh* (`common.help.ribbonCollapseAndQat`)
  + Toàn bộ nội dung tuân thủ chặt chẽ danh mục từ cấm hiển thị (`user-visible-source-scanner.js`).
- `scripts/audit-contrast.js`:
  + Bổ sung ngữ cảnh `statusbar` vào bộ giải quyết màu nền kiểm tra tương phản tự động.

### 3.2. Tầng ứng dụng (App Layer)
- `apps/slides/slides-canvas.js`:
  + Đồng bộ khoảng giới hạn thu phóng về 50% - 200% (`Math.min(2.0, Math.max(0.5, ...))`) và bước nhảy 10% nhất quán với Doc và Sheet.
- `apps/writer/writer-view-controller.js`:
  + Đồng bộ bộ điều khiển thu phóng `_wheelHandler` với `AppShell` dùng chung, gọi `event.stopPropagation()` tránh xung đột kích hoạt 2 lần.

---

## 4. KẾT QUẢ KIỂM THỬ GATE
1. **Kiểm thử đo thật CDP trên Desktop**:
   - Lệnh: `node --experimental-websocket tests/live/cdp/ch8-1-consistency.desktop.mjs`
   - Kết quả: **27 / 27 HẠNG MỤC PASS TRÊN CẢ 3 APP** (Exit code 0).
2. **Kiểm thử đơn vị tự động**:
   - Lệnh: `node tests/run-tests.js`
   - Đã tích hợp **Suite 225: Unit Tests — CH-8.1 UI Consistency: Backstage, Recent Files, Status Bar, View Modes, Zoom & Shortcuts** (33/33 PASS).
3. **Kiểm thử hồi quy tổng thể**:
   - Lệnh: `node --experimental-websocket tests/live/cdp/run-desktop-regression.mjs`
   - Kết quả: **TOTAL: 26 PASS, 1 FAIL, 0 BLOCKED, 6 N/A** (Khớp chính xác kết quả 26 PASS / 1 FAIL tại mốc 13:45 của kho mã nguồn, không thêm bất kỳ lỗi nào).
4. **Bộ quét từ cấm hiển thị người dùng**:
   - Lệnh: `node tests/unit/user-visible-source-scanner.js`
   - Kết quả: **PASS 100% (0 vi phạm)**.
