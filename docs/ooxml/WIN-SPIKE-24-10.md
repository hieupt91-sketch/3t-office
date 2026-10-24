# W1 spike: OOXMLKit trên Windows (24/10/2026)

## Tóm tắt

**Trạng thái W1 trên Windows: PASS cho toolchain, build, test và smoke test.** Máy Windows 10 Pro 22H2 (build 19045); Swift 6.4.1 cài trong `D:\swift`, còn 218.83 GiB trống trên D: sau các bước kiểm tra. C: còn 4.98 GiB; đường dẫn mặc định `%LocalAppData%\Programs\Swift` là junction tới D: và TEMP/TMP dùng `D:\tmp`. Visual Studio 17.14.37806.7, MSVC 14.44.35207 và Windows SDK 10.0.22621/10.0.26100 đã có sẵn.

`CODEX-COMMON-RULES.md` không có trong worktree theo tên/path được giao (`rg --files` không tìm thấy); các quy tắc chung người giao phiếu đã cung cấp trực tiếp vẫn được áp dụng.

Swift for Windows cần MSVC và Windows SDK. Hướng dẫn cài đặt chính thức: <https://www.swift.org/install/windows/manual/>. Installer Swift 6.4.1 tải từ `download.swift.org`, kích thước **2,097,955,608 byte**. Chạy `swift build` ban đầu thiếu platform SDK vì chưa đặt `SDKROOT`; sau khi đặt `SDKROOT=D:\swift\Platforms\6.4.1\Windows.platform\Developer\SDKs\Windows.sdk` và nạp môi trường `VsDevCmd.bat`, build thành công. Không gặp lỗi modulemap `ucrt`. SwiftPM cảnh báo không tạo được symlink `.build\release` (I/O 512); executable được chạy trực tiếp từ `.build\out\Products\Release-windows-x86_64` qua `OOXML_ENGINE_PATH`.

## Kết quả từng bước

| Bước | Trạng thái | Bằng chứng |
|---|---|---|
| 1. Swift toolchain Windows + SDK | **PASS** | Swift 6.4.1 (`x86_64-unknown-windows-msvc`) tại `D:\swift`; installer 2,097,955,608 byte. Còn 218.83 GiB trên D:; TEMP/TMP đặt tại `D:\tmp`. C: còn 4.98 GiB, không chứa thư mục toolchain (đường dẫn mặc định là junction). |
| 2. Build/test trên Windows | **PASS** | `swift build -c release`: PASS, executable được build ở release. `swift test`: **114 test cases, 0 failures**. Cần đặt `SDKROOT` tới Windows.sdk và khởi tạo MSVC bằng `VsDevCmd.bat`; không phát sinh lỗi `ucrt`/modulemap. |
| 2. Đối chứng Linux/WSL | **PASS (Linux)** | `/opt/swift/usr/bin/swift --version`: Swift 6.0.3, `x86_64-unknown-linux-gnu`. `swift build -c release` pass. `swift test`: **111 tests, 0 failures**. Lần chạy đầu có 1/111 fail vì bài kiểm import nội bộ chưa cho phép module `OOXMLBridge`; sau khi bổ sung module đó vào allowlist, chạy lại đủ 111 pass. Cảnh báo môi trường lặp lại: `libxml2.so.2: no version information available`; không làm fail build/test. |
| 3. `ooxml-engine` stdio JSON | **PASS trên Windows** | Executable `ooxml-engine.exe`: **3,904,512 byte**. Theo import dependency đệ quy, 18 DLL runtime Swift/MSVC cần thiết có tổng **59,655,976 byte**; exe + các DLL này **63,560,488 byte** (60.59 MiB). |
| 4. Python XLSX smoke test | **PASS trên Windows** | `python -m pytest tests/test_ooxml_engine_windows.py -q -s`: **1 passed**. Fixture XLSX **1,084,960 byte**; startup **0.004 s**, open **0.025 s**. `python -m pytest tests -q -k ooxml_engine`: **1 passed, 1153 deselected**. |

## Gate hồi quy

- `node tests/run-tests.js`: **PASS, 3796/3796**.
- `node scripts/audit-0610/i18n_parity.mjs`: **PASS, missingVI=0, missingEN=0** (VI=3200, EN=3200; 21 khóa rỗng/giống nhau được công cụ liệt kê).
- `python scripts/audit-0610/verify_checklist_evidence.py --all --no-fix`: **PASS, 0 dòng hạ** (279 Word, 217 Excel, 269 PowerPoint).
- `python -m pytest tests -q -k ooxml_engine`: **1 passed, 1153 deselected**.

`OfflineGuaranteeTests` kiểm tra import của toàn bộ source; allowlist được cập nhật để chấp nhận `OOXMLBridge` là module nội bộ mà executable mới cần gọi. Trên Windows, test smoke đầu tiên cho thấy phần đệm random-hex bị nén còn 620,524 byte; fixture được đổi sang ZIP_STORED để đạt kích thước 1,084,960 byte. Assertion đọc ô được sửa để kiểm tra schema typed hiện có (`{"t":"s","v":"after"}`), khớp với kiểm thử Swift của `OOXMLBridge`; không đổi engine hay tắt test. Lần chạy sau PASS.

## Thay đổi mã

- `ports/ios/OOXMLKit/Package.swift`: thêm product và executable target `ooxml-engine`, không sửa target thư viện hiện tại.
- `ports/ios/OOXMLKit/Sources/ooxml-engine/main.swift`: vòng lặp JSON Lines qua stdio, tái sử dụng `OOXMLBridge`.
- `ports/ios/OOXMLKit/Tests/OOXMLPackageTests/OfflineGuaranteeTests.swift`: cho phép import module nội bộ `OOXMLBridge` trong kiểm tra ranh giới import.
- `tests/test_ooxml_engine_windows.py`: smoke test có điều kiện; fixture XLSX >1 MB được giữ không nén và assertion kiểm tra đúng schema giá trị ô từ bridge.

Không sửa `main.py`, `apps/` hoặc `adapters/`. Target mới không mở mạng và chỉ đọc/ghi các đường dẫn người gọi đưa vào giao thức bridge.

## Nếu tiếp tục bị chặn: phương án B (đánh giá sơ bộ)

Đưa logic sang `platform/ooxml/`, dùng OOXMLKit làm oracle parity trên Linux/macOS và ưu tiên theo thứ tự bắt buộc:

1. **Zip** — 1,434 dòng Swift hiện có. Dựng wrapper tương thích trên `zipfile`; trước khi chuyển tiếp phải chứng minh giữ được entry chưa biết, metadata/ZIP64, lỗi CRC và round-trip không sửa.
2. **Package** — 1,657 dòng Swift. Xây mô hình OPC/XML bằng `xml.etree.ElementTree` hoặc `lxml` có sẵn trong môi trường, giữ relationships và part lạ. So từng gói với OOXMLKit oracle.
3. **Spreadsheet** — 2,172 dòng Swift. Chuyển workbook/worksheet, kiểu ô, shared strings, styles, tham chiếu/range và thao tác hàng/cột; kiểm open-edit-save-reopen với cùng fixture.

Ba lớp đầu có khoảng **5,263 dòng Swift**. Ước lượng ban đầu cho một port Python có kiểm tra tương đương là **4–7 tuần kỹ thuật** (Zip 1–2, Package 1–2, Spreadsheet 2–3), chưa gồm Word/Presentation và parity với tài liệu LAN/Office. Đây là ước lượng theo khối lượng mã và yêu cầu bảo toàn gói; cần làm lại sau khi có prototype Zip/Package. Duy trì LibreOffice làm đường mặc định cho tới khi từng cổng parity đạt.

## Rủi ro và bước tiếp

- Cần cài Swift 6.4.1 (hoặc phiên bản mới) cùng MSVC/Windows SDK trên máy Windows có quyền cài đặt; ghi lại `swift --version` và SDK cụ thể trước khi build.
- Sau khi Windows build được: chạy release/test, chạy pytest smoke với exe thật, đo startup/open của XLSX >1 MB, ghi kích thước exe và DLL runtime cần ship; thử `-static-stdlib` nếu Swift linker hỗ trợ và so sánh.
- Kết quả hiện có chỉ chứng minh target và logic library build/test được trên Ubuntu Swift 6.0.3. Chưa chứng minh tương thích Windows ABI/SDK, phân phối runtime Swift, hay parity với bộ tài liệu thật.
