# E1 — Bộ hàm Excel 2016

## Mục tiêu

Lập danh mục hàm mà VN Sheet thực sự tính được, đối chiếu từng hàm với Microsoft Excel 2016 bản cài trên máy qua COM chỉ đọc, ghi rõ các trường hợp đối số thường/rỗng/lỗi/kiểu trộn/cột đầy đủ/mảng, sửa sai khác có thể tái hiện và bổ sung các hàm Excel 2016 thiết thực còn thiếu.

## Khả năng hiện tại

- Lõi tính toán nằm trong `apps/sheet/formula-engine.js`; danh mục gợi ý được hợp nhất từ `apps/sheet/formula-definitions-vi.js`.
- Danh mục gợi ý hiện rộng hơn các nhánh tính toán thực tế, nên phải tách `implemented`, `partial`, `unsupported` thay vì coi metadata là hỗ trợ.
- Bộ kiểm tra đơn vị hiện nằm tại `tests/unit/*formula*.test.js`; ứng dụng desktop và CDP nằm trong `tests/live/cdp/`.
- Tệp chuẩn Excel do VN Sheet ghi ra; Excel 2016 mở chỉ đọc và chỉ trả kết quả/thuộc tính. Mỗi lần chỉ mở một tệp; tiến trình Excel chỉ do lượt kiểm tra tạo mới mới được đóng theo PID.

## Phạm vi và tệp dự kiến

- `apps/sheet/formula-engine.js`: chỉ sửa cách tính các hàm có sai khác được xác nhận hoặc bổ sung hàm thiếu.
- `apps/sheet/formula-definitions-vi.js`: thêm metadata tiếng Việt đúng cho hàm mới.
- `tests/unit/`: thêm kiểm thử hồi quy riêng cho hành vi đã đối chiếu; không sửa expected cũ để làm xanh.
- `docs/EXCEL2016-FUNCTIONS-MATRIX.md`: danh mục, trạng thái triển khai, ca đối chiếu và kết quả Excel 2016 theo từng hàm/nhóm.
- `platform/help/entries-sheet.js` và i18n VI/EN chỉ khi có hành vi/hàm mới cần nội dung hướng dẫn trong ứng dụng.

## Phụ thuộc và ranh giới

- Không thêm phụ thuộc ngoài.
- Không sửa LibreOffice Core, bộ lưu/mở XLSX hoặc định dạng tệp.
- Excel COM chỉ mở read-only tệp do VN Sheet tạo; không điều khiển/đóng Excel người dùng.
- Đối chiếu desktop dùng CDP và input chuột/phím CDP; không dùng SendKeys hay input hệ điều hành.

## Rủi ro

- Excel 2016 không có một số hàm mới hơn (ví dụ XLOOKUP); các hàm đó phải được đánh dấu ngoài chuẩn E1, không được lấy làm tiêu chí tương đương Excel 2016.
- Ngày giờ, hàm ngẫu nhiên, locale và phép tính dấu phẩy động có thể khác giữa các lượt; ma trận phải ghi rõ dung sai hoặc tính không xác định.
- Mảng động không thuộc Excel 2016; kiểm tra mảng chỉ áp dụng ngữ nghĩa mảng/ma trận sẵn có ở Excel 2016.

## Kiểm tra

- Ca trong ma trận được nhập/tính trong VN Sheet desktop qua CDP thật; lưu một XLSX cho mỗi lượt kiểm Excel, sau đó đọc cache/giá trị bằng COM `Workbooks.Open(..., ReadOnly=$true)`.
- Chạy kiểm thử đơn vị liên quan sau mỗi nhóm; cuối luồng chạy nguyên cổng theo `docs/PLAN-EXCEL-2016-NIGHT-1213.md`: `npm test`, `python -m unittest discover -s tests`, batch 8 XLSX, đối chiếu cache 28 XLSX không thấp hơn mốc 0.9.9, và quét UTF-8/BOM/mojibake.

## Đường lui

- Mỗi nhóm thay đổi được commit riêng trên `fix/excel-e1-codex` sau khi hoàn tất.
- Nếu một sửa đổi làm thay đổi kết quả ngoài ca đã xác nhận, revert riêng commit nhóm đó; không đổi fixture/expected để che sai khác.
