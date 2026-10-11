# Bàn giao cho team macOS — trạng thái tương đương bản Windows 0.9.10

Mục tiêu: team Mac clone repo, làm theo tài liệu này và `docs/SPEC-MACOS-PORT.md` để đạt **cùng tính năng, cùng hành vi soạn thảo, cùng độ trung thực khi mở/lưu tài liệu** như bản Windows 0.9.10.

## 1. Repo này chứa gì
- **Toàn bộ mã nguồn** của Doc (Writer), Sheet, Slide, nền tảng dùng chung, cầu nối LibreOffice, bộ kiểm thử (khoảng 3.060 bài Node + 850 bài Python), tài liệu đặc tả và các phiếu đối chiếu với Word/Excel/PowerPoint thật.
- Mã chạy desktop: `main.py` (Python + pywebview), tự khởi động máy chủ tĩnh nội bộ `127.0.0.1` và mọi dịch vụ. Chạy ngoại tuyến. `scripts/serve.js` (Node) **chỉ** dùng cho test tự động.
- Mã cập nhật có chữ ký: `adapters/updater/` (cơ chế vá `app-<ver>` cần viết lại phần áp dụng bằng Python thuần cho macOS, xem SPEC mục 2 dòng 11).

## 2. Repo này KHÔNG chứa (cố ý) và cách có lại
| Thành phần | Lý do | Cách có trên Mac |
|---|---|---|
| LibreOffice (engine) | Quá lớn, có bản chính thức | Cài LibreOffice macOS; đặt `VNOFFICE_SOFFICE_PATH=/Applications/LibreOffice.app/Contents/MacOS/soffice` |
| Python/LibreOffice đóng gói, bộ cài `.exe` | Sinh ra khi build | Build riêng cho macOS (`.app`/`.dmg`) theo SPEC mục 3 và 5 |
| Hồ sơ LibreOffice dựng sẵn (`/seed/`) | Sinh ra khi đóng gói | Chạy `scripts/release/build-seed-profiles.py` **trên macOS** (SPEC mục 4) |
| Khóa ký cập nhật, mã bản quyền, cấu hình VPS | Bí mật | Do người phụ trách cấp riêng; **không bao giờ** commit |
| Tài liệu Office thật của công ty (bộ mẫu LAN) | Dữ liệu nội bộ | Dùng tệp mẫu trong `tests/fixtures/`; bộ thật chỉ chạy trên máy Windows của người phụ trách |
| Word/Excel/PowerPoint thật (COM) | Chỉ có trên Windows | Kết quả chuẩn do máy Windows chạy; Mac chỉ chạy các bộ không phụ thuộc COM |
| Lịch sử Git cũ | Có tệp nội bộ trong lịch sử | Repo bắt đầu từ bản chụp sạch; mọi thay đổi từ giờ có lịch sử đầy đủ |

## 3. Trạng thái tính năng (mốc Windows 0.9.10) — Mac phải đạt cùng mức
Đã đối chiếu với Office thật trên Windows (số liệu mốc 11/10/2026):
- **Doc:** bảng, bố cục trang/ngắt mục, Heading mặc định, hình khối/ảnh, bình luận đã giải quyết, tìm/thay, ký hiệu, mục lục; số trang khớp Word trên bộ mẫu.
- **Sheet:** Comma Style, căn lề, gộp ô, AutoSum, công thức phổ biến, ẩn/hiện sheet, tên vùng, xoay chữ, lề in, biểu đồ, sắp xếp/lọc, xóa trùng; **tệp xlsx lưu ra mở được bằng Excel** (8 tệp mẫu LAN đạt).
- **Slides:** 16 thao tác cơ bản khớp PowerPoint, menu chuột phải slide, nhóm/biểu đồ/chuyển tiếp.
- Chi tiết từng nhóm: `docs/AUDIT-DOC-WORD-PARALLEL-1011.md`, `docs/tickets-0710/`, `docs/DOC-RISK-REGISTER-1010.md`, `docs/PLAN-OFFICE-PARITY-1011.md`.

## 4. Cách làm để đạt mốc này trên Mac (thứ tự khuyến nghị)
1. Đọc `HUONG-DAN-TEAM-MAC.md`, `AGENTS.md`, `docs/SPEC-PLATFORMS-AND-BRANCHES.md`, `docs/SPEC-MACOS-PORT.md`.
2. Chạy được `python3 main.py` trên Mac với Chromium/Qt (SPEC mục 1.2) và `npm test` (phần giao diện không cần HĐH cụ thể). Đây là **mốc M1**.
3. Làm các mốc M2…Mn theo bảng 21 thành phần trong SPEC; mỗi mốc có cổng nghiệm thu.
4. **Cổng chất lượng bắt buộc** cho mọi thay đổi: `npm test` và `python -m unittest discover -s tests` phải đạt; kiểm giao diện bằng **chuột và phím thật qua CDP** (không dùng điều khiển OS), chụp ảnh đính kèm.
5. Cách làm việc Git: nhánh `platform/macos` + `mac/<chủ-đề>`; sửa lỗi dùng chung vào `main` trước. Mã riêng macOS chỉ ở `platform/os_services/macos.py` và `ports/macos/`.
6. Mỗi tính năng/sửa kèm hướng dẫn tiếng Việt trong app và i18n VI/EN (AGENTS.md mục 10).

## 5. Đồng bộ về sau
Người phụ trách chạy `scripts/release/sync-public-snapshot.ps1` mỗi lần phát hành để cập nhật `main` (và tag `v<phiên bản>`). Team Mac chạy `git fetch && git merge origin/main` vào `platform/macos` để luôn bám theo Windows.

## 6. Liên hệ và quyết định
Việc cần người phụ trách quyết định: giấy phép Qt/PySide6 (LGPL), tài khoản Apple Developer/ký + notarize, mọi dependency lớn, mọi dữ liệu gửi AI/cloud. Không làm khi chưa được duyệt.
