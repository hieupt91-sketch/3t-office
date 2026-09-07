# HANDOFF: Writer — header/footer trang đầu/trang chẵn, field số trang, connector-shape, bookmark

## Bối cảnh

Chủ động quét thêm 8 file `.docx` THẬT của người dùng (thư mục
`file test/`, khác với 6 file `.doc` đã quét ở lượt trước) qua vòng
soffice thật → `parseFodt()`. Kết quả ban đầu: **0/8 file mở được**,
lộ ra 4 lớp lỗi thật khác nhau (một số file bị chồng nhiều lớp lỗi
cùng lúc — sửa lớp ngoài lộ ra lớp trong).

Đã sửa trực tiếp 4/5 lớp lỗi phát hiện (lớp thứ 5 — "header/footer
khác nhau giữa các master-page" — đã có sẵn nhiệm vụ riêng đang giao
cho opencode, nhánh `fix/writer-real-file-gaps-batch2`, KHÔNG đụng lại
ở đây để tránh xung đột).

## Lỗi 1: `style:header-left`/`style:footer-left`/`style:header-first`/`style:footer-first` bị ném lỗi toàn bộ

`adapters/libreoffice/writer/writer-adapter.js`, hàm
`_fodtParseMasterPages()` (~dòng 5056). Trước đây: bất kỳ master-page
nào có khai báo header/footer RIÊNG cho trang chẵn (`-left`) hoặc
trang đầu (`-first`) — tính năng "Different First Page"/"Different
Odd & Even Pages" cực kỳ phổ biến trong Word — bị ném lỗi ngay, hỏng
toàn bộ tài liệu.

**Giải pháp**: bỏ đoạn `throw`, luôn dùng header/footer CHÍNH
(`style:header`/`style:footer`, không phải biến thể) — đánh đổi mất
biến thể riêng theo trang, giữ toàn bộ nội dung thân bài.

## Lỗi 2: Field `<text:page-number>`/`<text:page-count>` trong header/footer bị từ chối

Cùng file, 2 vị trí: whitelist nội dung header (~dòng 6929, cũ) và
whitelist nội dung footer (~dòng 6935, cũ) đều ném lỗi khi phát hiện
`text:page-number`/`text:page-count` — trong khi số trang ở
footer/header là mẫu CỰC KỲ phổ biến trong văn bản hành chính Việt
Nam ("Trang 1/3").

**Giải pháp**: VN Writer không có field số trang SỐNG (live-updating)
trong thân/header/footer — hạ cấp có chủ đích thành VĂN BẢN TĨNH lấy
từ giá trị fallback soffice đã tính sẵn lúc convert (thêm nhánh xử lý
mới trong `inlineNodeHtml`, ~dòng 6653). Cơ chế xem trước khi in (đã
có sẵn từ trước, dòng ~7651, regex thay thế mẫu `"Trang N / M"`) vẫn
tự hoạt động đúng vì nó khớp theo MẪU VĂN BẢN chứ không theo field —
nên trải nghiệm in ấn không bị ảnh hưởng, chỉ mất tính "sống" khi
CHỈNH SỬA trực tiếp trong lúc soạn thảo (số trang không tự đổi ngay
khi gõ thêm/xóa bớt nội dung, phải in/xem trước mới cập nhật).

Đồng thời xóa `text:page-number`/`text:page-count` khỏi 2 regex
whitelist header/footer (không còn cần chặn vì đã có nhánh xử lý).

## Lỗi 3: `draw:custom-shape` type `"ooxml-straightConnector1"`/`"mso-spt32"` (đường nối thẳng) bị từ chối

Cùng file, hàm `_fodtShapeFromNode()` (~dòng 5408). Word/LibreOffice
ghi "Straight Connector" (đường thẳng nối 2 điểm, công cụ vẽ phổ biến
trong Word) thành `draw:custom-shape` với
`draw:enhanced-geometry draw:type="ooxml-straightConnector1"` (DOCX
mới) hoặc `"mso-spt32"` (convert từ .doc cũ) — KHÁC với `<draw:line>`
chuẩn ODF mà VN Writer tự ghi ra.

**Giải pháp**: thêm 2 key vào `OOXML_SHAPE_TYPE_MAP` sẵn có, map cả
hai về `"line"` (dùng lại type có sẵn, vẽ đường chéo theo hộp biên
x/y/w/h — cùng cơ chế `draw:line` đã hoạt động ổn định từ trước).

## Lỗi 4: `<text:bookmark>`/`<text:bookmark-start>`/`<text:bookmark-end>` bị ném lỗi

Cùng file, hàm `inlineNodeHtml` (nhánh mặc định ném lỗi "phần tử FODT
inline"). Đây là điểm neo VÔ HÌNH Word dùng cho tham chiếu chéo nội
bộ (ví dụ mục lục, "xem mục X") — không mang nội dung hiển thị nào,
nhưng bị ném lỗi làm hỏng cả tài liệu.

**Giải pháp**: bỏ qua an toàn (trả về chuỗi rỗng), không mất bất kỳ
nội dung hiển thị nào (chỉ mất khả năng nhảy tới điểm neo, tính năng
VN Writer chưa có sẵn để mất theo).

## Kiểm thử

- `node scripts/check-syntax.js`: 89/89 PASS.
- `node tests/run-tests.js`: 1504/1504 PASS (thêm 3 test mới cho lỗi
  2/3/4; 1 test cũ ở `writer-fodt-phase-c.test.js` mô tả HÀNH VI CŨ
  (ném lỗi khi gặp page-number) đã cập nhật để phản ánh hành vi MỚI).
- `node tests/live/ribbon-audit-1280.playwright.mjs`: 100% PASS
  (104/104 lượt).
- Xác nhận trực tiếp trên 4 file THẬT của người dùng từng thất bại
  (vòng soffice thật → `parseFodt()`), lặp lại nhiều lần khi từng lớp
  lỗi được lột ra:
  - `file test/gói sữa chữa tháng 04-2026/Biên bản hoàn thiện hợp đồng.docx`
  - `file test/GÓI THẦU MUA SẮM MÁY BẢO MẬT/MUA SĂM  MAY MÓC QT/MUA SĂM  MAY MÓC BẢO MẬT/8. Biên bản hoàn thiện hợp đồng.docx`
  - `file test/gói sữa chữa tháng 04-2026/HĐ VÀ NGHIỆM THU, THANH LÝ.docx`
  - `file test/GÓI THẦU MUA SẮM MÁY BẢO MẬT/MUA SĂM  MAY MÓC QT/MUA SĂM  MAY MÓC BẢO MẬT/12. HĐ VÀ NGHIỆM THU, THANH LÝ.docx`

  2 file "Biên bản hoàn thiện hợp đồng" giờ CHỈ CÒN vướng lỗi "table:table-cell
  phải có đúng một text:p" — đang được opencode sửa ở nhánh
  `fix/writer-real-file-gaps-batch2`. 2 file "HĐ VÀ NGHIỆM THU, THANH LÝ"
  giờ CHỈ CÒN vướng lỗi "header/footer khác nhau giữa các master-page"
  — CŨNG đang được opencode sửa ở nhánh đó. Cả 4 file dự kiến MỞ ĐƯỢC
  HOÀN TOÀN sau khi nhánh batch2 merge.

## Ranh giới

- KHÔNG đụng lỗi "header/footer khác nhau giữa các master-page"
  (dòng ~6918 cũ) hay "table:table-cell phải có đúng một text:p"
  (dòng ~6847 cũ) — đã giao riêng cho opencode, tránh xung đột merge
  trên cùng file.
- KHÔNG đụng Sheet/Slides.
