# Q51 — Kiểm tra tệp Office đời cũ `.xls` / `.doc`

Ngày chạy: 24/10/2026  
Nhánh: `codex/queue-19-10`  
Worktree: `E:\VNOffice-codex-queue`  
Mẫu: 20 tệp `.xls` và 20 tệp `.doc` trong `E:\VN OFice\file test\lan-legacy` (chỉ đọc; không commit hoặc upload).

## Mục tiêu và phạm vi

Kiểm tra mở, lưu lại, mở lại và độ trung thực nội dung của 40 tài liệu Office dạng nhị phân cũ. Kiểm thử giao diện bằng CDP; dùng LibreOffice làm bộ so sánh cho Sheet. Excel COM đang bị chặn theo quy tắc chung, nên các phép đo Excel `Value2`/`Formula`/`NumberFormat`, tên vùng, biểu đồ và ẩn/hiện không thể được xác nhận bằng Excel. Word COM chạy ẩn, tuần tự, để lấy chỉ số tài liệu và đọc lại bản lưu.

## Kế hoạch và quyết định kiến trúc

- Năng lực hiện tại: bộ audit `xls` dùng LibreOffice; Writer mở `.doc` qua luồng chuyển đổi trung gian; nhận diện gói OOXML có kiểm tra chữ ký CFB.
- Thay đổi: `main.py` loại `.doc`, `.xls`, `.ppt` khỏi phép nhận diện gói OOXML mã hóa; `tests/test_ooxml_encryption_main.py` thêm hồi quy. Không sửa LibreOffice Core hoặc ngữ nghĩa lưu tệp.
- Nguyên nhân: `.doc`/`.xls` dạng CFB chia sẻ chữ ký `D0 CF 11 E0` với một số gói OOXML mã hóa. Kiểm tra trước đây coi mọi CFB là OOXML mã hóa và hiện hộp hỏi mật khẩu.
- Rủi ro: CFB OOXML có mật khẩu vẫn phải được nhận diện; kiểm thử hồi quy xác nhận `.xlsx` CFB tiếp tục được coi là mã hóa. Sai khác bộ lọc và bố cục của LibreOffice vẫn còn với một số tài liệu.
- Phụ thuộc: không thêm thư viện. Giao diện được kiểm qua CDP; LibreOffice và Word COM chỉ phục vụ kiểm thử cục bộ.
- Kiểm thử: hồi quy pytest trước/sau sửa; audit 20 `.xls`, 20 `.doc`; Word COM đọc nguồn và bản lưu; bộ kiểm tra `.xlsx`/`.docx` LAN; các gate Node, i18n, checklist và pytest liên quan.
- Hoàn tác: revert commit `fd1f190b` để gỡ thay đổi mã/test. Báo cáo và handoff là tài liệu riêng.

## Kết quả `.xls`

| Nhóm | Số tệp | Chi tiết |
|---|---:|---|
| A — Không mở/crash/treo sau sửa | 0/20 | Trước sửa `legacy01.xls` và `legacy02.xls` đều hiện hộp mật khẩu sai; sau sửa cả 20 mở được. |
| B — Sai/mất nội dung | 4/20 | 17 sai khác công thức/giá trị trên 2.515 ô công thức/giá trị được so: `legacy06` 9, `legacy08` 6, `legacy13` 1, `legacy18` 1. |
| C — Sai bố cục/định dạng đã xác nhận | 0/20 | Không có phép đối chiếu định dạng bằng Excel COM; đây không phải xác nhận định dạng hoàn toàn khớp. |
| D — Lưu sai định dạng hoặc mất dữ liệu không báo | 4/20 | Không có tệp nào sai đuôi/định dạng lưu. Bốn tệp B có sai khác nhưng không có cảnh báo mất công thức/giá trị. |

20/20 bản lưu còn là `.xls` (chữ ký CFB), mở lại được bằng LibreOffice. Thời gian mở trung bình 15.583 ms, cao nhất 16.007 ms; lưu trung bình 3.756 ms. 16/20 tệp không có sai khác được bộ so sánh phát hiện. Ở `legacy06` và `legacy08`, một số công thức `#REF!`, macro/tên hàm lạ được chuẩn hóa thành `NA()`; `legacy13` và `legacy18` có một công thức tiền VND mỗi tệp bị ghi thành văn bản tiếng Việt.

**Giới hạn đối chiếu:** Excel COM BLOCKED. So sánh bằng LibreOffice chỉ bao phủ giá trị/công thức và số sheet; `NumberFormat`, tên vùng, biểu đồ, hình và trạng thái ẩn/hiện: NOT RUN. Không khẳng định các trường đó đúng.

## Kết quả `.doc`

| Nhóm | Số tệp | Chi tiết |
|---|---:|---|
| A — Không mở/crash/treo | 0/20 | 20/20 mở, chỉnh sửa qua luồng CDP, lưu và Word COM mở lại được. |
| B — Sai/mất nội dung hoặc kiểu chữ | 6/20 | Có thay đổi đoạn, shape nổi, font đầu tài liệu hoặc lề ở `legacy06`, `07`, `10`, `13`, `15`, `20`. |
| C — Sai bố cục/số trang | 3/20 | Word COM thấy số trang giảm ở `legacy14` (16→15), `legacy17` (3→2), `legacy18` (3→2). |
| D — Đuôi/định dạng lưu sai hoặc mất dữ liệu không báo | 9/20 | Không có sai đuôi: 20/20 bản lưu còn `.doc`. Chín tệp có chênh lệch B/C không hiện cảnh báo mất định dạng/nội dung. |

Thời gian mở trung bình 14.656 ms, cao nhất 18.306 ms; lưu trung bình 13.398 ms. Word COM đọc được 20/20 nguồn và 20/20 bản lưu. Số bảng và hình nội dòng khớp ở cả 20. Các khác biệt ghi nhận: số đoạn giảm ở `legacy06`, `10`, `14`, `15`, `17`, `18`; shape nổi mất 1 ở `legacy13` và 1 ở `legacy20`; font đoạn đầu `legacy07` đổi Times New Roman→Calibri; lề trên/dưới đổi ở `legacy10` và `legacy15`. Chỉ số trang của `legacy14`, `17`, `18` vẫn lệch khi lưu/mở lại không chỉnh sửa, nên không phải do thao tác sửa thử.

Luồng hiện dùng chuyển đổi `.doc`→`.docx`→HTML khi mở và trung gian `.docx` khi xuất. Chênh lệch lặp lại cho thấy cần điều tra riêng bộ lọc LibreOffice và adapter/chuyển đổi; phạm vi này chưa thay đổi semantics định dạng vì cần thiết kế và kiểm tra tương thích kỹ hơn.

## Lỗi giao diện đã thấy

- Đã chụp và xem ảnh trạng thái Sheet của đủ 20 `.xls`: `E:\VNOffice-briefs\logs\Q51-artifacts\xls-legacy01.png` … `xls-legacy20.png`.
- Đã chụp và xem ảnh Writer của đủ 20 `.doc`: `E:\VNOffice-briefs\logs\Q51-artifacts\legacy01.png` … `legacy20.png`.
- Đã xem ảnh trước/sau thao tác Save As của Writer: `writer-saveas-before.png`, `writer-saveas-after.png` trong cùng thư mục. CDP không chụp được hộp chọn tệp native; hộp thoại đó không được kiểm tra trực quan.
- Ribbon, thanh tab, thanh trạng thái và vùng cuộn không bị cắt/che trong các ảnh. Một số văn bản trong ô/cột bị cắt theo độ rộng hoặc viewport của chính tài liệu; đây là dấu hiệu bố cục nguồn cần so sánh, không phải lỗi nút/hộp thoại. `legacy08.xls` hiện `#NAME?` trong lưới. Ảnh `legacy20.doc` cho thấy tiêu đề “TIN HỌCTRƯỜNG” sát liền; chưa xác nhận đây là khác biệt so với nguồn.
- Save As qua lệnh ứng dụng giữ phần mở rộng `.doc`, trạng thái sau lưu báo “Đã lưu” và tab nhận tên bản mới. Với Sheet, round-trip giữ `.xls`; hộp chọn đường dẫn là hộp native nên ảnh CDP không bao phủ nó. Không thấy cảnh báo về sai khác khi lưu bốn `.xls` có công thức bị đổi.

## Gate và tính trung thực kết quả

- Trước sửa: `python -m pytest tests/test_ooxml_encryption_main.py -q -k legacy_binary` — **FAIL**, 1 failed, 3 deselected.
- Sau sửa cùng lệnh — **PASS**, 1 passed, 3 deselected.
- `npm test` — **PASS**, 3792/3792.
- `node scripts/audit-0610/i18n_parity.mjs` — **PASS**, VI=3170, EN=3170, missing=0 hai chiều.
- `python scripts/audit-0610/verify_checklist_evidence.py --all --no-fix` — **PASS**, 3 file checklist, 0 dòng bị hạ.
- `python -m pytest tests -q -k "xls or doc or legacy or ooxml"` — **FAIL**, 317 passed, 1 failed, 823 deselected. Lỗi hiện hữu ngoài sửa đổi: `tests/test_error_reporting.py::ErrorReportingTests::test_document_api_wrappers_keep_pywebview_argument_signatures` mong chữ ký `open_document_dialog(app_kind)`, nhưng mã hiện tại có `app_kind, source_path, password`. Thay đổi Q51 chỉ sửa `_is_encrypted_package`; không đổi chữ ký API hay kỳ vọng test.
- Bộ `.xlsx` LAN loại `lan14` — **PASS**, 27/27, sai khác=0. Bộ `.docx` LAN — **PASS**, 8/8. Đây là bảo toàn đường cơ sở theo yêu cầu.
- CDP mở/lưu `.xls` 20/20; CDP mở/chỉnh/lưu `.doc` 20/20; Word COM đọc lại `.doc` 20/20 — **PASS**. Excel COM — **BLOCKED** theo quy tắc chung; không chạy.
- Build — **NOT RUN**, không thay build system.

## Handoff

Commit mã: `fd1f190b fix: exclude legacy binary files from OOXML encryption check`. Commit tài liệu/handoff sẽ được ghi riêng sau audit. Không có Core patch, dependency mới hoặc nội dung mẫu trong repo. Báo cáo chưa xác nhận những thuộc tính Excel COM bị chặn. Follow-up đề xuất: xử lý riêng độ trung thực công thức `.xls` và round-trip `.doc` qua các bộ lọc/adapter, mỗi sửa đổi có bộ fixture tổng hợp không chứa dữ liệu LAN và kiểm tra hồi quy.
