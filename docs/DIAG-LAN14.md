# DIAG-LAN14 — Chỉ số đo hiệu năng mở / lưu `lan14.xlsx`

- **Phạm vi**: CHỈ ĐO. Không sửa bất kỳ file nào trong `apps/`, `adapters/`, `platform/`, `main.py`.
- **Worktree**: `E:\VNOffice-opencode-lan14`, nhánh `diag/lan14-opencode`, HEAD `ce9b05e3`.
- **File đo**: `E:\VN OFice\file test\lan\lan14.xlsx`, 9.742.160 bytes, 10 sheet, 33.692 hàng, **1.435.546 ô** được dùng (`cellsAfterFods`).
- **Ngày đo**: 03/10/2026. Node `v20.20.2`.
- **Số lần đo**: 4 lần mở thành công + 3 lần thử bấm Ctrl+S (2 lần bấm được nhưng **không thu được thời gian lưu nào**, 1 lần probe không bấm nổi).
- **Tiêu chí mục tiêu**: mở < 60 s, RAM < 1,5 GB. **Kết quả đo: mở 237–268 s; đỉnh RAM WebView2 7,57–7,95 GB. Cả hai đều vượt mục tiêu.**

---

## 1. Cách đo và lệnh tái tạo

Probe: `docs/diag-lan14/probe-lan14.mjs` — chỉ đọc, không sửa code app. Mỗi lần chạy tạo 1 instance desktop duy nhất, lấy mẫu quy trình qua PowerShell `Get-CimInstance Win32_Process` (mục tiêu 5 s/lần khi mở, 2 s/lần khi lưu — thực tế lúc lưu là ~15,5 s/lần vì mỗi `Runtime.evaluate` phải chờ đủ 15 s timeout), lấy mẫu trang qua CDP `Runtime.evaluate`, và chép stdout / startup trace / performance log sang cùng thư mục.

```powershell
# 1) Preflight với file nhỏ (phải xong trước khi đo file lớn)
node --experimental-websocket docs\diag-lan14\probe-lan14.mjs preflight  --file "E:\VN OFice\file test\lan\lan02.xlsx"
node --experimental-websocket docs\diag-lan14\probe-lan14.mjs preflight2 --file "E:\VN OFice\file test\lan\lan02.xlsx"

# 2) Đo mở (4 lần)
node --experimental-websocket docs\diag-lan14\probe-lan14.mjs 1
node --experimental-websocket docs\diag-lan14\probe-lan14.mjs 2 --save
node --experimental-websocket docs\diag-lan14\probe-lan14.mjs 3 --save
node --experimental-websocket docs\diag-lan14\probe-lan14.mjs 4 --save

# 3) Tự kiểm tra nhánh lấy cây quy trình (không cần app)
node --experimental-websocket docs\diag-lan14\probe-lan14.mjs selftest --selftest-tree
```

Probe tự làm các việc sau (không cần chuẩn bị tay, xác nhận bằng record `meta`/`file-copy`/`perf-log-settings` trong `samples-*.jsonl`):

- **Sao chép file nguồn vào thư mục tạm rồi mới mở bản sao** — record `file-copy`, ví dụ `E:\VN OFice\file test\lan\lan14.xlsx` → `%TEMP%\vno_lan14_diag\run-<id>\lan14.xlsx` (9.742.160 bytes). File gốc không bao giờ bị sửa.
- **Bật performance log** bằng cách ghi `{"enabled": true}` vào `E:\VNOffice-profiles\opencode-lan14\VNOffice\performance\settings.json` (cấu hình nằm NGOÀI repo, trong profile) — record `perf-log-settings`, kèm `perfLogBytesBefore` để chép chỉ phần mới sang `perflog-*.jsonl`.
- Set `VNO_PERF_DEBUG=1` và `VNO_STARTUP_TRACE_FILE=<trace-*.jsonl>` cho lần chạy đó — record `meta.env`.

Điều kiện an toàn đã tuân thủ trong mọi lần chạy:

- RAM trống trước mỗi lần đo **> 10 GB** (ngưỡng bắt buộc 6 GB) — xem cột "RAM trống trước đo".
- 1 instance desktop tại một thời điểm; không gửi phím bằng SendInput/pyautogui — Ctrl+S được bấm bằng CDP `Runtime.evaluate` trên `globalCommandBus`.
- Không kill tiến trình theo tên; kết thúc bằng `taskkill /PID <pid> /T /F` do probe tự làm trong khối `finally`.
- Không có background task, không push/merge, không sửa file sản phẩm.

Chú ý khi tái tạo: **Node 20 bắt buộc có `--experimental-websocket`**. Nếu thiếu, bản thân app vẫn mở bình thường nhưng probe không gắn được CDP và ghi record `blocked`: `No WebView2 page became available on port …: Node WebSocket is unavailable. Run Node with --experimental-websocket.`

---

## 2. Bảng thời gian mở — 4 lần đo

Đơn vị: giây. Các mốc dùng để tính lấy trực tiếp từ mốc wall-clock trong `stdout-*.log` (Python) và `perflog-*.jsonl`; tổng lấy từ `trace-*.jsonl` → `document_open_complete`.

| Giai đoạn | Lần 1 | Lần 2 | Lần 3 | Lần 4 | TB | % TB |
|---|---:|---:|---:|---:|---:|---:|
| **A.** Khởi động app → in `worker_start_and_profile_ready` | 3,96 | 4,29 | 5,48 | 5,53 | 4,82 | 1,9% |
| **B.** LibreOffice đọc `.xlsx` → xuất FODS (`uno_load_and_store`, **257.170.257 bytes**) | 13,21 | 13,83 | 13,10 | 13,46 | 13,40 | 5,4% |
| **C.** Python đọc FODS + gắn overlay + tối ưu hoá (phần còn lại của `_open_document_dialog_impl`) | **87,37** | **106,78** | **92,13** | **88,62** | **93,73** | **37,7%** |
| **D.** Truyền `content` **315.991.364 ký tự** Python → WebView2 (bridge / pywebview) | **64,03** | **71,79** | **65,02** | **59,45** | **65,07** | **26,2%** |
| **E.** `parseFods` đồng bộ + dựng model + render lần đầu | **72,26** | **70,98** | **70,16** | **70,42** | **70,96** | **28,7%** |
| **Tổng** (`document_open_complete`, python clock) | **240,83** | **267,67** | **245,90** | **237,47** | **247,97** | 100% |

Nguồn từng hàng:

- **A** = record `meta.nodeTs` (t=0) → dòng `worker_start_and_profile_ready` trong `stdout-*.log`. Sai số ±0,5 s vì `meta` được ghi trước khi Python khởi động timer perf.
- **B** = dòng `uno_load_and_store: … ms bytes=257170257` (`main.py:887`), ghi `duration_ms` và in ra wall-clock.
- **C** = mốc cuối của **B** → mốc `operation=open` trong `perflog-*.jsonl` (được ghi tại `main.py:3182-3187`, ngay khi `_open_document_dialog_impl` trả kết quả, `main.py:3815`).
- **D** = mốc `operation=open` → dòng đầu `parseFods:strip embedded objects` (điểm `sheet-adapter.js:4263 parseFods(xmlText)` bắt đầu).
- **E** = mốc trên → `document_open_complete` trong `trace-*.jsonl`.

### 2.1 Chi tiết bên trong E (`parseFods`, lần 1)

`parseFods` **chạy đồng bộ trên main thread của renderer** — toàn bộ 71,4 s không có frame nào được vẽ và CDP `Runtime.evaluate` bị treo.

| Bước | Lần 1 (ms) | Lần 2 (ms) | Bằng chứng |
|---|---:|---:|---|
| `strip embedded objects` | 62,3 | 55,8 | `sheet-adapter.js:4271` |
| `number styles` | 384,3 | 365,6 | `stdout-*.log` |
| `rotation styles` | 262,7 | 271,3 | `stdout-*.log` |
| `cell visual styles` | 286,1 | 292,3 | `stdout-*.log` |
| `text styles` | 278,5 | 290,5 | `stdout-*.log` |
| `row/column styles` | 264,0 | 287,8 | `stdout-*.log` |
| `remove table blocks` | 63,4 | 66,1 | `stdout-*.log` |
| `DOM parse` (DOMParser 257 MB) | **11.806,7** | **12.779,5** | `sheet-adapter.js:4298` |
| `DOM worksheet traversal` (1.435.546 ô) | **51.534,1** | **50.040,1** | `sheet-adapter.js:4583` |
| **Tổng `parseFods`** | **71.416,8** | **70.064,4** | `sheet-adapter.js` → `main.py:3695` |
| `first grid render` | 71.511,4 | 70.255,0 | `stdout-*.log` |
| `loadFromFods` | 72.455,2 | 71.277,3 | `sheet-adapter.js:4875`, `:4901` |
| `first layout` | 72.632,9 | 71.611,7 | `sheet-adapter.js:5135` |

Các dòng `repeat page-layout scans` / `repeat print-title scans` / `repeat tab-color scans` / `find used range` / `build workbook model` được in **theo lô trong 1 ms** ngay sau khi traversal xong (`sheet-adapter.js:4584-4589`), giá trị lấy từ bộ đếm tích luỹ `repeatedXmlScanMs` / `worksheetPhaseMs` nên **chồng lấn nhau và KHÔNG cộng dồn được** — chỉ dùng để so sánh giữa các lần đo, không dùng để chia nhỏ 71,4 s.

### 2.2 CPU trong lúc mở (chỉ lần 4 có đo CPU)

Chuỗi lấy mẫu 5 s, CPU tính từ delta `tree.cpuTreeSec` / delta wall-clock. Đơn vị: % (100% = 1 lõi):

| t (ms) | CPU% | Renderer treo? | tree WS (MB) | Ghi chú |
|---:|---:|:---:|---:|---|
| 7.846 → 112.843 | 80–111 | không | 1.032 → 5.094 | **python.exe** tiêu thụ gần hết (cum 3,6 → 97,7 s); `soffice.bin` dừng ở cum 17,3 s từ t≈27.800 |
| 117.841 | **435,2** | **có** | 6.683 | Cú spike: renderer nhận/dịch chuỗi 316 MB. Cum renderer 6,0 → 16,6 s trong 5 s wall |
| 133.352 → 211.007 | 104–127 | có | 6.969 → **11.052** (đỉnh) | Renderer cum 32,3 → 117 s = 84,7 s CPU / 77,7 s wall ≈ **109% (hơn một lõi liên tục)**; python cum đứng yên ở 98,0 |
| 227.012 | 207,3 | hết | 7.695 | Renderer nhả main thread; `parseFods` vừa xong |
| 238.827 → 253.835 | 0,6–193,7 | không | 7.504 → 7.069 | Các nhịp render/layout cuối |
| 258.841 | 90,8 | không | **3.934** | Lượt layout cuối, WS rớt về mức ổn định |
| 263.829 → 298.840 | 0–0,9 | không | 3.934 | Đã mở xong, im lặng |

**Renderer treo liên tục 109 s** (7–8 mẫu liên tiếp `CDP call timed out: Runtime.evaluate`): lần 1 `t=111.980 → 220.663 ms`, lần 2 `137.101 → 246.975`, lần 3 `118.006 → 226.788`, lần 4 `117.841 → 211.007`. Trên lần 4, cửa sổ treo này phủ **49,2/59,4 s của giai đoạn D (83%)** và **43,9/70,4 s của giai đoạn E (62%)**.

---

## 3. Bảng RAM

| Chỉ số | Lần 1 | Lần 2 | Lần 3 | Lần 4 |
|---|---:|---:|---:|---:|
| RAM trống trước khi đo (KB, theo `meta.freeRAMKBBeforeRun`) | 10.310.068 | 10.997.788 | 11.422.216 | 11.739.948 |
| **WS đỉnh của quy trình WebView2 (renderer) lớn nhất** (MB) | **7.572,0** | **7.679,7** | **7.949,9** | **7.601,0** |
| **WS đỉnh đồng thời của cả cây** trong lúc mở (MB) | 10.653,8 | 10.749,0 | 10.809,0 | **11.051,8** |
| WS cả cây sau khi mở xong, ổn định (MB) | 3.584,4 | 4.316,5 | 4.531,0 | 3.934,0 |
| `usedJSHeapSize` sau khi mở (MB) | 1.182,5 | 1.182,4 | 1.182,4 | 1.182,3 |
| `python.exe` WS đỉnh (MB) | 4.710,3 | 4.710,5 | 4.708,5 | 4.710,2 |
| Tổng cộng dồn `peakWS` từng tiến trình (MB) — **KHÔNG phải đỉnh đồng thời** | 17.037,8 | 17.032,3 | 17.328,8 | 17.104,8 |
| RAM trống tại `save-precheck` (KB) | — | 7.445.244 | 7.405.012 | 7.799.584 |
| WS cả cây trong lúc lưu (MB; cadence thực tế ~15,5 s do mỗi lần `Runtime.evaluate` mất 15 s mới timeout) | — | — | 1.599–1.600 | 1.440–1.460 |

Lưu ý đọc số:

- Dòng "tổng cộng dồn `peakWS`" là tổng mỗi quy trình tự lấy `PeakWorkingSet64` — các quy trình không đạt đỉnh cùng lúc, **không dùng làm số liệu tiêu thụ RAM thật**. Số liệu thật là dòng "WS đỉnh đồng thời của cả cây" (~10,6–11,1 GB).
- `jsHeapSizeLimit` đo được = 4.395.630.592 bytes (~4,09 GiB).
- WS cả cây dao động mạnh giữa các mẫu trong lúc mở (thấp nhất ~1.877 MB, cao nhất 11.052 MB) — Working Set bị hệ điều hành thu hồi/ghi lại, nên chỉ dùng **đỉnh** và **mức ổn định**, không lấy từng mẫu làm số liệu tiêu thụ.

---

## 4. Đường lưu (Ctrl+S) — 3 lần thử

| | Lần thử 1 (`samples-…084500`) | Lần thử 2 (`samples-…085334`) | Lần thử 3 (`samples-…091740`) |
|---|---|---|---|
| Handler tồn tại? | Có — `hasHandler:true`, label `Lưu`, shortcut `Ctrl+S` | Có | Có |
| Trigger trả về | **KHÔNG** — `Runtime.evaluate` không trả về; probe ghi `{"type":"error","error":"CDP call timed out: Runtime.evaluate"}` sau **10.009 ms** kể từ record `save-command-info`, và không có record `save_triggered` | Có — `{"fired":true,"scheduled":true,"path":"command-bus:common.file.save","at":306612}` | Có — `{"fired":true,"scheduled":true,"path":"command-bus:common.file.save","at":297531}` |
| Renderer phản hồi sau trigger | `final.pageEvalError` = `CDP call timed out: Runtime.evaluate` | Evaluate đầu tiên bắn **250 ms** sau trigger với timeout **15.000 ms** → không trả về; record `save-early-check probeError` ở **+15.268 ms** | Giống hệt: record `save-early-check probeError` ở **+15.268 ms** |
| Số mẫu lưu lấy được / lỗi | 0 (probe thoát) | **57 / 57 lỗi** | **58 / 58 lỗi** |
| CPU cả cây trong lúc lưu | — | — (không có CPU data) | **0,0–1,2%** (mỗi mẫu 15,5 s chỉ tốn 0,00–0,19 s CPU) |
| Quy trình WebView2 chính (2,5 GB WS, đỉnh 7,6–7,9 GB) | **biến mất** | **biến mất** | **biến mất** |
| `childCount` cuối | 11 (mở: 12) | 11 (mở: 12) | 11 (mở: 12) |
| Python in thêm dòng nào sau khi lưu? | không | không (log kết thúc `08:57:40,780`) | không (log kết thúc `09:21:38,580`) |
| Kết thúc | probe thoát sớm | `save/limit-reached elapsedMs=1.204.954 doneSince=null` | `save/limit-reached elapsedMs=1.212.632 doneSince=null` |

Bằng chứng định danh quy trình renderer bị mất (lần thử 3, `samples-…091740.jsonl`):

- Mẫu cuối pha mở: `childCount=12`, `msedgewebview2 id=16600 pp=14176 ws=2506,7 MB peakWS=7601 MB`.
- Mẫu đầu pha lưu (tree được đọc ở **+15.268 ms** so với `save_triggered`): `childCount=11`, `id=16600` không còn trong `procs`.
- **58/58 mẫu lưu** không chứa `id=16600` — không quay lại lần nào.
- Mẫu `final`: 6 quy trình `msedgewebview2` còn lại, lớn nhất chỉ 101,6 MB (so với 2.506,7 MB trước đó).
- Lần thử 2 y hệt (`id=6540 ws=2926,9 peakWS=7949,9` → biến mất, 57/57 mẫu không có).
- **Đối chứng**: lần 1 KHÔNG bấm lưu → mẫu `final` có `childCount=12`, 7 quy trình WebView2, renderer `id=764 ws=2168,4 MB` còn nguyên. => Việc renderer biến mất **chỉ xảy ra khi lưu**, không phải hiện tượng chung.

Không có crash dump / minidump nào được tạo, nên nguyên nhân chính xác khiến renderer bị terminate **không xác định được** từ bộ bằng chứng này.

---

## 5. Ba bottleneck xếp hạng

### #1 — Lưu: renderer WebView2 chết ngay khi Ctrl+S, không bao giờ hoàn tất

- **Ảnh hưởng đo được**: **> 1.200 giây và không có kết quả** (2 lần chạy đầy đủ đều chạm `SAVE_LIMIT_MS = 1.200.000 ms` với `doneSince=null`). CPU cả cây trong lúc này **0,0–1,2%** (lần lưu thử 3) → không phải đang tính toán, mà là treo/tắt.
- **Cơ chế quan sát được**: sau khi `globalCommandBus.execute("common.file.save")` được hẹn chạy bằng `setTimeout(…, 0)`, evaluate đầu tiên probe bắn ở **+250 ms** không trả về trong 15.000 ms → renderer đã treo trong khoảng **250 ms – 15,2 s**. Mẫu lưu đầu tiên đọc cây quy trình ở **+15.268 ms** đã thấy `childCount` rớt **12 → 11** (quy trình WebView2 chính biến mất), và **57–58/58 mẫu** sau đó không còn thấy nó lần nào trong suốt 20 phút.
- **Điểm code cần xem**:
  - `adapters/libreoffice/sheet/sheet-adapter.js:6155` — `case "common.file.save":`
  - `adapters/libreoffice/sheet/sheet-adapter.js:5348` — `async save()`
  - `adapters/libreoffice/sheet/sheet-adapter.js:5353` — `const fodsContent = this.serializeToFods();` (đồng bộ, chạy trong main thread, ngay trong expression của `Runtime.evaluate`)
  - `adapters/libreoffice/sheet/sheet-adapter.js:2950` — `serializeToFods()` (đối ứng `parseFods`, serialize lại toàn bộ 1,43 triệu ô)
  - `adapters/libreoffice/common/uno-bridge.js:219,226` — `saveRealFileInPlace` → `save_document_in_place`
  - `main.py:4132` — `_save_document_in_place_impl`
- **Bằng chứng**: `samples-20261003-084500.jsonl` (dòng 121–125), `samples-20261003-085334.jsonl`, `samples-20261003-091740.jsonl` (dòng 119–124).

### #2 — Mở giai đoạn C: 87–107 s Python xử lý FODS 257 MB

- **Ảnh hưởng đo được**: **37,7% thời gian mở** (trung bình 93,7 s), lớn nhất trong 5 giai đoạn.
- **Cơ chế**: sau khi LibreOffice xuất FODS xong, Python đọc toàn bộ 257.170.257 bytes vào RAM rồi xử lý tuần tự trước khi trả về cho renderer.
- **Điểm code**:
  - `main.py:3887` — `out_path = _run_soffice_convert(convert_src_path, target_ext, tmp, app_kind=app_kind)`
  - `main.py:3889` — `content = f.read()` (nạp 257 MB vào `str` Python)
  - `main.py:3929` — `content = _apply_native_import_overlay(...)` (định nghĩa `main.py:1741`)
  - `main.py:3935` — `content = _optimize_fods_for_sheet(content)` (định nghĩa `main.py:1806`)
  - `main.py:3182-3187` — nơi ghi `operation=open` (mốc cuối của giai đoạn này)
- **Rủi ro RAM**: `python.exe` đạt `peakWS` 4.710,2 MB trong lúc xử lý chuỗi này.

### #3 — Mở giai đoạn E: `parseFods` đồng bộ 70–72 s trên main thread

- **Ảnh hưởng đo được**: **28,7% thời gian mở** (trung bình 71,0 s). Cùng với giai đoạn D ở trên, đây là lý do renderer mất main thread suốt ~109 s — người dùng thấy "đứng hình" chứ không chỉ là chờ.
- **Cơ chế**: `DOM parse` 11,8 s + `DOM worksheet traversal` 51,5 s (1.435.546 ô) chạy liền mạch, không nhường main thread.
- **Điểm code**:
  - `adapters/libreoffice/sheet/sheet-adapter.js:4263` — `parseFods(xmlText)` (đầu giai đoạn D→E)
  - `adapters/libreoffice/sheet/sheet-adapter.js:4894` — `workbook = this.parseFods(xml)`
  - `adapters/libreoffice/sheet/sheet-adapter.js:4298` — `perfReport("DOM parse", phaseStart)` → 11.806,7 ms
  - `adapters/libreoffice/sheet/sheet-adapter.js:4583` — `perfReport("DOM worksheet traversal", phaseStart)` → 51.534,1 ms
  - `adapters/libreoffice/sheet/sheet-adapter.js:4875`, `:4901` — `loadFromFods` → `_commitWorkbook(..., "loadFromFods")`
- **Vị trí thứ tư sát nút**: giai đoạn D (truyền 315.991.364 ký tự Python → WebView2), 26,2% (~65 s), chồng lên cửa sổ renderer treo ở #3. Không có mốc log bên trong nên chỉ xác định được hai đầu.

---

## 6. Không đo được (NOT MEASURED / BLOCKED)

Theo mục 8 AGENTS.md, các mục dưới đây **không có số liệu** và không được suy đoán:

1. **Bên trong giai đoạn C (87–107 s)**: không tách được ranh giới giữa đọc FODS, `_apply_native_import_overlay`, `_optimize_fods_for_sheet` — không có dòng log nào giữa mốc `uno_load_and_store` và mốc `operation=open`.
2. **Bên trong giai đoạn D (59–72 s)**: không tách được "Python serialize sang pywebview" vs "WebView2 giải mã chuỗi" — chỉ có 2 mốc (perflog end, `parseFods` đầu tiên).
3. **Toàn bộ số liệu giai đoạn lưu**: `serializeMs`, `transportStart`, `adapterSaveStart/End`, `saveDoneAt` **không tồn tại** vì renderer tắt trước khi hook kịp ghi. Không có thời gian lưu thật.
4. **Nguyên nhân renderer bị terminate**: không có crash dump, không có `pageerror`, chỉ ghi nhận được sự kiện quy trình biến mất khỏi cây.
5. **CPU cho lần mở 1–3** (và do đó cả lần lưu thử 1, 2): probe chỉ bật nhánh CPU từ lần mở 4 (= lần lưu thử 3). Lần 1–3 có `cpuSamples=0`.
6. **Các timer con in theo lô** trong `parseFods` (dòng 19–23 của stdout): chồng lấn, không cộng dồn được (xem §2.1).
7. **`selection-to-first-grid`** (239.131,8 / 265.969,5 ms) chỉ là thời điểm sự kiện được bắn, **không phải thời gian render** — không dùng làm số liệu hiệu năng.
8. **`performance.jsonl`** chỉ ghi 2 bản ghi mỗi lần chạy (`soffice_start`, `open`), không thêm chiều dữ liệu nào khác.

Ba lần chạy lỗi trước khi đo được file lớn (giữ nguyên làm bằng chứng, không xoá):

| File | Record kết thúc | Nguyên nhân (theo artifact) |
|---|---|---|
| `samples-20261003-082422.jsonl` | dừng ngay sau `file-copy` | Không có record `perf-log-settings` / `process_start`, `stdout-*.log` rỗng 0 byte. **Nguyên nhân không ghi trong artifact** — suy đoán từ mặt phẳng mã là bước ghi `performance/settings.json` bị lỗi (đã vá bằng `mkdir` trước đó). |
| `samples-20261003-082442.jsonl` | `{"type":"blocked","phase":"launch","launchMs":41287}` | Thiếu `--experimental-websocket`: `No WebView2 page became available on port 63824: Node WebSocket is unavailable. Run Node with --experimental-websocket.` (`client.mjs:133`). Ứng dụng thật vẫn mở xong (`document_open_complete` ở 7.145 ms với `lan02.xlsx`), chỉ probe không gắn được CDP. |
| `samples-20261003-082537.jsonl` | `{"type":"blocked","phase":"launch","launchMs":51104}` | Ready timeout: `Timed out waiting for page state: !!document.querySelector(".vno-sheet-container"); last value=false` (`session.mjs:67` → `client.mjs:106`). App đã tự đóng cửa sổ ở 46.999 ms. Xảy ra đúng 1 lần. |

---

## 7. Bằng chứng thô (giữ nguyên, không chỉnh sửa)

Thư mục `docs/diag-lan14/`:

| Loại | File |
|---|---|
| Probe | `probe-lan14.mjs` |
| Mở lần 1 (không lưu) | `samples-20261003-083524.jsonl`, `stdout-…083524.log`, `trace-…083524.jsonl`, `perflog-…083524.jsonl`, `launch-output-…083524.txt` |
| Mở lần 2 + lưu thử 1 | `samples-20261003-084500.jsonl`, `stdout-…084500.log`, `trace-…084500.jsonl`, `perflog-…084500.jsonl`, `launch-output-…084500.txt` |
| Mở lần 3 + lưu thử 2 | `samples-20261003-085334.jsonl`, `stdout-…085334.log`, `trace-…085334.jsonl`, `perflog-…085334.jsonl`, `launch-output-…085334.txt` |
| Mở lần 4 + lưu thử 3 (**có CPU**) | `samples-20261003-091740.jsonl`, `stdout-…091740.log`, `trace-…091740.jsonl`, `perflog-…091740.jsonl`, `launch-output-…091740.txt` |
| Preflight | `samples-20261003-082823.jsonl` (+ log/trace/perflog tương ứng, file `lan02.xlsx`) |
| Lỗi | `samples-20261003-082422.jsonl`, `-082442.jsonl`, `-082537.jsonl` |

Cấu trúc mỗi dòng `samples-*.jsonl`: `meta` → `phase/ui_ready` → `sample` (5 s/lần: `tMs`, `pageEvalError`, `tree.treeWsMB`, `tree.cpuTreeSec`, `cpuTop`, `procs[].k/u`, `peaks[].peakWS`) → `note/phase/save-*` → `final` → `perf-log-copy` → `end`.

Ghi chú về Git: các file `stdout-*.log` nằm trong diện bắt buộc của `.gitignore:42` (`*.log`), nên phải `git add -f` để làm bằng chứng đi kèm báo cáo. Không sửa `.gitignore`.

---

## 8. Trạng thái

| Hạng mục | Trạng thái | Ghi chú |
|---|---|---|
| Đo mở lần 1 | **ĐÃ CHẠY** | 240,83 s, có số liệu đầy đủ |
| Đo mở lần 2 | **ĐÃ CHẠY** | 267,67 s, có số liệu đầy đủ |
| Đo mở lần 3 | **ĐÃ CHẠY** | 245,90 s; không ghi được record `vnoDiag` mở trong `samples-…085334.jsonl` (các số liệu mở vẫn đủ từ stdout/perflog/trace) |
| Đo mở lần 4 | **ĐÃ CHẠY** | 237,47 s, lần duy nhất có CPU |
| Đo lưu lần 1 | **BLOCKED** | `Runtime.evaluate` timeout khi trigger; probe thoát sớm |
| Đo lưu lần 2, 3 | **BLOCKED** | Chạm giới hạn 20 phút với `doneSince=null`; renderer đã tắt |
| Unit test / build | **NOT RUN** | Thay đổi chỉ gồm file `docs/`, không đụng code sản phẩm |
| Sửa code sản phẩm | **KHÔNG** | Không file nào ngoài `docs/` bị sửa |

**Handoff cho agent Codex**: dùng §5 (3 bottleneck kèm `file:số dòng`) làm đầu vào cho kế hoạch tăng tốc; §4 là ràng buộc cứng — mọi phương án lưu phải giải quyết được việc renderer chết trước, nếu không mọi số liệu tiếp theo về lưu sẽ tiếp tục là `BLOCKED`. Số liệu nền để so sánh sau khi sửa: mở = **240,83 / 267,67 / 245,90 / 237,47 s**, đỉnh RAM WebView2 = **7,57–7,95 GB**, đỉnh cả cây = **10,65–11,05 GB**.
