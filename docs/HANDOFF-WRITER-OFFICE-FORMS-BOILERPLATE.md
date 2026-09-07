# HANDOFF: VN Writer — File .doc thật của người dùng không mở được (office:forms)

## Bối cảnh phát hiện

Trong lúc chủ động rà soát thêm các file thật trong `file test/` (tiếp
nối phương pháp "test bằng file thật" người dùng yêu cầu từ đầu phiên),
thử mở file **thật** `Giấy đề nghị thanh toán 08-2026.doc` (file định
dạng .doc nhị phân cũ, không phải .docx) qua vòng chuyển đổi soffice
thật (.doc → FODT) → `parseFodt()`:

```
LỖI: Writer FODT Phase A không hỗ trợ nội dung này: phần tử FODT block <office:forms>
```

File này là một văn bản hành chính bình thường (giấy đề nghị thanh
toán, có quốc hiệu/tiêu ngữ chuẩn) — KHÔNG hề chứa form tương tác nào
(checkbox, ô nhập liệu) mà người dùng có thể thấy khi mở bằng Word thật.

## Nguyên nhân gốc

Kiểm tra FODT thật do soffice tạo ra:
```xml
<office:text>
   <office:forms form:automatic-focus="false" form:apply-design-mode="false"/>
   <text:sequence-decls>...</text:sequence-decls>
   <text:p>...</text:p>
```

`<office:forms>` RỖNG (tự đóng thẻ) — chỉ là khai báo CHẾ ĐỘ THIẾT KẾ
FORM của chính LibreOffice (không mang bất kỳ control/nội dung người
dùng nào) — LibreOffice LUÔN ghi phần tử này khi convert file .doc/.docx
CŨ, bất kể tài liệu có dùng form hay không. Đây là **CÙNG LỚP LỖI** đã
xác nhận và sửa trước đó cho `text:sequence-decls` (xem comment ngay
trước đoạn sửa trong code, và file test
`tests/unit/writer-fodt-real-docx-parsing.test.js`) — một phần tử
boilerplate thuần túy do LibreOffice tự ghi, KHÔNG mang nội dung người
dùng, nhưng bị code cũ coi là "nội dung lạ chưa hỗ trợ" và ném lỗi làm
hỏng TOÀN BỘ tài liệu.

## Giải pháp

Thêm 1 điều kiện bỏ qua `office:forms` vào ĐÚNG vòng lặp đã xử lý
`text:sequence-decls` (trong `parseFodt()`, vòng `for (const node of
tree.children)`) — không viết logic mới, chỉ mở rộng danh sách phần tử
boilerplate an toàn để bỏ qua.

## Kiểm thử

- `node scripts/check-syntax.js`: 89/89 PASS.
- `node tests/run-tests.js`: 1502/1502 PASS (thêm 2 test mới vào
  `writer-fodt-real-docx-parsing.test.js`, mẫu theo đúng 2 test đã có
  cho `text:sequence-decls`: bỏ qua đúng, và tài liệu không có phần tử
  này vẫn hoạt động bình thường).
- `node tests/live/ribbon-audit-1280.playwright.mjs`: 100% PASS.
- Xác nhận trực tiếp trên FILE THẬT của người dùng: `parseFodt()` trên
  FODT chuyển đổi thật từ `Giấy đề nghị thanh toán 08-2026.doc` giờ
  thành công, nội dung "CỘNG HOÀ XÃ HỘI CHỦ NGHĨA VIỆT NAM / Độc lập -
  Tự do - Hạnh phúc / GIẤY ĐỀ NGHỊ..." hiển thị đúng.

## Ghi chú

Đây là ví dụ điển hình cho việc test bằng file thật (không chỉ test
tổng hợp) tiếp tục phát hiện lỗi thật mà test tự tạo không lường trước
được — file .doc cũ (không phải .docx) là một định dạng khác hẳn về mặt
container (OLE nhị phân, không phải ZIP OOXML), và soffice's convert
path cho .doc có thể ghi ra các boilerplate khác với .docx (ở đây là
`office:forms`) mà chưa được kiểm thử trước đó trong phiên này.
