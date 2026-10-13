# Thông tin cho team macOS — những gì đã làm tới bản Windows 0.9.11 (13/10/2026)

Đọc cùng `docs/BAN-GIAO-MAC.md` (mốc 0.9.10) và `docs/SPEC-MACOS-PORT.md`. Tài liệu này chỉ liệt kê **thay đổi sau 0.9.10** và việc team Mac cần làm.

## 1. Tóm tắt thay đổi (mã dùng chung đã nằm ở `main`, Mac lấy bằng cách merge `main` vào `platform/macos`)
- **Sheet:** sửa lỗi VLOOKUP trả #N/A khi tra cả cột có mã chữ/số có 0 đứng đầu; tốc độ mở tệp lớn (xem dữ liệu ~2 giây, gõ ngay khi tải nốt); Chia ngăn; tiêu đề riêng cho từng trục biểu đồ; dòng tổng và chèn/xóa hàng-cột của bảng; Đến (Ctrl+G) + Đến đặc biệt (`apps/sheet/sheet-goto.js`); menu chuột phải ô/hàng/cột/tab/bảng/biểu đồ theo bảng tính thông dụng; Ctrl+Shift+; lưu giờ dạng số; thêm nhiều hàm và tiền tố hàm mới khi lưu .xlsx (`docs/EXCEL2016-FUNCTION-COMPAT-MAP.json`).
- **Chung:** Tệp ▸ **Xuất và chuyển đổi** (`platform/shell/app-shell.js`, lệnh `common.file.exportConvert`); nút **Bản quyền** (Dùng thử · Nhập khóa / Đã kích hoạt) trên thanh tiêu đề; ribbon Sheet Trang đầu vừa khít 1366 px; dải kiểu nhanh của Doc không còn cuộn ngang (rà soát bằng `scripts/audit-0610/ribbon_scroll_audit.mjs` và `header_hscroll_audit.mjs`, chạy được trên mọi hệ điều hành).
- **Cập nhật tự động (`adapters/updater/updater.py`):** ứng dụng đọc MỌI nguồn và chọn bản mới nhất (trước đây dừng ở nguồn đầu kết nối được nên kho LAN cũ chặn nâng cấp). Phần này dùng chung, **Mac phải giữ nguyên hành vi**.
- **Lưu .xlsx (`adapters/libreoffice/common/ooxml_zip_patch.py`):** sửa hồi quy mất ảnh và đổi định dạng ô chữ. Quy tắc bắt buộc: không dùng ElementTree (`ET.tostring`) để ghi lại sheet/styles vì làm đổi tiền tố namespace; mã định dạng do app tự suy ra được đánh dấu `excelCodeInferred` và không được ghi lại như mã gốc. Dòng tổng của bảng lưu đúng (`totalsRowCount`).

## 2. Việc riêng cho macOS
1. **`platform/os_services`:** hợp đồng `Launcher` có thêm `reveal_path(path)` (mở thư mục chứa tệp để nút "Mở thư mục chứa tệp" trong Xuất và chuyển đổi hoạt động). Windows dùng `explorer /select,`; portable trả `not_supported`. **Cần viết bản macOS** (`open -R <đường dẫn>`) trong `platform/os_services/macos.py` + thêm test theo mẫu `tests/test_os_services_reveal.py`. API Python tương ứng là `open_containing_folder` trong `main.py` (dùng chung, không sửa).
2. **Áp dụng bản vá cập nhật:** `adapters/updater/apply-helper.ps1` là PowerShell chỉ cho Windows (bản 0.9.11 đã sửa lỗi đường dẫn quá 260 ký tự bằng tiền tố `\\?\`). macOS không có giới hạn này nhưng cần bộ áp dụng riêng bằng Python thuần (SPEC mục 2).
3. **Đóng gói/phát hành:** quy trình 0.9.11 (build gói, ký bản vá, bộ cài, đẩy kho cập nhật + website) là Windows. Mac cần bản tương đương (`.app`/`.dmg`); phần ký bản vá và kho cập nhật dùng chung `scripts/release/make-update.py`.
4. **Kiểm thử trước khi gộp mọi thay đổi đụng đường lưu/mở:** Node `npm test` (hiện 3167/3167) + Python `python -m unittest discover -s tests` (hiện 917 bài, một số bài chậm/chập chờn khi máy bận: chạy lại riêng mô-đun 3 lần để xác nhận) + với Sheet, bộ lưu-so sánh tệp thật `scripts/layout-audit/batch_document_audit.py` (chỉ chạy được trên máy Windows có Excel/Word/PowerPoint và bộ mẫu nội bộ). Mac chạy các bộ không phụ thuộc COM; kết quả đối chiếu Office thật do máy Windows của người phụ trách cung cấp.

## 3. Việc đang chạy ở phía Windows (để Mac biết hướng, chưa cần làm)
- Danh sách tính năng Excel 2016 chi tiết: `docs/EXCEL2016-FEATURE-CHECKLIST.md` (213 mục; độ phủ ~58%; 25 khoảng trống ưu tiên 1 — định dạng có điều kiện đủ loại, kiểm tra dữ liệu đủ loại, biểu đồ đủ loại, Slicer, lọc theo màu...). Phiếu giao việc `docs/tickets-0710/EXCEL-G1…G5.md`.
- Phiếu `EXPORT-FIDELITY-1`: kiểm chứng xuất/chuyển đổi giữ nguyên bố cục khi mở bằng Office thật.
- Mọi tính năng mới trên Sheet/Doc/Slides phải kèm hướng dẫn tiếng Việt trong Trợ giúp và chuỗi i18n VI/EN (quy định `AGENTS.md` mục 10); không dùng tên thương hiệu của sản phẩm khác trong Trợ giúp/i18n/hộp thoại (có test chặn).

## 4. Quy tắc làm việc nhắc lại
- Mã dùng chung sửa ở `main` trước; mã riêng hệ điều hành chỉ ở `platform/os_services/<nền-tảng>.py` và `ports/<nền-tảng>/`; không rải điều kiện theo hệ điều hành vào `apps/` hay `platform/*.js`.
- Không commit tài liệu thật, khóa ký, mật khẩu hay token.