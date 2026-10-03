# Spec — Nền tảng, nhánh Git và quy trình cho Windows / macOS / Mobile

Ngày: 03/10/2026 · Kho: `https://github.com/hieupt91/3t-office` (riêng tư). Nguyên tắc của AGENTS.md giữ nguyên: **một monorepo**, không tách mã theo ứng dụng hay theo hệ điều hành thành nhiều kho.

Tài liệu đi kèm: `docs/SPEC-MACOS-PORT.md` (cách đưa lên macOS cho chạy đúng như Windows), `docs/SPEC-MOBILE.md` (iOS/Android: phần dùng chung, phần phải chỉnh, tư vấn), `docs/SPEC-3T-CLOUD.md` + `docs/SPEC-LICENSE-KEYS.md` + `docs/SPEC-ADMIN-COMMERCE.md` (máy chủ dùng chung mọi nền tảng).

## 1. Hiện trạng: "Windows đã làm được đến đâu" (mốc 0.9.8, 03/10/2026)
- **Ba ứng dụng**: Doc (soạn thảo), Sheet (bảng tính), Slide (trình chiếu), giao diện web chạy trong WebView2, engine tài liệu là LibreOffice (headless, nhúng trong gói). Mở/lưu DOCX, XLSX, PPTX (cộng DOC/XLS/PPT/ODF/RTF/CSV) với lớp vá OOXML của riêng 3T để giữ định dạng.
- **Lõi dùng chung**: `apps/` (giao diện), `platform/` (lệnh, phím tắt, ribbon, trợ giúp, chính tả tiếng Việt, clipboard liên ứng dụng, tự khôi phục, báo lỗi, cập nhật…), `adapters/libreoffice` (cầu nối engine), `adapters/updater`, `adapters/error_reporting`.
- **Dịch vụ máy chủ** (`server/3t-api`, `server/3t-web`) đã chạy trên VPS: API cập nhật có chữ ký, báo lỗi, tải bộ cài, bản quyền key vĩnh viễn, trang quản trị, trang web giới thiệu — **đã thiết kế theo nền tảng** (`platform` ở key, token, API cập nhật).
- **Kiểm thử Windows làm chuẩn**: ~2.700 test node, bộ hồi quy desktop qua CDP (27 ca), các bài CDP theo tính năng (dán chéo, giữ focus, thước, menu chuột phải, nút định dạng, gõ hàm…), bộ kiểm tra độ trung thực với 28 file Excel thật (LAN) và bộ Word thật.
- **Ràng buộc đã chốt**: chạy ngoại tuyến là ưu tiên số 1; không gửi nội dung tài liệu ra ngoài âm thầm; tên giao diện chỉ "3T Office" + Doc/Sheet/Slide; không dùng phụ thuộc phải trả phí/độc quyền; mọi tính năng mới phải có Hướng dẫn sử dụng tiếng Việt.

## 2. Ba lớp mã (để biết cái gì dùng chung, cái gì làm riêng)

| Lớp | Nội dung | Dùng chung? |
|---|---|---|
| **A. Lõi dùng chung** | `apps/**`, `platform/**/*.js`, `platform/i18n`, `platform/help`, công thức, chính tả, định dạng số, `server/**`, test Node | Có — **một mã nguồn cho mọi nền tảng**; chỉ thêm điểm mở rộng, không rẽ nhánh theo hệ điều hành |
| **B. Cầu nối engine** | `adapters/libreoffice/**` (Python + JS), `ooxml_zip_patch.py`, `soffice_uno_worker.py` | Desktop (Windows + macOS + Linux) dùng chung; **mobile không chạy được** (xem SPEC-MOBILE) |
| **C. Dịch vụ hệ điều hành (OS shell)** | `main.py` phần cửa sổ/WebView, thư mục dữ liệu, instance duy nhất, theo dõi tiến trình, biểu tượng/AppUserModelID, liên kết tệp, bộ cài, launcher, cập nhật (bước áp dụng), COM Word/Excel | **Không** — mỗi nền tảng một bản, nhưng **cùng một giao diện lập trình** (`platform_services`, mục 3) |

## 3. Cách tách phần riêng từng nền tảng (việc cần làm TRƯỚC khi cổng sang macOS)
Hiện mã Windows nằm rải trong `main.py` (≈4.800 dòng) và một số mô-đun (`ctypes.windll`, `winreg`, `pythonw`, PowerShell, `CREATE_NO_WINDOW`, `taskkill`, `os.name == "nt"`). Quy tắc: **không viết thêm mã Windows rải rác**. Tạo gói `platform/os_services/` với giao diện (Python `Protocol`) và 1 hiện thực mỗi nền tảng:

```
platform/os_services/
  __init__.py            # get_services() chọn theo sys.platform
  base.py                # giao diện: DataDirs, SingleInstance, ProcessTracker, AppIdentity, FileAssociations,
                         #   Launcher (mở lại ứng dụng), UpdateApplier, Clipboard bổ sung, Notifications, DeviceId
  windows.py             # chuyển mã hiện có vào đây (không đổi hành vi)
  macos.py               # mới (SPEC-MACOS-PORT)
  linux.py               # (để sau) 
```
Việc tách này làm **trên `main`, trước**, trên Windows, với test chứng minh không đổi hành vi (hồi quy 27/27 + các bài CDP). Sau đó macOS chỉ cần viết `macos.py`.

## 4. Nhánh Git

| Nhánh | Vai trò | Ai ghi vào | Quy tắc |
|---|---|---|---|
| `main` | **Thân chính**: lõi dùng chung + Windows. Mọi bản phát hành Windows cắt từ đây. | Hợp nhất từ nhánh tính năng sau khi qua cổng kiểm thử | Luôn xanh; tag `win-v0.9.8`, `win-v0.9.9`… Không đẩy trực tiếp, không viết lại lịch sử |
| `release/win-0.9` (tạo khi cần vá nóng) | Bảo trì bản Windows đang chạy ngoài khách | Chỉ sửa lỗi nghiêm trọng, cherry-pick từ `main` | Sau khi vá, hợp nhất ngược vào `main` |
| `platform/macos` | **Nhánh tích hợp cổng macOS** (dài hạn) | Nhánh con `mac/<chủ-đề>` (vd `mac/shell`, `mac/soffice-worker`, `mac/packaging`, `mac/updater`, `mac/keymap`) | **Hợp nhất `main` vào `platform/macos` ít nhất mỗi tuần** (không rebase) để không lệch. Phần dùng chung phát hiện khi cổng (vd lỗi hoặc điểm mở rộng) **sửa ở `main` trước** rồi kéo xuống. Khi đạt cổng nghiệm thu từng mốc (M1…M8) thì hợp nhất `platform/macos` → `main` (mã mac nằm ở `platform/os_services/macos.py`, `ports/macos/`, không ảnh hưởng Windows). Tag `mac-v…` |
| `platform/mobile` | Nhánh tích hợp iOS/Android (ở giai đoạn thăm dò) | Nhánh con `mobile/<chủ-đề>` | Như trên; chỉ bắt đầu sau khi macOS qua mốc M4 |
| Nhánh tính năng (`feat/*`, `fix/*`, `perf/*`) | Công việc của từng agent, mỗi nhánh một worktree | Agent | Như AGENTS.md: mỗi agent một nhánh + worktree riêng |

Quy tắc phối hợp:
1. **Mọi thay đổi vào lớp A/B** (dùng chung) đi qua `main` trước. Nhánh `platform/*` chỉ chứa phần riêng của nền tảng đó.
2. **Mã riêng macOS** đặt ở: `platform/os_services/macos.py`, `ports/macos/**` (bộ cài, đóng gói, ký, plist), `tests/macos/**`, `docs/macos/**`. **Không** thêm điều kiện `if mac` rải rác vào `apps/` hay `platform/*.js`; nếu cần khác biệt thì thêm *điểm mở rộng* (cờ khả năng `capabilities`, bảng phím theo nền tảng) ở `main`.
3. Phiên bản: số phiên bản của lõi dùng chung chung cho mọi nền tảng (0.9.x); mỗi nền tảng có tiền tố tag riêng. Kênh cập nhật: `windows` (đường dẫn gốc hiện tại, không đổi), `macos/…`, `ios`, `android` (API/kho đã sẵn sàng).
4. Cổng chặt: không hợp nhất vào `main` nếu bộ kiểm thử Windows (node + CDP) không còn xanh.
5. Đẩy lên GitHub: `main` trước; các nhánh `platform/*` tạo ngay từ `main` (rỗng) để agent làm việc; không đẩy thư mục tạm/khóa/ảnh chụp thử nghiệm lớn.

## 5. Bảng "Windows đã có → macOS cần có" (tóm tắt; chi tiết ở SPEC-MACOS-PORT)
| Khả năng | Windows hiện tại | macOS phải đạt |
|---|---|---|
| Chạy ngoại tuyến, tự phục vụ giao diện trong tiến trình | Python + máy chủ tĩnh nội bộ | Giống hệt (lõi dùng chung) |
| Cửa sổ ứng dụng | pywebview + WebView2 (Chromium) | Cửa sổ + **engine Chromium** (khuyến nghị) để hành vi soạn thảo giống Windows |
| Engine tài liệu | LibreOffice nhúng, pipe UNO | LibreOffice macOS nhúng, kết nối UNO qua socket |
| Mở/lưu giữ định dạng | Lớp vá OOXML | Dùng nguyên mã (Python thuần), kết quả phải trùng bộ chuẩn |
| Cập nhật | Bản vá có chữ ký, áp dụng bằng PowerShell, hoàn tác khi lỗi | Cùng định dạng bản vá, **áp dụng vào thư mục dữ liệu người dùng** (không sửa gói `.app` đã ký) |
| Cài đặt/liên kết tệp/biểu tượng | NSIS, launcher `Doc.exe`…, "Mở bằng" | `.dmg`/`.app` đã ký + công chứng, `Info.plist` khai báo kiểu tệp, 3 biểu tượng riêng |
| Phím tắt | Ctrl | Cmd (+ bảng ngoại lệ trùng phím hệ thống) |
| Bản quyền | key + token, dấu vân tay máy | Cùng API, `platform=macos`, vân tay máy từ `IOPlatformUUID` |
| Kiểm thử tự động | CDP trên WebView2 | Tương đương CDP (xem SPEC-MACOS-PORT mục 9) |

## 6. Tiêu chí hoàn thành chung của một nền tảng
(1) Bộ test node xanh nguyên trạng; (2) bộ hồi quy giao diện tương đương 27 ca xanh; (3) bộ độ trung thực tài liệu cho **kết quả trùng** với chuẩn Windows (cùng file nguồn → cùng cấu trúc/số liệu); (4) cài đặt từ bản đóng gói trên máy sạch, mở/sửa/lưu 3 loại tài liệu, tự cập nhật, báo lỗi, kích hoạt key; (5) tài liệu hướng dẫn cài đặt + bản phát hành có chữ ký.
