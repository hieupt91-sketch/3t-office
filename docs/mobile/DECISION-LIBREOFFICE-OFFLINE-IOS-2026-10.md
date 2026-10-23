# Quyết định kỹ thuật — engine offline cho iOS/iPadOS

Ngày: 23/10/2026  
Nhánh: `mobile/ios-offline-deploy`  
Mục tiêu: giao cho đội triển khai một kế hoạch có thể kiểm chứng, không hứa hỗ trợ Office khi chưa có round-trip test.

## Kết luận ngắn

Không thể đưa nguyên LibreOffice desktop, Python/UNO hoặc `soffice` vào ứng dụng iOS/iPadOS hiện tại.
Các thành phần đó không phù hợp với sandbox iOS, kích thước/bộ nhớ của ứng dụng và vòng đời bị treo nền.
Vì vậy:

1. **MVP offline** dùng Swift + WKWebView, asset nằm trong app bundle, native Files bridge và engine OOXML browser-safe chạy cục bộ.
2. LibreOffice vẫn là **oracle/engine desktop và server**, dùng để tạo fixture, đối chiếu kết quả và xử lý tài liệu phức tạp khi người dùng cho phép online.
3. LibreOfficeKit/WASM chỉ là nhánh R&D sau khi có prototype đo được; không đưa vào MVP hay tuyên bố hỗ trợ App Store trước khi vượt cổng bộ nhớ, startup, license và round-trip.
4. Tài liệu Office chưa được engine mobile chứng minh phải mở read-only hoặc từ chối lưu; không được đổi đuôi hay ghi đè giả.

## Vì sao không dùng LibreOffice trực tiếp trên iPhone/iPad

| Hạng mục | Đánh giá thực tế |
|---|---|
| `soffice` + Python + UNO | **Không phù hợp**: binary desktop và tiến trình con không được phép mang vào luồng iOS hiện tại. |
| LibreOfficeKit native | Có thể nghiên cứu, nhưng phải port/build toàn bộ C++/Skia/ICU/font, loại bỏ phụ thuộc desktop, quản lý memory pressure và ABI iOS. Đây là dự án engine riêng, không phải đổi target Xcode. |
| LibreOffice WebAssembly | Có thể về mặt kỹ thuật, nhưng bundle lớn, startup/bộ nhớ cao, file system ảo và khả năng giữ định dạng chưa có bằng chứng. Không dùng làm cam kết MVP. |
| Server LibreOffice headless | Giữ fidelity cao nhưng **không offline**; chỉ là fallback online có đồng ý rõ ràng, xóa tài liệu sau xử lý và không ghi nội dung vào log. |

## Kiến trúc được duyệt cho MVP

```text
iOS/iPadOS universal Swift app
  ├─ WKWebView tải asset từ bundle (không server, không Internet)
  ├─ MobileBridge: command/capability/error contract
  ├─ NativeDocumentService: Files, security-scoped URL, atomic save/recovery
  ├─ OOXML Mobile Adapter (ZIP/XML allowlist, giữ part chưa sửa)
  └─ FODT/FODS/FODP model + Doc/Sheet/Slides UI dùng chung

Desktop/server LibreOffice
  └─ oracle tạo fixture, chuyển đổi phức tạp, fidelity comparison (online opt-in)
```

Không import `node:fs`, `node:zlib`, Python, `window.pywebview.api` hoặc `scripts/serve.js` vào WKWebView production.
ZIP/XML adapter phải có API browser-safe, giới hạn kích thước, timeout và báo cáo khả năng trước Save.

## Phạm vi offline theo giai đoạn

### I1 — shell (đã có trên nhánh nền)

- Boot iPhone/iPad Simulator không mạng.
- Bố cục cảm ứng riêng theo compact/regular size class; hit target tối thiểu 44 pt.
- Tệp mới và FODT/FODS/FODP; native Files picker; autosave cục bộ.

### I2 — native Files (đã có, cần tiếp tục regression)

- Mở/Lưu bản sao HTML, FODS, FODP.
- Security-scoped access, atomic write, giới hạn 24 MB, cảnh báo tiếng Việt.
- DOCX/XLSX/PPTX vẫn `BLOCKED` cho đến khi có adapter và fixture.

### I3 — OOXML tối thiểu, thứ tự bắt buộc

1. Sheet: workbook/sheet, text/number/date/formula cơ bản, styles và merged cells.
2. Writer: paragraphs/runs, bold/italic/underline, font, headings, lists đơn giản, inline image.
3. Slides: slide/text box, bounds, font/color, nền đơn giản.

Mỗi loại phải patch tối thiểu các ZIP part hiểu rõ và giữ nguyên part/ảnh/relationship chưa sửa. Nếu không bảo toàn được, chuyển read-only/Save a Copy.

### I4 — thiết bị thật và phát hành nội bộ

- iPhone màn hình nhỏ, iPad xoay dọc/ngang, iPad có bàn phím/trackpad.
- IME tiếng Việt, background/restore, memory pressure, Files/iCloud/SMB.
- TestFlight nội bộ chỉ sau khi ký và có privacy manifest phù hợp.

## Cổng nghiệm thu bắt buộc

Không được ghi PASS nếu thiếu một trong các bằng chứng sau:

| Cổng | Bằng chứng |
|---|---|
| Build | Xcode Debug build cho `iphonesimulator` và target device arm64; log có `BUILD SUCCEEDED`. |
| UI | Boot, rotate, mở panel Tệp, hủy picker, nhập tiếng Việt trên cả iPhone và iPad Simulator. |
| Round-trip | Mở → sửa → lưu → đóng → mở lại; kiểm XML/ZIP và dữ liệu. `unzip -t` phải PASS. |
| Không mất dữ liệu | Ảnh, relationship, part chưa sửa, Unicode/NFC, formula/style phải giữ hoặc bị chặn lưu rõ ràng. |
| Offline | Tắt mạng hoàn toàn; mở/sửa/autosave các định dạng đã công bố. Không gọi API mạng. |
| An toàn | Tệp lỗi, ZIP bomb, quá giới hạn, hủy picker, mất quyền URL đều có error state và không ghi đè nguồn. |
| Thiết bị thật | Ít nhất một iPhone và một iPad thật trước TestFlight; Simulator không thay thế bằng chứng này. |

## Ma trận công bố tính năng hiện tại

| Định dạng | Offline hiện tại | Công bố |
|---|---:|---|
| HTML/HTM an toàn | Có | Mở/sửa/lưu |
| FODS | Có | Mở/sửa/lưu Sheet cơ bản |
| FODP | Có | Mở/sửa/lưu Slide cơ bản |
| DOCX | Chưa | `BLOCKED` — không cho ghi đè |
| XLSX | Chưa | `BLOCKED` — không cho ghi đè |
| PPTX | Chưa | `BLOCKED` — không cho ghi đè |

## Kế hoạch nhánh và giao việc

- `mobile/ios-offline-deploy`: tài liệu, shell tích hợp và cổng release.
- `mobile/ooxml-browser-zip`: ZIP/DEFLATE/CRC/UTF-8, không Node API.
- `mobile/ooxml-sheet`: XLSX tối thiểu + fixture.
- `mobile/ooxml-writer`: DOCX tối thiểu + fixture.
- `mobile/ooxml-slides`: PPTX tối thiểu + fixture.
- `mobile/ooxml-qa`: fuzz, memory, interrupted save, Unicode, device QA.

Mọi thay đổi shared `apps/**`, `platform/**`, `adapters/**` phải làm trên `main` trước rồi mới kéo xuống nhánh mobile. Mỗi nhánh có worktree riêng; không merge mù giữa các nhánh iOS hiện có.

## Cách chạy kiểm thử cho đội

```sh
# trong repo, trên máy có Xcode/iOS Simulator
bash ports/ios/scripts/stage-web-assets.sh
bash ports/ios/scripts/build-simulator.sh
python3 -m unittest discover -s tests/ios -v
python3 -m unittest tests.test_ios_offline_shell -v
xcodebuild -project ports/ios/VNOfficeIOS.xcodeproj \
  -scheme VNOfficeIOS -sdk iphonesimulator -configuration Debug build
```

Các lệnh trên chỉ là cổng shell. Trước khi bật DOCX/XLSX/PPTX phải bổ sung fixture round-trip và chạy trên cả iPhone/iPad Simulator; trước TestFlight phải chạy thiết bị thật.

## Quyết định cần người phụ trách duyệt

1. Duyệt Swift + WKWebView và engine OOXML native/browser-safe cho MVP.
2. Cho phép LibreOffice server làm fallback online **chỉ sau đồng ý từng lần**.
3. Nếu muốn thử LibreOfficeKit/WASM, mở task R&D riêng với ngân sách bộ nhớ/kích thước và audit license; không gắn vào mốc phát hành offline MVP.
4. Chốt minimum iOS/iPadOS theo thiết bị khách hàng sau khi đo thực tế, không suy diễn từ Simulator.

## Trạng thái bằng chứng trên nhánh nền

- Shell iOS/iPadOS và native Files workflow đã có handoff; DOCX/XLSX/PPTX đang ghi rõ `BLOCKED`.
- Bản thân tài liệu này là kế hoạch/decision gate, **không phải** bằng chứng round-trip Office.
- Sau khi đội chạy các lệnh và bổ sung fixture, phải cập nhật handoff với số liệu PASS/FAIL/NOT RUN/BLOCKED và thiết bị cụ thể.
