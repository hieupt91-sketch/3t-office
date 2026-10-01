# Kiểm thử desktop 3T Office

Tài liệu này mô tả bộ kiểm thử chung chạy trên app pywebview/WebView2 thật. Mọi thao tác phím, chuột, kéo thả và đọc trạng thái đều đi qua CDP của WebView2. Không dùng công cụ nhập liệu cấp hệ điều hành.

## Chạy hồi quy desktop

Từ thư mục gốc repo trên Windows, chạy một lệnh:

    node --experimental-websocket tests/live/cdp/run-desktop-regression.mjs

Node 20 cần cờ --experimental-websocket để dùng WebSocket tích hợp sẵn, không cần cài thêm package. Có thể chạy riêng một app:

    node --experimental-websocket tests/live/cdp/run-desktop-regression.mjs sheet

Bộ chạy lần lượt 3T Doc, 3T Sheet rồi 3T Slide. Mỗi app được mở bằng main.py --app=<writer|sheet|slides> với WEBVIEW2_ADDITIONAL_BROWSER_ARGUMENTS=--remote-debugging-port=<cổng-rảnh> và LOCALAPPDATA riêng dưới thư mục tạm. Harness đợi endpoint CDP, tìm trang WebView2 sẵn sàng, rồi đóng cửa sổ app sạch sẽ; nếu cần dừng gấp, nó chỉ dừng tiến trình Python do chính harness tạo.

Kết quả in thành bảng có PASS, FAIL, BLOCKED và N/A. Mỗi ca có lỗi vẫn được ghi thành một dòng để các ca sau tiếp tục. Lệnh trả mã khác 0 nếu có FAIL hoặc BLOCKED; lỗi đã biết cần giữ nguyên dòng FAIL, không làm suite dừng giữa chừng.

Các ca gồm:

- Gõ ngay sau khi app khởi động.
- Enter và Tab trên nội dung phù hợp với từng app.
- Ctrl+C, Ctrl+X, Ctrl+V qua phím CDP; bài này dùng clipboard desktop thật để kiểm tra đường clipboard.
- Nhận dạng kiểu dữ liệu và công thức tham chiếu bằng chuột trong chế độ nhập công thức của 3T Sheet.
- Tạo mới, Lưu bản sao, Lưu, mở tệp đã lưu trong cửa sổ mới và In thành PDF.
- Chèn ký tự Tab trong 3T Doc.

Để không mở hộp thoại tệp native trong bài tự động, bài Lưu bản sao chọn đường dẫn tạm qua một bộ định tuyến CDP quanh globalUnoBridge.saveRealFile; lệnh Save As của app và dịch vụ lưu thật vẫn được gọi. Bài Open gọi API mở tệp gần đây trong cửa sổ mới. Bài PDF dùng cùng dịch vụ chuẩn bị bản in và Microsoft Print to PDF với đường dẫn tạm.

## Thư viện CDP và probe riêng

tests/live/cdp/client.mjs, actions.mjs, và session.mjs cung cấp kết nối CDP, đợi app sẵn sàng, gõ phím, nhập chữ, bấm, kéo, đọc trạng thái và đóng app.

Các probe đã được chuyển vào thư mục này và dùng thư viện chung:

- cdp_keys.mjs
- cdp_formula.mjs
- cdp_types.mjs
- cdp_tab.mjs
- cdp_probe.mjs

Đọc một biểu thức JavaScript trên app đang chạy, ví dụ:

    node --experimental-websocket tests/live/cdp/cdp_probe.mjs 9333 "document.title" 1000

## Audit mở, lưu và số trang

Một entry point dùng chung cho DOCX/XLSX/PPTX:

    python scripts/layout-audit/batch_document_audit.py xlsx .
    python scripts/layout-audit/batch_document_audit.py docx . "file test/landocx" _batch-docx
    python scripts/layout-audit/batch_document_audit.py pptx . "file test/lanpptx" _batch-pptx
    python scripts/layout-audit/batch_document_audit.py all . --docx-dir "file test/landocx" --pptx-dir "file test/lanpptx" --out-dir _batch-all

xlsx mặc định đọc file test/lan. all ghi chung một batch_document_audit_report.md. Hai lệnh cũ _batch_audit.py và _batch_writer.py vẫn tồn tại làm entry tương thích và chuyển tiếp vào lệnh chung. Linter XLSX đọc XML theo namespace, nên <row/> hợp lệ và thẻ shared-string có prefix như <x:si> không bị báo giả.

Chế độ pptx nạp hook scripts/layout-audit/_batch_pptx.py với hàm run_batch(root, input_dir, out_dir, names). CH-5 cần bổ sung module hook này; nếu chưa có, báo cáo ghi rõ BLOCKED.

So sánh số trang của ba app với Office:

    python scripts/layout-audit/_print_page_audit.py . _print-pages "file test/landocx/d01.docx" "file test/lan/lan05.xlsx" "file test/lanpptx/sample.pptx"

Báo cáo print_page_comparison.md ghi số trang từ Office, canvas Doc, bản xem trước/In, PDF xuất ra và độ lệch. Các phiên app chạy tuần tự qua CDP. Oracle Word/Excel/PowerPoint chạy ẩn qua COM; thao tác COM bận do RPC_E_CALL_REJECTED được đợi và thử lại. Oracle Excel/PowerPoint chỉ gọi Quit() với tiến trình Office mới do chính nó tạo.

## Cổng kiểm tra

    node tests/run-tests.js
    python -m unittest discover -s tests

Không thêm tài liệu thật trong file test/** vào Git. Báo cáo, PDF, và bản round-trip được ghi ở thư mục output cục bộ; không gửi nội dung tài liệu ra mạng.
