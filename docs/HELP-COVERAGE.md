# BÁO CÁO ĐỘ PHỦ HƯỚNG DẪN SỬ DỤNG (HELP COVERAGE)

Ngày kiểm tra: 2026-09-28

## 1. Tổng quan độ phủ

| Ứng dụng | Tổng lệnh Ribbon | Lệnh có Handler | Có bài Help | Chưa có Help | Nút chết | Tỉ lệ phủ |
| :--- | :---: | :---: | :---: | :---: | :---: | :---: |
| **VN Writer** | 131 | 131 | 118 | 13 | 0 | **90.1%** |
| **VN Sheet** | 152 | 152 | 144 | 8 | 0 | **94.7%** |

## 2. Nút chết cần xử lý

_Không phát hiện nút chết nào trên Ribbon của cả VN Writer và VN Sheet. 100% lệnh Ribbon đều có handler thực thi._

## 3. Danh sách lệnh CHƯA có bài Help (theo Tab / Nhóm)

### 3.1. VN Writer (13 lệnh chưa phủ)

| Tab | Nhóm | Command ID | Tên chức năng | Phím tắt |
| :--- | :--- | :--- | :--- | :---: |
| Trang đầu | Bảng nhớ tạm | `common.edit.paste` | Dán | `Ctrl+V` |
| Trang đầu | Bảng nhớ tạm | `common.edit.cut` | Cắt | `Ctrl+X` |
| Trang đầu | Bảng nhớ tạm | `common.edit.copy` | Sao chép | `Ctrl+C` |
| Trang đầu | Bảng nhớ tạm | `common.edit.formatPainter` | Sao chép định dạng | `Ctrl+Shift+C` |
| Trang đầu | Chỉnh sửa | `common.edit.find` | Tìm kiếm | `Ctrl+F` |
| Trang đầu | Chỉnh sửa | `common.edit.replace` | Thay thế | `Ctrl+H` |
| Trang đầu | Chỉnh sửa | `common.edit.selectAll` | Chọn tất cả | `Ctrl+A` |
| Chèn | Liên kết | `common.edit.hyperlink` | Liên kết | `Ctrl+K` |
| Đánh giá | Chính tả & Ngữ pháp | `ai.assistant.grammarCheck` | Soát lỗi chính tả | `F7` |
| Trợ giúp | Trợ giúp | `writer.help.open` | Trợ giúp | `F1` |
| Trợ lý VN AI | Tính năng AI thuần Việt | `ai.assistant.toggle` | Trợ lý VN AI | `Alt+J` |
| Trợ lý VN AI | Tính năng AI thuần Việt | `ai.assistant.summarize` | Tóm tắt nhanh | - |
| Trợ lý VN AI | Tính năng AI thuần Việt | `ai.assistant.rewrite` | Viết lại | - |

### 3.2. VN Sheet (8 lệnh chưa phủ)

| Tab | Nhóm | Command ID | Tên chức năng | Phím tắt |
| :--- | :--- | :--- | :--- | :---: |
| Trang đầu | Bảng nhớ tạm | `common.edit.paste` | Dán | `Ctrl+V` |
| Trang đầu | Bảng nhớ tạm | `common.edit.cut` | Cắt | `Ctrl+X` |
| Trang đầu | Bảng nhớ tạm | `common.edit.copy` | Sao chép | `Ctrl+C` |
| Bố trí trang | Thiết lập trang | `sheet.page.orientation` | Hướng giấy | - |
| Bố trí trang | Thiết lập trang | `sheet.page.size` | Khổ giấy | - |
| Trợ giúp | Trợ giúp | `sheet.help.open` | Trợ giúp | `F1` |
| Trợ lý VN AI | Phân tích dữ liệu AI | `ai.assistant.toggle` | Trợ lý VN AI | `Alt+J` |
| Trợ lý VN AI | Phân tích dữ liệu AI | `ai.assistant.summarize` | Tóm tắt nhanh | - |

