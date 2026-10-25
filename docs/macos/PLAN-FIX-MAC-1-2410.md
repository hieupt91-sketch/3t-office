# PLAN — FIX-MAC-1 (sửa lỗi macOS thật do GATE-1 phát hiện)

Nhánh `mac/fix1-cl-2410` · worktree `/Volumes/Data/Worktrees/mac-fix1-cl-2410` · gốc `aecf9ac5` (mac/gate-cl-2410).
Nguồn lỗi: `docs/macos/GATE-2410.md` §3–4, `docs/macos/HANDOFF-GATE-1-2410.md`.

## Mục tiêu
Sửa tận gốc C-1, C-2, C-5, C-3 (và C-6 nếu tối thiểu), cùng B-2 (4 test Node gọi cứng `python`), mỗi mục một commit kèm test hồi quy fail-trước/pass-sau. Không nới audit, không đổi expected.

## Hiện trạng và cách sửa
| ID | Hiện trạng | Sửa | Tệp |
|---|---|---|---|
| C-1 | Group `appearance` (3 ribbon) chỉ có `label: "Giao diện"`, không `labelKey` → EN hiện tiếng Việt, test i18n FAIL | Thêm `labelKey: "<app>Ribbon.group.appearance"` + chuỗi VI "Giao diện" / EN "Appearance" theo quy ước sẵn có; cập nhật bài Trợ giúp `*.view.toggleTheme` đúng vị trí thật (Chế độ xem › Giao diện) | `apps/{writer,sheet,slides}/*-ribbon.js`, `platform/i18n/strings-{vi,en}.js`, `platform/help/entries-gaps-0410.js`, test mới |
| C-2 | `common.view.toggleTheme` gắn handler trong `platform/bootstrap.js:53`, khác mọi lệnh `common.view.*` khác (gắn trong `AppShell._setupGlobalShortcuts`, `platform/shell/app-shell.js`) → audit tĩnh báo nút chết | Chuyển việc gắn handler về `_setupGlobalShortcuts` cạnh `zoomIn/zoomOut/ribbonToggle` (một nơi duy nhất), bỏ dòng ở bootstrap. Audit giữ nguyên | `platform/shell/app-shell.js`, `platform/bootstrap.js` |
| C-5 | Darwin dùng backend `portable`: `show_error` chỉ in stderr, `reveal_path` = not_supported | Tạo `platform/os_services/macos.py` (data dirs giữ nguyên `~/Library/Application Support/VNOffice` như launcher Swift `ports/macos/launcher/AppDelegate.swift:39` và bản legacy — không di chuyển dữ liệu; find_document_engine như portable + LibreOffice đóng gói; `open_path` = `open`; `reveal_path` = `open -R`; `show_error` = `osascript` với thông điệp truyền qua argv, không shell). Đăng ký `darwin → macos` | `platform/os_services/macos.py`, `platform/os_services/__init__.py`, `tests/macos/test_os_services_macos.py`, Trợ giúp |
| C-3 | Con bị SIGTERM thành zombie trên macOS; `ps -o lstart=` vẫn in → coi là còn sống → `cleanup()` giữ bản ghi | `process_identity`: tiến trình ở trạng thái Z (macOS `ps -o stat=`, Linux trường state của `/proc/<pid>/stat`) trả `None` (đã chết). Không đổi token định danh (vẫn `lstart`) để bản ghi cũ vẫn khớp | `platform/process_lifecycle/process_tracker.py`, `tests/test_process_tracker_ps.py` |
| C-6 | `_p1_parent_alive` POSIX so `os.getppid()==pid` | Chỉ sửa nếu tối thiểu và rõ là lỗi; vùng `adapters/**` thuộc Integration → mặc định ghi handoff | `adapters/libreoffice/common/ooxml_zip_patch.py` |
| B-2 | 4 test Node gọi `spawnSync("python")` | `process.env.PYTHON \|\| (process.platform === "win32" ? "python" : "python3")` — trên Windows không có PYTHON thì y hệt cũ | 4 tệp `tests/unit/*.test.js` |

## Phụ thuộc
Không thêm thư viện. `open`, `osascript`, `ps` có sẵn trên macOS.

## Rủi ro
- C-2: nếu trang nào gọi `bootstrapPlatform()` mà không dựng `AppShell` thì mất handler theme. Đã kiểm: ba app (`apps/*/…-app.js`) đều dựng AppShell; trang smoke `tests/smoke/temp-slides-layout-browser.html` không dùng lệnh theme.
- C-5: `tests/test_os_services_contract.py:69` khẳng định `darwin → portable` kèm chú thích "portable until macos.py exists" — đây là trạng thái chuyển tiếp mà phiếu yêu cầu thay; cập nhật dòng này và ghi rõ trong handoff. `show_error` mở hộp thoại thật: chạy không chặn (`Popen`) với `giving up after` để không treo tiến trình gọi.
- C-3: thêm một lần gọi `ps -o stat=` cho mỗi lần kiểm định danh trên macOS (vài ms).

## Kế hoạch kiểm
Baseline (đã chạy): `npm test` mode B 3771/3781, 10 FAIL. Sau mỗi mục: test hồi quy mới (fail trước/pass sau), test có sẵn liên quan. Cuối: `npm test` mode B (không có FAIL mới), `node scripts/audit-0610/i18n_parity.mjs`, `pytest tests/macos`, pytest có mục tiêu, pytest cả bộ qua heavy-lock `--continue-on-collection-errors` so với GATE-1 (1140/9/18/1).

## Rollback
Mỗi mục là một commit độc lập trên `mac/fix1-cl-2410`; hoàn tác bằng `git revert <hash>`. C-5 có thể tắt tức thì bằng `VNO_OS_SERVICES_LEGACY=1` hoặc đổi lại `register_backend("darwin", "portable")`.
