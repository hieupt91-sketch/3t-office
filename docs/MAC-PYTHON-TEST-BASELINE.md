# Baseline kiểm thử Python trên macOS

Ngày chạy: 11/10/2026

Máy: macOS 15.8.1 (24H32), Apple Silicon arm64

Python: CPython 3.12.15

LibreOffice: 26.8.0.3 arm64

## Lệnh

```bash
PATH="$PWD/.venv/bin:$PATH" \
VNOFFICE_SOFFICE_PATH=/Applications/LibreOffice.app/Contents/MacOS/soffice \
python -m unittest discover -s tests
```

## Kết quả ban đầu

Sau khi thêm bài kiểm backend macOS: `Ran 858 tests in 65.468s` — 4 FAIL, 2 ERROR, 29 SKIP; 823 bài còn lại PASS.

Lần chạy lại sau khi sửa process tracker Darwin: `Ran 859 tests in 65.286s` — 3 FAIL, 2 ERROR, 29 SKIP; 825 bài PASS. Hai lỗi process/orphan đã hết. Bài import comments thất bại trong lần chạy cả bộ nhưng PASS khi chạy riêng cùng 15 bài process tracker; cần chạy lại cả bộ trước khi kết luận lỗi sản phẩm.

## Bài chỉ chạy được trên Windows nhưng chưa được đánh dấu skip

| Bài kiểm | Kết quả | Lý do |
|---|---|---|
| `test_desktop_launch.DesktopLaunchTests.test_main_returns_exit_code_when_no_port_available` | ERROR | Bài kiểm vá trực tiếp `ctypes.windll.user32.MessageBoxW`; `ctypes.windll` không tồn tại trên macOS. |
| `test_writer_create_new_readback.WriterCreateNewReadbackTests.test_word_com_values_are_normalized_before_comparison` | ERROR | Bài kiểm gọi `powershell` và dùng Word COM làm oracle; macOS không có PowerShell/Word COM. |
| `test_os_services_p2.ServicesMatchLegacyTests.test_user_data_dir_equals_legacy_with_and_without_localappdata` | FAIL | Bài P2 giả định `LOCALAPPDATA` của Windows; backend macOS đúng phải dùng `~/Library/Application Support/VNOffice`. |
| `test_os_services_p2.ServicesMatchLegacyTests.test_show_error_never_raises_and_reports_through_a_result` | FAIL | Expected của bài P2 mô tả hộp thoại Windows bị mock lỗi; backend portable/macOS hiện ghi stderr và trả thành công. |

Các bài trên cần được bảo vệ bằng điều kiện nền tảng ở nhánh `main`; không vô hiệu hóa và không đổi expected chỉ để làm xanh nhánh macOS.

## Lỗi portability Darwin đã sửa trong nhánh làm việc

| Bài kiểm | Baseline | Trạng thái hiện tại |
|---|---|---|
| `test_p1_pool_orphans.PoolOrphanTests.test_parent_alive_probe_reports_a_dead_pid_as_dead` | FAIL | PASS sau khi dùng signal 0 để kiểm tra PID POSIX. |
| `test_process_tracker.ProcessTrackerTests.test_cleanup_terminates_a_real_child_started_by_the_test` | FAIL | PASS sau khi lấy identity và cây tiến trình Darwin qua `libproc`. |

15 bài mục tiêu về orphan/process tracker đã chạy: 14 PASS, 1 SKIP Windows-only.

## Trạng thái liên quan

- Node trên nhánh này: 3065/3066 PASS; PR dùng chung #2 cập nhật snapshot sau khi thêm kiểm tra ngữ nghĩa và đạt 3066/3066 PASS trên Node 20.20.2. Cần đồng bộ PR #2 vào `platform/macos` sau khi được hợp nhất vào `main`.
- Desktop CDP trên QtWebEngine: 21 PASS, 6 FAIL, 6 N/A; không có ca BLOCKED.
- Ba ứng dụng đều khởi động, nhập liệu, tạo mới, lưu, lưu lại và mở lại được qua CDP.
