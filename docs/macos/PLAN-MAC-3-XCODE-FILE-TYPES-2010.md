# Kế hoạch MAC-3-XCODE — tích hợp đăng ký kiểu tệp MAC-3 vào ba bundle Xcode

Ngày: 20/10/2026
Nhánh: `mac/xcode-filetypes-opencode`
Căn cứ: commit MAC-3 `4f8f64b8` (nhánh `mac/filetypes-1910`), commit M7 `975eaf9e` + `fa0ec31b` (nhánh `mac/xcode-build-2010`).

## 1. Mục tiêu

- Đưa kết quả MAC-3 (đăng ký UTI `.xltx/.xlt`) vào đúng bundle mà pipeline Xcode thực sự dựng: `ports/macos/launcher/Sheet-Info.plist`.
- Đưa cả ba bundle `Doc.app` / `Sheet.app` / `Slide.app` về một mô hình đăng ký kiểu tệp thống nhất (UTI + phần mở rộng), mà **không** đổi semantics định dạng tệp.
- Không cherry-pick mù: mỗi dòng của MAC-3 được đối chiếu với dữ liệu UTI thật của máy trước khi dùng.

## 2. Khả năng hiện có (đo thật trên máy này)

- **M7**: `ports/macos/scripts/build-development.sh` dựng 3 bundle unsigned universal bằng `INFOPLIST_FILE=$MACOS_DIR/launcher/<Doc|Sheet|Slide>-Info.plist`; `validate-development-bundles.py` kiểm bundle id, app kind, danh sách phần mở rộng, executable, icon, chữ ký. Build nền PASS (validator 3/3).
- **MAC-3 (`4f8f64b8`)**: tạo `ports/macos/Sheet-Info.plist` ở gốc `ports/macos/` với `UTImportedTypeDeclarations` cho `org.openxmlformats.spreadsheetml.template` và `com.microsoft.excel.xlt`.
- **Khoảng trống**: đường dẫn `ports/macos/Sheet-Info.plist` **không** được pipeline Xcode dùng (script truyền `launcher/$plist`). Nếu giữ nguyên, nội dung MAC-3 không có tác dụng lên bundle nào → không đạt "XONG" của MAC-3 ("đăng ký kiểu tệp (UTI) cho `.xltx/.xlt` trong Info.plist") và tạo hai nguồn sự thật cho cùng một danh sách kiểu tệp.
- **Mã dùng chung** (`main.py`, đã có sẵn trên nhánh này): `FILE_APP_KINDS` ánh xạ `.xltx`/`.xlt` → `sheet`; `OPEN_FILE_TYPES["sheet"]` có `*.xltx;*.xlt`; `SAVE_FILE_TYPES["sheet"]` có "Mẫu bảng tính Excel (*.xltx)". Không sửa mã dùng chung trong phiếu này.

## 3. Dữ liệu UTI thật của máy (bằng chứng, không phải phỏng đoán)

Đọc bằng `lsregister -dump` và `mdls -name kMDItemContentType` (chỉ đọc):

| Phần mở rộng | UTI | MIME | Nguồn trên máy |
|---|---|---|---|
| `.docx` | `org.openxmlformats.wordprocessingml.document` | `application/vnd.openxmlformats-officedocument.wordprocessingml.document` | LibreOffice (imported) |
| `.doc` | `com.microsoft.word.doc` | `application/msword` | Word (imported) |
| `.odt` | `org.oasis-open.opendocument.text` | `application/vnd.oasis.opendocument.text` | LibreOffice (imported) |
| `.rtf` | `public.rtf` | `text/rtf` | CoreTypes (exported, `public`) |
| `.txt` | `public.plain-text` | `text/plain` | CoreTypes (exported, `public`) |
| `.xlsx` | `org.openxmlformats.spreadsheetml.sheet` | `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet` | LibreOffice (imported) |
| `.xls` | `com.microsoft.excel.xls` | (không khai MIME trên máy này) | Excel (imported) |
| `.ods` | `org.oasis-open.opendocument.spreadsheet` | `application/vnd.oasis.opendocument.spreadsheet` | LibreOffice (imported) |
| `.csv` | `public.comma-separated-values-text` | `text/csv` | CoreTypes (exported, `public`) |
| `.xltx` | `org.openxmlformats.spreadsheetml.template` | `application/vnd.openxmlformats-officedocument.spreadsheetml.template` | LibreOffice (imported) — **khớp đúng MAC-3** |
| `.xlt` | `com.microsoft.excel.xlt` | (không khai MIME trên máy này) | Excel (imported) — **khớp đúng UTI của MAC-3** |
| `.pptx` | `org.openxmlformats.presentationml.presentation` | (không khai MIME trên máy này) | PowerPoint (imported) |
| `.ppt` | `com.microsoft.powerpoint.ppt` | `application/vnd.ms-powerpoint` | PowerPoint (imported) |
| `.odp` | `org.oasis-open.opendocument.presentation` | `application/vnd.oasis.opendocument.presentation` | PowerPoint (imported) |

`mdls` xác nhận macOS tự ánh xạ `.xltx` → `org.openxmlformats.spreadsheetml.template` và `.xlt` → `com.microsoft.excel.xlt`.

Hai điểm lệch so với MAC-3 đã ghi, **giữ nguyên theo MAC-3, không sửa trong phiếu này**:
- UTI ODF là `org.oasis-open.opendocument.*` (có `open`), **không phải** `org.oasis.opendocument.*` — bản viết sai sẽ không được hệ thống nhận.
- Excel khai `.xlt` bằng magic `sLS8` và **không** khai MIME; MAC-3 dùng `application/vnd.ms-excel`. Giữ nguyên giá trị của MAC-3, ghi chú cho người phụ trách ở handoff.

## 4. Tệp và mô-đun dự kiến

- `ports/macos/launcher/Doc-Info.plist` — thêm `LSItemContentTypes` + `UTImportedTypeDeclarations` cho 5 định dạng Writer đã hỗ trợ.
- `ports/macos/launcher/Sheet-Info.plist` — thêm `LSItemContentTypes` + `UTImportedTypeDeclarations`; **thêm `.xltx`, `.xlt`** vào `CFBundleTypeExtensions` (nội dung UTI lấy từ MAC-3, giữ nguyên mapping).
- `ports/macos/launcher/Slide-Info.plist` — như Doc, cho 3 định dạng Slides đã hỗ trợ.
- `ports/macos/Sheet-Info.plist` — **xoá**: hợp nhất vào `ports/macos/launcher/Sheet-Info.plist` để chỉ còn một nguồn sự thật (file Xcode dùng).
- `ports/macos/scripts/validate-development-bundles.py` — kiểm thêm phần UTI trong bundle đã dựng.
- `tests/macos/test_sheet_file_types.py` — bài tập trung từ MAC-3, chỉnh lại đường dẫn và mở rộng ra ba bundle + chốt "chỉ khai loại tệp mà `main.py` thực sự mở được".
- `docs/macos/PLAN-MAC-3-XCODE-FILE-TYPES-2010.md`, `docs/macos/HANDOFF-MAC-3-XCODE-FILE-TYPES-2010.md`, `09-templates/AGENT-HANDOFF.md`.

## 5. Phụ thuộc

- Chỉ `plistlib` (Python chuẩn), `plutil`, `xcodebuild` của Xcode đã có. Không thêm thư viện, không cài Qt, không cần mạng.

## 6. Rủi ro và cách chặn

| Rủi ro | Chặn bằng |
|---|---|
| Khai UTI trùng với app khác (LibreOffice/Office đã khai cùng UTI) | Chỉ dùng `UTImportedTypeDeclarations` (không `UTExportedTypeDeclarations`) → không chiếm quyền sở hữu UTI của hãng khác. Máy này đã có nhiều app khai cùng một UTI mà không lỗi (dump thấy `org.openxmlformats.spreadsheetml.template` ở 3 bundle). |
| `LSItemContentTypes` làm mất liên kết theo phần mở rộng nếu UTI không resolve | Giữ `CFBundleTypeExtensions` **trong cùng dict** (đường dự phòng), và mọi UTI không phải `public.*` đều được khai báo import ngay trong bundle → không có tham chiếu treo. `public.*` do CoreTypes export, luôn tồn tại. |
| Khai loại tệp mà ứng dụng không mở được (ví dụ `.dotx`, `.potx`) | Bài test chốt: mọi phần mở rộng trong plist phải có trong `main.py` `FILE_APP_KINDS` với đúng app kind. Không thêm `.dotx`/`.potx` (mã dùng chung chưa hỗ trợ → cần phiếu shared-owner, không tự quyết). |
| Hai nguồn sự thật cho danh sách kiểu tệp | Xoá `ports/macos/Sheet-Info.plist`; ghi rõ trong handoff để người phụ trách gộp nhánh này thay cho `mac/filetypes-1910`. |
| Đổi semantics định dạng tệp | Phiếu này **không** đụng `main.py`, adapter, hay định dạng lưu; chỉ khai báo với Launch Services. |

## 7. Kế hoạch kiểm thử

1. `plutil -lint` cho ba plist trong `ports/macos/launcher/`.
2. Bài Python tập trung `tests/macos/test_sheet_file_types.py` (Python 3.12): khai báo UTI, hợp đồng `main.py`, nội dung `.xltx`, chốt phần mở rộng ⊆ `FILE_APP_KINDS`.
3. `ports/macos/scripts/build-development.sh build/macos-xcode-filetypes` với `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer` → build unsigned universal.
4. `validate-development-bundles.py` trên bundle đã dựng (kiểm cả phần UTI).
5. `lipo -info` cho ba executable.
6. `lsregister -dump` xác nhận bundle mới khai UTI sau khi build (build phase `RegisterWithLaunchServices` đã tự đăng ký).
7. `git diff --check`; không commit artifact build (`build/` đã nằm trong `.gitignore`).

## 8. Hoàn tác

- `git revert` commit tích hợp là đủ: chỉ đổi plist, validator, test, tài liệu. Không có migration dữ liệu, không đổi Core, không đổi mã dùng chung.
