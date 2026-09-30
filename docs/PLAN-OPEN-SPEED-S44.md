# S44 — Plan: đo đối chứng và mở tệp nhanh

## Objective

Đo cùng bộ tệp trên Word/Excel 2016, LibreOffice desktop và VN Office; sau đó giảm độ trễ tới nội dung nhìn thấy mà không đổi kết quả tài liệu. Ưu tiên hiển thị viewport đầu của workbook lớn và chỉ bật payload mặc định sau khi đủ audit 26 tệp.

## Current capability

- S40 có UNO worker, tiến độ mở và timeline selection→first paint. `d24` giữ CLI do khác biệt textbox với UNO.
- Sheet có `SHEET_OPEN_PAYLOAD`, parser JS và API payload Python; lan11 vẫn mất phần lớn thời gian ở post-process, bridge và parse.
- Audit 26 workbook gần nhất báo `TONG sai lech: 0`/tệp, nhưng chưa xác nhận lại khi streaming/payload bật mặc định.
- Oracle Office/LibreOffice S44 chưa có bảng kết quả chung; WPS không cài trên máy.

## Modules/files

- Measurement scripts under `scripts/layout-audit/` or `scripts/perf-proto/`, reusing existing Word/Excel COM scripts and adding UI Automation for LibreOffice window detection.
- `main.py` and Sheet adapter/parser/grid only where needed to emit viewport-first data, stream remaining rows, and gate full-model operations.
- Writer adapter/OOXML post-processing only where profiling identifies avoidable work or first-page rendering delays.
- `docs/HANDOFF-OPEN-SPEED.md` for S44 oracle table, before/after data, gates, and handoff.

## Dependencies and boundaries

- No new package or framework. Reuse installed Office COM, LibreOffice UNO, existing payload pipeline, Windows UI Automation, and current LAN fixtures.
- Run Excel checks sequentially; on `RPC_E_CALL_REJECTED`, wait briefly and retry before recording a failure.
- Partial Sheet models must not run formula calculation, search, save, print, or AutoRecover. Those actions must complete hydration first.
- Preserve UI→Platform→Adapter→LibreOffice layering; no core patch or document format semantic changes.

## Risks

- Streaming bugs can omit rows/styles or expose partial data to save/print/autorecovery; enforce a single hydration promise/barrier shared by every full-model operation.
- FODSpayload fidelity changes can affect xlsx conversion; do not enable by default until all 26 LAN audit files pass with exact zero differences.
- COM/UNO automation contention and low RAM can distort timing; serialize Excel and defer heavy audits below 5 GB free RAM.
- LibreOffice window detection must use UI Automation and must not inject keyboard input.

## Test and measurement plan

1. Record two cold-ish and two warm opens per fixture/app, with WPS marked NOT RUN. Cold-ish means first open after closing the target app; warm means immediate repeat with the app/profile still initialized.
2. Capture Word/Excel `Open` call wall time, LO document-window title appearance, and VN selection→first-paint timeline.
3. Optimize the largest measured Sheet and Writer costs, preserving the existing semantic/page-count gates.
4. Run requested Node and Python suites (rerun flaky soffice tests alone if needed), `_batch_writer` d01–d24 except d10, and the 26-file LAN Sheet audit. Excel COM subchecks run sequentially with a short retry for `RPC_E_CALL_REJECTED`.
5. Recheck free RAM before each heavy run; do not start when under 5 GB.

## Rollback

- Keep payload behavior behind `SHEET_OPEN_PAYLOAD`; restore its previous default if any of 26 fidelity audits differ.
- Retain existing full-load model path and CLI conversion fallback. Revert only S44 scoped hunks/files if correctness or page parity changes; do not reset or clean the branch.
