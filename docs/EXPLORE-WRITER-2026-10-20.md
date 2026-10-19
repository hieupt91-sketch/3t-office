# Q17 — Khám phá Writer: báo cáo dài, mục lục và bảng

## Kế hoạch và môi trường

- **Mục tiêu:** soạn báo cáo có cấu trúc dài, chèn/cập nhật mục lục, bảng và lưu DOCX thật; mở lại trong phiên mới; kiểm tra DOCX bằng Word COM ở chế độ ẩn, chỉ đọc.
- **Khả năng hiện có:** tái sử dụng ribbon Writer, phím tắt Heading, lệnh Tham chiếu, bảng và đường lưu DOCX hiện có. Gọi `save_document_in_place(_contentForExport(), 'writer', path, null)` để lưu.
- **Tệp tạo trong phiếu:** `tests/live/cdp/q17-writer-long-report.desktop.mjs`, `tests/live/cdp/q17-writer-word-readonly.ps1`, tài liệu này và ảnh minh chứng. Không sửa source ứng dụng.
- **Phụ thuộc:** CDP desktop, Word COM chỉ đọc. Mỗi lượt CDP dùng `VNO_CDP_LOCALAPPDATA` riêng. Không dùng Excel COM, không điều khiển hệ điều hành.
- **Rủi ro:** lưu lại DOCX đã mở có thể thay đổi trường TOC; số trang có thể thay đổi khi thêm bảng. PDF, trộn thư và các chức năng còn lại chưa được xác minh trong lượt này.
- **Kiểm thử:** tạo tài liệu qua chuột/bàn phím CDP, lưu theo đường dẫn thật, mở lại phiên mới, đối chiếu Word COM read-only. Ghi cả PASS/FAIL/NOT RUN.
- **Rollback:** chỉ thêm bài chạy audit và tài liệu/ảnh; có thể revert riêng commit audit mà không tác động source ứng dụng.
- **Quy tắc chung:** `CODEX-COMMON-RULES.md` không có trong worktree; xác nhận bằng `rg --files`. Tài liệu Q11 cũng ghi nhận tệp này vắng mặt.

## Kết quả

- Nhánh `codex/queue-19-10`; worktree ban đầu sạch; `git merge main` → `Already up to date`.
- Phiên tạo: `E:\VNOffice-profiles\Q17-writer-20261020-1330`; tệp DOCX: `q17-bao-cao-6-trang.docx`.
- **Trước khi thêm bảng:** Word COM đọc tệp chỉ đọc: 6 trang, 12 tiêu đề, 1 mục lục, `ReadOnly=true`.
- **Sau khi thêm bảng và lưu lần hai:** phiên CDP mới mở được bảng 5×4; Word COM: 7 trang, 12 tiêu đề, bảng 5×4, hàng đầu được đánh dấu lặp lại, nhưng `TablesOfContents=0`. Nội dung mục lục vẫn hiện trong giao diện đã mở lại dưới dạng văn bản. Đây là lỗi round-trip cần theo dõi: trường TOC động không còn được nhận là TOC sau lần lưu lại; không sửa source trong phiếu audit này.
- Bảng được chèn bằng lưới ribbon; gõ dữ liệu qua bàn phím. Lần gõ Tab cuối tự tạo hàng thứ sáu; đã xóa hàng thừa bằng lệnh Xóa hàng và xác nhận lại 5×4. Không tìm thấy lệnh/bộ điều khiển lặp hàng tiêu đề trong ribbon Writer; Word COM lại đọc `HeadingFormat=true` cho hàng đầu sau lưu.
- Tài liệu cuối sau chèn bảng là **7 trang**, không còn đúng mục tiêu 6 trang. Không thu nhỏ nội dung để ép số trang.

## Nhật ký thao tác (30 bước)

| # | Thao tác | Kết quả |
|---:|---|---|
| 1 | Nhấp vùng văn bản bằng CDP | PASS — caret vào tài liệu |
| 2 | Nhập tiêu đề báo cáo tiếng Việt | PASS — dấu tiếng Việt được giữ |
| 3 | Enter tạo đoạn mới | PASS |
| 4 | Nhập địa điểm và ngày | PASS |
| 5 | Enter tạo đoạn mới | PASS |
| 6 | Nhập phần mục tiêu/phạm vi | PASS |
| 7 | Mở tab Tham chiếu | PASS |
| 8 | Chèn Mục lục tự động | PASS — có mục lục trong tài liệu |
| 9 | Ctrl+End tới cuối tài liệu | PASS |
| 10 | Enter mở đoạn mới trước chương | PASS |
| 11 | Ctrl+Alt+1 áp dụng Heading 1 | PASS — kiểm tra tổng cộng 6 chương |
| 12 | Nhập tiêu đề chương 1 | PASS |
| 13 | Enter chuyển sang nội dung | PASS |
| 14 | Nhập nội dung chương 1 | PASS |
| 15 | Ctrl+Alt+2 áp dụng Heading 2 | PASS — kiểm tra tổng cộng 6 tiêu đề cấp 2 |
| 16 | Nhập tiêu đề mục 1.1 | PASS |
| 17 | Nhập phần nội dung mục 1.1 | PASS |
| 18 | Ctrl+Enter sang trang kế tiếp | PASS — dùng giữa các chương |
| 19 | Lặp thao tác Heading 1/2 cho chương 2 | PASS |
| 20 | Lặp thao tác Heading 1/2 cho chương 3 | PASS |
| 21 | Lặp thao tác Heading 1/2 cho chương 4 | PASS |
| 22 | Lặp thao tác Heading 1/2 cho chương 5 | PASS |
| 23 | Lặp thao tác Heading 1/2 cho chương 6 | PASS — DOM có 12 tiêu đề |
| 24 | Chọn Cập nhật mục lục sau khi thêm chương | PASS — mục lục có đủ mục tới chương 6 |
| 25 | Lưu DOCX qua đường dẫn thật | PASS — status `ok` |
| 26 | Mở DOCX bằng phiên CDP mới | PASS — sáu chương, tiêu đề và nội dung mục lục đọc được |
| 27 | Word COM mở ẩn, ReadOnly=true, đếm trang và TOC | PASS — 6 trang, 12 tiêu đề, 1 TOC trước khi thêm bảng |
| 28 | Mở Chèn → Bảng biểu và chọn lưới 4 cột × 5 hàng | PASS — tạo bảng 5×4 |
| 29 | Gõ 20 ô bằng bàn phím và Tab | PASS một phần — dữ liệu vào đủ; Tab cuối tạo thêm hàng thứ sáu |
| 30 | Xóa hàng dư, bật Hàng tiêu đề, lưu và mở lại | PASS — CDP/Word thấy 5×4 và hàng đầu lặp; FAIL mục tiêu phân trang/TOC động: 7 trang, Word không còn nhận TOC sau lần lưu thứ hai |
| 31 | Chọn đoạn thân bài, mở Tham chiếu → Chú thích trang | PASS — số chú thích 1 được chèn |
| 32 | Gõ nội dung chú thích bằng bàn phím | PASS — nội dung gắn với chú thích 1 |
| 33 | Mở Chú thích cuối và nhập nội dung | PASS — chú thích cuối đánh số La Mã i |
| 34 | Lưu DOCX và đọc lại bằng Word COM | PASS — `Footnotes=1`, `Endnotes=1`, `ReadOnly=true` |
| 35 | Mở DOCX trong phiên Writer mới | PASS — CDP hiển thị lại cả hai nội dung chú thích |
| 36 | Bật Theo dõi thay đổi và thay văn bản đã chọn | PASS — DOM có dấu `<ins>` và `<del>` |
| 37 | Chọn văn bản sửa, mở Thêm nhận xét và nhập nhận xét | PASS — nhận xét neo vào “scope.” |
| 38 | Lưu DOCX và kiểm tra Word COM ở chế độ chỉ đọc | PASS — `Comments=1`, `Revisions=2`, `ReadOnly=true` |
| 39 | Mở DOCX trong phiên Writer mới | PASS — CDP thấy 2 `<ins>`, 1 `<del>` và nội dung nhận xét |
| 40 | Chạy bài chèn ảnh Q13 với ảnh audit làm nguồn | PASS — ảnh được chèn, căn giữa, rộng 624/624 px vùng thân; đây là probe riêng, chưa lưu/mở lại trong báo cáo Q17 |
| 41 | Mở Trang đầu → Thay thế | PASS — hộp Tìm kiếm và Thay thế mở qua ribbon |
| 42 | Kiểm tra tùy chọn định dạng và biểu thức | PASS một phần — có lọc Đậm/Nghiêng/Phông/Màu và ký tự đại diện `*`, `?`; không thấy chế độ regex. Chưa áp dụng thay thế lên nội dung |
| 43 | Mở Trộn thư → Nguồn dữ liệu | PASS — hộp nguồn người nhận mở |
| 44 | Chọn Dán CSV / Thủ công | PASS |
| 45 | Nhập dòng tiêu đề `Name,Unit` | PASS |
| 46 | Nhập ba bản ghi Linh/Minh/An | PASS — bảng xem trước có đúng 3 người nhận |
| 47 | Lưu nguồn dữ liệu | PASS — model có 3 bản ghi được chọn |
| 48 | Chèn trường `Name` vào thư mới | PASS — tài liệu hiển thị trường trộn |
| 49 | Bật xem trước và chuyển bản ghi kế | PASS — lần lượt hiện Linh rồi Minh |
| 50 | Hoàn tất trộn tới tài liệu mới | PASS — thông báo hoàn tất 3 bản ghi, có ngắt trang giữa các bản |
| 51 | Lưu kết quả, mở phiên mới và đọc Word COM | PASS — cả 3 tên còn nguyên, Word COM đếm 3 trang, chỉ đọc |
| 52 | Ctrl+F2 mở xem trước báo cáo Q17 sau các lần lưu | FAIL — xem trước hiển thị 12 trang; Writer status và Word COM báo 7 trang |

## Ảnh minh chứng

- [Mục lục sau khi chèn](assets/q17-writer-2026-10-20/01-muc-luc.png)
- [Nội dung chương 1](assets/q17-writer-2026-10-20/02-chuong-1.png)
- [Bảng sau khi nhập và bật hàng tiêu đề](assets/q17-writer-2026-10-20/03-table-editor.png)
- [Bảng 5×4 sau khi mở lại](assets/q17-writer-2026-10-20/04-table-reopen.png)
- [Chú thích trang và cuối tài liệu](assets/q17-writer-2026-10-20/05-footnote-endnote.png)
- [Theo dõi thay đổi và nhận xét](assets/q17-writer-2026-10-20/06-trackchanges-comment.png)
- [Theo dõi thay đổi/nhận xét sau khi mở lại](assets/q17-writer-2026-10-20/07-review-reopen.png)
- [Hộp Tìm kiếm và Thay thế, bộ lọc định dạng](assets/q17-writer-2026-10-20/08-find-replace.png)
- [Kết quả trộn thư ba người sau khi mở lại](assets/q17-writer-2026-10-20/09-mail-merge-output.png)
- [Xem trước in lệch số trang](assets/q17-writer-2026-10-20/10-print-preview.png)

## Hạng mục Q17 chưa chạy

- Heading 3 và danh sách nhiều cấp: NOT RUN.
- Gộp ô và định dạng số trong bảng: NOT RUN.
- Chú thích cuối trang và chú thích cuối tài liệu: PASS — lưu/mở lại, Word COM đếm 1+1.
- Đầu/chân trang trang đầu khác biệt; số trang chẵn/lẻ; ngắt mục và đổi hướng ngang: NOT RUN.
- Chèn ảnh: PASS ở probe riêng, chưa lưu/mở lại. Chú thích ảnh và bao quanh văn bản: NOT RUN.
- Tìm/thay thế có định dạng: UI bộ lọc có sẵn nhưng chưa áp dụng thay thế, NOT RUN. Regex: NOT PRESENT trong hộp thoại; chỉ thấy ký tự đại diện `*`, `?`.
- Trộn thư CSV ba dòng, xem trước, hoàn tất, lưu/mở lại: PASS — tài liệu kết quả 3 trang.
- Theo dõi thay đổi và nhận xét: PASS — lưu/mở lại, Word COM đếm 2 revisions và 1 comment.
- Xem trước in: FAIL — hiện 12 trang trong khi Word COM và status Writer là 7. Xuất PDF và kiểm tra phông nhúng: NOT RUN.

## Gate cuối

- `npm test`: PASS — 3771/3771.
- `node scripts/audit-0610/i18n_parity.mjs`: PASS — VI=3110, EN=3110, thiếu 0 khóa mỗi ngôn ngữ.
- `python scripts/audit-0610/verify_checklist_evidence.py --all --no-fix`: PASS — 0 dòng bị hạ (Word 279, Excel 217, PowerPoint 269).
- `python -m pytest tests -q -k "writer or docx or ooxml"`: PASS — 342 passed, 759 deselected (372.60s).
- Không có sửa source ứng dụng; không có test sửa lỗi FAIL-trước/PASS-sau.
