# Kế hoạch MAC-3-2610 — Hộp thoại Mở / Lưu / Lưu thành native trên macOS (Doc, Sheet, Slide)

Ngày: 31/10/2026 · Nhánh: `mac/filedialog-cl-2610` (từ `origin/vn-main` 4c7da4c8) · Agent: Claude (Opus 5.5)

## 1. Mục tiêu

Hộp thoại Mở / Lưu / Lưu thành trên macOS cư xử như Office for Mac: bộ lọc đúng định dạng cho từng ứng dụng,
tên mặc định "Tài liệu 1.docx", thư mục mặc định đúng, tự sửa phần mở rộng, không hỏi ghi đè hai lần, chọn nhiều
tệp khi Mở, tên tệp tiếng Việt (NFD của macOS) hiển thị/ghi nhớ/mở lại nhất quán, Hủy không báo lỗi.

## 2. Khả năng hiện có (đọc mã, đo trên runtime pilot v4 — pywebview 6.2.1)

- `main.py` gọi thẳng `window.create_file_dialog` ở `_open_document_dialog_impl`, `_save_document_dialog_impl`,
  `_open_writer_reference_document_impl`, `_open_mail_merge_data_dialog_impl`, in PDF. Không qua `platform/os_services`.
- Backend: bản đóng gói **không** đặt `PYWEBVIEW_GUI` ⇒ pywebview chọn **Cocoa** (pyobjc có trong Runtime);
  CDP/test dùng **Qt** (`VNO_CDP_WEBVIEW_GUI=qt`). Cả hai đều phải đúng.
- pywebview: chuỗi lọc phải khớp `^([\w ]+)\((\*.ext[;*.ext]*)\)$` (mô tả chỉ chữ/số/khoảng trắng, NFC).
  - Cocoa SAVE: `NSSavePanel` **bỏ qua** `file_types` (không có menu định dạng, không tự thêm đuôi), trả **chuỗi**;
    tự hỏi ghi đè. Cocoa OPEN: lọc theo mục đầu + menu chọn bộ lọc; `allow_multiple` được hỗ trợ.
  - Qt SAVE: `QFileDialog.getSaveFileName` **không truyền bộ lọc**; hộp thoại native tự hỏi ghi đè. Qt OPEN: lọc `;;`,
    `getOpenFileNames` khi `allow_multiple`.
- Lỗi tìm thấy (chi tiết số dòng ở bàn giao):
  1. Lưu: `save_filename` không có đuôi (dựa vào bộ lọc Windows tự thêm) ⇒ trên Mac gõ "Báo cáo" được tệp lưu với đuôi
     **mặc định của ứng dụng**, không phải định dạng đang chọn (vd. đang lưu .odt thành .docx).
  2. `_infer_save_format_from_path`: đuôi lạ (`v1.2`, `.abc`) ⇒ giữ tên đó nhưng ghi nội dung .docx/.xlsx; đuôi của ứng dụng khác
     (`.xlsx` trong Doc) ⇒ gọi bộ lọc sai và lỗi.
  3. Khi tự thêm đuôi, tệp đích mới chưa được macOS hỏi ghi đè ⇒ có thể ghi đè im lặng.
  4. Tên mặc định khi chưa có tên: "TaiLieu"/"BangTinh"/"BanTrinhChieu" (không dấu), không có thư mục mặc định
     (~/Documents) cho tài liệu mới.
  5. Bộ lọc Mở: một mục gộp + "Tất cả tệp", thiếu .dotx (Doc), .potx (Slide); không có "Tất cả tệp được hỗ trợ" đứng đầu.
  6. Mở chỉ nhận tệp đầu; không chọn nhiều tệp.
  7. Đường dẫn trả về từ macOS có thể ở dạng NFD ⇒ tên trên thanh tiêu đề/danh sách gần đây dạng phân rã, mục gần đây
     bị trùng (so khớp chuỗi tuyệt đối).

## 3. Thiết kế (đúng ranh giới AGENTS.md)

- **Mới, dùng chung, không phụ thuộc HĐH**: `platform/os_services/file_dialogs.py`
  - `FileDialogPolicy` (cờ khả năng): `save_dialog_has_type_menu`, `save_dialog_confirms_overwrite`,
    `open_allows_multiple`, `path_unicode_form`, `default_directory`.
  - Bảng loại tệp theo ứng dụng (nhãn tiếng Việt, "Tất cả tệp được hỗ trợ" đầu, "Tất cả tệp" cuối), hàm dựng
    bộ lọc Mở/Lưu, tên gợi ý mặc định, sửa đuôi sau khi lưu, chuẩn hoá đường dẫn (chỉ đổi khi dạng NFC trỏ đúng
    cùng một tệp — an toàn với ổ đĩa không chuẩn hoá tên).
- **Riêng macOS**: `platform/os_services/macos.py` chỉ khai `FileDialogPolicy(... has_type_menu=False,
  confirms_overwrite=True, multiple=True, unicode_form="NFC", default_directory=~/Documents)`.
- `base.py`: thêm trường tuỳ chọn `file_dialogs` (như `document_fonts`, không thuộc `SERVICE_FIELDS`).
  Windows/Linux để `None` ⇒ **giữ nguyên đường cũ**, không đổi hành vi Windows.
- `main.py`: một điểm vào `_create_file_dialog` cho các hộp thoại Mở/Lưu tài liệu; khi có policy thì dùng helper.
  Không có `if mac` trong `apps/**`; không sửa adapters riêng từng app (Slides agent đang chạy song song).
- Mẫu `.dotx`/`.potx`: mở được (LibreOffice nhập trực tiếp) và Lưu tại chỗ giữ đúng loại mẫu (dựng .docx/.pptx rồi đổi
  content type — mở rộng đúng mô hình `.xltx` đã có của MAC-3), thêm vào `FILE_APP_KINDS`.
- `platform/recent/recent-manager.js`: so khớp trùng theo dạng NFC (không đổi đường dẫn lưu) để danh sách cũ có
  bản NFD không bị nhân đôi. Không có điều kiện HĐH.
- Trợ giúp: `platform/help/entries-macos-files.js` (tiếng Việt, đăng ký trong `help-catalog.js`).

## 4. Phụ thuộc / ảnh hưởng

Không thêm thư viện. Không sửa LibreOffice Core, adapters app, `ports/macos`. Windows: không đổi (policy `None`),
trừ hai sửa lỗi dùng chung an toàn: đuôi `.dotx/.potx` lưu đúng loại mẫu; `FILE_APP_KINDS` nhận hai đuôi này.

## 5. Rủi ro

- Chuẩn hoá NFC có thể trỏ sai tệp trên hệ tệp phân biệt dạng chuẩn hoá ⇒ chỉ đổi khi `os.path.samefile` đúng.
- Tự thêm đuôi rồi ghi đè tệp có sẵn ⇒ hỏi xác nhận riêng **chỉ** khi tên đã bị sửa (tên do macOS đã hỏi thì không hỏi lại).
- Mở nhiều tệp: tệp thứ 2+ mở cửa sổ mới bằng `open_file_in_new_window` hiện có (cùng đường "Gần đây").
- Bộ đệm đĩa QtWebEngine dùng chung giữa worktree ⇒ test CDP tắt cache (`Network.setCacheDisabled`) + nạp lại
  bỏ cache, và kiểm tệp phục vụ có dấu mốc của worktree này.

## 6. Kiểm thử

- Unit (mock `create_file_dialog`, fail-trước/pass-sau): `tests/macos/test_file_dialogs_macos.py` — bộ lọc (cú pháp pywebview
  thật, Qt/Cocoa), tên/thư mục mặc định, sửa đuôi, xác nhận ghi đè, chọn nhiều tệp, NFD→NFC, Hủy, Windows không đổi.
- Node: `tests/unit/recent-manager-nfc.test.js`, cập nhật đếm trợ giúp nếu cần.
- CDP (Qt, app thật, chặn hộp thoại ở tầng `create_file_dialog` bằng biến test-only `VNO_CDP_FILE_DIALOG_STUB`):
  `tests/live/cdp/macos-file-dialogs.desktop.mjs` — Lưu thành gõ thiếu đuôi, NFD→NFC trên thanh tiêu đề, Hủy không báo lỗi.
- Cổng: `npm test` (baseline trước), i18n parity, checklist verifier, `pytest tests/macos` + test chạm tới, pytest đầy đủ qua khoá.

## 7. Hoàn tác

Mọi thay đổi nằm trong các commit của nhánh này; `git revert` từng commit. Tắt nhanh lúc chạy: `VNO_OS_SERVICES_LEGACY=1`
đưa macOS về đường cũ.
