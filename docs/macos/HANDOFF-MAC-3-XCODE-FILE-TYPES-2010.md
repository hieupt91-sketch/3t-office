# Bàn giao MAC-3-XCODE-FILE-TYPES — hợp nhất UTI MAC-3 vào ba bundle Xcode

- Nhánh: `mac/xcode-filetypes-opencode` (worktree riêng `/Users/hieupc/.codex/worktrees/opencode-xcode-filetypes/3t-office`).
- Gốc: commit M7 `fa0ec31b` (build launcher) + commit MAC-3 `4f8f64b8` (đăng ký UTI `.xltx/.xlt`) đã merge vào nhánh này.
- Kế hoạch: `docs/macos/PLAN-MAC-3-XCODE-FILE-TYPES-2010.md`.

## 1. Khoảng trống đã tìm ra

MAC-3 đặt plist ở `ports/macos/Sheet-Info.plist`, còn `ports/macos/scripts/build-development.sh` truyền
`INFOPLIST_FILE=$MACOS_DIR/launcher/<Doc|Sheet|Slide>-Info.plist` cho Xcode. Nghĩa là plist của MAC-3 **không
được bundle nào dùng**: nội dung UTI của MAC-3 chưa từng tới Launch Services, và tồn tại hai nguồn sự thật
cho cùng danh sách kiểu tệp. Đây cũng là điểm M7 đã ghi trước: "Info.plist từ mốc cũ cần nhận các UTI mới
từ MAC-3 trước khi gộp phát hành".

## 2. Đã làm

- `ports/macos/launcher/Sheet-Info.plist`: nhận nguyên vẹn phần UTI của MAC-3 — `org.openxmlformats.spreadsheetml.template`
  (`.xltx`, `application/vnd.openxmlformats-officedocument.spreadsheetml.template`) và `com.microsoft.excel.xlt`
  (`.xlt`, `application/vnd.ms-excel`), cộng `.xltx`/`.xlt` vào `CFBundleTypeExtensions`.
- `ports/macos/launcher/Doc-Info.plist` và `Slide-Info.plist`: cùng mô hình đăng ký (UTI + phần mở rộng) cho
  đúng các định dạng ứng dụng đã hỗ trợ — không khai thêm loại tệp nào.
- `ports/macos/Sheet-Info.plist`: **xoá** sau khi hợp nhất (một nguồn sự thật duy nhất là file Xcode dùng).
- `ports/macos/scripts/validate-development-bundles.py`: kiểm thêm `UTImportedTypeDeclarations`, `LSItemContentTypes`,
  `CFBundleTypeRole`, `LSHandlerRank` trên bundle đã dựng.
- `tests/macos/test_sheet_file_types.py`: bài của MAC-3 giữ nguyên, chỉnh lại đường dẫn và mở rộng ra ba bundle,
  thêm chốt "chỉ khai loại tệp mà `main.py` thực sự mở được".

## 3. Bằng chứng (đo trên máy này)

- `lsregister -dump`: sau khi build, `Sheet.app` **nhận** (`claimed UTIs`) `org.openxmlformats.spreadsheetml.template`
  và `com.microsoft.excel.xlt`; `Doc.app` nhận 5 UTI; `Slide.app` nhận 3 UTI. Mô tả tiếng Việt của bundle
  ("Mẫu bảng tính Open XML", "Mẫu bảng tính nhị phân", …) đã được Launch Services nhận.
- `mdls -name kMDItemContentType`: macOS tự ánh xạ `.xltx` → `org.openxmlformats.spreadsheetml.template`,
  `.xlt` → `com.microsoft.excel.xlt` — khớp đúng UTI của MAC-3.
- UTI ODF đúng là `org.oasis-open.opendocument.*` (có `open`); dùng `org.oasis.opendocument.*` sẽ không được nhận.
- MIME `application/vnd.ms-excel` cho `.xlt` của MAC-3 khớp với khai báo của CoreTypes trong hệ thống
  (`application/vnd.ms-excel`, `application/msexcel`) — giữ nguyên, không sửa.

## 4. Kết quả kiểm thử

| Hạng mục | Kết quả |
|---|---|
| `plutil -lint` ba plist trong `ports/macos/launcher/` | PASS 3/3 |
| `python3.12 -m unittest tests.macos.test_sheet_file_types` | PASS 7/7 |
| Kiểm âm tính (thêm `.dotx` giả) | FAIL đúng kỳ vọng — bài chốt bắt được loại tệp mã dùng chung không mở được |
| `ports/macos/scripts/build-development.sh` (Xcode 26.3, `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer`) | PASS — build 3/3, **BUILD SUCCEEDED** |
| `validate-development-bundles.py` trên bundle đã dựng | PASS 3/3 (kèm phần UTI) |
| `lipo -info` | PASS 3/3 — `x86_64 arm64` |
| `lsregister -dump` sau build | PASS — cả ba bundle đã đăng ký, Sheet nhận đủ UTI mẫu |
| Payload Python đúng bài Node `sheet-template-save` (chạy bằng python3.12 + stub `webview`) | PASS — `template=true`, `plain=false`, `infer=xltx`, 1 loại lưu `.xltx`, hộp thoại Mở có `.xltx`; tạo `.xltx` 9.622 byte |
| LibreOffice macOS mở lại `.xltx` vừa tạo | PASS — chuyển sang FODS 71.612 byte |
| `node scripts/audit-0610/i18n_parity.mjs` | PASS — VI=EN=3091, thiếu 0, lệch placeholder 0 |
| `git diff --check` | PASS — sạch |

## 5. BLOCKED / chưa chạy được (không hạ tiêu chí)

- `python -m pytest tests -q`: **BLOCKED** — máy này không có `pytest` cho bất kỳ Python nào (3.9 và 3.12 đều thiếu);
  dùng `unittest` cho bài tập trung thay thế.
- Bài Node `sheet-template-save` trong `npm test`: **FAIL do môi trường, không do phiếu này** — bài gọi lệnh `python`
  (máy chỉ có `python3`) và `import main` cần `pywebview` (chưa cài, thuộc MAC-12). Chạy đúng payload của bài bằng
  `python3.12` + stub `webview` cho kết quả PASS như bảng trên.
- `npm test` đầy đủ: xem mục 6.
- Chạy thật giao diện ba app: **BLOCKED** — bundle phát triển chưa nhúng runtime Python + `cryptography` + pywebview/Qt + LibreOffice
  (MAC-12/MAC-11).

## 6. `npm test` — FAIL do baseline, không do phiếu này

Phiếu này **không sửa dòng JavaScript nào**. Số liệu so sánh với checkout sạch (`fa0ec31b`, chạy trong worktree tạm):

- Nhánh này: **3730/3749 PASS, 19 FAIL**.
- Baseline `fa0ec31b`: **3730/3749 PASS, 19 FAIL** — `diff` danh sách 19 bài FAIL: **IDENTICAL** (không bài nào do phiếu này).

Các bài FAIL đều cần `python`/`soffice`/COM trên Windows hoặc phụ thuộc môi trường, ví dụ
`Lưu .xltx: gói có loại nội dung mẫu…`, `Sheet FODS save: LibreOffice giữ CF và validation qua FODS -> XLSX -> FODS`,
`Python twin overlay FODS giống JS (CLI --overlay-fods)`, `CH-9.4: startup sweep…`.

## 7. Rủi ro

- Khai `UTImportedTypeDeclarations` cho UTI của hãng khác: là khai *dùng*, không phải *sở hữu*; máy này đã có nhiều
  app khai cùng một UTI mà không lỗi (dump thấy `org.openxmlformats.spreadsheetml.template` ở nhiều bundle).
  Khi người dùng đã có Office/LibreOffice, bản khai của họ được ưu tiên.
- `CFBundleTypeExtensions` được giữ trong cùng dict với `LSItemContentTypes` làm đường dự phòng, nên không mất
  liên kết theo phần mở rộng nếu UTI không resolve trên máy không cài Office/LibreOffice.
- Chưa khai `.dotx`/`.dot`/`.potx`/`.pot`: mã dùng chung (`main.py` `FILE_APP_KINDS`) chưa mở các loại này; khai thêm
  là hứa mở tệp không mở được và cần một phiếu shared-owner trên `vn-main` (không tự quyết trong nhánh macOS).
- Build của Xcode tự chạy `RegisterWithLaunchServices`, nên ba bundle phát triển đã được đăng ký trên máy này
  (trỏ vào `build/macos-xcode-filetypes/.derived-data/…`). Gỡ nếu cần:
  `lsregister -u <đường dẫn .app>`.

## 8. Việc cần người phụ trách quyết định

1. **Cách gộp**: nhánh này đã chứa nội dung MAC-3 (merge commit `208571be`) và đã hợp nhất plist. Nên gộp
   `mac/xcode-filetypes-opencode` **thay cho** `mac/filetypes-1910`; nếu gộp cả nhánh kia, ở xung đột
   add/delete của `ports/macos/Sheet-Info.plist` thì **chọn giữ bản xóa** (nội dung đã ở `ports/macos/launcher/Sheet-Info.plist`).
2. Có mở rộng `FILE_APP_KINDS`/đường overlay `.xlsx` cho `.xltx` trên `vn-main` không (MAC-3 đã ghi nhu cầu này).
3. Runtime cho gói macOS (MAC-12) và ký/notarize (MAC-11) — ngoài phạm vi phiếu này.
