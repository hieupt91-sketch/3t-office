# Plan — CH-9.2, CH-9.4, CH-9.5

## Objective

Hoàn thiện ba năng lực ổn định dùng chung cho 3T Doc, 3T Sheet và 3T Slide: khôi phục tài liệu chưa lưu sau khi tiến trình bị tắt cưỡng bức, dọn đúng các PID do 3T Office khởi tạo, và nhật ký hiệu năng cục bộ chỉ ghi khi người dùng bật.

## Current capability

- Shared AutoRecover đã có bộ lưu cục bộ, bộ hẹn giờ, hộp thoại khôi phục và tích hợp ba app; CH-9 đổi mặc định thành 2 phút và chuẩn hóa nội dung giao diện/nghiệm thu.
- `main.py` đã sở hữu vòng đời cửa sổ, UNO helper và server tĩnh Python trong cùng tiến trình; G10 chạy Office COM trong PowerShell ẩn riêng cho từng tác vụ.
- WIP hiện có sổ PID cục bộ và JSONL hiệu năng, nhưng chưa có test CH-9 đăng ký trong master runner, chưa đủ Help và chưa có bằng chứng desktop.

## Files/modules

- `platform/process_lifecycle/`, `main.py`, `platform/print/office_com.py`: sổ PID có định danh thời điểm tạo, dọn lúc thoát và quét orphan lúc khởi động.
- `platform/autorecover/`, `platform/i18n/`: mặc định 2 phút, đúng nhãn hộp thoại/nút và trạng thái lỗi.
- `platform/performance/`, `adapters/libreoffice/common/uno-bridge.js`: tùy chọn mặc định tắt, JSONL 5 MB x 3, thời gian open/save/print/soffice và bộ nhớ.
- `platform/help/`: hướng dẫn tiếng Việt cụ thể theo 3T Doc/Sheet/Slide cho cả ba tính năng.
- `tests/unit/`, `tests/`, `tests/run-tests.js`, `tests/live/`: unit test đăng ký và desktop proof chỉ dùng WebView2 CDP; Office chỉ chạy COM ẩn.
- `docs/HANDOFF-CH9.md`: handoff, kết quả gate và output desktop.

## Dependencies

Không thêm dependency production. Chỉ dùng Python/JavaScript chuẩn, pywebview/WebView2 sẵn có và Playwright Core đã có trong môi trường kiểm thử.

## Risks

- PID có thể được hệ điều hành tái sử dụng: mọi thao tác dọn phải khớp cả PID lẫn thời điểm tạo, tuyệt đối không kill theo tên tiến trình.
- Main bị kill không chạy được cleanup: ledger phải fsync và lần khởi động sau chỉ quét bản ghi có owner đã chết.
- Office COM có thể trả về một Office đang do người dùng sở hữu: chỉ ghi/dọn PID được xác nhận là tiến trình mới của job.
- AutoRecover không được làm thay đổi đường dẫn tệp gốc hoặc tải nội dung lên mạng; normal save/close phải xóa snapshot của phiên.
- Nhật ký hiệu năng không được chứa nội dung hay đường dẫn tài liệu và phải giữ giới hạn dung lượng.

## Test plan

1. Unit Python cho PID identity/sweep/cleanup và performance default/rotation/schema; unit JavaScript cho AutoRecover 2 phút, nhãn dialog, Options/Help và các điểm tích hợp.
2. Đăng ký ba suite CH-9.2/CH-9.4/CH-9.5 trong `tests/run-tests.js` để tổng số test tăng.
3. Desktop WebView2 CDP tuần tự: gõ qua CDP, chờ AutoRecover, kill đúng PID main đã khởi tạo, mở lại và khôi phục text cho cả ba app.
4. Desktop Sheet CDP: mở XLSX nhỏ, chạy chuẩn bị print/PDF (Office COM ẩn nếu có), đóng bình thường và kiểm tra các identity trong ledger đã chết sau 5 giây; lặp kill main rồi xác nhận lần mở kế tiếp quét orphan.
5. Chạy full gate đúng một lần ở cuối: `node tests/run-tests.js`, sau đó `python -m unittest discover -s tests`; chạy audit nặng tuần tự nếu thực sự bắt buộc theo phạm vi.

## Rollback

Revert commit CH-9 trên `feat/ch9-stability-codex`. Không xóa dữ liệu người dùng tự động; các snapshot recovery và log cục bộ hiện hữu vẫn có thể được giữ để người dùng lấy lại tài liệu/chẩn đoán.
