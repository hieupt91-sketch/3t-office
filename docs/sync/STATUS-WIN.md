# STATUS-WIN (cập nhật: 2026-10-25 15:28, Claude Windows)
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

## 2026-10-25 09:32
- Gộp vào vn-main: Q60 (nhãn tab Sheet dài, tương phản tối; tốc độ mở XLSX BLOCKED: chưa giảm được >=15% ở giai đoạn nào), Q61 (sửa hộp thoại số/focus Writer-Sheet-Slides; JS 3802/3802), Q64 (test không phụ thuộc nền tảng; pytest 1160/3 skipped). LAN XLSX 27/27 (lan03, lan06 FAIL timeout khi máy quá tải, chạy lại riêng PASS).
- Kiểm candidate2 của Mac trên Windows: npm 3826/3826, DOCX 8/8. Chờ chủ duyệt gộp.
- Sự cố môi trường: ổ C: còn ~2,7 GB (WSL ext4.vhdx 9,4 GB trên C:); đã dọn npm-cache và temp; đã tắt 32 tiến trình Excel COM mồ côi. Q63 (lỗi ENGINE-MAC) BLOCKED vì WSL E_FAIL khi C: đầy, sẽ chạy lại.

## 2026-10-25 10:00
- Xác nhận độc lập trên WSL: G1 147/147, G2 slice-2 191/191 (chưa gộp, chờ chủ). WSL đã chuyển sang D:. Xếp/đang chạy: Q63 (lỗi ENGINE-MAC), Q65 (3 việc nhỏ từ Mac), agy CDISK (kiểm kê ổ C:).

## 2026-10-25 10:58
- Gộp vn-main: candidate2 Mac + G1 + G2 (swift test 201; npm 3826; DOCX 8/8), Q65 (npm 3826; pytest nhóm liên quan 11 passed/1 skipped), Q63 (swift test 204/204; pytest engine cũ BLOCKED vì chưa dựng lại engine Windows). Đang chạy: R0912 (dựng/kiểm bản 0.9.12 thử, chưa phát hành). Dọn ổ C: còn 15,8 GB trống; WSL ở D:.

## 2026-10-25 14:26
- Gộp: mac/xcode-warn-cl-2510 (ports/macos). Mac xác nhận Q63+Q65 (pytest 1199/0, swift 204, G0 28/28). Đang chạy: Q66 (số kiểu Việt/cảnh báo hàm/huy hiệu; đã commit mục huy hiệu), R0912 (bản 0.9.12 thử). Mạng chập chờn lúc 14:17–14:25 làm Codex reconnect.

## 2026-10-25 14:54
- Phân bổ vòng 14:53: Mac không có yêu cầu mới (chặn: quyền Automation cho Office, chứng chỉ Developer ID — chờ chủ). Windows giao agy viết hook _batch_pptx.py (kiểm mở-sửa-lưu PPTX bằng PowerPoint COM). Đang chạy: Q66, R0912, AGY-PPTX.

## 2026-10-25 15:28
- Gộp vn-main: hook scripts/layout-audit/_batch_pptx.py (agy; pytest 7/7; Windows tự chạy lại sample-3.pptx: PowerPoint=10 saved=10 PASS, không còn PowerPoint treo). Hạn chế đã đóng: bộ kiểm PPTX hàng loạt. Mac có thể dùng hook này với Office for Mac sau khi cấp Automation (chưa).
