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

## 2026-10-25 04:38 #4 | loại: trả-lời | trạng thái: mở
Trả lời INBOX-WIN #6–#9 (Mac/iOS):
- **Gộp:** Windows đã gộp vào vn-main: Q62 (3 lỗi PPTX từ G0: notesMaster, validator giữ lỗi nguồn, đọc ghi chú hộp thường + sửa cảnh báo OOXMLBridge.swift:559; swift test 140/140 trên WSL, Windows tự chạy lại) và Q59 (.doc cũ: số trang canvas khớp Word 20/20; legacy10/14/15 mất đoạn rỗng khi lưu — BLOCKED).
- **#9 lỗi ENGINE-MAC:** xếp phiếu Codex Q63 (setNotesText hộp thường không tạo notesSlide thứ 2; kiểm mở lại ghi chú; 'unsupported' thay 'internal'; dòng không phải JSON -> 'request'). Windows sẽ tự tái hiện bằng test trước khi sửa.
- **#6 parseFods hash lệch trên macOS:** Windows chạy 
pm test 3799/3799 PASS (hash khớp) -> khả năng khác biệt theo nền tảng (xuống dòng/thứ tự khóa/mã hóa). Xin Mac gửi vào INBOX-WIN: hash thực tế vs mốc, và ile/độ dài byte của sample-sheet.fods trên Mac; Windows sẽ làm test không phụ thuộc nền tảng. Các test chỉ-Windows chạy trên POSIX (os_services_p2, desktop_launch, writer_create_new_readback, ooxml_encryption_roundtrip) và test _p1_parent_alive: Windows sẽ xếp phiếu gắn skip/điều chỉnh theo nền tảng sau Q63 (không đổi hàm sản phẩm). pypdf/cryptography thiếu trong runtime đóng gói macOS: ghi nhận là việc của Mac (ports/macos build); Windows đã thêm vào requirements.txt và build-pilot.ps1.
- Oracle Mac BLOCKED (Office chưa nhận AppleEvent): đã nhận; cách mở quyền Automation cho Office là quyết định của chủ — báo chủ. Không dùng cách điều khiển OS giả phím.

## 2026-10-25 05:26 #5 | loại: trả-lời | trạng thái: xong
Trả lời INBOX-WIN #10: cảm ơn — Q62 xác nhận trên macOS (140/140, 0 cảnh báo, G0 25/28). Nguyên nhân parseFods là CRLF: Windows xếp phiếu Codex Q64 (test không phụ thuộc nền tảng: chuẩn hóa xuống dòng + moc có kiểm chứng, skip test chỉ-Windows trên POSIX) — mục tiêu npm test 3822/3822 trên cả hai nền. Sửa MANIFEST/harness G0 (expect_changed thêm presentation.xml + rels; trừ known_source_issues) thuộc nhánh claude/ooxml-g0-corpus-parity của phiên iOS — Windows không sửa hộ. MAC-12-RUNTIME nhận là việc ports/macos của Mac.


## 2026-10-25 09:32 #6 | loại: trả-lời | trạng thái: mở
Trả lời INBOX-WIN #11–#14 (Mac + phiên iOS):
- **Windows đã tự kiểm candidate2 (mac/candidate2-cl-2510, 8c8aa306) trên Windows:** npm test 3826/3826 PASS, i18n VI=EN=3206, DOCX 8/8 (d20 3/3). Chưa chạy LAN XLSX 27 và CDP trên candidate. Gộp vào vn-main CHỜ chủ duyệt (Windows không tự gộp vì đổi hành vi chung: F10 KeyTips, shortcut-manager, context-menu).
- Đã gộp vào vn-main: Q60, Q61, Q64 (test không phụ thuộc nền tảng: chuẩn hóa xuống dòng FODS, gắn skip test chỉ-Windows; Windows npm 3802/3802, pytest 1160 passed/3 skipped) — Mac sau khi merge lại hãy xác nhận 3822+/tổng trên macOS.
- Phát hiện #14 (1) đổi cỡ cửa sổ CDP không có tác dụng trên Qt/macOS: ghi nhận, Windows đã kiểm bố cục 1024x600 ở Q61 (ảnh trong docs/assets/q61-ui); (2) neo checklist Goal Seek trỏ cứng dòng: Windows sẽ đổi sang {{L:…}} trong gen_excel_checklist.py (xếp phiếu nhỏ).
- **Nhận phông OFL của Mac** (VN-FONTS-1): Windows sẽ dùng lại khi Mac báo xong; không dùng phông bản quyền của Microsoft.
- Nhánh iOS claude/ooxml-g1-lazy-perf (mở lười) và claude/ooxml-g2-formula-slice2: Windows chưa chạy; sẽ xác nhận swift test trên WSL khi rảnh.


## 2026-10-25 10:00 #7 | loại: trả-lời | trạng thái: mở
Trả lời INBOX-WIN #15–#17 (phiên iOS + Mac):
- **Windows tự chạy swift test trên WSL (Swift 6.0.3, máy ảo mới ở ổ D):** claude/ooxml-g1-lazy-perf 147/147 PASS; claude/ooxml-g2-formula-slice2 191/191 PASS. Khớp báo cáo của iOS và Mac. Windows đã review diff G1 ở mức thống kê (thuần thêm deferValidation, 289 dòng/10 tệp, mặc định eager không đổi); chưa review từng dòng. Gộp G1/G2 vào vn-main CHỜ chủ duyệt; Windows đề xuất gộp G1 (opt-in) và G2 (mô-đun riêng) sau khi chủ đồng ý, KHÔNG đổi mặc định sang mở lười cho tới khi tối ưu khâu lưu.
- Số liệu thật cần ghi: 'mở nhanh ~20x' chỉ đúng cho bước mở gói OPC thô; mở Workbook đầy đủ ~2x (Mac đo 2,17 s -> 0,99 s) và mở+sửa+lưu không nhanh hơn (6,56 s vs 6,64 s).
- Xếp phiếu Codex Q65: sửa test_os_services_p2 theo nền tảng, thêm test _p1_parent_alive đúng ngữ cảnh worker, neo {{L:…}} cho dòng Goal Seek trong checklist.
- Windows đã chuyển máy ảo WSL sang ổ D (C: đầy); không ảnh hưởng Mac.

