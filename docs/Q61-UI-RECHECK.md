# Q61 — Đối chiếu giao diện theo UI Sweep 25/10

## Phạm vi và kết luận

Đã xác nhận, sửa và commit các lỗi xác thực số ở Writer Thu phóng/Thiết lập trang, Sheet Chiều cao hàng/Định dạng có điều kiện, Slides Thu phóng; đã sửa focus trả về nút khởi chạy của Writer Thiết lập trang. Một lỗi focus đã xác nhận ở Sheet chỉ đạt 1/6 sau lượt sửa thử và chưa có bản sửa được commit. Vì vậy phiếu Q61 **chưa hoàn tất**; chưa tạo `E:\VNOffice-briefs\logs\Q61.DONE`.

## Bảng đối chiếu

| Mục trong sweep / báo cáo agy | Xác nhận trên app thật | Đã sửa | Kiểm thử |
|---|---|---|---|
| Writer Thu phóng: nút Áp dụng bật khi để trống/nhập sai | Có | Có; xác thực số dùng chung và i18n VI/EN | Trước: CDP FAIL (`disabled=false`). Sau: CDP PASS; thông báo tiếng Việt, nút bị vô hiệu hóa. |
| Writer Thiết lập trang: lề nhập sai vẫn áp dụng | Có | Có; xác thực số dùng chung và i18n VI/EN | Trước: CDP FAIL. Sau: CDP PASS; trường lỗi báo rõ, nút Áp dụng bị vô hiệu hóa. |
| Sheet Chiều cao hàng: giá trị số sai | Có | Có; dùng helper xác thực dùng chung | CDP ma trận giá trị sai/hợp lệ PASS. |
| Sheet Định dạng có điều kiện: giá trị sai vẫn áp dụng | Có | Có; trường số bắt buộc, giới hạn và lỗi VI/EN; số âm hợp lệ theo ngữ nghĩa ngưỡng | CDP ma trận PASS; số âm được chấp nhận, dữ liệu không hợp lệ bị chặn. |
| Slides Thu phóng: giá trị sai vẫn áp dụng | Có | Có; xác thực live và i18n VI/EN | CDP ma trận PASS; giá trị không hợp lệ bị chặn. |
| Writer Thiết lập trang: Esc không trả focus về launcher | Có | Có; ghi nhớ launcher kích hoạt bằng bàn phím | Trước: CDP FAIL, focus về editor. Sau: CDP PASS 1/1, focus đúng `writer.page.setupDialog`. |
| Sheet Dò tìm mục tiêu, Bảng dữ liệu, Trình quản lý kịch bản, Chiều cao hàng, Căn lề, Khổ giấy: Esc không trả focus | Có; 6/6 tái hiện trong lượt CDP kiểm tra focus | Chưa hoàn tất; lần thử cơ chế chung sau đó chỉ đạt 1/6 và đã được gỡ, không tính là sửa | CDP: 1/6 PASS, 5/6 FAIL (Goal Seek, Data Table, Scenario, Margins, Size). Cần sửa tiếp bằng một cơ chế chung rồi chạy lại trước/sau. |
| `writer.review.wordCount` chưa đăng ký | Không phải lỗi | Không | CDP gọi lệnh mở hộp thoại Đếm từ thành công; ảnh `writer-wordcount-live.png`. |
| `slides.diagram.insert`, `slides.insert.headerFooter`, `slides.show.setupShow` không mở | Không phải lỗi | Không | Cả ba lệnh đều mở đúng hộp thoại trên phiên CDP; ảnh `insert-live.png`, `headerFooter-live.png`, `setupShow-live.png`. |
| Các trường Căn lề / Khổ giấy Sheet | Không xác nhận lỗi nhập sai; sweep ghi PASS | Không | Sweep PASS 6/6 cho từng trường; các ảnh ma trận Q61 tập trung vào lỗi đã xác nhận nêu trên. |

## Giao diện đã xem

- **Writer Thu phóng**, **Writer Thiết lập trang**, **Sheet Chiều cao hàng**, **Sheet Định dạng có điều kiện**, **Slides Thu phóng**: ảnh app thật ở 1366×768 và 1024×600, theme sáng và tối (20 ảnh). Đã xem đủ; hộp thoại nằm trong viewport, nhãn và lỗi đọc được, nút chính hiện rõ. Ở Sheet Chiều cao hàng, ảnh lúc tải còn thấy toast “Đang tải hộp thoại cho Sheet...” phía sau lớp mờ; hộp thoại không bị che.
- **Writer Thiết lập trang focus**: ảnh mở/đóng `writer-page-focus-open.png`, `writer-page-focus-return.png` ở 1366×768. Trước sửa ảnh đóng cho thấy focus rơi về editor; sau sửa focus outline ở đúng launcher.
- **Sheet focus**: ảnh mở/đóng từng hộp Dò tìm mục tiêu, Bảng dữ liệu, Trình quản lý kịch bản, Chiều cao hàng, Căn lề, Khổ giấy (`sheet-focus-*-open/return.png`, 12 ảnh, 1366×768 sáng). Đã xem đủ. Bố cục hiển thị; 5 ảnh sau Esc cho thấy giao diện về lưới nhưng focus không trở lại nút mở.
- **Writer Đếm từ** và ba hộp thoại **Slides Sơ đồ, Đầu trang & Chân trang, Thiết lập trình chiếu**: ảnh `writer-wordcount-live.png`, `insert-live.png`, `headerFooter-live.png`, `setupShow-live.png`; đã xem đủ, nội dung tiếng Việt, không thấy cắt/che trong kích thước kiểm tra.

Ảnh nằm trong [`docs/assets/q61-ui`](assets/q61-ui/).

## Commit sản phẩm

- `217cbb4d` — Writer xác thực giá trị số.
- `a796bde4` — Sheet xác thực số và khóa hành động khi sai.
- `77eb0fda` — Slides chặn tỷ lệ thu phóng không hợp lệ.
- `c9eddc0d` — Writer Thiết lập trang trả focus về launcher.

## Lệnh và kết quả

- `node tests/run-tests.js` — **PASS 3802/3802**.
- `node --experimental-websocket tests/live/cdp/q61-dialog-validation.desktop.mjs` — **PASS 120 assertions**, 20 ảnh (5 hộp × 2 viewport × 2 theme); ảnh đã xem.
- `node --experimental-websocket tests/live/cdp/q61-dialog-focus.desktop.mjs` — **PASS 1/1**, launcher Writer nhận focus lại.
- `node scripts/audit-0610/i18n_parity.mjs` — **PASS**, VI=3203, EN=3203, 0 missing (21 cảnh báo nội dung giống/rỗng có sẵn).
- `python scripts/audit-0610/gen_word_checklist.py`, `gen_excel_checklist.py`, `gen_ppt_checklist.py` — đã chạy đủ; Word priority-1 thiếu 0, Sheet thiếu 1, Slides thiếu 4 theo trạng thái sẵn có.
- `python scripts/audit-0610/verify_checklist_evidence.py --all --no-fix` — **PASS**, 0 dòng bị hạ cấp.
- `python -m pytest tests -q -k dialog` — **FAIL**, 34 passed / 1 failed / 1128 deselected. Lỗi cleanup `PermissionError [WinError 32]` ở `test_sheet_xlsx_native_open.py` do LibreOffice đang giữ `lock.xlsx`; không kill process theo tên.
- Kiểm tra `DOCX` 8/8: **NOT RUN** trong lượt này.

## Files chính

`platform/ui-kit/numeric-dialog-validation.js`; `platform/ui-kit/dialogs.js`; `apps/writer/writer-zoom-dialog.js`; `adapters/libreoffice/writer/writer-adapter.js`; `apps/sheet/sheet-grid.js`; `apps/slides/slides-zoom-dialog.js`; `platform/i18n/strings-vi.js`; `platform/i18n/strings-en.js`; `platform/ribbon/ribbon-host.js`; `tests/unit/numeric-dialog-validation.test.js`; `tests/live/cdp/q61-dialog-focus.desktop.mjs`; `tests/live/cdp/q61-dialog-validation.desktop.mjs`; generated Word/Excel/PowerPoint checklist evidence.

## Việc còn lại / handoff

1. Sửa chung đường focus trả về của sáu hộp thoại Sheet; hiện năm mục còn FAIL như bảng trên.
2. Chạy bài CDP focus trước sửa (phải FAIL) và sau sửa (phải PASS) cho đủ sáu mục; xem ảnh sau mỗi trạng thái.
3. Chạy lại `node tests/run-tests.js`, i18n parity, ba generator, evidence verifier, pytest liên quan; điều tra pytest lock file khi LibreOffice nhả tệp tự nhiên.
4. Sau khi tất cả mục trong phạm vi đạt, cập nhật handoff và tạo `E:\VNOffice-briefs\logs\Q61.DONE`.

**BUILD:** NOT RUN (không thay build system). **CORE PATCH:** Không. **Trạng thái phiếu:** Chưa hoàn tất; chưa tạo DONE.
