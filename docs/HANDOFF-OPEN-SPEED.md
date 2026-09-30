# S40 — Mở tệp nhanh (baseline trước khi sửa)

## Mục tiêu

Giảm thời gian từ lúc chạy app tới lúc thấy và sửa được nội dung Word/Excel, trước tiên ưu tiên Writer; xử lý .docx/.doc và .xlsx/.xls offline bằng đúng LibreOffice đi kèm. Giữ nguyên hành vi fidelity hiện có. Đưa trạng thái mở có tiến độ vào UI, rồi đo lại theo cùng quy trình.

## Năng lực hiện tại

- `main.py::_run_soffice_convert()` khởi chạy `soffice --convert-to` mỗi lần gọi, dùng profile theo loại app, rồi chờ tiến trình thoát.
- `_open_document_dialog_impl()` đọc đầu ra HTML/FODS/FODP, chạy overlay/post-process Python và đóng gói payload cho JS bridge.
- Writer `open()` nhận payload, chuẩn hóa HTML/OOXML, thay DOM, cập nhật phân trang. Sheet đã có cờ đo `window.__vnoPerfDebug` cho `parseFods`, nhưng chưa đo đủ chuỗi mở tệp end-to-end.
- UI có app shell/UI kit dùng chung; sẽ tái dùng để hiện tiến độ mở thay vì tạo mẫu tải riêng cho mỗi app.
- Người phụ trách đo trên pilot trước task: cửa sổ khoảng 2 giây, DOCX 15–30 giây; lần mở đầu trên máy mới khoảng 50 giây. Đây là số liệu tham khảo, không thay cho baseline local bên dưới.
- Baseline local: warm d03 4.1 giây ở mỗi lần gọi soffice; warm lan11 4.4 giây hậu xử lý Python + 1.0 giây bridge + 1.0 giây parse. Cold DOCX→HTML/XLSX→FODS warm-up bằng đường app mất 16–18 giây trên profile mới.
- Đã xác nhận LibreOffice kèm theo có Python 3.12, `uno.py`, `pyuno.pyd`; UNO local pipe là phương án có thể kiểm tra trực tiếp.

## Kế hoạch (plan gate)

1. Chép đầu vào audit vào `file test/` (đã ignore): DOCX d01–d12 và d24, XLSX toàn bộ LAN set (26 tệp), cùng legacy01.doc/.xls. Không đưa các tệp này vào Git.
2. Đo baseline hai lượt với profile LibreOffice mới cho từng lượt cold và hai lượt warm với profile đã khởi tạo; lưu thời lượng process/window/UI-ready, soffice/profile init, convert, Python post-process, bridge transfer, JS parse/render/first-paint. Giữ lại từng run và median trong bảng.
3. Thử UNO helper Python đi kèm LibreOffice qua pipe cục bộ, một instance mỗi app process. Giữ `--convert-to` làm fallback; chỉ dùng đường UNO khi probe chứng minh filter/output tương đương và helper có thể khởi động, giám sát, restart, dừng cùng app.
4. Khởi tạo/warm profile nền sau khi app mở; không chặn cửa sổ. Bộ cài pilot cũng warm filter DOCX→HTML và XLSX→FODS vào đúng profile người dùng trước khi tạo shortcut, để lần mở ngay sau cài không chịu cold filter initialization.
5. Thêm instrumentation đủ để phân biệt conversion, post-process, bridge, parse, render và first paint.
6. Thêm chỉ báo tiến độ truy cập được bằng bàn phím qua UI kit/platform trong luồng mở Writer và Sheet; có trạng thái lỗi/kết thúc rõ ràng.
7. Đo lại sau từng thay đổi. Chỉ giữ tối ưu parse/render nếu profiling chỉ ra hotspot >1 giây ở tệp nhỏ/vừa và kiểm tra không làm đổi kết quả.

### Modules dự kiến

- `main.py`: profile warm-up, quản lý worker, đo stage Python, fallback và shutdown.
- `adapters/libreoffice/common/soffice_uno_worker.py` (nếu probe UNO khả thi): giao thức JSON-lines riêng cho helper dùng Python/UNO có sẵn trong LibreOffice.
- `scripts/install-pilot.ps1`: gọi warm-up offline tùy chọn sau khi chép app; không đổi framework/build.
- `index.html`, `platform/ui-kit/components.js`, `platform/ui-kit/ui-kit.css`, cùng adapter Writer/Sheet: trạng thái mở dùng chung; chỉ sửa đúng điểm cần để hiện/ẩn.
- `docs/HANDOFF-OPEN-SPEED.md`: quy trình, số đo, kết quả so sánh, test và handoff cuối.

### Phụ thuộc và ranh giới

- Không thêm dependency. Helper chỉ dùng `python.exe`, `uno.py`, `pyuno.pyd`, `soffice.exe` của LibreOffice đã đóng gói.
- Worker dùng pipe UNO cục bộ riêng phiên, không lắng nghe mạng và không gửi dữ liệu ra ngoài. UI vẫn gọi platform bridge, không gọi LibreOffice.
- Bộ cài gọi warm-up tạo profile người dùng và chuyển đổi hai tài liệu DOCX/XLSX tối thiểu cục bộ; không truy cập fixture hoặc tài liệu người dùng.
- Chỉ sửa integration/platform shell cho luồng mở; không đổi format/model, không sửa LibreOffice Core, không đổi build system.

### Rủi ro và kiểm soát

- UNO `storeToURL` có thể không tương đương hoàn toàn với `--convert-to`; so HTML/FODS trước khi bật, và fallback về đường cũ khi lỗi/khác biệt.
- Worker có thể treo/crash; đặt timeout, restart một lần, sau đó dùng đường cũ. Profile mỗi app không được chia sẻ với instance khác.
- Worker/background warm-up cạnh tranh CPU/RAM với UI; chạy nền, tuần tự hóa theo profile, dừng khi app đóng.
- Warm-up trong bộ cài tăng thời gian cài một lần (baseline cold khoảng 16–18 giây cho mỗi filter app); nếu thất bại thì cài xong vẫn được và app tự warm nền khi mở.
- Cache font/profile có thể làm cold/warm khác nhau; ghi rõ profile mới/đã ấm và không trộn hai nhóm.

### Test và rollback

- Chạy `node tests/run-tests.js` và `python -m unittest discover -s tests`; nếu test soffice flaky thì chạy riêng lại và báo cả hai kết quả.
- Chạy `scripts/layout-audit/_batch_writer.py` trên d01–d12; so sánh số trang và saved pages với Word/main, không chấp nhận suy giảm.
- Nếu đổi Sheet conversion, chạy đủ 26 workbook qua `_batch_audit.py`, yêu cầu `TONG sai lech: 0` cho từng tệp.
- Đo exact stage trên các fixture yêu cầu trước/sau; không kết luận PASS nếu chưa thực chạy.
- Rollback: tắt đường UNO để mọi chuyển đổi đi qua `_run_soffice_convert` hiện hữu; gỡ hiển thị progress độc lập. Bỏ worker mới nếu fidelity không được chứng minh. Không reset/rebase/clean Git.

## Baseline đo trước sửa

Đo trên worktree source bằng Python 3.12 + LibreOffice 26.2.5 x64, profile app riêng, WebView2, mỗi lượt mở qua API/adapter thật rồi đóng app tự động. Cold = thư mục `LOCALAPPDATA` riêng, chưa có profile LibreOffice; warm = profile đã khởi tạo bằng một lượt chuyển đổi trước đó. Có hai lượt cho mỗi tệp ở mỗi điều kiện.

`Soffice --convert-to` hiện là một tiến trình đơn lệnh, nên thời gian bên trong chưa có timestamp riêng cho spawn, nạp profile, nạp filter và chuyển đổi. Bảng ghi riêng phép calibration bằng `--terminate_after_init` (spawn + profile init không mở tệp), rồi ước tính phần conversion/filter bằng thời gian lệnh chuyển đổi trừ calibration cùng điều kiện. Tổng thời gian lệnh được giữ ở ngoặc để tránh hiểu calibration là phép chia chính xác bên trong tiến trình.

| app / tệp | profile | lượt | process→window | UI ready | spawn + profile init* | conversion/filter* (tổng lệnh `--convert-to`) | Python post-process | bridge trước parse | JS parse | render sau parse | mở→first paint | process→first paint |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| Writer d03.docx | cold | 1 / 2 | 0.86 / 0.84 s | 1.82 / 1.69 s | ~3.03 s | ~23.28 / 14.34 s (26.31 / 17.37 s) | 83 / 73 ms | 11 / 8 ms | 22 / 23 ms | 38 / 38 ms | 26.46 / 17.51 s | 28.38 / 19.31 s |
| Writer d03.docx | warm | 1 / 2 | 0.94 / 0.90 s | 1.76 / 1.69 s | ~3.03 s | ~1.10 / 1.05 s (4.13 / 4.09 s) | 70 / 69 ms | 8 / 8 ms | 22 / 22 ms | 39 / 44 ms | 4.28 / 4.24 s | 6.05 / 6.03 s |
| Writer d12.docx | cold | 1 / 2 | 0.94 / 0.89 s | 1.78 / 1.73 s | ~3.03 s | ~17.66 / 16.31 s (20.69 / 19.34 s) | 75 / 70 ms | 9 / 9 ms | 22 / 21 ms | 85 / 79 ms | 20.90 / 19.53 s | 22.77 / 21.36 s |
| Writer d12.docx | warm | 1 / 2 | 0.90 / 0.88 s | 1.69 / 1.65 s | ~3.03 s | ~1.08 / 0.81 s (4.11 / 3.84 s) | 68 / 66 ms | 10 / 9 ms | 22 / 22 ms | 80 / 81 ms | 4.30 / 4.03 s | 6.09 / 5.79 s |
| Writer d24.docx (16 trang) | cold | 1 / 2 | 0.95 / 0.87 s | 1.77 / 1.64 s | ~3.03 s | ~18.74 / 16.94 s (21.77 / 19.97 s) | 250 / 149 ms | 437 / 434 ms | 2.09 / 2.09 s | 530 / 514 ms | 25.13 / 23.22 s | 27.12 / 25.06 s |
| Writer d24.docx (16 trang) | warm | 1 / 2 | 0.86 / 0.86 s | 1.60 / 1.73 s | ~3.03 s | ~3.57 / 3.52 s (6.60 / 6.55 s) | 145 / 147 ms | 421 / 404 ms | 2.22 / 2.01 s | 491 / 476 ms | 9.93 / 9.64 s | 11.75 / 11.58 s |
| Sheet lan05.xlsx | cold | 1 / 2 | 1.00 / 0.89 s | 1.87 / 1.71 s | ~3.02 s | ~13.57 / 13.57 s (16.60 / 16.60 s) | 680 / 656 ms | 90 / 88 ms | 316 / 327 ms | 164 / 169 ms | 17.86 / 17.85 s | 19.83 / 19.66 s |
| Sheet lan05.xlsx | warm | 1 / 2 | 0.83 / 0.85 s | 1.61 / 1.63 s | ~3.02 s | ~0.71 / 0.72 s (3.73 / 3.74 s) | 673 / 634 ms | 86 / 84 ms | 306 / 316 ms | 175 / 152 ms | 4.98 / 4.94 s | 6.70 / 6.67 s |
| Sheet lan11.xlsx | cold | 1 / 2 | 0.90 / 0.91 s | 1.72 / 1.74 s | ~3.02 s | ~16.41 / 17.68 s (19.43 / 20.70 s) | 4.54 / 4.62 s | 1.02 / 1.01 s | 1.07 / 1.12 s | 348 / 399 ms | 26.45 / 27.91 s | 28.39 / 29.87 s |
| Sheet lan11.xlsx | warm | 1 / 2 | 0.88 / 0.85 s | 1.67 / 1.65 s | ~3.02 s | ~3.95 / 3.66 s (6.97 / 6.68 s) | 4.47 / 4.36 s | 1.01 / 1.00 s | 1.02 / 1.02 s | 331 / 332 ms | 13.85 / 13.43 s | 15.72 / 15.30 s |
| Writer legacy01.doc | cold | 1 / 2 | 0.89 / 0.90 s | 1.66 / 1.73 s | ~3.03 s per call | ~15.86 / 15.27 s (21.92 / 21.34 s; 2 calls) | 66 / 68 ms | 6 / 6 ms | 13 / 13 ms | 63 / 61 ms | 22.08 / 21.49 s | 23.84 / 23.32 s |
| Writer legacy01.doc | warm | 1 / 2 | 0.85 / 0.84 s | 1.58 / 1.57 s | ~3.03 s per call | ~2.28 / 1.96 s (8.34 / 8.02 s; 2 calls) | 63 / 64 ms | 6 / 6 ms | 13 / 12 ms | 58 / 54 ms | 8.48 / 8.16 s | 10.17 / 9.84 s |
| Sheet legacy01.xls | cold | 1 / 2 | 0.90 / 0.89 s | 1.74 / 1.76 s | ~3.02 s | ~13.93 / 13.83 s (16.95 / 16.85 s) | 66 / 66 ms | 10 / 11 ms | 31 / 31 ms | 170 / 164 ms | 17.24 / 17.14 s | 19.09 / 19.00 s |
| Sheet legacy01.xls | warm | 1 / 2 | 0.88 / 0.89 s | 1.70 / 1.74 s | ~3.02 s | ~0.90 / 0.88 s (3.93 / 3.90 s) | 65 / 69 ms | 11 / 11 ms | 30 / 35 ms | 168 / 150 ms | 4.21 / 4.18 s | 6.02 / 6.03 s |

* Calibration runs: `soffice --headless --terminate_after_init` measured 2.03–3.03 s on cold Writer profiles and 2.03–3.03 s on cold Sheet profiles (2.53 s mean) and 3.02–3.04 s on warmed profiles (two launches per app/condition). It creates/opens the profile without importing a document. `Conversion/filter*` is the measured `--convert-to` total minus that calibration and includes first-use filter work; this is an estimate, while the total command timing is direct. d03 cold showed large run-to-run variation (17.37 vs 26.31 s), so both readings are retained.

Python post-process is `open_document_dialog` elapsed minus all `_run_soffice_convert` calls. Bridge time is JS open→parse start minus Python API execution (approximate bridge/serialization time). Writer parse times `_normalizeImportedHtml`; Sheet parse times `parseFods`. Render is parse end→adapter `open()` return; first paint is two `requestAnimationFrame`s after return. Process start is the external launch timestamp; UI ready requires a loaded WebView and initialized app adapter.

Warmup conversions to establish profiles took 17.58 s for Writer DOCX→HTML and 16.07 s for Sheet XLSX→FODS. Raw per-run logs: `E:\tmp\S40-OpenSpeed-20260929-233544`, `E:\tmp\S40-OpenSpeed-baseline-20260929-234239`, and the final d03 cold calibration in `E:\tmp\S40-OpenSpeed-finalbaseline-20260929-235403`; start-only calibration in `E:\tmp\S40-OpenSpeed-init-calibration.txt`.

## UNO/CLI fidelity gate trước khi bật persistent path

| fixture | định dạng so sánh | kết quả | bằng chứng |
|---|---|---|---|
| d03.docx | HTML byte | IDENTICAL | 11,538 bytes; SHA-256 `10b33e2b5e02ce479b437f2207ec95404d35a6d8fb95a31f68aa340e553adadf` |
| d12.docx | HTML byte | IDENTICAL | 24,806 bytes; SHA-256 `67c61ac1bdfd5c68f77767507d7eabe057d7ee3a4a825d8674979bfa5199d206` |
| d24.docx (16 pages) | HTML byte | DIFFERENT | UNO omitted 498 `w:txbxContent` elements; CLI output contains 473 additional frame blocks. Persistent path is explicitly bypassed for DOCX containing this marker. |
| lan05.xlsx | FODS bytes | IDENTICAL | 365,145 bytes; SHA-256 `c7c0fe237713057e7aceefc772429880f2fc93740e3c0ea01596bea24f80e78f` |
| lan11.xlsx | FODS bytes | IDENTICAL | 16,920,093 bytes; SHA-256 `9e6ecae89186a18ac8fec00631bd49c566fb20f6e9278195399f1817acfe8014` |
| legacy01.doc | DOCX semantic package + HTML bytes | IDENTICAL | ZIP XML canonical comparison has 0 differing entries; final HTML SHA-256 `6d185346fd9c77a972e1eebf9bc0a77612c55f323e70ee44f0a997227b1441d1` |
| legacy01.xls | FODS canonical XML | IDENTICAL | 182,721 bytes; SHA-256 `d53b354df462e417b24ca8cc6b9d56489ac92d8ba9e377a9d9ff9707d063b814` |

FODS was byte-identical for both LAN workbooks; the table calls out canonical XML for the legacy XLS comparison. Raw files and logs: `E:\tmp\S40-OpenSpeed-fidelity` and `E:\tmp\S40-OpenSpeed-legacy-fidelity`. Converter timings from these fidelity runs are not used as performance measurements because an external LAN14 payload probe drove free RAM below 5 GB and added concurrent load.

## Đo sau sửa

Hai lượt/tệp theo cùng fixture và harness như baseline. `cold` dùng profile mới hoàn toàn (không chạy installer warm-up); `warm` dùng profile đã được lệnh warm-up của installer tạo và đánh dấu. Các số trước/sau dấu `/` lần lượt là run 1/run 2. Worker-ready chạy nền và có thể chồng thời gian với app/UI. `converter call` là thời gian API chuyển đổi; với cold UNO, nó gồm cả thời gian chờ worker/profile sẵn sàng. `UNO load/store` là thời gian thao tác tệp thực bên trong worker; với d24 đường CLI được giữ do khác biệt textbox và không có phép tách đáng tin cậy giữa spawn/profile/filter, nên ghi tổng call và `n/a`. Thời gian bridge là ước lượng từ timestamp Python/JS. Tất cả log đo sau đều ghi progress panel đã hiện (`progressVisible=true`).

### So sánh trước/sau trong cùng bảng — hai lượt warm

`baseline` là bảng warm ở trên, dùng `--convert-to` mới mỗi lần; `after` là cùng fixture/profile đã warm bởi installer, với persistent UNO khi fidelity gate cho phép. Mỗi cặp thời gian vẫn theo thứ tự run 1/run 2. Converter ghi wall time; trong ngoặc là thời gian `UNO load/store` riêng nếu có. Với d24, output UNO khác do textbox nên đường CLI cũ vẫn chạy.

| fixture | trước: converter / post / bridge / JS parse / open→paint | sau: converter (UNO) / post / bridge / JS parse / open→paint |
|---|---|---|
| Writer d03.docx | 4.13/4.09s; 70/69ms; 8/8ms; 22/22ms; 4.28/4.24s | 2.45/2.80s (.81/1.25s); 12/12ms; 9/8ms; 24/23ms; 2.54/2.88s |
| Writer d12.docx | 4.11/3.84s; 68/66ms; 10/9ms; 22/22ms; 4.30/4.03s | 2.42/2.39s (.78/.76s); 13/12ms; 9/10ms; 22/22ms; 2.56/2.53s |
| Writer d24.docx (16 trang) | 6.60/6.55s; 145/147ms; 421/404ms; 2.22/2.01s; 9.93/9.64s | CLI 9.42/9.44s; 99/103ms; 451/443ms; 2.22/2.16s; 12.80/12.73s |
| Sheet lan05.xlsx | 3.73/3.74s; 673/634ms; 86/84ms; 306/316ms; 4.98/4.94s | 1.96/1.94s (.38/.37s); 579/568ms; 92/93ms; 331/329ms; 3.15/3.10s |
| Sheet lan11.xlsx | 6.97/6.68s; 4.47/4.36s; 1.01/1.00s; 1.02/1.02s; 13.85/13.43s | 4.56/4.65s (3.11/3.17s); 4.23/4.25s; 1.00/1.02s; 1.05/1.05s; 11.25/11.39s |
| Writer legacy01.doc | 8.34/8.02s (2 CLI calls); 63/64ms; 6/6ms; 13/12ms; 8.48/8.16s | 3.28/2.55s (1.73/.92s across 2 UNO operations); 8/9ms; 7/6ms; 13/13ms; 3.38/2.65s |
| Sheet legacy01.xls | 3.93/3.90s; 65/69ms; 11/11ms; 30/35ms; 4.21/4.18s | 2.04/2.13s (.54/.54s); 11/11ms; 12/11ms; 34/35ms; 2.26/2.35s |

### Cold — profile LibreOffice mới, không warm-up lúc cài

| fixture | run 1: timeline theo stage | run 2: timeline theo stage |
|---|---|---|
| Writer d03.docx | window .936s → UI 1.687s; worker-ready 16.051s; converter call 15.348s (UNO .626s); Python post 12ms; bridge 11ms; JS parse 26ms; render 44ms; open→paint 15.444s (process→paint 17.133s) | window .944s → UI 1.716s; worker-ready 16.187s; converter call 15.448s (UNO .633s); post 17ms; bridge 10ms; parse 28ms; render 46ms; open→paint 15.551s (process→paint 17.269s) |
| Writer d12.docx | window .942s → UI 1.772s; worker-ready 16.284s; converter call 15.484s (UNO .612s); post 13ms; bridge 11ms; parse 26ms; render 91ms; open→paint 15.635s (process→paint 17.408s) | window .911s → UI 1.666s; worker-ready 16.145s; converter call 15.914s (UNO 1.071s); post 13ms; bridge 11ms; parse 27ms; render 96ms; open→paint 16.073s (process→paint 17.740s) |
| Writer d24.docx (16 trang) | window .939s → UI 1.695s; worker-ready 15.679s; CLI fallback call 27.137s; UNO n/a; post 99ms; bridge 447ms; parse 2.158s; render 512ms; open→paint 30.419s (process→paint 32.116s) | window .974s → UI 1.710s; worker-ready 15.853s; CLI fallback call 27.227s; UNO n/a; post 101ms; bridge 438ms; parse 2.283s; render 539ms; open→paint 30.654s (process→paint 32.366s) |
| Sheet lan05.xlsx | window .944s → UI 1.746s; worker-ready 16.654s; converter call 15.511s (UNO .236s); post 575ms; bridge 95ms; JS parse 338ms; render 182ms; open→paint 16.715s (process→paint 18.463s) | window .948s → UI 1.739s; worker-ready 15.870s; converter call 14.734s (UNO .229s); post 575ms; bridge 92ms; parse 335ms; render 172ms; open→paint 15.922s (process→paint 17.664s) |
| Sheet lan11.xlsx | window .943s → UI 1.746s; worker-ready 16.177s; converter call 17.769s (UNO 2.982s); post 4.276s; bridge 1.038s; JS parse 1.048s; render 362ms; open→paint 24.548s (process→paint 26.295s) | window .954s → UI 1.753s; worker-ready 16.067s; converter call 17.645s (UNO 2.975s); post 4.267s; bridge 1.008s; parse 1.057s; render 363ms; open→paint 24.395s (process→paint 26.151s) |
| Writer legacy01.doc | window .944s → UI 1.696s; worker-ready 16.074s; converter call 15.717s (two actual UNO load/store operations total .772s); post 8ms; bridge 7ms; JS parse 12ms; render 59ms; open→paint 15.813s (process→paint 17.511s) | window .929s → UI 1.680s; worker-ready 15.843s; call 15.486s (UNO total .767s); post 9ms; bridge 6ms; parse 14ms; render 60ms; open→paint 15.584s (process→paint 17.266s) |
| Sheet legacy01.xls | window .962s → UI 1.765s; worker-ready 16.164s; converter call 15.103s (UNO .337s); post 11ms; bridge 12ms; JS parse 36ms; render 156ms; open→paint 15.333s (process→paint 17.101s) | window .939s → UI 1.738s; worker-ready 15.969s; converter call 14.913s (UNO .324s); post 12ms; bridge 13ms; parse 38ms; render 159ms; open→paint 15.150s (process→paint 16.890s) |

### Warm — profile được installer warm-up trước khi mở fixture

| fixture | run 1: timeline theo stage | run 2: timeline theo stage |
|---|---|---|
| Writer d03.docx | window .942s → UI 1.682s; worker-ready 2.961s; converter call 2.452s (UNO .811s); Python post 12ms; bridge 9ms; JS parse 24ms; render 41ms; open→paint 2.541s (process→paint 4.225s) | window .929s → UI 1.664s; worker-ready 2.852s; converter call 2.796s (UNO 1.250s); post 12ms; bridge 8ms; parse 23ms; render 40ms; open→paint 2.883s (process→paint 4.548s) |
| Writer d12.docx | window .946s → UI 1.692s; worker-ready 2.975s; converter call 2.422s (UNO .784s); post 13ms; bridge 9ms; parse 22ms; render 82ms; open→paint 2.561s (process→paint 4.256s) | window .930s → UI 1.689s; worker-ready 2.956s; converter call 2.391s (UNO .762s); post 12ms; bridge 10ms; parse 22ms; render 84ms; open→paint 2.531s (process→paint 4.222s) |
| Writer d24.docx (16 trang) | window .953s → UI 1.691s; worker-ready 2.956s; CLI fallback call 9.424s; UNO n/a; post 99ms; bridge 451ms; JS parse 2.223s; render 540ms; open→paint 12.801s (process→paint 14.494s) | window .903s → UI 1.655s; worker-ready 2.845s; CLI fallback call 9.436s; UNO n/a; post 103ms; bridge 443ms; parse 2.164s; render 519ms; open→paint 12.730s (process→paint 14.389s) |
| Sheet lan05.xlsx | window .938s → UI 1.739s; worker-ready 2.951s; converter call 1.958s (UNO .383s); post 579ms; bridge 92ms; JS parse 331ms; render 173ms; open→paint 3.148s (process→paint 4.889s) | window .961s → UI 1.767s; worker-ready 2.976s; converter call 1.935s (UNO .370s); post 568ms; bridge 93ms; parse 329ms; render 160ms; open→paint 3.102s (process→paint 4.871s) |
| Sheet lan11.xlsx | window .953s → UI 1.775s; worker-ready 2.869s; converter call 4.561s (UNO 3.109s); post 4.226s; bridge 1.004s; JS parse 1.046s; render 351ms; open→paint 11.254s (process→paint 13.031s) | window .933s → UI 1.739s; worker-ready 2.863s; converter call 4.648s (UNO 3.169s); post 4.250s; bridge 1.022s; parse 1.049s; render 364ms; open→paint 11.388s (process→paint 13.130s) |
| Writer legacy01.doc | window .954s → UI 1.698s; worker-ready 2.878s; converter call 3.282s (two UNO operations total 1.733s); post 8ms; bridge 7ms; JS parse 13ms; render 60ms; open→paint 3.379s (process→paint 5.079s) | window .931s → UI 1.681s; worker-ready 2.953s; call 2.553s (UNO total .919s); post 9ms; bridge 6ms; parse 13ms; render 58ms; open→paint 2.648s (process→paint 4.331s) |
| Sheet legacy01.xls | window .929s → UI 1.720s; worker-ready 2.856s; converter call 2.036s (UNO .536s); post 11ms; bridge 12ms; JS parse 34ms; render 149ms; open→paint 2.256s (process→paint 3.978s) | window .926s → UI 1.739s; worker-ready 2.970s; converter call 2.129s (UNO .542s); post 11ms; bridge 11ms; parse 35ms; render 149ms; open→paint 2.350s (process→paint 4.092s) |

Installer warm-up was run from a clean `LOCALAPPDATA`; it took 16.53s for Writer and 16.24s for Sheet (32.77s total), exit code 0. This moves filter/profile initialization out of the first real document open when the pilot installer is used. It does not make an unprimed cold profile meet the cold-open target: cold d03/d12 still take 15.44–16.07s open→paint. Warm d03 and d12 meet the ≤3s target (2.54–2.88s and 2.53–2.56s); warm lan05 meets the ≤5s target (3.10–3.15s). d24 stays on the fidelity-preserving CLI path and takes 12.73–12.80s warm. lan11 remains above target at 11.25–11.39s; Python post-process alone is 4.23–4.25s, and bridge/JS parse add about 2.05s. That larger Sheet path still needs its separately scoped streaming work. No measured Python post, bridge, parse, or render stage over 1s for small/medium Writer or lan05; lan11 exceeds 1s in Python, bridge, and JS parse. Installer warm-up UI presence wasn't included in the fixture timing matrix; fixture open progress was visible in all 28 runs.

Raw post-change logs: `E:\tmp\S40-OpenSpeed-final-20260930-030725\logs`; installer profile warm-up: `E:\tmp\S40-installer-warmup`.

## Regression gates

- **PASS** — `node tests/run-tests.js` (exit 0): `KẾT QUẢ KIỂM THỬ: 2039/2039 PASS | 0 FAIL`.
- **PASS** — `python -m unittest discover -s tests` (exit 0): `Ran 429 tests in 326.027s` / `OK`. A prior attempt interrupted under low-memory/concurrent load; the reported full run completed in an isolated profile. No failing flaky soffice case required an isolated rerun.
- **PASS except blocked input d10** — `python scripts/layout-audit/_batch_writer.py E:\VNOffice-codex-openspeed "E:\VNOffice-codex-openspeed\file test\landocx" E:\tmp\S40-Writer-Audit-final-20260930 d01.docx ... d12.docx`: d01–d09 and d11–d12 loaded and had equal canvas/Word/saved page counts. d10 could not be compared: Word reported “The file appears to be corrupted”; independent ZIP check returned `BadZipFile`, 823,958 bytes. Audit report: `E:\tmp\S40-Writer-Audit-final-20260930\_batch_writer_report.md`.
- **PASS** — 26-file Sheet LAN audit via `scripts/layout-audit/_batch_audit.py`: every workbook reported `TONG sai lech: 0`, saved=yes, lint=clean. Optional Excel COM open checks intermittently returned `RPC_E_CALL_REJECTED` for lan01/03/04/08/09/10/11/12/16/18/19/26/28; the required audit diff/lint checks all passed. Report: `_batch_audit_report.md` (ignored local output).
- **PASS** — UNO crash/restart smoke: after killing the owned helper/soffice process tree, the next d03 conversion restarted the worker and returned identical 11,538-byte HTML.
- **PASS** — `python -s -E main.py --warmup-libreoffice-profiles` from a clean test `LOCALAPPDATA`: exit 0; Writer 16,530.5ms, Sheet 16,243.2ms; both completion markers were written.
- **PASS** — Static checks: `python -m py_compile main.py adapters/libreoffice/common/soffice_uno_worker.py adapters/libreoffice/common/ooxml_zip_patch.py`; `node --check` for changed JS; `git diff --check`; PowerShell AST parse of `scripts/install-pilot.ps1`.
- **NOT RUN** — packaged desktop build. No build result is claimed.
- **NOT PASS for all timing goals** — the raw-cold profile open target and warm lan11 target were missed as detailed above. This is a remaining performance item, not a regression-gate pass.

## Handoff

Theo mẫu `VN-Office-AI-Engineering-Standard-V2/VN-Office-AI-Engineering-Standard-V2/09-templates/AGENT-HANDOFF.md`:

**TASK:** S40 — make Writer and small/medium Sheet opening faster.

**AGENT/ROLE:** Codex / integration and platform contributor.

**BRANCH:** `perf/open-speed-codex`.

**WORKTREE:** `E:\VNOffice-codex-openspeed`.

**OBJECTIVE:** Reduce first-open delay; keep conversions offline/local, preserve output fidelity, add visible progress, and measure all specified fixtures cold/warm twice.

**FINDINGS:** Per-call LibreOffice/profile initialization dominated cold opens. A persistent UNO worker reduced warm d03/d12 to 2.53–2.88s and lan05 to 3.10–3.15s. lan11 remains 11.25–11.39s and raw cold opens remain 15–31s. d24 has textboxes UNO drops, so it must retain the CLI fallback.

**IMPLEMENTATION SUMMARY:** Added per-app local-pipe UNO worker with crash restart and CLI fallback; installer/runtime profile/filter warm-up; reusable Vietnamese open-progress UI; Sheet input byte reuse and cached XLSX XF metadata map. Kept textbox-containing DOCX on the existing path. No dependency or LibreOffice Core change.

**FILES CHANGED:** `main.py`; `adapters/libreoffice/common/soffice_uno_worker.py`; `adapters/libreoffice/common/ooxml_zip_patch.py`; `adapters/libreoffice/writer/writer-adapter.js`; `adapters/libreoffice/sheet/sheet-adapter.js`; `platform/ui-kit/components.js`; `platform/ui-kit/ui-kit.css`; `index.html`; `scripts/install-pilot.ps1`; `docs/HANDOFF-OPEN-SPEED.md`. Test fixtures and generated audit files remain ignored local files.

**COMMANDS RUN:** `node tests/run-tests.js`; `python -m unittest discover -s tests`; `python scripts/layout-audit/_batch_writer.py ... d01.docx ... d12.docx`; `scripts/layout-audit/_batch_audit.py` on the 26 LAN workbooks; `python -s -E main.py --warmup-libreoffice-profiles`; UNO/CLI fidelity comparisons; cold/warm two-run open matrix; worker crash/restart smoke; py_compile/node --check/PowerShell AST parse/`git diff --check`.

**BUILD RESULT:** NOT RUN.

**TEST RESULTS:** PASS: Node 2039/2039; Python unittest 429 tests; all 26 required Sheet diffs zero and lint clean; Writer page parity on 11 valid fixtures; fidelity comparisons listed above; worker restart and profile warm-up. d10 corrupt input excluded from parity result. Performance target partially met: warm d03/d12/lan05 pass, raw-cold and lan11 fail target.

**KNOWN FAILURES:** Writer d10 is not a valid ZIP/DOCX; optional Excel COM checks intermittently returned `RPC_E_CALL_REJECTED`; packaged build not run; cold and lan11 timing targets remain unmet.

**RISKS:** UNO parity was proven on the listed fixtures only; DOCX containing `w:txbxContent` bypasses persistent UNO because UNO output omitted textbox frames. Installer warm-up adds about 32.8s to install/post-copy work. lan11 still has Python/bridge/parse hotspots above 1s.

**DEPENDENCIES/BLOCKERS:** None added; requires the existing bundled LibreOffice UNO runtime. Larger Sheet streaming is a separate task.

**CORE PATCH ID (if any):** None.

**NEXT ACTION:** Build and launch the packaged pilot; verify installer warm-up using the real installer, then profile and optimize lan11 under the separate Sheet streaming task. Keep this branch unmerged pending owner review.


\n
