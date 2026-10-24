# REPORT-G0 — corpus + khung parity OOXMLKit

Nhánh: `claude/ooxml-g0-corpus-parity` (base `vn-main`). Chỉ THÊM file mới: `docs/ooxml-corpus/`, `scripts/corpus/`, `scripts/parity/`.
Không sửa `ports/ios/OOXMLKit/Sources/`. Không PR. Trạng thái theo AGENTS.md §8.

## Đã làm
| hạng mục | file |
|---|---|
| Cấu trúc + định nghĩa hạng mục + định dạng MANIFEST | `docs/ooxml-corpus/README.md` |
| 9 fixture synthetic (3 định dạng) + 2 fixture lấp ô trống | `docs/ooxml-corpus/synthetic/**`, `scripts/corpus/make_gap_fixtures.py` |
| MANIFEST (28 mục: 9 synthetic + 19 tham chiếu tệp LibreOffice sẵn có) | `docs/ooxml-corpus/MANIFEST.json`, `scripts/corpus/build_corpus.py` |
| Harness: Open→Edit→Save→Reopen→Export + structural diff + JSON | `scripts/parity/parity_runner.py`, `run_parity.sh` |
| Plugin oracle (BLOCKED/TODO rõ ràng) | `scripts/parity/parity_plugins.py` |
| Động cơ GIẢ chỉ để tự kiểm harness | `scripts/parity/mock_engine.py` |

Ma trận phủ (số tệp có tính năng, dò tự động từ nội dung; gồm cả tệp LibreOffice tham chiếu):

| | table | image | chart | formula | style | comment | notes | unicode |
|---|---|---|---|---|---|---|---|---|
| docx | 3 | 2 | 1 | 1 | 9 | 2 | 2 | 9 |
| xlsx | 3 | 1 | 2 | 5 | 13 | 1 | n/a | 10 |
| pptx | 1 | 1 | 1 | n/a | 6 | 2 | 3 | 5 |

Lưu ý: `unicode` = có ký tự phi-ASCII trong text XML (gồm dấu gạch dài…), chưa chắc là tiếng Việt; chỉ các fixture `gap-*` và `rich-*`
chủ ý có tiếng Việt. Riêng **synthetic** thì mỗi định dạng đủ cả 8 hạng mục áp dụng được qua `rich-*` + `gap-*` (docx: chart/formula nhờ `gap-chart-math-vi`; xlsx chart nhờ `gap-chart-vi`).
`comment` DOCX/XLSX/PPTX synthetic: có ở `rich-*`.

## Kết quả đã CHẠY (môi trường này, Linux, python3 chuẩn)
- `build_corpus.py` sinh tất định; `--check` → **PASS** (MANIFEST + sha256 khớp).
- `parity_runner.py --selftest` → **PASS**: động cơ giả đúng → PASS; giả làm rơi 1 phần ZIP → FAIL; giả làm hỏng XML → FAIL (chứng minh bộ diff/integrity bắt được lỗi). **Đây KHÔNG phải kết quả của OOXMLKit.**
- `run_parity.sh --all` (28 tệp), không có engine:
  - `source_integrity` (CRC, XML well-formed, quan hệ nội bộ trỏ tới phần có thật): **PASS** cho cả 28 tệp, trong đó 1 tệp PASS kèm lỗi nguồn CÓ SẴN đã khai báo (xem Phát hiện).
  - mọi bước engine (open/noop_roundtrip/edit_save/reopen/export): **BLOCKED** → tổng thể mỗi tệp = BLOCKED (mã thoát 2).
  - plugin `oracle_libreoffice`: **chạy thật** vì máy này CÓ `soffice` (trái với giả định đề bài): LibreOffice tải và xuất PDF được tệp nguồn → PASS (chỉ phạm vi "LO mở được tệp nguồn"; chưa có bản OOXMLKit-lưu để kiểm). Không phải Office thật.

## BLOCKED / NOT RUN (không bịa)
| mục | trạng thái | lý do / việc cần |
|---|---|---|
| Round-trip OOXMLKit qua `ooxml-engine` (open→edit→save→reopen→export) | **BLOCKED** | Không có Swift 6 trong môi trường → không build được `ooxml-engine`. Code harness đã sẵn, chưa được chạy với engine thật (chỉ kiểm bằng mock). Chạy: `swift build --product ooxml-engine` rồi `OOXML_ENGINE=… scripts/parity/run_parity.sh --all`. Có thể có chỗ giao thức bridge (vd. cấu trúc `sheet.read`/`slide.read`) cần chỉnh khi chạy thật — chưa xác nhận. |
| LibreOffice kiểm bản OOXMLKit-lưu + marker nhìn thấy (DOCX→txt, XLSX→csv) | **NOT RUN** | Code có; cần engine để có bản lưu. |
| Oracle Microsoft Office | **BLOCKED** | Không có Office; không giả lập. |
| Kiểm "Repair" | **BLOCKED** | Chỉ Office thật xác nhận được; PackageValidator không thay thế. |
| Visual diff | **BLOCKED** | Cần render Office/LO cố định font/DPI (LO có sẵn nhưng chưa có baseline Office để so). |
| Hiệu năng thiết bị (1MB<1s, 10MB<3s) | **BLOCKED** | Không có iPhone/iPad thật; chưa có tệp 1MB/10MB trong corpus. |
| Baseline do Office thật tạo | **BLOCKED** | Cần người có Office tạo/đưa tệp; sẽ thêm `origin: "msoffice"`. |

## Phát hiện
1. `ports/ios/OOXMLKit/Tests/OOXMLTestSupport/Fixtures/real/sample-slides-smartart.pptx`: `slideMaster1.xml.rels` có `rId3 → slideLayouts/slideLayout2.xml` **không tồn tại** (tệp nguồn, không do OOXMLKit; có thể do rút gọn khi làm fixture). Đã ghi vào `known_source_issues` trong MANIFEST. Khi chạy với engine, cần xem save có giữ nguyên lỗi này (đúng quy ước "không tự sửa lỗi nguồn").
2. `ton-kho-3t.xlsx` nằm trong `real/` — trông như dữ liệu nghiệp vụ; người phụ trách nên xác nhận nó không phải tài liệu thật nhạy cảm (corpus chỉ tham chiếu, không chép).
3. Quy ước diff: XML chuẩn hóa theo URI namespace, thuộc tính sắp xếp, bỏ khoảng trắng giữa phần tử. Đây là so sánh cấu trúc, KHÔNG phải C14N đầy đủ; đổi prefix/thứ tự thuộc tính coi là bằng nhau (khác với yêu cầu "giữ prefix gốc" của OOXMLKit — cần bước so byte/prefix riêng nếu muốn kiểm điều đó; hiện harness báo phần "byte_identical" để thấy phần chép nguyên).

## Rủi ro / giới hạn
- Dò tính năng là heuristic theo tên phần/phần tử, không thay cho kiểm tay.
- Chỉ 1 thao tác sửa/định dạng (thêm đoạn / đặt ô Z99 / đặt notes slide 0); chưa phủ mọi API.
- `expect_changed` cho XLSX/PPTX là phỏng đoán an toàn, cần hiệu chỉnh sau lần chạy engine thật đầu tiên.
