# STATUS-WIN (cập nhật: 2026-10-25 05:26, Claude Windows)
## Đã vào `vn-main` (mới nhất `e293fe6a`)
- Writer: sửa lệch +1 trang `.doc` (thẻ ngắt từ ẩn), d20.docx lưu đúng 3 trang (giữ tab/br khi sửa khoảng trắng nhập), TOC, hộp văn bản, in theo ngữ cảnh.
- Sheet: biểu đồ kết hợp/tròn, tiền tố `_xlfn.`, lọc PivotTable, lưu tệp lớn có giới hạn.
- Slides: hoạt hình, chuyển trang, đường nối, Section, phông nhúng, handout.
- Theme tùy biến (nút bảng màu trên thanh tiêu đề).
- Kiểm thử: `npm test` 3798/3798; i18n VI=EN=3200; DOCX 8/8; LAN XLSX 27/27 (không gồm lan14).
## Thư viện OOXMLKit (Swift) — thay dần LibreOffice trên Windows
- API XLSX P0/P1 (+15 lỗi rà soát, 13 đã sửa), lệnh lưu theo delta `xlsx.save` / `docx.save` / `pptx.save` trong `ooxml-engine` (stdio JSON). `swift test` 137/137 trên Linux/WSL.
- Swift for Windows 6.4.1 dựng được `ooxml-engine.exe` (3,9 MB; cần ~18 DLL runtime). Client Python + chế độ bóng `VNO_OOXML_ENGINE=shadow` (mặc định tắt).
- Benchmark: `docs/ooxml/BENCH-OLD-VS-NEW-24-10.md`; kế hoạch: `docs/PLAN-OOXMLKIT-WINDOWS.md`, `docs/ooxml/PLAN-W3-XLSX-SAVE-LAYER.md`.
## Đang chạy
- Q59 (20 tệp `.doc` cũ mất nội dung/lệch trang), Q60 (tốc độ mở XLSX lớn), Q61 xếp hàng (sửa lỗi hộp thoại từ rà soát UI-SWEEP-5).
## BLOCKED / chờ chủ
- Phát hành 0.9.12 chưa duyệt; so sánh Office web chờ phiên Edge đăng nhập.
## Cần Mac giúp (đề xuất)
- Chạy `swift test` OOXMLKit trên macOS với `vn-main` mới nhất và báo kết quả; xác nhận API mới không phá bản iOS/iPadOS.
## Đồng bộ với Mac (2026-10-24 23:26)
- Mac đã nhận luồng (nhánh mac/sync, tệp STATUS-MAC.md / INBOX-WIN.md). swift test 137/137 trên macOS, Linux (cloud) và Linux/WSL; build iOS PASS. Office for Mac 16.114.1 sẵn sàng làm oracle (đã gửi yêu cầu #2).
- Windows ĐANG: Q59 (.doc cũ), Q60 (tốc độ mở XLSX), Q61 (sửa lỗi hộp thoại, xếp hàng), agy viết ENGINE-PROTOCOL.md.

## 2026-10-24 23:57
- Gộp vào vn-main: docs/ooxml/ENGINE-PROTOCOL.md (agy, 107/107 dẫn chứng khớp); xác nhận độc lập G2 166/166 PASS (nhánh claude/ooxml-g2-formula-engine, chưa gộp, chờ chủ).
- Xếp hàng: Codex Q62 (3 lỗi PPTX từ G0). Đang chạy: Q59, Q60; Q61 xếp hàng.

## 2026-10-25 04:38
- Gộp vào vn-main: Q59 (.doc cũ, trang canvas khớp Word 20/20; legacy10/14/15 BLOCKED mất đoạn rỗng khi lưu), Q62 (3 lỗi PPTX + cảnh báo Bridge; swift test 140/140). Npm 3799/3799, DOCX 8/8.
- Đang chạy: Q60 (tốc độ mở XLSX, chạy lại), Q61 (sửa lỗi hộp thoại UI-SWEEP-5). Xếp hàng: Q63 (lỗi ENGINE-MAC #9).
- BLOCKED: Oracle Mac (Office chưa nhận AppleEvent) — chờ chủ quyết cách mở quyền.

## 2026-10-25 05:26
- Mac xác nhận Q62 trên macOS (140/140; G0 25/28); nguyên nhân hash parseFods = CRLF. Xếp hàng Q64 (test không phụ thuộc nền tảng). Q60/Q61 đã có commit (Sheet tab dài, tối nền ô; UI recheck), chưa DONE; Q63 xếp hàng.
