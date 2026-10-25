"""Nhung bai kiem nay chi dung tren macOS/POSIX (duong dan /, osascript, launcher Xcode).
Tren Windows chung bi bo qua (khong xoa, khong doi ky vong) - Mac van chay chung day du.
Xem docs/sync/INBOX-MAC.md va docs/sync/INBOX-WIN.md (Q64: test khong phu thuoc nen tang)."""
import sys

collect_ignore = []
if sys.platform == "win32":
    collect_ignore = [
        "test_engine_fonts.py",
        "test_os_services_macos.py",
        "test_runtime_python_deps.py",
        "test_xcode_run_payload.py",
    ]