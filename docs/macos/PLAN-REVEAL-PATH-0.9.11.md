# Plan gate — macOS `reveal_path` 0.9.11

OBJECTIVE: Cho backend macOS mở Finder, chọn đúng tệp mà người dùng vừa xuất/chuyển đổi bằng lệnh hệ thống tương đương `open -R <path>`.

CURRENT CAPABILITY: Hợp đồng `Launcher.reveal_path()` đã có trong `base.py`. Windows gọi Explorer `/select,`; portable trả `not_supported`. Mốc `platform/macos@5def067` chưa chứa module `macos.py`; backend macOS đầy đủ đang được tích hợp ở nhánh cổng riêng.

FILES/MODULES:
- `platform/os_services/macos.py`: `MacOSLauncher` kế thừa portable và chỉ override `reveal_path`; `build_services()` giữ các dịch vụ portable hiện có.
- `tests/test_os_services_reveal.py`: kiểm file thiếu, argv `open -R`, Unicode/khoảng trắng, exit code và lỗi tiến trình.
- Handoff trong `docs/macos/`.

DEPENDENCY: Chỉ Python stdlib (`subprocess`, `pathlib`); không thêm package, không đổi updater/app/shared contract.

RISK: Commit không sửa backend selector theo giới hạn scope; khi tích hợp vào nhánh có backend macOS đầy đủ, giữ method `reveal_path` này trong `MacOSLauncher` hiện hữu. `open` có thể trả lỗi nếu Finder/LaunchServices không sẵn sàng.

TEST PLAN: `tests/test_os_services_reveal.py`, relevant OS services tests, `py_compile`, `git diff --check`.

ROLLBACK: Revert commit; không migration và không thay đổi dữ liệu người dùng.
