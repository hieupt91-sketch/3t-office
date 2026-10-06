# SPEC — Đưa VN Writer (3T Doc) lên 100% rồi tới Sheet, Slides; kết hợp pháp lý liên tục

Lập: 06/10/2026 · Người phụ trách chốt thứ tự: **Doc 100% → Sheet 100% → Slides 100%**, pháp lý chạy xen kẽ liên tục. Nguyên tắc vận hành: agent nào hết việc thì tự nhận ticket kế tiếp trong hàng đợi; Claude làm cùng, không ngồi chờ.

## 1. Định nghĩa "Doc 100%" (nghiệm thu)
Doc đạt 100% khi **cả bốn nhóm** đạt:
| # | Nhóm | Tiêu chí đạt | Cách kiểm |
|---|---|---|---|
| A | Chức năng | 0 mục THIẾU/MỘT PHẦN mức quan trọng 1–2 trong `docs/GAP-DOC-VS-WORD-0610.md`; mọi nút ribbon có tác dụng hoặc có thông báo rõ | ma trận gap + `scripts/audit-0610/` + `tests/unit` |
| B | Trung thực chuyển đổi | Tài liệu mới: lưu DOCX khớp màn hình (căn lề, khoảng cách, phông, bảng, header/footer, ghi chú, theo dõi thay đổi). Tài liệu thật: 24 docx + 20 doc — mở, sửa, lưu, mở lại: số trang = bản Word = bản lưu, 0 mất dữ liệu | `batch_document_audit.py docx` (cần Word COM) + XML |
| C | Kịch bản hành chính | 30 kịch bản (công văn, quyết định, hợp đồng, biên bản, báo cáo có mục lục, bảng biểu, danh sách, chuẩn Nghị định 30/2020/NĐ-CP) chạy tự động, 30/30 PASS | `scripts/audit-0610/doc_admin_30.mjs` |
| D | Chất lượng | Giao diện 100% tiếng Việt, bàn phím dùng được mọi nút, 0 chồng/cắt chữ ở 1366×768 và 1920×1080 tại 100% và 125%, trợ giúp có bài cho mọi lệnh; node/Python/desktop xanh; Undo/Redo phủ mọi lệnh định dạng; mở/lưu tài liệu 200 trang không treo | node, Python, desktop 27, ma trận Undo, đo thời gian |
Ngoài phạm vi 1.0 (ghi trung thực): macro/script, đồng soạn thảo thời gian thực.

## 2. Gói việc Doc (D) — người làm, tệp, tiêu chí XONG
| Gói | Nội dung | Người làm | Tệp chính | XONG khi |
|---|---|---|---|---|
| D1 | Lưu DOCX tài liệu mới mất căn đều/khoảng cách mặc định | Codex (đang chạy) | `adapters/libreoffice/writer/writer-adapter.js` `_contentForExport` | `doc_recheck2.mjs` ALIGN_JUSTIFY, AFTER_6 PASS; đường mở từ DOCX gốc không đổi byte (3 mẫu) |
| D2 | Ma trận gap Doc vs Word + 10 kịch bản đầu | Codex (đang chạy) | `docs/GAP-DOC-VS-WORD-0610.md` | ≥ 150 dòng có bằng chứng; danh sách 25 mục ưu tiên |
| D3 | Đánh bóng giao diện Writer | agy (đang chạy) | `apps/writer/*.css`, `platform/ui-kit` | `docs/UI-WRITER-POLISH-0610.md`; node xanh; ảnh trước/sau |
| D4 | Hộp thoại Đoạn văn: tab "Ngắt dòng và ngắt trang" (giữ cùng trang kế tiếp, giữ dòng liền nhau, ngắt trang trước, kiểm soát dòng mồ côi/góa), mức đề mục (Outline), hộp Tab stops | Claude | `apps/writer/paragraph-dialog.js`, adapter `getParagraphDialogState/applyParagraphDialogValues` | áp dụng đúng + lưu DOCX có `w:keepNext`, `w:keepLines`, `w:pageBreakBefore`, `w:widowControl`, `w:outlineLvl`, `w:tabs`; 1 Áp dụng = 1 Hoàn tác; bài Hướng dẫn |
| D5 | Xác nhận ghi đè bằng hộp thoại tiếng Việt trong app (A5) và luồng Lưu thành | Codex | `main.py` save-as, `platform/ui-kit/dialogs.js` | ghi đè đường dẫn có sẵn luôn hỏi; Esc = hủy; test CDP |
| D6 | 30 kịch bản hành chính tự động | Codex | `scripts/audit-0610/doc_admin_30.mjs` | 30/30 PASS, mỗi kịch bản kiểm XML DOCX + hiển thị |
| D7 | Bộ tài liệu thật 24 docx + 20 doc | Claude chạy cổng; Codex sửa lỗi | `scripts/layout-audit/batch_document_audit.py` | số trang Word = VN = bản lưu; nếu Word COM không chạy: đối chiếu số trang bằng LibreOffice PDF trước/sau và ghi rõ là cổng thay thế |
| D8 | Ma trận Undo/Redo cho mọi lệnh `writer.*` | agy/Codex | `tests/live/cdp/` | mỗi lệnh định dạng: áp dụng → Ctrl+Z trả đúng → Ctrl+Y áp lại |
| D9 | Phím tắt chuẩn Word (đối chiếu `docs/SHORTCUT-COVERAGE.md`) kiểm trên app | Codex | `platform/commands/command-definitions.js` | 100% phím tắt trong danh sách hoạt động, 0 xung đột |
| D10 | Hướng dẫn tiếng Việt cho mọi lệnh Doc | agy | `platform/help/entries-*.js` | `tests/unit/help-coverage.test.js` xanh; bài có bước dùng cụ thể |
| D11 | Tốc độ Doc so với Word/LibreOffice (G3) | Claude | `docs/SPEC-PERF-OPEN.md` | VN ≤ LibreOffice và ≤ 1,5× Word trên d03, d12, d24, legacy .doc |
| D12 | Ổn định: tài liệu 200 trang, gõ liên tục, tự khôi phục sau tắt đột ngột | Codex | `scripts/audit-0610/` | độ trễ gõ < 100 ms ở trang 150; khôi phục nội dung sau kill PID |
| D13 | Mục từ gap D2 (25 mục ưu tiên) — nhận dần khi D2 xong | cả nhóm | theo D2 | từng mục đóng bằng test + hướng dẫn |

## 3. Hàng đợi và quy tắc nhận việc
1. Thứ tự ưu tiên: lỗi mất dữ liệu > lỗi lưu/mở sai → D2/D13 mục quan trọng 1 → kịch bản D6 → UI D3/D10 → còn lại.
2. Agent xong ticket → Claude (hoặc agent) lấy gói kế tiếp chưa có người trong bảng trên; **không để agent rảnh**. Tối đa 2 luồng Codex, 1–2 luồng agy; một nhánh + một worktree cho mỗi ticket.
3. Mỗi ticket theo mẫu: Mục tiêu · Phạm vi (tệp, điều cấm) · Hiện trạng (bằng chứng) · Tiêu chí XONG · Xác minh · Phản hồi tối đa 4 dòng.
4. Claude xác minh độc lập trước khi merge: chạy lại node, Python liên quan, hồi quy desktop, và đọc diff; không tin báo cáo của agent chưa có bằng chứng.
5. Cấm: SendKeys/OS input, kill theo tên tiến trình, Word COM trong test mới (chỉ làm đối chiếu), disable test, đổi expected để xanh.
6. Môi trường: cổng đối chiếu Word/Excel COM đang báo "đang bận"; **việc của chủ sở hữu**: mở Word và Excel bằng tay một lần để xóa hộp thoại đầu tiên. Trong lúc chờ dùng cổng thay thế (XML + LibreOffice PDF).

## 4. Đường pháp lý chạy xen kẽ (L)
| Gói | Nội dung | Người làm | Khi nào |
|---|---|---|---|
| L1 | Nháp EULA, chính sách bảo mật, điều khoản dùng thử (`docs/legal/`) | Claude | ngay, song song |
| L2 | Cập nhật `THIRD-PARTY-NOTICES` (WebView2, thư viện con LibreOffice, Common Voice CC0) + sinh SBOM | Codex | khi rảnh |
| L3 | Dọn bộ cài LibreOffice: bỏ 24 gói từ điển GPL và các gói không dùng, bỏ 2 tệp `.msi` trong thư mục `tools/libreoffice` (≈ 38 MB); kiểm chuyển đổi 3 app bằng bản mới qua `VNOFFICE_SOFFICE_PATH` | Claude | khi máy desktop rảnh |
| L4 | Gói gửi luật sư: nháp văn bản + SBOM + danh sách nhãn hiệu + dữ liệu thu thập (mã máy, báo lỗi) | Claude | sau L1–L3 |
| L5 | Quyết định của chủ sở hữu: nhà cung cấp thanh toán, chính sách đơn miễn phí, sau 30 ngày dùng thử, chứng thư ký số, đăng ký nhãn hiệu | chủ sở hữu | — |

## 5. Sau Doc
- **Sheet 100%:** ma trận gap tương tự; 12 mục UI chưa kiểm; nhận dạng số tiền VND (nhánh `fix/sheet-currency-input-codex` đã tạo, tạm dừng); bộ 28 xlsx + 20 xls; tốc độ lan14.
- **Slides 100%:** kiểm ở mức người dùng thật (nhánh `audit/slides-ui-agy` đã tạo, tạm dừng); mở rộng bộ pptx mẫu; mục backlog Morph đầy đủ, phát trực tuyến, ghi âm.
- Mỗi app kết thúc bằng một báo cáo nghiệm thu theo cùng 4 nhóm A–D.

## 6. Tiến độ (cập nhật 06/10/2026 00:30)
| Gói | Trạng thái | Kết quả đo được |
|---|---|---|
| D1 Lưu DOCX tài liệu mới mất căn đều/khoảng cách | **Xong, đã merge** | `doc_recheck2.mjs` ALIGN_JUSTIFY + AFTER_6 PASS; tài liệu nhập từ DOCX không đổi byte (3 mẫu); số trang LibreOffice tài liệu mới 5→4, 13→11, 32→27 (khớp màn hình) |
| D2 Ma trận gap | **Xong** (`docs/GAP-DOC-VS-WORD-0610.md`) | 4 mục THIẾU thật: Trang bìa, Trang trắng, Văn bản thành bảng, Điều kiện trộn |
| D3 Giao diện Writer | **Xong, đã merge** | hộp thoại Thiết lập trang chuẩn Nghị định 30 + báo cáo UI + 35 ảnh |
| D4a Thẻ "Ngắt dòng và ngắt trang" trong hộp thoại Đoạn văn | **Xong, đã merge** | kiểm tra đầu-cuối 9/9 (keepNext, keepLines, ngắt trang trước, widowControl) |
| D4b Mức đề mục, Tab stops | **Xong, đã merge** | Dừng tab (màn hình đúng 8/15 cm, DOCX w:tabs) + Mức đại cương 1–9 (w:outlineLvl, e2e + hoàn tác), Python 11/11, node 2809/2809 |
| D5 Xác nhận ghi đè | **Đóng, không cần sửa** | pywebview dùng SaveFileDialog gốc của Windows (đã có hỏi ghi đè); lỗi A5 cũ chỉ do gọi API trực tiếp |
| D6 Kịch bản hành chính 1–10 | **Xong, đã merge**; mở rộng 11–30 chờ | 6 PASS, 1 BLOCKED (in hai mặt cần driver), 3 FAIL đã chẩn đoán: ca 5, 6, 9 là **lỗi bài kiểm** (đã chứng minh bằng `doc_legal_list_check.mjs`, `doc_section_check.mjs`), ca 7 là lỗi sản phẩm đã sửa |
| D7 Bộ 24 docx + 20 doc | Đang chạy (Codex, cổng thay thế bằng LibreOffice) | Word COM bị chặn bởi hộp thoại "Word không phải chương trình mặc định" (xem 6.1) |
| D8 Ma trận Undo/Redo | Đang chạy (agy; Grok hết hạn mức) | — |
| D10 Hướng dẫn | Đang chạy (opencode, thử lại sau lỗi 503) | — |
| D12 Ổn định 200 trang | **Xong**, đã merge | 200 trang, RAM 522 MB, tự khôi phục đúng; lưu 7–18 s; **P95 trễ gõ ~270 ms** (mục tiêu < 100 ms) vẫn chưa đạt: chủ yếu do `_recomputeLivePagination()` tính lại cả tài liệu (thử đổi debounce: chưa chứng minh được, đã hoàn tác) |
| D13 Trang trắng | **Xong, đã merge** | 2 ngắt trang, 1 bước hoàn tác, DOCX đúng |
| D13 Văn bản thành bảng | **Xong, đã merge** | hộp thoại chọn dấu phân cách, kiểm tra đầu-cuối 8/8 |
| D13 Trang bìa | **Xong, đã merge** (agy) | 4 mẫu, thay thế/gỡ, đầu-cuối 15/15 |
| D13 Cỡ chữ 13 pt | **Xong** | DOCX `w:sz=26` |
| D13 Lặp hàng tiêu đề bảng | **Xong** | bảng 50 hàng → 1 hàng `w:tblHeader` |
| D13 Điều kiện trộn (mail merge) | Chưa làm | — |
| L1 EULA/Bảo mật/Dùng thử (nháp) | **Xong** | `docs/legal/` |
| L2 Thông báo bên thứ ba | Xong phần thông báo; SBOM tự động chưa làm | `THIRD-PARTY-NOTICES` cập nhật |
| L3 Gọn bộ cài LibreOffice | **Xong** | 1546 → 1048 MB; hồi quy 27 PASS với bản gọn |

### 6.1 Word COM
Word chạy qua COM nhưng mọi `Documents.Open` bị chặn vì hộp thoại "Microsoft Word isn't your default program… select the file types?" (Excel đã ổn định sau khi dọn 108 mục Document Recovery). Đã thử khóa `NoReReg`, UI Automation và MSAA: hộp thoại là cửa sổ tùy biến, phiên không cho chuột; **cần một người bấm "No" (kèm "Don't show this message again") một lần**. Khi đó `scripts/audit-0610/word_pages.ps1` đếm trang Word thật.

### 6.2 Chỉ đạo chủ sở hữu 06/10 sáng
- Tạm dừng Sheet và Slides; toàn bộ nhân lực vào Doc cho đến khi đạt chuẩn mục 1.
- **D14** (agy): ribbon Writer — icon hợp lý, KHÔNG thanh cuộn ở mọi tab (1366×768 và 1920×1080, zoom 100%/125%), sắp xếp nhóm/tab theo thói quen người dùng; nhánh design/writer-ribbon-agy.
- **D15** (kế tiếp): kiểm chứng từng mục MỘT PHẦN trong GAP-DOC-VS-WORD-0610 bằng CDP + XML DOCX (bảng, ảnh, số trang, phần/section, ký hiệu, WordArt, phương trình, tìm/thay thế, danh sách đa cấp…), phím tắt (D9), phông/định dạng, soạn thảo.
- Đang chạy: D6b (Codex, kịch bản 11–30), D9 (Codex, phím tắt), D10 (agy, hướng dẫn), D14 (agy, ribbon).

### 6.3 Cập nhật 06/10 09:30 (tập trung Doc)
| Gói | Kết quả |
|---|---|
| D6b kịch bản hành chính 11–30 | 20/20 PASS (Codex); ca 6 và 9 trong 1–10 là lỗi bài kiểm đã chứng minh trước đó |
| D9 phím tắt | `doc_shortcuts2.mjs`: 27 phím có hiệu lực, 0 sai, 6 phím mở hộp thoại tệp hệ điều hành bỏ qua; đã sửa F7 (bị nuốt trong vùng soạn thảo) |
| D10 hướng dẫn | agy: bổ sung bài hướng dẫn cho lệnh Doc, test xanh |
| D14 ribbon | `doc_ribbon_check.mjs`: 0 thanh cuộn, 0 icon rơi về chấm tròn ở 4 tổ hợp (1366×768/1920×1080 × 100%/125%); đã sửa tab ngữ cảnh Bảng/Hình hiện sai |
| D15a bảng, ảnh | bảng 18 PASS; ảnh `doc_image_check.mjs` 6/6 PASS sau khi sửa lỗi ảnh luu sai kích thước (trước: 1 px) |
| D15b soạn thảo | 13 PASS ban đầu; đã kiểm lại 4 FAIL: Shift+Enter là lỗi bài kiểm (CDP không gửi text), Tìm tiếng Việt chạy đúng, Ctrl+Z từng ký tự là lỗi THẬT (đã sửa: theo cụm chữ) |
| D16 hộp thoại | agy: 23 hộp thoại × 4 tổ hợp: đạt; thêm lệnh `writer.paragraph.tabStops` |
| Cỡ chữ/phông | danh sách 8–72 pt, ô Phông/Cỡ theo con trỏ, 15 định dạng lưu DOCX đúng |
| Mức đại cương, Dừng tab | xong |
| Lỗi i18n lộ khóa | hộp thoại Phương trình, Trang bìa: đã sửa |
| P95 gõ phím | đã bỏ tác vụ dài mỗi phím (đếm từ gộp 350 ms); số đo tổng thể P95 chưa chốt vì các agent chạy song song làm nhiễu |
| Đang chạy | D17 quy tắc trộn thư (Codex), D18 hồi quy corpus + legacy13 (Codex), D19 khung chính UI (agy) |

### 6.4 Kiểm chứng tính năng lưu DOCX (06/10 10:30) — `doc_features_roundtrip/2/3.mjs`
| Nhóm | Kết quả đo |
|---|---|
| Đã đúng sau sửa | chú thích cuối trang/cuối tài liệu (footnotes.xml/endnotes.xml thật), liên kết, dấu trang, mục lục, hình mờ, viền trang, màu nền trang, đánh số dòng, hộp văn bản, chữ nghệ thuật, phương trình (OMML), ký hiệu, cột, tiêu đề/ngắt trang, đầu/chân trang, ngắt mục + đổi hướng giấy, ảnh đúng kích thước |
| Còn thiếu (đã đo, chưa sửa) | chú thích hình/bảng lưu thành chữ thường, chưa phải trường SEQ của Word; tham chiếu chéo chưa là trường REF; chữ cái đầu đoạn (drop cap) chưa có `w:dropCap`; trộn thư: trường MERGEFIELD/IF chưa xuất thành trường Word (trộn trong app vẫn đúng) |
| Giới hạn tài liệu nhập | mở lại tệp do app tạo (có chú thích) rồi sửa/lưu: chú thích bị làm phẳng thành chữ (kho 48 tài liệu thật không có tệp nào có chú thích) |