# Q26 — Hồ sơ hành chính và mẫu biểu trong Writer (20/10/2026)

## Môi trường và cách kiểm tra

- Nhánh `codex/queue-19-10`, worktree `E:\VNOffice-codex-queue`; `git merge main` trả `Already up to date`.
- `CODEX-COMMON-RULES.md` không có trong worktree. Đã đọc `AGENTS.md`, Q17 (`docs/EXPLORE-WRITER-2026-10-20.md`), Q19 (`docs/Q19-MAILMERGE-FINDING.md`), Q13/Q17 harness và `docs/EXPLORE-WRITER-19-10.md`.
- Tạo/lưu bằng app desktop qua CDP `launchApp("writer")`, adapter lưu DOCX; mỗi phiên dùng `VNO_CDP_LOCALAPPDATA` mới. Mở lại từng DOCX trong phiên app mới. Word COM mở ẩn, chỉ đọc.
- Ba tệp kết quả: `docs/assets/q26-writer-2026-10-20/A-cong-van.docx`, `B-bien-ban.docx`, `C-mau-bieu.docx`.

## Nhật ký 36 thao tác/đối chiếu

| # | Thao tác hoặc phép đo | Kết quả |
|---:|---|---|
| 1 | Kiểm tra worktree và nhánh được giao | PASS — `codex/queue-19-10` |
| 2 | Hợp nhất `main` trước khi làm | PASS — đã đồng bộ |
| 3 | Khởi chạy phiên Writer CDP mới để soạn công văn | PASS |
| 4 | Đặt giấy A4, dọc | PASS — Word COM `595.3 × 841.9 pt` |
| 5 | Đặt lề trái 30 mm | PASS — Word COM 30 mm |
| 6 | Đặt lề phải 20 mm | PASS — Word COM 20 mm |
| 7 | Đặt lề trên 20 mm | PASS — Word COM 20 mm |
| 8 | Đặt lề dưới 20 mm | PASS — Word COM 20 mm |
| 9 | Đưa tên cơ quan và số/ký hiệu vào đầu văn bản | PASS — `ỦY BAN NHÂN DÂN QUẬN MINH AN`, `42/UBND-VP` |
| 10 | Đưa quốc hiệu, tiêu ngữ vào cột phải, căn giữa và in đậm | PASS — DOCX mở lại đủ hai dòng |
| 11 | Thêm địa danh và ngày tháng | PASS |
| 12 | Thêm tên loại và trích yếu công văn | PASS — tên loại 14 pt đậm; trích yếu căn giữa |
| 13 | Thêm dòng kính gửi và căn cứ thực hiện | PASS |
| 14 | Thêm mục 1 và hai khoản đánh số | PASS |
| 15 | Thêm mục 2 và ba khoản đánh số | PASS |
| 16 | Tạo ngắt trang trước mục 3 | PASS — Word COM tài liệu 2 trang |
| 17 | Thêm mục 3, thời hạn và trách nhiệm | PASS |
| 18 | Thêm “Nơi nhận” với ba dòng gạch đầu dòng | PASS |
| 19 | Thêm khối ký tên 2 cột không viền | PASS — bảng cuối 1×2, không viền nhìn thấy |
| 20 | Đặt font nội dung và bảng công văn | PASS — Times New Roman 13 pt đọc qua Word COM |
| 21 | Bật trang đầu khác biệt và số trang ở footer | PASS — `DifferentFirstPageHeaderFooter=-1`; PAGE field có trong DOCX |
| 22 | Bật chế độ trang chẵn/lẻ khác nhau | PASS — Word COM `OddAndEvenPagesHeaderFooter=true` (lỗi Q17 không tái hiện) |
| 23 | Lưu DOCX công văn và mở trong phiên app mới | PASS — nội dung, bảng, lề và metadata trang còn nguyên |
| 24 | Khởi chạy phiên Writer CDP mới để soạn biên bản | PASS |
| 25 | Thêm tên biên bản, thời gian, địa điểm, chủ trì, thư ký | PASS |
| 26 | Tạo bảng điểm danh 5 cột, 1 hàng tiêu đề + 6 người | PASS — Word COM 7×5 |
| 27 | Bật lặp hàng tiêu đề bảng điểm danh | PASS — `Rows(1).HeadingFormat=true` |
| 28 | Thêm nội dung họp, kết luận và bảng hành động có hạn | PASS — 4×5, ba hành động có ngày hạn |
| 29 | Thêm chú thích về cách tính hạn | PASS |
| 30 | Thêm vùng ký chủ trì/thư ký 2 cột | PASS — bảng 1×2 |
| 31 | Lưu/mở lại biên bản trong phiên app mới | PASS — 2 trang, 3 bảng; danh sách 6 người còn nguyên |
| 32 | Thử lệnh Xuất PDF từ giao diện CDP | BLOCKED — hộp thoại lưu/kết quả không xuất hiện trong WebView sau timeout; CDP không thể thao tác hộp thoại hệ điều hành; chưa có PDF |
| 33 | Khởi chạy phiên Writer mới để soạn mẫu biểu | PASS |
| 34 | Đặt mẫu biểu A4 ngang và lề 18/20/18/20 mm | PASS — Word COM hướng ngang, lề tương ứng |
| 35 | Tạo bảng 8 cột × 15 hàng, tiêu đề tô màu và hàng đầu lặp | PASS — Word COM xác nhận 15×8 và `HeadingFormat=true` |
| 36 | Căn phải các cột số, thêm tổng cộng bằng chữ, lưu/mở lại | PASS — 2 trang, 8 cột và 15 hàng còn nguyên |

## Kiểm tra bổ sung

- Word COM (ẩn, chỉ đọc): A công văn 2 trang, A4 dọc, lề `[trên 20, phải 20, dưới 20, trái 30]` mm, Times New Roman 13 pt, `DifferentFirstPageHeaderFooter=-1`, `OddAndEvenPagesHeaderFooter=true`.
- Word COM: B biên bản 2 trang; bảng điểm danh 7×5 và `HeadingFormat=true`; bảng hành động 4×5.
- Word COM: C mẫu biểu 2 trang; A4 ngang; bảng 15×8 và `HeadingFormat=true`.
- CDP spellcheck kiểm câu “Ủy ban nhân dân UBND; công ty TNHH; Nghị định 30/2020/NĐ-CP”: 0 lỗi; `UBND`, `TNHH`, `NĐ`, `CP` đều được nhận diện là từ hợp lệ.
- CDP Tìm kiếm và Thay thế: mở được; có Định dạng (đậm/nghiêng/màu) và ký tự đại diện. Bài Q17 tích hợp đạt 6/7; mục đọc lại bị timeout do so sánh đường dẫn short/long của Windows, không kết luận DOCX bị mất. Chưa kiểm tra một thao tác thay thế định dạng end-to-end.
- Bản PDF không được tạo. Máy không tìm thấy executable chuyển PDF cục bộ; mục này còn BLOCKED.

## Cổng và handoff

- `node tests/run-tests.js`: PASS — 3778/3778.
- `node scripts/audit-0610/i18n_parity.mjs`: PASS — VI=3122, EN=3122, missing=0.
- `python scripts/audit-0610/verify_checklist_evidence.py --all --no-fix`: PASS — 0 dòng hạ; Writer 279, Sheet 217, Slides 269.
- `python -m pytest tests -q -k "writer or docx or ooxml"`: PASS — 344 passed, 766 deselected (372,51 giây).
- Batch DOCX trên thư mục `E:\VN OFice\file test\landocx`: PASS — 8/8 (`d01,d02,d03,d05,d07,d08,d09,d11`), mọi tệp lưu/chỉnh sửa được, page delta=0. Báo cáo nằm trong thư mục tạm `vno-q26-batch8-bf0ac53c6d6149238b6adc7b074389a0`.
- Có 24 DOCX trong thư mục nguồn, không phải 8; lượt tự chọn mặc định đã dừng sau 9 tệp để giới hạn phạm vi. Batch kết thúc được chạy lại với đúng 8 tệp nhỏ đã chỉ định ở trên.
- Không sửa mã sản phẩm. Không phát hiện sai khác COM về trang đầu/chẵn-lẻ để tạo sửa lỗi; PDF native save còn là blocker đã thấy từ Q17. Không có feature mới cần thêm Help/i18n hoặc tăng command count.
- Handoff theo mẫu: `09-templates/AGENT-HANDOFF.md`.
