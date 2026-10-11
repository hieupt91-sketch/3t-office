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

## Bài chỉ chạy được trên Windows nhưng chưa được đánh dấu skip

| Bài kiểm | Kết quả | Lý do |
|---|---|---|
| `test_desktop_launch.DesktopLaunchTests.test_main_returns_exit_code_when_no_port_available` | ERROR | Bài kiểm vá trực tiếp `ctypes.windll.user32.MessageBoxW`; `ctypes.windll` không tồn tại trên macOS. |
| `test_writer_create_new_readback.WriterCreateNewReadbackTests.test_word_com_values_are_normalized_before_comparison` | ERROR | Bài kiểm gọi `powershell` và dùng Word COM làm oracle; macOS không có PowerShell/Word COM. |
| `test_os_services_p2.ServicesMatchLegacyTests.test_user_data_dir_equals_legacy_with_and_without_localappdata` | FAIL | Bài P2 giả định `LOCALAPPDATA` của Windows; backend macOS đúng phải dùng `~/Library/Application Support/VNOffice`. |
| `test_os_services_p2.ServicesMatchLegacyTests.test_show_error_never_raises_and_reports_through_a_result` | FAIL | Expected của bài P2 mô tả hộp thoại Windows bị mock lỗi; backend portable/macOS hiện ghi stderr và trả thành công. |

Các bài trên cần được bảo vệ bằng điều kiện nền tảng ở nhánh `main`; không vô hiệu hóa và không đổi expected chỉ để làm xanh nhánh macOS.

## Lỗi portability thật cần sửa trên macOS

| Bài kiểm | Kết quả | Khoảng trống hiện tại |
|---|---|---|
| `test_p1_pool_orphans.PoolOrphanTests.test_parent_alive_probe_reports_a_dead_pid_as_dead` | FAIL | Hàm nhận dạng tiến trình cha chưa đọc đúng creation token/PID trên Darwin nên báo PID hiện tại là đã chết. |
| `test_process_tracker.ProcessTrackerTests.test_cleanup_terminates_a_real_child_started_by_the_test` | FAIL | Process tracker chưa dọn và xóa ledger của cây tiến trình con trên Darwin. |

Hai lỗi này không được xếp Windows-only; chúng là việc phải hoàn thành trong backend/dịch vụ tiến trình macOS.

## Trạng thái liên quan

- Node: 3065/3066 PASS; còn một sai khác hash snapshot `sample-sheet.fods`.
- Desktop CDP trên QtWebEngine: 21 PASS, 6 FAIL, 6 N/A; không có ca BLOCKED.
- Ba ứng dụng đều khởi động, nhập liệu, tạo mới, lưu, lưu lại và mở lại được qua CDP.
