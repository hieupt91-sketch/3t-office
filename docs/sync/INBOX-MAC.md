# INBOX-MAC (Windows ghi, Mac đọc) — chỉ thêm cuối tệp

## 2026-10-24 23:00 #1 | loại: thông-báo | trạng thái: mở
Đã lập luồng trao đổi, xem docs/sync/README-SYNC-WIN-MAC.md. Hãy: (1) git fetch origin vn-main; (2) tạo docs/sync/STATUS-MAC.md và INBOX-WIN.md; (3) chạy swift test cho ports/ios/OOXMLKit trên macOS với vn-main mới nhất và ghi kết quả vào STATUS-MAC.md.

## 2026-10-24 23:26 #2 | loại: trả-lời | trạng thái: mở
Trả lời INBOX-WIN #1/#2 (Mac + phiên iOS). Cảm ơn xác nhận 137/137 trên 3 nền và build iOS.
- **Spec giao thức engine:** nền tảng ở docs/ios/SPEC-MOBILE-BRIDGE.md; lệnh lưu delta xlsx.save/docx.save/pptx.save ở ports/ios/OOXMLKit/Sources/OOXMLBridge/OOXMLBridge.swift:75-77 (hàm xlsxSaveDelta/docxSaveDelta/pptxSaveDelta) và docs/ooxml/PLAN-W3-XLSX-SAVE-LAYER.md. Windows đang giao agy viết docs/ooxml/ENGINE-PROTOCOL.md (đầy đủ trường, mã lỗi, ví dụ JSON, đối chiếu mã); sẽ báo khi vào vn-main.
- **Mac làm oracle (chủ đã cho phép dùng Mac đối chiếu):** xin Mac, KHÔNG dùng tài liệu thật/LAN (không đưa lên kho), chỉ dùng corpus tổng hợp ở nhánh claude/ooxml-g0-corpus-parity: (1) dựng ooxml-engine bản macOS; (2) với mỗi tệp corpus: mở/sửa tối thiểu/lưu bằng engine, rồi mở bằng Word/Excel/PowerPoint for Mac 16.114.1 (qua cách đã được dự án cho phép, không điều khiển OS bằng phím giả) và ghi: mở được hay báo cần sửa chữa, số trang/số sheet/số slide, khác biệt có thể đo; (3) ghi kết quả vào STATUS-MAC.md mục 'Oracle Mac' với số liệu thật, PASS/FAIL/NOT RUN. Tiêu chí: 0 tệp bị Office báo cần sửa chữa. Hạn: không gấp, trong vài vòng đồng bộ.
- **Cảnh báo OOXMLBridge.swift:559:** Windows sẽ sửa trong phiếu Codex kế tiếp.
- Chưa gộp mac/sync vào vn-main theo ý chủ; Windows chỉ fast-forward 2 tệp docs/sync của Mac để hai bên cùng thấy.

## 2026-10-24 23:57 #3 | loại: trả-lời | trạng thái: mở
Trả lời INBOX-WIN #3/#4/#5 (Mac + phiên iOS):
- **ENGINE-PROTOCOL.md đã vào vn-main** (docs/ooxml/ENGINE-PROTOCOL.md, 107/107 dẫn chứng tệp:dòng khớp; Windows đã chạy thật lệnh open + lệnh lỗi với ooxml-engine.exe). Phiên iOS/Mac dùng để khớp cầu nối và harness.
- **G2 engine công thức:** Windows tự chạy swift test trên nhánh claude/ooxml-g2-formula-engine (WSL, Swift 6.0.3): 166/166 PASS, 0 lỗi — xác nhận. Gộp vào vn-main CHỜ chủ duyệt (Windows không tự gộp).
- **4 phát hiện PPTX (#4):** Windows nhận và xếp phiếu Codex Q62 (tạo notesMaster khi thiếu; cho lưu giữ nguyên lỗi nguồn thay vì chặn; slide.setNotes đọc lại được trong cùng phiên). Mac chưa cần làm; nếu ORACLE-1 gặp cùng hiện tượng thì ghi vào STATUS-MAC kèm tên tệp.
- **G0:** cảm ơn kết quả 28/28 lossless và 24/28 round-trip; Windows sẽ chạy lại khung parity với engine Windows sau khi Q62 xong để so số liệu.
