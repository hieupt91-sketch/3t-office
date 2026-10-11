# Audit bàn phím, lỗi nhập và dark mode — hộp thoại Writer

- Ngày audit: 06/10/2026; nhánh: `audit/doc-dialogs-keyboard-agy`.
- Phạm vi thực tế: 38 lệnh/launcher duy nhất mở hộp thoại từ ribbon Writer mặc định. Con số thấp hơn ước lượng 41 vì đã loại nút không mở dialog, nút trùng lệnh và lệnh bị vô hiệu khi chưa có dữ liệu.
- Kết quả cuối: **30/38 đạt toàn bộ tiêu chí áp dụng; 8/38 còn finding**. Trước sửa dùng chung: 21/38 đạt.

## Phương pháp

App desktop thật được khởi động bằng `launchApp("writer")`; mỗi lần chạy dùng một thư mục `VNO_CDP_LOCALAPPDATA` mới. Nút ribbon được tìm theo `data-command-id`/`data-command`. Toàn bộ phím thử nghiệm được gửi bằng CDP `Input.dispatchKeyEvent` qua `press()`/`typeText()`; không dùng SendKeys, `pywebview.evaluate_js` hay kill theo tên tiến trình.

Tiêu chí: **a** focus ban đầu nằm trong dialog; **b** Tab xoay vòng; **c** Escape đóng; **d** Tab tới đúng nút chính và nút nhận Enter; **e** dữ liệu sai có lỗi tiếng Việt và dialog còn mở; **f** chữ/viền ở dark mode đạt ngưỡng đọc được. `KAD` = không áp dụng vì dialog không có trường nhập cần validation. `KAD¹` = Chèn trích dẫn chưa có nguồn nên nút Chèn bị vô hiệu đúng trạng thái.

Lệnh tái hiện:

```powershell
$env:NODE_OPTIONS='--experimental-websocket'
$env:VNO_CDP_LOCALAPPDATA='E:\VNOffice-agy-d27\.tmp-d27-<run-id>'
node scripts/audit-0610/doc_dialogs_keyboard.mjs
```

## Kết quả theo hộp thoại

| # | Lệnh ribbon / hộp thoại | a | b | c | d | e | f | Nguyên nhân một dòng |
|---:|---|:---:|:---:|:---:|:---:|:---:|:---:|---|
| 1 | `writer.edit.pasteSpecial` — Dán đặc biệt | Đạt | Đạt | Đạt | Đạt | KAD | Đạt | Đạt tất cả tiêu chí áp dụng. |
| 2 | `writer.style.gallery` — Thư viện Kiểu dáng | Đạt | **Không** | Đạt | Đạt | KAD | Đạt | Focus không quay vòng; Tab thoát khỏi dialog. |
| 3 | `writer.format.paragraphDialog` — Đoạn văn | Đạt | Đạt | Đạt | Đạt | Đạt | Đạt | Giá trị âm/chữ/rỗng báo lỗi tiếng Việt và giữ dialog mở. |
| 4 | `common.edit.find` — Tìm kiếm | Đạt | Đạt | Đạt | Đạt | Đạt | Đạt | Đạt tất cả tiêu chí áp dụng. |
| 5 | `common.edit.replace` — Thay thế | Đạt | Đạt | Đạt | Đạt | Đạt | Đạt | Đạt tất cả tiêu chí áp dụng. |
| 6 | `writer.table.fromText` — Văn bản thành bảng | Đạt | Đạt | Đạt | Đạt | Đạt | Đạt | Ký tự phân cách rỗng báo lỗi và giữ dialog mở. |
| 7 | `writer.shape.insert` — Hình khối | Đạt | Đạt | Đạt | Đạt | KAD | Đạt | Focus vào mẫu đang chọn; không có trường dữ liệu tự do. |
| 8 | `writer.diagram.insert` — Sơ đồ SmartArt | Đạt | Đạt | Đạt | Đạt | Đạt | Đạt | Số phần tử ngoài 3–6 báo lỗi tiếng Việt và giữ dialog mở. |
| 9 | `writer.chart.insert` — Biểu đồ | Đạt | Đạt | Đạt | Đạt | Đạt | Đạt | Giá trị số rỗng báo lỗi tiếng Việt và giữ dialog mở. |
| 10 | `common.edit.hyperlink` — Liên kết | Đạt | Đạt | Đạt | Đạt | Đạt | Đạt | URL rỗng báo lỗi tiếng Việt và giữ dialog mở. |
| 11 | `writer.insert.bookmark` — Đánh dấu | Đạt | Đạt | Đạt | Đạt | **Không** | Đạt | Tên rỗng làm dialog đóng im lặng thay vì báo lỗi. |
| 12 | `writer.insert.crossReference` — Tham chiếu chéo | Đạt | Đạt | Đạt | Đạt | KAD | Đạt | Đạt tất cả tiêu chí áp dụng; danh sách mục tiêu hiện không có ô nhập tự do. |
| 13 | `writer.comment.insert` — Ghi chú | Đạt | Đạt | Đạt | Đạt | Đạt | Đạt | Nội dung rỗng báo lỗi tiếng Việt và giữ dialog mở. |
| 14 | `writer.design.themeGallery` — Kiểu & Chủ đề | Đạt | Đạt | Đạt | Đạt | KAD | Đạt | Đạt tất cả tiêu chí áp dụng. |
| 15 | `writer.page.watermark` — Hình mờ | Đạt | Đạt | Đạt | Đạt | **Không** | Đạt | Nội dung rỗng bị coi là lệnh xóa và dialog đóng không giải thích. |
| 16 | `writer.page.color` — Màu trang | Đạt | Đạt | Đạt | Đạt | KAD | Đạt | Đạt tất cả tiêu chí áp dụng. |
| 17 | `writer.page.border` — Viền trang | Đạt | Đạt | Đạt | Đạt | KAD | Đạt | Đạt tất cả tiêu chí áp dụng. |
| 18 | `writer.page.margins` — Thiết lập trang từ Lề | Đạt | Đạt | Đạt | Đạt | **Không** | Đạt | Lề âm bị chuẩn hóa/đóng im lặng trong dialog dựng ở Writer adapter. |
| 19 | `writer.page.orientation` — Thiết lập trang từ Hướng | Đạt | Đạt | Đạt | Đạt | **Không** | Đạt | Cùng dialog adapter: lề âm làm dialog đóng không có lỗi tiếng Việt. |
| 20 | `writer.page.size` — Thiết lập trang từ Cỡ giấy | Đạt | Đạt | Đạt | Đạt | **Không** | Đạt | Cùng dialog adapter: lề âm làm dialog đóng không có lỗi tiếng Việt. |
| 21 | `writer.page.columns` — Chia cột | Đạt | Đạt | Đạt | Đạt | Đạt | Đạt | Số cột ngoài 1–4 báo lỗi tiếng Việt và giữ dialog mở. |
| 22 | `writer.page.setupDialog` — launcher Thiết lập trang | Đạt | Đạt | Đạt | Đạt | Đạt | Đạt | Lề dưới 5 mm báo lỗi tiếng Việt và giữ dialog mở. |
| 23 | `writer.reference.citationInsert` — Chèn trích dẫn | Đạt | Đạt | Đạt | KAD¹ | KAD | Đạt | Không có nguồn trích dẫn trong tài liệu audit nên nút Chèn bị vô hiệu đúng trạng thái. |
| 24 | `writer.reference.sourcesManage` — Quản lý nguồn | Đạt | Đạt | Đạt | Đạt | KAD | Đạt | Đạt tất cả tiêu chí áp dụng. |
| 25 | `writer.reference.captionInsert` — Chú thích ảnh | Đạt | Đạt | Đạt | Đạt | KAD | Đạt | Đạt tất cả tiêu chí áp dụng. |
| 26 | `writer.reference.tofInsert` — Danh mục hình ảnh | Đạt | Đạt | Đạt | Đạt | KAD | Đạt | Đạt tất cả tiêu chí áp dụng. |
| 27 | `writer.mailings.envelopes` — Phong bì | Đạt | Đạt | Đạt | Đạt | Đạt | Đạt | Địa chỉ rỗng báo lỗi tiếng Việt và giữ dialog mở. |
| 28 | `writer.mailings.labels` — Nhãn | Đạt | Đạt | Đạt | Đạt | Đạt | Đạt | Nội dung rỗng báo lỗi tiếng Việt và giữ dialog mở. |
| 29 | `writer.mailMerge.open` — Nguồn Trộn thư | Đạt | Đạt | Đạt | Đạt | KAD | Đạt | Đạt tất cả tiêu chí áp dụng. |
| 30 | `writer.mailMerge.insertField` — Chèn trường | Đạt | Đạt | Đạt | Đạt | Đạt | Đạt | Trường rỗng báo lỗi tiếng Việt và giữ dialog mở. |
| 31 | `writer.mailMerge.ifRule` — Nếu/Thì/Ngược lại | Đạt | **Không** | **Không** | Đạt | **Không** | Đạt | Thiếu focus trap/Escape; Tab không tới nút Chèn nên không thể xác nhận validation. |
| 32 | `writer.review.wordCount` — Đếm từ | Đạt | Đạt | Đạt | Đạt | KAD | Đạt | Đạt tất cả tiêu chí áp dụng. |
| 33 | `common.macro.manager` — Quản lý Macro | Đạt | Đạt | Đạt | Đạt | KAD | Đạt | Đạt tất cả tiêu chí áp dụng. |
| 34 | `common.help.about` — Giới thiệu | Đạt | Đạt | Đạt | Đạt | KAD | **Không** | Nút “Xem toàn văn giấy phép” chỉ đạt tương phản 3,59:1 ở dark mode. |
| 35 | `ai.voice.input` — Lỗi nhập giọng nói | Đạt | Đạt | Đạt | Đạt | KAD | Đạt | Đây là alert dialog không có trường nhập; các tiêu chí còn lại đạt. |
| 36 | `ai.assistant.summarizeMeeting` — Tóm tắt họp | Đạt | Đạt | Đạt | Đạt | Đạt | Đạt | Nội dung rỗng báo lỗi tiếng Việt và giữ dialog mở. |
| 37 | `ai.assistant.smartSearch` — Tìm kiếm thông minh | Đạt | Đạt | Đạt | Đạt | Đạt | Đạt | Câu hỏi rỗng báo lỗi tiếng Việt và giữ dialog mở. |
| 38 | `ai.assistant.draftDocument` — AI Viết nháp | Đạt | Đạt | Đạt | Đạt | Đạt | Đạt | Mô tả rỗng báo lỗi tiếng Việt và giữ dialog mở. |

## Sửa nhỏ đã thực hiện

- `platform/ui-kit/dialogs.js` và `hyperlink-dialog.js`: prompt/URL rỗng hiện `role="alert"` tiếng Việt, giữ dialog mở và trả focus về trường sai.
- `apps/writer/paragraph-dialog.js` và `columns-dialog.js`: bỏ chuẩn hóa im lặng; kiểm tra số/range và báo lỗi tiếng Việt.
- `apps/writer/writer-illustrations.js`: focus ban đầu cho ba dialog; validation số cho Sơ đồ/Biểu đồ.
- `platform/theme/tokens.css` và `platform/ui-kit/ui-kit.css`: ánh xạ token tương thích và sửa màu slate inline trong dialog dark mode; khắc phục đồng thời 6 dialog.

Không đổi API, không thêm package, không sửa LibreOffice Core/Upstream, không đổi build system và không thêm luồng dữ liệu mạng/AI.

## Xác minh

- `node tests/run-tests.js`: **PASS — 2832/2832, 0 FAIL**.
- Test đơn vị mục tiêu: shared insert **11/11 PASS**; paragraph **8/8 PASS**; columns **15/15 PASS**; Writer illustrations **11/11 PASS**; color contrast **7/7 PASS**.
- CDP audit cuối: **30/38 đạt; 8 finding**; tiến trình trả mã 1 có chủ ý khi còn finding, không phải hồi quy test suite.

## Finding chuyển tiếp

Các finding còn lại không được sửa vì là dialog riêng lẻ, hoặc UI dựng trực tiếp trong `WriterAdapter`; sửa chúng sẽ vượt điều kiện ticket “một chỗ cho nhiều hộp thoại”/ranh giới UI–Adapter. Ưu tiên tiếp theo: tách Thiết lập trang khỏi adapter sang app dialog, sau đó xử lý riêng Style Gallery, Bookmark, Watermark, Mail Merge IF và About.
