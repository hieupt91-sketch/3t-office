# Soạn thử 3T Office trên macOS như người dùng thật (25/10/2026) — MAC-15 (kèm kết quả MAC-13)

Cách làm: mở app desktop thật trên macOS (QtWebEngine, `PYWEBVIEW_GUI=qt`, HOME tạm, runtime pilot `macos-offline-pilot-theme-20261022-v4`), điều khiển **chỉ qua CDP** bằng `scripts/audit-0610/app_session_server.mjs` (phiên có `--ttl`, giữ `heavy.lock` < 10 phút mỗi bước). Gõ phím, bấm nút ribbon, kéo chuột như người dùng; phím tắt dùng quy ước Mac (Cmd/Option). Không dùng AppleScript/osascript/cliclick. Nội dung hoàn toàn tự tạo (không có tài liệu khách hàng).
Lưu: Doc gọi thẳng `save_document_in_place` (giống bài CDP sẵn có); Sheet/Slide đặt `sourceFilePath` rồi bấm **Cmd+S** để chạy đúng đường `adapter.save()` thật. Hộp thoại Lưu/Chèn ảnh native của macOS **không điều khiển được bằng CDP** (BLOCKED, xem cuối).
Mở lại: `main.py --app=<app> <tệp>` trong phiên mới, đọc mô hình/DOM qua CDP, chụp màn hình. Kiểm cấu trúc tệp: `unzip -t` + parse toàn bộ XML (minidom) — cả 3 tệp hợp lệ.
Ảnh: `docs/macos/evidence/explore-mac-2510/` (đã thu về 1280 px, tổng 1,4 MB). Log MAC-13: cùng thư mục, `mac13-*.log`.

## Bảng giữ nguyên sau Lưu → Mở lại (MAC-15)

| Ứng dụng | Thành phần | Trong tệp đã lưu | Mở lại trong 3T | Ghi chú |
|---|---|---|---|---|
| Doc | Tiêu đề căn giữa, đậm | Có (`jc=center`, `<w:b/>`) | GIỮ | |
| Doc | Tiêu đề 1/2 (Cmd+Option+1/2) | Heading1×3, Heading2×1 | GIỮ (nội dung) | Phông Calibri Light thành serif trên Mac (D6) |
| Doc | Danh sách đầu dòng (Cmd+Shift+L) | `numPr`×3 | GIỮ | |
| Doc | Bảng 4×3 (bảng chọn cỡ + Tab) | 1 bảng, đủ chữ | GIỮ chữ, MẤT viền + co còn 1/2 bề rộng | D2 |
| Doc | Đầu trang | `header1.xml` | GIỮ | |
| Doc | Chân trang «Trang X / Y» | trường PAGE/NUMPAGES thật | MẤT trường (thành chữ tĩnh «Trang 1 / 2») | D4 |
| Doc | Ngắt trang (Cmd+Enter) | 1 | GIỮ (thanh trạng thái 2 trang) | |
| Doc | Chú thích cuối trang | `footnotes.xml` + `footnoteReference` | GIỮ | |
| Doc | Nhận xét | `comments.xml` + range | GIỮ (neo «thống», nội dung đúng) | |
| Doc | Phông/cỡ/giãn dòng mặc định | KHÔNG ghi TNR 14 pt / 1,5 dòng | MẤT (Liberation Serif 12 pt, 1,15) | D3 |
| Sheet | Dữ liệu chữ/số tiếng Việt | Có | GIỮ | |
| Sheet | `C2*D2`, SUM, AVERAGE, VLOOKUP | Công thức + giá trị cache đúng | GIỮ (307; 3.540.000; 76,75; 14.875; «Thước kẻ nhựa»; 450.000) | C7 hiển thị «77» (D12) |
| Sheet | Đậm hàng tiêu đề, định dạng `#,##0.00` | Có | GIỮ | |
| Sheet | Biểu đồ cột B1:C5 | `chart1.xml` barChart, tham chiếu đúng | GIỮ dữ liệu; MẤT tên chuỗi, đổi vị trí đè dữ liệu | D11 |
| Slide | Trang tiêu đề + trang đầu dòng | 2 trang, `buChar` | GIỮ nội dung nhưng **chữ vẽ hai lần** | D1 |
| Slide | Hình mũi tên phải + chữ | `prst="rightArrow"`, có chữ | Thành hình chữ nhật xanh có chữ | D8 |
| Slide | Ghi chú thuyết trình | `notesSlide2.xml` | GIỮ | |
| Slide | Ảnh | — | NOT RUN | chèn ảnh cần hộp thoại tệp native (BLOCKED) |

## Phát hiện (xếp theo mức độ)

### D1 — Critical — Slide: mở lại PPTX do chính app lưu, tiêu đề và nội dung bị vẽ HAI LẦN chồng lên nhau
- Tái hiện: Slide mới → gõ tiêu đề + phụ đề trang 1; «Trang mới», gõ tiêu đề, bấm Đầu dòng, gõ 3 mục → Cmd+S thành `.pptx` → mở lại tệp đó.
- Mong đợi: mỗi trang có 1 tiêu đề, 1 khung nội dung như lúc soạn.
- Thực tế: mô hình trang có cả `title/body` lẫn 2 `shapes` loại `textbox` cùng nội dung; canvas vẽ cả hai → chữ đè lên nhau (trang 1 và 2). Tệp đã lưu đúng (`<p:ph type="title"/>`, `<p:ph/>`), nên lỗi ở bước nhập. Thanh nhấn màu xanh trên đầu trang (giao diện chủ đề) cũng mất; khung trang vượt quá vùng nhìn, phần dưới bị thanh trạng thái che.
- Ảnh: `p3-slides-reopen-slide1-duplicate.png`, `p4-slides-reopen-slide2-duplicate.png`.
- Nghi vấn: `adapters/libreoffice/slides/slides-adapter.js` phân loại khung `presentation:class` khi nhập FODP (quanh dòng 2921 và 4480) — khung placeholder vừa gán vào `slide.title/body` vừa được giữ thành shape; hoặc `apps/slides/slides-canvas.js` không bỏ shape placeholder khi layout có tiêu đề. Cần kiểm trên Windows xem có cùng lỗi không.

### D2 — High — Doc: bảng mất viền và co còn nửa bề rộng khi lưu DOCX
- Tái hiện: Chèn → Bảng biểu → chọn 3 cột × 4 hàng → gõ dữ liệu bằng Tab → lưu `.docx` → mở lại.
- Mong đợi: bảng lưới có viền, rộng hết lề như lúc soạn.
- Thực tế: `document.xml` có `tblW=4676 dxa` (~8,2 cm) và mọi `<w:tcBorders></w:tcBorders>` rỗng; mở lại: viền `none 0px`, bảng rộng 312 px / thân 624 px.
- Ảnh: `w1-writer-before-save-page1.png` (trước), `w3-writer-reopen-top.png` (sau).
- Nghi vấn: đường xuất bảng của Doc (`WriterAdapter._contentForExport()` → FODT: style viền ô/bề rộng bảng) trong `adapters/libreoffice/writer/writer-adapter.js`.

### D3 — High — Doc: phông Times New Roman 14 pt và giãn dòng 1,5 (mặc định NĐ 30) không được ghi vào DOCX
- Tái hiện: tài liệu mới (ô phông hiện «Times New Roman», «14 pt (NĐ 30)») → gõ đoạn văn → lưu → mở lại.
- Mong đợi: tệp ghi TNR 14 pt, giãn dòng như trên màn hình; mở bằng phần mềm khác vẫn thế.
- Thực tế: không có `w:rFonts`/`w:line` nào trong `document.xml`; style Normal = `Liberation Serif`, `sz=24` (12 pt), `eastAsia="Songti SC"` (phông mặc định của engine bản macOS). Mở lại: «Liberation Serif» 16 px, line-height 18,4 px — chữ nhỏ và sát dòng hơn hẳn (so `w3` với `w1`).
- Ảnh: `w1-…`, `w3-…`.
- Nghi vấn: style mặc định/docDefaults khi xuất (writer-adapter FODT default style hoặc `adapters/libreoffice/common/ooxml_zip_patch.py` phần vá docDefaults NĐ30). `Songti SC` cho thấy giá trị lấy từ hồ sơ engine macOS — cần so với tệp cùng thao tác trên Windows.

### D4 — High — Doc: trường số trang ở chân trang thành chữ tĩnh sau khi mở lại
- Tái hiện: Chèn → Chân trang (tự có «Trang X / Y») → tạo 2 trang → lưu → mở lại.
- Mong đợi: vẫn là trường PAGE/NUMPAGES, tự cập nhật khi thêm trang.
- Thực tế: tệp có `fldChar` PAGE/NUMPAGES đúng, nhưng sau mở lại chân trang chỉ còn `<p>Trang 1 / 2</p>` (không còn `data-vno-field`), sẽ sai khi số trang đổi.
- Ảnh: `w4-writer-reopen-bottom.png`.
- Nghi vấn: nhập đầu/chân trang trong `writer-adapter.js` (ánh xạ trường `text:page-number`/`text:page-count` của FODT sang `data-vno-field`) chỉ chạy cho thân bài.

### D5 — High — Doc: ngắt trang chia MỘT khổ A4 thành hai «trang» ngắn; chân trang/chú thích trang 1 vẽ ở trang 2
- Tái hiện: soạn nội dung ~1 trang, Cmd+Enter, gõ tiếp vài dòng.
- Mong đợi: trang 1 đủ khổ A4 có chân trang «Trang 1 / 2» và chú thích của nó; trang 2 có đầu/chân trang riêng.
- Thực tế: chỉ có một phần tử `.vno-writer-page` cao 1186 px; trang 1 hiển thị ~664 px, trang 2 ~520 px; chú thích cuối trang (thuộc trang 1) và chân trang ghi «Trang 1 / 2» nằm ở cuối trang 2; đầu trang chỉ có ở trang 1 (đã ghi ở EXPLORE-WRITER-19-10). Khoảng trống lớn giữa đường phân cách chú thích và nội dung chú thích (~90 px).
- Ảnh: `w2-writer-before-save-page2.png`.
- Nghi vấn: dựng trang trong `apps/writer/` (page-decorations / bố trí ngắt trang) — vẽ giả lập khoảng cách trang thay vì phân trang thật.

### D6 — High (riêng macOS) — Phông Calibri/Calibri Light nhập từ tệp hiển thị thành chữ có chân (serif)
- Tái hiện: Sheet: gõ bảng, lưu `.xlsx`, mở lại (ô phông vẫn ghi «Calibri»). Doc: Tiêu đề 1 trước khi lưu là chữ không chân, mở lại thành serif.
- Mong đợi: hiển thị phông không chân tương đương (Carlito/Helvetica) như lúc soạn và như trên Windows.
- Thực tế: macOS không có Calibri hệ thống; CSS nhập được gán `font-family: "Calibri Light", serif` (Doc) và «Calibri» không có dự phòng (Sheet) → WebView rơi về Times. Lúc soạn, CSS mặc định có dự phòng (`Calibri, Carlito, Arial, sans-serif` trong `apps/sheet/sheet.css`) nên trông bình thường.
- Ảnh: `s2-sheet-reopen.png`, `w3-writer-reopen-top.png`.
- Nghi vấn: ánh xạ phông khi nhập — `adapters/libreoffice/sheet/sheet-adapter.js` (style.fontFamily lấy nguyên tên) và ánh xạ style tiêu đề của writer-adapter; cần chuỗi dự phòng dùng chung (Calibri→Carlito, Cambria→Caladea, như `MAC_FONT_SUBSTITUTIONS` của engine trong `platform/os_services/macos.py`) ở lớp platform, không thêm `if mac` vào apps.

### D7 — Medium — Slide: dấu đầu dòng không hiện khi soạn
- Tái hiện: Trang mới → bấm vào khung nội dung → Trang đầu → Đầu dòng → gõ 3 dòng.
- Mong đợi: thấy dấu chấm đầu dòng.
- Thực tế: DOM là `<ul><li>` (`list-style: disc`) nhưng `ul` có `padding-left: 0` → dấu nằm ngoài khung và bị cắt. Tệp lưu vẫn có `buChar`; sau mở lại dấu hiện ra.
- Ảnh: `p1-slides-bullets-invisible.png`.
- Nghi vấn: CSS khung nội dung trong `apps/slides/` (`.vno-slide-body ul`).

### D8 — Medium — Slide: chữ gõ vào hình vừa chèn không hiện; mở lại mũi tên thành hình chữ nhật
- Tái hiện: Chèn → Hình → Mũi tên phải → gõ «Mục tiêu 2026» → bấm ra ngoài; lưu, mở lại.
- Mong đợi: chữ hiện giữa hình; mở lại vẫn là mũi tên.
- Thực tế: `shape.text` có chữ nhưng hình không vẽ chữ; hình chèn chồng lên dòng cuối của khung nội dung (đã ghi 19-10); hình thu nhỏ không có hình. Sau mở lại (`geomType: ooxml-rightArrow`) vẽ thành hình chữ nhật xanh có chữ.
- Ảnh: `p2-slides-shape-text-missing.png`, `p4-…`.
- Nghi vấn: `apps/slides/slides-canvas.js` (vẽ chữ cho shape kiểu `arrow`, vẽ hình `ooxml-*`).

### D9 — Medium — Doc: Cmd+End (Về cuối tài liệu) đưa con trỏ về ĐẦU tài liệu trên macOS
- Tái hiện: con trỏ ở Tiêu đề 2 → Cmd+End.
- Mong đợi: con trỏ ở cuối đoạn cuối.
- Thực tế: lệnh `writer.nav.docEnd` có chạy (lịch sử lệnh) nhưng vùng chọn cuối cùng ở offset 0 của tiêu đề tài liệu. (Cmd+↓ không tác dụng — có thể do CDP không gửi lệnh soạn thảo native của Mac, chưa kết luận.)
- Nghi vấn: `platform/commands/shortcut-manager.js` (dịch Cmd+End, có thể không chặn mặc định nên trình duyệt xử lý tiếp) hoặc `navigateDocumentBoundary()` trong writer-adapter.

### D10 — Medium — Sheet: biểu đồ đổi chỗ đè dữ liệu sau khi mở lại, mất tên chuỗi
- Tái hiện: chọn B1:C5 (kéo chuột) → Chèn → Biểu đồ → Cột → Chèn vào bảng tính; lưu; mở lại.
- Thực tế: lúc chèn biểu đồ nằm ở cột D–H (đã che cột Đơn giá/Thành tiền); mở lại nằm C–F che cả cột Số lượng; khung chọn nét đứt lệch khỏi khung biểu đồ; tên chuỗi «Số lượng» (`c:tx` → `$C$1`) thành «Series 1»; tiêu đề mặc định «Biểu đồ B1:C5» thay vì tên chuỗi; nhãn trục bị cắt («Bút bi Thiên L»), nhãn cuối tràn mép.
- Ảnh: `s1-sheet-chart-inserted.png`, `s2-sheet-reopen.png`.
- Nghi vấn: `adapters/libreoffice/sheet/sheet-adapter.js` (nhập chart: anchor → x/y, `labelCell`), chart layer của Sheet.

### D11 — Low — Sheet: số hiển thị theo kiểu Mỹ trong giao diện tiếng Việt
- «#,##0.00» hiện «5,000.00», AVERAGE hiện «76.75»; sau mở lại C7 hiện «77» (cột đủ rộng). Liên quan quyết định vùng định dạng đã nêu 19-10. Nghi vấn: định dạng hiển thị của lưới Sheet.

### D12 — Low — Doc: số từ khác nhau trước/sau mở lại
- Trước lưu thanh trạng thái 148 từ (tính cả chú thích 13 từ), sau mở lại 135. Nghi vấn: `apps/writer/word-count.js` (vùng đếm không nhất quán).

### D13 — Low — Doc: thuật ngữ nhận xét không thống nhất
- Ribbon «Thêm nhận xét» / nhóm «Nhận xét», nhưng ngăn bên ghi «Ghi chú (1)». Nghi vấn: chuỗi i18n ngăn nhận xét (`platform/i18n/strings-vi.js`).

### D14 — Low (hạ tầng test) — Bài CDP mặc định đường dẫn Windows, trên Mac ghi tệp rác vào gốc repo
- `writer-footnote-track-save`, `slides-shape-names`, `document-password` dùng mặc định `E:\VNOffice-profiles\…`; trên macOS thành tên tệp tương đối trong thư mục `main.py` (gốc worktree). Đã chuyển 4 tệp rác ra scratch, không commit. Nên mặc định `os.tmpdir()` khi không phải win32.

## Đã kiểm, hoạt động đúng trên macOS
Gõ tiếng Việt có dấu (NFC) ở cả 3 ứng dụng, không vỡ dấu trong ảnh chụp; Cmd+E, Cmd+B, Cmd+Option+1/2, Cmd+Shift+L (Doc), Cmd+Enter ngắt trang và chân trang tự thành «Trang 1 / 2»; bảng chọn cỡ bảng (rê chuột hiện «3 cột × 4 hàng»); Tab giữa ô, ↓ ra khỏi bảng; chú thích cuối trang; Cmd+Option+A mở hộp thêm nhận xét, Enter lưu; Sheet: Tab/Enter quay về cột A, công thức, kéo chọn vùng bằng chuột (lệnh `drag` mới), Ctrl+Shift+1; hộp thoại biểu đồ; Slide: Trang mới, menu Hình, kéo dời hình, ngăn ghi chú (đếm ký tự); Cmd+S lưu đúng tệp, thanh trạng thái «Đã lưu».

## Chưa làm được / BLOCKED
- Hộp thoại Lưu và Chèn ảnh native (NSSavePanel/NSOpenPanel qua Qt) không nằm trong trang web → CDP không điều khiển được; dùng đường lưu tại chỗ thay thế. Chèn ảnh Slide: NOT RUN.
- So sánh bằng Word/Pages: BLOCKED (Office Automation bị chặn, không dùng osascript theo yêu cầu).

## Kết quả MAC-13 trên macOS (7 bài `tests/live/cdp/*.desktop.mjs`, 25/10/2026)
| Bài | Kết quả | Số liệu | Nguyên nhân |
|---|---|---|---|
| writer-list-caret | FAIL | 8 PASS / 1 FAIL | Ca «Ctrl+Shift+L» gửi Control; trên Mac phím là Cmd+Shift+L (keymap-macos.js dòng 120). Đã kiểm tay qua CDP: Cmd+Shift+L tạo danh sách đúng. Lỗi của bài test (phím Windows), không phải sản phẩm. |
| writer-table-tab-rows | FAIL | 0 / 1 (ngoại lệ) | `writer.table.insert` nay mở bảng chọn cỡ (56f07440, sau bài test b6dd98f2) nên không có `<table>` → `null.rows`. Bài test lỗi thời trên mọi nền tảng. |
| writer-footer-numpages | FAIL | 2 / 1 FAIL | Ngắt trang gửi Ctrl+Enter; trên Mac là Cmd+Enter (keymap dòng 127). Kiểm tay: Cmd+Enter → «Trang 1 / 2». Lỗi bài test. |
| writer-footnote-track-save | PASS | 4 / 0 | (ghi tệp rác vào gốc repo — D14) |
| slides-zoom-dialog | PASS | 16 / 0 | |
| slides-shape-names | PASS | 14 / 0 | (D14) |
| document-password | PASS | 9 / 0 | (D14) |
