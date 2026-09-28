# Findings — Writer legacy `.doc` pagination, đợt 2

## Phạm vi và cách đo

Đã chạy lại `_batch_writer.py` trên nhánh `fix/writer-legacy-doc2-codex` với
`LOCALAPPDATA=E:\VNOffice-profiles\codex` cho `legacy09.doc`–`legacy20.doc`.
Nguồn tài liệu là `E:\VN OFice\file test\lan-legacy`; không có tài liệu thật
nào được đưa vào Git. Bản lưu được mở lại bằng Word oracle của batch. Các file
01–08 dưới đây lấy từ lần đo trên nhánh hiện tại lúc 18:58 ngày 28/09/2026.

| File | Word nguồn | Canvas | Bản lưu Word | Kết quả mở/sửa/lưu |
|---|---:|---:|---:|---|
| legacy01.doc | 5 | 5 | 5 | OK |
| legacy02.doc | 4 | 4 | 4 | OK |
| legacy03.doc | 4 | 4 | 4 | OK |
| legacy04.doc | 11 | 11 | 11 | OK |
| legacy05.doc | 7 | 7 | 7 | OK |
| legacy06.doc | 3 | 3 | 4 | Lệch sau lưu |
| legacy07.doc | 4 | 4 | 4 | OK |
| legacy08.doc | 7 | 7 | 7 | OK |
| legacy09.doc | 1 | 1 | 1 | OK |
| legacy10.doc | 2 | 2 | 2 | OK |
| legacy11.doc | 1 | 1 | 1 | OK |
| legacy12.doc | 4 | 4 | 4 | OK |
| legacy13.doc | 1 | 1 | 2 | Lệch sau lưu |
| legacy14.doc | 15 | 15 | 15 | OK; lỗi 15→18 trong báo cáo cũ đã hết |
| legacy15.doc | 2 | 2 | 2 | OK |
| legacy16.doc | 4 | 4 | 4 | OK |
| legacy17.doc | 3 | 3 | 3 | OK; lỗi 3→2 trong báo cáo cũ đã hết |
| legacy18.doc | 3 | 2 | 2 | Lệch ở canvas và sau lưu |
| legacy19.doc | 3 | 3 | 3 | OK |
| legacy20.doc | 1 | 1 | Không đo được | Word bị chặn bởi modal error dialog đến hết timeout |

Các báo cáo nguồn: `E:\VNOffice-profiles\codex\legacy-doc-findings\batch-final\_batch_writer_report.md`
(01–08) và `E:\VNOffice-profiles\codex\legacydoc-wave2-current\_batch_writer_report.md`
(09–20). Với các file `.doc`, cột thống kê cấu trúc OOXML của batch là `None`
vì nguồn nhị phân không phải ZIP/OOXML. Bản lưu của 09–20 có `ZZ` không được
batch báo trong cột tương ứng (`-`), nên chưa coi đó là bằng chứng xác nhận nội
dung chỉnh sửa sau lưu.

## Chẩn đoán theo lớp

| File | Lớp đang định vị được | Đoạn đầu tiên lệch / nguyên nhân gốc |
|---|---|---|
| legacy06.doc | Xuất/lưu `.doc` từ canvas: canvas 3 trang đúng, Word mở bản lưu thấy 4 | Chưa xác định. Cần đối chiếu DOCX trung gian với DOCX lưu và kiểm tra trang Word sau từng bước xuất. |
| legacy13.doc | Xuất/lưu: canvas 1 trang đúng, bản lưu thành 2 | Chưa xác định; đây là lỗi mới trong lần đo hiện tại, cần tìm xem trang thừa phát sinh ở hậu xử lý DOCX hay Word mở output. |
| legacy18.doc | Import/phân trang trên canvas: Word 3 trang, canvas 2; bản lưu tiếp tục 2 | Chưa xác định; điểm đầu lệch thuộc trước bước lưu. Cần so sánh `.doc` mở trực tiếp với DOCX trung gian từ LibreOffice. |
| legacy20.doc | Không đủ bằng chứng về bước lưu | Word oracle trả timeout do modal error dialog; canvas 1 trang và app báo loaded, nhưng kết quả bản lưu không thể kết luận. |

`_word_para_pages.ps1` nêu trong task brief không tồn tại trong worktree hay
profile Codex. `_word_para_metrics.ps1` có sẵn nhưng chỉ lấy vị trí đoạn trong
Word; batch hiện tại không xuất map đoạn canvas. Vì vậy chưa thể nêu tên đoạn
đầu tiên lệch một cách có căn cứ. Không suy diễn điểm lệch từ số trang tổng.
Phần này là blocker chẩn đoán cụ thể cần giải quyết trước khi chốt bản sửa.

## Đối chiếu báo cáo đợt trước

Trên code của nhánh hiện tại, hai lỗi từ báo cáo Claude đã tự hết: `legacy14`
đã đổi từ bản lưu 18 trang về 15, và `legacy17` từ 2 về 3. `legacy18` còn lệch
canvas 2 trang. Lỗi `legacy13` và lỗi lưu `legacy06` xuất hiện trong số đo gần
đây; cần xác nhận lại bộ 01–08 cùng cấu hình Word trước khi coi đây là hồi quy
mới, vì lần đo 01–08 có trước lần chạy 09–20.

## Ranh giới nguyên nhân và bước kế tiếp

Chưa có nguyên nhân gốc được chứng minh cho `legacy06`, `legacy13`, hoặc
`legacy18`; chưa sửa code. Thứ tự điều tra: (1) tạo map đoạn Word và canvas có
thể ghép cặp; (2) so sánh `.doc` gốc, DOCX trung gian LibreOffice, DOCX xuất
trước/sau hậu xử lý; (3) chỉ sửa Writer adapter/platform layer nếu khác biệt
được xác nhận, không sửa LibreOffice Core; (4) thêm unit test cho từng quy tắc
được chứng minh. `legacy20` cần xử lý modal Word riêng để phép đo lưu có kết quả.

### Lệnh đã chạy

- `python scripts/layout-audit/_batch_writer.py . "E:\VN OFice\file test\lan-legacy" "E:\VNOffice-profiles\codex\legacydoc-wave2-current" legacy09.doc ... legacy20.doc`
- `Get-Content` báo cáo 01–08 trong profile Codex.
- Tìm `_word_para_pages.ps1` trong worktree và `E:\VNOffice-profiles`; không tìm thấy.

Kết quả đo batch: 09–19 đều mở và sửa được; 20 mở và sửa được nhưng bước
Word page-count bị timeout. Findings này chỉ ghi số đo và giới hạn hiện biết;
chưa phải xác nhận PASS cho tính năng.

## Chẩn đoán bổ sung sau khi ghép map đoạn và thử các filter

`legacy06.doc` đã được chạy lại trực tiếp trong worktree lúc 21:25 với
`_batch_writer.py`: Word/canvas/bản lưu lần lượt **3/3/3**. Số 3/3/4 trong
bảng 01–08 phía trên thuộc báo cáo trước đó và không còn tái hiện.

### legacy13.doc — DOC filter làm đổi wrapping ảnh ở đoạn đã sửa

Word gốc và canvas đều có 1 trang; bản lưu của batch có 2. So sánh Word từng
đoạn cho thấy đoạn đầu tiên bị đẩy là đoạn 2, “Ngày lập phiếu…”, từ y=120 pt
lên y=177 pt (+57 pt). Đoạn 1 chứa ảnh nổi: Word gốc dùng `wp:wrapSquare`; bản
lưu `.doc` sau khi chuyển lại DOCX dùng `wp:wrapTopAndBottom`. Như vậy filter
DOC đặt dòng chữ xuống dưới ảnh, làm dịch nội dung phía sau và tràn trang.

Đã thử các giá trị wrapping trên DOCX trung gian rồi xuất bằng filter `.doc`:

| Wrapping trước DOC filter | Trang Word sau lưu |
|---|---:|
| `wrapSquare` | 2 |
| `wrapTopAndBottom` | 2 |
| `wrapNone` | 1 |

Với biến thể `wrapNone`, y và số dòng các đoạn đầu trùng Word gốc. Sửa sẽ chỉ
áp dụng cho anchor trong đoạn có nội dung đã thay đổi khi đích là `.doc`; các
anchor ở đoạn không sửa giữ nguyên wrapping. Đây là giới hạn của đường xuất
DOC qua filter đang dùng, không yêu cầu sửa LibreOffice Core.

### legacy18.doc — `keepNext` bị bỏ trong phân trang canvas

LibreOffice DOC→DOCX trung gian có 74 đoạn trong OOXML; 11 đoạn rỗng cuối tài
liệu có `<w:keepNext w:val="true"/>` liên tiếp. Word mở DOCX đó vẫn có 3 trang,
nhưng canvas chỉ có 2. Map đoạn cho thấy đoạn trống đầu tiên của chuỗi nằm ở
Word trang 3 trong khi canvas còn đặt nó ở trang 2. HTML của LibreOffice mang
quy tắc tương ứng `page-break-after: avoid`, nhưng thuật toán pagination sống
không xử lý chuỗi “giữ với đoạn sau”. Lưu lại tiếp tục cho 2 trang. Sửa sẽ
chuyển `keepNext` trực tiếp từ OOXML sang dấu nội bộ trên `<p>` và để cả
pagination canvas lẫn Print Preview đẩy nguyên chuỗi sang trang kế tiếp nếu
không vừa khoảng trống còn lại.

### Trạng thái findings

Nguyên nhân hai lỗi tái hiện (`legacy13`, `legacy18`) đã được cô lập bằng XML,
Word COM và thử chuyển đổi. `legacy20` vẫn chưa đo được trang bản lưu do Word
bật modal error dialog. Không phát hiện thêm lệch ở `legacy06` sau lần chạy mới.
