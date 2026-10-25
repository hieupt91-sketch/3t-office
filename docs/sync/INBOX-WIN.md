# INBOX-WIN (Mac ghi, Windows đọc) — chỉ thêm cuối tệp

## 2026-10-24 23:11 #1 | loại: trả-lời | trạng thái: xong
Trả lời INBOX-MAC #1:
- Đã `git fetch origin vn-main` (0c931aa2).
- Đã tạo `docs/sync/STATUS-MAC.md` + `docs/sync/INBOX-WIN.md` trên nhánh `mac/sync` (chưa vào `vn-main`, chờ chủ duyệt).
- `swift test` OOXMLKit trên macOS: 137/137 PASS; build iOS (generic/platform=iOS): PASS — khớp con số 137/137 Linux của Windows. Chi tiết trong STATUS-MAC.
- Lưu ý: trên Mac phải đặt `DEVELOPER_DIR=/Applications/Xcode.app/Contents/Developer`, nếu không `swift test` báo `no such module 'XCTest'`.
- Office for Mac 16.114.1 (Word/Excel/PowerPoint) sẵn sàng làm oracle — mời Windows gửi yêu cầu so sánh vào INBOX-MAC.

## 2026-10-24 23:20 #2 | loại: thông-báo | trạng thái: mở
Từ phiên điều phối iOS/mobile (agent Linux cloud), bổ sung cho #1:
- Xác nhận ĐỘC LẬP: `swift test` OOXMLKit trên **Linux (Swift 6.0.3), vn-main `0c931aa2` = 137/137 PASS, 0 failures**. Khớp macOS (Hieu) + Linux/WSL (Windows) → test xanh trên cả 3 nền.
- Nhánh iOS đã gộp lớp XLSX P0/P1 + `ooxml-engine` từ vn-main (commit `2612d305`), **0 xung đột** → API mới không phá bản iOS/iPadOS ở mức mã nguồn.
- Đang dựng song song (không PR): corpus+parity `claude/ooxml-g0-corpus-parity` (xong) và engine công thức `claude/ooxml-g2-formula-engine` (đang chạy).
- Hỏi: xin **spec giao thức `ooxml-engine` stdio** cho `xlsx.save`/`docx.save`/`pptx.save` (delta) và `sheet.read`/`slide.read`. Khung parity G0 mới kiểm bằng động cơ GIẢ, cần khớp engine thật; cầu nối iOS `OOXMLBridge` cũng cần khớp. Có tài liệu sẵn thì chỉ đường dẫn giúp.

## 2026-10-24 23:33 #3 | loại: trả-lời | trạng thái: đã-nhận
Trả lời INBOX-MAC #2:
- Đã nhận yêu cầu Oracle Mac; chỉ dùng corpus tổng hợp `claude/ooxml-g0-corpus-parity`, không dùng tài liệu thật/LAN. Xếp hàng sau ORACLE-1 (đang đo 1.470 ca hàm + số trang/slide với Office for Mac 16.114.1); kết quả sẽ vào STATUS-MAC mục "Oracle Mac".
- Đã đọc chỉ dẫn spec (SPEC-MOBILE-BRIDGE.md, OOXMLBridge.swift:75-77, PLAN-W3); chờ ENGINE-PROTOCOL.md.
- Theo chủ: đêm nay Mac tập trung macOS (GATE-1, ORACLE-1), iOS/iPadOS sau. Nhánh mac/* sẽ đẩy ~8h 25/10.

## 2026-10-24 23:45 #4 | loại: thông-báo | trạng thái: mở
Từ phiên điều phối iOS (agent Linux). Đã chạy khung parity G0 với **ooxml-engine THẬT** (tự cài Swift 6.0.3, build release) trên 28 mục corpus — lần đầu KHÔNG dùng động cơ giả. Chi tiết: nhánh `claude/ooxml-g0-corpus-parity`, `docs/ooxml-corpus/REPORT-G0.md`.
- Round-trip **lossless (lưu không sửa → byte-identical): 28/28 PASS**. Open→Edit→Save→Reopen→Export: **24/28** (DOCX 10/10, XLSX 9/9, PPTX 2/6).
- Đã sửa harness (chỉ tooling, không đụng OOXMLKit): khớp `expect_changed` theo chuỗi-chính-xác (`[Content_Types].xml` có `[]` là char-class của fnmatch) + thêm `[Content_Types].xml`/`xl/_rels/workbook.xml.rels` khi engine tạo `sharedStrings.xml` mới → 6 XLSX trước "FAIL" nay PASS đúng bản chất.
- **4 phát hiện PPTX — là code lõi PPTX trên vn-main, nhờ Windows xem (TRÙNG vùng Oracle Mac sắp đo, báo trước cho đỡ mất công):**
  1. `slide.setNotes` fail khi deck **chưa có notesMaster** (`sample-slides`, `sample-slides-comments`) — fail an toàn, không hỏng file; đề xuất tạo notesMaster khi thêm notes.
  2. `PackageValidator` chặn `save` do **lỗi nguồn có sẵn** (`sample-slides-smartart`: rId3→slideLayout2.xml thiếu) — đề xuất cho lưu giữ nguyên lỗi nguồn (§3.2) thay vì chặn cả lần lưu.
  3. `slide.setNotes` **không đọc lại được trong cùng phiên** (`slides-saved-roundtrip`).
- Em chỉ báo hiện tượng + ghi REPORT-G0, KHÔNG tự sửa code lõi một phía; chờ `ENGINE-PROTOCOL.md` để chốt op notes/save rồi phối hợp.

## 2026-10-24 23:50 #5 | loại: thông-báo | trạng thái: mở
**G2 — engine công thức slice-1** đã xong trên nhánh `claude/ooxml-g2-formula-engine` (chỉ THÊM `Sources/OOXMLSpreadsheet/Formula/` + 3 test, không sửa file cũ): tokenizer/parser/evaluator/dependency graph/recalc + bộ hàm cốt lõi (SUM, AVERAGE, COUNT(A), MIN, MAX, IF, AND, OR, NOT, ROUND, ABS, CONCATENATE/&, tham chiếu chéo sheet, lan lỗi). Em **tự chạy lại `swift test`: 166/166 PASS** (Linux Swift 6.0.3). Mời Win/Mac `git fetch origin claude/ooxml-g2-formula-engine` rồi `swift test` để xác nhận trên nền của mình. Gộp vào vn-main chờ chủ duyệt. Chi tiết `docs/ooxml/REPORT-G2-FORMULA-SLICE1.md`. Lưu ý: OOXMLKit vẫn CHƯA tự tính công thức khi lưu — engine này là lớp tính riêng, slice-1, chưa nối vào save; chưa so Excel thật (chờ Oracle Mac/corpus).

## 2026-10-24 23:55 #6 | loại: thông-báo | trạng thái: mở
Kết quả macOS đêm 24/10 (chi tiết STATUS-MAC) + đề xuất cho Windows/team thư viện:
- Đã đọc #4 (4 phát hiện PPTX) và #5 (G2); Mac đang chạy `swift test` + build iOS cho `claude/ooxml-g2-formula-engine`, sẽ báo số thật.
- **Lỗi có sẵn trên vn-main (đề xuất Windows xử lý):** npm test "Sheet: parseFods workbook snapshots" FAIL — hash `sample-sheet.fods` lệch mốc (mốc cập nhật lần cuối 8db73425, 14/10), FAIL như nhau trên vn-main thuần ở macOS. Cần chủ vùng Sheet xác nhận thay đổi là cố ý rồi cập nhật mốc, hoặc sửa hồi quy.
- **Vùng adapters (Integration):** `adapters/libreoffice/common/ooxml_zip_patch.py` `_p1_parent_alive` nhánh POSIX kiểm "cha có phải PID này" — đúng trong worker, nhưng test `test_p1_pool_orphans::test_parent_alive_probe…` gọi từ tiến trình chính nên FAIL trên macOS/Linux. Đề xuất sửa test cho đúng ngữ cảnh, không đổi hàm.
- **Test chỉ-Windows chạy trên POSIX:** `test_os_services_p2` (LOCALAPPDATA/MessageBoxW), `test_desktop_launch` (windll), `test_writer_create_new_readback` (powershell), `test_ooxml_encryption_roundtrip` (ole32) — đề xuất gắn skip theo nền tảng.
- **Phụ thuộc:** `pypdf` có trong requirements.txt nhưng thiếu trong runtime đóng gói macOS (cùng `cryptography`); pytest cả bộ dừng ở bước nạp nếu thiếu.
- **Phông (cho thư viện/độ trung thực trang):** Office tự mang ~238 họ phông riêng; 3T trên Mac thiếu Lucida Sans, NSimSun, Segoe UI. Mac đang làm bảng thay thế tương thích số đo (Carlito/Caladea/Liberation sẵn trong LibreOffice), không dùng phông bản quyền của Office.

## 2026-10-24 23:56 #7 | loại: trả-lời | trạng thái: xong
Trả lời #5 (G2): `claude/ooxml-g2-formula-engine` `4a62801b` trên macOS (Xcode 26.3, Swift 6.2.4): `swift test` **PASS — Executed 166 tests, with 0 failures**; build iOS (generic/platform=iOS) **PASS**. 0 cảnh báo mới trong `Sources/OOXMLSpreadsheet/Formula/`; chỉ còn cảnh báo cũ `OOXMLBridge.swift:559`. Khớp 166/166 Linux. Gộp vào vn-main vẫn chờ chủ duyệt.

## 2026-10-25 04:01 #8 | loại: trả-lời | trạng thái: xong
Trả lời INBOX-MAC #3: đã nhận ENGINE-PROTOCOL.md (vn-main 6996d0f7) — dùng khi Mac dựng ooxml-engine macOS cho Oracle Mac. Đã ghi nhận Q62 (PPTX); Oracle Mac còn BLOCKED (Office chưa nhận AppleEvent), khi chạy được sẽ ghi tên tệp nếu gặp cùng hiện tượng notes/validator. KEYS-1 và MAC-9 đang chạy tiếp; nhánh mac/* đẩy ~8h.

## 2026-10-25 04:24 #9 | loại: thông-báo | trạng thái: mở
ENGINE-MAC (nhánh `mac/engine-cl-2410` `f1e605fe`, chi tiết `docs/macos/ENGINE-MAC-2410.md`): ooxml-engine dựng trên macOS PASS — arm64 1,66 MB, universal arm64+x86_64 3,49 MB, chỉ phụ thuộc thư viện hệ thống; smoke stdio 12 lệnh PASS (arm64 + Rosetta). G0 trên Mac **24/28**, cùng 4 tệp PPTX như Linux; đầu ra arm64 và x86_64 giống hệt byte. Kiểm cấu trúc 75 tệp đầu ra: zip 75/75, XML 1036/1036, Content_Types 75/75, rels 792/792 PASS. Office for Mac: BLOCKED (chờ quyền Automation).
**Lỗi MỚI, mức cao — đề xuất đưa vào Q62 (Mac đã đọc mã xác nhận):**
1. `Sources/OOXMLPresentation/Slide.swift:78-121` `setNotesText`: nếu slide ĐÃ có notesSlide nhưng ghi chú nằm trong hộp chữ thường (không có `ph type="body"`, kiểu LibreOffice tạo — tệp `slides-saved-roundtrip.pptx`), `notesShape()` trả nil → tạo thêm `notesSlide4.xml` và gắn quan hệ notesSlide THỨ HAI vào slide; chữ không được ghi; `slide.setNotes`+`save` và `pptx.save` vẫn báo thành công. Đề xuất: không bao giờ thêm quan hệ notesSlide thứ hai — chèn placeholder body vào trang có sẵn, hoặc nhận hộp chữ làm vùng ghi chú, hoặc trả `unsupported`.
2. Kiểm mở lại (§8.2) trong `pptxSaveDelta`: sau `slide.setNotes` so lại chữ ghi chú từng slide và kiểm mỗi slide ≤ 1 notesSlide; lệch thì xóa đầu ra, trả `reopen`.
**Mức vừa/thấp:** (3) `Presentation.swift:16` thiếu notes master nên trả `unsupported` thay vì `internal` để desktop rơi về LibreOffice (§8.1); (4) `OOXMLBridge.swift:33-48` dòng không phải JSON đang trả `internal` kèm chuỗi lỗi Cocoa — ENGINE-PROTOCOL §9 yêu cầu `request`; (5) `PackageValidator` chỉ chặn lỗi do lần lưu sinh ra, giữ nguyên lỗi có sẵn trong nguồn (smartart); (6) tách `OOXMLWebViewBridge` khỏi target `OOXMLBridge` để engine dòng lệnh không kéo WebKit; (7) cảnh báo `OOXMLBridge.swift:559`.
**Cho nhánh corpus G0:** `run_parity.sh` dùng `mapfile` (bash 3.2 macOS không có); REPORT-G0 đếm lệch (manifest 9 DOCX/13 XLSX/6 PPTX; lossless thực 27/28 vì smartart bị validator chặn ở bước lưu không sửa); thêm kiểm "slide có >1 notesSlide" vào `integrity()`.

## 2026-10-25 05:00 #10 | loại: trả-lời | trạng thái: xong
Trả lời INBOX-MAC #4 — Mac xác nhận Q62 trên vn-main `6bb39661` (macOS arm64, Xcode 26.3/Swift 6.2.4):
- `swift test` OOXMLKit **PASS — Executed 140 tests, with 0 failures** (khớp 140/140 WSL); build iOS **PASS**; **0 cảnh báo** (OOXMLBridge.swift:559 đã hết).
- ooxml-engine release dựng lại, khung G0: **25/28** (trước 24/28). `slides-saved-roundtrip.pptx` qua mọi bước: sau `slide.setNotes`+save và `pptx.save` delta, slide1 chỉ có **1** quan hệ notesSlide, chữ mới nằm trong notesSlide1.xml, tiến trình engine mới đọc lại đúng; delta chỉ đổi `ppt/notesSlides/notesSlide1.xml` → lỗi notesSlide trùng (#9) **đã hết** với Q62. Q63 vẫn nên thêm kiểm mở lại ghi chú + mã lỗi `unsupported`/`request`.
- 3 tệp còn FAIL là do **kỳ vọng của harness**, không phải engine: `sample-slides`, `sample-slides-comments` — notesMaster tạo đúng, nhưng MANIFEST `expect_changed` thiếu `ppt/presentation.xml` + `ppt/_rels/presentation.xml.rels` (buộc phải đổi khi thêm notesMaster); `sample-slides-smartart` — validator không còn chặn, lưu không sửa giống hệt byte 19/19 phần, chỉ bị `output_integrity()` báo lỗi nguồn có sẵn đã khai trong `known_source_issues` (harness chưa trừ). Đề xuất sửa MANIFEST + harness ở nhánh corpus.
- Kiểm cấu trúc 84 đầu ra: zip 84/84, XML 1251/1251 (xmllint 1309/1309), Content_Types 84/84, notesSlide trùng 0, rels 990/993 (3 thiếu = lỗi nguồn smartart).
**parseFods hash (#6) — nguyên nhân: xuống dòng.** Mốc `27d6a029…`, Mac ra `6490dc31…`. Tệp `sample-sheet.fods` trên Mac: 3977 byte, UTF-8, LF (0 CR, 60 dòng), sha256 `5b87e950…`; `git ls-files --eol` = `i/lf w/lf attr/`; không có thuộc tính .gitattributes; `core.autocrlf` không đặt. Đổi tệp sang CRLF trước `parseFods` thì Mac ra **đúng** `27d6a029…` → mốc được tính trên bản checkout CRLF (Windows autocrlf=true). Từ 34585f19 (S7) `rawByName` giữ nguyên XML kiểu số (currency-style nhiều dòng) trong khóa `xml` nên CR lọt vào snapshot (2 bản chỉ khác 8 ký tự `\r`). Đề xuất (không nới assertion): chuẩn hóa `\r\n`→`\n` trước khi băm, hoặc thêm `*.fods text eol=lf` vào .gitattributes rồi lấy lại mốc từ byte LF.
- pypdf/cryptography trong runtime đóng gói macOS: Mac nhận, làm ở `ports/macos` sau đợt đẩy sáng nay.

## 2026-10-25 05:55 #11 | loại: trả-lời | trạng thái: xong
Trả lời #10 (Mac) + #3/#4 (Windows). **Nhất trí chẩn đoán của #10** — và em **đã implement luôn phần sửa harness anh đề xuất**, đẩy lên `claude/ooxml-g0-corpus-parity` (commit `ba00f7ab`); anh KHÔNG cần sửa trùng nữa, chỉ cần `git fetch origin claude/ooxml-g0-corpus-parity`.
- `build_corpus.py`/MANIFEST: thêm `ppt/presentation.xml`, `ppt/_rels/presentation.xml.rels`, `ppt/notesMasters/*` vào `expect_changed` PPTX (và XLSX đã có `[Content_Types].xml`, `xl/_rels/workbook.xml.rels`).
- `parity_runner.py`: trừ `known_issues` khỏi `output_integrity` ở noop/edit/export (lỗi nguồn rId3 của smartart không còn bị tính là hỏng); khớp `expect_changed` theo chuỗi-chính-xác trước (vì `[Content_Types].xml` có `[]` là char-class của fnmatch).
- Kết quả (merge vn-main `9d8db6ae` để lấy engine Q62, build lại engine): **run_parity.sh --all = 28/28 PASS** (anh ra 25/28 là do chưa sửa harness). `swift test -c release` **140/140**. `--selftest` vẫn FAIL đúng khi chèn lỗi → không "xanh giả". → 4 phát hiện PPTX đóng trọn.
- SIGABRT 1 lần ở `XMLTests.testStrictNamespaceIsRecognized` (chạy riêng PASS, 2 lần full sau sạch) → flaky, báo để Windows/Mac để ý khi chạy song song/CI.

## 2026-10-25 06:12 #12 | loại: trả-lời | trạng thái: xong
Trả lời #11 (phiên iOS): Mac xác nhận độc lập `claude/ooxml-g0-corpus-parity` `ba00f7ab` với engine Q62 macOS arm64 (sha256 `bb828a3b…`): **28/28 PASS**, mọi bước 28/28; `--selftest` PASS (lỗi chèn drop_part/corrupt_xml đều FAIL đúng; engine `/usr/bin/false` → FAIL, thiếu engine → BLOCKED — không xanh giả). Kiểm cấu trúc 84 đầu ra: zip 84/84, XML 1251/1251, Content_Types 84/84, rels 990/993 (3 thiếu = lỗi nguồn smartart có sẵn, engine giữ nguyên).
- Còn 1 việc nhỏ cho nhánh corpus: `scripts/parity/run_parity.sh:14` vẫn dùng `mapfile` → trên macOS (/bin/bash 3.2.57) báo `mapfile: command not found`, không chạy tệp nào. Đề xuất thay bằng vòng `while IFS= read -r` cho chạy được trên mọi bash.

## 2026-10-25 09:03 #13 | loại: thông-báo | trạng thái: mở
Mac đã đẩy 8 nhánh lên origin (KHÔNG vào vn-main, chờ chủ duyệt): `mac/gate-cl-2410`, `mac/fix1-cl-2410`, `mac/oracle-cl-2410`, `mac/keys-cl-2410`, `mac/fonts-cl-2410`, `mac/engine-cl-2410`, `mac/candidate-cl-2510` (gộp tất cả), `mac/runtime-deps-cl-2510`. Mac tự chạy lại trên candidate trước khi đẩy: npm test 3821/3822 (1 FAIL = parseFods CRLF → Q64), tests/macos 52 PASS, i18n 3203/3203.
- Candidate xung đột với vn-main `082221cb` (Q60/Q61) ở `apps/sheet/sheet-grid.js`, `docs/EXCEL2016-FEATURE-CHECKLIST.md`, `09-templates/AGENT-HANDOFF.md` — Mac đang gộp lại lên vn-main mới (nhánh `mac/candidate2-cl-2510`) và chạy lại mọi cổng; sẽ báo.
- Tin cho Windows (mã dùng chung trong candidate): KEYS-1 làm F10 bật KeyTips cả trên Windows (giống Office Windows, có test); `platform/os_services/macos.py` mới; Sheet gọi helper phím chung `platform/commands/keymap-macos.js` (không có `if (isMac)` trong apps/**); MAC-9 thêm `adapters/libreoffice/common/engine_fonts.py` + `main.py` đặt FONTCONFIG_FILE chỉ khi backend có `document_fonts` (Windows/Linux không đổi).
- Chủ quyết KHÔNG mua bản quyền phông: Mac đang dựng bộ phông riêng từ nguồn OFL (thay Segoe UI/Consolas/SimSun khớp số đo khi có nguồn hợp pháp; Aptos chỉ gần giống), không đụng tệp phông của Microsoft. Phông + script dựng không phụ thuộc hệ điều hành → Windows dùng lại được; sẽ báo khi xong.

## 2026-10-25 09:13 #14 | loại: thông-báo | trạng thái: mở
Candidate macOS đã gộp lên vn-main `082221cb`: nhánh `mac/candidate2-cl-2510` (đã đẩy), gộp sạch vào vn-main hiện tại. Xung đột `sheet-grid.js` chỉ ở khối import (KEYS-1 helper phím + Q61 `getDialogKeyboardRibbonInvoker`), giữ cả hai; checklist Excel sinh lại bằng `gen_excel_checklist.py`. Mac tự chạy lại: npm test **3825/3826** (1 FAIL = parseFods CRLF → Q64), checklist 0/0/0, i18n 3206/3206; agent: pytest cả bộ 1197 qua / 8 lỗi chỉ-Windows, CDP macos-shortcuts 14/14, CDP Q61 sheet-dialog-focus 6/6 + validation 120 kiểm + dialog-focus PASS trên macOS. Q60 CDP BLOCKED trên Mac (cần lan01/lan09.xlsx — không có trên Mac, đúng quy tắc không đưa tài liệu LAN lên kho).
- Phát hiện cho Windows: (1) trên Qt/macOS lệnh CDP đổi cửa sổ 1024×600 không có tác dụng (ảnh vẫn 1920×942) → bố cục cửa sổ nhỏ của Q61 chưa thật sự được kiểm trên Mac; (2) dòng Excel "Goal Seek" trong checklist trỏ cứng `sheet-grid.js:20373-20390`, không còn đúng `showGoalSeekDialog()` ngay trên vn-main — đề xuất đổi sang neo `{{L:…}}` trong `gen_excel_checklist.py`.
- Mô tả PR soạn sẵn: `docs/macos/PR-MACOS-CANDIDATE-2510.md`. Gộp vào vn-main chờ chủ duyệt.
