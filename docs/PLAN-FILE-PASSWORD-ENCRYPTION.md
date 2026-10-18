# Kế hoạch: Mã hóa tệp bằng mật khẩu (DOCX / XLSX / PPTX)

Trạng thái: **kế hoạch, chờ chủ duyệt** (AGENTS.md mục 6 và 11: ranh giới bảo mật, dòng lưu tệp, có thể thêm phụ thuộc). Chưa viết mã.
Đây là mục ưu tiên 1 còn lại của cả ba checklist (Word, Excel, PowerPoint): "Bảo vệ tài liệu: Mật khẩu mở tệp (mã hóa)".

## 1. Mục tiêu
- Người dùng chọn Tệp > Thông tin > **Mã hóa bằng mật khẩu**, nhập mật khẩu hai lần; khi lưu, tệp DOCX/XLSX/PPTX được mã hóa và Microsoft Office/LibreOffice thật mở được khi nhập đúng mật khẩu.
- Mở tệp đã mã hóa trong VN Office: hỏi mật khẩu, mở bình thường; sai mật khẩu báo rõ, không treo.
- Xóa mật khẩu: cùng hộp thoại, để trống rồi lưu.

## 2. Hiện trạng (đã đọc mã)
- Đường lưu: JS dựng FODT/FODS/FODP -> `main.py` gọi `soffice --convert-to` -> `adapters/libreoffice/common/ooxml_zip_patch.py` vá lại gói OOXML (nhiều bước khôi phục định dạng) -> ghi tệp. Gói đã vá là ZIP; **mã hóa chỉ làm được sau cùng**, vì gói mã hóa là vùng chứa OLE không vá được nữa.
- `cryptography` 50.x đã có trong môi trường Python hiện tại; `olefile` và `msoffcrypto-tool` thì không.
- Mở: `soffice` đọc được tệp mã hóa nếu được truyền mật khẩu (thuộc tính `Password` của bộ lọc nạp) — cần đo bằng CLI/UNO thật trước khi chốt.

## 3. Hai phương án
**A. Để LibreOffice mã hóa lúc `--convert-to`** (bộ lọc xuất có tùy chọn `Password`).
- Ưu: không thêm mã mật mã.
- Nhược: mọi bước vá `ooxml_zip_patch` chạy SAU khi soffice xuất nên không áp lên gói đã mã hóa; hoặc phải vá trước rồi cho soffice nạp lại và lưu có mật khẩu (mất toàn bộ phần khôi phục định dạng). **Không chấp nhận được** vì phá độ trung thực lưu.

**B. Tự mã hóa gói đã vá theo ECMA-376 "Agile Encryption" (khuyến nghị)**: sau bước vá cuối, bọc ZIP vào vùng chứa OLE (CFB) gồm luồng `EncryptionInfo` + `EncryptedPackage`.
- Thuật toán chuẩn Office 2010+: AES-256-CBC, SHA-512, 100 000 vòng băm, khóa dữ liệu ngẫu nhiên bọc bằng khóa dẫn xuất từ mật khẩu, HMAC bảo toàn dữ liệu.
- Thành phần: (1) bộ ghi CFB tối giản (~200 dòng, tự viết); (2) mã hóa/giải mã Agile bằng `cryptography` (giấy phép Apache-2.0/BSD, không tính phí); (3) bộ mở: nếu tệp là CFB thì giải mã trước khi đưa soffice (soffice không cần mật khẩu).
- Nơi đặt: `platform/os_services` không liên quan; mã nằm ở `adapters/libreoffice/common/ooxml_encryption.py` (dùng chung ba ứng dụng), lệnh gọi ở `main.py` quanh bước ghi/mở.
- Ưu: giữ nguyên toàn bộ độ trung thực lưu; một mã cho cả ba ứng dụng; đo được bằng Office thật.
- Nhược: mã mật mã tự viết cần kiểm chéo kỹ (Word/Excel/PowerPoint COM mở bằng `Documents.Open(..., PasswordDocument:=...)`, LibreOffice mở, và vectơ thử từ MS-OFFCRYPTO).

## 4. Bảo mật và quyền riêng tư
- Mật khẩu chỉ nằm trong bộ nhớ tiến trình trong lúc lưu/mở; **không ghi đĩa, không ghi nhật ký, không gửi ra ngoài, không lưu trong autosave/recovery** (tệp phục hồi tự động phải được mã hóa cùng mật khẩu hoặc không sao lưu nội dung khi tài liệu đang đặt mật khẩu).
- Cảnh báo trong hộp thoại: quên mật khẩu thì không khôi phục được tệp.
- Không đưa nội dung hay mật khẩu cho AI/đám mây.
- Giới hạn độ dài tối thiểu 1 ký tự, tối đa 255; nhập hai lần để xác nhận.

## 5. Phạm vi mã và tệp ảnh hưởng
`adapters/libreoffice/common/ooxml_encryption.py` (mới), `main.py` (ghi/mở), `platform/dialogs/` hộp thoại mật khẩu dùng chung, `apps/*/` mục Tệp > Thông tin, `platform/commands/command-definitions.js`, i18n VI/EN, Help (ba ứng dụng), autosave/recovery, `tests/`.

## 6. Kiểm thử (bắt buộc trước khi gộp)
1. Đơn vị Python: vectơ chuẩn MS-OFFCRYPTO, khứ hồi mã hóa/giải mã, mật khẩu sai, gói hỏng.
2. Khứ hồi: DOCX/XLSX/PPTX do VN Office lưu có mật khẩu -> Office COM (Word/PowerPoint; Excel khi hết khóa) mở bằng mật khẩu, đọc đúng nội dung; mật khẩu sai báo lỗi.
3. Ngược lại: tệp mã hóa do Office thật tạo -> VN Office mở đúng.
4. CDP giao diện: hộp thoại, sai mật khẩu, bỏ mật khẩu, hoàn tác không ảnh hưởng.
5. Hồi quy: cả bộ LAN Word/Slides hiện có (chưa đặt mật khẩu thì byte đầu ra không đổi).
6. Kiểm tra không rò rỉ: tìm mật khẩu trong nhật ký, tệp tạm, autosave.

## 7. Rủi ro và hoàn nguyên
- Rủi ro chính: lỗi chi tiết định dạng Agile làm Office báo tệp hỏng -> đo bằng COM trước khi bật nút; nút chỉ hiện khi bài kiểm tra COM đạt.
- Tệp tạm trong lúc mã hóa phải xóa an toàn; lỗi giữa chừng không được để lại bản chưa mã hóa mà người dùng tưởng đã mã hóa (ghi tệp đích bằng đổi tên nguyên tử sau khi mã hóa xong).
- Hoàn nguyên: tính năng nằm sau một cờ và một mô-đun mới; gỡ nút và mô-đun là về nguyên trạng.

## 8. Câu hỏi cần chủ quyết
1. Đồng ý phương án B và dùng `cryptography` (Apache-2.0/BSD, không tính phí) làm phụ thuộc đóng gói cùng ứng dụng?
2. Mức mã hóa: chỉ Agile AES-256 (Office 2010+), hay thêm chế độ tương thích cũ (Standard/RC4 cho Office 2007)? Khuyến nghị chỉ Agile.
3. Autosave/recovery của tài liệu đã đặt mật khẩu: không sao lưu nội dung (an toàn hơn, mất bản khôi phục) hay sao lưu có mã hóa cùng mật khẩu?
4. Thời điểm: làm ngay sau khi duyệt, hay sau đợt Codex trở lại (23/10) để Codex làm bộ ghi CFB?
