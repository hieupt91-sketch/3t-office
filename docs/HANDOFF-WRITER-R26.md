# Handoff Writer R26 — `d10.docx` là PDF 1.7 mang đuôi `.docx`

Worktree `E:\VNOffice-grok-writer-r26`, nhánh `fix/writer-r26-grok`. Không sửa code sản phẩm, không sửa bộ đo, không đụng Sheet, không đo lại 23 file còn lại. Không copy và không commit tài liệu thật.

Worktree này không có thư mục `file test\`. Lệnh trong brief, chạy tại gốc worktree:

```
python -c "import zipfile; z = zipfile.ZipFile(r'file test\landocx\d10.docx'); print(z.testzip()); print(z.namelist())"
```

`FileNotFoundError: [Errno 2] No such file or directory: 'file test\\landocx\\d10.docx'`.

File đã kiểm tra là `E:\VN OFice\file test\landocx\d10.docx` — cùng chỗ Handoff R25 ghi bộ `landocx`. Cùng thư mục có `d01.docx`–`d24.docx` (24 file). Không có luồng Zone.Identifier; `Get-Item -Stream *` chỉ thấy `::$DATA`.

## File trên đĩa

| Mục | Giá trị đã đọc |
|---|---|
| Kích thước | 823958 byte |
| SHA-256 | `fd4b0949b796318e3d873391982af0b3968336514dfc7cfe9151cdf2872e90b0` |
| LastWriteTime | 27/06/2022 10:30:02 |
| 8 byte đầu | `25 50 44 46 2D 31 2E 37` = `%PDF-1.7` |
| `zipfile.is_zipfile` | `False` |
| OLE compound (`D0 CF 11 E0`) | không |
| `word/document.xml` trong toàn bộ byte | không có |
| `[Content_Types].xml` trong toàn bộ byte | không có |
| header ZIP `PK\x03\x04` | không có (offset −1) |

`zipfile.ZipFile` trên đường dẫn tuyệt đối:

```
zipfile.BadZipFile: File is not a zip file
```

`testzip()` không chạy được vì constructor đã ném. Không có `word/document.xml` để đưa vào `xml.etree.ElementTree`.

Đối chứng cùng cách đọc: `d03.docx` trong cùng thư mục bắt đầu bằng `50 4B 03 04` (`PK\x03\x04`).

## Những gì đọc được từ PDF

`startxref` = 822596, đúng chỗ bắt đầu `xref`, subsection `0 64`, đọc được 64 dòng. `%%EOF` ở offset 823952 (còn 1 byte sau đó). Trailer:

```
<< /Info 63 0 R /Root 1 0 R /Size 64 >>
```

Đếm token trên toàn file: `/Encrypt` = 0. Object đã đọc:

| Object | Nội dung cấu trúc |
|---|---|
| 1 | `/Type /Catalog`, `/Pages 2 0 R` |
| 2 | `/Type /Pages`, `/Count 1`, `/Kids [ 3 0 R ]` |
| 3 | `/Type /Page`, `/MediaBox [ 0.0 0.0 612.0 792.0 ]`, `/CropBox` cùng bốn số, `/Rotate 0`, `/Contents [ 61 0 R ]`, `/Parent 2 0 R` |
| 63 | `/Producer (Microsoft: Print To PDF)`, `/CreationDate (D:20220627103002+07'00')`, `/ModDate` cùng chuỗi. Có thêm khóa `/Author` và `/Title`. `/Title` bắt đầu bằng `Microsoft Word - `. Phần còn lại của Title và chuỗi Author không ghi vào handoff. |

CreationDate trùng LastWriteTime của file (27/06/2022 10:30:02, lệch +07).

## Word COM

`scripts/layout-audit/_word_para_metrics.ps1` dòng 6–8 và `_word_oracle3.ps1` dòng 7–11 đều là:

```
$word.Visible = $false; $word.DisplayAlerts = 0
$doc = $word.Documents.Open($File, $false, $true, $false)
```

Ba đối số sau tên file là `ConfirmConversions=False`, `ReadOnly=True`, `AddToRecentFiles=False`. Đó đúng lời gọi brief đề xuất, không phải một cách mở khác.

Word: `C:\Program Files\Microsoft Office\Office16\WINWORD.EXE`, `Version 16.0`, `Build 16.0.4266`. Mỗi lần thử tạo `Word.Application` mới. Hai tiến trình WINWORD đã chạy từ trước (pid 10020, 15228, cửa sổ không tiêu đề) không bị tắt.

Cùng một instance, `DisplayAlerts = 0`, `Visible = $false`:

| Cách mở | Kết quả |
|---|---|
| `d03.docx`, `Documents.Open(path, $false, $true, $false)` | Mở được, `Name=d03.docx`, `Close(0)` xong. Không dùng `ComputeStatistics` làm số trang (bộ đo đã ghi API này không phải oracle số trang). |
| `d10.docx`, cùng positional | `COMException`: `The file appears to be corrupted.` HRESULT `-2146822496` (`0x800A16A0`) |
| `Open` với `OpenAndRepair=$true`, Format `0` | `Word encountered an error processing the XML file d10` / `Microsoft Office cannot open this file because some parts are missing or invalid.` HRESULT `-2146822186` (`0x800A17D6`) |
| Format `12`, `OpenAndRepair=$false` | `The file appears to be corrupted.` `0x800A16A0` |
| `ProtectedViewWindows.Open` | `The file appears to be corrupted.` `0x800A16A0` |

`Visible = $true`, `DisplayAlerts = -1` (`wdAlertsAll`), vẫn `Documents.Open(path, $false, $true, $false)` trên `d10.docx`: trong 20 giây lời gọi không trả về. UI Automation thấy cửa sổ `Word` và một cửa sổ thứ hai tên `Microsoft Word`. Không đọc được dòng chữ bên trong hộp thoại đó. Lần Win32 sau bị dừng ngay khi ribbon của cửa sổ chính đã có chữ, trước hộp thoại; kết quả `You cannot call a method on a null-valued expression` của lần đó không dùng làm thông báo của Word về file.

Bản copy cùng byte, đuôi `.pdf`, `Visible = $false`: sau khoảng 4 phút tiến trình Word mới dùng khoảng 1 giây CPU và không có cửa sổ. Tiến trình đó bị dừng. Exception sau đó là `The remote procedure call failed` (`0x800706BE`) vì tiến trình đã tắt, không phải câu Word trả về cho file. Không có kết quả mở đuôi `.pdf` bằng Word.

## LibreOffice

`C:\Users\3T Computer\tools\libreoffice\program\soffice.exe`. Mỗi lần một `UserInstallation` trong thư mục tạm, không dùng profile LibreOffice đang chạy.

`soffice --headless --convert-to pdf` trên `d10.docx`: exit 0.

```
convert E:\VN OFice\file test\landocx\d10.docx as a Draw document -> ...\d10.pdf using filter : draw_pdf_Export
```

File ra 54086 byte, đầu `%PDF-1.7`, `%%EOF` ở offset 54080, một lần `/Type /Page` (không tính `/Pages`).

Đúng filter đường mở của VN Writer, `html:HTML (StarWriter)`:

| File | Exit | stdout | File ra |
|---|---:|---|---|
| `d10.docx` | 1 | `as a Draw document` … `using filter : HTML (StarWriter)` | không |
| `d03.docx` | 0 | `as a Writer document` … `using filter : HTML (StarWriter)` | `d03.html`, 11538 byte, bắt đầu `<!DOCTYPE html>` |

stderr của lần fail d10:

```
Could not find platform independent libraries <prefix>
Error: Please verify input parameters... (SfxBaseModel::impl_store <file:///.../d10.html> failed: 0xc10(Error Area:Io Class:Write Code:16))
```

Dòng `Could not find platform independent libraries <prefix>` cũng có trên lần `d03` exit 0 và trên lần `--convert-to pdf` exit 0. Lần d10 fail thêm `impl_store` … `0xc10`.

`--convert-to html` không ép tên filter, trên `d10.docx`: exit 0.

```
convert ...\d10.docx as a Draw document -> ...\d10.html using filter : draw_html_Export
```

`d10.html` 2568 byte. Đếm thẻ: `p` = 54, `img`/`svg`/`table` = 0. Sau khi bỏ tag còn 1102 ký tự. Nội dung chữ không ghi vào handoff.

## VN Writer

Không mở cửa sổ `python main.py`. Worktree không có đường dẫn tương đối trong brief. Đường mở thật khi có cửa sổ là: `index.html` thấy `openFile=1` thì gọi `common.file.open` → `writer-adapter.js` `open()` → `UnoBridge.openRealFile("writer")` → `VnOfficeApi.open_document_dialog`. Hàm đó gọi `_run_soffice_convert(..., "html")`, filter `HTML (StarWriter)` (`FORMAT_FILTERS["html"]`).

Gọi thẳng `open_document_dialog("writer")` với `initial_file` trỏ tới `d10.docx`, `LOCALAPPDATA` trỏ vào thư mục tạm:

| Khóa | Giá trị |
|---|---|
| `status` | `error` |
| `format` | không có |
| `content` | độ dài 0 |
| `ooxmlDocumentXml` | không có |

`message` (main.py lấy stderr, cắt 500 ký tự, khi return code khác 0):

```
LibreOffice báo lỗi khi chuyển đổi: Could not find platform independent libraries <prefix>
Error: Please verify input parameters... (SfxBaseModel::impl_store <file:///.../d10.html> failed: 0xc10(Error Area:Io Class:Write Code:16))
```

Câu `as a Draw document` nằm ở stdout của cùng lệnh convert, không có trong `message` vì stderr không rỗng.

## Kết luận

`d10.docx` không phải gói OOXML bị cắt hay XML hỏng. Byte là PDF 1.7, cây trang `/Count 1`, khổ 612×792 pt, `/Producer (Microsoft: Print To PDF)`, ngày trong Info trùng giờ sửa file.

Word 16.0.4266 không mở được file đuôi `.docx` này. Câu của bộ đo, `The file appears to be corrupted.`, tái hiện được với đúng `Documents.Open` của `_word_para_metrics.ps1`. `OpenAndRepair` nói rõ hơn: Word xử lý như XML và báo thiếu part hoặc part không hợp lệ.

LibreOffice mở được file khi nhận nó là tài liệu Draw: `--convert-to pdf` (`draw_pdf_Export`) và `--convert-to html` (`draw_html_Export`) đều exit 0.

VN Writer không mở được. Đường mở Writer ép `HTML (StarWriter)`. LibreOffice vẫn nạp `d10.docx` như Draw, rồi `impl_store` HTML Writer lỗi `0xc10`. Cùng filter trên `d03.docx` exit 0, nên soffice của máy này vẫn xuất HTML Writer cho một DOCX thật.

Không có lỗi dàn trang để sửa. Không đổi code. Không chạy lại ma trận 23 file.

## Khuyến nghị

Các vòng đối chiếu Writer sau bỏ `d10` khỏi batch (không xóa file). `_writer_layout_audit.py` và `_batch_writer.py` vẫn lấy mọi `*.docx` trong thư mục khi không truyền tên file. Bốn script phân loại đã bỏ `d10`: `_page_causes.py`, `_empty_para_class.py`, `_import_drawing_loss.py`, `_table_split_class.py`. Định nghĩa lớp lỗi của bộ đo giữ nguyên.

Việc có thể làm sau, không làm trong vòng này: nếu đuôi là `.docx` mà byte đầu là `%PDF-`, đường mở Writer trả lỗi nói rõ file không phải DOCX, thay vì để `impl_store` của filter StarWriter. Đưa PDF vào canvas Writer là việc riêng.

## Test

Không sửa code nên không chạy `node tests/run-tests.js` và `python -m unittest discover -s tests -p "test_*.py"`.
