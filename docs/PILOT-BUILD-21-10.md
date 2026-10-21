# Q46 — Bản pilot 0.9.12-rc0 (21/10/2026)

## Phạm vi và môi trường

- Nhánh `codex/queue-19-10`; đã fast-forward merge `main` từ `11ab28d5` lên `88595228` trước khi làm.
- Không tìm thấy `CODEX-COMMON-RULES.md` trong repo. Đã đọc mục 2 của `docs/RELEASE-0.9.12-READINESS.md`, `scripts/build-pilot.ps1` và `scripts/build-installer.ps1`.
- Dung lượng trống E: trước build: 19,634,708,480 byte (~18.3 GiB). Không thay `APP_VERSION` trong repo, không phát hành, không upload, không tạo ZIP.
- Lệnh: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-pilot.ps1 -Version 0.9.12-rc0 -OutDir E:\VNOffice-profiles\pilot-build`.
- Build: **PASS** — `E:\VNOffice-profiles\pilot-build\VNOffice-0.9.12-rc0`; script báo 1,132 MB; quét được 1,186,906,868 byte / 19,609 tệp. Thời gian theo thời điểm chờ lệnh khoảng 47 giây.

## Kiểm tra bằng Python trong gói

- **PASS** — chạy `python\python.exe -s -c` trong gói: import `webview`, `cryptography`, `pypdf`, `cffi`, `clr_loader`, `pythonnet`, `bottle`, `proxy_tools`, `typing_extensions`; `import main` thành công, phiên bản gói `0.9.12-rc0`.
- **PASS** — gói không có pytest; dùng nhánh dự phòng: tạo DOCX OOXML tối giản, mã hóa rồi giải mã bằng `platform/security/office_encryption.py`, byte khôi phục trùng hoàn toàn (442 byte).
- **PASS** — pypdf trong gói dàn PDF 3 trang thành handout 1 trang.
- **PASS** — `python -m pytest tests/test_packaging_imports.py -q`: 3 passed. Đây là kiểm tra nguồn/danh sách gói bằng Python dev; kiểm tra import ứng dụng đóng gói ở trên dùng Python trong gói.

## Mở, lưu, mở lại và đối chiếu bản dev

Mọi phép đo bên dưới chạy lần lượt. Hồ sơ mới dùng `LOCALAPPDATA` tách riêng cho từng ứng dụng.

| Ứng dụng / tệp mẫu | Mở lần đầu | Mở lần hai | Mở-lưu-mở lại gói | Đối chiếu đầu ra gói / dev |
|---|---:|---:|---|---|
| Writer / `d03.docx` | 9,316 ms | 2,667 ms | **PASS** | DOCX: 12/12 phần ZIP giống hệt |
| Sheet / `lan28.xlsx` | 12,169 ms | 3,361 ms | **PASS** | XLSX: 22/22 phần ZIP giống hệt |
| Slides / `sample-3.pptx` | 12,405 ms | 5,599 ms | **PASS** | PPTX: nội dung API sau khi mở lại có cùng SHA-256; 22/92 phần ZIP khác (presentation XML/relationships và dữ liệu phông nhúng). Chưa khẳng định tệp PPTX giống từng byte/phần. |

- Cả ba ứng dụng đều `open → save → reopen` thành công qua API của tiến trình đóng gói. Kích thước đầu ra: DOCX 13,374 byte; XLSX 62,451 byte; PPTX 18,994,326 byte. Bản dev tạo DOCX/XLSX cùng kích thước, PPTX 18,994,327 byte.
- **PASS** — `tests/test_ooxml_encryption_roundtrip.py` không chạy được bằng pytest trong runtime gói vì pytest không được đóng gói; kiểm tra thay thế được thực hiện thành công như trên. Excel COM không dùng.
- Khởi chạy CDP cần `node --experimental-websocket`; lần gọi đầu thiếu cờ này nên harness lỗi trước khi kết nối, sau đó chạy lại bằng cờ cần thiết. Không phải lỗi của gói.
- Log Sheet/Slides có cảnh báo: `Could not set the taskbar process identity: cannot access local variable 'ctypes' where it is not associated with a value`; app vẫn mở tệp và sử dụng được.

## Quét nội dung đóng gói

- **PASS** — không thấy thư mục `docs`, `tests`, `.git`, `node_modules`, `samples` hoặc `testdata`; không có tệp DOCX/XLSX/PPTX/PDF mẫu ngoài engine; không có tài liệu mẫu thật bị đóng gói.
- **PASS** — `THIRD-PARTY-NOTICES` có 17 tệp; có license cryptography và pypdf. Các gói import cần thiết hiện diện trong `python\Lib\site-packages`.
- Có một tệp lớn hơn 100 MiB: `app\tools\libreoffice\program\mergedlo.dll` (147,900,328 byte), thành phần runtime LibreOffice; không phải tài liệu hoặc tệp thử.

## Giao diện đã xem (ảnh CDP)

- [Writer — d03.docx](assets/pilot-build-21-10/writer-d03.png): **đạt chức năng; ghi nhận lỗi trình bày trong tài liệu** — các đoạn đầu trang/bullet có khoảng cách và canh lề chưa đều. Không sửa trong ticket build pilot.
- [Sheet — lan28.xlsx](assets/pilot-build-21-10/sheet-lan28.png): **đạt** — dữ liệu hiện sau khi tải đủ 100%, ribbon và các tab trang tính nhìn thấy, không thấy chữ/nút bị che.
- [Slides — sample-3.pptx](assets/pilot-build-21-10/slides-sample3.png): **đạt** — tải đủ 10 trang chiếu; vùng dưới trang chiếu vượt chiều cao khung nhìn nhưng có thanh cuộn. Ảnh chụp sau khi chờ tải xong.

## Gate cuối

- `node tests/run-tests.js`: **PASS — 3,791/3,791; 0 FAIL**.
- `node scripts/audit-0610/i18n_parity.mjs`: **PASS — VI=3,153, EN=3,153, missing=0** (công cụ báo thêm 20 chuỗi giống/để trống, không phải missing).
- `python scripts/audit-0610/verify_checklist_evidence.py --all --no-fix`: **PASS — 0 dòng bị hạ** (279 Word, 217 Excel, 269 PowerPoint).
- `python -m pytest tests -q -k "packaging or encryption or print"`: **PASS — 78 passed, 1,053 deselected, 80.82 s**.
- Không sửa script/source; chỉ thêm báo cáo và ảnh. Gói tạm được xóa sau kiểm tra; báo cáo và ảnh giữ lại trong repo.
