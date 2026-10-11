# Agent Handoff

TASK: Giảm thời gian mở tệp trên desktop thật, tập trung warm start của LibreOffice/UNO.
AGENT/ROLE: Codex / Integration performance
BRANCH: `perf/open-warm-start-codex`
WORKTREE: `E:\VNOffice-codex-warm`
OBJECTIVE: Đo và giảm nút thắt khoảng 3,2 giây khi mở XLSX nhỏ với profile LibreOffice đã có; mục tiêu tổng ≤2,5 giây.

FINDINGS:

```text
main.py (double-click có initial_file)
  ├─ static server + create_window (~147 ms từ Python start)
  ├─ thread _PERSISTENT_SOFFICE.prepare()   ← đã chạy song song WebView2
  │    └─ LibreOffice Python worker
  │         ├─ import uno: 16–31 ms
  │         ├─ spawn soffice: 0–15 ms
  │         ├─ chờ pipe UNO: median 2.953 s  ← nút thắt chính
  │         └─ Desktop service: 0 ms
  └─ XLSX load/store: 0.332–0.357 s → overlay/parse/render
```

- Luồng double-click đã khởi động worker song song với WebView2; yêu cầu mở tệp chờ manager lock cho tới khi pipe sẵn sàng.
- Poll 100 ms không tạo ra 3,2 giây; LibreOffice chỉ mở listener sau khoảng 3 giây. Import UNO và tạo Desktop không đáng kể.
- Thử gọi trực tiếp `soffice.bin` không giảm thời gian mở pipe; `--quickstart=no` làm một probe không đạt UI-ready và đã bị loại bỏ. Không sửa LibreOffice Core, seed profile hoặc build script.
- Đặt tiến trình LibreOffice ở `ABOVE_NORMAL_PRIORITY_CLASS` giúp giảm cạnh tranh CPU/I/O với WebView2; poll 20 ms giảm phần chờ dư sau khi pipe đã mở.

IMPLEMENTATION SUMMARY: Thêm breakdown timing vào handshake worker và log `[VNO Open Perf] worker_stage_breakdown`; giảm resolver poll 100 ms → 20 ms; khởi động soffice với priority trên normal một mức; giữ nguyên command line/fallback/fidelity.

FILES CHANGED: `main.py`; `adapters/libreoffice/common/soffice_uno_worker.py`; `tests/test_soffice_uno_worker_startup.py`; `docs/HANDOFF-OPEN-WARM-START.md`.

COMMANDS RUN: Probe CDP 3 lần trước và 3 lần sau với cùng `LOCALAPPDATA=E:\VNOffice-profiles\persist-codexbaseline`, bản ASCII của workbook 50.909 byte; probe breakdown; unit hẹp; full gates ghi bên dưới.

BUILD RESULT: PASS — `py_compile` cho `main.py`, worker và unit test mới; `git diff --check` sạch.

TEST RESULTS:

| Điều kiện | Run 1 | Run 2 | Run 3 | Median |
|---|---:|---:|---:|---:|
| Trước, process→document open | 5.822 s | 4.843 s | 4.763 s | 4.843 s |
| Sau, process→document open | 4.598 s | 4.841 s | 4.506 s | 4.598 s |

- Cải thiện median 245 ms (5,1%).
- Worker-ready sau: 3.194 / 3.217 / 3.183 s, median 3.194 s.
- Mục tiêu tổng ≤2,5 s: **FAIL**. Nút thắt còn lại nằm trong khởi tạo LibreOffice trước khi pipe UNO xuất hiện, không nằm ở poll/import/Desktop/load-store.
- **PASS** — unit hẹp: 4/4 (`tests.test_soffice_uno_worker_startup` + persistent worker operations).
- **PASS** — `node tests/run-tests.js`: 2623/2623.
- **PASS** — `node --experimental-websocket tests/live/cdp/run-desktop-regression.mjs`: 27 PASS, 0 FAIL, 0 BLOCKED, 6 N/A.
- **PASS** — `node --experimental-websocket tests/live/cdp/cross-app-paste.desktop.mjs`: 7/7.

KNOWN FAILURES: Mục tiêu hiệu năng chưa đạt; không claim PASS.

RISKS: Priority trên normal có thể ưu tiên LibreOffice hơn UI trong lúc engine khởi động; desktop regression và cross-app paste là gate bắt buộc để phát hiện tác động. Timing phụ thuộc tải máy, nên giữ cả ba mẫu thay vì chỉ số tốt nhất.

DEPENDENCIES/BLOCKERS: Để đạt ≤2,5 s trên cache miss cần hướng kiến trúc riêng (engine resident do app quản lý hoặc importer XLSX nhanh có fidelity gate); không nên tiếp tục bằng cờ profile chưa chứng minh vì có thể làm mất tính năng.

CORE PATCH ID (if any): Không có.

NEXT ACTION: Chạy và ghi full gates; commit WIP. Chủ nhiệm quyết định scope tiếp theo cho engine resident/import cache có chính sách bảo mật và invalidation rõ ràng.
