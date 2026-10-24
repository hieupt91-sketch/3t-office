# Q61 — Đối chiếu giao diện theo UI Sweep 25/10

## Phạm vi và kết luận

Đã xác nhận và sửa các lỗi xác thực số ở Writer Thu phóng/Thiết lập trang, Sheet Dò tìm mục tiêu/Chiều cao hàng/Định dạng có điều kiện, Slides Thu phóng; sửa focus dùng chung cho dropdown Ribbon và hộp thoại Sheet. Sáu hộp Sheet hiện giữ vòng Tab và Esc trả focus đúng launcher. Phiếu hoàn tất sau khi chạy các gate bên dưới.

## Bảng đối chiếu

| Mục trong sweep / báo cáo agy | Xác nhận trên app thật | Đã sửa | Kiểm thử |
|---|---|---|---|
| Writer Thu phóng: nút Áp dụng bật khi để trống/nhập sai | Có | Có; xác thực số dùng chung và i18n VI/EN | Trước: CDP FAIL (`disabled=false`). Sau: CDP PASS; thông báo tiếng Việt, nút bị vô hiệu hóa. |
| Writer Thiết lập trang: lề nhập sai vẫn áp dụng | Có | Có; xác thực số dùng chung và i18n VI/EN | Trước: CDP FAIL. Sau: CDP PASS; trường lỗi báo rõ, nút Áp dụng bị vô hiệu hóa. |
| Sheet Chiều cao hàng: giá trị số sai | Có | Có; dùng helper xác thực dùng chung | CDP ma trận giá trị sai/hợp lệ PASS. |
| Sheet Định dạng có điều kiện: giá trị sai vẫn áp dụng | Có | Có; trường số bắt buộc, giới hạn và lỗi VI/EN; số âm hợp lệ theo ngữ nghĩa ngưỡng | CDP ma trận PASS; số âm được chấp nhận, dữ liệu không hợp lệ bị chặn. |
| Slides Thu phóng: giá trị sai vẫn áp dụng | Có | Có; xác thực live và i18n VI/EN | CDP ma trận PASS; giá trị không hợp lệ bị chặn. |
| Writer Thiết lập trang: Esc không trả focus về launcher | Có | Có; ghi nhớ launcher kích hoạt bằng bàn phím | Trước: CDP FAIL, focus về editor. Sau: CDP PASS 1/1, focus đúng `writer.page.setupDialog`. |
| Sheet Dò tìm mục tiêu, Bảng dữ liệu, Trình quản lý kịch bản, Chiều cao hàng, Căn lề, Khổ giấy: Tab/Esc và trạng thái rỗng | Có; CDP tái hiện lỗi focus ở sáu hộp, Dò tìm mục tiêu rỗng bật nút và ô Khổ giấy bị che một phần ở 1024×600 | Có; dropdown ghi nhớ launcher bàn phím, hộp dùng chung khôi phục focus; Goal Seek dùng xác thực chung; Page Setup cuộn ô focus vào vùng nhìn thấy | Trước: 1/6 Escape PASS, 5/6 FAIL; Dò tìm mục tiêu rỗng `disabled=false`; Khổ giấy `bottom=539.23`, vùng cuộn `bottom=518`, `scrollTop=0`. Sau: 6/6 Escape + 6/6 Tab trap PASS; `disabled=true`; ô Khổ giấy `bottom=492.29`, vùng cuộn `bottom=511.46`, `scrollTop=44`. |
| `writer.review.wordCount` chưa đăng ký | Không phải lỗi | Không | CDP gọi lệnh mở hộp thoại Đếm từ thành công; ảnh `writer-wordcount-live.png`. |
| `slides.diagram.insert`, `slides.insert.headerFooter`, `slides.show.setupShow` không mở | Không phải lỗi | Không | Cả ba lệnh đều mở đúng hộp thoại trên phiên CDP; ảnh `insert-live.png`, `headerFooter-live.png`, `setupShow-live.png`. |
| Các trường Căn lề / Khổ giấy Sheet | Không xác nhận lỗi nhập sai; sweep ghi PASS | Không | Sweep PASS 6/6 cho từng trường; các ảnh ma trận Q61 tập trung vào lỗi đã xác nhận nêu trên. |

## Giao diện đã xem

- **Writer Thu phóng**, **Writer Thiết lập trang**, **Sheet Chiều cao hàng**, **Sheet Định dạng có điều kiện**, **Slides Thu phóng**: ảnh app thật ở 1366×768 và 1024×600, theme sáng và tối (20 ảnh). Đã xem đủ; hộp thoại nằm trong viewport, nhãn và lỗi đọc được, nút chính hiện rõ. Ở Sheet Chiều cao hàng, ảnh lúc tải còn thấy toast “Đang tải hộp thoại cho Sheet...” phía sau lớp mờ; hộp thoại không bị che.
- **Writer Thiết lập trang focus**: ảnh mở/đóng `writer-page-focus-open.png`, `writer-page-focus-return.png` ở 1366×768. Trước sửa ảnh đóng cho thấy focus rơi về editor; sau sửa focus outline ở đúng launcher.
- **Sheet focus**: ảnh menu, hộp thoại và trả về của sáu luồng ở 1366×768 sáng; ảnh mỗi hộp thoại thêm tại 1366×768 và 1024×600 sáng/tối, cùng ảnh Khổ giấy lúc mở ở 1024×600 (43 ảnh). Đã xem menu, trạng thái trả về và hộp thoại ở cả hai kích thước/theme. Focus outline nằm trên launcher sau Esc; ô Khổ giấy hiện đủ trong vùng cuộn nhỏ, nội dung tiếp tục phía dưới bằng thanh cuộn.
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
- `node --experimental-websocket tests/live/cdp/q61-sheet-dialog-focus.desktop.mjs` — **PASS 6/6 Escape, 6/6 Tab trap**, ô Khổ giấy đầy đủ trong vùng cuộn trên 1024×600; 43 ảnh đã xem.
- `node scripts/audit-0610/i18n_parity.mjs` — **PASS**, VI=3203, EN=3203, 0 missing (21 cảnh báo nội dung giống/rỗng có sẵn).
- `python scripts/audit-0610/gen_word_checklist.py`, `gen_excel_checklist.py`, `gen_ppt_checklist.py` — đã chạy đủ; Word priority-1 thiếu 0, Sheet thiếu 1, Slides thiếu 4 theo trạng thái sẵn có.
- `python scripts/audit-0610/verify_checklist_evidence.py --all --no-fix` — **PASS**, 0 dòng bị hạ cấp.
- `python -m pytest tests -q -k "sheet_scenarios or sheet_page_margins or sheet_print_setup"` — **PASS**, 7 passed, 1156 deselected.
- DOCX round-trip 8 tệp `d01,d02,d03,d05,d07,d08,d09,d11` — **PASS 8/8**, đều lưu được sau chỉnh sửa và số trang không đổi; báo cáo `E:\VNOffice-profiles\codex-q61-docx-final-20261025\output\batch_document_audit_report.md`.

## Files chính

`platform/ui-kit/numeric-dialog-validation.js`; `platform/ui-kit/dialogs.js`; `apps/writer/writer-zoom-dialog.js`; `adapters/libreoffice/writer/writer-adapter.js`; `apps/sheet/sheet-grid.js`; `apps/slides/slides-zoom-dialog.js`; `platform/i18n/strings-vi.js`; `platform/i18n/strings-en.js`; `platform/ribbon/ribbon-host.js`; `tests/unit/numeric-dialog-validation.test.js`; `tests/live/cdp/q61-dialog-focus.desktop.mjs`; `tests/live/cdp/q61-dialog-validation.desktop.mjs`; generated Word/Excel/PowerPoint checklist evidence.

## Hoàn tất

Ba checklist generator đã chạy; Word ưu tiên-1 thiếu 0, Sheet thiếu 1, Slides thiếu 4 theo trạng thái hiện có. Evidence verifier **PASS**, 0 dòng bị hạ. Không đổi command definitions hay chuỗi i18n trong lượt này. DOCX 8/8 PASS như trên. **BUILD:** NOT RUN (không thay build system). **CORE PATCH:** Không. Đã tạo log hoàn tất `E:\VNOffice-briefs\logs\Q61.DONE` sau commit.
