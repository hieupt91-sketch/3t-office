# Plan MAC-3 — kiểu tệp mẫu bảng tính trên macOS

Ngày: 20/10/2026  
Nhánh: `mac/filetypes-1910`

## Mục tiêu

- Giữ nguyên đường mở/lưu dùng chung đã có cho `.xltx` và `.xlt`.
- Khai báo cho Launch Services rằng Sheet trên macOS có thể mở hai loại mẫu bảng tính này.
- Kiểm chứng bộ lọc pywebview và đường tạo/mở lại `.xltx` mà không thay đổi semantics định dạng.

## Khả năng hiện tại và quyết định tái sử dụng

- `main.py` đã có `.xltx/.xlt` trong `FILE_APP_KINDS` và `OPEN_FILE_TYPES`, có bộ lọc lưu `.xltx`, và tạo mẫu bằng đường XLSX hiện hữu rồi chỉ đổi content type qua `_convert_xlsx_to_template`.
- Trợ giúp tiếng Việt cho “Lưu thành mẫu” đã có trong `platform/help/entries-sheet.js`; MAC-3 không thêm UI mới nên không tạo nội dung Help trùng lặp.
- Repo chưa có `ports/macos/` hoặc `Info.plist`. Phần bổ sung chỉ là template plist dành cho bundle Sheet và test cấu trúc plist.

## Tệp/mô-đun dự kiến

- `ports/macos/Sheet-Info.plist`: document types và imported UTI cho `.xltx/.xlt`.
- `tests/macos/test_sheet_file_types.py`: kiểm plist, các hằng dùng chung và round-trip `.xltx`.
- `docs/macos/HANDOFF-MAC-3-FILE-TYPES-2010.md` và `09-templates/AGENT-HANDOFF.md`: bằng chứng bàn giao.

## Phụ thuộc

- Python chuẩn (`plistlib`, `zipfile`, `tempfile`).
- LibreOffice/UNO hiện hữu của dự án cho bài round-trip thật; không thêm dependency.

## Rủi ro

- UTI Office có thể khác giữa các ứng dụng đã cài. Khai báo imported UTI ổn định theo extension/MIME, không claim quyền sở hữu UTI của hãng khác.
- `CFBundleDocumentTypes` chỉ đăng ký khả năng mở, không tự chiếm ứng dụng mặc định.
- Nếu LibreOffice/UNO chưa sẵn sàng trên máy Mac, bài mở/lưu native phải ghi `BLOCKED`, không hạ tiêu chí hoặc sửa test để xanh.

## Kế hoạch kiểm thử

1. Parse plist bằng `plistlib`; xác nhận `.xltx/.xlt`, UTI, MIME, role Editor và rank Alternate.
2. Kiểm `FILE_APP_KINDS`, `OPEN_FILE_TYPES`, `SAVE_FILE_TYPES` và parser file type của pywebview.
3. Tạo `.xltx` từ fixture FODS qua đường chuyển đổi thật, kiểm content type template, rồi mở lại qua `_load_document_content` nếu runtime LibreOffice cho phép.
4. Chạy test tập trung Python, bài Node `sheet-template-save`, i18n parity và `git diff --check`.

## Rollback

Xóa template plist và test/handoff MAC-3. Không có migration dữ liệu, thay đổi Core hay thay đổi mã dùng chung.
