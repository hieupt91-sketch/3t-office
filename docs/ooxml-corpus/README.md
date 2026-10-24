# Corpus OOXML (G0) — khung đối chiếu OOXMLKit

Mục đích: bộ tệp DOCX/XLSX/PPTX + khung harness để sau này đối chiếu OOXMLKit (`ports/ios/OOXMLKit`) với
**Microsoft Office (oracle cuối)** và **LibreOffice (nền tham khảo)**.

## ⚠ Nhãn trung thực
- `synthetic/` = tệp **tổng hợp**, viết tay XML theo mẫu đầu ra Office. **KHÔNG phải do Microsoft Office thật tạo.**
  Không được gọi là "baseline Office thật".
- Mục `origin: "libreoffice"` trong MANIFEST = tệp sẵn có của repo (`Tests/OOXMLTestSupport/Fixtures/real`), do LibreOffice tạo,
  được **tham chiếu tại chỗ** (không chép). Cũng KHÔNG phải Office thật.
- Chưa có tệp nào do Microsoft Office thật tạo → mọi `oracle.microsoft_office` đều `BLOCKED`.
- Không commit tài liệu thật của người dùng vào đây.

## Hạng mục bắt buộc (mỗi định dạng)
`table` (bảng) · `image` (ảnh) · `chart` (biểu đồ) · `formula` (công thức) · `style` · `comment` · `notes` · `unicode` (dữ liệu Unicode, gồm tiếng Việt có dấu).

Ý nghĩa theo định dạng (DÒ tự động từ nội dung tệp bởi `scripts/corpus/build_corpus.py`, không khai tay):

| hạng mục | DOCX | XLSX | PPTX |
|---|---|---|---|
| table | `w:tbl` | phần `xl/tables/table*` | `a:tbl` |
| image | `*/media/*` | `*/media/*` | `*/media/*` |
| chart | `*/charts/chart*` | idem | idem |
| formula | công thức toán OMML (`m:oMath`) — trường như PAGE KHÔNG tính | `<f>` | không áp dụng (luôn false) |
| style | `styles.xml` có `style` | `styles.xml` có `xf` | master + theme |
| comment | phần `comments*` | idem (ghi chú ô) | idem |
| notes | footnote/endnote thật (ngoài 2 separator) | không áp dụng (false) | `notesSlide*` |
| unicode | text phi-ASCII trong phần XML | idem | idem |

Ma trận phủ hiện tại in bởi `python3 -I scripts/corpus/build_corpus.py` (xem `REPORT-G0.md`).

## MANIFEST.json (`ooxml-corpus-manifest/1`)
Một đối tượng `{schema, categories, honesty, files[]}`. Mỗi phần tử `files[]`:

| khóa | ý nghĩa |
|---|---|
| `path` | đường dẫn tương đối từ gốc repo |
| `format` | `docx` \| `xlsx` \| `pptx` |
| `origin` | `synthetic` \| `libreoffice` \| (tương lai) `msoffice` |
| `label` | câu nhãn trung thực bắt buộc |
| `sha256`, `bytes`, `parts` | băm/kích thước/số phần ZIP |
| `features` | `{table,image,chart,formula,style,comment,notes,unicode}: bool` (kỳ vọng, dò từ nội dung) |
| `edit` | `{op, expect_changed[]}` — thao tác sửa mà harness thực hiện và các phần ZIP **được phép** đổi (glob). Phần khác đổi = FAIL |
| `known_source_issues[]` | lỗi CÓ SẴN trong tệp nguồn (không tính lỗi OOXMLKit) |
| `oracle.microsoft_office` / `oracle.libreoffice` | trạng thái oracle: `BLOCKED: <lý do>` cho tới khi có kết quả thật |

## Dựng lại / kiểm
```bash
python3 -I scripts/corpus/build_corpus.py          # sinh synthetic/ + MANIFEST.json (tất định)
python3 -I scripts/corpus/build_corpus.py --check  # MANIFEST + hash khớp?
```
Nguồn sinh: `ports/ios/OOXMLKit/scripts/fixtures/*.py` (tái dùng) + `scripts/corpus/make_gap_fixtures.py`
(`gap-chart-vi.xlsx`: biểu đồ+công thức+tiếng Việt; `gap-chart-math-vi.docx`: biểu đồ+OMML+tiếng Việt).

## Harness parity
Xem `scripts/parity/` và `REPORT-G0.md`. Chuỗi: Open → (noop Save) → Edit → Save → Reopen → Export, structural diff bằng `zipfile`+`expat`.
```bash
scripts/parity/run_parity.sh --all                 # cần ooxml-engine (OOXML_ENGINE=… hoặc swift build); không có → BLOCKED
scripts/parity/run_parity.sh --selftest            # tự kiểm harness bằng động cơ GIẢ (không phải OOXMLKit)
```
Dựng engine: `cd ports/ios/OOXMLKit && swift build --product ooxml-engine` (cần Swift 6).

## Chưa làm / cần người-máy (BLOCKED)
Oracle Microsoft Office, kiểm "Repair", visual diff, hiệu năng thiết bị thật (1MB<1s, 10MB<3s), tệp 1MB/10MB sinh sẵn,
baseline do Office thật tạo. Chi tiết và TODO nằm ở `scripts/parity/parity_plugins.py`.
