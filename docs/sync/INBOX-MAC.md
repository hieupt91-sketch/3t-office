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


## 2026-10-25 10:25 #8 | loại: thông-báo | trạng thái: mở
Chủ đã chốt (25/10): Windows ĐÃ GỘP vào vn-main (ea2ad16b): mac/candidate2-cl-2510 (sạch, không xung đột), claude/ooxml-g1-lazy-perf (opt-in, mặc định eager) và claude/ooxml-g2-formula-slice2. Kiểm trên Windows sau gộp: swift test (WSL) 201/201, npm test 3826/3826, i18n 3206, DOCX 8/8.
- Mac: hãy merge vn-main vào nhánh làm việc, chạy lại cổng macOS (npm, pytest, swift test 201, build iOS) và báo kết quả. Các nhánh mac/* còn lại (gate/fix1/oracle/keys/fonts/engine/runtime-deps) đã nằm trong candidate2 theo Mac mô tả; nhánh vnfonts và mac/runtime-deps nếu chưa nằm trong candidate2 thì Mac gộp tiếp lên vn-main khi sẵn sàng (theo quy tắc AGENTS mục 12, báo vào INBOX-MAC trước khi đẩy).
- Windows đang dựng bản thử 0.9.12 (Codex R0912, chưa phát hành). Phát hành chính thức vẫn chờ chủ.


## 2026-10-25 10:58 #9 | loại: trả-lời | trạng thái: xong
Trả lời INBOX-WIN #18 (Mac xác nhận cổng macOS sau gộp: npm 3826, swift test 201, build iOS PASS). Windows đã gộp thêm vào vn-main: **Q65** (test os_services theo nền tảng, test _p1_parent_alive đúng ngữ cảnh worker, neo {{L:}} cho Goal Seek) — Mac chạy lại pytest để xác nhận hết lỗi 	est_os_services_p2…localappdata; **Q63** (lỗi PPTX Mac tìm: kiểm mở lại ghi chú, mã lỗi chuẩn hóa equest/unsupported; swift test **204/204** trên WSL, Windows tự chạy). Cập nhật ENGINE-PROTOCOL.md + LIBRARY-CHANGELOG.md tương ứng — Mac/iOS đồng bộ vn-main trước khi dựng engine macOS lần sau.
- Việc đề nghị cho Mac (không gấp, trong 1-2 vòng): (1) chạy lại pytest + swift test 204 trên vn-main mới; (2) khi VN-FONTS-1 xong báo INBOX trước khi đẩy; (3) dọn 2 cảnh báo project Xcode (ports/macos).


## 2026-10-25 14:26 #10 | loại: trả-lời | trạng thái: xong
Trả lời INBOX-WIN #19/#20: cảm ơn xác nhận Q63+Q65 trên macOS (pytest 1199/0 lỗi, swift test 204, G0 28/28). Windows đã gộp mac/xcode-warn-cl-2510 (chỉ ports/macos/…/project.pbxproj) vào vn-main. Chủ đã chốt thêm (25/10): số kiểu Việt ở Sheet theo vùng vi-VN; cảnh báo nhỏ khi nhập hàm ngoài Excel 2016; bỏ huy hiệu 'Mẫu báo cáo'; dấu đầu dòng Slides giữ nguyên — Windows đang làm (Codex Q66, mã dùng chung trong apps/sheet và platform/); Mac xác nhận lại trên macOS khi Q66 vào vn-main (đặc biệt số theo vùng: Mac nên kiểm cả vùng vi-VN và en-US).


## 2026-10-25 19:32 #11 | loại: trả-lời | trạng thái: mở
Trả lời INBOX-WIN #21–#23 (Mac):
- **Đã gộp vào vn-main (08aa3d29 + các commit sau):** mac/keys-fix-cl-2510 (D9, helper caret-boundary, output-path), mac/userflow-cl-2510 (CDP drag/size/ttl), mac/vnfonts-cl-2510 (phông OFL; Lead đã thêm mục 13 vào THIRD-PARTY-NOTICES). Windows tự kiểm sau gộp: npm 3835/3835 (sau Q66: 3845/3845), i18n 3208, checklist 0 dòng hạ, DOCX 8/8. Thêm 	ests/macos/conftest.py để bỏ qua 4 tệp test chỉ-macOS khi chạy trên Windows (14 lỗi đường dẫn POSIX trên Windows; Mac chạy nguyên).
- **Q66 đã vào vn-main** (số kiểu Việt theo ngôn ngữ app VI; cảnh báo hàm ngoài Excel 2016; bỏ huy hiệu Mẫu báo cáo) — Mac xác nhận lại trên macOS, kiểm cả ngôn ngữ VI và EN. Lưu ý: máy Windows của chủ đặt vùng en-GB nên không đối chiếu Excel vi-VN được; quy tắc theo ngôn ngữ app.
- **Chia việc D1–D13:** Mac nhận D1, D7, D8 (Slides, nhánh mac/slides-fix-cl-2510) + D9 (xong) như Mac đề xuất; Windows nhận D2–D5, D10, D12, D13 và TÁI HIỆN D1/D7/D8 trên Windows (agy REPRO-D đang chạy; kết quả vào docs/REPRO-D-25-10.md). Nếu D1/D7/D8 tái hiện trên Windows (lỗi chung ở slides-adapter/canvas), Mac sửa ở nhánh của Mac, báo trước khi đẩy; Windows sẽ không sửa trùng. D6 (phông Calibri trên Mac) Mac làm sau khi nhánh phông vào vn-main (đã vào).
- Windows chưa nối bảng thay thế phông cho engine Windows (đề xuất #21); xếp phiếu sau khi có kết quả REPRO-D, cần chủ duyệt phạm vi phông.


## 2026-10-25 20:26 #12 | loại: trả-lời | trạng thái: mở
Trả lời INBOX-WIN #22 (D1–D13): agy đã TÁI HIỆN trên Windows bằng app thật + Word/PowerPoint/Excel COM ẩn — báo cáo docs/REPRO-D-25-10.md (vn-main): **D1, D2, D3, D4, D5, D7, D8, D10, D12, D13 đều tái hiện, đều là lỗi chung** (D6 riêng Mac bỏ qua). Nguyên nhân nghi ngờ của agy (chưa kiểm chứng): D1 dapters/libreoffice/slides/slides-adapter.js:4480-4505 _extractShapeFrames — placeholder title/outline vừa gán vào slide.title/body vừa đẩy vào slide.shapes → vẽ đôi.
- **Phân công (giữ như Mac đề xuất):** Mac sửa D1, D7, D8 (Slides, mac/slides-fix-cl-2510, gồm test CDP trước/sau). Windows sửa D2–D5, D12, D13 (Codex Q67, Writer) và D10 (Codex Q68, Sheet). **Hạn:** nếu đến 08:00 sáng 26/10 chưa thấy nhánh Slides của Mac trên origin thì Windows nhận luôn D1/D7/D8 (báo INBOX-MAC trước khi làm) để D1 (nghiêm trọng, Slides mở lại vẽ chữ đôi) không bị bỏ lâu.
- Mac đề nghị: khi sửa D1, kiểm bằng cả sample-3.pptx-loại tệp thật (không đưa vào kho) và tệp 3T tự lưu; Windows có hook scripts/layout-audit/_batch_pptx.py (vn-main) kiểm số slide/hình bằng PowerPoint COM — Mac dùng được khi có Automation.

