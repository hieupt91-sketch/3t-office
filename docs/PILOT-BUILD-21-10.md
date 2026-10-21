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

## Q48 — Seed-profile copy race / hai pilot rc1

### Mục tiêu và tái hiện

- Tái dùng nhánh `codex/queue-19-10`, worktree `E:\VNOffice-codex-queue`; đã fast-forward merge `main` trước khi sửa. `CODEX-COMMON-RULES.md` không có trong repo. Giữ nguyên thay đổi người dùng chưa commit tại `tests/unit/writer-tables-import.test.js`.
- Tái hiện bản cũ: 10 lượt tuần tự **0/10 lỗi**, 43.5–45.0 giây/lượt; 5 lượt khi một soffice headless khác giữ profile riêng **0/5 lỗi**, soffice ngoài vẫn sống hết phép thử. Race không lặp lại trong hai phép thử này.
- Bộ test mới chạy trên bản cũ: **4 failed, 2 deselected** vì chưa có lọc file, retry và truy vết tiến trình theo profile.
- Lần đầu chạy bài build thật sau khi thêm retry đã tái hiện **WinError 3** ở `cache\_nop_fsum_...bin`, lặp đủ 5 lần; `shutil.Error` trước đó không đưa source/target vào thông báo. Đã loại cache biến động khỏi seed và bổ sung báo lỗi đầy đủ source/target.

### Sửa và kết quả seed

- Sau mỗi warm-up, script tìm command line có đường dẫn profile chính xác, dừng đúng PID đó và chờ tối đa 30 giây. Copy dùng ignore cho `.tmp`, `.lock`, lock marker, backup/temp/cache; tối đa 5 lần, nghỉ 1 giây và dọn đích trước mỗi lần. Khi cạn retry, trả mã lỗi kèm từng source, destination và lỗi copy.
- Test mock: **6 passed**; test build thật với LibreOffice: **PASS**; lỗi bị mất trong `shutil.Error` cũng có đủ source/destination trong thông báo. Bài pytest tích hợp sau sửa: **7 passed, 44.39 giây**; toàn gate liên quan **98 passed, 1042 deselected, 126.09 giây**.
- Bản cuối chạy lại 10 lượt tuần tự: **0/10 lỗi**, 43.8–44.4 giây/lượt. Năm lượt concurrent trên bản sửa: **0/5 lỗi**. Không còn process giữ profile thử sau mỗi lượt.
- Seed trong hai pilot: Writer **429 KB/42 tệp**, Sheet **251 KB/42 tệp**, Slides **424–425 KB/42 tệp**. Profile được dùng qua `main._seed_profile_dir`: profile mới có registry và marker warm-up; sau lần chạy đầu mỗi profile có 47 tệp.

### Hai pilot và kiểm tra runtime đóng gói

- Lượt 1: `powershell -NoProfile -ExecutionPolicy Bypass -File scripts/build-pilot.ps1 -Version 0.9.12-rc1 -OutDir E:\VNOffice-profiles\pilot-build` — **PASS**, `E:\VNOffice-profiles\pilot-build\VNOffice-0.9.12-rc1`, 1130 MB.
- Lượt 2, cùng lệnh/đích sau khi đổi tên đầu ra lượt 1 trong `pilot-build` để giải phóng tên đích — **PASS**, 1130 MB. Cả hai lần build seed đủ ba ứng dụng và launcher.
- Python đóng gói: **PASS** — `main.APP_VERSION=0.9.12-rc1`, `cryptography=50.0.2`, `pypdf=6.21.1` import thành công.
- CDP runtime của pilot lượt 2, mỗi lần dùng `LOCALAPPDATA` mới; save dùng `globalUnoBridge.saveRealFileInPlace`, không dùng Office COM:

| Tệp | Mở lần đầu | Số liệu sau mở | Lưu | Mở lại |
|---|---:|---|---|---|
| `d03.docx` | 4,894 ms | Writer 3 trang, 303 từ | **PASS** | **PASS**, 10,402 ms |
| `lan28.xlsx` | 13,373 ms | Sheet 12 sheet | **PASS** | **PASS**, 12,062 ms |
| `sample-3.pptx` | 17,600 ms | Slides 10 trang; shape counts `[5,4,1,3,2,3,4,3,2,4]` | **PASS** | **PASS**, 16,928 ms |

- **Chưa đạt ngưỡng mở tệp đầu tiên ≤12 giây** cho Sheet và Slides trong phép đo này; Writer đạt. PPTX sau mở-lưu-mở lại còn **10/10** phần `.fntdata` và 10/10 slide XML. Không thấy `Could not set the taskbar process identity` trong log của ba app.

### Giao diện đã xem

- Writer mở, sau lưu, mở lại: [ảnh đầu](assets/q48/writer-first-open.png), [ảnh sau lưu](assets/q48/writer-saved.png), [ảnh mở lại](assets/q48/writer-reopen-open.png) — đạt, ribbon và ba trang nhìn được; không thấy nút/toolbar bị che.
- Sheet mở, sau lưu, mở lại: [ảnh đầu](assets/q48/sheet-first-open.png), [ảnh sau lưu](assets/q48/sheet-saved.png), [ảnh mở lại](assets/q48/sheet-reopen-open.png) — ghi nhận chữ nhạt lặp/chồng lên một số ô sau khi mở lại; dữ liệu chính và 12 tab sheet vẫn hiện. Không sửa vì thuộc nội dung/hiển thị tài liệu, ngoài phạm vi seed packaging.
- Slides mở, sau lưu, mở lại: [ảnh đầu](assets/q48/slides-first-open.png), [ảnh sau lưu](assets/q48/slides-saved.png), [ảnh mở lại](assets/q48/slides-reopen-open.png) — 10 trang và ribbon hiện; phần cuối slide vượt khung nhìn nhưng có thanh cuộn, không thấy chữ ribbon bị cắt.

### Gate, cleanup và tình trạng

- `node tests/run-tests.js`: **PASS — 3791/3791**. `i18n_parity.mjs`: **PASS — VI=3153, EN=3153, missing=0**. `verify_checklist_evidence.py --all --no-fix`: **PASS — 0 dòng bị hạ**. `pytest tests -q -k "packaging or seed or build or encryption or print"`: **PASS — 98 passed, 1042 deselected, 126.09 giây**.
- Xóa pilot sau xác minh bị automatic review chặn ở `Remove-Item -Recurse`. Đầu ra lượt 1 đã đổi tên thành `E:\VNOffice-profiles\pilot-build\VNOffice-0.9.12-rc1-q48-first-pass`; bản lượt 2 vẫn ở thư mục đích. **Cần Claude xóa `E:\VNOffice-profiles\pilot-build`** sau khi lưu hồ sơ này.
- Giao diện còn hai điều cần theo dõi ngoài seed race: thời gian mở đầu Sheet/Slides vượt 12 giây và chữ nhạt lặp ở Sheet khi mở lại. Không đổi test kỳ vọng và không tuyên bố đạt hai tiêu chí này.
