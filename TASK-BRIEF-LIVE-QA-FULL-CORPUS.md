# Nhiệm vụ: Mở rộng kiểm tra thị giác luồng Mở file THẬT sang toàn bộ kho file .docx thật

## Bối cảnh

Nhiệm vụ trước (`docs/HANDOFF-WRITER-LIVE-OPEN-PATH-VISUAL-QA.md`, đã
merge vào `main`) đã kiểm tra thị giác 4/15 file `.docx` thật qua đúng
luồng production (`main.VnOfficeApi.open_document_dialog("writer")`,
KHÔNG phải `parseFodt()`), tìm và sửa 1 lỗi CSS thật nghiêm trọng (thuộc
tính `align="center"/"right"` bị `text-align:justify` đè bẹp), và phát
hiện (chưa sửa, đã sửa ở commit riêng sau đó) 1 lỗi Python thật (ảnh vỡ
khi tên file có dấu tiếng Việt/khoảng trắng — ĐÃ SỬA, xem
`docs/HANDOFF-MAIN-INLINE-IMAGES-URL-DECODE.md`).

Toàn bộ 15/15 file `.docx` thật trong `file test/` giờ đã PARSE được
qua `parseFodt()` (bộ test FODT), nhưng đó là luồng KHÁC — nhiệm vụ này
kiểm tra luồng THẬT (HTML) trên **11 file còn lại chưa được kiểm tra
bằng mắt**.

## Việc cần làm

1. Đọc lại `docs/HANDOFF-WRITER-LIVE-OPEN-PATH-VISUAL-QA.md` và
   `scripts/generate_live_open_payloads.py` để hiểu đúng phương pháp
   đã dùng (gọi THẬT `main.VnOfficeApi.open_document_dialog()`, không
   mô phỏng).
2. Mở rộng `scripts/generate_live_open_payloads.py` (hoặc tạo bản sao)
   để chạy qua **11 file còn lại**:
   ```
   E:\VN OFice\file test\gói sữa chữa tháng 04-2026\Biên bản hoàn thiện hợp đồng.docx
   E:\VN OFice\file test\GÓI THẦU MUA SẮM MÁY BẢO MẬT\MUA SĂM  MAY MÓC QT\MUA SĂM  MAY MÓC BẢO MẬT\12. HĐ VÀ NGHIỆM THU, THANH LÝ.docx
   E:\VN OFice\file test\GÓI THẦU MUA SẮM MÁY BẢO MẬT\MUA SĂM  MAY MÓC QT\MUA SĂM  MAY MÓC BẢO MẬT\1. QĐ thành lập TỔ MUA SẮM.docx
   E:\VN OFice\file test\GÓI THẦU MUA SẮM MÁY BẢO MẬT\MUA SĂM  MAY MÓC QT\MUA SĂM  MAY MÓC BẢO MẬT\2. Tờ trìn khlcnt.docx
   E:\VN OFice\file test\gói sữa chữa tháng 8 -2026\HĐ VÀ NGHIỆM THU, THANH LÝ.docx
   E:\VN OFice\file test\gói sữa chữa tháng 8 -2026\hợp đồng sửa chữa 3T- UBXQT.docx
   E:\VN OFice\file test\gói sữa chữa tháng 8 -2026\Biên bản hoàn thiện hợp đồngg.docx
   E:\VN OFice\file test\GÓI THẦU MUA SẮM MÁY BẢO MẬT\MUA SĂM  MAY MÓC QT\MUA SẮM MÁY PHOTO\1. QĐ thành lập TỔ MUA SẮM.docx
   E:\VN OFice\file test\GÓI THẦU MUA SẮM MÁY BẢO MẬT\MUA SĂM  MAY MÓC QT\MUA SẮM MÁY PHOTO\2. Tờ trìn khlcnt.docx
   E:\VN OFice\file test\GÓI THẦU MUA SẮM MÁY BẢO MẬT\MUA SĂM  MAY MÓC QT\MUA SẮM MÁY PHOTO\8. Biên bản hoàn thiện hợp đồng.docx
   E:\VN OFice\file test\GÓI THẦU MUA SẮM MÁY BẢO MẬT\MUA SĂM  MAY MÓC QT\MUA SẮM MÁY PHOTO\12. HĐ VÀ NGHIỆM THU, THANH LÝ (Autosaved).docx
   ```
3. Mở rộng `tests/live/writer-live-open-qa.playwright.mjs` (hoặc viết
   test mới cùng phong cách) để chạy qua 11 file này, chụp ảnh màn hình
   bằng chứng, đối chiếu bằng mắt: bảng biểu, ảnh nhúng, tiêu đề/quốc
   hiệu/ngày tháng có căn giữa/phải đúng không (đã sửa CSS lần trước,
   xác nhận áp dụng đúng trên các file mới), lỗi ký tự ô vuông, tràn
   trang ngang.
4. Nếu tìm thêm lỗi CSS/hiển thị thuần túy (không phải kiến trúc
   Python), sửa an toàn trong phạm vi hẹp như lần trước. Nếu tìm thấy
   vấn đề kiến trúc Python/backend, CHỈ ghi vào báo cáo, KHÔNG tự sửa
   `main.py`.

## Kiểm thử bắt buộc

- `node scripts/check-syntax.js`: 89/89 PASS.
- `node tests/run-tests.js`: không giảm so với hiện tại (chạy trước để
  biết số nền — hiện tại 1511).
- `node tests/live/ribbon-audit-1280.playwright.mjs`: 100% PASS nếu có
  sửa CSS.
- Cập nhật `docs/HANDOFF-WRITER-LIVE-OPEN-PATH-VISUAL-QA.md` (nối
  thêm mục cho 11 file mới) hoặc tạo file mới nối tiếp — tùy bạn, miễn
  rõ ràng.
- SAU KHI HOÀN THÀNH: chạy `git log --oneline main..HEAD` và
  `git status`, dán NGUYÊN VĂN kết quả thật vào báo cáo.

## Ranh giới an toàn

- KHÔNG sửa `main.py` hay bất kỳ file Python nào.
- KHÔNG sửa `adapters/libreoffice/writer/writer-adapter.js`
  (parseFodt/serializeToFodt — luồng khác).
- KHÔNG đụng Sheet/Slides.
- Commit trên nhánh hiện tại của worktree khi xong, KHÔNG merge vào
  main, KHÔNG push.
