# W1 spike: OOXMLKit trên Windows (24/10/2026)

## Tóm tắt

**Trạng thái W1 trên Windows: BLOCKED ở bước 1.** Máy đang chạy Windows 10 Pro 22H2 (build 19045), có khoảng 16.5 GiB trống trên C: lúc bắt đầu. Swift và WinGet chưa có. Visual Studio Build Tools đã cài xong sau khi tiến trình nền kết thúc; hiện còn khoảng 6.8 GiB trống. Chưa thể cài Swift, build/test target Windows, chạy exe, đo DLL runtime hay kích thước gói Windows.

`CODEX-COMMON-RULES.md` không có trong worktree theo tên/path được giao (`rg --files` không tìm thấy); các quy tắc chung người giao phiếu đã cung cấp trực tiếp vẫn được áp dụng.

Swift for Windows cần MSVC và Windows SDK. Hướng dẫn chính thức hiện tại liệt kê MSVC v143 x64/x86, Windows 11 SDK và Swift 6.4.1: <https://www.swift.org/install/windows/manual/>. Đã cài workload Visual C++ Build Tools và SDK từ bootstrapper chính thức. Xác nhận bằng `vswhere`: Visual Studio 17.14.37806.7 tại `C:\BuildTools`, MSVC `14.44.35207`, Windows SDK `10.0.22621.0` và `10.0.26100.0`. Sau cài đặt còn khoảng 6.8 GiB trống, dưới điều kiện giữ tối thiểu 8 GiB trước lượt cài kế tiếp. Swift 6.4.1 installer có kích thước **2,097,955,608 byte** theo HTTP Content-Length; không tải/cài vì dung lượng hiện tại không đáp ứng gate 8 GiB. Không phát sinh lỗi `ucrt` vì compiler chưa được cài/chạy.

## Kết quả từng bước

| Bước | Trạng thái | Bằng chứng |
|---|---|---|
| 1. Swift toolchain Windows + SDK | **BLOCKED (space gate)** | Swift 6.4.1 chưa cài; installer 2,097,955,608 byte, C: trống khoảng 6.8 GiB (<8 GiB gate). Visual Studio 17.14.37806.7, MSVC 14.44.35207 và Windows SDK 10.0.22621/26100 đã cài. `swift --version` không chạy được vì Swift chưa có. Không có lỗi `ucrt` vì compiler chưa khởi động. |
| 2. Build/test trên Windows | **BLOCKED** | `swift build -c release` và `swift test` trên Windows không chạy được do bước 1. |
| 2. Đối chứng Linux/WSL | **PASS (Linux)** | `/opt/swift/usr/bin/swift --version`: Swift 6.0.3, `x86_64-unknown-linux-gnu`. `swift build -c release` pass. `swift test`: **111 tests, 0 failures**. Lần chạy đầu có 1/111 fail vì bài kiểm import nội bộ chưa cho phép module `OOXMLBridge`; sau khi bổ sung module đó vào allowlist, chạy lại đủ 111 pass. Cảnh báo môi trường lặp lại: `libxml2.so.2: no version information available`; không làm fail build/test. |
| 3. `ooxml-engine` stdio JSON | **PASS trên Linux / NOT RUN trên Windows** | Thêm SwiftPM executable phụ thuộc `OOXMLBridge`. Đọc từng dòng stdin, gọi `OOXMLBridge.handle`, ghi đúng một dòng JSON stdout; EOF thì thoát. Target build được trong bản release WSL. Giao thức iOS không đổi. |
| 4. Python XLSX smoke test | **BLOCKED trên Windows** | Đã thêm pytest dùng XLSX tổng hợp >1 MB: mở, sửa A1, lưu, mở lại qua engine và kiểm tra bằng openpyxl; đo startup/open. `python -m pytest tests/test_ooxml_engine_windows.py -q`: **1 skipped**, lý do executable Windows chưa được build. Chưa có thời gian hay kích thước exe/DLL Windows để báo cáo. |

## Gate hồi quy

- `node tests/run-tests.js`: **PASS, 3796/3796**.
- `node scripts/audit-0610/i18n_parity.mjs`: **PASS, missingVI=0, missingEN=0**.
- `python scripts/audit-0610/verify_checklist_evidence.py --all --no-fix`: **PASS, 0 dòng hạ** (279 Word, 217 Excel, 269 PowerPoint).
- `python -m pytest tests -q -k ooxml_engine`: **1 skipped, 1143 deselected**; skip vì exe Windows chưa có.

`OfflineGuaranteeTests` kiểm tra import của toàn bộ source; allowlist được cập nhật để chấp nhận `OOXMLBridge` là module nội bộ mà executable mới cần gọi. Không thay đổi expected output hoặc tắt test.

## Thay đổi mã

- `ports/ios/OOXMLKit/Package.swift`: thêm product và executable target `ooxml-engine`, không sửa target thư viện hiện tại.
- `ports/ios/OOXMLKit/Sources/ooxml-engine/main.swift`: vòng lặp JSON Lines qua stdio, tái sử dụng `OOXMLBridge`.
- `ports/ios/OOXMLKit/Tests/OOXMLPackageTests/OfflineGuaranteeTests.swift`: cho phép import module nội bộ `OOXMLBridge` trong kiểm tra ranh giới import.
- `tests/test_ooxml_engine_windows.py`: smoke test có điều kiện, tự skip rõ lý do khi không có exe.

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
