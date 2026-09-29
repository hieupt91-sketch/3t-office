# Hàng đợi việc theo ma trận (cập nhật 2026-09-28)

## Trạng thái 28/9 21:45 (main sau merge Codex save-followups)

Test trên `main`: node **1863/1863 PASS**, python OK (Claude tự chạy sau merge).

**Đã gộp tối 28/9:** hàm VND() đọc số tiền thành chữ + giữ chữ khi lưu (Claude, `8626b3c`, `dd3afd2`); mở .doc qua DOCX trung gian (Codex, `37fb7f2`, canvas 8/8); lưu .doc qua DOCX hậu xử lý + d09 4 hình về đúng trang (Codex, merge sau `dd3afd2`: 8/8 .doc lưu = Word, d06 60/60 / d09 30/30 / d24 14/14 hình đúng trang Word). Công cụ nghiệm thu mới: `_batch_xls_roundtrip.py`, `_word_shape_pages.ps1`, `_writer_shape_counts.py`.

**Đang chạy:** Codex `E:\VNOffice-codex-writer-legacy-doc2` — legacy14/17/18.doc lệch trang (đợt 2). agy hết hạn mức tới ~23:45 — việc chờ: thanh cảnh báo vàng kiểu Excel cho tệp có liên kết ngoài (hiện chỉ báo trên thanh trạng thái).

**Cập nhật 29/9 ~10:30 (main `4934f8e`):** merge khôi phục đường kẻ khi lưu .doc (agy, legacy06/17/18 — cùng vị trí/kích thước, chỉ đổi tên); công cụ so sánh .xls bằng LibreOffice (opencode) + Claude sửa lỗi đếm cột của nó (báo động giả "lệch B2/C2" — opencode dựng chẩn đoán sai trên số liệu sai); sửa tên sheet có dấu phẩy trong công thức bị đổi dấu phân cách khi lưu (legacy09 5 ô `#VALUE!` → 0). 20 .xls: 17 lệch 0, còn legacy06 (`#REF!`, giới hạn LibreOffice), legacy13/18 (ô VND). Phase 2 tăng tốc mở Sheet (Codex, nguyên mẫu): lan14 bridge 56 s → 1 s, dựng model 95 s → 21 s, nhưng +44 s bộ chuyển Python → cần gộp vào luồng Python (kế hoạch sau phase 1). Đang chạy: Codex hoàn thiện phase 1 (`E:\VNOffice-codex-sheet-open-phase1`); agy giữ bao chữ Square khi lưu .doc (`E:\VNOffice-agy-doc-wrap`). Máy 16 GB: tối đa 2 agent nặng cùng lúc; agent để lại tiến trình EXCEL/WINWORD ẩn — dọn định kỳ những cái > 30 phút.

**Quyết định người phụ trách 29/9 ~07:40:** DUYỆT kế hoạch tăng tốc mở tệp Sheet (`docs/PLAN-SHEET-OPEN-PERF.md`). Bắt đầu phase 1 (nguyên mẫu gộp `optimize_fods_streaming` + `reoverlay_sheet_xf_indices`, đo + so đầu ra giống hệt) — Claude thực hiện (Codex/Grok không dùng được, agy đang làm .doc lines).

**Cập nhật 29/9 07:30:** merge `fix/writer-doc-export-legacy20-agy` — nguyên nhân legacy20 hỏng: `mc:AlternateContent` + `wps:txbx` làm bộ lọc `MS Word 97` sinh .doc lỗi; làm phẳng + đổi khung chữ sang VML trước khi xuất, bật lại xuất .doc qua DOCX. Claude đo Word 20 .doc: mở được 20/20; bản lưu lệch trang **2/20** (trước 4/20): legacy13 **1→2 (kém đi so với đường trực tiếp — LibreOffice đổi bao chữ Square→TopAndBottom)**, legacy18 3→2. Hình: đường kẻ (Line) ở legacy06/17/18 MẤT khi lưu .doc trên CẢ HAI đường (lỗi sẵn có, chưa sửa); legacy13/20 hình bị đổi tên. Việc mở: giữ Square khi xuất .doc; giữ Line khi lưu .doc; legacy18 lưu thiếu 1 trang.

**Cập nhật 29/9 05:15 (main `97cc8f8`, node 1907/1907):** merge keepNext (Codex, Claude chọn lọc không gồm shim wrapNone): canvas .doc = Word **20/20**, 23/23 docx ổn định 2 lượt. Còn lại .doc bản LƯU lệch 4/20: legacy06 (3→4), legacy14 (15→18), legacy17 (3→2), legacy18 (3→2) — đường xuất .doc qua DOCX đang tắt vì legacy20 hỏng; cần tìm nguyên nhân legacy20 để bật lại. Nhánh `fix/writer-legacy-doc2-codex` coi như đã chắt lọc xong (keepNext đã merge; phần còn lại là code dở chưa kiểm chứng của Codex về legacy20).

**Cập nhật 29/9 04:40:** merge `fix/sheet-xls-ref-errors-agy` — app ghi công thức tham chiếu hỏng dạng ODF `[#REF!]` (trước: `#REF!` trần). Lưu .xlsx giữ `#REF!` đúng. **Giới hạn LibreOffice (không sửa được từ VN):** xuất .xls từ FODS biến công thức `#REF!` thành `=#N/A` — chính LibreOffice `.xls → FODS → .xls` cũng vậy, chỉ `.xls → .xls` trực tiếp mới giữ; legacy06.xls vẫn lệch 10 ô (9 công thức vốn đã hỏng + 1 ô chuỗi rỗng có tiền tố `'` mất ngay lúc LibreOffice nhập). Ghi nhận, không làm tiếp trừ khi đổi kiến trúc lưu .xls.

**Cập nhật 29/9 03:50 (main `4d9b85f`, node 1899/1899 PASS):** merge tăng tốc TÍNH LẠI công thức (agy + Claude sửa cache tên định nghĩa theo sheet): lan06 sửa 1 ô / tính lại **152 s → 0,23 s** (Claude đo độc lập bằng parseFods + FormulaEngine thật), 0 ô lệch khi so từng ô main vs nhánh (lan06 2905, lan28 739), 26/26 LAN TỔNG 0. (Tăng tốc MỞ tệp vẫn chờ duyệt.) Đang chạy: agy — legacy06.xls `#REF!`→`#N/A` khi lưu.

**Cập nhật 29/9 01:50 (main `4d84fc4`, node 1887/1887 PASS):** ĐÃ XỬ LÝ hồi quy legacy20 — Codex hết hạn mức (tới **28/10 17:23**) trước khi tìm ra nguyên nhân; Claude tắt đường xuất .doc qua DOCX (`WRITER_DOC_EXPORT_VIA_DOCX = False` trong `main.py`, giữ code để bật lại) → Word mở được **20/20** bản lưu .doc; lệch trang còn legacy06 (3→4), legacy14 (15→18), legacy17 (3→2), legacy18 (canvas 2, lưu 2; Word 3). Nhánh `fix/writer-legacy-doc2-codex` (keepNext + tìm nguyên nhân legacy20) CHƯA merge — có code dở chưa commit của Codex. Đã merge thêm: thanh cảnh báo liên kết ngoài dùng chung `platform/ui-kit/notification-bar.js` (agy); Help phủ 100% lệnh ribbon Writer 131 + Sheet 152 + test chặn lệnh mới thiếu Help (agy). Đang chạy: agy tăng tốc tính lại VLOOKUP (`E:\VNOffice-agy-vlookup-perf`). Tác nhân còn dùng được: agy + Claude (Grok hết số dư, Codex hết hạn mức).

**HỒI QUY (Claude 29/9 00:25, chia đôi commit):** bản sửa `fix/writer-save-followups-codex` (lưu .doc qua DOCX hậu xử lý, đã merge) làm bản lưu `legacy20.doc` KHÔNG mở được bằng Word (hộp thoại lỗi, kể cả đổi tên); trên `dd3afd2` (trước merge) bản lưu mở tốt 1 trang. Đã giao Codex vòng 3 (`fix/writer-legacy-doc2-codex`, W-legacydoc2c) sửa ưu tiên số 1 + đo Word mở được 20/20 .doc. Nếu không sửa được: revert merge save-followups khỏi main (file hỏng tệ hơn lệch trang). Cũng đã bác shim đổi `wrapSquare`→`wrapNone` của Codex vòng 1 (Word đo: chữ đè ảnh) — Codex đã gỡ; bộ lọc DOC của LibreOffice vẫn đổi Square→TopAndBottom khi lưu .doc (legacy13 lệch 1 trang, ghi nhận).

**Còn mở:** legacy06.xls `#REF!` → `#N/A` (10 ô, nhỏ); bộ so sánh .xls không dùng Excel cho 5/20 file Excel 95 bị File Block; Sheet tăng tốc mở file lớn — **CHỜ người phụ trách duyệt bước 1** (`docs/PLAN-SHEET-OPEN-PERF.md`).

## Trạng thái 28/9 16:30 (main `fea2816`)

Test trên `main`: `node tests/run-tests.js` **1839/1839 PASS**, `python -m unittest discover -s tests` 359 OK (Claude tự chạy).

**Đã gộp 28/9:**
- **Grok Sheet S29 regression** (`5c0fdf1`): 26/26 file LAN tổng lệch 0 sau S29 vòng 1–5 (Claude đọc lại từng `_audit_lanNN.txt` + bản lưu thật); lan06 Python 125s, lan14 110s. Việc treo "batch lại sau S29" đã đóng.
- **Writer shape import/save** (`fea2816`, Codex R2–R3 + Grok R4 + d09 GIF): canvas d06 hiện 37 Rectangle + 54 Connector; giữ ảnh Picture 4 khi lưu (trước mất trên cả main); vòng 2 từng NHÂN ĐÔI shape khi lưu (d06 wsp 91→170) — Claude phát hiện qua đếm XML, Grok sửa: shape nhập chỉ hiện trên canvas, DrawingML gốc passthrough 1 lần, di chuyển/xoá qua marker; d09 bỏ 15 pic GIF thừa (bản lưu = gốc 30/15/30). Xác nhận: 0/23 file bản lưu có wsp/txbx/txc/media vượt gốc, Word PDF oracle d06=3 d09=14, bản lưu có đoạn sửa ZZ.
- **agy tab Chế độ xem** (`bb3053d`), **tab Tham chiếu** (`8240937`), **tab Trộn thư + tương phản tab đang chọn chế độ Tối cả 3 app** (`c8f53af`): checkbox Hiển thị dùng chung, focus trap dialog, icon đúng, Help tiếng Việt; Claude xem ảnh chụp sáng/tối từng tab.

**Đang chạy (16:30):** Grok `E:\VNOffice-grok-writer-shape-loss` — shape MẤT khi lưu (lỗi có sẵn): d06 thiếu 12 wsp/3 textbox/12 anchor, d07 và d19 mỗi file mất 1 wsp. agy `E:\VNOffice-agy-design-tab` — tab Thiết kế Writer.

**Môi trường:** Codex hết hạn mức đến **26/10 10:44**. Chiều 28/9 có lúc soffice tạo profile mới mất ~77s (liệt kê máy in treo) → 4 test soffice FAIL cả trên main; sau đó tự hết (1835/1835 lúc 15:40) — nếu gặp lại, so với main trước khi đổ lỗi cho nhánh.

**Quyết định người phụ trách 28/9:** nhánh `feature/cloud-oauth-scaffolding` (OAuth Google Drive/OneDrive, opencode 26/9) **TẠM GÁC** — giữ nguyên nhánh + worktree `E:\VNOffice-opencode-cloud-oauth`, không merge, không giao tiếp; tập trung hoàn thiện Writer và Sheet trước. Khi quay lại cần: token vào Windows Credential Manager (không localStorage), xin phép rõ trước khi gửi tài liệu lên mạng, kiểm thử tài khoản thật.

**Đo mức dùng thực tế trên toàn ổ LAN (28/9, người phụ trách cho phép; chỉ số liệu tổng hợp, không copy/commit tài liệu):** 672 file duy nhất — 264 .xlsx, **200 .xls**, 130 .docx, **76 .doc** (41% là định dạng cũ, gần như chưa có kiểm thử mở→lưu). Excel: 332.514 công thức, chỉ 18 hàm khác nhau, engine hỗ trợ đủ trừ `NA()` (2 lượt); **VLOOKUP chiếm 91%** (302.904 lượt) → hiệu năng/độ đúng VLOOKUP trên bảng lớn quan trọng hơn thêm hàm. Tính năng xlsx (số file/264): gộp ô 202, tên định nghĩa 103, hình vẽ 84, ảnh 80, vùng in 65, ẩn cột/hàng ~60, lọc 37, cố định ô 37, định dạng có điều kiện 26, **liên kết ngoài 21**. Word (115 docx hợp lệ): bookmark 98, bảng 86, tab stop 82, danh sách 53, chú thích cuối trang 50, hình VML 29 + wps 25 (~40% file có hình), đầu/chân trang ~25, nhiều section 14. → Ưu tiên kế tiếp: kiểm thử mở→lưu .xls/.doc, hiệu năng VLOOKUP, hình/khung văn bản Writer, liên kết ngoài Sheet, `NA()`.

**Đo đợt 2 (Claude, 28/9 20:20, thêm 12 .doc + 12 .xls thật từ LAN, trên main `37fb7f2`):**
- .doc: 9/12 khớp Word (canvas + bản lưu). Lệch: legacy14 Word 15 / canvas 15 / lưu **18**; legacy17 3 / 3 / **2**; legacy18 3 / **2** / 2. (Tổng 20 file .doc: canvas 19/20, lưu 16/20 kể cả legacy06.)
- .xls: 5/20 file gốc (legacy05, 09, 14, 17, 18) CHÍNH Excel 2016 từ chối mở (định dạng cũ bị File Block) — VN mở/lưu được; cần bộ so sánh không dùng Excel (LibreOffice → CSV) để đánh giá. 7 file còn lại: 6 lệch 0, **legacy13: ô `=VND(H13)` (add-in đọc số thành chữ phổ biến ở VN) mất chữ "Ba triệu một trăm…đồng chẵn" → `#N/A`**. Nguyên nhân: LibreOffice khi nhập tự tính lại hàm add-in không có → `#ADDIN?` và bỏ giá trị cache (FODS: `of:=VND([.H13])`, `office:string-value=""`). Hướng đề xuất: VN Sheet tự cài hàm `VND()` (đọc số tiền thành chữ tiếng Việt) trong `apps/sheet/formula-engine.js` để tính lại đúng khi mở, + kiểm tra giá trị được ghi lại khi lưu .xls/.xlsx. (Quét LAN: VND còn 2 lượt dùng trong .xlsx.)

**Đo .xls cũ (Claude, 28/9 19:50, 8 file thật từ LAN `file test\lan-legacy\legacy01-08.xls`, công cụ mới `scripts/layout-audit/_batch_xls_roundtrip.py` — mở bằng app, Lưu thành .xls, Excel COM so từng ô Value2+Formula):** 8/8 lưu ra OLE2 thật (D0 CF 11 E0). 6/6 file Excel mở được: legacy01/02/03/04/07/08 **lệch 0 ô**. legacy06: 10 ô — công thức nguồn đã hỏng `=#REF!-(#REF!*#REF!)` bị LibreOffice ghi thành `=#N/A` (+1 ô chuỗi rỗng mất) — nhỏ, chưa sửa. legacy05: CHÍNH FILE GỐC Excel 2016 từ chối mở ("Office has detected a problem…", nhiều khả năng Excel 5/95 bị File Block) — VN mở/lưu được, không phải lỗi VN.

**Đã merge 28/9 tối:** lưu tại chỗ Ctrl+S (agy, `65cc8f9`); liên kết ngoài + NA() (agy + Claude, `4220dbe`; main trước đó biến ô liên kết thành #VALUE!/#LỖI! mỗi lần tính lại); kế hoạch tăng tốc Sheet (Codex, `a5fefbb`, CHỜ duyệt bước 1). Đang kiểm chứng: Codex .doc (canvas 8/8, lưu 7/8). Đang chạy: Codex lưu legacy06 .doc + d09 4 hình.

**ĐÃ SỬA 28/9 18:20 (Claude, `f76aaa1`, + `4566994` Grok/Claude):** hình Writer khi lưu — d06 60/60 hình đúng trang Word (trước 20 hình ở trang 1), d09 26/30 (trước 15 ở trang 1); còn lại: **d09 4 hình (Rectangle 7/21/27/36) trang 8 → 9** (nghi đoạn neo sát ngắt trang). Công cụ nghiệm thu mới cho mọi vòng Writer: `scripts/layout-audit/_word_shape_pages.ps1 -Source <gốc> -Saved <bản lưu>` (Word đo trang từng hình) và `scripts/layout-audit/_writer_shape_counts.py <thư mục gốc> <thư mục batch>` (số hình ≤ gốc + 0 docPr id trùng).

**LỖI MỚI PHÁT HIỆN (Claude 28/9 17:50) — hình Writer bị dời về đoạn đầu khi lưu (có sẵn trên main):** d06 bản lưu có 17 anchor định vị theo đoạn văn (`positionV relativeFrom="paragraph"`) — Group 368 (nguồn p21), Rectangle 38 (p28), Rectangle 10/105/145/185 (p43), 7 rect p52, 4 rect p56 — đều nằm ở đoạn body p0 → mở bằng Word, sơ đồ trang 2–3 dồn lên trang 1 đè tiêu đề. Số trang/số hình không phát hiện được. Cần: tìm bước nào dời anchor (nghi `_relocate_passthrough_anchors` / đường StarWriter frame), đặt lại đúng đoạn nguồn; tiêu chí mới cho mọi vòng Writer: 0 docPr id trùng + mỗi docPr cách đoạn nguồn ≤ 3 đoạn + Word mở được. Script đo: scratchpad `d06_where.py`, `diag_d06.py` (Claude chuyển vào `scripts/layout-audit/` khi giao).

**Đo .doc cũ (Claude, 28/9 17:30, 8 file thật từ LAN, `file test\lan-legacy\legacy01-08.doc`, profile `claude`, báo cáo `E:\VNOffice-profiles\claude\legacy-doc-audit\_batch_writer_report.md`):** 8/8 mở + sửa + lưu được (có ZZ). Số trang lệch Word 3/8: legacy01 Word 5 / canvas 4 / lưu 4; legacy04 11 / 12 / 10; legacy06 3 / 4 / 5. Phát hiện thêm: (a) nếu người dùng tự gõ đuôi `.doc` trong hộp thoại Lưu, app ghi byte DOCX (`PK`) dưới đuôi .doc — Word 2016 vẫn mở nhưng phần mềm cũ sẽ báo hỏng; mặc định app gợi ý `.docx` nên đường thường không bị. Cần: tôn trọng đuôi người dùng chọn (.doc → filter `MS Word 97`, .xls → `MS Excel 97`) hoặc tự sửa đuôi. (b) Ctrl+S LUÔN mở hộp thoại Lưu (writer-adapter.js `save()` ghi chú "V1: luôn mở hộp thoại") — khác Word/Excel (Ctrl+S lưu thẳng vào tệp đang mở, chỉ hỏi khi tệp mới/định dạng cũ). Chưa đo .xls.

**Quyết định người phụ trách 28/9 (tốc độ mở Sheet):** đồng ý làm tăng tốc mở file lớn — Grok bắt đầu NGAY SAU khi xong việc Writer shape-loss đang dở. Bước 1 chỉ đo chi tiết + viết kế hoạch (Plan gate AGENTS.md §6: objective, file/module, rủi ro, test plan, rollback) để người phụ trách duyệt trước khi code. Mục tiêu đầu: lan14 < 60s tổng, 26 file LAN vẫn lệch 0. Số đo tham chiếu 28/9 (lan14 9,3 MB, 33.643 dòng): Excel 2016 ~15s, LibreOffice headless xlsx→fods ~30s, VN Sheet ~210–240s (Python ~110s + JS parseFods ~100s).

**Chờ người phụ trách quyết định (cũ, đã giải quyết ở trên):** viết lại `parseFods` phía JS dạng streaming để lan14 mở nhanh hơn (~100s JS) — thay đổi kiến trúc.

## Trạng thái 26/9 09:55 (main `2d501bc` = S31 + W47–W56 + agy layout-tab design)

**Mốc**: Writer nhập — **TẤT CẢ 22/22 file .docx hợp lệ trong mẫu LAN (trừ d10 hỏng) có canvas = số trang Word 2016 thật.**
d01 (file cuối cùng còn lệch) khớp sau W56 (đo advance GDI thật của Word ở TNR 13pt = 17px, không phải 17,333px của CSS `13pt`).

| Chiều | Số đo | Ghi chú |
|---|---|---|
| Writer nhập (23 docx) | **canvas = Word 22/22** (trừ d10 hỏng gốc); còn lớp nội bộ `page` (đếm theo đoạn, không đổi tổng số trang) ở d01 (32), d07 (27), d09 (8), d13 (14), d17 (2) | W56 (Grok R23). Việc còn lại: bảng ngành nghề d01/d09 vẫn ngắn hơn Word (từ R21); d07 hộp dòng Arial/TNR 12pt cao hơn Word |
| Sheet render hàng/cột | 0/6925 hàng lệch (không đổi) | S31a–i, S32 |
| Sheet mở file lớn (Python) | lan06 **1721s → 156s**, lan14 **346s → 132s** (chưa đo phần JS, mục tiêu ≤60s tổng) | S29 vòng 1 (Grok) đã merge. **Codex vòng 2 đang chờ** (bị chặn: token đăng nhập hết hạn, cần đăng nhập lại `codex login`) |
| UI tab Bố cục/Bố trí trang | Sửa nhãn raw command-id + icon thiếu (Sheet), select không render trong `ribbon-host.js` (Writer "Số dòng"), vỡ layout dialog Page Setup cả hai app, tràn ngang 1024px | agy — đối chiếu trực tiếp Word/Excel 2016 thật, 100% lệnh có handler, Help đã khớp UI |

Test trên `main`: `node tests/run-tests.js` **1834/1834 PASS** (đã tự chạy lại 2 lần để loại flake mount-DOM Edge headless); `python -m unittest` 346 OK.

**Đã gộp thêm (26/9 12:00):**
- Codex S29 vòng 2: gộp 3 chỉ mục XLSX thành 1 + 1 lượt duyệt FODS — lan14 Python 130,7s→115,5s, lan06 155,7s→136,4s; đầu ra trùng SHA-256 trên 6 file. Chưa đạt ≤60s; lan14 JS không đo được (app treo >3 phút — nghi ngờ có bug thật, giao Codex vòng 3 chẩn đoán).
- agy tab Chèn (Insert): tràn ngang 1024px Writer 1241→827px, bổ sung `id` nhóm + launcher Biểu đồ trên Sheet; 100% lệnh có handler (18 Writer, 9 Sheet).
- R24 (Grok) — không có sửa nào giữ lại, chỉ handoff phủ định giá trị: 4 giả thuyết cho d09/d07/d01 đều bị loại vì đánh đổi lớp nhỏ lấy lớp `page`/canvas lớn hơn. Dữ liệu đã dùng viết brief R25 hẹp hơn (giả thuyết `w:numPr`).

`main` hiện 1834/1834 test PASS (đã kiểm tra bằng profile LOCALAPPDATA riêng để tránh đụng soffice/Excel COM của các agent đang chạy song song).

**Đã gộp thêm (26/9 12:35):**
- R25 (Grok) — không giữ sửa: giả thuyết `w:numPr` đúng cho d16 (tách được khỏi điều kiện R24) nhưng bỏ GDI advance trên mọi `<li>` kéo d09 `page` 8→17 trở lại. d15 được lợi (wrap 3→1) nếu áp riêng, nhưng đi cùng hại d09 — không tách được. Ma trận giữ lại vẫn `_writer_out_r23_final`.
- agy tab Xem xét (Review): 17 icon fallback còn thiếu cho lệnh Review, chuẩn hoá tên tab/nhóm sai trong Help ("Đánh giá"→"Xem xét" bên Sheet, "Nhận xét"→"Ghi chú" bên Writer); 100% lệnh có handler (14 Writer, 8 Sheet).

**Đang chạy song song (26/9 12:39):** Grok R26 (Writer, chẩn đoán d10 "file hỏng" — chưa từng kiểm tra thật trong 5 vòng), Codex S29 vòng 3 (`E:\VNOffice-codex-sheet-s29b`, chẩn đoán vì sao lan14 không tới hook JS >3 phút — nghi bug thật), agy tab Công thức (Formulas, Sheet, `E:\VNOffice-agy-formulas-tab`), opencode mở rộng mẫu Sheet 28 file thật chưa đo (`E:\VNOffice-opencode-sample-expand`, đang chạy > 1,5 giờ, đã xong pha đo hình học 28 file, đang chạy pha `_batch_audit.py` — bình thường, có Excel COM thật cho từng file).

Ghi chú vòng Writer (R24/R25): mảng d01/d07/d09/d13/d15/d16/d17 đã tới ngưỡng lợi ích cận biên thấp — 2 vòng liên tiếp không tìm được sửa an toàn (mọi hướng đều đánh đổi lớp này lấy lớp khác). Tạm dừng thử thêm ở đây, chuyển Grok sang d10 (R26).

**Đã gộp thêm (26/9 12:50):**
- **R26 (Grok) — mốc quan trọng**: `d10.docx` KHÔNG phải lỗi VN Writer — file là **PDF 1.7 thật** (Print To PDF) mang nhầm đuôi `.docx` (chứng minh bằng header byte `%PDF-1.7`, không có `PK\x03\x04`, `zipfile.is_zipfile=False`). Word/VN Writer đều đúng khi từ chối; LibreOffice mở được vì coi là Draw. Loại `d10` khỏi mẫu đo Writer từ vòng sau — 5 vòng ghi "file hỏng" trước đó đều đúng, giờ có bằng chứng dứt điểm.
- **Codex S29 vòng 3 — phát hiện quan trọng**: nút nghẽn thật của lan14 không phải Python mà là **`parseFods` phía JS: 102,4 giây** (đo bằng hook thật trong app, không phải suy đoán). Tổng thời gian mở lan14 thực tế ≈ Python (115-138s) + JS parseFods (102s) ≈ **220-240 giây** — lớn hơn nhiều so với con số Python một mình từng báo cáo. Đây là mục tiêu tối ưu chính cho vòng 4.
- **opencode mở rộng mẫu Sheet — LỖI, ĐÃ HUỶ KHÔNG MERGE**: agent hiểu sai nhiệm vụ, copy lại CHÍNH 28 file đã có (lan01-28) rồi đặt tên lan29-56, không đo được file thật nào mới. Đã phát hiện khi kiểm chứng `_map.txt`, huỷ toàn bộ branch (không ảnh hưởng `main`). Đã giao lại vòng 2 với danh sách 28 tên file chính xác viết sẵn trong brief (không để agent tự tính) — `E:\VNOffice-opencode-sample-expand2`.

**Đã gộp thêm (26/9 15:10):**
- agy tab Công thức (Formulas, Sheet): tràn ngang 1024px 1109→1024px, bổ sung `id` nhóm + 3 launcher (Chèn hàm/Quản lý tên/Kiểm tra lỗi), styling nút Trình quản lý tên, đồng bộ Help; 100% lệnh có handler (25 lệnh). **Sự cố git**: nhánh gốc bị hỏng ref sau khi merge do thao tác dọn ảnh chụp màn hình cắt ngang phiên — đã phục hồi bằng commit hash từ reflog (`af5ec40`), không mất dữ liệu, đã xác nhận lại 1834/1834 trước khi merge.
- **opencode mở rộng mẫu Sheet — HUỶ HOÀN TOÀN, sai từ gốc do Claude**: cả 2 vòng đều thất bại vì tiền đề sai — thư mục `file test\lan\` chỉ có **28 tài liệu Excel thật duy nhất** (mỗi file tồn tại 2 lần: tên thật + bản `lanNN.xlsx` đã đổi tên), KHÔNG PHẢI 56 tài liệu khác nhau như Claude giả định ban đầu (đã xác minh bằng SHA-256: file tên thật và `lanNN.xlsx` tương ứng trùng byte tuyệt đối). Không còn "mẫu mở rộng" nào để đo — 26-28 file đã đo là toàn bộ mẫu Sheet thật hiện có. Đóng dứt điểm hướng này.

**Đã gộp thêm (26/9 15:50):**
- agy tab Dữ liệu (Data, Sheet): định nghĩa lệnh `sheet.data.goalSeek` **thiếu hoàn toàn** trong `command-definitions.js` dù có handler thật (raw command-id + icon chấm đen); 15 keyword icon còn thiếu; launcher Sắp xếp tùy chỉnh; styling 4 hộp thoại; sửa 1 vi phạm WCAG AA; 100% lệnh có handler (15 lệnh) + Playwright live test Custom Sort thật.
- **Codex S29 vòng 4 — mốc quan trọng, dừng vòng tối ưu nhanh ở đây**: đo bằng hook thật trong app, xác định hai chi phí lớn nhất của `parseFods` trên lan14 là **DOM parse trình duyệt (~37-45s)** và **dựng workbook model (~35-49s)** — KHÔNG phải vòng lặp O(n²) có thể sửa nhanh như bên Python. Codex trung thực báo cáo KHÔNG chứng minh được tốc độ nhanh hơn cho cache tên cột đã thêm (nhiễu đo lớn hơn tác dụng). Đây là điểm cần quyết định kiến trúc lớn hơn (viết lại bằng streaming parser?) nếu muốn tiếp tục — không phải việc "tối ưu nhanh" nữa.

**Đã gộp thêm (26/9 17:15):**
- **Codex S29 vòng 5 — kết luận trung thực, không giữ code**: thử tối ưu vòng lặp per-cell (bỏ `Object.fromEntries`/mảng trung gian khi đọc thuộc tính DOM). Đo 3 lần trước/3 lần sau: "Build workbook model" trước 32,7–36,4s (median 34,7s), sau 32,2–38,1s (median 33,7s) — chênh lệch median ~1,1s nhưng khoảng đo chồng lấn 3,7s, không đủ để khẳng định cải thiện thật. Đã revert thay đổi, chỉ giữ `docs/HANDOFF-SHEET-S29-PERF-ROUND5.md`. Không đổi code nguồn `sheet-adapter.js`. SHA-256 4 file mẫu khớp (không đổi hành vi). Merge `ef08f2e`.
- **Grok Writer save-back R13 — 2/2 lỗi sửa được, xác nhận bằng Word COM thật**: lỗi A (d09 bảng nhân đôi khi lưu) — thêm `_remove_duplicate_adjacent_writer_tables` trong `postprocess_created_writer_docx` (chỉ xoá bảng cấp-1 trùng toàn bộ chữ, đứng sát nhau, vượt số `<table>` HTML nguồn). Lỗi D (d13/d21 mất hoàn toàn `w:br type="page"`) — viết lại `_restore_writer_html_page_breaks` thay khối W22d cũ, quét thêm `h1`-`h6`, khớp qua bookmark `vno-untouched-N`, không viết vào ô bảng. Đo lại **23/23 file** (Word 2016 COM thật): canvas = Word 23/23, số trang bản lưu = Word gốc 23/23, số bảng cấp-1 và số `w:br type="page"` đều khớp nguồn. `node tests/run-tests.js` 1835/1835. Ghi chú trung thực: d09 vẫn còn bản sao bảng bên TRONG hộp văn bản (`txbxContent`) ở đường tạo-mới-không-nguồn — không thuộc phạm vi lỗi A (đường mở-sửa-lưu đã sạch nhờ W27b cũ); lỗi B (d06 mất Rectangle/Connector) là lỗi chiều nhập, ngoài phạm vi, chưa sửa. Merge `01f49e7`. `main` sau merge: `node tests/run-tests.js` 1835/1835 PASS (Claude xác nhận lại độc lập).
- Dọn 1 ref nhánh hỏng còn sót từ sự cố git trước (`design/sheet-formulas-tab-agy`, đã merge từ lâu qua commit hash) — xoá ref rác, không ảnh hưởng lịch sử.

**Đang chạy song song (26/9 17:20):** agy tab Chế độ xem (View, `E:\VNOffice-agy-view-tab`, vẫn đang tiếp tục — có thay đổi UI chưa commit, đã resume sau khi tiến trình bị ngắt); Grok task tiếp theo và Codex task tiếp theo đang được giao lại (xem cuối file).

**Phát hiện cần người phụ trách quyết định (26/9 17:20):** worktree `E:\VNOffice-opencode-cloud-oauth` (nhánh `feature/cloud-oauth-scaffolding`) có brief + code dở về OAuth PKCE Google Drive/OneDrive (đụng security boundary + external dependency theo AGENTS.md §11) — không thấy ghi nhận trong TASK-QUEUE.md trước đó, không rõ đã được người phụ trách duyệt hay chưa. Chưa merge, chưa tiếp tục — đang hỏi lại người phụ trách. Worktree `E:\VNOffice-opencode-lan-audit` (nhánh `audit/sheet-lan-batch`) là worktree CŨ từ thời S22 (~19-20/9), lệch xa main (main..HEAD chênh 226 file) — Claude đã nhầm dùng thư mục này làm scratch chứa log agent trong phiên này, sẽ chuyển sang dùng scratchpad riêng, không đụng tới 2 file thay đổi dở cũ trong đó.

Việc kế tiếp của Claude: Sheet batch lưu 26 file lại bằng Excel COM để xác nhận S29 vòng 1+2+3+4 không hồi quy (cần Excel COM rảnh).

## Trạng thái 22/9 01:00 (main `7943de1` = S31 + W47–W51)

| Chiều | Số đo | Ghi chú |
|---|---|---|
| Sheet render hàng/cột | **0/6925 hàng lệch** (26 file, 66 sheet); perf layout overlay lan06 221 s → ~15 s (cache metrics) | S31a–i, S32 |
| Sheet nhập→lưu (26 file, bỏ lan06/lan14) | **26/26 0 lệch, Excel mở OK, lint sạch** (batch 22/9 00:20 sau S31) | |
| Writer nhập (23 docx, Claude đo lại trên main `_writer_out_w51i`) | **page 125** (w46i 184), wrap 27 (34), unknown 28 (34), line-height 18 (25); canvas = Word **20/22** (d01 20/19, d16 9/8, d21 10/9; d10 hỏng) | W47 (Grok R20), W48–W51 (Grok R21): hairline 2px ăn cột chữ, face không cài, ảnh vertical-align bottom, phân trang chiều cao lẻ |
| Sheet mở file lớn (Python, `_time_sheet_open_stages.py`) | lan06 **1721 s** (number formats 262, original strings 595, xf indices 662 — chạy trên FODS 334 MB chưa tối ưu → 4,4 MB sau optimize), lan14 346 s | **Grok S29** đang làm (`E:\VNOffice-grok-sheet-s29`) |

Đang giao (22/9 00:10): **Grok R22** (`E:\VNOffice-grok-writer-r22`): d01/d16/d21 +1 trang, d09 page 24, d07 page 32; **Grok S29** hiệu năng.
agy: 2 lần thoát sớm (tác vụ nền) → chỉ dùng cho việc UI ngắn. Claude: kiểm chứng + merge.

## Trạng thái 21/9 23:30 (main `e34ebc0` = S31 + W47)

| Chiều | Số đo | Ghi chú |
|---|---|---|
| Sheet render hàng/cột (bộ đo hình học S30, 26 file, 65 sheet, 6887 hàng) | **cột 0, hàng 0/6887 lệch** (Python `_rows_all.py` đối chiếu `*.geom.json`; app thật kiểm 8 file lan03/05/08/11/12/15/19/23: col 0 row 0 lines 0 fit 0) | S31a–i, S32 (xem QUY-UOC); trước: 1217 hàng lệch với mô hình S30a |
| Sheet nhập→lưu | chưa chạy lại batch sau S31 (cần Excel COM rảnh) — S30b không đổi nên kỳ vọng 26/26 | chạy lại khi Grok/agy không dùng Excel |
| Writer nhập (23 docx) | w46i: page 184 (d09 54 do W44b đè `padding-bottom` longhand — **W47 Grok**: 54 → 23), wrap 34, unknown 34, line-height 24; canvas = Word 19/23 (d01 20/19, d14 4/3, d16 9/8, d21 10/9) | đang chạy lại 23 file sau S31+W47 (`_writer_out_w47i`) |
| Writer lưu (23 docx) | w46s: 21/22 = Word; d20 lưu 4 (Word 3) là lỗi CŨ có từ w43 (Grok đo lại PDF `/Count`), không phải hồi quy W44–46 | lớp còn lại: pbb thừa trên đoạn đã có `w:br`, W36 trượt vì ZZ |

Đang giao (23:20): **Grok R21** (`E:\VNOffice-grok-writer-r21`, `fix/writer-r21-grok`): d01/d14/d16/d21 canvas thừa 1 trang + d09 page 23;
**agy S29** (`E:\VNOffice-agy-sheet-perf`, `perf/sheet-s29-lan14`): lan14/lan06 mở > 15 phút (lần 1 thoát sớm vì chạy test ở tác vụ nền — đã chạy lại với luật foreground).
Claude: kiểm chứng + merge; codex/agy quota trở lại ~26–27/9.

## Trạng thái 21/9 14:30 (main `2a00720`)

| Chiều | Số đo | Ghi chú |
|---|---|---|
| Sheet nhập→lưu (26 file LAN, bỏ lan06/lan14) | **26/26 0 lệch** sau S29a/S30a/S30b/S30c (batch chạy lại 21/9 13:40) | lan14 (33k dòng)/lan06 mở > 15 phút — lớp S29 hiệu năng chưa đo |
| Sheet render (bộ đo hình học S30, opencode đang chạy toàn bộ) | cột 0 lệch mọi file đã đo (lan11 s3 16 → 0 nhờ S30c); hàng: lan01 1, lan03 5, lan05 4, lan08 1, lan11 26 (tất cả lớp S31 bề rộng chữ GDI → số dòng bọc chữ ±1), còn lại 0 | S31 chưa sửa |
| Writer nhập (23 docx, bộ đo tách `<li>`) | **page 276, wrap 34, drift:unknown 34, line-height 24, spacing 11, empty-para 9, table 5, float 3, font-name 1, font-size 1**; trang canvas = Word ở 19/23 file (lệch: d01 20/19, d14 4/3, d16 9/8, d21 10/9) | W24b, W32, W33 trong buổi chiều; d20 5 → 3 trang = Word |
| Writer mở→sửa→lưu→Word (23 docx) | **22/23 số trang bản lưu = Word** sau W34–W41 (`_writer_out_w39` + `_writer_out_w41`, 21/9 18:00); còn d16 9 (Word 8); d10 file gốc hỏng (Word không mở) | trước (R17): 12/23 lệch, 2 file Word báo hỏng |

Lớp kế tiếp (lớn → nhỏ): (1) Writer lưu đổi số trang d16/d02/d09/d11/d07 — đo bằng `_pb_where.py` + Word COM từng trang;
(2) Writer nhập `page 276` (d01 155, d07 34, d02 27, d13 17, d16 14) — trôi tích luỹ + keepNext (W24c);
(3) S31 bề rộng chữ GDI (bảng hệ số font/cỡ + letter-spacing hoặc đo GDI qua Python); (4) S29 hiệu năng lan14/lan06;
(5) W28 tạo mới kịch bản 3 (codex khi có hạn mức ~26/9).

## Trạng thái 21/9 05:00 (main `46e52e1`)

| Chiều | Số đo | Ghi chú |
|---|---|---|
| Sheet nhập→lưu (28 file LAN) | 25/28 0 lệch (vòng codex S27, main 5a1f486); lan11/lan20 hỏng XML do S26b → **S27a đã sửa** (0 lệch); lan14 (33k dòng) 167 lệch + mất 1 ảnh, lan06 visibility 7 — codex S27 đang xử lý (tiếp 06:29) | S8–S27a |
| Sheet tạo mới → Excel | kịch bản 1: 40/0; kịch bản 2 (16 mục, 63 phép đo): **63/0** (codex S26, Claude đo lại) | |
| Writer tạo mới → Word | kịch bản 1: 36/0; kịch bản 2 (16 mục, 39 phép đo): **39/0** (agy V12 W22a–g, Claude đo lại) | |
| Writer nhập (24 docx, bộ đo tách `<li>`) | **page 445, wrap 32, drift:unknown 36, line-height 27, spacing 12, font-size 36, empty-para 14, table 3** | W10b, W23a–c, W12e trong ngày; trước đó (bộ đo cũ) page 613 / wrap 87 |
| Writer mở→sửa→lưu→Word (23 docx) | 12/23 đổi số trang; mất ngắt trang thủ công 6 file (LibreOffice HTML→DOCX gắn nhầm/rơi), d09 bảng lồng bị nhân đôi, d06 shape → ảnh raster khi nhập | R11/R11b/R12/R13 (opencode đo); **W27** brief sẵn cho codex |

Lớp Writer nhập còn lại (lớn → nhỏ) và người nhận:
1. **page 445** — d01 232 / d09 54 / d02 34 / d07 30 / d11 27: (b) bảng dài hơn trang không được cắt (canvas coi bảng là
   1 khối; d01 bảng 10022px = 9 trang) → **W24 cắt trang trong bảng (theo hàng) và trong đoạn dài** (codex sau W27);
   (c) keepNext/keepLines (d13, d19/d20) → gộp vào W24; còn lại là trôi tích luỹ của các lớp dưới.
2. **font-size 36** (d19 19, d21 14: cỡ nửa điểm bị LibreOffice cắt 0,5pt) → **W25** agy (05:25).
3. **drift:unknown 36, line-height 27, empty-para 14** → **W26** đoạn rỗng theo cỡ dấu đoạn (opencode R15 đang đo), phần
   còn lại gom sau W25/W26.
4. **wrap 32** — d01 7 (trong bảng), d09 4, d13 1…: đo lại sau W24.

## (XONG 16/9, merged 0d9c35e — chạy lại batch 28 file để xác nhận) S8: ô chưa sửa giữ NGUYÊN style gốc XLSX (numFmt / border / font / fill / alignment)
Đo được 15/9: LibreOffice tự ghi lại mã Excel theo cách của nó (Accounting `_(* #,##0_);…"-"??` → `* #,##0 ; … -00`,
`#,##0.00"";` → `#,##0.00;…""`) và tự đổi viền ô gộp ngay khi NHẬP (lan18 A2) → hai lớp lớn nhất của Sheet
(numberFormat 287k, border 180k) KHÔNG sửa được qua FODS. Cơ chế S8: overlay Python ghi `vno:xf=<s>` cho từng ô khi
mở; JS giữ `origXf` + băm style lúc nhập; khi lưu, hậu xử lý XLSX chép `<xf>` gốc (+font/fill/border/numFmt nó trỏ
tới) vào `styles.xml` mới và đặt lại `s=` cho ô có băm không đổi. Đo: `_batch_audit.py` + `_sheet_matrix.py` —
numberFormat + border giảm ≥ 80%, Excel mở OK. Giao opencode (brief mẫu: TASK-BRIEF-SHEET-BORDER-FIDELITY.md v2).

## Đã làm 15/9
| Lớp | Kết quả |
|---|---|
| Sheet `numberFormat` bước 1 (S7, opencode + Claude, merged ade1bc8) | giữ data-style ODF verbatim; lan10 340→324, lan26 228→204, lan27 3303 (cần S8) |
| Sheet `border` (agy, 2 lượt) | không ra code; gốc là LibreOffice nhập đổi viền ô gộp → S8 |

## Tiếp theo (Writer, theo `MA-TRAN-WRITER-2026-09-15.md`)

### W8 — strut của đoạn: font của `<p>` không được làm cao dòng hơn font của run (lớp `line-height`, 365 đoạn / 19 file)
Đo d16: đoạn "HỢP ĐỒNG DỊCH VỤ" Word 1,08 dòng × Times New Roman 13pt = 21,5px; canvas 26px vì `<p class="western">`
mang font .VnTime 14pt (font của paragraph STYLE) tạo strut 23,2px dù mọi run là Times New Roman 13pt. Word không có
strut kiểu CSS: chiều cao dòng chỉ từ các run (và dấu đoạn `pPr/rPr`, thường = run).
Quy ước đề xuất: khi nhập, nếu toàn bộ chữ của `<p>` nằm trong `<font size/face>` thì `<p>` nhận font-size/font-family
của run đầu (hoặc `pPr/rPr` từ OOXML nếu có); đoạn trống giữ font style. Xuất ra không đổi kết quả (LibreOffice ghi
sz/rFonts cho dấu đoạn = run). Đo bằng `python scripts/layout-audit/_writer_layout_audit.py . <docdir> _out` — hàng
`line-height` phải giảm ≥ 80% trên d16/d09/d13/d07/d11, `page` giảm theo; không lớp nào tăng.

### W9 — font mặc định tài liệu từ docDefaults + theme khi LibreOffice không ghi `p.western` (lớp `font-name`, 301 đoạn / 13 file)
Đo d07: LO HTML không có font-family nào (không `<font face>`, không `p.western`) vì font đến từ
`docDefaults rFonts asciiTheme="minorHAnsi"` → theme minor = Arial; canvas rơi về Times New Roman (NĐ30), Word vẽ Arial.
Quy ước: font/cỡ mặc định = docDefaults (`styles.xml`) với theme major/minor giải từ `theme1.xml`; Python overlay
(`main.py` mở DOCX) chèn `p.western { font-family: ...; font-size: ... }` vào head HTML khi LibreOffice không ghi, hoặc
truyền styles.xml/theme cho `_parseDocStylesFromImportedHtml`. Đo: hàng `font-name` d07/d13/d06/d05 → ~0.

### W10 — `wrap` (93 đoạn / 15 file): số dòng gãy khác Word
Cần đo trước khi đề xuất: với mỗi cặp `wrap` trong `<tên>.pairs.jsonl`, so bề rộng cột chữ (page − lề − indent), font
thật đang vẽ (font thiếu → font thay thế nào ở Word/Chromium), kerning (`w:kern`), tab. Chưa giao.

### Sheet:
- **(XONG 19/9, main 39c54e8 — `MA-TRAN-SHEET-2026-09-19.md`) Vòng 5→7 theo lớp**: S12 chữ ô/rich text (value 285), S10/S10b theme +
  bảng màu indexed (fill 742, font/border lan03 540), S11 cột mặc định (columnWidth 271), S9b cột ẩn ngoài vùng dữ liệu
  (396), S13 ô chuỗi rỗng (lan25 1372), S14/S15 công thức (342), S8b numFmt built-in khai báo tường minh (1635), S8 một
  lượt quét (lan09 lưu 15 s thay vì không lưu được). opencode S13 (e967f2a) không merge: chép thẳng `s=` gốc, tính sai
  chỉ số shared string; Claude viết lại + `_SourceXfCopier`.
- **(XONG 19/9 chiều, main d78ba1c)** vòng 8: Excel 26/26, lint sạch, 371 lệch → sau sửa lẻ ≈ 40 (font[0] gộp,
  font-face "Calibri1", chữ shape, AutoFilter sheet cuối, S16 drawing passthrough — opencode viết Python, Claude nối
  id qua JS + sửa rels/ảnh ngoài).
- **ĐANG GIAO (19/9 13:40)**: codex → `TASK-BRIEF-SHEET-RESIDUALS-R8.md` (worktree `E:\VNOffice-codex-sheet-r8`,
  branch `fix/sheet-residuals-r8`); opencode → `TASK-BRIEF-WRITER-W12-LINE-HEIGHT.md` (worktree
  `E:\VNOffice-opencode-writer-w12`, branch `fix/writer-w12-line-height`). Claude gate + đo lại rồi merge.
- Sau đó: lan06 (VAT) và lan14 (1,5 triệu ô) chạy riêng với bộ đo mới; `numberFormat` ở ô ĐÃ sửa trong app (S7 chiều
  lưu); Writer W13 font-size, W10 wrap, W11b bảng trHeight.
- **(XONG 17/9, merged 2feaaf0 & dc0d825) S9 — Khôi phục dải cột ẩn (hiddenColumn), dòng ẩn và kiểm tra trực quan (Visual Inspection)**:
  - Khôi phục `<col min="9" max="16384" hidden="1"/>` và dòng ẩn ngoài vùng dữ liệu từ source XLSX.
  - Sửa xung đột style cột ẩn: gán `style="0"` thay vì copy source style index chưa qua map (tránh bị tô nền xám `#969696` toàn bộ trang tính).
  - Sửa `optimize_fods_streaming`: bảo vệ ô gộp (`number-columns-spanned`, `covered-table-cell`) không bị gộp trùng vào `number-columns-repeated`, khôi phục trọn vẹn ô gộp `G4:I4` trên sheet UNC.
  - Sửa `SheetAdapter`: cập nhật `styleHashAtImport` sau khi `_normalizeRichTextCellFont` chuẩn hóa, giúp ô rich text chưa sửa (như A19 "PHẦN DÀNH CHO NGÂN HÀNG") giữ trọn vẹn S8 `vno:xf` gốc, không bị cắt cụt chữ.
  - Kiểm tra trực quan bằng ảnh chụp thực tế từ Microsoft Excel 2016 COM và giao diện VN Sheet: độ tương đồng đạt 100%.
- **Tiếp theo**:
  + `fill` 53k (19 file) — mapping indexed pattern / tint color.
  + `value` 34k — rà soát các trường hợp multiline/ô trống còn lại.
  + Writer W8 (strut của đoạn) & W9 (font mặc định docDefaults + theme).
